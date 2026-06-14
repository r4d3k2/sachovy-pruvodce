// PieceSilhouettes.tsx — vykreslení figur přes Unicode šachové glyfy.
//
// Používáme PLNÉ glyfy U+265A–U+265F pro bílé i černé figury; barvu a kontrast
// řešíme přes fill + stroke (paintOrder="stroke"), aby byla figura čitelná i na
// poli stejné barvy. Spolehlivější vzhled než ručně kreslené SVG (hlavně jezdec).

import type { PieceSymbol, PieceType, Side } from "../../lib/chess-engine";

export const GLYPH: Record<PieceSymbol, string> = {
  K: "♚",
  Q: "♛",
  R: "♜",
  B: "♝",
  N: "♞",
  P: "♟",
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

export const GLYPH_FONT =
  "'Noto Sans Symbols 2', 'Segoe UI Symbol', 'DejaVu Sans', sans-serif";

export function glyphFor(type: PieceType): string {
  return GLYPH[type];
}

export function pieceFillVar(side: Side): string {
  return side === "white" ? "var(--piece-white-fill)" : "var(--piece-black-fill)";
}

export function pieceStrokeVar(side: Side): string {
  return side === "white" ? "var(--piece-white-stroke)" : "var(--piece-black-stroke)";
}

// Samostatná responzivní silueta figury (pro karty a kvíz).
export function PieceSilhouette({
  type,
  side,
  className,
}: {
  type: PieceType;
  side: Side;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "100%" }}
      role="img"
    >
      <text
        x={50}
        y={52}
        fontSize={82}
        textAnchor="middle"
        dominantBaseline="central"
        fill={pieceFillVar(side)}
        stroke={pieceStrokeVar(side)}
        strokeWidth={2.4}
        paintOrder="stroke"
        style={{ fontFamily: GLYPH_FONT }}
      >
        {GLYPH[type]}
      </text>
    </svg>
  );
}
