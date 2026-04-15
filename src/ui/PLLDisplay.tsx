import { PLLStatus } from "../hooks/usePLL";
import { PLLPatternImage } from "./PLLPatternImage";

interface Props {
  pll: PLLStatus;
}

export function PLLDisplay({ pll }: Props) {
  const { recognition, moves, sequence, trackable } = pll;
  if (!recognition || !recognition.case) return null;

  const { state, currentIndex, errorCorrection } = sequence;
  const { case: cse } = recognition;

  return (
    <div className="oll-display">
      <div className="oll-display__header">
        <PLLPatternImage
          corners={recognition.targetCornerPermutation}
          edges={recognition.targetEdgePermutation}
        />
        <div className="oll-display__meta">
          <div className="oll-display__phase">
            {cse.phase === "corners" ? "PLL Part 1: Corners" : "PLL Part 2: Edges"}
          </div>
          <div className="oll-display__name">{cse.name}</div>
          <div className="oll-display__desc">{cse.description}</div>
        </div>
      </div>

      <div className="oll-display__moves">
        {moves.map((m, i) => {
          let cls = "scramble-move";
          if (state === "done" || i < currentIndex) cls += " scramble-move--done";
          else if (i === currentIndex) {
            if (state === "error") cls += " scramble-move--error";
            else if (state === "half-turn") cls += " scramble-move--half";
            else cls += " scramble-move--current";
          } else {
            cls += " scramble-move--upcoming";
          }
          return <span key={i} className={cls}>{m}</span>;
        })}
      </div>

      {recognition.auf && (
        <div className="scramble-display__hint">
          Align the top like the diagram first ({recognition.auf}), then start the algorithm.
        </div>
      )}

      {!trackable && (
        <div className="scramble-display__hint">
          This PLL uses slice moves, so the smart-cube tracker can only verify the result state, not each move.
        </div>
      )}

      {state === "error" && errorCorrection && (
        <div className="scramble-display__correction">
          Wrong move â€” do <strong>{errorCorrection}</strong> to get back on track
        </div>
      )}
      {state === "half-turn" && (
        <div className="scramble-display__hint">
          Good â€” turn again to complete {moves[currentIndex]}
        </div>
      )}
    </div>
  );
}
