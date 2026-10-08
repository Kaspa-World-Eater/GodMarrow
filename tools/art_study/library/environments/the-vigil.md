# The Vigil (the ritual glade in the Hollow Wood)

The newest set piece: a glade deep in the Hollow Wood (Act I, the Hide) where, long ago, rites were held to bring the
god back up out of the earth. The god's body here is its veins stood up as pale trees, and its blood: the trees'
red sap feeds candles that never go out, blood lies in the carr's hollows, and blood tendrils creep up the altar tree.
It began as "the Blind Face", a landmark giant with a vast eyeless face in its bark. Derek scrapped the face and
struck it from the lore; the scene became the altar glade. **Derek left its name to me ("You decide"): it is the Vigil, for its candles kept burning since the rite, as if
something is still being waited for. Scene `tools/art_study/vigil.py`.** Its pass log, `tools/landkit/passes/vigil.md`, is the
main source for this page.

## The real thing
- Old growth: [`ecosystems/old_growth_forest.md`](../../ecosystems/old_growth_forest.md) (every age, gaps, dead wood,
  layered floor, fungi on the dead). The glade's floor follows the wood's edge into carr:
  [`ecosystems/wetlands.md`](../../ecosystems/wetlands.md) and [fen-and-carr](fen-and-carr.md).
- [Chapter 5, cut wood and stumps](../../chapters/05-cut-wood-and-stumps.md): the woodcutter's stump (notch, back
  cut, hinge, axe facets, wedges, checks), and heart rot and woundwood for every hollow.
- [Chapter 6, old-growth trunks](../../chapters/06-old-growth-trunks.md): taper, butt swell, twist, channels.
- [Chapter 7, faces in trees](../../chapters/07-faces-in-trees.md): the study written after the face failed; kept as
  a study.
- [Chapter 4](../../chapters/04-stone-and-caves.md) and [chapter 2](../../chapters/02-ruins-ash-rock-scree.md) for the
  flat stones (tilted planes, chips, bedding, lichen sized by age).
- Real hollows: a limb tears off, heart rot gets in, the tree rolls smooth woundwood lips round the opening (which is
  what makes a hollow look like a mouth); candles in a niche leave wax runs over the sill and soot above the flame.
- Light rain at night is nearly invisible: a drop shows only where light catches it.

## How it is built
**Causes first.** The glade is designed, not scattered: six giants and two of middle age (the altar tree at the
back), no living saplings, open corridors between them, and the canopy computed from these trees. Then the light
(the glade a little open to the moon) and the wet (the carr's hollows). Then the floor and what stands on it, each
placed by its cause:
- **The worn way:** a path trodden for generations from the glade's front to the altar's blood; trodden flat (no
  tussock on it), pools kept off it, paler warmer peat, moss creeping back from its edges.
- **The three lights** (`landkit/wood_lights.py`, from the lore): red caps at the blood's margins (casting no light:
  no red light), blue round the feet of the hollowed trees (over something hollow), white on dry sound ground; chosen
  only where the eye can find them.
- **Flat stones with the pickers' white caps** (`flat_stone.py`): on sound dry ground, caps laid by hand in a ring or
  a row, never scattered. The small stones lie along an opening spiral round the glade, pushed, tipped, some gone,
  every fifth a larger flat one the pickers still cap.
- **Beast bones** (`beast_bones.py`): skull to the north, truer and deeper the older they are.
- **Fog** (`fog.py`) lies in the carr's lows and over the blood; **rain** (`rain.py`) falls in the world.
- `landkit/sets/vigil.json` is written on every build: cover, material, hp and collision posts for each
  object (objects in combat).

**Objects and methods:**
- Vein-trees, warped: [trees-and-bark](../objects/trees-and-bark.md), [warped column](../methods/03-warped-column.md).
- The altar hollow and candle alcoves (`hollow.py` kind "altar" and niche, `candle.py`):
  [hollows-alcoves-altars](../objects/hollows-alcoves-altars.md), [fire-candles-wax](../objects/fire-candles-wax.md),
  [ray-casting](../methods/02-ray-casting.md).
- The woodcutter's stump (`vein_stump.py`): [stumps-and-deadwood](../objects/stumps-and-deadwood.md).
- The eye tree (the approved `eye.py`, two eyes, weeping): [eyes](../objects/eyes.md).
- Blood tendrils (`vessel.py`): [tendrils-and-vessels](../objects/tendrils-and-vessels.md).
- Blood pools and wax into blood (`blood.py`, `fen_ground.paint`): [blood-and-fluids](../objects/blood-and-fluids.md).
- Fen floor (`fen_ground.py`): [ground-generators](../objects/ground-generators.md), [fen-and-carr](fen-and-carr.md).
- Flat stones: [stones-rocks-paving](../objects/stones-rocks-paving.md); bones: [bone](../objects/bone.md); caps:
  [fungi-and-lights](../objects/fungi-and-lights.md).
- Rain and fog: [effects and weather](../methods/06-effects-and-weather.md); the loop:
  [living layers](../methods/07-living-layers.md); [light](../methods/04-light.md) (three lights: moon, lantern,
  altar); the engine switches `GRASS`, `FERNS`, `FOREST_LIFE`, `MIST`, `BEAMS` off and `NORMAL_BLUR = 0.6`:
  [scene engine](../methods/08-scene-engine.md).

## Its scenes
One scene: `tools/art_study/vigil.py` (run `python vigil.py OUT.png [T] | OUT.webp`, and
`python vigil.py OUT.webp rain` for the night-rain loop). The pieces at the close of the last round:

