# PROJECT NOTES — read this first (humans and Claudes)

**Owner:** Derek. **Game:** *Godmarrow* — a Diablo 2–style action RPG with dark
fantasy pixel art (hooded wraiths, grave knights, lantern light, muted teal /
gold / green on near-black). **Hardware:** a weak Windows laptop, no GPU. **Art
source:** Midjourney (Derek has it). **Budget:** no paid tools.

PixelForge is the production pipeline for that game: turn Midjourney images
into animated, 8-direction, palette-locked pixel sprites with Godot files, with
**zero manual steps** and on a laptop.

## The big picture

```
Midjourney character sheet (front/side/back)  ─►  split  ─►  palette
   ─►  model   (carve a 3D hull from front+side, paint it with the art)
   ─►  rig     (built-in humanoid skeleton + animation library; Mixamo optional)
   ─►  render  (Blender, orthographic, 30° above, 8 directions, every frame)
   ─►  pixelate (shared palette + fixed scale -> stable pixel frames)
   ─►  export  (sprite sheet + Godot SpriteFrames .tres + AnimatedSprite2D .tscn)
```

Everything lives behind `pixelforge/api.py` (one function per step), driven by
the desktop app (`gui.py`), the CLI (`pixelforge project ...`) and the MCP
server. Full operating manual for an AI: `docs/GUIDE_AI.md`. Human guide:
`docs/GUIDE_HUMANS.md`. 3D details: `docs/BLENDER_MIXAMO.md`.

## Decisions made (and why) — don't re-litigate without a reason

- **Pixelate last, never texture with pixels.** The model carries smooth art;
  pixels are created on the final rendered frame so they line up with the
  screen grid. (Same as Diablo 2.)
- **HD tier is the default** (`--style hd`: ~224 px tall, 96 colors). Derek
  explicitly wants the modern HD-pixel look (Blasphemous / Dead Cells), *not*
  16-bit. Other tiers exist for props/UI.
- **Props and ground are rendered 3D, never painted flat (2026-10-01, Derek: "Diablo II Resurrected, not clip art").**
  `prop3d` / `tiles3d` / `gen_tree.py` + `grade.py`; CC0 kits fetched by the game's `tools/make_props3d.py`.
  The painted stand-ins (`pf_paint.py`, `make_buildings.py`) are kept only as a last resort.
- **The carve is form-fitted (Derek-approved on the Hollow Mystic, 2026-10-01):** `depth_scale` 0.8, superellipse
  `fit` 2.6, one-voxel opening, 10 smoothing passes. A side view is the cloak's widest sweep, not the body.
