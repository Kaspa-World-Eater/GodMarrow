---
name: godmarrow-bake-3d-zone
description: Use when a 3D-road zone must be previewed, baked, exported or rebaked into the game - the opening cave (cave3d.py, cave_bake.py, cave_export.py) or the Red Shore's cove (beach3d.py, beach_floor.py, cove_bake.py, cove_export.py, sea_field.py), or a new zone copied from them. Covers Blender previews (blend_scene.py, then paint_cave.py or paint_shore.py), trial tiles, full bakes run in the background, the WebP size limit, reading the alignment and walk proofs in the logs, the Godot import, and committing the art and zone files.
---

# Bake a 3D-road zone into the game

The road (`tools/landkit3d/README.md`, the module index; read it first, with its Gotchas):

```
scene (Blender) --blend_scene / blend_tiles--> passes.npz --painter--> PNG --cine_check--> numbers for the pass log
                                                                       \--bake--> art/zones/<zone>_s<seed>/ --export--> data/zones/
```

Before any new piece or a change to a scene's look, the rules gate comes first (`godmarrow-art-passes` skill). A
rebake to bring a finished change into the game needs no new gate, but log it in the piece's pass log.

## Paths

```bash
cd /c/Users/derek/GodMarrow
B="/c/Program Files/Blender Foundation/Blender 4.5/blender.exe"   # Blender's own Python is 3.11
PY=tools/pixelforge/.venv/Scripts/python                         # Python 3.14, numpy, scipy, Pillow
G=/c/Users/derek/OneDrive/Desktop/Godot/Godot_v4.7.2-stable_win64_console.exe
SP=<the session scratchpad>                                      # every WORK_DIR, still and log goes here
SPW=$(cygpath -m "$SP")                                          # the same in C:/ form, for the venv Python and Godot
```

| Zone | id, seed | Scene | Floor | Painter | Bake | Export | Output |
|---|---|---|---|---|---|---|---|
| the opening cave | `opening_cave`, 9301 | `cave3d.py` (`floor_at`, `LAMPS`, `SAMPLES = 128`) | `floor3d` | `paint_cave.py` | `cave_bake.py` (`GM_T=0.0`) | `cave_export.py WORK_DIR` | `art/zones/opening_cave_s9301/`, `data/zones/opening_cave_s9301.json.gz` |
| the Red Shore's cove | `red_shore`, 9201 | `beach3d.py` | `beach_floor.py` | `paint_shore.py` | `cove_bake.py` (`GM_CALM=1`, `GM_T=0.6`) | `cove_export.py` (it calls `sea_field.write`) | `art/zones/red_shore_s9201/`, `data/zones/red_shore_s9201.json.gz` |

## 0. Before you start

- **One bake at a time, and only on your own work.** Both bakes write straight into `art/zones/<zone>_s<seed>/`.
  Check `ps -W | grep -iE "blender(\.exe)?$|python(\.exe)?$"` and `git status --short art/zones/<dir> | head`.
  If another session's bake is running, or its uncommitted bake sits in that folder, do not start one over it; say so.
- Run long bakes when Derek is not playing (`docs/wiki/08-tech-and-build.md` section 8). They use every core.

## 1. A still in Blender (minutes; the cave's 128 samples are the slow part)

Cave (a fire-lit interior):

```bash
"$B" --background --python tools/landkit3d/blend_scene.py -- cave3d "$SP/cv_x" -11.6 -39.8 480 340 > "$SP/cv_x.log" 2>&1
grep -n "Error\|Traceback" -A5 "$SP/cv_x.log" | head
$PY tools/landkit3d/paint_cave.py "$SP/cv_x" "$SP/cv_x.png" -6.4 -34.2 7.4 -11.6 -39.8    # HERO_X HERO_Y HERO_Z FOCUS_X FOCUS_Y
```

Cove (outdoors, overcast):

```bash
GM_CALM=1 timeout 1700 "$B" --background --python tools/landkit3d/blend_scene.py -- beach3d "$SP/beach_prev" -13.4 -54.4 960 540 > "$SP/beach_prev.log" 2>&1
GM_T=0.6 timeout 900 $PY tools/landkit3d/paint_shore.py "$SP/beach_prev" "$SP/beach_prev.png" 2>&1 | tail -2
```

