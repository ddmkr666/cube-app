import { OLLStatus } from "../hooks/useOLL";
import { OLLPatternImage } from "./OLLPatternImage";

interface Props {
  oll: OLLStatus;
}

/**
 * Main-area overlay shown while the cube is in the OLL phase (F2L solved,
 * U layer not yet solved). Displays the recognised case name, a top-view
 * diagram, and the algorithm with the same per-move colouring as the scramble.
 */
export function OLLDisplay({ oll }: Props) {
  const { recognition, moves, sequence } = oll;
  if (!recognition || !recognition.case) return null;

  const { state, currentIndex, errorCorrection } = sequence;
  const { case: cse } = recognition;

  return (
    <div className="oll-display">
      <div className="oll-display__header">
        <OLLPatternImage
          corners={recognition.targetCornerState}
          edges={recognition.targetEdgeState}
        />
        <div className="oll-display__meta">
          <div className="oll-display__phase">
            {cse.phase === "edges" ? "OLL Part 1: Edges" : "OLL Part 2: Corners"}
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

      {state === "error" && errorCorrection && (
        <div className="scramble-display__correction">
          Wrong move — do <strong>{errorCorrection}</strong> to get back on track
        </div>
      )}
      {state === "half-turn" && (
        <div className="scramble-display__hint">
          Good — turn again to complete {moves[currentIndex]}
        </div>
      )}
    </div>
  );
}
