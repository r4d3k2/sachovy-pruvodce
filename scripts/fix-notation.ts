// fix-notation.ts — jednorázový nástroj: přepíše řetězce `notation` v datech
// podle enginu (toSan): prefix s číslem tahu, rozlišení (Jbd2 / V1d2), braní,
// proměna a přípony „+" / „#". Hodnoticí přípony (!, ?, !!, ??, !?, ?!) zůstávají.
//
// Použití:  npx tsx scripts/fix-notation.ts          (přepíše soubory)
//           npx tsx scripts/fix-notation.ts --dry     (jen statistika)
//
// Bezpečnostní pojistky: k-tý výskyt `notation: "…"` v souboru se páruje s k-tým
// tahem v exportovaných datech a starý řetězec musí přesně sedět — jinak skript
// skončí bez zápisu. Nelegální tah (např. špatná parita) zastaví přepis dané
// sekvence od místa chyby; ta se musí opravit ručně.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyMoveToState,
  initialState,
  legalMovesFull,
  moveSide,
  toSan,
  type MoveDef,
} from "../src/lib/chess-engine";
import { OPENINGS } from "../src/data/openings";
import { GAMES } from "../src/data/games";

const ANNOTATION_RE = /(\?\?|!!|!\?|\?!|!|\?)$/;
const DRY = process.argv.includes("--dry");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

interface Sequence {
  label: string;
  moves: MoveDef[];
}

interface Expected {
  old: string;
  next: string | null; // null = nelze určit (nelegální tah v sekvenci)
}

function expectedNotations(seq: Sequence): Expected[] {
  const out: Expected[] = [];
  let state = initialState();
  let broken = false;
  for (let i = 0; i < seq.moves.length; i++) {
    const move = seq.moves[i];
    if (broken) {
      out.push({ old: move.notation, next: null });
      continue;
    }
    const match = legalMovesFull(state).find(
      (m) =>
        m.from === move.from &&
        m.to === move.to &&
        (m.promotesTo === undefined || m.promotesTo === move.promotesTo),
    );
    if (!match) {
      console.warn(`  ⚠ ${seq.label} / tah ${i + 1} (${move.notation}): nelegální tah — zbytek sekvence přeskočen`);
      broken = true;
      out.push({ old: move.notation, next: null });
      continue;
    }
    const moveNo = Math.floor(i / 2) + 1;
    const prefix = moveSide(i) === "white" ? `${moveNo}. ` : `${moveNo}... `;
    const san = toSan(state, match);
    // Zachovej hodnoticí příponu ze staré notace.
    const oldBody = move.notation.replace(/^\d+\.(\.\.)?\s*/, "");
    const suffix = ANNOTATION_RE.exec(oldBody)?.[1] ?? "";
    out.push({ old: move.notation, next: `${prefix}${san}${suffix}` });
    state = applyMoveToState(state, match);
  }
  return out;
}

type Category = "šach/mat (+/#)" | "rozlišení přidáno" | "rozlišení odebráno" | "prefix" | "jiné";

function categorize(oldN: string, newN: string): Category {
  const strip = (n: string) => n.replace(/^\d+\.(\.\.)?\s*/, "").replace(ANNOTATION_RE, "");
  const o = strip(oldN);
  const n = strip(newN);
  const oldPrefix = oldN.slice(0, oldN.length - oldN.replace(/^\d+\.(\.\.)?\s*/, "").length);
  const newPrefix = newN.slice(0, newN.length - newN.replace(/^\d+\.(\.\.)?\s*/, "").length);
  if (oldPrefix !== newPrefix) return "prefix";
  const oNoMark = o.replace(/[+#]$/, "");
  const nNoMark = n.replace(/[+#]$/, "");
  if (oNoMark === nNoMark) return "šach/mat (+/#)";
  if (nNoMark.length > oNoMark.length && nNoMark[0] === oNoMark[0]) return "rozlišení přidáno";
  if (nNoMark.length < oNoMark.length && nNoMark[0] === oNoMark[0]) return "rozlišení odebráno";
  return "jiné";
}

function processFile(relPath: string, sequences: Sequence[]): void {
  const path = join(ROOT, relPath);
  const text = readFileSync(path, "utf8");
  const expected = sequences.flatMap(expectedNotations);

  let k = 0;
  let changed = 0;
  const byCategory = new Map<Category, string[]>();

  const next = text.replace(/notation:\s*"([^"]*)"/g, (whole, old: string) => {
    const e = expected[k++];
    if (!e) throw new Error(`${relPath}: v souboru je víc notací než v datech (výskyt ${k})`);
    if (e.old !== old) {
      throw new Error(`${relPath}: nesoulad pořadí — v souboru „${old}", v datech „${e.old}" (výskyt ${k})`);
    }
    if (e.next === null || e.next === old) return whole;
    changed++;
    const cat = categorize(old, e.next);
    const list = byCategory.get(cat) ?? [];
    list.push(`${old} → ${e.next}`);
    byCategory.set(cat, list);
    return `notation: "${e.next}"`;
  });
  if (k !== expected.length) {
    throw new Error(`${relPath}: v souboru je ${k} notací, v datech ${expected.length}`);
  }

  console.log(`\n${relPath}: ${expected.length} notací, změněno ${changed}`);
  for (const [cat, list] of byCategory) {
    console.log(`  • ${cat}: ${list.length}`);
    for (const ex of list.slice(0, 6)) console.log(`      ${ex}`);
    if (list.length > 6) console.log(`      … a dalších ${list.length - 6}`);
  }

  if (!DRY && changed > 0) {
    writeFileSync(path, next, "utf8");
    console.log(`  ✍ zapsáno`);
  }
}

processFile(
  "src/data/openings.ts",
  OPENINGS.flatMap((o) => o.variations.map((v) => ({ label: `${o.name} / ${v.name}`, moves: v.moves }))),
);
processFile(
  "src/data/games.ts",
  GAMES.map((g) => ({ label: `Partie: ${g.title}`, moves: g.moves })),
);

if (DRY) console.log("\n(--dry: nic nezapsáno)");
