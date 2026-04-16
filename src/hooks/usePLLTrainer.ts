import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RawQuaternion } from "../bluetooth/ganCube";
import { MoveRecord } from "../cube/types";
import { applyMovesToFacelets } from "../cube/moves";
import { getInverseMove } from "../cube/scramble";
import { SequenceStatus, useMoveSequence } from "./useMoveSequence";
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
export type PLLTrainerSection = "part1" | "part2";

export interface PLLTrainerStatus {
  section: PLLTrainerSection;
  cases: PLLTrainerCase[];
  selectedCase: PLLTrainerCase;
  virtualFacelets: string;
  algorithmMoves: string[];
  alignmentMove: string;
  sequence: SequenceStatus;
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
  setSection: (value: PLLTrainerSection) => void;
}

export function usePLLTrainer(
  moveHistory: MoveRecord[],
  gyroCurrentRef: React.MutableRefObject<RawQuaternion | null>,
  gyroResetRef: React.MutableRefObject<RawQuaternion | null>,
): PLLTrainerStatus {
  const [section, setSection] = useState<PLLTrainerSection>("part1");
  const [selectedCaseId, setSelectedCaseId] = useState<string>(() => randomPLLTrainerCaseId("part1"));
  const [shownAlgorithm, setShownAlgorithm] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [userMoves, setUserMoves] = useState<string[]>([]);
  const [trainerMoveHistory, setTrainerMoveHistory] = useState<MoveRecord[]>([]);
  const [autoRetryCountdownMs, setAutoRetryCountdownMs] = useState<number | null>(null);
  const [colorRotation, setColorRotation] = useState<0 | 1 | 2 | 3>(0);
  const [alignmentMove, setAlignmentMove] = useState<string>(() => randomAlignmentMove("corners"));
  const [edgeVariant, setEdgeVariant] = useState<number[]>(() => randomEdgeVariant("corners"));
  const prevSerialRef = useRef<number | null>(null);
  const freeAngleRotationRef = useRef<0 | 1 | 2 | 3 | null>(null);
  const attemptStartedAtRef = useRef<number | null>(null);
  const recordedSequenceRef = useRef<string | null>(null);
  const cases = useMemo(
    () => PLL_TRAINER_CASES.filter((cse) => caseMatchesSection(cse, section)),
    [section],
  );

  const selectedCase = useMemo(() => {
    const baseCase = getPLLTrainerCase(selectedCaseId);
    return withPLLTrainerEdgeVariant(baseCase, edgeVariant);
  }, [selectedCaseId, edgeVariant]);
  const trainerTimes = useTrainerTimes(selectedCaseId);

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

  const algorithmMoves = useMemo(
    () => selectedCase.algorithm.split(" ").filter(Boolean),
    [selectedCase.algorithm],
  );

  const sequenceId = `${selectedCase.id}:${attempt}`;

  const sequence = useMoveSequence(
    algorithmMoves,
    sequenceId,
    trainerMoveHistory,
    { ignoreLeadingFaces: ["U"] },
  );

  useEffect(() => {
    prevSerialRef.current = moveHistory.length > 0
      ? moveHistory[moveHistory.length - 1].serial
      : null;
    freeAngleRotationRef.current = null;
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

    const normalizedMoves = newMoves.map((record) => {
      const baseMove = remapTrainerMove(record.move);
      const lockedRotation = getTrainerFrameRotation(
        baseMove,
        freeAngleRotationRef.current,
        gyroCurrentRef.current,
        gyroResetRef.current,
      );

      if (freeAngleRotationRef.current === null && faceOf(baseMove) !== "U") {
        freeAngleRotationRef.current = lockedRotation;
      }

      return {
        ...record,
        move: rotateMoveToCanonicalFrame(baseMove, lockedRotation),
      };
    });

    setTrainerMoveHistory((prev) => [...prev, ...normalizedMoves]);
    setUserMoves((prev) => [...prev, ...normalizedMoves.map((m) => m.move)]);
  }, [moveHistory, gyroCurrentRef, gyroResetRef]);

  useEffect(() => {
    if (trainerMoveHistory.length === 0 || attemptStartedAtRef.current !== null) return;
    attemptStartedAtRef.current = trainerMoveHistory[0].localTimestamp;
  }, [trainerMoveHistory]);

  useEffect(() => {
    if (
      sequence.state !== "done"
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
  }, [sequence.state, sequenceId, selectedCase.id, trainerMoveHistory, trainerTimes]);

  const feedback: TrainerFeedbackState = useMemo(() => {
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
  }, [sequence.state, userMoves.length]);

  const nextExpectedMove = sequence.state === "done"
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
    const baseCase = getPLLTrainerCase(caseId);
    setSelectedCaseId(caseId);
    setColorRotation(randomColorRotation());
    setAlignmentMove(randomAlignmentMove(baseCase.phase));
    setEdgeVariant(randomEdgeVariant(baseCase.phase));
    setAttempt((value) => value + 1);
  }, []);

  const randomCase = useCallback(() => {
    const nextId = randomPLLTrainerCaseId(section, selectedCaseId);
    const baseCase = getPLLTrainerCase(nextId);
    setSelectedCaseId(nextId);
    setColorRotation(randomColorRotation());
    setAlignmentMove(randomAlignmentMove(baseCase.phase));
    setEdgeVariant(randomEdgeVariant(baseCase.phase));
    setAttempt((value) => value + 1);
  }, [section, selectedCaseId]);

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
    setColorRotation(randomColorRotation(colorRotation));
    setAlignmentMove(randomAlignmentMove(selectedCase.phase, alignmentMove));
    setEdgeVariant(randomEdgeVariant(selectedCase.phase, edgeVariant));
    setAttempt((value) => value + 1);
  }, [alignmentMove, colorRotation, edgeVariant, selectedCase.phase]);

  useEffect(() => {
    if (sequence.state !== "done") return;

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
  }, [sequence.state, retryCase]);

  const toggleAlgorithm = useCallback(() => {
    setShownAlgorithm((value) => !value);
  }, []);

  const updateSection = useCallback((value: PLLTrainerSection) => {
    const nextId = randomPLLTrainerCaseId(value);
    const baseCase = getPLLTrainerCase(nextId);
    setSection(value);
    setSelectedCaseId(nextId);
    setColorRotation(randomColorRotation());
    setAlignmentMove(randomAlignmentMove(baseCase.phase));
    setEdgeVariant(randomEdgeVariant(baseCase.phase));
    setAttempt((current) => current + 1);
  }, []);

  return {
    section,
    cases,
    selectedCase,
    virtualFacelets,
    algorithmMoves,
    alignmentMove,
    sequence,
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
  const options = phase === "corners" ? ["", "U", "U2", "U'"] : [""];
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

function caseMatchesSection(cse: PLLTrainerCase, section: PLLTrainerSection): boolean {
  return section === "part1" ? cse.phase === "corners" : cse.phase === "edges";
}

function faceOf(move: string): string {
  return move[0];
}

function getTrainerFrameRotation(
  move: string,
  lockedRotation: 0 | 1 | 2 | 3 | null,
  gyroCurrent: RawQuaternion | null,
  gyroReset: RawQuaternion | null,
): 0 | 1 | 2 | 3 {
  if (lockedRotation !== null) return lockedRotation;
  if (faceOf(move) === "U") return 0;
  return currentTrainerYawRotation(gyroCurrent, gyroReset);
}

function rotateMoveToCanonicalFrame(move: string, rotation: 0 | 1 | 2 | 3): string {
  if (!move || rotation === 0) return move;

  const face = move[0];
  const suffix = move.slice(1);
  const maps: Array<Record<string, string>> = [
    { F: "F", R: "R", B: "B", L: "L", f: "f", r: "r", b: "b", l: "l" },
    { F: "L", R: "F", B: "R", L: "B", f: "l", r: "f", b: "r", l: "b" },
    { F: "B", R: "L", B: "F", L: "R", f: "b", r: "l", b: "f", l: "r" },
    { F: "R", R: "B", B: "L", L: "F", f: "r", r: "b", b: "l", l: "f" },
  ];

  return `${maps[rotation][face] ?? face}${suffix}`;
}

const BASIS = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2);
const BASIS_INV = BASIS.clone().invert();
const TRAINER_FRAME = new THREE.Quaternion(0, 0, 1, 0);
const TRAINER_FRAME_INV = TRAINER_FRAME.clone().invert();
const FORWARD = new THREE.Vector3(0, 0, 1);

function ganToThree(q: RawQuaternion): THREE.Quaternion {
  const ganQ = new THREE.Quaternion(q.x, q.y, q.z, q.w);
  return BASIS.clone().multiply(ganQ).multiply(BASIS_INV);
}

function currentTrainerYawRotation(
  gyroCurrent: RawQuaternion | null,
  gyroReset: RawQuaternion | null,
): 0 | 1 | 2 | 3 {
  if (!gyroCurrent) return 0;

  const current = ganToThree(gyroCurrent);
  const target = gyroReset
    ? ganToThree(gyroReset).invert().multiply(current)
    : current;

  target.premultiply(TRAINER_FRAME).multiply(TRAINER_FRAME_INV);
  const forward = FORWARD.clone().applyQuaternion(target);
  const angle = Math.atan2(forward.x, forward.z);
  const quarterTurns = Math.round(angle / (Math.PI / 2));
  return (((quarterTurns % 4) + 4) % 4) as 0 | 1 | 2 | 3;
}

function averageOfLast(records: Array<{ elapsed: number }>, count: number): number | null {
  if (records.length < count) return null;
  const window = records.slice(-count);
  return window.reduce((sum, record) => sum + record.elapsed, 0) / count;
}
