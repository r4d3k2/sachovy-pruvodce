// ResultCard.tsx — výsledková karta po dohrání procvičování.
//
// Ukazuje výsledek právě dohraného pokusu (za konkrétní stranu) a pod ním
// souhrn nejlepších hvězdiček za obě strany (bílý ♔ / černý ♚).

import type { PracticeSide } from "../../lib/storage";
import { Pill } from "./Pill";
import { SideStars } from "./Stars";

interface ResultCardProps {
  side: PracticeSide;
  attemptStars: number; // hvězdy za právě dohraný pokus
  mistakes: number;
  whiteStars: number;
  blackStars: number;
  onRetry: () => void;
  onNext?: () => void;
}

export function ResultCard({
  side,
  attemptStars,
  mistakes,
  whiteStars,
  blackStars,
  onRetry,
  onNext,
}: ResultCardProps) {
  const headline =
    attemptStars === 3 ? "Bez chyby!" : attemptStars === 2 ? "Velmi dobře!" : "Dokončeno";
  const sideLabel = side === "white" ? "za bílého ♔" : "za černého ♚";

  return (
    <div className="rounded-2xl border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5 text-center fade-in">
      <p className="font-display text-xl font-bold text-[var(--text-strong)] mb-1">
        {headline}
      </p>
      <p className="font-body text-xs text-[var(--text-muted)] mb-3">
        Procvičeno {sideLabel} ·{" "}
        {mistakes === 0 ? "bez chyby" : `chyby: ${mistakes}`}
      </p>

      <div className="flex justify-center mb-4">
        <SideStars white={whiteStars} black={blackStars} size={20} />
      </div>

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
