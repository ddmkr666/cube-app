import { useCubeConnection } from "./hooks/useCubeConnection";
import { CubeViewport } from "./render/CubeViewport";
import { ConnectPanel } from "./ui/ConnectPanel";
import { DebugPanel } from "./ui/DebugPanel";
import { StatusPanel } from "./ui/StatusPanel";

export function App() {
  const cube = useCubeConnection();

  return (
    <div className="app">
      <header className="app__header">Cube App · GAN 356 i3 · build-check-v2</header>
      <aside className="app__side">
        <ConnectPanel
          status={cube.status}
          onConnect={cube.connect}
          onDisconnect={cube.disconnect}
          onRequestState={cube.requestFacelets}
          onMarkSolved={cube.markSolved}
        />
        <StatusPanel status={cube.status} solved={cube.solved} />
        <DebugPanel
          facelets={cube.facelets}
          lastMove={cube.lastMove}
          moveHistory={cube.moveHistory}
        />
      </aside>
      <main className="app__main">
        <CubeViewport facelets={cube.facelets} />
      </main>
    </div>
  );
}
