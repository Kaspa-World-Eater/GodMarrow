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

| Pass | What changed | Grade and worst failure |
|---|---|---|
| 12 | Bulrush, horsetail, cotton grass, bogbean, sphagnum rafts; bared stretches clamped below the bone | The noise never bared this stretch. |
| 12b-c | Bared and buried stretches alternate along the Back; algae only in a thin band at the water line | Whole vertebrae show: roofs, wings, joints, stumps. |
| 13 | Great single ribs out of the water (`bone.py`, ray-marched), mirrored (Derek asked for them) | One read as a rusty post; one crossed the walk. |
| 14 | THE BONE'S OWN FORM (Derek: "the texture of the bone ... the depths and curves of it"): a saddle between ridge and keel, keels, raised rims at the joints, nutrient pits, weathered pitting, grain cracks; the colour follows the form (stain in the hollows, pale crowns, flaked shell). Ribs arched. | The ribs read as rusted iron (the bone tool's sinew and blood colours). |
| 15 | Bog bone for the ribs; the arch moved off the walk; dark peat, not moss, on bared stretches | The ribs were too dark. |
| 16-18 | Balance (Derek: "the area will feel open while the path is constrictive ... not too many random objects"): three drowned trunks, one giant rib in view; the Back keeps its ribs (Derek corrected me: he meant the stray ones); the pads lie under the rib arch | **B**, awaiting Derek's grade. Derek: "It's looking much better now". |

