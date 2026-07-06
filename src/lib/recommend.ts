// recommend.ts — chytré opakování: vybere (varianta × strana), která uživateli
// jde nejhůř.
//
// Priorita (od nejvyšší):
//   1. 1★
//   2. 2★
//   3. nehrané
//   4. 3★
// V rámci stejné priority: vyšší počet zaznamenaných chyb (mistakes) první.
// Jednotkou je nyní kombinace varianta + strana (bílý/černý). Když je vše
// (obě strany všech variant) na 3★, vrátí null.

import type { Opening } from "../data/openings";
import { progressKey, type PracticeSide, type Progress, type SideResult } from "./storage";

export interface Recommendation {
  openingId: string;
  variationId: string;
  side: PracticeSide;
}

const SIDES: PracticeSide[] = ["white", "black"];

// Nižší rank = vyšší priorita doporučení.
function rankFor(side: SideResult | undefined): number {
  if (!side || !side.played) return 2; // nehrané
  if (side.stars <= 1) return 0; // 1★
  if (side.stars === 2) return 1; // 2★
  return 3; // 3★
}

export function recommend(
  progress: Progress,
  openings: Opening[],
): Recommendation | null {
  let best:
    | { openingId: string; variationId: string; side: PracticeSide; rank: number; mistakes: number }
    | null = null;
  let allMastered = true;

  for (const opening of openings) {
    for (const variation of opening.variations) {
      const vp = progress[progressKey(opening.id, variation.id)];
      for (const side of SIDES) {
        const sr = vp?.[side];
        const rank = rankFor(sr);
        const mistakes = sr?.mistakes ?? 0;

        if (rank !== 3) allMastered = false;

        const better =
          best === null ||
          rank < best.rank ||
          (rank === best.rank && mistakes > best.mistakes);
        if (better) {
          best = {
            openingId: opening.id,
            variationId: variation.id,
            side,
            rank,
            mistakes,
          };
        }
      }
    }
  }

  // Vše zvládnuté na 3★ (nebo žádné varianty) → nic slabého k doporučení.
  if (best === null || allMastered) return null;
  return { openingId: best.openingId, variationId: best.variationId, side: best.side };
}
