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

interface EdgeCaseDef extends PLLCase {
  tuple: number[];
}

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

function rotatePermutationRight(tuple: number[], k: number): number[] {
  const n = tuple.length;
  const amount = normalizeAufIndex(k) % n;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const sourceIndex = ((i - amount) % n + n) % n;
    out[i] = (tuple[sourceIndex] + amount) % n;
  }
  return out;
}

function displayTuple(tuple: number[], orientationOffset: number = 0): number[] {
  return rotatePermutationRight(tuple, orientationOffset);
}

const CORNER_CASES = {
  adjacent: {
    id: "adjacent",
    name: "Headlights",
    phase: "corners" as const,
    alg: "R U R' U' R' F R2 U' R' U' R U R' F'",
    description: "One side has matching headlights; hold that solved side on the left",
  },
  diagonal: {
    id: "diagonal",
    name: "No Headlights",
    phase: "corners" as const,
    alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
    description: "No side has matching headlights; perform from any angle",
  },
};

const EDGE_CASES = {
  clockwise: {
    id: "clockwise",
    name: "3 Edges Cycling Clockwise",
    phase: "edges" as const,
    alg: "R2 U R U R' U' R' U' R' U R'",
    description: "One edge is solved; hold the solved edge on the back",
    tuple: [0, 2, 3, 1],
    orientationOffset: 0,
  },
  anticlockwise: {
    id: "anticlockwise",
    name: "3 Edges Cycling Anticlockwise",
    phase: "edges" as const,
    alg: "R U' R U R U R U' R' U' R2",
    description: "One edge is solved; hold the solved edge on the back",
    tuple: [0, 3, 1, 2],
    orientationOffset: 0,
  },
  opposite: {
    id: "opposite",
    name: "Opposite Edge Swap",
    phase: "edges" as const,
    alg: "R2 U2 R2 U2 R2 U R2 U2 R2 U2 R2 U'",
    description: "No edges are solved; each edge swaps with its opposite",
    tuple: [2, 3, 0, 1],
    orientationOffset: 0,
  },
  adjacent: {
    id: "adjacent",
    name: "Adjacent Edge Swap",
    phase: "edges" as const,
    alg: "R' U' R2 U R U R' U' R U R U' R U' R' U2",
    description: "No edges are solved; hold the pair to swap on the front-right",
    tuple: [1, 0, 3, 2],
    orientationOffset: 0,
  },
};

function findMatch<T extends { tuple: number[] }>(
  cases: T[],
  input: number[],
): { cse: T; auf: string } | null {
  for (let k = 0; k < 4; k++) {
    const rotated = rotatePermutationRight(input, k);
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

function readHeadlightSides(f: FaceletString): number[] {
  const sides = [
    [B(0), B(2)], // back
    [R(0), R(2)], // right
    [F(0), F(2)], // front
    [L(0), L(2)], // left
  ];

  return sides
    .map(([a, b], index) => (f[a] === f[b] ? index : -1))
    .filter((index) => index !== -1);
}

function recognizePLLCorners(
  facelets: FaceletString,
  cornerPermutation: number[],
  solvedEdges: number[],
): PLLRecognition | null {
  const headlights = readHeadlightSides(facelets);

  if (headlights.length === 1) {
    const leftSideIndex = 3;
    const aufIdx = normalizeAufIndex(leftSideIndex - headlights[0]);
    return {
      phase: "corners",
      case: CORNER_CASES.adjacent,
      auf: AUF_MOVES[aufIdx],
      algWithAuf: AUF_MOVES[aufIdx]
        ? `${AUF_MOVES[aufIdx]} ${CORNER_CASES.adjacent.alg}`
        : CORNER_CASES.adjacent.alg,
      targetCornerPermutation: rotRight(cornerPermutation, aufIdx),
      targetEdgePermutation: solvedEdges,
    };
  }

  if (headlights.length === 0) {
    return {
      phase: "corners",
      case: CORNER_CASES.diagonal,
      auf: "",
      algWithAuf: CORNER_CASES.diagonal.alg,
      targetCornerPermutation: cornerPermutation,
      targetEdgePermutation: solvedEdges,
    };
  }

  return null;
}

function solvedEdgePositions(edgePermutation: number[]): number[] {
  return edgePermutation
    .map((pieceIndex, positionIndex) => (pieceIndex === positionIndex ? positionIndex : -1))
    .filter((positionIndex) => positionIndex !== -1);
}

function recognizePLLEdges(
  edgePermutation: number[],
  solvedCorners: number[],
): PLLRecognition | null {
  const solvedPositions = solvedEdgePositions(edgePermutation);
  const edgeCases: EdgeCaseDef[] =
    solvedPositions.length === 1
      ? [EDGE_CASES.clockwise, EDGE_CASES.anticlockwise]
      : solvedPositions.length === 0
        ? [EDGE_CASES.opposite, EDGE_CASES.adjacent]
        : [];

  const match = findMatch(edgeCases, edgePermutation);
  if (!match) return null;

  const displayOffset = match.cse.orientationOffset ?? 0;
  const aufIdx = normalizeAufIndex(AUF_MOVES.indexOf(match.auf) + displayOffset);

  return {
    phase: "edges",
    case: match.cse,
    auf: AUF_MOVES[aufIdx],
    algWithAuf: AUF_MOVES[aufIdx]
      ? `${AUF_MOVES[aufIdx]} ${match.cse.alg}`
      : match.cse.alg,
    targetCornerPermutation: solvedCorners,
    targetEdgePermutation: displayTuple(match.cse.tuple, displayOffset),
  };
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
    const cornerRecognition = recognizePLLCorners(facelets, cornerPermutation, solvedEdges);
    if (cornerRecognition) return cornerRecognition;

    return {
      phase: "corners",
      auf: "",
      algWithAuf: "",
      targetCornerPermutation: cornerPermutation,
      targetEdgePermutation: solvedEdges,
    };
  }

  const edgeRecognition = recognizePLLEdges(edgePermutation, solvedCorners);
  if (edgeRecognition) return edgeRecognition;

  return {
    phase: "edges",
    auf: "",
    algWithAuf: "",
    targetCornerPermutation: solvedCorners,
    targetEdgePermutation: edgePermutation,
  };
}
