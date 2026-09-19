// chess-engine.ts — typy, výchozí deska, pravidla pohybu, validace, applyMove(s)
//
// Vlastní šachový engine bez externí knihovny. Má dvě vrstvy:
//
//   1. „Vzorová" vrstva (legalTargets, validateMove, applyMove) — pohybové vzory
//      figur, blokace, braní, mechanika rošády / en passant / proměny. Pracuje
//      jen s deskou (Board) a nezná stranu na tahu ani práva na rošádu.
//
//   2. „Plná" vrstva (GameState, legalMovesFull, isInCheck, isCheckmate,
//      isStalemate, toSan) — kompletní pravidla: střídání stran, šach (tah nesmí
//      nechat vlastního krále v šachu), práva na rošádu, rošáda přes napadené
//      pole, braní mimochodem jen hned po dvojkroku, povinná proměna.
//      Používá ji build-time validátor dat, self-test (perft) a nápověda
//      legálních tahů v režimu Procvičovat.
//
// Obě vrstvy jsou čisté funkce bez vedlejších efektů (desky se nikdy nemutují).

export type PieceType = "K" | "Q" | "R" | "B" | "N" | "P";
export type Side = "white" | "black";

// Figura v datovém modelu: velké písmeno = bílá, malé = černá
export type PieceSymbol =
  | "K"
  | "Q"
  | "R"
  | "B"
  | "N"
  | "P"
  | "k"
  | "q"
  | "r"
  | "b"
  | "n"
  | "p";

export type Cell = PieceSymbol | null;
export type Board = Cell[][]; // [row][col], row 0 nahoře

export interface MoveDef {
  from: string; // algebraická notace, např. "e2"
  to: string; // např. "e4"
  piece: PieceSymbol; // figura, která táhne (velké = bílá, malé = černá)
  captured?: PieceSymbol; // braná figura, pokud jde o braní
  notation: string; // zobrazovaná notace, např. "1. e4" nebo "3... Sc5"
  comment: string; // vyprávěný komentář k tahu (česky)
  promotesTo?: "Q" | "R" | "B" | "N";
  enPassant?: true;
}

// „Jádro" tahu bez textů — to, co generuje engine (legalMovesFull) a co stačí
// pro aplikaci tahu, SAN i validaci. MoveDef je strukturálně MoveCore + texty.
export type MoveCore = Pick<
  MoveDef,
  "from" | "to" | "piece" | "captured" | "promotesTo" | "enPassant"
>;

export const ROWS = 8;
export const COLS = 8;

// --- Výchozí postavení -------------------------------------------------------

export function initialBoard(): Board {
  return [
    ["r", "n", "b", "q", "k", "b", "n", "r"], // row 0 = 8. řada (černý)
    ["p", "p", "p", "p", "p", "p", "p", "p"], // row 1 = 7. řada
    [null, null, null, null, null, null, null, null], // row 2
    [null, null, null, null, null, null, null, null], // row 3
    [null, null, null, null, null, null, null, null], // row 4
    [null, null, null, null, null, null, null, null], // row 5
    ["P", "P", "P", "P", "P", "P", "P", "P"], // row 6 = 2. řada
    ["R", "N", "B", "Q", "K", "B", "N", "R"], // row 7 = 1. řada (bílý)
  ];
}

// --- Převody souřadnic -------------------------------------------------------

export function squareToCoords(square: string): [number, number] {
  const file = square.charCodeAt(0) - "a".charCodeAt(0); // col
  const rank = parseInt(square.slice(1), 10);
  const row = 8 - rank;
  return [row, file];
}

export function coordsToSquare(row: number, col: number): string {
  const file = String.fromCharCode("a".charCodeAt(0) + col);
  const rank = 8 - row;
  return `${file}${rank}`;
}

// --- Pomocné funkce ----------------------------------------------------------

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

export function sideOf(symbol: PieceSymbol): Side {
  return symbol === symbol.toUpperCase() ? "white" : "black";
}

