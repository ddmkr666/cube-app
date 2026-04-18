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
import { ConnectPanel } from "./ui/ConnectPanel";
import { ScramblePanel } from "./ui/ScramblePanel";
import { ScrambleDisplay } from "./ui/ScrambleDisplay";
import { OLLDisplay } from "./ui/OLLDisplay";
import { OLLTrainerDisplay } from "./ui/OLLTrainerDisplay";
import { PLLDisplay } from "./ui/PLLDisplay";
import { PLLTrainerDisplay } from "./ui/PLLTrainerDisplay";
import { TimerDisplay } from "./ui/TimerDisplay";
import { HistoryPanel } from "./ui/HistoryPanel";
import { DebugPanel } from "./ui/DebugPanel";
import { StatusPanel } from "./ui/StatusPanel";
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

  // Show scramble sequence only while actively scrambling (not after it's done)
  const showScramble = scramble.state === "scrambling"
    || scramble.state === "half-turn"
    || scramble.state === "error";

  // Show timer once scramble is done, until a new scramble is started
  const showTimer = timer.phase !== "idle";

  return (
    <div className="app">
      <header className="app__header">Cube App · GAN 356 i3</header>
      <aside className="app__side">
        <ConnectPanel
          status={cube.status}
          onConnect={cube.connect}
          onDisconnect={cube.disconnect}
          onRequestState={cube.requestFacelets}
          onMarkSolved={cube.markSolved}
          onResetGyro={cube.resetGyro}
        />
        <TrainerPanel
          active={trainerActive}
          trainerType={trainerType}
          onActivate={() => setMode("trainer")}
          onDeactivate={() => setMode("solve")}
          onTrainerTypeChange={setTrainerType}
          onResetGyro={() => {
            if (cube.gyroCurrentRef.current) {
              trainerGyroResetRef.current = { ...cube.gyroCurrentRef.current };
            }
          }}
          pllTrainer={trainer}
          ollTrainer={ollTrainer}
        />
        {!trainerActive && <ScramblePanel scramble={scramble} solved={cube.solved} connected={connected} />}
        <StatusPanel status={cube.status} solved={cube.solved} />
        <HistoryPanel times={times} onClear={clearAll} onExport={exportCSV} />
        <DebugPanel
          facelets={cube.facelets}
          lastMove={cube.lastMove}
          moveHistory={cube.moveHistory}
        />
      </aside>
      <main className="app__main">
        {trainerActive ? (
          <>
            {trainerType === "oll"
              ? <OLLTrainerDisplay trainer={ollTrainer} />
              : <PLLTrainerDisplay trainer={trainer} />}
            <CubeViewport
              facelets={trainerType === "oll" ? ollTrainer.virtualFacelets : trainer.virtualFacelets}
              gyroCurrentRef={cube.gyroCurrentRef}
              gyroResetRef={trainerGyroResetRef}
              gyroFrame="yellow-top"
            />
          </>
        ) : (
          <>
            {showScramble && <ScrambleDisplay scramble={scramble} />}
            {!showScramble && pll.active && <PLLDisplay pll={pll} />}
            {!showScramble && !pll.active && oll.active && <OLLDisplay oll={oll} />}
            {showTimer && <TimerDisplay phase={timer.phase} elapsed={timer.elapsed} />}
            <CubeViewport
              facelets={cube.facelets}
              gyroCurrentRef={cube.gyroCurrentRef}
              gyroResetRef={cube.gyroResetRef}
            />
          </>
        )}
      </main>
    </div>
  );
}
