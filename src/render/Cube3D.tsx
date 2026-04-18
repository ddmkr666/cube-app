import { useMemo } from "react";
import * as THREE from "three";
import { FACELET_GEOMETRY } from "../cube/geometry";
import { Face } from "../cube/types";
import { CUBIE_BODY, FACE_COLORS, FaceColors } from "./colors";

interface Cube3DProps {
  facelets: string;
  faceColors?: FaceColors;
  /** Optional per-facelet highlight color (future: suggested moves, CFOP stages). */
  highlights?: Partial<Record<number, string>>;
}

const CUBIE_SIZE = 0.992;
const STICKER_SIZE = 0.925;
const STICKER_RADIUS = 0.032;
const STICKER_DEPTH = 0.018;
const STICKER_OFFSET = CUBIE_SIZE / 2 + STICKER_DEPTH * 0.26;

function createRoundedStickerGeometry() {
  const half = STICKER_SIZE / 2;
  const radius = Math.min(STICKER_RADIUS, half - 0.01);
  const shape = new THREE.Shape();

  shape.moveTo(-half + radius, -half);
  shape.lineTo(half - radius, -half);
  shape.quadraticCurveTo(half, -half, half, -half + radius);
  shape.lineTo(half, half - radius);
  shape.quadraticCurveTo(half, half, half - radius, half);
  shape.lineTo(-half + radius, half);
  shape.quadraticCurveTo(-half, half, -half, half - radius);
  shape.lineTo(-half, -half + radius);
  shape.quadraticCurveTo(-half, -half, -half + radius, -half);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: STICKER_DEPTH,
    bevelEnabled: false,
    curveSegments: 7,
  });

  geometry.center();
  return geometry;
}

/**
 * Renders a 3x3x3 Rubik's cube. The cube body is drawn as 27 black cubies,
 * then each of the 54 facelets is drawn as a small colored plane parented
 * to the outward face of its cubie.
 *
 * Rendering is data-driven: pass a facelet string and the cube re-colors.
 * Highlights are keyed by facelet index so future features (suggested moves,
 * CFOP stages) can overlay on top without touching this component.
 */
export function Cube3D({ facelets, faceColors = FACE_COLORS, highlights }: Cube3DProps) {
  const cubies = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) positions.push([x, y, z]);
    return positions;
  }, []);
  const stickerGeometry = useMemo(() => createRoundedStickerGeometry(), []);

  return (
    <group>
      {cubies.map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE]} />
          <meshBasicMaterial color={CUBIE_BODY} toneMapped={false} />
        </mesh>
      ))}

      {FACELET_GEOMETRY.map((g) => {
        const c = (facelets[g.index] ?? "U") as Face;
        const color = highlights?.[g.index] ?? faceColors[c] ?? "#888";

        const [x, y, z] = g.pos;
        let position: [number, number, number] = [x, y, z];
        let rotation: [number, number, number] = [0, 0, 0];

        switch (g.normal.axis) {
          case "x":
            position = [x + g.normal.sign * STICKER_OFFSET, y, z];
            rotation = [0, (Math.PI / 2) * g.normal.sign, 0];
            break;
          case "y":
            position = [x, y + g.normal.sign * STICKER_OFFSET, z];
            rotation = [(-Math.PI / 2) * g.normal.sign, 0, 0];
            break;
          case "z":
            position = [x, y, z + g.normal.sign * STICKER_OFFSET];
            rotation = [0, g.normal.sign === 1 ? 0 : Math.PI, 0];
            break;
        }

        return (
          <mesh key={g.index} position={position} rotation={rotation}>
            <primitive object={stickerGeometry} attach="geometry" />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}
