// PieceCard.tsx — karta jedné figury: velká silueta, název, popis pohybu
// a diagram(y) pohybu na malé mřížce.

import type { MoveDiagram, PieceInfo } from "../../data/pieces";
import {
  GLYPH,
  GLYPH_FONT,
  PieceSilhouette,
  pieceFillVar,
  pieceStrokeVar,
} from "./PieceSilhouettes";
import type { PieceType } from "../../lib/chess-engine";

const CELL = 40;

export function DiagramView({ diagram, type }: { diagram: MoveDiagram; type: PieceType }) {
  const { rows, cols, pieceRow, pieceCol, targets } = diagram;
  const W = cols * CELL;
  const H = rows * CELL;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", width: "100%", height: "auto", maxWidth: W }}
        role="img"
        aria-label={diagram.caption ?? "Diagram pohybu"}
      >
        {/* pole */}
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((__, c) => {
            const dark = (r + c) % 2 === 1;
            return (
              <rect
                key={`c-${r}-${c}`}
                x={c * CELL}
                y={r * CELL}
                width={CELL}
                height={CELL}
                fill={dark ? "var(--board-dark)" : "var(--board-light)"}
              />
            );
          }),
        )}

        {/* značky cílů */}
        {targets.map((t) => {
          const cx = t.col * CELL + CELL / 2;
          const cy = t.row * CELL + CELL / 2;
          if (t.kind === "capture") {
            return (
              <circle
                key={`t-${t.row}-${t.col}`}
                cx={cx}
                cy={cy}
                r={CELL / 2 - 3}
                fill="none"
                stroke="var(--bad)"
                strokeWidth={3}
                opacity={0.85}
              />
            );
          }
          if (t.kind === "blocked") {
            return (
              <g key={`t-${t.row}-${t.col}`} stroke="var(--text-muted)" strokeWidth={3}>
                <line x1={cx - 8} y1={cy - 8} x2={cx + 8} y2={cy + 8} />
                <line x1={cx + 8} y1={cy - 8} x2={cx - 8} y2={cy + 8} />
              </g>
            );
          }
          return (
            <circle
              key={`t-${t.row}-${t.col}`}
              cx={cx}
              cy={cy}
              r={6}
              fill="var(--accent)"
              opacity={0.75}
            />
          );
        })}

        {/* figura uprostřed */}
        <text
          x={pieceCol * CELL + CELL / 2}
          y={pieceRow * CELL + CELL / 2}
          dy="0.32em"
          fontSize={CELL * 0.74}
          textAnchor="middle"
          fill={pieceFillVar("white")}
          stroke={pieceStrokeVar("white")}
          strokeWidth={1.4}
          paintOrder="stroke"
          style={{ fontFamily: GLYPH_FONT }}
        >
          {GLYPH[type]}
        </text>
      </svg>
      {diagram.caption && (
        <figcaption className="font-body text-xs text-[var(--text-muted)] mt-1.5 text-center">
          {diagram.caption}
        </figcaption>
      )}
    </figure>
  );
}

export function PieceCard({ piece }: { piece: PieceInfo }) {
  return (
    <div className="rounded-2xl border border-[color:var(--text-muted)]/20 bg-[var(--surface)] p-4 fade-in">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-14 h-16 shrink-0">
          <PieceSilhouette type={piece.type} side="white" />
        </div>
        <div>
          <h3 className="font-display text-xl font-bold text-[var(--text-strong)] leading-tight">
            {piece.csName}
          </h3>
          <p className="font-mono text-xs text-[var(--text-muted)]">
            {piece.letter ? `Značka „${piece.letter}“ · ` : ""}
            {piece.value}
          </p>
        </div>
      </div>

      <p className="font-body text-[15px] leading-relaxed text-[var(--text-soft)] mb-3">
        {piece.movement}
      </p>

      <div className="flex flex-wrap gap-4 justify-center">
        {piece.diagrams.map((d, i) => (
          <div key={i} className="w-[200px] max-w-full">
            <DiagramView diagram={d} type={piece.type} />
          </div>
        ))}
      </div>
    </div>
  );
}
