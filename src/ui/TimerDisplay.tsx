import { TimerPhase } from "../hooks/useTimer";

interface Props {
  phase: TimerPhase;
  elapsed: number;
}

/** Format ms → M:SS.cc or SS.cc */
export function formatTime(ms: number): string {
  const cs = Math.floor(ms / 10);
  const mins = Math.floor(cs / 6000);
  const secs = Math.floor((cs % 6000) / 100);
  const cents = cs % 100;
  if (mins > 0) {
    return `${mins}:${String(secs).padStart(2, "0")}.${String(cents).padStart(2, "0")}`;
  }
  return `${secs}.${String(cents).padStart(2, "0")}`;
}

export function TimerDisplay({ phase, elapsed }: Props) {
  if (phase === "idle") return null;

  const timeStr = formatTime(elapsed);

  return (
    <div className="timer-display">
      {phase === "waiting" && (
        <div className="timer-display__waiting">
          Make a move to start
        </div>
      )}
      {(phase === "running" || phase === "finished") && (
        <div className={`timer-display__time timer-display__time--${phase}`}>
          {timeStr}
        </div>
      )}
    </div>
  );
}
