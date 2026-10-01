# PixelForge — operating guide for AI agents

You are driving a pixel-art sprite pipeline for a person who wants Diablo 2
style game sprites from Midjourney images, on a weak Windows laptop. This
document is complete: everything the desktop app can do is a command here.
Prefer the commands over touching files by hand; they keep `project.json` in
sync with the app the person is looking at.

## Mental model

```
Midjourney image(s)  ──►  cutouts  ──►  palette  ──►  [3D model ─► Mixamo ─► renders]  ──►  pixel frames  ──►  Godot files
   (person)               split       palette        model     rig(person)   render         pixelate           export
```

Two paths share the first steps:

- **Quick path** (no Blender): one image → `still` → sprite, procedural
  animation, Godot export. Use it to show results fast and to judge the look.
- **Full path**: sheet → model → Mixamo (person) → render → pixelate → export.
  Gives every animation from 8 directions with one consistent look.

Steps needing a person (you cannot do them): making Midjourney images and
installing Blender. Everything else is yours; the pipeline runs unattended.
Mixamo is optional (mocap upgrade), never required.

## Install / environment

```
pip install -e .            # from the repo root; needs Python >= 3.10
pixelforge --help
```

Blender is only needed for `model`, `rig`, `render`. It is auto-detected on
PATH and in the usual Windows install folders; otherwise
`pixelforge project set --blender "C:\Program Files\Blender Foundation\Blender 4.2\blender.exe"`.

`pip install mcp` enables `pixelforge mcp`, an MCP server exposing the same
operations as tools (see the end of this file).

## Project layout

```
<project>/
  project.json                       state: settings, characters, which steps are done
  characters/<name>/
    source/  sheet.png front.png back.png side.png style.png   imported originals (PNG copies)
    views/   front.png side.png back.png                       tight cutouts, transparent background
    palette.hex / palette.png                                  locked palette
    model/   <name>_spec.json <name>.blend <name>.fbx          3D stage (fbx goes to Mixamo)
    mixamo/  *.fbx                                             person drops Mixamo downloads here
    model/   <name>_rigged.blend                               after `rig`
    renders/ manifest.json <action>/<dir>/frame_NNN.png        Blender output, RGBA, render_size px
    frames/  animations.json <action>_<dir>/frame_NNN.png      pixel art frames (sprite size)
    sprites/ <view>.png <view>_x4.png                          quick-path stills
    anim/    <preset>/frame_NNN.png preview.gif                quick-path procedural clips
    export/  <name>.png .json .tres .tscn                      Godot 4 files
```

Directions (8): `S SW W NW N NE E SE` = where the character faces on screen.
Clips are named `<action>_<direction>`, e.g. `walk_SW`.

## Commands

All `project` commands accept `--project <folder>` (or run inside the folder)
and `--json` for machine-readable output. Non-zero exit + `{"ok": false,
"error": ...}` means the step needs something; the error text says what.

```
pixelforge project new <folder> [--name N] [--style hd|snes|16bit|8bit]
pixelforge project status --json
pixelforge project set [--style S] [--blender PATH] [--directions 8] [--render-size 256] [--godot-res-dir res://sprites]

pixelforge project add <character> --describe "<one sentence>"
pixelforge project describe <character> "<one sentence>"
pixelforge project prompts <character> [--reference <sheet image url>] --json
pixelforge project import <character> sheet|front|back|side|quarter|topbottom|top|bottom|style <file>   # topbottom = plan view + underside in one image

pixelforge project run <character> split
pixelforge project run <character> palette
pixelforge project run <character> model          # needs Blender; writes model/<name>.fbx for Mixamo
pixelforge project run <character> rig            # built-in rig + clips; uses mixamo/*.fbx instead if present
pixelforge project run <character> render [--frame-step 2] [--elevation 30]
pixelforge project run <character> pixelate
pixelforge project run <character> export        # generic Godot SpriteFrames (.tres/.tscn)
pixelforge project export-game <character> --kind <kind> [--name "Display Name"]   # GODMARROW format: art/sprites/<kind>.png|json (+ _normal/_depth sets)
pixelforge project run-all <character>            # runs the remaining automatic steps, stops where blocked
pixelforge project run <character> render --passes color,normal,depth   # also render lighting maps (slower: 3 renders per frame)

pixelforge project still <character> [--view style|front|side|back] [--animate idle glow ...] [--export]
```

