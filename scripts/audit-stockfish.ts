// audit-stockfish.ts — ruční audit hodnocení variant Stockfishem (dev-only).
//
// NENÍ součástí prebuild. Spouští se ručně: `npm run audit`.
// Projde pozice všech variant zahájení (volitelně i partií), každou ohodnotí
// Stockfishem (WASM build z devDependency `stockfish`, výchozí „lite-single")
// a vypíše tahy, po kterých se hodnocení z pohledu táhnoucí strany propadne
// o ≥ THRESHOLD centipěšců a komentář to neoznačuje jako chybu
// (notace s „?" nebo komentář obsahující chyb/omyl/přehléd).
//
// Volby:
//   --depth 16            hloubka analýzy (výchozí 16)
//   --threshold 150       práh propadu v centipěšcích (výchozí 150)
//   --only london,sicilian  jen vybraná zahájení (id)
//   --games               zahrnout i instruktážní partie (informativně)
//   --engine lite-single  lite-single | lite | single | full
//   --verbose             vypsat hodnocení každého tahu
//   --line "1. e4 e5 …"   místo dat prověřit zadanou linii v české SAN
//                         (např. kandidátní variantu před zápisem do openings.ts)
//
// Hodnocení je vždy z pohledu bílého (kladné = bílý lépe), v pěšcích.

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import {
  applyMoveToState,
  initialState,
  legalMovesFull,
  toSan,
  type GameState,
  type MoveDef,
} from "../src/lib/chess-engine";
import { OPENINGS } from "../src/data/openings";
import { GAMES } from "../src/data/games";

// --- Argumenty ---------------------------------------------------------------

const args = process.argv.slice(2);
const opt = (name: string, def: string): string => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const DEPTH = Number(opt("--depth", "16"));
const THRESHOLD = Number(opt("--threshold", "150"));
const ONLY = args.includes("--only") ? opt("--only", "").split(",") : null;
const WITH_GAMES = args.includes("--games");
const VERBOSE = args.includes("--verbose");
const ENGINE_FLAVOR = opt("--engine", "lite-single");
const LINE = args.includes("--line") ? opt("--line", "") : null;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENGINE_FILES: Record<string, string> = {
  "lite-single": "stockfish-19-lite-single.js",
  lite: "stockfish-19-lite.js",
  single: "stockfish-19-single.js",
  full: "stockfish-19.js",
};

const MISTAKE_NOTATION = /\?/;
const MISTAKE_COMMENT = /chyb|omyl|přehl[eé]d/i;
const ANNOTATION_RE = /(\?\?|!!|!\?|\?!|!|\?)$/;

// Převede linii v české SAN („1. e4 e5 2. Jf3 …", hodnoticí přípony povoleny)
// na pole MoveDef bez komentářů. Nelegální tah = chyba.
function parseSanLine(line: string): MoveDef[] {
  const tokens = line
    .split(/\s+/)
    .filter((t) => t && !/^\d+\.(\.\.)?$/.test(t))
    .map((t) => t.replace(/^\d+\.(\.\.)?/, ""));
  let state = initialState();
  const out: MoveDef[] = [];
  tokens.forEach((tok, i) => {
    const core = tok.replace(ANNOTATION_RE, "");
    const match = legalMovesFull(state).find((m) => toSan(state, m) === core);
    if (!match) throw new Error(`--line: tah ${i + 1} „${tok}" není v této pozici legální`);
    const n = Math.floor(i / 2) + 1;
    out.push({ ...match, notation: `${i % 2 === 0 ? `${n}. ` : `${n}... `}${tok}`, comment: "" });
    state = applyMoveToState(state, match);
  });
  return out;
}

// --- FEN ---------------------------------------------------------------------

function toFen(s: GameState): string {
  const rows = s.board.map((row) => {
    let out = "";
    let empty = 0;
    for (const c of row) {
      if (c === null) empty++;
      else {
        if (empty) {
          out += empty;
          empty = 0;
        }
        out += c;
      }
    }
    if (empty) out += empty;
    return out;
  });
  const castle =
    `${s.castling.K ? "K" : ""}${s.castling.Q ? "Q" : ""}${s.castling.k ? "k" : ""}${s.castling.q ? "q" : ""}` || "-";
  return `${rows.join("/")} ${s.turn === "white" ? "w" : "b"} ${castle} ${s.enPassant ?? "-"} 0 1`;
}

