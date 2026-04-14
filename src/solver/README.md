# Solver / analysis layer (placeholder)

Future home for:

- piece position & orientation inspection (from `FACELET_GEOMETRY`)
- solve-stage classification (cross, F2L, OLL, PLL)
- CFOP-oriented suggestion generation
- algorithm playback driving `Cube3D` highlights

This layer should consume a `CubeState` (from `../cube/types`) and emit
analysis results as plain data. It must not import from `../bluetooth`
or `../render` so rendering/UI stays free to change independently.
