# Teeth and fangs

The Ashen Moor is the god's cheek, and its ground swells to "a long rise I have marked the Jaw"; below the Broken
Kneeler lie "stones like teeth round a pit of ash, and something under the ash that breathes out when you breathe in".
The hermit of the Fallen Watchtower saw "a ring of broken stones there, shaped like teeth, round a pit of warm ash ...
There was a sandal at the edge, and blood dried on the stones." The stones are teeth: fangs breaking up through the
ash and the old paving, a row of them with the Gate in the god's mouth built into it. This page covers the two tooth
generators, `tooth.py` (the Jaw) and `fang.py` (the Gate), and their history.

## The real thing
**Chapter 3, [teeth, sinew, muscle and flesh](../../chapters/03-teeth-sinew-muscle.md)**, and chapter 1's teeth:
- **Shape is the detail:** a canine is five lobes, not a cone: a rounded **labial ridge** down the outer face with a
  shallow groove either side; a lens section about 1 : 0.75; the tip forward of centre; widest a third down from the
  tip; the whole tooth curving back; two **keels** front and back on animal fangs. The neck line (CEJ) is scalloped,
  high on the sides and low front and back, and the gum follows it.
- **The one gradient that matters most:** saturated dentin-yellow at the gum (thin enamel over dentin) to pale, cool,
  translucent blue-grey at the tip; the tip glows when lit from behind. Shadows olive-ochre on the dentin, slate-blue
  on the enamel, never grey.
- **Surface:** perikymata rings following the neck line, seen only in raking light (the cheapest big win); a few long
  craze lines; attrition facets flat and shiny with a brown dentin **cup**; abrasion scratches along the way the tooth
  pushed up; stain in the grooves; chalky tartar ledges; a black band where the gum drew back.
- **A broken tooth:** a glassy enamel rim, dentin in growth rings, the dark pulp canal, the dentin stained **pink-violet
  by blood** while the enamel stays clean; on a crocodile, a younger tooth nested inside.
- **The gum:** a wet knife-edge collar on the scalloped neck line with papillae; inflamed, it goes glossy red-magenta
  with a blue-purple margin.

## How it is made
### The fang (`tools/landkit/fang.py`), ray-marched
`f = make(centre, base, height, R, seed, ax, perp)`; `sdf(p, f)`; `heightfield(X, Y, f)` (the tallest solid point over
each ground cell, for shadows and collision); `draw(img, zb, dep_scene, to_px, f, lights, moon, ambient=0.16, tol=0.7)`.
See [ray-casting](../methods/02-ray-casting.md).
- **Form:** radius `R * (1 - t^1.7)^0.95` with a slight swell above the gum, full and near-parallel low, tapering hard;
  the spine hooks back (`bend` 0.18 to 0.3 of the height, `t^2.4`) and aside (`lean`); the section a lens (`dw / 0.84`);
  the labial ridge (+7 percent) with grooves either side (-3.5 percent at ±0.62 rad); the keel behind (+7 percent,
  fading up). 70 percent are snapped (`snap` 0.74 to 0.92) on a tilted jagged plane with a spall scooped out of one
  side; the whole ones worn to a facet; 40 percent split; chips bitten from the keel.
- **Colour:** `R_ENAMEL` ivory over `R_DENTIN`; the gradient warm dentin at the gum to cool blue-grey up the shaft; the
  broken face with a glassy rim, ringed dentin stained pink-violet, the dark pulp; `TARTAR` in patchy chalky ledges;
  perikymata only in raking light; growth lines only in the light; stain only down the grooves and keel.
- **Light:** clean tone groups (light, half, core shadow) with a smoothstepped terminator; the flesh's warm light
  thrown up into the shade; a soft, weak warm highlight in the shade (never chrome); the ordered dither only within a
  narrow band at a tone's border (`|q - round(q)| < 0.035`); light adds, then tints, halved and capped.
- **The gum:** a smooth scallop on the neck line (up on the sides, down front and back), barely frayed, a thin glossy
  inflamed band, the dark band where it drew back; the flesh's edge on each fang set by **world position**, so no two
  fangs or sides match; the floor's own dark flesh, not a bright red skirt.