// --- UCI engine přes stdin/stdout -------------------------------------------

interface Score {
  cp: number; // z pohledu bílého; mat = ±10000
  mate?: number;
  depth: number;
  pv: string;
}

class Engine {
  private proc: ChildProcessWithoutNullStreams;
  private waiters: Array<{ test: (line: string) => boolean; resolve: (line: string) => void }> = [];
  private lastInfo: { cp?: number; mate?: number; depth: number; pv: string } | null = null;

  constructor(file: string) {
    this.proc = spawn(process.execPath, [file], { stdio: ["pipe", "pipe", "pipe"] });
    const rl = createInterface({ input: this.proc.stdout });
    rl.on("line", (line) => this.onLine(line));
    this.proc.stderr.on("data", () => {
      /* ignoruj hlášky WASM runtime */
    });
  }

  private onLine(line: string): void {
    if (line.startsWith("info ") && line.includes(" score ")) {
      const depth = Number(/ depth (\d+)/.exec(line)?.[1] ?? 0);
      const cp = /score cp (-?\d+)/.exec(line);
      const mate = /score mate (-?\d+)/.exec(line);
      const pv = / pv (.+)$/.exec(line)?.[1] ?? "";
      if (!/ multipv (\d+)/.test(line) || / multipv 1\b/.test(line)) {
        this.lastInfo = { cp: cp ? Number(cp[1]) : undefined, mate: mate ? Number(mate[1]) : undefined, depth, pv };
      }
    }
    for (let i = 0; i < this.waiters.length; i++) {
      if (this.waiters[i].test(line)) {
        const w = this.waiters.splice(i, 1)[0];
        w.resolve(line);
        break;
      }
    }
  }

  send(cmd: string): void {
    this.proc.stdin.write(cmd + "\n");
  }

  wait(test: (line: string) => boolean): Promise<string> {
    return new Promise((resolve) => this.waiters.push({ test, resolve }));
  }

  async init(): Promise<void> {
    this.send("uci");
    await this.wait((l) => l === "uciok");
    this.send("setoption name Threads value 1");
    this.send("setoption name Hash value 64");
    this.send("isready");
    await this.wait((l) => l === "readyok");
  }

  async evaluate(fen: string, sideToMove: "white" | "black"): Promise<Score> {
    this.lastInfo = null;
    this.send("ucinewgame");
    this.send(`position fen ${fen}`);
    this.send(`go depth ${DEPTH}`);
    await this.wait((l) => l.startsWith("bestmove"));
    const info = this.lastInfo;
    if (!info) return { cp: 0, depth: 0, pv: "" };
    // UCI skóre je z pohledu strany na tahu → převeď na pohled bílého.
    const sign = sideToMove === "white" ? 1 : -1;
    if (info.mate !== undefined) {
      // „mate 0" = strana na tahu je v matu → z pohledu bílého ±10000 podle toho, kdo je na tahu.
      if (info.mate === 0) return { cp: -10000 * sign, mate: 0, depth: info.depth, pv: info.pv };
      const m = info.mate * sign;
      return { cp: m > 0 ? 10000 : -10000, mate: m, depth: info.depth, pv: info.pv };
    }
    return { cp: (info.cp ?? 0) * sign, depth: info.depth, pv: info.pv };
  }

  quit(): void {
    this.send("quit");
    setTimeout(() => this.proc.kill(), 500);
  }
}

// --- Audit -------------------------------------------------------------------

function fmt(s: Score): string {
  if (s.mate === 0) return s.cp > 0 ? "1-0 (mat)" : "0-1 (mat)";
  if (s.mate !== undefined) return `M${s.mate}`;
  return (s.cp / 100).toFixed(2);
}

interface Finding {
  label: string;
  index: number;
  notation: string;
  before: Score;
  after: Score;
  drop: number;
}

