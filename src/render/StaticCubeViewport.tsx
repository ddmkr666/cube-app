import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Cube3D } from "./Cube3D";
import { FaceColors } from "./colors";

interface StaticCubeViewportProps {
  facelets: string;
  faceColors?: FaceColors;
}

export function StaticCubeViewport({ facelets, faceColors }: StaticCubeViewportProps) {
  return (
    <div className="cube-stage cube-stage--static">
      <Canvas
        flat
        dpr={[1, 2]}
        camera={{ position: [0, 3.15, 12.6], fov: 36 }}
        style={{ width: "100%", flex: 1, background: "transparent" }}
      >
        <color attach="background" args={["#161b23"]} />
        <group rotation={[-0.45, 0.7, 0]}>
          <Cube3D facelets={facelets} faceColors={faceColors} />
        </group>
        <OrbitControls enablePan={false} minDistance={5.5} maxDistance={13} />
      </Canvas>
    </div>
  );
}
