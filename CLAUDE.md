# CLAUDE.md — Šachový průvodce (sachovy-pruvodce)

## O projektu

Vzdělávací webová aplikace pro učení šachových zahájení s vyprávěným komentářem.
Cílová skupina: česky mluvící šachisté od začátečníků po středně pokročilé.

Znovuvytvoření dřívější no-code verze, která trpěla nelegálními tahy v datech.
Tato verze má vlastní šachový engine + build-time validaci, takže nelegální
ani šachově chybná data neprojdou buildem.

Sourozenec projektů xiangqi-pruvodce a makruk-pruvodce — sdílí vizuální jazyk
a UX pattern.

Živá URL: https://sachovy-pruvodce.vercel.app/

## Vývojový workflow

- Cesta B z AI Flow průvodce: Claude Code Desktop → GitHub → Vercel
- Větev main, žádné worktree, žádné feature větve
- Před každým úkolem: "Work directly on the main branch, do not create new branches, do not use git worktree."
- Commit/push až po výslovném pokynu "Commit and push to main branch"
- Commit messages v češtině
- Dev server spouští Claude Code Desktop Preview (`.claude/launch.json`), ne `npm run dev` z agenta

## Tech stack

- React + TypeScript + Vite
- Tailwind CSS + CSS custom properties (4 témata)
- Vlastní šachový engine v src/lib/chess-engine.ts, žádná externí šachová knihovna
- inline SVG ikony v Icon.tsx (bez externí knihovny)
- tsx (dev-only) pro validační a auditní skripty
- stockfish (dev-only, WASM) jen pro ruční `npm run audit`
- Žádný backend, žádné API, žádné přihlašování

## Režimy aplikace

1. Studovat — procházení tahů zahájení s komentářem, taby Strategie/Historie/Tah,
   blok „Související pasti a partie“ (křížové odkazy do režimu Partie)
2. Procvičovat — hádání tahů klikáním za bílého i černého, plně legální
   nápověda (rošáda, braní mimochodem, žádné tahy do šachu), hvězdičky
3. Figury — karty figur s diagramy pohybu + kvíz
4. Partie — slavné partie a pasti tah po tahu; selektor s obtížností (★)
   a tématem, pasti seřazené podle obtížnosti; odkaz „Zahájení: …“ zpět do Studovat

## Obsah (aktuální stav)

- 13 zahájení × 39 variant (selektor seskupený podle prvního tahu: 1. e4 / 1. d4 / Ostatní)
- 32 partií: 16 slavných (category `classic`) + 16 pastí (category `trap`)
- Tahy partií pocházejí z ověřitelných zdrojů (Wikipedia, ChessBase); zdroje jsou
  v reportech fází, ne v datech
- Přesná čísla vypisuje `npm run validate` v souhrnu

## Klíčové soubory

- src/lib/chess-engine.ts — pravidla pohybu, plná legalita (`GameState`,
  `legalMovesFull`, `isCheckmate`), česká SAN (`toSan`), applyMove
- src/lib/chess-tracking.ts — stabilní ID figur pro animace
- src/lib/storage.ts — localStorage (téma, pokrok, přepínač předčítání);
  pokrok je klíčován `openingId/variationId`
- src/lib/speech.ts — předčítání (Web Speech API) + převod notace na řeč
- src/lib/useSpeech.ts — React hook nad speech.ts
- src/lib/recommend.ts — chytré opakování slabých míst
- src/data/openings.ts — zahájení × varianty × tahy (`related` = odkazy na partie)
- src/data/pieces.ts — 6 figur + diagramy
- src/data/games.ts — slavné partie a pasti (`related` = odkazy na zahájení)
- src/components/chess/ChessBoard.tsx — SVG deska, 2 vrstvy (pole + figury);
  figury se posouvají přes CSS `transform` ve `style` (ne SVG atribut), kvůli iOS Safari
- src/components/chess/GamePicker.tsx — selektor partií/pastí (★, téma, ‹ ›, seznam)
- src/pages/Index.tsx — hlavní stránka, 4 režimy
- scripts/engine-selftest.ts — perft + testy SAN a předčítání (běží před validací)
- scripts/validate-openings.ts — build-time validace openings.ts i games.ts
- scripts/audit-allowlist.json — vědomě ponechaná varování validátoru (s důvodem)
- scripts/fix-notation.ts — jednorázový přepis pole `notation` podle enginu
- scripts/audit-stockfish.ts — ruční audit hodnocení Stockfishem (`npm run audit`)

## Skripty

- `npm run validate` — self-test enginu + validace dat; běží automaticky před buildem (prebuild)
- `npm run selftest` — jen self-test enginu (perft, SAN, předčítání)
- `npm run fix-notation` (`-- --dry` = jen statistika) — přepíše `notation` podle `toSan()`
- `npm run audit` — Stockfish audit zahájení (volby `--depth`, `--threshold`, `--only id1,id2`,
  `--games`, `--verbose`, `--line "1. e4 e5 …"` pro kandidátní linii před zápisem do dat)
- `npm run build` — validace + tsc + vite build

## Validace dat (DŮLEŽITÉ)

