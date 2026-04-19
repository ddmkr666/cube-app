import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RawQuaternion } from "../bluetooth/ganCube";
import { isSolved } from "../cube/facelets";
import { MoveRecord } from "../cube/types";
import { applyMovesToFacelets } from "../cube/moves";
import { getInverseMove } from "../cube/scramble";
import { useTrainerTimes } from "./useTrainerTimes";
import {
  buildPLLTrainerFacelets,
  buildPLLTrainerStartFacelets,
  getPLLTrainerCase,
  PLL_EDGE_VARIANTS,
  PLL_TRAINER_CASES,
  PLLTrainerCase,
  randomPLLTrainerCaseId,
  rotatePLLTrainerColorFrame,
  withPLLTrainerEdgeVariant,
} from "../trainer/pllTrainerData";

export type TrainerFeedbackState = "ready" | "in_progress" | "incorrect" | "completed";

export interface PLLTrainerStatus {
  iteration: number;
  cases: PLLTrainerCase[];
  selectedCase: PLLTrainerCase;
  virtualFacelets: string;
  algorithmMoves: string[];
  alignmentMove: string;
  feedback: TrainerFeedbackState;
  recentTimes: number[];
  averageOf5: number | null;
  averageOf25: number | null;
  averageOf50: number | null;
  autoRetryCountdownMs: number | null;
  shownAlgorithm: boolean;
  selectCase: (caseId: string) => void;
  randomCase: () => void;
  nextCase: () => void;
  retryCase: () => void;
  toggleAlgorithm: () => void;
}

