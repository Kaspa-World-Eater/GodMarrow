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

## Rules check (before pass 4)

**Read:** `MASTER_RULES` 0.5c, 2.3, checklist 1 to 13; chapter 15 section 4 (wet cloth: "plastered on the high forms
... the folds only where it leaves the body", the hood "collapses onto the skull", the hem in "a few broad lobes", the
rope belt); the area's true detail (the dead wear the pilgrim's shape: the hooded cloak, the rope belt). **Since pass
3:** Derek: "In the pool just make the bodies, bones and Gore" (the cave's pool holds remains now; the body stays for
the beach and the Red). **Checked:** 1 brief, held; 2 scale, held; 3 form, FAILS (the cloak a smooth blob, the hood
blown up off the skull, which is the study's opposite); 6 to 9 follow from it. **Worst first:** the cloak.

## Pass 4: the wet cloak

**Fixed:** the cloak plastered tight on the body (the shoulder blades and buttocks read through it), the hood collapsed
onto the skull (pass 2 had blown it up, the study's opposite), a few small sharp folds pooled at the waist, the rope
belt gathering it with its knot and ends, the hem in uneven lobes on the ground; the hands a palm, knuckles and fingers
half curled under. **Seen** (`dead_sheet`, coloured by material): they read as cloaked pilgrims lying face down, no
longer sacks. **Grade: C+.** **Worst now:** a pilgrim's cloak is long, but these stop at the hips, so the legs lie
bare and pale; the bone state is still a stick figure; nothing yet of the stages' form (the bloat's dome).

## Pass 5: a pilgrim's long cloak

**Fixed:** the cloak runs to mid-calf and its sleeves to the wrists; only the hands, the shins and the feet show,
pale against the wet black wool. **Grade: C+.** **Worst now:** the cloak wraps each leg on its own like a tight suit;
a cloak hangs as one skirt across both legs, bridging between them (chapter 15: "bridges in a taut sheet ... between
the legs") and spreading at the hem. Then the bone state, then the bloat's dome.

## Pass 6: one skirt across both legs

**Fixed:** below the belt the cloak hangs as one sheet bridging the legs, lower where it sags between them and widening
toward its hem; they read as robed pilgrims lying where they fell. **Grade: B-.** **Worst now:** the bone state, still
a stick figure of rods and two balls.

## Pass 7: gone to bone

**Fixed:** the bone state is a skeleton of the same joints: the long bones straight with knuckled ends, a run of
vertebrae, the ribs arched over a cage fallen in on the spine, the skull with its brow and its jaw come away, the hand's
small bones scattered, the cloak a collapsed sack under the ribs with its hood round the skull. **Grade: C+** (the
bone); the robed bodies stay B-. **Worst now:** the pelvis a smooth lump (a bowl with its wings is wanted); the bloat
has no dome against the cloak; none of it yet seen painted at the game's scale on the strand.

## Rules check, and pass 8: the pelvis

**Read:** `MASTER_RULES` checklist; chapter 15, 2e (the pelvis a bowl tipped forward). **Worst first:** the bone
state's pelvis, a smooth lump. **Fixed:** two flared wings, the sacrum between them, the rim of its opening, the hip
sockets; under the fallen cloak it now reads as small bones, not a ball. **Next:** the cove rebaked with the new dead
(checklist 11: seen as the player sees it, painted, at the game's size), then the bloat's dome.

## The cove rebaked with the new dead (checklist 11)

The cove baked again with the robed dead on the strand and in the Red (45 tiles aligned at 0.00 px, the empty corner
tiles none; the walk proved, 2,553 tiles). **In the game:** a body on the strand reads as a dark cloaked shape with pale
hands and feet, lying by its weight, small at the game's true scale. **Also:** the cove's held dawn moved later
(0.978), because at 0.955 the frame was still too dark to see (Derek: "You can't really enjoy the oh shit if you can't
see it"). **Next:** the bloat's dome; the dead seen nearer the lantern, where their form turns.

## Rules check, and pass 9: the bloat

**Read:** `MASTER_RULES` checklist; chapter 15, 6h (bloat: the trunk swollen taut, the face and neck by two fifths, the
hands puffed, the belt cut in). **Worst first:** the bloat, whose swelling was the belly alone, hidden under a body
lying face down. **Fixed:** the whole trunk domes (so the back rises taut under the cloak), the head and neck and hands
puffed, the cloak stretched smooth over it with no folds, the belt cutting in. **Seen** (`dead_sheet`, by material):
the bloated body reads heavy and domed beside the fresh dead. **Grade: B-** for the robed dead, C+ the bone. **Next:**
the face for the bodies that lie face up (the supine pose shows the hood's opening, empty dark), and the dead seen near
the lantern in the game.

## Pass 10: the faces turned up

**Fixed:** a body lying face up shows its face (chapter 15, 6e): the wet hood slipped back off it to lie under the head
like a pillow, the brow, the nose, the cheekbones, the jaw dropped a little, puffed in the bloat and drawn in the rot.
The face-down dead keep their hoods shut over their heads. **Grade: B-** for the robed dead, C+ the bone, after ten
passes. **For Derek's grade:** the dead on the strand and in the Red (cove rebaked after pass 8; passes 9 and 10 are in
the builder for the next bake). **Still to reach the standard:** the wet sheen and the sand packed into the cloth when
painted; the skeleton's pelvis and hands; the dead nearer the lantern, where their form turns most.

## Rules check (after pass 10)

**Read:** `MASTER_RULES` (checklist 11, seen as the player sees it); the area's opening (the dead wear the pilgrim's
shape). **Worst open line:** 11; passes 9 and 10 (the bloat, the faces) are in the builder but not yet in the game.
**Done:** the cove rebaked from the new builder (then the cove's and the cave's exports, which put back the shore field
and the cave's link).
