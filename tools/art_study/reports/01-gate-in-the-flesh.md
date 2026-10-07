# Report 1: the Gate in the Flesh (`tools/art_study/flesh_scene.py`)

Status: **in work** (pass 57 of 2026-10-07). Kept as the work goes, finished when Derek passes the scene.
Its pass-by-pass record is `tools/landkit/passes/flesh_scene.md`; the organic parts' recipes are in
`tools/landkit/passes/organic_notes.md`. This report draws the lessons out of both.

## The piece
On the Ashen Moor, the god's cheek, the flesh breaks through. There is a line of great fangs with a gate built into
them, a courtyard of broken pillars, the god's eye in folds of flesh blinking pus into a pool of pus and blood, a vein
diving in and out of the ground, mycelium, and living, pustulating ground. The design is Derek's, built over many
messages. The lore read for it:
- the Moor is the cheek, warm because the flesh beneath is still cooling;
- the hermit's "ring of broken stones there, shaped like teeth, round a pit of warm ash ... blood dried on the
  stones";
- black glass where blood ran into the ash;
- the grandmother's tale of the mouth, "a door, warm and wet, that opened and shut", and the people who "walked out
  on the breath and fell down on the cheek" (the brief for the gate).

## Derek's grades and words, in order
- Early: "looks pretty bad so far". The cyst was removed (saved for later), and the eye was put where the cyst had
  been.
- The eye at pass 24: **D-** ("needs a ton more work"). After passes 25 to 39: **"Eye looks great, document it"**,
  then **B+**.
- "Tiles look terrible and reused, rule was every piece unique and a work of art."
- "Getting better but this whole scene will need a lot of work."
- "The ground, teeth and tiles need more work"; "the bone sucks too"; "the rock sucks too".
- "The gate needs to look more brutal and imposing and ancient"; "the gate should have extruded iron bars".
- "The ground looks pretty bad still"; "the stones and tiles just look awful, you really need to spend a lot of time
  on that".
- After pass 61: **"A+ on the gore"** (the flesh, the vein, the eye's pus and the pool, the fangs' blood). "The teeth
  still look lacking. And the ruins need more going on. The stone tiles look too similar. Throw a little dead plant
  life into the scene. And some gore tendrils running up the pillars with pustules emitting a sickly yellow light.
  And let's turn this into a cavern. The cinematography is lacking."
- "Review what it means to detail and nuance things, make it like the real world." This led to the studies
  (chapters 1 to 3).

