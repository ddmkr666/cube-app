import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FACELET_GEOMETRY } from "../cube/geometry";
import { Face, MoveRecord } from "../cube/types";
import { CUBIE_BODY, FACE_COLORS, FaceColors } from "./colors";
import { applyMoveToFacelets } from "../cube/moves";

interface Cube3DProps {
  facelets: string;
  faceColors?: FaceColors;
  lastMove?: MoveRecord | null;
  /** Optional per-facelet highlight color (future: suggested moves, CFOP stages). */
  highlights?: Partial<Record<number, string>>;
}

const CUBIE_SIZE = 0.992;
const STICKER_SIZE = 0.905;
const STICKER_RADIUS = 0.032;
const STICKER_OFFSET = CUBIE_SIZE / 2 + 0.03;
const MOVE_ANIMATION_MS = 160;
const FACELET_RESYNC_DELAY_MS = 750;

type Axis = "x" | "y" | "z";

interface CubieData {
  key: string;
  pos: [number, number, number];
  stickers: typeof FACELET_GEOMETRY;
}

interface MoveAnimation {
  axis: Axis;
  layers: (coord: number) => boolean;
  angle: number;
  startAt: number;
  targetFacelets: string;
}

interface PostAnimation {
  axis: Axis;
  layers: (coord: number) => boolean;
  angle: number;
}

function cubieKey([x, y, z]: [number, number, number]) {
  return `${x},${y},${z}`;
}

function parseMoveAnimation(move: string) {
  if (!move) return null;

  const face = move[0];
  const suffix = move.slice(1);
  let axis: Axis;
  let sign: 1 | -1;
  let layers: (coord: number) => boolean;

  switch (face) {
    case "R": axis = "x"; sign = 1; layers = (coord) => coord === 1; break;
    case "L": axis = "x"; sign = -1; layers = (coord) => coord === -1; break;
    case "U": axis = "y"; sign = 1; layers = (coord) => coord === 1; break;
    case "D": axis = "y"; sign = -1; layers = (coord) => coord === -1; break;
    case "F": axis = "z"; sign = 1; layers = (coord) => coord === 1; break;
    case "B": axis = "z"; sign = -1; layers = (coord) => coord === -1; break;
    case "r": axis = "x"; sign = 1; layers = (coord) => coord >= 0; break;
    case "l": axis = "x"; sign = -1; layers = (coord) => coord <= 0; break;
    case "u": axis = "y"; sign = 1; layers = (coord) => coord >= 0; break;
    case "d": axis = "y"; sign = -1; layers = (coord) => coord <= 0; break;
    case "f": axis = "z"; sign = 1; layers = (coord) => coord >= 0; break;
    case "b": axis = "z"; sign = -1; layers = (coord) => coord <= 0; break;
    case "M": axis = "x"; sign = -1; layers = (coord) => coord === 0; break;
    case "E": axis = "y"; sign = -1; layers = (coord) => coord === 0; break;
    case "S": axis = "z"; sign = 1; layers = (coord) => coord === 0; break;
    case "x": axis = "x"; sign = 1; layers = () => true; break;
    case "y": axis = "y"; sign = 1; layers = () => true; break;
    case "z": axis = "z"; sign = 1; layers = () => true; break;
    default:
      return null;
  }

  let turns = -sign;
  if (suffix === "'") turns *= -1;
  if (suffix === "2") turns *= 2;

    return {
      axis,
      layers,
      angle: (Math.PI / 2) * turns,
    };
  }

