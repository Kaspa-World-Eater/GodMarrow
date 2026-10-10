# The 3D road (`tools/landkit3d/`)

The way Godmarrow's areas are built now (memory: "3D road chosen"; `docs/PAINTED_STANDARD.md`, "How each road paints").
The methods behind it are written up in `tools/art_study/library/methods/09-the-3d-road.md` and
`10-baking-a-land.md`; this page is the index of the code.

**The pipeline.** A scene module builds real 3D forms in Blender, in the game's own coordinates (`temple3d.py`,
`village3d.py`, `redwater3d.py`, `cliff3d.py`, `beach3d.py`, `cave3d.py`). A Blender driver renders the scene's *data*,
never a look: `blend_scene.py` for one camera, `blend_tiles.py` for many tiles. The data is saved to `passes.npz`
(normal, pos, mat, ao, moon, skyview, shelter, lamp, refl, obj, lamps and more; table below). A painter turns the passes
into pixel art to the painted standard: `paint3d.py` (the shared base: sky, moon, ramps, dither, the forest floor),
`paint_shore.py` (the overcast beach), `paint_cave.py` (a dark place lit only by its fires). `cine_check.py` measures
the painted frame against `docs/CINEMATOGRAPHY.md`. Bakes (`cove_bake.py`, `cave_bake.py`) render the zone in aligned
tiles, paint them and cut them into the chunks, height map and block map that the game's baked ground reads
(`world/baked_ground.gd`, from `art/zones/<zone>_s<seed>/`). Exporters (`cove_export.py`, `cave_export.py`) write the
zone file (`data/zones/<zone>_s<seed>.json.gz`), add it to `data/zones/index.json`, prove it walkable, and place the
start, portals, lights and folk.

```
scene (Blender) --blend_scene / blend_tiles--> passes.npz --painter--> PNG --cine_check--> numbers for the pass log
                                                                       \--bake--> art/zones/<zone>_s<seed>/ --export--> data/zones/
```

## Running things

- **Python:** `tools/pixelforge/.venv/Scripts/python` (Python 3.14 with numpy, scipy and Pillow). Run from the project
  root (`C:\Users\derek\GodMarrow`). Never the Windows Store python (`AppData\Local\Microsoft\WindowsApps\python.exe`).
- **Blender:** `C:/Program Files/Blender Foundation/Blender 4.5/blender.exe` (hard-coded as `BLENDER` in both bakes).
  Below, `blender` means that path. Blender's own Python is 3.11 (see `__pycache__`), so code that Blender imports
  must run on 3.11.
- Scene modules and `parts3d.py` import `bpy`: they run only inside Blender. Floor modules are pure numpy and run in
  both.

## The passes (`passes.npz`, written by `blend_scene.render_passes`)

All arrays are `[row, column]` at the render's size, in game coordinates.

| Key | What it holds |
|---|---|
| `normal` | the surface normal (x, y, z) |
| `pos` | the surface's world position in yards (x, y, z) |
| `mat` | the material's pass index (`parts3d.MATS`, 1 to 32; 0 is nothing) |
| `obj` | the object's own id (crc32 of its name), so every column or block can get its own tone |
| `alpha` | coverage (0 where nothing was hit) |
| `ao` | contact ambient occlusion, 3 yd reach |
| `moon` | the moon's direct diffuse light, with its true shadows |
| `skyview` | occlusion out to 12 yd: how much of the overcast a surface sees |
| `shelter` | 1 where the rain cannot reach (a sun straight down is blocked) |
| `lamp` | the scene's `LAMPS` alone, moon off, as RGB light through the real forms |
| `refl` | what each mirror (`mirror`, `pool`) sees: the world position it reflects, plus a hit flag (4 channels) |
| `lamps` | the lamps as rows of x, y, z, watts, r, g, b |
| `spouts`, `worn` | the scene's `SPOUTS` (x, y, z) and `WORN` (x0, y0, x1, y1, half width), for the painter |
| `floor` | the name of the scene's floor module (`FLOOR_MODULE`); the painter imports it by this name |
| `zoom`, `lamp_ref`, `ambient`, `time` | the render's zoom, the scene's `LAMP_REF` and `AMBIENT`, and `GM_T` |
| `gw`, `gh` | the render's width and height |

