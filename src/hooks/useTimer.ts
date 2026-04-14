import { useState, useEffect, useRef, useCallback } from "react";
import { ScrambleState } from "./useScramble";
import { MoveRecord } from "../cube/types";

export type TimerPhase = "idle" | "waiting" | "running" | "finished";

export interface TimerStatus {
  phase: TimerPhase;
  /** Elapsed milliseconds. Meaningful in "running" and "finished" phases. */
  elapsed: number;
  reset: () => void;
}

/**
 * Timer state machine:
 *   idle     — no scramble active
 *   waiting  — scramble finished, cube not yet touched; timer starts on first move
 *   running  — counting up from first post-scramble move
 *   finished — cube solved; final time frozen
 *
 * Transitions back to idle when a new scramble is started (scrambleState → "scrambling").
 */
export function useTimer(
  scrambleState: ScrambleState,
  lastMove: MoveRecord | null,
  solved: boolean,
  onFinished: (elapsed: number) => void,
): TimerStatus {
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [elapsed, setElapsed] = useState(0);

  const startTimeRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevSerialRef = useRef<number | null>(null);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const stopInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopInterval();
    setPhase("idle");
    setElapsed(0);
    prevSerialRef.current = null;
  }, [stopInterval]);

  // idle → waiting when scramble completes
  useEffect(() => {
    if (scrambleState === "done" && phase === "idle") {
      setPhase("waiting");
      setElapsed(0);
      prevSerialRef.current = lastMove?.serial ?? null;
    }
  }, [scrambleState, phase, lastMove]);

  // Any new scramble resets the timer
  useEffect(() => {
    if (scrambleState === "scrambling" || scrambleState === "idle") {
      reset();
    }
  }, [scrambleState, reset]);

  // waiting → running on first new move
  useEffect(() => {
    if (phase !== "waiting" || !lastMove) return;
    if (lastMove.serial === prevSerialRef.current) return;
    startTimeRef.current = performance.now();
    prevSerialRef.current = lastMove.serial;
    setPhase("running");
  }, [lastMove, phase]);

  // Tick interval while running
  useEffect(() => {
    if (phase !== "running") return;
    intervalRef.current = setInterval(() => {
      setElapsed(performance.now() - startTimeRef.current);
    }, 30); // ~33fps — smooth centisecond display
    return stopInterval;
  }, [phase, stopInterval]);

  // running → finished when solved
  useEffect(() => {
    if (phase !== "running" || !solved) return;
    const final = performance.now() - startTimeRef.current;
    stopInterval();
    setElapsed(final);
    setPhase("finished");
    onFinishedRef.current(final);
  }, [solved, phase, stopInterval]);

  return { phase, elapsed, reset };
}
