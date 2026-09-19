// engine-selftest.ts — self-test šachového enginu (perft + SAN + předčítání).
//
// Spouští se před validací dat (`npm run validate`). Když nesedí perft čísla,
// je chyba v generátoru tahů (src/lib/chess-engine.ts) — oprav engine, ne test.
//
// Perft = počet listů stromu legálních tahů do dané hloubky. Referenční hodnoty
// jsou standardní (chessprogramming wiki) a pokrývají rošádu, braní mimochodem,
// proměny, vazby a šachy.
//
// FEN parser je jen zde (dev-only), runtime engine ho nepotřebuje.

import {
  applyMoveToState,
  findLegalMove,
  initialState,
  isCheckmate,
  isStalemate,
  legalMovesFull,
  toSan,
  type Board,
  type Cell,
  type GameState,
  type MoveCore,
  type PieceSymbol,
} from "../src/lib/chess-engine";
import { notationToSpeech } from "../src/lib/speech";
import { OPENINGS } from "../src/data/openings";
import { GAMES } from "../src/data/games";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  if (actual === expected) {
    console.log(`  ✓ ${label}: ${String(actual)}`);
  } else {
    failures++;
    console.error(`  ✗ ${label}: očekáváno ${String(expected)}, dostal ${String(actual)}`);
  }
}

// --- FEN parser (jen pro test) ----------------------------------------------

function fenToState(fen: string): GameState {
  const [placement, turn, castling, ep] = fen.trim().split(/\s+/);
  const board: Board = [];
  for (const rankStr of placement.split("/")) {
    const row: Cell[] = [];
    for (const ch of rankStr) {
      if (/[1-8]/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) row.push(null);
      } else {
        row.push(ch as PieceSymbol);
      }
    }
    if (row.length !== 8) throw new Error(`FEN: špatná řada „${rankStr}"`);
    board.push(row);
  }
  if (board.length !== 8) throw new Error("FEN: musí mít 8 řad");
  return {
    board,
    turn: turn === "b" ? "black" : "white",
    castling: {
      K: castling.includes("K"),
      Q: castling.includes("Q"),
      k: castling.includes("k"),
      q: castling.includes("q"),
    },
    enPassant: ep && ep !== "-" ? ep : null,
  };
}

// --- Perft -------------------------------------------------------------------

function perft(state: GameState, depth: number): number {
  const moves = legalMovesFull(state);
  if (depth <= 1) return moves.length;
  let n = 0;
  for (const m of moves) n += perft(applyMoveToState(state, m), depth - 1);
  return n;
}

interface PerftCase {
  name: string;
  fen: string;
  expected: number[]; // index 0 = hloubka 1
}

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -";

const PERFT_CASES: PerftCase[] = [
  { name: "výchozí pozice", fen: START_FEN, expected: [20, 400, 8902, 197281] },
  {
    name: "Kiwipete",
    fen: "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -",
    expected: [48, 2039, 97862],
  },
  {
    name: "pozice 3 (e.p., vazby)",
    fen: "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -",
    expected: [14, 191, 2812, 43238],
  },
  {
    name: "pozice 4 (proměny, rošáda)",
    fen: "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq -",
    expected: [6, 264, 9467],
  },
  {
    name: "pozice 5",
    fen: "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ -",
    expected: [44, 1486, 62379],
  },
];

console.log("Perft (generátor legálních tahů):");
const t0 = Date.now();
for (const c of PERFT_CASES) {
  const state = fenToState(c.fen);
  c.expected.forEach((exp, i) => {
    const depth = i + 1;
    const start = Date.now();
    const got = perft(state, depth);
    const ms = Date.now() - start;
    check(`${c.name}, hloubka ${depth} (${ms} ms)`, got, exp);
  });
}
console.log(`  (perft celkem ${Date.now() - t0} ms)`);

// --- Mat / pat ---------------------------------------------------------------

