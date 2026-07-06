// storage.ts — perzistence v localStorage (téma a pokrok).
//
// Žádný backend; vše drží prohlížeč. Klíče:
//   sach-pruvodce-theme    — vybrané téma
//   sach-pruvodce-progress — výsledky procvičování po variantách

export type ThemeId =
  | "wooden-night"
  | "wooden-day"
  | "modern-light"
  | "midnight-blue";

export const THEMES: ThemeId[] = [
  "wooden-night",
  "wooden-day",
  "modern-light",
  "midnight-blue",
];

const THEME_KEY = "sach-pruvodce-theme";
const PROGRESS_KEY = "sach-pruvodce-progress";

const DEFAULT_THEME: ThemeId = "wooden-night";

// --- Téma --------------------------------------------------------------------

export function loadTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw && (THEMES as string[]).includes(raw)) {
      return raw as ThemeId;
    }
  } catch {
    /* localStorage nedostupný — použij default */
  }
  return DEFAULT_THEME;
}

export function saveTheme(theme: ThemeId): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignoruj */
  }
}

export function applyTheme(theme: ThemeId): void {
  document.documentElement.setAttribute("data-theme", theme);
}

// --- Pokrok ------------------------------------------------------------------

export type PracticeSide = "white" | "black";

// Výsledek za jednu stranu (bílý/černý) dané varianty.
export interface SideResult {
  stars: number; // 1–3 (nejlepší); 0 = dosud nehráno
  mistakes: number; // počet chyb u nejlepšího výsledku
  played: boolean; // procvičeno alespoň jednou
  attempts: number; // kolikrát dohráno
}

// Pokrok jedné varianty — zvlášť za bílého a za černého.
export interface VariationProgress {
  white: SideResult;
  black: SideResult;
}

// Klíč: `${openingId}/${variationId}`
export type Progress = Record<string, VariationProgress>;

export function emptySide(): SideResult {
  return { stars: 0, mistakes: 0, played: false, attempts: 0 };
}

export function progressKey(openingId: string, variationId: string): string {
  return `${openingId}/${variationId}`;
}

// Sjednotí (a případně migruje) libovolný uložený záznam na nový tvar.
function normalizeSide(raw: unknown): SideResult {
  if (!raw || typeof raw !== "object") return emptySide();
  const r = raw as Record<string, unknown>;
  const stars = Number(r.stars) || 0;
  return {
    stars,
    mistakes: Number(r.mistakes) || 0,
    played: typeof r.played === "boolean" ? r.played : stars > 0,
    attempts: Number(r.attempts) || 0,
  };
}

function migrateEntry(raw: unknown): VariationProgress {
  if (!raw || typeof raw !== "object") {
    return { white: emptySide(), black: emptySide() };
  }
  const r = raw as Record<string, unknown>;
  // Nový tvar (white/black)
  if ("white" in r || "black" in r) {
    return { white: normalizeSide(r.white), black: normalizeSide(r.black) };
  }
  // Starý plochý tvar { stars, mistakes, attempts } → ber jako bílý
  if ("stars" in r) {
    return {
      white: {
        stars: Number(r.stars) || 0,
        mistakes: Number(r.mistakes) || 0,
        played: true,
        attempts: Number(r.attempts) || 1,
      },
      black: emptySide(),
    };
  }
  return { white: emptySide(), black: emptySide() };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const out: Progress = {};
        for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
          out[key] = migrateEntry(val);
        }
        return out;
      }
    }
  } catch {
    /* poškozená/nedostupná data — začni načisto */
  }
  return {};
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* ignoruj */
  }
}

// Hvězdičky podle počtu chyb: 0 → 3★, 1–2 → 2★, 3+ → 1★
export function starsFromMistakes(mistakes: number): number {
  if (mistakes === 0) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}

// Zaznamená výsledek dohrané varianty za danou stranu. Vrátí NOVÝ objekt
// progress (immutable). Uchovává nejlepší výsledek dané strany.
export function recordResult(
  progress: Progress,
  openingId: string,
  variationId: string,
  side: PracticeSide,
  mistakes: number,
): Progress {
  const key = progressKey(openingId, variationId);
  const stars = starsFromMistakes(mistakes);
  const current: VariationProgress = progress[key] ?? {
    white: emptySide(),
    black: emptySide(),
  };
  const prev = current[side];

  let best: SideResult;
  if (!prev.played) {
    best = { stars, mistakes, played: true, attempts: 1 };
  } else {
    const isBetter =
      stars > prev.stars || (stars === prev.stars && mistakes < prev.mistakes);
    best = {
      stars: isBetter ? stars : prev.stars,
      mistakes: isBetter ? mistakes : prev.mistakes,
      played: true,
      attempts: prev.attempts + 1,
    };
  }

  const next: Progress = {
    ...progress,
    [key]: { ...current, [side]: best },
  };
  saveProgress(next);
  return next;
}
