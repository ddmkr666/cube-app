import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ConnectPanel({ status, onConnect, onDisconnect, onRequestState }) {
    const connected = status.state === "connected";
    const connecting = status.state === "connecting";
    const supported = typeof navigator !== "undefined" && "bluetooth" in navigator;
    return (_jsxs("div", { className: "panel", children: [_jsx("h3", { children: "Connection" }), !supported && (_jsx("p", { style: { color: "var(--err)", fontSize: 12 }, children: "Web Bluetooth is not available in this browser. Use a desktop Chromium browser." })), _jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [!connected ? (_jsx("button", { onClick: onConnect, disabled: !supported || connecting, children: connecting ? "Connecting…" : "Connect cube" })) : (_jsx("button", { className: "secondary", onClick: onDisconnect, children: "Disconnect" })), _jsx("button", { className: "secondary", onClick: onRequestState, disabled: !connected, children: "Request state" })] })] }));
}