Lower-level tools (work on plain files, no project):

```
pixelforge pixelate <images> -o out [--style hd] [--remove-bg --crop --outline auto] [--palette p.hex]
pixelforge frames <frame files> -o dir [--palette p.hex] [--gif]        # consistent animation pixelation
pixelforge animate sprite.png -o dir --preset idle [--effect "sway:amplitude=2,anchor=bottom"] [--gif]
pixelforge rotate sprite.png -o out.png --angle 30 | --flip h | --turn 1 | --spin 12 --gif
pixelforge palette <images> -o p.hex --colors 96
pixelforge pack --anim "walk=dir/*.png@12" -o sheet.png
pixelforge godot --anim "walk=dir/*.png@12" --name hero --out <godot>/sprites/hero --res-dir res://sprites/hero
pixelforge prompt --describe "<sentence>" [--kind sheet|front|back|sprite|item]
```

World, effects and UI tools (no project; each writes a PNG + JSON and, where Godot wants one, a .tres):

```
pixelforge prop <image> <name> -o art/objects [--height 96 | --scale S] [--sway canopy|banner|flame] [--variations 4]
                 [--game-objects art/objects/objects.json --hr 2]   # merges into Godmarrow's objects.json (png, ox, oy, hr)
pixelforge vfx fire|smoke|wisp|burst|embers|ring|bolt|slash|circle|cloud|shards|pillar|decal|drip|flash|ward|vortex|rain|ashfall|fog|lightning|swarm|chain|rune|pool|cookie <name> -o art/fx [--palette wisp|lantern|miasma|bone|smoke|blood | a,b,c hex]
                 [--size W H --frames 8 --fps 10 --bands 6 --glow auto|on|off --gif] [--atlas art/sprites]   # looping sheet; --atlas = a SpriteSet (anim loop/once, view down)
pixelforge tiles <texture.png> <name> -o art/tiles [--second <texture2.png>] [--tile 72 36 --variants 6]   # 2:1 diamonds + 16 transition tiles + TileSet .tres
pixelforge ui9 <panel.png> <name> -o art/ui [--border L T R B] [--mid 8]        # 9-slice texture + StyleBoxTexture .tres (margins detected)
pixelforge skilltree data/skills.json [--list <class>] [--move id=row,col[,tab]] [--rename id="Name"] [--apply]   # no flags = the GUI editor
pixelforge icons <flatlay.png> -o art/items --names "sword:1x3,ring,hood:2x2"      # inventory icons: <id>.png (4x) + <id>@1x.png + icons.json
pixelforge recolor <atlas.png> -o out.png --hue 40 | --map "#1d4a4c=#7a3d10"       # recolour without re-rendering
pixelforge recolor art/sprites --kind wraith --suffix @champion --hue 60            # a Godmarrow variant set from the base one
pixelforge project blender-download                                                # fetch the portable Blender (380 MB) if none is installed
pixelforge project run-all --all                                                   # every character in the project, in turn
pixelforge project check <character>                                               # the automatic checks (cutouts, carve, frames) in plain English; also run inside split/model/render
pixelforge sfx all -o art/sfx [--variations 3]                                     # 18 synthesised sound presets -> WAV
pixelforge effect spear.png bone_spear -o art/fx --kind missile --rotations 16     # painted missile art -> spinning, chip-shedding, 16-heading effect
pixelforge vfx bone_spear bone_spear -o art/fx --rotations 16 --gif        # a spinning bone spear, 16 headings, in the manner of the classic missiles
pixelforge describe "a wisp lantern spell, pale blue, slow, with embers" -o art/fx   # plain words -> a spell (or skin ops / prompt / music cue)
pixelforge game-preview --skin keeper --attach [--shot shot.png]                   # launch the game with the set (and its attached effects) on the hero
pixelforge spell new fireball -o art/fx --preset fireball --gif                   # a layered spell: strip + json + gif + editable .spell.json
pixelforge skin views/front.png '[{"op":"recolor","at":[220,51],"to":"#5ae6d2","range":0.12,"radius":30}]'   # headless skin edit (ops: recolor glow paint erase restore region smooth clone)
pixelforge music list                                                              # the score's 21 cues (act, place, tempo, key, mode, seed) and the knobs
pixelforge music all -o art/music [--seconds 120] [--format ogg]                   # every cue as a seamless loop + spectrogram PNG + music.json
pixelforge music a1_wild --seed 5 --set bpm=64 --set sc=phr --play                 # another tune for a place, with knobs, and hear it
pixelforge music sheet -o art/music; pixelforge music all --sheet art/music/music_sheet.json   # the editor: a JSON of every knob, edited, rendered
pixelforge portrait views/front.png mystic -o art/portraits [--sizes 48 96]        # head-and-shoulders portraits
pixelforge compare before.png after.png -o cmp.png                                 # strip (+GIF for frame folders) + mean difference
pixelforge doctor [--project <folder>]                                             # what works on this machine, with fixes
pixelforge godot-addon <godot project>                                             # PFSpriteSet / PFFx / PFObjects loaders into addons/pixelforge
pixelforge prop3d <model.glb|.fbx|.obj> <name> -o art/objects --height 3.4 [--game-objects objects.json]   # REAL props: game camera, lantern light rig, grime + bump, graded to the painting, pixelated
pixelforge tiles3d grass stone moor_grass -o art/tiles [--tiles 6]                 # ground rendered in 3D with the same light; 36 variants + 16 lit transitions + TileSet
blender -b --python pixelforge/blender/gen_tree.py -- --out dead.glb --kind dead|pine|willow --seed 3 --height 5   # grown trees (no add-on)
```

