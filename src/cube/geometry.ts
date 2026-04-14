import { Face } from "./types";

/**
 * Maps each of the 54 facelet indices to a 3D cubie coordinate and outward
 * face normal. This is the single source of truth that the renderer uses
 * to paint sticker colors onto the 3D cube, and that future analysis code
 * can use to reason about piece positions.
 *
 * Coordinate system:
 *   x: -1 (L)   .. +1 (R)
 *   y: -1 (D)   .. +1 (U)
 *   z: -1 (back).. +1 (F)
 *
 * Facelet order within the 54-char string is URFDLB, row-major when
 * looking straight at each face in standard WCA orientation.
 */

export type Axis = "x" | "y" | "z";
export type Sign = 1 | -1;

export interface FaceletGeometry {
  index: number;        // 0..53
  face: Face;           // which face this facelet belongs to
  /** Cubie coordinates, each in {-1, 0, 1}. */
  pos: [number, number, number];
  /** Outward-pointing face normal axis + sign. */
  normal: { axis: Axis; sign: Sign };
}

/**
 * For a given face, list the (x,y,z) positions of its 9 facelets in the
 * order they appear in the facelet string (row-major, viewer perspective).
 */
function positionsForFace(face: Face): [number, number, number][] {
  const pos: [number, number, number][] = [];
  switch (face) {
    case "U": // y = +1, rows back(-z) -> front(+z), cols left(-x) -> right(+x)
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) pos.push([c - 1, 1, r - 1]);
      return pos;
    case "D": // y = -1, rows front(+z) -> back(-z), cols left(-x) -> right(+x)
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) pos.push([c - 1, -1, 1 - r]);
      return pos;
    case "F": // z = +1, rows top(+y) -> bottom(-y), cols left(-x) -> right(+x)
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) pos.push([c - 1, 1 - r, 1]);
      return pos;
    case "B": // z = -1, viewed from behind: cols right(+x) -> left(-x), rows top -> bottom
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) pos.push([1 - c, 1 - r, -1]);
      return pos;
    case "R": // x = +1, viewed from right: cols front(+z) -> back(-z), rows top -> bottom
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) pos.push([1, 1 - r, 1 - c]);
      return pos;
    case "L": // x = -1, viewed from left: cols back(-z) -> front(+z), rows top -> bottom
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) pos.push([-1, 1 - r, c - 1]);
      return pos;
  }
}

const FACE_NORMAL: Record<Face, { axis: Axis; sign: Sign }> = {
  U: { axis: "y", sign: 1 },
  D: { axis: "y", sign: -1 },
  F: { axis: "z", sign: 1 },
  B: { axis: "z", sign: -1 },
  R: { axis: "x", sign: 1 },
  L: { axis: "x", sign: -1 },
};

const FACE_ORDER_GEOM: Face[] = ["U", "R", "F", "D", "L", "B"];

export const FACELET_GEOMETRY: readonly FaceletGeometry[] = (() => {
  const out: FaceletGeometry[] = [];
  FACE_ORDER_GEOM.forEach((face, fi) => {
    const positions = positionsForFace(face);
    const normal = FACE_NORMAL[face];
    positions.forEach((pos, i) => {
      out.push({ index: fi * 9 + i, face, pos, normal });
    });
  });
  return out;
})();
