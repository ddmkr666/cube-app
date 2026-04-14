/**
 * Standard WCA-style scramble generator.
 * Produces a string of moves (e.g., "R U' F2 ...").
 */

const FACES = ["U", "D", "L", "R", "F", "B"];
const MODIFIERS = ["", "'", "2"];

export function generateScramble(length: number = 20): string {
  const scramble: string[] = [];
  let lastFace = "";

  for (let i = 0; i < length; i++) {
    let face: string;
    do {
      face = FACES[Math.floor(Math.random() * FACES.length)];
    } while (face === lastFace);

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

/**
 * Normalizes a move string to a standard WCA format.
 * (e.g., "U3" -> "U'", "U4" -> null, etc.)
 */
export function normalizeMove(move: string): string | null {
  if (!move) return null;
  // Basic normalization — you might need more if the GAN cube sends non-WCA strings
  // But usually gan-web-bluetooth sends standard "R", "R'", "R2"
  return move;
}
