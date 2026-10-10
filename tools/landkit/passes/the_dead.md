# The dead: one shared body for every place

*The piece: the bodies of the dead, built once as a reusable asset (MASTER_RULES 2b) and used by the opening cave's
pool, the cove's strand and swash, and every later dead. Opened 2026-10-09 from Derek's note on the cave in the game:
"Bodies look bad".*

## Rules check, before pass 1

**Read, and the line from each that shapes the piece:**
- `docs/MASTER_RULES.md`: 2.3 "no primitive stands in for a real form (no ... tubes for limbs ... blobs)"; 0.5c, every
  rounded thing turned with the five tones of form; 2b, a body is a reusable game asset with its own ten graded passes;
  2c, study the real thing first.
- `docs/wiki/mythology/areas/the-red-shore.md`: "The pilgrim looks exactly like the corpses on the beach, and stands";
  the strand's "washed-up dead ... pilgrims' cloaks, staffs, the drowned"; the Stranger: "Out on the sand they're all
  lying down, wearing its face. ... Don't turn them over."
- `docs/PAINTED_STANDARD.md` 7b (turn every form) and "long rigid things stay rigid" (a limb's bone is straight between
  its joints; the joints are what bend).
- `docs/CINEMATOGRAPHY.md` rule 8 (scale against the small) and rule 12 (forlorn is what the absent left).
- `tools/art_study/reports/07-opening-cave.md` and `08-red-water-beach.md`: the stand-ins (a sphere torso, straight
  tube limbs) read as puppets; the five tones made the beach's read better but not as bodies; bones laid point by point
  went "accordion".
- `tools/art_study/chapters/03-teeth-sinew-muscle.md`: anatomy under the skin.
- Derek's notes: "Bodies look bad" (the cave in the game); "Don't forget the bodies in the water" (the beach); earlier,
  "bodies embedded into the shoreline. Rotting corpses".

**Confirmed:**
- a new design for this purpose, borrowed from no scene: the three builders now in use (`cave3d.pool_bodies`,
  `redwater3d.corpse`, `beach3d.drowned`) are replaced by one;
- real form: built in Blender on the 3D road (`parts3d`), true size, painted by the area's painter;
- placed by cause: where the Red leaves them (the swash, the wet foreshore, the wrack line), and in the cave's pool
  where they came up and did not stand.

## The brief

**One true detail from the lore:** the dead wear the pilgrim's own shape. "The pilgrim looks exactly like the corpses
on the beach." The body is built on the pilgrim's proportions and dressed in the pilgrim's hooded cloak and rope belt,
so the player sees, lying in the blood, what they were a moment before they stood.

**Study first** (a new chapter, `chapters/15-the-dead.md`, from real sources):
- how a dead body lies: no muscle tone, so every joint settles to gravity, the limbs follow what they lie on, the face
  presses into the ground, the hands half curl;
- the drowned: face down, head lowest, arms forward, the knees and the backs of the hands where they drag;
- the stages, told by form as well as colour: fresh (pale, livor where the blood settled), bloated (the trunk swollen
  taut, the skin marbled), rotted (sunken, split, the ribs showing), bone;
- wet cloth on a body: plastered to the high forms, pooling in the hollows, torn;
- how painters made the dead read (Géricault's studies for the Raft of the Medusa, Holbein's Dead Christ, Mantegna's
  Lamentation): weight, foreshortening, the turn of the form in low light.

**Form** (`tools/landkit3d/body3d.py`, one builder: `body(name, pose, state, where)`):
- a real trunk: the ribcage's barrel, the belly, the shoulder girdle and the pelvis, never a sphere;
- limbs with true joints (shoulder, elbow, wrist; hip, knee, ankle), each bone straight between them, each segment laid
  on the upper hull of what it rests on;
- hands and feet blocked with their digits; the neck, the jaw, the skull under the hood;
- the skeleton state from the same skeleton, so ribs, spine and pelvis are the anatomy's own;
- poses: face down as the drowned lie, on the side half curled, on the back with the arms out, half sunk in sand or
  blood, draped over the cave's stumps.

**Paint:** the five tones on every limb; a skin ramp per state (pale and livor, grey-green bloat, dark rot, bone); the
cloak's wet black cloth; the blood's or the sand's contact at every edge. No gore for its own sake, and nothing eating
them (the no-animals law).

**Proof each pass:** a sheet of every pose and state at the game's scale with the Ossuarch beside it, the value-only
render beside the painted one, the old stand-ins beside both. Ten graded passes, then into the cave (re-render about
45 minutes) and the cove (its own bake), checked in the game.

**Waiting for Derek's go before pass 1.**

**Derek's go:** 2026-10-09, "Yes do it" (and: "the ossuarch model is a place holder too. He will be replaced at some
point", so the dead are built on the pilgrim's proportions, not on the Ossuarch's sprite).

## Pass 1: one body from one skeleton (`tools/landkit3d/body3d.py`)

**Study:** chapter 15 (written for this piece). **Built:** a skeleton at true size (1.80 m, jittered per body), four
poses (face down, face down reaching, face up, curled on the side), each joint laid on the ground under it and each
straight bone lifted just clear of what lies under it (the upper hull); the flesh as joined masses (Blender
metaballs): the ribcage's barrel, the belly and the pelvis, the deltoids, a limb's bellies along its straight bone; a
looser shell for the hooded cloak with its hem spread on the ground; states `fresh`, `bloat`, `rot`, `bone`.
**Proof:** `dead_sheet.py` (every pose and state on a gently uneven ground), judged in one grey
(`value_render.py`, MASTER_RULES 0.4). **Grade: C.** They read as bodies lying by their weight, one skin, never a
sphere and tubes. **Worst failures:** limbs taper to spikes at the hands and feet; the bloat a shapeless blob; the
cloak shows only as flat discs; the bone state a stick figure.

## Pass 2: hands, feet, limbs and hood

**Fixed:** the forearm's bulk near the elbow, the calf a third down, the wrist and ankle, the palm and fingers as one
plate, the heel and arch and the ball of the foot as blocks; the hood stands well off the skull. **Into the places:**
`redwater3d.corpse` (the cove's strand), `beach3d.drowned` (the dead riding the Red) and `cave3d.pool_bodies` (the
pool) all build the one body now. **Seen on the strand** (`paint_shore`, the overcast): the bodies are in, under their
cloaks, but at this frame they are small and the bone state is too thin to read. **Next:** the cave's pool under the
fires (the place Derek's note was about), then the bloat's dome, the bone state's real skeleton, the cloak's folds.

## Pass 3: the cave's pool, under the fires

**Seen** (`cave3d` at the pool, `paint_cave`, zoom 3): the dead lie across the stumps and half in the blood as cloaked
bodies, by their weight; no sphere and tubes. **Grade: C.** **Worst failures, honestly:** the cloak is one smooth
blob with no folds, so it reads as a sack; the arms and legs that show are pale sticks of one value, no wrist, no
hand that reads; the bloat in the pool is lost in the blood. **Done:** `paint_cave` now turns skin and cloth with the
five tones (scaled by the light that reaches them); it changes little, because the fault is the form. **Next pass:** the
cloak's folds and wet drape (pooled in the hollows, plastered on the high forms), the hands and feet as forms that
read at the game's size, the body's shape showing through the cloth, the bloat's dome against the blood's meniscus.
Not yet baked into the game: the cave and the cove keep their old dead until the dead pass.
