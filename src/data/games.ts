// games.ts — instruktážní partie pro režim Partie.
//
// Tahy pocházejí z ověřených dat (Fáze 4). Stejně jako u openings.ts nese každý
// tah pole `piece` (a `captured` u braní), které engine křížově ověřuje proti
// pozici na desce. Build-time validace (scripts/validate-openings.ts) projde
// i tyto partie a při nelegálním tahu nechá spadnout build.

import type { MoveDef } from "../lib/chess-engine";

export interface Game {
  id: string;
  title: string;
  topic: string;
  difficulty: number; // 1-5
  result: string;
  description: string;
  moves: MoveDef[];
}

export const GAMES: Game[] = [
  {
    id: "legal",
    title: "Légalův mat",
    topic: "Klasická past — oběť dámy",
    difficulty: 2,
    result: "1-0 (bílý dává mat 7. tahem)",
    description:
      "Slavná past pojmenovaná po francouzském hráči Légalovi (Paříž, kolem 1750). Ukazuje, jak vázaná figura může vést k oběti dámy a rychlému matu. Jedna z prvních partií, kterou by se měl každý začátečník naučit.",
    moves: [
      { from: "e2", to: "e4", piece: "P", notation: "1. e4", comment: "Bílý obsazuje centrum." },
      { from: "e7", to: "e5", piece: "p", notation: "1... e5", comment: "Černý zrcadlí." },
      { from: "g1", to: "f3", piece: "N", notation: "2. Jf3", comment: "Útok na e5 a rozvoj." },
      { from: "d7", to: "d6", piece: "p", notation: "2... d6", comment: "Černý brání e5 — pasivnější Philidorova obrana." },
      { from: "f1", to: "c4", piece: "B", notation: "3. Sc4", comment: "Střelec míří na f7." },
      { from: "c8", to: "g4", piece: "b", notation: "3... Sg4", comment: "Černý vyvíjí střelce a váže jezdce f3 na dámu. Past se připravuje." },
      { from: "b1", to: "c3", piece: "N", notation: "4. Jc3", comment: "Bílý klidně rozvíjí — past nastražena." },
      { from: "g7", to: "g6", piece: "p", notation: "4... g6", comment: "Černý oslabuje pozici. Teď přichází kombinace!" },
      { from: "f3", to: "e5", piece: "N", captured: "p", notation: "5. Jxe5", comment: "Oběť! Bílý bere pěšce a ignoruje vázání — vypadá to, že černý vyhraje dámu." },
      { from: "g4", to: "d1", piece: "b", captured: "Q", notation: "5... Sxd1", comment: "Černý bere dámu — ale to je chyba, kterou bílý čekal!" },
      { from: "c4", to: "f7", piece: "B", captured: "p", notation: "6. Sxf7", comment: "Šach střelcem! Král se musí pohnout." },
      { from: "e8", to: "e7", piece: "k", notation: "6... Ke7", comment: "Jediné pole pro krále." },
      { from: "c3", to: "d5", piece: "N", notation: "7. Jd5", comment: "Mat! Jezdec dává mat — král nemá kam utéct. Oběť dámy se vyplatila." },
    ],
  },
  {
    id: "scholars",
    title: "Pastýřský mat",
    topic: "Nejrychlejší past — útok na f7",
    difficulty: 1,
    result: "1-0 (mat 4. tahem)",
    description:
      "Nejznámější začátečnická past. Bílý zaútočí dámou a střelcem na nejslabší pole f7 a dává mat ve 4 tazích. Důležité ji znát hlavně proto, aby se proti ní člověk uměl bránit — stačí nehrát 3...Jf6 a bránit f7.",
    moves: [
      { from: "e2", to: "e4", piece: "P", notation: "1. e4", comment: "Bílý obsazuje centrum." },
      { from: "e7", to: "e5", piece: "p", notation: "1... e5", comment: "Černý zrcadlí." },
      { from: "f1", to: "c4", piece: "B", notation: "2. Sc4", comment: "Střelec míří na f7." },
      { from: "b8", to: "c6", piece: "n", notation: "2... Jc6", comment: "Černý rozvíjí jezdce." },
      { from: "d1", to: "h5", piece: "Q", notation: "3. Dh5", comment: "Dáma útočí na f7 i na e5! Hrozí mat na f7." },
      { from: "g8", to: "f6", piece: "n", notation: "3... Jf6", comment: "Chyba! Černý brání e5, ale zapomíná na f7. Správně bylo 3...De7 nebo 3...g6." },
      { from: "h5", to: "f7", piece: "Q", captured: "p", notation: "4. Dxf7", comment: "Mat! Dáma kryta střelcem c4 — král nemá únik. Klasická lekce o slabosti f7." },
    ],
  },
  {
    id: "opera",
    title: "Operní partie (Morphy)",
    topic: "Rozvoj, otevřené linie, oběť",
    difficulty: 3,
    result: "1-0 (Morphy dává mat 17. tahem)",
    description:
      "Nejslavnější výuková partie všech dob. Paul Morphy ji zahrál roku 1858 v lóži pařížské opery proti dvěma amatérům. Učebnicová ukázka rychlého rozvoje, ovládnutí otevřených linií a obětí pro urychlení útoku. Každý tah má jasný účel.",
    moves: [
      { from: "e2", to: "e4", piece: "P", notation: "1. e4", comment: "Bílý obsazuje centrum." },
      { from: "e7", to: "e5", piece: "p", notation: "1... e5", comment: "Černý zrcadlí." },
      { from: "g1", to: "f3", piece: "N", notation: "2. Jf3", comment: "Útok na e5." },
      { from: "d7", to: "d6", piece: "p", notation: "2... d6", comment: "Philidorova obrana — pasivní, ale solidní." },
      { from: "d2", to: "d4", piece: "P", notation: "3. d4", comment: "Morphy okamžitě útočí na centrum." },
      { from: "c8", to: "g4", piece: "b", notation: "3... Sg4", comment: "Černý váže jezdce." },
      { from: "d4", to: "e5", piece: "P", captured: "p", notation: "4. dxe5", comment: "Bílý likviduje napětí." },
      { from: "g4", to: "f3", piece: "b", captured: "N", notation: "4... Sxf3", comment: "Černý bere jezdce — jinak ztrácí pěšce." },
      { from: "d1", to: "f3", piece: "Q", captured: "b", notation: "5. Dxf3", comment: "Bílý bere dámou a hrozí Dxf7 matem." },
      { from: "d6", to: "e5", piece: "p", captured: "P", notation: "5... dxe5", comment: "Černý bere zpět pěšce." },
      { from: "f1", to: "c4", piece: "B", notation: "6. Sc4", comment: "Střelec míří na f7! Hrozby narůstají." },
      { from: "g8", to: "f6", piece: "n", notation: "6... Jf6", comment: "Černý brání f7 jezdcem." },
      { from: "f3", to: "b3", piece: "Q", notation: "7. Db3", comment: "Dvojitý útok na b7 a f7!" },
      { from: "d8", to: "e7", piece: "q", notation: "7... De7", comment: "Černý brání f7 dámou — pasivní pozice." },
      { from: "b1", to: "c3", piece: "N", notation: "8. Jc3", comment: "Morphy rozvíjí a nepospíchá s braním b7. Rozvoj především!" },
      { from: "c7", to: "c6", piece: "p", notation: "8... c6", comment: "Černý brání proti Jb5." },
      { from: "c1", to: "g5", piece: "B", notation: "9. Sg5", comment: "Bílý rozvíjí posledního lehkého figuru s vazbou." },
      { from: "b7", to: "b5", piece: "p", notation: "9... b5", comment: "Černý se snaží odehnat střelce c4." },
      { from: "c3", to: "b5", piece: "N", captured: "p", notation: "10. Jxb5", comment: "Oběť! Morphy bere pěšce jezdcem, otevírá linie." },
      { from: "c6", to: "b5", piece: "p", captured: "N", notation: "10... cxb5", comment: "Černý bere zpět." },
      { from: "c4", to: "b5", piece: "B", captured: "p", notation: "11. Sxb5", comment: "Druhá oběť — střelec se obětuje za rychlý útok s šachem." },
      { from: "b8", to: "d7", piece: "n", notation: "11... Jd7", comment: "Černý kryje šach jezdcem — figury jsou svázané." },
      { from: "e1", to: "c1", piece: "K", notation: "12. O-O-O", comment: "Dlouhá rošáda! Věž okamžitě míří na svázaného jezdce d7." },
      { from: "a8", to: "d8", piece: "r", notation: "12... Vd8", comment: "Černý brání d7 věží — vše visí na vlásku." },
      { from: "d1", to: "d7", piece: "R", captured: "n", notation: "13. Vxd7", comment: "Oběť věže! Morphy odstraňuje obránce." },
      { from: "d8", to: "d7", piece: "r", captured: "R", notation: "13... Vxd7", comment: "Černý bere zpět věží." },
      { from: "h1", to: "d1", piece: "R", notation: "14. Vd1", comment: "Druhá věž vstupuje s plnou silou na otevřený sloupec d." },
      { from: "e7", to: "e6", piece: "q", notation: "14... De6", comment: "Černý se zoufale brání." },
      { from: "b5", to: "d7", piece: "B", captured: "r", notation: "15. Sxd7", comment: "Bílý bere jezdce s šachem — likviduje další obránce." },
      { from: "f6", to: "d7", piece: "n", captured: "B", notation: "15... Jxd7", comment: "Černý bere zpět." },
      { from: "b3", to: "b8", piece: "Q", notation: "16. Db8", comment: "Famózní oběť dámy! Morphy obětuje dámu pro vynucený mat." },
      { from: "d7", to: "b8", piece: "n", captured: "Q", notation: "16... Jxb8", comment: "Černý musí vzít." },
      { from: "d1", to: "d8", piece: "R", notation: "17. Vd8", comment: "Mat! Věž dává mat na d8. Dokonalá ukázka síly rozvinutých figur." },
    ],
  },
  {
    id: "fried-liver",
    title: "Útok na f7 (Fegatello)",
    topic: "Ostrá oběť jezdce v Italské hře",
    difficulty: 4,
    result: "Nejasný (ostrá pozice po oběti)",
    description:
      "Fegatello je jedna z nejostřejších variant Útoku dvou jezdců. Bílý obětuje jezdce na f7 a vytáhne černého krále do centra. Instruktážní ukázka iniciativy za materiál — vyžaduje přesnou hru obou stran.",
    moves: [
      { from: "e2", to: "e4", piece: "P", notation: "1. e4", comment: "Bílý obsazuje centrum." },
      { from: "e7", to: "e5", piece: "p", notation: "1... e5", comment: "Černý zrcadlí." },
      { from: "g1", to: "f3", piece: "N", notation: "2. Jf3", comment: "Útok na e5." },
      { from: "b8", to: "c6", piece: "n", notation: "2... Jc6", comment: "Černý brání e5." },
      { from: "f1", to: "c4", piece: "B", notation: "3. Sc4", comment: "Italský střelec míří na f7." },
      { from: "g8", to: "f6", piece: "n", notation: "3... Jf6", comment: "Útok dvou jezdců — černý napadá e4." },
      { from: "f3", to: "g5", piece: "N", notation: "4. Jg5", comment: "Agresivní výpad! Jezdec útočí na f7." },
      { from: "d7", to: "d5", piece: "p", notation: "4... d5", comment: "Jediná dobrá obrana — protiúder v centru." },
      { from: "e4", to: "d5", piece: "P", captured: "p", notation: "5. exd5", comment: "Bílý bere pěšce." },
      { from: "f6", to: "d5", piece: "n", captured: "P", notation: "5... Jxd5", comment: "Černý bere zpět jezdcem — riskantní (lepší je 5...Ja5)." },
      { from: "g5", to: "f7", piece: "N", captured: "p", notation: "6. Jxf7", comment: "Oběť jezdce! Bílý vytahuje krále do centra." },
      { from: "e8", to: "f7", piece: "k", captured: "N", notation: "6... Kxf7", comment: "Král musí vzít — teď je v nebezpečí." },
      { from: "d1", to: "f3", piece: "Q", notation: "7. Df3", comment: "Šach a dvojitý útok na jezdce d5!" },
      { from: "f7", to: "e6", piece: "k", notation: "7... Ke6", comment: "Král musí krýt jezdce d5 — odvážný tah do centra." },
      { from: "b1", to: "c3", piece: "N", notation: "8. Jc3", comment: "Bílý přidává útočníka s tempem. Ostrá pozice plná možností." },
    ],
  },
];