console.log("Mat a pat:");
{
  // Pastýřský mat: 1. e4 e5 2. Sc4 Jc6 3. Dh5 Jf6 4. Dxf7#
  const s = fenToState("r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq -");
  check("pastýřský mat je mat", isCheckmate(s), true);
  check("pastýřský mat není pat", isStalemate(s), false);
  // Klasický pat: černý král a8, bílá dáma b6, bílý král c7... jednodušší:
  const p = fenToState("k7/2Q5/1K6/8/8/8/8/8 b - -");
  check("pat (Ka8, Dc7, Kb6) je pat", isStalemate(p), true);
  check("pat není mat", isCheckmate(p), false);
  const notMate = fenToState("rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq -");
  check("pozice před bláznovským matem není mat", isCheckmate(notMate), false);
  const fools = fenToState("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq -");
  check("bláznovský mat je mat", isCheckmate(fools), true);
}

// --- Rošáda a braní mimochodem ----------------------------------------------

console.log("Rošáda a braní mimochodem:");
{
  // Bílý smí O-O i O-O-O
  const s = fenToState("r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq -");
  const moves = legalMovesFull(s);
  check("O-O dostupné", moves.some((m) => m.from === "e1" && m.to === "g1"), true);
  check("O-O-O dostupné", moves.some((m) => m.from === "e1" && m.to === "c1"), true);
  // Bez práv rošáda není
  const noRights = fenToState("r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w - -");
  check("bez práv žádná rošáda", legalMovesFull(noRights).some((m) => m.from === "e1" && Math.abs(m.to.charCodeAt(0) - 101) === 2), false);
  // Král přechází přes napadené pole f1 (černá věž na f8, sloupec otevřený)
  const through = fenToState("4kr2/8/8/8/8/8/8/R3K2R w KQ -");
  const thr = legalMovesFull(through);
  check("rošáda přes napadené f1 zakázána", thr.some((m) => m.from === "e1" && m.to === "g1"), false);
  check("dlouhá rošáda přitom možná", thr.some((m) => m.from === "e1" && m.to === "c1"), true);
  // Král v šachu nesmí rošovat
  const inCheck = fenToState("4k3/8/8/8/8/8/8/R3K2R w KQ -");
  const chk = legalMovesFull(fenToState("4k3/4r3/8/8/8/8/8/R3K2R w KQ -"));
  void inCheck;
  check("v šachu žádná rošáda", chk.some((m) => m.from === "e1" && Math.abs(m.to.charCodeAt(0) - 101) === 2), false);
  // Braní mimochodem jen hned po dvojkroku
  const ep = fenToState("4k3/8/8/3pP3/8/8/8/4K3 w - d6");
  check("e.p. dostupné hned po dvojkroku", legalMovesFull(ep).some((m) => m.from === "e5" && m.to === "d6" && m.enPassant === true), true);
  const late = fenToState("4k3/8/8/3pP3/8/8/8/4K3 w - -");
  check("e.p. bez práva není", legalMovesFull(late).some((m) => m.from === "e5" && m.to === "d6"), false);
  // Proměna generuje 4 varianty
  const promo = fenToState("8/P3k3/8/8/8/8/8/4K3 w - -");
  const promos = legalMovesFull(promo).filter((m) => m.from === "a7" && m.to === "a8");
  check("proměna má 4 varianty", promos.length, 4);
  check("proměna má vždy promotesTo", promos.every((m) => m.promotesTo !== undefined), true);
}

// --- Česká SAN ---------------------------------------------------------------

