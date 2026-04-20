import { useEffect, useMemo, useRef, useState } from "react";
import { ConnectionStatus, GanCubeService, RawQuaternion } from "../bluetooth/ganCube";
import { MoveRecord } from "../cube/types";
import { SOLVED_FACELETS, isSolved } from "../cube/facelets";

const MAX_MOVE_HISTORY = 64;

export interface CubeConnectionState {
  status: ConnectionStatus;
  facelets: string;
  faceletSerial: number | null;
  faceletTimestamp: number | null;
  lastMove: MoveRecord | null;
  moveHistory: MoveRecord[];
  solved: boolean;
  /** Current gyro quaternion from the cube, updated at sensor rate (~30 Hz). Ref — no re-renders. */
  gyroCurrentRef: React.MutableRefObject<RawQuaternion | null>;
  /** Quaternion captured when user hit "Reset Gyro". Null until first reset. */
  gyroResetRef: React.MutableRefObject<RawQuaternion | null>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  requestFacelets: () => Promise<void>;
  markSolved: () => Promise<void>;
  resetGyro: () => void;
}

/**
 * React-facing bridge to the Bluetooth service. Owns the service instance
 * for the lifetime of the component tree and mirrors its observables into
 * React state.
 */
export function useCubeConnection(): CubeConnectionState {
  const service = useMemo(() => new GanCubeService(), []);
  const lastMoveRef = useRef<MoveRecord | null>(null);
  const gyroCurrentRef = useRef<RawQuaternion | null>(null);
  const gyroResetRef = useRef<RawQuaternion | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>({ state: "disconnected" });
  const [facelets, setFacelets] = useState<string>(SOLVED_FACELETS);
  const [faceletSerial, setFaceletSerial] = useState<number | null>(null);
  const [faceletTimestamp, setFaceletTimestamp] = useState<number | null>(null);
  const [lastMove, setLastMove] = useState<MoveRecord | null>(null);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);

  useEffect(() => {
    const s1 = service.status$.subscribe(setStatus);
    const s3 = service.gyro$.subscribe((q) => {
      gyroCurrentRef.current = q;
    });
    const s2 = service.updates$.subscribe((u) => {
      if (u.facelets) {
        setFacelets(u.facelets.value);
        setFaceletSerial(u.facelets.serial);
        setFaceletTimestamp(u.facelets.localTimestamp);
      }
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
      s3.unsubscribe();
      void service.disconnect();
    };
  }, [service]);

  return {
    status,
    facelets,
    faceletSerial,
    faceletTimestamp,
    lastMove,
    moveHistory,
    solved: isSolved(facelets),
    connect: () => service.connect(),
    disconnect: () => service.disconnect(),
    requestFacelets: () => service.requestFacelets(),
    markSolved: async () => {
      setFacelets(SOLVED_FACELETS);
      setFaceletSerial(null);
      setFaceletTimestamp(null);
      setLastMove(null);
      setMoveHistory([]);
      lastMoveRef.current = null;
      await service.markSolved();
    },
    gyroCurrentRef,
    gyroResetRef,
    resetGyro: () => {
      if (gyroCurrentRef.current) {
        gyroResetRef.current = { ...gyroCurrentRef.current };
      }
    },
  };
}
