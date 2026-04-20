import { useEffect, useRef } from "react";
import * as THREE from "three";
import { MoveRecord } from "../cube/types";

/**
 * Returns the body-frame quaternion the core (gyro sensor) experiences for
 * wide and slice moves.  Face moves (R/L/U/D/F/B) and whole-cube rotations
 * (x/y/z) don't move the core and return null.
 *
 * The axis/angle convention mirrors parseMoveAnimation in Cube3D so the
 * quaternion is already in Three.js scene coordinates.
 */
function coreBodyRotation(move: string): THREE.Quaternion | null {
  const face = move[0];
  const suffix = move.slice(1);

  let axis: "x" | "y" | "z";
  let sign: 1 | -1;

  switch (face) {
    case "r": axis = "x"; sign =  1; break;
    case "l": axis = "x"; sign = -1; break;
    case "u": axis = "y"; sign =  1; break;
    case "d": axis = "y"; sign = -1; break;
    case "f": axis = "z"; sign =  1; break;
    case "b": axis = "z"; sign = -1; break;
    case "M": axis = "x"; sign = -1; break;
    case "E": axis = "y"; sign = -1; break;
    case "S": axis = "z"; sign =  1; break;
    default: return null;
  }

  let turns = -sign;
  if (suffix === "'") turns *= -1;
  if (suffix === "2") turns *= 2;

  const axisVec = new THREE.Vector3(
    axis === "x" ? 1 : 0,
    axis === "y" ? 1 : 0,
    axis === "z" ? 1 : 0,
  );
  return new THREE.Quaternion().setFromAxisAngle(axisVec, (Math.PI / 2) * turns);
}

/**
 * Accumulates gyro drift from wide/slice moves so GyroRotator can cancel it.
 *
 * Two sources are watched to handle different GAN firmware behaviours:
 *
 * 1. hardwareLastMove — raw MOVE events from the cube (~1 frame latency).
 *    Some GAN firmware versions report M, M', r, etc. directly.  When they do,
 *    the correction fires immediately and the visual artifact is imperceptible.
 *
 * 2. faceletLastMove  — move inferred from facelet diffs (~200 ms latency).
 *    Catches wide/slice moves that only show up as gyro-only activity and never
 *    fire a MOVE event.  A pending counter prevents double-counting when the
 *    hardware already handled the same physical move.
 */
export function useGyroCoreCorrection(
  hardwareLastMove: MoveRecord | null,
  faceletLastMove: MoveRecord | null,
): {
  correctionRef: React.MutableRefObject<THREE.Quaternion>;
  resetCorrection: () => void;
} {
  const correctionRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const hardwareSerialRef = useRef<number | null>(null);
  const faceletSerialRef = useRef<number | null>(null);
  // Counts hardware corrections that haven't yet been "consumed" by the
  // matching facelet correction.  Prevents applying the same correction twice.
  const hardwarePendingRef = useRef<number>(0);

  // Primary: immediate hardware MOVE events (~1 frame latency)
  useEffect(() => {
    if (!hardwareLastMove || hardwareLastMove.serial === hardwareSerialRef.current) return;
    hardwareSerialRef.current = hardwareLastMove.serial;

    const R = coreBodyRotation(hardwareLastMove.move);
    if (!R) return;

    hardwarePendingRef.current++;
    correctionRef.current = correctionRef.current.clone().multiply(R);
  }, [hardwareLastMove]);

  // Fallback: facelet-inferred moves (~200 ms latency, gyro-only firmware)
  useEffect(() => {
    if (!faceletLastMove || faceletLastMove.serial === faceletSerialRef.current) return;
    faceletSerialRef.current = faceletLastMove.serial;

    const R = coreBodyRotation(faceletLastMove.move);
    if (!R) return;

    if (hardwarePendingRef.current > 0) {
      // Hardware already applied this correction; just consume the pending slot.
      hardwarePendingRef.current--;
      return;
    }

    correctionRef.current = correctionRef.current.clone().multiply(R);
  }, [faceletLastMove]);

  const resetCorrection = () => {
    correctionRef.current = new THREE.Quaternion();
    hardwarePendingRef.current = 0;
  };

  return { correctionRef, resetCorrection };
}
