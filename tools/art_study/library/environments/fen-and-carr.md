# Fen and carr

Wet ground: fen, bog and carr. In the game these are the Drowned Fen, the Sunken Bog and the Drowned Village (Act I,
the Hide) and, much deeper into the god, the parasitic fen of Shog-Mire (Act III). Where the god's body shows: the
Drowned Fen is the god's lymph ("clear water that does not wet"), a Famine lies sunk to its jaw in the bog, and in
Act III the fen becomes flesh and blood (heartbeat mud that clutches every 1.7 seconds, the Blood Delta, amber grease,
brood-banks). So far only one piece of this land is built: the **carr floor** of the ritual glade, where the Hollow
Wood goes wet, its hollows filled with blood.

## The real thing
The ecosystem chapter is [`ecosystems/wetlands.md`](../../ecosystems/wetlands.md); the edge into wood is in
[`ecosystems/transitions.md`](../../ecosystems/transitions.md) and
[`old_growth_forest.md`](../../ecosystems/old_growth_forest.md).
- **Fen** is fed by ground water: reeds and sedges, open channels. **Bog** is fed by rain: acid, sphagnum in hummocks
  and hollows, peat building over millennia, few trees. **Carr** is wet woodland: alder and willow on root-islands
  among black water.
- **The water table decides everything.** A few inches separate reed, moss and tree: from wettest to driest, open
  water, reed, sedge, moss, carr, then wood.
- Real fen and carr ground (studied for the glade): peat, black and wet; sedge tussocks standing as mounds; sphagnum
  and brown mosses on the hummocks; still black water in every hollow, **lying level**; leaves matted dark into the wet.
- Transitions: into wood through carr, into moor through peat, into Act III as the water reddens.

Art chapters: [01 detail and nuance](../../chapters/01-detail-and-nuance.md) (water darkens and smooths what it
touches; one cause drives several properties); [04 stone and caves](../../chapters/04-stone-and-caves.md) (puddles as
level mirrors with a few sharp highlights).

## How it is built
**Causes first.** The water-table map comes first; each thing grows in its own band of it. Pools lie in the hollows;
causeways run where people crossed. In the glade the order is:
1. **The relief** (`fen_ground.height`): hummocks and sedge tussocks as real height in the world, on the 0.04 yd grid
   (MASTER_RULES 0, the depth effect). Only where nothing stands (`keep`, tag 0).
2. **The water** is the hollows of that relief. Each pool is found as a connected region and **levelled at its own
   rim**: its surface set to the lowest ground on its ring, so every pool lies flat at its own table and never runs
   up a slope (a liquid on a slope read as "a gold bell" in the Gate in the Flesh).
3. **The causes cut into it:** firm ground kept round where the pilgrim stands; the worn way trodden flat (no tussock,
   no pool); no pools near the flat stones (they lie on sound ground); blood gathered at the altar tree's foot.
4. **Everything standing on it** (the stump, the bones, the stones) takes its ground from the same height, so nothing
   floats.
5. **The material** (`fen_ground.paint`) is colour only, `selfshade` off: peat, matted leaves, brown mosses with
   ragged cushion edges, paler warmer peat on the worn way; the engine lights it from the real normals.
6. **The pools as blood:** depth from each pool's distance to its rim, a dark wet edge, drifting clots, a slow
   wrinkling skin, the moon as broken dull dabs, the shore's lip stained. Held dark: light capped at 0.38.
7. **Weather in it:** fog lies in the carr's lows and over the pools (`fog.py`); rain rings on the blood, the far rim
   catching the light (`rain.py`).

