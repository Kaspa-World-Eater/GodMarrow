# landkit (`tools/landkit/`)

Godmarrow's land made of reusable objects (Derek, 2026-10-06: "Every rock every grass like everything"). Every object
is a **generator** with parameters and a seed, painted to the painted standard, never a drawing pasted into a scene.
These are the height-engine road's pieces: each is a height field ray-cast along the game's camera and painted in
Python. Built things and overhangs are now made on the 3D road instead (`tools/landkit3d/`), which still borrows
`kit.py` and `litter_ground.py` from here.

Run with `tools/pixelforge/.venv/Scripts/python` from the project root. Every file is LF except `litter_ground.py`
(CRLF); keep each file's endings.

## What an export holds (`kit.export`, `bake.py`)

`<name>.webp` (the painted object), `<name>_n.webp` (screen-space normal map), `<name>_h.webp` (height above its
foot), `<name>_shadow.webp` (the moon's shadow on the ground), `<name>.json` (foot point, collision posts, cover,
material, hp, true size, sway). A set goes to `art/landkit/<set>/` with an `index.json` naming each piece's role;
the game reads it in `world/landkit.gd`.

## The files

| Group | Files | Notes |
|---|---|---|
| Shared kit | `kit.py` | the camera at true scale, `ramp`, `vn`, `fbm`, the 4x4 dither `B4`, ray-cast, normals, moon shadow, AO, light, rim, `posts_from`, `export` |
| Baking a set | `bake.py`, `build_set.py` | `bake.py` renders each piece through the wood scene engine (`tools/art_study/wood_scene.py`) alone under the moon; `build_set.py` regenerates a whole ecosystem's set from its generators |
| Trees and wood | `tree.py`, `giant.py`, `vein_tree.py`, `vein_stump.py`, `bark.py`, `bark_face.py`, `hollow.py`, `log.py`, `deadwood.py` | `bark.py` is the one bark painter for every place bark appears |
| Stone and ruins | `rock.py`, `flat_stone.py`, `column.py`, `ruin.py`, `gate.py`, `kneeler.py`, `relic.py`, `gore_pillar.py` | |
| The god's body | `eye.py` (approved by Derek, record in `passes/organic_notes.md`), `fang.py`, `tooth.py`, `bone.py`, `vessel.py`, `serpent_spine.py` (the bog's Long Back) | ray-marched true forms |
| The dead and their things | `remains.py`, `beast_bones.py`, `drowned.py`, `candle.py`, `hut.py` | |
| Plants | `flora.py`, `fungus.py`, `deadplants.py`, `bog_plants.py` | |
| The Sunken Bog | `bog_causeway.py`, `bog_structures.py`, `bog_plants.py`, `drowned.py`, `serpent_spine.py` | used by `tools/art_study/bog_scene.py` and `bog_chambers.py` |
| Ground | `ground.py`, `litter_ground.py`, `fen_ground.py`, `tile_sheet.py` | painted from world position, never a stamped tile; `litter_ground.py` is the old-growth floor |
| Effects and weather | `rain.py`, `fog.py`, `blood.py`, `wisp_fire.py`, `wood_lights.py` | weather acts in the world (MASTER_RULES 6) |
| Records | `passes/*.md`, `sets/vigil.json`, `previews/` | `passes/` holds every piece's pass log (also the 3D road's: `thai_temple.md`, `red_water_sand.md`, `black_cliffs.md`, `opening_cave.md`, `red_shore_village.md`); `sets/vigil.json` is the Vigil scene's placed objects (`tools/art_study/vigil.py`) |

Each module's docstring is its brief: the lore it comes from, Derek's words, the form.

## How to run

```
tools/pixelforge/.venv/Scripts/python tools/landkit/build_set.py old_growth     # -> art/landkit/old_growth/
tools/pixelforge/.venv/Scripts/python tools/landkit/bake.py set art/landkit/hollow_wood   # the Hollow Wood set
tools/pixelforge/.venv/Scripts/python tools/landkit/bake.py [OUT_DIR]           # one test piece (a vein giant)
tools/pixelforge/.venv/Scripts/python tools/landkit/tree.py OUT_DIR             # also rock.py, log.py, deadwood.py,
                                                                                #   flora.py, giant.py
tools/pixelforge/.venv/Scripts/python tools/landkit/gore_pillar.py OUT.png [height] [seed]
tools/pixelforge/.venv/Scripts/python tools/landkit/tile_sheet.py OUT.png       # the ground surfaces as tiles
```

The other modules have no command line: scenes (`tools/art_study/`) and the bakers import them.
