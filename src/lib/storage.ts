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

export interface VariationResult {
  stars: number; // 1–3 (nejlepší dosažený výsledek)
  mistakes: number; // počet chyb u nejlepšího výsledku
  attempts: number; // kolikrát varianta dohrána
}

// Klíč: `${openingId}/${variationId}`
export type Progress = Record<string, VariationResult>;

export function progressKey(openingId: string, variationId: string): string {
  return `${openingId}/${variationId}`;
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed as Progress;
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

// Zaznamená výsledek dohrané varianty. Vrátí NOVÝ objekt progress (immutable).
// Uchovává nejlepší výsledek (více hvězd, při shodě méně chyb) a počítá pokusy.
export function recordResult(
  progress: Progress,
  openingId: string,
  variationId: string,
  mistakes: number,
): Progress {
  const key = progressKey(openingId, variationId);
  const stars = starsFromMistakes(mistakes);
  const prev = progress[key];

  let best: VariationResult;
  if (!prev) {
    best = { stars, mistakes, attempts: 1 };
  } else {
    const isBetter = stars > prev.stars || (stars === prev.stars && mistakes < prev.mistakes);
    best = {
      stars: isBetter ? stars : prev.stars,
      mistakes: isBetter ? mistakes : prev.mistakes,
      attempts: prev.attempts + 1,
    };
  }

  const next: Progress = { ...progress, [key]: best };
  saveProgress(next);
  return next;
}