## The scene contract

A scene module is anything `blend_scene.py` can import by name from this folder. It must define
`build(root, material)`, which calls `parts3d.init(root, material)` first and then builds. It may set these module
constants (defaults in brackets):

| Constant | Meaning |
|---|---|
| `SAMPLES` [24] | Cycles samples (the cave uses 128: noise in fire light becomes noise of hue) |
| `LAMPS` [()] | the warm local lights: `(x, y, z, watts[, (r, g, b)])` |
| `FLOOR_MODULE` ["floor3d"] | the floor module the painter reads |
| `LAMP_REF` [0.09], `AMBIENT` [1.0] | the lamp pass's full-step value; how much sky light reaches in (the cave: 0.05, 0.05) |
| `SPOUTS`, `WORN` [()] | extra data for the painter (blood spouts, worn ways) |

**Coordinates:** yards; x runs screen right-down, y screen left-down, z up. A yard is 18 x 9 engine px on the ground
and 21 px of height: `sx = (x - y) * 18`, `sy = (x + y) * 9 - z * 21`. The game draws an engine px at 4 screen px. On
the coast, `shore_floor.st(x, y)` and `xy(s, t)` convert to s (distance seaward) and t (along the shore).

## Module index

EOL is each file's line endings, checked with Python on 2026-10-09. Keep them when you edit (see Gotchas).

### Blender drivers

| File | EOL | What it is | Reads, writes | Run |
|---|---|---|---|---|
| `blend_scene.py` | CRLF | Builds one scene and renders its data passes for one ortho camera matched to the game's. Holds the camera, moon, render setup, `material()`, and the lamp, sky and mirror passes. `--heightfield` replaces the forms with a top-down height field (the trial's version A). | the scene module; writes `OUT_DIR/passes.npz` (EXR scratch in `OUT_DIR/_p/`) | `blender --background --python tools/landkit3d/blend_scene.py -- SCENE OUT_DIR [FOCUS_X FOCUS_Y [W H]] [--zoom Z] [--heightfield]` (default 480 x 270) |
| `blend_tiles.py` | LF | Builds a scene once and renders its passes for many cameras: a bake's tiles. | the scene; `TILES.json` = `[{"out", "focus", "w", "h", "zoom"}]`; writes each `out/passes.npz` | `blender --background --python tools/landkit3d/blend_tiles.py -- SCENE TILES.json` (the bakes call it) |

### Scenes

All run through `blend_scene.py` or `blend_tiles.py`. Pass logs are in `tools/landkit/passes/`, reports in
`tools/art_study/reports/`.

