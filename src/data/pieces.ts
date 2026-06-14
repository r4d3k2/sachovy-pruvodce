// pieces.ts — 6 figur s popisem pohybu a diagramy pro režim Figury.
//
// Diagram je malá mřížka (typicky 5×5) s figurou uprostřed; `targets` značí
// pole, kam figura smí (move), kam může brát (capture), nebo kam ji blokuje
// jiná figura (blocked).

import type { PieceType } from "../lib/chess-engine";

export type DiagramKind = "move" | "capture" | "blocked";

export interface DiagramTarget {
  row: number;
  col: number;
  kind: DiagramKind;
}

export interface MoveDiagram {
  rows: number;
  cols: number;
  pieceRow: number;
  pieceCol: number;
  targets: DiagramTarget[];
  caption?: string;
}

export interface PieceInfo {
  type: PieceType;
  letter: string; // česká notační zkratka
  csName: string; // český název
  movement: string; // popis pohybu (2–4 věty)
  value: string; // přibližná hodnota
  diagrams: MoveDiagram[];
}

// Pomocníky pro generování přímek na 5×5 mřížce se středem (2,2)
const center = { r: 2, c: 2 };

function ray(dr: number, dc: number): DiagramTarget[] {
  const out: DiagramTarget[] = [];
  let r = center.r + dr;
  let c = center.c + dc;
  while (r >= 0 && r < 5 && c >= 0 && c < 5) {
    out.push({ row: r, col: c, kind: "move" });
    r += dr;
    c += dc;
  }
  return out;
}

const ORTHO_RAYS: DiagramTarget[] = [
  ...ray(-1, 0),
  ...ray(1, 0),
  ...ray(0, -1),
  ...ray(0, 1),
];

const DIAG_RAYS: DiagramTarget[] = [
  ...ray(-1, -1),
  ...ray(-1, 1),
  ...ray(1, -1),
  ...ray(1, 1),
];

export const PIECES: PieceInfo[] = [
  {
    type: "K",
    letter: "K",
    csName: "Král",
    value: "nevyčíslitelný",
    movement:
      "Král se pohybuje o jedno pole libovolným směrem — vodorovně, svisle i úhlopříčně. Je to nejdůležitější figura: jeho ztráta znamená prohru, proto ho včas uklízíme rošádou do bezpečí. Při rošádě se pohne o dvě pole a věž ho obskočí.",
    diagrams: [
      {
        rows: 5,
        cols: 5,
        pieceRow: 2,
        pieceCol: 2,
        caption: "Jedno pole všemi směry",
        targets: [
          { row: 1, col: 1, kind: "move" },
          { row: 1, col: 2, kind: "move" },
          { row: 1, col: 3, kind: "move" },
          { row: 2, col: 1, kind: "move" },
          { row: 2, col: 3, kind: "move" },
          { row: 3, col: 1, kind: "move" },
          { row: 3, col: 2, kind: "move" },
          { row: 3, col: 3, kind: "move" },
        ],
      },
    ],
  },
  {
    type: "Q",
    letter: "D",
    csName: "Dáma",
    value: "9 bodů",
    movement:
      "Dáma je nejsilnější figura — kombinuje pohyb věže a střelce. Táhne o libovolný počet polí vodorovně, svisle i úhlopříčně, dokud jí nepřekáží jiná figura. Díky obrovskému dosahu je ideální do útoku, ale chráníme ji před napadením lehkými figurami.",
    diagrams: [
      {
        rows: 5,
        cols: 5,
        pieceRow: 2,
        pieceCol: 2,
        caption: "Všemi směry, libovolně daleko",
        targets: [...ORTHO_RAYS, ...DIAG_RAYS],
      },
    ],
  },
  {
    type: "R",
    letter: "V",
    csName: "Věž",
    value: "5 bodů",
    movement:
      "Věž táhne o libovolný počet polí vodorovně nebo svisle. Klouže, dokud nenarazí — vlastní figura ji zastaví, soupeřovu může vzít. Nejlépe se jí daří na otevřených sloupcích a v koncovce.",
    diagrams: [
      {
        rows: 5,
        cols: 5,
        pieceRow: 2,
        pieceCol: 2,
        caption: "Vodorovně a svisle",
        targets: ORTHO_RAYS,
      },
    ],
  },
  {
    type: "B",
    letter: "S",
    csName: "Střelec",
    value: "3 body",
    movement:
      "Střelec táhne o libovolný počet polí po úhlopříčkách. Zůstává navždy na polích jedné barvy, proto dvojice střelců pokrývá celou desku a je velmi silná. Stejně jako věž klouže, dokud nenarazí na figuru.",
    diagrams: [
      {
        rows: 5,
        cols: 5,
        pieceRow: 2,
        pieceCol: 2,
        caption: "Po úhlopříčkách",
        targets: DIAG_RAYS,
      },
    ],
  },
  {
    type: "N",
    letter: "J",
    csName: "Jezdec",
    value: "3 body",
    movement:
      "Jezdec skáče do tvaru písmene L: dvě pole jedním směrem a jedno kolmo. Jako jediná figura přeskakuje ostatní, takže je nebezpečný i v sevřených pozicích. V centru desky ovládá až osm polí.",
    diagrams: [
      {
        rows: 5,
        cols: 5,
        pieceRow: 2,
        pieceCol: 2,
        caption: "Skoky do L (přeskakuje figury)",
        targets: [
          { row: 0, col: 1, kind: "move" },
          { row: 0, col: 3, kind: "move" },
          { row: 1, col: 0, kind: "move" },
          { row: 1, col: 4, kind: "move" },
          { row: 3, col: 0, kind: "move" },
          { row: 3, col: 4, kind: "move" },
          { row: 4, col: 1, kind: "move" },
          { row: 4, col: 3, kind: "move" },
        ],
      },
    ],
  },
  {
    type: "P",
    letter: "",
    csName: "Pěšec",
    value: "1 bod",
    movement:
      "Pěšec jde dopředu o jedno pole, z výchozí řady může rovnou o dvě. Bere ale jinak než táhne — pouze úhlopříčně dopředu o jedno pole. Dojde-li na poslední řadu, promění se v jinou figuru (nejčastěji v dámu).",
    diagrams: [
      {
        rows: 5,
        cols: 5,
        pieceRow: 2,
        pieceCol: 2,
        caption: "Vpřed o 1 (z výchozí řady o 2), bere úhlopříčně",
        targets: [
          { row: 1, col: 2, kind: "move" },
          { row: 0, col: 2, kind: "move" },
          { row: 1, col: 1, kind: "capture" },
          { row: 1, col: 3, kind: "capture" },
        ],
      },
    ],
  },
];
