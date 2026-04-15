import { useState, useCallback, useMemo } from "react";
import { generateScramble } from "../cube/scramble";
import { MoveRecord } from "../cube/types";
import { useMoveSequence, SequenceState } from "./useMoveSequence";

export type ScrambleState = "idle" | "scrambling" | "half-turn" | "error" | "done";

export interface ScrambleStatus {
  state: ScrambleState;
  moves: string[];
  currentIndex: number;
  errorCorrection: string | null;
  generate: () => void;
  clear: () => void;
}

// Sequence "running" is surfaced as "scrambling" to the rest of the app.
function toScrambleState(s: SequenceState): ScrambleState {
  return s === "running" ? "scrambling" : s;
}

export function useScramble(lastMove: MoveRecord | null): ScrambleStatus {
  const [scrambleString, setScrambleString] = useState("");
  const [generation, setGeneration] = useState(0);

  const moves = useMemo(() => (scrambleString ? scrambleString.split(" ") : []), [scrambleString]);
  const sequenceId = scrambleString ? generation : null;

  const seq = useMoveSequence(moves, sequenceId, lastMove);

  const generate = useCallback(() => {
    setScrambleString(generateScramble(20));
    setGeneration((g) => g + 1);
  }, []);

  const clear = useCallback(() => {
    setScrambleString("");
    setGeneration((g) => g + 1);
  }, []);

  return {
    state: toScrambleState(seq.state),
    moves,
    currentIndex: seq.currentIndex,
    errorCorrection: seq.errorCorrection,
    generate,
    clear,
  };
}
