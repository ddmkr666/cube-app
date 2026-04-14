import { Subject, Subscription } from "rxjs";
import {
  connectGanCube,
  GanCubeConnection,
  GanCubeEvent,
} from "gan-web-bluetooth";
import { FaceletString } from "../cube/types";

export type ConnectionStatus =
  | { state: "disconnected" }
  | { state: "connecting" }
  | { state: "connected"; deviceName: string }
  | { state: "error"; message: string };

export interface CubeUpdate {
  facelets?: FaceletString;
  lastMove?: { move: string; serial: number; localTimestamp: number };
}

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
  private connection: GanCubeConnection | null = null;
  private sub: Subscription | null = null;

  readonly updates$ = new Subject<CubeUpdate>();
  readonly status$ = new Subject<ConnectionStatus>();

  async connect(): Promise<void> {
    if (this.connection) return;
    this.status$.next({ state: "connecting" });
    try {
      const conn = await connectGanCube();
      this.connection = conn;

      this.sub = conn.events$.subscribe((evt: GanCubeEvent) => {
        this.handleEvent(evt);
      });

      this.status$.next({
        state: "connected",
        deviceName: conn.deviceName || "GAN cube",
      });

      // Prime the UI with the current physical state.
      await this.requestFacelets();
    } catch (e) {
      this.connection = null;
      this.status$.next({
        state: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async disconnect(): Promise<void> {
    this.sub?.unsubscribe();
    this.sub = null;
    try {
      await this.connection?.disconnect();
    } catch {
      // ignore
    }
    this.connection = null;
    this.status$.next({ state: "disconnected" });
  }

  async requestFacelets(): Promise<void> {
    if (!this.connection) return;
    await this.connection.sendCubeCommand({ type: "REQUEST_FACELETS" });
  }

  /**
   * Tell the cube its current physical orientation IS solved.
   *
   * GAN cubes track state relative to whatever they last considered solved,
   * so if the app opens mid-scramble or with the cube in an unknown starting
   * orientation, the reported facelets drift from reality. The user holds
   * the cube physically solved, hits this, and the two snap back in sync.
   */
  async markSolved(): Promise<void> {
    if (!this.connection) return;
    await this.connection.sendCubeCommand({ type: "REQUEST_RESET" });
    await this.connection.sendCubeCommand({ type: "REQUEST_FACELETS" });
  }

  private handleEvent(evt: GanCubeEvent) {
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
