import { PLLTrainerStatus } from "../hooks/usePLLTrainer";

interface Props {
  trainer: PLLTrainerStatus;
}

function statusLabel(trainer: PLLTrainerStatus): string {
  switch (trainer.feedback) {
    case "completed":
      return "Completed";
    case "incorrect":
      return "Incorrect move";
    case "in_progress":
      return "In progress";
    default:
      return "Ready";
  }
}

export function PLLTrainerDisplay({ trainer }: Props) {
  const { sequence } = trainer;
  const sectionLabel = trainer.section === "part1" ? "PLL Part 1" : "PLL Part 2";
  const isTestMode = trainer.mode === "test";

  return (
    <div className="trainer-display">
      <div className="trainer-display__header">
        <div className="trainer-display__meta">
          <div className="oll-display__phase">Algorithm Trainer · 2-Look PLL · {sectionLabel} · {isTestMode ? "Test" : "Learn"}</div>
          <div className="oll-display__name">{isTestMode ? "Recognition Test" : trainer.selectedCase.displayName}</div>
          <div className="oll-display__desc">
            {isTestMode
              ? "Identify the case from the cube state and execute the correct algorithm from memory."
              : trainer.selectedCase.description}
          </div>
        </div>

        <div className={`trainer-badge trainer-badge--${trainer.feedback}`}>
          {statusLabel(trainer)}
        </div>
      </div>

      <div className="trainer-display__toolbar">
        <button className="secondary" onClick={trainer.retryCase}>Retry</button>
        <button className="secondary" onClick={trainer.nextCase}>Next</button>
        <button className="secondary" onClick={trainer.randomCase}>Random</button>
        {trainer.revealAllowed && (
          <button className="secondary" onClick={trainer.toggleAlgorithm}>
            {trainer.shownAlgorithm ? "Hide Algorithm" : "Show Algorithm"}
          </button>
        )}
      </div>

      {trainer.revealAllowed && trainer.shownAlgorithm ? (
        <div className="oll-display__moves">
          {formatPLLDisplayMoves(trainer.selectedCase.id, trainer.algorithmMoves).map(({ move, index, prefix, suffix }) => {
            let cls = "scramble-move";
            if (sequence.state === "done" || index < sequence.currentIndex) cls += " scramble-move--done";
            else if (index === sequence.currentIndex) {
              if (sequence.state === "error") cls += " scramble-move--error";
              else if (sequence.state === "half-turn") cls += " scramble-move--half";
              else cls += " scramble-move--current";
            } else {
              cls += " scramble-move--upcoming";
            }
            return <span key={`${move}-${index}`} className={cls}>{prefix}{move}{suffix}</span>;
          })}
        </div>
      ) : (
        <div className="trainer-display__hidden">
          {isTestMode
            ? "Algorithm hidden. Recognize the case from the cube and solve it from memory."
            : "Algorithm hidden. Try to recall it before turning."}
        </div>
      )}

      {trainer.feedback === "ready" && (
        <div className="scramble-display__hint">
          {isTestMode
            ? "Study the cube, identify the case, and start when ready."
            : "Start turning on the smart cube. The trainer ignores the real cube state and only checks your move sequence."}
        </div>
      )}

      {!isTestMode && trainer.feedback === "in_progress" && trainer.nextExpectedMove && (
        <div className="scramble-display__hint">
          Expected next move: <strong>{trainer.nextExpectedMove}</strong>
        </div>
      )}

      {trainer.feedback === "incorrect" && sequence.errorCorrection && (
        <div className="scramble-display__correction">
          Wrong move - do <strong>{sequence.errorCorrection}</strong> to get back on track, or retry the case.
        </div>
      )}

      {trainer.recentTimes.length > 0 && (
        <div className="trainer-times__recent trainer-times__recent--inline">
          <span className="trainer-times__recent-label">Recent</span>
          <div className="moves">
            {trainer.recentTimes.map((time, index) => (
              <span key={`${time}-${index}`} className="move mono">{formatElapsed(time)}</span>
            ))}
          </div>
          <div className="trainer-times__averages mono">
            <span>ao5 <strong>{formatElapsed(trainer.averageOf5)}</strong></span>
            <span>ao25 <strong>{formatElapsed(trainer.averageOf25)}</strong></span>
            <span>ao50 <strong>{formatElapsed(trainer.averageOf50)}</strong></span>
          </div>
          {trainer.autoRetryCountdownMs != null && (
            <div className="trainer-times__countdown mono">
              Next retry in <strong>{formatCountdown(trainer.autoRetryCountdownMs)}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatElapsed(elapsed: number | null): string {
  if (elapsed == null) return "--";
  return `${(elapsed / 1000).toFixed(2)}s`;
}

function formatCountdown(elapsed: number): string {
  return `${(elapsed / 1000).toFixed(1)}s`;
}

function formatPLLDisplayMoves(caseId: string, moves: string[]) {
  const prefixMap: Record<number, string> = {};
  const suffixMap: Record<number, string> = {};

  if (caseId === "corners-headlights") {
    prefixMap[0] = "( ";
    suffixMap[3] = " )";
  }

  if (caseId === "corners-no-headlights") {
    prefixMap[9] = "( ";
    suffixMap[12] = " )";
    prefixMap[13] = "( ";
    suffixMap[16] = " )";
  }

  return moves.map((move, index) => ({
    move,
    index,
    prefix: prefixMap[index] ?? "",
    suffix: suffixMap[index] ?? "",
  }));
}