| File | EOL | What it is | Reads, writes | Run |
|---|---|---|---|---|
| `temple3d.py` | CRLF | The destroyed Thai temple shrine, the 3D road's trial: platform, walls, half-fallen tiered roofs, serpent stair, boundary stones, guardian, spirit house, siege, tile heap, interior, ferns. `--inside` hides the roof and near walls from the camera but keeps their shade. Log `thai_temple.md`, report 06. | `parts3d`, `floor3d` | `blender --background --python tools/landkit3d/blend_scene.py -- temple3d OUT FX FY W H [--inside]` |
| `village3d.py` | LF | The Red Shore's village and coast, pass 1 (the massing): ground and river, drift logs, canoes, sea stacks, spruce fringe, giants, palisade, hide huts, the fire pit, the temple placed from `temple3d`. Log `red_shore_village.md`. | `parts3d`, `shore_floor`, `temple3d`; `FLOOR_MODULE = "shore_floor"` | `... blend_scene.py -- village3d OUT ...` (no focus given in its docstring) |
| `redwater3d.py` | CRLF | The Red Water and the black sand, the shore's first piece (early passes): fine sand mesh, the sea surface, the breaker, wrack, corpses, floating cloaks. Superseded as a scene by `beach3d.py`, but still a library: `cliff3d.build` calls its `sea`, `breaker`, `wrack`, `corpses`, `things`, `floating`; `beach3d` calls `corpse`, `_gz`, `_body_xy`. Log `red_water_sand.md`. | `parts3d`, `shore_floor`, `shore_fine` | `... blend_scene.py -- redwater3d OUT ...` |
| `cliff3d.py` | CRLF | The black basalt cliffs (the Red Shore's piece 2), and the shared **basalt-column kit**: `seeds()` (dart-thrown column centres), `cells()` (packed column cells), `rough_prism()` (rough drums, worn arrises), `chunk()`, `face_dist()`. `build()` is redwater3d's beach plus `cliffs_v2()`. `cliffs()` is the old hex version (graded D+), kept but not called. Log `black_cliffs.md`. | `parts3d`, `shore_floor`, `shore_fine`, `redwater3d` | `... blend_scene.py -- cliff3d OUT ...` |
| `beach3d.py` | LF | **The cove as baked into the game** (pass 5, chapter 13): sand by cause, sea, glossy film, the curling lip and bore (left out when `GM_CALM=1`), pebbles, wrack, the bone jam, the dead, the drowned, shrine, canoes, cairns, memorial pole, its own `cove_cliffs()` on cliff3d's kit, sea columns. Fills `OBSTACLES` (s, t, r) for the zone's grid. | `parts3d`, `beach_floor`, `shore_floor`, `redwater3d`, `cliff3d`; env `GM_T`, `GM_CALM`; writes `GM_OBST` | `blender --background --python tools/landkit3d/blend_scene.py -- beach3d OUT -48.44 -42.78 480 340` |
| `cave3d.py` | CRLF | **The opening cave** under the black cliffs: the blood pool, the stair of carved faces between basalt walls, the hall with the empty throne in a colossal face's mouth, dark mirrors with candles, fires (`LAMPS`), relics, the door out. `floor_at(x, y)` is its walking floor (`None` in rock). Roof and near walls are cut to stubs for the camera. Log `opening_cave.md`, report 07. | `parts3d`, cliff3d's basalt kit; `FLOOR_MODULE = "floor3d"`, `LAMP_REF = 0.05`, `AMBIENT = 0.05`, `SAMPLES = 128` | `... blend_scene.py -- cave3d OUT ...` |

### Shared parts and floors

| File | EOL | What it is | Reads, writes | Run |
|---|---|---|---|---|
| `parts3d.py` | CRLF | Reusable Blender parts in game yards: `box`, `poly` (slab), `grid` (height-field mesh), `quad_slab`, `tube` (a path with a radius per point), `sphere`, `cylinder`, `displace`, `outward`. `MATS` maps material name to pass index (1 to 32). Each object gets its own object-pass id. `flame` objects are unseen by the camera but seen in mirrors. | Blender only | imported by scenes |
| `floor3d.py` | CRLF | The temple's forest floor by cause (windthrow pits and mounds, the kept ground, runoff trench, worn way, roof rubble). `height(x, y)` in yards and `maps(x, y)` (the cause maps the painter reads). Pure numpy. Also the default `FLOOR_MODULE`. | none | imported |
| `shore_floor.py` | CRLF | The Red Shore's ground by cause, bands from the sea inland (foreshore, dry sand, storm line, backshore, bluff, terrace) and the river. `st`/`xy` coordinate conversion, `height`, `maps`. Pure numpy. | `floor3d` | imported |
| `shore_fine.py` | CRLF | `shore_floor` at footprint scale (0.06 yd meshes): wind ripples, swash ridges, the trail of prints; `water(s, t)`, the sea's surface shared by build and paint. Pure numpy. | `shore_floor`, `floor3d`; env `GM_T` | imported |
| `beach_floor.py` | LF | The cove's beach by cause (chapter 13): step, cusped beach face, berm, backshore dunes; the heartbeat wave clock (`heart`, `beat`, `sea_z`, `swash_front`, `foam_age`); the cove's walls and cleft (`cove_d`, `back_s`, `cleft_t`). Pure numpy. Shared by `beach3d`, `paint_shore`, `cove_bake`, `cove_export`. | `shore_floor`, `shore_fine`; env `GM_T`, `GM_CALM` | imported |

### Painters

| File | EOL | What it is | Reads, writes | Run |
|---|---|---|---|---|
| `body3d.py` | LF | The one body for every dead (chapter 15; `tools/landkit/passes/the_dead.md`): a skeleton at true size laid by its weight on `support(x, y)`, flesh as joined metaball masses, a hooded cloak shell, poses and states (`fresh`, `bloat`, `rot`, `bone`). Used by `redwater3d.corpse`, `beach3d.drowned`, `cave3d.pool_bodies`. | parts3d | `body(name, pose, state, x, y, yaw, support, seed, cloak)` inside Blender |
| `dead_sheet.py` | LF | The dead's proof sheet: every pose and state on a gently uneven ground. | body3d | `blender --background --python tools/landkit3d/blend_scene.py -- dead_sheet OUT 0.4 0.4 640 360 --zoom 3` |
| `value_render.py` | LF | The value-only test (MASTER_RULES 0.4): any passes in one grey, lit by the moon pass and occlusion. | `passes.npz` | `tools/pixelforge/.venv/Scripts/python tools/landkit3d/value_render.py PASSES_DIR OUT.png [SCALE]` |
| `paint3d.py` | CRLF | The shared painter: each material's ramp (`R`, `MAT`), `tone()` (ramp step with the 4x4 dither only at step edges), sky and moon light, lamp light, the floor painted from the scene's floor module, walls, roofs, sea, black sand; `place_hero()` puts the Ossuarch at true size. The painter for the scenes before the beach and the cave (its docstring names the temple; it also paints sea and black sand); its ramps and helpers are imported by the other two painters. | `passes.npz`; `tools/landkit/kit.py` and `litter_ground.py`; the floor module named in the passes; `art/sprites/ossuarch_hd.*`; writes a PNG at 4x | `tools/pixelforge/.venv/Scripts/python tools/landkit3d/paint3d.py PASSES_DIR OUT.png [HERO_X HERO_Y HERO_Z] [FOCUS_X FOCUS_Y]` |
| `paint_shore.py` | LF | The beach painter (chapter 13): overcast light, `form_tones()` (the five tones of form), the oxblood sea with sky by Fresnel, foam lace, the sand by wetness, the glossy film mirroring the cliffs and the pilgrim. `paint(d, t, hero=None)` returns `(img, alpha)`. | `passes.npz` (from beach3d), `paint3d`, `shore_floor`; writes PNG or WEBP | `tools/pixelforge/.venv/Scripts/python tools/landkit3d/paint_shore.py PASSES_DIR OUT.(png\|webp) [HERO_X HERO_Y HERO_Z FOCUS_X FOCUS_Y]` |
| `paint_cave.py` | LF | The cave painter (chapter 12): the light *is* the lamp pass, stepped down a short ramp; flickering fires painted at their lamps, sparks, the mirrors from the `refl` pass, the pool's gloss. `paint(d, t)` returns `(img, alpha)`. | `passes.npz` (from cave3d), `paint3d`; writes PNG, or an animated WEBP with `--frames` | `tools/pixelforge/.venv/Scripts/python tools/landkit3d/paint_cave.py PASSES_DIR OUT.(png\|webp) [HERO_X HERO_Y HERO_Z FOCUS_X FOCUS_Y] [--frames 8]` |

### Checks

| File | EOL | What it is | Reads, writes | Run |
|---|---|---|---|---|
| `cine_check.py` | CRLF | Measures a painted frame against the machine-testable rules of `docs/CINEMATOGRAPHY.md` (1, 2, 4, 5, 6, 7, 22, 27): sources, low key, the black note, one dark mass, squint masses, quiet darks, near dark far light, colour earned by fire. Prints PASS/FAIL per rule for the pass log. | a PNG; prints only | `tools/pixelforge/.venv/Scripts/python tools/landkit3d/cine_check.py FRAME.png [--exterior]` (interior rules are the default) |

The bakes' alignment check (`check_align`) is listed under the bakes.

### Bakes and exporters

| File | EOL | What it is | Reads, writes | Run |
|---|---|---|---|---|
| `cove_bake.py` | LF | Bakes the Red Shore's cove (zone `red_shore`, seed 9201) for the game: `render` builds `beach3d` once in Blender (`blend_tiles.py`) for every tile; `paint` paints each tile with `paint_shore`, checks its alignment, and cuts chunks. Sets `GM_CALM=1`, `GM_T=0.6` by default. | writes `WORK_DIR/t<A>_<B>/passes.npz`, `WORK_DIR/obst.json`, `blender.log`; and `art/zones/red_shore_s9201/`: `c<A>_<B>.webp`, `_n`, `_up`, `_up_n`, `height.png`, `block.png`, `obstacles.json`, `index.json` | `tools/pixelforge/.venv/Scripts/python tools/landkit3d/cove_bake.py WORK_DIR [render\|paint\|all]` |
| `cave_bake.py` | LF | Bakes the opening cave (zone `opening_cave`, seed 9301) the same way, through `cave3d` and `paint_cave`. Stubs `bpy` so it can import `cave3d.floor_at`. The walk floor is read once on a quarter-yard grid (`walk_grid`): `cave3d.floor_at`, the throne's dais (`cave3d.dais_at`), the stairs' landing onto the hall, the blood's surface in the pool. The block map comes from the render: any surface 0.35 to 2.4 yd above the highest walk floor within half a yard blocks (half a yard above the blood in the pool). The rock sorts at the floor of the room it borders; the camera-side cliffs fall to black below the rooms (`void_fade`). Sets `GM_T=0.0` by default. | writes `WORK_DIR/t*/passes.npz`, `blender.log`; `art/zones/opening_cave_s9301/` (same files, no `obstacles.json`) | `tools/pixelforge/.venv/Scripts/python tools/landkit3d/cave_bake.py WORK_DIR [render\|paint\|all]` |
| `cove_export.py` | LF | Writes the cove as a zone: walkable sand, the Red as WATER, cliffs and obstacles as ROCK, the cleft up to a portal to `hollow_wood`, the start under the right headland, a lantern (no waystone or stash: they wait for the first town). The storm (`weather` sandstorm, `wind`, `holdPhase` dawn) and the shore field `shore.png` (yards inland of the calm waterline, read by `shaders/baked_ground.gdshader`). Proves every walkable tile and the portal are reached from the start. Template: `sunken_bog_s9101.json.gz`; the hours' light from `ambient_outdoor.json`. | `art/zones/red_shore_s9201/obstacles.json`; writes `data/zones/red_shore_s9201.json.gz`, the `red_shore` entry in `data/zones/index.json`, `grid_check.png` in the bake folder | `tools/pixelforge/.venv/Scripts/python tools/landkit3d/cove_export.py` |
| `cave_export.py` | LF | Writes the cave as a zone: walk read from the bake's `block.png`, start in the pool, the Stranger (opens the Reading) on the top step, the dark mirror as the portal to `red_shore`, the fires as lights. Proves every walkable tile, the Stranger and the mirror are reached from the start, or writes nothing (`grid_check.png` shows the failure in yellow). The fires go in as `fire` lights at their true height (engine px, 21 a yard) over the walk floor; the pool's red glow as `raw` pools of light. Also adds `arrive.opening_cave` to the red_shore zone file and links the two in the index. The game starts a new pilgrim here only on trial (`--cave`, `GM_START=cave`, `user://start_in_cave`). | `art/zones/opening_cave_s9301/block.png`; the lamps from `WORK_DIR/t*/passes.npz`; writes `data/zones/opening_cave_s9301.json.gz`, edits `red_shore_s9201.json.gz` and `index.json`, `grid_check.png` | `tools/pixelforge/.venv/Scripts/python tools/landkit3d/cave_export.py [WORK_DIR]` (pass the bake's WORK_DIR, see Gotchas) |

### Other

Nothing else lives here. Outside dependencies: `paint3d.py` imports `ramp`, `vn`, `fbm`, `B4` from
`tools/landkit/kit.py` and the litter generator `tools/landkit/litter_ground.py`, so a change there changes this
road too. The bake format follows `tools/worldgen/bog_bake.py` (the Sunken Bog's bake).

## How to make a new scene and get it into the game

1. **Gate.** Read `docs/MASTER_RULES.md`, the area's lore, and the art library (`tools/art_study/chapters/`,
   `reports/`). Write the rules check in the piece's pass log, `tools/landkit/passes/<piece>.md`.
2. **Floor.** Write `<area>_floor.py`, pure numpy: `height(x, y)` in yards for every point, plus the maps your painter
   needs. Copy `beach_floor.py` (outdoor) or `floor3d.py`. A floor that `paint3d.py` paints must also give `maps(x, y)`
   with the keys it reads (`open`, `litter`, `cushion`, `kept`, ...).
3. **Scene.** Write `<area>3d.py` with `build(root, material)`: call `P.init(root, material)`, then build every form
   with `parts3d` at true size, feet set on the floor's height. Set `FLOOR_MODULE`, `LAMPS`, `SAMPLES` and the rest
   (the scene contract above). A new material needs a new index in `parts3d.MATS` and in `paint3d.MAT`, and a ramp in
   your painter.
4. **Render a still.** `blender --background --python tools/landkit3d/blend_scene.py -- <area>3d OUT FX FY W H`.
5. **Paint.** Start from the nearest painter (`paint_shore.py` outdoors, `paint_cave.py` for fire-lit interiors) as
   `paint_<area>.py`, keeping `paint(d, t)` returning `(img, alpha)`. Run it on `OUT`, with the hero for scale.
6. **Measure.** `cine_check.py` on the painted PNG; put the numbers in the pass log. Derek grades on the area's
   review page.
7. **Bake.** Copy `cove_bake.py` (outdoors) or `cave_bake.py` (interior) as `<area>_bake.py`. Set `ZONE`, `SEED`, the
   zone's world origin (`O` or `OX, OY`), `W`, `H`, the scene name in `render()`, the painter in `main()`, and what
   counts as ground and as blocking. Try a few tiles first (`GM_ONLY=t0_0`), read the "aligned to" lines, then run
   `all`.
8. **Export.** Copy `cove_export.py` or `cave_export.py` as `<area>_export.py`. It writes
   `data/zones/<zone>_s<seed>.json.gz`, adds the zone to `data/zones/index.json`, proves the walk, and places the
   start, portals, lights and folk. Look at `grid_check.png` in the bake folder.
9. **Play it.** Run the game with the user argument `--zone=<zone>` (`docs/wiki/13-godot.md`, section 10).
   `world/baked_ground.gd` finds the bake at `art/zones/<zone id>_s<seed>/index.json`; `--baked=0` turns it off.

## Gotchas

- **The 2 x 2 grid.** Bakes render at `RES = 2` texels an engine px and write `"scale": 2` (`SCALE = 4 // RES`) in
  `index.json`, so the game draws each texel at 2 x 2 screen px (painted standard 7, `docs/PAINTED_STANDARD.md`). A
  still from `blend_scene.py` defaults to zoom 1, and the painters' `main()` enlarge each texel 4 x 4 with nearest.
  That matches the game's size only at zoom 1. The Sunken Bog is still on the old 4 px grid.
- **Pixel constants scale by `d["zoom"]`.** Blur radii, edge depths and run lengths in the painters were tuned in
  pixels at zoom 1 (the old 4 px grid). The bakes render at zoom 2, so every constant measured in pixels must be
  multiplied by `d["zoom"]`. See `paint_cave.py` (around lines 91 and 240) and `paint_shore.py` (around lines 106 and
  266). Unscaled, the cave's pool depth saturated and the whole pool went flat red. `paint3d.py` reads no zoom at
  all: its pixel constants assume zoom 1.
- **CRLF vs LF.** This folder mixes both (the EOL column above). Keep each file's own endings when you edit, and
  write new files with LF. Check with Python, not Git Bash's grep:
  `tools/pixelforge/.venv/Scripts/python -c "import sys; b=open(sys.argv[1],'rb').read(); print(b.count(b'\r\n'), b.count(b'\n'))" FILE`
  (two equal numbers = CRLF; first 0 = LF).
- **Which Python.** Always `tools/pixelforge/.venv/Scripts/python`. `where python` on this machine also lists the
  Windows Store stub (`WindowsApps\python.exe`); never use it.
- **The alignment check.** In the paint step each bake prints `tA_B: aligned to EX, EY px`: the median offset of each
  texel's real surface point (from the `pos` pass) from where the zone's screen lattice puts it. It should read about
  0.00, 0.00. The code does not stop on a bad value, so read the log. A real offset means the tile cameras or the
  zone's origin are wrong, and the chunks will not meet in the game.
- **Environment variables.**
  - `GM_T` (0 to 1): the loop's time. Read by `beach_floor`, `shore_fine`; saved as `time` in the passes and used by
    `paint_shore`. `cove_bake` defaults it to 0.6, `cave_bake` to 0.0. `paint_cave`'s `--frames` steps its own time.
  - `GM_CALM=1`: the Red baked between beats, with no breaking lip or bore (the game moves the Red itself). Set by
    default in `cove_bake` and `cove_export`; leave it unset for a still with the wave.
  - `GM_ONLY=tA_B,tC_D`: a bake trial on those tiles only. The paint step then rewrites `index.json` (and the cave's
    `block.png`) from those tiles alone; run a full `paint` before the zone is used.
  - `GM_OBST=PATH`: where `beach3d` writes its `OBSTACLES` as JSON `[s, t, r]`. `cove_bake` sets it to
    `WORK_DIR/obst.json` and copies it to the zone's `obstacles.json`, which `cove_export` reads.
  - `GM_START=cave` is the game's, not a tool's: it starts a new pilgrim in the cave.
- **Export order.** `cove_export.py` rewrites `red_shore_s9201.json.gz` and its index entry (links `["moor"]`),
  dropping what `cave_export.py` added (the arrival from the cave and the link). After running `cove_export`, run
  `cave_export` again.
- **The walk floor is more than `floor_at`.** Anything a body stands on that `floor_at` leaves out (a dais, steps,
  a landing) must be in `cave_bake.walk_z`, or the bake reads it as standing at body height and blocks it; the cave's
  dais and stair head did, until 2026-10-09. A light's `heightPx` is engine px (21 a yard), never x4.
- **`cave_export.py`'s argument.** Its docstring shows no argument, but it reads the fires from
  `WORK_DIR/t*/passes.npz`. Run without the cave bake's `WORK_DIR` from the project root, it finds no passes and
  the zone gets no lights.
- **Bake and zone must agree.** The game looks for `art/zones/<zone id>_s<seed>/`, with the id and seed from the zone
  file. Each exporter takes its seed from its bake (`CB.SEED`); keep it that way.
- **Blender-only imports.** `parts3d` and every scene import `bpy`. To use a scene's plain maths outside Blender, stub
  `bpy`, `bmesh` and `mathutils` first, as `cave_bake.py` does. Keep floor modules free of `bpy`.
- **`cine_check.py`** reads only `--exterior` (interior is the default). It takes every 4th pixel of a frame taller
  than 600 px, back to the render's texels (the painters write each texel 4 x 4).
- **`beach3d` patches `cliff3d`.** `beach3d.cove_cliffs()` sets `cliff3d.SF` to beach_floor's height, so later
  cliff3d calls in the same Blender run stand on the beach's floor.
