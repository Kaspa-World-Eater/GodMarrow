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
