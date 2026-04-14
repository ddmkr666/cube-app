import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { FACELET_GEOMETRY } from "../cube/geometry";
import { CUBIE_BODY, FACE_COLORS } from "./colors";
const CUBIE_SIZE = 0.96; // leaves a thin gap between cubies
const STICKER_SIZE = 0.86;
const STICKER_OFFSET = CUBIE_SIZE / 2 + 0.002;
/**
 * Renders a 3x3x3 Rubik's cube. The cube body is drawn as 27 black cubies,
 * then each of the 54 facelets is drawn as a small colored plane parented
 * to the outward face of its cubie.
 *
 * Rendering is data-driven: pass a facelet string and the cube re-colors.
 * Highlights are keyed by facelet index so future features (suggested moves,
 * CFOP stages) can overlay on top without touching this component.
 */
export function Cube3D({ facelets, highlights }) {
    const cubies = useMemo(() => {
        const positions = [];
        for (let x = -1; x <= 1; x++)
            for (let y = -1; y <= 1; y++)
                for (let z = -1; z <= 1; z++)
                    positions.push([x, y, z]);
        return positions;
    }, []);
    return (_jsxs("group", { children: [cubies.map((p, i) => (_jsxs("mesh", { position: p, children: [_jsx("boxGeometry", { args: [CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE] }), _jsx("meshStandardMaterial", { color: CUBIE_BODY, roughness: 0.6, metalness: 0.05 })] }, i))), FACELET_GEOMETRY.map((g) => {
                const c = (facelets[g.index] ?? "U");
                const color = highlights?.[g.index] ?? FACE_COLORS[c] ?? "#888";
                const [x, y, z] = g.pos;
                let position = [x, y, z];
                let rotation = [0, 0, 0];
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
                return (_jsxs("mesh", { position: position, rotation: rotation, children: [_jsx("planeGeometry", { args: [STICKER_SIZE, STICKER_SIZE] }), _jsx("meshStandardMaterial", { color: color, roughness: 0.45, metalness: 0.0 })] }, g.index));
            })] }));
}
