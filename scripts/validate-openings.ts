// validate-openings.ts — build-time validace dat enginem
//
// Projde všechna zahájení → varianty → tahy a všechny instruktážní partie a
// každý tah ověří enginem proti aktuální pozici. Při nelegálním tahu vypíše
// konkrétní chybu a na konci ukončí proces s exit code 1 (tím selže build).
// Tím se zaručí, že nelegální data nikdy neprojdou buildem.

import { applyMove, initialBoard, validateMove } from "../src/lib/chess-engine";
import { OPENINGS } from "../src/data/openings";
import { GAMES } from "../src/data/games";

let errorCount = 0;
let moveCount = 0;
let variationCount = 0;
let gameCount = 0;

// --- Zahájení × varianty ----------------------------------------------------

for (const opening of OPENINGS) {
  for (const variation of opening.variations) {
    variationCount++;
    let board = initialBoard();
    for (let i = 0; i < variation.moves.length; i++) {
      const move = variation.moves[i];
      const result = validateMove(board, move);
      moveCount++;
      if (!result.ok) {
        errorCount++;
        console.error(
          `❌ ${opening.name} / ${variation.name} / tah ${i + 1} (${move.notation}): ${result.reason}`,
        );
        // Nepokračujeme aplikací nelegálního tahu — další tahy by byly nesmyslné.
        break;
      }
      board = applyMove(board, move);
    }
  }
}

// --- Instruktážní partie ----------------------------------------------------

for (const game of GAMES) {
  gameCount++;
  let board = initialBoard();
  for (let i = 0; i < game.moves.length; i++) {
    const move = game.moves[i];
    const result = validateMove(board, move);
    moveCount++;
    if (!result.ok) {
      errorCount++;
      console.error(
        `❌ Partie: ${game.title} / tah ${i + 1} (${move.notation}): ${result.reason}`,
      );
      break;
    }
    board = applyMove(board, move);
  }
}

// --- Souhrn -----------------------------------------------------------------

if (errorCount > 0) {
  console.error(
    `\n💥 Validace selhala: nalezeno ${errorCount} nelegálních tahů. Oprav data v src/data/openings.ts nebo src/data/games.ts.`,
  );
  process.exit(1);
} else {
  console.log(
    `✅ Všech ${moveCount} tahů ve ${variationCount} variantách a ${gameCount} partiích je legálních.`,
  );
  process.exit(0);
}
