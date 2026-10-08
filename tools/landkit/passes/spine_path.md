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
