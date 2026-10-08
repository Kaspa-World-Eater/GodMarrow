# The destroyed temple shrine (first area): the 3D trial

Derek, 2026-10-08:
- "a destroyed thai temple shrine", "a dark souls-esque thai theme, but darker", all Thai;
- then "yes" to the trial: the same temple built two ways, side by side, for him to grade before the area commits to a method:
  - **A:** our height-field engine;
  - **B:** real 3D forms (Blender driven from Python), rendered in the game's camera and painted with our ramps, dither and material rules.

## Rules check, before pass 1

**Read for this piece:**
- **The lore** (`docs/wiki/02-world-and-lore.md`, `mythology/05-legends-of-the-first-lands.md`): Act I is the Hide, the dead god's skin. North of the old Moor, the Hollow Wood is "the god's veins stood up out of the ground and become a forest"; the trunks are "pale and warm a hand's depth in ... a slow beat in it". **The one true detail:** a pale root of that kind, warm and slowly beating, has grown round the temple guardian's head, the god's only hint in this area (Derek: a hint here, stronger deeper in).
- **Derek's brief for the area** (memory `godmarrow-first-area-vision`):
  - a village besieged for years by the beasts and the undead, and fallen;
  - all Thai; safe; one insane, mocking looter-merchant;
  - the Olympic rainforest, always overcast, with no fog layer.
- **The art library:**
  - `chapters/09-thai-temples-and-spirit-houses.md` (new, written for this piece): the parts, the materials, how a temple rots in a wet forest, spirit houses. **The line that shapes it:** "the roof is the temple"; its tiers and swept eaves are the overhang the trial must show.
  - `chapters/02-ruins-ash-rock-scree.md` (ruins and how stone ages): stucco fails first, then brick.
  - `chapters/01-detail-and-nuance.md`: detail from history and cause, at three scales.
  - `chapters/06-old-growth-trunks.md`: the forest round it.
- **The reports:** `reports/05-pit-of-offering.md` gives the landmark method:
  1. shape;
  2. story by cause;
  3. a material made for the place;
  4. one hidden-source light;
  5. age.
- **PAINTED_STANDARD and MASTER_RULES sections 0, 2b, 3, 4 and 5:**
  - form is law;
  - every object a reusable asset;
  - true scale, with the hero beside it;
  - see-through and collision at the base;
  - objects in combat by material.

**Confirmed, line by line:**
- **Every part is a new design for this place.** Nothing is borrowed from the bog or the old wood: the tiles, bargeboards, chofa, naga stair, sema stones, stucco, brick, lacquer and spirit houses are all new generators.
- **Everything with height is real geometry**, lit by the renderer, and the value-only test will be run on both versions (section 0). In B the geometry is the 3D model itself; in A it is the height field, with its known limit at the overhangs.
- **Placement follows cause** (section 5):
  - the wet side rots first;
  - roots enter where the wet stays;
  - moss grows on up-facing surfaces, algae on the shade side;
  - streaks run down from lips.
- **True scale** (section 5, built things sized from real buildings):
  - a village hall about 13 × 8 yd;
  - platform 1 yd, walls 4 yd, ridge 9–10 yd;
  - eaves out 1–1.5 yd;
  - the Ossuarch (2 yd) beside it.

## The brief (for Derek's go)

**What it is:** the village's own temple hall, small and old, at the edge of the clearing, older than the siege. When the walls fell, the defenders made their last stand on its platform. Its lamps are out.

**Shape:** a raised platform with a naga stair; a hall of whitewashed brick; a porch of lotus columns; and **three roof tiers** stepping back, each with swept eaves on carved brackets. At every gable: a chofa, a serpent bargeboard with its bai raka teeth, and a hang hong naga head. Eight leaf-shaped sema stones ring it.

**Story by cause:**
- The wet side's roof has fallen in, its bare rafters standing over empty air and its tiles slid into a heap at the wall foot. The dry side still holds, with one chofa snapped and hanging by its bargeboard.
- Stucco has dropped in sheets, baring red brick, and moss and fern grow in every joint.
- The naga heads at the stair foot are broken, one lying in the mud.
- The doors are black lacquer, gold only in the recesses; one hangs from a single hinge.
- Three of the sema stones are toppled.
- **The siege, by cause:** defenders' spears and broken shields lie on the platform where the last stand was made. Claw-scored and gnawed wood shows where the beasts came, and old bones lie at the stair, from the undead that kept coming.