Objects and methods: [ground-generators](../objects/ground-generators.md) (`fen_ground.py`),
[water](../objects/water.md) (the lake shader, `shaders/lake.gdshader`, the painted standard's origin),
[blood-and-fluids](../objects/blood-and-fluids.md) (`blood.py`, `shaders/blood_pool.gdshader`),
[plants-and-litter](../objects/plants-and-litter.md), [fungi-and-lights](../objects/fungi-and-lights.md) (red caps at
the blood's margins), [form and depth](../methods/01-form-and-depth.md),
[values, ramps, dither](../methods/05-values-ramps-dither.md),
[effects and weather](../methods/06-effects-and-weather.md).

## Its scenes
- **The ritual glade's floor, `tools/art_study/vigil.py`** (log `landkit/passes/vigil.md`, piece 6 and the
  blood pools). Derek asked for the floor "a little fen like".
  - Pass 1: peat, matted leaves, sphagnum, tussocks, pools levelled at each one's rim, the moon on the water.
    **D+:** reads as fen, but the moss too green and blotchy (camouflage), the moon's sheen drawn as scratch lines, a
    pool under the pilgrim's feet.
  - Pass 2: brown mosses dulled by night with ragged edges, leaves in broken small patches, the sheen broken, firm
    ground round the pilgrim. **C:** dark wet carr under the giants, still black pools catching the moon.
  - The pools become blood ("Your water could definitely use a lot of work ... I want the puddles here to be
    blood"): **D+** (too bright and red near the lantern), then held dark: **C**.
  - The worn way, the speckle calmed into broad patches near the peat's hue, the way brought back warmer.
    **Fen floor and the worn way: B-** (6 passes); **blood pools: C+** (3 passes).
- **Older study, `art_study/painted_swamp_god.py`:** a colossal stone face half sunk in a swamp, with water as its own
  surface (the reflected ray marched up through the field, broken by ripples, the shallows showing what is sunk),
  duckweed, a tide-line of algae, mist on the water, reeds, dead trees. It predates the form law and the generator
  floor; it is a reference for reflections, not a standard.

## What worked
- Relief as real height and the water levelled at its own rim: the value-only test shows tussocks and flat pools.
- Brown mosses rather than green: the carr reads as night, not camouflage.
- Firm ground placed by cause (where the pilgrim stands, where feet wore a way, where stones lie).
- Blood held dark, with clots and a wrinkling skin: blood, not paint. Its depth comes from the distance to the rim.
- Fog in the lows, never on the hummocks: one rule from MASTER_RULES 6.

## What failed (traps)
- Green moss in hard blotches: camouflage. Keep neighbours close in value.
- A sheen drawn as lines reads as scratches; light on water is broken into dabs (the painted standard, rule 5).
- A pool under the hero's feet: water must be kept off where people stand and walk.
- Blood near the lantern bright and red: the "ketchup" failure, every time. Cap the light, darken the depth.
- Fine leaf speckle across the floor made the edges busy and hid the bones and stones; calmed into broad patches.
- The warm lights first tinted the whole fen orange; tint only the ground near the flames.

## Derek's rulings (verbatim)
- "for the tiles make them a little fen like" (the glade's floor).
- "Your water could definitely use a lot of work ... I want the puddles here to be blood ... I like the depth, but
  instead of the black water, let's make it dark blood with the occasional wisp of white fire flaring up."
- On the wisp-fire, later: "I don't think it's necessary."
- "weather happens in the world, not on the world."

## Status and what is next
- Built: the carr floor generator (`fen_ground.py`) for one scene, B- with its worn way; blood pools C+.
- Not built: open fen (reed beds, sedge, channels), bog (sphagnum hummocks and pools, peat cuttings), alder on
  root-islands, drowned trees, duckboards and causeways, the Drowned Fen's clear lymph water, and Act III's flesh fen.
  The game's ground sets `fen`, `shog`, `shogdeep` are the old tile road and not rebuilt.
- Water is still on MASTER_RULES 8.4 (ripples, reflections, rain rings, blood lakes): the blood pool and rain rings
  exist; clear water in the new standard does not.
- Next: when the Drowned Fen is built, its own rules check and scene; the water-table map as the generator's first
  map, with the carr band joining it to the Hollow Wood.
