import { ConnectionStatus } from "../bluetooth/ganCube";

interface Props {
  status: ConnectionStatus;
  onConnect: () => void;
  onDisconnect: () => void;
  onRequestState: () => void;
  onMarkSolved: () => void;
}

export function ConnectPanel({ status, onConnect, onDisconnect, onRequestState, onMarkSolved }: Props) {
  const connected = status.state === "connected";
  const connecting = status.state === "connecting";
  const supported = typeof navigator !== "undefined" && "bluetooth" in navigator;

  return (
    <div className="panel">
      <h3>Connection</h3>
      {!supported && (
        <p style={{ color: "var(--err)", fontSize: 12 }}>
          Web Bluetooth is not available in this browser. Use a desktop Chromium browser.
        </p>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!connected ? (
          <button onClick={onConnect} disabled={!supported || connecting}>
            {connecting ? "Connecting…" : "Connect cube"}
          </button>
        ) : (
          <button className="secondary" onClick={onDisconnect}>Disconnect</button>
        )}
        <button className="secondary" onClick={onRequestState} disabled={!connected}>
          Request state
        </button>
        <button
          className="secondary"
          onClick={onMarkSolved}
          disabled={!connected}
          title="Hold the cube physically solved, then click to sync the app to reality."
        >
          Mark as solved
        </button>
      </div>
      {connected && (
        <p style={{ color: "var(--muted)", fontSize: 11, marginTop: 8, marginBottom: 0 }}>
          If the 3D view doesn't match your cube, hold it solved and click
          <strong> Mark as solved</strong> to re-sync.
        </p>
      )}
    </div>
  );
}
