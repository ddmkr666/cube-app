/**
 * WCA-compliant scramble generator.
 * Rules:
 *   1. No consecutive moves on the same face.
 *   2. No consecutive moves on opposite faces (e.g. R then L).
 * These are the two constraints WCA scramblers enforce for 3x3.
 */

const FACES = ["U", "D", "L", "R", "F", "B"];
const MODIFIERS = ["", "'", "2"];

const OPPOSITE: Record<string, string> = {
  U: "D", D: "U",
  R: "L", L: "R",
  F: "B", B: "F",
};

export function generateScramble(length: number = 20): string {
  const scramble: string[] = [];
  let lastFace = "";

  for (let i = 0; i < length; i++) {
    // Exclude the last face and its opposite (same axis).
    const allowed = FACES.filter(
      (f) => f !== lastFace && f !== OPPOSITE[lastFace]
    );

    const face = allowed[Math.floor(Math.random() * allowed.length)];
    const modifier = MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
    scramble.push(`${face}${modifier}`);
    lastFace = face;
  }

  return scramble.join(" ");
}

/**
 * Returns the inverse of a move (e.g., "R" -> "R'", "U'" -> "U", "F2" -> "F2").
 */
export function getInverseMove(move: string): string {
  if (!move) return "";
  if (move.endsWith("2")) return move; // 180-degree turns are their own inverse
  if (move.endsWith("'")) return move.slice(0, -1);
  return `${move}'`;
}

