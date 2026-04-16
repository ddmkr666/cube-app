import { useEffect, useMemo, useRef, useState } from "react";
import { FaceletString, MoveRecord } from "../cube/types";
import { recognizeOLL, getAllF2LOrientedFacelets, isSolvedFacelets, OLLRecognition, remapMove, rotateMoveByAuf } from "../solver/oll";
import { useMoveSequence, SequenceStatus } from "./useMoveSequence";

export interface OLLStatus {
  active: boolean;
  recognition: OLLRecognition | null;
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

/**
 * Detects when the cube has F2L solved and runs OLL recognition on the remaining
 * U layer. Whenever the recognised algorithm changes (including AUF prefix), the
 * tracked sequence resets so the user follows the newly-displayed alg from move 0.
 */
export function useOLL(
  facelets: FaceletString | null,
  moveHistory: MoveRecord[],
): OLLStatus {
  const [recognition, setRecognition] = useState<OLLRecognition | null>(null);
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
    if (orientedCandidates.length === 0) {
      // If F2L is broken, we DON'T clear. This allows the user to follow the
      // OLL sequence even when it temporarily breaks the bottom two layers.
      return;
    }

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
        recognition: recognizeOLL(candidate.facelets),
      }))
      .sort((a, b) => {
        const aRank = a.recognition.phase === "done" ? 0 : a.recognition.case ? 1 : 2;
        const bRank = b.recognition.phase === "done" ? 0 : b.recognition.case ? 1 : 2;
        if (aRank !== bRank) return aRank - bRank;

        const aAuf = aufRank(a.recognition.auf);
        const bAuf = aufRank(b.recognition.auf);
        if (aAuf !== bAuf) return aAuf - bAuf;

        return a.candidate.orientationIndex - b.candidate.orientationIndex;
      })[0];

    const r = best.recognition;
    if (!r.case && r.phase !== "done") {
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
    () => moves.every((move) => !/^[MESxyz]/i.test(move)),
    [moves],
  );

  // Remap moves from the physical cube to the virtual "F2L-oriented" frame.
  const remappedHistory = useMemo(() => {
    if (orientationIndex === null) return moveHistory;
    return moveHistory.map(m => ({
      ...m,
      move: rotateMoveByAuf(remapMove(m.move, orientationIndex), recognition?.auf ?? "")
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
