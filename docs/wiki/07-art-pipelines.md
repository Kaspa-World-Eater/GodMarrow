# 07 · Art pipelines: how the art is made

*Rewritten 2026-10-08; the 3D road brought up to date 2026-10-09. The look these pipelines aim at is page 06; the laws they obey are `docs/MASTER_RULES.md`; how
each pixel gets its colour is `docs/PAINTED_STANDARD.md`; the techniques in depth are the art library
(`tools/art_study/library/`). The PixelLab era, the browser's packing scripts and the Cursemark assets are retired
(section 9).*

## 1. The roads at a glance

| Road | Makes | Code | Use it for |
|---|---|---|---|
| **The 3D road** | built things and anything that overhangs: temples, huts, walls, frames, trees with branches, hanging moss | `tools/landkit3d/` (Blender, driven from Python) | every new area's built pieces, from the first area on (Derek, 2026-10-08: "absolutely fucking crushed with the 3d ... this is the way") |
| **The height-field engine** | ground, terrain, water, bone half-sunk in mud, anything that is one surface seen from above | `tools/art_study/wood_scene.py`, `bog_scene.py`, `bog_chambers.py`; generators in `tools/landkit/` | floors, the bog, review scenes; it is also the engine the bakes run through |
| **Baking a land** | a whole zone painted for the game, chunk by chunk: ground, sorted tall bands, normals, floor heights | `tools/worldgen/` (`bog.py` → `bog_export.py` → `bog_bake.py`) | a generated area going into the game (the Sunken Bog first) |
| **Baking a 3D-road area** | the same chunks, rendered from real 3D forms in aligned tiles | `tools/landkit3d/` (`cove_bake.py` → `cove_export.py`; `cave_bake.py` → `cave_export.py`) | every area built on the 3D road (the Red Shore's cove, the opening cave) |
| **Baking an object set** | reusable pieces as sprites with normal maps, shadows, collision, cover | `tools/landkit/bake.py`, `build_set.py` → `art/landkit/<set>/` | trees, stumps, stones placed by a zone generator |
| **Characters** | heroes, NPCs, creatures in 8 directions with every clip | PixelForge (`tools/pixelforge/`), shape sprites (`.shapes.json`); `tools/paintover/` for the hand pass | anything that walks |
| **Effects and surfaces** | blood, fire, water, ice, miasma, skill effects, painted surfaces | `shaders/*.gdshader`, benches in `core/test_hooks.gd` | anything that moves or glows in the game |

Every road ends the same way: **one piece at a time, ten graded passes, Derek's grade on the area's review page**
(section 8).

## 2. The 3D road (`tools/landkit3d/`)

*Updated 2026-10-09: the road now carries whole areas into the game (the Red Shore's cove; the opening cave). Every
module is listed in `tools/landkit3d/README.md`.*

**The idea:** the form is real 3D geometry, built from code in Blender at true size. Blender renders **only data**
(which way every surface faces, where it is in the world, what it is made of, how sheltered it is, whether the moon or a
lamp reaches it), never a look. A painter turns the data into pixel art with our ramps and rules. The 3D never shows;
only the paint does.

**One scene, start to finish:**
1. **A scene module** builds the forms (`temple3d.py`, `beach3d.py`, `cave3d.py`): one function per part, every number a
   true size, every ruin, drift and stain by its cause. Shared parts live in `parts3d.py` (boxes, slabs, tubes along a
   path, spheres, displaced relief, the material table); shared ground in the floor modules (`shore_floor.py`,
   `beach_floor.py`, `floor3d.py`): **the floor's height is one function** that the mesh, the bake's height map and the
   zone's walk grid all read.
2. **Blender renders the passes** (`blend_scene.py` for one camera, `blend_tiles.py` for many tiles in one build):
   normal, position, occlusion, material, the moon's light and shadow, the lamps' light, sky view, reflection, object
   ids, all saved to `passes.npz` in game coordinates. The orthographic camera matches the game's projection pixel for
   pixel at zoom 1 (18 × 9 px a yard on the ground, 21 px a yard of height; `K = 25.46` px a yard on the screen's
   axes). Bakes render at zoom 2 (`RES = 2`: 36 × 18 px a yard, 42 of height), for the 2 x 2 grid.
3. **A painter paints them** to the painted standard: `paint3d.py` (built things), `paint_shore.py` (sand, sea, basalt,
   bone, the dead), `paint_cave.py` (fire-lit interiors: stepped light zones, flames as tongues, carved faces, the pool).
4. **The frame is measured:** `cine_check.py` scores the measurable cinematography rules; the value-only render proves
   the form; the Ossuarch is placed for scale.

**What the painters now do, and must keep doing:**
- **Ground with depth at three scales** (MASTER_RULES 0.5b): the landform, the drift, the grain, all real height (the
  cove's dunes, swales, drifts round what stands, ripples; the cave hall's heaved flags and worn trough).
- **The five tones of form** on everything rounded (0.5c, `paint_shore.form_tones`): light side, halftone, core shadow,
  reflected light, cast shadow and contact.
- **Light by the place:** the overcast's soft key from the sky's bright side, with the cast shadow blurred wide and
  weakened (an overcast throws no hard shadow, `paint_shore.light`); in the cave, the fires only, each pool of light
  stepped into widening bands with black between.
- **The 2 x 2 grid** (painted standard 7): baked lands are painted at two texels an engine pixel. **Every pixel-sized
  constant in a painter is scaled by the render's zoom** (`d["zoom"]`); the cave's pool once went flat because one was
  not.
- **Materials by cause:** the cave's gritty raw basalt with rust and weeping runs, carved stone finished smooth, blood
  near-black with a skin and a gloss, foam as a life cycle, tide marks of dried red film.

**Into the game** (the cove and the cave):
- **The bake** (`cove_bake.py`, `cave_bake.py`) renders the zone as aligned tiles (each camera placed so a pixel's centre
  lands on an engine pixel; `check_align` proves it from the position pass, 0.00 px), paints them, and cuts them into the
  game's chunks: the ground, its normal map, the standing things sorted into half-yard depth bands, `height.png` (the
  floor's height for lifting bodies), `block.png` (what blocks walking), and `index.json`. The game draws them with
  `world/baked_ground.gd`; water marked in the alpha (254) moves with the shader (`shaders/baked_ground.gdshader`, the
  Red's heave on the heartbeat).
- **The exporter** (`cove_export.py`, `cave_export.py`) writes the zone file (`data/zones/<id>_s<seed>.json.gz`): the walk
  grid from the floor and the bake's blocks, **proved by a walk from the start that must reach every walkable tile and
  every way out**; the start, portals, lanterns, waystones, lights from the scene's lamps, folk (the Stranger), and the
  zone's ambient; then the zone index.
- **A whole zone** takes about an hour to bake at the cave's quality; repaint-only passes (`paint` step) reuse the saved
  tiles.

**What the road still needs:**
- the Red's true heartbeat loop in the game (the cove bakes one calm frame; the shader only heaves);
- live fire in baked interiors (the cave's flames are painted into the bake; its game lights flicker over them);
- shared, properly built dead (one corpse asset for every area, `tools/landkit/passes/opening_cave.md`);
- the parts kits for the rest of the Red Shore: the hide hut, the palisade, the fire pit of the dead, the giant trees;
- the seeded zones of the map policy (MASTER_RULES section 5): a generator per land, a graded pool of seeds, each baked.

**The height-field switch** (`blend_scene.py --heightfield`) still exists for the method trial: as a height field,
everything under something else fills solid (the eaves become walls), which is why the 3D road won.

## 3. The height-field engine (`tools/art_study/wood_scene.py` and the scenes on it)

**What it is:** one height-field world at true scale (0.04 yd a cell, 30 yd square round the focus), ray-cast along the
game's camera, lit by the moon and the lantern with real shadows, painted, then the **living layers** drawn over it
(plants, reflections, bone, fire, wisps). Scenes plug into it through hooks rather than copying it:
- `WOOD_HOOKS`, `BUILD_HOOKS`: shape the world;
- `PAINTERS`: paint an object kind;
- `GROUND`: a land's own ground;
- `LIVING`: the living layers;
- `LIGHTS`, `MOONLIT`, `RIM_EXTRA`, `AIR`.

The library's `methods/08-scene-engine.md` is its manual.

**The bog** (`bog_scene.py`, `bog_chambers.py`, with `tools/landkit/serpent_spine.py`, `bog_plants.py`,
`bog_causeway.py`, `bog_structures.py`, `drowned.py`):
- the Long Back as real bone;
- black mirror water, its reflections marched up through the world;
- plants by the water table;
- the five chambers and the pit of offering.

Its pass log is `tools/landkit/passes/spine_path.md`; the pit's report, `tools/art_study/reports/05-pit-of-offering.md`,
is the method every landmark follows.

**The value test:** `VALUE_ONLY` paints everything one grey; the form must still read (FORM IS LAW).

**Loops:** an output named `.webp` renders a seamless loop of the living layers (`ws.animate`).

## 4. Baking a land (`tools/worldgen/`, the Sunken Bog)

The chain for one seed, each step a tool:

| Step | Tool | Makes |
|---|---|---|
| Generate | `bog.py` | the maze: chambers by blue noise, the Back as a spanning tree of walks, causeway loops and dead ends, the pit of offering in the largest water, islands on board walks; a land raster at 0.5 yd |
| Export | `bog_export.py SEED` | the game's zone file `data/zones/sunken_bog_s<SEED>.json.gz`: tiles, portals, lanterns, waystone, chests, shrines, creatures moved onto walkable ground, lights (the hut's cold wisp-fire light, the pit's red throat); stray land drowned or joined by boards |
| Prove | `bog_check.py N FIRST OUT` | every seed walked the way the game walks: 100 out of 100 pass |
| Bake | `bog_bake.py SEED [JOBS]` | `art/zones/sunken_bog_s<SEED>/`: 200 chunks of 320 × 176 engine px, each painted through the bog engine from a 480 × 272 frame, so no blur or reflection is cut. Per chunk: the ground, its normal map, a tall-band atlas and the bands' normals. Plus `height.png` (the floor's height on a half-yard lattice), `block.png` (standing pieces 255, painted open water 128) and `index.json` |
| Check | `bog_seen.py SEED OUT.png` | every tile looked up where the game draws it: walkable shows ground, water shows water |

**The ground chunk's alpha** says what a texel is: 255 ground, 254 open water (the game slides and glints it), 0 past
the zone's edge.

**The tall layer:** every pixel of a standing piece (the hut, walls, stones, stumps, drowned trunks) or a stroke (reeds,
racks, ribs, loose bone) is cut into half-yard depth bands. Each band is sorted at its depth less its lift, the same
key the bodies sort by, so the pilgrim walks behind the hut. A plant's pixels are marked in the band's normal alpha
(200) and bend in the wind. The ground under them was baked without them, so they leave no frozen copy.

**No seams.** Nothing in the paint may hang on the frame. Every seam found was closed by a switch only the bake turns
on, so the graded stills are unchanged:
- plants and loose bone are placed per 4 yd world cell (`bog_scene.PLACE_CELL`);
- so are the bed's tussocks (`fen_ground.CELL`);
- plant shapes are seeded by where they stand;
- a frame with no walk gets a far dummy walk, never the worker's last one;
- the Back's lee uses the true distance to the nearest walk (its offset runs on past a walk's end);
- every chunk's cells sit on one world lattice (`wood_scene.SNAP_GRID`);
- the vertebrae are counted from each walk's own start (`serpent_spine.WHOLE_LINE`).

The test: a third frame centred on a seam must match both chunks' edge rows (to within 7 pixels in 5,120).

**The walk follows the paint:**
- the exporter reads the block map (standing pieces are solid) and the water map (painted open water is water);
- the map's own shelves raise the peat exactly where the plan says shelf;
- the Back's free ends dive under the bog (`serpent_spine` `sink_ends`).

If blocking cuts a shelf, the exporter joins the halves with boards, and the bake re-bakes the chunks those boards
touch.

**Cost:** about 35 minutes for a seed on 6 to 7 processes at idle priority (it makes the PC laggy otherwise);
about 4 MB a seed.

**In the game:** `world/baked_ground.gd` and `shaders/baked_ground.gdshader` (page 13).

## 5. Baking an object set (`tools/landkit/bake.py`, `build_set.py`)

- Each piece (a vein-tree, a stump, a flat stone) is a generator with parameters and a seed. `bake.py` renders it
  through the scene engine in the game's camera and writes, to `art/landkit/<set>/`:
  - its sprite, normal map, height and shadow;
  - its foot point;
  - its collision posts, cover height, material and hit points.
- `build_set.py` writes a whole set with `index.json` (ground textures, roles, pieces). `world/landkit.gd` stands the
  set in a zone by role (`SETS` maps a land to its set).
- **Lessons:**
  - Bake with the lantern parked behind the piece, so the night air doesn't darken and dither it.
  - Tone it back to day values (`GAME_TONE`); the game lays its own night over everything.
  - Living trunks dissolve into the canopy's dark over their top 30% (`into_the_dark`), so no trunk ends in a cut.
- Sets so far: `art/landkit/old_growth/` and `art/landkit/hollow_wood/` (50 pieces). `tools/worldgen/forest.py` lays out
  a Hollow Wood zone from a seed with them.

## 6. Characters

- **The road is hand-drawn shape models** (Derek, 2026-10-05: "the hand drawn is just way better. That settles it").
  - A `.shapes.json` is a set of solid shapes with a colour ramp each, bound to the standard skeleton, written by
    Claude as a generator script against the reference painting
    (`docs/concepts/<name>/make_<name>_shapes.py`).
  - PixelForge renders it as pixel art in 8 directions and plays the motion clips.
  - `pixelforge project build` exports it to `art/sprites/` with `skins.json`.
  - The procedure is PixelForge's `tools/pixelforge/docs/GUIDE_SESSION.md`; the format is its `docs/GUIDE_AI.md`.
- **The paint-over** (`tools/paintover/`) is the hand pass at game size on the key frames (the Ossuarch's
  `px_ossuarch.py`).
- **The standard** is the browser's sculpted Tithe-Hand: a written brief at lore depth, 6 to 10 hue-shifted tones per
  material, real light, motion made for the body, built at final size, a hand pass. Creatures follow it.
- **Midjourney is for mood and material reference only, never the design.** Prompts are written Derek's way: short,
  plain sentences, his profile `anngqkz`, stylize 350 to 750, weird 130 to 550, `--ar 3:4`. Never change his settings.
- **The process for every character** is in memory (`godmarrow-character-process`) and page 06:
  1. a design page from the lore;
  2. Derek's own painting first, if there is one;
  3. rounds against the painting;
  4. the skeptic round;
  5. the hand pass, eight directions, an animated page for his grade.

## 7. Effects and surfaces

- **Every effect is a shader or a drawn layer in the painted standard:**
  - broad tones, dither only at edges;
  - pigment pooled at the wet edge;
  - dry-brush strokes along the flow;
  - highlights dragged, never dabbed;
  - a world-fixed tooth;
  - whole world pixels;
  - it moves in the one wind.

  The lake (`shaders/lake.gdshader`) was the first; the bench is `--lakefx`.
- **Effects live in the world:** they run, pool, stain and scorch, and meet objects by material. Restrained, in the
  manner of Diablo II Resurrected.
- No red light, except the pit of offering's throat (Derek's ruling for that landmark).
- **Weather happens in the world, not on it.** **No fog or mist layers** (removed in 2026-10-05 and 2026-10-08).

## 8. How work is reviewed

- **The gate:** before the first line of a new piece, the rules check is written at the top of its pass log
  (`tools/landkit/passes/<piece>.md`). It covers every document read, the line from each that shapes the piece,
  nothing reused, form law, and placement by cause. Then the brief, and Derek's go.
- **Ten passes:** each numbered and graded in writing against the checklist (`docs/MASTER_RULES.md` section 4), each
  fixing the worst failure the last grade found.
- **The review page:** one artifact per area (the bog's: https://claude.ai/artifact/Bp6bCHbLWiWt3MMnqfLznY; the temple
  trial's: https://claude.ai/artifact/T28WGqopEAxcLm6v68hBer). Each piece shows its image or loop, Claude's honest
  grade, what was done, and what still fails. Derek grades A to D and leaves notes, which are saved in the page's
  database (`grades/<piece>`) and read back with ArtifactData before the next pass.
- **The report:** when a piece passes, `tools/art_study/reports/NN-piece.md` draws out what worked, what failed and why.
  The pit of offering's report is the landmark method.
- **The rules check every 15 minutes** (a session reminder): the checklist in writing, and then the most valuable
  improvement made, not only recorded.

## 9. Retired and rejected (don't repeat)

| What | When | Why it went |
|---|---|---|
| Rounded sculpts; normal-mapped runtime sculpts | v0.22, v0.37–0.41 | "old school 3D", "that ugly 3D look again", slow |
| The HD demo built by nine agents | v0.50 | replaced the game instead of upgrading it; little review |
| `own_art/kit.py` (paint at 4×, average down) | v0.53 | blobs and tubes, no detail |
| Cut-outs, optical-flow in-betweens, the 2D puppet, the Blender body skinned from paintings | v0.57–0.58 | missing legs, floating feet, smudged textures |
| PixelLab heroes and world pieces; PixelOver | 2026-09 | glows baked into frames, faces changing between states, cartoony large creatures; the browser era's road |
| The inflated-cutout → Blender → Mixamo hero road | 2026-10-04 | it made the Hemomancer blob |
| AI 3D from paintings (Hunyuan3D with projected colour; TRELLIS) | 2026-10-05 | closest standing still, but the fused shell stretched and smeared in motion |
| Automatic drafts of characters (measure-and-draft, picture road) | 2026-10-05 | "Claude hand drawing was better than the automatic shit" |
| The 3D card scene (`tests/scene3d`, sprites as upright cards in real 3D) | 2026-10-01 | superseded: the game stays 2D, lit by normal maps |
| Cursemark's art, sound and fonts | dropped 2026-10-08 | "Drop it": the game uses its own; the files are gone |
| Fixed ground tiles with variants | 2026-10-07 | they repeat; every ground is a world-position generator, or a baked land |
| Fog, mist and haze layers; light bars; the near-dark foreground | 2026-10-05, 2026-10-08 | they pop up and read as filters ("its ugly") |
| Calm, quiet floors | overturned 2026-10-08 | "35% too barren": the ground must stay alive |
| Dithered-block effects | 2026-10-06 | the painted standard replaced them; full-strength dither reads as gravel |
| One stamped tree; crowds of small trees | 2026-10-06, 2026-10-07 | plants are populations; giants tower with crowns out of frame, small trees mostly dead |
| Height fields for built things with overhangs | 2026-10-08 | the temple trial: the eaves fill solid to the ground (D against B-) |
