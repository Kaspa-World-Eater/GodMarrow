# Eyes

The dead god looks out of its world: an eye in the Moor's ash "a pool that looks back like an eye", an eye in folds of
flesh under the Gate blinking pus into its pool, weeping eyes on the dying vein-trees where their limb scars have
opened. Eyes also name the monsters (Derek's combat ruling: eyes identify monsters; the eyeless are jump scares). Every
eye of the god is built on one approved asset, `tools/landkit/eye.py`, kept in one place. This page also covers the
eyes that failed (the closed wooden lids, the Blind Face) and the painted ones still to merge.

## The real thing
- **Anatomy used** (organic notes, chapter 3): a sclera that is never clean white (warm, blotched, yellowing toward the
  lids, threaded with vessels that start near the lids' edge and thin toward the limbus); a clear cornea bulging over
  the iris; the iris (fibres, crypts, the collarette, a dark limbal ring, the pupil) seen through fluid; lids with
  thickness, folds parallel to the margin, a raw rolled margin, lashes, the wet meniscus, the pink caruncle in the
  inner corner.
- **Chapter 7, [faces in trees](../../chapters/07-faces-in-trees.md):** in bark, eyes are tree parts: healed branch
  scars, a sunken oval with a raised ring of woundwood closing to a seam. A face in a tree is long, asymmetric, read by
  its darks, half-seen; never a sculpted man.
- **Beech limb scars** (giant passes 7 to 9): a dark oval, a raised lip lit above, a chevron brow; on the god's veins
  they look back like eyes.

## How it is made
**The approved eye, `eye.draw(img, zb, dep_scene, to_px, centre, R, gaze, blink, lights, moon, seed, aperture=(0.95,
0.5), ambient=0.18)`.** Ray-cast per pixel along the game's camera (orthographic, view `(1, 1, 2*9/21)` normalised),
each ray started behind the eye and run toward the camera; three shapes, the nearest wins (see
[ray-casting](../methods/02-ray-casting.md)):
- **the lid shell,** a sphere of 1.13 R; everywhere outside the almond opening it is lid. The opening is centred on the
  gaze, shaped `(1 - (a/W)^2)^0.6`; the blink shrinks its height to nothing while the upper lid's centre travels
  further (`-0.15 H` at full blink). Thickness is what shows a lid;
- **the ball,** a sphere of R; **the cornea,** a sphere of 0.5 R set 0.66 R forward along the gaze.
- **Lids:** folds `sin(edge*26 + noise)` tilting the normal; the margin rolled raw and redder; small veins; a red
  warmth of light through thin skin; a soft sheen; pus crusting the margin, beading along the lower lid, thick in the
  corners; coarse lashes; the caruncle; the lid's foot darkened into the socket.
- **Ball:** a sallow base (0.84, 0.74, 0.5), blotched, yellowing toward the lids; 22 branching vessels (`vessels`)
  grown in the gaze's polar frame from the corners, wandering, forking, thinning, each with a flush; the lids shade it
  near their margins; a wet meniscus.
- **Cornea and iris:** each ray hitting the cornea is refracted (Snell, index 1.34) to an iris plane at 0.72 R: the
  iris shifts with the view (the "vitreous transparency"); pupil 0.1 R, larger as the lids close; Fresnel sky at the
  dome's rim; sharp highlights (power 140) of the moon and every warm light.
- **Light:** the moon plus every warm scene light as `(position, colour, reach)`; writes the shared z-buffer so nearer
  objects hide it.

**Socket and contact (the scene's job):** in flesh, a raised ring at 1.0 R, concentric folds with radial wrinkles, the
ball's centre only 0.12 R above the ground, thick rolls of flesh round its foot with the near crest over the lower lid.
In bark, the eye is sunk so only its bulge stands out.

**The pus runs** (Gate): four runs leave the lower lid and travel over the socket's own surface (each point lifted to
the ground's height) to the pool, a wet trail behind each swelling drop. **The bloody sap** (eye tree): runs from each
lower lid down the bark, fresh near the eye, crusting lower, a stain soaked round the socket (`vigil.eye_sap`).

**Life:** a slow blink once a loop, `clip(1 - |T - phase| / w)^0.8` (Gate `w = 0.13`; tree eyes `w = 0.07`), each eye at
its own phase; the gaze wanders or turns a little toward the pilgrim. See [living layers](../methods/07-living-layers.md).

## Variants and parameters
| Where | Centre and size | Gaze, aperture, ambient |
|---|---|---|
| Gate in the Flesh (`flesh_scene.py`) | `C + AX*8.6 + PERP*3.4`, R `1.7*0.95` yd | up, a little toward us and aside; defaults |
| The eye tree (`vigil.place_eyes`) | low 2.4 yd R 0.36 turned left; high 4.5 yd R 0.3 turned right; sunk to 0.72 R | wandering; `(1.0, 0.7)`; 0.24 |
| Dying trees' sockets (`wood_pale.tree_eyes`) | R = half the scar's width; sunk 0.75 R | out of the bark, toward us and the pilgrim; `(0.95, 0.52)`; 0.14 |

**Bark scars that never overlap** (`bark.paint`): 2 to 4 scars a trunk plus `round(dying * 3)`; each tries 24 places
and keeps clear of the others by `(w + pw) * 1.9` across and `(w + pw) * 1.5` up (its lids, brow and runs), or it is
not placed. A weeping scar is 2.4 times wider ("an eye big enough to be one"). With `eyes=` given, the scar is painted
as its socket only (swollen bark lids round a dark hollow) and the scene ray-casts the approved eye into it.

## What worked
1. **A true ball,** ray-cast: the eye went from D- to B+ only when it became one.
2. **Refraction through the cornea** gave the fluid Derek asked for.
3. **The lid shell standing proud** (1.13 R) made the far lid visible over the eye's top.
4. **Sinking it:** rising out of a raised socket and rolls of flesh, the lid's foot darkened.
5. **Sick yellow, blotched, many fine vessels:** alive and wrong.
6. **Fluids over real surfaces,** with a wet trail.
7. **One asset in one place:** the tree eyes became the approved eye through `wood_pale.tree_eyes`, and the scars stopped
   overlapping in every scene at once.

## What failed, and why (traps)
- **A flat 2D ellipse with almond lids:** a decal, D-.
- **Gaze toward the camera:** it stared. "Looking up" means the gaze truly points up and is seen from the side.
- **A ball on the ground:** a helmet; and later "still a little like a ball set on top".
- **A clean grey white:** dead.
- **The lids a black band; an egg with no lids at rest; a plinth's see-through ghost over it.** Give key pieces room.
- **Pus as straight lines through the air:** scratches.
- **The eye tree, pass 1 (D+):** the lid shell stood proud like a cap, the aperture too narrow to show the white, and
  the canopy's dark plus the grim grade crushed them to dark red domes. Sunk to 0.72 R, opened, ambient raised.
- **The painted weeping eye** in `bark.py` (church ruin passes 20 to 21): about 6 px read as a sore; at 2.4 times it
  read, but its yellow ring was loud in firelight (Cap Hollow pass 17): calmed to sallow.
- **Limb scars at 2 to 3 px** read as specks; at true size (0.2 to 0.3 yd) they read as eyes.
- **Eyes overlapping on the bark** (Derek). Fixed in the shared bark.
- **The closed wooden eyes** above the altar (almond lids of wood met in a sagging seam, a crease above, the inner
  corners lower, red wax tears; `vigil.closed_lids`, `draw_lids`): Derek, "hate the eyes". Replaced by a ring of
  runes; `draw_lids` is kept.
- **The Blind Face** (`bark_face.py`): a sculpted human face, symmetric smooth bulges, a hard bar of a brow, a square
  chin, graphic raking light. "Looks like the chad face." Scrapped from the scene and the lore; chapter 7 written from
  it.
- **The moor's eye** (`moor_scene.py`, `EYE`): a painted ellipse (lids of hide, a jaundiced white threaded red, the moon
  in its pupil), graded "too clean ... a clean cartoon ellipse". It breaks FORM IS LAW.

## Derek's rulings and grades (verbatim)
- 2026-10-07: "the eye should be 3 dimensional and slowly blink a pus filled blink then drips into the pool"; "make the
  eye where the cyst was, looking up, and include the folds and everything in the flesh"; "the eye should be elliptical
  and seen slightly from the side, looking up, so we can see the vitreous fluid transparency"; "the eye should be more
  bulbous".
- 2026-10-07: "Eye is rated at d- needs a ton more work"; then **"Eye looks great, document it"**, graded **B+**,
  locked (MASTER_RULES 0b: "eye looks great").
- 2026-10-07: "blend the eyelid flesh down and have folds making it look like it's coming out of the ground."
- 2026-10-07: "a yellowing gross eye weeping, leaking blood sap" on more dying trees.
- 2026-10-07: the bark's eyes "overlap and they shouldn't"; they should have the big eye's "three-dimensional blinking
  quality ... true for basically any organic stuff".
- 2026-10-07: "Put an eyeball on at least one of the trees ... weeping bloody sap"; "if you're going to put eyeballs on a
  tree they need to be spaced out pretty well. So like maybe two eyeballs oriented differently on the tree, bulbous,
  slowly slowly blinking or looking around and/or both".
- 2026-10-07: "two closed eyes, so it's just the eyelids facing shut, made of wood"; then "hate the eyes, instead carve a
  ring of dark runes into the flesh of the tree around the hollow".
- 2026-10-07: "The face needs a ton of work. Looks like the chad face."; "Make it look like a withered, wretched moaning
  face ... Better yet, no face, scratch it from the lore too."

## Where it is used
- [Caves and the organic deep](../environments/caves-and-the-organic-deep.md): the Gate's eye, the star of the shaft.
- [The ritual glade](../environments/the-vigil.md): the eye tree (two eyes).
- [Old-growth wood](../environments/old-growth-wood.md) and [ruins and stone](../environments/ruins-and-stone.md): the
  dying trees' weeping eyes (Cap Hollow, the church ruin); the keystone's incised eye.
- [The Ashen Moor](../environments/ash-moor.md): the painted eye in the ash.

## Status
- **`eye.py`: B+, approved and locked** (keep or improve only). Full record: `tools/landkit/passes/organic_notes.md`.
- **The eye tree:** 3 passes, **C+**; owed seven more.
- **Duplicate to merge:** the moor scene's painted eye onto `eye.py` (gazing up out of the ash, a raised socket of
  hide). The old painted weeping eye path in `bark.paint` (used when `eyes=None`) should give way to the ray-cast eye
  everywhere.
- **Not built:** eyes in walls and stone, and the eyes that name monsters, all to be built on `eye.py`.
