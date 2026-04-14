# Cube App

Local-first browser app for the GAN 356 i3 smart Rubik's cube.

This is the MVP iteration: connect over Bluetooth, read cube state, render it
live on a 3D cube, show basic status / debug info. The architecture is laid
out so later iterations can add CFOP-aware analysis and solving guidance
without disturbing the Bluetooth or rendering layers.

## Requirements

- A desktop Chromium browser (Chrome, Edge, Brave, Arc). Firefox and Safari
  are out of scope — Web Bluetooth isn't supported there.
- Node 18+.
- A GAN 356 i3 smart cube, paired over Bluetooth.

## Install & run

```bash
npm install
npm run dev
```

Open http://localhost:5173 in a Chromium browser, click **Connect cube**,
pick your GAN 356 i3 in the Web Bluetooth dialog, and turn the cube — the
3D view updates live.

Other scripts:

- `npm run typecheck` — TypeScript project check
- `npm run build`     — production build
- `npm run preview`   — preview a production build

## Architecture

```
src/
  bluetooth/   # gan-web-bluetooth adapter + connection lifecycle
  cube/        # domain model: facelet parsing, 3D geometry, solved check
  render/      # react-three-fiber viewport + data-driven 3D cube
  ui/          # connect / status / debug panels
  hooks/       # React bridge between bluetooth service and components
  solver/      # placeholder for CFOP / analysis / suggestions (future)
```

Key design rules:

1. **Facelets are the source of truth.** Every `MOVE` event triggers a fresh
   `REQUEST_FACELETS`, so the 3D view can't drift out of sync with the
   physical cube.
2. **Bluetooth is not imported from UI/render code.** All BLE details live
   in `src/bluetooth` behind a narrow service that emits `CubeUpdate`
   objects. Swapping the library or adding more cubes later is local to
   that folder.
3. **Rendering is data-driven.** `Cube3D` takes a 54-char facelet string and
   paints stickers via `FACELET_GEOMETRY` — the same mapping future
   analysis code can use to reason about piece positions. A `highlights`
   prop is already in place for suggested-move / CFOP overlays.
4. **Domain model is cube-agnostic.** `src/cube` knows nothing about GAN or
   React; it can back a solver, replay, or scramble importer unchanged.

## Not in this iteration

- CFOP logic, algorithm suggestions, solver.
- Move history UI beyond the debug panel.
- Support for smart cubes other than the GAN 356 i3.
- Cloud / auth / backend.
- Mobile, Firefox, Safari.
