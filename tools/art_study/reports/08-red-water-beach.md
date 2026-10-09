# Report 08: the Red Water and the black sand (in progress)

The Red Shore's first piece: the sea of blood meeting the black sand, at the game's scale, with the Ossuarch for size.
Kept as the work goes (MASTER_RULES 2c); it is written in full when Derek calls the piece done (Derek, 2026-10-09:
"be sure to write detailed chapters on everything in the guides when we think it's done").

- **Pass log:** `tools/landkit/passes/red_water_sand.md`.
- **Study:** chapter 13 (`tools/art_study/chapters/13-tide-surf-black-sand.md`), with its section 6b, Derek's ruling
  on the heartbeat and viscosity.
- **Code:**
  - `tools/landkit3d/beach_floor.py`: the ground and the sea in time;
  - `tools/landkit3d/beach3d.py`: the scene's forms;
  - `tools/landkit3d/paint_shore.py`: the painter.
- **Review page:** the Red Shore artifact, items `redwater` (passes 1 to 4) and `beach_p5` (passes 5 on).

## Derek's words, in order

| When | Words | Grade |
|---|---|---|
| Pass 1 to 3 | "Those curvy lines look ridiculous too, not realistic at all" | |
| Pass 4 | "Doesn't look real enough, need a study in the tide, oceans, water, black sand, the details are lacking. It's very plain." | D |
| Pass 5, mid-pass | "Make sure the tide moves rather slow as it's based on dying heart beats not normal speeds and blood is think and viscous" | |
| Pass 6 | "Turn the logs into bones" | |
| After pass 6 | "Doing great I'm loving it. Good job" | |

## What the studies taught

- **The surf is one heavy break, close in.** It is never a band of parallel white lines; that band is what read as
  "curvy lines". A steep coarse beach under long swell makes a single break, and a crest that peels is part
  unbroken, part curling and part white at any instant.
- **The sand reads by its state, in bands that follow the cusps:** the glossy film (the lightest wet value, a mirror
  of the sky), the wet matte band (the darkest), the drying mottle, then the dry charcoal.
- **The profile is real form:** the step, the 1:8 face, the berm, the backshore. A flat painted beach cannot hold the
  bands.
- **Water's light at our camera is Fresnel:** flat water seen 30 degrees down returns about 6% of the sky. Facets
  tilted away catch the sheen, faces toward us go dark, and the wave reads from its own normals with no line drawn.
- **Then Derek's ruling overruled the ocean wherever they conflict.** The Red moves on a dying heartbeat and blood is
  thick:
  - viscosity damps the short waves, so there is no chop or spray;
  - the breaker sags over into a roll rather than throwing a lip;
  - the swash is a slow blunt tongue that leaves a draining coat.

  The area page had said "thick and slow" and "the tide is its heartbeat" all along. The ocean study was followed past
  the lore. **Lesson: the lore outranks the real world's physics; check the study's conclusions against the area page
  before building.**

## Techniques: what worked

- **One clock for everything that moves** (`beach_floor.heart`, `phase`). A heartbeat-warped time drives:
  - the swell's approach;
  - the roll;
  - the bore;
  - the swash's run-up and backwash;
  - the foam's age.

  Because they share one phase, they always agree: the swash follows the bore that made it, and the foam's age is
  the time since the bore passed. The peel along the shore is a phase offset by position (`t / PEEL`), so one instant
  shows every stage of the wave.
- **The sea as a height function sampled into meshes,** fine where it runs thin over the sand and coarse offshore,
  keeping only what stands above the sand. The swash's blunt front is a real step in that function.
- **The glossy coat as a mirror mesh** a breath above the sand, so the reflection pass finds the cliffs and the dead
  in it; where the reflection misses, the sky is painted.
- **Fresnel on a near-black body** (`paint_shore`, the sea): a body of 0.05 to 0.1, plus F times the sky (or the dark
  of whatever the reflection pass hit). The form comes from the normals alone.
- **Foam stage B as holes in a sheet:** a cellular noise whose holes open with the foam's age, thickest where water
  converges (the bays, the swash's top).
- **Each long object's grain from its own pixels:** a PCA of the object's ground positions gives its axis, so checks
  and splits run along each log or bone without the build passing anything to the painter.
- **Fine local meshes for small real form:** the footprints get their own 0.015 yd mesh along the trail; the main
  ground skips that strip.

## Techniques: what failed, and why

| Tried | What it looked like | Why it failed | Fixed by |
|---|---|---|---|
| Normal-ocean physics: a fast plunging lip, chop | Ordinary water | Against the lore: blood, thick, on a dying heartbeat | The heartbeat clock and viscous forms |
| The sea's body at 0.1 to 0.2 with a mild glaze | A flat maroon field | No value range for the form; the body was too light | A near-black body; glaze from Fresnel times 2; troughs desaturated |
| A maroon stain on the wet matte band | A river of blood across the beach | The darkest band became a saturated colour band | Stain cut to a trace |
| Swash marks as thin arcs | Parallel drawn lines | Exactly the "curvy lines" Derek rejected | Broken specks of residue |
| Lace at full foam value | White noise | White must be scarce (over 10 to 15% reads as drawn) | Value capped, the rim thinned into the water |
| The cliffs' lichen at a large noise scale | Camouflage | Crust patches far too big | Small, rare crusts |
| Silvered drift logs at full value | Pale pipes pulling the eye to the bottom | The near plane was the brightest thing | Darkened (later replaced by bones) |
| Bones at the logs' dark value | Branches | Bone must read as bone | An old ivory-grey ramp of its own |
| Ribs as single thin tubes | Wire hoops | A rib is a broad flat blade | Two strands across the blade, thicker |
| Footprints 0.035 yd deep on a 0.06 yd mesh | Nothing | Under a pixel of form, below the mesh's resolution | Real bare feet on a fine mesh, holding blood |

## Traps

- **`python -` with the Windows Store Python hangs** waiting on stdin. Use `tools/pixelforge/.venv/Scripts/python`.
- **Line endings:** `sed -i` and Python text-mode writes on Windows flip a file's line endings, and the whole file
  shows as changed. Check `git diff --stat` before committing, and restore the file's original endings.
- **Don't edit the scene's code while a loop renders:** each frame imports the code afresh.
- **cine_check's rules 1 and 27 were written for fire-lit interiors.** On this exterior, rule 27 meets a sea that is
  red by its own colour. Rule 22 (near dark, far light) fights a dry backshore that is truly lighter than the sea.

## What carries forward (to be finished when the piece is done)

These become library pages when Derek calls the beach done:
- the heartbeat clock;
- viscous water (no chop, a sagging roll, a blunt tongue, a draining coat);
- Fresnel on a dark body;
- foam by stage and by age;
- the sand by its state band;
- the mirror coat;
- grain along each object's own axis;
- fine local meshes for small form;
- the bone jam.
