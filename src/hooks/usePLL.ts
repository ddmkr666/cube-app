import { useEffect, useMemo, useRef, useState } from "react";
import { FaceletString, MoveRecord } from "../cube/types";
import { getAllF2LOrientedFacelets, isSolvedFacelets, remapMove, rotateMoveByAuf } from "../solver/oll";
import { PLLRecognition, recognizePLL } from "../solver/pll";
import { SequenceStatus, useMoveSequence } from "./useMoveSequence";

export interface PLLStatus {
  active: boolean;
  recognition: PLLRecognition | null;
  moves: string[];
  sequence: SequenceStatus;
  trackable: boolean;
}

function aufRank(auf: string): number {
  switch (auf) {
    case "":
      return 0;
    case "U":
    case "U'":
      return 1;
    case "U2":
      return 2;
    default:
      return 3;
  }
}

export function usePLL(
  facelets: FaceletString | null,
  moveHistory: MoveRecord[],
): PLLStatus {
  const [recognition, setRecognition] = useState<PLLRecognition | null>(null);
  const [algString, setAlgString] = useState<string>("");
  const [seqId, setSeqId] = useState<number>(0);
  const lastSequenceKeyRef = useRef<string>("");
  const [orientationIndex, setOrientationIndex] = useState<number | null>(null);
  const lockedTopColorRef = useRef<string | null>(null);
  const lockedBottomColorRef = useRef<string | null>(null);
  const lockedFrontColorRef = useRef<string | null>(null);
  const lockedBackColorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!facelets) {
      setRecognition(null);
      setOrientationIndex(null);
      lockedTopColorRef.current = null;
      lockedBottomColorRef.current = null;
      lockedFrontColorRef.current = null;
      lockedBackColorRef.current = null;
      if (lastSequenceKeyRef.current) {
        lastSequenceKeyRef.current = "";
        setAlgString("");
        setSeqId((i) => i + 1);
      }
      return;
    }

    if (isSolvedFacelets(facelets)) {
      setRecognition(null);
      setOrientationIndex(null);
      lockedTopColorRef.current = null;
      lockedBottomColorRef.current = null;
      lockedFrontColorRef.current = null;
      lockedBackColorRef.current = null;
      if (lastSequenceKeyRef.current) {
        lastSequenceKeyRef.current = "";
        setAlgString("");
        setSeqId((i) => i + 1);
      }
      return;
    }

    const orientedCandidates = getAllF2LOrientedFacelets(facelets);
    if (orientedCandidates.length === 0) return;

    const filteredCandidates = orientedCandidates.filter((candidate) => {
      const topColor = candidate.facelets[4];
      const bottomColor = candidate.facelets[31];
      const frontColor = candidate.facelets[22];
      const backColor = candidate.facelets[49];

      if (lockedTopColorRef.current && topColor !== lockedTopColorRef.current) return false;
      if (lockedBottomColorRef.current && bottomColor !== lockedBottomColorRef.current) return false;
      if (lockedFrontColorRef.current && frontColor !== lockedFrontColorRef.current) return false;
      if (lockedBackColorRef.current && backColor !== lockedBackColorRef.current) return false;
      return true;
    });

    const candidates = filteredCandidates.length > 0 ? filteredCandidates : orientedCandidates;

    const best = candidates
      .map((candidate) => ({
        candidate,
        recognition: recognizePLL(candidate.facelets),
      }))
      .sort((a, b) => {
        const aCase = a.recognition.case ? 0 : 1;
        const bCase = b.recognition.case ? 0 : 1;
        if (aCase !== bCase) return aCase - bCase;

        const aAuf = aufRank(a.recognition.auf);
        const bAuf = aufRank(b.recognition.auf);
        if (aAuf !== bAuf) return aAuf - bAuf;

        return a.candidate.orientationIndex - b.candidate.orientationIndex;
      })[0];

    const r = best.recognition;

    // PLL algorithms can temporarily create non-OLL top patterns mid-sequence.
    // If we're already guiding a PLL case, keep that guidance until the solve
    // state stabilizes again instead of falling back to OLL.
    if (lastSequenceKeyRef.current && r.phase === "done") {
      return;
    }

    setRecognition(r);
    setOrientationIndex(best.candidate.orientationIndex);
    lockedTopColorRef.current = best.candidate.facelets[4];
    lockedBottomColorRef.current = best.candidate.facelets[31];
    lockedFrontColorRef.current = best.candidate.facelets[22];
    lockedBackColorRef.current = best.candidate.facelets[49];

    const nextSequenceKey = r.case ? `${r.case.id}:${r.auf}` : "";
    if (nextSequenceKey !== lastSequenceKeyRef.current) {
      lastSequenceKeyRef.current = nextSequenceKey;
      setAlgString(r.case?.alg ?? "");
      setSeqId((i) => i + 1);
    }
  }, [facelets]);

  const moves = useMemo(
    () => (algString ? algString.split(" ").filter(Boolean) : []),
    [algString],
  );

  const trackable = useMemo(
    () => moves.every((move) => !/^[xyz]/i.test(move)),
    [moves],
  );

  const remappedHistory = useMemo(() => {
    if (orientationIndex === null) return moveHistory;
    return moveHistory.map((m) => ({
      ...m,
      move: rotateMoveByAuf(remapMove(m.move, orientationIndex), recognition?.auf ?? ""),
    }));
  }, [moveHistory, orientationIndex, recognition?.auf]);

  const sequence = useMoveSequence(
    moves,
    trackable && algString ? seqId : null,
    remappedHistory,
    { ignoreLeadingFaces: ["U"] },
  );

  return {
    active: recognition !== null && recognition.phase !== "done",
    recognition,
    moves,
    sequence,
    trackable,
  };
}
