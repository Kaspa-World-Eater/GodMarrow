# The spine path through the Sunken Bog (Derek, 2026-10-08)

"The road tile is really bad, scrap it completely and make a different one. And I want a tile set that is like an
ancient spine path from a giant snake, covered in algae and dirt and mud etc, it will wind through a swampy bog area,
that has blackish mirror like water that reflects and will-o'-wisps randomly dancing across it, it will be wide enough
for some free movement but also restrictive. Some parts will go through more open marshy terrain before branching
through the swamp again. Ruins and drowned trees will also stick out of the water."

## Rules check, before pass 1

**Read for this:**
- MASTER_RULES, in full.
- The Fen's legends (`05-legends-of-the-first-lands.md`):
  - "Past the village the Fen gives up pretending to be water and becomes the Sunken Bog, where the mud clutches and lets go";
  - Hesk's shack on its hump.
- The Sunken Bog's zone facts (`14-mechanics-checklist.md`):
  - 164x152;
  - Drowned Husks, Mire Vein-Worms, Bloatlings, Mire Gasps, Moth-Saints;
  - it links to the Drowned Village and the Bog-Witch's Shack.
- The library:
  - `environments/fen-and-carr.md`: pools levelled at their rim; brown mosses, not green camouflage; fog in the lows; the Vigil's fen floor (B-);
  - `objects/water.md`, `objects/bone.md`, `objects/fungi-and-lights.md` (wisp-fire);
  - the ecosystem chapter `wetlands.md`.

**The laws it meets:**
- **No animals, no animal words (rule 7; wiki: "Every creature is a piece of the god").** The game never says "snake".
  - The proposal is that the spine is the god's own: a length of its backbone lying serpentine where it fell, the Hide sunk off it into the bog. The bog's people walk its crest because it is the only ground that never clutches.
  - In art it reads serpentine. In words it is "the Long Back" or Derek's name for it.
