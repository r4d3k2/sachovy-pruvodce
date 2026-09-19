// validate-openings.ts — build-time validace dat enginem
//
// Projde všechna zahájení → varianty → tahy a všechny instruktážní partie.
// Spouští se automaticky před buildem (prebuild) po self-testu enginu.
//
// CHYBY (build spadne):
//   1. střídání stran — sudý index hraje bílý, lichý černý
//   2. plná legalita — tah musí být v legalMovesFull (šach, práva na rošádu,
//      braní mimochodem jen hned po dvojkroku, křížová kontrola piece/captured)
//   3. proměna — pěšec na poslední řadě musí mít `promotesTo`
//   4. notace — prefix „N. " / „N... " a zbytek přesně = toSan() (včetně +/#);
//      povolena jen hodnoticí přípona !, ?, !!, ??, !?, ?!
//   5. unikátní id (zahájení, opening/variation, partie), neprázdný komentář
//   5b. křížové odkazy `related` ukazují na existující id (partie → zahájení,
//       zahájení → partie) a nejsou duplicitní
//
// VAROVÁNÍ (build nespadne, vypíše se report):
//   6. ignorovaná visící figura (zahájení; u partií jen informativně):
//      po tahu strany A visí její figura hodnoty ≥ 3, pokud ji B může vzít a je
//      nekrytá, nebo ji může vzít figurou nižší hodnoty; pěšec se hlásí až při
//      druhém ignorování po sobě. Nehlásí se, když B v odpovědi visící figuru
//      bere, dává šach, bere něco aspoň stejně cenného, nebo komentář tahu
//      A / odpovědi B obsahuje chyb|oběť|past|gambit|visí|nechává.
//   7. allowlist scripts/audit-allowlist.json pro vědomě ponechané případy
//      ([{ "key": "openingId/variationId/index", "reason": "…" }], index = 0-based
//      index tahu strany A)
//   8. partie s „mat" ve `result` musí končit matem na desce
//   9. varianta kratší než 16 půltahů
//
// Když build hlásí chybu, oprav DATA (src/data/*.ts), ne engine — pokud engine
// není prokazatelně chybný (to hlídá scripts/engine-selftest.ts).

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyMoveToState,
  initialState,
  isCheckmate,
  isInCheck,
  isSquareAttacked,
  legalMovesFull,
  moveSide,
  sideOf,
  toSan,
  typeOf,
  validateMove,
  type GameState,
  type MoveCore,
  type MoveDef,
  type PieceSymbol,
  type Side,
} from "../src/lib/chess-engine";
import { OPENINGS } from "../src/data/openings";
import { GAMES } from "../src/data/games";

// --- Nastavení ---------------------------------------------------------------

const ANNOTATION_RE = /(\?\?|!!|!\?|\?!|!|\?)$/;
const SUPPRESS_RE = /chyb|obě[tť]|past|gambit|visí|nechává/i;
const MIN_VARIATION_PLIES = 16;

const PIECE_VALUE: Record<string, number> = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 100 };
const PIECE_NAME: Record<string, string> = {
  P: "pěšec",
  N: "jezdec",
  B: "střelec",
  R: "věž",
  Q: "dáma",
  K: "král",
};

interface AllowEntry {
  key: string; // "openingId/variationId/index" (index = 0-based index tahu, po kterém figura visí)
  reason: string;
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function loadAllowlist(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const raw = readFileSync(join(SCRIPT_DIR, "audit-allowlist.json"), "utf8");
    const parsed = JSON.parse(raw) as AllowEntry[];
    for (const e of parsed) {
      if (typeof e.key === "string" && typeof e.reason === "string" && e.reason.trim()) {
        map.set(e.key, e.reason);
      }
    }
  } catch {
    /* chybějící nebo poškozený allowlist = prázdný */
  }
  return map;
}

const allowlist = loadAllowlist();
const allowlistUsed = new Set<string>();

// --- Sběr výsledků -----------------------------------------------------------

const errors: string[] = [];
const warnings: string[] = [];
const infos: string[] = [];
let moveCount = 0;
let variationCount = 0;
let gameCount = 0;

