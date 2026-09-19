# Šachový průvodce

Vzdělávací webová aplikace pro učení šachových zahájení s vyprávěným českým
komentářem. Čtyři režimy: **Studovat** (tahy zahájení s komentářem),
**Procvičovat** (hádání tahů za bílého i černého s hvězdičkami),
**Figury** (karty figur + kvíz) a **Partie** (slavné partie a pasti tah po tahu).

Živá verze: https://sachovy-pruvodce.vercel.app/

## Obsah

- 13 zahájení × 39 variant s komentářem ke každému tahu
- 32 partií: 16 slavných partií a 16 pastí, seřazených podle obtížnosti
- křížové odkazy: zahájení ↔ související pasti a partie

Každý tah v datech prochází build-time validací vlastním šachovým enginem
(legalita, střídání stran, notace, šach a mat), takže nelegální data neprojdou
buildem.

## Skripty

| příkaz | co dělá |
| --- | --- |
| `npm run dev` | dev server (Vite) |
| `npm run validate` | self-test enginu (perft) + validace všech dat; běží automaticky před buildem |
| `npm run selftest` | jen self-test enginu |
| `npm run fix-notation` | přepíše pole `notation` v datech podle enginu (`-- --dry` = jen statistika) |
| `npm run audit` | ruční audit hodnocení zahájení Stockfishem (`--line "1. e4 e5 …"` prověří kandidátní linii) |
| `npm run build` | validace + TypeScript + Vite build |

## Struktura dat

- `src/data/openings.ts` — `Opening { id, name, difficulty, intro, history, variations, related }`,
  `Variation { id, name, description, moves }`
- `src/data/games.ts` — `Game { id, title, topic, category ("classic" | "trap"), difficulty, result, description, moves, related }`
- `src/data/pieces.ts` — karty figur
- tah = `MoveDef { from, to, piece, captured?, promotesTo?, enPassant?, notation, comment }`
  (česká notace J/S/V/D/K, rošáda O-O / O-O-O)

## Technologie

React + TypeScript + Vite, Tailwind CSS se čtyřmi tématy přes CSS proměnné,
vlastní engine v `src/lib/chess-engine.ts` (bez externí šachové knihovny),
předčítání přes Web Speech API. Žádný backend. Podrobnosti pro vývoj jsou
v `CLAUDE.md`.
