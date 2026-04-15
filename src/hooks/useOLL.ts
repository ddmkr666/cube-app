import { useEffect, useMemo, useRef, useState } from "react";
import { FaceletString, MoveRecord } from "../cube/types";
import { recognizeOLL, getF2LOrientedFacelets, isSolvedFacelets, OLLRecognition, remapMove } from "../solver/oll";
import { useMoveSequence, SequenceStatus } from "./useMoveSequence";

export interface OLLStatus {
  active: boolean;
  recognition: OLLRecognition | null;
  moves: string[];
  sequence: SequenceStatus;
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
  const lastAlgRef = useRef<string>("");
  const [orientationIndex, setOrientationIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!facelets) {
      setRecognition(null);
      setOrientationIndex(null);
      if (lastAlgRef.current) {
        lastAlgRef.current = "";
        setAlgString("");
        setSeqId((i) => i + 1);
      }
      return;
    }

    if (isSolvedFacelets(facelets)) {
      setRecognition(null);
      setOrientationIndex(null);
      if (lastAlgRef.current) {
        lastAlgRef.current = "";
        setAlgString("");
        setSeqId((i) => i + 1);
      }
      return;
    }

    const oriented = getF2LOrientedFacelets(facelets);
    if (!oriented) {
      // If F2L is broken, we DON'T clear. This allows the user to follow the
      // OLL sequence even when it temporarily breaks the bottom two layers.
      return;
    }

    const r = recognizeOLL(oriented.facelets);
    setRecognition(r);
    setOrientationIndex(oriented.orientationIndex);
    
    const nextAlg = r.algWithAuf;
    if (nextAlg !== lastAlgRef.current) {
      lastAlgRef.current = nextAlg;
      setAlgString(nextAlg);
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
      move: remapMove(m.move, orientationIndex)
    }));
  }, [moveHistory, orientationIndex]);

  const sequence = useMoveSequence(moves, algString ? seqId : null, remappedHistory);

  return {
    active: recognition !== null && recognition.phase !== "done",
    recognition,
    moves,
    sequence,
  };
}
