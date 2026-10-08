# The Blind Face (tools/art_study/blind_face.py), the Hollow Wood

Derek (2026-10-07): "so far all we really have is old growth right. i know when you generated the map there were
stumps all grouped up and a lot of small trees and it looked bad. so first, lets just get another unique old growth
scene made."

## Rules check, before the rebuild (written late: it was skipped before pass 1, the failure that caused the reused pieces)

**Read for this piece**, and the line from each that shapes it:
- **Hollow Wood lore:** the trunks are the god's veins stood up pale, running downhill and joining north. The
  woodcutter's eleventh trunk bled. There are fungi in three colours, white caps on flat stones on Flat Days, and the
  Blind Face.
- **`ecosystems/old_growth_forest.md`:**
  - every age at once;
  - gaps are the heartbeat;
  - dead wood is half the forest (snags with bracket tiers, logs in five decay classes, nurse logs, pit and mound);
  - the floor is in layers (litter, fermentation, humus), drifting against things and thin on mounds;
  - fungi fruit on the dead;
  - no animals, so the dead are only softened.
- **`ecosystems/README.md`:** rays only with a low light, an opening and something in the air. Every object
  exports cover, material and hp.
- **`LIVING_LANDSCAPES.md`:** causes first (falls, pits, gaps), then the light and wet maps, then the floor read off
  them. Nothing painted as a surface.
- **MASTER_RULES:**
  - §0 FORM IS LAW, with the depth effect: height into the world at 0.04 yd, `selfshade=False`, the value-only test;
  - §2b.3: every object is a new design for this scene;
  - §2b.6: the ground is a world-position generator;
  - §5: towering trees, small ones dead, open corridors;
  - sap is dark blood;
  - more of the god in every place, here kept subtle (Derek).
- **Chapter 1:** detail is history; correlated variation; edges carry it, interiors stay calm.
- **Chapter 2:**
  - age reads at the edges (fresh pale breaks on dark rinds);
  - lichen size reads as age;
  - cause masks (rain, water path, burial).
- **Chapter 3:** veins wander and fork in Y's with cross-links, never a perfect tree; dried vessels are black-brown
  threads. This is for the roots and the vein-ridges.
- **Chapter 4:**
  - stone as tilted planes with planar chips and a bevel, never domes;
  - three tones for a 10 px stone;
  - a contact seam;
  - normals never blurred;
  - the edge pass.
- **Report 1:**
  - build from the real thing, not imagination;
  - sink things into their ground;
  - one rule for the whole place;
  - true-scale small things need quiet ground and light;
  - variety means species, not one stamp.

**Line by line, now:**
- **Reused (fails 2b.3), all to be replaced:**
  - the engine's snags with their brackets;
  - the stump;
  - the rock;
  - the logs (fallen giant and hump);
  - the floor litter, the old wood tiles' generator.
- **Form law:** the vein-trees and roots pass. The floor fails: litter is painted colour on a smooth sheet.
- **Ecosystem causes:** the fall has no pit and gap logic of its own, there are no nurse logs, and the floor's layers
  are not derived from this glade's light and wet. All fail.

## The brief for the rebuild (each piece new, form first, in this order, one at a time)
1. **The woodcutter's stump:**
   - a vein-tree cut at knee height: the fluted section shows in its cut face (ridges as lobes, dark heartwood
     veins);
   - the axe's notch faces and the wedges left in it;
   - dark blood weeping from the cut and run down the flutes (the blood effect);
   - a chip pile at its foot.
2. **Flat stones with white caps (Flat Day):**
   - a few flat slabs of the Wood's own stone, built as tilted planes with chips (chapter 4);
   - lichen sized by age;
   - small white caps set on them by hand, a real custom.
3. **The decayed vein-tree snags:** dead vein-trees, the bark sloughed off the ridges first, grey bone-hard wood,
   broken tops. Bracket tiers on the shaded side, new for this wood, fed on what the god carried.
4. **The three fungi:** grey (eaten), and two that glow (left alone), each its own form and its own host (log, root,
   snag).
5. **The fallen giant:**
   - a vein-tree log, its flutes along it;
   - its root plate on edge, torn from the braided roots, so the cords hang broken;
   - the pit and the gap of light it made;
   - a nurse row of seedlings on an older log.
6. **The floor:**
   - derived from the light and wet maps;
   - litter as real height (drifts on the windward side of logs, deep in the pit, thin on mounds);
   - humus dark in the lows;
   - moss on class 3+ wood and at the feet of giants;
   - the roots breaking through;
   - painted from world position.
7. **Then the Blind Face itself:** brow, cheekbones and a half-open mouth carved into the bark as height, the eyes
   healed smooth. Subtle: it is seen, not announced.

