# The Sunken Bog

*Act I · zone `sunken_bog` · outdoors · creatures of levels 9–11 · borders: the Drowned Village, the Bog-Witch's
Shack · in the game: **built**, the baked land `art/zones/sunken_bog_s9101/` (proved walkable on 100 seeds, lit,
plants in the wind, 60 fps) · the pass log: `tools/landkit/passes/spine_path.md` · the serpent's myths:
`../../in-game-texts/09-the-long-back.md`, and the shore folk's own telling, "The stair", in `../../in-game-texts/08-the-shore-folk.md`*

The Drowned Fen gives up pretending to be water and becomes bog. The only firm ground is the Long Back: the spine of
a long-dead serpent god. It coils through the whole zone like Diablo II's maggot lair, so most of the walking is tight
and single-file, broken by open marsh chambers where the player can wander and choose a way on.

The god here is a different god from the dead god whose skin is the Hide. This one is far older, long dead, and
nobody living knows its name. The serpent's spine is mostly overgrown, with vertebrae breaking through moss and
reed, and the water is black and still as a mirror. Far out in the open water, its coil rings a pit of black stone,
and a red light pulses at the pit's throat.

**The one image:** a line of vertebrae breaking through moss across black mirror water, and far off the red glow.

## Found in the world

*In-game writing: texts a pilgrim can find here, in the world's own voices.*

### What the guides say

*Told by a bog guide to the pilgrims she took across, and written down by one of them while they waited for the
light at the edge of the Drowned Village.*

My mother walked the Long Back, and her mother did, and none of us has ever reached the end of it. Don't believe
anyone who says they have.

It was laid by our own people at the start of things, when they first came down into the wet country and needed a
road that would not sink. That is what we were told. They laid it out of the biggest stones they could find, round
stones, hollow in the middle and knobbed at the sides, end to end, so close you can't get a knife between them. Then
the bog grew over most of it. That is the Long Back. You will hear other things on the road. The pilgrims call it a
saint's causeway, the boatmen say a king walked down it into the water, and the children call it Old Coil. Let them.

Walk where the stone shows, or where the moss lies thin over stone. Never walk the green. The green looks like
ground, and it isn't. If the mud takes you to the knee, stand still. It holds on, and if you fight it, it holds
harder; if you stand still and breathe slowly, it lets go. Nobody knows why. We say the bog is listening for whether
you're afraid.

The Back doesn't go anywhere you'd want. It turns back on itself, crosses itself, goes out into the open water and
comes back. Some of the planked ways off it are ours, out to the islands. Some go nowhere, and those were ours too,
once: the boards are still there, and the place they went to has gone under.

There is one place I won't take you. Out in the big open water, where the Back curls round on itself almost in a
ring, there is a pit of black stone, and at night a red light comes out of it. I have seen it from the walk, and that
is near enough. My mother said the stones of the Back lie thickest round it, as if the road had been laid to go
there. She said that was where the road was going all along.

### The cold fire

*Told among the bog folk. A purifier of the Myriad who passed through set it down in her day-book, with a note of her
own at the end.*

Long ago a woman lived in the round hut on the hump, and her man went out along the Back to count its stones. The
bog folk believed then that whoever counted the Back from one end to the other would know where the road went. He
took a bag of pebbles, one for every stone, and went out in the spring. She lit a fire in the pit before her door, so
that he would see it from the walk and know where home was.

He did not come back. She kept the fire going all that year and the next. When there was no wood left on the hump
she burned the reeds from her own roof, and then the bog folk brought her wood out of pity, and then they stopped,
because the fire went on without it.

She died in the hut, and the fire is still there. It gives no heat; you can put your hand into it. It is pale and it
leans, always toward the Back. Now and then a piece of it comes loose and drifts out over the water, the way a breath
does on a cold morning, and goes out. The bog folk say the fire is her: she is still keeping it, and the pieces that
drift away are going to look for him.

The purifier wrote under it: *I have looked at it. It is a breath that has lost its door and goes round and round in
a narrow place. I would have taken it in and carried it out for her, but it did not want to come. It is waiting for
something. I did not stay to see what.*

