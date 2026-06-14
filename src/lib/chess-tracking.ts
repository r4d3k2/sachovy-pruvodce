// chess-tracking.ts — sledování figur se stabilními ID pro animace
//
// Každá figura dostane stabilní ID při výchozí pozici (např. "R-7-0").
// ID figuru následuje napříč tahy, takže React element nezaniká/nevzniká,
// jen mění pozici → CSS transition zajistí plynulý pohyb. Rošáda hýbe králem
// i věží naráz (oba mají stabilní ID a oba změní pozici v jednom tahu).

import {
  applyMove,
  initialBoard,
  sideOf,
  squareToCoords,
  typeOf,
  COLS,
  ROWS,
  type Board,
  type MoveDef,
  type PieceSymbol,
} from "./chess-engine";

export interface TrackedPiece {
  id: string;
  symbol: PieceSymbol;
  row: number;
  col: number;
}

type IdBoard = Array<Array<string | null>>;

function initialIdBoard(board: Board): IdBoard {
  const ids: IdBoard = [];
  for (let r = 0; r < ROWS; r++) {
    const row: Array<string | null> = [];
    for (let c = 0; c < COLS; c++) {
      const cell = board[r][c];
      row.push(cell === null ? null : `${cell}-${r}-${c}`);
    }
    ids.push(row);
  }
  return ids;
}

// Přehraje ID-desku stejnou logikou jako applyMove, aby ID figuru následovalo.
function moveIds(ids: IdBoard, board: Board, move: MoveDef): IdBoard {
  const next = ids.map((row) => row.slice());
  const [fromRow, fromCol] = squareToCoords(move.from);
  const [toRow, toCol] = squareToCoords(move.to);

  const piece = board[fromRow][fromCol];
  if (piece === null) return next;

  const side = sideOf(piece);
  const type = typeOf(piece);

  // Přesun ID figury (promoce ID zachovává — stejná figura)
  const id = next[fromRow][fromCol];
  next[fromRow][fromCol] = null;
  next[toRow][toCol] = id;

  // Rošáda — přesun ID věže
  if (type === "K" && Math.abs(fromCol - toCol) === 2) {
    const kingSide = toCol > fromCol;
    const rank = side === "white" ? 7 : 0;
    const rookFromCol = kingSide ? 7 : 0;
    const rookToCol = kingSide ? 5 : 3;
    const rookId = next[rank][rookFromCol];
    next[rank][rookFromCol] = null;
    next[rank][rookToCol] = rookId;
  }

  // En passant — odstranění ID braného pěšce
  if (type === "P" && move.enPassant) {
    next[fromRow][toCol] = null;
  }

  return next;
}

// Vrátí pole sledovaných figur (se stabilními ID) po prvních upToIndex tazích.
export function trackedPiecesUpTo(
  moves: MoveDef[],
  upToIndex: number,
): TrackedPiece[] {
  let board = initialBoard();
  let ids = initialIdBoard(board);

  const limit = Math.min(upToIndex, moves.length);
  for (let i = 0; i < limit; i++) {
    ids = moveIds(ids, board, moves[i]);
    board = applyMove(board, moves[i]);
  }

  const out: TrackedPiece[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const symbol = board[r][c];
      const id = ids[r][c];
      if (symbol !== null && id !== null) {
        out.push({ id, symbol, row: r, col: c });
      }
    }
  }
  // Stabilní pořadí podle ID → konzistentní React klíče/pořadí
  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return out;
}
