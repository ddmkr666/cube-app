import { useState, useEffect, useRef } from "react";
import { getInverseMove } from "../cube/scramble";
import { MoveRecord } from "../cube/types";

export type SequenceState = "idle" | "running" | "half-turn" | "error" | "done";

export interface SequenceStatus {
  state: SequenceState;
  currentIndex: number;
  errorCorrection: string | null;
}

function faceOf(move: string): string { return move[0]; }

function isFirstHalf(move: string, expected: string): boolean {
  if (!expected.endsWith("2")) return false;
  const face = faceOf(expected);
  return move === face || move === `${face}'`;
}

/**
 * Tracks progress through a fixed sequence of moves, reacting to cube move events.
 * States mirror the scramble flow: running → half-turn (mid-double-turn) → error (wrong move) → done.
 *
 * `sequenceId` must change whenever `moves` represents a logically new sequence,
 * so the internal index resets. Passing the same id for the same array of moves
 * keeps progress stable across re-renders.
 */
export function useMoveSequence(
  moves: string[],
  sequenceId: string | number | null,
  lastMove: MoveRecord | null,
): SequenceStatus {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorCorrection, setErrorCorrection] = useState<string | null>(null);
  const [state, setState] = useState<SequenceState>("idle");

  const firstHalfRef = useRef("");
  const prevSerialRef = useRef<number | null>(null);
  const prevIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (prevIdRef.current === sequenceId) return;
    prevIdRef.current = sequenceId;
    setCurrentIndex(0);
    setErrorCorrection(null);
    firstHalfRef.current = "";
    setState(sequenceId == null || moves.length === 0 ? "idle" : "running");
  }, [sequenceId, moves.length]);

  useEffect(() => {
    if (!lastMove || lastMove.serial === prevSerialRef.current) return;
    prevSerialRef.current = lastMove.serial;
    if (state === "idle" || state === "done") return;

    const move = lastMove.move;

    if (state === "error") {
      if (move === errorCorrection) {
        setErrorCorrection(null);
        setState(firstHalfRef.current ? "half-turn" : "running");
      } else {
        setErrorCorrection(getInverseMove(move));
      }
      return;
    }

    const expected = moves[currentIndex];

    if (state === "half-turn") {
      if (move === firstHalfRef.current) {
        firstHalfRef.current = "";
        if (currentIndex + 1 >= moves.length) setState("done");
        else setCurrentIndex(currentIndex + 1);
      } else {
        setErrorCorrection(getInverseMove(move));
        setState("error");
      }
      return;
    }

    // running
    if (move === expected) {
      firstHalfRef.current = "";
      if (currentIndex + 1 >= moves.length) setState("done");
      else setCurrentIndex(currentIndex + 1);
    } else if (isFirstHalf(move, expected)) {
      firstHalfRef.current = move;
      setState("half-turn");
    } else {
      setErrorCorrection(getInverseMove(move));
      setState("error");
    }
  }, [lastMove, state, currentIndex, moves, errorCorrection]);

  return { state, currentIndex, errorCorrection };
}
