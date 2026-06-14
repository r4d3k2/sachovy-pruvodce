// ChessBoard.tsx — SVG šachovnice 8×8 ve dvou vrstvách.
//
// Vrstva 1: pole + zvýraznění (last-move, výběr, legální tahy, error flash).
// Vrstva 2: figury se stabilními ID (díky tomu CSS transition plynule animuje
//           pohyb i rošádu — král i věž se přesunou v jednom tahu).
//
// Interaktivní props (selectedSquare, legalMoves, errorSquare, onSquareClick)
// jsou připraveny pro Fázi 2.

import {
  coordsToSquare,
  squareToCoords,
  sideOf,
} from "../../lib/chess-engine";
import type { Board } from "../../lib/chess-engine";
import type { TrackedPiece } from "../../lib/chess-tracking";
import { GLYPH, GLYPH_FONT, pieceFillVar, pieceStrokeVar } from "./PieceSilhouettes";

const C = 100; // velikost pole
const M = 24; // okraj pro souřadnice
const BOARD = 8 * C; // 800

export interface ChessBoardProps {
  board: Board;
  pieces: TrackedPiece[];
  flipped?: boolean;
  lastMove?: { from: string; to: string } | null;
  selectedSquare?: string | null;
  legalMoves?: string[]; // pole, kam smí vybraná figura (tečky/prsteny)
  errorSquare?: string | null;
  onSquareClick?: (square: string) => void;
}

export function ChessBoard({
  board,
  pieces,
  flipped = false,
  lastMove = null,
  selectedSquare = null,
  legalMoves = [],
  errorSquare = null,
  onSquareClick,
}: ChessBoardProps) {
  // Souřadnice pole → pixelová pozice (s ohledem na otočení)
  const toXY = (row: number, col: number): [number, number] => {
    const dRow = flipped ? 7 - row : row;
    const dCol = flipped ? 7 - col : col;
    return [M + dCol * C, dRow * C];
  };

  const lastSquares = lastMove ? [lastMove.from, lastMove.to] : [];
  const legalSet = new Set(legalMoves);

  const squares: React.ReactNode[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const [x, y] = toXY(row, col);
      const square = coordsToSquare(row, col);
      const isDark = (row + col) % 2 === 1;
      const isLast = lastSquares.includes(square);
      const isSelected = selectedSquare === square;
      const isError = errorSquare === square;

      squares.push(
        <g key={`sq-${square}`}>
          <rect
            x={x}
            y={y}
            width={C}
            height={C}
            fill={isDark ? "var(--board-dark)" : "var(--board-light)"}
            onClick={onSquareClick ? () => onSquareClick(square) : undefined}
            style={{ cursor: onSquareClick ? "pointer" : "default" }}
          />
          {isLast && (
            <rect
              x={x}
              y={y}
              width={C}
              height={C}
              fill="var(--accent)"
              opacity={0.28}
              pointerEvents="none"
            />
          )}
          {isSelected && (
            <rect
              x={x + 2}
              y={y + 2}
              width={C - 4}
              height={C - 4}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={5}
              rx={4}
              pointerEvents="none"
            />
          )}
          {isError && (
            <rect
              x={x}
              y={y}
              width={C}
              height={C}
              fill="var(--bad)"
              pointerEvents="none"
              style={{ animation: "errorFlash 0.42s ease-out forwards" }}
            />
          )}
        </g>,
      );
    }
  }

  // Legal-move značky (tečky na prázdná pole, prsten na braní)
  const markers: React.ReactNode[] = [];
  for (const sq of legalSet) {
    const [r, c] = squareToCoords(sq);
    const [x, y] = toXY(r, c);
    const occupied = board[r][c] !== null;
    if (occupied) {
      markers.push(
        <circle
          key={`mk-${sq}`}
          cx={x + C / 2}
          cy={y + C / 2}
          r={C / 2 - 6}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={6}
          opacity={0.7}
          pointerEvents="none"
        />,
      );
    } else {
      markers.push(
        <circle
          key={`mk-${sq}`}
          cx={x + C / 2}
          cy={y + C / 2}
          r={14}
          fill="var(--accent)"
          opacity={0.6}
          pointerEvents="none"
        />,
      );
    }
  }

  // Souřadnice na okrajích
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const coordLabels: React.ReactNode[] = [];
  for (let i = 0; i < 8; i++) {
    const dCol = flipped ? 7 - i : i;
    const fileX = M + dCol * C + C / 2;
    coordLabels.push(
      <text
        key={`f-${i}`}
        x={fileX}
        y={BOARD + M - 6}
        textAnchor="middle"
        fontSize={16}
        fontFamily='"Noto Serif", serif'
        fill="var(--board-coord)"
      >
        {files[i]}
      </text>,
    );
    const rank = 8 - i; // row i → rank
    const dRow = flipped ? 7 - i : i;
    const rankY = dRow * C + C / 2 + 5;
    coordLabels.push(
      <text
        key={`r-${i}`}
        x={M - 8}
        y={rankY}
        textAnchor="middle"
        fontSize={16}
        fontFamily='"Noto Serif", serif'
        fill="var(--board-coord)"
      >
        {rank}
      </text>,
    );
  }

  return (
    <svg
      viewBox={`0 0 ${M + BOARD} ${BOARD + M}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", height: "auto" }}
      role="img"
      aria-label="Šachovnice"
    >
      {/* Vrstva 1: pole + zvýraznění */}
      {squares}
      {markers}
      {coordLabels}

      {/* Vrstva 2: figury — Unicode glyfy se stabilním ID (plynulá animace) */}
      {pieces.map((p) => {
        const [x, y] = toXY(p.row, p.col);
        const white = sideOf(p.symbol) === "white";
        return (
          <g
            key={p.id}
            transform={`translate(${x + C / 2}, ${y + C / 2})`}
            style={{
              transition: "transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)",
              pointerEvents: "none",
            }}
          >
            <text
              x={0}
              y={0}
              fontSize={C * 0.72}
              textAnchor="middle"
              dominantBaseline="central"
              fill={pieceFillVar(white ? "white" : "black")}
              stroke={pieceStrokeVar(white ? "white" : "black")}
              strokeWidth={2.4}
              paintOrder="stroke"
              style={{ fontFamily: GLYPH_FONT }}
            >
              {GLYPH[p.symbol]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
