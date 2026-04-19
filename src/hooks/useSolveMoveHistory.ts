import { useEffect, useRef, useState } from "react";
import { inferMoveFromFacelets } from "../cube/moves";
import { MoveRecord } from "../cube/types";

const MAX_MOVE_HISTORY = 64;

export interface SolveMoveHistoryState {
  lastMove: MoveRecord | null;
  moveHistory: MoveRecord[];
}

export function useSolveMoveHistory(
  facelets: string,
  faceletSerial: number | null,
  faceletTimestamp: number | null,
): SolveMoveHistoryState {
  const [lastMove, setLastMove] = useState<MoveRecord | null>(null);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const previousFaceletsRef = useRef<string | null>(null);
  const previousSerialRef = useRef<number | null>(null);

  useEffect(() => {
    if (!facelets || faceletSerial === null) return;

    if (previousFaceletsRef.current === null) {
      previousFaceletsRef.current = facelets;
      previousSerialRef.current = faceletSerial;
      return;
    }

    if (previousSerialRef.current === faceletSerial) {
      previousFaceletsRef.current = facelets;
      return;
    }

    const previousFacelets = previousFaceletsRef.current;
    previousFaceletsRef.current = facelets;
    previousSerialRef.current = faceletSerial;

    if (!previousFacelets || previousFacelets === facelets) return;

    const move = inferMoveFromFacelets(previousFacelets, facelets);
    if (!move) return;

    const record: MoveRecord = {
      move,
      serial: faceletSerial,
      localTimestamp: faceletTimestamp ?? performance.now(),
    };

    setLastMove(record);
    setMoveHistory((history) => {
      if (history[history.length - 1]?.serial === record.serial) return history;
      const next = [...history, record];
      return next.length > MAX_MOVE_HISTORY
        ? next.slice(next.length - MAX_MOVE_HISTORY)
        : next;
    });
  }, [facelets, faceletSerial, faceletTimestamp]);

  return { lastMove, moveHistory };
}
