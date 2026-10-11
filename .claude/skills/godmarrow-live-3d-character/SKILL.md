---
name: godmarrow-live-3d-character
description: Use when building or changing a Godmarrow character as a live rigged 3D body (the newborn pipeline - tools/landkit3d/newborn3d.py and newborn_pose.py, entities/body3d.gd, the Ossuarch's rebuild or any calling after it), when adding or editing a clip, re-exporting the .glb, running the stick pass or the look test (tools/body3d_test/look.gd), or checking the body in the game.
---

# Live 3D characters (the newborn pipeline)

Derek, 2026-10-10: "3D wins for the character model." Every character is a rigged body made in Blender and played
live in the game, never rendered to frames. The newborn is the pilot (`tools/landkit/passes/the_newborn.md`, ten
passes, B-). The base for every calling is the same rig: the Quaternius Universal Animation Library Mannequin (CC0,
`tools/pixelforge/assets/animations/quaternius_ual_standard.glb`), each calling with its own body and armour skinned to
the same bones and its own signature clips. The older PixelForge sprite characters stay until each is rebuilt.

Before a new character or a new clip: the gate and the passes (`godmarrow-art-passes`), and `docs/animation/` (02
the method: why first, the timing sheet, the stick pass before any detail; 05 the checklist; 07 the body in motion).

## The parts

| File | What it does |
|---|---|
| `tools/landkit3d/newborn_pose.py` | Pure Python (no Blender). `CLIPS = {name: (seconds, frames, loop, travel m/s)}`; one function per clip returning the body's intent at `t`; `pose(clip, t)` dispatches by name; `times(clip)` gives the frame times |
| `tools/landkit3d/newborn3d.py` | Blender. Loads the Mannequin; `one_skin` (voxel remesh into one continuous body), `reshape`, `coat` + `bake_coat` (colour, roughness, normal textures), `caul_shell`, `clots`, `stroke_uv` (a UV along each bone for the strokes), `key_clips` (each clip keyed at 30 fps by analytic two-bone IK onto its own NLA track), the glTF export |
| `tools/landkit3d/newborn_sticks.py` | The stick pass: every bone chain as a coloured line, side and front, frame by frame |
| `entities/body3d.gd` (`Body3D`) | The live body: its own 3D world in a 320 px SubViewport, a locked orthographic camera at 12 degrees, a 1.83 m figure 195 px tall, drawn at `Iso.FIG`; `play(clip, blend, speed)`, `hold_at(clip, phase)`, `face_ground(dir)`, `light_from(lights, tp)` (the zone's four strongest lights), the drips, `CONTACTS` (footfalls), `mirror_view` |
| `shaders/body3d.gdshader` | The picture: hard edges, the dark outline, stepped tones, the 2 x 2 grid |
| `shaders/body3d_model.gdshader` | The model's surface: the coat, the strokes along the form, the waterline for the pool |
| `world/opening.gd`, `core/main.gd` `_nascent` | The opening that drives the newborn's clips; where a new pilgrim gets the body |
| `tools/body3d_test/look.gd` | The look test: each clip at a few times in four headings, saved as the picture the game draws |
| `art/characters3d/newborn/` | `newborn.glb` and its baked textures (`newborn_newborn_col.png`, `_nrm`, `_rough`), each with its `.import` |

## Paths

```bash
cd /c/Users/derek/GodMarrow
B="/c/Program Files/Blender Foundation/Blender 4.5/blender.exe"
PY=tools/pixelforge/.venv/Scripts/python
G=/c/Users/derek/OneDrive/Desktop/Godot/Godot_v4.7.2-stable_win64_console.exe
SPW=$(cygpath -m "$SP")
```

## Adding or changing a clip

1. **The timing sheet first** (`docs/animation/02-method.md`): what the body is thinking, the key poses, a hold per
   frame, the head leading, follow-through by weight. Write it in the pass log.
2. **`newborn_pose.py`:**
   - add `"name": (seconds, frames, loop, travel_m_s)` to `CLIPS`;
   - write `def name(t)` returning the intent: `hips` (the pelvis in the world), `pitch`, `roll`, `yaw`, `spine` and
     `side` (the bends of spine.001 to .003), `neck`, `head`, `head_turn`, `wrist.L/R`, `ankle.L/R`, `elbow.L/R` and
     `knee.L/R` (the poles), `hand.L/R`, `foot.L/R` (where they point). The body faces -Y, its left is +X, Z is up,
     metres. Clips are in place (the game moves the body), so a planted foot or hand slides back at the travel speed;
   - add it to the dict in `pose()`.
   Keep it pure Python: `newborn3d.py` runs it inside Blender (Python 3.11).
3. **The stick pass** (look at it before any body):
   ```bash
   timeout 300 "$B" --background --python tools/landkit3d/newborn3d.py -- sticks "$SPW/sticks.json" name \
     2>&1 | grep -E "^sticks|Error|Traceback|line [0-9]"
   $PY tools/landkit3d/newborn_sticks.py "$SPW/sticks.json" "$SPW/sticks.png" name
   ```
   Check the arcs, the timing, the drag; that the trunk bends the right way (pass 1 found pitch and roll reversed);
   that no joint passes its range (the head bent past 120 degrees in the first rise).
4. **A still in Blender** (optional): `"$B" --background --python tools/landkit3d/newborn3d.py -- still "$SPW/nb_still" name 3`
   renders three frames of the clip in the front and side views.
5. **Export the glb, always with every clip:**
   ```bash
   timeout 900 "$B" --background --python tools/landkit3d/newborn3d.py -- glb art/characters3d/newborn \
     2>&1 | grep -E "^glb|Error|Traceback|line [0-9]"
   ```
   With no clip list it keys all of `CLIPS`. A list after the folder exports **only** those clips, and the glb loses
   the rest.
6. **`entities/body3d.gd`:** a looping clip must be added to the loop list in `_init`
   (`for a in ["crawl", "idle", "walk", "climb", "descend"]`); a clip with footfalls to `CONTACTS` (cycle phases
   where a foot or hand lands); a travelling clip needs its ground speed (like `WALK_V`, in yards a second) so the
   feet stay planted. Play it with `play("name", blend, speed)`, or `hold_at("name", phase)` for a clip driven by
   position (the stairs are held at the phase of where the body stands on them).
7. **Import, then the look test:**
   ```bash
   timeout 300 "$G" --headless --path . --import > /dev/null 2>&1
   timeout 180 "$G" --path . -s tools/body3d_test/look.gd -- "$SPW/look"
   ```
   It writes `<clip>_<time with _ for .>_<heading>.png` (320 x 320; headings front, side, down, back) for the
   `shots` list at the top of `look.gd`; add your clip's times there. `remake.sh` in this folder does steps 5 to 7 and
   stitches the sheet (rows by heading, columns by shot).
8. **In the game:** the opening as a strip in the cave
   (`SHOT_N=8 SHOT_DT=1.2 bash .claude/skills/godmarrow-capture/shot.sh opening_cave 12.5,40.5 "$SP/nb/open.png"`),
   the body beside the Ossuarch at the same height for the skeptic round, `--perf` (60 fps with the body on screen),
   and the smoke test.

## Changing the body or its coat

Edit `newborn3d.py`, export the glb (step 5), import and run the look test (step 7). Lessons from the ten passes:
- The Mannequin's UV layers are empty; the coat's bake needs a fresh unwrap (`bake_coat` does it), or the body comes
  out pure black.
- The doll's segments and ball joints show through any coat: `one_skin` remeshes the rest pose at 2 cm into one
  body and carries the bone weights back by the nearest surface.
- Poses are laid with the animation system off and the curves written after, each quaternion kept on the same side
  as the last; otherwise every clip after the first begins on a broken frame. Check each clip's first frame from
  the exported glb itself.
- When a change shows nothing, look before guessing again: a render coloured by material (it showed the "round head"
  and "pauldrons" were the caul shell), a plain grey close-up (the "rings" were the coat's streaks), the import's
  timestamps.
- The body is lit only by the zone's own lights (`light_from`), casts the silhouette shadow from its own picture
  (`SilShadow`), and its strokes ride the skin (`stroke_uv`), never the screen.

## A new character on the same rig

Copy `newborn3d.py` and `newborn_pose.py` as `<name>3d.py` and `<name>_pose.py`, keep the Mannequin's rig and the
clip library's names (walk, climb, descend, idle; then attacks, casts, deaths), export to
`art/characters3d/<name>/<name>.glb`, and give the hero a `Body3D` with that path. The Ossuarch's total rebuild is the
next one (Derek's call when it starts).

## Commit

```bash
git add tools/landkit3d/newborn3d.py tools/landkit3d/newborn_pose.py art/characters3d/newborn/ entities/body3d.gd \
  tools/body3d_test/look.gd tools/landkit/passes/the_newborn.md
```

Stage only what you changed; the glb, its textures and their `.import` files go together. Then
`godmarrow-safe-commit`.