export function typeOf(symbol: PieceSymbol): PieceType {
  return symbol.toUpperCase() as PieceType;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

function cellAt(board: Board, row: number, col: number): Cell {
  return board[row][col];
}

// --- Pohybové vzory ----------------------------------------------------------

const ORTHO: Array<[number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

const DIAG: Array<[number, number]> = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

const KNIGHT_DELTAS: Array<[number, number]> = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];

// Klouže ve směrech `dirs` dokud nenarazí; soupeřovu figuru může vzít (a stop),
// na vlastní stop bez braní.
function slidingTargets(
  board: Board,
  row: number,
  col: number,
  side: Side,
  dirs: Array<[number, number]>,
): string[] {
  const out: string[] = [];
  for (const [dr, dc] of dirs) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const cell = cellAt(board, r, c);
      if (cell === null) {
        out.push(coordsToSquare(r, c));
      } else {
        if (sideOf(cell) !== side) out.push(coordsToSquare(r, c)); // braní
        break; // blokace (vlastní i soupeřova)
      }
      r += dr;
      c += dc;
    }
  }
  return out;
}

// Vrátí všechna pseudolegální cílová pole figury na daném poli.
// (respektuje blokace u kloužavých figur, braní soupeře, vzory pohybu;
//  NEřeší šach na vlastního krále; rošáda NENÍ součástí.)
export function legalTargets(board: Board, square: string): string[] {
  const [row, col] = squareToCoords(square);
  const piece = cellAt(board, row, col);
  if (piece === null) return [];

  const side = sideOf(piece);
  const type = typeOf(piece);
  const out: string[] = [];

  switch (type) {
    case "N": {
      for (const [dr, dc] of KNIGHT_DELTAS) {
        const r = row + dr;
        const c = col + dc;
        if (!inBounds(r, c)) continue;
        const cell = cellAt(board, r, c);
        if (cell === null || sideOf(cell) !== side) out.push(coordsToSquare(r, c));
      }
      return out;
    }
    case "K": {
      for (const [dr, dc] of [...ORTHO, ...DIAG]) {
        const r = row + dr;
        const c = col + dc;
        if (!inBounds(r, c)) continue;
        const cell = cellAt(board, r, c);
        if (cell === null || sideOf(cell) !== side) out.push(coordsToSquare(r, c));
      }
      return out;
    }
    case "R":
      return slidingTargets(board, row, col, side, ORTHO);
    case "B":
      return slidingTargets(board, row, col, side, DIAG);
    case "Q":
      return slidingTargets(board, row, col, side, [...ORTHO, ...DIAG]);
    case "P": {
      const dir = side === "white" ? -1 : 1; // bílý nahoru, černý dolů
      const startRow = side === "white" ? 6 : 1;

      // Dopředu o 1, jen pokud prázdné
      const oneRow = row + dir;
      if (inBounds(oneRow, col) && cellAt(board, oneRow, col) === null) {
        out.push(coordsToSquare(oneRow, col));
        // Dopředu o 2 z výchozí řady, jen pokud obě pole prázdná
        const twoRow = row + 2 * dir;
        if (row === startRow && cellAt(board, twoRow, col) === null) {
          out.push(coordsToSquare(twoRow, col));
        }
      }

      // Diagonální braní (jen pokud je tam soupeřova figura)
      for (const dc of [-1, 1]) {
        const r = row + dir;
        const c = col + dc;
        if (!inBounds(r, c)) continue;
        const cell = cellAt(board, r, c);
        if (cell !== null && sideOf(cell) !== side) {
          out.push(coordsToSquare(r, c));
        }
      }
      return out;
    }
  }
}

// --- Rošáda — referenční data ------------------------------------------------

interface CastleSpec {
  kingFrom: string;
  kingTo: string;
  rookFrom: string;
  rookTo: string;
  between: string[]; // pole, která musí být prázdná (mezi králem a věží)
}

