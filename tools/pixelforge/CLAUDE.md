# PixelForge

Pixel-art sprite pipeline for Godmarrow. **The character road is shape
sprites**: a `.shapes.json` of solids on the standard skeleton → the renderer
draws it as pixel art → the motion clips give every frame in 8 directions →
`export-game`. `pixelforge shapes ...` (template, measure, compare, detail,
sample-materials, validate, still, preview, render) and the Forge app's
Characters bench are that road, and characters default to the game's hero
height (the `godmarrow` preset, 195 px). Claude authors the model by hand
against the painting; `shapes detail` paints the detail layer that rides the
parts; `project build <character>` takes a model to the game. The old road
(cutouts → 3D via Blender + Mixamo → renders), the kit props, the automatic
drafts (`shapes draft`, `character from-picture`) and the old music generator
are retired behind `PIXELFORGE_OLD_ROADS=1` (`old_roads.py`). A painting is
measured (`shapes measure`) and compared against (`shapes compare`), never
carved or drafted from, for a character.

- **Operating the pipeline for a user:** read `docs/GUIDE_AI.md` first. It has
  every command, the project layout, the standard procedure and the failure
  table. The person-facing version is `docs/GUIDE_HUMANS.md`.
- **Code map:** `pixelforge/api.py` is the pipeline (one function per step);
  `gui.py` (the classic Tkinter Studio), `cli.py`, `mcp_server.py` and the
  Forge app (`forge/`, a Godot 4.7 project started by `forge_launch.py` /
  `pixelforge forge`; it only runs CLI commands, never the pipeline itself)
  are wrappers over it. `claude_bridge.py` is Claude on the bench: the Forge's describe line hands a sentence to the
  Claude Code CLI, which works through `mcp_server.py`'s tools (`docs/GUIDE_AI.md`, "Claude on the bench").
  `author_loop.py` is the character loop (`pixelforge character author`): Claude Code hand-authors a shape model
  against a painting in rounds, with `prompts_author.py` as its brief (the Hemomancer method); the Characters bench
  runs it for every painting dropped. `claude doctor` says why the describe line does nothing (six checks).
  Image algorithms: `grid.py` (pixel-grid detection), `palette.py` (OKLab
  k-means), `quantize.py`, `cleanup.py`, `pixelate.py`, `animate.py`
  (procedural effects), `transform.py` (RotSprite), `sheet.py` (split
  turnaround sheets), `model_spec.py` (inflated-cutout spec). Shape sprites
  (characters drawn by code, the character road): `shapes.py` (the renderer:
  flat masks and solid signed-distance shapes, one set of shading rules),
  `shape_rig.py` (bones from the motion clips, swing, the turn and place holds, ground lock, 8 directions),
  `shape_tools.py` (frame sets, GIFs, sheets), `joints.py` (numpy glTF reader,
  `assets/animations/joints.json.gz`); files under `assets/shapes/` (characters, objects, the
  material library); the procedure for a session is the game repository's `docs/GUIDE_SESSION.md`. Scripts that run
  inside Blender live in `pixelforge/blender/` and must stay free of Pillow.
- **Tests:** `pytest`. Blender scripts are only import-safe under Blender;
  `tests/test_blender_scripts.py` runs them when the `bpy` module is available.
- **Style:** OKLab for all color distance; never introduce colors outside a
  sprite's palette in a transform; every step returns a JSON-serializable dict.