- **Blood** (from the lore's dried blood): dark red-black (`BLOOD_FRESH`, `BLOOD_OLD`), a low smear and a few thin
  threads ending in beads; see [blood and fluids](blood-and-fluids.md).

### The tooth (`tools/landkit/tooth.py`), a height field
`F, info = tooth(kind, seed, height, R, half)` with `kind` "fang" (a cone with a bulging flank, 3 to 4.5 yd, the tip
snapped or worn, a lean) or "molar" (a broad block 2.2 to 3 yd with four worn cusps and fissures); a gum collar of
swollen dark-red flesh (`R_GUM`) round the foot, receding; chips to the dentin at the edges; `paint_tooth` with
`R_ENAMEL`, `R_STAIN`, `R_DENT`. Used by the Jaw (`moor_scene.py`), lit by its own true round normals.

## Variants and parameters
| Generator | Form | Key parameters |
|---|---|---|
| `fang.make` | ray-marched SDF, true 3D | `height`, `R`, `seed`, `ax`/`perp` (facing); per seed: `bend`, `lean`, `snap`, `tilt`, `spall`, `split`, blood `runs` |
| `tooth.tooth` | height field (cannot hook or overhang) | `kind` fang or molar, `height`, `R` |

## What worked
- **Ray-marching** made the fang a form at last (Gate pass 41).
- **The body full and near-parallel low, tapering hard to a hooked point** (pass 42): fangs, not cones.
- **Each its own fate** (pass 51): a tilted jagged break with a spall, or split the whole length, or whole and worn.
- **Clean tone groups and warm bounce in the shade** (passes 51 to 52): painted ivory.
- **Chapter 3's gradient** (pass 70): warm dentin at the base to cool blue-grey up the fang; the front ridge lit.
- **World-position edges** (pass 49) for the gum and the flesh climbing each fang.
- **The Jaw as one swollen gum ridge** under the whole ring (moor pass 2 to 3), the way in left open, ash drifted over
  it in broad tongues: "the ring reads as a jaw in the ash".
- **Lit by their own round normals** (moor pass 4): broad smooth tones instead of a checker.

## What failed, and why (traps)
- **Speckled stone cones** (moor pass 1); **checkered and split in two flat halves** (moor pass 3): height-field normals
  flicker on a steep cone.
- **Gums as separate red rings** instead of one jaw.
- **Flat banded cones** (Gate pass 40): the worst form failure after the eye was solved.
- **Ketchup blood, everywhere** (pass 41); **a flared traffic cone**; **a dither checker over all the enamel.**
- **A chrome stripe down the shade side** (pass 42): the warm specular too sharp and strong in shadow.
- **The tartar a tan band; a clean line where they meet the flesh.**
- **The flesh skirt a regular red sawtooth** ("cake wrapper", pass 48): the same function of angle on every fang.
- **The gum collar a jagged magenta sawtooth** (pass 71) before the smooth scallop.
- **Blazing orange-yellow, as if on fire** (pass 70): added light from pustules and fires too strong, the warm tint and
  dentin colour stacked on it. Halve and cap the added light.
- **The molars' gum-line stain streaks read as grilles** (moor pass 7).
- **Fangs standing in the dark** measured 0.1 to 0.2 in value while the preview flattered them; check the numbers.

## Derek's rulings and grades (verbatim)
- 2026-10-07: "a few large fangs busting through in a line"; "the teeth should run horizontal with the gate built into
  them".
- 2026-10-07: "The ground teeth and tiles need more work."
- 2026-10-07, after pass 61: "A+ on the gore. **The teeth still look lacking.**"
- 2026-10-07: "study teeth and sinew and muscle, muscle fibers and all that stuff. Learn how to do it."
- 2026-10-07, after pass 87: "remove all the teeth." (`fang.py` kept as an asset.)
- 2026-10-07, on the Moor: "more of the god in every place".

## Where it is used
- [The Ashen Moor](../environments/ash-moor.md): the Jaw, a ring of `tooth.py` teeth in one gum ridge round the breathing
  pit (`moor_scene.py`).
- [Caves and the organic deep](../environments/caves-and-the-organic-deep.md): the Gate in the Flesh, a row of `fang.py`
  fangs diminishing outward with the gate's posts set between the two greatest (passes 6 to 87; all removed at 88).

## Status
- **`fang.py`:** passes 41 to 72 of the Gate, never graded above "still look lacking"; removed from the scene, kept.
  Still to judge in better light: the perikymata, the facet's cup, the break's rings. Not built: abrasion scratches
  along the push, papillae, a younger tooth nested in a break, cone-in-cone splits.
- **`tooth.py`:** moor passes 1 to 4; a height field, so it cannot hook or keel.
- **Duplicate to merge:** `tooth.py` into `fang.py` (one ray-marched tooth with fang and molar kinds; the Jaw's ring
  rebuilt on it). The hermit's sandal and dried blood were laid by the great fang in pass 84 (`remains.scatter`,
  `sandal`); the lore's black glass (obsidian where blood ran into the ash) was never placed in the Gate.
