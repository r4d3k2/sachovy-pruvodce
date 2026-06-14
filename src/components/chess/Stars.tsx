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
