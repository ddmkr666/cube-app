/**
 * 2-Look OLL recognition.
 *
 * Operates on a 54-char facelet string in URFDLB order.
 *
 * Corner orientation value for a U-layer corner:
 *   0 = U sticker on top
 *   1 = U sticker on the "clockwise" neighbour face (viewing from above)
 *   2 = U sticker on the "counter-clockwise" neighbour face
 *
 * Edge orientation: 1 if the U-layer edge's U sticker is on top, else 0.
 *
 * Canonical tuples are listed in the [UBL, UBR, UFR, UFL] / [UB, UR, UF, UL]
 * order. A U turn (90° clockwise viewed from above) right-rotates the tuple.
 * To recognise a case the runtime input is right-rotated k ∈ {0,1,2,3} times;
 * the match's k is the AUF prefix required before the canonical algorithm.
 */
import { FaceletString } from "../cube/types";

export type OLLPhase = "edges" | "corners" | "done";

export interface OLLCase {
  id: string;
  name: string;
  phase: "edges" | "corners";
  alg: string;             // canonical face-turn algorithm (no wide/rotation moves)
  /** Short human description of the visible pattern on top. */
  description: string;
}

export interface OLLRecognition {
  phase: OLLPhase;
  /** Present when phase is "edges" or "corners" and cube isn't solved. */
  case?: OLLCase;
  /** U-turn prefix to apply before the canonical alg, e.g. "", "U", "U2", "U'". */
  auf: string;
  /** Full alg with AUF prepended, ready to display and track. */
  algWithAuf: string;
  /** [UBL, UBR, UFR, UFL] as-read from the cube (for rendering the case image). */
  cornerState: number[];
  /** [UB, UR, UF, UL] as-read from the cube. */
  edgeState: number[];
}

// --- Facelet indexing helpers --------------------------------------------------
// URFDLB order: U=0-8, R=9-17, F=18-26, D=27-35, L=36-44, B=45-53.
const U = (i: number) => i;           // U face 0-8
const R = (i: number) => 9 + i;
const F = (i: number) => 18 + i;
const D = (i: number) => 27 + i;
const L = (i: number) => 36 + i;
const B = (i: number) => 45 + i;

/** True when D face + bottom two rows of F/R/B/L are solved (only U layer remains). */
export function isF2LDone(f: FaceletString): boolean {
  if (f.length !== 54) return false;
  // D face all match D center
  const dCenter = f[D(4)];
  for (let i = 0; i < 9; i++) if (f[D(i)] !== dCenter) return false;

  // Bottom two rows (indices 3..8) of each side must match its center (index 4).
  const sideFaces = [F, R, B, L];
  for (const faceFn of sideFaces) {
    const center = f[faceFn(4)];
    for (let i = 3; i < 9; i++) {
      if (f[faceFn(i)] !== center) return false;
    }
  }
  return true;
}

/** True when the entire cube is solved. */
export function isSolvedFacelets(f: FaceletString): boolean {
  for (let face = 0; face < 6; face++) {
    const c = f[face * 9 + 4];
    for (let i = 0; i < 9; i++) if (f[face * 9 + i] !== c) return false;
  }
  return true;
}

/**
 * Reads corner orientations from a cube with F2L solved.
 * Order: [UBL, UBR, UFR, UFL].
 *
 * Corner sticker positions (URFDLB, row-major, as the user looks at each face):
 *   UBL: U0 (top), L0 (L-face), B2 (B-face) — CW=L, CCW=B
 *   UBR: U2 (top), B0 (B-face), R2 (R-face) — CW=B, CCW=R
 *   UFR: U8 (top), R0 (R-face), F2 (F-face) — CW=R, CCW=F
 *   UFL: U6 (top), F0 (F-face), L2 (L-face) — CW=F, CCW=L
 */
export function readCornerOrientations(f: FaceletString): number[] {
  const topColor = f[U(4)];
  const corner = (top: number, cw: number, ccw: number): number => {
    if (f[top] === topColor) return 0;
    if (f[cw] === topColor) return 1;
    if (f[ccw] === topColor) return 2;
    return -1;
  };
  return [
    corner(U(0), L(0), B(2)),
    corner(U(2), B(0), R(2)),
    corner(U(8), R(0), F(2)),
    corner(U(6), F(0), L(2)),
  ];
}

/**
 * Reads U-layer edge orientations. Order: [UB, UR, UF, UL].
 *   UB: U1 (top), B1 (B-face top row middle)
 *   UR: U5 (top), R1
 *   UF: U7 (top), F1
 *   UL: U3 (top), L1
 * Oriented = 1 (U sticker on top), not oriented = 0.
 */
export function readEdgeOrientations(f: FaceletString): number[] {
  const topColor = f[U(4)];
  return [
    f[U(1)] === topColor ? 1 : 0,
    f[U(5)] === topColor ? 1 : 0,
    f[U(7)] === topColor ? 1 : 0,
    f[U(3)] === topColor ? 1 : 0,
  ];
}

