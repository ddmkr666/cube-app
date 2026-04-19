import { useMemo } from "react";
import { OLLTestStatus } from "../hooks/useOLLTest";
import { formatTime } from "./TimerDisplay";

interface Props {
  test: OLLTestStatus;
}

export function OLLTestDisplay({ test }: Props) {
  const statusText = useMemo(() => {
    switch (test.phase) {
      case "finished":
        return "Solved";
      case "running":
        return "In Progress";
      default:
        return "Ready";
    }
  }, [test.phase]);

  const timerText = test.phase === "waiting"
    ? "Make a move to start"
    : formatTime(test.elapsed);

  return (
    <div className="trainer-display trainer-display--hud">
      <section className="trainer-hud__top">
        <div className="trainer-hud__top-copy">
          <div className="oll-display__phase">Test Mode - OLL to Solve</div>
          <div
            className={
              test.phase === "waiting"
                ? "trainer-hud__top-timer trainer-hud__top-timer--waiting"
                : `trainer-hud__top-timer trainer-hud__top-timer--${test.phase}`
            }
          >
            {timerText}
          </div>
        </div>
        <div className={`trainer-badge trainer-badge--${test.phase === "finished" ? "completed" : test.phase === "running" ? "in_progress" : "ready"}`}>
          {statusText}
        </div>
      </section>

      <section className="trainer-hud__side trainer-hud__side--left">
        <div className="trainer-hud__message trainer-hud__message--hint">
          A random OLL state is generated for each attempt. Solve the cube completely without being told the case. The timer starts on your first move and stops when the virtual cube is solved.
        </div>
      </section>

      <section className="trainer-hud__side trainer-hud__side--right">
        <div className="trainer-hud__actions">
          <button className="app__mode-button trainer-hud__action-button" onClick={test.retryCase}>Retry</button>
          <button className="app__mode-button trainer-hud__action-button" onClick={test.nextCase}>Next</button>
          <button className="app__mode-button trainer-hud__action-button" onClick={test.randomCase}>Random</button>
        </div>

        <div className="trainer-hud__panel">
          <div className="trainer-hud__label">Session</div>
          <div className="trainer-times__averages mono">
            <span>Last <strong>{test.recentTimes[0] != null ? formatTime(test.recentTimes[0]) : "--.--"}</strong></span>
            <span>ao5 <strong>{test.averageOf5 != null ? formatTime(test.averageOf5) : "--.--"}</strong></span>
            <span>ao12 <strong>{test.averageOf12 != null ? formatTime(test.averageOf12) : "--.--"}</strong></span>
          </div>
          {test.autoRetryCountdownMs != null && (
            <div className="trainer-times__countdown mono" style={{ marginTop: 10 }}>
              Next retry in <strong>{Math.ceil(test.autoRetryCountdownMs / 1000)}s</strong>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