// --- Analýza visících figur --------------------------------------------------

interface Hanging {
  square: string;
  piece: PieceSymbol;
  value: number;
}

// Po tahu strany A (stav `state`, na tahu B): které figury A visí?
//   • hodnota ≥ 3: nekryté a braitelné, nebo braitelné figurou nižší hodnoty
//   • pěšci: nekrytí a braitelní (hlásí se až při 2. ignorování po sobě)
function findHanging(state: GameState, sideA: Side): { pieces: Hanging[]; pawns: Hanging[] } {
  const pieces = new Map<string, Hanging>();
  const pawns = new Map<string, Hanging>();
  for (const m of legalMovesFull(state)) {
    if (!m.captured || m.enPassant) continue;
    const victimValue = PIECE_VALUE[typeOf(m.captured)];
    const attackerValue = PIECE_VALUE[typeOf(m.piece)];
    const defended = isSquareAttacked(state.board, m.to, sideA);
    if (victimValue >= 3 && victimValue < 100) {
      if (!defended || attackerValue < victimValue) {
        pieces.set(m.to, { square: m.to, piece: m.captured, value: victimValue });
      }
    } else if (victimValue === 1 && !defended) {
      pawns.set(m.to, { square: m.to, piece: m.captured, value: 1 });
    }
  }
  return { pieces: [...pieces.values()], pawns: [...pawns.values()] };
}

function describe(h: Hanging): string {
  return `${PIECE_NAME[typeOf(h.piece)]} na ${h.square}`;
}

// --- Průchod jednou sekvencí tahů --------------------------------------------

interface SequenceOptions {
  label: string; // pro hlášky
  keyPrefix: string | null; // "openingId/variationId" pro allowlist; null = partie
  hangingMode: "warn" | "info";
}

