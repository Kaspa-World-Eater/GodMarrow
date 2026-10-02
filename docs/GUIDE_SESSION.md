# Making a character for Godmarrow as a shape sprite: the guide for a new session

This is the whole job, start to finish, for a session that has this repository, a shell and (optionally) a browser.
Read it once, then follow the command sequence. The reference material it points at is in the repository; nothing
else is needed. Blender, Mixamo and a graphics card are not used on this road.

A **shape sprite** is a `.shapes.json` file: a list of solid shapes (ellipsoids, capsules, boxes, rings around the
body) with a colour ramp each, bound to the bones of a standard skeleton. PixelForge renders it as pixel art and plays
the motion clips on it, so idle, walk, run, attack, cast, hit and death come out as real frames from all eight
directions in seconds, and the game's exporter packs them with foot anchors. The format reference is
`tools/pixelforge/docs/GUIDE_AI.md`, section "Shape sprites"; this file is the procedure.

## 1. Set up

```
cd <repository root>
pip install -e tools/pixelforge            # Python >= 3.10; or prefix every command below with: python -m pixelforge
cd tools/pixelforge && python -m pytest -q tests/test_shapes.py tests/test_e2e_shapes.py && cd ../..
```

Work on a branch, never on `main`. Do not change the game's own folders (`art/`, `core/`, `world/`, ...) unless the
task says so; the in-game look-test below copies files into `art/sprites/` and reverts them afterwards.

## 2. Where the references are

| What | Where |
|---|---|
| The look to reach (a necromancer drawn entirely by code, with its render) | `docs/refs/necromancer_shape_sprite.html`, `docs/refs/necromancer_shape_sprite.png` |
| The same figure as a 3D solid, seen from 8 directions | `docs/refs/necromancer_3d_breakdown.html`, `docs/refs/necromancer_3d_turn.png` |
| Finished shape files to copy from | `tools/pixelforge/assets/shapes/necromancer.shapes.json` (flat), `necromancer_3d.shapes.json` (solid), `characters/keeper.shapes.json` (the Keeper, 58 shapes with size variants), `objects/chest.shapes.json`, `skull.shapes.json`, `dead_tree.shapes.json` |
| The material library (named colour ramps) | `tools/pixelforge/assets/shapes/materials.json` |
| The Keeper as she is in the game today (converted from a painting) | `art/sprites/keeper.png` + `keeper.json` (frames by `anim/view/i`) |
| Midjourney prompts in the game's style, ready to paste | `docs/midjourney/test_batch_2026-10-01.md`; `pixelforge prompt --describe "..."` writes more |
| What good output looks like (sheets, GIFs, the in-game shot) | `docs/screens/shapes/` |
| The game's art rules | `docs/wiki/01-rules-and-decisions.md` (no red light, glows only on magic, no gold on the Ossuarch, worn and tattered) |

## 3. Getting a reference painting (browser)

A painting is a reference for the costume, the silhouette and the colours; it is not the source of the sprite. With
a browser:

1. Build the prompt: `pixelforge prompt --describe "<one sentence: silhouette, materials, colours, 3-5 details>" --kind sheet`
   or take one from `docs/midjourney/test_batch_2026-10-01.md` (the dead tree, the gravestone, the character sheet).
2. Open https://www.midjourney.com in the browser. The person signs in themselves; never type a password. Paste the
   prompt, pick the image that reads best at a glance (silhouette first), upscale it, download the PNG.
3. Save it under `tools/pixelforge/assets/refs/<character>/front.png` (and `side.png`, `back.png` when the sheet has
   them). These are references, kept small (under 1 MB each) or left out of the commit if larger.
4. Write down, from the painting: the parts (hat, hood, pauldrons, belt, skirt, cords, held things), the material
   of each in the library's words (`straw violet wrap lacquer rope gourd rag steel iron7 bone6 wood5 leather5 cloth
   cape6 crimson gold6`), where the light-emitting bits are (eyes, flames), the figure's proportions (where the
   shoulders, belt and hem sit as fractions of the height).

Without a browser, ask the person for the painting, or work from the sentence alone: the drafting step below starts
from words.

## 4. The command sequence

Every command prints what it did; `--json` gives the same as a dict. `<name>` is the character's name
(`keeper`, `warden`), `<folder>` a project folder of your choosing.

```
# the author pose: every bone's head and tail in file units, to draw shapes around (120 px tall for the gothic look)
pixelforge shapes template --height 120 -o tpl.json --png tpl.png