- `blend_scene.py -- SCENE OUT_DIR [FOCUS_X FOCUS_Y [W H]] [--zoom Z] [--heightfield]` (default 480 x 270, zoom 1).
  Focus is in world yards. The README's standard cove view is `-48.44 -42.78 480 340`.
- `GM_CALM=1` bakes the Red between beats (no breaking lip); leave it unset for a still with the wave. `GM_T` (0..1)
  is the loop's time.
- The painters write each texel 4 x 4 at zoom 1; the game draws baked texels 2 x 2 at zoom 2 (`RES = 2`,
  `"scale": 2`). Pixel constants in the painters scale by `d["zoom"]`; `paint3d.py` reads no zoom.
- Older scenes still render through `paint3d.py PASSES_DIR OUT.png [HERO_X HERO_Y HERO_Z] [FOCUS_X FOCUS_Y]`.
- Long runs: use the Bash tool's `run_in_background`, write a log, and read its tail when notified. Never poll with
  sleep.

Measure the still and log the numbers in the pass log:

```bash
$PY tools/landkit3d/cine_check.py "$SPW/cv_x.png"              # interior rules; add --exterior for the cove
$PY tools/landkit3d/value_render.py "$SP/cv_x" "$SP/cv_x_value.png"   # the value-only test (MASTER_RULES 0.4)
```

## 2. Trial tiles (optional, before a full bake)

```bash
GM_ONLY=t1_1,t1_2 $PY tools/landkit3d/cave_bake.py "$SP/cave_trial" all > "$SP/cave_trial.log" 2>&1
grep "aligned to" "$SP/cave_trial.log"
```

A trial rewrites the zone's `index.json` (and the cave's `block.png`) from those tiles alone. Run a full `paint`
before the zone is used, captured or committed.

## 3. The full bake (in the background)

```bash
# the cave: 8 tiles; about 70 min to render at 128 samples (4183 s on 2026-10-10), then minutes to paint
W="$SP/cave_bake8"; mkdir -p "$W"
$PY tools/landkit3d/cave_bake.py "$W" all > "$SP/cave_rebake8.log" 2>&1 && \
$PY tools/landkit3d/cave_export.py "$W" >> "$SP/cave_rebake8.log" 2>&1

# the cove: 62 tiles; about 2 h to render (6998 s on 2026-10-10) and over an hour to paint
W="$SP/cove_bake8"; CW="$SP/cave_bake8"; mkdir -p "$W"
$PY tools/landkit3d/cove_bake.py "$W" all > "$SP/cove_rebake8.log" 2>&1 && \
$PY tools/landkit3d/cove_export.py >> "$SP/cove_rebake8.log" 2>&1 && \
$PY tools/landkit3d/cave_export.py "$CW" >> "$SP/cove_rebake8.log" 2>&1
```

- Steps: `render` (Blender, all tiles in one run via `blend_tiles.py`, passes to `WORK_DIR/t<A>_<B>/passes.npz`),
  `paint` (paint each tile, check its alignment, cut the chunks), or `all`. Keep the WORK_DIR: a painter-only change
  needs only `... cove_bake.py "$W" paint`, which reuses the rendered passes.
- Use a fresh numbered WORK_DIR in the scratchpad for each bake; never put one in the repo.
- **Export order:** `cove_export.py` rewrites `red_shore_s9201.json.gz` and its index entry and drops what
  `cave_export.py` added (the arrival from the cave, the link). Always run `cave_export.py <cave WORK_DIR>` after it.
- **`cave_export.py` needs the cave bake's WORK_DIR** (it reads the fires from `WORK_DIR/t*/passes.npz`). Without it,
  the cave gets no lights.
