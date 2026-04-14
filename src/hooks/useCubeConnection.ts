import { useEffect, useMemo, useRef, useState } from "react";
import { ConnectionStatus, GanCubeService } from "../bluetooth/ganCube";
import { MoveRecord } from "../cube/types";
import { SOLVED_FACELETS, isSolved } from "../cube/facelets";

const MAX_MOVE_HISTORY = 64;

export interface CubeConnectionState {
  status: ConnectionStatus;
  facelets: string;
  lastMove: MoveRecord | null;
  moveHistory: MoveRecord[];
  solved: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  requestFacelets: () => Promise<void>;
  markSolved: () => Promise<void>;
}

/**
 * React-facing bridge to the Bluetooth service. Owns the service instance
 * for the lifetime of the component tree and mirrors its observables into
 * React state.
 */
export function useCubeConnection(): CubeConnectionState {
  const service = useMemo(() => new GanCubeService(), []);
  const lastMoveRef = useRef<MoveRecord | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>({ state: "disconnected" });
  const [facelets, setFacelets] = useState<string>(SOLVED_FACELETS);
  const [lastMove, setLastMove] = useState<MoveRecord | null>(null);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);

  useEffect(() => {
    const s1 = service.status$.subscribe(setStatus);
    const s2 = service.updates$.subscribe((u) => {
      if (u.facelets) setFacelets(u.facelets);
      if (u.lastMove) {
        const rec: MoveRecord = {
          move: u.lastMove.move,
          serial: u.lastMove.serial,
          localTimestamp: u.lastMove.localTimestamp,
        };
        // Guard against duplicated serials (BLE occasionally replays).
        if (lastMoveRef.current?.serial === rec.serial) return;
        lastMoveRef.current = rec;
        setLastMove(rec);
        setMoveHistory((h) => {
          const next = [...h, rec];
          return next.length > MAX_MOVE_HISTORY
            ? next.slice(next.length - MAX_MOVE_HISTORY)
            : next;
        });
      }
    });
    return () => {
      s1.unsubscribe();
      s2.unsubscribe();
      void service.disconnect();
    };
  }, [service]);

  return {
    status,
    facelets,
    lastMove,
    moveHistory,
    solved: isSolved(facelets),
    connect: () => service.connect(),
    disconnect: () => service.disconnect(),
    requestFacelets: () => service.requestFacelets(),
    markSolved: () => service.markSolved(),
  };
}
