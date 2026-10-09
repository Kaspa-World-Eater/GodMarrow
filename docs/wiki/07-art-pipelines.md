# 07 · Art pipelines: how the art is made

*Rewritten 2026-10-08. The look these pipelines aim at is page 06; the laws they obey are `docs/MASTER_RULES.md`; how
each pixel gets its colour is `docs/PAINTED_STANDARD.md`; the techniques in depth are the art library
(`tools/art_study/library/`). The PixelLab era, the browser's packing scripts and the Cursemark assets are retired
(section 9).*

## 1. The roads at a glance

| Road | Makes | Code | Use it for |
|---|---|---|---|
| **The 3D road** | built things and anything that overhangs: temples, huts, walls, frames, trees with branches, hanging moss | `tools/landkit3d/` (Blender, driven from Python) | every new area's built pieces, from the first area on (Derek, 2026-10-08: "absolutely fucking crushed with the 3d ... this is the way") |
| **The height-field engine** | ground, terrain, water, bone half-sunk in mud, anything that is one surface seen from above | `tools/art_study/wood_scene.py`, `bog_scene.py`, `bog_chambers.py`; generators in `tools/landkit/` | floors, the bog, review scenes; it is also the engine the bakes run through |
| **Baking a land** | a whole zone painted for the game, chunk by chunk: ground, sorted tall bands, normals, floor heights | `tools/worldgen/` (`bog.py` → `bog_export.py` → `bog_bake.py`) | a generated area going into the game (the Sunken Bog first) |
| **Baking an object set** | reusable pieces as sprites with normal maps, shadows, collision, cover | `tools/landkit/bake.py`, `build_set.py` → `art/landkit/<set>/` | trees, stumps, stones placed by a zone generator |
| **Characters** | heroes, NPCs, creatures in 8 directions with every clip | PixelForge (`tools/pixelforge/`), shape sprites (`.shapes.json`); `tools/paintover/` for the hand pass | anything that walks |
| **Effects and surfaces** | blood, fire, water, ice, miasma, skill effects, painted surfaces | `shaders/*.gdshader`, benches in `core/test_hooks.gd` | anything that moves or glows in the game |

Every road ends the same way: **one piece at a time, ten graded passes, Derek's grade on the area's review page**
(section 8).

## 2. The 3D road (`tools/landkit3d/`)

**The idea:** the form is real 3D geometry, built from code in Blender at true size. Blender renders **only data**
(which way every surface faces, where it is in the world, what it is made of, how sheltered it is, whether the moon
reaches it), never a look. Our painter turns the data into pixel art with our ramps and rules. The 3D never shows;
only the paint does.

**The files:**
- `blend_scene.py`, run inside Blender:
  `blender.exe --background --python tools/landkit3d/blend_scene.py -- SCENE OUT_DIR FX FY W H [--heightfield]`.
  - It builds the scene module's forms in the game's own coordinates (yards; x screen right-down, y screen left-down,
    z up) under one parent. That parent flips y, because the game's axes are mirrored against a right-handed world,
    and squeezes z by 0.952, because a true 30° look gives 22.05 px a yard of height where the game uses 21.
  - An orthographic camera at 60°/0°/45° with `ortho_scale` = width / 25.46 px a yard matches the game's projection
    pixel for pixel (18 × 9 px a yard on the ground). FX, FY are the ground point at the frame's centre.
  - The moon is a sun lamp from the screen's upper left (`SUN`, as the painted standard says).
  - Cycles renders the passes in a few seconds (a whole temple takes 8):
    - normal, position, ambient occlusion, material index;
    - the moon's direct light (lambert × shadow);
    - alpha.
  - They are flipped back into game coordinates and saved to `passes.npz`.
- `parts3d.py`: the reusable parts (boxes, slabs from corner points, tubes along a path with a radius per point,
  spheres, displaced relief) and the material table (`MATS`: ground, stucco, brick, stone, lacquer, gold, tile, wood,
  root, iron, bone, moss, cloth).
- `temple3d.py`: the destroyed Thai temple (the trial piece). It shows how a scene is written: one function per part
  (platform, walls, porch, roof tiers as stepped tile courses, gable trim, stair, sema stones, guardian, spirit house,
  siege debris, ferns), every number a true size, every ruin by its cause.
- `paint3d.py`: `python tools/landkit3d/paint3d.py PASSES_DIR OUT.png [HX HY HZ FX FY]`.
  - **The light:** the overcast sky, soft from above, a soft key from the upper left, a breath of the moon's true
    shadow, and deep occlusion in the crevices.
  - **Each material** gets its short hue-shifted ramp, and its wear by cause:
    - stucco lost where the damp rises and the eaves drip;
    - algae on the low shade side;
    - streaks under every lip;
    - gold only in the recesses;
    - moss where a surface faces up and holds the wet;
    - each roof tile its own;
    - the forest floor a moss carpet with every fallen leaf placed by world position.
  - **Lit lips** where the form turns toward the light, dark ones where it turns away.
  - **The paper's tooth**, fixed to the world.
  - The Ossuarch is stood at a given point for scale, hidden behind what is nearer.

**The height-field switch** (`--heightfield`): rays straight down turn the same scene into one height per spot, the
way the height engine stores the world. It exists for the method trial: everything under something else fills solid
(the eaves become walls), which is why the 3D road won.

**What the road still needs:**
- **Export to the game:** a piece's sprite, normal map, depth bands and collision footprint come straight from the
  passes. The baked land's band-sorting already proves the method.
- **Parts kits** for the Red Shore:
  - the fusion roof (Thai tiers, finials and bargeboards over plank);
  - carved face-posts, canoes;
  - the hide hut, the palisade;
  - the forest's giants, drift logs, sea stacks.
- **A painter at the painted standard:** broad tone shapes, wet edges, dry-brush strokes along the form, wet sheen.
  This is where the work is now (Derek: "the painting and details have a long ways to go").

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
