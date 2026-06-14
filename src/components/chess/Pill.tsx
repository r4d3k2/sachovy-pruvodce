// Pill.tsx — tlačítka v jednotném stylu.
//
// level: 1 = mode pills, 2 = výběr zahájení, 3 = výběr varianty
// active: zvýrazněné (vybrané)
// ghost: nenápadné (navigace)
// square: čtvercové (ikonová tlačítka navigace)

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "active" | "ghost" | "square";

interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  level?: 1 | 2 | 3;
  active?: boolean;
  variant?: Variant;
}

export function Pill({
  children,
  level = 1,
  active = false,
  variant,
  className = "",
  disabled,
  ...rest
}: PillProps) {
  const base =
    "inline-flex items-center justify-center font-body select-none transition-all duration-200 " +
    "border outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] " +
    "disabled:opacity-40 disabled:cursor-not-allowed";

  const sizeByLevel: Record<number, string> = {
    1: "px-4 py-2 text-[15px] rounded-full min-h-[44px]",
    2: "px-3.5 py-1.5 text-sm rounded-full min-h-[40px]",
    3: "px-3 py-1.5 text-[13px] rounded-full min-h-[38px]",
  };

  let look: string;
  if (variant === "square") {
    look = active
      ? "rounded-xl px-3 min-h-[44px] min-w-[44px] bg-[var(--accent)] text-[var(--bg)] border-transparent"
      : "rounded-xl px-3 min-h-[44px] min-w-[44px] bg-[var(--surface)] text-[var(--text-soft)] border-[color:var(--text-muted)]/30 hover:text-[var(--text-strong)] hover:border-[var(--accent)]";
  } else if (variant === "ghost") {
    look =
      "bg-transparent text-[var(--text-soft)] border-transparent hover:text-[var(--text-strong)]";
  } else if (active) {
    look =
      "bg-[var(--accent)] text-[var(--bg)] border-transparent shadow-sm font-semibold";
  } else {
    look =
      "bg-[var(--surface)] text-[var(--text-soft)] border-[color:var(--text-muted)]/30 hover:text-[var(--text-strong)] hover:border-[var(--accent)]";
  }

  const sizing = variant === "square" ? "" : sizeByLevel[level];

  return (
    <button
      className={`${base} ${sizing} ${look} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
