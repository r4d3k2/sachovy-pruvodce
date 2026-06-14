// ResultCard.tsx — výsledková karta po dohrání procvičování.

import { Pill } from "./Pill";
import { Stars } from "./Stars";

interface ResultCardProps {
  stars: number;
  mistakes: number;
  onRetry: () => void;
  onNext?: () => void;
}

export function ResultCard({ stars, mistakes, onRetry, onNext }: ResultCardProps) {
  const headline =
    stars === 3 ? "Bez chyby!" : stars === 2 ? "Velmi dobře!" : "Dokončeno";

  return (
    <div className="rounded-2xl border border-[color:var(--text-muted)]/20 bg-[var(--surface)] p-5 text-center fade-in">
      <p className="font-display text-xl font-bold text-[var(--text-strong)] mb-2">
        {headline}
      </p>
      <Stars count={stars} size={30} className="mb-2" />
      <p className="font-body text-[var(--text-soft)] mb-4">
        {mistakes === 0
          ? "Variantu jsi zahrál zcela bez chyby."
          : `Počet chyb: ${mistakes}`}
      </p>
      <div className="flex justify-center gap-2">
        <Pill level={2} onClick={onRetry}>
          🔄 Zkusit znovu
        </Pill>
        {onNext && (
          <Pill level={2} active onClick={onNext}>
            Další varianta →
          </Pill>
        )}
      </div>
    </div>
  );
}
