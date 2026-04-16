import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Cube3D } from "./Cube3D";

interface StaticCubeViewportProps {
  facelets: string;
}

export function StaticCubeViewport({ facelets }: StaticCubeViewportProps) {
  return (
    <Canvas
      camera={{ position: [0, 2.8, 8.5], fov: 34 }}
      style={{ width: "100%", flex: 1, background: "#0f1115" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[6, 8, 4]} intensity={0.95} />
      <directionalLight position={[-5, -3, -4]} intensity={0.3} />
      <group rotation={[-0.45, 0.7, 0]}>
        <Cube3D facelets={facelets} />
      </group>
      <OrbitControls enablePan={false} minDistance={4} maxDistance={14} />
    </Canvas>
  );
}