## For building it

Most of this is built. The pass log (`tools/landkit/passes/spine_path.md`) holds every piece, its passes and
Derek's grades. What the building taught:

**The land.**
- **The Back:**
  - mostly overgrown, with vertebrae poking through now and then (Derek: "the vertebrae sometimes poking through");
  - varied in the bone, and changing width from place to place;
  - its free ends dive under the bog.
- **The water:** the Famine study's black mirror, with reflections, duckweed drifts and lilies, and a little
  movement. No iron film, and no fog over it ("its ugly").
- **The plants:** many kinds, in the water and on the humps:
  - sedge, cotton grass, reeds, duckweed, lilies;
  - stumps with mounds of mud round them;
  - snags tipped over with vines hanging off;
  - now and then the god's tendrils wrapped round something, with a pale, barely glowing pustule.
- **Balance:** the zone feels open while the path is tight. Large single ribs stand out of the water now and then,
  not everywhere ("It's all about balance").

**The maze** (`tools/worldgen/bog.py`): the Back coils across the whole zone as the tree that joins everything.
- **Loops:** board causeways laid between places the Back already joined.
- **Dead ends:** about a third causeways going nowhere, a third fallen ribs walked as bridges, the rest the Back.
- **Off the walks:** three to five islands go out over the water on their own boards, with ruined huts or sucking
  mires.

**The chambers:** eight to twelve to a zone, placed by blue noise.
- **Raw nature:** a marsh shelf of hummocks, sedge, cotton grass and pools.
- **Ancient ruins:** the drowned village's outskirts; walls and a fallen arch, the floor sunk in peat.
- **The straw hut:** a reed-thatched hut on a hump, with the cold wisp-fire in a pit before its door. Toned down,
  with a ghostly drift before each piece goes out.
- **The giant eye socket:** a vast socket in the peat, its bowl full of black water.
- **The serpent's skull:** the top of the skull breaking the marsh, its brow ridges and orbits, the Back running into
  it. Once a zone, at the farthest point from the arrival.
- **The Vein-Borers' ground:** soft churned peat with rings of glossy dark bubbles, off the walks, never under a road.

**The landmark: the pit of offering.** Derek called it exceptional, and its method is the recipe for every landmark
(`tools/art_study/reports/05-pit-of-offering.md`):
- a platform of obsidian rings stepping down to a throat, partly sunk, ringed by the serpent's coil;
- five gutters, crusted with the blood of a thousand;
- an altar slab and broken iron racks;
- runes filled with dried blood;
- the god's tendrils climbing out of the throat;
- a red glow pulsing from out of sight below.

**The red light belongs to the pit's throat alone** (Derek's ruling over "no red light"); the rest of the bog keeps
the rule.

**Light and weather.** The bog is overcast by day and moonlit at night, with the black mirror catching both. The cold
fire gives no warmth. The lantern is the key light. Rain acts on the water by rings and on the bone by darkening.

**The god showing through.** Much more than at the start:
- the serpent god's bones everywhere;
- the Hide's god in the tendrils and the pustules;
- mud that clutches and lets go, as if it were listening.

**Creatures.**
- Mostly Drowned Husks: pilgrims and bog folk the water kept.
- Pyre-Saints, whose burning hisses in the wet.
- Wick-Saints and Mire Vein-Borers.
- Gravebloats and Bloatlings.
- Bellwethers, heard tolling far across the water before they are seen.
- Mire Gasps.

**Sound.**
- the suck and release of mud;
- slow bubbles;
- insects over the water;
- far tolling;
- the planks creaking underfoot;
- at the pit, a low pulse under everything.

**Keep out.**
- fog or mist over the water;
- red light anywhere but the pit's throat;
- too many objects poking out of the water;
- any animal word but "serpent", and that only for this god.

**Open questions.** The serpent's true name is never given, by design. Who built the pit, and what it fed, stay
rival tellings (`../../in-game-texts/09-the-long-back.md`).
