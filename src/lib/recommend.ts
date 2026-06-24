// recommend.ts — chytré opakování: vybere variantu, kterou uživateli jde nejhůř.
//
// Priorita (od nejvyšší):
//   1. varianty s 1★
//   2. varianty s 2★
//   3. nehrané varianty (bez záznamu v progress)
//   4. varianty s 3★ (nejlepší — opakují se nejméně)
// V rámci stejné priority: vyšší počet zaznamenaných chyb (mistakes) první.
// Když je vše na 3★, vrátí null (nic slabého k procvičení).

import type { Opening } from "../data/openings";
import { progressKey, type Progress } from "./storage";

export interface Recommendation {
  openingId: string;
  variationId: string;
}

// Nižší rank = vyšší priorita doporučení.
function rankFor(stars: number | undefined): number {
  if (stars === undefined) return 2; // nehrané
  if (stars <= 1) return 0; // 1★
  if (stars === 2) return 1; // 2★
  return 3; // 3★
}

export function recommend(
  progress: Progress,
  openings: Opening[],
): Recommendation | null {
  let best:
    | { openingId: string; variationId: string; rank: number; mistakes: number }
    | null = null;
  let allMastered = true;

  for (const opening of openings) {
    for (const variation of opening.variations) {
      const res = progress[progressKey(opening.id, variation.id)];
      const rank = rankFor(res?.stars);
      const mistakes = res?.mistakes ?? 0;

      if (rank !== 3) allMastered = false;

      const better =
        best === null ||
        rank < best.rank ||
        (rank === best.rank && mistakes > best.mistakes);
      if (better) {
        best = { openingId: opening.id, variationId: variation.id, rank, mistakes };
      }
    }
  }

  // Vše zvládnuté na 3★ (nebo žádné varianty) → nic slabého k doporučení.
  if (best === null || allMastered) return null;
  return { openingId: best.openingId, variationId: best.variationId };
}