| Piece | Passes | Grade |
|---|---|---|
| The woodcutter's stump | 11 | B- (Derek: "looks good") |
| The vein-trees, warped | 6 | B (Derek: "great job on the turning trees") |
| The eye tree | 3 | C+ |
| The altar hollow (arch, runes, slab, candles, drips, wax, soot) | 12 | B- |
| The candle alcoves | 6 | B- (Derek: "really like the candles in the tree") |
| Wax pour and the blood at the foot | 3 | C+ |
| Blood tendrils | 3 | C+ |
| The flat stones and the spiral | 5 | C+ |
| The pickers' caps | 2 | C+ |
| The three lights | 4 | C+ |
| Beast bones | 3 | C |
| Fen floor and the worn way | 6 | B- |
| Blood pools | 3 | C+ |
| Ground fog | 2 | C+ |
| Rain in the world | 3 | B- |
| Ground candles | 1 | C |

The whole glade, after the critique was acted on: **B-**. Calm, dark and readable; the altar the one strong statement
of light, the worn way leading the eye to it.

## What worked
- **The rules check written before the rebuild.** Pass 1 was begun without it and built from reused pieces; Derek:
  "you are reusing assets in this scene, against the rules". Every piece since is a new design.
- **The stump's eleven passes:** three planes on the top (chapter 4), highlights rolled off so a lit facet keeps its
  tone, bores widened to 2 to 3 px with a lit wet lip, blood soaking in at its edges.
- **Woundwood lips** as a rolled tube, the cavity a real ray-marched shape (a height field cannot carve sideways
  into a trunk); hollows drawn after the wetting so they stay dry in the rain.
- **Placement as hands place things:** caps in rings and rows, candles in a broken ring, then randomised a little
  more ("ritualistic", then "randomize the arrangement a little more").
- **Centuries of burning:** wax mounds where it ran, wax stalagmites under the drips, soot on the roof and a plume up
  the bark over the arch.
- **Its own air:** the reused mist and beams off, fog lying in the lows.
- **Calming the floor:** matted leaves in broad patches near the peat's hue, so bones and stones read against it;
  the Wood's own dark damp stone (`flat_stone.STONE`) in place of the borrowed sandstone.

## What failed (traps)
- **The face** ("Looks like the chad face"): symmetric smooth bulges, a hard bar of a brow, a square chin, graphic
  raking light. A face in a tree must be found in the tree's own parts, long, asymmetric and read by its darks
  (chapter 7).
- Ketchup blood: blood near the lantern too bright and red; held dark (light capped, depth halved).
- The vein-trees written into the resting ground, so the bark measured from 17 yd and painted them all dark.
- The stump's roots overwrote the resting ground at a tree's centre: the altar was placed 18 yards up its trunk.
- The round cavity cut the hole, so the arch stayed round; candlelight counted twice (flat orange); tendrils crossing
  the opening.
- Runes: the carving written backwards, then a band running a yard round the trunk's curve, then strokes a third of a
  pixel. A rune at this scale is a glyph about 4 x 5 px with whole-pixel strokes.
- The three lights first placed over the whole 30-yard grid, so most fell off-screen.
- The warm lights first tinted the whole floor orange; only the ground near the flames now.
- Eyes on a warped trunk must be carried out through the warp, their facing chosen in the world; the shared bark's
  random weeping sockets overlapped and are off here.
- Rain first drawn on the world, not in it (see the rulings).

## Derek's rulings (verbatim)
- "so far all we really have is old growth right ... lets just get another unique old growth scene made."
- "i want this part to be dark and grimmer, older, with the god aspects showing up subtly".
- "The face needs a ton of work. Looks like the chad face."
- "Make it look like a withered, wretched moaning face ... Better yet, no face, scratch it from the lore too. Create an
  altar inside of a large hollow, many dripping red wax candles, wax pour out and into the blood, and the first hint
  of the blood tendrils creeping up the tree and a tiny amount on the others."
- On the altar: "hero size"; "not round ... an arch at the top, pointed"; "a spiral made of runes with a little bit of
  blood and bone stuck to it"; "a few burning on the lip ... with the wax dripping down the sides"; "a couple
  sparingly on the ground outside of it".
- "hate the eyes, instead carve a ring of dark runes into the flesh of the tree around the hollow".
- "change that other tree with the weird mouth hole into a small candle alcove"; "increase the tendrils in size by 35%".
- "arrange the small stones so the vague impression is of them once being arranged in a spiral, long ago".
- "I want the puddles here to be blood ... instead of the black water, let's make it dark blood with the occasional
  wisp of white fire flaring up", later "I don't think it's necessary" (the wisp-fire removed; `wisp_fire.py` kept).
- "weather happens in the world, not on the world" (now MASTER_RULES 6).
- "i agree with the critique, except lets not worry about dead trees for this area, because its a ritualistic place, so
  magic or something. do the rest". So no snags, fallen giant or logs here; the cut stump stays.
- "bugs are fine" (insects are allowed in the world).

## Status and what is next
- In work, not yet called a masterpiece; B- overall.
- Still short of ten passes: the eye tree, the bones, the tendrils, the caps, the fog, the ground candles. They come
  back the next time the glade is opened.
- Rename the scene file (and its run lines and workbench entry) to the ritual glade; `bark_face.py`, the face's
  module, is kept, since removed things are kept.
- Export the glade's objects as game assets from `vigil.json`, then carry its layout lessons to the seeded wood.
