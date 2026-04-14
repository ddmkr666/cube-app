import { ScrambleStatus } from "../hooks/useScramble";

interface Props {
  scramble: ScrambleStatus;
  solved: boolean;
  connected: boolean;
}

export function ScramblePanel({ scramble, solved, connected }: Props) {
  const { state, moves, currentIndex, generate, clear } = scramble;

  if (!connected) {
    return (
      <div className="panel">
        <h3>Scramble</h3>
        <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>
          Connect your cube to enable scrambles.
        </p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h3>Scramble</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {state === "idle" && (
          !solved
            ? <p style={{ color: "var(--warn)", fontSize: 12, margin: 0 }}>Solve the cube to generate a scramble.</p>
            : <button onClick={generate}>New Scramble</button>
        )}

        {(state === "scrambling" || state === "half-turn" || state === "error") && (
          <>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Step {currentIndex + 1} of {moves.length}
            </div>
            <button className="secondary" style={{ padding: "4px 8px", fontSize: 11 }} onClick={clear}>
              Abort
            </button>
          </>
        )}

        {state === "done" && (
          <>
            <div style={{ fontSize: 12, color: "var(--ok)" }}>Scramble complete!</div>
            <button onClick={generate}>New Scramble</button>
            <button className="secondary" style={{ padding: "4px 8px", fontSize: 11 }} onClick={clear}>
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  );
}
