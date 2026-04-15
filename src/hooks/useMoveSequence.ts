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
  moveHistory: MoveRecord[],
): SequenceStatus {
  const [internalState, setInternalState] = useState<{
    idx: number;
    err: string | null;
    phase: SequenceState;
    firstHalf: string;
  }>({ idx: 0, err: null, phase: "idle", firstHalf: "" });

  const prevSerialRef = useRef<number | null>(null);
  const prevIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (prevIdRef.current === sequenceId) return;
    prevIdRef.current = sequenceId;
    setInternalState({
      idx: 0,
      err: null,
      phase: sequenceId == null || moves.length === 0 ? "idle" : "running",
      firstHalf: "",
    });
    // On reset, sync to whatever the latest serial is, so we only process new moves.
    prevSerialRef.current = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].serial : null;
  }, [sequenceId, moves.length, moveHistory.length]);

  useEffect(() => {
    // Find all moves that have happened since we last checked.
    const newMoves = prevSerialRef.current === null
      ? moveHistory
      : moveHistory.slice(moveHistory.findIndex(m => m.serial === prevSerialRef.current) + 1);

    if (newMoves.length === 0) return;
    prevSerialRef.current = newMoves[newMoves.length - 1].serial;

    setInternalState(prev => {
      let { idx, err, phase, firstHalf } = { ...prev };

      for (const m of newMoves) {
        if (phase === "idle" || phase === "done") break;
        const move = m.move;

        if (phase === "error") {
          if (move === err) {
            err = null;
            phase = firstHalf ? "half-turn" : "running";
          } else {
            err = getInverseMove(move);
          }
          continue;
        }

        const expected = moves[idx];

        if (phase === "half-turn") {
          if (move === firstHalf) {
            firstHalf = "";
            if (idx + 1 >= moves.length) { phase = "done"; break; }
            else idx++;
          } else {
            err = getInverseMove(move);
            phase = "error";
          }
          continue;
        }

        // running
        if (move === expected) {
          firstHalf = "";
          if (idx + 1 >= moves.length) { phase = "done"; break; }
          else idx++;
        } else if (isFirstHalf(move, expected)) {
          firstHalf = move;
          phase = "half-turn";
        } else {
          err = getInverseMove(move);
          phase = "error";
        }
      }

      return { idx, err, phase, firstHalf };
    });
  }, [moveHistory, moves]);

  return {
    state: internalState.phase,
    currentIndex: internalState.idx,
    errorCorrection: internalState.err,
  };
}
