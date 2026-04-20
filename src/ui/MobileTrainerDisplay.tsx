import { OLLTrainerStatus } from "../hooks/useOLLTrainer";
import { PLLTrainerStatus } from "../hooks/usePLLTrainer";
import { OLLTestStatus } from "../hooks/useOLLTest";
import { OLLPatternImage } from "./OLLPatternImage";
import { formatTime } from "./TimerDisplay";

function formatElapsed(ms: number | null): string {
  if (ms == null) return "--";
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatCountdown(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

// ── OLL Trainer ──────────────────────────────────────────────────────

function ollStatusLabel(feedback: OLLTrainerStatus["feedback"]): string {
  switch (feedback) {
    case "completed":  return "Solved";
    case "incorrect":  return "Wrong move";
    case "in_progress": return "In progress";
    default:           return "Ready";
  }
}

export function MobileOLLTrainerDisplay({ trainer, onResetGyro }: { trainer: OLLTrainerStatus; onResetGyro: () => void }) {
  return (
    <div className="mobile-trainer-strip__inner">
      <div className="mobile-trainer-strip__case-row">
        <OLLPatternImage
          corners={trainer.selectedCase.targetCornerState}
          edges={trainer.selectedCase.targetEdgeState}
          size={72}
        />
        <div className="mobile-trainer-strip__case-info">
          <div className="mobile-trainer-strip__case-name">{trainer.selectedCase.displayName}</div>
          <div className="mobile-trainer-strip__algo mono">
            {trainer.shownAlgorithm ? trainer.algorithmMoves.join(" ") : "Algorithm hidden"}
          </div>
        </div>
        <div className={`trainer-badge trainer-badge--${trainer.feedback}`}>
          {ollStatusLabel(trainer.feedback)}
        </div>
      </div>

      <div className="mobile-trainer-strip__actions">
        <button className="app__mode-button mobile-trainer-strip__action-btn" onClick={trainer.retryCase}>Retry</button>
        <button className="app__mode-button mobile-trainer-strip__action-btn" onClick={trainer.nextCase}>Next</button>
        <button className="app__mode-button mobile-trainer-strip__action-btn" onClick={trainer.randomCase}>Random</button>
        <button className="app__mode-button mobile-trainer-strip__action-btn" onClick={trainer.toggleAlgorithm}>
          {trainer.shownAlgorithm ? "Hide Algo" : "Show Algo"}
        </button>
        <button className="app__mode-button mobile-trainer-strip__action-btn mobile-trainer-strip__action-btn" onClick={onResetGyro}>
          ↺ Reset Gyro
        </button>
      </div>

      {trainer.recentTimes.length > 0 && (
        <div className="mobile-trainer-strip__stats mono">
          <span>ao5 <strong>{formatElapsed(trainer.averageOf5)}</strong></span>
          <span>ao25 <strong>{formatElapsed(trainer.averageOf25)}</strong></span>
          <span>ao50 <strong>{formatElapsed(trainer.averageOf50)}</strong></span>
          {trainer.autoRetryCountdownMs != null && (
            <span className="mobile-trainer-strip__countdown">
              next in <strong>{formatCountdown(trainer.autoRetryCountdownMs)}</strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── PLL Trainer ──────────────────────────────────────────────────────

function pllStatusLabel(feedback: PLLTrainerStatus["feedback"]): string {
  switch (feedback) {
    case "completed":   return "Solved";
    case "incorrect":   return "Wrong move";
    case "in_progress": return "In progress";
    default:            return "Ready";
  }
}

export function MobilePLLTrainerDisplay({ trainer, onResetGyro }: { trainer: PLLTrainerStatus; onResetGyro: () => void }) {
  return (
    <div className="mobile-trainer-strip__inner">
      <div className="mobile-trainer-strip__case-row mobile-trainer-strip__case-row--no-image">
        <div className="mobile-trainer-strip__case-info">
          <div className="mobile-trainer-strip__case-name">{trainer.selectedCase.displayName}</div>
          <div className="mobile-trainer-strip__case-desc">{trainer.selectedCase.description}</div>
          <div className="mobile-trainer-strip__algo mono">
            {trainer.shownAlgorithm ? trainer.algorithmMoves.join(" ") : "Algorithm hidden"}
          </div>
        </div>
        <div className={`trainer-badge trainer-badge--${trainer.feedback}`}>
          {pllStatusLabel(trainer.feedback)}
        </div>
      </div>

      <div className="mobile-trainer-strip__actions">
        <button className="app__mode-button mobile-trainer-strip__action-btn" onClick={trainer.retryCase}>Retry</button>
        <button className="app__mode-button mobile-trainer-strip__action-btn" onClick={trainer.nextCase}>Next</button>
        <button className="app__mode-button mobile-trainer-strip__action-btn" onClick={trainer.randomCase}>Random</button>
        <button className="app__mode-button mobile-trainer-strip__action-btn" onClick={trainer.toggleAlgorithm}>
          {trainer.shownAlgorithm ? "Hide Algo" : "Show Algo"}
        </button>
        <button className="app__mode-button mobile-trainer-strip__action-btn mobile-trainer-strip__action-btn" onClick={onResetGyro}>
          ↺ Reset Gyro
        </button>
      </div>

      {trainer.recentTimes.length > 0 && (
        <div className="mobile-trainer-strip__stats mono">
          <span>ao5 <strong>{formatElapsed(trainer.averageOf5)}</strong></span>
          <span>ao25 <strong>{formatElapsed(trainer.averageOf25)}</strong></span>
          <span>ao50 <strong>{formatElapsed(trainer.averageOf50)}</strong></span>
          {trainer.autoRetryCountdownMs != null && (
            <span className="mobile-trainer-strip__countdown">
              next in <strong>{formatCountdown(trainer.autoRetryCountdownMs)}</strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── OLL Test ─────────────────────────────────────────────────────────

export function MobileOLLTestDisplay({ test, onResetGyro }: { test: OLLTestStatus; onResetGyro: () => void }) {
  const timerText = test.phase === "waiting"
    ? "Make a move to start"
    : formatTime(test.elapsed);

  const badgeClass = test.phase === "finished" ? "completed"
    : test.phase === "running" ? "in_progress"
    : "ready";

  const badgeLabel = test.phase === "finished" ? "Solved"
    : test.phase === "running" ? "In progress"
    : "Ready";

  return (
    <div className="mobile-trainer-strip__inner">
      <div className="mobile-trainer-strip__test-row">
        <div className={test.phase === "waiting"
          ? "mobile-trainer-strip__test-waiting"
          : "mobile-trainer-strip__test-timer mono"}
        >
          {timerText}
        </div>
        <div className={`trainer-badge trainer-badge--${badgeClass}`}>
          {badgeLabel}
        </div>
      </div>

      <div className="mobile-trainer-strip__actions">
        <button className="app__mode-button mobile-trainer-strip__action-btn" onClick={test.retryCase}>Retry</button>
        <button className="app__mode-button mobile-trainer-strip__action-btn" onClick={test.nextCase}>Next</button>
        <button className="app__mode-button mobile-trainer-strip__action-btn" onClick={test.randomCase}>Random</button>
        <button className="app__mode-button mobile-trainer-strip__action-btn mobile-trainer-strip__action-btn" onClick={onResetGyro}>
          ↺ Reset Gyro
        </button>
      </div>

      {test.recentTimes.length > 0 && (
        <div className="mobile-trainer-strip__stats mono">
          <span>Last <strong>{test.recentTimes[0] != null ? formatTime(test.recentTimes[0]) : "--"}</strong></span>
          <span>ao5 <strong>{test.averageOf5 != null ? formatTime(test.averageOf5) : "--"}</strong></span>
          <span>ao12 <strong>{test.averageOf12 != null ? formatTime(test.averageOf12) : "--"}</strong></span>
          {test.autoRetryCountdownMs != null && (
            <span className="mobile-trainer-strip__countdown">
              next in <strong>{Math.ceil(test.autoRetryCountdownMs / 1000)}s</strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
