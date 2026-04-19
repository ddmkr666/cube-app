import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RawQuaternion } from "../bluetooth/ganCube";
import { isSolved } from "../cube/facelets";
import { applyMovesToFacelets } from "../cube/moves";
import { getInverseMove } from "../cube/scramble";
import { MoveRecord } from "../cube/types";
import { TimerPhase } from "./useTimer";
import { useTestTimes } from "./useTestTimes";
import {
  buildOLLTrainerFacelets,
  getOLLTrainerCase,
  OLL_TRAINER_CASES,
  OLLTrainerCase,
  randomOLLTrainerCaseId,
} from "../trainer/ollTrainerData";

export interface OLLTestStatus {
  iteration: number;
  cases: OLLTrainerCase[];
  selectedCase: OLLTrainerCase;
  virtualFacelets: string;
  phase: TimerPhase;
  elapsed: number;
  recentTimes: number[];
  averageOf5: number | null;
  averageOf12: number | null;
  autoRetryCountdownMs: number | null;
  selectCase: (caseId: string) => void;
  randomCase: () => void;
  nextCase: () => void;
  retryCase: () => void;
}

export function useOLLTest(
  moveHistory: MoveRecord[],
  _gyroCurrentRef: React.MutableRefObject<RawQuaternion | null>,
  _gyroResetRef: React.MutableRefObject<RawQuaternion | null>,
): OLLTestStatus {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(() => randomOLLTrainerCaseId());
  const [attempt, setAttempt] = useState(0);
  const [alignmentMove, setAlignmentMove] = useState<string>(() => randomAlignmentMove());
  const [userMoves, setUserMoves] = useState<string[]>([]);
  const [trainerMoveHistory, setTrainerMoveHistory] = useState<MoveRecord[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [autoRetryCountdownMs, setAutoRetryCountdownMs] = useState<number | null>(null);
  const prevSerialRef = useRef<number | null>(null);
  const attemptStartedAtRef = useRef<number | null>(null);
  const recordedSequenceRef = useRef<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const cases = useMemo(() => OLL_TRAINER_CASES, []);
  const selectedCase = useMemo(
    () => getOLLTrainerCase(selectedCaseId),
    [selectedCaseId],
  );
  const testTimes = useTestTimes();

  useEffect(() => {
    if (cases.some((cse) => cse.id === selectedCaseId)) return;
    const nextId = cases[0]?.id;
    if (!nextId) return;
    setSelectedCaseId(nextId);
    setAlignmentMove(randomAlignmentMove());
    setAttempt((value) => value + 1);
  }, [cases, selectedCaseId]);

  const initialFacelets = useMemo(() => {
    const base = buildOLLTrainerFacelets(selectedCase);
    return alignmentMove ? applyMovesToFacelets(base, [getInverseMove(alignmentMove)]) : base;
  }, [selectedCase, alignmentMove]);

  const virtualFacelets = useMemo(
    () => applyMovesToFacelets(initialFacelets, userMoves),
    [initialFacelets, userMoves],
  );

  const solved = useMemo(() => isSolved(virtualFacelets), [virtualFacelets]);
  const sequenceId = `${selectedCase.id}:${attempt}`;

  useEffect(() => {
    prevSerialRef.current = moveHistory.length > 0
      ? moveHistory[moveHistory.length - 1].serial
      : null;
    attemptStartedAtRef.current = null;
    recordedSequenceRef.current = null;
    setAutoRetryCountdownMs(null);
    setElapsed(0);
    setTrainerMoveHistory([]);
    setUserMoves([]);

    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [sequenceId]);

  useEffect(() => {
    const newMoves = prevSerialRef.current === null
      ? moveHistory
      : moveHistory.slice(
        moveHistory.findIndex((m) => m.serial === prevSerialRef.current) + 1,
      );

    if (newMoves.length === 0) return;
    prevSerialRef.current = newMoves[newMoves.length - 1].serial;

    const normalizedMoves = newMoves.map((record) => ({
      ...record,
      move: remapTrainerMove(record.move),
    }));

    setTrainerMoveHistory((prev) => [...prev, ...normalizedMoves]);
    setUserMoves((prev) => [...prev, ...normalizedMoves.map((m) => m.move)]);
  }, [moveHistory]);

  useEffect(() => {
    if (trainerMoveHistory.length === 0 || attemptStartedAtRef.current !== null) return;

    attemptStartedAtRef.current = trainerMoveHistory[0].localTimestamp;
    intervalRef.current = window.setInterval(() => {
      if (attemptStartedAtRef.current === null) return;
      setElapsed(performance.now() - attemptStartedAtRef.current);
    }, 30);
  }, [trainerMoveHistory]);

  useEffect(() => {
    if (
      !solved
      || attemptStartedAtRef.current === null
      || trainerMoveHistory.length === 0
      || recordedSequenceRef.current === sequenceId
    ) {
      return;
    }

    const finishedAt = trainerMoveHistory[trainerMoveHistory.length - 1].localTimestamp;
    const finalElapsed = Math.max(0, finishedAt - attemptStartedAtRef.current);

    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setElapsed(finalElapsed);
    testTimes.addTime(finalElapsed);
    recordedSequenceRef.current = sequenceId;
  }, [solved, sequenceId, testTimes, trainerMoveHistory]);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  const phase: TimerPhase = useMemo(() => {
    if (solved && trainerMoveHistory.length > 0) return "finished";
    if (trainerMoveHistory.length > 0) return "running";
    return "waiting";
  }, [solved, trainerMoveHistory.length]);

  const recentTimes = useMemo(
    () => testTimes.times.slice(-3).map((record) => record.elapsed).reverse(),
    [testTimes.times],
  );
  const averageOf5 = useMemo(() => averageOfLast(testTimes.times, 5), [testTimes.times]);
  const averageOf12 = useMemo(() => averageOfLast(testTimes.times, 12), [testTimes.times]);

  const startAttempt = useCallback((caseId?: string) => {
    const nextCaseId = caseId ?? randomOLLTrainerCaseId(undefined, selectedCaseId);
    setSelectedCaseId(nextCaseId);
    setAlignmentMove(randomAlignmentMove(alignmentMove));
    setAttempt((value) => value + 1);
  }, [alignmentMove, selectedCaseId]);

  const selectCase = useCallback((caseId: string) => {
    startAttempt(caseId);
  }, [startAttempt]);

  const randomCase = useCallback(() => {
    startAttempt();
  }, [startAttempt]);

  const nextCase = useCallback(() => {
    startAttempt();
  }, [startAttempt]);

  const retryCase = useCallback(() => {
    startAttempt();
  }, [startAttempt]);

  useEffect(() => {
    if (!solved) return;

    const startedAt = Date.now();
    const durationMs = 5000;
    setAutoRetryCountdownMs(durationMs);

    const countdownInterval = window.setInterval(() => {
      const remaining = Math.max(0, durationMs - (Date.now() - startedAt));
      setAutoRetryCountdownMs(remaining);
    }, 100);

    const timeoutId = window.setTimeout(() => {
      window.clearInterval(countdownInterval);
      setAutoRetryCountdownMs(0);
      startAttempt();
    }, durationMs);

    return () => {
      window.clearInterval(countdownInterval);
      window.clearTimeout(timeoutId);
      setAutoRetryCountdownMs(null);
    };
  }, [solved, startAttempt]);

  return {
    iteration: attempt,
    cases,
    selectedCase,
    virtualFacelets,
    phase,
    elapsed,
    recentTimes,
    averageOf5,
    averageOf12,
    autoRetryCountdownMs,
    selectCase,
    randomCase,
    nextCase,
    retryCase,
  };
}

function averageOfLast(records: Array<{ elapsed: number }>, count: number): number | null {
  if (records.length < count) return null;
  const window = records.slice(-count);
  return window.reduce((sum, record) => sum + record.elapsed, 0) / count;
}

function remapTrainerMove(move: string): string {
  if (!move) return move;
  const face = move[0];
  const suffix = move.slice(1);
  const map: Record<string, string> = {
    U: "D", D: "U", R: "L", L: "R", F: "F", B: "B",
    u: "d", d: "u", r: "l", l: "r", f: "f", b: "b",
  };
  return `${map[face] ?? face}${suffix}`;
}

function randomAlignmentMove(exclude?: string): string {
  const options = ["", "U", "U2", "U'"];
  const pool = options.filter((value) => value !== exclude);
  const source = pool.length > 0 ? pool : options;
  return source[Math.floor(Math.random() * source.length)];
}
