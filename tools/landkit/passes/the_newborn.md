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