export function usePLLTrainer(
  moveHistory: MoveRecord[],
  _gyroCurrentRef: React.MutableRefObject<RawQuaternion | null>,
  _gyroResetRef: React.MutableRefObject<RawQuaternion | null>,
): PLLTrainerStatus {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(() => randomPLLTrainerCaseId());
  const [shownAlgorithm, setShownAlgorithm] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [userMoves, setUserMoves] = useState<string[]>([]);
  const [trainerMoveHistory, setTrainerMoveHistory] = useState<MoveRecord[]>([]);
  const [autoRetryCountdownMs, setAutoRetryCountdownMs] = useState<number | null>(null);
  const [colorRotation, setColorRotation] = useState<0 | 1 | 2 | 3>(0);
  const [alignmentMove, setAlignmentMove] = useState<string>(() => randomAlignmentMove("corners"));
  const [edgeVariant, setEdgeVariant] = useState<number[]>(() => randomEdgeVariant("corners"));
  const prevSerialRef = useRef<number | null>(null);
  const attemptStartedAtRef = useRef<number | null>(null);
  const recordedSequenceRef = useRef<string | null>(null);
  const cases = useMemo(() => PLL_TRAINER_CASES, []);

  const selectedCase = useMemo(() => {
    const baseCase = getPLLTrainerCase(selectedCaseId);
    return baseCase.phase === "corners"
      ? withPLLTrainerEdgeVariant(baseCase, edgeVariant)
      : baseCase;
  }, [selectedCaseId, edgeVariant]);
  const trainerTimeKey = selectedCaseId;
  const trainerTimes = useTrainerTimes(trainerTimeKey);

  useEffect(() => {
    if (cases.some((cse) => cse.id === selectedCaseId)) return;
    const nextId = cases[0]?.id;
    if (!nextId) return;
    const baseCase = getPLLTrainerCase(nextId);
    setSelectedCaseId(nextId);
    setColorRotation(randomColorRotation());
    setAlignmentMove(randomAlignmentMove(baseCase.phase));
    setEdgeVariant(randomEdgeVariant(baseCase.phase));
    setAttempt((value) => value + 1);
  }, [cases, selectedCaseId]);

  const initialFacelets = useMemo(() => {
    const base = selectedCase.phase === "corners"
      ? buildPLLTrainerStartFacelets(selectedCase, edgeVariant)
      : buildPLLTrainerFacelets(selectedCase);
    const colorShifted = rotatePLLTrainerColorFrame(base, colorRotation);
    return alignmentMove ? applyMovesToFacelets(colorShifted, [getInverseMove(alignmentMove)]) : colorShifted;
  }, [selectedCase, edgeVariant, colorRotation, alignmentMove]);
  const virtualFacelets = useMemo(
    () => applyMovesToFacelets(initialFacelets, userMoves),
    [initialFacelets, userMoves],
  );
  const solved = useMemo(() => isSolved(virtualFacelets), [virtualFacelets]);

  const algorithmMoves = useMemo(
    () => selectedCase.algorithm.split(" ").filter(Boolean),
    [selectedCase.algorithm],
  );

  const sequenceId = `${selectedCase.id}:${attempt}`;

  useEffect(() => {
    prevSerialRef.current = moveHistory.length > 0
      ? moveHistory[moveHistory.length - 1].serial
      : null;
    attemptStartedAtRef.current = null;
    recordedSequenceRef.current = null;
    setAutoRetryCountdownMs(null);
    setTrainerMoveHistory([]);
    setUserMoves([]);
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
    const elapsed = Math.max(0, finishedAt - attemptStartedAtRef.current);
    trainerTimes.addTime(trainerTimeKey, elapsed);
    recordedSequenceRef.current = sequenceId;
  }, [solved, sequenceId, trainerMoveHistory, trainerTimeKey, trainerTimes]);

  const feedback: TrainerFeedbackState = useMemo(() => {
    if (solved) return "completed";
    return userMoves.length > 0 ? "in_progress" : "ready";
  }, [solved, userMoves.length]);
  const recentTimes = useMemo(
    () => trainerTimes.records.slice(-3).map((record) => record.elapsed).reverse(),
    [trainerTimes.records],
  );
  const averageOf5 = useMemo(() => averageOfLast(trainerTimes.records, 5), [trainerTimes.records]);
  const averageOf25 = useMemo(() => averageOfLast(trainerTimes.records, 25), [trainerTimes.records]);
  const averageOf50 = useMemo(() => averageOfLast(trainerTimes.records, 50), [trainerTimes.records]);

  const selectCase = useCallback((caseId: string) => {
    const baseCase = getPLLTrainerCase(caseId);
    setSelectedCaseId(caseId);
    setColorRotation(randomColorRotation());
    setAlignmentMove(randomAlignmentMove(baseCase.phase));
    setEdgeVariant(randomEdgeVariant(baseCase.phase));
    setAttempt((value) => value + 1);
  }, []);

  const randomCase = useCallback(() => {
    const nextId = randomPLLTrainerCaseId(selectedCaseId);
    const baseCase = getPLLTrainerCase(nextId);
    setSelectedCaseId(nextId);
    setColorRotation(randomColorRotation());
    setAlignmentMove(randomAlignmentMove(baseCase.phase));
    setEdgeVariant(randomEdgeVariant(baseCase.phase));
    setAttempt((value) => value + 1);
  }, [selectedCaseId]);

  const nextCase = useCallback(() => {
    const index = cases.findIndex((cse) => cse.id === selectedCaseId);
    const nextId = cases[(index + 1 + cases.length) % cases.length].id;
    const baseCase = getPLLTrainerCase(nextId);
    setSelectedCaseId(nextId);
    setColorRotation(randomColorRotation());
    setAlignmentMove(randomAlignmentMove(baseCase.phase));
    setEdgeVariant(randomEdgeVariant(baseCase.phase));
    setAttempt((value) => value + 1);
  }, [cases, selectedCaseId]);

  const retryCase = useCallback(() => {
    const nextId = selectedCaseId;
    const baseCase = getPLLTrainerCase(nextId);
    setSelectedCaseId(nextId);
    setColorRotation(randomColorRotation(colorRotation));
    setAlignmentMove(randomAlignmentMove(baseCase.phase, alignmentMove));
    setEdgeVariant(randomEdgeVariant(baseCase.phase, edgeVariant));
    setAttempt((value) => value + 1);
  }, [alignmentMove, colorRotation, edgeVariant, selectedCaseId]);

  useEffect(() => {
    if (!solved) return;

    const startedAt = Date.now();
    const durationMs = 5000;
    setAutoRetryCountdownMs(durationMs);

    const intervalId = window.setInterval(() => {
      const remaining = Math.max(0, durationMs - (Date.now() - startedAt));
      setAutoRetryCountdownMs(remaining);
    }, 100);

    const timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId);
      setAutoRetryCountdownMs(0);
      retryCase();
    }, durationMs);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
      setAutoRetryCountdownMs(null);
    };
  }, [solved, retryCase]);

  const toggleAlgorithm = useCallback(() => {
    setShownAlgorithm((value) => !value);
  }, []);

  return {
    iteration: attempt,
    cases,
    selectedCase,
    virtualFacelets,
    algorithmMoves,
    alignmentMove,
    feedback,
    recentTimes,
    averageOf5,
    averageOf25,
    averageOf50,
    autoRetryCountdownMs,
    shownAlgorithm,
    selectCase,
    randomCase,
    nextCase,
    retryCase,
    toggleAlgorithm,
  };
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

function randomColorRotation(exclude?: 0 | 1 | 2 | 3): 0 | 1 | 2 | 3 {
  const options: Array<0 | 1 | 2 | 3> = [0, 1, 2, 3];
  const pool = options.filter((value) => value !== exclude);
  const source = pool.length > 0 ? pool : options;
  return source[Math.floor(Math.random() * source.length)];
}

function randomAlignmentMove(
  phase: "corners" | "edges",
  exclude?: string,
): string {
  const options = phase === "corners" || phase === "edges"
    ? ["", "U", "U2", "U'"]
    : [""];
  const pool = options.filter((value) => value !== exclude);
  const source = pool.length > 0 ? pool : options;
  return source[Math.floor(Math.random() * source.length)];
}

function randomEdgeVariant(_phase: "corners" | "edges", exclude?: number[]): number[] {
  const sourceSet = PLL_EDGE_VARIANTS;
  const pool = sourceSet.filter((variant) =>
    !exclude || variant.some((value, index) => value !== exclude[index]));
  const source = pool.length > 0 ? pool : sourceSet;
  return [...source[Math.floor(Math.random() * source.length)]];
}

function averageOfLast(records: Array<{ elapsed: number }>, count: number): number | null {
  if (records.length < count) return null;
  const window = records.slice(-count);
  return window.reduce((sum, record) => sum + record.elapsed, 0) / count;
}
