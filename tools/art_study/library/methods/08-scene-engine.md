# The scene engine

`tools/art_study/wood_scene.py` began as the old-growth judge scene and is now the framework every painted scene is
built on (the ruin, Cap Hollow, the Gate in the Flesh, the ritual glade). A scene module imports it, sets its
switches, and adds its own pieces through hooks; the engine builds one height-field world at true scale, casts it
along the game's camera, shades it with the moon and every light, paints each object kind, and draws the living
layers. Use this page when starting a new scene or adding a piece to one, and read its traps before running anything.

## The rule
- [MASTER_RULES](../../../../docs/MASTER_RULES.md) 2b: scenes make the game's assets; every object a new design and a
  reusable landkit generator; nothing painted for the scene alone. 2b.6: the ground is a world-position generator.
- MASTER_RULES, the gate: the rules check is written in the piece's pass log before the first line of code.
- MASTER_RULES 5: true scale (a yard is a 36 x 18 tile, about 21 px of height), see-through, collision at every base,
  objects in combat; checklist line 11: seen as the player sees it, with the Ossuarch for scale.

## How it is done
**The pipeline** (`wood_scene.py:main` for a still, `animate` for a loop):
1. `Wood()` (`wood_ecosystem.py`) makes the plan: trees, logs, rocks, the light and wet maps, litter.
2. `WOOD_HOOKS`: `f(w)` change the plan before anything is built (the glade's `plan` clears the old trees, logs,
   rocks and saplings, and computes its own canopy light from its vein-trees).
3. `build(w)` makes the world dict `W` over a 30 x 30 yd grid at `RES = 0.04` yd round `FOCUS`.
4. `BUILD_HOOKS`: `f(W, w)` stamp more into the world. **Order matters**: insert a scene's hooks as one ordered list,
   `ws.BUILD_HOOKS[0:0] = [fen_floor, stamp_vein_trees, stamp_stump, stamp_stones, place_eyes, place_hollows,
   place_lights, export_manifest]` (floor, trees, stump, then what grows on the trees). `wood_pale.install()` appends
   `keep_world`, so it runs after them.
5. `settle_hero(W)`: the pilgrim stands on one level surface.
6. `cast(W, t)`: every screen pixel down into the world (z from 17 yd down to 3 in 0.08 steps, then to -2.6 in 0.015
   steps); standing trees through the wind's lean and `TRUNK_WARP` into `HT`, the rest into `Hrest`.
7. `shade(W, ...)`: normals, the moon with shadows and canopy, the lantern and `LIGHTS`, AO (see [light](04-light.md)).
8. `paint(W, ...)`: the ground (`GROUND` hook after the wood's own tiles), water, every object by kind (`PAINTERS`
   for kinds the engine does not know), the night air, the stepped light temperature, rims. `NOW` holds the frame's
   time for a scene's `GROUND`.
9. `living(...)`: the engine's own layers, then the `LIVING` list in order (see [living layers](07-living-layers.md)).
10. `the_ossuarch(...)`: the real hero sheet drawn at the game's scale, lit through his normal map.

**The world dict `W`** (`build` returns it; scenes add keys):

| Key | What it holds |
|---|---|
| `X`, `Y` | world coordinates of every cell (yards); `x0`, `y0`, `n` the grid's corner and size |
| `H` | the full height field: ground, trunks, logs, stones, everything stamped |
| `HT` | the standing trees only (elsewhere -50), looked up through the lean and the warp |
| `Hrest` | everything else, with the ground under each standing tree; the ground a tree stands on |
| `tag` | an int per cell: 0 ground, else the object it belongs to |
| `obj` | tag to a dict (`kind`, `c`, `r`, ...); `kind` picks the painter |
| `mat` | ground material: 1 moss, 2 bare earth |
| `light`, `wet` | the canopy light map (0.45 to 1) and the wet map |
| `water`, `litt`, `RM` | old water mask, litter depth, the rocks' material map |
| scene keys | e.g. `fen_water`, `fen_tus`, `fen_depth`, `fen_path` (glade); `putrid`, `fdist`, `spread` (Gate) |

`look(W, A, x, y, outside)` reads any array at world points; past the grid's edge pass `outside` (-50 for heights)
so nothing is extruded into a wall.

**Switches** (module globals, set by the scene before running):

| Switch | Default | Use |
|---|---|---|
| `GRASS`, `FERNS` | True | the old scene's grass tufts and ferns (off where a floor has its own) |
| `MIST`, `BEAMS` | True | the old ground mist and moonbeams (off where a scene has its own air) |
| `FOREST_LIFE` | True | leaf fall, falling and skittering leaves, the old wisp (off outside the old wood) |
| `TRUNK_WARP` | None | an object with `to_canon` and `normal_back`: [the warped column](03-warped-column.md) |
| `MOONLIT` | None | `f(px, py, pz, t)`: the scene's own reach of the moon (a cavern's shaft) |
| `NORMAL_BLUR` | 1.0 | cells of blur before normals; chapter 4 says 0 (glade 0.6, Gate 0.35: debts) |
| `RIM` | (1.35, cool lift) | the moonlit edge (`wood_pale` sets 1.12 for pale trunks) |
| `LIGHTS` | [] | `(x, y, z, reach)` warm lights cast like the lantern |
| `GROUND` | None | another land's ground painter, `f(img, W, px, py, pz, SX, SY, L, v, gl)` |
| `GROUND_LIFE_OK` | None | `f(x, y)`: where grass may grow |
| `FOCUS`, `HERO` | | the view's centre and the pilgrim's place; `gust` may be replaced (`gentle_gust`) |

