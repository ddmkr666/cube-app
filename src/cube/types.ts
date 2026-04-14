/**
 * Cube domain types.
 *
 * Facelet convention follows Kociemba / standard speedcubing notation:
 *   URFDLB — 54 characters, 9 per face, in the order U, R, F, D, L, B.
 *
 * Each face's 9 facelets are indexed row-major from the viewer's perspective
 * when looking straight at that face with the standard WCA orientation
 * (white up, green front).
 */

export type Face = "U" | "R" | "F" | "D" | "L" | "B";

export const FACE_ORDER: readonly Face[] = ["U", "R", "F", "D", "L", "B"] as const;

/** A 54-character facelet string, one char per sticker. */
export type FaceletString = string;

/** A normalized cube state — facelet string plus parsed per-face grid. */
export interface CubeState {
  facelets: FaceletString;
  /** Per-face 3x3 grid of face letters, indexed [row][col]. */
  faces: Record<Face, Face[][]>;
}

/** A recorded move event. */
export interface MoveRecord {
  move: string;              // e.g. "R", "U'", "F2"
  serial: number;            // monotonic move index from the cube
  cubeTimestamp?: number;    // cube-local ms
  localTimestamp: number;    // browser performance.now() ms
}