function eased(progress: number) {
  return -(Math.cos(Math.PI * progress) - 1) / 2;
}

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

  const geometry = new THREE.ShapeGeometry(shape, 7);
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
export function Cube3D({ facelets, faceColors = FACE_COLORS, lastMove, highlights }: Cube3DProps) {
  const cubies = useMemo<CubieData[]>(() => {
    const positions: [number, number, number][] = [];
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) positions.push([x, y, z]);

    return positions.map((pos) => ({
      key: cubieKey(pos),
      pos,
      stickers: FACELET_GEOMETRY.filter((g) =>
        g.pos[0] === pos[0] && g.pos[1] === pos[1] && g.pos[2] === pos[2],
      ),
    }));
  }, []);
  const stickerGeometry = useMemo(() => createRoundedStickerGeometry(), []);
  const cubieRefs = useRef(new Map<string, THREE.Group>());
  const animationRef = useRef<MoveAnimation | null>(null);
  const postAnimationRef = useRef<PostAnimation | null>(null);
  const pendingMovesRef = useRef<MoveRecord[]>([]);
  const committedFaceletsRef = useRef(facelets);
  const latestFaceletsRef = useRef(facelets);
  const pendingFaceletsSyncRef = useRef<string | null>(null);
  const lastMoveAtRef = useRef(0);
  const lastQueuedSerialRef = useRef<number | null>(lastMove?.serial ?? null);
  const [renderFacelets, setRenderFacelets] = useState(facelets);
  // Kept in sync with renderFacelets each render so useFrame can read it without stale closure.
  const renderFaceletsRef = useRef(facelets);
  renderFaceletsRef.current = renderFacelets;

  useEffect(() => {
    latestFaceletsRef.current = facelets;
    if (
      !animationRef.current
      && pendingMovesRef.current.length === 0
      && performance.now() - lastMoveAtRef.current > FACELET_RESYNC_DELAY_MS
    ) {
      committedFaceletsRef.current = facelets;
      setRenderFacelets(facelets);
      pendingFaceletsSyncRef.current = null;
    } else {
      pendingFaceletsSyncRef.current = facelets;
    }
  }, [facelets]);

  useEffect(() => {
    if (!lastMove || lastMove.serial === lastQueuedSerialRef.current) return;
    pendingMovesRef.current.push(lastMove);
    lastQueuedSerialRef.current = lastMove.serial;
    lastMoveAtRef.current = lastMove.localTimestamp;
  }, [lastMove]);

  useFrame(() => {
    const active = animationRef.current;

    if (!active && pendingMovesRef.current.length > 0) {
      const nextMove = pendingMovesRef.current.shift();
      if (nextMove) {
        const parsed = parseMoveAnimation(nextMove.move);
        if (parsed) {
          const startFacelets = committedFaceletsRef.current;
          const targetFacelets = applyMoveToFacelets(startFacelets, nextMove.move);
          animationRef.current = {
            axis: parsed.axis,
            layers: parsed.layers,
            angle: parsed.angle,
            startAt: performance.now(),
            targetFacelets,
          };
          postAnimationRef.current = null;
          setRenderFacelets(startFacelets);
        } else {
          committedFaceletsRef.current = latestFaceletsRef.current;
          setRenderFacelets(latestFaceletsRef.current);
        }
      }
    }

    if (
      !animationRef.current
      && pendingMovesRef.current.length === 0
      && pendingFaceletsSyncRef.current
      && performance.now() - lastMoveAtRef.current > FACELET_RESYNC_DELAY_MS
    ) {
      committedFaceletsRef.current = pendingFaceletsSyncRef.current;
      setRenderFacelets(pendingFaceletsSyncRef.current);
      pendingFaceletsSyncRef.current = null;
    }

    const animation = animationRef.current;
    const progress = animation
      ? Math.min((performance.now() - animation.startAt) / MOVE_ANIMATION_MS, 1)
      : 0;
    const angle = animation ? animation.angle * eased(progress) : 0;

    // Once React has committed the new facelets, drop the post-animation hold.
    if (postAnimationRef.current && renderFaceletsRef.current === committedFaceletsRef.current) {
      postAnimationRef.current = null;
    }

    const post = postAnimationRef.current;

    cubies.forEach((cubie) => {
      const ref = cubieRefs.current.get(cubie.key);
      if (!ref) return;

      ref.rotation.set(0, 0, 0);

      const activeAnim = animation ?? post;
      if (!activeAnim) return;

      const coord =
        activeAnim.axis === "x" ? cubie.pos[0]
          : activeAnim.axis === "y" ? cubie.pos[1]
            : cubie.pos[2];

      if (activeAnim.layers(coord)) {
        // During live animation use the eased angle; post-animation hold the final angle.
        const appliedAngle = animation ? angle : activeAnim.angle;
        if (activeAnim.axis === "x") ref.rotation.x = appliedAngle;
        if (activeAnim.axis === "y") ref.rotation.y = appliedAngle;
        if (activeAnim.axis === "z") ref.rotation.z = appliedAngle;
      }
    });

    if (animation && progress >= 1) {
      // Store completed animation so rotations stay held until React commits new colors.
      postAnimationRef.current = { axis: animation.axis, layers: animation.layers, angle: animation.angle };
      committedFaceletsRef.current = animation.targetFacelets;
      setRenderFacelets(committedFaceletsRef.current);
      animationRef.current = null;
    }
  });

  return (
    <group>
      {cubies.map((cubie) => (
        <group
          key={cubie.key}
          ref={(node) => {
            if (node) cubieRefs.current.set(cubie.key, node);
            else cubieRefs.current.delete(cubie.key);
          }}
        >
          <group position={cubie.pos}>
            <mesh renderOrder={0}>
              <boxGeometry args={[CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE]} />
              <meshBasicMaterial
                color={CUBIE_BODY}
                toneMapped={false}
                polygonOffset
                polygonOffsetFactor={1}
                polygonOffsetUnits={1}
              />
            </mesh>

            {cubie.stickers.map((g) => {
              const c = (renderFacelets[g.index] ?? "U") as Face;
              const color = highlights?.[g.index] ?? faceColors[c] ?? "#888";

              const [x, y, z] = g.pos;
              let position: [number, number, number] = [x, y, z];
              let rotation: [number, number, number] = [0, 0, 0];

              switch (g.normal.axis) {
                case "x":
                  position = [g.normal.sign * STICKER_OFFSET, 0, 0];
                  rotation = [0, (Math.PI / 2) * g.normal.sign, 0];
                  break;
                case "y":
                  position = [0, g.normal.sign * STICKER_OFFSET, 0];
                  rotation = [(-Math.PI / 2) * g.normal.sign, 0, 0];
                  break;
                case "z":
                  position = [0, 0, g.normal.sign * STICKER_OFFSET];
                  rotation = [0, g.normal.sign === 1 ? 0 : Math.PI, 0];
                  break;
              }

              return (
                <mesh key={g.index} position={position} rotation={rotation} renderOrder={1}>
                  <primitive object={stickerGeometry} attach="geometry" />
                  <meshBasicMaterial
                    color={color}
                    toneMapped={false}
                    polygonOffset
                    polygonOffsetFactor={-1}
                    polygonOffsetUnits={-1}
                  />
                </mesh>
              );
            })}
          </group>
        </group>
      ))}
    </group>
  );
}
