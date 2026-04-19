import { OLLTrainerStatus } from "../hooks/useOLLTrainer";
import { PLLTrainerStatus } from "../hooks/usePLLTrainer";

interface Props {
  trainerType: "oll" | "pll";
  onTrainerTypeChange: (value: "oll" | "pll") => void;
  onResetGyro: () => void;
  pllTrainer: PLLTrainerStatus;
  ollTrainer: OLLTrainerStatus;
}

interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

interface ToggleGroupProps<T extends string> {
  label: string;
  value: T;
  options: ToggleOption<T>[];
  onChange: (value: T) => void;
}

function ToggleGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: ToggleGroupProps<T>) {
  return (
    <div className="trainer-panel__field">
      <span>{label}</span>
      <div className="trainer-panel__toggle-group" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={
              value === option.value
                ? "trainer-panel__toggle trainer-panel__toggle--active"
                : "trainer-panel__toggle"
            }
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TrainerPanel({
  trainerType,
  onTrainerTypeChange,
  onResetGyro,
  pllTrainer,
  ollTrainer,
}: Props) {
  return (
    <section className="panel">
      <h3>Algorithm Trainer</h3>

      <div className="trainer-panel__body">
        <ToggleGroup
          label="Algorithm Set"
          value={trainerType}
          onChange={onTrainerTypeChange}
          options={[
            { value: "oll", label: "2-Look OLL" },
            { value: "pll", label: "2-Look PLL" },
          ]}
        />

        {trainerType === "oll" ? (
          <>
            <label className="trainer-panel__field">
              <span>Case</span>
              <select
                value={ollTrainer.selectedCase.id}
                onChange={(e) => ollTrainer.selectCase(e.target.value)}
              >
                {ollTrainer.cases.map((cse) => (
                  <option key={cse.id} value={cse.id}>
                    {cse.displayName}
                  </option>
                ))}
              </select>
            </label>

          </>
        ) : (
          <>
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
          </>
        )}

        <button className="secondary" onClick={onResetGyro}>
          Reset Trainer Gyro
        </button>
        <div className="facelets">
          Hold the real cube white-side up with green in front, then reset the trainer gyro. Trainer mode still displays the virtual cube with yellow on top.
        </div>
      </div>
    </section>
  );
}
