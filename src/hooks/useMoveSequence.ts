import { useState, useEffect, useRef } from "react";
import { getInverseMove } from "../cube/scramble";
import { MoveRecord } from "../cube/types";

export type SequenceState = "idle" | "running" | "half-turn" | "error" | "done";

export interface SequenceStatus {
  state: SequenceState;
  currentIndex: number;
  errorCorrection: string | null;
}

interface UseMoveSequenceOptions {
  /**
   * While still waiting for the first tracked move, ignore turns on these faces.
   * Useful when the user may do a free alignment step before the algorithm starts.
   */
  ignoreLeadingFaces?: string[];
}

function faceOf(move: string): string { return move[0]; }

function moveSuffix(move: string): string { return move.slice(1); }

function isWideNotation(move: string): boolean {
  const face = faceOf(move);
  return face !== face.toUpperCase();
}

function matchesExpectedMove(actual: string, expected: string): boolean {
  if (actual === expected) return true;

  if (!isWideNotation(expected)) return false;

  return faceOf(actual).toUpperCase() === faceOf(expected).toUpperCase()
    && moveSuffix(actual) === moveSuffix(expected);
}

function isFirstHalf(move: string, expected: string): boolean {
  if (!expected.endsWith("2")) return false;
  return matchesExpectedMove(move, faceOf(expected))
    || matchesExpectedMove(move, `${faceOf(expected)}'`);
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
  options: UseMoveSequenceOptions = {},
): SequenceStatus {
  const ignoreLeadingFaces = options.ignoreLeadingFaces ?? [];
  const [internalState, setInternalState] = useState<{
    idx: number;
    errorStack: string[];
    phase: SequenceState;
    firstHalf: string | null;
  }>({ idx: 0, errorStack: [], phase: "idle", firstHalf: null });

  const prevSerialRef = useRef<number | null>(null);
  const prevIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (prevIdRef.current === sequenceId) return;
    prevIdRef.current = sequenceId;
    setInternalState({
      idx: 0,
      errorStack: [],
      phase: sequenceId == null || moves.length === 0 ? "idle" : "running",
      firstHalf: null,
    });
    prevSerialRef.current = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].serial : null;
  }, [sequenceId, moves.length, moveHistory.length]);

  useEffect(() => {
    const newMoves = prevSerialRef.current === null
      ? moveHistory
      : moveHistory.slice(moveHistory.findIndex(m => m.serial === prevSerialRef.current) + 1);

    if (newMoves.length === 0) return;
    prevSerialRef.current = newMoves[newMoves.length - 1].serial;

    setInternalState(prev => {
      let { idx, errorStack, phase, firstHalf } = {
        idx: prev.idx,
        errorStack: [...prev.errorStack],
        phase: prev.phase,
        firstHalf: prev.firstHalf
      };

      for (const m of newMoves) {
        if (phase === "idle" || phase === "done") break;
        const move = m.move;

        // If we have an error stack, the only valid move is to undo the top of the stack.
        if (errorStack.length > 0) {
          const needed = errorStack[errorStack.length - 1];
          if (matchesExpectedMove(move, needed)) {
            errorStack.pop();
            if (errorStack.length === 0) {
              phase = firstHalf ? "half-turn" : "running";
            }
          } else {
            errorStack.push(getInverseMove(move));
          }
          continue;
        }

        const expected = moves[idx];

        if (
          idx === 0
          && errorStack.length === 0
          && phase === "running"
          && ignoreLeadingFaces.includes(faceOf(move))
        ) {
          continue;
        }

        if (phase === "half-turn" && firstHalf) {
          if (matchesExpectedMove(move, firstHalf)) {
            // Completed the double turn (e.g., U then U for U2)
            firstHalf = null;
            if (idx + 1 >= moves.length) { phase = "done"; break; }
            else { idx++; phase = "running"; }
          } else if (matchesExpectedMove(move, getInverseMove(firstHalf))) {
            // Undid the first half (e.g., U then U')
            firstHalf = null;
            phase = "running";
          } else {
            // Wrong second move
            errorStack.push(getInverseMove(move));
            phase = "error";
          }
          continue;
        }

        // Standard "running" phase
        if (matchesExpectedMove(move, expected)) {
          if (idx + 1 >= moves.length) { phase = "done"; break; }
          else idx++;
        } else if (isFirstHalf(move, expected)) {
          firstHalf = move;
          phase = "half-turn";
        } else if (idx > 0 && matchesExpectedMove(move, getInverseMove(moves[idx - 1]))) {
           // User undid the PREVIOUS move? 
           // We'll treat this as a generic error to keep it simple, 
           // but they must now "undo the undo" (redo it) or we'd get very out of sync.
           errorStack.push(getInverseMove(move));
           phase = "error";
        } else {
          errorStack.push(getInverseMove(move));
          phase = "error";
        }
      }

      return { idx, errorStack, phase, firstHalf };
    });
  }, [moveHistory, moves, ignoreLeadingFaces]);

  return {
    state: internalState.phase,
    currentIndex: internalState.idx,
    errorCorrection: internalState.errorStack.length > 0 
      ? internalState.errorStack[internalState.errorStack.length - 1] 
      : null,
  };
}
