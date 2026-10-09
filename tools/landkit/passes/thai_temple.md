# The destroyed temple shrine (first area): the 3D trial

Derek, 2026-10-08:
- "a destroyed thai temple shrine", "a dark souls-esque thai theme, but darker", all Thai;
- then "yes" to the trial: the same temple built two ways, side by side, for him to grade before the area commits to a method:
  - **A:** our height-field engine;
  - **B:** real 3D forms (Blender driven from Python), rendered in the game's camera and painted with our ramps, dither and material rules.

## Rules check, before pass 1

**Read for this piece:**
- **The lore** (`docs/wiki/02-world-and-lore.md`, `mythology/05-legends-of-the-first-lands.md` (now in `docs/archive/mythology_2026-10-05/`)): Act I is the Hide, the dead god's skin. North of the old Moor, the Hollow Wood is "the god's veins stood up out of the ground and become a forest"; the trunks are "pale and warm a hand's depth in ... a slow beat in it". **The one true detail:** a pale root of that kind, warm and slowly beating, has grown round the temple guardian's head, the god's only hint in this area (Derek: a hint here, stronger deeper in).
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

## Rules check, 2026-10-08 (after the bible), then pass 7: the floor

**Read for this pass:**
- `docs/MASTER_RULES.md` in full.
- The area page (`the-red-shore.md`) and the bible's Last Breath. The founder's rule was "that the stair be swept every
  morning before anything else is done"; now "The stair has not been swept."
- The ecosystem pages (old growth, rainforest): pit and mound; the floor in layers; litter drifting into pits and
  thinning on mounds; rain standing in old pits; wet is everything.
- Chapter 09: the eight boundary stones mark the sacred ground.
- The library: the 3D road, the ground generators, plants and litter (`litter_ground`: every leaf its own).
- Derek's ruling that the ground stays alive (2026-10-08).
- The review page: no grades or notes yet.

**Pass 6 against the checklist:**

