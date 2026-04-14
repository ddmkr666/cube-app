import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Cube3D } from "./Cube3D";
/**
 * Full-bleed 3D viewport containing the cube. Camera + lighting live here
 * so Cube3D stays a pure data-driven renderer.
 */
export function CubeViewport({ facelets }) {
    return (_jsxs(Canvas, { camera: { position: [4.2, 3.8, 5.2], fov: 38 }, style: { width: "100%", height: "100%", background: "#0f1115" }, children: [_jsx("ambientLight", { intensity: 0.55 }), _jsx("directionalLight", { position: [6, 8, 4], intensity: 0.9 }), _jsx("directionalLight", { position: [-5, -3, -4], intensity: 0.35 }), _jsx(Cube3D, { facelets: facelets }), _jsx(OrbitControls, { enablePan: false, minDistance: 4, maxDistance: 14 })] }));
}
