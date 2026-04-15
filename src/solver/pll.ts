import { FaceletString } from "../cube/types";

export type PLLPhase = "corners" | "edges" | "done";

export interface PLLCase {
  id: string;
  name: string;
  phase: "corners" | "edges";
  alg: string;
  description: string;
  orientationOffset?: number;
}

export interface PLLRecognition {
  phase: PLLPhase;
  case?: PLLCase;
  auf: string;
  algWithAuf: string;
  targetCornerPermutation: number[];
  targetEdgePermutation: number[];
}

interface CornerCaseDef extends PLLCase { tuple: number[] }
interface EdgeCaseDef extends PLLCase { tuple: number[] }

// URFDLB order helpers.
const U = (i: number) => i;
const R = (i: number) => 9 + i;
const F = (i: number) => 18 + i;
const L = (i: number) => 36 + i;
const B = (i: number) => 45 + i;

const AUF_MOVES = ["", "U", "U2", "U'"];

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

function normalizeAufIndex(idx: number): number {
  return ((idx % 4) + 4) % 4;
}

function displayTuple(tuple: number[], orientationOffset: number = 0): number[] {
  return rotRight(tuple, normalizeAufIndex(orientationOffset));
}

const CORNER_CASES: CornerCaseDef[] = [
  {
    id: "adjacent",
    name: "Adjacent Corner Swap",
    phase: "corners",
    alg: "R' F R' B2 R F' R' B2 R2",
    description: "Swap the two front corners",
    tuple: [0, 1, 3, 2],
    orientationOffset: 0,
  },
  {
    id: "diagonal",
    name: "Diagonal Corner Swap",
    phase: "corners",
    alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
    description: "Swap the front-left and back-right corners",
    tuple: [2, 1, 0, 3],
    orientationOffset: 0,
  },
];

const EDGE_CASES: EdgeCaseDef[] = [
  {
    id: "ua",
    name: "Ua Perm",
    phase: "edges",
    alg: "R U' R U R U R U' R' U' R2",
    description: "Three edges cycle clockwise with the back edge solved",
    tuple: [0, 3, 1, 2],
    orientationOffset: 0,
  },
  {
    id: "ub",
    name: "Ub Perm",
    phase: "edges",
    alg: "R2 U R U R' U' R' U' R' U R'",
    description: "Three edges cycle counter-clockwise with the back edge solved",
    tuple: [0, 2, 3, 1],
    orientationOffset: 0,
  },
  {
    id: "h",
    name: "H Perm",
    phase: "edges",
    alg: "M2 U M2 U2 M2 U M2",
    description: "Opposite edges swap",
    tuple: [2, 3, 0, 1],
    orientationOffset: 0,
  },
  {
    id: "z",
    name: "Z Perm",
    phase: "edges",
    alg: "M2 U M2 U M' U2 M2 U2 M' U2",
    description: "Adjacent edge pairs swap",
    tuple: [1, 0, 3, 2],
    orientationOffset: 0,
  },
];

function findMatch<T extends { tuple: number[] }>(cases: T[], input: number[]): { cse: T; auf: string } | null {
  for (let k = 0; k < 4; k++) {
    const rotated = rotRight(input, k);
    for (const c of cases) {
      if (tuplesEqual(rotated, c.tuple)) return { cse: c, auf: AUF_MOVES[k] };
    }
  }
  return null;
}

function isOLLDone(f: FaceletString): boolean {
  const top = f[U(4)];
  for (let i = 0; i < 9; i++) {
    if (f[U(i)] !== top) return false;
  }
  return true;
}

function readCornerPermutation(f: FaceletString): number[] {
  const signatures = [
    [f[L(4)], f[B(4)]].sort().join(""),
    [f[B(4)], f[R(4)]].sort().join(""),
    [f[R(4)], f[F(4)]].sort().join(""),
    [f[F(4)], f[L(4)]].sort().join(""),
  ];

  const positions = [
    [f[L(0)], f[B(2)]],
    [f[B(0)], f[R(2)]],
    [f[R(0)], f[F(2)]],
    [f[F(0)], f[L(2)]],
  ];

  return positions.map((colors) => signatures.indexOf([...colors].sort().join("")));
}

function readEdgePermutation(f: FaceletString): number[] {
  const centers = [f[B(4)], f[R(4)], f[F(4)], f[L(4)]];
  const positions = [f[B(1)], f[R(1)], f[F(1)], f[L(1)]];
  return positions.map((color) => centers.indexOf(color));
}

export function recognizePLL(facelets: FaceletString): PLLRecognition {
  const solvedCorners = [0, 1, 2, 3];
  const solvedEdges = [0, 1, 2, 3];

  if (!isOLLDone(facelets)) {
    return {
      phase: "done",
      auf: "",
      algWithAuf: "",
      targetCornerPermutation: solvedCorners,
      targetEdgePermutation: solvedEdges,
    };
  }

  const cornerPermutation = readCornerPermutation(facelets);
  const edgePermutation = readEdgePermutation(facelets);

  const cornersSolved = tuplesEqual(cornerPermutation, solvedCorners);
  const edgesSolved = tuplesEqual(edgePermutation, solvedEdges);

  if (cornersSolved && edgesSolved) {
    return {
      phase: "done",
      auf: "",
      algWithAuf: "",
      targetCornerPermutation: solvedCorners,
      targetEdgePermutation: solvedEdges,
    };
  }

  if (!cornersSolved) {
    const m = findMatch(CORNER_CASES, cornerPermutation);
    if (!m) {
      return {
        phase: "corners",
        auf: "",
        algWithAuf: "",
        targetCornerPermutation: solvedCorners,
        targetEdgePermutation: solvedEdges,
      };
    }

    const displayOffset = m.cse.orientationOffset ?? 0;
    const aufIdx = normalizeAufIndex(AUF_MOVES.indexOf(m.auf) + displayOffset);

    return {
      phase: "corners",
      case: m.cse,
      auf: AUF_MOVES[aufIdx],
      algWithAuf: AUF_MOVES[aufIdx] ? `${AUF_MOVES[aufIdx]} ${m.cse.alg}` : m.cse.alg,
      targetCornerPermutation: displayTuple(m.cse.tuple, displayOffset),
      targetEdgePermutation: solvedEdges,
    };
  }

  const m = findMatch(EDGE_CASES, edgePermutation);
  if (!m) {
    return {
      phase: "edges",
      auf: "",
      algWithAuf: "",
      targetCornerPermutation: solvedCorners,
      targetEdgePermutation: solvedEdges,
    };
  }

  const displayOffset = m.cse.orientationOffset ?? 0;
  const aufIdx = normalizeAufIndex(AUF_MOVES.indexOf(m.auf) + displayOffset);

  return {
    phase: "edges",
    case: m.cse,
    auf: AUF_MOVES[aufIdx],
    algWithAuf: AUF_MOVES[aufIdx] ? `${AUF_MOVES[aufIdx]} ${m.cse.alg}` : m.cse.alg,
    targetCornerPermutation: solvedCorners,
    targetEdgePermutation: displayTuple(m.cse.tuple, displayOffset),
  };
}
