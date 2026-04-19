import { FACELET_GEOMETRY, FaceletGeometry } from "./geometry";
import { Face, FaceletString } from "./types";

type Axis = "x" | "y" | "z";

function normalVector(geom: FaceletGeometry): [number, number, number] {
  switch (geom.normal.axis) {
    case "x":
      return [geom.normal.sign, 0, 0];
    case "y":
      return [0, geom.normal.sign, 0];
    case "z":
      return [0, 0, geom.normal.sign];
  }
}

function faceFromNormal(vec: [number, number, number]): Face {
  if (vec[0] === 1) return "R";
  if (vec[0] === -1) return "L";
  if (vec[1] === 1) return "U";
  if (vec[1] === -1) return "D";
  if (vec[2] === 1) return "F";
  return "B";
}

function rotateVector(
  [x, y, z]: [number, number, number],
  axis: Axis,
  turns: number,
): [number, number, number] {
  const amount = ((turns % 4) + 4) % 4;
  let out: [number, number, number] = [x, y, z];

  for (let i = 0; i < amount; i++) {
    switch (axis) {
      case "x":
        out = [out[0], -out[2], out[1]];
        break;
      case "y":
        out = [out[2], out[1], -out[0]];
        break;
      case "z":
        out = [-out[1], out[0], out[2]];
        break;
    }
  }

  return out;
}

function destinationIndex(
  pos: [number, number, number],
  normal: [number, number, number],
): number {
  const face = faceFromNormal(normal);
  const match = FACELET_GEOMETRY.find((geom) =>
    geom.face === face
    && geom.pos[0] === pos[0]
    && geom.pos[1] === pos[1]
    && geom.pos[2] === pos[2],
  );

  if (!match) throw new Error(`No destination facelet found for ${face} at ${pos.join(",")}`);
  return match.index;
}

interface MoveSpec {
  axis: Axis;
  sign: 1 | -1;
  layers: (coord: number) => boolean;
}

function moveSpec(face: string): MoveSpec | null {
  switch (face) {
    case "R": return { axis: "x", sign: 1, layers: (coord) => coord === 1 };
    case "L": return { axis: "x", sign: -1, layers: (coord) => coord === -1 };
    case "U": return { axis: "y", sign: 1, layers: (coord) => coord === 1 };
    case "D": return { axis: "y", sign: -1, layers: (coord) => coord === -1 };
    case "F": return { axis: "z", sign: 1, layers: (coord) => coord === 1 };
    case "B": return { axis: "z", sign: -1, layers: (coord) => coord === -1 };
    case "r": return { axis: "x", sign: 1, layers: (coord) => coord >= 0 };
    case "l": return { axis: "x", sign: -1, layers: (coord) => coord <= 0 };
    case "u": return { axis: "y", sign: 1, layers: (coord) => coord >= 0 };
    case "d": return { axis: "y", sign: -1, layers: (coord) => coord <= 0 };
    case "f": return { axis: "z", sign: 1, layers: (coord) => coord >= 0 };
    case "b": return { axis: "z", sign: -1, layers: (coord) => coord <= 0 };
    case "M": return { axis: "x", sign: -1, layers: (coord) => coord === 0 };
    case "E": return { axis: "y", sign: -1, layers: (coord) => coord === 0 };
    case "S": return { axis: "z", sign: 1, layers: (coord) => coord === 0 };
    case "x": return { axis: "x", sign: 1, layers: () => true };
    case "y": return { axis: "y", sign: 1, layers: () => true };
    case "z": return { axis: "z", sign: 1, layers: () => true };
    default:
      return null;
  }
}

export function applyMoveToFacelets(facelets: FaceletString, move: string): FaceletString {
  if (!move) return facelets;

  const face = move[0];
  const suffix = move.slice(1);
  const spec = moveSpec(face);
  if (!spec) return facelets;

  let turns = -spec.sign;
  if (suffix === "'") turns *= -1;
  if (suffix === "2") turns *= 2;

  const out = facelets.split("");

  FACELET_GEOMETRY.forEach((geom) => {
    const axisCoord =
      spec.axis === "x" ? geom.pos[0]
        : spec.axis === "y" ? geom.pos[1]
          : geom.pos[2];

    if (!spec.layers(axisCoord)) {
      out[geom.index] = facelets[geom.index];
      return;
    }

    const nextPos = rotateVector(geom.pos, spec.axis, turns);
    const nextNormal = rotateVector(normalVector(geom), spec.axis, turns);
    const nextIndex = destinationIndex(nextPos, nextNormal);
    out[nextIndex] = facelets[geom.index];
  });

  return out.join("") as FaceletString;
}

export function applyMovesToFacelets(facelets: FaceletString, moves: string[]): FaceletString {
  return moves.reduce((state, move) => applyMoveToFacelets(state, move), facelets);
}

const SINGLE_TURN_BASES = ["U", "R", "F", "D", "L", "B", "u", "r", "f", "d", "l", "b", "M", "E", "S"] as const;
const MOVE_SUFFIXES = ["", "'", "2"] as const;

export const SOLVE_MODE_TRACKED_MOVES = SINGLE_TURN_BASES.flatMap((base) =>
  MOVE_SUFFIXES.map((suffix) => `${base}${suffix}`),
);

export function inferMoveFromFacelets(
  before: FaceletString,
  after: FaceletString,
): string | null {
  if (!before || !after || before === after) return null;

  for (const move of SOLVE_MODE_TRACKED_MOVES) {
    if (applyMoveToFacelets(before, move) === after) {
      return move;
    }
  }

  return null;
}
