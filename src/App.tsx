import { useRef, useState } from "react";
import { useCubeConnection } from "./hooks/useCubeConnection";
import { useScramble } from "./hooks/useScramble";
import { useTimer } from "./hooks/useTimer";
import { useSolveTimes } from "./hooks/useSolveTimes";
import { useOLL } from "./hooks/useOLL";
import { useOLLTrainer } from "./hooks/useOLLTrainer";
import { usePLL } from "./hooks/usePLL";
import { usePLLTrainer } from "./hooks/usePLLTrainer";
import { CubeViewport } from "./render/CubeViewport";
import { ScramblePanel } from "./ui/ScramblePanel";
import { ScrambleDisplay } from "./ui/ScrambleDisplay";
import { OLLDisplay } from "./ui/OLLDisplay";
import { OLLTrainerDisplay } from "./ui/OLLTrainerDisplay";
import { PLLDisplay } from "./ui/PLLDisplay";
import { PLLTrainerDisplay } from "./ui/PLLTrainerDisplay";
import { TimerDisplay } from "./ui/TimerDisplay";
import { HistoryPanel } from "./ui/HistoryPanel";
import { DebugPanel } from "./ui/DebugPanel";
import { TrainerPanel } from "./ui/TrainerPanel";
import { RawQuaternion } from "./bluetooth/ganCube";

export function App() {
  const [mode, setMode] = useState<"solve" | "trainer">("solve");
  const [trainerType, setTrainerType] = useState<"oll" | "pll">("oll");
  const trainerGyroResetRef = useRef<RawQuaternion | null>(null);
  const cube = useCubeConnection();
  const trainerActive = mode === "trainer";
  const helperMoveHistory = trainerActive ? [] : cube.moveHistory;
  const helperFacelets = trainerActive ? null : cube.facelets;
  const helperLastMove = trainerActive ? null : cube.lastMove;
  const helperSolved = trainerActive ? false : cube.solved;

  const scramble = useScramble(helperMoveHistory);
  const { times, addTime, clearAll, exportCSV } = useSolveTimes();
  const timer = useTimer(scramble.state, helperLastMove, helperSolved, addTime);
  const oll = useOLL(helperFacelets, helperMoveHistory);
  const pll = usePLL(helperFacelets, helperMoveHistory);
  const ollTrainer = useOLLTrainer(cube.moveHistory, cube.gyroCurrentRef, trainerGyroResetRef);
  const trainer = usePLLTrainer(cube.moveHistory, cube.gyroCurrentRef, trainerGyroResetRef);
  const connected = cube.status.state === "connected";
  const connecting = cube.status.state === "connecting";
  const bluetoothSupported = typeof navigator !== "undefined" && "bluetooth" in navigator;

  // Show scramble sequence only while actively scrambling (not after it's done)
  const showScramble = scramble.state === "scrambling"
    || scramble.state === "half-turn"
    || scramble.state === "error";

  // Show timer once scramble is done, until a new scramble is started
  const showTimer = timer.phase !== "idle";

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
            onClick={cube.resetGyro}
            disabled={!connected}
            title="Hold the cube white-side up, green facing you, then click to sync the 3D orientation."
          >
            Reset Gyro
          </button>
          <button
            type="button"
            className="app__mode-button"
            onClick={cube.markSolved}
            disabled={!connected}
            title="Physically solve the cube, then click to re-sync the app."
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
            onResetGyro={() => {
              if (cube.gyroCurrentRef.current) {
                trainerGyroResetRef.current = { ...cube.gyroCurrentRef.current };
              }
            }}
            pllTrainer={trainer}
            ollTrainer={ollTrainer}
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
        ) : (
          <div className="app__viewport">
            <CubeViewport
              facelets={cube.facelets}
              lastMove={cube.lastMove}
              gyroCurrentRef={cube.gyroCurrentRef}
              gyroResetRef={cube.gyroResetRef}
            />
            <div className="app__overlay-stack">
              {showScramble && <ScrambleDisplay scramble={scramble} />}
              {!showScramble && pll.active && <PLLDisplay pll={pll} />}
              {!showScramble && !pll.active && oll.active && <OLLDisplay oll={oll} />}
              {showTimer && <TimerDisplay phase={timer.phase} elapsed={timer.elapsed} />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
