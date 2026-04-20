import * as THREE from "three";
import { CubeConnectionState } from "../hooks/useCubeConnection";
import { OLLTrainerStatus } from "../hooks/useOLLTrainer";
import { PLLTrainerStatus } from "../hooks/usePLLTrainer";
import { OLLTestStatus } from "../hooks/useOLLTest";
import { ScrambleStatus } from "../hooks/useScramble";
import { TimerStatus } from "../hooks/useTimer";
import { SolveRecord } from "../hooks/useSolveTimes";
import { RawQuaternion } from "../bluetooth/ganCube";
import { CubeViewport } from "../render/CubeViewport";
import { ScramblePanel } from "./ScramblePanel";
import { ScrambleDisplay } from "./ScrambleDisplay";
import { OLLTrainerDisplay } from "./OLLTrainerDisplay";
import { OLLTestDisplay } from "./OLLTestDisplay";
import { PLLTrainerDisplay } from "./PLLTrainerDisplay";
import { TimerDisplay } from "./TimerDisplay";
import { HistoryPanel } from "./HistoryPanel";
import { DebugPanel } from "./DebugPanel";
import { TrainerPanel } from "./TrainerPanel";
import { TestPanel } from "./TestPanel";

export interface LayoutProps {
  mode: "solve" | "trainer" | "test";
  setMode: (m: "solve" | "trainer" | "test") => void;
  trainerType: "oll" | "pll";
  setTrainerType: (t: "oll" | "pll") => void;
  cube: CubeConnectionState;
  trainerGyroResetRef: React.MutableRefObject<RawQuaternion | null>;
  ollTrainer: OLLTrainerStatus;
  trainer: PLLTrainerStatus;
  ollTest: OLLTestStatus;
  scramble: ScrambleStatus;
  timer: TimerStatus;
  times: SolveRecord[];
  clearAll: () => void;
  exportCSV: (times: SolveRecord[]) => void;
  testTimes: { times: SolveRecord[]; clearAll: () => void; exportCSV: (times: SolveRecord[]) => void };
  gyroCorrectionRef: React.MutableRefObject<THREE.Quaternion>;
  resetGyroCoreCorrection: () => void;
}

export function DesktopLayout({
  mode, setMode,
  trainerType, setTrainerType,
  cube, trainerGyroResetRef,
  ollTrainer, trainer, ollTest,
  scramble, timer,
  times, clearAll, exportCSV,
  testTimes,
  gyroCorrectionRef, resetGyroCoreCorrection,
}: LayoutProps) {
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

  return (
    <div className="app">
      <header className="app__header" aria-label="Cube app header">
        <div className="app__header-brand">
          <div className="app__logo" aria-hidden="true">
            <span className="app__logo-segment app__logo-segment--blue" />
            <span className="app__logo-segment app__logo-segment--green" />
            <span className="app__logo-segment app__logo-segment--red" />
            <span className="app__logo-segment app__logo-segment--yellow" />
            <span className="app__logo-core" />
          </div>
          <div className="app__mode-switch" role="tablist" aria-label="App mode">
            <button
              type="button"
              className={mode === "solve" ? "app__mode-button app__mode-button--active" : "app__mode-button"}
              onClick={() => setMode("solve")}
              aria-pressed={mode === "solve"}
            >
              Solve
            </button>
            <button
              type="button"
              className={mode === "trainer" ? "app__mode-button app__mode-button--active" : "app__mode-button"}
              onClick={() => setMode("trainer")}
              aria-pressed={mode === "trainer"}
            >
              Train
            </button>
            <button
              type="button"
              className={mode === "test" ? "app__mode-button app__mode-button--active" : "app__mode-button"}
              onClick={() => setMode("test")}
              aria-pressed={mode === "test"}
            >
              Test
            </button>
          </div>
        </div>
        <div className="app__header-actions">
          <button
            type="button"
            className={connected ? "app__mode-button app__mode-button--active" : "app__mode-button"}
            onClick={cube.connect}
            disabled={!bluetoothSupported || connecting || connected}
          >
            {connecting ? "Connecting..." : connected ? "Connected" : "Connect"}
          </button>
          <button
            type="button"
            className="app__mode-button"
            onClick={() => { cube.resetGyro(); resetGyroCoreCorrection(); }}
            disabled={!connected}
            title="Hold the cube white-side up, green facing you, then click to sync the 3D orientation."
          >
            Reset Gyro
          </button>
          <button
            type="button"
            className="app__mode-button"
            onClick={cube.markSolved}
            title="Click to reset the virtual cube to solved. If a cube is connected, also syncs the hardware."
          >
            Reset Cube
          </button>
        </div>
      </header>
      <aside className="app__side">
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
        <DebugPanel
          facelets={cube.facelets}
          lastMove={cube.lastMove}
          moveHistory={cube.moveHistory}
        />
      </aside>
      <main className="app__main">
        {trainerActive ? (
          <div className="app__viewport">
            <CubeViewport
              facelets={trainerType === "oll" ? ollTrainer.virtualFacelets : trainer.virtualFacelets}
              gyroCurrentRef={cube.gyroCurrentRef}
              gyroResetRef={trainerGyroResetRef}
              gyroFrame="yellow-top"
            />
            <div className="app__overlay-stack app__overlay-stack--trainer">
              {trainerType === "oll"
                ? <OLLTrainerDisplay trainer={ollTrainer} />
                : <PLLTrainerDisplay trainer={trainer} />}
            </div>
          </div>
        ) : testActive ? (
          <div className="app__viewport">
            <CubeViewport
              facelets={ollTest.virtualFacelets}
              gyroCurrentRef={cube.gyroCurrentRef}
              gyroResetRef={trainerGyroResetRef}
              gyroFrame="yellow-top"
            />
            <div className="app__overlay-stack app__overlay-stack--trainer">
              <OLLTestDisplay test={ollTest} />
            </div>
          </div>
        ) : (
          <div className="app__viewport">
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
    </div>
  );
}