async function auditSequence(
  engine: Engine,
  label: string,
  moves: MoveDef[],
  findings: Finding[],
): Promise<number> {
  let state = initialState();
  let before = await engine.evaluate(toFen(state), state.turn);
  if (VERBOSE) console.log(`\n### ${label}\n  start ${fmt(before)}`);
  let positions = 1;
  for (let i = 0; i < moves.length; i++) {
    const mover = state.turn;
    state = applyMoveToState(state, moves[i]);
    const after = await engine.evaluate(toFen(state), state.turn);
    positions++;
    const drop = mover === "white" ? after.cp - before.cp : before.cp - after.cp; // z pohledu táhnoucího
    const marked = MISTAKE_NOTATION.test(moves[i].notation) || MISTAKE_COMMENT.test(moves[i].comment ?? "");
    const flag = drop <= -THRESHOLD ? (marked ? "  (označeno jako chyba)" : "  ⚠ PROPAD") : "";
    if (VERBOSE) console.log(`  ${moves[i].notation.padEnd(12)} ${fmt(after).padStart(7)}${flag}`);
    if (drop <= -THRESHOLD && !marked) {
      findings.push({ label, index: i, notation: moves[i].notation, before, after, drop });
    }
    before = after;
  }
  if (!VERBOSE) console.log(`  ${label}: konec ${fmt(before)}`);
  return positions;
}

async function main(): Promise<void> {
  const file = join(ROOT, "node_modules", "stockfish", "bin", ENGINE_FILES[ENGINE_FLAVOR] ?? ENGINE_FILES["lite-single"]);
  if (!existsSync(file)) {
    console.error(`Engine nenalezen: ${file}. Nainstaluj devDependency: npm install --save-dev stockfish`);
    process.exit(2);
  }
  const engine = new Engine(file);
  await engine.init();
  console.log(`Stockfish audit — ${ENGINE_FLAVOR}, hloubka ${DEPTH}, práh ${THRESHOLD} cp\n`);

  const findings: Finding[] = [];
  let positions = 0;
  let sequences = 0;
  const t0 = Date.now();

  if (LINE !== null) {
    const moves = parseSanLine(LINE);
    positions += await auditSequence(engine, "zadaná linie", moves, findings);
    engine.quit();
    console.log(`
=== Propady ≥ ${(THRESHOLD / 100).toFixed(1)} pěšce bez označení chyby (${findings.length}) ===`);
    for (const f of findings) {
      console.log(
        `⚠ tah ${f.index + 1} (${f.notation}): ${fmt(f.before)} → ${fmt(f.after)} (propad ${(f.drop / 100).toFixed(2)}), lepší bylo ${f.before.pv.split(" ")[0]}`,
      );
    }
    console.log(`
Souhrn: ${positions} pozic · ${Math.round((Date.now() - t0) / 1000)} s`);
    return;
  }

  for (const o of OPENINGS) {
    if (ONLY && !ONLY.includes(o.id)) continue;
    for (const v of o.variations) {
      sequences++;
      positions += await auditSequence(engine, `${o.name} / ${v.name}`, v.moves, findings);
    }
  }
  const openingFindings = findings.length;

  if (WITH_GAMES) {
    console.log("\nPartie (informativně — oběti a pasti propady hlásí záměrně):");
    for (const g of GAMES) {
      sequences++;
      positions += await auditSequence(engine, `Partie: ${g.title}`, g.moves, findings);
    }
  }

  engine.quit();

  console.log(`\n=== Propady ≥ ${(THRESHOLD / 100).toFixed(1)} pěšce bez označení chyby (${findings.length}) ===`);
  for (const f of findings) {
    console.log(
      `⚠ ${f.label} / tah ${f.index + 1} (${f.notation}): ${fmt(f.before)} → ${fmt(f.after)} (propad ${(f.drop / 100).toFixed(2)}), lepší bylo ${f.before.pv.split(" ")[0]}`,
    );
  }
  console.log(
    `\nSouhrn: ${positions} pozic · ${sequences} sekvencí · ${openingFindings} propadů v zahájeních · ${Math.round((Date.now() - t0) / 1000)} s`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
