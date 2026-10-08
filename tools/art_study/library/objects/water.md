# Water

Water in Godmarrow is still and dark: rain standing in old pits under the wood, black pools in the carr, the Drowned Fen
and the Sunken Bog where a Famine lies sunk to its jaw, puddles in the caves catching a single highlight. Where the god
is near, the water reddens: the ritual glade's puddles became dark blood, and in Act III "the fen becomes flesh: the
heartbeat mud, the blood delta". Water is also the painted standard's origin: everything in the game is painted the
way the lake test (`shaders/lake.gdshader`) was painted. This page covers the lake shader, the fen's black water before
it became blood, the scene pools, rain on water, and what is still to build.

## The real thing
- **A pool in a forest pit** (STUDY round 13, [`old_growth_forest.md`](../../ecosystems/old_growth_forest.md)): pits
  cold, wet and deep in leaves, often holding water (vernal pools); seeps at the foot of slopes with dense green round
  them.
- **Fen and carr** ([`wetlands.md`](../../ecosystems/wetlands.md)): the water-table map decides everything, each thing
  in its band from wettest to driest (open water, reed, sedge, moss, carr, wood); still black water in every hollow,
  **lying level** at its own table; leaves matted dark into the wet.
- **Chapter 4, caves:** puddles are flat mirrors that take a highlight from any light; a few small sharp highlights say
  "wet" better than any texture; drip pits, splash cups, rimmed pools, calcite crust round them.
- **Rain at night:** light rain is nearly invisible; each drop on still liquid rings, flattened by the view; what rain
  falls on is darker and catches the lights in broken wet dabs; water runs down trunks along their channels (stemflow).