function walkSequence(moves: MoveDef[], opts: SequenceOptions): { state: GameState; ok: boolean } {
  let state = initialState();
  // klíč `${side}:${square}` → kolik soupeřových tahů po sobě pěšec visel a byl ignorován
  const pawnStreak = new Map<string, number>();

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const where = `${opts.label} / tah ${i + 1} (${move.notation})`;
    moveCount++;

    // 5. neprázdný komentář
    if (typeof move.comment !== "string" || move.comment.trim() === "") {
      errors.push(`${where}: prázdný komentář`);
    }

    // 1. střídání stran
    const expectedSide = moveSide(i);
    if (sideOf(move.piece) !== expectedSide) {
      errors.push(
        `${where}: střídání stran — na tahu je ${expectedSide === "white" ? "bílý" : "černý"}, ale táhne figura ${move.piece}`,
      );
      return { state, ok: false };
    }

    // 2a. vzorová vrstva (figura na poli, vzor pohybu, piece/captured)
    const basic = validateMove(state.board, move);
    if (!basic.ok) {
      errors.push(`${where}: ${basic.reason}`);
      return { state, ok: false };
    }

    // 2b + 3. plná legalita
    const legal = legalMovesFull(state);
    const sameFromTo = legal.filter((m) => m.from === move.from && m.to === move.to);
    let match: MoveCore | undefined;
    if (sameFromTo.length > 0 && sameFromTo[0].promotesTo !== undefined) {
      if (!move.promotesTo) {
        errors.push(`${where}: proměna — pěšec dochází na poslední řadu, pole promotesTo je povinné`);
        return { state, ok: false };
      }
      match = sameFromTo.find((m) => m.promotesTo === move.promotesTo);
    } else {
      match = sameFromTo[0];
    }
    if (!match) {
      let why: string;
      if (isInCheck(state)) why = "král je v šachu a tah ho neřeší";
      else if (typeOf(move.piece) === "K" && Math.abs(move.to.charCodeAt(0) - move.from.charCodeAt(0)) === 2)
        why = "rošáda není možná (ztracené právo, král v šachu nebo přechází přes napadené pole)";
      else if (move.enPassant) why = "braní mimochodem není možné (soupeř právě netáhl tímto pěšcem o dvě pole)";
      else why = "tah nechává vlastního krále v šachu";
      errors.push(`${where}: nelegální tah — ${why}`);
      return { state, ok: false };
    }
    if (match.enPassant && !move.enPassant) {
      errors.push(`${where}: braní mimochodem musí mít enPassant: true`);
      return { state, ok: false };
    }
    if (move.enPassant && !match.enPassant) {
      errors.push(`${where}: tah má enPassant: true, ale není to braní mimochodem`);
      return { state, ok: false };
    }

    // 4. notace ↔ tah
    const moveNo = Math.floor(i / 2) + 1;
    const prefix = expectedSide === "white" ? `${moveNo}. ` : `${moveNo}... `;
    const san = toSan(state, match);
    if (!move.notation.startsWith(prefix)) {
      errors.push(`${where}: notace má mít prefix „${prefix}" (očekáváno „${prefix}${san}")`);
    } else {
      const rest = move.notation.slice(prefix.length);
      const core = rest.replace(ANNOTATION_RE, "");
      if (core !== san) {
        const suffix = rest.slice(core.length);
        errors.push(`${where}: notace neodpovídá tahu — očekáváno „${prefix}${san}${suffix}"`);
      }
    }

    const next = applyMoveToState(state, match);

    // 6. visící figury (po tahu strany A, kromě posledního tahu)
    if (i < moves.length - 1) {
      const reply = moves[i + 1];
      const { pieces, pawns } = findHanging(next, expectedSide);
      const replyLegal = legalMovesFull(next).find((m) => m.from === reply.from && m.to === reply.to);
      const replyGivesCheck = replyLegal ? isInCheck(applyMoveToState(next, replyLegal), expectedSide) : false;
      const replyCaptureValue = replyLegal?.captured ? PIECE_VALUE[typeOf(replyLegal.captured)] : 0;
      const suppressed = SUPPRESS_RE.test(move.comment ?? "") || SUPPRESS_RE.test(reply.comment ?? "");
      const key = opts.keyPrefix ? `${opts.keyPrefix}/${i}` : null;

      const report = (text: string) => {
        if (key && allowlist.has(key)) {
          allowlistUsed.add(key);
          return;
        }
        const line = `${opts.label} / tah ${i + 1} (${move.notation}): ${text}, soupeř hraje ${reply.notation}`;
        if (opts.hangingMode === "warn") warnings.push(line);
        else infos.push(line);
      };

      if (pieces.length > 0) {
        const maxValue = Math.max(...pieces.map((h) => h.value));
        const replyTakesHanging = pieces.some((h) => h.square === reply.to && replyLegal?.captured);
        if (!replyTakesHanging && !replyGivesCheck && replyCaptureValue < maxValue && !suppressed) {
          report(`visí ${pieces.map(describe).join(", ")}`);
        }
      }

      // Pěšci: hlásit až při druhém ignorování po sobě. Potlačení bere v úvahu
      // i komentáře prvního ignorovaného páru (i-2, i-1) — vysvětlení gambitu
      // bývá u tahu, který pěšce nabídl, ne o dva půltahy později.
      const pawnSuppressed =
        suppressed ||
        (i >= 2 && (SUPPRESS_RE.test(moves[i - 2].comment ?? "") || SUPPRESS_RE.test(moves[i - 1].comment ?? "")));
      const sidePrefix = `${expectedSide}:`;
      const nowHanging = new Set(pawns.map((h) => h.square));
      for (const k of [...pawnStreak.keys()]) {
        if (k.startsWith(sidePrefix) && !nowHanging.has(k.slice(sidePrefix.length))) pawnStreak.delete(k);
      }
      for (const h of pawns) {
        const k = `${sidePrefix}${h.square}`;
        const ignored = !(reply.to === h.square && replyLegal?.captured) && !replyGivesCheck && replyCaptureValue < 1;
        if (!ignored) {
          pawnStreak.delete(k);
          continue;
        }
        const streak = (pawnStreak.get(k) ?? 0) + 1;
        pawnStreak.set(k, streak);
        if (streak === 2 && !pawnSuppressed) report(`visí ${describe(h)} už druhý tah po sobě`);
      }
    }

    state = next;
  }
  return { state, ok: true };
}

// --- 5. Unikátní id ------------------------------------------------------------

