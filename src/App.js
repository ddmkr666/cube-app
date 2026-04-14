import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCubeConnection } from "./hooks/useCubeConnection";
import { CubeViewport } from "./render/CubeViewport";
import { ConnectPanel } from "./ui/ConnectPanel";
import { DebugPanel } from "./ui/DebugPanel";
import { StatusPanel } from "./ui/StatusPanel";
export function App() {
    const cube = useCubeConnection();
    return (_jsxs("div", { className: "app", children: [_jsx("header", { className: "app__header", children: "Cube App \u00B7 GAN 356 i3" }), _jsxs("aside", { className: "app__side", children: [_jsx(ConnectPanel, { status: cube.status, onConnect: cube.connect, onDisconnect: cube.disconnect, onRequestState: cube.requestFacelets }), _jsx(StatusPanel, { status: cube.status, solved: cube.solved }), _jsx(DebugPanel, { facelets: cube.facelets, lastMove: cube.lastMove, moveHistory: cube.moveHistory })] }), _jsx("main", { className: "app__main", children: _jsx(CubeViewport, { facelets: cube.facelets }) })] }));
}
