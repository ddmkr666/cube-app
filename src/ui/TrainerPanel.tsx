import { OLLTrainerStatus } from "../hooks/useOLLTrainer";
import { PLLTrainerStatus } from "../hooks/usePLLTrainer";

interface Props {
  active: boolean;
  trainerType: "oll" | "pll";
  onActivate: () => void;
  onDeactivate: () => void;
  onTrainerTypeChange: (value: "oll" | "pll") => void;
  onResetGyro: () => void;
  pllTrainer: PLLTrainerStatus;
  ollTrainer: OLLTrainerStatus;
}

export function TrainerPanel({
  active,
  trainerType,
  onActivate,
  onDeactivate,
  onTrainerTypeChange,
  onResetGyro,
  pllTrainer,
  ollTrainer,
}: Props) {
  const trainerLabel = trainerType === "oll" ? "2-Look OLL" : "2-Look PLL";

  return (
    <section className="panel">
      <h3>Algorithm Trainer</h3>

      <div className="trainer-panel__mode">
        <button onClick={active ? onDeactivate : onActivate}>
          {active ? "Exit Trainer" : `Start ${trainerLabel} Trainer`}
        </button>
      </div>

      {active && (
        <div className="trainer-panel__body">
          <label className="trainer-panel__field">
            <span>Algorithm Set</span>
            <select
              value={trainerType}
              onChange={(e) => onTrainerTypeChange(e.target.value as "oll" | "pll")}
            >
              <option value="oll">2-Look OLL</option>
              <option value="pll">2-Look PLL</option>
            </select>
          </label>

          {trainerType === "oll" ? (
            <>
              <label className="trainer-panel__field">
                <span>OLL Section</span>
                <select
                  value={ollTrainer.section}
                  onChange={(e) => ollTrainer.setSection(e.target.value as "part1" | "part2")}
                >
                  <option value="part1">Part 1 - Edges</option>
                  <option value="part2">Part 2 - Corners</option>
                </select>
              </label>

              <label className="trainer-panel__field">
                <span>Case</span>
                <select
                  value={ollTrainer.selectedCase.id}
                  onChange={(e) => ollTrainer.selectCase(e.target.value)}
                >
                  {ollTrainer.cases.map((cse) => (
                    <option key={cse.id} value={cse.id}>
                      {cse.phase === "edges" ? "Edges" : "Corners"} - {cse.displayName}
                    </option>
                  ))}
                </select>
              </label>

              <div className="facelets">
                Learn mode is ready for OLL. Test mode can come later without changing the solve-step algorithms.
              </div>
            </>
          ) : (
            <>
              <label className="trainer-panel__field">
                <span>Trainer Mode</span>
                <select
                  value={pllTrainer.mode}
                  onChange={(e) => pllTrainer.setMode(e.target.value as "learn" | "test")}
                >
                  <option value="learn">Learn</option>
                  <option value="test">Test</option>
                </select>
              </label>

              <label className="trainer-panel__field">
                <span>PLL Section</span>
                <select
                  value={pllTrainer.section}
                  onChange={(e) => pllTrainer.setSection(e.target.value as "part1" | "part2" | "part1+2")}
                >
                  <option value="part1">Part 1 - Corners</option>
                  <option value="part2">Part 2 - Edges</option>
                  <option value="part1+2">Part 1 + 2 - Full PLL</option>
                </select>
              </label>

              {pllTrainer.mode === "learn" && (
                <label className="trainer-panel__field">
                  <span>Case</span>
                  <select
                    value={pllTrainer.selectedCase.id}
                    onChange={(e) => pllTrainer.selectCase(e.target.value)}
                  >
                    {pllTrainer.cases.map((cse) => (
                      <option key={cse.id} value={cse.id}>
                        {cse.phase === "corners" ? "Corners" : "Edges"} - {cse.displayName}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
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
