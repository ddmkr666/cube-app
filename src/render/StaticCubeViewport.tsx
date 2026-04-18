import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Cube3D } from "./Cube3D";

interface StaticCubeViewportProps {
  facelets: string;
}

export function StaticCubeViewport({ facelets }: StaticCubeViewportProps) {
  return (
    <div className="cube-stage cube-stage--static">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 2.35, 7.7], fov: 31 }}
        style={{ width: "100%", flex: 1, background: "transparent" }}
      >
        <color attach="background" args={["#161b23"]} />
        <group rotation={[-0.45, 0.7, 0]}>
          <Cube3D facelets={facelets} />
        </group>
        <OrbitControls enablePan={false} minDistance={4.5} maxDistance={11} />
      </Canvas>
    </div>
  );
}
