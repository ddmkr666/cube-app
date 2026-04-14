import { useEffect, useMemo, useRef, useState } from "react";
import { GanCubeService } from "../bluetooth/ganCube";
import { SOLVED_FACELETS, isSolved } from "../cube/facelets";
const MAX_MOVE_HISTORY = 64;
/**
 * React-facing bridge to the Bluetooth service. Owns the service instance
 * for the lifetime of the component tree and mirrors its observables into
 * React state.
 */
export function useCubeConnection() {
    const service = useMemo(() => new GanCubeService(), []);
    const lastMoveRef = useRef(null);
    const [status, setStatus] = useState({ state: "disconnected" });
    const [facelets, setFacelets] = useState(SOLVED_FACELETS);
    const [lastMove, setLastMove] = useState(null);
    const [moveHistory, setMoveHistory] = useState([]);
    useEffect(() => {
        const s1 = service.status$.subscribe(setStatus);
        const s2 = service.updates$.subscribe((u) => {
            if (u.facelets)
                setFacelets(u.facelets);
            if (u.lastMove) {
                const rec = {
                    move: u.lastMove.move,
                    serial: u.lastMove.serial,
                    localTimestamp: u.lastMove.localTimestamp,
                };
                // Guard against duplicated serials (BLE occasionally replays).
                if (lastMoveRef.current?.serial === rec.serial)
                    return;
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
    };
}
