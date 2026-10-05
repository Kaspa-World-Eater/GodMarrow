# PixelForge — operating guide for AI agents

You are driving a pixel-art sprite pipeline for a person who wants Diablo 2
style game sprites from Midjourney images, on a weak Windows laptop. This
document is complete: everything the desktop app can do is a command here.
Prefer the commands over touching files by hand; they keep `project.json` in
sync with the app the person is looking at.

## Mental model

**Characters are shape sprites.** That is the character road (since 2026-10-02; the Forge app's Characters bench and
`pixelforge shapes ...` are it), and the one to take for every hero, creature and NPC:

```
painting (the reference)  ──►  .shapes.json, written by hand  ──►  pixel frames (8 directions, every clip)  ──►  the game's atlas
  shapes measure, compare       validate, still, preview,         shapes render / project render-shapes          project export-game
  shapes sample-materials       detail (the painted layer)        (godmarrow preset, 195 px, light and ink)       (+ skins.json entry)
                                                                  or all of it: project build <character>
```

A painting is the reference and nothing else: `shapes measure` reads its widths into a measurements file, `shapes
sample-materials` takes its colours into the ramps, `shapes compare` lays it beside the sprite with the silhouette
overlap. Nothing is cut out, carved or drafted from it: **Claude authors the model by hand** against the painting (a
generator script in the character's folder, three rounds of still, compare, edit; the Hemomancer is the worked example,
`docs/concepts/hemomancer/shapes/README.md`), then paints the detail layer (`shapes detail`) and builds it for the game
(`project build`). See "Shape sprites" below for the format and every command. Steps needing a person: making
Midjourney paintings. Everything else is yours; the pipeline runs unattended, and no Blender or Mixamo is involved.

The roads that drew characters automatically (the cutout road, the drafts) are retired: "Retired roads" at the end.

## Install / environment

```
pip install -e .            # from tools/pixelforge (or pip install -e tools/pixelforge from the repository root); needs Python >= 3.10
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
             <clip>_<DIR>/frame_NNN.parts.png                  shape road: the part index per pixel (0 = empty), paletted PNG
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
pixelforge project new <folder> [--name N] [--style godmarrow|gothic_hd|rendered_arpg|snes|handheld|indie|painterly]
pixelforge project status --json
pixelforge project set [--style S [--character C]] [--blender PATH] [--directions 8] [--render-size 256] [--godot-res-dir res://sprites]
pixelforge styles [--json]                       # the look presets and every number each fixes
pixelforge tools status [--json]                 # the free tools (Aseprite, ffmpeg, Furnace, Tiled...): found or not, version, the install sentence; see "Tool adapters"
pixelforge job start "<sentence>" -p P           # one sentence across benches -> Claude's plan, carried out step by step; job list|status|log|approve|cancel|resume|report; see "Jobs"
pixelforge styles --demo OUT [--source front.png] [--only snes,indie] [--effect wisp]   # a GIF per look + contact sheet + styles.json

pixelforge project add <character> --describe "<one sentence>"
pixelforge project describe <character> "<one sentence>"
pixelforge project prompts <character> [--reference <sheet image url>] --json
pixelforge project import <character> sheet|front|back|side|quarter|topbottom|top|bottom|style <file>   # topbottom = plan view + underside in one image

pixelforge project run <character> split [--tolerance 0.08] [--views 3|4]
pixelforge project run <character> palette [--colors 0]
pixelforge project run <character> model [--model-mode auto|template|hull] [--height 1.8]   # needs Blender; writes model/<name>.fbx (and model/<name>_hull.png, the carve, before Blender runs)
pixelforge project run <character> rig [--clips idle,walk,...]   # built-in rig + clips; uses mixamo/*.fbx instead if present
pixelforge project run <character> render [--frame-step 2] [--elevation 30] [--per-clip 24] [--actions walk,idle]
pixelforge project run <character> pixelate [--outline auto|none|#hex]
pixelforge project preview-gif <character> [--clip walk] [--dir S]     # previews/<clip>_<dir>.gif
pixelforge project run <character> export        # generic Godot SpriteFrames (.tres/.tscn)
pixelforge project export-game <character> --kind <kind> [--name "Display Name"] [--out <game>/art/sprites] [--skin-for <class>]   # GODMARROW format: art/sprites/<kind>.png|json (+ _normal/_depth sets); into the game's sprites folder it also writes the skins.json entry {"<class or kind>": "<kind>"} and warns when the figure is not the game's height
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
pixelforge effects list [--family fire] [--json]                                   # the effects engine's library: names, families, levers, node chains, palettes
pixelforge effects render flame -o art/fx --lever size=1.3 --lever heat=1.2 [--palette frost --bands 5 --seed 7 --gif --json]   # a library effect (an old vfx kind works too)
pixelforge effects preview soul_fire -o art/fx --gif                               # the strip + json + a GIF to look at
pixelforge effects graph mine.graph.json -o art/fx [--lever k=v] [--gif]           # any graph file (the format below)
pixelforge effects nodes --json                                                    # every node op with its parameters
pixelforge describe "a wisp lantern spell, pale blue, slow, with embers" -o art/fx   # plain words -> a spell (or skin ops / prompt / music cue)
pixelforge game-preview --skin keeper --attach [--shot shot.png]                   # launch the game with the set (and its attached effects) on the hero
pixelforge game-preview --play                                                     # the plain game; --import = a headless import pass so new art files are seen
pixelforge forge [--screen spell] [--windowed]                                     # the Forge app (the person's face of all this; see below)
pixelforge spell new fireball -o art/fx --preset fireball --gif                   # a layered spell: strip + json + gif + editable .spell.json
pixelforge skin views/front.png '[{"op":"recolor","at":[220,51],"to":"#5ae6d2","range":0.12,"radius":30}]'   # headless skin edit (ops: recolor glow paint erase restore region smooth clone)
pixelforge music compose -o out/piece.song.json --genre battle --mood tense --key "E minor" --seed 12 --render   # a new piece as an editable song (+ audio)
pixelforge music edit out/piece.song.json --op 'transpose pattern=A semitones=2' --op '{"op":"set_lane","lane":"lead","instrument":"brass_horn"}'   # edit operations (see below)
pixelforge music play-bar out/piece.song.json --pattern A --bar 0 -o out [--play]   # one looping bar as WAV, in well under its length
pixelforge music render out/piece.song.json -o out --name piece --format ogg        # the whole piece: seamless loop + PNG + the song beside it
pixelforge music export out/piece.song.json -o <game>/audio/music --name a1_town    # Keep: into the game as <name>.ogg + <name>.song.json
pixelforge music list [--genre boss]                                               # the library, genres, moods, instruments, scales, lanes, fx, ops
pixelforge music load forge_home -o out/forge_home.song.json                       # a library piece to edit
pixelforge music measure docs/refs/forge_music_reference.mp3 out/piece.wav         # loudness, bands, centroid, key, tempo; the first is the reference
pixelforge music list-cues; pixelforge music a1_wild --play; pixelforge music act --act 2; pixelforge music all -o <game>/audio/music --format ogg   # the game's 21 cues, each a library song (music/cues.py maps cue -> song; <out>/cues.json overrides)
pixelforge portrait views/front.png mystic -o art/portraits [--sizes 48 96]        # head-and-shoulders portraits
pixelforge compare before.png after.png -o cmp.png                                 # strip (+GIF for frame folders) + mean difference
pixelforge doctor [--project <folder>]                                             # what works on this machine, with fixes
pixelforge godot-addon <godot project>                                             # PFSpriteSet / PFFx / PFObjects loaders into addons/pixelforge
```

```
pixelforge prompt --world object|building|tree|ground|effect|ui|icons|portrait --describe "..." --sref <hero sheet url>   # style-locked world prompts
pixelforge artlist -o docs/ART_ORDER.md --sref <hero sheet url>                   # the Act I art order with every prompt
pixelforge object <sheet.png> <name> -o art/objects --height 1.2 [--views 3] [--top plan.png] [--canopy] [--game-objects objects.json]   # painted sheet -> carved, painted, filmed, pixelated prop; --top carves the footprint and paints the top; --canopy for trees
```

**The world is painted, then built: objects are shape files too.** `prompt --world` writes Midjourney prompts with
one fixed style block (measured from the Hollow Mystic painting) and `--sref` to the hero sheet; an object is then a
solid `.shapes.json` without bones (`shapes object`, `shapes still --game-objects`), the chest under
`assets/shapes/objects/` is the example. `docs/ART_ORDER.md` in the game lists Act I's assets in the order to paint
them. The kit props and 3D ground (`prop3d`, `tiles3d`, the fetched CC0 kits) are retired: the game does not place them.

**The quality bar: Diablo II Resurrected / Path of Exile, not clip art.** Flat painted stand-ins
are out. The old 3D prop look (`prop3d`, behind the flag) was: orthographic camera 30° above with the object turned to the iso diagonal, a warm key from the upper left,
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

## Look presets (the style)

A style is one name that fixes everything deciding how a painting becomes game art, so switching the look of a project
is one setting. `pixelforge/styles.py` holds the table; `pixelforge styles` prints it; `api.list_styles()` and the MCP
tool `list_styles` return it as JSON. Each preset carries: `figure_height` (a standing hero in sprite px), `pixel_step`
(screen px per sprite px, a hint recorded in the atlas), `colors` and `palette_lock`, `dither` / `dither_strength`,
`shading_bands` (0 = the painting's shading, 3 = flat three-band), `saturation` / `contrast` / `lightness` (a grade in
OKLab applied to the source cells before the palette is drawn, so nothing outside the palette is ever produced),
`outline` (none / auto / hex) and `outline_diagonal`, `edge` (soft = cell average, crisp = median of the inner half,
hard = near the cell centre), `clean` (passes of a 3x3 majority filter on the palette indices: a speck or a pair of
specks takes the colour area round it, lines, 2x2 blocks and borders stay; the 16-bit and handheld looks run one pass
so a detailed painting reads as clean areas at 40-60 px), `fx_bands` / `fx_glow` / `fx_haze` / `fx_frames` / `fx_fps` (procedural effects),
`anim_frames` / `anim_fps` (the still path's loops), `clip_frames` (the render's `--per-clip` default and the game
export's per-clip cap) and `tile_width` / `tile_height` / `tile_hr` (the ground diamond).

| preset | look | figure | colours | outline | shading | loops | effects |
|---|---|---|---|---|---|---|---|
| `godmarrow` | the game's own (kept as it was) | 195 px | every colour | auto | painted | 8 f @ 8 | 6 bands, glow by kind |
| `gothic_hd` | large gothic hi-res figures, gold and bone accents | 120 px | 40 | none | painted, soft edge | 12 f @ 10 | 8 bands, haze |
| `rendered_arpg` | rendered-to-sprite isometric ARPG | 76 px | 28 | none | painted, soft edge | 8 f @ 8 | 6 bands |
| `snes` | 16-bit console | 56 px | 16 | auto (hard 1 px) | 3 bands, sat x1.15, contrast x1.3, clean x1 | 10 f @ 10, clips to 12 | 4 bands, no glow |
| `handheld` | portable 32-bit, bright | 40 px | 15 | auto | 3 bands, sat x1.3, contrast x1.3, clean x1 | 6 f @ 8, clips to 8 | 4 bands, no glow |
| `indie` | modern indie pixel, saturated accents | 80 px | 32 | none | 4 bands, sat x1.2 | 12 f @ 12 | 6 bands |
| `painterly` | hi-bit, almost the painting | 144 px | 96 (not locked) | none | painted, soft edge | 12 f @ 12 | 10 bands, haze |

The older size tiers `8bit`, `16bit`, `hd` (the default for a new project), `full` are still in the table.

- Set it: `pixelforge project set --style snes` (the project), `pixelforge project set --style handheld --character imp`
  (one character; `--style project` takes it back), `api.set_style(project, name, character=None)`, MCP `set_style`.
  The result's `next` says what to run again: palette, pixelate and export (and render, for the clip count).
- A graded or banded look measures its lightness anchors (median, low, high) once per character: `pixelate_renders`
  samples the first and middle frame of every clip (`pixelate.clip_lightness_reference`) and hands the same anchors
  to every clip, so a three-band figure sits on the same three levels in idle, walk and cast. `status()` reports each
  character's `style` and whether it is its `own_style` or the project's.
- Every step reads the character's style (`api.style_of`): `palette` takes `colors`; `render` takes `clip_frames` as
  `--per-clip`; `pixelate` (stills and renders) takes the figure height, palette lock, dither, bands, grade, edge and
  outline (`outline="style"` is the default; `None` = none, `"auto"` or a hex colour override); `animate_still` takes
  `anim_frames` / `anim_fps`; `export-game` caps every clip at `clip_frames` and writes `style`, `pixel_step` and
  `figure_height` into the atlas meta. Lower-level tools take `--style` too: `pixelforge pixelate --style snes` (plus
  `--bands --saturation --contrast --lightness --edge --clean --outline none|auto|#hex` overrides), `pixelforge animate --style`,
  `pixelforge vfx <kind> <name> --style snes` (bands, glow rule, haze, frames, fps; `--haze on|off`), `pixelforge tiles
  ... --style handheld` (tile size and palette). MCP: `make_effect(style=)`, `make_tiles(style=)`.
- Animated examples: `pixelforge styles --demo OUT` (MCP `style_demo`) writes `<preset>.gif` for every look (the
  bundled Keeper front cutout `assets/styles/keeper_front.png`, or `--source`, pixelated in that look and animated with
  the still path, idle breathing plus cloak sway, with a wisp loop in that look's effect style beside her),
  `styles_sheet.png` (one frame per preset side by side with the numbers under it) and `styles.json`. The shipped set
  is in `assets/styles/` and `docs/screens/styles/` in the game repo. Show the person the sheet before choosing.
- `pixelforge/style_demo.py`: `demo_frames(style, source, effect)` and `make_demo(out, source, only, effect)`;
  `styles.validate(style)` lists what is wrong with a hand-made `Style(...)`; `styles.options_for_style(style,
  **overrides)` is the one place a preset becomes `PixelateOptions`.

## Shape sprites: characters and objects drawn by code

A shape sprite is a `.shapes.json` file you write: a list of shapes with a material each, the lights, the ground
shadow and (for a character) the bone each shape rides. The renderer (`pixelforge/shapes.py`) turns it into pixel
art that reads like hand-made work, and the rig (`pixelforge/shape_rig.py`) plays the library's motion clips on it
(24 clips exported to `assets/animations/joints.json.gz` at 24 fps), so the result is real frames per clip per
direction with no painting, no Blender and no Mixamo. This is the character road of the Forge from now on; the
painting road stays for reference and for props. The procedure for a fresh session, with the places of every
reference, is the game repository's `docs/GUIDE_SESSION.md`; this section is the format reference. The worked
example is the necromancer of the reference page (`docs/refs/necromancer_shape_sprite.html` in the game repository):
its flat file `assets/shapes/necromancer.shapes.json` re-renders the page's PNG with 99.8% of the figure's pixels
identical, and its solid file `assets/shapes/necromancer_3d.shapes.json` is the page's 3D model (61 shapes) seen
from any angle. Objects (a chest, a skull, a dead tree) are solid files without bones under `assets/shapes/objects/`.

Two kinds of file share one set of shading rules:

- **flat** (`"mode": "flat"`): polygons, ellipses and dots in the picture plane, painted back to front with
  automatic form shading. For icons, effects and props without depth, and for anything that only needs a front view.
  The page's recipe exactly: a step up along the top-left edges, a step down along the bottom-right ones, a directional
  gradient across the shape's box with a half-step Bayer dither, contour pixels (touching an earlier shape) forced to the
  darkest step, optional fold stripes, a 1 px outline, emissive pixels last, point lights tinting lit pixels through a
  Bayer threshold, a dithered contact shadow.
- **solid** (`"mode": "solid"`): ellipsoids, capsules, boxes, rings and prisms as signed-distance shapes around a
  body axis. They are voxelised once, one surface per rigid body (a part, else a bone, else the static model), so a
  leg inside a skirt keeps its voxels for the frames that swing it out; a two-voxel surface shell keeps each voxel's
  normal, material and tone; a frame rotates the shell to the wanted direction, z-buffers it (closing the one-pixel
  cracks a slanted shell leaves) and shades every pixel from one fixed light with the material's ramp (metal keeps its
  brightest step for near-direct light), draws contours where a neighbouring pixel belongs to another shape behind this
  one, the outline, the emissives, point lights using each pixel's real depth and normal (the light sits on a pixel
  centre and pulses in four steps, so its tint never crawls), the shadow. All eight game directions are real views of
  one model; the pose comes from the clips.

