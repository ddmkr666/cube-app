import { ScrambleStatus } from "../hooks/useScramble";

interface Props {
  scramble: ScrambleStatus;
}

/**
 * Large sequence display shown above the 3D cube while a scramble is active.
 * Each move is coloured by state:
 *   - done (i < currentIndex): green
 *   - error (i === currentIndex, state === "error"): red
 *   - half-turn in progress (i === currentIndex, state === "half-turn"): yellow
 *   - next to execute (i === currentIndex): accent blue / bold
 *   - upcoming (i > currentIndex): muted
 */
export function ScrambleDisplay({ scramble }: Props) {
  const { state, moves, currentIndex, errorCorrection } = scramble;

  if (state === "idle") return null;

  return (
    <div className="scramble-display">
      <div className="scramble-display__moves">
        {moves.map((m, i) => {
          let cls = "scramble-move";
          if (i < currentIndex) cls += " scramble-move--done";
          else if (i === currentIndex) {
            if (state === "error") cls += " scramble-move--error";
            else if (state === "half-turn") cls += " scramble-move--half";
            else cls += " scramble-move--current";
          } else {
            cls += " scramble-move--upcoming";
          }
          return (
            <span key={i} className={cls}>{m}</span>
          );
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

      {state === "done" && (
        <div className="scramble-display__done">Scramble complete!</div>
      )}
    </div>
  );
}
