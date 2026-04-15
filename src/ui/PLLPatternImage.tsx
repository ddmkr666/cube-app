import { FACE_COLORS } from "../render/colors";

interface Props {
  corners: number[];
  edges: number[];
  size?: number;
}

const YELLOW = FACE_COLORS.D;
const BORDER = "#0f172a";

const CORNER_SOURCE_COLORS: [string, string][] = [
  [FACE_COLORS.L, FACE_COLORS.B], // UBL -> L, B
  [FACE_COLORS.B, FACE_COLORS.R], // UBR -> B, R
  [FACE_COLORS.R, FACE_COLORS.F], // UFR -> R, F
  [FACE_COLORS.F, FACE_COLORS.L], // UFL -> F, L
];

const EDGE_SOURCE_COLORS = [
  FACE_COLORS.B, // UB
  FACE_COLORS.R, // UR
  FACE_COLORS.F, // UF
  FACE_COLORS.L, // UL
];

export function PLLPatternImage({ corners, edges, size = 140 }: Props) {
  const cell = size / 5;
  const pad = cell * 0.08;
  const s = cell - pad * 2;

  const backTabs = [FACE_COLORS.B, FACE_COLORS.B, FACE_COLORS.B];
  const frontTabs = [FACE_COLORS.F, FACE_COLORS.F, FACE_COLORS.F];
  const leftTabs = [FACE_COLORS.L, FACE_COLORS.L, FACE_COLORS.L];
  const rightTabs = [FACE_COLORS.R, FACE_COLORS.R, FACE_COLORS.R];

  corners.forEach((pieceIndex, positionIndex) => {
    const [first, second] = CORNER_SOURCE_COLORS[pieceIndex];
    switch (positionIndex) {
      case 0: // UBL -> left top, back right
        leftTabs[0] = first;
        backTabs[2] = second;
        break;
      case 1: // UBR -> back left, right top
        backTabs[0] = first;
        rightTabs[0] = second;
        break;
      case 2: // UFR -> right bottom, front right
        rightTabs[2] = first;
        frontTabs[2] = second;
        break;
      case 3: // UFL -> front left, left bottom
        frontTabs[0] = first;
        leftTabs[2] = second;
        break;
    }
  });

  edges.forEach((pieceIndex, positionIndex) => {
    const color = EDGE_SOURCE_COLORS[pieceIndex];
    switch (positionIndex) {
      case 0:
        backTabs[1] = color;
        break;
      case 1:
        rightTabs[1] = color;
        break;
      case 2:
        frontTabs[1] = color;
        break;
      case 3:
        leftTabs[1] = color;
        break;
    }
  });

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

  const shapes: React.ReactNode[] = [];

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      shapes.push(rect((c + 1) * cell, (r + 1) * cell, YELLOW, `u-${r}-${c}`));
    }
  }
  for (let c = 0; c < 3; c++) {
    shapes.push(rect((c + 1) * cell, 0, backTabs[c], `b-${c}`));
    shapes.push(rect((c + 1) * cell, 4 * cell, frontTabs[c], `f-${c}`));
  }
  for (let r = 0; r < 3; r++) {
    shapes.push(rect(0, (r + 1) * cell, leftTabs[r], `l-${r}`));
    shapes.push(rect(4 * cell, (r + 1) * cell, rightTabs[r], `r-${r}`));
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {shapes}
    </svg>
  );
}