| Line | Pass 6 |
|---|---|
| 1. Brief | Passes, but the lore's newest true detail is missing: the stair the keepers swept every morning was as clean as the walk |
| 2. Scale | Passes: the 13 × 8 yd hall, with the Ossuarch (2 yd) on the platform |
| 3. Form | **Fails, the worst failure.** The floor was a 60-yard box displaced 0.12 yd over 1.9 yd cells, flat to the eye, with moss clumps and their lit lips painted on: colour standing in for height. The serpent rails floated, with nothing under them |
| 4. Light | The overcast and the moon pass; the warm local light (the candle) is not built |
| 5. Values | Fails: the floor was one mid-green field with even speckle and no broad groups; the walls' blotches break the biggest light shape |
| 6. Ramps | Passes |
| 7. Paint | Partial: the floor's speckle; the roof's checker of repair tiles |
| 8. Contact | Partial: the stones and the stair foot stood on a flat floor with nothing drifted against them |
| 9. Detail | Partial: the gable carries it now; the stair reads as pipes on boxes |
| 10. Life | Fails: still, no wind (that comes in the game) |
| 11. As the player sees it | Passes for a trial (the game's camera, scale and the Ossuarch); not yet in the game |
| 12. Skeptic round | Beside the pit of offering, whose ground tells its story by its form, the temple's floor told nothing |

**Pass 7: the floor by cause, as real height** (`tools/landkit3d/floor3d.py`, new). One function gives the floor's true
height and its cause maps from world position. The Blender build makes the ground mesh from it (0.1 yd cells, 133,000
vertices), and the painter reads the same maps.

The causes, in the order they happened:
- **The old growth's own floor.** Most 6.5-yard cells hold an old windthrow: a pit where the roots stood, and the root
  plate slumped to a mound (up to 0.8 yd) on the side it fell. The older the windthrow, the lower and wider. A long roll
  of humus lies over the buried wood.
- **The kept ground.** Inside the boundary stones the keepers levelled and swept the earth for centuries. It lies
  0.13 yd below the forest's humus, with the sweepings banked in a low ring just past the stones.
- **The platform's runoff:** a shallow trench along its foot, and a lip of splashed soil.
- **The worn way** from the stair's foot toward the shore: sunk and smoothed, with a rut down the middle.
- **The tile bank:** the fallen roof's tiles in a rubble slope against the wet side's foot. Before, the tiles floated
  in the air; now they lie on it, and sixteen broke on the walk under the gap.
- **One recent windthrow** on the wet side: a ragged pit still holding rain, with its plate slumped beside it.
- **Cushion moss in colonies:** many small cushions and a few big ones. They crowd on the mounds and in the wet, are
  few on the kept ground, and none grow on the way.
- **Rain stands level** in every pit deep enough to hold it, no higher than the lowest point of the pit's rim.

Everything on the ground now takes its foot from the same height: the boundary stones, the spirit house, the ferns, the
bones and the broken serpent head. The platform and the stair are set half a yard into the floor. The stair got its
cheek walls, so the serpents lie along them instead of floating. The keepers' coconut-rib broom lies where it slid off
the bottom step.

**The paint:**
- **The moss is its cushions.** Green shows only on the real cushions, each lit through its own normals, with leaves
  lying over the rims. So the moss thins cushion by cushion and never ends in an edge.
- **The leaves are the Hollow Wood's** (`litter_ground`: every leaf its own, five kinds by tree and age). Their drifts
  are placed by cause: deep in the pits, the hollows and the trench; thin on the mounds; a few autumns' worth on the
  kept ground.
- **The kept ground's young moss carpet** is covered more and more past the stones, each leaf deciding for itself,
  until only the cushions hold out.
- **Bare wet earth** on the worn way, in the trench, and on every bank too steep to hold leaves.
- **The water is dark with tannin.** The far bank's dark shows along the pool's far edge and the grey sky nearer; a
  dark band marks the wet edge, and a few leaves float.
- **The unswept stair:** leaves lie on every tread, drifted into the back corners and against the walls of the walk,
  where the occlusion says the wind can't reach.
- **The canopy:** the giants stand back from the kept ground, so under them the light falls off by a third. That is
  the floor's broad light shape.

**What failed on the way:**
- **Moss chosen by a noise threshold** made big green and brown islands with hard edges. That is camouflage again,
  pass 1's failure a size up. Fixed by tying the moss to the real cushions.
- **The litter generator's own drifts** (its noise) left patches of bare dark humus a yard or two across. Under this
  overcast they read as flat brown, the barren floor Derek ruled against. Fixed by passing in a drift map by cause
  (`litter_ground.paint(drift=...)`). Its defaults are unchanged, checked pixel for pixel against the committed
  version.
- **Its small moss flecks** in the humus read as green specks once the cushions were real. They are off here
  (`flecks=False`).
- **The pit's outline from sine lobes** came out as a symbol (a heart, a bat). Replaced by noise round the rim.
- **A rubble formula lifted every hollow** on the map to a third of its depth. It was caught because the pit's water
  sat at -0.08 yd instead of -0.23.

**The value-only test passes for the floor:** with the colour gone, the mounds, pits, pool and cushions hold as form.
The temple's walls still break into blotches, in value as well as colour.

**Grade:** the floor B+; the piece still **B-**, but its form line now passes. **Next worst:**
1. the stucco walls, whose losses still read as camouflage in colour and in value;
2. the stair's readability;
3. then the giant trees and the drizzle.

## Rules check, 2026-10-08 (2nd since Derek's last word), then pass 8: the walls

**Read:**
- `MASTER_RULES` (unchanged since pass 7's check).
- The area page's temple ("whitewashed brick under stucco"; the keeper's account; "the boards from the back of the
  temple" went into the palisade).
- Chapter 09: stucco "cracks, bellies and drops in sheets, baring the red brick beneath in irregular continents. The
  edges of what stays are rounded and grey-black with lichen"; moss on the tops of things, algae on the shaded sides,
  streaks down from every lip.

**Pass 7 against the checklist:**

| Line | Pass 7 |
|---|---|
| 1. Brief | Passes (the unswept stair) |
| 2. Scale | Passes |
| 3. Form | Passes (the floor's real height; the serpents on their cheek walls) |
| 4. Light | The warm candle is still missing |
| 5. Values | **Fails on the walls.** The whitewashed walls are no lighter than the floor, and they break into blotches, so the biggest light shape in the piece doesn't read |
| 6. Ramps | Passes |
| 7. Paint | **Fails on the walls.** Their losses are decided by a noise threshold at the scale of yards (the camouflage trap of passes 1 and 7); the dark streaks are noise; the shutters are flat black slabs. The roof's checker of repair tiles still fails |
| 8. Contact | Passes on the floor; the walls' feet don't show the damp |
| 9. Detail | The stair's readability is still short |
| 10. Life | Not yet (in the game) |
| 11. As the player sees it | Passes for the trial |
| 12. Skeptic round | Beside the ruins scene, whose walls read as stone first and damage second, these read as damage first |

**The worst failure:** the walls (values and paint).

**Pass 8: the walls, by cause** (`paint3d.wall_maps`, `brick_tone`, `lacquer_paint`).
- **The whitewash leads the values.** Lime holds the light, so the walls take a step above stone at the same light:
  they are now the piece's big light shape, ahead of the roof. They lie in flat tones shaped only by long vertical
  stains, with no fine grain and a narrow dither band (`tone(band=...)`). The first try stippled the whole plane,
  because a flat wall's light sat between two ramp tones.
- **The losses by cause** (chapter 09):
  - **Rising damp** at every wall's foot. Its line wanders slowly along the wall and is ragged at a hand's scale. A
    few islands of plaster still hold inside it. A pale salt tide sits just above it, where the damp dries out.
  - **The exposed edges first:** corners, jambs and window reveals, where the form turns sharply. A column's roundness
    doesn't count; the first try striped the columns like candy canes.
  - **Run-off under each sill:** a tongue of loss and grey streaks hanging below the shutters.
  - **Settlement cracks** from some windows' lower corners, wandering down and outward, with the sheet beside each one
    dropped. These are the irregular continents.
- **Each loss is real at its edges.** The plaster's broken top edge catches the sky as a lit lip, and its lower edge
  throws a thin shadow on the brick. Grey-black lichen rims everything that stays.
- **The brick by the course:** every brick its own small step of tone, a few burnt dark, a few gone to the hollow
  behind them.
- **Algae** is a film on the damp, thickest at the foot and on the faces the light never reaches, dithered where it
  thins.
- **The shutters and door** are black lacquer over teak, flaking in islands to the grey wood (more toward the foot).
  The gilt survives only in an inset border and a lozenge, in the upper part the eaves protect.
- **The walk and the treads** are trodden plaster, grey with grime, never whitewashed. The first try was near-white,
  and its leaves read as dirt on snow. The keepers' track from the stair to the door is worn through to the brick.
- **Two new data passes** from Blender (`blend_scene.sky_passes`), a second render with the same camera and about 2
  seconds:
  - **shelter**, from a sun straight down: what the rain reaches. Moss on tops now grows only where the rain falls.
    The walk under the eaves is dry, with leaves blown in.
  - **skyview**, the occlusion out to 12 yd: how much of the overcast each surface sees. The hall's inside through the
    broken roof and the depth of the porch go dark. A first version cast a ray per pixel from Python and took 65
    seconds; the render does it in 2.

**Value-only:** the walls' whitewash leads the roof, the walk sits between them and the floor, and the floor is darkest.
The groups read.

**Grade:** the walls B+; the piece **B** (up from B-). **Next worst:** the roof. Its rust-repair tiles and missing tiles
are a checker of square patches that reads as a pixel grid, and it is the biggest shape in the frame. Then the stair,
the giant trees and the drizzle.

**Rules check paused** (2026-10-08): the third reminder with no word from Derek, so by his pause rule the reminder is
off until he next writes. Pass 9, the roof, is next when work resumes.

## Rules check, 2026-10-09 (Derek: "Yes, continue"; the reminder restarted), then pass 9: the roof

**Pass 8 against the checklist:**
- Lines 1, 2, 3, 6 and 11 pass.
- **Values (5) and paint (7) fail on the roof,** the biggest shape in the frame. Its rust repairs were blocks chosen by
  low-frequency noise over the tile grid, and its missing tiles were single dark squares spread evenly: a pixel
  checker, and the camouflage trap again at the scale of tiles.
- **Light (4):** the candle is still missing.
- **Detail (9):** the stair is still short.
- **Life (10):** in the game, later.
- **Skeptic round (12):** beside the ruins scene, its roofs read as fabric worn by weather; ours read as a grid.

**Pass 9: the roof by cause** (`paint3d.roof_paint`, `roof_runs`, `roof_fall`). Every tile is its own, and each knows
how far down its slope it lies.
- **The water's runs:** whole columns of tiles are stained from where the water gathers down to the eave.
- **The keepers' repairs:** runs of unglazed tiles along one course where a leak was, two to five tiles long, never a
  block.
- **The tiles gone** cluster round the fallen stretch and along the eaves, rare elsewhere. Each hole shows its batten
  over the dark of the hall.
- **The moss** grows from the eave up, where the water slows and the debris lodges, and along the runs. The steep upper
  courses shed it.
- **Leaves lodge only in the lowest courses,** against the eave's lip. The first try scattered them up the whole slope,
  where a steep glaze can't hold a leaf, and they read as rust spots.
- **The glaze sits a step darker,** so the whitewash leads.

**Grade:** the roof B, the piece **B**. **Still short:**
- the moss in the lower courses barely separates from the glaze;
- the missing tiles are still plain dark slots.

**Next worst:** the stair's readability. Then the giant trees and the drizzle, the guardian and the candle.

## Rules check, 2026-10-09 (1st since Derek's last word), then pass 10: the stair

**Pass 9 against the checklist:**
- Lines 1, 2, 3, 5, 6 and 11 pass.
- **Detail (9) fails on the stair:**
  - its treads were green with moss, though the keepers swept it every morning until they died;
  - treads and risers sat at one value, so the steps didn't read;
  - the serpent rails were plain pipes, where the lore has "its heads rearing at the foot";
  - the front boundary stone stood in the middle of the stair (a placement bug: it was put on the axis).
- **Light (4):** the candle. **Life (10):** in the game.
- **Skeptic round (12):** beside the pit of offering's carved approach, the stair is the weakest thing at the hero's
  feet.

**Pass 10:**
- **The treads** are swept stone, worn pale and smooth, lying in flat tones over the dark of the damp risers, so the
  stair reads as light treads over dark. The unswept leaves lie on them. Moss grows only in each tread's back corner,
  after a season or two.
- **The serpents:** a crest of low blade fins runs down each back. At the foot the neck rises into five heads fanned
  from a hood, the middle one highest. The broken side's hood lies in the mud with three heads still on it and one
  jaw snapped beside.
- **The front boundary stone** stands to the side of the worn way.
- **The floor mesh** is widened, so a view centred on the stair has ground to its edge. The first close view showed a
  black void.
- **A close view of the stair** (focus 9, 0) with the Ossuarch at its foot now sits on the review page beside the
  trial's frame. The rearing heads stand just outside the trial's frame.

**Grade:** the stair B, the piece **B**. **Still short:**
- at this size the five heads read as a grey knot, not a fan;
- they need the hood's glass mosaic glints and gilt in the recesses (the brief) to read as ornament.

**Ten passes done.** The piece is not shown as finished: the candle (the warm light, line 4), the giant trees, the
drizzle and the guardian still fail.
