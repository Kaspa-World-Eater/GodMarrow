# The effects engine: nodes in a graph, a library with levers, the Effects bench

Track `track/effects`, 2026-10-05. Our own code throughout (gradient lattice noise, Worley cells, curl of a potential,
position verlet, OKLab everywhere); nothing copied from any tool.

## Where it lives

- `tools/pixelforge/pixelforge/effects/`: `graph.py` (the evaluator, the registry, lever expressions), `noise.py`
  (tileable Perlin, simplex-style, ridged, value, cellular, flow, blue), `sources.py` (noise nodes, shapes, the emitter,
  `flame_body`, `bolt`, `threads`, `eyes`, `mouths`), `shaping.py`, `colour.py` (ramps, paint, the OKLab lock, cycling,
  dither, the displacement map), `compose.py` (layers and blends, depth and sprite stacking, Voronoi fracture, path
  scatter, mirrors, `effect` layers, `echo`), `sims.py` (smoke, rope, cloth), `output.py` (frames, sheets, GIFs,
  rotations, the displacement preview), `library.py` (33 saved graphs in 9 families), `compat.py` (the shim).
- CLI `pixelforge effects list|render|graph|preview|nodes`; MCP `render_effect`, `list_effects`.
- Forge: `forge/scripts/screens/effects.gd` (Effect, Layers, Looks, Pick, Export); `forge/scripts/editor/anchors.gd`
  carries the library names (`LIBRARY`) and the old words (`LEGACY`, `resolve`).
- Docs: GUIDE_HUMANS "Effects", GUIDE_AI "The effects engine"; GIFs in `docs/screens/effects/`; bench shots
  `docs/screens/forgeapp/effects_*.png`.

## Measurements

- 80 node ops; 33 library effects; 28 palettes. Every library effect renders in 0.01 to 0.13 s on the cloud box
  (`render_effect` reports `seconds`); the flame at 64x64, 8 frames, in about 0.09 s.
- Palette discipline: a sheet's colours are a subset of its ramp LUTs (checked for every effect but the two
  displacement sheets); alpha is 0 or 255 everywhere.
- Determinism: a node's generator is `blake2b(f"{seed}:{node id}")`, so changing one node never moves another's dice;
  the test renders twice and compares bytes.

## What the critique rounds taught (four rounds over every family, judged on 3x contact sheets)

1. A `gain` with `lift` floods the whole canvas above the paint cut: the torch painted a brown rectangle and
   bone_shards fractured the entire canvas. `gain(inside=true)` lifts only the lit area.
2. The emitter's default `speed_curve` was `linear` (velocity scaled by age), so every particle started from rest:
   rain, snow, wisps and blood barely travelled. The default is `flat`.
3. Trails stamped one disc per frame, so a fast drop left dots; the trail now fills each segment with sub-steps.
4. `flame_body` extended below its base to the canvas bottom (hidden in `flame`, visible under `torch`).
5. Palette cycling over a whole body flashes; the waterfall and the portal now move by scrolled, stretched noise and a
   running highlight instead. Noise nodes took a `stretch` (tall cells: water, cracks; wide cells: fog banks).
6. A loop caps a particle's age at the frame count, so a looping emitter's reach is `speed * frames`, not
   `speed * life`.
7. `circle.falloff`: smaller is steeper (it is the exponent's reciprocal); `polygon` arm tips sit at the apothem, so a
   runner that must reach a ring of radius r needs radius about 2r.

## Tests and shots

`tests/test_effects.py`: 93 checks (node families, graph errors and lever-expression safety, timing, every library
effect, the shim over 41 old kinds and 11 spell presets, the CLI verbs). `check_scripts` 33/0, `test_editor` 106/0,
`test_scene` 21/0; `ONLY=effects screens.sh` five tabs, 0 errors.

## Short, and what is stubbed

- The anchors the editor drops still bake to a list; the game's loader does not read them yet.
- The bench's Layers canvas is fixed at 96x72, 12 frames; a graph file written by hand can be any size.
- No sprite-stacking or Voronoi effects in the library yet (the nodes exist and are tested).
- The GIFs were judged by eye on contact sheets, not in the game's light; the Export tab's "See it in the game" is
  the next look.
