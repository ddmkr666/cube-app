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

  return (
    <div className="trainer-display">
      <div className="trainer-display__header">
        <div className="trainer-display__meta">
          <div className="oll-display__phase">Algorithm Trainer · 2-Look PLL · {sectionLabel}</div>
          <div className="oll-display__name">{trainer.selectedCase.displayName}</div>
          <div className="oll-display__desc">{trainer.selectedCase.description}</div>
        </div>

        <div className={`trainer-badge trainer-badge--${trainer.feedback}`}>
          {statusLabel(trainer)}
        </div>
      </div>

      <div className="trainer-display__toolbar">
        <button className="secondary" onClick={trainer.retryCase}>Retry</button>
        <button className="secondary" onClick={trainer.nextCase}>Next</button>
        <button className="secondary" onClick={trainer.randomCase}>Random</button>
        <button className="secondary" onClick={trainer.toggleAlgorithm}>
          {trainer.shownAlgorithm ? "Hide Algorithm" : "Show Algorithm"}
        </button>
      </div>

      <div className="trainer-display__stats mono">
        <span>Section: {sectionLabel}</span>
        <span>Progress: {Math.min(sequence.currentIndex, trainer.algorithmMoves.length)} / {trainer.algorithmMoves.length}</span>
        <span>Mode: {trainer.strictMode ? "strict" : "lenient"}</span>
      </div>

      {trainer.alignmentMove && (
        <div className="scramble-display__hint">
          Align the top first: <strong>{trainer.alignmentMove}</strong>, so the case matches the teaching orientation.
        </div>
      )}

      {trainer.shownAlgorithm ? (
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
        <div className="trainer-display__hidden">Algorithm hidden. Try to recall it before turning.</div>
      )}

      {trainer.feedback === "ready" && (
        <div className="scramble-display__hint">
          Start turning on the smart cube. The trainer ignores the real cube state and only checks your move sequence.
        </div>
      )}

      {trainer.feedback === "in_progress" && trainer.nextExpectedMove && (
        <div className="scramble-display__hint">
          Expected next move: <strong>{trainer.nextExpectedMove}</strong>
        </div>
      )}

      {trainer.feedback === "incorrect" && sequence.errorCorrection && (
        <div className="scramble-display__correction">
          Wrong move - do <strong>{sequence.errorCorrection}</strong> to get back on track, or retry the case.
        </div>
      )}

      {trainer.feedback === "completed" && (
        <div className="scramble-display__done">
          Nice - algorithm completed. Continue with the next case or retry this one.
        </div>
      )}

      <div className="trainer-display__input">
        <div className="trainer-display__input-label">Live input</div>
        <div className="moves">
          {trainer.userMoves.length === 0 && <span className="facelets">No moves recorded yet.</span>}
          {trainer.userMoves.map((move, i) => (
            <span key={`${move}-${i}`} className="move mono">{move}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatPLLDisplayMoves(caseId: string, moves: string[]) {
  return moves.map((move, index) => ({
    move,
    index,
    prefix: caseId === "corners-headlights" && index === 0 ? "( " : "",
    suffix: caseId === "corners-headlights" && index === 3 ? " )" : "",
  }));
}
