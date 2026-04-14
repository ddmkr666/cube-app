import { CubeState, Face, FACE_ORDER, FaceletString } from "./types";

export const SOLVED_FACELETS: FaceletString =
  "UUUUUUUUU" + "RRRRRRRRR" + "FFFFFFFFF" + "DDDDDDDDD" + "LLLLLLLLL" + "BBBBBBBBB";

export function isValidFacelets(s: string): s is FaceletString {
  if (s.length !== 54) return false;
  const counts: Record<string, number> = {};
  for (const c of s) counts[c] = (counts[c] ?? 0) + 1;
  for (const f of FACE_ORDER) if (counts[f] !== 9) return false;
  return true;
}

export function parseFacelets(s: FaceletString): CubeState {
  const faces = {} as Record<Face, Face[][]>;
  FACE_ORDER.forEach((face, fi) => {
    const grid: Face[][] = [];
    for (let r = 0; r < 3; r++) {
      const row: Face[] = [];
      for (let c = 0; c < 3; c++) {
        row.push(s[fi * 9 + r * 3 + c] as Face);
      }
      grid.push(row);
    }
    faces[face] = grid;
  });
  return { facelets: s, faces };
}

export function isSolved(s: FaceletString): boolean {
  // The cube is solved when every facelet on a face matches that face's center.
  // Center stickers are at index 4 within each 9-char face block.
  for (let f = 0; f < 6; f++) {
    const center = s[f * 9 + 4];
    for (let i = 0; i < 9; i++) {
      if (s[f * 9 + i] !== center) return false;
    }
  }
  return true;
}