function castleSpec(side: Side, kingSide: boolean): CastleSpec {
  if (side === "white") {
    return kingSide
      ? { kingFrom: "e1", kingTo: "g1", rookFrom: "h1", rookTo: "f1", between: ["f1", "g1"] }
      : { kingFrom: "e1", kingTo: "c1", rookFrom: "a1", rookTo: "d1", between: ["b1", "c1", "d1"] };
  }
  return kingSide
    ? { kingFrom: "e8", kingTo: "g8", rookFrom: "h8", rookTo: "f8", between: ["f8", "g8"] }
    : { kingFrom: "e8", kingTo: "c8", rookFrom: "a8", rookTo: "d8", between: ["b8", "c8", "d8"] };
}

// --- Validace tahu -----------------------------------------------------------

export function validateMove(
  board: Board,
  move: MoveDef,
): { ok: true } | { ok: false; reason: string } {
  const [fromRow, fromCol] = squareToCoords(move.from);
  const piece = cellAt(board, fromRow, fromCol);

  // 1. Na výchozím poli musí být figura
  if (piece === null) {
    return { ok: false, reason: `Na poli ${move.from} není žádná figura` };
  }

  // 1b. Křížová kontrola: figura na desce musí odpovídat deklarované figuře.
  if (piece !== move.piece) {
    return {
      ok: false,
      reason: `Tah uvádí figuru ${move.piece}, ale na poli ${move.from} stojí ${piece}`,
    };
  }

  const side = sideOf(piece);
  const type = typeOf(piece);
  const [toRow, toCol] = squareToCoords(move.to);

  // 2. Rošáda — král se hýbe o 2 pole
  if (type === "K" && Math.abs(fromCol - toCol) === 2) {
    const kingSide = toCol > fromCol;
    const spec = castleSpec(side, kingSide);

    if (move.captured) {
      return { ok: false, reason: `Rošáda nikdy nebere figuru (captured: ${move.captured})` };
    }
    if (move.from !== spec.kingFrom) {
      return {
        ok: false,
        reason: `Rošáda: král musí stát na ${spec.kingFrom}, ne na ${move.from}`,
      };
    }
    if (move.to !== spec.kingTo) {
      return {
        ok: false,
        reason: `Rošáda: král má jít na ${spec.kingTo}, ne na ${move.to}`,
      };
    }
    const [rr, rc] = squareToCoords(spec.rookFrom);
    const rook = cellAt(board, rr, rc);
    const expectedRook: PieceSymbol = side === "white" ? "R" : "r";
    if (rook !== expectedRook) {
      return {
        ok: false,
        reason: `Rošáda: na poli ${spec.rookFrom} není věž potřebná pro rošádu`,
      };
    }
    for (const sq of spec.between) {
      const [br, bc] = squareToCoords(sq);
      if (cellAt(board, br, bc) !== null) {
        return {
          ok: false,
          reason: `Rošáda: pole ${sq} mezi králem a věží není prázdné`,
        };
      }
    }
    return { ok: true };
  }

  // 3. En passant — pěšec bere diagonálně na prázdné pole
  if (type === "P" && move.enPassant) {
    const dir = side === "white" ? -1 : 1;
    const diagonal = toRow === fromRow + dir && Math.abs(toCol - fromCol) === 1;
    if (!diagonal) {
      return { ok: false, reason: `En passant: ${move.from}→${move.to} není braní pěšce diagonálně vpřed` };
    }
    if (cellAt(board, toRow, toCol) !== null) {
      return { ok: false, reason: `En passant: cílové pole ${move.to} musí být prázdné` };
    }
    const captured = cellAt(board, fromRow, toCol);
    const expectedPawn: PieceSymbol = side === "white" ? "p" : "P";
    if (captured !== expectedPawn) {
      return { ok: false, reason: `En passant: na poli ${coordsToSquare(fromRow, toCol)} není soupeřův pěšec k sebrání` };
    }
    if (move.captured && move.captured !== captured) {
      return { ok: false, reason: `En passant: braná figura je ${captured}, ne ${move.captured}` };
    }
    return { ok: true };
  }

  // 4. Standardní tah — cíl musí být mezi pohybovými vzory
  const targets = legalTargets(board, move.from);
  if (!targets.includes(move.to)) {
    return {
      ok: false,
      reason: `Figura ${piece} na ${move.from} nemůže táhnout na ${move.to}`,
    };
  }

  // 4b. Křížová kontrola braní: deklarované `captured` musí sedět s deskou.
  const onTarget = cellAt(board, toRow, toCol);
  if (move.captured) {
    if (onTarget === null) {
      return {
        ok: false,
        reason: `Tah uvádí braní figury ${move.captured}, ale na poli ${move.to} žádná nestojí`,
      };
    }
    if (onTarget !== move.captured) {
      return {
        ok: false,
        reason: `Braná figura na ${move.to} je ${onTarget}, ne ${move.captured}`,
      };
    }
  } else if (onTarget !== null) {
    return {
      ok: false,
      reason: `Tah bere figuru ${onTarget} na ${move.to}, ale chybí pole captured`,
    };
  }

  // 5. Promoce — musí jít o pěšce dosahujícího poslední řady
  if (move.promotesTo) {
    const lastRow = side === "white" ? 0 : 7;
    if (type !== "P") {
      return { ok: false, reason: `Promoce: tah na ${move.to} nedělá pěšec` };
    }
    if (toRow !== lastRow) {
      return { ok: false, reason: `Promoce: ${move.to} není poslední řada pro ${side === "white" ? "bílého" : "černého"}` };
    }
  }

  return { ok: true };
}

