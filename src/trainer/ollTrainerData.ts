import { SOLVED_FACELETS } from "../cube/facelets";
import { FaceletString } from "../cube/types";

export interface OLLTrainerCase {
  id: string;
  displayName: string;
  phase: "edges" | "corners";
  algorithm: string;
  description: string;
  targetCornerState: number[];
  targetEdgeState: number[];
  trackMoves?: boolean;
}

const U = (i: number) => i;
const R = (i: number) => 9 + i;
const F = (i: number) => 18 + i;
const L = (i: number) => 36 + i;
const B = (i: number) => 45 + i;

const TRAINER_SOLVED_FACELETS: FaceletString =
  ("DDDDDDDDD" + SOLVED_FACELETS.slice(9, 27) + "UUUUUUUUU" + SOLVED_FACELETS.slice(36)) as FaceletString;

const CORNER_SOURCE_COLORS: [string, string][] = [
  ["L", "B"],
  ["B", "R"],
  ["R", "F"],
  ["F", "L"],
];

const EDGE_SOURCE_COLORS = ["B", "R", "F", "L"];

export const OLL_TRAINER_CASES: OLLTrainerCase[] = [
  {
    id: "edges-dot",
    displayName: "Dot",
    phase: "edges",
    algorithm: "F R U R' U' F'",
    description: "No yellow edges on top",
    targetCornerState: [0, 0, 0, 0],
    targetEdgeState: [0, 0, 0, 0],
  },
  {
    id: "edges-line",
    displayName: "Line",
    phase: "edges",
    algorithm: "F R U R' U' F'",
    description: "Yellow line across the top (left-right)",
    targetCornerState: [0, 0, 0, 0],
    targetEdgeState: [0, 1, 0, 1],
  },
  {
    id: "edges-lshape",
    displayName: "L-Shape",
    phase: "edges",
    algorithm: "f R U R' U' f'",
    description: "Two adjacent yellow edges forming an L in the bottom-right",
    targetCornerState: [0, 0, 0, 0],
    targetEdgeState: [0, 0, 1, 1],
  },
  {
    id: "corners-sune",
    displayName: "Sune",
    phase: "corners",
    algorithm: "R U R' U R U2 R'",
    description: "Oriented corner at front-left, three others twisted clockwise",
    targetCornerState: [2, 2, 2, 0],
    targetEdgeState: [1, 1, 1, 1],
  },
  {
    id: "corners-antisune",
    displayName: "Anti-Sune",
    phase: "corners",
    algorithm: "R U2 R' U' R U' R'",
    description: "Oriented corner at front-right, three others twisted counter-clockwise",
    targetCornerState: [1, 0, 1, 1],
    targetEdgeState: [1, 1, 1, 1],
  },
  {
    id: "corners-h",
    displayName: "H (Double-Sune)",
    phase: "corners",
    algorithm: "R U R' U R U' R' U R U2 R'",
    description: "No corners oriented; headlights on left and right",
    targetCornerState: [1, 2, 1, 2],
    targetEdgeState: [1, 1, 1, 1],
  },
  {
    id: "corners-pi",
    displayName: "Pi (Bruno)",
    phase: "corners",
    algorithm: "R U2 R2 U' R2 U' R2 U2 R",
    description: "Headlights on the left, non-headlights on the right",
    targetCornerState: [1, 1, 2, 2],
    targetEdgeState: [1, 1, 1, 1],
  },
  {
    id: "corners-u",
    displayName: "U (Headlights)",
    phase: "corners",
    algorithm: "R2 D R' U2 R D' R' U2 R'",
    description: "Back corners oriented, headlights on the front",
    targetCornerState: [0, 0, 2, 1],
    targetEdgeState: [1, 1, 1, 1],
  },
  {
    id: "corners-t",
    displayName: "T",
    phase: "corners",
    algorithm: "r U R' U' r' F R F'",
    description: "Two unmatched yellow corners on the left",
    targetCornerState: [1, 2, 0, 0],
    targetEdgeState: [1, 1, 1, 1],
    trackMoves: false,
  },
  {
    id: "corners-l",
    displayName: "L (Diagonal)",
    phase: "corners",
    algorithm: "F R' F' r U R U' r'",
    description: "Two diagonally-opposite corners oriented",
    targetCornerState: [0, 1, 0, 2],
    targetEdgeState: [1, 1, 1, 1],
  },
];

export function getOLLTrainerCase(caseId: string): OLLTrainerCase {
  const cse = OLL_TRAINER_CASES.find((entry) => entry.id === caseId);
  if (!cse) throw new Error(`Unknown OLL trainer case: ${caseId}`);
  return cse;
}

export function randomOLLTrainerCaseId(
  section?: "part2",
  excludeId?: string,
): string {
  const filtered = section
    ? OLL_TRAINER_CASES.filter((cse) => cse.phase === "corners")
    : OLL_TRAINER_CASES;
  const pool = filtered.filter((cse) => cse.id !== excludeId);
  const source = pool.length > 0 ? pool : filtered;
  return source[Math.floor(Math.random() * source.length)].id;
}

export function buildOLLTrainerFacelets(cse: OLLTrainerCase): FaceletString {
  const out = TRAINER_SOLVED_FACELETS.split("");

  cse.targetCornerState.forEach((orientation, positionIndex) => {
    const [first, second] = CORNER_SOURCE_COLORS[positionIndex];
    const stickers = orientCorner(first, second, orientation);

    switch (positionIndex) {
      case 0:
        out[U(0)] = stickers[0];
        out[L(0)] = stickers[1];
        out[B(2)] = stickers[2];
        break;
      case 1:
        out[U(2)] = stickers[0];
        out[B(0)] = stickers[1];
        out[R(2)] = stickers[2];
        break;
      case 2:
        out[U(8)] = stickers[0];
        out[R(0)] = stickers[1];
        out[F(2)] = stickers[2];
        break;
      case 3:
        out[U(6)] = stickers[0];
        out[F(0)] = stickers[1];
        out[L(2)] = stickers[2];
        break;
    }
  });

  cse.targetEdgeState.forEach((orientation, positionIndex) => {
    const sideColor = EDGE_SOURCE_COLORS[positionIndex];
    const [topSticker, sideSticker] = orientation === 1 ? ["D", sideColor] : [sideColor, "D"];

    switch (positionIndex) {
      case 0:
        out[U(1)] = topSticker;
        out[B(1)] = sideSticker;
        break;
      case 1:
        out[U(5)] = topSticker;
        out[R(1)] = sideSticker;
        break;
      case 2:
        out[U(7)] = topSticker;
        out[F(1)] = sideSticker;
        break;
      case 3:
        out[U(3)] = topSticker;
        out[L(1)] = sideSticker;
        break;
    }
  });

  return out.join("") as FaceletString;
}

function orientCorner(first: string, second: string, orientation: number): [string, string, string] {
  switch (orientation) {
    case 1:
      return [second, "D", first];
    case 2:
      return [first, second, "D"];
    default:
      return ["D", first, second];
  }
}
