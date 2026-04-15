/**
 * Small top-view diagram of the U layer for an OLL case.
 *
 * Layout:
 *   - 3×3 grid of U-face stickers in the middle
 *   - 3 tabs on each side showing the top row of the adjacent face (F/R/B/L)
 *
 * Coordinates follow the usual OLL convention: F at the bottom of the image,
 * B at the top. A sticker is either yellow (U-coloured) or grey.
 *
 * Input is the runtime orientation tuples (pre-AUF), so the image mirrors
 * what the user currently sees on their cube.
 */

interface Props {
  /** [UBL, UBR, UFR, UFL] — corner orientation (0=top, 1=CW side, 2=CCW side). */
  corners: number[];
  /** [UB, UR, UF, UL] — edge orientation (1=oriented, 0=not). */
  edges: number[];
  size?: number;
}

const YELLOW = "#facc15";
const GREY = "#475569";
const BORDER = "#0f172a";

export function OLLPatternImage({ corners, edges, size = 140 }: Props) {
  // Sticker grid: 5×5 cells. Center 3×3 is U-face; outer ring (minus corners) is side tabs.
  // We skip the 4 outer corners of the 5×5 — only 21 stickers are drawn.
  const cell = size / 5;
  const pad = cell * 0.08;
  const s = cell - pad * 2;

  // Decide yellow/grey for each sticker position.
  // U-face 3x3 indexed [row][col] with row 0 = back, col 0 = left.
  //  U0 U1 U2
  //  U3 U4 U5
  //  U6 U7 U8
  // where U0=UBL, U2=UBR, U6=UFL, U8=UFR (corners); U1=UB, U3=UL, U5=UR, U7=UF (edges).
  const [UBL, UBR, UFR, UFL] = corners;
  const [UB, UR, UF, UL] = edges;

  const isY = (v: boolean) => (v ? YELLOW : GREY);

  // U-face stickers — U sticker on top iff the piece is "oriented" (value 0 for corners, 1 for edges).
  const uFace = [
    [isY(UBL === 0), isY(UB === 1), isY(UBR === 0)],
    [isY(UL === 1),  YELLOW,        isY(UR === 1)],
    [isY(UFL === 0), isY(UF === 1), isY(UFR === 0)],
  ];

  // Side tabs (U-layer sticker of each side piece, i.e. the non-U sticker).
  // For a corner, the non-U sticker is yellow iff that sticker physically carries U.
  // Corner orientation encoding:
  //   UBL: CW=L, CCW=B    →  L-tab yellow if UBL===1, B-tab yellow if UBL===2
  //   UBR: CW=B, CCW=R    →  B-tab yellow if UBR===1, R-tab yellow if UBR===2
  //   UFR: CW=R, CCW=F    →  R-tab yellow if UFR===1, F-tab yellow if UFR===2
  //   UFL: CW=F, CCW=L    →  F-tab yellow if UFL===1, L-tab yellow if UFL===2

  // Back tabs (above U, left-to-right): UBR-B, UB-B, UBL-B
  const backTabs = [
    isY(UBR === 1),
    isY(UB === 0),
    isY(UBL === 2),
  ];
  // Front tabs (below U, left-to-right): UFL-F, UF-F, UFR-F
  const frontTabs = [
    isY(UFL === 1),
    isY(UF === 0),
    isY(UFR === 2),
  ];
  // Left tabs (top-to-bottom): UBL-L, UL-L, UFL-L
  const leftTabs = [
    isY(UBL === 1),
    isY(UL === 0),
    isY(UFL === 2),
  ];
  // Right tabs (top-to-bottom): UBR-R, UR-R, UFR-R
  const rightTabs = [
    isY(UBR === 2),
    isY(UR === 0),
    isY(UFR === 1),
  ];

  const rect = (x: number, y: number, fill: string, key: string) => (
    <rect
      key={key}
      x={x + pad}
      y={y + pad}
      width={s}
      height={s}
      rx={cell * 0.1}
      fill={fill}
      stroke={BORDER}
      strokeWidth={1}
    />
  );

  // Layout coordinates (5×5, cell size = cell). Center 3×3 starts at (cell, cell).
  const shapes: React.ReactNode[] = [];

  // U face
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      shapes.push(rect((c + 1) * cell, (r + 1) * cell, uFace[r][c], `u-${r}-${c}`));
    }
  }
  // Back tabs (row 0, cols 1-3)
  for (let c = 0; c < 3; c++) {
    shapes.push(rect((c + 1) * cell, 0, backTabs[c], `b-${c}`));
  }
  // Front tabs (row 4, cols 1-3)
  for (let c = 0; c < 3; c++) {
    shapes.push(rect((c + 1) * cell, 4 * cell, frontTabs[c], `f-${c}`));
  }
  // Left tabs (col 0, rows 1-3)
  for (let r = 0; r < 3; r++) {
    shapes.push(rect(0, (r + 1) * cell, leftTabs[r], `l-${r}`));
  }
  // Right tabs (col 4, rows 1-3)
  for (let r = 0; r < 3; r++) {
    shapes.push(rect(4 * cell, (r + 1) * cell, rightTabs[r], `r-${r}`));
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {shapes}
    </svg>
  );
}
