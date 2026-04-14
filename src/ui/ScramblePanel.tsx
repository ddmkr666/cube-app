import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { generateScramble, getInverseMove } from "../cube/scramble";
import { MoveRecord } from "../cube/types";

interface Props {
  solved: boolean;
  connected: boolean;
  facelets: string;
  lastMove: MoveRecord | null;
}

type ScrambleState = "idle" | "scrambling" | "error" | "done";

export function ScramblePanel({ solved, connected, facelets, lastMove }: Props) {
  const [scrambleString, setScrambleString] = useState<string>("");
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [errorCorrection, setErrorCorrection] = useState<string | null>(null);
  const [state, setState] = useState<ScrambleState>("idle");

  const expectedMoves = useMemo(() => 
    scrambleString ? scrambleString.split(" ") : [], 
    [scrambleString]
  );

  const prevMoveSerialRef = useRef<number | null>(null);

  const handleGenerate = useCallback(() => {
    setScrambleString(generateScramble(20));
    setCurrentIndex(0);
    setErrorCorrection(null);
    setState("scrambling");
  }, []);

  const handleClear = useCallback(() => {
    setScrambleString("");
    setCurrentIndex(0);
    setErrorCorrection(null);
    setState("idle");
  }, []);

  // Track scramble progress based on lastMove
  useEffect(() => {
    if (!lastMove || lastMove.serial === prevMoveSerialRef.current) return;
    prevMoveSerialRef.current = lastMove.serial;

    if (state === "idle" || state === "done") return;

    const move = lastMove.move;

    if (state === "error") {
      // If we're in error state, check if the move is the correction
      if (move === errorCorrection) {
        setErrorCorrection(null);
        setState("scrambling");
      } else {
        // If they did another wrong move, update correction (they need to undo this one first)
        setErrorCorrection(getInverseMove(move));
      }
      return;
    }

    if (state === "scrambling") {
      const expected = expectedMoves[currentIndex];
      if (move === expected) {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= expectedMoves.length) {
          setState("done");
        } else {
          setCurrentIndex(nextIndex);
        }
      } else {
        // Wrong move!
        setErrorCorrection(getInverseMove(move));
        setState("error");
      }
    }
  }, [lastMove, state, currentIndex, expectedMoves, errorCorrection]);

  // Reset if solved
  useEffect(() => {
    if (solved && state === "done") {
      // If they solved it after finishing scramble (e.g. they solved it manually)
      // or if they just want to reset for a new scramble
    }
  }, [solved, state]);

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

            {state === "scrambling" && (
              <div style={{ fontSize: 13 }}>
                Next move: <strong style={{ color: "var(--accent)", fontSize: 16 }}>{expectedMoves[currentIndex]}</strong>
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
