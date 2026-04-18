import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RawQuaternion } from "../bluetooth/ganCube";
import { applyMovesToFacelets } from "../cube/moves";
import { getInverseMove } from "../cube/scramble";
import { MoveRecord } from "../cube/types";
import { SequenceStatus, useMoveSequence } from "./useMoveSequence";
import { useTrainerTimes } from "./useTrainerTimes";
import {
  buildOLLTrainerFacelets,
  getOLLTrainerCase,
  OLL_TRAINER_CASES,
  OLLTrainerCase,
  randomOLLTrainerCaseId,
} from "../trainer/ollTrainerData";

export type TrainerFeedbackState = "ready" | "in_progress" | "incorrect" | "completed";
export type OLLTrainerSection = "part1" | "part2";

export interface OLLTrainerStatus {
  section: OLLTrainerSection;
  iteration: number;
  cases: OLLTrainerCase[];
  selectedCase: OLLTrainerCase;
  virtualFacelets: string;
  algorithmMoves: string[];
  sequence: SequenceStatus;
  trackMoves: boolean;
  topSolved: boolean;
  feedback: TrainerFeedbackState;
  recentTimes: number[];
  averageOf5: number | null;
  averageOf25: number | null;
  averageOf50: number | null;
  autoRetryCountdownMs: number | null;
  shownAlgorithm: boolean;
  nextExpectedMove: string | null;
  selectCase: (caseId: string) => void;
  randomCase: () => void;
  nextCase: () => void;
  retryCase: () => void;
  toggleAlgorithm: () => void;
  setSection: (value: OLLTrainerSection) => void;
}

