# Bone

The world is built on a dead god's body, and its bones break through: the Ribcage Bough over Cap Hollow, a great rib
lashed across the Gate's posts as a trophy with a skull hung at its middle, a god's vertebra half buried in the bleached
dune. Smaller bones lie everywhere the dead lie, because Godmarrow has no animals to clear them: the fungi only soften
them. The game has no animals and the lore never names what the horned dead were: on the Burnt Heath "seven great
horned carcasses lie in a ring facing the same way". The Hollow Wood's hunter: "You can tell how long a thing's been
dead in the Wood by which way it's lying. Fresh, it lies any way it fell. A day on, it lies with its head toward the
ring ... The ground takes them the way a sleeper pulls the blanket up." This page covers `bone.py` (rib, skull),
`beast_bones.py` and `remains.py`.

## The real thing
- **How bone weathers under the sky** (stage by stage, `bone.py`'s brief): grey-ivory, darker and greener in the grime;
  cracks running **along** the grain, the outer shell flaking from them; pits; where broken, the spongy bone dark and
  honeycombed; dried sinew still binding the heads; old blood seeped from the ends.
- **Chapter 3, [teeth, sinew, muscle and flesh](../../chapters/03-teeth-sinew-muscle.md):** **dried sinew is
  translucent amber to honey-brown** (`#C89A50`, thin edges `#E0C080`), flat stiff ribbons splitting lengthwise into
  hair-fine fibres with frayed flyaway ends, shrunk tight round what it binds; where tendon meets bone it fans and the
  bone carries a rough pitted ridge.
- **STUDY round 10** (the god's vertebra): a body with a cupped end face, the arch round an open canal, processes
  swelling to knobbed ends; blades at least 3 px wide, bone thickening at the tips, weight only on the lower contour (a
  first try was "a cookie on stick legs").
- **STUDY rounds 7 and 8:** the skull built in layers; "dream anatomy, not tubes".

## How it is made
**`tools/landkit/bone.py`**, ray-marched along the game's camera ([ray-casting](../methods/02-ray-casting.md)):
- `rib(a, b, rise, ra, rb, seed, n=40)`: a polyline from a to b bowed up by `rise`, warped a little sideways (±0.08 yd);
  a flattened section (`ra` across its face, `rb` through it); swelling 55 percent at both knobbed heads, a waist 18
  percent narrower; two break points.
- `skull(c, size, face, seed)`: cranium, brow, cheekbones, jaw, deep orbits, the nasal hole, teeth (`_skull`, smooth
  unions with `_smin`).
- `draw(img, zb, dep_scene, to_px, shapes, lights, moon, ambient=0.15, tol=0.5)`.
- **Surface:** `R_BONE` (8 tones, `#151316` to `#c2b8a2`), `GRIME` low, `SPONGE` at breaks, `SINEW` at the heads,
  old blood at the ends; low ridges along the rib where muscle once held and weathering cracks cut in as grooves
  (Gate pass 99); light adds, then tints; a rim term where a light is behind it.
- **The polyline SDF counts the overshoot along each segment:** `max(ellipse distance, along-segment overshoot)`.

**`tools/landkit/beast_bones.py:beast(origin, north, ground, age, size, seed)`** returns shapes for `bone.draw`:
- the skull with a long muzzle and **two horns** sweeping out wide to either side (`pp * sgn * f * L * 0.95`), tips
  curling forward and up, ridged and tapering (0.065 to 0.01 of the size);
- the spine a chain of 6 vertebrae in a settled curve; ribs collapsed flat either side (4 pairs, bowed); 4 long bones,
  two dragged off further with age;
- **age** 0 fresh to 1 long dead: the older, the more truly the skull points north, the deeper the ground takes it
  (horns flattened toward the ground by `1 - age * 0.6`), and the small bones go first (each vertebra and rib dropped
  with chance `age * 0.3 to 0.35`).

**`tools/landkit/remains.py`:**
- `body(seed, age)` and `paint_body`: a picker's remains at true size (about 1.8 yd), on its back, head toward the
  ring; skull, open ribcage, spine, pelvis, long bones; the rags it died in; sunk into the litter; moss on the oldest;
  the hunter's marker stick at its head with a cloth strip (`R_STICK`, `R_STRIP`).
- `layout(seed, age)` and `draw_parts(img, dep, to_px, origin, yaw, ground, parts, light, bone_c, zb)`: drawn as a
  pixel artist draws a skeleton at this size (one-pixel bones, a skull of a few pixels with its sockets, ribs as short
  strokes, the rag a dark fill), every point placed from the body's layout in the world, depth-tested, with a one-pixel
  contact shadow under every bone.
- `scatter(seed, n, spread, sandal)`: bits and pieces of a body long scattered (a skull rolled off, long bones apart,
  loose ribs, runs of vertebrae, hips), optionally the hermit's sandal.

## Variants and parameters
| Piece | Size | Key parameters |
|---|---|---|
| `bone.rib` | the Gate's arch, a great rib ~4 to 6 yd | `rise`, `ra`, `rb` |
| `bone.skull` | keystone skull | `size`, `face` |
| `beast_bones.beast` | a horned beast | `age` 0 to 1, `size`, `north` |
| `remains.body` / `layout` | a person, 1.8 yd | `age` 0 to 1 |
| `remains.scatter` | scattered bits | `n`, `spread`, `sandal` |

## What worked
- **The rib as a true form:** "reads as bone, bound with sinew, the skull at its keystone" (Gate pass 50, after the
  SDF fix).
- **Pixel-artist drawing at true size** for the 1.8 yd dead: at about 18 px a yard a skeleton is ~32 px and its bones
  one pixel, below the 0.04 yd world grid, so the height field loses them; plotted parts with contact shadows read.
- **Ivory held under glare,** one step brighter skull with sockets, a faded cloth (Cap Hollow passes 7 to 8).
- **Lore placing the dead:** each lies skull to the north (glade) or head to the ring (Cap Hollow), truer and sunk
  deeper the older it is; the small bones go first.
- **Small story pieces on quiet stone in light** (Gate pass 84): a 4-pixel skull vanishes on busy flesh.
- **The horns as the classic horned skull** (beast pass 3): spread wide, tips curling forward and up.

## What failed, and why (traps)
- **Bug: the rib read as a dark brown gable** painted all as end-sinew: the tube SDF dropped the offset along each
  segment, so every point measured against the fat end head.
- **The rib a plank;** then a dark silhouette band 4.5 yd up, above the fires' reach with its face turned from the glow.
  A bone needs a light that reaches it (a rim from behind, or hung within the fires).
- **The horns read as arms** (beast passes 1 and 2): spread like arms they made tiny human skeletons; hung down they
  were arms again. Sweep them wide to either side with the tips curling forward and up.
- **The near set lost in the busy litter** (beast pass 1); waits for a quieter floor.
- **White scribbles lit to glare** (Cap Hollow pass 6); **black sockets dominating** (pass 7).
- **A body inside the caved-in hut,** its bones floating at the roofline; the dead belong on the open floor.
- **Cap Hollow's ribs as smooth tusks** with abrupt bases: they need heaved earth in a ring with clods, the bone
  stained dark low, roots gripping it, hide in tatters, the snapped tip showing marrow's honeycomb.
- **Sinew painted as brown stripes:** chapter 3 says amber and translucent; `bone.SINEW` is still brown.
- **Pylons as "wedding cakes"** (Gate pass 2) before they were vertebrae.

## Derek's rulings and grades (verbatim)
- 2026-10-07: "and the bone sucks too, I agree".
- 2026-10-07: "Add some bits and pieces of skeleton."; "scatter some bones across the ground".
- 2026-10-07: "still looks mono toned and flat, and so does the bone and gate pillars".
- 2026-10-07: "yeah the arch should be higher above the door"; "move it higher".
- 2026-10-07, Cap Hollow: "Base of ribs looks bad. Everything needs more detail and refinement x10."; graded **C+**.
- The no-animals law: no animal words; the horned dead are never named.

## Where it is used
- [Caves and the organic deep](../environments/caves-and-the-organic-deep.md): the Gate's rib and keystone skull, the
  scattered bits (five groups: the gate's foot, by the eye, in the rubble, the lantern's pool, by the great fang).
- [The ritual glade](../environments/the-vigil.md): four horned beasts, ages 0.15 to 0.9, heads north.
- [Old-growth wood](../environments/old-growth-wood.md): Cap Hollow's five dead round the fire with their sticks and the
  Ribcage Bough (scene-local ribs in `hollow_camp.py`).
- [Lands not yet built](../environments/lands-not-yet-built.md): the bone desert's vertebra (`painted_dune.py`).

## Status
- **`bone.py`:** Gate passes 50, 99 to 103; Derek still moving the arch. **Beast bones:** 3 passes, **C**.
  **Remains:** Cap Hollow passes 5 to 10 and Gate pass 84.
- **To do:** amber translucent sinew (chapter 3, report 1 "still to do" item 4); the near beast set on a quieter floor.
- **Duplicates to merge:** `remains.R_BONE` and `bone.R_BONE` (one bone material); Cap Hollow's scene-local rib
  renderer onto `bone.rib`; `beast_bones._tube` and `bone.rib` share one tube.