console.log("Česká SAN (toSan):");
function sanOf(fen: string, from: string, to: string, promotesTo?: "Q" | "R" | "B" | "N"): string {
  const s = fenToState(fen);
  const m = findLegalMove(s, from, to, promotesTo);
  if (!m) return `<nelegální ${from}-${to}>`;
  return toSan(s, m);
}
check("prostý tah", sanOf(START_FEN, "g1", "f3"), "Jf3");
check("pěšec", sanOf(START_FEN, "e2", "e4"), "e4");
check("braní pěšcem", sanOf("rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -", "e4", "d5"), "exd5");
check("rozlišení souborem (Jbd2)", sanOf("4k3/8/8/8/8/5N2/8/1N2K3 w - -", "b1", "d2"), "Jbd2");
check("rozlišení souborem (Jfd2)", sanOf("4k3/8/8/8/8/5N2/8/1N2K3 w - -", "f3", "d2"), "Jfd2");
check("rozlišení řadou (V1d2)", sanOf("4k3/8/8/8/8/3R4/8/3R1K2 w - -", "d1", "d2"), "V1d2");
check("rozlišení řadou i matem (D2b1#)", sanOf("k7/8/8/8/8/8/Q6Q/Q6K w - -", "a2", "b1"), "D2b1#");
check("rozlišení obojí (Da1b2)", sanOf("8/7k/8/8/8/Q7/8/Q1Q4K w - -", "a1", "b2"), "Da1b2");
check("bez rozlišení, když druhá figura nemůže", sanOf("4k3/8/8/8/8/8/8/R3K2R w - -", "a1", "b1"), "Vb1");
check("vázaná věž nevynucuje rozlišení", sanOf("4r2k/8/8/8/8/8/R3R3/4K3 w - -", "a2", "b2"), "Vb2");
check("braní figurou s rozlišením (Jgxe5)", sanOf("4k3/8/8/4p3/8/3N1N2/8/4K3 w - -", "f3", "e5"), "Jfxe5");
check("šach", sanOf("4k3/8/8/8/8/8/8/R3K3 w - -", "a1", "a8"), "Va8+");
check("mat", sanOf("6k1/5ppp/8/8/8/8/8/R3K3 w - -", "a1", "a8"), "Va8#");
check("krátká rošáda", sanOf("4k3/8/8/8/8/8/8/4K2R w K -", "e1", "g1"), "O-O");
check("dlouhá rošáda s šachem", sanOf("3k4/8/8/8/8/8/8/R3K3 w Q -", "e1", "c1"), "O-O-O+");
check("proměna v dámu bez šachu", sanOf("8/P3k3/8/8/8/8/8/4K3 w - -", "a7", "a8", "Q"), "a8=D");
check("proměna v dámu se šachem", sanOf("4k3/P7/8/8/8/8/8/4K3 w - -", "a7", "a8", "Q"), "a8=D+");
check("proměna braním v jezdce", sanOf("1r6/P3k3/8/8/8/8/8/4K3 w - -", "a7", "b8", "N"), "axb8=J");
check("braní mimochodem", sanOf("4k3/8/8/3pP3/8/8/8/4K3 w - d6", "e5", "d6"), "exd6");

// --- Předčítání notace (speech.ts) ------------------------------------------

console.log("Předčítání notace (notationToSpeech):");
check("šach", notationToSpeech("6. Sb5+"), "střelec b5 šach");
check("mat", notationToSpeech("4. Dxf7#"), "dáma bere f7 mat");
check("rozlišení souborem", notationToSpeech("9. Jbd2"), "jezdec b d2");
check("rozlišení řadou", notationToSpeech("12... V8d7"), "věž 8 d7");
check("rozlišení + braní", notationToSpeech("7... Jgxe5"), "jezdec g bere e5");
check("proměna s šachem", notationToSpeech("7... fxg1=J+"), "pěšec f bere g1 proměna v jezdce šach");
check("rošáda s šachem", notationToSpeech("12. O-O-O+"), "velká rošáda šach");

// Každá notace v datech musí být po převodu bez „+", „#" a bez holých písmen.
{
  const all: string[] = [];
  for (const o of OPENINGS) for (const v of o.variations) for (const m of v.moves) all.push(m.notation);
  for (const g of GAMES) for (const m of g.moves) all.push(m.notation);
  const bad = all.filter((n) => {
    const s = notationToSpeech(n);
    return /[+#=]/.test(s) || /\b[JSVDK][a-h]?[1-8]?x?[a-h][1-8]\b/.test(s) || /\bO-O/.test(s);
  });
  check(`všech ${all.length} notací v datech se čte bez „plus"/„mřížka"`, bad.length, 0);
  if (bad.length) console.error("    např.:", bad.slice(0, 8).map((n) => `${n} → ${notationToSpeech(n)}`).join(" | "));
}

// --- Výsledek ----------------------------------------------------------------

// Použité pouze kvůli typům (MoveCore importován pro čitelnost signatur).
void (null as MoveCore | null);

if (failures > 0) {
  console.error(`\n💥 Self-test enginu selhal: ${failures} chyb.`);
  process.exit(1);
}
console.log("\n✅ Self-test enginu prošel.");
