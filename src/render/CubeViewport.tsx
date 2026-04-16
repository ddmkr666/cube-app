import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Cube3D } from "./Cube3D";
import { RawQuaternion } from "../bluetooth/ganCube";

interface CubeViewportProps {
  facelets: string;
  gyroCurrentRef: React.MutableRefObject<RawQuaternion | null>;
  gyroResetRef: React.MutableRefObject<RawQuaternion | null>;
  gyroFrame?: "standard" | "yellow-top";
}

/**
 * Change-of-basis quaternion: GAN body frame → Three.js scene frame.
 *
 * GAN:     +X = Red (R),  +Y = Blue (B), +Z = White (U)
 * Three.js: +X = Right(R), +Y = Up (U/White), +Z = Front (F/Green)
 *
 * Mapping: Three_x = GAN_x, Three_y = GAN_z, Three_z = -GAN_y
 * This equals a –90° rotation around X: q = (–√2/2, 0, 0, √2/2)
 */
const BASIS = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2);
const BASIS_INV = BASIS.clone().invert();

function ganToThree(q: RawQuaternion): THREE.Quaternion {
  const ganQ = new THREE.Quaternion(q.x, q.y, q.z, q.w);
  // conjugate-transform: BASIS * q * BASIS⁻¹
  return BASIS.clone().multiply(ganQ).multiply(BASIS_INV);
}

const _current = new THREE.Quaternion();
const _ref = new THREE.Quaternion();
const _target = new THREE.Quaternion();

interface GyroRotatorProps {
  facelets: string;
  gyroCurrentRef: React.MutableRefObject<RawQuaternion | null>;
  gyroResetRef: React.MutableRefObject<RawQuaternion | null>;
  gyroFrame: "standard" | "yellow-top";
}

const TRAINER_FRAME = new THREE.Quaternion(0, 0, 1, 0);
const TRAINER_FRAME_INV = TRAINER_FRAME.clone().invert();

/**
 * Wraps Cube3D in a group whose rotation tracks the physical cube's gyro.
 * Runs inside the R3F Canvas so it can use useFrame without re-rendering React.
 */
function GyroRotator({ facelets, gyroCurrentRef, gyroResetRef, gyroFrame }: GyroRotatorProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current || !gyroCurrentRef.current) return;

    _current.copy(ganToThree(gyroCurrentRef.current));

    if (gyroResetRef.current) {
      _ref.copy(ganToThree(gyroResetRef.current));
      // delta = current * ref⁻¹  →  rotation from reset-position to now
      _target.copy(_ref).invert().multiply(_current);
    } else {
      _target.copy(_current);
    }

    if (gyroFrame === "yellow-top") {
      _target.premultiply(TRAINER_FRAME).multiply(TRAINER_FRAME_INV);
    }

    // Smooth interpolation so the rendered cube doesn't jitter.
    groupRef.current.quaternion.slerp(_target, 0.2);
  });

  return (
    <group ref={groupRef}>
      <Cube3D facelets={facelets} />
    </group>
  );
}

export function CubeViewport({
  facelets,
  gyroCurrentRef,
  gyroResetRef,
  gyroFrame = "standard",
}: CubeViewportProps) {
  return (
    <Canvas
      camera={{ position: [0, 2.5, 9], fov: 34 }}
      style={{ width: "100%", flex: 1, background: "#0f1115" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 8, 4]} intensity={0.9} />
      <directionalLight position={[-5, -3, -4]} intensity={0.35} />
      <GyroRotator
        facelets={facelets}
        gyroCurrentRef={gyroCurrentRef}
        gyroResetRef={gyroResetRef}
        gyroFrame={gyroFrame}
      />
      <OrbitControls enablePan={false} minDistance={4} maxDistance={14} />
    </Canvas>
  );
}
