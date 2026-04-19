import { OLLTestStatus } from "../hooks/useOLLTest";
import { SolveRecord } from "../hooks/useSolveTimes";
import { HistoryPanel } from "./HistoryPanel";

interface Props {
  test: OLLTestStatus;
  onResetGyro: () => void;
  times: SolveRecord[];
  onClear: () => void;
  onExport: (times: SolveRecord[]) => void;
}

export function TestPanel({ test, onResetGyro, times, onClear, onExport }: Props) {
  return (
    <>
      <section className="panel">
        <h3>OLL Test</h3>

        <div className="trainer-panel__body">
          <div className="trainer-panel__field">
            <span>Start State</span>
            <div className="facelets">
              Each attempt generates a random OLL state from the full OLL set automatically. The case is hidden during the test.
            </div>
          </div>

          <div className="trainer-panel__actions">
            <button className="secondary" onClick={test.retryCase}>Retry</button>
            <button className="secondary" onClick={test.nextCase}>Next</button>
            <button className="secondary" onClick={test.randomCase}>Random</button>
          </div>

          <button className="secondary" onClick={onResetGyro}>
            Reset Test Gyro
          </button>
          <div className="facelets">
            Hold the real cube white-side up with green in front, then reset the gyro. Test mode uses a virtual OLL start state and tracks your moves until that virtual cube is solved.
          </div>
        </div>
      </section>

      <HistoryPanel
        times={times}
        onClear={onClear}
        onExport={onExport}
        title="Test History"
        emptyMessage="No test attempts yet. Finish an OLL test solve to record a time."
      />
    </>
  );
}
