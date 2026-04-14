import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function StatusPanel({ status, solved }) {
    const { label, dot } = describe(status);
    return (_jsxs("div", { className: "panel", children: [_jsx("h3", { children: "Status" }), _jsxs("dl", { className: "kv", children: [_jsx("dt", { children: "Connection" }), _jsxs("dd", { children: [_jsx("span", { className: `dot dot--${dot}` }), label] }), _jsx("dt", { children: "Device" }), _jsx("dd", { children: status.state === "connected" ? status.deviceName : "—" }), _jsx("dt", { children: "Solved" }), _jsxs("dd", { children: [_jsx("span", { className: `dot dot--${solved ? "ok" : "warn"}` }), solved ? "Yes" : "No"] })] }), status.state === "error" && (_jsx("p", { style: { color: "var(--err)", fontSize: 12, marginTop: 8 }, children: status.message }))] }));
}
function describe(s) {
    switch (s.state) {
        case "connected": return { label: "Connected", dot: "ok" };
        case "connecting": return { label: "Connecting…", dot: "warn" };
        case "error": return { label: "Error", dot: "err" };
        case "disconnected": return { label: "Disconnected", dot: "err" };
    }
}