```
pixelforge prompt --world object|building|tree|ground|effect|ui|icons|portrait --describe "..." --sref <hero sheet url>   # style-locked world prompts
pixelforge artlist -o docs/ART_ORDER.md --sref <hero sheet url>                   # the Act I art order with every prompt
pixelforge object <sheet.png> <name> -o art/objects --height 1.2 [--views 3] [--top plan.png] [--canopy] [--game-objects objects.json]   # painted sheet -> carved, painted, filmed, pixelated prop (the hero way); --top carves the footprint and paints the top; --canopy for trees
pixelforge hero <sheet.png> <name> --describe "..." --project ./forge --to-game <game>/art/sprites           # a hero sheet -> the game, one command
```

**The world is painted, then built: objects get the same treatment as heroes.** `prompt --world`
writes Midjourney prompts with one fixed style block (measured from the Hollow Mystic painting) and `--sref` to the
hero sheet, asking for exactly the views the Forge carves from; `object` runs the hero chain on the result (cut out ->
visual hull from the views -> painting projected on -> game camera + lantern rig -> mild grade -> pixels -> objects.json).
`docs/ART_ORDER.md` in the game lists Act I's assets in the order to paint them. `prop3d` on CC0 kits is the fallback
geometry until a painting exists for that asset.

**The quality bar: Diablo II Resurrected / Path of Exile, not clip art.** Flat painted stand-ins
are out. Props and buildings come from real geometry: CC0 kits (Kenney graveyard / castle / nature / mini-dungeon,
fetched by `tools/make_props3d.py`), grown trees, or a model carved from a painting; all through `prop3d`, whose
look is: orthographic camera 30° above with the object turned to the iso diagonal, a warm key from the upper left,
cold teal fill and rim, dark world, ambient occlusion, procedural grime + bump + top dust on every material, then
`grade.py` (lightness curve to the Hollow Mystic painting's median 0.35, chroma to ~0.035, shadows toward teal,
pure blues turned teal, fine grain), 2x render pressed down with a box filter, dark 1 px outline. Scale: `--ppu 108`
is one texel per screen px with heroes ~195 px (objects.json `hr` 4; the 2D tiles/props of the first pass used hr 2).
Modular kit pieces stack with `--stack` (each part sits on its own base). Ground: `tiles3d` renders a patch with the
same rig and cuts grid-aligned diamonds (72x36 texels, hr 2); two materials on one relief give the edge tiles.