`npm run validate` musí projít s 0 chybami; spouští se před buildem. Když build
hlásí chybu, oprav DATA, ne engine (engine hlídá `scripts/engine-selftest.ts`
s referenčními perft čísly — pokud nesedí, je chyba v generátoru tahů).

CHYBY (build spadne):
1. střídání stran (sudý index = bílý, lichý = černý)
2. plná legalita — tah musí být v `legalMovesFull` (šach, práva na rošádu,
   braní mimochodem jen hned po dvojkroku, křížová kontrola `piece`/`captured`)
3. proměna — pěšec na poslední řadě musí mít `promotesTo`
4. notace — `N. ` / `N... ` + přesně `toSan()` včetně `+`/`#` a rozlišení (`Jbd2`, `V1d2`);
   povolena je jen hodnoticí přípona `!`, `?`, `!!`, `??`, `!?`, `?!`
5. unikátní id (zahájení, dvojice zahájení/varianta, partie), neprázdný komentář,
   `related` odkazuje jen na existující id

VAROVÁNÍ (build nespadne, vypíše se report):
6. ignorovaná visící figura v zahájení (potlačí komentář s chyb|oběť|past|gambit|visí|nechává,
   nebo záznam v `scripts/audit-allowlist.json` s klíčem `openingId/variationId/index` a důvodem)
7. partie s „mat“ ve `result` musí končit matem na desce
8. varianta kratší než 16 půltahů

Validátor NEhodnotí kvalitu tahů — na to je ruční `npm run audit` (Stockfish, propady
≥ 1,5 pěšce bez označení chyby v notaci nebo komentáři).

## Jak přidat obsah

Zahájení / varianta:
1. Sestav linii v české SAN a prověř ji: `npm run audit -- --depth 16 --verbose --line "1. e4 e5 …"`
   (žádný propad ≥ 1,5 pěšce bez označení chyby).
2. Do `openings.ts` zapiš `MoveDef` s `from`/`to`/`piece`/`captured`/`promotesTo`/`enPassant`,
   `notation` a komentář ke každému tahu (věcný, přátelský, vysvětluje „proč“, plány obou stran,
   závěrečný komentář s výhledem). Cca 24 půltahů. Id varianty musí být unikátní v rámci zahájení
   a nesmí se měnit (pokrok v localStorage).
3. `npm run fix-notation -- --dry` ukáže, co engine v notaci očekává; `npm run validate` musí být zelený.
4. Skupina v selektoru (1. e4 / 1. d4 / Ostatní) se odvodí z prvního tahu sama; ikonu doplň
   do `OPENING_ICON` v `Index.tsx`.

Past (`category: "trap"`):
1. Linii ověř enginem i Stockfishem (`--line`), včetně toho, že chybný tah je opravdu chyba
   a pointa (mat / zisk materiálu) drží proti nejlepší obraně.
2. Označ chybné tahy (`?`/`??` v notaci + „CHYBA“ v komentáři), vysvětli návnadu, pointu a proč
   to funguje (vazba, odtažný šach, dušený mat…). Mat musí končit `#` a `result` obsahovat „mat“.
3. Doplň `topic` (zahájení, ke kterému past patří), `difficulty` 1–5 a `related: ["openingId"]`.

Slavná partie (`category: "classic"`):
1. Tahy neber z hlavy — použij ověřitelný zdroj (článek o partii, databáze) a uveď ho v reportu.
2. Převeď anglickou notaci enginem (`legalMovesFull` + `toSan`), každý tah dostane komentář:
   klíčové momenty rozepsat, rutinní tahy stručně. `result` popiš přesně (kdo se vzdal, po kterém tahu).
3. Doplň `related` na zahájení, se kterým partie souvisí.

## Vizuální design

- Styl sjednocený s xiangqi-pruvodce
- Figury: Unicode glyfy (U+265A–U+265F, plné), barva přes --piece-*-fill,
  kontura přes --piece-*-stroke (čitelnost na poli stejné barvy),
  vertikální vystředění přes dy na <text>
- 4 témata: wooden-night (default), wooden-day, modern-light, midnight-blue
- Jeden přepínač tématu (cyklující ikonka) vpravo nahoře v hlavičce
- Ikonky u režimů a zahájení (inline SVG v Icon.tsx)
- Česká notace (J/S/V/D/K), rošáda O-O / O-O-O
- Mobile-first, kontejner ~400px, dotykové cíle ≥ 44 px, žádný horizontální scroll
- Tailwind v3 negeneruje průhlednost nad CSS proměnnou (`text-[color:var(--x)]/50`) —
  používej `opacity` nebo inline `color-mix()`

## Co NEDĚLAT

- Nezavádět externí backend, databáze, autentizaci
- Nepřidávat sound effects, reklamy, tracking
- Neobcházet ani neoslabovat build-time validaci (hlavní pojistka kvality dat) — když build spadne, opravují se data
- Nepřidávat tahy, které nejsou ověřené jako legální a teoreticky správné; chybu v datech nikdy „nelegalizovat“
- Neměnit id existujících variant a partií (pokrok uživatelů v localStorage)
- Nepřidávat runtime knihovny (chess.js apod.) ani hru proti počítači
- Nemíchat s no-code nástroji (jen Claude Code + GitHub + Vercel)
