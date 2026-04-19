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
  const topBarText = trainer.shownAlgorithm
    ? trainer.algorithmMoves.join(" ")
    : "Algorithm Hidden";

  return (
    <div className="trainer-display trainer-display--hud">
      <section className="trainer-hud__top">
        <div className="trainer-hud__top-copy">
          <div className="oll-display__phase">Algorithm Trainer - 2-Look PLL - Learn</div>
          <div className="trainer-hud__top-algorithm mono">{topBarText}</div>
        </div>
        <div className={`trainer-badge trainer-badge--${trainer.feedback}`}>
          {statusLabel(trainer)}
        </div>
      </section>

      <section className="trainer-hud__side trainer-hud__side--left">
        <div className="trainer-hud__panel">
          <div className="trainer-hud__label">Case</div>
          <div className="trainer-hud__case-name">{trainer.selectedCase.displayName}</div>
          <div className="trainer-hud__body-copy">{trainer.selectedCase.description}</div>
        </div>

        {trainer.feedback === "ready" && (
          <div className="trainer-hud__message trainer-hud__message--hint">
            Start from the shown PLL case and solve the cube normally. The attempt completes when the virtual cube is solved.
          </div>
        )}

        {trainer.feedback === "in_progress" && (
          <div className="trainer-hud__message trainer-hud__message--hint">
            Keep going until the cube is fully solved.
          </div>
        )}
      </section>

      <section className="trainer-hud__side trainer-hud__side--right">
        <div className="trainer-hud__actions">
          <button className="app__mode-button trainer-hud__action-button" onClick={trainer.retryCase}>Retry</button>
          <button className="app__mode-button trainer-hud__action-button" onClick={trainer.nextCase}>Next</button>
          <button className="app__mode-button trainer-hud__action-button" onClick={trainer.randomCase}>Random</button>
          <button className="app__mode-button trainer-hud__action-button" onClick={trainer.toggleAlgorithm}>
            {trainer.shownAlgorithm ? "Hide Algorithm" : "Show Algorithm"}
          </button>
        </div>

        {trainer.recentTimes.length > 0 && (
          <div className="trainer-hud__panel">
            <div className="trainer-hud__label">Recent</div>
            <div className="moves trainer-hud__times">
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
      </section>
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
