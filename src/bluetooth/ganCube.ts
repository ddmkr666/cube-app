import { Subject, Subscription } from "rxjs";
import {
  connectGanCube,
  GanCubeConnection,
  GanCubeEvent,
} from "gan-web-bluetooth";
import { FaceletString } from "../cube/types";

const MAC_STORAGE_PREFIX = "cube-app:gan-mac:";

function normalizeMacAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  const hex = value.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  if (hex.length !== 12) return null;

  const parts = hex.match(/.{1,2}/g);
  return parts ? parts.join(":") : null;
}

function macStorageKey(device: BluetoothDevice): string {
  return `${MAC_STORAGE_PREFIX}${device.id}`;
}

async function getCubeMacAddress(
  device: BluetoothDevice,
  isFallbackCall?: boolean,
): Promise<string | null> {
  const storageKey = macStorageKey(device);
  const cached = normalizeMacAddress(localStorage.getItem(storageKey));
  if (cached) return cached;

  if (!isFallbackCall) return null;

  const entered = window.prompt(
    [
      `Chrome couldn't auto-detect the MAC address for ${device.name ?? "this GAN cube"}.`,
      "Enter the cube MAC address (for example AB:12:34:5D:34:12).",
      "Tip: In Chrome on Windows, open chrome://bluetooth-internals/#devices and scan for the cube.",
    ].join("\n"),
  );

  const normalized = normalizeMacAddress(entered);
  if (normalized) {
    localStorage.setItem(storageKey, normalized);
    return normalized;
  }

  return null;
}

export type ConnectionStatus =
  | { state: "disconnected" }
  | { state: "connecting" }
  | { state: "connected"; deviceName: string }
  | { state: "error"; message: string };

export interface RawQuaternion {
  x: number; y: number; z: number; w: number;
}

export interface CubeUpdate {
  facelets?: { value: FaceletString; serial: number; localTimestamp: number };
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
  private gyroFaceletsTimer: number | null = null;
  private faceletsRequestInFlight = false;
  private suppressGyroFaceletsUntil = 0;

  readonly updates$ = new Subject<CubeUpdate>();
  readonly status$ = new Subject<ConnectionStatus>();
  /** High-frequency gyro stream — kept separate to avoid flooding updates$. */
  readonly gyro$ = new Subject<RawQuaternion>();

  async connect(): Promise<void> {
    if (this.connection) return;
    this.status$.next({ state: "connecting" });
    try {
      const conn = await connectGanCube(getCubeMacAddress);
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
    if (this.gyroFaceletsTimer !== null) {
      window.clearTimeout(this.gyroFaceletsTimer);
      this.gyroFaceletsTimer = null;
    }
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
    if (this.faceletsRequestInFlight) return;
    this.faceletsRequestInFlight = true;
    try {
      await this.connection.sendCubeCommand({ type: "REQUEST_FACELETS" });
    } finally {
      this.faceletsRequestInFlight = false;
    }
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
    if (this.gyroFaceletsTimer !== null) {
      window.clearTimeout(this.gyroFaceletsTimer);
      this.gyroFaceletsTimer = null;
    }
    // Prevent the solve-mode gyro polling added on this branch from racing the
    // reset command and its immediate follow-up facelet request.
    this.suppressGyroFaceletsUntil = performance.now() + 600;
    await this.connection.sendCubeCommand({ type: "REQUEST_RESET" });
    await this.connection.sendCubeCommand({ type: "REQUEST_FACELETS" });
  }

  private handleEvent(evt: GanCubeEvent) {
    switch (evt.type) {
      case "FACELETS":
        if (evt.facelets.length === 54) {
          this.updates$.next({
            facelets: {
              value: evt.facelets,
              serial: evt.serial,
              localTimestamp: performance.now(),
            },
          });
        }
        return;
      case "MOVE":
        if (this.gyroFaceletsTimer !== null) {
          window.clearTimeout(this.gyroFaceletsTimer);
          this.gyroFaceletsTimer = null;
        }
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
      case "GYRO":
        this.gyro$.next(evt.quaternion);
        this.scheduleFaceletRefreshFromGyro();
        return;
      case "DISCONNECT":
        if (this.gyroFaceletsTimer !== null) {
          window.clearTimeout(this.gyroFaceletsTimer);
          this.gyroFaceletsTimer = null;
        }
        this.connection = null;
        this.status$.next({ state: "disconnected" });
        return;
      default:
        return;
    }
  }

  private scheduleFaceletRefreshFromGyro() {
    if (!this.connection) return;
    if (performance.now() < this.suppressGyroFaceletsUntil) return;

    if (this.gyroFaceletsTimer !== null) {
      window.clearTimeout(this.gyroFaceletsTimer);
    }

    // Wide and slice turns can show up as gyro-only activity on some cubes.
    // A short debounce keeps solve-mode facelets fresh without spamming BLE writes.
    this.gyroFaceletsTimer = window.setTimeout(() => {
      this.gyroFaceletsTimer = null;
      void this.requestFacelets();
    }, 140);
  }
}