- `cove_export.py` also writes `shore.png` and calls `sea_field.write()` (`seafield.bin` and the `seafield` entry of
  the bake's `index.json`, read by `world/red_sea.gd`). `sea_field.py` alone reruns just that.
- The dead in the Red are their own export: `"$B" --background --python tools/landkit3d/drowned_glb.py` writes
  `art/zones/red_shore_drowned.glb`.

## 4. Read the log (`bake_log_check.sh` in this folder does it)

```bash
bash .claude/skills/godmarrow-bake-3d-zone/bake_log_check.sh "$SP/cove_rebake8.log"
```

- `zone WxH: N chunks of M, T tiles`, then `rendered T tiles in S s (exit 0)`. The exit must be 0.
- Every tile prints `tA_B: aligned to EX, EY px`. It must read `0.00, -0.00` (or `0.00, 0.00`). Any real number means
  the tile cameras or the zone's origin are wrong and the chunks will not meet; the code does not stop on it.
  `nan, nan` is a tile with no geometry to measure (the cove's empty corner tiles, e.g. `t0_3`..`t0_5`); say so in
  the commit ("alignment NaN: nothing to align").
- `wrote ...art/zones/<zone>_s<seed> N chunks`.
- **The walk proof.** The cove: `walkable N tiles, reached N; cut-off pieces left: [...]; portal reached: True`
  (walkable equals reached; cut-off pockets under 25 tiles are first filled as rock, larger ones are listed). The cave:
  `walkable N tiles, reached N; reached: {'stranger': True, 'mirror': True}; ...`; if anything fails it writes
  nothing. Look at `art/zones/<zone>_s<seed>/grid_check.png` (8 px a tile; yellow is walkable but never reached).
- **The WebP limit.** WebP caps an image at 16383 px a side. A tall `_up` band atlas fails the paint with
  `ValueError: encoding error 5: Image size exceeds WebP limit of 16383 pixels` (the cove at 166 tiles did, on
  2026-10-10; the fix is dated 2026-10-11). The fix stacks the bands in columns: each band entry gets `ax` (its column) beside `ay`, and
  `world/baked_ground.gd` reads `ax` in its `region_rect`. Check your copy: `grep -n "ax=int" tools/landkit3d/cove_bake.py`.
  `cave_bake.py` has no column split yet; port it there if the cave grows. After the fix, rerun only `paint`.

## 5. See it in the game

```bash
timeout 300 "$G" --headless --path . --import > /dev/null 2>&1     # new and changed webp/png must be imported
```

Then captures at the places you changed (`godmarrow-capture` skill), the frame rate (60 fps) and the smoke test
(`godmarrow-smoke-and-perf` skill). `--baked=0` shows the zone without its bake, for an A/B.

## 6. Commit

```bash
git status --short art/zones/opening_cave_s9301 | grep -v "^ M\|^??" | head     # anything odd?
git add art/zones/opening_cave_s9301 data/zones/opening_cave_s9301.json.gz tools/landkit3d/cave3d.py tools/landkit/passes/opening_cave.md
git commit -q -F - <<'EOF'
The cave rebaked with <what changed, in plain words>

Every tile aligned at 0.00 px; every walkable tile reached (460), the Stranger and the mirror reached.
Smoke 12/0; 60 fps in the cave.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- Stage the zone's art folder whole only when every change in it is your bake's (the `.webp`, `_n`, `_up`, `_up_n`,
  their `.import` files, `height.png`, `block.png`, `grid_check.png`, `index.json`, `obstacles.json`, `shore.png`,
  `seafield.bin`, `pool_sim.png`). Check that `seafield.bin` is tracked after a cove bake
  (`git ls-files art/zones/red_shore_s9201/seafield.bin`); as of 2026-10-11 it is not, so the committed cove has no
  live Red field until the next cove bake is committed with it.
- A cove bake also changes `data/zones/red_shore_s9201.json.gz`, `data/zones/index.json`, and, through
  `cave_export.py`, `data/zones/opening_cave_s9301.json.gz`. Stage the ones the log says it wrote.
- The rest of the commit rules: `godmarrow-safe-commit` skill.

## A new zone on this road

`tools/landkit3d/README.md`, "How to make a new scene and get it into the game": gate, floor module, scene module
(`build(root, material)`, `P.init` first), still, painter (`paint(d, t)` returns `(img, alpha)`), measure, bake (copy
`cove_bake.py` outdoors or `cave_bake.py` indoors; set `ZONE`, `SEED`, the origin, `W`, `H`), export (copy an
exporter; it must prove the walk), play it with `--zone=<id>`. New files are LF; keep each old file's own line
endings (the README's EOL column). Code that Blender imports must run on Python 3.11; floor modules stay free of `bpy`.
