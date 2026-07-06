// Stars.tsx — hvězdičky 1–3 (plné/prázdné), případně z počtu chyb.

interface StarsProps {
  count: number; // počet plných hvězd (0–3)
  size?: number; // px
  className?: string;
}

export function Stars({ count, size = 22, className = "" }: StarsProps) {
  return (
    <div className={`inline-flex gap-0.5 ${className}`} aria-label={`${count} ze 3 hvězd`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          style={{ fontSize: size, lineHeight: 1 }}
          className={i <= count ? "text-[var(--accent)]" : "text-[color:var(--text-muted)]/40"}
        >
          {i <= count ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}

// Dvě řady hvězdiček — bílý (♔) a černý (♚) zvlášť. Nehraná strana = obrysy.
interface SideStarsProps {
  white: number;
  black: number;
  size?: number;
  className?: string;
}

export function SideStars({ white, black, size = 16, className = "" }: SideStarsProps) {
  const glyphSize = size + 3;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {(
        [
          ["♔", white, "Bílý"],
          ["♚", black, "Černý"],
        ] as Array<[string, number, string]>
      ).map(([glyph, count, label]) => (
        <div key={label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            style={{ fontSize: glyphSize, lineHeight: 1 }}
            className="text-[var(--text-soft)]"
          >
            {glyph}
          </span>
          <span className="sr-only">{label}:</span>
          <Stars count={count} size={size} />
        </div>
      ))}
    </div>
  );
}
