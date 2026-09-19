// GamePicker.tsx — výběr partie / pasti v režimu Partie.
//
// S 16 pastmi už nestačí řada pilulek: vybraná položka se zobrazí v jednom
// řádku (obtížnost ★, název, téma) se šipkami ‹ › pro listování a po klepnutí
// se rozbalí svislý seznam všech položek. Žádný horizontální scroll, každý
// dotykový cíl má min. 44 px.

import { useEffect, useRef } from "react";
import type { Game } from "../../data/games";
import { Icon } from "./Icon";

interface GamePickerProps {
  games: Game[]; // už seřazené (pořadí = pořadí v seznamu i pro šipky)
  activeId: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
}

// Obtížnost 1–5 jako hvězdičky (plné v barvě akcentu, zbytek tlumeně).
export function DifficultyStars({ level, size = 12 }: { level: number; size?: number }) {
  const full = Math.max(0, Math.min(5, Math.round(level)));
  return (
    <span
      className="inline-flex leading-none tracking-[1px]"
      style={{ fontSize: size }}
      aria-label={`obtížnost ${full} z 5`}
      role="img"
    >
      <span className="text-[var(--accent)]">{"★".repeat(full)}</span>
      <span className="text-[var(--text-muted)]" style={{ opacity: 0.45 }}>
        {"★".repeat(5 - full)}
      </span>
    </span>
  );
}

function ArrowButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: "chevron-left" | "chevron-right";
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center bg-[var(--surface)] border-[0.5px] border-[var(--border)] text-[var(--text-soft)] transition-all duration-[120ms] hover:text-[var(--text-strong)] hover:border-[var(--accent)] active:scale-[0.92] disabled:opacity-35 disabled:cursor-not-allowed disabled:active:scale-100"
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

export function GamePicker({ games, activeId, open, onToggle, onSelect }: GamePickerProps) {
  const index = Math.max(
    0,
    games.findIndex((g) => g.id === activeId),
  );
  const active = games[index];
  const listRef = useRef<HTMLDivElement>(null);

  // Po rozbalení posuň vybranou položku do zorného pole (u dlouhých seznamů).
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>("[data-active='true']");
    el?.scrollIntoView({ block: "nearest" });
  }, [open]);

  if (!active) return null;

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5">
        <ArrowButton
          icon="chevron-left"
          label="Předchozí"
          disabled={index <= 0}
          onClick={() => onSelect(games[index - 1].id)}
        />

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="flex-1 min-w-0 min-h-[44px] flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[var(--surface)] border-[0.5px] border-[var(--accent)] text-left transition-all duration-[120ms] active:scale-[0.99]"
        >
          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-2 min-w-0">
              <DifficultyStars level={active.difficulty} />
              <span className="font-body text-[14px] text-[var(--text-strong)] truncate">
                {active.title}
              </span>
            </span>
            <span className="block font-body text-[11px] text-[var(--text-muted)] truncate">
              {active.topic}
            </span>
          </span>
          <Icon
            name="chevron-down"
            size={16}
            className="shrink-0 text-[var(--text-soft)] transition-transform duration-[160ms]"
            style={{ transform: open ? "rotate(180deg)" : "none" }}
          />
        </button>

        <ArrowButton
          icon="chevron-right"
          label="Další"
          disabled={index >= games.length - 1}
          onClick={() => onSelect(games[index + 1].id)}
        />
      </div>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label="Seznam partií"
          className="fade-in mt-1.5 rounded-[10px] bg-[var(--surface)] border-[0.5px] border-[var(--border)] overflow-hidden"
        >
          {games.map((g, i) => {
            const isActive = g.id === activeId;
            return (
              <button
                key={g.id}
                type="button"
                role="option"
                aria-selected={isActive}
                data-active={isActive ? "true" : "false"}
                onClick={() => onSelect(g.id)}
                className={
                  "w-full min-h-[44px] flex items-center gap-2.5 px-3 py-1.5 text-left border-l-[3px] transition-colors duration-[120ms] " +
                  (i > 0 ? "border-t-[0.5px] border-t-[var(--border)] " : "") +
                  (isActive
                    ? "border-l-[var(--accent)] text-[var(--text-strong)]"
                    : "border-l-transparent text-[var(--text-soft)] hover:text-[var(--text-strong)]")
                }
                // Tailwind v3 neumí průhlednost nad CSS proměnnou (var(--accent)/12),
                // proto color-mix inline; kde není podporován, zůstane jen levý proužek.
                style={isActive ? { background: "color-mix(in srgb, var(--accent) 14%, transparent)" } : undefined}
              >
                <span className="w-6 shrink-0 font-mono text-[11px] text-[var(--text-muted)] text-right">
                  {i + 1}.
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-body text-[14px] truncate">{g.title}</span>
                  <span className="block font-body text-[11px] text-[var(--text-muted)] truncate">
                    {g.topic}
                  </span>
                </span>
                <DifficultyStars level={g.difficulty} size={11} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
