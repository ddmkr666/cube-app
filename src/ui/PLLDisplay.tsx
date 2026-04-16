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
  const usesSliceMoves = moves.some((move) => /^[MES]/i.test(move));

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
        {formatPLLDisplayMoves(cse.name, moves).map(({ move, index, prefix, suffix }) => {
          let cls = "scramble-move";
          if (state === "done" || index < currentIndex) cls += " scramble-move--done";
          else if (index === currentIndex) {
            if (state === "error") cls += " scramble-move--error";
            else if (state === "half-turn") cls += " scramble-move--half";
            else cls += " scramble-move--current";
          } else {
            cls += " scramble-move--upcoming";
          }
          return <span key={index} className={cls}>{prefix}{move}{suffix}</span>;
        })}
      </div>

      {recognition.auf && (
        <div className="scramble-display__hint">
          Align the top like the diagram first ({recognition.auf}), then start the algorithm.
        </div>
      )}

      {!trackable && (
        <div className="scramble-display__hint">
          {usesSliceMoves
            ? "This PLL uses slice moves (M/E/S). GAN move events only report U/R/F/D/L/B turns, so slice moves cannot be tracked move-by-move."
            : "This PLL uses moves the smart-cube tracker cannot verify move-by-move."}
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

function formatPLLDisplayMoves(caseName: string, moves: string[]) {
  return moves.map((move, index) => ({
    move,
    index,
    prefix: caseName === "Headlights" && index === 0 ? "( " : "",
    suffix: caseName === "Headlights" && index === 3 ? " )" : "",
  }));
}
