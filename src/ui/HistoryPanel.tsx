import { SolveRecord } from "../hooks/useSolveTimes";
import { formatTime } from "./TimerDisplay";

interface Props {
  times: SolveRecord[];
  onClear: () => void;
  onExport: (times: SolveRecord[]) => void;
  title?: string;
  emptyMessage?: string;
}

export function HistoryPanel({
  times,
  onClear,
  onExport,
  title = "Solve History",
  emptyMessage = "No solves yet. Finish a scramble to record a time.",
}: Props) {
  if (times.length === 0) {
    return (
      <div className="panel">
        <h3>{title}</h3>
        <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  const best = Math.min(...times.map(t => t.elapsed));
  // Show most recent first, cap at 20 in the list
  const recent = [...times].reverse().slice(0, 20);

  const avg5 = average(times, 5);
  const avg12 = average(times, 12);

  return (
    <div className="panel">
      <h3>{title}</h3>

      <dl className="kv" style={{ marginBottom: 8 }}>
        <dt>Best</dt>
        <dd className="mono" style={{ color: "var(--ok)" }}>{formatTime(best)}</dd>
        {avg5 !== null && (<><dt>Ao5</dt><dd className="mono">{formatTime(avg5)}</dd></>)}
        {avg12 !== null && (<><dt>Ao12</dt><dd className="mono">{formatTime(avg12)}</dd></>)}
      </dl>

      <div className="history-list">
        {recent.map((r, i) => (
          <div key={r.id} className="history-row">
            <span className="history-row__n" style={{ color: "var(--muted)" }}>
              #{times.length - i}
            </span>
            <span
              className={`history-row__time mono${r.elapsed === best ? " history-row__time--best" : ""}`}
            >
              {formatTime(r.elapsed)}
            </span>
            <span className="history-row__date">
              {new Date(r.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button className="secondary" style={{ fontSize: 11, padding: "4px 8px" }}
          onClick={() => onExport(times)}>
          Export CSV
        </button>
        <button className="secondary" style={{ fontSize: 11, padding: "4px 8px", color: "var(--err)" }}
          onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  );
}

/** Average of Time (Ao5, Ao12) — drops best and worst, returns null if not enough solves. */
function average(times: SolveRecord[], n: number): number | null {
  if (times.length < n) return null;
  const slice = times.slice(-n).map(t => t.elapsed).sort((a, b) => a - b);
  const trimmed = slice.slice(1, -1);
  return trimmed.reduce((s, v) => s + v, 0) / trimmed.length;
}
