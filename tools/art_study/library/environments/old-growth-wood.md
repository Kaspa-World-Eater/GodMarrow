# Old-growth wood

The Hollow Wood and its kin: the first land built, and still the only one the game holds as new art. It covers the
Hollow Wood, the Root Deep below it and the old groves along the Pilgrim Road (Act I, the Hide). Here the god's body
is its veins: "the Hollow Wood is the god's veins stood up as pale trees", running downhill, joining one another and
bending north toward the place where the Root Deep opens. Every tenth trunk holds something the god was carrying, the
woodcutter's eleventh "ran red down the blade and warm over my wrists", and the fungi glow in three colours. The god
is dying, so the wood is dying too: blighted crowns, cankers, weeping sap. The ritual glade inside this wood has its
own page ([the Vigil](the-vigil.md)); Cap Hollow and the chapel ruin are covered here and in
[ruins-and-stone](ruins-and-stone.md).

## The real thing
The ecosystem chapter is [`ecosystems/old_growth_forest.md`](../../ecosystems/old_growth_forest.md), studied in
`STUDY.md` round 13. The facts that drive everything:
- **Every age at once:** giants of 250 to 1,000 years, middle-aged trees waiting under them, saplings, seedlings on
  the logs. Never one even roof.
- **Gaps are the heartbeat.** A giant falls and opens a gap; the floor under closed canopy gets under 5% of daylight,
  mostly as moving flecks. Gaps open, fill and close over decades.
- **Dead wood is half the forest:** snags with bracket tiers, logs in five decay classes (fresh, loosening,
  sloughing, soft and blocky, a hump under moss), nurse logs whose seedlings end as a row of trees on stilts.
- **Pit and mound:** an uprooted giant stands its root plate on edge beside the pit it tore; centuries of these make
  the floor hummocky.
- **The floor in layers:** litter, fermentation, humus; litter drifts against things and thins on mounds; moss maps
  the wet; grass only in light.
- **No animals** in Godmarrow, so the fungi are the only decomposers: the dead are never cleared, only softened.

Art chapters that touch it: [05 cut wood and stumps](../../chapters/05-cut-wood-and-stumps.md),
[06 old-growth trunks](../../chapters/06-old-growth-trunks.md) (no tree is a tube),
[01 detail and nuance](../../chapters/01-detail-and-nuance.md),
[04 stone and caves](../../chapters/04-stone-and-caves.md) (for the stones).

## How it is built
**Causes first** (`LIVING_LANDSCAPES.md`, `wood_ecosystem.py`):
1. Place the living trees, ages mixed, then the snags and stumps.
2. Lay the fallen where they fell, oldest first, each with its root plate, pit, mound and gap. Nothing stands where a
   giant fell.
3. Compute the **light map** (crowns shade, gaps bright, flecks) and the **wet map** (pits, pools, low ground, the
   shaded side of logs).
4. Read the floor off the maps: litter on the windward side of logs and deep in pits, moss on class 3+ wood and the
   feet of giants, ferns in wet shade, grass and saplings in the gap, fungi on the dead, bare soil on fresh mounds.
5. Collision: trunk feet as posts, firm logs (classes 1 to 3) as rows, the root plate as a thin wall you walk behind.

**The forest feel** (MASTER_RULES section 5): the forest is felt from under it. Trees tower with their crowns above
the frame and the canopy shows only as light and shade on the floor; small trees are mostly dead, or seedlings;
open corridors and clearings; nothing clumps and no variant repeats within sight.

**Objects and methods:**
- The towering vein-trees: [trees-and-bark](../objects/trees-and-bark.md), built as
  [the warped column](../methods/03-warped-column.md) (`landkit/vein_tree.py`, `giant.py`, the shared `bark.py`
  through `art_study/wood_pale.py`).
- Snags, stumps, logs by decay class, root plates: [stumps-and-deadwood](../objects/stumps-and-deadwood.md)
  (`deadwood.py`, `log.py`, `vein_stump.py`).
- Rocks and flat stones: [stones-rocks-paving](../objects/stones-rocks-paving.md) (`rock.py`, `flat_stone.py`).
- Ferns, bracken, moss cushions, litter: [plants-and-litter](../objects/plants-and-litter.md) (`flora.py`,
  `scatter_wood.py`, `litter_stamps.py`).
- Fungi and the three lights: [fungi-and-lights](../objects/fungi-and-lights.md) (`wood_lights.py`).
- Weeping eyes on dying trees: [eyes](../objects/eyes.md); sap as dark blood:
  [blood-and-fluids](../objects/blood-and-fluids.md).
- Light (moonbeams through the gap, lantern, candle in the tenth trunk): [light](../methods/04-light.md);
  sway, falling leaves, spores, mist: [living layers](../methods/07-living-layers.md);
  the engine (`wood_scene.py` hooks and switches): [scene engine](../methods/08-scene-engine.md).
- The floor: [ground-generators](../objects/ground-generators.md). The old wood tiles (`tiles_wood.py`, graded C)
  are retired for new scenes; floors are world-position generators (MASTER_RULES 2b.6).