{
  const openingIds = new Set<string>();
  const variationKeys = new Set<string>();
  for (const o of OPENINGS) {
    if (openingIds.has(o.id)) errors.push(`Duplicitní id zahájení „${o.id}"`);
    openingIds.add(o.id);
    for (const v of o.variations) {
      // Pokrok v localStorage je klíčován `${openingId}/${variationId}` (storage.ts),
      // proto musí být unikátní tato dvojice.
      const key = `${o.id}/${v.id}`;
      if (variationKeys.has(key)) errors.push(`Duplicitní varianta „${key}"`);
      variationKeys.add(key);
    }
  }
  const gameIds = new Set<string>();
  for (const g of GAMES) {
    if (gameIds.has(g.id)) errors.push(`Duplicitní id partie „${g.id}"`);
    gameIds.add(g.id);
  }

  // 5b. křížové odkazy
  for (const g of GAMES) {
    const seen = new Set<string>();
    for (const id of g.related ?? []) {
      if (!openingIds.has(id)) errors.push(`Partie „${g.id}": related odkazuje na neexistující zahájení „${id}"`);
      if (seen.has(id)) errors.push(`Partie „${g.id}": duplicitní related „${id}"`);
      seen.add(id);
    }
  }
  for (const o of OPENINGS) {
    const seen = new Set<string>();
    for (const id of o.related ?? []) {
      if (!gameIds.has(id)) errors.push(`Zahájení „${o.id}": related odkazuje na neexistující partii „${id}"`);
      if (seen.has(id)) errors.push(`Zahájení „${o.id}": duplicitní related „${id}"`);
      seen.add(id);
    }
  }
}

// --- Zahájení × varianty ----------------------------------------------------

for (const opening of OPENINGS) {
  for (const variation of opening.variations) {
    variationCount++;
    const label = `${opening.name} / ${variation.name}`;
    walkSequence(variation.moves, {
      label,
      keyPrefix: `${opening.id}/${variation.id}`,
      hangingMode: "warn",
    });
    // 9. délka
    if (variation.moves.length < MIN_VARIATION_PLIES) {
      warnings.push(`${label}: jen ${variation.moves.length} půltahů (doporučeno ≥ ${MIN_VARIATION_PLIES})`);
    }
  }
}

// --- Instruktážní partie ----------------------------------------------------

for (const game of GAMES) {
  gameCount++;
  const label = `Partie: ${game.title}`;
  const { state, ok } = walkSequence(game.moves, { label, keyPrefix: null, hangingMode: "info" });
  // 8. „mat" ve výsledku ↔ mat na desce
  if (ok && /\bmat(em|u)?\b/i.test(game.result) && !isCheckmate(state)) {
    warnings.push(`${label}: result říká „mat", ale koncová pozice není mat`);
  }
}

// --- Nepoužité položky allowlistu -------------------------------------------

for (const key of allowlist.keys()) {
  if (!allowlistUsed.has(key)) infos.push(`allowlist: položka „${key}" už není potřeba (nic nehlásí)`);
}

// --- Report -----------------------------------------------------------------

if (errors.length > 0) {
  console.error("❌ CHYBY:");
  for (const e of errors) console.error(`   ${e}`);
}
if (warnings.length > 0) {
  console.warn(`\n⚠️  VAROVÁNÍ (${warnings.length}):`);
  for (const w of warnings) console.warn(`   ${w}`);
}
if (infos.length > 0) {
  console.log(`\nℹ️  Informativně (${infos.length}):`);
  for (const t of infos) console.log(`   ${t}`);
}
if (allowlistUsed.size > 0) {
  console.log(`\n📋 Allowlist: ${allowlistUsed.size} potlačených varování.`);
}

console.log(
  `\nSouhrn: ${moveCount} tahů · ${variationCount} variant · ${gameCount} partií · ${errors.length} chyb · ${warnings.length} varování`,
);

if (errors.length > 0) {
  console.error(`\n💥 Validace selhala. Oprav data v src/data/openings.ts nebo src/data/games.ts.`);
  process.exit(1);
}
console.log("✅ Validace prošla.");
process.exit(0);
