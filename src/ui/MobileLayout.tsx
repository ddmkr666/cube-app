import { useState } from "react";
import { CubeViewport } from "../render/CubeViewport";
import { ScrambleDisplay } from "./ScrambleDisplay";
import { TimerDisplay } from "./TimerDisplay";
import { ScramblePanel } from "./ScramblePanel";
import { HistoryPanel } from "./HistoryPanel";
import { TrainerPanel } from "./TrainerPanel";
import { TestPanel } from "./TestPanel";
import { MobileOLLTrainerDisplay, MobilePLLTrainerDisplay, MobileOLLTestDisplay } from "./MobileTrainerDisplay";
import { formatTime } from "./TimerDisplay";
import { LayoutProps } from "./DesktopLayout";

function ao5(times: LayoutProps["times"]): number | null {
  if (times.length < 5) return null;
  const slice = times.slice(-5).map(t => t.elapsed).sort((a, b) => a - b);
  return slice.slice(1, -1).reduce((s, v) => s + v, 0) / 3;
}

export function MobileLayout({
  mode, setMode,
  trainerType, setTrainerType,
  cube, trainerGyroResetRef,
  ollTrainer, trainer, ollTest,
  scramble, timer,
  times, clearAll, exportCSV,
  testTimes,
  gyroCorrectionRef, resetGyroCoreCorrection,
}: LayoutProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const trainerActive = mode === "trainer";
  const testActive = mode === "test";
  const connected = cube.status.state === "connected";
  const connecting = cube.status.state === "connecting";
  const bluetoothSupported = typeof navigator !== "undefined" && "bluetooth" in navigator;
  const showScramble = scramble.state === "scrambling"
    || scramble.state === "half-turn"
    || scramble.state === "error";
  const showTimer = timer.phase !== "idle";

  const onResetTrainerGyro = () => {
    if (cube.gyroCurrentRef.current) {
      trainerGyroResetRef.current = { ...cube.gyroCurrentRef.current };
    }
  };

  const handleModeChange = (m: "solve" | "trainer" | "test") => {
    setMode(m);
    setSheetOpen(false);
  };

  return (
    <div className="mobile-app">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="mobile-header">
        <div className="mobile-header__brand">
          <div className="app__logo" aria-hidden="true">
            <span className="app__logo-segment app__logo-segment--blue" />
            <span className="app__logo-segment app__logo-segment--green" />
            <span className="app__logo-segment app__logo-segment--red" />
            <span className="app__logo-segment app__logo-segment--yellow" />
            <span className="app__logo-core" />
          </div>
        </div>
        <div className="mobile-header__actions">
          <button
            type="button"
            className="mobile-header__action-btn"
            onClick={() => { cube.resetGyro(); resetGyroCoreCorrection(); }}
            disabled={!connected}
            title="Reset gyro orientation"
            aria-label="Reset gyro"
          >
            ↺ Gyro
          </button>
          <button
            type="button"
            className="mobile-header__action-btn"
            onClick={cube.markSolved}
            title="Reset virtual cube to solved"
            aria-label="Reset cube"
          >
            ◻ Cube
          </button>
          <button
            type="button"
            className={connected
              ? "mobile-header__connect-btn mobile-header__connect-btn--connected"
              : "mobile-header__connect-btn"}
            onClick={cube.connect}
            disabled={!bluetoothSupported || connecting || connected}
          >
            <span className={`mobile-connect-dot mobile-connect-dot--${cube.status.state}`} />
            {connecting ? "Connecting…" : connected ? "Connected" : "Connect"}
          </button>
        </div>
      </header>

      {/* ── Status bar (errors / bluetooth unavailable) ────── */}
      {!bluetoothSupported && (
        <div className="mobile-status-bar mobile-status-bar--warn">
          Bluetooth unavailable — page must be opened at <strong>localhost</strong>, not a local IP.
        </div>
      )}
      {bluetoothSupported && cube.status.state === "error" && (
        <div className="mobile-status-bar mobile-status-bar--err">
          {cube.status.message}
        </div>
      )}

      {/* ── Canvas (fills remaining space) ─────────────────── */}
      <main className="mobile-main">
        {trainerActive ? (
          <div className="mobile-trainer-layout">
            <div className="mobile-trainer-canvas">
              <CubeViewport
                facelets={trainerType === "oll" ? ollTrainer.virtualFacelets : trainer.virtualFacelets}
                gyroCurrentRef={cube.gyroCurrentRef}
                gyroResetRef={trainerGyroResetRef}
                gyroFrame="yellow-top"
              />
            </div>
            <div className="mobile-trainer-strip">
              {trainerType === "oll"
                ? <MobileOLLTrainerDisplay trainer={ollTrainer} onResetGyro={onResetTrainerGyro} />
                : <MobilePLLTrainerDisplay trainer={trainer} onResetGyro={onResetTrainerGyro} />}
            </div>
          </div>
        ) : testActive ? (
          <div className="mobile-trainer-layout">
            <div className="mobile-trainer-canvas">
              <CubeViewport
                facelets={ollTest.virtualFacelets}
                gyroCurrentRef={cube.gyroCurrentRef}
                gyroResetRef={trainerGyroResetRef}
                gyroFrame="yellow-top"
              />
            </div>
            <div className="mobile-trainer-strip">
              <MobileOLLTestDisplay test={ollTest} onResetGyro={onResetTrainerGyro} />
            </div>
          </div>
        ) : (
          <div className="mobile-viewport">
            <CubeViewport
              facelets={cube.facelets}
              gyroCurrentRef={cube.gyroCurrentRef}
              gyroResetRef={cube.gyroResetRef}
              gyroCorrectionRef={gyroCorrectionRef}
            />
            <div className="app__overlay-stack">
              {showScramble && <ScrambleDisplay scramble={scramble} />}
              {showTimer && <TimerDisplay phase={timer.phase} elapsed={timer.elapsed} />}
            </div>
          </div>
        )}
      </main>

      {/* ── Solve strip (solve mode only) ──────────────────── */}
      {!trainerActive && !testActive && (
        <div className="mobile-solve-strip">
          <div className="mobile-solve-strip__scramble">
            {!connected ? (
              <span className="mobile-solve-strip__hint">Connect cube to scramble</span>
            ) : scramble.state === "idle" ? (
              cube.solved
                ? <button className="mobile-solve-strip__btn" onClick={scramble.generate}>New Scramble</button>
                : <span className="mobile-solve-strip__hint">Solve the cube first</span>
            ) : scramble.state === "done" ? (
              <button className="mobile-solve-strip__btn" onClick={scramble.generate}>New Scramble</button>
            ) : (
              <>
                <span className="mobile-solve-strip__hint mono">
                  {scramble.currentIndex + 1} / {scramble.moves.length}
                </span>
                <button className="mobile-solve-strip__btn mobile-solve-strip__btn--secondary" onClick={scramble.clear}>
                  Abort
                </button>
              </>
            )}
          </div>
          <div className="mobile-solve-strip__stats mono">
            {times.length > 0 && (
              <>
                <span>
                  <span className="mobile-solve-strip__stat-label">Last </span>
                  <strong>{formatTime(times[times.length - 1].elapsed)}</strong>
                </span>
                {ao5(times) !== null && (
                  <span>
                    <span className="mobile-solve-strip__stat-label">ao5 </span>
                    <strong>{formatTime(ao5(times)!)}</strong>
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom nav ─────────────────────────────────────── */}
      <nav className="mobile-nav" aria-label="App mode">
        <button
          type="button"
          className={mode === "solve" ? "mobile-nav__tab mobile-nav__tab--active" : "mobile-nav__tab"}
          onClick={() => handleModeChange("solve")}
          aria-pressed={mode === "solve"}
        >
          Solve
        </button>
        <button
          type="button"
          className={mode === "trainer" ? "mobile-nav__tab mobile-nav__tab--active" : "mobile-nav__tab"}
          onClick={() => handleModeChange("trainer")}
          aria-pressed={mode === "trainer"}
        >
          Train
        </button>
        <button
          type="button"
          className={mode === "test" ? "mobile-nav__tab mobile-nav__tab--active" : "mobile-nav__tab"}
          onClick={() => handleModeChange("test")}
          aria-pressed={mode === "test"}
        >
          Test
        </button>
        <button
          type="button"
          className="mobile-nav__sheet-btn"
          onClick={() => setSheetOpen(true)}
          aria-label="Open panels"
        >
          ↑ Info
        </button>
      </nav>

      {/* ── Bottom sheet backdrop ───────────────────────────── */}
      {sheetOpen && (
        <div
          className="mobile-sheet-backdrop"
          onClick={() => setSheetOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Bottom sheet ────────────────────────────────────── */}
      <div
        className={sheetOpen ? "mobile-sheet mobile-sheet--open" : "mobile-sheet"}
        role="dialog"
        aria-modal="true"
        aria-label="Panels"
      >
        <button
          className="mobile-sheet__handle"
          onClick={() => setSheetOpen(false)}
          aria-label="Close panels"
        >
          <span className="mobile-sheet__handle-bar" />
        </button>
        <div className="mobile-sheet__content">
          {trainerActive ? (
            <TrainerPanel
              trainerType={trainerType}
              onTrainerTypeChange={setTrainerType}
              onResetGyro={onResetTrainerGyro}
              pllTrainer={trainer}
              ollTrainer={ollTrainer}
            />
          ) : testActive ? (
            <TestPanel
              test={ollTest}
              onResetGyro={onResetTrainerGyro}
              times={testTimes.times}
              onClear={testTimes.clearAll}
              onExport={testTimes.exportCSV}
            />
          ) : (
            <>
              <ScramblePanel scramble={scramble} solved={cube.solved} connected={connected} />
              <HistoryPanel times={times} onClear={clearAll} onExport={exportCSV} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
