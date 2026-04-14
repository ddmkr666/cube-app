import { useState, useCallback, useEffect, useRef } from "react";
import { generateScramble } from "../cube/scramble";

interface Props {
  solved: boolean;
  connected: boolean;
  facelets: string;
}

export function ScramblePanel({ solved, connected, facelets }: Props) {
  const [scramble, setScramble] = useState<string>("");
  const prevFaceletsRef = useRef(facelets);

  const handleGenerate = useCallback(() => {
    setScramble(generateScramble(20));
  }, []);

  const handleClear = useCallback(() => {
    setScramble("");
  }, []);

  // Clear the scramble if the user starts moving the cube
  useEffect(() => {
    if (prevFaceletsRef.current !== facelets) {
      if (!solved && scramble) {
        setScramble("");
      }
      prevFaceletsRef.current = facelets;
    }
  }, [facelets, solved, scramble]);

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
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {!solved && !scramble ? (
          <p style={{ color: "var(--warn)", fontSize: 12, margin: 0 }}>
            Solve the cube to generate a new scramble.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button 
                onClick={handleGenerate} 
                disabled={!solved}
                style={{ flex: 1 }}
                title={!solved ? "Cube must be solved to generate a new scramble" : ""}
              >
                New Scramble
              </button>
              {scramble && (
                <button className="secondary" onClick={handleClear}>
                  Clear
                </button>
              )}
            </div>
            {scramble && (
              <div
                className="mono"
                style={{
                  background: "rgba(0,0,0,0.2)",
                  padding: "10px",
                  borderRadius: "4px",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  wordSpacing: "4px"
                }}
              >
                {scramble}
              </div>
            )}
            {scramble && !solved && (
              <p style={{ color: "var(--muted)", fontSize: 11, margin: 0 }}>
                Scramble in progress...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
