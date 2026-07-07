// Index.tsx — hlavní stránka se 4 režimy (vizuál ve stylu xiangqi-pruvodce).
//
// Studovat — procházení tahů s komentářem.
// Procvičovat — hráč hádá tahy klikáním, engine validuje a ukazuje legální pole.
// Figury — karty figur + kvíz.
// Partie — připravujeme (Fáze 4).
//
// POZN.: Toto je vizuální vrstva. Herní logika, engine a validace se nemění.

import { useEffect, useMemo, useState } from "react";
import {
  applyMovesUpTo,
  legalTargets,
  moveSide,
  sideOf,
  squareToCoords,
} from "../lib/chess-engine";
import { trackedPiecesUpTo } from "../lib/chess-tracking";
import { recommend } from "../lib/recommend";
import { OPENINGS } from "../data/openings";
import { PIECES } from "../data/pieces";
import { GAMES } from "../data/games";
import {
  applyTheme,
  loadProgress,
  loadTheme,
  progressKey,
  recordResult,
  saveTheme,
  starsFromMistakes,
  type PracticeSide,
  type Progress,
  type ThemeId,
} from "../lib/storage";
import { ChessBoard } from "../components/chess/ChessBoard";
import { Pill } from "../components/chess/Pill";
import { MoveToken } from "../components/chess/MoveToken";
import { SideStars } from "../components/chess/Stars";
import { ResultCard } from "../components/chess/ResultCard";
import { ThemeSwitcher } from "../components/chess/ThemeSwitcher";
import { PieceCard } from "../components/chess/PieceCard";
import { PieceQuiz } from "../components/chess/PieceQuiz";
import { Icon, type IconName } from "../components/chess/Icon";

type Mode = "study" | "practice" | "pieces" | "games";
type StudyTab = "overview" | "history" | "move";
type PiecesTab = "cards" | "quiz";
type GameTab = "topic" | "move" | "result";

const MODES: Array<{ id: Mode; label: string; icon: IconName; ready: boolean }> = [
  { id: "study", label: "Studovat", icon: "book-open", ready: true },
  { id: "practice", label: "Procvičovat", icon: "target", ready: true },
  { id: "pieces", label: "Figury", icon: "crown", ready: true },
  { id: "games", label: "Partie", icon: "history", ready: true },
];

const OPENING_ICON: Record<string, IconName> = {
  italian: "flag",
  london: "flag",
  french: "flag",
  sicilian: "shield",
  "queens-gambit": "crown",
  "caro-kann": "shield",
  scandinavian: "flag",
  petrov: "flag",
  "kings-indian": "crown",
};

const OPPONENT_DELAY = 700;
const ERROR_FLASH_MS = 460;

