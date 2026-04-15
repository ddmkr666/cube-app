import { useCubeConnection } from "./hooks/useCubeConnection";
import { useScramble } from "./hooks/useScramble";
import { useTimer } from "./hooks/useTimer";
import { useSolveTimes } from "./hooks/useSolveTimes";
import { useOLL } from "./hooks/useOLL";
import { usePLL } from "./hooks/usePLL";
import { CubeViewport } from "./render/CubeViewport";
import { ConnectPanel } from "./ui/ConnectPanel";
import { ScramblePanel } from "./ui/ScramblePanel";
import { ScrambleDisplay } from "./ui/ScrambleDisplay";
import { OLLDisplay } from "./ui/OLLDisplay";
import { PLLDisplay } from "./ui/PLLDisplay";
import { TimerDisplay } from "./ui/TimerDisplay";
import { HistoryPanel } from "./ui/HistoryPanel";
import { DebugPanel } from "./ui/DebugPanel";
import { StatusPanel } from "./ui/StatusPanel";

export function App() {
  const cube = useCubeConnection();
  const scramble = useScramble(cube.moveHistory);
  const { times, addTime, clearAll, exportCSV } = useSolveTimes();
  const timer = useTimer(scramble.state, cube.lastMove, cube.solved, addTime);
  const oll = useOLL(cube.facelets, cube.moveHistory);
  const pll = usePLL(cube.facelets, cube.moveHistory);
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
        <ScramblePanel scramble={scramble} solved={cube.solved} connected={connected} />
        <StatusPanel status={cube.status} solved={cube.solved} />
        <HistoryPanel times={times} onClear={clearAll} onExport={exportCSV} />
        <DebugPanel
          facelets={cube.facelets}
          lastMove={cube.lastMove}
          moveHistory={cube.moveHistory}
        />
      </aside>
      <main className="app__main">
        {showScramble && <ScrambleDisplay scramble={scramble} />}
        {!showScramble && oll.active && <OLLDisplay oll={oll} />}
        {!showScramble && !oll.active && pll.active && <PLLDisplay pll={pll} />}
        {showTimer && <TimerDisplay phase={timer.phase} elapsed={timer.elapsed} />}
        <CubeViewport
          facelets={cube.facelets}
          gyroCurrentRef={cube.gyroCurrentRef}
          gyroResetRef={cube.gyroResetRef}
        />
      </main>
    </div>
  );
}