**Material made for the place:** stucco over brick, both soaked dark from the rain and greening on their shade sides; lacquer crazed and flaking in islands; gold leaf only where nothing touched it; glass mosaic mostly gone, with a few cold glints left.

**One light:** the overcast sky, flat, grey-green, and wet. Inside, behind the hanging door, one offering candle burns that no one living could have lit, the only warm point. It is a hidden source: you see its light on the floor and the door edge, not the flame.

**Age and setting:**
- The rainforest is taking it back, true to scale: a spruce trunk wider than the door stands beside it.
- Moss hangs from the rafters, and ferns grow on the platform.
- **The god's hint:** the pale, warm root round the stone guardian's head at the door, as the banyan holds the Ayutthaya head.

**Around it:** two or three spirit houses on their single pillars at the forest edge, tilted, their roofs broken and garlands rotted to string. One holds an offering that is still fresh.

**The trial:** the hall, the stair, the guardian and one spirit house, built:
- **A** in the height engine (`wood_scene` / `bog_scene` style);
- **B** as Blender geometry rendered in the game's camera (orthographic, the game's iso angle, 18 px a yard at 4x), with its depth, normal and material passes painted by our painter.

Both are seen with the Ossuarch beside them, on a review page, for Derek's grade. Then the winner gets its ten graded passes.

Waiting for Derek's go on this brief.

## Go (Derek, 2026-10-08: "do it"). The 3D road built, passes 1 to 4

**The pipeline** (`tools/landkit3d/`):
- `blend_scene.py` builds a scene in Blender from code, in the game's own coordinates.
  - It flips the game's mirrored axes once, and fits the camera's height ratio (0.952) to the game's 21 px a yard.
  - An orthographic camera at the game's exact pixel scale renders only data: normal, world position, material, ambient occlusion, and the moon as lambert with shadow.
- `parts3d.py` holds the reusable parts: boxes, slabs, bent tubes, spheres, and displaced relief.
- `temple3d.py` is the temple.
- `paint3d.py` paints the data with our ramps and dither, by material and by cause, with lit edges where the form turns and a world-fixed tooth.
- The whole temple renders in 8 seconds.

**The passes** (the worst failure first, each time):
1. **The massing.** The tiers, eaves, gable trim, stair, sema stones, guardian, root, spirit house, siege debris and tile heap all read. The paint failed: camouflage blotches, too bright, too green, the hero placed inside the hall.
2. **Stucco loss by cause:** rising damp low, the drip line high, small and ragged; overcast light, darker. The Ossuarch now stands on the platform.
3. **The roof as stepped tile courses**, real geometry lapped course over course, so the light catches every course. Moss on the steep roof only in patches.
4. **Sword ferns as 3D clumps** along the drip line; the old repair tiles in patches; lit and dark lips where the form turns; the tooth. **Grade: B-.**

**Version A** is the same scene reduced to a height field (`--heightfield`: rays straight down, the top surface every 0.05 yd), painted the same way. It is a solid block:
- the eaves fill to the ground;
- the walls and columns vanish;
- the gable becomes a wall;
- the ferns become lumps.

**Grade: D.** That is the honest limit of one height per spot. The real engine's special cases would do better, but every overhang would need its own.

**On the review page** (https://claude.ai/artifact/T28WGqopEAxcLm6v68hBer), for Derek's grade on the method. **Still failing on B:**
- the blotchy floor;
- the black gable;
- no giant trees, drizzle or wet sheen yet;
- the guardian and the candle still need their own passes.

**Rules check, then pass 5: the forest floor**, the worst failure, against Derek's standing ruling that the ground stays alive.
- The first try used the Hollow Wood's litter generator. It lays its own humus base wherever it runs, so the drifts became hard brown pools: blotches again, only bigger.
- The fix: a cushion-moss carpet, each clump in two tones with a lit lip, with the maples' leaves placed one by one by world position. They are thick in the drifts and thin out with no edge. The worn way to the stair is earth.
- **Grade: B-** (it holds). **Next worst:** the floor is too even (broad tone shapes and real hummocks), then the black gable.

**Rules check (2nd in a row without Derek's reply), then pass 6: the gable.**
- It was a flat triangle with gold kept only in recesses, and it had none, so it read as a black hole.
- It is now carved relief, real geometry: a raised border, a medallion and twelve kanok flame scrolls fanned round it, on weathered dark wood. The gilt shows on the carving.
- **Grade: B-, nearly B.** **Next worst:** the floor's evenness (hummocks, broad shapes), then the giant trees and the drizzle.
