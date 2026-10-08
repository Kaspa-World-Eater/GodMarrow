# Act I's ground: the complete set (Derek, 2026-10-08)

"I looked at some of the pictures above and the ground looked like shit and some of the tiles had no detail at all. We
need a complete tile set for act 1." And: "go through all of the tiles and refine them to much higher degrees, 50
refinements following all of the rules."

## Rules check, before pass 1

**What the game draws now** (`world/zone.gd` `_ground`, `shaders/ground_iso.gdshader`):
- each ground class of a zone picks one or two 320x160 pictures from `assets/assets.json` (the browser build's art), repeated across the whole map;
- the wood land swaps in `art/landkit/old_growth/ground`.

The inventory (sheet: `act1_tiles.png` in the session scratchpad):

| Land | Act I zones | Surfaces |
|---|---|---|
| moor | moor, pilgrim_road, broken_bridge, fallen_watchtower | main x2, dirt, road, mud, flags, water, shallow |
| heath | ash_shore, burnt_heath | the same eight |
| ridge | sighing_ridge | the same eight |
| fen | fen, drowned_village, sunken_bog, bogwitch_shack | the same, plus bog |
| wood | hollow_wood, fern_gully, hunter_cache, tree_hollow, root_deep | the same eight |
| crypt | crypt, fallen_monastery, plague_hospice, well_shaft, wolf_den_chapel | crypt x2, arena, flags, dirt, road |
| barrow | barrow, smugglers_hold | barrow x2, flags, dirt, arena |
| bone | cata1, cata2 | bone x2, arena, flags, road |

That is 54 kinds of ground.

**Why they fail, line by line:**
- **2b.6:** a fixed picture repeated, the exact thing the rule retires.
- **0, form:** speckle painted flat. No height reaches the renderer, so the value-only test fails on every one.
- **3.1:** speckle instead of broad tones.
- **3.6:** no world-fixed tooth.
- **4.11:** the repeat shows at once, and the water is a flat fill.

**What the rules ask instead:**
- **2b.6 and 0.6:** one generator per surface in `tools/landkit/ground.py` and its siblings, with two outputs:
  - a height in yards, at the world grid's 0.04 yd, lit by the engine with the moon's shadows;
  - a material colour, called with `selfshade=False`.
- It is painted from world position, so no two yards of any map are alike.
- For the game it is baked map by map, chunk by chunk.
- The transitions between surfaces are read from the zone's own class map, and the causes decide them: water pools in the lows, litter drifts against things, a road is worn down its middle.

**Generators that already exist** (library `objects/ground-generators.md`):
- `litter_ground` (the old-growth floor);
- `fen_ground` (peat, pools, the worn way);
- `ground.ash`;
- `ground.flags_height` (coursed flags);
- `ground.craggy_height` (LOCKED);
- `ground.flesh_height`, `ground.paving_height`;
- the dunes.

The Vigil's fen floor and blood pools, and the ruin's flags, are graded work to build on, not to replace.

**Each land's lore gives its floor one true detail** (from the wiki):
- the moor's ash lies over the god's hide;
- the Pilgrim Road was there before any order: "the pale roots turn aside at its edge";
- the fen's water "you can wade out of dry";
- the Hollow Wood's roots are all "lying the same way, like hair combed by a hand";
- the barrows sink "from the middle";
- the catacombs are bone.

Each detail is to be read in full before its land's pass 1.

## Brief (for Derek's go)

1. **Engine:** the ground stops being a texture array of pictures. Each generated or exported map bakes its own ground:
   - the colour, the normal map and the height, in chunks from world coordinates;
   - lit in the game by the lantern through the normal map, as the landkit pieces are;
   - stored with the zone (`data/zones/<id>_s<seed>.ground/`).
2. **Surfaces:** one generator per surface per land (the 54 above). Each is new for its land, so the moor's mud is not the fen's mud. Shared parts (the flag course, the water) live in one place.
3. **Transitions:** read from the class map by cause:
   - water to shallow to mud by depth;
   - road edges eroded and overgrown;
   - flags heaved and sunk into the earth at their margins.
4. **Passes:** 50 graded refinements against the full checklist, in the pass log, each fixing the worst failure the last grade found. Each pass is checked in the game's camera, with the Ossuarch for scale.
5. **Order:** one land at a time, finished before the next.

## Each surface: the rules it answers to and the thinking behind it

### What every surface obeys, whatever the land
1. **Form is law (MASTER_RULES 0):** the height comes first, as real geometry at 0.04 yd, lit by the engine. The colour is only the material. The value-only test applies to every surface.
2. **Painted from world position, baked per map (2b.6):** no two yards are alike. No tile, no stamp, no pattern.
3. **Causes decide (section 5):** what lies where, and why. Water in the lows, wear down the paths, drift in the lee, burial in the joints.
4. **Paint (section 3):** a hue-shifted ramp of 6 to 8 tones (3 or 4 for small things), broad tones, dither only where tones meet, a tooth fixed to the world. Open ground stays quiet; detail goes at the edges.
5. **Transitions:** read from the class map by cause, never a hard line between two surfaces.
6. **Life (3.8):** what can move, moves in the one wind. Glows breathe.
7. **Weather is in it (6):** rain darkens and pools in the lows; snow sits on the tops.
8. **Combat (5):** every surface has a material. Fire runs over litter and heather, water douses, ice glazes, ash puffs up under a blow.
9. **The god shows through:** more of it the deeper the place.
10. **Seen in the game:** at the game's camera with the Ossuarch, 50 graded passes.

### Moor: the god's cheek, the ash warm because the flesh below is cooling
- **main (ash over hide):**
  - Drifts banked downwind, with ripples 5 to 20 cm apart only on soft drift, and crusted plates where rain fell.
  - Groove bottoms are pale and ribs dark, because ash fills the lows first.
  - Where the wind has blown it thin, the hide shows: pores and coarse hairs. This is rare.
  - Living layer: the surveyor's "draws in with the cold and lets out with the warm". A breath so slow and slight you notice it only standing still.
- **dirt:** where the wind strips the crests, dark peat shows through with ash lying in its cracks.
- **road (the Pilgrim Road):**
  - Older than any order: sunken setts, ruts, ash filling the joints first.
  - Worn down its middle, its edges broken and drifted over.
- **mud:** wet ash, 30 to 40% darker, cracked into polygons with curled, lit rims, with rills where it drained.
- **flags:** old paving going under the ash in stages, the flesh coming up through the joints. Heaved stones use the locked craggy floor.
- **water and shallow:** grey, still and level at their rim, with an ash skin and a tide-line of ash on the shore. Black glass only where blood ran into ash, never on the water itself.

### Heath (Burnt Heath, Ash Shore): heather burned to wire, and nobody lit it
- **main:**
  - Wildfire ash read as a thermometer: black char, grey to white where it burned hotter, white "ghosts" in the shapes of the plants that burned away.
  - A mosaic of burn ages.
  - The wire stems are placed 3D strokes, not paint.
- **mud:** burnt peat, cracked.
- **water and shallow:** they matter in play, because water puts the Pyre-Saints out and pilgrims keep near the shallows. They must read plainly as water.
- **The Ash Shore:**
  - a grey strand with wrack lines;
  - salt crust where the grey water dried, since salt is traded up from the Shore;
  - the second Broken Kneeler as an object.
- **One true detail:** the ash circle where a Pyre-Saint knelt, still warm at its centre. A placed landmark floor.

### Ridge (Sighing Ridge): broken colonnades and the wind that sighs
- **main:** thin turf and scree stripped by the wind, rock breaking through, with drift tails in the lee. Every blade and every drift points the same way, so the wind can be read off the ground.
- **flags and road:** the colonnade's paving, its fallen drums all lying one way (they fall like dominoes), and scree as faceted stones.
- **water:** rare small tarns, level.

### Fen: the god's lymph, clear water that does not wet
- **main:** peat, sedge tussocks and hummocks. The Vigil's fen floor (B-) is the base.
- **bog:** sphagnum hummocks and hollows, quaking.
- **water and shallow:**
  - Clear, not black: you see its bed of peat, sunk stones and old boards, and deeper down the drowned house of prayer.
  - The surface shows only as broken moon dabs and the ripples off the reeds, and every reed bends the same way.
  - **One true detail:** the water does not wet. Its shore stays dry-coloured, with no darkened margin. It is wrong in a way you feel before you see it.
- **road:** a causeway of old boards and stones laid over the fen.
- **flags:** the Drowned Village's flags, tilted and sinking.

### Wood (Hollow Wood, Fern Gully, Hunter's Cache, Tree-Hollow)
- **main:**
  - Litter as height: matted leaves, humus, drifts against everything.
  - No green, for the grim wood. Fern Gully's ferns are dead drifts.
  - **One true detail:** the combed root threads, all lying one way toward the ring.
- **dirt:** the bare ring where the roots turned aside, round the old stone.
- **road:** the roots turn aside at its edge "as a hand from a hot pot". A clean margin, the threads curling away from it.
- **mud and water:** the carr's black water in the hollows, level at each rim, with fog in the lows.
- **flags:** the chapel's coursed flags, already reworked.

### Crypt (Rib Crypts, the Monastery, the Hospice, the Well-Shaft, the Chapel): underground, no moon
- **crypt (main):**
  - Flags laid between the ribs.
  - **One true detail:** "the flagstones lift under your boots, slow and even, and settle again". Real height, rising and falling on a slow breath.
  - Grey fat and dust packed in the joints.
- **road:** the walked line between the niches, polished down its middle.
- **dirt:** grave earth.
- **arena:** the Carrion Warden's floor, designed from its own lore. Never a painted ring.
- **Light:** few lights, each with a reason (candles, the Long Candle). Blacks as shapes.

### Barrow: the Tithed's own dead
- **barrow (main):** turf and chalky grave-earth. "Earth settles at the edges; these lids sink from the middle."
- **flags:** the lids and their kerbs, each dished inward. **One true detail:** a line drawn from the deepest point of every dish runs to the tooth-stones.
- **dirt:** fresh-dug spoil.
- **arena:** Low Day's lantern at the foot of each barrow.

### Bone (the catacombs): every wall a sermon in bone
- **bone (main):**
  - The floor is laid in bone as a pattern: skull-caps cup-down like tiles, thigh-bones in courses.
  - **One true detail:** "lower, the patterns forget themselves". The generator's order decays with depth: whole sermons in cata1, losing themselves in cata2, and something warm at the bottom.
  - Each bone is real geometry (`bone.py`).
- **road:** a worn line polished across the bone.
- **arena:** the Ossuary Matron's floor, from her lore.