// Kulaté ovládací tlačítko pod deskou
function CtrlButton({
  icon,
  onClick,
  disabled,
  label,
}: {
  icon: IconName;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="w-11 h-11 rounded-full flex items-center justify-center bg-[var(--surface)] border-[0.5px] border-[var(--border)] text-[var(--text-soft)] transition-all duration-[120ms] hover:text-[var(--text-strong)] hover:border-[var(--accent)] active:scale-[0.92] disabled:opacity-35 disabled:cursor-not-allowed disabled:active:scale-100"
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

// Navigační pill (režimy / zahájení / varianty) — styl xiangqi
function NavPill({
  active,
  onClick,
  disabled,
  title,
  size = 2,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  size?: 1 | 2 | 3;
  icon?: IconName;
  children: React.ReactNode;
}) {
  // Kompaktnější na mobilu (nižší výška, menší font), plná velikost od sm.
  // Dotykový cíl drží min. ~40px i na mobilu.
  const sizes: Record<number, string> = {
    1: "text-[14px] sm:text-[15px] px-3.5 min-h-[40px] sm:min-h-[44px]",
    2: "text-[12px] sm:text-[13px] px-3 min-h-[40px] sm:min-h-[44px]",
    3: "text-[11px] sm:text-[12px] px-2.5 min-h-[40px] sm:min-h-[44px]",
  };
  const look = active
    ? "bg-[var(--surface)] border-[var(--accent)] text-[var(--text-strong)]"
    : "bg-transparent border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-soft)] hover:border-[var(--accent)]";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border font-body transition-all duration-[120ms] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${sizes[size]} ${look}`}
    >
      {icon && <Icon name={icon} size={size === 1 ? 15 : 13} />}
      {children}
    </button>
  );
}

export default function Index() {
  const [mode, setMode] = useState<Mode>("study");
  const [theme, setTheme] = useState<ThemeId>(() => loadTheme());
  const [progress, setProgress] = useState<Progress>(() => loadProgress());

  const [openingId, setOpeningId] = useState("italian");
  const [variationId, setVariationId] = useState("pianissimo");
  const [flipped, setFlipped] = useState(false);

  // Studovat
  const [studyIndex, setStudyIndex] = useState(0);
  const [studyTab, setStudyTab] = useState<StudyTab>("overview");

  // Procvičovat
  const [practiceSide, setPracticeSide] = useState<PracticeSide>("white");
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [finished, setFinished] = useState(false);
  const [errorSquare, setErrorSquare] = useState<string | null>(null);
  const [opponentThinking, setOpponentThinking] = useState(false);

  // Figury
  const [piecesTab, setPiecesTab] = useState<PiecesTab>("cards");

  // Partie
  const [gameId, setGameId] = useState(GAMES[0].id);
  const [gameIndex, setGameIndex] = useState(0);
  const [gameTab, setGameTab] = useState<GameTab>("topic");

  // Doporučení slabého místa (toast)
  const [recommendNote, setRecommendNote] = useState<string | null>(null);

  const opening = OPENINGS.find((o) => o.id === openingId) ?? OPENINGS[0];
  const variation =
    opening.variations.find((v) => v.id === variationId) ?? opening.variations[0];
  const moves = variation?.moves ?? [];

  // Téma — aplikuj a ulož
  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  const resetPractice = () => {
    setPracticeIndex(0);
    setMistakes(0);
    setSelected(null);
    setHintLevel(0);
    setFinished(false);
    setErrorSquare(null);
    setOpponentThinking(false);
  };

  // V procvičování ↻ přepne stranu hráče a začne od tahu 0 (za černého se
  // 1. bílý tah odehraje sám díky efektu níže).
  const switchPracticeSide = () => {
    setPracticeSide((s) => (s === "white" ? "black" : "white"));
    resetPractice();
  };

  const selectOpening = (id: string) => {
    const o = OPENINGS.find((x) => x.id === id);
    setOpeningId(id);
    setVariationId(o?.variations[0]?.id ?? "");
    setStudyIndex(0);
    resetPractice();
  };

  const selectVariation = (id: string) => {
    setVariationId(id);
    setStudyIndex(0);
    resetPractice();
  };

  const selectMode = (m: Mode) => {
    setMode(m);
    if (m === "practice") resetPractice();
  };

  // Doporuč slabé místo a přepni na něj (nebo zobraz hlášku „vše zvládnuto“).
  const handleRecommend = () => {
    const rec = recommend(progress, OPENINGS);
    if (!rec) {
      setRecommendNote("Všechno máš zvládnuté! 🎉");
      return;
    }
    setRecommendNote(null);
    setOpeningId(rec.openingId);
    setVariationId(rec.variationId);
    setPracticeSide(rec.side);
    setStudyIndex(0);
    resetPractice();
  };

  // === Procvičovat — soupeřovy tahy a dokončení =============================

  useEffect(() => {
    if (mode !== "practice" || finished) return;
    if (practiceIndex >= moves.length) return;
    // Soupeřův tah (strana, kterou hráč nehraje) se odehraje sám.
    if (moveSide(practiceIndex) === practiceSide) return;

    setOpponentThinking(true);
    const t = setTimeout(() => {
      setPracticeIndex((i) => i + 1);
      setOpponentThinking(false);
    }, OPPONENT_DELAY);
    return () => clearTimeout(t);
  }, [mode, practiceIndex, finished, moves.length, practiceSide]);

  useEffect(() => {
    if (mode !== "practice" || finished) return;
    if (moves.length === 0 || practiceIndex < moves.length) return;
    setFinished(true);
    setProgress(recordResult(progress, openingId, variationId, practiceSide, mistakes));
  }, [mode, practiceIndex, moves.length, finished, openingId, variationId, practiceSide, mistakes, progress]);

  useEffect(() => {
    if (!errorSquare) return;
    const t = setTimeout(() => setErrorSquare(null), ERROR_FLASH_MS);
    return () => clearTimeout(t);
  }, [errorSquare]);

  // Toast doporučení sám zmizí.
  useEffect(() => {
    if (!recommendNote) return;
    const t = setTimeout(() => setRecommendNote(null), 2600);
    return () => clearTimeout(t);
  }, [recommendNote]);

  // === Odvozené hodnoty desky =============================================

  const activeIndex = mode === "practice" ? practiceIndex : studyIndex;
  const board = useMemo(() => applyMovesUpTo(moves, activeIndex), [moves, activeIndex]);
  const pieces = useMemo(() => trackedPiecesUpTo(moves, activeIndex), [moves, activeIndex]);

  const lastMove =
    activeIndex > 0 && moves[activeIndex - 1]
      ? { from: moves[activeIndex - 1].from, to: moves[activeIndex - 1].to }
      : null;

  // === Partie — odvozené hodnoty =========================================

  const game = GAMES.find((g) => g.id === gameId) ?? GAMES[0];
  const gameMoves = game.moves;
  const gameBoard = useMemo(
    () => applyMovesUpTo(gameMoves, gameIndex),
    [gameMoves, gameIndex],
  );
  const gamePieces = useMemo(
    () => trackedPiecesUpTo(gameMoves, gameIndex),
    [gameMoves, gameIndex],
  );
  const gameLastMove =
    gameIndex > 0 && gameMoves[gameIndex - 1]
      ? { from: gameMoves[gameIndex - 1].from, to: gameMoves[gameIndex - 1].to }
      : null;
  const currentGameMove = gameIndex > 0 ? gameMoves[gameIndex - 1] : null;
  const gameFinished = gameIndex >= gameMoves.length;

  const selectGame = (id: string) => {
    setGameId(id);
    setGameIndex(0);
    setGameTab("topic");
  };
  const gStart = () => setGameIndex(0);
  const gBack = () => setGameIndex((i) => Math.max(0, i - 1));
  const gForward = () => setGameIndex((i) => Math.min(gameMoves.length, i + 1));
  const gEnd = () => setGameIndex(gameMoves.length);

  // === Procvičovat — interakce ============================================

  const expected = practiceIndex < moves.length ? moves[practiceIndex] : null;
  const isPlayerTurn =
    mode === "practice" &&
    !finished &&
    !opponentThinking &&
    expected !== null &&
    moveSide(practiceIndex) === practiceSide;

  const handleSquareClick = (sq: string) => {
    if (!isPlayerTurn || !expected) return;
    const [r, c] = squareToCoords(sq);
    const cell = board[r][c];

    if (!selected) {
      if (cell && sideOf(cell) === practiceSide) setSelected(sq);
      return;
    }
    if (sq === selected) {
      setSelected(null);
      return;
    }
    if (cell && sideOf(cell) === practiceSide) {
      setSelected(sq);
      return;
    }
    if (selected === expected.from && sq === expected.to) {
      setSelected(null);
      setHintLevel(0);
      setErrorSquare(null);
      setPracticeIndex((i) => i + 1);
    } else {
      setErrorSquare(sq);
      setMistakes((m) => m + 1);
      setSelected(null);
    }
  };

  const showHint = () => setHintLevel((l) => Math.min(2, l + 1));

  const boardSelected =
    mode === "practice"
      ? (selected ?? (hintLevel >= 1 && expected ? expected.from : null))
      : null;
  const boardLegal =
    mode === "practice"
      ? selected
        ? legalTargets(board, selected)
        : hintLevel >= 2 && expected
          ? [expected.to]
          : []
      : [];

  // Navigace (Studovat)
  const goStart = () => setStudyIndex(0);
  const goBack = () => setStudyIndex((i) => Math.max(0, i - 1));
  const goForward = () => setStudyIndex((i) => Math.min(moves.length, i + 1));
  const goEnd = () => setStudyIndex(moves.length);

  const currentStudyMove = studyIndex > 0 ? moves[studyIndex - 1] : null;
  const studyTabContent =
    studyTab === "overview"
      ? opening.intro
      : studyTab === "history"
        ? opening.history ?? "—"
        : currentStudyMove
          ? currentStudyMove.comment
          : "Stiskni „Vpřed“ a začni procházet tahy zahájení. Ke každému tahu se zde zobrazí komentář.";

  const variationIndex = opening.variations.findIndex((v) => v.id === variationId);
  const nextVariation =
    variationIndex >= 0 && variationIndex < opening.variations.length - 1
      ? opening.variations[variationIndex + 1]
      : null;

  const savedResult = progress[progressKey(openingId, variationId)];
  const showBoard = mode === "study" || mode === "practice";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-[440px] mx-auto px-[18px] py-5 theme-transition">
        {/* Hlavička */}
        <header className="relative text-center mb-5">
          <div className="absolute right-0 top-0">
            <ThemeSwitcher theme={theme} onSelect={setTheme} />
          </div>
          <p className="font-body text-[11px] tracking-[3px] text-[var(--text-muted)] mb-1 uppercase">
            ♞ Š A C H Y
          </p>
          <h1 className="font-display text-[21px] font-medium text-[var(--text-strong)] px-12">
            Průvodce zahájením
          </h1>
        </header>

        {/* Mode pills */}
        <nav className="flex justify-center flex-wrap gap-x-1.5 gap-y-1 mb-4">
          {MODES.map((m) => (
            <NavPill
              key={m.id}
              size={1}
              icon={m.icon}
              active={mode === m.id}
              disabled={!m.ready}
              title={m.ready ? undefined : "Připravujeme"}
              onClick={() => m.ready && selectMode(m.id)}
            >
              {m.label}
            </NavPill>
          ))}
        </nav>

        {/* Obsah režimu — fade při přepnutí režimu */}
        <div key={mode} className="fade-soft">

        {/* Selektory zahájení/varianty (Studovat + Procvičovat) */}
        {showBoard && (
          <>
            <div className="flex flex-wrap justify-center gap-x-1.5 gap-y-1 mb-2">
              {OPENINGS.map((o) => (
                <NavPill
                  key={o.id}
                  size={2}
                  icon={OPENING_ICON[o.id] ?? "circle-dot"}
                  active={o.id === openingId}
                  onClick={() => selectOpening(o.id)}
                >
                  {o.name}
                </NavPill>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-x-1.5 gap-y-1 mb-3">
              {opening.variations.map((v) => {
                const res = progress[progressKey(openingId, v.id)];
                const anyPlayed = res && (res.white.played || res.black.played);
                return (
                  <NavPill
                    key={v.id}
                    size={3}
                    active={v.id === variationId}
                    onClick={() => selectVariation(v.id)}
                  >
                    {v.name}
                    {anyPlayed && (
                      <span
                        className="ml-1 flex flex-col items-start leading-none text-[9px] text-[var(--accent)]"
                        aria-hidden
                      >
                        {res!.white.played && <span>♔{res!.white.stars}</span>}
                        {res!.black.played && <span>♚{res!.black.stars}</span>}
                      </span>
                    )}
                  </NavPill>
                );
              })}
            </div>
          </>
        )}

        {/* === Deska (Studovat + Procvičovat) ============================== */}
        {showBoard && (
          <>
            {/* Doporučení slabého místa (jen Procvičovat) */}
            {mode === "practice" && (
              <div className="flex flex-col items-center gap-2 mb-3">
                <NavPill size={2} icon="target" active={false} onClick={handleRecommend}>
                  Doporučit slabé místo
                </NavPill>
                {recommendNote && (
                  <div
                    role="status"
                    className="fade-in font-body text-[13px] text-[var(--accent)] bg-[var(--surface)] border-[0.5px] border-[var(--accent)] rounded-full px-3.5 py-1.5"
                  >
                    {recommendNote}
                  </div>
                )}
              </div>
            )}

            <div className="-mx-[14px] sm:mx-0 rounded-[10px] bg-[var(--surface)] border-[0.5px] border-[var(--border)] p-2.5 mb-3 shadow-[0_4px_18px_rgba(0,0,0,0.18)]">
              <ChessBoard
                board={board}
                pieces={pieces}
                flipped={mode === "practice" ? practiceSide === "black" : flipped}
                lastMove={lastMove}
                selectedSquare={boardSelected}
                legalMoves={boardLegal}
                errorSquare={errorSquare}
                onSquareClick={mode === "practice" ? handleSquareClick : undefined}
              />
            </div>

            {mode === "study" ? (
              <>
                {/* Ovládací tlačítka */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2">
                  <CtrlButton icon="skip-back" onClick={goStart} disabled={studyIndex === 0} label="Začátek" />
                  <CtrlButton icon="chevron-left" onClick={goBack} disabled={studyIndex === 0} label="Zpět" />
                  <span className="font-mono text-[11px] text-[var(--text-soft)] bg-[var(--surface)] border-[0.5px] border-[var(--border)] rounded-2xl px-3 py-1 min-w-[78px] text-center">
                    Tah {studyIndex} / {moves.length}
                  </span>
                  <CtrlButton icon="chevron-right" onClick={goForward} disabled={studyIndex >= moves.length} label="Vpřed" />
                  <CtrlButton icon="skip-forward" onClick={goEnd} disabled={studyIndex >= moves.length} label="Konec" />
                  <CtrlButton icon="rotate-cw" onClick={() => setFlipped((f) => !f)} label="Otočit desku" />
                </div>

                {currentStudyMove && (
                  <div className="flex justify-center mb-3">
                    <MoveToken notation={currentStudyMove.notation} active />
                  </div>
                )}

                {/* Taby Strategie/Historie/Tah */}
                <div className="rounded-[8px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                  <div className="flex border-b-[0.5px] border-[var(--border)]">
                    {(
                      [
                        ["overview", "Strategie"],
                        ["history", "Historie"],
                        ["move", "Tah"],
                      ] as Array<[StudyTab, string]>
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => setStudyTab(id)}
                        className={
                          "flex-1 py-2.5 font-body text-sm transition-colors " +
                          (studyTab === id
                            ? "text-[var(--accent)] border-b-2 border-[var(--accent)] -mb-px font-semibold"
                            : "text-[var(--text-soft)] hover:text-[var(--text-strong)]")
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div key={`${studyTab}-${studyIndex}`} className="p-3 fade-soft">
                    {studyTab === "move" && currentStudyMove && (
                      <div className="mb-2">
                        <MoveToken notation={currentStudyMove.notation} />
                      </div>
                    )}
                    <p className="font-body text-[15px] leading-relaxed text-[var(--text-soft)]">
                      {studyTabContent}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Procvičovat — stav */}
                <div className="flex items-center justify-center gap-3 mb-3 flex-wrap">
                  <span className="font-mono text-[11px] text-[var(--text-soft)] bg-[var(--surface)] border-[0.5px] border-[var(--border)] rounded-2xl px-3 py-1">
                    {practiceSide === "white" ? "♔ Bílý" : "♚ Černý"} · Tah{" "}
                    {Math.min(practiceIndex, moves.length)} / {moves.length}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--text-muted)]">
                    Chyby: <span className={mistakes > 0 ? "text-[var(--bad)]" : ""}>{mistakes}</span>
                  </span>
                  <CtrlButton
                    icon="rotate-cw"
                    onClick={switchPracticeSide}
                    label="Přepnout stranu (otočit desku)"
                  />
                </div>

                {finished ? (
                  <ResultCard
                    side={practiceSide}
                    attemptStars={starsFromMistakes(mistakes)}
                    mistakes={mistakes}
                    whiteStars={savedResult?.white.stars ?? 0}
                    blackStars={savedResult?.black.stars ?? 0}
                    onRetry={resetPractice}
                    onNext={nextVariation ? () => selectVariation(nextVariation.id) : undefined}
                  />
                ) : (
                  <div className="rounded-[8px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-3 fade-in text-center">
                    <p className="font-body text-[15px] text-[var(--text-strong)] mb-1">
                      {opponentThinking
                        ? "Soupeř přemýšlí…"
                        : isPlayerTurn
                          ? selected
                            ? "Vyber cílové pole tahu."
                            : "Jsi na tahu — vyber figuru, kterou chceš táhnout."
                          : "…"}
                    </p>
                    {expected && (
                      <p className="font-body text-xs text-[var(--text-muted)] mb-3">
                        Hádáš {moveSide(practiceIndex) === "white" ? "bílý" : "černý"} tah č.{" "}
                        {Math.floor(practiceIndex / 2) + 1}
                      </p>
                    )}
                    <Pill level={2} onClick={showHint} disabled={!isPlayerTurn}>
                      💡 Nápověda{hintLevel > 0 ? ` (${hintLevel}/2)` : ""}
                    </Pill>
                    {hintLevel >= 1 && expected && (
                      <p className="font-body text-xs text-[var(--text-soft)] mt-2 fade-in">
                        {hintLevel >= 2
                          ? `Táhni z ${expected.from} na ${expected.to}.`
                          : `Táhni figurou z pole ${expected.from}.`}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* === Figury ===================================================== */}
        {mode === "pieces" && (
          <div>
            <div className="flex justify-center gap-1.5 mb-4">
              <NavPill size={2} active={piecesTab === "cards"} onClick={() => setPiecesTab("cards")}>
                Karty figur
              </NavPill>
              <NavPill size={2} active={piecesTab === "quiz"} onClick={() => setPiecesTab("quiz")}>
                Kvíz
              </NavPill>
            </div>
            {piecesTab === "cards" ? (
              <div className="flex flex-col gap-3">
                {PIECES.map((p) => (
                  <PieceCard key={p.type} piece={p} />
                ))}
              </div>
            ) : (
              <PieceQuiz />
            )}
          </div>
        )}

        {/* === Partie ==================================================== */}
        {mode === "games" && (
          <>
            {/* Selektor partie */}
            <div className="flex flex-wrap justify-center gap-x-1.5 gap-y-1 mb-3">
              {GAMES.map((g) => (
                <NavPill
                  key={g.id}
                  size={2}
                  icon="swords"
                  active={g.id === gameId}
                  onClick={() => selectGame(g.id)}
                >
                  {g.title}
                </NavPill>
              ))}
            </div>

            {/* Deska */}
            <div className="-mx-[14px] sm:mx-0 rounded-[10px] bg-[var(--surface)] border-[0.5px] border-[var(--border)] p-2.5 mb-3 shadow-[0_4px_18px_rgba(0,0,0,0.18)]">
              <ChessBoard
                board={gameBoard}
                pieces={gamePieces}
                flipped={flipped}
                lastMove={gameLastMove}
              />
            </div>

            {/* Navigace */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2">
              <CtrlButton icon="skip-back" onClick={gStart} disabled={gameIndex === 0} label="Začátek" />
              <CtrlButton icon="chevron-left" onClick={gBack} disabled={gameIndex === 0} label="Zpět" />
              <span className="font-mono text-[11px] text-[var(--text-soft)] bg-[var(--surface)] border-[0.5px] border-[var(--border)] rounded-2xl px-3 py-1 min-w-[78px] text-center">
                Tah {gameIndex} / {gameMoves.length}
              </span>
              <CtrlButton icon="chevron-right" onClick={gForward} disabled={gameIndex >= gameMoves.length} label="Vpřed" />
              <CtrlButton icon="skip-forward" onClick={gEnd} disabled={gameIndex >= gameMoves.length} label="Konec" />
              <CtrlButton icon="rotate-cw" onClick={() => setFlipped((f) => !f)} label="Otočit desku" />
            </div>

            {/* Obtížnost + tah */}
            <p className="text-center font-body text-[13px] text-[var(--text-soft)] mb-3">
              Obtížnost:{" "}
              <span className="text-[var(--accent)]" aria-label={`obtížnost ${game.difficulty} z 5`}>
                {"★".repeat(game.difficulty)}
                <span className="text-[color:var(--text-muted)]/50">
                  {"★".repeat(5 - game.difficulty)}
                </span>
              </span>{" "}
              · Tah {gameIndex} / {gameMoves.length}
            </p>

            {/* Taby Téma / Tah / Konec */}
            <div className="rounded-[8px] border-[0.5px] border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <div className="flex border-b-[0.5px] border-[var(--border)]">
                {(
                  [
                    ["topic", "Téma"],
                    ["move", "Tah"],
                    ["result", "Konec"],
                  ] as Array<[GameTab, string]>
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setGameTab(id)}
                    className={
                      "flex-1 py-2.5 font-body text-sm transition-colors " +
                      (gameTab === id
                        ? "text-[var(--accent)] border-b-2 border-[var(--accent)] -mb-px font-semibold"
                        : "text-[var(--text-soft)] hover:text-[var(--text-strong)]")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div key={`${gameTab}-${gameIndex}`} className="p-3 fade-soft">
                {gameTab === "move" && currentGameMove && (
                  <div className="mb-2">
                    <MoveToken notation={currentGameMove.notation} />
                  </div>
                )}
                <p className="font-body text-[15px] leading-relaxed text-[var(--text-soft)]">
                  {gameTab === "topic"
                    ? game.description
                    : gameTab === "move"
                      ? currentGameMove
                        ? currentGameMove.comment
                        : "Stiskni „Vpřed“ a procházej partii tah po tahu."
                      : gameFinished
                        ? game.result
                        : "Dohraj partii až do konce a zobrazí se výsledek."}
                </p>
              </div>
            </div>

            {/* Footer partie */}
            <p className="text-center font-body text-[11px] text-[var(--text-muted)] mt-4">
              {game.title} · {game.topic}
            </p>
          </>
        )}

        </div>
        {/* /Obsah režimu */}

        {/* Footer — drobečková navigace */}
        {showBoard && variation && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <p className="text-center font-body text-[11px] text-[var(--text-muted)]">
              {opening.name} · {variation.name}
            </p>
            {savedResult && (savedResult.white.played || savedResult.black.played) && (
              <SideStars
                white={savedResult.white.stars}
                black={savedResult.black.stars}
                size={11}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