Worked examples of using all of it at once: `tools/make_world_art.py`, `tools/make_buildings.py` (+ `tools/pf_paint.py`, a painting kit for stand-ins) in the game (tiles, UI frames, props into
objects.json, sounds, portraits, variant skins) and `tools/make_fx.py` (the 52 effect sheets). The Studio's **Tools**
button offers every one of these as a form.

Studio-only helpers an AI should know exist: the manual cutout editor (step 3, Edit <view>: erase / restore / magic
erase, saves over `views/<view>.png`; `views/<view>_raw.png` is the untouched crop), the animation preview and
`api.preview_gif(project, name, clip, dir)` -> `previews/<clip>_<dir>.gif`, and the one-click Blender download
(`api.download_blender`). Character setting `model_mode` = auto | template | hull picks the 3D path.

Rules the tools keep: glow only where the game allows it (`vfx` adds a halo to fire, wisps and bursts; never to smoke or
embers); every colour comes from the ramp you give or the game's presets; `skilltree` never edits `data/skills.json`
behind `tools/skill_trees.py` — it keeps `tools/skill_tree_edits.json`, which that script applies last.

## Godmarrow specifics (the game this forge serves)

- Project style `godmarrow` (`pixelforge project set --style godmarrow`): ~195 px standing height, **every colour kept** (no palette reduction), hard edges. Use it for every game character.
- Sheet: prefer prompt **A2** (four views: front, three-quarter, side, back). The quarter view carves the diagonals and paints them; `split` names 4 figures `front quarter side back`.
- Plan views: prompt **A3** (world kind `topdown` for objects) gives a second image, top view + underside side by side; import it as `topbottom`. The carve finds its orientation (`spec["orient"]`, IoU against the hull), cuts the footprint with it (hat brims, shoulders, crowns, roofs) and paints upward faces from it. Without it the top of a hat is painted from the front view, which is why wide hats looked flat-topped.
- Painted effects (`effect_art.make_effect(image, name, out, kind=missile|loop|burst|frames, preset, frames, width, rotations)`; CLI `pixelforge effect`; MCP `make_effect_from_art`; world prompts `missile`, `effect`, `spell_frames`): cut out on black/white, animated per kind, written in the vfx layout. Spell layers of kind `image` take a vfx json (painted or generated) or a PNG. Orbits (`vfx.ORBITS`: bone_armor, bone_shard_aura; kinds `<name>_front` / `<name>_back` for the near and far halves) and attachment `z: behind|front` (effects editor tick, add-on spawns behind the body). Skin editor layers: `SkinEditor.layers`, ops carry `layer`, Save flattens.
- Impacts and areas: `nova` (an expanding ring of shards on the ground plane), `firewall` (a looping wall of flame), `bone_burst` (a spear's impact: flash, chips, dust). Spell presets: fireball, ward, soul_drain, bone_shatter, lightning_strike, bone_spear_hit, frost_nova, fire_wall, corpse_burst (`spell.PRESETS`). Sheets: prompt A (3 views), A2 (4 views), A4 (T-pose, 4 views; the humanoid fit tries 0 degrees too), A3 (plan views).
- Missiles (`vfx.MISSILES`: bone_spear, teeth, ice_bolt, fire_bolt; generator `gen_missile`: a spear body with a spiral highlight, bone chips on a helix in front of and behind it, a trail, a glow; each kind carries its own palette): `pixelforge vfx bone_spear spear -o art/fx --rotations 16` writes a grid sheet, row k = k*360/16 degrees anticlockwise, `rotations`/`frame_height` in the json; Godot `PFFx.spawn_missile(parent, dir, name, pos, heading)` picks the row (or rotates a plain strip). New missiles are a dict in MISSILES (length, radius, twist, spin, shards, helix, trail, head, shaft, fan).
- Describe it (`describe.py`: `draft(text, image=None, what=None)` -> {"what": spell|skin|prompt|music, ...}; CLI `pixelforge describe "..." [--image] [--as] [-o] [--apply]`; MCP `describe`): a vocabulary draft (colours -> palettes/hex, effect words -> vfx kinds, places on a figure located by `find_feature` (eyes, hands, head, feet, lantern, chest), size/speed/strength words, spell presets by name, music mood words -> cue knobs). An assistant should write the structures directly when the words are richer than the vocabulary. Preview in game (`game_preview.py`: `preview_in_game(game_dir, skin, fx, attach, shot)`; CLI `pixelforge game-preview`; MCP `preview_in_game`) launches Godot with the game's own hooks `--skin --cls --zone --fx=a,b --attach --shot`; `--fx` and `--attach` are in the game's `core/test_hooks.gd`.
- Skin ops (`skin_ops.py`: `apply_ops(image, ops)`; CLI `pixelforge skin <image> <ops.json|json>`; MCP `edit_skin`): recolor (by point + range, or by named region), glow, paint, erase, restore (from `<image>_raw.png`), smooth, region (a named selection kept in `<image>.regions.json`: `polygon` or a magic-wand `like: {at, range, radius}` patch; `mode: add` adds a piece as Shift+click does, `mode: subtract` takes one away as Alt+click does, no mode starts the region over), clone (the clone brush: `from`, `to`, `radius`, optional `path` of stroke points, `opacity`, `soft`; copies the picture's own pixels at a fixed offset along the stroke, never from bare canvas). The skin editor (`skin_editor.py`) is these ops with a toolbar; "Save ops as JSON" writes a replayable list. Spells (`spell.py`: `new_spell`, `render_spell`, `export_spell`; CLI `pixelforge spell new|render|presets`; MCP `make_spell`): layered effects with per-layer kind, palette, scale, x, y, rotation, start, speed, opacity, blend (normal | add), seed; the export is the same strip + json layout as `vfx`, so PFFx plays it. Designer window: `spell_designer.open_spell_designer`.
- Colour editor (`color_editor.py`: `select_like`, `shift_colors`; window `open_color_editor`) recolours a selection by OKLab offset so shading is kept; works on cutouts (before the build) and atlases (every frame). Effects editor (`fx_editor.py`: `mirror_to_all`, `composite`, `save_attachments`; window `open_fx_editor`) attaches `vfx` effects to a sprite set per view: `meta.attachments = [{name, kind, palette, scale, glow, fx, views: {view: [ox, oy]}}]`, offsets in sprite px from the ground point; sheets rendered into the effects folder (`meta.fx_dir`). Godot: `PFSpriteSet.attachments()`, `PFFx.spawn_attachments(parent, fx_dir, set, view)`, `PFFx.update_attachments(nodes, view)`.
- Checks (checks.py) run inside split, model and render and land in the step result (`check`) and the character's notes (`split_check`, `model_check`, `render_check`): paper-white pockets inside a figure, loose islands, dark paint dropped by the key, view heights that disagree, loose islands and plates in the carve, white pixels and height jumps in the frames. Cutouts also get `fill_bright_specks` (white specks inside dark cloth take the cloth's colour) and the carve counts a cell solid at 35% coverage so lacy hems keep their dark cloth. With no plan view the model gets a synthesized top (`synthesize_top`: topmost paint per column; a hat cone revolved from the brim band and lifted toward straw).
- Carve rules (model_spec.build_hull_spec): a thin side-view run only pairs with a thin front run (no plates across the body); islands under 3% of the body are culled; the front view's lost thin parts return as cards at mid-depth; a wide thin band at the top is a hat brim -> a real cone part built after smoothing; `canopy=True` (object --canopy) turns a tree's crown into crossed painted cards (front, side, and top when a plan view is given) over a solid trunk. `hull_preview(spec, png)` draws front/side/quarter/top of the voxels for a quick check without Blender.
- Render with `--passes color,normal,depth` when the character is final (the lantern lights the sprite cards with those maps); `export-game` then writes `<kind>_normal.*` and `<kind>_depth.*` next to the colour set.
- `export-game` writes the game's own atlas (`idx` keyed `anim/view/i`, foot anchors, 8 views `down front side back up front_l side_l back_l`, anim set idle/walk/atk/atk2/cast 8, hit 6, death 8, dodge 8). Copy the files into the game's `art/sprites/` and look-test with `--skin=<kind>`.
- Game rules that touch art: no red light; glows only on magic, lanterns and wisps (never on plain attacks); no animals or animal motifs; the Ossuarch is bone and iron, never gold; realistic proportions, worn and tattered, one bold saturated mass per figure. Full list: the game's `docs/wiki/01-rules-and-decisions.md`.

## The standard procedure

1. `status --json`. Read `characters.<name>.next` and `done`.
2. If there is no character: ask the person for a one-sentence description
   (silhouette, materials, colors, 3–5 signature details) or write one from
   their reference image, then `add`.
3. `prompts <name> --json`. Give the person **prompt A** (sheet) and **prompt C**
   (sprite) verbatim, plus the rules. Ask for the upscaled PNGs.
4. `import <name> sheet <file>` and `import <name> style <file>` (any others they made).
5. `still <name> --view style --animate idle --export` — show them the result
   immediately (`sprites/style_x4.png`, `anim/idle/preview.gif`). Adjust the
   style tier if they want chunkier/finer (`set --style ...`, rerun).
6. `run-all <name>`. It runs split → palette → model → rig → render →
   pixelate → export without stopping (only Blender missing stops it).
   Rendering prints `PF_PROGRESS` lines; ~1 s per frame on CPU, so 6 clips x
   8 directions is 10-20 minutes. Run it in the background and check back.
7. Optional mocap upgrade: if the person provides Mixamo FBX files in
   `mixamo/`, rerun `rig` (then render/pixelate/export); they replace the
   built-in clips.
8. Tell the person where the Godot files are (`export/`) and how to use them
   (copy the folder to `res://sprites/<name>/`, instance `<name>.tscn`).

## Checking quality (do this, don't assume)

- After `split`: open `views/front.png`; it must be a single figure, tightly
  cropped, transparent background. If it contains two figures or is cut off,
  the sheet had a busy background or touching figures → ask for a re-roll or
  a separate front image (prompt B1) and `import ... front`.
- After `palette`: `palette.png` should contain the accent colors (glow, gold).
  If not, `--colors` higher or import a better style image.
- After `pixelate`: look at `frames/walk_S/frame_000.png` and one `_W`. Check
  the size is the same for every clip (it is by construction) and the
  silhouette reads at 1x. Flicker between frames is prevented by the shared
  palette + stabilization; if a glow pulses badly, that's the source render.
- Every rendered character in a project shares one pixels-per-unit scale
  (`settings.ppu` in project.json) so they are the right size relative to each
  other. To change the global scale, delete `ppu` from every character and
  re-render.

## Failure messages and what to do

| message | action |
|---|---|
| `Blender was not found` | ask the person to install Blender or give the path; `set --blender` |
| `no .fbx files in .../mixamo` | only from `import_mixamo` directly; use `run ... rig` (built-in) instead |
| `none of the FBX files carried a mesh` | one download must be *With Skin* |
| `could not identify a front view` | import a separate front image (prompt B1) |
| `no reliable pixel grid` (note, not an error) | expected for AI images; the style tier decides the size |
| `--ppu ... clips this character` (render warning) | this character is bigger than the shared scale allows; re-render with `--frame-step` unchanged after deleting `ppu` from the *smaller* characters, or accept |
| `Blender failed (exit N)` | read the last lines printed; usually a missing image path or an FBX that isn't from Mixamo |

## What the 3D step actually does (so you can explain it)

**Humanoid first.** When the sheet has a side view and the silhouette shows legs, the
model step starts from the bundled CC0 mannequin (`assets/animations/quaternius_ual_standard.glb`: a human mesh
already skinned to the armature that drives its 46 clips), fuses its jointed pieces into one skin, poses its arms down
to the sheet's A-pose (the angle that best matches the painting), shrink-wraps it onto the hull carved from the
painting, carries the fit back to the rest pose through the skin weights, and paints the art onto it in that pose.
The rig step then keeps that armature and takes the clips directly (no retargeting). Clean knees, elbows and hands,
and the body still matches the painting's silhouette. `fit_template.py` prints `PF_FALLBACK` for a robe or a skirt
(no legs in the silhouette) and the carved hull is used instead, as before. Settings: `model_mode` on the character =
`auto` (default) | `template` (force the fit, e.g. a short robe) | `hull`. The old description follows.


`model` builds an "inflated cutout": the front-view silhouette is put on a
grid, each cell's distance from the edge decides how much it bulges forward and
backward, and the front/back images are camera-projected onto the surface as
its texture. Crude up close; convincing at sprite scale. Mixamo auto-rigs it
because it is a humanoid silhouette. `render` circles an orthographic camera
30° above the ground around the animated model, framing every frame of every
action identically. `pixelate` then converts each render with the locked
palette and a fixed scale so all frames match.

## MCP server

`pixelforge mcp` runs an MCP server (stdio) with tools `new_project`, `status`,
`configure`, `add_character`, `prompts`, `import_image`, `run_step`, `run_all`,
`quick_sprite`. Claude Desktop config:

```json
{"mcpServers": {"pixelforge": {"command": "pixelforge", "args": ["mcp"]}}}
```

## Don'ts

- Don't edit `project.json` by hand while the app is open; use the commands.
- Don't put "pixel art" into prompts A/B (texture noise); do keep the same
  description sentence in every prompt.
- Don't re-run `render` for a tweak that `pixelate` can do (style, outline).
- Don't promise animation from Midjourney alone: frame-to-frame consistency
  needs the 3D path.

## Doing the Mixamo step yourself (local session with a browser)

If you run on the person's computer with a browser tool (Playwright/Chromium in
Claude Code, or the Chrome extension), you can do the rig step instead of the
person. Ask them to sign in to Adobe in the browser you open; then:

