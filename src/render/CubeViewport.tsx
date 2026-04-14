import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Cube3D } from "./Cube3D";

interface CubeViewportProps {
  facelets: string;
}

/**
 * Full-bleed 3D viewport containing the cube. Camera + lighting live here
 * so Cube3D stays a pure data-driven renderer.
 */
export function CubeViewport({ facelets }: CubeViewportProps) {
  return (
    <Canvas
      camera={{ position: [4.2, 3.8, 5.2], fov: 38 }}
      style={{ width: "100%", height: "100%", background: "#0f1115" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 8, 4]} intensity={0.9} />
      <directionalLight position={[-5, -3, -4]} intensity={0.35} />
      <Cube3D facelets={facelets} />
      <OrbitControls enablePan={false} minDistance={4} maxDistance={14} />
    </Canvas>
  );
}
