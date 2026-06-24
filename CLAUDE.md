# CLAUDE.md — Šachový průvodce (sachovy-pruvodce)

## O projektu

Vzdělávací webová aplikace pro učení šachových zahájení s vyprávěným komentářem.
Cílová skupina: česky mluvící šachisté od začátečníků po středně pokročilé.

Znovuvytvoření dřívější no-code verze, která trpěla nelegálními tahy v datech.
Tato verze má šachový engine + build-time validaci, takže nelegální data
neprojdou buildem.

Sourozenec projektů xiangqi-pruvodce a makruk-pruvodce — sdílí vizuální jazyk
a UX pattern.

Živá URL: https://sachovy-pruvodce.vercel.app/

## Vývojový workflow

- Cesta B z AI Flow průvodce: Claude Code Desktop → GitHub → Vercel
- Větev main, žádné worktree, žádné feature větve
- Před každým úkolem: "Work directly on the main branch, do not create new branches, do not use git worktree."
- Commit/push až po výslovném pokynu "Commit and push to main branch"
- Commit messages v češtině

## Tech stack

- React + TypeScript + Vite
- Tailwind CSS + CSS custom properties (4 témata)
- Vlastní šachový engine v src/lib/chess-engine.ts, žádná externí šachová knihovna
- inline SVG ikony v Icon.tsx (bez externí knihovny)
- tsx (dev-only) pro build-time validační skript
- Žádný backend, žádné API, žádné přihlašování

## Režimy aplikace

1. Studovat — procházení tahů zahájení s komentářem
2. Procvičovat — hádání tahů klikáním, validace, legal-move nápověda, hvězdičky
3. Figury — karty figur s diagramy pohybu + kvíz
4. Partie — instruktážní partie tah po tahu (Légalův mat, Pastýřský mat,
   Operní partie Morphy, Fegatello)

## Klíčové soubory

- src/lib/chess-engine.ts — pravidla pohybu, validace, applyMove
- src/lib/chess-tracking.ts — stabilní ID figur pro animace
- src/lib/storage.ts — localStorage (téma, pokrok)
- src/lib/recommend.ts — chytré opakování slabých míst
- src/data/openings.ts — 5 zahájení × 19 variant × tahy
- src/data/pieces.ts — 6 figur + diagramy
- src/data/games.ts — 4 instruktážní partie
- src/components/chess/ChessBoard.tsx — SVG deska, 2 vrstvy (pole + figury)
- scripts/validate-openings.ts — build-time validace openings.ts I games.ts
- src/pages/Index.tsx — hlavní stránka, 4 režimy

## Validace dat (DŮLEŽITÉ)

Každý tah v openings.ts a games.ts musí být legální dle enginu.
`npm run validate` zkontroluje všechna data; spouští se automaticky
před buildem (prebuild). Pokud build hlásí nelegální tah, oprav DATA,
ne engine (pokud engine není prokazatelně chybný).

Engine validuje pohybové vzory + blokace + braní + rošádu.
NEvaliduje šach/mat/pat — to je záměr (pro výuková data netřeba).

## Vizuální design

- Styl sjednocený s xiangqi-pruvodce
- Figury: Unicode glyfy (U+265A–U+265F, plné), barva přes --piece-*-fill,
  kontura přes --piece-*-stroke (čitelnost na poli stejné barvy),
  vertikální vystředění přes dy na <text>
- 4 témata: wooden-night (default), wooden-day, modern-light, midnight-blue
- Jeden přepínač tématu (cyklující ikonka) vpravo nahoře v hlavičce
- Ikonky u režimů a zahájení (inline SVG v Icon.tsx)
- Česká notace (J/S/V/D/K), rošáda O-O / O-O-O
- Mobile-first, kontejner ~400px

## Co NEDĚLAT

- Nezavádět externí backend, databáze, autentizaci
- Nepřidávat sound effects, reklamy, tracking
- Neobcházet build-time validaci (hlavní pojistka kvality dat)
- Nepřidávat tahy, které nejsou ověřené jako legální
- Nemíchat s no-code nástroji (jen Claude Code + GitHub + Vercel)
