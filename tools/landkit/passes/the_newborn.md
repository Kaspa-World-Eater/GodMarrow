# The newborn: the body that comes up out of the pool

*The piece: the new pilgrim's body before the cards have made it, and the opening it plays. Derek, 2026-10-10: "a
suggestion of a person ... gore covered and thus undefined", "a generic new body", "Sluggish and slow from its new
birth", and the opening: "It should crawl from the pool, on its hands and knees, gore and blood streaming off, a cough
of viscera before it struggles to stand up, then the player gets control." The stand-in (art/sprites/hollow_hd, stick
limbs, under shaders/nascent.gdshader) is what this replaces.*

## Rules check, before pass 1

**Read, and the line from each that shapes the piece:**
- `CLAUDE.md` and `tools/pixelforge/docs/GUIDE_AI.md`: characters are shape sprites in PixelForge, `.shapes.json`
  solids on the standard skeleton at the hero's height (195 px), moved by motion clips in eight directions; keyed clips
  (`assets/animations/keyed/`) are poses held per frame.
- `docs/MASTER_RULES.md`: 2.3, no primitive stand-ins (the stick limbs fail it); 0.5c, the five tones on every rounded
  form; 4.11, seen in the game.
- `docs/animation/`: 01 (weight, anticipation, follow-through), 02 (the stick pass first: every limb as a coloured line
  before any detail), 07 (the pelvis drop, the lean, the lagging feet), 05 (the checklist).
- `tools/art_study/chapters/15-the-dead.md`: the proportions of a body of 1.80 m (section 2), slack tone (section 1),
  what makes weight read (section 5); the newborn is a living body in the same flesh.
- `docs/wiki/mythology/areas/the-red-shore.md`, the opening: "A dark silhouette drags itself up out of a visceral pool of
  blood ... The pilgrim looks exactly like the corpses on the beach, and stands."

**Confirmed:** a new design (no borrowed sheet), real form (solids, never sticks), the motion keyed for this body.

## The brief