// --- Aplikace tahu -----------------------------------------------------------

// Vrátí NOVOU desku (immutable). Řeší i rošádu, en passant, promoci.
// Předpokládá legální tah (volat po validaci).
export function applyMove(board: Board, move: MoveCore): Board {
  const next = cloneBoard(board);
  const [fromRow, fromCol] = squareToCoords(move.from);
  const [toRow, toCol] = squareToCoords(move.to);
  const piece = next[fromRow][fromCol];
  if (piece === null) return next; // ochrana; v praxi voláno po validaci

  const side = sideOf(piece);
  const type = typeOf(piece);

  // Přesun figury
  next[fromRow][fromCol] = null;
  next[toRow][toCol] = piece;

  // Rošáda — přesun věže
  if (type === "K" && Math.abs(fromCol - toCol) === 2) {
    const kingSide = toCol > fromCol;
    const spec = castleSpec(side, kingSide);
    const [rfRow, rfCol] = squareToCoords(spec.rookFrom);
    const [rtRow, rtCol] = squareToCoords(spec.rookTo);
    const rook = next[rfRow][rfCol];
    next[rfRow][rfCol] = null;
    next[rtRow][rtCol] = rook;
  }

  // En passant — odstranění braného pěšce
  if (type === "P" && move.enPassant) {
    next[fromRow][toCol] = null;
  }

  // Promoce
  if (type === "P") {
    const lastRow = side === "white" ? 0 : 7;
    if (toRow === lastRow) {
      const promo = move.promotesTo ?? "Q";
      next[toRow][toCol] = (side === "white"
        ? promo
        : promo.toLowerCase()) as PieceSymbol;
    }
  }

  return next;
}

// Aplikace prvních (upToIndex) tahů z výchozí pozice. upToIndex=0 → výchozí pozice.
export function applyMovesUpTo(moves: MoveCore[], upToIndex: number): Board {
  let board = initialBoard();
  const limit = Math.min(upToIndex, moves.length);
  for (let i = 0; i < limit; i++) {
    board = applyMove(board, moves[i]);
  }
  return board;
}

// Strana na tahu podle indexu (0=bílý, 1=černý, ...)
export function moveSide(index: number): Side {
  return index % 2 === 0 ? "white" : "black";
}

