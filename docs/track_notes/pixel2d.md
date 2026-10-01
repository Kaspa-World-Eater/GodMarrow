# The pixel road (track/pixel2d): 2D puppet characters, no Blender

For the integrator of the Studio / Forge app: what exists, the exact calls, and what the page should show.
The code is `tools/pixelforge/pixelforge/puppet.py` (the road), `rig.fit_view` (the per-view skeleton), the API
functions in `api.py`, the CLI group `pixelforge puppet`, and the MCP tools of the same names. `gui.py` was not
touched on this track.

## What it is

A second way to make an 8-direction animated character from a painted sheet, with real frames, that runs on a
laptop without a GPU and without Blender:

1. `assets/animations/joints.json.gz` (98 KB, committed) holds the 3D positions of 24 joints per frame of every
   motion-library clip (46 CC0 clips; the 20 the forge maps are exported). `blender/export_joints.py` wrote it
   once; nothing at run time needs Blender.
2. `build_puppet`: each view cutout (front, side, back, three-quarter when present) gets a skeleton fitted to its
   silhouette (`rig.fit_view`: arms found on the silhouette, feet at the bottom, a skirt or robe noticed and its
   hem found, the facing of a side view from the feet) and is cut into parts with pivots: head (with the hat),
   torso, upper and lower arms, thighs, shins, feet, and the skirt as a garment of its own. Parts overlap at the
   seams; what a limb hides on the body is filled from the body's own paint. Written to
   `characters/<name>/puppet/<view>.json` + `<view>/<part>.png` + a contact sheet `<view>_parts.png`.
3. `animate_puppet`: for every clip and direction the joint tracks are retargeted to the painting's proportions
   (the clip gives each bone its direction, the painting its length), the lowest foot is put on the floor, the
   skeleton is turned to the direction and projected with the game camera (orthographic, 30 degrees above), the
   nearest painted view is posed (front for S / SW / SE, back for N / NW / NE, the side for W and mirrored for E;
   a three-quarter view takes SW / SE when the sheet has one) and drawn far-to-near by depth. Secondary motion:
   the skirt's hem chases the hips through a damped spring and follows the legs (a mesh warp), the hat lags the
   head. Frames go to `renders/<clip>/<DIR>/frame_NNN.png` with the same `manifest.json` the Blender road writes.
4. The usual `pixelate` (palette-locked, in the look preset) and `export` / `export-game` run unchanged.

## The calls

```python
from pixelforge import api
api.set_road(project, name, "pixel")                     # or "3d"; clears the other road's done flags
api.road_of(project, name)                               # "3d" | "pixel"
api.build_puppet(project, name, facing=None, log=None)   # -> {"ok", "views": {view: {"facing", "skirt", "parts", "sheet", "json"}}, "next": "animate"}
api.animate_puppet(project, name, clips=None, directions=None, per_clip=None, elevation=30.0, figure_px=None, log=None)
                                                         # -> {"ok", "renders", "manifest", "clips": {clip: frames}, "check", "next": "pixelate"}
api.run_pixel_path(project, name, clips=None, directions=None, per_clip=None, log=None)
                                                         # split -> palette -> puppet -> animate -> pixelate -> export
api.run_step(project, name, "puppet" | "animate")        # the steps by name (STEP_FUNCS)
api.run_until_blocked(project, name, road="pixel")       # every remaining step of that road
api.pixelate_renders / api.export / api.export_game      # unchanged
api.preview_gif(project, name, "walk", "S")              # previews/walk_S.gif from the frames (or the renders)
```

Character settings used: `road` (`3d` | `pixel`), `facing_side` (`left` | `right`, forces the side view's
facing), `per_clip`. Notes written: `model_mode = "puppet"`, `model`, `model_note`, `rig`, `render`,
`render_check`, `puppet`. Done flags: `puppet`, `animate`, plus `model`, `rig`, `render` so the step list and
`status().next` keep working on either road.

CLI:

```
pixelforge project set --character keeper --road pixel
pixelforge puppet build keeper [--facing-side left|right]
pixelforge puppet animate keeper [--clips idle,walk] [--directions S,W] [--per-clip 12]
pixelforge puppet run keeper                  # the whole road
pixelforge puppet preview keeper --clip walk --direction S
pixelforge run keeper --road pixel            # = project run-all --road pixel
pixelforge project run keeper puppet|animate
pixelforge project export-game keeper --kind keeper_pixel --out <game>/art/sprites
```

MCP: `set_road`, `build_puppet`, `animate_puppet`, `run_pixel_path`; `run_step` takes `puppet` / `animate`;
`run_all(road="pixel")`.

## What the page should show

- **Road choice** on the character page, before the model step: *3D model (Blender)* / *Pixel puppet (no
  Blender)*. Choosing the pixel road relabels steps 5-7: "Cut into parts", "Pose with the moves", "Turn into
  pixel art". `api.set_road` switches; `api.road_of` reads.
- **Step 5, Cut into parts** (`build_puppet`): show `puppet/<view>_parts.png` for each view (the parts in a row,
  pivot dot and bone line on each) and the sentence from `views[view]`: "11 parts, a skirt, faces left". A
  checkbox "the side view faces: left / right" (setting `facing_side`) for when the feet do not tell. The person
  judges three things here: the hat went with the head, the hands are their own parts, the hem line sits where
  the feet begin.
- **Step 6, Pose with the moves** (`animate_puppet`): the clip list with ticks (default the game set), the
  direction list with ticks (all eight; S and W while iterating), frames per clip (the look's `clip_frames`),
  a Run button, the `PF_PROGRESS action=... frames=... directions=...` log lines as a progress bar (9 clips),
  then the animation preview (`preview_gif` from `renders` before pixelate, from `frames` after) with a frame
  strip under it: this is the frame animation editor's input (`docs/track_notes/animation_is_frames.md`).
- **Step 7** is the existing pixelate step, unchanged; step 8 the existing exports.
- The Blender download button and the Mixamo text stay hidden on the pixel road.
- Status line sentences: `model_note` ("Built: a 2D puppet (parts with pivots cut from the painting); no 3D
  model on this road."), `render` ("pixel road: 1488 frames drawn, 9 clips x 8 directions").

## Timings (this cloud box, 4 CPUs)

Keeper, 805 px cutouts: puppet 2 s; animate 9 clips x 8 directions x 24 frames (1488 frames, 2x the sprite's
figure height) about 100 s; pixelate about 3-4 minutes (the usual step on 1488 frames); export-game 10 s.

## Honest gaps

See `docs/HANDOFF.md` section 6, the dated pixel2d entry, for the verdict against the 3D road and what is still
short of a hand-drawn sprite.