**In the game:** `tools/landkit/build_set.py old_growth` writes the set to `art/landkit/old_growth/`, and
`world/landkit.gd` stands it into a seeded zone by role. The zone generator's spots are only offers: a piece stands
only if it keeps its kind's distance (`SPACING`: tree 5.5 yd, snag 7, stump 4, log 6.5, rock 3), leaves the ways
open (roads, gates, the arrival, lanterns), and is not in one of the wood's clearings; no variant twice within 14 yd;
four saplings in five are dropped and the fifth becomes a stump; every living tree becomes a towering one.

## Its scenes
- **The judge, `art_study/wood_scene.py`** (no pass log; its history is STUDY round 13 and the ecosystem chapter).
  A giant fallen a few years ago with its root plate, pit and bright gap; a middle-aged and a young tree, a stump,
  litter drifting on the windward side, moss, ferns; animated (wind, gusts, sway, leaves, spores, mist,
  moonflecks). Collision proved by A* in `wood_collision.py`. Derek: "I want to see it fully finished"; "That will
  be the judge"; "looking fantastic … still needs a ton of work"; on the bark, "the bark on the trees looks pretty
  bad ... needs two or three more refinement passes minimum"; on the light, "the light rays and shadows from the
  canopy are too much … a cinematic beam of light, more defined … some mist may pass through or spores". It is also
  the engine every later scene is built on.
- **Cap Hollow under the Ribcage Bough, `art_study/hollow_camp.py`** (log `landkit/passes/hollow_camp.md`, 20
  passes). A valley in the old growth, four derelict pickers' huts (`hut.py`) round a fire-yard, the god's ribs
  arching from the banks, the dead (`remains.py`) lying head toward the ring with the hunter's sticks, white caps on
  flat stones, the god's hide in the slumped banks, diseased and weeping vein-trees. Derek: "The huts need a lot of
  work and why would a fire be between [huts], they should be around it. Add an eye or two and some disease to the
  trees. Base of ribs looks bad. Everything needs more detail and refinement x10"; "huts should be open too, with
  doors and broken windows". **Derek's grade: C+.**
- **The chapel ruin, `ruin_scene.py`**, and **the ritual glade, `vigil.py`**, are also set in this wood: see
  [ruins-and-stone](ruins-and-stone.md) and [the Vigil](the-vigil.md).

## What worked
- Causes first: the floor as the consequence of a placed history, so no period repeats.
- Every object a landkit generator stamped into the scene, so what is judged is what goes into the game.
- Forms read under a canopy only with a moonlit baseline, sky fill, bounce and a lit rim (a true 5% leaves navy poles).
- One or two strong statements of light: a few defined moonbeams through the gap, mist lit as it crosses.
- The warped column (taper, butt swell, wander, twist, 9 to 16 channels): Derek, "great job on the turning trees.
  More realistic and not just tubes".
- Each living layer its own fixed random sequence (one shared sequence made the grass teleport).

## What failed (traps)
- **Seeded layout:** in the game, stumps grouped up and many small trees crowded the screen. The generator's
  sprite keys offered clustered spots and sapling-heavy groves; spacing, clearings and the sapling rule in
  `landkit.gd` are the fix in progress, and the order of work is another unique scene first.
- Painted floors (C-, then C): a texture is not a floor.
- A height field cannot overhang: limbs held out become columns; stubs must rise from the log's own top.
- The root plate as a flat disc of noise read as a tombstone; it reads by its spokes.
- Engine bugs to remember: moon from the wrong side, shadow marches with no normal offset, a backwards depth test,
  logs laid newest first, brackets placed from a snag's top.
- Stand-in bark ("a 15-line stand-in") on the church's trees, and Cap Hollow's first pass in the old dark oak bark:
  every wood scene now takes the vein-trees from `wood_pale.py`.
- Thin young trees with giants' vein widths read as striped poles: vein width scales with the trunk.

## Derek's rulings (verbatim)
- "The random generation is clustering trees and other objects too much ... too many of the same objects ... the
  small trees cover a lot of the screen ... your seed generation needs to build open corridors and spaces"
  (`world/landkit.gd`).
- "If we are in a forest, I want the trees to tower over head ... we probably won't see the tops" (`giant.py`).
- "trees come in many forms, many shapes, many species, many age groups. This is true for all plants."
- "No tree is a perfect tube like you've made. They have changes in thickness. They taper, they twist."
- "we're going to have to go back and edit our old assets with this new information" (the warped column).
- "sap in the world will look like dark blood"; "I like the idea of some more dying trees having weeping eyes. Brings
  the dead god more into it."
- "so far all we really have is old growth right. i know when you generated the map there were stumps all grouped
  up and a lot of small trees and it looked bad. so first, lets just get another unique old growth scene made."

## Status and what is next
- In the game: the old-growth set (trees at four ages, logs, root plates, stumps, snags, stones, ferns, litter, the
  path). Its layout is the known failure.
- The judge scene's trees are still the older oak-like broadleaf crowns, superseded by the pale vein-trees (library
  README). MASTER_RULES 8.7: rework the judge scene, Cap Hollow, `tree.py` and `giant.py` with the warped column;
  the judge scene still blurs normals at `NORMAL_BLUR = 1.0` (a debt).
- Still to build: humus, moss carpet, pit mud and trodden-path grounds as generators; the understorey tree, holly,
  bramble, nurse log and stilted trees; the history simulation; export of the light map to Godot.
- Next by Derek's order: finish the ritual glade, then bring its lessons (spacing by design, no crowd of small
  trees) back to the seeded layout.
