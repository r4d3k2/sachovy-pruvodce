// PieceQuiz.tsx — kvíz na figury (10 otázek).
//
// Dva typy otázek:
//   "movement" — Která figura se hýbe takto? (mini-diagram → výběr názvu)
//   "look"     — Jak vypadá {figura}? (název → výběr ze 4 siluet)

import { useMemo, useState } from "react";
import { PIECES, type PieceInfo } from "../../data/pieces";
import { PieceSilhouette } from "./PieceSilhouettes";
import { DiagramView } from "./PieceCard";
import { Pill } from "./Pill";

interface Question {
  kind: "movement" | "look";
  answer: PieceInfo;
  options: PieceInfo[];
}

const TOTAL = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestions(): Question[] {
  const out: Question[] = [];
  for (let i = 0; i < TOTAL; i++) {
    const kind: Question["kind"] = i % 2 === 0 ? "movement" : "look";
    const answer = PIECES[Math.floor(Math.random() * PIECES.length)];
    const distractors = shuffle(PIECES.filter((p) => p.type !== answer.type)).slice(0, 3);
    const options = shuffle([answer, ...distractors]);
    out.push({ kind, answer, options });
  }
  return out;
}

export function PieceQuiz() {
  const [questions, setQuestions] = useState<Question[]>(() => buildQuestions());
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<PieceInfo | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[index];
  const answered = selected !== null;

  const choose = (opt: PieceInfo) => {
    if (answered) return;
    setSelected(opt);
    if (opt.type === q.answer.type) setScore((s) => s + 1);
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
    }
  };

  const restart = () => {
    setQuestions(buildQuestions());
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  };

  const progress = useMemo(() => `Otázka ${index + 1} / ${questions.length}`, [index, questions.length]);

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    const headline =
      pct === 100 ? "Perfektní!" : pct >= 70 ? "Skvělá práce!" : pct >= 40 ? "Dobrý základ" : "Zkus to znovu";
    return (
      <div className="rounded-2xl border border-[color:var(--text-muted)]/20 bg-[var(--surface)] p-6 text-center fade-in">
        <p className="font-display text-2xl font-bold text-[var(--text-strong)] mb-2">{headline}</p>
        <p className="font-body text-lg text-[var(--text-soft)] mb-1">
          Skóre: {score} / {questions.length}
        </p>
        <p className="font-mono text-3xl text-[var(--accent)] mb-4">{pct} %</p>
        <Pill level={2} active onClick={restart}>
          🔄 Hrát znovu
        </Pill>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[color:var(--text-muted)]/20 bg-[var(--surface)] p-4 fade-in">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs text-[var(--text-muted)]">{progress}</span>
        <span className="font-mono text-xs text-[var(--text-soft)]">Skóre: {score}</span>
      </div>

      {q.kind === "movement" ? (
        <>
          <p className="font-body text-[15px] text-[var(--text-strong)] mb-3 text-center">
            Která figura se pohybuje takto?
          </p>
          <div className="w-[180px] max-w-full mx-auto mb-4">
            <DiagramView diagram={q.answer.diagrams[0]} type={q.answer.type} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {q.options.map((opt) => (
              <QuizOption
                key={opt.type}
                label={opt.csName}
                state={optionState(answered, opt, q.answer, selected)}
                onClick={() => choose(opt)}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="font-body text-[15px] text-[var(--text-strong)] mb-4 text-center">
            Jak vypadá figura <strong>{q.answer.csName}</strong>?
          </p>
          <div className="grid grid-cols-4 gap-2">
            {q.options.map((opt) => {
              const state = optionState(answered, opt, q.answer, selected);
              return (
                <button
                  key={opt.type}
                  onClick={() => choose(opt)}
                  disabled={answered}
                  className={
                    "rounded-xl border p-2 aspect-[4/5] flex items-center justify-center transition-all " +
                    optionClasses(state)
                  }
                >
                  <div className="w-full h-full">
                    <PieceSilhouette type={opt.type} side="white" />
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {answered && (
        <div className="mt-4 text-center fade-in">
          <p
            className={
              "font-body mb-2 " +
              (selected?.type === q.answer.type ? "text-[var(--good)]" : "text-[var(--bad)]")
            }
          >
            {selected?.type === q.answer.type
              ? "Správně! ✓"
              : `Správná odpověď: ${q.answer.csName}`}
          </p>
          <Pill level={2} active onClick={next}>
            {index + 1 >= questions.length ? "Zobrazit výsledek" : "Další otázka →"}
          </Pill>
        </div>
      )}
    </div>
  );
}

type OptState = "idle" | "correct" | "wrong" | "muted";

function optionState(
  answered: boolean,
  opt: PieceInfo,
  answer: PieceInfo,
  selected: PieceInfo | null,
): OptState {
  if (!answered) return "idle";
  if (opt.type === answer.type) return "correct";
  if (selected && opt.type === selected.type) return "wrong";
  return "muted";
}

function optionClasses(state: OptState): string {
  switch (state) {
    case "correct":
      return "border-[var(--good)] bg-[color:var(--good)]/15";
    case "wrong":
      return "border-[var(--bad)] bg-[color:var(--bad)]/15";
    case "muted":
      return "border-[color:var(--text-muted)]/30 opacity-50";
    default:
      return "border-[color:var(--text-muted)]/30 hover:border-[var(--accent)]";
  }
}

function QuizOption({
  label,
  state,
  onClick,
}: {
  label: string;
  state: OptState;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={state !== "idle"}
      className={
        "rounded-xl border py-2.5 px-3 font-body text-[15px] transition-all " +
        optionClasses(state) +
        (state === "idle" ? " text-[var(--text-soft)] hover:text-[var(--text-strong)]" : " text-[var(--text-strong)]")
      }
    >
      {label}
    </button>
  );
}