**Next, toward a whole zone ("a zone sized map ... loop and curve throughout it like a maze while the player looks for exits"):**
1. The bog's structures: the rotting stump on its mound, the tipped snag with vines, the tendrils with a pale pustule. Each rare.
2. Variants of every piece for the generator.
3. The zone generator: the Back coiled through the Sunken Bog as a maze, with tight walks between larger marsh shelves (the maggot lair's rhythm) and exits to find.

## The value-only test (rule 0.4), 2026-10-08

`bog_scene.py OUT.png value`, with the ground and the Back in one grey. **Passes:** the Back reads as solid and deep with its colour gone: the lumpy overgrowth, the wings and keels, the stumps, the ribs, the bitten chunks, the banked flanks into the water, all lit by their real form. The drowned trees, plants and giant ribs keep their own painters in this test, so it covers the ground and the Back only.

**Derek, next:** "make the water have more shimmer and movements like a bog". Pass 19 gives the water slow moving ripples with the moon's shimmer broken into dabs, bubble rings rising out of the peat, and the iron film's oily sheen on the stillest water, shown as an animated loop.

## Derek, 2026-10-08: the open marsh chambers, and the water's model

"I want some large open marsh areas where the player can walk around a bit and choose different paths. These can be just raw nature in the big, some can be ancient ruins, maybe a straw hut with a wisp fire in a pit, a giant eye socket and the top of a snake skull. Stuff like that. All at the same level as this one. Make sure the path can twist and turn too." And: "Remove the iron film, just study the ruin scene in the swamp, that water looked good" (the Famine, `painted_swamp_god.py`).

**The chambers, the maggot lair's larger areas between the tight walks.** Each is a set piece the generator places where the Back's coils come near each other, so the player chooses which way to go on:
1. **Raw nature:** a broad marsh shelf of hummocks, sedge, cotton grass and pools, open to wander.
2. **Ancient ruins:** the drowned village's outskirts, walls and a fallen arch, the floor sunk in the peat.
3. **The straw hut:** a reed-thatched hut on a hump, wisp-fire burning cold in a pit before its door (the bog folk who walk the Long Back).
4. **The giant eye socket:** a vast socket in the peat, the god's or the serpent's, its bowl filled with black water.
5. **The serpent's skull:** the top of the skull breaking the marsh, its brow ridges and eye sockets, the Back running into it.

All are at the scene's standard and each gets its passes. **The path twists and turns:** the Back coils, doubles back and makes tight bends.

## The chambers: pass log

**Raw nature** (`bog_chambers.py nature`):

| Pass | What changed | Grade |
|---|---|---|
| 1 | A marsh shelf (`shelf()`), the rotting stump on its mound, the tipped snag, the tendril post with its pustule (landkit `bog_structures.py`), the Back twisting in two bends | Plants too dense and even on the shelf; the hero stood in the water; tendrils too small. |
| 2 | Plants clustered; hero on the Back; tendrils enlarged | Shelf barren and flat: the lift had erased the hummocks. |
| 3-4 | The shelf lifted as a whole, keeping its own hummock and hollow, so pools stay in the hollows. Open ground coloured by the water table: black wet peat, a dulled red-green sphagnum lawn, brown moss on the tops. | **C+.** A reed wall on the left; the shelf murky. |

**The straw hut** (`bog_chambers.py hut`):
- Pass 1: a round reed-thatched hut in courses (moss in patches), a daubed wall with its door, a ring-stone pit with cold wisp-fire (`straw_hut`, `pit_fire`). The hero stood over the pit; the foreground was a reed wall.
- Pass 2: hero beside the pit; reed beds thinner; the fire lights its ring. **B-.**

**The giant eye socket** (`socket`):
- Pass 1: a bone rim thick at the brow and broken in places, a bowl of black water, a pale ring deep in it ("a pool that looks back"). The ring was too crisp.
- Pass 2: ring broken and faint; rim given cracks and pitting.
- Pass 3: rim slimed low. **B-.** The ring is now nearly invisible: find the middle.

**The serpent's skull** (`skull`):
- Pass 1 read as a pill; pass 2 as a shoe.
- Pass 3: a spade outline from above (broad behind the eyes, tapering to the snout), a crest, great eye hollows holding water, brow ridges, nostril pits, sutures, a row of teeth at the water line, the quadrates standing back like horns. **C+.**

**The ruins** (`ruins`):
- Pass 1: grey boxes; the hero stood on a jamb.
- Pass 2: coursed blocks each their own grey, moss on the tops, the floor laid into the shelf, the jambs lowered, the hero on the floor. **B-.** The floor flags don't read yet.

**Across the chambers:** they share the bog scene's foreground plants and the drowned tree on the right. Each needs its own seeds and its own foreground.

**All chambers, pass 4 (2026-10-08):**
- Each chamber now has its own place in the world (`set_origin`), so its own beds of plants, hummocks and pools; none share a foreground.
- Tall plants thin toward the camera (MASTER_RULES 5: nothing tall crowds the screen).
- The skull's hero stands on the Back at the skull's rear.

Grades: nature **B-**, hut **B-**, socket **B-**, skull **B-**, ruins **B-**, the main walk **B**.

**Pass 5, skull and socket:**
- **Skull:** the orbits and nostril pits now hold water (they had been painted as bone below the water line); paler crowns. **B-.**
- **Socket:** the brow is thick and high, the rim broken right through in three places, its height uneven (no longer a tyre); the ring is a little clearer. **B-.**

**The zone maze** (`tools/worldgen/bog.py`):
- 8 to 12 chambers by blue noise; the skull once, at the farthest point from the arrival; huts and sockets at most two each.
- A spanning tree plus 3 loops plus 4 or 5 dead-end spurs, with no crossings.
- Each walk twists (now and then a hairpin), pinching and swelling between 3 and 5 yd; about half of it is tight.
- 28 sparse props in the water, near the walks.
- Seeds 1 to 3: about 500 to 600 yd of Back; 19% of the zone walkable.
- **B** as a plan. It is not yet in the game format.

## Rules check, 2026-10-08 (the improvement on this ping)

MASTER_RULES is unchanged.
- **Worst gap fixable now:** the straw hut showed no one living there.
- **The true detail (real bog life):** cut turf stacked to dry by the door, and a flat punt drawn up at the water.
- **Added:** a ragged thatch eave overhanging the wall, a dark smoke hole with soot round it, the turf stack (bricks with dark joints) and the punt.
- **Result:** the eave and smoke hole read; the turf stack reads as a dark mound; the punt is lost in the dark at this framing. **Hut: B-, nearing B.**

**Next fix:** the skull's form (the worst B-).

## Rules check, 2026-10-08 (second ping): the skull

MASTER_RULES is unchanged. **Fixed the worst B-, the skull:**
- a lower dome, so both orbits show over it;
- bigger orbits, each with a raised rim right round it;
- the bone above the water worn pale.

It now reads as a serpent's skull from above: two orbits holding water, a row of teeth, the jaw hinges standing back like horns, the snout and the sutures. **Skull: B.** Duckweed fills the orbits; black water there would read stronger.

## Rules check, 2026-10-08 (third ping): the ruins' floor

MASTER_RULES is unchanged.
- **Found:** the flagged floor had been laid behind the walls, out of view.
- **Fixed:** it now lies before the house corner, toward the viewer, sinking toward the water. Each flag has its own worn grey, moss creeps over them in broad tongues, and at the margins the flags go under the peat. A fallen lintel lies across the threshold, with a spill of rubble.
- **Ruins: B.** The flags are a little large for the walls' scale.

## Rules check, 2026-10-08 (fourth ping): the socket

MASTER_RULES is unchanged.
- **Rim:** foramina pits, flaked shell and grain running round the orbit.
- **The eye under the water:** a pale clouded iris, a black pupil and a dull rim, dimmed and wobbled by the water, findable now ("a pool that looks back like an eye").
- **Socket: B.** The iris is a little too clean an ellipse; its threads don't show at this size.

**Raw nature, pass 6:**
- Tall stems are kept off the Back (none within 4.8 yd), so the walk stays legible.
- Reed now only fringes the shallow margins (0.03 to 0.22 yd of water), never mid-pool, in fewer, thinner beds.
- The tipped snag is moved into the open water.

The chamber now reads open: the pool, the shelf beyond and the tendril post all show. **Nature: B.** Derek's bar is now A (2026-10-08: "once you've moved to what you would consider an A ... the old growth forest areas" next).

**The hut, pass 4:** the turf is stacked as turf is stacked to dry (a low stepped ridge of cut bricks with dark joints, by the door wall, in view); the punt is drawn up at the shelf's edge in view. **Hut: B.**

**All pieces now B or better:** walk B, nature B, hut B, socket B, skull B, ruins B, maze B. The bar is A.

## Rules check, 2026-10-08: light (checklist line 4, the weakest)

MASTER_RULES is unchanged.
- **Before:** the bog lay in the same even moonlight everywhere.
- **Now:** high thin cloud drifts across the moon (the `MOONLIT` hook), so broad pools of moonlight move over the water and the Back and the rest lies a step darker. The pools are stepped, with the dither only at their edges. The wet crowns of the bone catch the moon in broken pale dabs where it is open.
- **Result:** the frame has a lit half and a dark half that move with the loop. **Walk: B, toward B+.**

## Rules check, 2026-10-08: detail where the eye goes (the hut)

MASTER_RULES is unchanged. **Added:**
- the way the bog folk walk, trodden into the peat a hand lower and bare of moss, from the door past the fire pit down to the punt;
- a flat doorstone worn hollow in its middle.

**Result:** the way reads as a darker brown band; the doorstone sits under the fire's pale light and is hard to tell apart. **Hut: B.**

## Rules check, 2026-10-08: variants (Derek: "create variations so we can create a real reusable map")

MASTER_RULES is unchanged. Every chamber now takes a variant (`bog_chambers.py NAME:V`) with its own place in the world and its own layout:
- the Back's bends are flipped and rescaled;
- the set piece is moved, resized and turned (the socket's radii and angle, the skull's heading, the ruins' angle, the hut's size);
- its own seeds.

Six rendered: skull 1 and 2, socket 1, hut 1, ruins 1, nature 1. All read as distinct places.

**Faults found:**
- socket 1's rim is mostly broken away (the gaps landed on the brow);
- ruins 1 is cluttered where the walls meet the Back;
- nature 1's shelf is far off.

The variant system: **B.**

## Rules check, 2026-10-08: the variant faults

MASTER_RULES is unchanged.
- **The socket's rim** now always stands out of the ground round it; it had sunk under the shelf's hummocks. Socket 1 now shows a whole broken ring with its brow.
- **The ruins** are pushed out across the water until clear of the walk (`clear_of_back`, 7 yd). Ruins 1 now stands apart, with the Back behind it.

**Variants: B+** (nature 1's shelf is still far off).

## Rules check, 2026-10-08: the maze seen from inside (`tools/worldgen/bog_preview.py`)

MASTER_RULES is unchanged.
- The bog scene now stamps several walks of the Back at once (`bog_scene.LINES`).
- The preview renders any window of a generated zone: its walks, chamber shelves and set pieces, and its sparse props, at the game's camera.
- Seed 1 at the hut junction (62.8, 72) renders end to end. Three walks meet at the hut's shelf, the fire pit burns, and reeds stand at the margins.

**Maze window pass 1: C+.**
- Where a walk crosses a chamber shelf the shelf buries the Back, so the walks lose their bone.
- The far walks read as pale dithered bars.
- The hut is huge against this framing.
- Next: the walk stays bared across a shelf, then check the far walks' scale and haze.

## Rules check, 2026-10-08: the maze window, pass 2

MASTER_RULES is unchanged.
- **The Back rides on raised ground:** where a walk crosses a chamber's shelf, its base follows the ground beneath (smoothed) instead of sinking under it. The walks show their bone across the junction.
- **The night air is a scene's own** (`wood_scene.AIR`): the bog's thins slower and never veils the far bone.
- **The cloud-shadow dither:** its band had been so wide it checkered the whole frame; it is now a thin seam at the pools' edges.

**Maze window: B-.** The hut is oversized for the junction; the bone's weathering mottle is a little busy at this distance.

## Rules check, 2026-10-08: the bone's speckle

MASTER_RULES is unchanged.
- **Cause:** the bone's finest pitting was height at under a pixel, so it speckled the light (form law 0.3: under a pixel it is colour).
- **Fix:** pitting a hand across stays form; the finer is now colour in the mottle.
- **Result:** the vertebrae read cleaner in both the walk and the maze window, the stain and the pale crowns broad and calm. **Walk: B+.**

## Rules check, 2026-10-08: the socket's eye

MASTER_RULES is unchanged. The eye under the water is no longer a clean ellipse: a ragged, uneven iris, its pupil a little out of round, all wobbled by the water. It reads as something looking up through murk. **Socket: B+.**

## Rules check, 2026-10-08: the skull's orbits

MASTER_RULES is unchanged. Deep, still water in the skull's orbits now takes no drift (`W["no_weed"]`): no duckweed and no sphagnum rafts. The orbits read as two dark pools holding the rims' reflection, eyes full of water. **Skull: B+.**

## DEREK'S GRADES from the review page (2026-10-08, given against version 6-7)

| Piece | Grade |
|---|---|
| walk | A- |
| nature | A- |
| ruins | A- |
| socket | A- |
| hut | B+ |
| maze | B+ |
| **skull** | **C+** |
| **value-only test** | **D** |

No notes. **Worst first: the value test (the form itself), then the skull.**

## Derek's D on the value test: fixed (2026-10-08)

- **The cause:** the overgrowth was a noise of bubbles (a soft hump plus fbm lumps plus cushions) that ignored the bone beneath; in grey it read as lumpy snow, the vertebrae lost under it.
- **The overgrowth now drapes the bone.** It is the bone's own form smoothed a little (about 0.14 yd), plus a blanket thickest in the joints and lows and thin on the ridges, so the vertebrae's rhythm reads through the cover and the bone breaks through only where it stands highest. Below the wings, the bank is smooth.
- **The test is now honest:**
  - every ramp goes to one grey (`_r` under `VALUE_ONLY`), in the scene's own range;
  - every plant stroke is grey (`bog_plants.GREY`);
  - a last layer greys whatever is left (the weed, the pads, the bone tool's ramp, the wisps).
- **Result:** in one grey the Back reads as a solid chain of vertebrae with its ribs from end to end, and the trunks, the arch and the walls hold their form. In colour, the spine reads as a chain of moss-backed vertebrae with mud in the joints. **Value test: B+.**

## Derek's C+ on the skull: rebuilt (2026-10-08)

The skull is rebuilt as a serpent's from above, not a mound:
- a long, narrow braincase with the parietal ridge down its middle;
- two great orbits at mid-length, each walled by a high brow ring and full of still black water;
- a short rounded snout with nostril pits; sutures.
- **The jaws** are true bone rods (`serpent_jaws`, landkit bone.py): the quadrates stand back from the braincase's rear corners, and the jaws hinge on them, fallen open and splayed, half in the water, each with a row of small curved teeth, all mirrored. Jaws lit by the sky (ambient 0.32) so they read as pale rods.

Passes:
1. Too narrow: read as a log with dark sticks.
2. Wider; great orbits; jaws raised.
3. Shorter, with the orbits at mid-length.
4. The jaws lit.

**Skull: B-.** It now reads as a skull with two orbits and splayed jaws. The Back running into its rear still lengthens it toward a log, and the jaws are thin at this distance.

## Rules check, 2026-10-08: the skull, pass 5-6

MASTER_RULES is unchanged; no new grades from Derek.
- **The neck:** the Back tapers over its last 7 yd (`serpent_spine.NECK`) and stops 1.4 yd short of the skull, a gap where the head came away, so the skull stands as its own thing and not the end of a log.
- **The brows:** steep into each orbit, sloping away outside it, highest toward the braincase and joined to it by a bridge of bone (no longer tubs).

**Result:** the skull reads from above as a braincase between two great water-filled orbits, its jaws splayed on either side with their teeth. **Skull: B.** Still too symmetric and clean-edged, a little machined.

## Rules check, 2026-10-08: the skull's age

MASTER_RULES is unchanged.
- The machined symmetry is broken: a ragged, chipped outline; one brow broken away over a third of its ring; the skull settled into the peat, a little sunk on one side; moss only on its lowest, wettest edge.
- **The overreach and the fix:** the first try (tilt 0.16, moss below 0.35 yd) camouflaged the skull in moss blotches and lost its read. Pulled back to a tilt of 0.07 and moss below 0.2 yd.

**Skull: B+.** It reads as an old skull lying in the bog; the front orbit's broken brow faces the camera, so that orbit reads a little less.

## Rules check, 2026-10-08: the hut's life (line 10)

MASTER_RULES is unchanged; no new grades.
- **Added:** a thin smoke from the smoke hole, rising and leaning with the one wind, thinning as it goes; stepped, see-through, dithered only at its edges (the effects method).
- **Result:** it reads as a pale wisp off the peak in the still frame and will move in the loop. A little faint against the moss. **Hut: B+.**

## Rules check, 2026-10-08: the nature shelf anchored

MASTER_RULES is unchanged; no new grades. The nature chamber's marsh shelf is now anchored to its own variant's walk (just behind the Back where it passes the frame's middle), not to a fixed point, so every variant's open ground sits beside the walk, where the player can step off it. Variants 0 and 1 both checked. **Variants: B+, all three faults fixed.**

## DEREK'S SECOND REVIEW (2026-10-08, notes)

- **hut, B+:** "But could use some work, add a trellis with fire".
- **skull, C+:** "The skull should be hump and the top of the eye sockets showing." So: almost all of it buried, a hump of cranium and the brows over the orbits breaking the marsh. The jaws, the snout and the separate parts go under.
- **value, D, "Why does it look grey, F currently":** the grey frame is rule 0.4's colour-off check, not a look. The page will show it beside the colour frame, labelled as a check, so it isn't read as the scene.
- Unchanged: walk A-, nature A-, ruins A-, socket A-, maze B+.

**The skull, rebuilt to Derek's note ("hump and the top of the eye sockets showing"):**
- the crown of the cranium is a broad, smooth hump of worn bone, sinking forward toward the buried snout, with zigzag sutures (one across the crown, one down its middle behind it);
- set into the hump's front corners, the arched brows (the tops of the two great eye sockets) break the peat with black water in the sockets below;
- the jaws and snout are gone under the bog.

Passes:
1. Brows detached; the sutures fanned like a shell.
2. Sockets set into the hump; true zigzag seams.
3. The crown kept smooth (ragged only at its waterline).

Awaiting Derek's grade.

**Derek, mid-pass: "The eye sockets still don't make sense, just remove them"; "Make the skull platform wider".** Done: the skull is now a broad hump of crown, 8 x 8 yd, with its seams and no sockets, a platform to stand on in the marsh.

**The hut's trellis (Derek's note):** two forked posts of grey drowned wood either side of the fire pit, a crossbar in their forks, bundles of reed and root hung to dry, and a blackened pot on a hook over the cold fire; true strokes, mirrored. The first pass lit the posts too pale (they read as metal); the wood is now darker.

## Rules check, 2026-10-08: the second kind of path (the bog folk's causeway)

MASTER_RULES is unchanged. Landkit `bog_causeway.py`: a plank trackway as real bog trackways were built:
- split planks laid ACROSS the way, each its own width, reach, tilt and sag;
- some lost (black water between), some split, one end sunk;
- stakes driven beside it every 1.6 yd, alternating sides, some snapped short; brushwood under the planks' ends;
- 1.6 yd wide, single file; slimed only where it touches water.

`bog_chambers.py causeway` shows a branch leaving the Back's flank across the water.

Passes:
1. Planks read green (algae band too high), stray stakes far off the way, and the boards began on top of the Back.
2. All three fixed. **Causeway: B+.**

**The maze** (`worldgen/bog.py`): the Back is now the spanning tree that joins everything; the loops are causeways laid later between places the Back already joined, and about 40% of the dead ends are boards going nowhere. Seeds 1 to 3: 4 to 5 causeways each, and about 60% of the walking is tight. The preview stamps both kinds.

## Rules check, 2026-10-08: the third kind of path (the rib walk)

MASTER_RULES is unchanged. `bog_causeway.rib_walk`: one of the serpent's great ribs fallen and lying along the bog, a yard and a quarter across, a single-file bridge of bone:
- the rib's own flattened-oval section, its walked crown worn flat and dished;
- its knobbed head at the Back's flank, tapering away;
- high by the Back, sinking toward its tip; slanted cracks across it, bitten chunks, grain along it; slimed where the water reaches.

Passes:
1. It ran up out of frame and read as a log.
2. It ran along the Back (the wrong axis).
3. Square off the Back's flank, toward the open water. **Rib walk: B+.**

In the maze, 35% of the dead ends are causeways, 35% rib walks and the rest the Back.

## The Vein-Worms' ground (a new chamber kind, from the hunter's lore)

"The Vein-Worms you know by the ground. A ring of red bubbles, soft as a kettle ... never under a road."
- Soft peat churned dark and wet, off the Back (never under a road).
- Four rings of glossy black-red bubbles, some burst into ragged craters, the peat sunk and slick round each ring; no red light.

Passes:
1. Berry-red and too large; on the walk.
2. Too faint.
3. Mid-size, held dark, moon glints on the crowns. **B.**

## DEREK'S THIRD REVIEW (2026-10-08)

- **Done:** hut, nature, rib walk ("Love it"), ruins, skull, socket; value A- ("Passes").
- **Walk, A-:** "Tone down the wisp fire and they should have a ghostly drift before going away."
- **Causeway:** "more of those to add paths shooting off to islands of ruined huts or swampy pits".
- **Maze, B+, a landmark:** "a large stone platform partially sunk and ringed by a coil of the serpent bone ... concentric circles around a deep pit of stone going down into the abyss ... gore and tendrils creeping up the side ... ruins that suggest this was a place of sacrifice."

## Derek: "the open mud should have more vegetation and skeleton pieces in it" (2026-10-08)

- **Vegetation:** the dry ground takes denser sedge clumps (bed threshold 0.38, rate 0.13), low dead tufts scattered between them, and more cotton grass; the Vein-Worms' churned peat lets a few dead tufts survive.
- **Bone litter** (`bog_scene.bone_litter`): small pieces of the serpent half sunk in the peat of the shelves and banks:
  - lengths of broken rib, splinters in twos and threes, a loose vertebra's knob;
  - 22 per frame, gathered round the worms' rings, never on a walk or in the water;
  - worn pale (`R_CROWN`), drawn with the bone tool's new `plain` finish (form and light only; its weathering broke into speckle at this size).
- **The wisps, toned down** to Derek's note: three, not five; no flame, only a small soft core and a faint halo. Each wakes, drifts slowly over the water leaving a thin ghost-trail of fading dots, then rises and thins away. A faint pool on the water under it, and a dim reflection.

## The pit of offering (Derek's landmark, 2026-10-08), `bog_chambers.py pit`

A round platform of coursed stone, 16 yd across:
- four rings stepping down to a stone throat that drops into the dark;
- five gutters cut across the rings into the pit's lip, old blood stained in them and down the inner rings;
- an altar slab at the lip where the first gutter runs in;
- seven broken standing stones round the rim;
- the god's tendrils climbing up out of the throat over the inner rings;
- the Back coiled round it, nearly closed.

Passes:
1. It read new: a clean concrete pool on a drum.
2. Lowered and settled: its far side drowned (sunk stones become water, mirrored); ragged rim; more blocks gone; moss over the outer rings; standing stones snapped jagged; heavier tendrils. **B-.** The moss blotches read as camouflage, and the flooded side blurs the pit's edge.

## Islands off the walks (Derek: "board walks ... shooting off to islands of ruined huts or swampy pits")

`bog_chambers.py island`: the Back passes, and off its flank the bog folk's causeway winds out across the water to a hump of peat with a RUINED HUT (`straw_hut(..., ruined=True)`). The thatch is caved through to the dark inside on the side the camera sees, the wall broken low there, the thatch rotten in patches; its old fire ring cold; a stump on the island.

Passes:
1. The cave-in faced away and did not read.
2. Turned to face the camera and made larger. **B-.**

Next: the swampy pit island; islands in the maze generator; and the pit of offering's moss, flooded edge and outer wall.

## Derek on the pit of offering: C- (2026-10-08)

"Refine the textures and depths of the stone. Add some objects like forgotten broken metal racks, runes carved into the stone. Make the stone obsidian. Have a pulsating red glow emanating from the hole out of sight. Blood stains like a thousand people were sacrificed here once and their blood channeled gutters into the hole to feed the god."

**Derek's ruling over MASTER_RULES 6 ("no red light"):** this landmark's pit glows red, pulsing, from out of sight below. Recorded as his ruling for the pit; the rest of the bog keeps the rule.

**The pit, passes 3 to 5, to Derek's C- notes:**
- **Obsidian:** near black with a violet-green depth; rare broken glints where a face turns fully to the moon; the stone breaks in shells (conchoidal scars of real height, rippled); block edges chipped sharp.
- **Runes:** a band of glyphs cut round the outer edge of each ring (two or three strokes each, every one its own), filled with dried blood that catches the light.
- **The blood of a thousand:** crusted black-red over the inner rings, thick in every gutter, run down the risers and the outer wall in tongues, fresher in places.
- **Racks:** four broken iron racks on the outer ring, rusted, one toppled across the stone, chains hanging.
- **The glow** (Derek's ruling over "no red light"): red from out of sight below, pulsing, lighting the throat's wall the deeper it goes, warming the lip; a faint red haze above the throat.

Pass 3's glints scattered as white speckle and hid the runes; calmed. **Pit: B.** The throat's coursed wall reads a little like flames.

**The swampy-pit island** (`bog_chambers.py island:1`, odd variants): from the Bog's lore, "where the mud clutches and lets go".
- A hump of sedge round a bowl of black glossy mud, slack, a little below its rim, with long slick streaks of moon and slow gas rings.
- Half swallowed in it: a cart wheel on its edge, a pilgrim's staff leaning out, a rib cage arching up, a skull's crown.

Passes:
1. Dark wood lost on dark mud; the mud read grey like a puddle.
2. Weathered pale wood, a bigger wheel, black mud with a sheen. **B-.** The wheel is thin at this distance.

## The maze places the landmark and the islands (Derek: "Go for it", 2026-10-08)

`worldgen/bog.py`:
- **The pit of offering** goes in the largest open water (the point farthest from any land, at least 11 yd clear), ringed by a coil of the Back (nearly closed, 10.3 yd round), the coil's open end joined to the nearest walk by a walk of the Back.
- **Three to five islands** go out in the water (5.5 to 14 yd from land, clear of every chamber), each reached by its own board causeway from the nearest walk; ruined huts and sucking mires in turn.
- **The Vein-Worms' ground** joins the chamber kinds (at most two a zone).

Seeds 1 to 3: 15 to 16 places each, including the pit and four islands; 7 to 9 causeways.

`bog_preview.py` stamps every kind. Seed 2's window at its pit (145, 60) renders the coil, a causeway and the obsidian platform with its glow, all from the generator. **Maze: B+.**