// =============================================================================
// PLNÁ VRSTVA — stav partie, šach, plně legální tahy, mat/pat, SAN
// =============================================================================

// --- Stav partie -------------------------------------------------------------

// Práva na rošádu ve FEN konvenci: K/Q = bílý krátká/dlouhá, k/q = černý.
export interface CastlingRights {
  K: boolean;
  Q: boolean;
  k: boolean;
  q: boolean;
}

export interface GameState {
  board: Board;
  turn: Side; // strana na tahu
  castling: CastlingRights;
  enPassant: string | null; // pole, na které lze právě teď brát mimochodem (např. "d6")
}

export function initialState(): GameState {
  return {
    board: initialBoard(),
    turn: "white",
    castling: { K: true, Q: true, k: true, q: true },
    enPassant: null,
  };
}

function opposite(side: Side): Side {
  return side === "white" ? "black" : "white";
}

// Aplikuje tah a vrátí NOVÝ stav: deska, strana na tahu, práva na rošádu
// (král/věž se pohnula nebo věž byla sebrána), pole pro braní mimochodem
// (jen po dvojkroku pěšce). Předpokládá legální tah.
export function applyMoveToState(state: GameState, move: MoveCore): GameState {
  const board = applyMove(state.board, move);
  const castling = { ...state.castling };
  const side = sideOf(move.piece);
  const type = typeOf(move.piece);

  if (type === "K") {
    if (side === "white") {
      castling.K = false;
      castling.Q = false;
    } else {
      castling.k = false;
      castling.q = false;
    }
  }
  // Pohyb věže z rohu NEBO braní na rohovém poli ruší příslušné právo.
  for (const sq of [move.from, move.to]) {
    if (sq === "a1") castling.Q = false;
    else if (sq === "h1") castling.K = false;
    else if (sq === "a8") castling.q = false;
    else if (sq === "h8") castling.k = false;
  }

  let enPassant: string | null = null;
  if (type === "P") {
    const [fromRow, fromCol] = squareToCoords(move.from);
    const [toRow] = squareToCoords(move.to);
    if (Math.abs(toRow - fromRow) === 2) {
      enPassant = coordsToSquare((fromRow + toRow) / 2, fromCol);
    }
  }

  return { board, turn: opposite(side), castling, enPassant };
}

// Stav po prvních (upToIndex) tazích z výchozí pozice. upToIndex=0 → výchozí.
export function stateAfterMoves(moves: MoveCore[], upToIndex: number): GameState {
  let state = initialState();
  const limit = Math.min(upToIndex, moves.length);
  for (let i = 0; i < limit; i++) {
    state = applyMoveToState(state, moves[i]);
  }
  return state;
}

// --- Napadení pole, šach -----------------------------------------------------

// Je pole `square` napadeno figurou strany `bySide`? Počítá se čistě z
// pohybových vzorů (pěšec útočí jen diagonálně, blokace u kloužavých figur).
export function isSquareAttacked(board: Board, square: string, bySide: Side): boolean {
  const [row, col] = squareToCoords(square);
  const white = bySide === "white";

  // Pěšec: bílý pěšec útočí „nahoru" (na menší row), tedy stojí o řadu níž.
  const pawnRow = white ? row + 1 : row - 1;
  const pawn: PieceSymbol = white ? "P" : "p";
  for (const dc of [-1, 1]) {
    if (inBounds(pawnRow, col + dc) && board[pawnRow][col + dc] === pawn) return true;
  }

  const knight: PieceSymbol = white ? "N" : "n";
  for (const [dr, dc] of KNIGHT_DELTAS) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(r, c) && board[r][c] === knight) return true;
  }

  const king: PieceSymbol = white ? "K" : "k";
  for (const [dr, dc] of [...ORTHO, ...DIAG]) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(r, c) && board[r][c] === king) return true;
  }

  const rook: PieceSymbol = white ? "R" : "r";
  const bishop: PieceSymbol = white ? "B" : "b";
  const queen: PieceSymbol = white ? "Q" : "q";
  for (const [dr, dc] of ORTHO) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const cell = board[r][c];
      if (cell !== null) {
        if (cell === rook || cell === queen) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }
  for (const [dr, dc] of DIAG) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const cell = board[r][c];
      if (cell !== null) {
        if (cell === bishop || cell === queen) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return false;
}