# a starter file from a sentence: a humanoid on the author pose, the costume words as parts and materials
pixelforge shapes draft "a shrine keeper with a wide straw hat, violet wrappings, dark lacquered armour, rope cords, charm gourds at the belt, tattered black skirts and glowing violet eyes" -o <name>.shapes.json

# check it, look at it standing (front and side), look at it moving
pixelforge shapes validate <name>.shapes.json
pixelforge shapes still <name>.shapes.json -o still_S.png --direction S --style gothic_hd --zoom 3
pixelforge shapes still <name>.shapes.json -o still_E.png --direction E --style gothic_hd --zoom 3
pixelforge shapes preview <name>.shapes.json --clip walk --direction E --style gothic_hd -o walk_E.gif
pixelforge shapes sheet <name>.shapes.json -o sheet.png --clips idle,walk --style gothic_hd

# edit the file (see 5), repeat the three looks until it passes (see 6); then every clip in every direction
pixelforge shapes render <name>.shapes.json -o frames --style gothic_hd --gif

# into the game's format through a project (the exporter adds the foot anchors)
pixelforge project new <folder> --style gothic_hd
pixelforge project add <name> -p <folder>
pixelforge project import-shapes <name> <name>.shapes.json -p <folder>
pixelforge project render-shapes <name> -p <folder>
pixelforge project export-game <name> --kind <name>_shapes --out <folder>/game -p <folder>

