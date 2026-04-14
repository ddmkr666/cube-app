import { useCubeConnection } from "./hooks/useCubeConnection";
import { useScramble } from "./hooks/useScramble";
import { CubeViewport } from "./render/CubeViewport";
import { ConnectPanel } from "./ui/ConnectPanel";
import { ScramblePanel } from "./ui/ScramblePanel";
import { ScrambleDisplay } from "./ui/ScrambleDisplay";
import { DebugPanel } from "./ui/DebugPanel";
import { StatusPanel } from "./ui/StatusPanel";

export function App() {
  const cube = useCubeConnection();
  const scramble = useScramble(cube.lastMove, cube.solved);
  const connected = cube.status.state === "connected";

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
        />
        <ScramblePanel scramble={scramble} solved={cube.solved} connected={connected} />
        <StatusPanel status={cube.status} solved={cube.solved} />
        <DebugPanel
          facelets={cube.facelets}
          lastMove={cube.lastMove}
          moveHistory={cube.moveHistory}
        />
      </aside>
      <main className="app__main">
        <ScrambleDisplay scramble={scramble} />
        <CubeViewport facelets={cube.facelets} />
      </main>
    </div>
  );
}