export function useOLLTrainer(
  moveHistory: MoveRecord[],
  _gyroCurrentRef: React.MutableRefObject<RawQuaternion | null>,
  _gyroResetRef: React.MutableRefObject<RawQuaternion | null>,
): OLLTrainerStatus {
  const [section, setSection] = useState<OLLTrainerSection>("part1");
  const [selectedCaseId, setSelectedCaseId] = useState<string>(() => randomOLLTrainerCaseId("part1"));
  const [shownAlgorithm, setShownAlgorithm] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [alignmentMove, setAlignmentMove] = useState<string>(() => randomAlignmentMove());
  const [userMoves, setUserMoves] = useState<string[]>([]);
  const [trainerMoveHistory, setTrainerMoveHistory] = useState<MoveRecord[]>([]);
  const [autoRetryCountdownMs, setAutoRetryCountdownMs] = useState<number | null>(null);
  const prevSerialRef = useRef<number | null>(null);
  const attemptStartedAtRef = useRef<number | null>(null);
  const recordedSequenceRef = useRef<string | null>(null);

  const cases = useMemo(
    () => OLL_TRAINER_CASES.filter((cse) => caseMatchesSection(cse, section)),
    [section],
  );

  const selectedCase = useMemo(
    () => getOLLTrainerCase(selectedCaseId),
    [selectedCaseId],
  );

  useEffect(() => {
    if (cases.some((cse) => cse.id === selectedCaseId)) return;
    const nextId = cases[0]?.id;
    if (!nextId) return;
    setSelectedCaseId(nextId);
    setAlignmentMove(randomAlignmentMove(alignmentMove));
    setAttempt((value) => value + 1);
  }, [alignmentMove, cases, selectedCaseId]);

  const initialFacelets = useMemo(() => {
    const base = buildOLLTrainerFacelets(selectedCase);
    return alignmentMove ? applyMovesToFacelets(base, [getInverseMove(alignmentMove)]) : base;
  }, [selectedCase, alignmentMove]);
  const virtualFacelets = useMemo(
    () => applyMovesToFacelets(initialFacelets, userMoves),
    [initialFacelets, userMoves],
  );

  const algorithmMoves = useMemo(
    () => selectedCase.algorithm.split(" ").filter(Boolean),
    [selectedCase.algorithm],
  );
  const trackMoves = selectedCase.trackMoves !== false;

  const sequenceId = `${selectedCase.id}:${attempt}`;

  const sequence = useMoveSequence(
    algorithmMoves,
    trackMoves ? sequenceId : null,
    trainerMoveHistory,
    { ignoreLeadingFaces: ["U"] },
  );

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

    let projectedIndex = userMoves.length;
    const normalizedMoves = newMoves.map((record) => {
      const baseMove = remapTrainerMove(record.move);
      const expectedMove = !trackMoves
        ? algorithmMoves[projectedIndex]
        : "";
      const resolvedMove = !trackMoves && expectedMove && matchesMoveLoosely(baseMove, expectedMove)
        ? expectedMove
        : baseMove;

      projectedIndex += 1;

      return {
        ...record,
        move: resolvedMove,
      };
    });

    setTrainerMoveHistory((prev) => [...prev, ...normalizedMoves]);
    setUserMoves((prev) => [...prev, ...normalizedMoves.map((m) => m.move)]);
  }, [moveHistory, algorithmMoves, trackMoves, userMoves.length]);

  useEffect(() => {
    if (trainerMoveHistory.length === 0 || attemptStartedAtRef.current !== null) return;
    attemptStartedAtRef.current = trainerMoveHistory[0].localTimestamp;
  }, [trainerMoveHistory]);

  const trainerTimes = useTrainerTimes(selectedCase.id);
  const topSolved = useMemo(() => isTopFaceSolved(virtualFacelets), [virtualFacelets]);

  useEffect(() => {
    if (
      (trackMoves ? sequence.state !== "done" : !topSolved)
      || attemptStartedAtRef.current === null
      || trainerMoveHistory.length === 0
      || recordedSequenceRef.current === sequenceId
    ) {
      return;
    }

    const finishedAt = trainerMoveHistory[trainerMoveHistory.length - 1].localTimestamp;
    const elapsed = Math.max(0, finishedAt - attemptStartedAtRef.current);
    trainerTimes.addTime(selectedCase.id, elapsed);
    recordedSequenceRef.current = sequenceId;
  }, [trackMoves, sequence.state, sequenceId, selectedCase.id, topSolved, trainerMoveHistory, trainerTimes]);

  const feedback: TrainerFeedbackState = useMemo(() => {
    if (!trackMoves) {
      if (topSolved) return "completed";
      return userMoves.length > 0 ? "in_progress" : "ready";
    }

    switch (sequence.state) {
      case "error":
        return "incorrect";
      case "done":
        return "completed";
      case "running":
      case "half-turn":
        return userMoves.length > 0 ? "in_progress" : "ready";
      default:
        return "ready";
    }
  }, [trackMoves, sequence.state, topSolved, userMoves.length]);

  const nextExpectedMove = !trackMoves || sequence.state === "done"
    ? null
    : algorithmMoves[sequence.currentIndex] ?? null;

  const recentTimes = useMemo(
    () => trainerTimes.records.slice(-3).map((record) => record.elapsed).reverse(),
    [trainerTimes.records],
  );
  const averageOf5 = useMemo(() => averageOfLast(trainerTimes.records, 5), [trainerTimes.records]);
  const averageOf25 = useMemo(() => averageOfLast(trainerTimes.records, 25), [trainerTimes.records]);
  const averageOf50 = useMemo(() => averageOfLast(trainerTimes.records, 50), [trainerTimes.records]);

  const selectCase = useCallback((caseId: string) => {
    setSelectedCaseId(caseId);
    setAlignmentMove(randomAlignmentMove(alignmentMove));
    setAttempt((value) => value + 1);
  }, [alignmentMove]);

  const randomCase = useCallback(() => {
    const nextId = randomOLLTrainerCaseId(section, selectedCaseId);
    setSelectedCaseId(nextId);
    setAlignmentMove(randomAlignmentMove(alignmentMove));
    setAttempt((value) => value + 1);
  }, [alignmentMove, section, selectedCaseId]);

  const nextCase = useCallback(() => {
    const index = cases.findIndex((cse) => cse.id === selectedCaseId);
    const nextId = cases[(index + 1 + cases.length) % cases.length].id;
    setSelectedCaseId(nextId);
    setAlignmentMove(randomAlignmentMove(alignmentMove));
    setAttempt((value) => value + 1);
  }, [alignmentMove, cases, selectedCaseId]);

  const retryCase = useCallback(() => {
    setAlignmentMove(randomAlignmentMove(alignmentMove));
    setAttempt((value) => value + 1);
  }, [alignmentMove]);

  useEffect(() => {
    if (trackMoves ? sequence.state !== "done" : !topSolved) return;

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
  }, [trackMoves, sequence.state, topSolved, retryCase]);

  const toggleAlgorithm = useCallback(() => {
    setShownAlgorithm((value) => !value);
  }, []);

  const updateSection = useCallback((value: OLLTrainerSection) => {
    const nextId = randomOLLTrainerCaseId(value);
    setSection(value);
    setSelectedCaseId(nextId);
    setAlignmentMove(randomAlignmentMove());
    setAttempt((current) => current + 1);
  }, []);

  return {
    section,
    iteration: attempt,
    cases,
    selectedCase,
    virtualFacelets,
    algorithmMoves,
    sequence,
    trackMoves,
    topSolved,
    feedback,
    recentTimes,
    averageOf5,
    averageOf25,
    averageOf50,
    autoRetryCountdownMs,
    shownAlgorithm,
    nextExpectedMove,
    selectCase,
    randomCase,
    nextCase,
    retryCase,
    toggleAlgorithm,
    setSection: updateSection,
  };
}

function caseMatchesSection(cse: OLLTrainerCase, section: OLLTrainerSection): boolean {
  return section === "part1" ? cse.phase === "edges" : cse.phase === "corners";
}

function remapTrainerMove(move: string): string {
  if (!move) return move;

  const face = move[0];
  const suffix = move.slice(1);
  const map: Record<string, string> = {
    U: "D",
    D: "U",
    R: "L",
    L: "R",
    F: "F",
    B: "B",
    u: "d",
    d: "u",
    r: "l",
    l: "r",
    f: "f",
    b: "b",
  };

  return `${map[face] ?? face}${suffix}`;
}

function averageOfLast(records: Array<{ elapsed: number }>, count: number): number | null {
  if (records.length < count) return null;
  const window = records.slice(-count);
  return window.reduce((sum, record) => sum + record.elapsed, 0) / count;
}

function randomAlignmentMove(exclude?: string): string {
  const options = ["", "U", "U2", "U'"];
  const pool = options.filter((value) => value !== exclude);
  const source = pool.length > 0 ? pool : options;
  return source[Math.floor(Math.random() * source.length)];
}

function matchesMoveLoosely(actualMove: string, expectedMove: string): boolean {
  if (!actualMove || !expectedMove) return false;
  return actualMove[0].toUpperCase() === expectedMove[0].toUpperCase()
    && actualMove.slice(1) === expectedMove.slice(1);
}

function isTopFaceSolved(facelets: string): boolean {
  const top = facelets[4];
  for (let i = 0; i < 9; i++) {
    if (facelets[i] !== top) return false;
  }
  return true;
}