**Tag ranges** (keep a scene's tags clear of the engine's and of each other):
- engine: 0 ground, 100+i trees, 200+i logs, 300 the root plate, 400+i rocks;
- the ritual glade: 600+i vein-trees, 640+i their roots, 645 the stump's roots, 671 to 675 the stump's parts (cut
  face, bark, hinge, iron, chips), 690 + 3k + (part - 1) the flat stones (top, side, chip; 25 stones reach 764);
- other scenes: the ruin 600 and 610, the Gate 700 to 880, Cap Hollow 800 to 899.
The engine's rim pass skips tags of 400 and above, so scene objects there get no engine rim.

**The objects-in-combat manifest.** `vigil.py:export_manifest`, a build hook, writes
`tools/landkit/sets/vigil.json` on every build: for each object its kind, place, collision posts, `cover`
(yards), `material` and `hp`, with notes (8 vein-trees, the stump, 25 flat stones, 4 bones, the altar candles as a
fire source, the blood pools, the tendrils; 41 entries). This follows the ecosystems README's rules (cover by height,
material decides what fire, ice, lightning, force and water do).

## What worked
- One engine, many scenes: the judge scene, the ruin, Cap Hollow, the Gate and the glade share casting, light and
  the hero, so improvements reach all of them.
- Hooks instead of forks: the glade replaced every reused piece (snags, stump, rocks, logs, litter, leaves, mist,
  beams) by switching it off and adding its own.
- The manifest written by the build, so the game data never drifts from the picture.

## What failed, and why
- **Reused pieces** (glade pass 1): the engine's snags, stump, rock, logs and litter were left on, against 2b.3.
- **The gate skipped**: the Blind Face was begun without the rules check, which is why it was built from reused
  pieces. The check comes first, in writing.
- **Shell heredocs break on apostrophes** in this environment: write patch scripts as files with the file tool and
  run them with the absolute Python path.
- **Line endings**: on Windows, Python's text-mode `open(path, "w")` turns every `\n` into `\r\n`. The repository's
  sources are LF; a patch script that reads and rewrites a file in text mode flips every line. Write with
  `open(path, "w", newline="")` (or binary). `export_manifest` still writes in text mode.
- **The stump's roots overwrote `Hrest` at a tree's centre**, so a tree's ground read about 17 yd and the altar was
  placed 18 yd up its trunk. Never write a standing trunk's ground; take
  ground from the warp's record.
- **Off-screen placement**: the three lights were first chosen over the whole 30 yd grid, so most fell off-screen;
  they are now chosen only where `to_px` lands inside the view. The mouth hid behind a foreground trunk; the high eye
  was out of frame. Check every placement's screen point.
- **Old forgotten-lesson bugs** (STUDY round 13): lookups past the grid clamped to its edge extruded a trunk into a
  wall (use `outside`); a depth test written backwards hid every fern (nearer is larger `x + y`); logs must be laid
  oldest first; brackets placed from a snag's top instead of the ground.
- **Thin walls between grids**: a ray striking a 0.22 yd wall landed a hair outside its material cells and painted
  black (Cap Hollow pass 3); look inward along the normal for the material.
- **Found while writing (2026-10-07)**: `vigil.py:wet_world` wets ground tags only in 690 to 699, so 21 of the
  25 flat stones (tags up to 764) stay dry in the rain; widen it to the stones' range.

## Derek's rulings and grades
- 2026-10-07: "so far all we really have is old growth right. i know when you generated the map there were stumps
  all grouped up and a lot of small trees and it looked bad. so first, lets just get another unique old growth scene
  made."
- 2026-10-07: "you are reusing assets in this scene, against the rules".
- 2026-10-07: "That's why the ping is important before any new area is crafted."
- 2026-10-06: "Every rock every grass like everything" (the landkit's founding order).
- Ecosystems README: "the objects should also interact with missile attacks and spells in realistic ways, which
  will improve the strategy aspect of gameplay".
- 2026-10-07: "i agree with the critique, except lets not worry about dead trees for this area, because its a
  ritualistic place, so magic or something. do the rest" (the glade graded B- after it).

## Used by
- Scenes: `wood_scene.py` (the judge), `ruin_scene.py`, `hollow_camp.py`, `flesh_scene.py`, `vigil.py` (the
  ritual glade, still under the Blind Face's file name), `moor_scene.py`.
- Shared: `wood_pale.py` (`install`, the pale bark, tree eyes), `wood_ecosystem.py` (the plan), every landkit module.

## Sources
- `tools/art_study/wood_scene.py` (docstring, globals, `build`, `cast`, `shade`, `paint`, `living`, `animate`) and
  `tools/art_study/vigil.py` (hooks at the bottom of the file)
- [vigil.md](../../../landkit/passes/vigil.md): the rules check, the altar's bugs, the critique acted on
- [Report 1](../../reports/01-gate-in-the-flesh.md), "Bugs and traps"; [STUDY.md](../../STUDY.md) round 13
- [Chapter 6](../../chapters/06-old-growth-trunks.md) section 4 (hook order, stills)
- [Ecosystems README](../../ecosystems/README.md) (objects in combat); [LIVING_LANDSCAPES](../../LIVING_LANDSCAPES.md)
- [hollow_camp.md](../../../landkit/passes/hollow_camp.md) pass 3
