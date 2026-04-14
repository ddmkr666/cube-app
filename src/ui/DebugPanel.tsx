import { MoveRecord } from "../cube/types";

interface Props {
  facelets: string;
  lastMove: MoveRecord | null;
  moveHistory: MoveRecord[];
}

export function DebugPanel({ facelets, lastMove, moveHistory }: Props) {
  return (
    <div className="panel">
      <h3>Debug</h3>
      <dl className="kv">
        <dt>Last move</dt>
        <dd className="mono">{lastMove ? `${lastMove.move}  (#${lastMove.serial})` : "—"}</dd>
      </dl>
      <div style={{ marginTop: 8 }}>
        <div style={{ color: "var(--muted)", fontSize: 11, marginBottom: 4 }}>
          Recent moves
        </div>
        <div className="moves">
          {moveHistory.length === 0 && <span style={{ color: "var(--muted)", fontSize: 12 }}>none</span>}
          {moveHistory.map((m) => (
            <span key={m.serial} className="move mono">{m.move}</span>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{ color: "var(--muted)", fontSize: 11, marginBottom: 4 }}>
          Facelets (URFDLB)
        </div>
        <div className="facelets">{facelets}</div>
      </div>
    </div>
  );
}
