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

- **Shape sprites** (the character road since 2026-10-02, no painting, no Blender): you write a `.shapes.json`
  (shapes with materials, bound to bones), the renderer draws it as pixel art and the motion clips give every frame
  in 8 directions. See "Shape sprites" below; `pixelforge shapes --help`.

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
pixelforge project new <folder> [--name N] [--style godmarrow|gothic_hd|rendered_arpg|snes|handheld|indie|painterly]
pixelforge project status --json
pixelforge project set [--style S [--character C]] [--blender PATH] [--directions 8] [--render-size 256] [--godot-res-dir res://sprites]
pixelforge styles [--json]                       # the look presets and every number each fixes
pixelforge styles --demo OUT [--source front.png] [--only snes,indie] [--effect wisp]   # a GIF per look + contact sheet + styles.json

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
art that reads like hand-made work, and the rig (`pixelforge/shape_rig.py`) plays the 46 CC0 motion clips on it, so
the result is real frames per clip per direction with no painting, no Blender and no Mixamo. This is the character
road of the Forge from now on; the painting road stays for reference and for props. The worked example is the
necromancer of the reference page (`docs/refs/necromancer_shape_sprite.html` in the game repository): its flat file
`assets/shapes/necromancer.shapes.json` re-renders the page's PNG with 99.8% of the figure's pixels identical, and
its solid file `assets/shapes/necromancer_3d.shapes.json` is the page's 3D model (61 shapes) seen from any angle.

Two kinds of file share one set of shading rules:

- **flat** (`"mode": "flat"`): polygons, ellipses and dots in the picture plane, painted back to front with
  automatic form shading. For icons, effects and props without depth, and for anything that only needs a front view.
  The page's recipe exactly: a step up along the top-left edges, a step down along the bottom-right ones, a directional
  gradient across the shape's box with a half-step Bayer dither, contour pixels (touching an earlier shape) forced to the
  darkest step, optional fold stripes, a 1 px outline, emissive pixels last, point lights tinting lit pixels through a
  Bayer threshold, a dithered contact shadow.
- **solid** (`"mode": "solid"`): ellipsoids, capsules, boxes, rings and prisms as signed-distance shapes around a
  body axis. They are voxelised once; a two-voxel surface shell keeps each voxel's normal, material and tone; a frame
  rotates the shell to the wanted direction, z-buffers it and shades every pixel from one fixed light with the
  material's ramp (metal keeps its brightest step for near-direct light), draws contours where a neighbouring pixel
  belongs to another shape behind this one, the outline, the emissives, point lights using each pixel's real depth
  and normal, the shadow. All eight game directions are real views of one model; the pose comes from the clips.

### Commands

```
pixelforge shapes template [--height 120] [-o tpl.json] [--png tpl.png]   # the author pose: every bone's head and tail, to draw around
pixelforge shapes draft "a hooded necromancer with a bone staff and green glowing eyes" -o necro.shapes.json   # a starter humanoid from a sentence
pixelforge shapes validate FILE                                            # problems in plain words, or a summary (mode, shapes, materials, bones, unbound shapes)
pixelforge shapes still FILE -o out.png [--frame 40] [--direction SE] [--passes]      # one frame of the file's own animation rules (no clip)
pixelforge shapes preview FILE --clip walk --direction E [--style gothic_hd] [-o walk_E.gif]   # a looping GIF of one clip and direction
pixelforge shapes sheet FILE -o sheet.png [--clips idle,walk] [--directions S,E] [--columns 8]   # a contact sheet, a row per clip and direction
pixelforge shapes turntable FILE -o turn.gif                               # a solid file spinning through 48 views, plus its 8 game views
pixelforge shapes render FILE -o frames [--style gothic_hd] [--clips idle,walk,run,attack,cast,hit,death] [--directions S,SE,...] [--passes] [--gif]
pixelforge shapes joints [--fps 24]                                        # re-export assets/animations/joints.json.gz from the library (numpy, no Blender)

pixelforge project import-shapes <character> FILE        # the character now renders from the file; the painting steps are skipped
pixelforge project render-shapes <character> [--style S] [--clips ...] [--directions ...]   # frames/<clip>_<DIR>/frame_NNN.png + animations.json + renders/manifest.json
pixelforge project run <character> shapes                # the same as a step; run-all runs it when the character has a shape file
pixelforge project export-game <character> --kind <kind> # unchanged: the game's atlas with foot anchors, from those frames
pixelforge project preview-shapes <character> --clip idle --direction S
```

Every `--style` is a look preset: it gives the render scale (its `figure_height` over the file's `height`), the ramp
length (`shading_bands`; 0 keeps each ramp's own) and the outline rule (`none` / `auto` / hex); `--scale`, `--steps`,
`--outline`, `--elevation` override one at a time. `--frames` caps the frames per clip (default the preset's
`clip_frames`); the clip keeps its real duration, so the fps written for it is `24 * frames / clip frames`. API:
`api.import_shapes`, `api.render_shapes(project, name, preset, clips, directions, elevation, passes)`,
`api.preview_shapes`, `api.validate_shapes`, `api.draft_shapes`; file-level tools in `pixelforge.shape_tools`
(`render_set`, `gif_of`, `contact_sheet`, `turntable`, `still`, `validate_file`, `template_file`). MCP:
`render_shape_sprite`, `preview_shape_sprite`, `shape_sheet`, `validate_shapes`, `shape_template`, `draft_shapes`,
`import_shapes`, `render_shapes`.

### The procedure for an AI

1. `pixelforge shapes template --height 120 --png tpl.png` (120 for the gothic hi-res look; a file is authored at one
   height and rendered at any). Read the bone table: every bone's head and tail in file units, y down, x across, z
   toward the viewer, the figure facing you, its left hand on +x. The ground line and the body axis are in the table.
2. Write the file around those bones (or start from `shapes draft "<sentence>"` and edit): a shape per body part
   bound to its bone, garments as rings, details as rules. Use the material library by name or add your own ramps.
3. `pixelforge shapes validate FILE`, then `shapes still FILE -o f.png --direction S` and `--direction E` to judge the
   figure, `shapes preview FILE --clip walk --direction E` to judge the motion. Fix what reads wrong: silhouette first
   (the hat, the shoulders, the hem), then materials, then details.
4. `pixelforge shapes render FILE -o frames --style gothic_hd` or, in a project, `project import-shapes` +
   `project render-shapes` + `project export-game --kind <kind>`; copy the atlas into the game's `art/sprites/` and
   look with `pixelforge game-preview --skin <kind> --shot shot.png`.

What to check before saying it is done: every direction is a full figure (nothing collapses or flips), the idle does
not shimmer (the mean fraction of pixels that change between consecutive idle frames is under 0.08; the Keeper's is
0.03-0.05), the lowest opaque row is the same in every walk frame (the planted foot holds the ground), loose parts
trail the body (hems and veils move a frame or two after the hips), and at the small size the figure still reads as
a silhouette (hat, shoulders, hem) rather than as detail.

### The file

```json
{
  "name": "keeper", "mode": "solid",
  "size": [138, 138], "height": 120, "ground": 134, "axis": [69, 0],
  "view": {"elevation": 12}, "outline": "#0a080c",
  "skeleton": {"height": 120, "ground": 134, "cx": 69},
  "materials": {"mine": {"ramp": ["#1a1018", "#2b1b28", "#402a3b", "#573a51", "#6e4d68", "#86627f"], "texture": "weave", "texture_strength": 0.6}},
  "parts": {"hat": {"bone": "head", "lag": {"frames": 1, "sway": 0.35}}, "skirt": {"bone": "hips", "lag": {"frames": 2, "sway": 0.8}}},
  "shapes": [ ... ],
  "effects": [ ... ], "lights": [ ... ], "shadow": {"radii": [22, 4.2], "colour": "#4b4a4f"}
}
```

- `size` is the canvas in file units; `height` the figure's height (the preset's figure height divides it to get the
  render scale); `ground` the y of the ground line; `axis` the body axis (x, z) the rings and the turn use;
  `view.elevation` the camera's degrees above level (0 = the page's straight-on view; the game's Keeper uses 12).
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
- `lights`: `{"at": [x, y, z], "radius": 30, "strength": 1.0, "pulse": 0.2, "colour": "#7dff78"}`; with `"bone"` or
  `"prim"` the point rides that bone or shape; `{"from": "flicker", "radius": 3.2, "strength": 0.7, "every": 3}` puts a
  small light on every third glowing-crack pixel. Flat files use `[x, y]` and may add `"breathe": true` and `"rim": true`.
- `shadow`: `{"radii": [rx, ry], "colour": "#4b4a4f"}`, a checkerboard ellipse on the ground under the axis (or `"at"`).
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
open front, `keep` `{"back": a}` or `{"front": a}` to keep one side, `holes` `{"p", "band", "seed"}`, `cz`), `union`
(`of`: a list of shapes). Any shape takes `clip_y` [top, bottom] (+ `hem`), `rotate` `{"x", "y", "z", "about"}` in
degrees, `carve: true` (empties what it covers; the hood's face opening), `material`, `t` (a tone offset), `lift`,
`spec_t`, `emit` (`flicker` for cracks, `pulse` for eyes, `steady` for an orb, `soft`), `flat` (a fixed colour),
`bump` (`{"folds": [amp, k, seed]}`, `{"fur": true}`, `{"ridges": [amp, period]}`), `bone` or `part`, `lag`, and
`rules`: a list of `{conditions..., sets...}` evaluated per voxel in order (later rules win). Conditions: `x y z`
ranges `[lo, hi]` (null = open), `dx dy dz` from the shape's centre, `angle [a0, a1]` / `abs_angle` around the axis
(0 = front, +pi/2 = the character's left, pi = back), `front a` / `back a` (within a radians of straight ahead /
behind), `every_y [period, which]` (`floor(y) % period == which`, lames and bandage lines; `every_x`, `every_z`,
`every_angle [n, which]` for alternating tongues), `near [[[x, y, z], ...], r]` (within a box of half-size r of any
point; null skips an axis; rivets, eyes, sockets), `hem_band [d0, d1]` (units above a ring's hem: stitching),
`hash [p, seed]` (a scattered fraction: scratches, wear), `crack {"x", "amp", "k", "w"}` (a wiggly vertical line),
`bitmap {"rows": ["0111110", ...], "y", "by": "angle"|"x", "x", "spread", "scale"}` (a sigil), `ellipse_xy
{"centre", "radii"}`, `where_cut d` (the trim of an open front). Sets: `material`, `t`, `emit`, `rivet: true` (a
highlight pixel with a shadow pixel below), `flat`, `lift`, `spec_t`.

**Flat shapes**: `poly` (`points`), `ellipse` (`centre`, `radii`), `dot` (`at`, `step`) and `dots` (`at`: `[x, y]` or
`[x, y, step]`), with `material`, `base` (the ramp step a flat area gets, 2 of 5), `gx` / `gy` (the gradient, default
-0.9 / -0.6), `fold [p, w]` (a stripe every w px, slanted by p), `contour: false` to skip the contour rule, `flat` for
a fixed colour (the face cavity). A point is `[x, y]` or `[x, y, i]` (its y waves with index i) and a points list may
hold `{"hem": [xa, xb, y, seed, deep]}`, which expands to a ragged hem whose alternate points wave. Shapes may
`breathe` (sink by the file's `animation.breathe` amount for half its period), take `dx` / `dy` as a number or
`{"wave": [i, amp]}`, name a `part` (for the flat rig) and list `views` to appear in.

**Animation rules.** Animation means frames. In a solid file the frames come from the motion clips: every shape with
a `bone` (or a `part` naming one) takes the rigid motion that carries that bone from the author pose to the clip's
pose; shapes with `lag` `{"frames": n, "sway": s}` have their top follow now and their hem follow n frames late, dragged
by the bone's velocity times s and, in a walk or run, by the clip's travel (the clips are in place), so hems, veils,
cords and hats trail the body; the planted foot holds the ground line in the standing clips. Bones:
`hips spine.001 spine.002 spine.003 neck head shoulder.L upper_arm.L forearm.L hand.L thigh.L shin.L foot.L toe.L`
and the `.R` side. Clips the game uses: `idle walk run attack cast hit death` (also `sprint punch jab hit_head
attack_idle cast_idle cast_enter roll crouch crouch_walk jump torch_idle talk interact pickup dance walk_hunched`;
`pixelforge shapes joints` lists them). A flat file animates by its own rules (waves, breath, pulses, flows, motes)
and, with `parts` (a pivot and a bone each), by the projected bones in the picture plane; the back views mirror the
front unless shapes list `views`. The flat path's motion is the fast path for things without depth; characters are solid.

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
capsule with a `prism` `carve` for the face and a `flat` void behind it; the cape keeps only its back (`keep.back`),
has holes near the hem and a gold skull `bitmap` by angle; the staff fire is a `flame` effect at `[85.5, 12, 4]`, the
soul orb an emissive ellipsoid with `"emit": "steady"`. The Keeper (`assets/shapes/characters/keeper.shapes.json`) is
the same language around the 120 px author pose: a straw-cone hat as a shell ring tilted back (`rotate`), a wrapped
head with `pulse` eyes, a shawl ring open at the front and a long veil ring kept to the back, lacquered pauldrons,
bracers and tassets, rope capsules across the chest, a rope belt with gourd ellipsoids, a tattered outer skirt split
at the front over a darker underskirt, wrapped shins and feet; `parts` give the hat, veil, cords, gourds, tassets and
skirts their lag.

### What is still short

The proof images are in `docs/screens/shapes/` (dated 2026-10-02): the flat parity strip, the solid necromancer beside
the page's turn, the Keeper at 120 and 76 px in idle and walk from all eight directions and attack / cast from two,
the painting beside the sprite, the in-game shot. Judged honestly: the Keeper reads as the Keeper at 120 px (hat,
burning eyes, cords, gourds, tattered hem) and the motion is the clips' (weighty walk, the hat bobbing a frame late,
the veil swinging); at 76 px she is a silhouette with a bright hat and the cords and gourds become specks, which is
where a hand-drawn sprite would simplify and this one does not yet (a per-size rule set, or fewer shapes at small
scales, is the next step). Feet step out from under the long skirt in the side views as separate blobs because the
skirt is opaque down to the ankles; a shorter split or a translucent-hem rule would fix it. The solid necromancer is a
little softer than the page's render (its rules are approximations of the page's hand-written functions). The clips
are in place, so a walk's travel is faked as a backward drag on loose parts. Secondary motion is kinematic (lag and
drag), not simulated.

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
`configure`, `list_styles`, `set_style`, `style_demo`, `add_character`, `prompts`, `import_image`, `run_step`, `run_all`,
`quick_sprite`, the shape-sprite tools `render_shape_sprite`, `preview_shape_sprite`, `shape_sheet`, `validate_shapes`,
`shape_template`, `draft_shapes`, `import_shapes`, `render_shapes` (and the tool-by-tool ones named above: `make_effect`,
`make_tiles`, `make_spell`, ...). Claude Desktop config:

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
