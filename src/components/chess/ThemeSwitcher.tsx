// ThemeSwitcher.tsx — jedna kruhová ikonka, která cyklí 4 témata.
//
// Pořadí: wooden-night → wooden-day → modern-light → midnight-blue → (zpět).
// Ikonka zobrazuje symbol aktuálního tématu. Řízená komponenta (rodič Index
// se stará o applyTheme/saveTheme).

import { THEMES, type ThemeId } from "../../lib/storage";
import { Icon, type IconName } from "./Icon";

const THEME_ICON: Record<ThemeId, IconName> = {
  "wooden-night": "moon",
  "wooden-day": "sun",
  "modern-light": "contrast",
  "midnight-blue": "moon-stars",
};

interface ThemeSwitcherProps {
  theme: ThemeId;
  onSelect: (theme: ThemeId) => void;
}

export function ThemeSwitcher({ theme, onSelect }: ThemeSwitcherProps) {
  const next = () => {
    const i = THEMES.indexOf(theme);
    const nextTheme = THEMES[(i + 1) % THEMES.length];
    onSelect(nextTheme);
  };

  return (
    <button
      onClick={next}
      aria-label="Změnit téma"
      title="Změnit téma"
      className="w-11 h-11 rounded-full flex items-center justify-center bg-[var(--surface)] border-[0.5px] border-[var(--border)] text-[var(--accent)] transition-all duration-[120ms] hover:brightness-110 hover:border-[var(--accent)] active:scale-[0.94]"
    >
      <Icon name={THEME_ICON[theme]} size={18} />
    </button>
  );
}