## What the studies taught that matters here
- **Chapter 1 (detail and nuance):**
  - detail is history: every mark has a cause;
  - three scales, with the features (10 to 30% of a thing's size) carrying the read at the game's zoom;
  - nuance is correlated variation (one cause drives several properties at once);
  - edges hold the information, interiors stay calm;
  - every feature is height lit through its normal, never a darker painted patch.
- **Chapter 2 (ruins, ash, rock, scree):**
  - real stone is never one noise field, and each mark is placed by a cause mask (exposure, shelter, edge distance,
    water, traffic, wind, age, burial);
  - in pixel art a carved feature is one lit pixel on the near lip and one shadow pixel on the far lip;
  - for this piece in particular:
    - Pompeii's pillowed polygon paving and its ruts;
    - drums that fall in a domino line, their end faces showing the anathyrosis ring and square socket;
    - inverted rain shading on old stone (black crust under ledges, bleached tops);
    - **flesh entering through the joints and lifting stones by their edges, as Angkor's roots do**;
    - pale ash in every low and groove bottom;
    - drift tails behind every object;
    - obsidian (the lore's black glass) and white ash ghosts of things burned away.
- **Chapter 3 (teeth, sinew, muscle, flesh):**
  - **the tooth's one gradient:** saturated dentin-yellow at the gum, cool translucent blue-grey at the tip;
  - a fang is lobed and ridged (labial ridge, grooves, keels, lens section, tip forward), never a cone;
  - perikymata rings show only in raking light, which the moon gives;
  - attrition facets with a brown dentin cup;
  - a broken tooth's inside: enamel rim, ringed dentin, pulp canal, blood-stained pink-violet dentin, perhaps a
    younger tooth nested within;
  - **dried sinew is translucent amber**, not brown stripes;
  - flesh reads by its **fibre grain** and colours by exposure (purple, cherry, brown, then green-black marbling
    along the veins);
  - veins under skin are blue-grey and blurred;
  - pustules are a creamy centre under a glossy cap with a red halo.

## Techniques that WORKED (keep and reuse)
1. **Ray-casting organic forms along the game's own camera** (orthographic, view (1, 1, 2·9/21)), not painting
   them. The eye went from D- to B+ only when it became a true ball. The same method made the fangs (fang.py), the
   vein (vessel.py) and the rib and skull (bone.py) read as forms. Each is a reusable landkit piece with a
   z-buffer, so the scene's nearer objects hide it.
2. **Refraction through a clear dome** (Snell, index 1.34, to an iris plane): the iris is seen through fluid, the
   "vitreous transparency" Derek asked for.
3. **Thickness shows a lid.** A lid shell at 1.13 R standing proud of the ball made the far lid visible over the
   eye's top.
4. **Sinking things into their ground:** the eye rising out of a raised socket, the lid's foot darkened into it; the
   vein half buried with the skin closing over it near the ground. A thing set *on* the ground read as a helmet or a
   hose.
5. **Fluids that travel over real surfaces** (each point lifted to the ground's height), with a wet trail behind the
   drop. Straight lines through the air read as scratches.
6. **Ground painted from world position** (ground.py) instead of stamped tiles: no repeat anywhere. This is now the
   rule (MASTER_RULES 2b.6).
7. **Laying flagstones on the world's own axes:** diamonds in this camera read as a floor. Laid square to the
   screen, they read as a brick wall.
8. **Clean tone groups on the fangs:** a smoothstepped terminator (light, half, core shadow) and the flesh's warm
   light thrown up into the shade read as painted ivory.
9. **Ordered dither only within a narrow band at a tone's border** (|q - round(q)| < 0.035). Wider bands made a
   checker over whole surfaces.
10. **Edges set by world position, not by angle round an object.** The fangs' flesh edge became unique per fang and
    side; angle-based noise made the same sawtooth on every fang.
11. **Light-direction slope shading for ground micro-form** (sample the surface a step toward the moon): the ash
    drifts gained form.
12. **Height-first paving** (pass 57): each slab settled and tipped, the proud edge against its neighbour, arrises
    round on the path and sharp off it, wear dishes, spalls and offset cracks, lit through its own normals. It is
    clearly better, though not yet good.
14. **Building the paving from a real ruin (chapter 2, Pompeii), not from imagination** (passes 58 and 59): dark
    basalt polygons from warped Voronoi cells, each stone pillowed (a smoothstep dome rising from its joint) with
    rounded arrises, hairline joints packed with pale ash, the processional way polished paler and bluer with a moon
    sheen, a warm rind off the way. Lit through its own normals, the near rim lit and the far lip shadowed. It read
    as real paving at the first render, which no amount of tweaking the invented flags had achieved. The flesh only
    in the joints near its edge (Angkor's roots); its reach at first was too far and its joints too wide, giving
    cobbles rather than Pompeii.
15. **Columns from chapter 2** (passes 60 and 61, landkit column.py): ray-marched Doric shafts (20 flutes, worn
    arrises, drums shifted off true, hairline joints, a rough pale break) with every mark placed by its cause (rain
    bleaching only on faces that truly look up, black crust in sheltered flute bottoms, streaks below the break, pale
    ash packed in the low flutes, a damp salt band at the foot, rust from a dowel joint), and fallen drums showing
    their anathyrosis faces. They read as old columns at once. **What failed first:** an exposure mask that leaned on
    occlusion bleached the whole top like a sock, and the shaded side had no sky or bounce light, so the flutes
    vanished into flat blue.
16. **A cavern lit by one shaft** (passes 62 to 64): darkness everywhere, one moon shaft through a hole in the roof
    falling on the eye (the star), the beam visible with dust in it. It turned a lit diorama into a shot.
    **What failed first:** with the usual low moon the hole sat over the side wall, which shadowed the whole floor
    (fix: a high moon, still from the upper left); the moon's highlight, rim and tip glow weren't gated by the shaft,
    so every piece glowed as under an open sky; the dust was a starfield.
17. **Local lights from the story** (passes 65, 66, 69): the pustules' sickly pools (first they flooded the cavern
    yellow: 25 lights with long reach summed), the banked offering-fires from the lore lighting the kneelers, the
    ember glow in the passage backlighting the grille so the bars stand black against it.
18. **Light must ADD** (bug of pass 69): multiplying a dark material by a light's colour leaves it dark; light raises
    the value first, then tints.
19. **Stamped height and ray-cast pieces must agree on the ground** (bug of pass 64): read an object's ground before
    it is stamped, or its ray-cast twin stands on top of itself.
20. **Cohesion comes from one rule for the whole place** (passes 78 to 84; Derek: "nothing really blends smoothly,
    it all looks patchy and jumbled"; "everything looks ancient except this weird biological stuff coming through the
    cracks in the floor"). Every object had been made well on its own and dropped in, each in its own light and
    colour, and the result was a collage. What pulled it together:
    - one idea governing every surface (ancient stone everywhere; the god only where it breaks up from below,
      through the fractures and the joints, wells into sheets, and makes wounds at its own parts);
    - one light for all (the open-sky terms removed from the pillars once the scene became a cavern);
    - one air (a haze deepening with distance and one colour grade);
    - gradual edges (the paving running out under ash in stages, the joints filling first; the flesh feathering
      over the stones).
    **What failed:** pieces made in one lighting world (open sky) and left there after the world changed (a cavern).
    When the scene's premise changes, every piece must be re-lit for it.
21. **Things removed are kept** (Derek: "pull the pillars out ... turn them into assets"): the gore pillar is now its
    own landkit asset with a preview; nothing made is thrown away.
22. **True-scale small things need contrast, not size** (pass 84): a human skull at game scale is about 4 pixels.
    On busy flesh it vanished; on calm stone in the lantern's light it reads. Place the small story pieces on quiet
    ground in light.
23. **Variety in plants means different species and forms, not one stamp** (passes 75 and 80): one Y-shaped tuft
    repeated read as a pattern; tussocks, seed stalks, curled ferns and fallen stems, each with its own colour and
    wear, read as dead growth.
24. **THE DEPTH EFFECT: form into the world, light from the form** (passes 89 and 90; Derek: "it's 1 dimensional,
    there's no depth to it, no 3D", then "much better"; now MASTER_RULES section 0). What was wrong: ground.py worked
    out each stone's height (dome, tilt, proud edge, joints) and the flesh's lumps, but used them only to shade a
    colour; the scene's height field stayed a smooth sheet, so the floor was a painted picture lying on a plane.
    What was done:
    - `paving_height` and `flesh_height` return real heights; the scene's stamp adds them into the world height
      field (0.04 yd grid) after everything else is stamped, only where nothing stands (tag 0): paving relief x1.05
      faded in by the courtyard's soft edge, the flesh rising through its cracks (0.16 yd at a crack's heart) and
      lumped (each lump a dome, the folds' creases sunk);
    - the colour generators are called with `selfshade=False`, so the engine's moon and lamps light the real
      normals and cast the real shadows: lit tops, shaded faces, stones casting on their neighbours, the flesh's
      ridges catching the lantern;
    - the heave placed by its cause: only near the god's own parts (the eye, the vein, the pool).
    **What failed first:** heave from the distance to any flesh tipped every stone, because the cracks run
    everywhere: a boulder field. Derek liked that look, though: it is LOCKED as the craggy floor
    (`ground.craggy_height`, `CRAGGY`: relief 1.6, heave reach 1.3 yd, power 1.6) for ground torn up from below.
13. **Reading the lore for one true detail** gave the gate its brief (the mouth's door) and the fangs their dried
    blood.

## Techniques that FAILED, why, and the fix
| Tried | What it looked like | Why it failed (cause) | Fix |
|---|---|---|---|
| The eye as a 2D ellipse with almond lids | a decal, D- | no form: a flat shape cannot turn in light | ray-cast ball, lid shell, cornea dome |
| Gaze pointed toward the camera | it stared at us | "looking up" was not modelled; the gaze must truly point up | gaze up and aside |
| Ball resting on the ground | a helmet | no socket and no contact | ball sunk to 0.12 R, raised socket ring, darkened lid foot |
| Clean grey sclera | dead | real sclera is warm, blotched and veined | sallow base, blotches, 22 branching vessels, flushes |
| Stamped ground tiles (ash, putrid, flags) | "terrible and reused" | one small picture repeated | world-position generator |
| Ash crust as Voronoi cracks | a hex lattice | unwarped cells are regular | warped cells, broken cracks, crust only in patches |
| Flags in courses along the screen axes | a brick wall | in iso, screen-aligned rectangles read as a wall | flags on world axes (diamonds) |
| Flags lit by a painted lip and fall | smeared plaster | colour pretending to be form | height-first slabs lit through normals |
| The pool on the socket's folds | a gold bell | a liquid surface must be level | the hollow levelled, the pool moved off the slope |
| Pus marbling in broad bands | a gold sign or rug | too few, too bright, a hard outline | fine marbling, dull sour pus, edge soaked into flesh |
| Fang blood smears, bright red | ketchup | real old blood is dark red-black and thin | dark blood, a low smear, a few threads to beads |
| Warm specular on the fang shade side | chrome | too sharp and too strong in shadow | softer, weaker warm lobe |
| Wide dither band | a checker over the enamel | dither everywhere, not at edges | narrow band only |
| Fang flesh edge from noise of the angle | an even sawtooth "cake wrapper" | the same function of angle on every fang | world-position noise, fraying upward |
| Vein as ellipse splats with ad-hoc light | a flat pink pipe | no true normals | sphere splats with real normals (vessel.py) |
| Vein valves as creases every 1.3 yd | grub segments | a regular period reads as segments | faint swellings far apart, no crease |
| Skin closing over the vein below 0.22 yd | the vein vanished | an overcorrection | ridge raised, skin closes only at the ground line |
| The rib's tube SDF, perpendicular offset only | a dark brown gable, all "sinew" | **a bug:** the offset along each segment was dropped, so every point measured against the fat end head | max(ellipse distance, along-segment overshoot) |
| The gate's red glow | broke "no red light" (MASTER_RULES 6) | a rule not checked | dim amber |
| Tight crusts of noise on every surface (crazes, growth lines, pits) | busy speckle | texture louder than form | quiet texture; features carry the read |

## Bugs and traps (never again)
- **Shell heredocs break on apostrophes** in this environment. Write patch scripts and chapters with the file tool,
  and run them with the absolute Python path.
- **An SDF of a polyline must count the overshoot along each segment**, or every point snaps to the nearest fat
  section.
- **`np.where` evaluated on the whole array** still computes both sides. Guard divisions and NaNs (kit.vn warns on
  NaN casts where rays miss).
- **The see-through ghost of a plinth** lay over the eye. Give key pieces room, and keep other objects' ghosts off
  them.
- **Overlapping z-buffers:** draw ray-cast pieces into one shared z-buffer in `living_flesh`, and test against the
  scene's depth with a tolerance (0.4 to 0.7 yd).

## Method lessons (for every piece)
1. **Study the real thing before building**, not after three grades of "looks bad". Every one of Derek's harshest
   grades (eye D-, tiles, stones, teeth) came from building from imagination instead of from the real thing.
2. **Form first.** Every success here was a true form lit by its normals. Every failure was colour pretending to be
   form (painted lips, painted stains, painted ellipses).
3. **Look at the zoomed crop after every pass**, and say the worst thing honestly before fixing it.
4. **Regular repetition is the enemy** at every scale: periods (valves, flute counts done uniformly), lattices
   (Voronoi), the same function on each object (angle noise). Tie variation to world position or to a per-object
   hash.
5. **Check the rules at every reminder** (the red light slipped through until a check).
6. **Overcorrections happen:** after each fix, check it did not swing past.

## What carries forward (reusable parts)
- **landkit:**
  - `eye.py` (approved, B+);
  - `fang.py`, `vessel.py`, `bone.py` (rib, skull) and `ground.py` (ash, flags, flesh), all in work.
- **The method:** ray-march along the game's camera, a shared z-buffer, depth tolerance against the scene;
  world-position generators for all ground.
- **Studies:** chapters 1 to 3.

## Still to do in this piece (worst first, from the studies)
1. **The gate:** brutal, imposing, ancient. Megalith posts, **extruded forged iron bars** (real 3D bars, collars,
   rivets, spear finials, pintle hinges, layered rust, fibrous delamination, rust runs on the stone), chains, the
   kneelers carved and worn. Awaiting Derek's go.
2. **The stones and tiles** (chapter 2):
   - polygon pillowed paving with a polished processional way;
   - pale ash in every joint and low;
   - flesh through the joints first;
   - drift tails, ripples with lag crests, mudcrack crust where pus has wetted it;
   - obsidian black glass and white ash ghosts;
   - the pillars' drums offset, arrises sugared, black crust under ledges, cramp pits with rust;
   - the fallen drums in a domino line showing their anathyrosis faces;
   - the rubble ridge and islands of stone in ash.
3. **The teeth** (chapter 3): the dentin-to-enamel gradient with translucent tips, lobes and keels, perikymata,
   abrasion scratches along the push, worn facets with dentin cups, tartar, broken insides with pulp and
   blood-stained dentin, inflamed gum collars with papillae.
4. **The sinew** on the rib as translucent amber ribbons, split and frayed.
5. **The flesh** by fibre grain, coloured by exposure and rot, with veins blue-grey under the skin and pustules with
   halos.
6. **The animation**, checked as a moving loop.
