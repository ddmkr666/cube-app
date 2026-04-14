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
