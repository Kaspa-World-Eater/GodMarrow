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
