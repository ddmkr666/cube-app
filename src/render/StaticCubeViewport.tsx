import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Cube3D } from "./Cube3D";

interface StaticCubeViewportProps {
  facelets: string;
}

export function StaticCubeViewport({ facelets }: StaticCubeViewportProps) {
  return (
    <div className="cube-stage cube-stage--static">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 2.35, 7.7], fov: 31 }}
        style={{ width: "100%", flex: 1, background: "transparent" }}
      >
        <color attach="background" args={["#161b23"]} />
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[4.5, 7, 5.5]}
          intensity={1.0}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0002}
        />
        <directionalLight position={[-4, 2, -3]} intensity={0.2} color="#ffffff" />
        <group rotation={[-0.45, 0.7, 0]}>
          <Cube3D facelets={facelets} />
        </group>
        <ContactShadows
          position={[0, -3.15, 0]}
          opacity={0.1}
          scale={8}
          blur={2.4}
          far={4.5}
          resolution={1024}
          color="#050505"
        />
        <OrbitControls enablePan={false} minDistance={4.5} maxDistance={11} />
      </Canvas>
    </div>
  );
}