- **A liquid surface is level** (the Gate's pus pool on a slope read as a gold bell).

## How it is made
**The lake (`shaders/lake.gdshader`, `kind = 0` water, `1` blood; test scene `--lakefx`):** gouache traits in whole
world pixels (Understory's "gouache and ink on warm paper"):
- **the shore:** a lobed edge `0.78 + 0.3 fbm` that laps in and out (`0.035 sin(t * 0.9 + ...)`), wetting a band of
  ground in broken dabs; foam in dabs on water;
- **dry-brush strokes:** noise stretched along the wind (`ax.x * 0.012` by `ax.y * 0.16`), drifting with it;
- **paper tooth:** a soft broad grain fed by the world position (`world_ofs`), so it does not swim;
- **the light broken into dabs:** a sheen band toward the sky side, thresholded by a stretched noise (a loaded brush
  dragged with the wind), never a smooth sheen;
- **ripples:** up to eight (`ripples[8]` from `world/impacts.gd`), thin broken rings (`step(0.35, ...)` round the ring,
  "like a brush lifted"), squashed 2:1 by the view, fading with age;
- **the wet edge:** pigment pooled dark in a thin band inside the shore (`v -= 0.22` within 0.07), then a thin lit lip;
- **the ramp:** five tones (deep `(0.06, 0.09, 0.11)` to a glint `(0.86, 0.9, 0.84)`), dither amplitude only ±0.07.

**The fen's black water** (`tools/landkit/fen_ground.py`, before Derek turned it to blood; the branch is still in
`paint` when no pool depth is given):
- `height` finds the pools where `low + mid < -0.06` and no tussock stands, cleans them with a binary opening, and
  levels them at their own table (`level = -0.05`); everything standing on the ground takes its height from the same
  field;
- `R_WATER` (`#05070a` to `#222c37`): black, still, the sky in it dark;
- the moon laid on it as a broken streak (`glint` where the moon passes 0.55 and two noises agree), not lines.

**The scene pools:** `forest_floor.py` (a hollow below `WATER_LEVEL = -0.075` holding the night sky `WATER_SKY`, the moon
dragged across in strokes, the lantern's glow broken by ripples, a dark pooled shore band and a thin lit lip);
`wood_scene.py`'s pool in an old pit.

**Rain on water** (`tools/landkit/rain.py`): each drop falls three times a loop (`FALLS = 3`, seamless), slanting with
the wind; where it lands on still liquid it opens a ring (`RING`) that fades, the far rim catching the light; on
anything else a small crown, only where lit; `rain.wet` darkens the world, lays broken wet dabs of lantern and moon,
films stemflow down the trunks' channels with beads where lit; hollows and niches stay dry. See [effects and
weather](../methods/06-effects-and-weather.md).

**In combat** (ecosystems README): water douses fire and conducts lightning along it; ice freezes pools to walk on.

## Variants and parameters
| Piece | Where | Key settings |
|---|---|---|
| Lake, water or blood | `shaders/lake.gdshader` | `kind`, `wind`, `world_ofs`, `ripples[8]`, `half_px` |
| Fen pools (black water) | `fen_ground.height` / `paint` | water table `-0.05`, `R_WATER`, broken moon glint |
| Forest pit pool | `forest_floor.py` | `WATER_LEVEL = -0.075`, `WATER_SKY` |
| Rain rings | `rain.draw(..., on_pool)` | `FALLS`, `openness` (canopy shelter) |

## What worked
- **The lake test itself:** pooled wet edges, strokes with the wind, dabs of light and a world-fixed tooth beat the
  dithered-block look and became the standard for everything (2026-10-06).
- **Level water at its own rim** with firm ground kept round the pilgrim (fen pass 2).
- **A broken sheen** (fen pass 2): "still black pools catching the moon".
- **Rings only where liquid is,** lit only where light is: rain reads very light, as asked.

## What failed, and why (traps)
- **The moon's sheen drawn as scratch lines** (fen pass 1): one continuous streak at pixel width; break it into dabs.
- **A pool under the pilgrim's feet** (fen pass 1).
- **Full-strength Bayer dither on water** reads as gravel, not paint (painted standard rule 2).
- **Square dabs on a grid** read as a QR code; highlights are stretched strokes.
- **Rain as a layer over the picture:** "weather happens in the world, not on the world"; every drop lands and acts.
- **Derek on the black water:** "Your water could definitely use a lot of work". The fen's water was graded C at best and
  replaced by blood before it was finished; water itself has had no masterwork pass since the lake test.

## Derek's rulings and grades (verbatim)
- 2026-10-06: "Make it the new standard and apply it to everything moving forward." (the lake test)
- 2026-10-06, his effects list: "Environment: grass, ruins, stone, snow, water, blood lakes, anything."
- 2026-10-07: "for the tiles make them a little fen like".
- 2026-10-07: "Your water could definitely use a lot of work ... I want the puddles here to be blood ... I like the depth,
  but instead of the black water, let's make it dark blood".
- 2026-10-07: "an animated image of this scene at night with a gentle breeze blowing and a very light rain"; "weather
  happens in the world, not on the world".

## Where it is used
- [Fen and carr](../environments/fen-and-carr.md): the carr's pools (now blood in the ritual glade).
- [Old-growth wood](../environments/old-growth-wood.md): the pit pool, the forest-floor study's hollow.
- [Caves and the organic deep](../environments/caves-and-the-organic-deep.md): cave puddles (chapter 4 recipe D, not
  built).
- The game: `lake.gdshader` (`--lakefx`); wetland ground sets `fen`, `shog`, `shogdeep`.

## Status
- **No water piece is finished.** The lake shader is the standard's reference, not a graded asset; the fen's black
  water was abandoned for blood at about C.
- **Still to build (MASTER_RULES 8.4, and Derek's list):** ripples where anything steps or wades; reflections of the
  lantern and of figures; rain rings on water (built on the blood pools only); blood lakes; seeps; cave puddles as level
  mirrors with calcite rims; reed beds, sedge, drowned trees and causeways from the wetlands chapter; the fen reddening
  into Act III's flesh.
- **Duplicates to merge:** three water paints (`lake.gdshader`, `fen_ground.paint`'s water branch, `forest_floor.py`)
  should become one water material with the lake's rules, as `blood.py` is for blood; and the game's ground should
  carry it as the ground generators move to a shader (see [ground generators](ground-generators.md)).