### Commands

```
pip install -e tools/pixelforge   # once, from the repository root. Without installing: cd tools/pixelforge && python -m pixelforge ...
                                  # (file paths then start from tools/pixelforge; from the repository root, python -m pixelforge does not find this checkout's package)

pixelforge shapes template [--height 120] [-o tpl.json] [--png tpl.png]   # the author pose: every bone's head and tail, to draw around
pixelforge shapes measure FRONT.png [SIDE.png] [BACK.png] -o M.json           # painting to shapes 1: silhouette widths per height band + landmarks (head, shoulders, chest, waist, hips, hem, limb widths; fractions of the height)
pixelforge shapes sample-materials FRONT.png --model x.shapes.json [-o y.shapes.json] [--only skin,cloth]   # painting to shapes 2: the painting's colours under each material's region -> that material's ramp (OKLab k-means), written into the model
pixelforge shapes compare x.shapes.json --ref SHEET.png -o cmp.png [--height 195] [--views front,side,back]   # painting beside sprite at one height per view (front/S, side/E, back/N) with the silhouette overlap
pixelforge character author [NAME] -p <folder> [--painting P.png] [--sentence "..."] [--rounds 3] [--target 0.85] [--note "..."] [--dry-run] --json   # THE CHARACTER LOOP: Claude Code hand-authors the model against the painting in rounds (the author contract, below)
pixelforge shapes validate FILE                                            # problems in plain words, or a summary (mode, shapes, materials, bones, unbound shapes); then the warnings: the traps a valid file can carry (keep.back, a full ring below the knee, a hanging part on a limb without upright_from, a centre in the wrong number of dimensions)
pixelforge shapes still FILE -o out.png [--frame 40] [--direction SE] [--passes] [--game-objects art/objects/objects.json --name chest --hr 2]
pixelforge shapes object FILE -o art/objects/chest [--directions S,SE,E] [--game-objects art/objects/objects.json]   # trimmed PNGs with foot anchors + <name>.json
pixelforge shapes preview FILE --clip walk --direction E [--style gothic_hd] [-o walk_E.gif]   # a looping GIF of one clip and direction
pixelforge shapes sheet FILE -o sheet.png [--clips idle,walk] [--directions S,E] [--columns 8]   # a contact sheet, a row per clip and direction
pixelforge shapes turntable FILE -o turn.gif                               # a solid file spinning through 48 views, plus its 8 game views
pixelforge shapes render FILE -o frames [--style gothic_hd] [--clips idle,walk,run,attack,cast,hit,death] [--directions S,SE,...] [--passes] [--gif]   # --gif: a GIF per clip and direction, cropped to the clip
pixelforge shapes joints [--fps 24]                                        # re-export assets/animations/joints.json.gz from the library (numpy, no Blender)

pixelforge project new <folder> --style gothic_hd
pixelforge project add <character> -p <folder>
pixelforge project import-shapes <character> FILE -p <folder>      # the character now renders from the file; the painting steps are skipped
pixelforge project render-shapes <character> -p <folder> [--style S] [--clips ...] [--directions ...] [--no-parts]   # frames/<clip>_<DIR>/frame_NNN.png (+ frame_NNN.parts.png) + animations.json + renders/manifest.json (with "parts")
pixelforge project run <character> shapes -p <folder>              # the same as a step; run-all runs it when the character has a shape file
pixelforge project export-game <character> --kind <kind> -p <folder> [--out <game>/art/sprites] [--skin-for <class>]   # the game's atlas with foot anchors, from those frames; into art/sprites it also writes the skins.json entry (the hero loader prefers a PixelForge set over <kind>_unclipped) and warns when the figure is not 195 px
pixelforge project preview-shapes <character> --clip idle --direction S -p <folder>
```

