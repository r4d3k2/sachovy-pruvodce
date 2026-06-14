// MoveToken.tsx — kapsle s notací tahu (jen zobrazení, neklikatelná).

interface MoveTokenProps {
  notation: string;
  active?: boolean;
}

export function MoveToken({ notation, active = false }: MoveTokenProps) {
  return (
    <span
      className={
        "inline-flex items-center px-2.5 py-1 rounded-md font-mono text-[13px] border transition-colors " +
        (active
          ? "bg-[var(--accent)] text-[var(--bg)] border-transparent"
          : "bg-[var(--surface)] text-[var(--text-soft)] border-[color:var(--text-muted)]/30")
      }
    >
      {notation}
    </span>
  );
}
