import { SOLVED_FACELETS } from "../cube/facelets";
import { applyMovesToFacelets } from "../cube/moves";
import { getInverseMove } from "../cube/scramble";
import { FaceletString } from "../cube/types";

export interface PLLTrainerCase {
  id: string;
  displayName: string;
  phase: "corners" | "edges";
  algorithm: string;
  description: string;
  targetCornerPermutation: number[];
  targetEdgePermutation?: number[];
  aliases?: string[];
}

export const PLL_EDGE_VARIANTS: number[][] = [
  [0, 2, 3, 1],
  [0, 3, 1, 2],
  [2, 3, 0, 1],
  [1, 0, 3, 2],
];

const U = (i: number) => i;
const R = (i: number) => 9 + i;
const F = (i: number) => 18 + i;
const L = (i: number) => 36 + i;
const B = (i: number) => 45 + i;

const CORNER_SOURCE_COLORS: [string, string][] = [
  ["L", "B"], // UBL
  ["B", "R"], // UBR
  ["R", "F"], // UFR
  ["F", "L"], // UFL
];

const EDGE_SOURCE_COLORS = ["B", "R", "F", "L"];
const TRAINER_SOLVED_FACELETS: FaceletString =
  ("DDDDDDDDD" + SOLVED_FACELETS.slice(9, 27) + "UUUUUUUUU" + SOLVED_FACELETS.slice(36)) as FaceletString;

export const PLL_TRAINER_CASES: PLLTrainerCase[] = [
  {
    id: "corners-headlights",
    displayName: "Headlights",
    phase: "corners",
    algorithm: "R U R' U' R' F R2 U' R' U' R U R' F'",
    description: "One side has matching headlights; hold that solved side on the left",
    targetCornerPermutation: [0, 2, 1, 3],
  },
  {
    id: "corners-no-headlights",
    displayName: "No Headlights",
    phase: "corners",
    algorithm: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
    description: "No side has matching headlights; perform from any angle",
    targetCornerPermutation: [2, 1, 0, 3],
  },
  {
    id: "edges-clockwise",
    displayName: "3 Edges Cycling Clockwise",
    phase: "edges",
    algorithm: "R2 U R U R' U' R' U' R' U R'",
    description: "One edge is solved; hold the solved edge on the back",
    targetCornerPermutation: [0, 1, 2, 3],
    targetEdgePermutation: [0, 2, 3, 1],
  },
  {
    id: "edges-anticlockwise",
    displayName: "3 Edges Cycling Anticlockwise",
    phase: "edges",
    algorithm: "R U' R U R U R U' R' U' R2",
    description: "One edge is solved; hold the solved edge on the back",
    targetCornerPermutation: [0, 1, 2, 3],
    targetEdgePermutation: [0, 3, 1, 2],
  },
  {
    id: "edges-opposite",
    displayName: "Opposite Edge Swap",
    phase: "edges",
    algorithm: "R2 U2 R2 U2 R2 U R2 U2 R2 U2 R2 U'",
    description: "No edges are solved; each edge swaps with its opposite",
    targetCornerPermutation: [0, 1, 2, 3],
    targetEdgePermutation: [2, 3, 0, 1],
  },
  {
    id: "edges-adjacent",
    displayName: "Adjacent Edge Swap",
    phase: "edges",
    algorithm: "R' U' R2 U R U R' U' R U R U' R U' R' U2",
    description: "No edges are solved; hold the pair to swap on the front-right",
    targetCornerPermutation: [0, 1, 2, 3],
    targetEdgePermutation: [1, 0, 3, 2],
  },
];

export function getPLLTrainerCase(caseId: string): PLLTrainerCase {
  const cse = PLL_TRAINER_CASES.find((entry) => entry.id === caseId);
  if (!cse) throw new Error(`Unknown PLL trainer case: ${caseId}`);
  return cse;
}

export function randomPLLTrainerCaseId(
  excludeId?: string,
): string {
  const pool = PLL_TRAINER_CASES.filter((cse) => cse.id !== excludeId);
  const source = pool.length > 0 ? pool : PLL_TRAINER_CASES;
  return source[Math.floor(Math.random() * source.length)].id;
}

export function buildPLLTrainerFacelets(cse: PLLTrainerCase): FaceletString {
  const out = TRAINER_SOLVED_FACELETS.split("");
  const edgePermutation = cse.targetEdgePermutation ?? PLL_EDGE_VARIANTS[0];

  cse.targetCornerPermutation.forEach((pieceIndex, positionIndex) => {
    const [first, second] = CORNER_SOURCE_COLORS[pieceIndex];
    switch (positionIndex) {
      case 0: // UBL
        out[U(0)] = "D";
        out[L(0)] = first;
        out[B(2)] = second;
        break;
      case 1: // UBR
        out[U(2)] = "D";
        out[B(0)] = first;
        out[R(2)] = second;
        break;
      case 2: // UFR
        out[U(8)] = "D";
        out[R(0)] = first;
        out[F(2)] = second;
        break;
      case 3: // UFL
        out[U(6)] = "D";
        out[F(0)] = first;
        out[L(2)] = second;
        break;
    }
  });

  edgePermutation.forEach((pieceIndex, positionIndex) => {
    const color = EDGE_SOURCE_COLORS[pieceIndex];
    switch (positionIndex) {
      case 0: // UB
        out[U(1)] = "D";
        out[B(1)] = color;
        break;
      case 1: // UR
        out[U(5)] = "D";
        out[R(1)] = color;
        break;
      case 2: // UF
        out[U(7)] = "D";
        out[F(1)] = color;
        break;
      case 3: // UL
        out[U(3)] = "D";
        out[L(1)] = color;
        break;
    }
  });

  return out.join("") as FaceletString;
}

export function buildPLLTrainerStartFacelets(
  cse: PLLTrainerCase,
  edgePermutation?: number[],
): FaceletString {
  if (cse.phase !== "corners") {
    return buildPLLTrainerFacelets(edgePermutation ? { ...cse, targetEdgePermutation: edgePermutation } : cse);
  }

  const postCornerCase: PLLTrainerCase = {
    ...cse,
    targetCornerPermutation: [0, 1, 2, 3],
    targetEdgePermutation: edgePermutation ?? PLL_EDGE_VARIANTS[0],
  };

  const solvedCornersState = buildPLLTrainerFacelets(postCornerCase);
  return applyMovesToFacelets(solvedCornersState, invertAlgorithm(cse.algorithm));
}

export function rotatePLLTrainerColorFrame(
  facelets: FaceletString,
  rotation: 0 | 1 | 2 | 3,
): FaceletString {
  const maps: Array<Record<string, string>> = [
    { F: "F", R: "R", B: "B", L: "L" },
    { F: "R", R: "B", B: "L", L: "F" },
    { F: "B", R: "L", B: "F", L: "R" },
    { F: "L", R: "F", B: "R", L: "B" },
  ];

  const map = maps[rotation];
  return facelets
    .split("")
    .map((sticker) => map[sticker] ?? sticker)
    .join("") as FaceletString;
}

export function withPLLTrainerEdgeVariant(
  cse: PLLTrainerCase,
  edgePermutation: number[],
): PLLTrainerCase {
  return {
    ...cse,
    targetEdgePermutation: edgePermutation,
  };
}

function invertAlgorithm(algorithm: string): string[] {
  return algorithm
    .split(" ")
    .filter(Boolean)
    .reverse()
    .map((move) => getInverseMove(move));
}