- **Humanoid first, then fit to the art (2026-10-01, Derek's suggestion).** The
  library mannequin (already skinned to the 46-clip armature) is fused, posed to
  the sheet's A-pose, shrink-wrapped onto the carved hull and painted in that
  pose; the clips play directly. Clean limbs where the hull gave lumps. Robes
  (no legs in the silhouette) fall back to the hull. `fit_template.py`.
- **Front, side AND back views are all used** (plus the three-quarter view when
  the A2 sheet has one): the hull is carved from front+side, trimmed by the back,
  and painted from all of them with a 5-way blend by normal.
- **Free GPU image-to-3D (Hunyuan3D, TRELLIS, Pixal3D via image-to-3dlab) needs
  a 16-24 GB GPU or an Apple M-series with 32 GB.** Derek's laptop has neither
  and the cloud session has no GPU, so it stays out; its "Pixel Match" idea
  (keep the painting's pixels on the surface) is what our camera projection
  already does.
- **Carved visual hull beats free AI image-to-3D on CPU.** Tested TripoSR (open
  source, CPU) on 2026-10-01: washed-out blob, far worse than our carve +
  painted art. Paid services (Meshy/Tripo) would be better but are off the
  table. Keep carving as the default; a user-supplied GLB/FBX model is a
  supported alternative (drop into `mixamo/` or replace `model/<name>.blend`).
- **Mixamo is optional, not required.** Derek cannot sit through browser
  steps; the pipeline must run unattended. `rig` uses the built-in rig +
  procedural clips unless `mixamo/*.fbx` exist (then those win: mocap quality).
- **All colors in OKLab; transforms never add colors.** Dark teal/green/blue
  of this art collapse in RGB distance; OKLab keeps them apart.
- **One pixels-per-unit scale per project** (`settings.ppu` on characters) so
  every character is the right size relative to the others in the game.
- **Free AI image-to-3D is worse than carving** (TripoSR, CPU, 2026-10-01:
  washed-out blob). Don't re-test without a materially better free model.
- **No local AI training / no local image generation.** Laptop can't; the
  look comes from Midjourney + the converter. Prompts are built into the app
  (`pixelforge/prompts.py`).

## State of the world (update this!)

| piece | status | evidence |
|---|---|---|
| converter (image -> sprite), styles, outline, bg removal, defringe | solid, tested | `examples/README.md` |
| procedural still animation (sway/flicker/bob/breathe), RotSprite rotate/spin | solid, tested | tests/test_core.py |
| sheet split (front/side/back) | works on Derek's real sheet | `examples/output/sheet_wraith/` |
| hull model + 3-view paint | works; 8-direction stills look right | `examples/output/sheet_wraith/model_8_directions.png` |
| built-in rig + procedural clips (idle/walk/run/attack/hit/death) | works end to end; 48 clips rendered + exported unattended (2026-10-01) | scratch GIFs sent to Derek |
| **motion library** (`assets/animations/`, CC0 Quaternius UAL, 46 clips) retargeted onto the rig | works; verified numerically (bones within 1-2 deg) and visually; now the default `rig` source | `docs/research/animation_sources.md` |
| Mixamo path (import FBX, smooth weights) | works (tested with Derek's Walking.fbx); optional upgrade only | — |
| render (Eevee, Xvfb in cloud) | works; ~1 s/frame CPU | — |
| pixelate renders + export Godot | works | tests/test_project.py |
| desktop app (Tkinter) | launched and walked under Xvfb: every panel, a full new-project run, the cutout editor, the Tools window | `scratchpad` screenshots in the session; Windows double-click still Derek's |
| Godot side | add-on `godot_addon/pixelforge` (PFSpriteSet, PFFx, PFObjects) load-tested in the game (`tests/addon_check.gd`) | — |
| tools: props, vfx (17 kinds), icons, portraits, tiles, ui9, sfx, recolor, compare, skilltree, doctor | all tested (52 pytest) and used for real: `art/fx` (52 sheets), `art/tiles`, `art/ui`, `art/objects/pf_*`, `art/sfx/pf`, portraits, @champion/@unique | `tools/make_fx.py`, `tools/make_world_art.py` |

Known rough edges / next work, in priority order:
1. Carving v3: four-view sheet (prompt A2 adds a three-quarter view) ->
   carve the diagonal, paint diagonal faces with the quarter image, add
   depth shading. Plumbing (prompt, split names, import kind "quarter") is
   in; `build_hull_spec` and `build_mesh.py` still need the quarter carve +
   UV_QUARTER projection + 5-way material blend. Waiting on Derek's sheet.
1b. Retarget caveats: library walks lean forward (Walk_Loop ~20 deg); default
   is Walk_Formal_Loop (upright). Per-character overrides live in
   `character.settings["clip_overrides"]` (e.g. "walk=Walk_Loop:loop").
2. Side texture blend (`pf_common.build_projection_material`): seams where
   side art meets front/back; consider feathering by |normal.x| more softly.
3. Windows smoke test of `install.bat`, `PixelForge Studio.bat`, GUI.
4. Godot 4 demo scene with Y-sorted isometric map and one character playing
   all clips; a `godot/` folder exists but is empty.
5. Hem/feet: hull bottom is flat; a small taper would help.
6. DONE 2026-10-01: props (`prop`, with the game's objects.json bridge), effects (`vfx`),
   iso tiles (`tiles`, TileSet .tres), UI 9-slice (`ui9`), skill-tree editor
   (`skilltree`, edits file applied by the game's `tools/skill_trees.py`). The GUI
   editor and the Studio app are still unlaunched (no display here): Windows
   smoke test needed. Game-side loaders for `art/fx` and `art/tiles` do not exist
   yet (objects.json entries work today; VFX `--atlas` sets load through SpriteSet).

## Godmarrow integration (2026-10-01)

PixelForge lives at `tools/pixelforge/` inside the GodMarrow repo. The contract
with the game: `pixelforge project export-game` → `art/sprites/<kind>.png|json`
(the game's own format, 8 views, foot anchors, fixed anim set), style
`godmarrow` (195 px, full colour), `--passes color,normal,depth` for the
lantern's lighting maps, prompt A2 (four-view sheet) for the best carve.
`entities/anim_sprite.gd` reads the real left-facing views when a set has them.
Verified with the game's `tools/smoke.sh` (errors 0) on a headless Godot 4.7.2.

## Conventions

- Directions: `S SW W NW N NE E SE` = where the character *faces on screen*;
  clips are `<action>_<dir>` (e.g. `walk_SW`).
- Bone names are Mixamo's (`mixamorig:Hips` …) so Mixamo FBX and built-in
  rigs are interchangeable; `render_sprites.py` follows the hips.
- Scripts in `pixelforge/blender/` run inside Blender: **no Pillow**, numpy ok,
  print `PF_OK ...` on success (api.py checks for it), `PF_WARN`/`PF_INFO`
  for notes. Blender 4.2+ and 5.x both work (`action_fcurves` shim).
- Tests: `pytest` (24 pass). `pip install bpy` adds the Blender-script tests.
  Render tests set `PF_FAKE_RENDER=1` (no display needed).
- Cloud sessions can render: `apt-get install libegl1 libgl1 libgles2 xvfb` and
  `pip install bpy`, then run scripts with `xvfb-run`. A `blender` shim script
  in the project folder (`exec xvfb-run -a python3 -c "...bpy..."`) lets
  `api.find_blender` pick it up — see git history if you need to recreate it.

## How to work with Derek

Plain language, short, honest. He wants outcomes, not architecture. Show
pictures (before/after rows, GIFs) rather than describing. He will ask "is it
good?" — answer straight, name what's bad and what fixes it. He cannot do
manual steps; design everything to run unattended. Don't push him to install
things or spend money. Keep this file and `docs/GUIDE_AI.md` current.
