import { Subject } from "rxjs";
import { connectGanCube, } from "gan-web-bluetooth";
/**
 * Thin adapter over `gan-web-bluetooth`.
 *
 * Responsibilities kept small on purpose:
 *   - own the connection lifecycle
 *   - normalize raw GAN events into `CubeUpdate` objects
 *   - expose a status observable so UI can render without knowing BLE details
 *
 * Rendering and cube analysis never import from `gan-web-bluetooth` directly,
 * so swapping this layer (or adding new cubes later) stays localized here.
 */
export class GanCubeService {
    connection = null;
    sub = null;
    updates$ = new Subject();
    status$ = new Subject();
    async connect() {
        if (this.connection)
            return;
        this.status$.next({ state: "connecting" });
        try {
            const conn = await connectGanCube();
            this.connection = conn;
            this.sub = conn.events$.subscribe((evt) => {
                this.handleEvent(evt);
            });
            this.status$.next({
                state: "connected",
                deviceName: conn.deviceName || "GAN cube",
            });
            // Prime the UI with the current physical state.
            await this.requestFacelets();
        }
        catch (e) {
            this.connection = null;
            this.status$.next({
                state: "error",
                message: e instanceof Error ? e.message : String(e),
            });
        }
    }
    async disconnect() {
        this.sub?.unsubscribe();
        this.sub = null;
        try {
            await this.connection?.disconnect();
        }
        catch {
            // ignore
        }
        this.connection = null;
        this.status$.next({ state: "disconnected" });
    }
    async requestFacelets() {
        if (!this.connection)
            return;
        await this.connection.sendCubeCommand({ type: "REQUEST_FACELETS" });
    }
    handleEvent(evt) {
        switch (evt.type) {
            case "FACELETS":
                if (evt.facelets.length === 54) {
                    this.updates$.next({ facelets: evt.facelets });
                }
                return;
            case "MOVE":
                this.updates$.next({
                    lastMove: {
                        move: evt.move,
                        serial: evt.serial,
                        localTimestamp: performance.now(),
                    },
                });
                // Move events drive the UI, but facelets remain the source of truth —
                // request a fresh snapshot so the 3D view can't drift from reality.
                void this.requestFacelets();
                return;
            case "DISCONNECT":
                this.connection = null;
                this.status$.next({ state: "disconnected" });
                return;
            default:
                return;
        }
    }
}
