/**
 * For a given face, list the (x,y,z) positions of its 9 facelets in the
 * order they appear in the facelet string (row-major, viewer perspective).
 */
function positionsForFace(face) {
    const pos = [];
    switch (face) {
        case "U": // y = +1, rows back(-z) -> front(+z), cols left(-x) -> right(+x)
            for (let r = 0; r < 3; r++)
                for (let c = 0; c < 3; c++)
                    pos.push([c - 1, 1, r - 1]);
            return pos;
        case "D": // y = -1, rows front(+z) -> back(-z), cols left(-x) -> right(+x)
            for (let r = 0; r < 3; r++)
                for (let c = 0; c < 3; c++)
                    pos.push([c - 1, -1, 1 - r]);
            return pos;
        case "F": // z = +1, rows top(+y) -> bottom(-y), cols left(-x) -> right(+x)
            for (let r = 0; r < 3; r++)
                for (let c = 0; c < 3; c++)
                    pos.push([c - 1, 1 - r, 1]);
            return pos;
        case "B": // z = -1, viewed from behind: cols right(+x) -> left(-x), rows top -> bottom
            for (let r = 0; r < 3; r++)
                for (let c = 0; c < 3; c++)
                    pos.push([1 - c, 1 - r, -1]);
            return pos;
        case "R": // x = +1, viewed from right: cols front(+z) -> back(-z), rows top -> bottom
            for (let r = 0; r < 3; r++)
                for (let c = 0; c < 3; c++)
                    pos.push([1, 1 - r, 1 - c]);
            return pos;
        case "L": // x = -1, viewed from left: cols back(-z) -> front(+z), rows top -> bottom
            for (let r = 0; r < 3; r++)
                for (let c = 0; c < 3; c++)
                    pos.push([-1, 1 - r, c - 1]);
            return pos;
    }
}
const FACE_NORMAL = {
    U: { axis: "y", sign: 1 },
    D: { axis: "y", sign: -1 },
    F: { axis: "z", sign: 1 },
    B: { axis: "z", sign: -1 },
    R: { axis: "x", sign: 1 },
    L: { axis: "x", sign: -1 },
};
const FACE_ORDER_GEOM = ["U", "R", "F", "D", "L", "B"];
export const FACELET_GEOMETRY = (() => {
    const out = [];
    FACE_ORDER_GEOM.forEach((face, fi) => {
        const positions = positionsForFace(face);
        const normal = FACE_NORMAL[face];
        positions.forEach((pos, i) => {
            out.push({ index: fi * 9 + i, face, pos, normal });
        });
    });
    return out;
})();
