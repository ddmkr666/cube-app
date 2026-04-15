/**
 * 2-Look OLL recognition.
 *
 * Operates on a 54-char facelet string in URFDLB order.
 */
import { FaceletString } from "../cube/types";
import { FACELET_GEOMETRY } from "../cube/geometry";

export type OLLPhase = "edges" | "corners" | "done";

// --- Orientation remapping -----------------------------------------------------

/**
 * A remapping table for each of the 24 possible cube orientations.
 */
const ORIENTATION_MAPS: number[][] = (() => {
  const maps: number[][] = [];
  
  const vecs = [[1,0,0], [-1,0,0], [0,1,0], [0,-1,0], [0,0,1], [0,0,-1]];
  const cross = (a: number[], b: number[]) => [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0]
  ];
  const dot = (a: number[], b: number[]) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];

  for (const x of vecs) {
    for (const y of vecs) {
      if (dot(x, y) !== 0) continue;
      const z = cross(x, y);
      const map = new Array(54);
      for (let i = 0; i < 54; i++) {
        const t = FACELET_GEOMETRY[i].pos;
        const sx = t[0]*x[0] + t[1]*y[0] + t[2]*z[0];
        const sy = t[0]*x[1] + t[1]*y[1] + t[2]*z[1];
        const sz = t[0]*x[2] + t[1]*y[2] + t[2]*z[2];
        
        const snormal = [
          FACELET_GEOMETRY[i].normal.axis === 'x' ? FACELET_GEOMETRY[i].normal.sign : 0,
          FACELET_GEOMETRY[i].normal.axis === 'y' ? FACELET_GEOMETRY[i].normal.sign : 0,
          FACELET_GEOMETRY[i].normal.axis === 'z' ? FACELET_GEOMETRY[i].normal.sign : 0,
        ];
        const sNX = snormal[0]*x[0] + snormal[1]*y[0] + snormal[2]*z[0];
        const sNY = snormal[0]*x[1] + snormal[1]*y[1] + snormal[2]*z[1];
        const sNZ = snormal[0]*x[2] + snormal[1]*y[2] + snormal[2]*z[2];

        const srcIndex = FACELET_GEOMETRY.findIndex(g => 
          g.pos[0] === sx && g.pos[1] === sy && g.pos[2] === sz &&
          (g.normal.axis === 'x' ? g.normal.sign === sNX : 
           g.normal.axis === 'y' ? g.normal.sign === sNY : 
           g.normal.axis === 'z' ? g.normal.sign === sNZ : false)
        );
        map[i] = srcIndex;
      }
      maps.push(map);
    }
  }
  return maps;
})();

function remapFacelets(f: FaceletString, map: number[]): FaceletString {
  let out = "";
  for (let i = 0; i < 54; i++) out += f[map[i]];
  return out;
}

// -------------------------------------------------------------------------------

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
  /** Target corner state [UBL, UBR, UFR, UFL] in the REQUIRED orientation. */
  targetCornerState: number[];
  /** Target edge state [UB, UR, UF, UL] in the REQUIRED orientation. */
  targetEdgeState: number[];
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
  const dCenter = f[D(4)];
  for (let i = 0; i < 9; i++) if (f[D(i)] !== dCenter) return false;
  const sideFaces = [F, R, B, L];
  for (const faceFn of sideFaces) {
    const center = f[faceFn(4)];
    for (let i = 3; i < 9; i++) if (f[faceFn(i)] !== center) return false;
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

/** Find an orientation where F2L is done. Returns the remapped facelet string and orientation index, or null. */
export function getF2LOrientedFacelets(f: FaceletString): { facelets: FaceletString, orientationIndex: number } | null {
  for (let i = 0; i < ORIENTATION_MAPS.length; i++) {
    const map = ORIENTATION_MAPS[i];
    const remapped = remapFacelets(f, map);
    if (isF2LDone(remapped)) return { facelets: remapped, orientationIndex: i };
  }
  return null;
}

/** All orientations where F2L is done. Multiple U rotations may qualify at once. */
export function getAllF2LOrientedFacelets(
  f: FaceletString,
): { facelets: FaceletString; orientationIndex: number }[] {
  const matches: { facelets: FaceletString; orientationIndex: number }[] = [];
  for (let i = 0; i < ORIENTATION_MAPS.length; i++) {
    const map = ORIENTATION_MAPS[i];
    const remapped = remapFacelets(f, map);
    if (isF2LDone(remapped)) {
      matches.push({ facelets: remapped, orientationIndex: i });
    }
  }
  return matches;
}

/** 
 * Maps a move from the physical cube's frame to the "F2L-oriented" frame.
 * e.g. if the user is holding the cube such that the physical 'R' face is 'U',
 * a physical 'R' move should be returned as 'U'.
 */
export function remapMove(move: string, orientationIndex: number): string {
  const face = move[0] as any;
  const suffix = move.slice(1);
  
  // Find which physical face matches each standard face in this orientation.
  // We can look at the center facelets (index 4 of each face block).
  const standardCenters = [4, 13, 22, 31, 40, 49]; // U, R, F, D, L, B
  const map = ORIENTATION_MAPS[orientationIndex];
  
  // The facelet at standard index 4 (U center) was originally at index map[4].
  const faceIndex = ["U", "R", "F", "D", "L", "B"].indexOf(face);
  const physicalCenterIndex = standardCenters[faceIndex];
  
  // We need to find which "virtual" face the physical move corresponds to.
  // A physical 'F' move is a rotation around the physical 'F' axis.
  // We need to know which virtual face has its center at that physical center.
  for (let virtualFaceIdx = 0; virtualFaceIdx < 6; virtualFaceIdx++) {
    const targetIdx = standardCenters[virtualFaceIdx];
    if (map[targetIdx] === physicalCenterIndex) {
      return ["U", "R", "F", "D", "L", "B"][virtualFaceIdx] + suffix;
    }
  }
  
  return move;
}

export function rotateMoveByAuf(move: string, auf: string): string {
  const face = move[0];
  const suffix = move.slice(1);

  const remap = (map: Record<string, string>) => `${map[face] ?? face}${suffix}`;

  switch (auf) {
    case "U":
      // Treat AUF as a view rotation: U on the state equals y' in the viewer frame.
      return remap({ F: "L", R: "F", B: "R", L: "B" });
    case "U'":
      return remap({ F: "R", R: "B", B: "L", L: "F" });
    case "U2":
      return remap({ F: "B", R: "L", B: "F", L: "R" });
    default:
      return move;
  }
}

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
  { id: "dot", name: "Dot", phase: "edges", alg: "F R U R' U' F'", description: "No yellow edges on top", tuple: [0, 0, 0, 0] },
  { id: "line", name: "Line", phase: "edges", alg: "F R U R' U' F'", description: "Yellow line across the top (left-right)", tuple: [1, 0, 1, 0] },
  { id: "lshape", name: "L-Shape", phase: "edges", alg: "F U R U' R' F'", description: "Two adjacent yellow edges (forming an L at back-left)", tuple: [1, 0, 0, 1] },
];