- **Form is law:** every vertebra is real geometry (`bone.py`'s ray-cast bone). The algae, mud and dirt are material over that form, thickest in the joints and the lows. The water is a level plane.
- **2b.6:** the path, the water and the marsh are generators painted from world position. No piece repeats; each vertebra is its own size, wear and tilt.
- **Weather in the world:** the wisp-fire floats over the water and is mirrored in it. Fog lies in the lows.
- **No red light. Restrained light:** the wisp-fire is a cold, small light, few at a time, each lighting the water and the bone round it.
- **Objects in combat:**
  - bone shatters shots;
  - the water douses fire;
  - the drowned trees and ruins are cover;
  - the deep water is impassable, which is what makes the path restrictive.

## Brief (for Derek's go)

1. **The Long Back (the path):**
   - Vertebrae laid end to end along a winding line, each 1.6 to 2.2 yd long.
   - The bodies are sunk to their middles, so the walked surface is their worn tops, 3 to 5 yd across in all. That leaves room to fight on, but a step off is a step into the water.
   - The spines that once stood up its middle are broken to stumps and worn smooth by feet.
   - At intervals the side processes and ribs arch out into the water, as low walls and cover along its edges.
   - The joints between vertebrae are packed with mud, the bone stained green-black with algae below the old water line and drier and paler on top, where feet keep it worn.
2. **The open marsh:**
   - Stretches where the Back sinks under a wider shelf of reed, sedge and quaking moss, where you can walk freely.
   - The Back comes up again on the far side.
   - Branches leave it as the long ribs and as the bog folk's sunken board causeways.
3. **The black water:**
   - A level mirror, its surface set at the bog's table.
   - It reflects what stands over it (the bone, the drowned trees, the ruins, the wisp-fire), broken only by slow rings, scum lines and floating mats.
   - It holds the light dark (the fen lesson).
4. **The wisp-fire:**
   - Small cold flames drifting low over the water in wandering paths.
   - Each one is mirrored, and each lights the bone and water near it.
   - They gather and part at random.
5. **Ruins and drowned trees:** standing out of the water.
   - Dead trunks, bleached and broken.
   - The tops of drowned walls and an arch.
   - Each is its own landkit piece with its own passes, placed by cause: the trees on old banks, the ruins along the old village line toward the Drowned Village.
6. **For the game:** the generator lays the Back's line, the marsh and the branches from the zone's own bones, so the Sunken Bog is generated from a seed like the Hollow Wood.

**Order:**
1. The Back first, as the hero piece: its vertebra, then the path generator.
2. The water and its mirror.
3. The wisp-fire.
4. The marsh.
5. The drowned trees and ruins.

Each takes graded passes in the game's camera with the Ossuarch.

## Derek's answers, 2026-10-08 (the go)

"It is a giant demon snake god long dead. Serpent, or come up with obscure names that are half remembered by the
people and all wrong. Bog works for me. I like how the ruined sunken temple water looks, so let's aim for that, lots of
plant life. The vertebrae sometimes poking through."

- **What it is:** a long-dead demon serpent god. It is a god, so the no-animals law does not bar it (Derek's ruling).
- **The names the people half remember**, all wrong, in-world voices only (for the codex later, never explained):
  - **the Long Back** (the bog folk, who walk it and think the Tithed laid it as a causeway);
  - **Saint Uss's Causeway** (the pilgrims, after a saint nobody can find in any calendar; the name is what is left of the true one, worn down like a step);
  - **Old Coil** (what children call the bends);
  - **the Stair of the Drowned King** (the boatmen, who say a king walked down it into the water and is still walking).
  - The true name is never given.
- **Where:** the Sunken Bog.
- **The look:** the Famine's bog (`painted_swamp_god.py`, workbench `famine.png`):
  - black mirror water with the reflected ray marched up through the field;
  - duckweed in drifts breaking the reflection;
  - lily pads with a notch and a lit rim, and a pale flower now and then;
  - mist on the water;
  - **lots of plant life**.
- **The path is mostly overgrown:** mud, algae, reed, moss and sedge over the Back. **The vertebrae poke through sometimes**: a worn crown here, a broken spine there, a rib arching out of the water.

**Revised order:**
1. The vertebra, as a piece.
2. The path generator, mostly overgrown with vertebrae breaking through.
3. The water, on the Famine's method.
4. The plants: duckweed, pads, reed, sedge, moss.
5. The wisp-fire.
6. The marsh.
7. The drowned trees and ruins.

## Passes 1 to 7 (2026-10-08), `art_study/bog_scene.py`

| Pass | What changed | Grade and worst failure |
|---|---|---|
| 1 | The Back as height: chevron joints, stumps, ribs; black water | **D+.** Bone bare and pale, a high wall; ribs read as planks; choppy water. |
| 2 | Lower; overgrown; ribs taper into the water | **C-.** The cover read as a bright green lawn; the flanks were sheer. |
| 3 | Banked flanks; brown-olive moss, sedge and mud in patches; tea-dark bone | **C.** The water still dashed. |
| 4 | The mirror: reflected rays marched up the world height | Honest but faint: a Back half a yard high reflects only at its foot. The mirror needs tall things. |
| 5 | Reeds, sedge and pads, each drawn with its mirror image | **D.** A wall of reeds (rule 5: nothing leafy crowds the screen). |
| 6 | Reeds gathered into beds | **C+.** Duckweed bright and blotchy; pads evenly spread. |
| 7 | Wisp-fire drifting, each mirrored; pad colonies; duckweed muted and drifted | **B-.** Duckweed now too faint. |

**Next:**
- the drowned trees and ruins standing out of the water (tall things for the mirror);
- duckweed back up a step;
- the open marsh and the branching ribs and causeways;
- the value-only test;
- the generator from a seed;
- the animated loop (wisps wandering, rings on the water, the reeds in the wind).

## Rules check, before pass 8 (2026-10-08)

MASTER_RULES is unchanged. **The lore's true detail for this piece:** "where the mud clutches and lets go". The Back's trodden mud keeps bootholes, half-closed, filling with black water.

| # | Line | Status |
|---|---|---|
| 1 | Brief | From Derek's words and the Fen's legends. The serpent's names are written. |
| 2 | Scale | Pass: vertebrae 1.9 yd, the path 3 to 5 yd, the Ossuarch for scale. |
| 3 | Form | The Back, ribs, bed and hummocks are height; plants are true strokes. The value-only test is still to run. |
| 4 | Light | Moon and lantern, plus the wisp-fire's cold light. |
| 5 | Values | Three groups read: the black water, the Back, the far marsh. |
| 6 | Ramps | Hue-shifted: bone, crown, algae, moss, mud, peat, sedge, water. |
| 7 | Paint | Broad tones. The duckweed is too faint. |
| 8 | Contact | Banked flanks; ribs dip under; reeds root in the shallows. |
| 9 | Detail where it counts | Stumps and crowns on the Back. Few details on the water. |
| 10 | Life | Still frames only; the loop is to come. |
| 11 | Seen as the player sees it | The game's camera, with the Ossuarch. |
| 12 | Skeptic round | Against the Famine: **its mirror sings because tall things stand over it. Ours has none. Worst failure, fixed first: the drowned trees and ruins.** |

| Pass | What changed | Grade and worst failure |
|---|---|---|
| 8 | Drowned trees and the village's walls standing out of the water (landkit `drowned.py`); dead limbs as mirrored strokes | The mirror sings at last: trunks and walls run down into the black water. **The trunks read as smooth pale pillars** (no tree is a perfect tube). |
| 9 | Each drowned trunk is a warped column (`vein_tree.Warp`) with its own painter: grey wet wood, deep checks along the grain, a few old bark plates, the slime band | **B.** The trunks are still a little even in girth; the duckweed is faint; no bootholes yet ("the mud clutches"). |

**Derek's grade on pass 9 (2026-10-08): C-.** "We need variety in the bone, changes in width of the path for different areas, the green spots look flat and blobby, those stone walls will just block the path completely. The water needs to have some movement to it and be darker, a light, mostly translucent fog over the water."

## Pass 10 and 11, and Derek's new direction (2026-10-08)

**Pass 10:**
- body size along the Back (the path pinches and widens);
- each vertebra with its own sink, tilt, snapped wing, cracks, bitten chunks, stain and stump (gone, low, tall, split);
- moss cushions of real height, coloured by their form;
- bootholes holding black water;
- walls pushed off the walk;
- darker water with wind ruffles;
- fog.

**Result:** the walls are clear and the blobs gone, but the bone is buried. **Pass 11:** burial varies along the Back, but the cover still rides over the roofs.

**Derek, mid-pass:** the layout is like D2's maggot lair, tight fighting broken by larger areas; more and different plants in the water. Bog structures: a rotting stump on its dirt mound, a snag tipped into the water with vines, tendrils round something with a pale pustule. Variations after grading. Chapter 8 now has sections 5 and 6 on these.

**The plan:**
- **P12:** the bared stretches clamp the cover below the bone, so whole vertebrae show. New water plants: bulrush, horsetail, cotton grass, bogbean, floating sphagnum mats.
- **P13:** the bog's structures: the rotting stump on its root mound, the tipped snag with its root plate and hanging vines, tussock-sedge columns.
- **P14:** the god's tendrils round a drowned post, with a pale pustule.
- **Then:** the value-only test; Derek's grade; variations of every piece; the maggot-lair layout in the generator.