Every `--style` is a look preset: it gives the render scale (its `figure_height` over the file's `height`), the ramp
length (`shading_bands`; 0 keeps each ramp's own) and the outline rule (`none` / `auto` / hex); `--scale`, `--steps`,
`--outline`, `--elevation` override one at a time. `--frames` caps the frames per clip (default the preset's
`clip_frames`); the clip keeps its real duration, so the fps written for it is `24 * frames / clip frames`. A clip
that reaches past the file's canvas (the death lies down) gets a wider one; every frame of a set is padded to one
square with the ground at the bottom. The frames folder's `manifest.json` carries `elevation: 0` for the anchor maths
(the frames are already projected) and `view_elevation` for the camera the frames were seen from.

**Part ids.** Every rendered frame comes with `frame_NNN.parts.png` beside it (`shapes render`, `render-shapes`,
`render_shape_sprite`; `shapes still` writes `<stem>.parts.png`, `shapes turntable` a `<stem>_parts/` folder; all take
`--no-parts`): a paletted PNG whose pixel value is the part index, 0 = empty, palette entry i = grey level i with index 0
transparent (so a reader that expands the palette sees `r8 == index`, alpha 0 for empty); 16-bit greyscale only when a
file has 256 parts or more. The manifest carries the table under `"parts"`: `[{"index": 1, "name": "hat", "group":
"head", "material": "straw", "shapes": [0, 1]}, ...]`, one entry per named part (all its shapes) and one per shape
without a part (under the shape's name); `group` is the bone it rides, `"static"` when none. Outline pixels take the
part beside them; shadow and glow pixels are 0. `shapes.part_table(doc)` builds the table, `shape_tools.load_parts(png)`
reads a mask back, `Frame.parts` holds it in memory. The editor's carry matches by these masks (`"by": "part"`). API:
`api.import_shapes`, `api.render_shapes(project, name, preset, clips, directions, elevation, passes, parts=True)`,
`api.preview_shapes`, `api.validate_shapes`, `api.draft_shapes`; file-level tools in `pixelforge.shape_tools`
(`render_set`, `gif_of`, `contact_sheet`, `turntable`, `still`, `export_object`, `add_game_object`, `validate_file`,
`template_file`). MCP: `render_shape_sprite`, `preview_shape_sprite`, `shape_sheet`, `shape_object`,
`validate_shapes`, `shape_template`, `import_shapes`, `render_shapes`.

**The old automatic road, kept as a reference tool.** `pixelforge character from-picture PICTURE -p <folder> --json`
was what the Characters bench ran when a picture was dropped (2026-10-05, track/picture-road); the owner's verdict was
that the hand-authored Hemomancer read as the character and the measured draft read as a mass ("Claude hand drawing
was better"), so the bench runs the author loop now (below) and this command, with `shapes measure` and `shapes
sample-materials`, is retired behind `PIXELFORGE_OLD_ROADS=1` (see "Retired roads"); `shapes measure` and `shapes
sample-materials` stay for an assistant that wants the numbers or the sampled ramps to check its eye against. It read the
picture (several files are the views in order: front, side, back), tells a single figure from a turnaround sheet (two
or more figures of about one height side by side; `sheet.split_sheet`, falling back to one figure when the pieces are
a body and a held thing), cuts the figure(s) out into RGBA cutouts under `characters/<name>/source/` (`front.png`,
`side.png`, `back.png`, and the picture itself as `picture.<ext>` or `sheet.<ext>`), measures them
(`shapes/<name>.measure.json`), drafts a humanoid from the picture's words sized by the measurements (the name and the
sentence come from `--name` / `--text`, else from the file's name: Midjourney writes the prompt into it, and the
account name and the download id are dropped; a hem as wide as the hips to the ground adds "in a long robe" when no
skirt word is there), samples the front view's colours into the materials, validates (problems stop the road as a
plain `error`; warnings are returned), imports the model into the project as a character
(`characters/<name>/shapes/<name>.shapes.json`) and draws `previews/still_S.png` (the game's height, with `anchor` and
`lights` for the bench) and `previews/compare.png`. It prints `PF_PROGRESS step=picture what=<words_with_underscores>
done=N total=8` as it goes (`reading_the_picture`, `cutting_the_figure`, `measuring`, `drafting`, `drafting_17_shapes`,
`sampling_materials`, `checking`, `importing`, `drawing`, `done`). The result: `character`, `model`, `still`, `compare`,
`measure`, `cutouts` (view -> file), `kind` (`single` / `sheet` / `files`), `views`, `sentence`, `read` (what the draft
understood), `shapes`, `materials` (the ramps it sampled), `warnings` (plain words: a front view only, a robe added, a
material with too few pixels under it, a validator warning, an existing character drafted again), `overlap` (view ->
silhouette intersection over union) and `judgement`, one honest line from the overlaps ("Silhouette overlap front
0.71: the right mass; the details want a hand"; >= 0.78 close, >= 0.62 the right mass, >= 0.45 a rough start, below
that check the cutout). Deterministic (the k-means is seeded) and a few seconds on a front view: the Keeper's front
(`assets/styles/keeper_front.png`, 228 x 400) gives 17 shapes and 0.71 in about 2 s headless, 4 s inside the app.
`character measure|sample|compare <name> -p <folder>` runs one step again on the saved cutouts (measure re-sizes the
draft's named shapes in the model as it is now; sample re-colours; compare only draws). API: `picture_road.from_picture`,
`picture_road.redo`; MCP: `character_from_picture(picture, project, name, style, text)` (several files joined with
`;`), `character_redo(project, character, step)`. Tests: `tests/test_picture_road.py`. The app walkthrough:
`forge/tools/picture_road.sh OUT` (drops the Keeper's front on Home under xvfb, ends with the model on the bench, the
compare picture and the browser; `docs/screens/forgeapp/picture_road_*.png`).

**Painting to shapes, by hand (the road).** Cut the sheet into views (a transparent PNG per view, or plain-background
views; the Hemomancer's are `docs/concepts/hemomancer/test1/front.png`, `side.png`, `back.png`), `shapes measure` them
into a measurements file and read the landmarks (head, shoulders, chest, waist, hips, hem, limb widths as fractions of
the height) while you write the file around the author pose, `shapes sample-materials FRONT.png --model x.shapes.json`
for its colours (the model is rendered over the front view at one height; every render pixel knows its shape and so
its material, and the painting's pixels under each material become its ramp), then `shapes compare x.shapes.json --ref
SHEET.png -o cmp.png` after every round: painting and sprite side by side per view, feet on one line, with the
silhouette overlap (the Hemomancer's committed file scores about 0.7 per view). A sheet whose figures stand on a
painted floor splits as one figure: give `compare` the cleaned sheet (the views on paper) or the views one by one.
Measure, sample and compare are tools you use while building by hand; nothing they make is ever shown as a result.

**The parts kit** (`pixelforge/shape_parts.py`): the costume pieces the Hemomancer needed, as functions returning
shape lists in the 120-unit author pose, so the next character calls them instead of writing 170 entries: `chain(name,
points)` (links alternating face-on / edge-on), `chain_loop`, `chest_chain`, `rivet_row(y=|dy=, every, z_from)` (a rule),
`spike_ring` and `upright_spikes` (a crown, with small-size twins), `spike_row`, `plank_skirt(name, cx, belt_y, degs)` +
`plank_skirt_parts()` (the front planks ride each thigh with `upright_from` the hips, the back planks the hips),
`greave(side, cx)` (a riveted plate, a knee cop, the spike rows) and `thigh_plate`, `shackle(side, cx)` (with a broken
chain), `locs(name, cx)` + `locs_parts()` (strands following the mantle), `back_cape(...)` + `cape_parts()`. Their
default materials (`locs chain rustiron plank`) are in the library. Call them from your generator script. The worked example is
`docs/concepts/hemomancer/shapes/make_hemomancer_shapes.py` (the whole Hemomancer from the kit plus its body, face,
crimson and shield; `tests/test_character_road.py` checks it regenerates the committed file).

### The author contract: `pixelforge character author` (pixelforge/author_loop.py, prompts_author.py)

The character road of the Forge from 2026-10-05 (track/refine): a painting (or a sentence) is handed to Claude Code,
which hand-authors the shape model the way the Hemomancer was made, and the loop renders, compares and scores each
round. The Characters bench runs it for every painting dropped or chosen and for every sentence on its Claude line.

**The loop.** `author(name, project, painting=, sentence=, rounds=, target=0.85, note=, progress=)`:
the painting is copied *untouched* to `characters/<name>/source/painting.<ext>` (the reference: never cut, measured or
converted by the loop; `compare` and `measure_views` read it on the fly); then per round N: the brief + the round's
message go to `claude_bridge.run("author", ...)` with `--tools Read,Write,Edit,Bash` and `--allowedTools
mcp__pixelforge,Read,Write(//<shapes>/**),Edit(//<shapes>/**),Bash(python *),Bash(python3 *),Bash(py *)`
(`author_tools`: writing and running only inside `characters/<name>/shapes/`); Claude leaves
`shapes/make_<name>_shapes.py` and `shapes/<name>.shapes.json`; the loop validates the file, renders `still_S/E/N.png`
and `compare.png` (silhouette intersection over union per view; the mean is the round's score), copies the script and
the model into `characters/<name>/author/round_N/` with `round.json` (score, views, focus, notes, did, seconds, cost,
log), adopts the model as the character's, and keeps the best round's still and compare in `previews/` for the bench.
Stops: the score reaches `target`; or two rounds running bring no better score; or the rounds are used up (3 with a
painting, 1 without: nothing to score against). An existing character carries on from its next round number (the
bench's **Another round**, with `--note`). `author/author.json` is the summary. Progress: `progress(words, round, done,
total)`; the CLI prints `PF_PROGRESS step=author round=N done=D total=T note=<words with + for spaces>` for the round's
start, every tool Claude calls ("round 2 · writing make_x_shapes.py") and the score line ("round 2 · front 0.81 · the
shoulder plates", the `focus` from Claude's ending JSON). Result: `character`, `model`, `painting`, `views`, `rounds`
(the records), `best`, `score`, `overlap`, `target`, `stopped` ("target reached" / "no improvement in two rounds" /
"rounds done" / "claude stopped"), `judgement`, `still`, `compare`, `summary`, `seconds`; `ok` false with `error` when
no round left a valid model (Claude not found / not signed in / stopped). `--dry-run` returns the command, the brief
and the round text without calling Claude. MCP: `character_author(name, project, painting, sentence, rounds, target,
note)`. The mock (`PIXELFORGE_CLAUDE=mock:tests/claude_mock/author.jsonl`, `author_generator.py`) writes a fixed
generator per round that scores 0.50, 0.64, 0.69 against the Keeper's front; `author_flat.jsonl` never improves.
Tests: `tests/test_author.py`. The walkthrough: `forge/tools/author_walk.txt`; the acceptance:
`forge/tools/acceptance.sh OUT` (the mock through author, idle and walk in eight directions, export into a scratch copy
of the game, a headless game shot with the skin, the bench walkthrough, the no-Claude state; `errors 0`).

**The brief** (`prompts_author.system_prompt`, the most important text of the road; read it before changing anything
about the loop): who the authoring Claude is and where it works; THE METHOD (a generator script that emits the file,
with loops for the repeated pieces and the parts kit; round 1 from the painting: the author pose first, name the costume
top to bottom, body then garments then kit then face and details, run, validate, three stills, compare, look, fix
silhouette first; rounds 2 and 3 from the compare picture; the owner's standard, "Claude hand drawing was better";
measure and sample as reference only); THE WORKED EXAMPLE (the Hemomancer generator excerpted: materials, the face
rules, the two sides in one loop, the narrow tabard and cape, the plank skirt, greaves, shackles, chest chain, the
spec; what each of its rounds changed); THE PARTS KIT (every function with its arguments, the library materials, the
shape kinds and the rule language in short); THE TRAPS (`keep.back` reads backwards: `back_strip`; `upright_from` for
a part hung on a limb; a full ring below the knee hides the legs; `prism` takes a 2D centre; gaps open in a bend;
speckle is noise, blood and wear are stains; 120 units author, 195 px render; the face at 195 px; z in front of the
hair and cloth; a seeded random; the clip map); WHAT READS AT 195 PX (silhouette, then three or four material regions
in contrast, then one or two details; one unit is 1.6 px; thresholds; how to read the compare picture row by row and
what to do about each difference; do not chase the number past what the eye agrees with); the game's rules and the
banned words; CONDUCT (the folder, the tools, no questions, one round, British spelling, no model names, the JSON
ending with `did`, `changed`, `notes`, `focus`). `round_text` is the message per round: round 1 draws; later rounds
get the last round's overlap per view, its compare picture and stills, Claude's own notes, and the person's note.

**When you ARE the authoring Claude** (a session started by `character author`): the brief is the whole method; follow
it in order. Read the painting and the author pose before writing a line. Write the generator script (a materials
table, `S = []`, `add(**k)`, loops for the sides and the repeated pieces, `K.<piece>(...)` from the kit, `json.dump`
at the end, `--out` from argv) in the shapes folder named in the brief, run it with Python, `validate_shapes`,
`shape_still` S / E / N into the round folder, `compare_shapes` against the painting, Read the pictures, fix what they
show (silhouette first), run again, and end with the one JSON line. Never write outside the shapes folder; never
render the whole set; never touch the painting; never set the file's height to 195 or render with another style; put
`focus` in the ending (three to six words: what the round worked on) because it is what the person reads on the state
line. On a later round, read the compare picture before changing anything and do what the person's note says first.
The real round made on this box (a monk from a sentence) took 58 s and followed exactly this order.

### The procedure for an AI

1. `pixelforge shapes template --height 120 --png tpl.png` (a file is authored at one height, 120 units, and rendered
   at any; a character renders at the game's hero height, the `godmarrow` preset's 195 px, whenever no `--style` or
   `--scale` is given, and `export-game` warns when a set's figure height is not the game's for its category). Read the bone table: every bone's head and tail in file units, y down, x across, z
   toward the viewer, the figure facing you, its left hand on +x. The ground line and the body axis are in the table.
2. Write the file around those bones (a Python generator script in the character's folder is the habit; `shapes
   sample-materials` for the colours): a shape per body part
   bound to its bone, garments as rings that `hang`, details as rules. Use the material library by name or add your
   own ramps. Leave no gap between shapes in the author pose (a waist between the chest and the belt): a bend or a
   fall opens it.
3. `pixelforge shapes validate FILE`, then `shapes still FILE -o f.png --direction S` and `--direction E` to judge the
   figure, `shapes preview FILE --clip walk --direction E` to judge the motion, `--clip attack` and `--clip death`
   to find parts that detach. Fix what reads wrong: silhouette first (the hat, the shoulders, the hem), then
   materials, then details. With a painting: `shapes compare FILE --ref sheet.png -o cmp.png` (below).
4. `pixelforge shapes render FILE -o frames` (the `godmarrow` size) or, in a project, `project import-shapes` +
   `project render-shapes` + `project export-game --kind <kind>` (each with `-p <folder>`); copy the atlas into the
   game's `art/sprites/` and look with `pixelforge game-preview --skin <kind> --shot shot.png` (it imports the project's assets first,
   which takes minutes on a fresh checkout and seconds after; on a box without a display it runs the game under
   `xvfb-run` with the OpenGL driver by itself; a Godot run that overruns its time limit ends in a plain error).
5. An object: `shapes still` for one view, `shapes object` for the game's `objects.json` (a trimmed PNG per direction
   with the foot anchor under the body axis; `hr` 2 is the game's texels per world px).

What to check before saying it is done: every direction is a full figure (nothing collapses or flips); every frame
is one piece (count opaque islands of 12 px or more with the shadow off: one, in idle, walk, run, attack and death);
the frames the game plays do not boil (at the preset's frame count, 24 for `gothic_hd`, the fraction of the figure's
own pixels that change between consecutive idle frames is under 0.12 and the fraction that change and change
straight back under 0.03: the Keeper's are 0.04 and 0.004 facing S, 0.09 and 0.002 facing E; and the hat rows of one
frame are a whole-pixel shifted copy of the frame before, in the idle exactly, in the walk with under 0.10 of their
pixels left over after the shift: the Keeper's 0.01-0.03); the lowest foot pixel is on one row in every walk and idle
frame in all eight directions (the ground lock holds the planted foot on the screen's ground line; in a run the
airborne frames lift and never sink) and the shadow never moves; loose parts swing after the body (hems and veils
move a frame or two after the hips) and never leave it (a hem swings at most a tenth of its height); the eyes show
under the brim at 120 px; at the small size the figure still reads as a silhouette (hat, shoulders, hem) and its
`px` variants carry the detail it can afford (thicker cords, bigger hands, no specks). `tests/test_shapes.py` and
`tests/test_e2e_shapes.py` check all of this on the Keeper and on a drafted file; `pixelforge shapes preview` at the
preset's frame count is what to look at.

### The file

```json
{
  "name": "keeper", "mode": "solid",
  "size": [138, 138], "height": 120, "ground": 134, "axis": [69, 0],
  "view": {"elevation": 12}, "outline": "#0a080c",
  "skeleton": {"height": 120, "ground": 134, "cx": 69},
  "materials": {"straw": {"ramp": ["#15100c", "#241b13", "#35291c", "#473826", "#594832", "#6b5a40"], "texture": "grain", "texture_strength": 0.5}},
  "parts": {"hat": {"bone": "head", "lag": {"frames": 1, "sway": 0.12}}, "yoke": {"bone": "hips", "lag": {"frames": 1, "sway": 0.4}, "hang": 0.6},
            "skirt": {"bone": "hips", "lag": {"frames": 2, "sway": 0.8}, "hang": 0.25}},
  "shapes": [ ... ],
  "effects": [ ... ], "lights": [ ... ], "shadow": {"radii": [22, 4.2], "colour": "#4b4a4f"}
}
```

- `size` is the canvas in file units; `height` the figure's height (the preset's figure height divides it to get the
  render scale; for an object it is its size in texels); `ground` the y of the ground line; `axis` the body axis (x, z)
  the rings and the turn use; `view.elevation` the camera's degrees above level (0 = the page's straight-on view; the
  game's Keeper uses 12, the objects 30, the game's camera); `view.turn_step` (degrees, 5) and `view.move_step`
  (pixels, 1.5) are the holds of the rig (below), rarely changed.
- `materials`: a ramp per name, shadow first, any length (2..8 steps; the page used 5, the 3D page 5-7, the preset's
  `shading_bands` resamples them). Options: `emissive` (its steps are picked by rule, never by light), `spec` (metal:
  the brightest step only for near-direct light; `spec_t` the threshold, 0.88), `texture` (`weave fur scratch grain`)
  with `texture_strength`, `lift`. A ramp may alias a library material: `{"ramp": "iron", "spec_t": 0.5}`. The library
  (`assets/shapes/materials.json`, `pixelforge shapes validate` lists what a file uses): `robe sash cape tunic mantle
  bone skin gold wood leather iron soul` (the page's five-step ramps), `cloth cape6 tabard iron7 fur bone6 gold6
  leather5 wood5 crimson` (the 3D page's), `straw violet wrap lacquer rope gourd rag shadowskin steel` (the Keeper's),
  emissives `soul ember miasma frost`.
- `outline`: the file's near-black; the preset's rule decides whether it is drawn (`auto`), skipped (`none`) or
  replaced (a hex).
- `parts`: named groups of shapes (a shape names its `part`; the shapes of a part are one body and move as one)
  with the `bone` they ride, an optional `lag` (`{"frames": n, "sway": s, "max": 0.1}`: the part swings about its top
  so that its hem lands where the bone's pose n frames ago, the bone's velocity times s and the clip's travel would
  drag it, never further than `max` of the part's height, fading out while the bone is still) and an optional
  `hang` (1 = rigid with the bone; 0.25 = takes the bone's position and turn but a quarter of its tilt, pivoting
  where the part attaches, so a skirt hangs from the hips instead of swinging with the pelvis; the damping fades as
  the body lies down; by default "lying down" is judged by the part's own bone, and `"upright_from": "hips"` judges it by
  another bone instead, so plates hung on a thigh keep hanging when the knee comes up instead of locking to the thigh:
  the Hemomancer's plank skirt, `planks_L` / `planks_R` on `thigh.L` / `thigh.R`). A shape may carry `bone`, `lag`,
  `hang` and `upright_from` itself instead. `keep` on a ring: `{"back_strip": w}` keeps a strip down the back of
  half-width w radians (a cape; 0.72 is the Hemomancer's), `{"front": a}` the front within a radians (a tabard). The
  old `{"back": a}` still works but reads backwards (it keeps `|angle| > a`, a wedge cut out of the FRONT; the
  Hemomancer's cape wrapped round the legs with it) and `shapes validate` says so, with the `back_strip` to write.
- `lights`: `{"at": [x, y, z], "radius": 30, "strength": 1.0, "pulse": 0.2, "colour": "#7dff78"}`; with `"bone"` or
  `"prim"` the point rides that bone or shape; `{"from": "flicker", "radius": 3.2, "strength": 0.7, "every": 3}` puts a
  small light on every third glowing-crack pixel. Flat files use `[x, y]` and may add `"breathe": true` and `"rim": true`.
- `shadow`: `{"radii": [rx, ry], "colour": "#4b4a4f"}`, a checkerboard ellipse on the ground under the axis (or `"at"`);
  `null` for an object.
- `clips`: a per-model clip map, game clip to library clip: `{"attack": "punch"}` plays the library's planted
  forward thrust as this model's attack (the stock `attack` is a wide kicking lunge; `jab` is the left-hand thrust;
  the Hemomancer uses `punch`). The frames folder and the game's anim keep the game's name; `shapes validate` rejects
  a map to a clip the library lacks.
- `effects` (emissive sprites stamped last, never shaded): `flame` (`height`, `width`, `fall`, `flicker`,
  `sway_from`), `orb` (`radius`, `grow`, `period`), `pixels` (`points`, `step` or `steps` + `pulse`), `runes`
  (stitches flowing down a robe opening: `x`, `y`, `count`, `dy`, `spread`, `period`, `lit`, `speed`), `motes`
  (`rate`, `spread`, `vy`, `life`, `seed`: replayed from frame 0 with a fixed seed, so a frame always looks the same).
  Position: `"at": [x, y]` (flat) or `[x, y, z]` (solid), `"bone"`/`"prim"` + `"at"` to ride a part, or `"anchor"`
  naming an entry of the file's `"anchors"`.

**Solid shapes** (`kind`): `ellipsoid` (`centre`, `radii`), `capsule` (`a`, `b`, `r` as a number or `[ra, rb]`),
`box` (`centre`, `half`, `round`), `prism` (an ellipse in x/y extruded along z: `centre`, `radii`, `z`), `ring` (an
elliptical tube around the axis: `y` [top, bottom], `rx` and `rz` as a number or `[r0, growth per unit down]`,
`thickness` for a shell, `hem` `{"tongues", "depth", "seed"}` for a ragged hem, `open` `{"angle", "below"}` for an
open front, `keep` `{"back_strip": w}` or `{"front": a}` to keep one side (the old `{"back": a}` is deprecated), `holes` `{"p", "band", "seed"}`, `cz`), `union`
(`of`: a list of shapes, each checked like a shape). Any shape takes `clip_y` [top, bottom] (+ `hem`), `rotate`
`{"x", "y", "z", "about"}` in degrees, `carve: true` (empties what it covers in every body; the hood's face opening,
a skull's sockets), `material`, `t` (a tone offset), `lift`, `spec_t`, `emit` (`flicker` for cracks, `pulse` for
eyes, `steady` for an orb, `soft`), `flat` (a fixed colour), `bump` (`{"folds": [amp, k, seed]}`, `{"fur": true}`,
`{"ridges": [amp, period]}`), `bone` or `part`, `lag`, `hang`, `px` `[lo, hi]` (the figure heights in pixels, lo
included and hi not, at which the shape exists; null = open: the size variants, a cord 0.7 wide at `[90, null]` and
its 1.3-wide twin at `[null, 90]`, fingers at the large size only), and `rules`: a list of `{conditions..., sets...}`
evaluated per voxel in order (later rules win; a rule with `px` applies at those sizes only, so specks and rivets
can be kept for the large size). Conditions: `x y z` ranges `[lo, hi]` (null = open), `dx dy dz` from
the shape's centre, `angle [a0, a1]` / `abs_angle` around the axis (0 = front, +pi/2 = the character's left, pi =
back), `front a` / `back a` (within a radians of straight ahead / behind), `every_y [period, which]` (`floor(y) %
period == which`, lames and bandage lines; `every_x`, `every_z`, `every_angle [n, which]` for alternating tongues),
`near [[[x, y, z], ...], r]` (within a box of half-size r of any point; null skips an axis; rivets, eyes, sockets),
`hem_band [d0, d1]` (units above a ring's hem: stitching), `hash [p, seed, cell]` (a scattered fraction of specks
`cell` units big, default a third; 2 holds still under motion: scratches, wear), `crack {"x", "amp", "k", "w"}` (a
wiggly vertical line), `bitmap {"rows": ["0111110", ...], "y", "by": "angle"|"x", "x", "spread", "scale"}` (a sigil),
`ellipse_xy {"centre", "radii"}`, `where_cut d` (the trim of an open front). Sets: `material`, `t`, `emit`, `rivet:
true` (a highlight pixel with a shadow pixel below), `flat`, `lift`, `spec_t`.

**Flat shapes**: `poly` (`points`), `ellipse` (`centre`, `radii`), `dot` (`at`, `step`) and `dots` (`at`: `[x, y]` or
`[x, y, step]`), with `material`, `base` (the ramp step a flat area gets, 2 of 5), `gx` / `gy` (the gradient, default
-0.9 / -0.6), `fold [p, w]` (a stripe every w px, slanted by p), `contour: false` to skip the contour rule, `flat` for
a fixed colour (the face cavity). A point is `[x, y]` or `[x, y, i]` (its y waves with index i) and a points list may
hold `{"hem": [xa, xb, y, seed, deep]}`, which expands to a ragged hem whose alternate points wave. Shapes may
`breathe` (sink by the file's `animation.breathe` amount for half its period), take `dx` / `dy` as a number or
`{"wave": [i, amp]}`, name a `part` (for the flat rig) and list `views` to appear in.

**Animation rules.** Animation means frames. In a solid file the frames come from the motion clips: every shape with
a `bone` (or a `part` naming one) takes the rigid motion that carries that bone from the author pose to the clip's
pose, its tilt damped by `hang` for things that hang; a part with `lag` swings rigidly about its top so that its hem
follows late, dragged by the bone's velocity and, in a walk or run, by the clip's travel (the clips are in place), so
hems, veils, cords and hats swing after the body, by at most a tenth of their height and not at all while the bone
rests. The frames are pixel art, so the rig draws them the way a hand would: a body's drawn turn holds until the
clip's is `turn_step` degrees (5) away from it and then takes the clip's turn exactly (a slow bone holds its pose and
steps; a fast one is exact), and a body's drawn place is a whole number of screen pixels from its author-pose place,
held until the clip has moved it `move_step` (1.5 px) and then rounded (every shape of a bone takes the bone's move, so
a hat, its head and the eye light move as one block). The renderer snaps every body the same way, so a part that
has not moved is pixel for pixel the frame before, and nothing boils between frames. The lowest foot pixel is held
on the screen's ground line in the standing clips: a foot within 6 units (at 120 px) of the clip's own floor is
planted and pulled onto the line, higher is a jump and the figure lifts. Bones:
`hips spine.001 spine.002 spine.003 neck head shoulder.L upper_arm.L forearm.L hand.L thigh.L shin.L foot.L toe.L`
and the `.R` side. Clips the game uses: `idle walk run attack cast hit death` (also `sprint punch jab hit_head
attack_idle cast_idle cast_enter roll crouch crouch_walk jump torch_idle talk interact pickup dance walk_hunched`;
`pixelforge shapes joints` lists the 24). A flat file animates by its own rules (waves, breath, pulses, flows, motes)
and, with `parts` (a pivot and a bone each; a part with a `parent` and no bone follows the parent's bone `lag`
frames late, turning by `follow` of its angle), by the projected bones in the picture plane; the back views mirror
the front unless shapes list `views`. The flat path's motion is the fast path for things without depth; characters
are solid.

### The worked example: the necromancer

The flat file is the page's shape list, one entry per `paint()` call, in the page's order (the cape first, the hand
holding the staff last), so the contours fall where the page's did:

```json
{"name": "cape", "kind": "poly", "material": "cape", "fold": [0.12, 5], "part": "cape",
 "points": [[34, 38], [59, 38], [64, 60], [70, 92], {"hem": [70, 24, 93, 5, 3]}, [28, 60]]},
{"name": "tunic", "kind": "poly", "material": "tunic", "gy": -0.3, "fold": [0.05, 4], "part": "robe",
 "points": [[44, 44], [50, 44], [54, 87], [52, 91, 1], [49, 88], [46, 92, 4], [43, 88], [40, 90, 7], [41, 70]]},
{"name": "face_void", "kind": "ellipse", "flat": "#050307", "breathe": true, "part": "head", "centre": [49.8, 24.8], "radii": [4.1, 5.6]},
{"name": "skull", "kind": "poly", "material": "bone", "gx": -1.2, "contour": false, "breathe": true, "part": "head", "points": [...]},
...
"effects": [{"kind": "pixels", "material": "soul", "points": [[48, 23], [51, 23]], "pulse": 0.3, "steps": [4, 3], "breathe": true},
            {"kind": "runes", "material": "soul", "x": [44, 50], "y": 48, "count": 13, "dy": 3, "spread": 0.08, "period": 5, "lit": 2, "speed": 2},
            {"kind": "orb", "material": "soul", "at": [30, 73], "radius": 1, "grow": 1, "period": 3, "breathe": true},
            {"kind": "flame", "material": "soul", "at": [69, 8], "height": 7, "width": 3, "fall": 2, "flicker": 1.4}],
"lights": [{"at": [69, 6], "radius": 22, "strength": 0.75, "pulse": 0.15, "colour": "#6fe86a"}, ...],
"shadow": {"at": [46, 95], "radii": [30, 4.2], "colour": "#3c3b40"}
```

The solid file is the page's v13 model, shape for shape. The open coat is a ring shell with a wedge cut from the
front, gold trim where the opening ends, a crimson sash in an angle band and gold stitching above the ragged hem:

```json
{"name": "coat", "kind": "ring", "y": [46, 111], "rx": [10.5, 0.16], "rz": [8, 0.1], "thickness": 2.2,
 "hem": {"tongues": 16, "depth": 6, "seed": 2}, "open": {"angle": 0.36, "below": 48}, "material": "cloth",
 "bump": {"folds": [0.4, 8, 0.4]}, "bone": "spine.001", "lag": {"frames": 2, "sway": 0.6},
 "rules": [{"where_cut": 0.09, "y": [48, null], "material": "gold6"},
           {"where_cut": 0.09, "y": [48, null], "every_y": [4, 0], "material": "gold6", "t": 1},
           {"angle": [-0.8, -0.52], "y": [75, 110], "material": "crimson"},
           {"hem_band": [1.8, 3], "every_angle": [34, 0], "material": "gold6", "t": -2}]}
```

The breastplate is an ellipsoid with lames, a ridge, rivets and glowing cracks (`"material": "soul", "emit":
"flicker"` along `crack` lines, lit by the `{"from": "flicker"}` light); the hood is a `union` of an ellipsoid and a
capsule with a `prism` `carve` for the face and a `flat` void behind it; the cape keeps only its back (`keep.back_strip`),
has holes near the hem and a gold skull `bitmap` by angle; the staff fire is a `flame` effect at `[85.5, 12, 4]`, the
soul orb an emissive ellipsoid with `"emit": "steady"`. The Keeper (`assets/shapes/characters/keeper.shapes.json`,
58 shapes) is the same language around the 120 px author pose: a weathered straw cone as a shell ring tilted back
(`rotate`) with a plain brim and faint ridges, a wrapped head with dark sockets and `pulse` eyes in two radii, a
shawl ring open at the front and a veil ring kept to the back, lacquered pauldrons, bracers and tassets, rope
capsules across the chest, a waist capsule, a rope belt with gourd ellipsoids, a tattered outer skirt ending above
the ankles and split at the front over a violet underskirt, wrapped shins and feet; `parts` give the hat its lag and
the veil, cords, gourds, tassets and skirts their `hang` and lag. The objects (`assets/shapes/objects/`) are the same
shapes without bones: a chest of rounded boxes with `every_x` iron bands, `rivet` rows and a brass lock, a skull with
`carve` sockets and `flat` voids and `every_x` teeth, a dead tree of capsules with `every_angle` bark grooves and a
`crack`.

### What is still short

The proof images are in `docs/screens/shapes/` (dated 2026-10-02): the flat parity strip, the solid necromancer beside
the page's turn, the Keeper at 120 and 76 px in idle and walk from all eight directions and attack / cast / run / hit
/ death from two, before-and-after strips of the idle, the walk and the attack (the previous build's frames beside
these), the head at 5x over eight exported frames, the painting beside the converted painting and the sprite at one
height, the objects, the in-game shot. Judged honestly: the Keeper reads as the Keeper at 120 px (the wide weathered
straw hat with the eyes burning in its shadow, lamed pauldrons, cords, belt and gourds, the yoke and tassets over the
split tattered skirt, wrapped shins and sandalled feet) and holds together through every clip in every direction;
the frames are still between poses (the idle changes 3-10% of its pixels a frame at the game's 24 frames in every direction, almost all
of it the eyes' pulse and a 1 px breath; the hat rows of a walk frame are a shifted copy of the frame before) and
the motion is the clips' (a weighty walk, the hat on the head through the attack, the hems swinging a frame late).
Against the necromancer page she is still a figure written by rules rather than by hand: broader, with fewer
accents, and her held poses step by 5 degrees and 1.5 px where a hand would choose each frame. At 76 px she reads as
hat, shoulders, cords, gourds and hem; the `px` variants give her thicker cords and bigger hands there, and the
fingers, specks and rivets are left to the large size. The clips are in place, so a walk's travel is faked as a
backward swing of loose parts; secondary motion is kinematic (a held swing), not simulated. The hanging rule is a
tilt damping, not cloth: a fallen body's skirt lies along the legs (the damping fades with the tilt) but never
crumples.

## The effects engine (pixelforge/effects): the graph format, the nodes, the commands

`pixelforge.effects` draws effects from graphs of pure NumPy nodes. `render_effect(name, out_dir, levers=, palette=,
bands=, seed=, frames=, fps=, gif=)` renders a library effect to `<out_dir>/<name>.png|json` (+ GIF) in the `vfx`
layout the add-on and SheetFx read; `render_graph(graph, name, out_dir, ...)` renders any graph; `list_effects()` /
`library_table()` give the library; `node_table()` every op. Deterministic per seed (each node's dice are the seed and
the node id hashed together); eight frames at 64x64 take well under a second; every colour on a sheet is a step of a
ramp in the graph and nothing else (the tests check it); alpha is hard unless a node asks for a glow.

**A graph** is JSON:

```json
{"size": [48, 64], "frames": 8, "fps": 12, "seed": 1, "loop": true, "anchor": [24, 60],
 "levers": {"size": 1.0, "heat": 1.0},
 "nodes": [{"id": "body", "op": "flame_body", "width": "0.55 * $size", "licks": 2.5},
           {"id": "ramp", "op": "ramp", "colours": "fire", "bands": 6},
           {"id": "img",  "op": "paint", "field": "@body", "ramp": "@ramp", "cut": 0.12, "gamma": "2.0 / $heat"}],
 "out": "@img"}
```

Nodes evaluate in list order, each once. A parameter that is a string starting with `@` is another node's output (it
must come earlier); one containing `$` is arithmetic over the levers (`+ - * / **`, `min max abs int round sqrt clamp`,
nothing else); anything else is passed as it is. Values between nodes are a **field** (float32 (T, H, W) in 0..1), a
**vector field** ((T, H, W, 2) in pixels), an **image** (uint8 (T, H, W, 4)), a **ramp** (a LUT) or a **bundle** (the
emitter's dict of fields: `v` coverage, `age`, `height`, `dist`, `speed`). `out` names the graph's result; a bare field
renders grey so a half-built graph still shows. Library entries (`effects/library.py`) add `name`, `family`, `doc` and
`levers` as `{default, min, max, label}` (two or three per effect; that is the editor's library format).

**Nodes** (`pixelforge effects nodes --json` lists them with parameters and one-line docs; 80 ops):

- sources: `perlin` `simplex` `ridged` `value_noise` (tileable in space and time; `cells`, `tcells` beats per loop,
  `octaves`, `stretch` > 1 for tall cells), `cellular` (f1 | f2f1 | id), `flow` (curl noise, divergence free, vectors),
  `blue` (blue-noise dots), `scroll` / `scroll_vectors`, `emitter` (particles with life curves for size and speed,
  `gravity`, `drag`, `turbulence` from a flow field, `spin`, `trail` as streaks, `ground` with `bounce` or `stick`, `sub`
  emitters born at death or landing, `burst`; a bundle), `take` (one field of a bundle), `flame_body` (the house flame),
  `bolt` (the arc's jagged path), `threads`, `eyes`, `mouths`.
- shapes: `circle` `ring` `line` `polygon` `text` `gradient` `radial` `radial_vectors` `constant`.
- shaping: `erode` `dilate` `warp` (along a vector field) `displace_by` `threshold` `licks` `mask_height` `mask_age`
  `outline` `inner_glow` `shadow` `pixel_blur` `blur` `posterize`.
- maths and time: `mul` `add` `sub` `max` `min` `invert` `gain` (`inside` keeps a lift within the lit area) `pulse`
  (sine | saw | saw_down | flicker) `time_shift` `hold_frames` `shift` `flip` `reverse` `after` `wipe` `alpha_of`
  `lightness_of`.
- colour: `ramp` (a palette name or hex list, `bands`, `reverse`, `shift`, `lift`), `paint` (field or bundle -> image;
  `by` age | height | dist | speed, `reverse_by`, `cut`, `gamma`, `dither`), `palette_lock` (OKLab nearest), `palette_cycle`,
  `dither`, `tint`, `darken`, `displacement_map` (R, G offsets, alpha the strength: haze and bell-ring ship this way).
- composition: `layers` (blends normal add screen multiply subtract behind lighten darken mask erase, opacities),
  `blend`, `transform`, `depth_stack`, `sprite_stack`, `fracture` (Voronoi shards), `path_scatter`, `mirror`,
  `polar_mirror`, `picture` (a PNG or strip from disk), `effect` (a whole library effect as a layer, at its own size,
  with `levers`, `dx dy scale angle flip_x start palette`; an old vfx kind name works), `empty`, `echo`.
- sims: `smoke` (density carried by a flow field), `rope` (verlet chain), `cloth` (a flag).

Palettes: `effects.PALETTES` (wisp lantern fire soul_fire phosphorus miasma bone marrow smoke ash blood frost amber iron
silver poison holy paper rain water white black unlight arc saber spark ooze mouth), dark to bright.

**The shim** (`effects/compat.py`): `make_vfx(kind, name, out_dir, ...)` with `vfx.make_vfx`'s signature, `render_spell`
/ `export_spell` / `new_spell` with `spell`'s, and `spell_graph(spell)` (a spell file as a graph of `effect` layers).
`KIND_MAP` says which effect an old kind means (fire -> flame, wisp -> soul_wisps, bolt -> arc, bone_spear -> saber
in bone ...); `effects render <old kind>` and the `effect` node accept the old words. `pixelforge.vfx` and
`pixelforge.spell` themselves are unchanged.

**Tests**: `tests/test_effects.py` (every node family; every library effect renders, stays in its ramps, is
deterministic, keeps its timing, moves under its first lever, and renders in under 2.5 s; the graph errors; the shim
over every old kind and spell preset; the CLI verbs). GIFs for judging: `docs/screens/effects/<name>.gif`.

## Godmarrow specifics (the game this forge serves)

- Project style `godmarrow` (`pixelforge project set --style godmarrow`): ~195 px standing height, **every colour kept** (no palette reduction), the dark 1 px edge, crisp sampling. Use it for every game character; the other looks exist to compare and for other games.
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

1. `project status -p <folder> --json`. Read `characters.<name>.next` and `done`.
2. The painting is the reference: the person drops it on the Characters bench or names it. `shapes measure` its
   views; `shapes compare` is your judge from now on.
3. Author the model by hand (section "Shape sprites"): a generator script in the character's folder writes
   `<name>.shapes.json` around the author pose; `shapes validate`, `shapes still` front/side/back, `shapes compare`
   against the painting, edit, three rounds or until the overlap is at the Hemomancer's level (about 0.7).
4. `shapes detail <file> --stock`, then paint what the stock detail misses (the Detail bench, or `--part NAME --from
   PNG`); `shapes sample-materials` for the painting's colours.
5. `project build <name> -p <folder> [--game <game>]`: import, render every clip in 8 directions with detail, light
   and ink, export the atlas, write `skins.json`, check the height (a hero is 195 px). Rendering prints `PF_PROGRESS`
   lines; run it in the background and check back. `--dry-run` lists the steps.
6. Show the person the compare picture and the frames; fix pixels in the editor (carry propagates by part); build again.

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

## The Forge app (tools/pixelforge/forge): what it is to an assistant

The person's face of PixelForge is a Godot 4.7 project at `tools/pixelforge/forge/` (full screen, an ornate pixel
frame, a picture window above and a text box with tabs, levers and choices below; the approved brief is the game
repository's `docs/mockups/forge_app_v8.html`). **It never reimplements the pipeline**: every action is one CLI
command run as `python -u -c "<boot>" <pixelforge root> <command> ... --json` in a thread
(`forge/scripts/backend.gd`), its output read line by line (the `PF_PROGRESS` lines drive the progress bar;
everything lands in the log drawer, Ctrl+L) and the last JSON object printed is the result. A
`{"ok": false, "error": ...}` is shown as one plain line. So the project folder the app works on is the same one you
work on, and a character's model file is the same `.shapes.json` you edit by hand.

Start it: `pixelforge forge [--project P] [--screen S] [--windowed]` (`pixelforge/forge_launch.py` finds Godot with
`game_preview.find_godot`, fetches it into `tools/godot` when there is none, and passes `--python=<this interpreter>`
and `--game=<the game>` to the app), or `PixelForge.bat` (which pulls the latest version first). The game is
`forge_launch.game_dir()`: `PIXELFORGE_GAME`, else the nearest `project.godot` above `tools/pixelforge` (the
repository root); never the Forge's own folder, which has a `project.godot` too (the app's `backend.gd` refuses it as
well: a project named PixelForge is not the game). What the app runs, per bench:

| bench | commands |
|---|---|
| Characters | a picture dropped or chosen, on Home or on the bench, is the reference beside the model (`--painting`; the automatic picture road is retired, its choices and lines are off the bench unless `PIXELFORGE_OLD_ROADS=1`) · `Compare` shows `previews/compare.png` · `Open in editor` renders idle and opens the editor · `project new` (first use) · `project add <name>` · `project import-shapes <name> <file>` (a dropped or chosen `.shapes.json`, copied into `characters/<name>/shapes/`) · `shapes still <model> -o previews/still_<dir>.png --direction D --style S --zoom 1` (the standing picture; `--json` gives the foot anchor and the lights) · `shapes render <model> -o previews/frames --clips C --directions D --style S` (one clip for the Motion and Frames tabs) · `project render-shapes <name> --style S` (Render all) · `project export-game <name> --kind K --name N --out <dir>` (Export sheets; Put it in the game uses `--out <game>/art/sprites`) · `game-preview --import` · `game-preview --skin K [--shot]` · `project reset <name>` (Start over) · the Frames tab's *Edit* (the editor below, on `previews/frames` or `frames/`) · `prompt --describe ... --kind sheet_px` (Copy prompt). Every lever writes the model file (`doc`): solid offsets and scales, materials, ramps (OK-HSL hue / lightness / contrast / steps over the imported ramp), lights, the glow effects, `parts.*.lag`, `view.turn_step / move_step / elevation`. |
| Creatures | under construction: the same bench, the humanoid skeleton; `assets/shapes/necromancer_3d.shapes.json` as the example |
| Objects | the model copied into `objects/<name>/` · `shapes still <model> --frame F --direction D` · `shapes object <model> -o <dir> --name N --directions S[,...] --style S --hr 2 [--game-objects <game>/art/objects/objects.json]` · `game-preview --place N` |
| Effects | `effects list --json` (the table the tabs are built from) · `effects render <effect> -o <project>/fx --as <name> --lever k=v ... --seed N [--palette P --bands B --frames F --fps X]` (Effect, Looks) · Layers: the stack written to `<project>/fx/<name>.graph.json` (one `effect` node per layer under a `layers` node) and `effects graph <file> -o fx --as <name>` · `effect <painting> <name> -o fx --kind loop` (a dropped painting) · into the game with `-o <game>/art/fx` · `game-preview --fx <name>` |
| Tiles and ground | `tiles <texture> <name> -o <project>/tiles --variants --seed --style S [--second --colors --tile W H]`, then `-o <game>/art/tiles` |
| Interface | `ui9 <panel> <name> -o ui --mid M` · `icons <flatlay> -o items --cell C --scale K` · `portrait <front> <name> -o portraits --head H --sizes 48 96`, then the game's folders |
| Sound | `sfx <pad> -o <project>/sfx --set freq_mul= decay_mul= crush= lowpass= wave= --seed N`; Keep: `-o <game>/art/sfx` · `sfx all` |
| Music | `music list` (the table) · `music load <piece> -o <project>/music/current.song.json` · every control: `music edit <song> --op <json>` · every sound: `music play-bar <song> --pattern P --bar B` / `--section S` / `music render <song> --name preview` · Compose: `music compose -o <song> --genre G --mood M --seed N --bars 32` · Keep: `music export <song> -o <game>/audio/music --name <name> --format ogg` |
| Describe it | `describe "<words>" --json`: `what` picks the bench (`shapes` → Characters with the words as the description, no draft, `spell` → Effects, `music` → Music, `prompt` → the bench that will take the painting); `benches` with two or more names starts a job instead (`job start "<words>" -p <project> [--game G]`; Home's Jobs panel then runs `job list`, `job approve ID --run`, `job resume ID`, `job cancel ID`, and Report opens `--job_report=<report.json>` on the job's bench) |
| Settings | `doctor --json`, `project set --style S`, `project set --blender PATH`, `project blender-download` |

After new files land in the game the app runs `game-preview --import` (a headless `godot --import` pass) so the game's
loaders see them.

**Under construction** (said on the bench itself): Creatures (no beast rig); the painting road (cutouts, Blender,
Mixamo) and the full editors stay in the classic Studio (`pixelforge studio --classic`; plain `pixelforge studio` updates and opens the Forge).

**Test hooks (after `--`):** `--screen=NAME` opens a screen directly (home, characters, creatures, objects, effects,
tiles, interface, sound, music, settings) with `--tab=NAME`, `--model=FILE` (a shape model onto the bench),
`--painting=FILE` (a reference beside the model), `--pictures=A;B` (down the retired picture road; only with `PIXELFORGE_OLD_ROADS=1`), `--env=dungeon|crypt|moor|fen|snow|plain`, `--light=0|1|2`, `--advanced`; `--project=PATH` and
`--game=PATH` choose the folders, `--python=` the interpreter; `--shot=PATH --shot_t=S [--shot_n=N]` saves the
window after S seconds and quits; `--windowed`, `--nosound`, `--nomusic`, `--reduced`, `--log[=S]`.
`--script=FILE` drives a whole walkthrough, one line per step (`forge/scripts/driver.gd` lists them: `go SCREEN
k=v`, `tab NAME`, `drop FILE[;FILE]`, `choose LABEL`, `set CONTROL VALUE`, `key ...`, `waitjob [S]`, `shot PATH`,
`dumplog`, `quit`); this is how the Characters bench is verified end to end (drop the Keeper, Render all, Export
sheets), and how the Claude line is (`forge/tools/describe_walk*.txt` with the mock, `screens.sh`'s `describe_*`). `forge/tools/screens.sh OUT [WxH]` shoots every screen and prints `name | errors N`; `godot --headless --path
tools/pixelforge/forge --script res://tools/test_editor.gd` runs the editor's own checks (palette lock, fill, wand,
undo/redo, clone offset, carry by frame index, anchors, the command line). Under xvfb:

```
timeout 600 xvfb-run -a -s "-screen 0 1280x720x24" godot --path tools/pixelforge/forge --rendering-driver opengl3 \
  --resolution 1280x720 -- --nosound --project=/tmp/forge_project --python=python \
  --screen=characters --model=assets/shapes/characters/keeper.shapes.json --tab=Motion --shot=/tmp/motion.png --shot_t=12
godot --headless --path tools/pixelforge/forge --script res://tools/check_scripts.gd    # every script parses
```

`game-preview --shot` and `--wait` give the game 180 s (`--timeout S`, or `PIXELFORGE_GAME_TIMEOUT`); past that the
result is a plain `{"ok": false, "error": "The game took more than 3 minutes..."}`, not a traceback, and the app shows
it as a line. The game's own hooks it uses: `--skin`, `--fx`, `--place=a,b` (the Forge's objects stood beside the
hero), `--shot`.

The app's own files: `forge/scripts/theme.gd` (the look), `px.gd` (the pixel-drawn frame, controls and cursor),
`widgets.gd` (levers, wheels, pulls, choices, tabs, cards, the timeline), `scene.gd` (the picture window and its
grounds), `backend.gd` (the CLI runner), `app.gd` (the shell, the selector, the dissolve, the log drawer), `screen.gd`
(the base of every bench: tabs, racks, undo, Reset, Start over), `screens/*.gd` (one per bench), `driver.gd` (the
walkthrough). No `.import` files and no `class_name`: everything loads from plain files, so the folder runs without
an editor pass.

### The editor's commands (the same functions a person clicks)

The pixel editor (`forge/scripts/screens/editor.gd`, with the plain classes under `forge/scripts/editor/`: palette,
pixels, document, history, carry, anchors) is opened by the Frames tab's *Edit*, by *Edit* on the Effects / Tiles /
Interface export tabs, or directly: `--screen=editor --frames=<root> --clip=idle --direction=S [--frame=N]
[--reference=PAINTING] [--name=keeper]`, `--screen=editor --image=FILE`, or `--screen=editor --model=FILE
[--directions=S,E,N]` (renders the model's idle frames into the project's previews first). Every command below is one
driver line `edit <command>` (`--script=FILE`), one entry of a JSON command file (`edits FILE` in a script, or
`--edits=FILE` on the command line: `["tool brush", "stroke 4 4 9 4"]` or `[{"cmd": "stroke", "args": [4, 4, 9, 4]}]`),
and in code `exec_line("...")`. Each prints `EDIT {json}` with `"ok"` and what it did. Points are frame pixels, frames
are 1-based.

| command | what |
|---|---|
| `info` | the open set: root, key, frame, size, tool, colour, lock, the palette (hex), selection count, layers, history, anchors, unsaved |
| `tool NAME` | pencil, brush, eraser, fill, line, rect, ellipse, wand, lasso, select, move, clone, eyedropper, hand |
| `colour #hex` / `colour SLOT` | the colour; while `lock locked` an off-palette colour is snapped (the result says `snapped` and the slot); `lock open` adds it (`added`) |
| `size N` · `tolerance 0..1` · `global on|off` · `filled on|off` · `lock locked|open` | the brush size, the wand / fill tolerance (OKLab), global fill, filled shapes, the palette lock |
| `frame N` · `direction D` · `clip NAME` | which frame the tools work on |
| `stroke x y [x y ...]` | paint along the points with the tool (pencil, brush, eraser, clone); line / rect / ellipse use the first and last point |
| `fill x y [global]` | the fill at a point |
| `select rect x y w h [add|sub]` · `select wand x y [tol] [add|sub]` · `select lasso x y x y x y ... [add|sub]` · `select all|none|invert` | the selection (every tool then works inside it) |
| `clear` · `move dx dy [copy]` · `mirror` · `flip` | clear, nudge (or copy) the selection; mirror left-right or flip top-bottom (the selection, else the frame) |
| `clone_source x y [frame N] [direction D] [clip C]` | the clone stamp's source point, on this or another frame; the offset is fixed by the next stroke |
| `undo` · `redo` · `history [N]` | the history; `history` lists it, `history N` leaves exactly N entries applied (0 = as opened) |
| `carry clip|directions|all` | carry the last change on this frame; the result lists `landed` (key, frame, count) and `by` (part or position) |
| `layer` · `layer add NAME` · `layer merge` · `layer delete` · `layer pick NAME` · `layer visible NAME on|off` · `layer opacity NAME 0..1` · `layer lock NAME on|off` | the layers of this frame |
| `onion on|off` · `reference FILE|off` · `reference dim 0..1` | the onion skin and the reference overlay |
| `anchor` · `anchor add EFFECT x y` · `anchor move ID x y` · `anchor scale ID k` · `anchor rotate ID deg` · `anchor direction ID all|S|E...` · `anchor lever ID NAME v` · `anchor remove ID` · `bake` | the effect anchors (`anchors.json` in the frame root); bake writes `<name>.anchors.json` beside the export and an `effects` key into the export's JSON |
| `zoom N` · `pan x y` · `fit` | the canvas (no effect headless) |
| `pixel x y` | the pixel's hex, palette slot, OKLab, part id (-1 without part masks) |
| `save` | flatten the visible layers into the frame files (and `.layers/` for the paint layer), save the anchors |

Frame data the editor writes: `<root>/<clip>_<DIR>/frame_NNN.png` (on save), `<root>/.layers/<clip>_<DIR>/frame_NNN.paint.png`,
`<root>/anchors.json`. It reads `<root>/<clip>_<DIR>/frame_NNN.parts.png` as part-id masks (the shape road writes them
by default; see "Part ids" under shape sprites), so carry reports `"by": "part"`; without them carry and anchors fall
back to position and the result says `"by": "position"`.

## MCP server

`pixelforge mcp` runs an MCP server (stdio) with tools `new_project`, `status`,
`configure`, `list_styles`, `set_style`, `style_demo`, `add_character`, `prompts`, `import_image`, `run_step`, `run_all`,
`quick_sprite`, the shape-sprite tools `render_shape_sprite`, `preview_shape_sprite`, `shape_sheet`, `shape_object`,
`validate_shapes`, `shape_template`, `draft_shapes`, `import_shapes`, `render_shapes`, the effects engine's `render_effect` and
`list_effects` (and the tool-by-tool ones named above: `make_effect`, `make_tiles`, `make_spell`, ...). Claude Desktop config:

```json
{"mcpServers": {"pixelforge": {"command": "pixelforge", "args": ["mcp"]}}}
```

## Claude on the bench (pixelforge/claude_bridge.py)

Every Forge bench has a describe line that hands one sentence to the **Claude Code CLI** (`claude`), which works through
this package's MCP server on the same project. The bridge is `pixelforge/claude_bridge.py`; the CLI verbs:

| verb | what |
|---|---|
| `pixelforge describe --bench characters|creatures|objects|effects|tiles|interface|music|sound -p <project> "words" [--context JSON] [--timeout S] [--dry-run] --json` | one job on a bench: snapshot, `claude -p`, progress lines, the result (below) |
| `pixelforge claude status [--json]` | `{"ok", "state": ready | not_found | not_signed_in, "sentence", "exe", "version", "registered"}` (the title line's words) |
| `pixelforge claude register [--python P]` | `claude mcp add -s user pixelforge -- <python> -m pixelforge.cli mcp`, idempotent (`claude mcp get pixelforge` first); `install.bat` and the Forge's first launch call it |
| `pixelforge claude doctor [-p P] [--timeout S] [--no-round-trip] [--json]` | why the describe line does nothing: six checks in order (`DOCTOR_STEPS`: the executable and version; signed in, not an API key alone; registered, registering on the spot; the MCP server started over stdio and answering `list_styles`; a real round trip, `describe --bench music "set tempo 80"` on a scratch project whose song file must change, with the log path; Chrome, optional), each `{"step", "ok", "optional", "words", "fix"}`, plus `lines` (one a check) and `sentence` (the first failed step and its fix); exit 1 when a required step fails. Home's **Doctor** choice and the title line's *doctor* (when Claude is not ready) run it and show the lines |
| `pixelforge claude log [-p P] [--lines N]` | the last job's log (`<project>/claude/logs/<stamp>_<bench>.jsonl`: the command, every stream event, the stderr tail) |
| `pixelforge claude undo <manifest>` | put a run's snapshot back (the bench's Undo): the snapshot's files restored, files made since under the bench's roots removed |
| `pixelforge midjourney fetch --prompt "..." | --kind K --describe "..." [--image clay.png] -o DIR -p P [--pick best|all] [--timeout 900] [--dry-run] --json` | Claude in Chrome paints it on midjourney.com and downloads the picks into DIR (below) |
| `pixelforge midjourney prompt --kind K --describe "..."` | the prompt a fetch would use: the character kinds of prompts.py, `turnaround` (world_prompts' object sheet), `props9` (a sheet of nine) |

**The command the bridge builds** (`build_command`): `claude -p --output-format stream-json --verbose --mcp-config
<project>/claude/mcp_config.json --tools Read --allowedTools mcp__pixelforge,Read --permission-prompts none
--append-system-prompt <prompt> --add-dir <project> --strict-mcp-config --max-budget-usd 3 "<words>"`. The MCP config
names this interpreter (`sys.executable -m pixelforge.cli mcp`, `PYTHONPATH` = this package's parent), so the server
runs without an install. `--tools Read` strips every other built-in tool; `--allowedTools` pre-approves the server's
tools and Read; `--permission-prompts none` denies anything else (nothing can prompt in print mode); the budget is
`PIXELFORGE_CLAUDE_BUDGET` (dollars; `0` = no flag). The Midjourney step adds `--chrome` and `mcp__claude-in-chrome`
to the allowed tools and drops `--strict-mcp-config` (the extension's server must stay). The executable is found
through `PIXELFORGE_CLAUDE`, PATH, then the usual install places (`~/.local/bin`, `%APPDATA%\npm`,
`%LOCALAPPDATA%\Programs\claude`, ...). `PIXELFORGE_CLAUDE=mock:<script.jsonl>` swaps in the mock (below).

**The system prompt contract** (`system_prompt`): the bench and the project folder; what is on the bench
(`bench_sentence`: the model file, the character, the painting, the frames folder, the current song, the effect and
palette, the spell file, the texture, the picture, the pad, the look preset, the project's characters; the Forge sends
these as `--context`, the bridge fills the rest from `project.json` and the folder); the bench's tools (`BENCH_TOOLS`,
MCP names); the game's rules for art and words (`STYLE_RULES`) and the banned words (`BANNED_WORDS`, HANDOFF section 4);
the conduct ("a bench hand, not a chat": no questions back, one job, the fewest calls, nothing beyond the line, nothing
written by hand, British spelling); and the ending: one line of JSON, nothing after it:

```json
{"did": ["short past-tense sentences"], "changed": ["absolute paths of files made or changed"], "notes": "one or two plain sentences for the person"}
```

**The result** (`run` / `describe --bench --json`): `{"ok", "did", "changed", "notes", "summary", "log", "snapshot",
"progress", "seconds", "cost_usd", "detected"}`. `changed` is the summary's list united with what the bridge saw change
on disk (`file_state` before and after, `claude/` skipped); `snapshot` is the undo manifest; for Characters and Objects
the describe verb adds `model_file`, `about` and `prompts` (prompts.py's set, or `turnaround` + `props9`) with
`prompt_titles`. On failure `{"ok": false, "error": "<one sentence>"}`: *Claude Code was not found...*, *not signed
in...*, *did not finish within N s; it was stopped*, *stopped at the spending limit*, *Chrome is not connected...*,
*Midjourney asked for a sign-in or a check*. While it runs, the verb prints `PF_PROGRESS step=claude done=N total=0
note=<words with + for spaces>` on stderr for every tool call (`tool_words`: `draft_shapes` → *drafting the model*,
`edit_song` → one line per op, *setting tempo 76*; a Read → *reading current.song.json*; an unknown tool → its name
in words); the Forge shows them on the progress strip and the foot, and pulses the title line.

**The mock** (`tests/claude_mock/*.jsonl`, `mock_main`): a .jsonl of stream-json events, with control lines
`{"mock": "run", "args": [pixelforge words]}` (the CLI runs, so a bench really changes), `{"mock": "sleep",
"seconds": S}`, `{"mock": "exit", "code": N}`; `{project} {bench} {text} {slug} {pf_root}` are filled in. The bridge
runs it as a subprocess (`python -m pixelforge.claude_bridge mock ...`) through the same reader, so the stream, the
progress, the summary, the timeout and the snapshot are all exercised without the real CLI; `PIXELFORGE_MOCK_DELAY`
paces it. `tests/test_claude_bridge.py` and the Forge's sweep (`screens.sh`: `describe_characters`,
`describe_music`, from `forge/tools/describe_walk*.txt`) use it.

**When you ARE the Claude on the bench** (a session started by the describe line): the system prompt says the bench
and what is on it; believe it. Call `status` when you need the project's facts; use the bench's tools and no others;
one job, the fewest calls that do what the line says; do not render the whole set unless asked (render_shapes takes
a minute); never write a file by hand (Read is for looking); keep the sentence's words out of the banned list; end
with the JSON line and nothing after it, with every file you touched in `changed` by absolute path. A line you cannot
do with these tools: do nothing and say why in `notes`. On the Midjourney step: one prompt, one grid, the upscales,
the downloads into the folder given, stop; never pass a sign-in or a check, say so instead.

**The Forge's side** (`forge/scripts/screen.gd`): `add_describe_line` on every workbench; `_describe` snapshots the
rack's values, `push_undo`, runs `describe --bench <screen> -p <project> "<words>" --context <claude_context()>`;
`on_progress` handles `step=claude`; on success `state["claude_snapshot"]` is set, `on_claude_done(r)` (each bench
reloads what changed: Characters re-reads the model file or imports a new one and takes the prompts; Music re-reads
the song and rings the new notes; Effects takes a spell file or a strip; Tiles / Interface / Sound show the files),
then `rebuild` and `_highlight_changed` (levers whose value text changed are lit for 2.5 s). `undo()` on a state with
`claude_snapshot` runs `claude undo <manifest>` and `on_claude_undone()`; `redo()` refuses to re-run Claude.
`app.gd` runs `claude status` at launch (`claude_state`, the title label `claude_label()`), registers when needed,
and `set_claude_working(words)` drives the pulse. Driver: `type TEXT` on any bench feeds the Claude line.

**The Midjourney step on the owner's PC needs**: Chrome or Edge (not WSL) open; the Claude in Chrome extension
(1.0.36+) installed and signed in with the same Anthropic account as the CLI; Claude Code signed in with `/login`
(an API key or `setup-token` keeps Chrome integration off); midjourney.com signed in in that Chrome; one
`claude --chrome` session run by hand first (the one-time dialog, the site permission for midjourney.com). The bridge
reads the init event's `mcp_servers` for `claude-in-chrome` and stops with *Chrome is not connected...* when it is
missing. This step was built to the documented behaviour of `claude --chrome` and exercised only through the mock
here (no Chrome, no Midjourney in the cloud session).

## Tool adapters (pixelforge/tools): what we use instead of building

**The rule for every session: before building a step, check this table and `pixelforge tools status`. If a free tool
already does the work, use its adapter (or add one in the same shape) and tell the owner that the tool exists, found
or not, with its install sentence. Do not write a GIF encoder, a sprite-sheet packer, a tracker or a map editor.**

| tool | what it does for us | official download page | licence |
|---|---|---|---|
| Aseprite | hand edits of a frame set (open, draw, close; the frames come back), sprite sheets and batch exports from its command line, Lua scripts | https://www.aseprite.org/download/ (or Steam) | proprietary (paid binary; the source is free to build yourself) |
| LibreSprite | the free fork of Aseprite 1.x: hand edits of frames, the same command line for sheets and exports (its scripts are JavaScript) | https://libresprite.github.io/#!/downloads | GPL-2.0 |
| Pixelorama | a free pixel editor for hand edits; no command line, so open-and-wait only | https://orama-interactive.itch.io/pixelorama | MIT |
| Furnace | a chiptune tracker: our songs exported as ProTracker .mod open in it; its command line renders a tracker file to WAV through real chip emulation | https://github.com/tildearrow/furnace/releases | GPL-2.0 |
| Blender | the 3D step of the old road (hull, rig, 8-direction renders) and any headless script | https://www.blender.org/download/ | GPL-2.0-or-later |
| ffmpeg | GIFs and MP4s of frame folders at whole-pixel zoom, WAV to OGG for the game, facts about a media file (ffprobe) | https://ffmpeg.org/download.html | LGPL-2.1-or-later (GPL builds exist) |
| ImageMagick | strips and contact sheets from frames, format conversions, whole-pixel scaling, identify (version 6 and 7) | https://imagemagick.org/script/download.php | ImageMagick License (Apache-2.0 compatible) |
| rembg | cut a painting's subject from its background before the cutout steps or a prop (it fetches its own model file, about 170 MB, on first use) | https://github.com/danielgatis/rembg (`pip install rembg[cli]`) | MIT |
| Tiled | map editing by hand; `--export-map` to JSON; a Tiled map as one plain layout JSON for the game (YATI imports .tmx/.tmj into Godot directly) | https://www.mapeditor.org/download.html | GPL-2.0-or-later (libtiled BSD) |
| LDtk | level editing by hand (no command line); a .ldtk level as one plain layout JSON for the game (godot-ldtk-importer imports it directly) | https://ldtk.io/download/ | MIT |
| Godot | the engine: the headless import of new art, the Forge's own checks, the game opened with a skin or an effect for a look or a screenshot | https://godotengine.org/download/ | MIT |
| Claude Code | the Claude on every bench and the planner of jobs (`pixelforge/claude_bridge.py`) | https://claude.com/claude-code | a paid plan (Anthropic's terms) |
| Mixamo | a website: auto-rigging and motion clips for the old road's FBX; the shape-sprite road needs none of it | https://www.mixamo.com/ | free with an Adobe account (Adobe's terms) |
| Midjourney | a website: the reference paintings, through Claude in Chrome or a copied prompt | https://www.midjourney.com/ | a paid subscription (Midjourney's terms) |

**The package.** One module per tool in `pixelforge/tools/`, all with the same face: `NAME TITLE WHAT HOME LICENCE
INSTALL`, `find()` (only what is installed: `PIXELFORGE_<NAME>`, PATH, the usual folders per platform; Blender and
Godot wrap `api.find_blender` and `game_preview.find_godot`), `version(exe)`, `run(action, **params)` (dispatch over
`ACTIONS`; a missing tool answers `{"ok": false, "missing": true, "error": <the install sentence>}`, never a traceback;
the actions in `OFFLINE_ACTIONS` run without the program: `status`, Furnace's `export_mod`, Tiled's and LDtk's
`to_godot`), `explain_missing()`. `tools.status()` is the honest list; `tools.run(name, action, params)` the one
entry; `tools.actions_of(mod)` the signatures in words. Two rules are kept on purpose and are the owner's own steps
on his machine: **nothing is downloaded or installed** (the Blender download under Settings is the one exception and
runs only when he asks for it), and **nothing runs detached**: a program opened for hand work (`_base.wait_for`) is a
child process that the adapter waits on and that ends with the Forge or the CLI.

| adapter | actions |
|---|---|
| `aseprite` | `open(frames_dir \| files, fps)` builds one .aseprite from the frames through a Lua import script (`import_script`), opens Aseprite and waits, then `-b --save-as frame_{frame000}.png` writes the frames back and `changed` names them · `build_sprite` · `sheet(frames, out_png, out_json, sheet_type)` (`--sheet --data --format json-array`) · `export(sprite, out_dir, stem)` · `script(lua, files, params)` (`--script-param k=v --script`) |
| `libresprite` | the same command line; `open` opens the frame files themselves (no Lua: its scripts are JavaScript) and names what was saved over · `sheet` · `export` |
| `pixelorama` | `open(frames_dir \| files)` only (open-and-wait; it has no batch command line) |
| `furnace` | `export_mod(song, out)` (offline: `music/mod_export.py`, a ProTracker .mod: lead+sparkle, counter+pad, bass, drums on four channels; looped single-cycle waves for the instruments, our own drum hits as PCM; MIDI 60 on C-2; velocity as Cxx, note ends as volume 0, the tempo as Fxx) · `open(song)` (export, open Furnace, wait) · `render(song_file, out_wav, loops)` (`furnace -output out.wav -loops N file`; a .song.json is exported first) |
| `blender` | `run_script(script, args, blend)` (`blender -b [blend] --python script -- args`; a bare name is looked up under `pixelforge/blender/`; the `PF_` lines come back as notes) |
| `ffmpeg` | `gif(frames_dir, out, fps, zoom)` (`palettegen=reserve_transparent=1`, `paletteuse=dither=none`, `scale=...:flags=neighbor`) · `video(frames_dir, out, fps, zoom)` (libx264, yuv420p) · `convert_audio(src, out, quality)` (OGG through libvorbis) · `info(file)` (ffprobe JSON) |
| `imagemagick` | `strip(frames \| files, out)` (`+append`) · `montage(frames, out, columns)` (`montage -tile Nx -geometry +0+0 -background none`) · `convert(src, out)` · `scale(src, out, factor)` (`-filter point -resize N%`) · `identify(file)`; `magick` (7) or `convert` / `montage` / `identify` (6) |
| `rembg` | `cutout(src, out, model)` (`rembg i -m u2net src out`; the `rembg` command or `python -m rembg` in this interpreter) |
| `tiled` | `open(file)` · `export(src, out, fmt)` (`tiled --export-map json in.tmx out.tmj`) · `to_godot(map_json, out)` (offline: `_maps.from_tiled`) |
| `ldtk` | `open(file)` · `to_godot(ldtk_file, out, level)` (offline: `_maps.from_ldtk`); its version is read from a .ldtk file (`appBuildId`), the program prints none |
| `godot` | `import(project)` · `run_script(project, script)` (`--headless --script res://...`) · `screenshot(game, out, skin, fx, zone, place)` (game_preview) |
| `mixamo`, `midjourney` | `status` only: websites; the install sentence says the browser road |

The plain map layout both map adapters write (`_maps.py`): `{"tool", "size": [w, h], "tile": [tw, th], "orientation",
"tilesets": [{"name", "firstgid", "image", "columns"}], "layers": [{"name", "kind": tiles | intgrid | auto, "size",
"cells": rows of ids (0 empty; Tiled gids with the flip bits stripped; LDtk tile ids + 1 over the intgrid value)}],
"objects": [{"name", "type", "x", "y", "width", "height", "layer", "properties"}]}`. For a full import into Godot, YATI
(Tiled) and godot-ldtk-importer (LDtk) are the free add-ons; this layout is for the Forge's own placement data.

**CLI and MCP.** `pixelforge tools status [--quick] [--json]` · `tools explain <tool>` · `tools run <tool> <action>
--params '{...}' --json`. On the MCP server every adapter is one tool, `tool_<name>(action, params)` (params a JSON
object), and `tools_status()` is the list; the tool's description names its actions and the official page.

## Jobs (pixelforge/jobs.py): one sentence into a plan of steps, carried out while the Forge watches

`pixelforge job start "a pale wisp effect, a hit sound and a short crypt tune" -p <project> [--approve steps|none]
[--plan FILE] [--game DIR] [--no-run] --json` · `job list` · `job status ID` · `job log ID [--lines N]` · `job approve
ID [--step S] [--run]` · `job cancel ID` · `job resume ID` · `job report ID`. The Forge's Home starts one when the
describe sentence names two or more benches (`describe` now returns `benches`, from `jobs.benches_in`).

**The plan** is JSON. Claude writes it through the bridge (`ask_plan`: `claude_bridge.run("job", ...)` with the
planner's system prompt, `plan_prompt`: the step kinds, the pipeline cheat-sheet (`PIPELINE_CHEATSHEET`), the tool
adapters found on this computer with their actions (`tools_sentence`; the missing ones are named so no step uses
them), the benches, the rules, the JSON ending; the mock `tests/claude_mock/plan.jsonl` stands in). Or it is given
with `--plan` (yours, by hand). `normalise_plan` fills ids and defaults and the `<project>` / `<game>` placeholders;
`validate_plan` refuses a plan without steps, a duplicate id, a kind outside `pipeline | tool | claude`, a pipeline
step without a command (or one that names `forge`, `studio`, `mcp`, `job`, `claude`), a tool step without `tool` and
`action`, a claude step without `bench` and `text`, and a banned word anywhere in a step.

```json
{"title": "a wisp, a hit and a crypt tune", "notes": "one sentence for the person, or empty",
 "steps": [
  {"id": "s1", "title": "a pale wisp effect", "kind": "pipeline", "command": ["vfx", "wisp", "pale_wisp", "-o", "<project>/fx", "--palette", "wisp"],
   "inputs": [], "outputs": ["<project>/fx/pale_wisp.png"], "check": {"exists": ["<project>/fx/pale_wisp.png"]}, "approve": false, "bench": "effects"},
  {"id": "s2", "title": "a gif of it", "kind": "tool", "tool": "ffmpeg", "action": "gif", "params": {"frames_dir": "<project>/fx/pale_wisp", "out": "<project>/fx/pale_wisp.gif"},
   "inputs": ["<project>/fx/pale_wisp.png"], "outputs": ["<project>/fx/pale_wisp.gif"], "check": {}, "approve": false, "bench": "effects"},
  {"id": "s3", "title": "slower, darker", "kind": "claude", "bench": "music", "text": "slower, 76 bpm, darker", "inputs": [], "outputs": [], "approve": false, "bench": "music"},
  {"id": "s4", "title": "render the tune", "kind": "pipeline", "command": ["music", "render", "<project>/music/current.song.json", "-o", "<project>/music", "--name", "crypt"],
   "inputs": ["<project>/music/current.song.json"], "outputs": ["<project>/music/crypt.wav"], "check": {"exists": ["<project>/music/crypt.wav"]}, "approve": true, "bench": "music"}]}
```

A step: `id`, `title` (short words the Forge shows), `kind`, its payload (`command`: the words after `pixelforge`,
`--json` added for you; or `tool` + `action` + `params`; or `bench` + `text` for the Claude of that bench through the
bridge), `inputs` (outputs of earlier steps it needs; a failed step's outputs make its dependants `skipped`), `outputs`
(files or folders it makes; they must exist afterwards), `check` (`{"exists": [paths]}` or `{"min_files": N, "in":
folder}`; a step whose command said ok but whose check fails has failed), `approve` (true pauses the job before the
step until `job approve`; `--approve none` turns every pause off), `bench` (where the report opens).

**The runner's contract** (`run_job`): an ordinary child process of whoever started it (the Forge's backend, a
terminal), never detached; it stops when its parent stops. On disk under `<project>/jobs/<id>/`: `plan.json`,
`state.json` (`state`: planned | running | waiting | done | failed | cancelled; `current`; the runner's `pid`; the
`cancel` flag; `approved`; per step `status` pending | running | done | failed | skipped, `attempts`, `error`,
`outputs`, `pictures`, `fixed`), `log.jsonl` (one event a line: planned, started, step, done, failed, skipped, fix,
retry, waiting, approved, resumed, cancelled), `steps/<id>/result_N.json` and `stdout_N.txt` per attempt (and the
strip PNG of a frames folder), `report.md` and `report.json`. Steps run in order; a done step is never run again. A
pipeline step is `python -m pixelforge.cli <words> --json` with the package on the path; its `PF_PROGRESS` lines
become the job's. A failed step is tried once more: `ask_fix` sends the step, the error and the command's last lines
to Claude with `fix_prompt` and takes back the corrected step (same id; `give_up` or no answer means the same step is
tried once more as it was), the plan file is updated and the report says *(fixed once)*; a second failure marks it
failed and skips what needed its outputs; the job ends `failed` with the rest done. A `cancel` flag written to
`state.json` by another process (`job cancel`) is honoured before the next step (the Forge also kills its own child).
`display_state` reads `running` with a dead pid as **interrupted**: `job list` marks it resumable, `job resume` carries
on from the first unfinished step (failed and skipped steps are tried again; approvals already given stay). Progress:
`PF_PROGRESS step=job id=<id> done=<i> total=<n> note=<words>` on stderr; the planning phase has an empty id.

**The report** (`write_report`, written at every stop): `report.json` = `{"title", "sentence", "state", "project",
"made": [{"step", "title", "bench", "files", "pictures", "fixed"}], "could_not": [{"step", "title", "bench", "why"}],
"pictures", "waiting", "notes", "bench"}`; `report.md` the same for people, with the pictures as relative links.
Pictures (`pictures_of`): PNG/GIF outputs, pictures a result names (`png`, `gif`, `files`, `changed`), and a strip of
the first eight frames of a frames folder. The Forge opens the report on `bench` (`--screen=<bench> --job_report=<report.json>`
works as a test hook too).

**When you ARE the planner** (a session started by `job start`): believe the system prompt's list of tools found;
plan nothing with a missing one (say so in `notes`); one thing per step; every step with its outputs and a check;
paths under `<project>`; `approve: true` for steps that write into the game, open a program, or render a whole
character; a short tune is 8 or 16 bars; end with the one line of JSON. **When you are the fixer**: change the least
that the error asks for, keep the id, or give up in one sentence.

**Verified here** (no Aseprite, Furnace, Tiled, LDtk or Blender on this machine; ffmpeg, ImageMagick, rembg and Godot
present): `tests/test_tool_adapters.py` (command construction and output parsing with mocks for every adapter, the
honest status, the .mod file read back, the map converters, the MCP registration, the CLI; ffmpeg and ImageMagick
also for real), `tests/test_jobs.py` (plan parsing and validation, the mock planner, order, the approval pause and
resume, the fix retry, the no-fix failure with skipped dependants, resume after an interruption, the cancel flag from
outside, tool and claude steps, the report, the CLI); the Forge's `jobs` walkthrough (`forge/tools/jobs_walk.txt`,
`screens.sh`: `docs/screens/forgeapp/jobs_running.png`, `jobs_waiting.png`, `jobs_rendering.png`, `jobs_done.png`,
`jobs_report.png`).

## Don'ts

- Don't edit `project.json` by hand while the app is open; use the commands.
- Don't put "pixel art" into prompts A/B (texture noise); do keep the same
  description sentence in every prompt.
- Don't re-run `render` for a tweak that `pixelate` can do (style, outline).
- Don't promise animation from Midjourney alone: frame-to-frame consistency
  needs the 3D path.
- Don't build what a free tool in the table above already does; check `pixelforge tools status` and the adapters
  first, and tell the owner when a tool exists.
- Don't download or install a program for the owner, and don't start a detached or background process; a job is a
  child process and its state on disk is how it survives a restart.

## The music editor (pixelforge/music): the song format, the verbs, the operations

The engine is the package `pixelforge/music/` (`song`, `theory`, `synth`, `render`, `compose`, `edit`, `library`,
`blips`, `measure`, `cues` (the game's 21 cues as library songs: `CUE_SONGS` maps `a<act>_town|wild|deep`, `boss<act>`
and `title` to a song by the place's mood; `make_music(cue|all|act, out_dir, fmt=...)` renders them under the cue's
name with `music.json`, `<out_dir>/cues.json` re-maps without code); `score` is the old generator behind
`PIXELFORGE_OLD_ROADS=1`; the old names still import from
`pixelforge.music`). The Forge app's Music bench and the CLI call the same functions; a song is one JSON file:

```json
{"title": "The Sunken Stair", "genre": "dungeon_synth", "mood": "dark", "seed": 11,
 "tempo": 72, "root": 1, "scale": "minor", "scale_lock": true,
 "lanes": {"lead": {"instrument": "flute_wood", "volume": 0.85, "tone": 0.5, "pan": 0.0, "mute": false, "solo": false}, "...": "counter pad bass sparkle drums"},
 "patterns": {"A": {"bars": 4, "chords": [0, 5, 2, 6], "notes": {"lead": [{"s": 0, "p": 61, "v": 0.8, "l": 4}], "drums": [{"s": 0, "p": 36, "v": 0.9, "l": 1}]}}},
 "sections": [{"name": "A", "pattern": "A", "repeat": 2, "transpose": 0}, {"name": "B", "pattern": "B", "repeat": 1, "transpose": 5}],
 "fx": {"rate": 32000, "bits": 14, "voices": 8, "crunch": 0.25, "echo": 0.3, "echo_beats": 1.5, "echo_feedback": 0.4, "echo_tone": 0.35, "reverb": 0.55, "reverb_size": 2.6, "master": 1.0}}
```

A bar is 16 steps (a step a sixteenth in 4/4). A note: `s` step inside the pattern, `p` MIDI pitch (a drum number
on the drums lane: 36 kick, 38 snare, 37 stick, 39 clap, 42 hat, 46 open hat, 41/45/48 toms, 49 crash, 51 ride),
`v` velocity 0..1, `l` length in steps, optional `o` offset (humanise). `root` is a pitch class (1 = C#); `key`
("C# minor") is accepted in a hand-written file. `chords` (scale degrees, one a bar) are what `generate_bar` and
`generate_lane` harmonise over. A section's `transpose` moves everything but the drums: that is a key change.
`scale_lock` governs edits (placing, transposing snap to the key), never the render.

**Verbs** (`pixelforge music <verb> ... --json`): `new <song> [--title --tempo --key --bars]`, `compose [-o <song>]
--genre --mood --key --tempo --bars --seed [--render]`, `render <song> [-o dir --name --format wav|ogg|both --no-loop
--lanes lead,bass]`, `play-bar <song> [--pattern P --bar B | --section S [--bar B] | --bars N] [-o dir --lanes --play]`
(writes `bar.wav`, reports `render_seconds` and `faster_than_real_time`), `export <song> -o <dir> --name N`, `edit
<song> --op ... [--ops-file f.json] [-o out.json] [--render-bar]`, `list [--genre]`, `load <piece> -o <song>`, `info
<song>`, `measure <audio>...`, `build-library`, `blips -o <dir>`. Genres: dungeon_synth, gothic_orchestral,
gothic_march (an organ-and-choir march, chromatic harmony, bells), barbarian_epic (low brass and timpani, a chanting
choir, a broad melody over a pedal), dark_acoustic (a repeated guitar figure over a drone, distant drums, no release),
ambient_dread (bass pulses, clustered pads, an alien choir, long silences), gothic_rock (harpsichord figures, a
sixteenth-note bass, baroque turns), chiptune, dark_ambient, battle, boss, tavern, town, title, victory, sorrow,
exploration, synthwave. Moods: dark, hopeful, tense, calm, heroic, sombre, playful, eerie. The same seed, genre,
mood, key and tempo always give the same piece. Library pieces carry a `theme`: `godmarrow` (the dark set) or
`general` (bright pieces for other games); `music list --theme godmarrow`.

**Operations** (`--op` as JSON or as words `name key=value ...`; the docstring of `music/edit.py` has the table): `set_note pattern lane step pitch [vel length] [free]`, `remove_note`, `set_velocity`, `set_length`,
`clear [lane] [bar|steps]`, `copy` (returns `clipboard`), `paste at clipboard`, `transpose semitones [in_scale] [bar]`,
`reverse`, `double`, `halve`, `humanise [amount seed]`, `quantise [grid]`, `set_lane lane [instrument volume tone pan
mute solo]`, `mute`, `solo`, `set_tempo`, `set_key key|root scale [snap]`, `scale_lock on`, `set_fx name value`,
`pattern_add [name bars copy_of add_section]`, `pattern_remove`, `pattern_rename`, `section_add pattern [name repeat
transpose at]`, `section_remove index`, `section_move index to`, `section_set index [pattern repeat transpose name]`,
`generate_bar pattern bar [seed lanes]`, `generate_lane pattern lane [seed]`, `title`. Unknown names, lanes, patterns
and out-of-range values come back as `{"ok": false, "error": "..."}` in plain words.

**Instruments** (`music list` → `instruments`, each with its family and words): strings_warm/dark/fast, cello,
brass_horn, brass_stab, trumpet, tuba, choir_ahh/ooh/men, bells_glass, bells_tubular, music_box, vibraphone, marimba,
celesta, organ_cathedral, organ_reed, piano_electric, harpsichord, harp, lute, guitar_steel, pizzicato, bass_synth,
bass_pick, bass_sub, bass_slap, lead_square, lead_pulse25, lead_pulse12, lead_saw, lead_tri, lead_sync, flute_wood,
flute_pan, ocarina, oboe, pad_dark, pad_glass, pad_dream, pad_synthwave, timpani, strings_ens (the looped chorused
ensemble), orch_hit, brass_low, choir_chant, choir_dark, choir_alien, organ_gothic, bells_chapel, guitar_nylon; kits
drums_rock/orch/chip/taiko/electro/brush/epic (the drums lane only). The chain is the SNES's: `fx.snes` (0..1, 0.7 by
default; the Tracks tab's SNES lever) band-limits every voice like a looped sample through the SPC's output filter,
adds grain and echo and caps the voices at eight; then `voices`, the lane mix, `crunch`, `bits`, the SPC-style echo,
a short hall, a limiter; `rate` 32000 by default.

**The Forge's theme** is `library/forge_home.song.json` (hand-written: C# minor at 66; a sub-bass drone, a chanting
male choir, a gothic organ and far timpani under a broad low-brass melody stated, stated again climbing, lifted a
minor third in the bridge; a bell or two a bar, low); `pixelforge music forge -o forge/assets/audio --format ogg`
renders the loops the app plays, `music blips` its interface sounds (forge_done is the music bench's cadence; no step
plays it). Measured against `docs/refs/forge_music_reference.mp3` (`music measure`): both C# minor; spectral
centroid 323 Hz against 310; RMS 0.076 against 0.127 (the game's loudness); the autocorrelation tempo reads 135 for a
piece written at 66 (the chant's 3+3+2 figure doubles it; the reference reads 103 with no beat at all).

**In the app:** `--screen=music [--tab=Tracks|Pattern|Song|Library|Export] [--song=FILE | --library=NAME]`; the bench
keeps `<project>/music/current.song.json` and runs `music edit` for every change and `music play-bar` for every sound
(`ONLY=music forge/tools/screens.sh OUT` shoots the five tabs). Tests: `tests/test_music.py`.

## Retired roads

Four roads made characters or props automatically and led to the blob the owner kept seeing. Their code stays in the
package, but nothing in the Forge app, this guide's procedure or the command line reaches them unless the environment
sets **`PIXELFORGE_OLD_ROADS=1`** (`pixelforge/old_roads.py`; the Forge honours the same variable): `pixelforge hero`
(the cutout road: split → palette → Blender model → Mixamo → renders → pixelate → export, with its `project run <name>
split|palette|model|rig|render|pixelate` steps and the Mixamo instructions), `prop3d` and `tiles3d` with the fetched
CC0 kits (`tools/make_props3d.py`), `shapes draft` and `character from-picture|measure|sample|compare` (the drafts: a
mannequin sized to a silhouette) with the describe line's shape drafts, and the old music generator (`music/score.py`:
`music <cue> --set ... --sheet ...`; the cues now come from the song library). Without the flag each entry point prints
one line that names the flag and stops; with `--json` it returns `{"ok": false, "error": ..., "retired": <road>}`.