1. Open https://www.mixamo.com/#/?page=1&type=Character → **Upload Character** →
   choose `characters/<name>/model/<name>.fbx`.
2. Auto-rigger, *Orient*: the model must face forward (hood point up, front
   toward you). Click **Next**.
3. *Markers*: drag the circles onto the model. For a robed humanoid without
   visible legs: chin just under the face opening (~30% from the top), wrists
   on the hand tips at the sides (~55% down), elbows halfway between shoulder
   and wrist, knees on the robe at ~75% down left and right, groin at the
   centre ~60% down. Skeleton LOD: Standard. **Next**, wait for the preview,
   **Next**, **Finish**.
4. Animations tab: search and select each of `Idle`, `Walking` (tick **In
   Place**), `Running` (In Place), `Standing Melee Attack Downward` or
   `Sword And Shield Slash`, `Hit Reaction`, `Standing Death Forward`.
5. **Download** each: Format *FBX Binary(.fbx)*, Frames per Second *30*, Keyframe
   Reduction *none*. Skin: **With Skin** for the FIRST download only, **Without
   Skin** for all others. Save every file to `characters/<name>/mixamo/`.
6. `pixelforge project run-all <name>`.

If marker placement fails twice, fall back to telling the person the
positions above and let them drag; it takes them a minute.