# look at it in the game (Godot 4 on PATH or --godot <exe>; the game folder is found upward from the current folder)
cp <folder>/game/<name>_shapes.* art/sprites/
pixelforge game-preview --skin <name>_shapes --shot shot.png
git checkout -- art/ && rm -f art/sprites/<name>_shapes.*
```

`game-preview` finds Godot (or takes `--godot <exe>`) and, on a box with no display, runs the game under `xvfb-run`
with the OpenGL driver by itself (`xvfb-run` must be installed; the result says `virtual_display: true`). The same
shot by hand is: `godot --headless --path . --import`, then
`xvfb-run -a -s "-screen 0 1280x720x24" godot --path . --rendering-driver opengl3 --resolution 1280x720 -- --zone=moor --seed=3 --new --cls=miasmancer --hour=0.5 --skin=<name>_shapes --hide=dark --shot=/abs/shot.png --shot_t=5 --shot_n=8`.

An object (a chest, a skull, a tree) has no bones and one still per direction:

```
pixelforge shapes object tools/pixelforge/assets/shapes/objects/chest.shapes.json -o art/objects/chest --directions S,SE,E --game-objects art/objects/objects.json
```

The whole sequence runs headlessly in `tools/pixelforge/tests/test_e2e_shapes.py`; run it when something seems off.

## 5. Editing the file

The file is the sprite. Every shape is named; change numbers, re-render, look. The usual edits:

- **It does not read as the character.** Silhouette first: the hat's radius and tilt, the shoulders (pauldron radii),
  where the hem ends (`y` of the skirt ring), the held thing. Then the materials (the ramps), then details (rules).
- **Too bright / too dark.** Swap the material (`straw` is a weathered brown; the library's `gold6` is bright) or add a
  file material that aliases a library ramp with `"lift": -0.1`. Tone offsets: `"t": -1` on a shape or a rule.
- **The eyes do not show.** The eye rule's `near` radius (1.4 at 120 px gives a 3 px glow; 0.6 with `"t": 1` on
  top for the hot core) and the hat's tilt (`rotate.x`, 16 degrees lifts the brim at the front).
- **A part floats or detaches when it moves.** Garments and hanging things get `"hang"` on their part (0.25 for a
  skirt, 0.35 for a veil or cape, 0.5 for gourds): they take the bone's position and turn but only that fraction of
  its tilt, pivoting where they attach. A hat is rigid (no hang). Lag (`{"frames": 2, "sway": 0.5}`) makes a hem
  trail; it is capped at a tenth of the part's height and fades out while the bone is still.
- **The legs vanish under a skirt / feet pop out as blobs.** End the skirt above the ankles (the Keeper's ends at
  y 112 of 134) and open its front (`"open": {"angle": 0.55, "below": 84}`). Parts on different bones keep their own
  voxels even where they overlap in the author pose, so a leg inside a robe still exists when it swings out.
- **A gap opens when the figure bends or falls.** Something is missing between two shapes in the author pose (the
  Keeper needed a waist capsule between the chest and the belt). Render the death clip to find such gaps.
- **Speckles crawl.** `hash` rules take a third number, the speck size in units (`[0.08, 5, 2]`); a sawtooth hem of
  many tiny tongues flickers, so give a brim a plain edge and a hem 9-16 tongues.
- **It boils between frames** (pixels re-rolling where nothing moved). The rig holds every body's drawn turn until
  the clip has turned it 4 degrees and its drawn place until the clip has moved it a pixel (`view.turn_step`,
  `view.move_step`), so this should not happen with the shipped engine; if a part still crawls, it is an effect
  (`motes`) or a light whose `pulse` is large, or two shapes of one thing in different parts (give them one `part`).
- **At the small size it is a silhouette.** Give the file size variants: `"px": [90, null]` on the fingers, specks
  (`hash`) and rivets, and a twin shape with `"px": [null, 90]` where the small size needs more (a cord 1.3 wide
  instead of 0.7, a bigger hand). The Keeper has both; `shapes still --style rendered_arpg` shows the small set.

Materials by name come from the library; a file's own `materials` win. Bones:
`hips spine.001 spine.002 spine.003 neck head shoulder.L upper_arm.L forearm.L hand.L thigh.L shin.L foot.L toe.L`
and `.R`. The clips: `idle walk run attack cast hit death` for the game (`pixelforge shapes joints` lists all 24).

## 6. What passes

Judge the pictures, not the numbers alone; the numbers are what the tests check.

- Every direction is a full figure; nothing collapses or flips; the back view really is the back.
- One piece per frame: no foot, hat or hem floating free in idle, walk, run, attack or death (the test counts
  opaque islands of 12 px or more; one).
- The frames the game plays do not boil: at the preset's frame count (24 for the gothic look) fewer than 12% of the
  figure's own pixels change from one idle frame to the next and fewer than 3% change and change straight back (the
  Keeper: 4% and 0.4% facing S, 9% and 0.2% facing E), and the hat rows of a walk frame are a whole-pixel shifted
  copy of the frame before (under 10% left over after the shift; the Keeper 1-3%). `pixelforge shapes preview` at the
  preset's frames is what to look at: a held pose must be pixel for pixel the frame before.
- The feet hold the ground: the lowest foot pixel sits on one row in every walk and idle frame in all eight
  directions; in the run the planted frames sit on that row and the airborne frames lift; the contact shadow never
  moves.
- Hems, veils and cords swing after the body by a frame or two; the hat stays on the head in the attack.
- The eyes show under the brim in the front and three-quarter views at the gothic size (120 px).
- At the small size (76 px, `rendered_arpg`) the figure still reads as a silhouette: hat, shoulders, hem.
- The exported atlas's frames sit on their anchors (`dy + h` within a few px of 0) and the game shows the figure on
  the moor at the right height (`--skin`).

## 7. What to commit

- The file under `tools/pixelforge/assets/shapes/characters/<name>.shapes.json` (or `objects/`).
- Pictures under `docs/screens/shapes/`, dated, each under 400 KB: the 8-direction idle and walk sheets, a walk GIF,
  the attack and cast GIFs, the painting beside the sprite at one height, the in-game shot.
- Tests green: `cd tools/pixelforge && python -m pytest -q`.
- A dated entry under `docs/HANDOFF.md` section 7 saying what was made, what was verified, what is honestly short.
- Nothing under `art/` unless the task is to put the character in the game; then `art/sprites/<kind>.png` and
  `.json` only, after a look-test.

Plain, precise words everywhere a person will read them; British spelling (colour).
