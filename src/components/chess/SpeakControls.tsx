// SpeakControls.tsx — ovládání předčítání (Web Speech API).
//
// SpeakButton     — ikonka reproduktoru u textového tabu (klik čte / zastaví)
// ReadMovesToggle — přepínač „Číst tahy nahlas" u tabu Tah
//
// Obě komponenty jsou čistě vizuální; logiku drží useSpeech() v Index.tsx.

import { Icon } from "./Icon";

export function SpeakButton({
  speaking,
  onToggle,
  disabled,
}: {
  speaking: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const label = speaking ? "Zastavit předčítání" : "Přečíst nahlas";
  const look = speaking
    ? "bg-[var(--surface)] border-[var(--accent)] text-[var(--accent)] speak-pulse"
    : "bg-transparent border-[var(--border)] text-[var(--text-soft)] hover:text-[var(--text-strong)] hover:border-[var(--accent)]";
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={label}
      aria-pressed={speaking}
      title={label}
      className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center border-[0.5px] transition-all duration-[120ms] active:scale-[0.92] disabled:opacity-35 disabled:cursor-not-allowed disabled:active:scale-100 ${look}`}
    >
      <Icon name={speaking ? "volume-stop" : "volume"} size={17} />
    </button>
  );
}

export function ReadMovesToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="mt-3 pt-3 border-t-[0.5px] border-[var(--border)]">
      <label className="flex items-center gap-2.5 min-h-[40px] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span
          aria-hidden
          className={
            "relative w-[38px] h-[22px] shrink-0 rounded-full border-[0.5px] transition-colors duration-[120ms] " +
            (checked
              ? "bg-[var(--accent)] border-[var(--accent)]"
              : "bg-transparent border-[var(--border)]")
          }
        >
          <span
            className={
              "absolute top-1/2 -translate-y-1/2 w-[15px] h-[15px] rounded-full transition-all duration-[120ms] " +
              (checked
                ? "left-[20px] bg-[var(--surface)]"
                : "left-[3px] bg-[var(--text-muted)]")
            }
          />
        </span>
        <span className="font-body text-[14px] text-[var(--text-soft)]">
          Číst tahy nahlas
        </span>
      </label>
      <p className="font-body text-[11px] leading-snug text-[var(--text-muted)] mt-0.5">
        Na iPhonu může být zvuk ztlumený přepínačem vyzvánění.
      </p>
    </div>
  );
}