export function findKing(board: Board, side: Side): string | null {
  const king: PieceSymbol = side === "white" ? "K" : "k";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === king) return coordsToSquare(r, c);
    }
  }
  return null;
}

// Je král strany `side` v šachu? (Výchozí: strana na tahu.)
export function isInCheck(state: GameState, side: Side = state.turn): boolean {
  const kingSq = findKing(state.board, side);
  if (kingSq === null) return false;
  return isSquareAttacked(state.board, kingSq, opposite(side));
}

// --- Generátor plně legálních tahů -------------------------------------------

const PROMOTION_PIECES: Array<"Q" | "R" | "B" | "N"> = ["Q", "R", "B", "N"];

// Pseudolegální tahy strany na tahu: pohybové vzory + proměna (4 varianty) +
// braní mimochodem na aktuální e.p. pole + rošáda se všemi podmínkami kromě
// „král po rošádě není v šachu" (to řeší až filtr v legalMovesFull).
function pseudoMoves(state: GameState): MoveCore[] {
  const { board, turn } = state;
  const out: MoveCore[] = [];
  const lastRow = turn === "white" ? 0 : 7;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = board[r][c];
      if (piece === null || sideOf(piece) !== turn) continue;
      const from = coordsToSquare(r, c);
      const type = typeOf(piece);

      for (const to of legalTargets(board, from)) {
        const [tr, tc] = squareToCoords(to);
        const onTarget = board[tr][tc];
        const captured = onTarget === null ? undefined : onTarget;
        if (type === "P" && tr === lastRow) {
          for (const promotesTo of PROMOTION_PIECES) {
            out.push(
              captured ? { from, to, piece, captured, promotesTo } : { from, to, piece, promotesTo },
            );
          }
        } else {
          out.push(captured ? { from, to, piece, captured } : { from, to, piece });
        }
      }

      // Braní mimochodem — jen na pole uložené ve stavu (hned po dvojkroku).
      if (type === "P" && state.enPassant !== null) {
        const [er, ec] = squareToCoords(state.enPassant);
        const dir = turn === "white" ? -1 : 1;
        if (er === r + dir && Math.abs(ec - c) === 1) {
          const captured: PieceSymbol = turn === "white" ? "p" : "P";
          out.push({ from, to: state.enPassant, piece, captured, enPassant: true });
        }
      }

      // Rošáda
      if (type === "K") {
        const rights =
          turn === "white"
            ? { king: state.castling.K, queen: state.castling.Q }
            : { king: state.castling.k, queen: state.castling.q };
        for (const kingSide of [true, false]) {
          if (!(kingSide ? rights.king : rights.queen)) continue;
          const spec = castleSpec(turn, kingSide);
          if (from !== spec.kingFrom) continue;
          const [rr, rc] = squareToCoords(spec.rookFrom);
          const expectedRook: PieceSymbol = turn === "white" ? "R" : "r";
          if (board[rr][rc] !== expectedRook) continue;
          const blocked = spec.between.some((sq) => {
            const [br, bc] = squareToCoords(sq);
            return board[br][bc] !== null;
          });
          if (blocked) continue;
          // Král nesmí být v šachu ani přecházet přes napadené pole
          // (cílové pole ověří obecný filtr v legalMovesFull).
          const enemy = opposite(turn);
          if (isSquareAttacked(board, spec.kingFrom, enemy)) continue;
          if (isSquareAttacked(board, spec.rookTo, enemy)) continue; // pole, přes které král přechází
          out.push({ from, to: spec.kingTo, piece });
        }
      }
    }
  }
  return out;
}

