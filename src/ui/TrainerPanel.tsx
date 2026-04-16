import { PLLTrainerStatus } from "../hooks/usePLLTrainer";

interface Props {
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onResetGyro: () => void;
  trainer: PLLTrainerStatus;
}

export function TrainerPanel({ active, onActivate, onDeactivate, onResetGyro, trainer }: Props) {
  return (
    <section className="panel">
      <h3>Algorithm Trainer</h3>

      <div className="trainer-panel__mode">
        <button onClick={active ? onDeactivate : onActivate}>
          {active ? "Exit Trainer" : "Start 2-Look PLL Trainer"}
        </button>
      </div>

      {active && (
        <div className="trainer-panel__body">
          <label className="trainer-panel__field">
            <span>Trainer Mode</span>
            <select
              value={trainer.mode}
              onChange={(e) => trainer.setMode(e.target.value as "learn" | "test")}
            >
              <option value="learn">Learn</option>
              <option value="test">Test</option>
            </select>
          </label>

          <label className="trainer-panel__field">
            <span>PLL Section</span>
            <select
              value={trainer.section}
              onChange={(e) => trainer.setSection(e.target.value as "part1" | "part2")}
            >
              <option value="part1">Part 1 - Corners</option>
              <option value="part2">Part 2 - Edges</option>
            </select>
          </label>

          {trainer.mode === "learn" && (
            <label className="trainer-panel__field">
              <span>Case</span>
              <select
                value={trainer.selectedCase.id}
                onChange={(e) => trainer.selectCase(e.target.value)}
              >
                {trainer.cases.map((cse) => (
                  <option key={cse.id} value={cse.id}>
                    {cse.phase === "corners" ? "Corners" : "Edges"} - {cse.displayName}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button className="secondary" onClick={onResetGyro}>
            Reset Trainer Gyro
          </button>
          <div className="facelets">
            Hold the real cube with yellow on top and green in front, then reset the trainer gyro.
          </div>
        </div>
      )}
    </section>
  );
}
