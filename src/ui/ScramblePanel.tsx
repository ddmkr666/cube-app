import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { generateScramble, getInverseMove } from "../cube/scramble";
import { MoveRecord } from "../cube/types";

interface Props {
  solved: boolean;
  connected: boolean;
  lastMove: MoveRecord | null;
}

type ScrambleState = "idle" | "scrambling" | "half-turn" | "error" | "done";

/** Face letter without modifier, e.g. "U" from "U2" or "U'". */
function faceOf(move: string): string {
  return move[0];
}

/**
 * For a "2" move the cube sends two separate quarter-turns.
 * Accept either two CW (X X) or two CCW (X' X') — both equal a half-turn.
 * A mixed pair (X then X') would cancel out, which is wrong.
 */
function isFirstHalf(move: string, expected: string): boolean {
  if (!expected.endsWith("2")) return false;
  const face = faceOf(expected);
  return move === face || move === `${face}'`;
}

function isMatchingSecondHalf(move: string, firstHalf: string): boolean {
  return move === firstHalf;
}

export function ScramblePanel({ solved, connected, lastMove }: Props) {
  const [scrambleString, setScrambleString] = useState<string>("");
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [errorCorrection, setErrorCorrection] = useState<string | null>(null);
  const [state, setState] = useState<ScrambleState>("idle");
  // Remembers the first quarter-turn of a "2" move so we can verify the second.
  const firstHalfRef = useRef<string>("");

  const expectedMoves = useMemo(() =>
    scrambleString ? scrambleString.split(" ") : [],
    [scrambleString]
  );

  const prevMoveSerialRef = useRef<number | null>(null);

  const handleGenerate = useCallback(() => {
    setScrambleString(generateScramble(20));
    setCurrentIndex(0);
    setErrorCorrection(null);
    firstHalfRef.current = "";
    setState("scrambling");
  }, []);

  const handleClear = useCallback(() => {
    setScrambleString("");
    setCurrentIndex(0);
    setErrorCorrection(null);
    firstHalfRef.current = "";
    setState("idle");
  }, []);

  const advance = useCallback((index: number, moves: string[]) => {
    const nextIndex = index + 1;
    firstHalfRef.current = "";
    if (nextIndex >= moves.length) {
      setState("done");
    } else {
      setCurrentIndex(nextIndex);
      setState("scrambling");
    }
  }, []);

  // Track scramble progress based on lastMove
  useEffect(() => {
    if (!lastMove || lastMove.serial === prevMoveSerialRef.current) return;
    prevMoveSerialRef.current = lastMove.serial;

    if (state === "idle" || state === "done") return;

    const move = lastMove.move;

    if (state === "error") {
      if (move === errorCorrection) {
        setErrorCorrection(null);
        setState(firstHalfRef.current ? "half-turn" : "scrambling");
      } else {
        setErrorCorrection(getInverseMove(move));
      }
      return;
    }

    const expected = expectedMoves[currentIndex];

    if (state === "half-turn") {
      // Waiting for the second quarter-turn of a "2" move.
      if (isMatchingSecondHalf(move, firstHalfRef.current)) {
        advance(currentIndex, expectedMoves);
      } else {
        // Wrong second move — undo it and redo the correct quarter-turn.
        setErrorCorrection(getInverseMove(move));
        setState("error");
      }
      return;
    }

    // state === "scrambling"
    if (move === expected) {
      advance(currentIndex, expectedMoves);
    } else if (isFirstHalf(move, expected)) {
      // Correct face, first of two quarter-turns for a "2" move.
      firstHalfRef.current = move;
      setState("half-turn");
    } else {
      setErrorCorrection(getInverseMove(move));
      setState("error");
    }
  }, [lastMove, state, currentIndex, expectedMoves, errorCorrection, advance]);

  if (!connected) {
    return (
      <div className="panel">
        <h3>Scramble</h3>
        <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>
          Connect your cube to enable scrambles.
        </p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h3>Scramble</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        
        {state === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {!solved ? (
              <p style={{ color: "var(--warn)", fontSize: 12, margin: 0 }}>
                Solve the cube to generate a new scramble.
              </p>
            ) : (
              <button onClick={handleGenerate}>New Scramble</button>
            )}
          </div>
        )}

        {(state !== "idle") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: state === "done" ? "var(--ok)" : "var(--muted)" }}>
                {state === "done" ? "Scramble complete!" : `Progress: ${currentIndex}/${expectedMoves.length}`}
              </span>
              <button className="secondary" style={{ padding: "4px 8px", fontSize: 11 }} onClick={handleClear}>
                {state === "done" ? "Clear" : "Abort"}
              </button>
            </div>

            <div
              className="mono"
              style={{
                background: "rgba(0,0,0,0.2)",
                padding: "10px",
                borderRadius: "4px",
                fontSize: "15px",
                lineHeight: "1.8",
                color: "var(--text)",
                border: "1px solid var(--border)",
                wordSpacing: "6px"
              }}
            >
              {expectedMoves.map((m, i) => (
                <span 
                  key={i} 
                  style={{ 
                    color: i < currentIndex ? "var(--muted)" : (i === currentIndex ? "var(--accent)" : "inherit"),
                    textDecoration: i < currentIndex ? "line-through" : "none",
                    fontWeight: i === currentIndex ? "bold" : "normal",
                    padding: "0 2px"
                  }}
                >
                  {m}
                </span>
              ))}
            </div>

            {state === "error" && (
              <div style={{ 
                background: "rgba(239, 91, 91, 0.1)", 
                border: "1px solid var(--err)", 
                padding: "8px", 
                borderRadius: "4px",
                display: "flex",
                flexDirection: "column",
                gap: 4
              }}>
                <span style={{ color: "var(--err)", fontSize: 12, fontWeight: "bold" }}>Wrong move!</span>
                <span style={{ fontSize: 13 }}>
                  Do <strong style={{ color: "var(--warn)", fontSize: 15 }}>{errorCorrection}</strong> to get back on track.
                </span>
              </div>
            )}

            {(state === "scrambling" || state === "half-turn") && (
              <div style={{ fontSize: 13 }}>
                Next move: <strong style={{ color: "var(--accent)", fontSize: 16 }}>{expectedMoves[currentIndex]}</strong>
                {state === "half-turn" && (
                  <span style={{ color: "var(--warn)", marginLeft: 8, fontSize: 12 }}>
                    (1/2 — turn again)
                  </span>
                )}
              </div>
            )}

            {state === "done" && (
              <button onClick={handleGenerate}>New Scramble</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
