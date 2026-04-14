import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { generateScramble, getInverseMove } from "../cube/scramble";
import { MoveRecord } from "../cube/types";

export type ScrambleState = "idle" | "scrambling" | "half-turn" | "error" | "done";

export interface ScrambleStatus {
  state: ScrambleState;
  moves: string[];
  currentIndex: number;
  errorCorrection: string | null;
  generate: () => void;
  clear: () => void;
}

function faceOf(move: string): string { return move[0]; }

function isFirstHalf(move: string, expected: string): boolean {
  if (!expected.endsWith("2")) return false;
  const face = faceOf(expected);
  return move === face || move === `${face}'`;
}

export function useScramble(lastMove: MoveRecord | null, solved: boolean): ScrambleStatus {
  const [scrambleString, setScrambleString] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorCorrection, setErrorCorrection] = useState<string | null>(null);
  const [state, setState] = useState<ScrambleState>("idle");

  const firstHalfRef = useRef("");
  const prevSerialRef = useRef<number | null>(null);

  const moves = useMemo(() => (scrambleString ? scrambleString.split(" ") : []), [scrambleString]);

  const generate = useCallback(() => {
    setScrambleString(generateScramble(20));
    setCurrentIndex(0);
    setErrorCorrection(null);
    firstHalfRef.current = "";
    setState("scrambling");
  }, []);

  const clear = useCallback(() => {
    setScrambleString("");
    setCurrentIndex(0);
    setErrorCorrection(null);
    firstHalfRef.current = "";
    setState("idle");
  }, []);

  const advance = useCallback((index: number, total: number) => {
    firstHalfRef.current = "";
    if (index + 1 >= total) {
      setState("done");
    } else {
      setCurrentIndex(index + 1);
      setState("scrambling");
    }
  }, []);

  useEffect(() => {
    if (!lastMove || lastMove.serial === prevSerialRef.current) return;
    prevSerialRef.current = lastMove.serial;
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

    const expected = moves[currentIndex];

    if (state === "half-turn") {
      if (move === firstHalfRef.current) {
        advance(currentIndex, moves.length);
      } else {
        setErrorCorrection(getInverseMove(move));
        setState("error");
      }
      return;
    }

    // state === "scrambling"
    if (move === expected) {
      advance(currentIndex, moves.length);
    } else if (isFirstHalf(move, expected)) {
      firstHalfRef.current = move;
      setState("half-turn");
    } else {
      setErrorCorrection(getInverseMove(move));
      setState("error");
    }
  }, [lastMove, state, currentIndex, moves, errorCorrection, advance]);

  // Reset to idle when cube is solved after a completed scramble.
  useEffect(() => {
    if (solved && state === "done") setState("idle");
  }, [solved, state]);

  return { state, moves, currentIndex, errorCorrection, generate, clear };
}