// --- Case definitions (canonical tuples + algorithms) -------------------------

interface EdgeCaseDef extends OLLCase { tuple: number[] }
interface CornerCaseDef extends OLLCase { tuple: number[] }

const EDGE_CASES: EdgeCaseDef[] = [
  {
    id: "dot",
    name: "Dot",
    phase: "edges",
    // Dot is 2-look redetected: first alg turns it into an L-shape.
    alg: "F R U R' U' F'",
    description: "No yellow edges on top",
    tuple: [0, 0, 0, 0],
  },
  {
    id: "line",
    name: "Line",
    phase: "edges",
    alg: "F R U R' U' F'",
    description: "Yellow line across the top (left-right)",
    // UB & UF oriented, UR & UL not — the unoriented pair sits on the L-R axis.
    tuple: [1, 0, 1, 0],
  },
  {
    id: "lshape",
    name: "L-Shape",
    phase: "edges",
    alg: "F U R U' R' F'",
    description: "Two adjacent yellow edges (forming an L at back-left)",
    // Canonical: UB & UL oriented (back-left L), UR & UF not.
    tuple: [1, 0, 0, 1],
  },
];

const CORNER_CASES: CornerCaseDef[] = [
  {
    id: "sune",
    name: "Sune",
    phase: "corners",
    alg: "R U R' U R U2 R'",
    description: "Oriented corner at back-left, three others twisted clockwise",
    tuple: [0, 1, 1, 1],
  },
  {
    id: "antisune",
    name: "Anti-Sune",
    phase: "corners",
    alg: "R U2 R' U' R U' R'",
    description: "Oriented corner at back-left, three others twisted counter-clockwise",
    tuple: [0, 2, 2, 2],
  },
  {
    id: "h",
    name: "H (Double-Sune)",
    phase: "corners",
    alg: "R U R' U R U' R' U R U2 R'",
    description: "No corners oriented; two pairs of headlights on left and right",
    tuple: [1, 2, 1, 2],
  },
  {
    id: "pi",
    name: "Pi (Bruno)",
    phase: "corners",
    alg: "R U2 R2 U' R2 U' R2 U2 R",
    description: "No corners oriented; two headlights on front and two on back",
    tuple: [1, 1, 2, 2],
  },
  {
    id: "u",
    name: "U (Headlights)",
    phase: "corners",
    alg: "R2 D R' U2 R D' R' U2 R'",
    description: "Back corners oriented, headlights on the front",
    tuple: [0, 0, 2, 1],
  },
  {
    id: "t",
    name: "T",
    phase: "corners",
    alg: "R U R' U' R' F R F'",
    description: "Back corners oriented, front corners show yellow on L and R sides",
    tuple: [0, 0, 1, 2],
  },
  {
    id: "l",
    name: "L (Diagonal)",
    phase: "corners",
    alg: "F R U R' U' R U R' U' F'",
    description: "Two diagonally-opposite corners oriented",
    tuple: [0, 1, 0, 2],
  },
];

// --- Matching ----------------------------------------------------------------

/** Right-rotate a 4-tuple by k steps. A U turn on the cube right-rotates by 1. */
function rotRight(t: number[], k: number): number[] {
  const n = t.length;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) out[(i + k) % n] = t[i];
  return out;
}

function tuplesEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

const AUF_MOVES = ["", "U", "U2", "U'"];

function findMatch<T extends { tuple: number[] }>(
  cases: T[],
  input: number[],
): { cse: T; auf: string } | null {
  for (let k = 0; k < 4; k++) {
    const rotated = rotRight(input, k);
    for (const c of cases) {
      if (tuplesEqual(rotated, c.tuple)) {
        return { cse: c, auf: AUF_MOVES[k] };
      }
    }
  }
  return null;
}

export function recognizeOLL(facelets: FaceletString): OLLRecognition {
  const edgeState = readEdgeOrientations(facelets);
  const cornerState = readCornerOrientations(facelets);

  const edgesDone = edgeState.every((v) => v === 1);
  const cornersDone = cornerState.every((v) => v === 0);

  if (edgesDone && cornersDone) {
    return { phase: "done", auf: "", algWithAuf: "", cornerState, edgeState };
  }

  if (!edgesDone) {
    const m = findMatch(EDGE_CASES, edgeState);
    if (!m) {
      return { phase: "edges", auf: "", algWithAuf: "", cornerState, edgeState };
    }
    const algWithAuf = m.auf ? `${m.auf} ${m.cse.alg}` : m.cse.alg;
    return { phase: "edges", case: m.cse, auf: m.auf, algWithAuf, cornerState, edgeState };
  }

  // Edges done, corners remain.
  const m = findMatch(CORNER_CASES, cornerState);
  if (!m) {
    return { phase: "corners", auf: "", algWithAuf: "", cornerState, edgeState };
  }
  const algWithAuf = m.auf ? `${m.auf} ${m.cse.alg}` : m.cse.alg;
  return { phase: "corners", case: m.cse, auf: m.auf, algWithAuf, cornerState, edgeState };
}
