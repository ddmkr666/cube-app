import { useEffect, useMemo, useRef, useState } from "react";
import { FaceletString, MoveRecord } from "../cube/types";
import { recognizeOLL, getAllF2LOrientedFacelets, isSolvedFacelets, OLLRecognition, remapMove, rotateMoveByAuf } from "../solver/oll";
import { useMoveSequence, SequenceStatus } from "./useMoveSequence";

export interface OLLStatus {
  active: boolean;
  recognition: OLLRecognition | null;
  moves: string[];
  sequence: SequenceStatus;
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

  useEffect(() => {
    if (!facelets) {
      setRecognition(null);
      setOrientationIndex(null);
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

    const best = orientedCandidates
      .map((candidate) => ({
        candidate,
        recognition: recognizeOLL(candidate.facelets),
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
    setRecognition(r);
    setOrientationIndex(best.candidate.orientationIndex);
    
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

  // Remap moves from the physical cube to the virtual "F2L-oriented" frame.
  const remappedHistory = useMemo(() => {
    if (orientationIndex === null) return moveHistory;
    return moveHistory.map(m => ({
      ...m,
      move: rotateMoveByAuf(remapMove(m.move, orientationIndex), recognition?.auf ?? "")
    }));
  }, [moveHistory, orientationIndex, recognition?.auf]);

  const sequence = useMoveSequence(moves, algString ? seqId : null, remappedHistory);

  return {
    active: recognition !== null && recognition.phase !== "done",
    recognition,
    moves,
    sequence,
  };
}