// Všechny plně legální tahy strany na tahu.
export function legalMovesFull(state: GameState): MoveCore[] {
  const side = state.turn;
  const out: MoveCore[] = [];
  for (const move of pseudoMoves(state)) {
    const next = applyMove(state.board, move);
    const kingSq = findKing(next, side);
    if (kingSq !== null && isSquareAttacked(next, kingSq, opposite(side))) continue;
    out.push(move);
  }
  return out;
}

// Cílová pole plně legálních tahů figury na daném poli (pro nápovědu v UI).
// U rošády je cílem pole krále (g1/c1), u braní mimochodem prázdné pole.
export function legalTargetsFull(state: GameState, square: string): string[] {
  const seen = new Set<string>();
  for (const m of legalMovesFull(state)) {
    if (m.from === square) seen.add(m.to);
  }
  return [...seen];
}

// Najde legální tah podle výchozího a cílového pole (a případné proměny).
export function findLegalMove(
  state: GameState,
  from: string,
  to: string,
  promotesTo?: "Q" | "R" | "B" | "N",
): MoveCore | null {
  for (const m of legalMovesFull(state)) {
    if (m.from !== from || m.to !== to) continue;
    if (m.promotesTo !== undefined && m.promotesTo !== promotesTo) continue;
    return m;
  }
  return null;
}

export function isCheckmate(state: GameState): boolean {
  return isInCheck(state) && legalMovesFull(state).length === 0;
}

export function isStalemate(state: GameState): boolean {
  return !isInCheck(state) && legalMovesFull(state).length === 0;
}

// --- Česká SAN ---------------------------------------------------------------

// Písmena figur v české notaci (pěšec bez písmene).
export const CZECH_PIECE_LETTER: Record<PieceType, string> = {
  K: "K",
  Q: "D",
  R: "V",
  B: "S",
  N: "J",
  P: "",
};

// Převede tah v daném stavu na českou SAN: „Jf3", „Jbd2", „V1d2", „exd5",
// „e8=D", „O-O", „O-O-O", s příponou „+" (šach) nebo „#" (mat).
// Rozlišení (soubor/řada/obojí) se přidává jen tehdy, když může na stejné pole
// legálně táhnout i jiná figura stejného druhu a barvy.
export function toSan(state: GameState, move: MoveCore): string {
  const type = typeOf(move.piece);
  const fromCol = squareToCoords(move.from)[1];
  const [toRow, toCol] = squareToCoords(move.to);
  const onTarget = state.board[toRow][toCol];
  const isCapture = move.captured !== undefined || move.enPassant === true || onTarget !== null;

  let san: string;
  if (type === "K" && Math.abs(toCol - fromCol) === 2) {
    san = toCol > fromCol ? "O-O" : "O-O-O";
  } else if (type === "P") {
    const pawnCapture = isCapture || toCol !== fromCol;
    san = (pawnCapture ? `${move.from[0]}x` : "") + move.to;
    if (move.promotesTo) san += `=${CZECH_PIECE_LETTER[move.promotesTo]}`;
  } else {
    const others = legalMovesFull(state).filter(
      (m) => m.piece === move.piece && m.to === move.to && m.from !== move.from,
    );
    let disambiguation = "";
    if (others.length > 0) {
      const sameFile = others.some((m) => m.from[0] === move.from[0]);
      const sameRank = others.some((m) => m.from[1] === move.from[1]);
      if (!sameFile) disambiguation = move.from[0];
      else if (!sameRank) disambiguation = move.from[1];
      else disambiguation = move.from;
    }
    san = `${CZECH_PIECE_LETTER[type]}${disambiguation}${isCapture ? "x" : ""}${move.to}`;
  }

  const next = applyMoveToState(state, move);
  if (isInCheck(next, next.turn)) {
    san += isCheckmate(next) ? "#" : "+";
  }
  return san;
}