Lore read: the Hollow Wood's trunks are the god's veins stood up as pale trees, running downhill and joining, all bent
toward the north where the Root Deep opens; every tenth trunk holds something the god was carrying; the woodcutter's
eleventh trunk "ran red down the blade and warm over my wrists"; luminous fungi in three colours (the grey good in
broth, the other two left); Flat Days, white caps laid on every flat stone; the landmarks the Ribcage Bough (used by
Cap Hollow), the Blind Face, the Niche Candle (the church's candle tree is too like it), the Sword-in-Root. Chosen:
THE BLIND FACE, a giant grown a vast face in its bark, no eyes, the bark healed smooth over them.

1. The glade designed, not scattered: six giants (the Blind Face's at the back, 1.3 yd girth), two of middle age far
   back, two dead snags, one cut stump (the woodcutter's), the fallen giant with its plate, one old moss hump, no living
   saplings, open corridors. The shared pale bark fixed for a fresh log (it had no centre).
   Graded (1): old growth at once: pale trunks towering out of frame, an open glade under a moonbeam, no clumps, no
   crowd of small trees. The Blind Face's tree still plain bark; the fallen giant out of frame.
   Derek: "you are reusing assets in this scene, against the rules" (MASTER_RULES 2b.3: every scene's objects are new designs; shared materials such as the bark stay in one place).
2. The vein-trees (landkit vein_tree.py, this scene's own): fluted trunks, vein-ridges up their whole height (each tree its own count and angles), buttresses flaring along the ridges, root cords from the downhill buttresses running north and steering to braid into the next tree's; the canopy light from these trees. Graded: the fluting and buttresses read; far too dark (the canopy recomputed too dense); the roots not reading yet. Still reused, to replace next: the snags with their brackets, the stump, the rock, the floor's litter, the logs.
   Graded (3, after the fix): the vein-trees pale, fluted, buttressed (the bug: the trunks had been written into the resting ground, so the bark measured up from 17 yd and painted them all in the canopy's dark).
   Derek: "i want this part to be dark and grimmer, older, with the god aspects showing up subtly".
4. Darker, grimmer, older: one tree in five weeping (the god subtle), canker and lichen thick on the old; no green on the floor; a grim grade (colour drained toward ash and umber, the night deep, light only where the moon and the lantern reach).

## Piece 1: the woodcutter's stump (`tools/landkit/vein_stump.py`)

**Rules check, before pass 1:**
- **Read:**
  - chapter 5 (written for it): notch, back cut, hinge splinters, axe facets as planes, checks, weathering, the
    lumens;
  - chapter 4: facets, not domes;
  - chapter 1: wrought iron (the wedge);
  - the blood effect (`landkit/blood.py`);
  - the old-growth chapter (stumps among the dead, fungi on them);
  - report 1 (sink into the ground; small things on quiet ground in light).
- **New design:** yes. Nothing borrowed from the engine's stump. The vein-tree's own ridges give the section (same
  species, same shared code), and the bark is the shared material (`bark.py`).
- **Form:** every facet, check, splinter, bore, wedge and chip is height in the world.
- **Cause:** the tree was felled toward the glade, so the chips lie on that side. Blood is traced downhill on the
  real surface.
- **Scale:** cut at 0.6 yd (knee height on the 2-yard hero), girth 1.6 yd across the flare.

**Passes:**
1. Built from chapter 5. **Graded F:**
   - clamping the vein-tree's tall flare at the cut made a flat cream shelf toward the hero, one white blob in the
     value test;
   - the blood trace stuck on the face and pooled there in bright red blobs (the report's "ketchup");
   - the facets were too small to read;
   - the wedge was lost.
2. The stump's own modest flare (a shoulder into the roots, never a shelf). Bigger, steeper axe facets (0.24 x 0.55
   radii, up to 20 degrees). Normal blur 0.6. Blood thinner and darker, pooling only on the ground. **Graded D:** it
   reads as a stump (the low notch ledge, the higher back cut, checks, the ragged hinge), but it's the brightest
   thing in the frame, cream, and the pool is a round blob.
3. Greyer (the cut face ramp scaled down), chips darker, the wedge bigger (25 cm, as a real splitting wedge), the runs
   wider, the pool smaller. **Graded D+:** grey and sitting in the scene. The lantern-lit lobe still saturates flat.
4. Highlights rolled off (`0.9 * (1 - exp(-1.4 v))`) so a lit facet keeps its tone. Bores bigger (2 px), the wet
   ones dark wet red with a glint where they well. The pool held dark (light capped, depth scaled). **Graded C-:** the
   runs show as thin dark-red lines down the flare to the foot; the lobe has facets. Found white specks at the
   bottom right: the engine's mushrooms (reused).
5. The engine's mushrooms, grass and ferns turned off (new `GRASS`/`FERNS` switches in `wood_scene.py`, default on, so
   other scenes keep theirs). **Graded C:** the glade is darker and older. The stump reads at knee height beside the
   hero. Value test: lit top, lit lobes, dark flank, solid. Still failing: the hinge splinters and the wedge don't
   read, the pool is a dithered block, and the engine's moss sits round the foot (the floor, piece 6).
6. The top simplified to three planes (chapter 4: a face about 30 px wide holds three tones): bigger facets (0.36 x
   0.8 radii) at gentler tilts, three checks plus the split, the hinge raised into a crest of torn fibre (the stump's
   highest edge). **Graded C:** the notch face, the hinge crest and the back cut read; the wedge's rust shows. The
   flare lobes toward the lantern are flat cream sheets.
7. Bark darker, fissured along the grain up the flare, plates sloughed to grey wood, the litter banked over the foot
   (deeper away from the moon). **Graded C:** contact made; the lobes have grain.
8. Sapwood ramp greyed (it read as moss). **Graded C.** Value test passes: lit top, lit lobes, dark flank.
9. The loop, 24 frames: no shimmer on the facets. The lantern breathes, the moonflecks move, the blood churns faintly.
   **Graded C:** alive and stable.
10. **Skeptic round** beside the vein-trees and the Gate's eye (B+). The worst difference: the story's small parts
    (the bores, the standing wedge) are about 2 px at true scale, so the stump reads as "a stump with blood" and not
    yet as a vein cut open. Next: the bores as a ring of dark mouths a pixel larger, with a lit wet lip; the pool
    soaked into the litter, not a dithered block. **Graded C overall.** Shown to Derek for his grade.

**Rules check (reminder, after pass 10, waiting for Derek's grade):**
1. **Brief:** yes. The woodcutter's eleventh trunk that "ran red down the blade" is the piece's one true detail.
2. **Scale:** knee height (0.58 yd) beside the 2-yard hero.
3. **Form:** passes. Every facet, check, crest, bore, wedge and chip is height; the value-only test reads solid.
4. **Light:** moon and lantern, both casting.
5. **Values:** three planes on the top, a dark flank.
6. **Ramps:** grey, sap, bark and iron are hue-shifted, but only 6 to 8 tones.
7. **Paint:** the pool is a dithered block. It fails "pooled wet edges".
8. **Contact:** litter banked over the foot.
9. **Detail where it counts:** **fails.** The bores, which carry the story, are about 2 px.
10. **Life:** the loop is stable.
11. **Seen as the player sees it:** yes, the game camera with the Ossuarch.
12. **Skeptic round:** done (pass 10).

**Worst failure first: line 9.**
11. The bores widened (2 to 3 px), each with its wall rolled out into a lip (height) lit dark red where wet, brown
    where dry. The blood soaks in at its edges (alpha by depth) instead of sitting as a block. **Graded C+:** the
    wet bores read as red mouths on the cut.
    **Derek: "Looks good."** The same diligence for every next piece. Also: the eyes on the trees overlap, and they
    should not; they should have the big eye's three-dimensional blinking quality, "true for basically any organic
    stuff".

## Piece 2: the eye tree (Derek, 2026-10-07)

"Put an eyeball on at least one of the trees ... weeping bloody sap"; "if you're going to put eyeballs on a tree they
need to be spaced out pretty well. So like maybe two eyeballs oriented differently on the tree, bulbous, slowly slowly
blinking or looking around and/or both"; earlier: the bark's eyes "overlap and they shouldn't ... that same
three-dimensional blinking quality ... true for basically any organic stuff."

**Rules check, before pass 1:**
- **Read:**
  - the lore ("every tenth trunk holds something the god was carrying"; the trunks are its veins);
  - the eye's record (`organic_notes.md`, `eye.py`, approved B+);
  - chapter 3 §4 (veins, pustules);
  - bark.py (sap is dark blood);
  - report 1 (sink a thing into its ground: "a thing set on the ground read as a helmet").
- **New design:** the approved eye (a shared organic part, kept in one place), placed by this scene's own design on
  one vein-tree. The shared bark's random weeping sockets are off in this scene, so nothing overlaps. The shared
  bark itself now refuses overlapping scars (`bark.py`), and its weeping sockets carry the 3D eye in every
  wood-engine scene (`wood_pale.tree_eyes`).
- **Form:** each eye a ray-cast ball with lid shells and cornea, sunk into the trunk so only its bulge stands out.
- **Life:** each blinks slowly at its own time, and its gaze wanders.
- **Brief:**
  - one vein-tree at the glade's right;
  - two eyes, low (3.4 yd) turned left and high (6.3 yd) turned right;
  - 0.3 to 0.36 yd radius (bulbous on a 2-yard trunk);
  - bloody sap weeping from each lower lid down the bark, fresh near the eye and crusting lower;
  - a stain soaked into the bark round each socket.

**Passes:**
1. Two eyes on the vein-tree at the glade's right: low (2.4 yd, R 0.36) turned left, high (4.5 yd, R 0.3) turned
   right (6.3 yd was out of frame). Each blinks once a loop at its own time, its gaze wandering across and up and down.
   Four sap runs from each lower lid, and a stain round each socket. **Graded D+:** they read as dark red domes. The
   lid shell stood proud like a cap, the aperture was too narrow to show the white, and the canopy's dark plus the
   grim grade crushed them.
2. Sunk to 0.72 R (the lids grow out of the bark, only the bulge stands out); aperture (1.0, 0.7); ambient 0.24.
   **Graded C:** they read as eyes, iris and jaundiced white between fleshy lids, weeping down the bark.

## Piece 3: the mouth hollow, and piece 4: the Niche Candle (Derek, 2026-10-07)

"On a different tree, create a mouth that looks like a hollow. And then I want some candles inside the hollow of
another tree with depth so you can see it glowing."

**Rules check, before pass 1:**
- **Read:**
  - the lore: the Wood's landmarks include the Niche Candle (so the candle hollow is that landmark) and the Blind
    Face (the face tree stays for later);
  - the old-growth chapter: snags holed, crumbled hearts, foxfire in the softest dead wood;
  - chapter 5: heart rot hollows a trunk and woundwood rolls round every wound;
  - report 1: form first, the eye's ray-casting method, and "light must ADD".
- **Real thing:** a tree hollow begins where a limb tore off and heart rot got in. The tree grows **woundwood**
  round the opening: smooth rolled lips of new bark, folding in over the edge, which is what makes hollows look like
  mouths. Inside is soft punky brown rot, darker with depth. Candles in a niche leave wax runs over the sill and soot
  on the roof above the flames.
- **New design:** `landkit/hollow.py`, a ray-marched cavity (a height field can't carve sideways into a trunk).
  It's one shared piece for every hollow: the mouth (wide, its lower lip sagging, the throat dark, a wet red gleam
  deep at the back, the god subtle) and the niche (tall, a floor, candles with wax runs, the flames lighting the
  inside and spilling out).
- **Form:** the lips are a rolled tube (real geometry), the cavity a real ellipsoid with depth, the candles real
  cylinders. All lit through their normals.
- **Light:** the moon dims with depth into the cavity; the candles are point lights inside, and one light just
  outside the mouth of the niche warms the bark and the floor (the engine's `LIGHTS`, cast with shadows).
- **Life:** the flames flicker, and the glow breathes with them.

**Passes (mouth and niche, landkit hollow.py):**
1. First build. **Graded D:**
   - the mouth sat behind the left foreground trunk and was hidden;
   - the niche was small but glowing.
2. The mouth moved to the great trunk at the right edge; the niche bigger (five candles), its spill light 1.6 yd.
   **Graded D:** the niche faced away from the camera, and the mouth was seen edge-on.
3. Both face the camera, leaning a little into the glade. **Graded C-:**
   - the niche reads: an orange glow deep in the trunk, the candles, the woundwood rim;
   - the mouth reads as a knothole: dark lips, black inside.
4. The mouth wider, its lower lip sagging (1.45), the woundwood thicker and pale like the bark (lit by the moon), the
   rot lit at the rim and dark deeper in, a red gleam in the throat. **Graded C:** a mouth, but it ran off the
   trunk's edge (a flat face on a round trunk).
5. The hollow's frame wraps round the trunk's cylinder (`axis`, `rc`).

## Derek: "no tree is a perfect tube" (2026-10-07). Chapter 6, old-growth trunks
Studied: Douglas fir (bark up to a foot thick, deep furrows between great ridges joined by cross ridges), taper and
butt swell, spiral grain (it grows with size; in the genes and driven by the wind), fluting in redcedar and spruce.
Built:
- `vein_tree.Warp`: each trunk a column warped by height (butt swell, a slow taper, swellings, a wandering axis
  with lean and sweep, a twist of 3 to 8 degrees a yard, each tree its own);
- 9 to 16 bark channels cut into the column, which the twist winds round the trunk;
- the engine's new `TRUNK_WARP` hook (cast and normals);
- the eyes and hollows carried out through the warp, their facing chosen in the world.
**Graded C+:** every trunk swells at the foot, wavers along its outline, sweeps off true and carries its channels
up. No tube left.
6. The hollows: the cavity's visibility tested where the ray enters the opening, not at the rot behind the bark.
   **Graded C:** the niche glows deep in its trunk, warm light spilling down the bark; the mouth is a wide dark
   mouth, still somewhat side-on.

## Piece 5: the bones (landkit beast_bones.py)
**Rules check:**
- **Lore:** the game has no animals, and the lore never names these. The Burnt Heath's "great horned carcasses lie
  in a ring facing the same way". The Hollow Wood's hunter: the dead turn their heads "toward the ring ... the ground
  takes them the way a sleeper pulls the blanket up". So each lies skull to the north, truer and sunk deeper the
  older it is, and the small bones go first.
- **Form:** ray-cast true forms on the shared bone (bone.py's tube and skull, its weathered surface): skull, muzzle,
  horns, a vertebra chain, collapsed ribs, long bones.

**Passes:**
1. Four beasts round the glade (ages 0.15 to 0.9). **Graded D+:** the horns spread like arms, so they read as tiny
   human skeletons; the near set was lost in the busy litter.
2. A beast's long muzzle; horns thicker. **Graded D+:** the horns hung down like arms.
3. Horns spread wide to either side, tips curling forward and up (the classic horned skull); the skull bigger.
   **Graded C-:** a horned beast's skeleton, read at a glance in the moon. The near set waits for a quieter floor.

## Piece 6: the floor, "a little fen-like" (Derek)
**Rules check:**
- **The old-growth chapter:** wood going into fen becomes **alder carr**; the ground goes wet and the trees thin onto
  root-islands. Pits fill with water, moss maps the wet and the still. The ecosystem README's wetlands chapter
  covers fen and carr.
- **Real fen and carr:** peat, black and wet; sedge **tussocks** standing as mounds; **sphagnum and brown mosses** on
  the hummocks; still black water in every hollow, lying level; leaves matted dark into the wet.
- **Depth law (0.6):** the hummocks and tussocks are height in the world (0.04 yd grid). The water is levelled flat
  at its own table. The colour is given only as material (`selfshade` off). Everything standing on it (the stump,
  the bones) takes its ground from the same height.
- **New design:** `landkit/fen_ground.py`, a world-position generator, so no two yards are alike. It replaces the
  engine's reused litter tiles in this scene.

**Passes (fen floor):**
1. Peat, matted leaves, sphagnum, tussocks (height), pools levelled at each one's own rim, the moon on the water.
   **Graded D+:** reads as fen, but the moss is too green and blotchy (camouflage), the moon's sheen draws as scratch
   lines, and a pool lies under the pilgrim's feet.
2. Brown mosses dulled by night with ragged cushion edges; leaves matted in broken small patches; the sheen broken;
   firm ground round the pilgrim. **Graded C:** dark wet carr under the giants, still black pools catching the moon.
   The engine's falling leaves and moonflecks still play over it.

**Rules check (reminder, the whole scene after pieces 1 to 6):**
1. **Brief:** each piece carries a lore detail:
   - the eleventh trunk;
   - the Niche Candle;
   - the hunter's dead lying head to the north;
   - trunks as the god's veins.
   The Blind Face itself, the scene's own landmark, is not built yet.
2. **Scale:** the 2-yard hero beside the stump, the bones and the trunks.
3. **Form:** trunks, stump, eyes, hollows, bones and fen relief are all geometry. The engine's falling leaves and
   moonflecks are still the old scene's living layers (2b: animation is an asset too). To be made this scene's own.
4. **Light:** moon, lantern, the niche's candles.
5. **Values:** the dark giants frame the moonlit glade.
6. **Ramps:** hue-shifted.
7. **Paint:** the water's sheen is good; the moss edges are ragged.
8. **Contact:** the bones sunk, the stump banked.
9. **Detail where it counts:** **fails.** The mouth is side-on, and the near bones are lost.
10. **Life:** blinks, gaze, flames. Not checked as a loop since the floor changed.
11. **Seen as the player sees it:** yes.
12. **Skeptic round:** against the Gate (B+ eye). The mouth is the weakest organic piece.

**Ten passes:** no piece has had ten except the stump. They continue.

**Worst first:** the mouth faces us.

## Piece 7: the Blind Face (the scene's landmark)
**Rules check, before pass 1:**
- **Lore:** the Hollow Wood's landmarks are "the Ribcage Bough, the Blind Face, the Niche Candle, the
  Sword-in-Root". The brief from the scene's start: one giant has grown, over centuries, a vast face in its bark
  (brow, cheekbones, a mouth half open) and no eyes, the bark healed smooth where they should be.
- **Real thing (chapter 5, chapter 6):**
  - bark grows round anything it is pushed over: stretched smooth and pale over a bulge (as over a burl or a healed
    wound), fissured deep in the hollows between;
  - woundwood lips round any opening.
  So the face is grown, not carved: the fissures flow round its features.
- **Form:** relief on the warped trunk, ray-marched in the trunk's own canonical frame (through `vein_tree.Warp`),
  so it sits exactly on the bark. Brow, cheekbones, nose ridge, chin and lips are proud; the healed eye-hollows are
  shallow; the mouth is a real cavity.
- **Light:** raking. It faces a little toward the moon's side (world +y, screen lower left) so the moon slides
  across the relief. The canopy above the face tree is broken (a stag-headed giant whose crown died back), so
  moonlight reaches it.
- **The god, subtle:** under the healed eyes, the faint blue-grey of veins beneath the bark (chapter 3 §4), and a
  wet dark gleam deep in the mouth.
- **Scale:** chin at 0.9 yd, brow at 3.1 yd: a face taller than the pilgrim, within frame on the far tree.

## The pools become blood, with wisp-fire (Derek, 2026-10-07)
"Your water could definitely use a lot of work ... I want the puddles here to be blood ... I like the depth, but
instead of the black water, let's make it dark blood with the occasional wisp of white fire flaring up."
- **Read:** the lake test (`shaders/lake.gdshader`, the painted standard's origin):
  - the pigment pooled dark at the wet edge;
  - light broken into brush dabs;
  - for blood: clots drifting, a skin that wrinkles slowly, a duller, heavier gloss.
  Also the game's blood (`blood.py`, `shaders/blood_pool.gdshader`) and MASTER_RULES 6 (no red light).
- **Built:**
  - `fen_ground.paint` lays the pools in the shared blood effect: depth from each pool's distance to its rim, a
    dark wet edge, drifting clots, a slow wrinkling skin, the moon in it as broken dull dabs, and the shore's lip
    stained;
  - `landkit/wisp_fire.py` (new effect): a cold teardrop flame, white core and pale blue-white body, torn at the
    tip, dithered only at its border; it flares, burns about a third of the loop, and dies. It throws a faint cold
    glow on the blood and a broken reflection. Seven of them over the deepest blood, each at its own time.
- **Graded:**
  1. **D+:** blood too bright and red near the lantern (the "ketchup" failure).
  2. Held dark (light capped at 0.38, depth at half). **C:** dark blood, clots and dull moon dabs. The wisps read
     as wisp-fire, one or two burning at a time across the loop.

**Passes (the Blind Face, landkit bark_face.py):**
1. Relief on the giant at the back, ray-marched in its canonical frame:
   - a frowning brow, healed eye-hollows, cheekbones, a nose ridge, a mouth half open (a real cavity) with heavier
     lower lip, a chin;
   - the trunk's channels stretched smooth across the face, fissures only in the hollows;
   - blue-grey veins under the healed eyes;
   - self-shadowing under the moon;
   - the canopy above opened (the crown died back).
   **Graded D+:** a face, but in profile on the trunk's edge, too small and too dark to read.
2. Turned toward us (62 degrees), larger (2.1 x 2.7 yd), relief 1.5 times bolder. **Graded C+:** the scene's
   landmark reads at a glance: a vast eyeless face in the bark at the glade's back, brooding over the clearing, the
   moon raking across its brow.

## Night, a gentle breeze, a very light rain (Derek, 2026-10-07: "an animated image of this scene at night with a gentle breeze blowing and a very light rain")
**Rules check:**
- **MASTER_RULES 8.4** lists rain rings among the effects still to build; 2b.0 says weather is an asset like any
  other; section 6 gives the effects method (whole pixels, a short ramp, lit by the scene, no glow for its own sake).
- **The real thing:** light rain at night is nearly invisible. A drop shows only where light catches it, as a short
  slanting streak (its fall in the eye's moment): in a lantern's pool, a moonlit gap, near a candle. Drops slant with
  the wind. On still liquid each drop rings (flattened by the view); on ground, a flick.
- **Built:**
  - `landkit/rain.py`: fixed drops in a volume, each falling three times a loop (seamless), slanting with the
    breeze; lit by the lantern, the niche's candles and the moon where the canopy opens; dark air shows nothing;
    every drop hidden by whatever stands nearer; rings opening and fading on the blood pools, the far rim catching
    the light;
  - the breeze made gentle for this render (`gentle_gust`: a soft breath, a mild swell instead of the full gust).
  - Run: `python blind_face.py OUT.webp rain`.
- **Graded (still):** C. The streaks show faintly in the lantern's pool and the gap, so the rain reads very light,
  as asked. Brightened a little for motion.
- **Derek: "weather happens in the world, not on the world."** Now MASTER_RULES 6, and remembered.
  The rain rebuilt:
  - **canopy shelter:** the open gap gets the fine rain; under the giants only sparse, heavier drips;
  - **every drop lands somewhere and acts there:** a ring on the blood, a crown of beads on ground, stump or bone
    (only where lit), hidden when it lands behind something;
  - **`rain.wet`:** the rained-on world a little darker, flat wet ground and tops catching the lantern warm and the
    moon cool in broken dabs, stemflow films down the trunks' channels with beads trickling down where lit (the face
    and the eyes wet too);
  - **dry inside:** the hollows (mouth, niche) are drawn after the wetting, so they stay dry.
  **Graded (still):** C+. Water runs down the Blind Face's brow, the drops show in the lantern's pool and the gap,
  the ground is darker with wet.

## Piece 8: the flat stones with the white caps (Flat Day)
**Rules check, before pass 1:**
- **Lore** (`12b-codex-interviews.md`, `11-codex-voices.md`):
  - the hunter: "The holy days are the Flat Days, if they come, when the ash at the ring lies still and the Wood
    leans east. Nobody hunts. The pickers put white caps on every flat stone. We sit in the doorways and wait for the
    lift";
  - a Wood voice: "The white caps hold a little light, the way a coal holds it under ash, and they mean the ground
    is sound. The blue ones grow over something hollow. Step round them. The red ones grow where the god is still
    bleeding underneath";
  - the Coldhearth voice disagrees ("the grey is good in broth, the other two you leave"). Voices disagree; good.
- **One true detail:** the caps are an offering, laid by hand, so they're placed as hands place things: a ring, a
  row, evenly. Never scattered. Each glows a little, like a banked coal.
- **Real thing (chapter 4, chapter 2):**
  - sandstone slabs split on their bedding;
  - the top a tilted plane, never a dome;
  - one to three planar chips, paler where fresh;
  - a bevel at the arris;
  - the bedding showing as bands on the sides;
  - sunk into the peat;
  - lichen rosettes sized by age on the dry top;
  - moss at the wet foot on the side away from the moon.
- **Form:** height in the world (the depth effect), so the stones cast and catch light; nothing painted on.
- **New design:** `landkit/flat_stone.py`, this Wood's stones. Only the shared sandstone ramp from rock.py is reused.
- **Placement by cause:** flat stones on sound, dry ground (no pools within reach), in the glade where pickers walk.
- **Weather:** they get wet in the rain like everything else.
- **Fungi to follow (piece 9):** red caps round the blood, blue over hollow ground, white on sound ground.

**Passes (flat stones):**
1. Three sandstone slabs (tilted tops, bevels, chips, bedding, lichen, moss at the foot); the caps laid by hand: a ring
   of six to eight on the bigger stones, a row on the small one, each a pale dome glowing a little. Pools kept off
   the stones. **Graded C-:** the slabs read as flat stones sunk in the carr; the caps read as small pale lights laid
   in a ring and a row (an offering, not a scatter). The near slab is a little bright and plain-topped.

**Derek on the Blind Face (pass 2): "The face needs a ton of work. Looks like the chad face."** He is right. It was
built as a sculpted human face, all of it a failure:
- symmetric smooth bulges;
- a hard horizontal bar of a brow and a square chin;
- graphic raking light.
A face grown in a tree is the opposite. Study first (chapter 7).

## The face scrapped; the altar (Derek, 2026-10-07)
- **Derek:** "Make it look like a withered, wretched moaning face ... Better yet, no face, scratch it from the lore too.
  Create an altar inside of a large hollow, many dripping red wax candles, wax pour out and into the blood, and the
  first hint of the blood tendrils creeping up the tree and a tiny amount on the others."
- **Done:**
  - the Blind Face is removed from the scene, from the wiki's landmarks (`02-world-and-lore.md`) and from the Hollow
    Wood's voice lines (`art/ui/voice.json`). `bark_face.py` is kept: removed things are kept. Chapter 7 (faces in
    trees, the study that followed "the chad face") stays as a study.
  - the scene file keeps its name for now; it needs a new one.
- **The lore Derek gave the place:** long ago the rituals to bring the god back up out of the earth were held here. The
  candles burn on and never go out, because their wax is the trees' red sap. Sap or blood? Nobody knows. What was the
  ritual, and did it fail, or succeed long ago, so that these tendrils are all that's left, a husk? Nobody knows.
  - Shown, never told:
    - the sap drips from the hollow's roof and sets into wax as it falls (the candles never burn down);
    - the tendrils are some fresh and wet, some dried to husks (growing, or the remains of what came?).
- **Built** (landkit `hollow.py` kind "altar"; `candle.py`; the scene):
  - a hero-sized hollow in the giant at the glade's back (Derek: "hero size"), 2.6 yd to its apex, 1.3 wide, the sill
    a step up, deep;
  - a pointed arch (Derek: "not round ... an arch at the top, pointed"): straight jambs and a lancet of 2.5 W arcs;
    the cavity follows the arch straight back;
  - a stone slab set inside, a spiral of runes cut in its top (Derek: "a spiral made of runes with a little bit of
    blood and bone stuck to it"), old blood dried in the grooves, flecks of bone stuck to it;
  - red candles arranged as a rite arranges them, then centuries of it (Derek: "ritualistic", then "randomize the
    arrangement a little more"): a broken ring round the spiral, tall at the back, uneven, gaps, stubs melted low; a
    jittered row before the slab; a few on the lip, their wax running down the bark below each (Derek: "a few burning
    on the lip ... with the wax dripping down the sides");
  - the red wax pouring out over the sill in curtains down the bark, into a pool of blood at the tree's foot, where it
    sets in skins and lumps;
  - a couple of candles on the ground outside, sparingly (Derek), each a small light;
  - above the arch, two eyes shut (Derek: "just the eyelids facing shut, made of wood ... eyes that have closed, with
    bloody wax tears dripping from them"): almond lids of wood met in a sagging seam, a crease above, a shallow socket,
    the inner corners lower, red wax tears running from them toward the arch (bark_face's grown relief, drawn only
    where it rises, so no patch);
  - blood tendrils (the shared `vessel.py`): six on the altar tree, routed round the arch, never across its mouth; one
    each on four other trees, a hint;
  - the wisp-fire removed from the blood (Derek: "I don't think it's necessary"); `wisp_fire.py` kept.
- **Bugs:**
  - the stump's roots overwrote the resting ground at a tree's centre, so the altar was placed 18 yards up its
    trunk. The roots now never write over a standing trunk, and hollows and eyes take their tree's ground from the
    warp's record;
  - the opening stayed round because the round cavity cut the hole, not the arch;
  - the candlelight was counted twice (a flat orange inside);
  - the tendrils crossed the opening.
- **Graded** (pass 7 of the altar): C+. A dark hero-sized lancet arch at the glade's back, crowded with red candles
  round the rune slab, closed wooden eyes above weeping wax, wax curtains into the blood, tendrils creeping up either
  side.

## Runes for the eyes, an alcove for the mouth, the spiral of stones (Derek, 2026-10-07)
- "hate the eyes, instead carve a ring of dark runes into the flesh of the tree around the hollow": the eyes are off
  (`draw_lids` kept). `hollow.rune_mask`:
  - a band a hand's width outside the lips, following the arch exactly (jambs, then the two lancet arcs over the
    point), down to the sill;
  - glyphs of strokes (stem, branch, cross-stroke, chevron) standing across the band, no two neighbours alike;
  - cut 5 cm into the bark, the raw dark flesh showing in the cuts.
  - **Failed first:** the carving was written backwards (the bark left solid in the cut); then the band ran a yard out
    round the trunk's curve; then the strokes were a third of a pixel. A rune at this scale must be a glyph of about
    4 x 5 px with whole-pixel strokes.
- "change that other tree with the weird mouth hole into a small candle alcove": the mouth is now a niche with three
  candles.
- "increase the tendrils in size by 35%": done.
- "bugs are fine" (Derek, on the banned animal words): insects are allowed in the world.
- "arrange the small stones so the vague impression is of them once being arranged in a spiral, long ago":
  - small sunk stones along an opening spiral round the glade, three quarters of a yard apart;
  - pushed, tipped, some gone;
  - every fifth a larger flat one that the pickers still cap;
  - never on a trunk, the stump, the pilgrim or the bones.
**Graded:** C+. The runes ring the arch, the spiral is felt rather than seen, the alcove glows.

## The critique, acted on (Derek, 2026-10-07: "i agree with the critique, except lets not worry about dead trees for this area, because its a ritualistic place, so magic or something. do the rest")
- **No dead wood here**, by Derek's ruling. A ritual place, kept clean by whatever was done here.
- **The reused floor layers removed:** the old scene's fallen leaves, falling leaves and wisp (`FOREST_LIFE` off), and
  its ground mist and moonbeams (new engine switches `MIST`, `BEAMS`, default on for other scenes).
- **Its own air:** `landkit/fog.py`, ground fog lying in the carr's lows and over the blood (MASTER_RULES 6: fog lies
  in the lows). It thins up the trunks, drifts with the wind in a seamless loop, in stepped see-through layers lit by
  the moon and warm near the candles.
- **Centuries of burning** (`hollow.py` altar):
  - mounds of set wax on the floor where it ran;
  - stalagmites of wax under the roof's drips;
  - soot blackening the hollow's roof, and a plume of soot climbing the bark over the arch, narrowing upward.
- **The altar's light spread:** its light sits out over the ground before it (reach 3.6 yd), and the warm lights now
  tint the fen ground they reach (the GROUND painter had no warm hue). The first try tinted the whole floor orange;
  now only the ground near the flames.
- **The three lights on the ground** (`landkit/wood_lights.py`, from the lore), by cause:
  - red caps at the blood's margins (where the god bleeds beneath), smouldering in their own flesh and casting no
    light (no red light);
  - blue round the feet of the hollowed trees (over something hollow);
  - white on dry sound ground away from the blood and the path, each holding a little light.
  - **Failed first:** placed over the whole 30-yard world grid, so most fell off-screen. They are now chosen only where
    the eye can find them.
- **The worn way:** a path trodden for generations from the glade's front to the altar's blood. Trodden flat (no
  tussock stands on it), pools kept off it, paler peat, the moss creeping back in from its edges.
- **Objects in combat:** `landkit/sets/ritual_glade.json` is written on every build. For each object: cover,
  material, hp and collision posts (trunks, stump, stones, bones, candles as a fire source, blood pools, tendrils).
- **Graded:** B-. The glade is calm, dark and readable:
  - the altar is the one strong statement of light;
  - the worn way leads the eye to it;
  - the lights on the ground are small and placed by their causes;
  - the fog lies low.
  Still to do: the passes owed on every piece; the floor's fine speckle is still busy at the edges.

## Finishing the glade (Derek, 2026-10-07: "do the upgrades, then rewrite the guide"; chose "finish this glade")
**This round:**
- **The floor's speckle calmed:** matted leaves in broad patches, their ramp brought near the peat's hue. The ground is
  quiet, the eye rests on it, and the bones and stones read against it.
- **This Wood's own stone:** `flat_stone.STONE`, dark, damp, weathered grey-brown, in place of the borrowed sandstone
  ramp. The stones no longer shine cream in the lantern; they sit in the ground.
- **The worn way** brought back after the calming hid it: packed peat, paler, a little warmer.
- **Workbench:** the ritual glade's night-rain loop replaces the Blind Face section.

**Every piece at the close of this round** (passes so far, grade). Each was graded in writing as it went.

| Piece | Passes | Grade |
|---|---|---|
| The woodcutter's stump | 11 | B- (Derek: "looks good") |
| The vein-trees, warped (taper, twist, channels) | 6 | B (Derek: "great job on the turning trees") |
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

**Still short of ten passes:** the eye tree, the bones, the tendrils, the caps, the fog, the ground candles. They come
back the next time the glade is opened. None is a stand-in: each is its own designed piece.