const CORNER_CASES: CornerCaseDef[] = [
  { id: "sune", name: "Sune", phase: "corners", alg: "R U R' U R U2 R'", description: "Oriented corner at back-left, three others twisted clockwise", tuple: [0, 1, 1, 1] },
  { id: "antisune", name: "Anti-Sune", phase: "corners", alg: "R U2 R' U' R U' R'", description: "Oriented corner at back-left, three others twisted counter-clockwise", tuple: [0, 2, 2, 2] },
  { id: "h", name: "H (Double-Sune)", phase: "corners", alg: "R U R' U R U' R' U R U2 R'", description: "No corners oriented; headlights on left and right", tuple: [1, 2, 1, 2] },
  { id: "pi", name: "Pi (Bruno)", phase: "corners", alg: "R U2 R2 U' R2 U' R2 U2 R", description: "No corners oriented; headlights on front and back", tuple: [1, 1, 2, 2] },
  { id: "u", name: "U (Headlights)", phase: "corners", alg: "R2 D R' U2 R D' R' U2 R'", description: "Back corners oriented, headlights on the front", tuple: [0, 0, 2, 1] },
  { id: "t", name: "T", phase: "corners", alg: "R U R' U' R' F R F'", description: "Back corners oriented, front corners side-facing", tuple: [0, 0, 1, 2] },
  { id: "l", name: "L (Diagonal)", phase: "corners", alg: "F R U R' U' R U R' U' F'", description: "Two diagonally-opposite corners oriented", tuple: [0, 1, 0, 2] },
];

// --- Matching ----------------------------------------------------------------

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

function findMatch<T extends { tuple: number[] }>(cases: T[], input: number[]): { cse: T; auf: string } | null {
  for (let k = 0; k < 4; k++) {
    const rotated = rotRight(input, k);
    for (const c of cases) {
      if (tuplesEqual(rotated, c.tuple)) return { cse: c, auf: AUF_MOVES[k] };
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
    return { phase: "done", auf: "", algWithAuf: "", targetCornerState: cornerState, targetEdgeState: edgeState };
  }

  if (!edgesDone) {
    const m = findMatch(EDGE_CASES, edgeState);
    if (!m) return { phase: "edges", auf: "", algWithAuf: "", targetCornerState: cornerState, targetEdgeState: edgeState };
    const aufIdx = AUF_MOVES.indexOf(m.auf);
    return {
      phase: "edges", case: m.cse, auf: m.auf, 
      algWithAuf: m.auf ? `${m.auf} ${m.cse.alg}` : m.cse.alg,
      targetCornerState: rotRight(cornerState, aufIdx),
      targetEdgeState: rotRight(edgeState, aufIdx)
    };
  }

  const m = findMatch(CORNER_CASES, cornerState);
  if (!m) return { phase: "corners", auf: "", algWithAuf: "", targetCornerState: cornerState, targetEdgeState: edgeState };
  const aufIdx = AUF_MOVES.indexOf(m.auf);
  return {
    phase: "corners", case: m.cse, auf: m.auf,
    algWithAuf: m.auf ? `${m.auf} ${m.cse.alg}` : m.cse.alg,
    targetCornerState: rotRight(cornerState, aufIdx),
    targetEdgeState: rotRight(edgeState, aufIdx)
  };
}
