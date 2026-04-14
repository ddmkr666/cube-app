import { ConnectionStatus } from "../bluetooth/ganCube";

interface Props {
  status: ConnectionStatus;
  solved: boolean;
}

export function StatusPanel({ status, solved }: Props) {
  const { label, dot } = describe(status);
  return (
    <div className="panel">
      <h3>Status</h3>
      <dl className="kv">
        <dt>Connection</dt>
        <dd><span className={`dot dot--${dot}`} />{label}</dd>
        <dt>Device</dt>
        <dd>{status.state === "connected" ? status.deviceName : "—"}</dd>
        <dt>Solved</dt>
        <dd>
          <span className={`dot dot--${solved ? "ok" : "warn"}`} />
          {solved ? "Yes" : "No"}
        </dd>
      </dl>
      {status.state === "error" && (
        <p style={{ color: "var(--err)", fontSize: 12, marginTop: 8 }}>
          {status.message}
        </p>
      )}
    </div>
  );
}

function describe(s: ConnectionStatus): { label: string; dot: "ok" | "warn" | "err" } {
  switch (s.state) {
    case "connected": return { label: "Connected", dot: "ok" };
    case "connecting": return { label: "Connecting…", dot: "warn" };
    case "error": return { label: "Error", dot: "err" };
    case "disconnected": return { label: "Disconnected", dot: "err" };
  }
}