**One true detail from the lore:** it looks exactly like the dead on the beach, and stands. It is the same body as the
corpses (chapter 15's proportions), the one that did not stay down.

**The body** (`tools/pixelforge/assets/shapes/characters/newborn.shapes.json`):
- a person of no calling: no clothes, no face that can be told, the proportions of chapter 15 with real masses (the
  ribcage's barrel, the belly, the pelvis, the thighs, the calves, the forearm's bulk), gaunt;
- coated in drying blood and caul: a dark wet skin with a sheen where the fire catches it, clots and torn strands of
  membrane hanging from the arms, the jaw and the hips; the hair a matted dark mass;
- the newborn's posture: hunched, the head hanging, the arms slack.

**The opening, in keyed clips** (`assets/animations/keyed/`):
1. `crawl`: on hands and knees, low, the head hanging, dragging itself through the blood and out of the pool, a hand
   slipping once; the blood streams off it (the game's gore drips and a trail).
2. `retch`: it stops on all fours, the back arches, the head drops, and it coughs up viscera (the game throws the gore:
   a spatter of blood and dark matter onto the stone in front of it).
3. `rise`: it struggles to stand: a knee up, a hand pushing on the knee, a fall back to the knee, then up, swaying,
   and it stands.
4. `idle` and `walk`: hunched and slow (the half pace it already has), the head low, one foot dragging.

**In the game** (`world/opening.gd`): a new pilgrim begins under the blood at the pool's heart; the crawl carries it to
the pool's edge, then the retch, then the rise, and only then does the player have it. The blood shader
(`shaders/nascent.gdshader`) stays over it until the last card is drawn.

**Proof each pass:** the clips in all eight directions as contact sheets (the stick pass first), the body beside the
Ossuarch at the same height, then the sequence captured in the game.

## The road changed (Derek, 2026-10-10)

Derek: "If pixel forge sucks, use any tool", then "Do we even need to capture frames if we have a full 3d working
model?", "Wouldn't animations be smoother, we can have the same looks that we have but with less work?", "Locked pov
etc". So the newborn is the pilot of **live 3D characters**: a rigged body played in the game, never rendered to frames.

- **The body:** the Quaternius Universal Animation Library's Mannequin (CC0, already in
  `tools/pixelforge/assets/animations/`): a skinned person of 1.83 m with real anatomy and no face. It is coated in
  `tools/landkit3d/newborn3d.py` (a lumpy displaced skin; the coat baked to its own colour, roughness and normal
  textures; the clots laid onto the skin, each on its bone) and exported as `art/characters3d/newborn/newborn.glb`.
- **The motion:** `tools/landkit3d/newborn_pose.py` holds the key poses on their timing sheets (crawl, slip, retch,
  rise, idle, walk). `newborn3d.py` lays them on the rig by analytic two-bone IK and keys them at 30 fps. The stick pass
  is drawn by `newborn_sticks.py`.
- **In the game:** `entities/body3d.gd` plays the glb in a SubViewport behind a locked orthographic camera at the hero
  sprites' angle and density (12 degrees, a figure of 195 px, shown at Iso.FIG). Its picture goes through
  `shaders/body3d.gdshader` (hard edges, the dark outline, stepped tones). The model's surface is
  `shaders/body3d_model.gdshader`, with a true waterline for coming up out of the pool. `world/opening.gd` drives the
  opening.

## Pass 1

- **Stick pass:** the trunk was pitched backward (the world-axis signs of pitch and roll were reversed; fixed). After
  the fix, the crawl, slip, retch and rise read as lines. The head was bent past 120 degrees in the rise and stand
  (the trunk's, neck's and head's bends add up), and the standing knees were locked; both softened.
- **First body:** pure black. The Mannequin's UV layers are empty (every corner at 0, 0), so the coat's bake wrote
  nothing; it now gets a fresh unwrap. Two clots floated off the hollow of the back; each is now laid onto the
  nearest point of the skin.
- **Second body:** the coat's wave texture made horizontal rings round every limb. It is now noise stretched along the
  height, so the fresh runs go straight down, with dried blotches near black.
- **In the game** (captures at 1.2 s steps): under the blood (nothing), surfacing into the crawl, the slip, the
  retch, a dark spew onto the stone ahead (the first was big pink blocks; now dark blood and matter in single
  pixels), the rise, and control. Esc or Space skips it.
- **Cost:** 55 fps with the body against 58 without, in the cave (`--perf`), with a 320 px viewport.
- **Smoke:** 12 sections, 0 errors.

**Worst open items, in order:**
1. The coat still reads as a smooth red mannequin up close (the Mannequin's joint seams show). It needs breaking up:
   torn caul, strands, matted hair.
2. The body is lit by its own fixed key, not by the cave's fires. The nearest game light should drive the key's
   direction and colour.
3. It throws no shadow (the hero's silhouette shadow reads the hidden sprite).
4. The blood streaming off it is the game's 2D drips; the per-frame strands in `newborn3d.py drips()` are not in the
   live body yet.

## Rules check (after pass 1)

**Read:** `MASTER_RULES` in full; the area's opening (`docs/wiki/mythology/areas/the-red-shore.md` 152-157); the review
page's notes (Derek graded the cove B+, no note on the newborn yet).
**One true detail from the lore:** "A dark silhouette drags itself up out of a visceral pool of blood ... The pilgrim
looks exactly like the corpses on the beach, and stands." The dead on the beach are hooded shapes (body3d's wet hood).
**The checklist, line by line:**
1. Brief: met, but the lore's detail (it looks like the dead) is not in the body yet. **Fails.**
2. Scale: 1.83 m at the hero sprites' 195 px, shown at Iso.FIG beside the cave's heaps and steps. Passes.
3. Form: a real skinned body, lit through its normals. But the coat is a smooth shell (lumps of 1 cm), and the
   Mannequin's joint seams show: it reads as a mannequin, not as flesh under caul. **Fails (worst).**
4. Light: its own fixed key and rim, not the cave's fires. **Fails.**
5. Values: the body in three groups (lit flank, shade, near-black). Passes.
6. Ramps: the picture is stepped to 7 tones by value, hue kept. Passes.
7. Paint: a live render, not painted strokes. This is the open question of the live road (a later pass: a painterly
   pass in the picture's shader).
8. Contact: no shadow on the ground. **Fails.**
9. Detail where it counts: none on the silhouette. **Fails** (with 3).
10. Life: it breathes and sways; the blood runs off (the game's drips). Passes.
11. Seen as the player sees it: captured in the game. Passes.
12. Skeptic round: beside the Ossuarch it is smoother and plainer. **Fails** (with 3).
13. Cinematography: the dark shape against the pool's glow reads; no rim from the pool, which is the one red light.
    Partly fails.

**Worst failure first: 3, 9 and 12, through the lore's detail (1).** Pass 2 gives it the caul it was born in, torn and
still clinging, as a wet hood over the head and a drape off the shoulders and back. In silhouette it becomes one of the
hooded dead, the face stays untellable, and the seams and the smoothness are broken by real form.

## Pass 2: one skin, the caul, the clips' first frames

- **The worst failure first (form, 3/9/12):** at twice the size the Mannequin is plainly an artist's wooden doll,
  with segments and ball joints at the elbows, hips and knees; no coat could make it flesh. `one_skin()` rebuilds it as
  one continuous body: a voxel remesh in the rest pose at 2 cm (a 9 mm remesh kept the grooves; 2 cm fills them),
  subdivided, smoothed, brought to about 28,000 faces, its bone weights carried back from the original by the nearest
  surface.
- **The lore's detail (1):** `caul_shell()`, the caul it was born in, torn and still clinging. It is made from the
  body's own faces over the skull, the neck and the upper back, lifted off the skin unevenly, with a cowl bagging behind
  the skull, a sagging peak at the crown and a fold over the face, holes torn through it, a ragged hem and 26 strands
  hanging from the hem. It keeps the skin's bone weights. A first version, as light and glossy as fresh blood, read as a
  red plastic helmet; it is now as dark as the coat. Its drape over the shoulder caps read as armour and was taken off
  them.
- **A bug found on the way:** every clip after the first began on a broken frame (heads below the ground). While each
  pose was laid, Blender evaluated the clips already keyed over it. The poses are now laid with the animation system
  off and the curves written after, each rotation kept on the same side as the last (no flips). Every clip's first
  frame was checked from the exported glb.
- **The coat:** the dried blotches darker and wider.
- **In the game:** a dark, wet, lumpy body, no longer a smooth doll. Smoke not rerun (no game code changed this pass).

**Grade: C+** (unchanged; it gained form and lost the doll, but the next two items hold it down).
**Worst open, in order:**
1. The shoulder caps still bulge: the doll's deltoid shells, fused but still cap-shaped.
2. From the front the head is still round (the caul follows the skull).
3. Its light: its own key, not the cave's fires.
4. No shadow.

## Rules check (after pass 2)

**Read:** `MASTER_RULES` (unchanged since the last check, my own commit 78ab0ac7); the area's opening (the dead's
hooded shape). **The checklist:**
1. Brief, with the lore's detail: the caul's hood is in. Passes in part (the head still reads round from the front).
2. Scale: passes.
3. Form: one skin now, but the doll's deltoid caps bulge and the skull is an egg. **Fails (worst).**
4. Light: its own key. Fails.
5. Values, 6. ramps: pass.
7. Paint: the live road's open question. Open.
8. Contact: no shadow. Fails.
9. Detail where it counts: the caul's tears, strands and clots on the silhouette. Passes in part.
10. Life, 11. seen in the game: pass.
12. Skeptic round: beside the dead on the beach, the newborn's head and shoulders are the difference. Fails, with 3.
13. Cinematography: unchanged. Partly fails.

**Worst first: 3.** The shoulders and the skull are reshaped in the rest pose: the deltoid caps pulled in and smoothed
into a sloping shoulder, the skull given a jaw that narrows under the cheekbones and an occiput behind, and the caul
hanging in flaps at the sides of the head.

## Pass 3: a person, not a helmet and pauldrons

- **Found by looking, not guessing:** two changes to the shoulders and skull showed nothing. A render coloured by
  material showed why: the round head and the shoulder pads were the caul's shell itself. A clinging hood follows the
  skull (a helmet) and stands on the shoulders (pauldrons), and a hood cannot fall by its weight in every pose on this
  road. **The hood is dropped.** The lore's detail (it looks like the dead) is carried by the same gaunt proportions,
  the coat of blood and the torn caul, not by a garment.
- **The caul:** now thin torn patches clinging a few millimetres off the back and top of the scalp and the upper back,
  with ragged edges, wrinkles and the 26 strands at the hem.
- **The skin, reshaped in the rest pose** (`reshape()`): the doll's deltoid caps pulled in and smoothed into sloping
  shoulders; the egg of a skull given a jaw narrowing under the cheekbones, a chin, and the swell of the occiput.
- **Clots:** the four spheres of "matted hair" were removed (they made the head a ball); the shoulder clots were made
  small and moved onto the shoulder blades; the caul lump on the belly read as a belt buckle and is gone.
- **In the game:** a gaunt, blood-slick person drags itself out, heaves, and gets up.

**Grade: B-.** The form now reads as a body, in the game and up close.
**Worst open, in order:**
1. Light: its own key and rim, not the cave's fires (checklist 4, 13).
2. No shadow (8).
3. The wrists and knees still show faint rings where the doll's cuffs were.
4. Paint (7): the picture is a stepped render, not yet painted.

## Rules check (after pass 3), and pass 4: lit by the cave's own lights

**Check:** `MASTER_RULES` and the area's lore unchanged (no commits but mine). The checklist as after pass 3; the worst
open line is **4 (light)**, with **13 (cinematography: every source seen, silhouettes and rims, the room's colour of
light)**. The body was lit by its own fixed key and rim, though underground the fires make all the light.

**Pass 4:** `Body3D.light_from()` (called by the hero each frame) takes the strongest four of the zone's lights at the
body's place: the candles, the braziers and the pool's raw red glow. It sets each as an omni light in the body's little
world, where it truly stands from the body: the ground's axes turned to the camera's, its height above the body's floor
(`heightPx` over its own floor, from `Iso.lift`), its colour and its reach. The fixed key and rim go out, and the
ambient drops to 0.08 (MASTER_RULES 0c).
- **In the game:** in the pool the body is lit red from below by the glow, the first sight of it. At the edge it is a
  dark shape with a warm candle rim on its back and skull. Standing, the candles catch its shoulder and head. The fires
  were lifted a little (2.2 to 2.8) so the retch reads (Derek: "You can't really enjoy the oh shit if you can't see
  it").
- **Smoke 12/0. 60 fps in the cave with the body** (the 55 measured at pass 1 was taken while the cove bake ran).

**Grade: B-** (light now passes; the next items hold it).
**Worst open:** 1. no shadow (8); 2. the faint rings at the wrists and knees; 3. paint (7).

## Rules check (after pass 4), and pass 5: its shadow

**Check:** rules and lore unchanged. The worst open line was **8 (contact): no shadow**. The hero's silhouette shadow
read the hidden sprite, so it vanished with it.

**Pass 5:** `SilShadow` now casts from the live body's own picture when the hero has one (`_src_sprite()`): its
silhouette, crawling or standing, laid flat along the ground away from the two strongest flames in reach. The feet sit
at the picture's foot line and the fade runs over a standing figure's height. Two wrong shadows found by a debug count
were taken out: the hidden lantern's (a hidden lantern throws nothing) and the sun's in the cave (the cave keeps the
hours' ambient by design, so its zone now carries `sunless`; `cave_export.py`). The cave was re-exported from its bake;
the only change in the zone is that mark. (A first re-export without the bake's work folder wrote no lights; it was
restored from the commit before anything else ran.)
- **A/B in the game** (the same moment with the casts on and off): the shadows are there but faint. The candles are
  weak and several yards off and the floor is dark, so the shadow is as faint as that light makes it (0c: shadows
  show in lit pools).
- Smoke 12/0.

**Grade: B-.** **Worst open:** 1. the faint rings at the wrists and knees; 2. paint (7): the picture is a stepped
render; 3. the blood streaming off it is still 2D drips, not strands on the body.

## Rules check (after pass 5)

**Check:** rules and lore unchanged. The checklist: 1-6 pass, 8 passes (faint, honest), 9-11 pass, 12 and 13 in part.
**7 (paint) fails outright:** the picture is a render with its value stepped; no hue-shifted ramp, no dither where
tones meet, no lit lip. The rings at the wrists and knees (3, 9) barely show at the game's scale, so **7 first**.

## Pass 6: the picture painted (checklist 7)

`shaders/body3d.gdshader` now keeps the painting rules a live picture can:
- a short ramp of 8 tones stepped in a square-root space, so the darks (most of a body in a cave) get their tones;
- the ramp hue-shifted, its darks toward violet-blue and its lights warm (3.9);
- dither only where one tone meets another (3.2): a 4x4 ordered pattern in the band at each step's edge, fixed to the
  picture's own pixels so it rides with the body;
- a lit lip (3.3, 3.13): an edge pixel already in the light is lifted a step, the rim the candle catches.

**In the game, before and after at the same moments:** subtle at the game's size, but more tones in the dark, the warm
lip on the skull and shoulders, cooler shadows. Smoke 12/0.

**Grade: B-.** 7 now passes in part. Still missing: the dry-brush strokes along the form and the world-fixed tooth;
that needs the form's direction, which a picture alone doesn't carry.
**Worst open:** 1. the blood streaming off it is 2D drips, not strands on the body (10, 6); 2. the rings at the wrists
and knees; 3. strokes and tooth (7).

## Rules check (after pass 6)

**Check:** rules and lore unchanged. 7 passes in part. The worst open line is **10 (life)**, with section 6 (effects
live in the world). The lore says it comes up out of "a visceral pool of blood" and Derek asked for "gore and blood
streaming off". The streaming is the game's 2D drips on the floor, not blood running off the body.

## Pass 7: blood streaming off the body (checklist 10; section 6)

`Body3D.enable_drips()` (the newborn only, from `core/main.gd`): twelve strands of blood on bone attachments (the chin,
the wrists twice, the elbows, the knees, the chest, the belly). Each starts inside its limb, so only what is below the
skin shows, and always hangs straight down whatever the pose. Each runs on its own clock: it lengthens, necks and lets
a bead go, which falls to the floor. All are hidden while the body is under the surface.
- **First look:** at 7 mm they were under a pixel wide; now a finger's width (14 to 20 mm) with longer runs, which
  the game's scale shows.
- **In the game:** dark blood on a dark, blood-coated body. They read mostly as a ragged, dripping underside while it
  crawls, not as distinct threads; in the open look test they are plain. The game's 2D drips still mark the floor.
- Smoke 12/0; 60 fps.

**Grade: B-.** **Worst open:** 1. the rings at the wrists and knees; 2. strokes and tooth (7); 3. the strands could
catch the light (a wet highlight) to read in the dark.

## Rules check (after pass 7)

**Check:** rules and lore unchanged. Lines 1-6, 8, 10, 11 pass; 7, 12, 13 in part. The worst open line is **3
(form)**: faint rings at the wrists, elbows and knees, the doll's cuff grooves that the 2 cm remesh didn't fill. Standing,
they read as bracers.

## Pass 8: the rings were the coat, not the form

- **Smoothing first:** the skin round the wrists, elbows, knees, ankles and hips was smoothed in the rest pose
  (`reshape()`). The bands stayed.
- **Looked at the geometry** (the rest pose in plain grey, close): the arms and knees were already clean, continuous
  limbs with their anatomy. So the bands weren't form.
- **The cause:** the coat's runs are noise stretched along the rest pose's height, so they run down the body. In the
  rest pose (a T-pose) the arms lie level, so the same streaks crossed the arms as rings, which read as cuffs when the
  arms hang. On the arms (masked by distance from the body's axis) the runs are now stretched along the arm.
- Also: the model's textures sampled without mipmaps (at the game's size they bled the black between the bake's small
  islands into seams), and the bake's margin widened to 16.
- **Look test:** the forearms read as one continuous limb streaked lengthwise; the band above each knee is the kneecap
  catching the light. Smoke 12/0.

**Grade: B.** Form, light, contact, life and the lore's detail now pass. **Worst open:** 1. strokes and tooth (7); 2. a
wet highlight on the strands so they read in the dark (10); 3. the skeptic round beside the Ossuarch in the game (12).
