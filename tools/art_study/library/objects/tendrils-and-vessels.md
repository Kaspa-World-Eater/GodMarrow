# Tendrils and vessels

The god's vessels surface through its world: a vein as thick as a man's leg threading in and out of the Gate's broken
floor with a pulse running toward the gate; raw gore tendrils spiralling up the courtyard's pillars with pustules of
sickly yellow light; in the ritual glade, thin blood tendrils creeping out of the pools and up the altar tree, a hint on
the others. Some of the glade's are fresh and wet, some dried to husks: growing, or all that is left of something that
already came? Nobody knows. The Hollow Wood's trunks are veins too (see [trees and bark](trees-and-bark.md)). This page
covers `vessel.py` and its three uses, and the mycelium and capillaries beside them.

## The real thing
- **Chapter 3, [teeth, sinew, muscle and flesh](../../chapters/03-teeth-sinew-muscle.md), §4:**
  - veins under skin look blue-grey to blue-green, soft-edged, deeper ones wider, fainter and bluer, a faint raised
    ridge in raking light;
  - they **wander and fork in Y shapes**, few branches tapering downstream, with frequent cross-links: **never a perfect
    tree**;
  - exposed veins are dark purple-red, thin-walled and flattish; arteries rounder; capillary nets as fine red lace;
    **dried vessels black-brown threads**;
  - pustules: tense domes, a creamy yellow-white centre under a thin glossy cap, a red halo.
- **Muscle and rot** (chapter 3 §3): flesh reads by its fibre grain; rot marbles green-black along the vessel network.

## How it is made
**`tools/landkit/vessel.py`**, a true tube ([ray-casting](../methods/02-ray-casting.md)): dense spheres along a 3D path,
each pixel's normal the sphere's real normal, so the tube is round, takes the moon along its top and the warm light on
its flank, and goes under the ground by depth.
- **`path(pts2d, ground, seed, humps=3.5, depth=0.35, lift=0.3, r0=0.24)`:** a meander added sideways (three sines,
  amplitude 0.35 yd); the height from the ground plus `r0 * 0.4`; along it a hump wave where **only the crests arch
  clear** (`clip(hump - 0.55) / 0.45 * lift`) and **only the deepest troughs dive right under** (`clip(-hump - 0.7) / 0.3
  * depth`).
- **`draw(img, zb, dep_scene, to_px, P, r0, T, lights, moon, seed, tol=0.06, ground, ramp_, taper, organic)`:**
  - radius `r0 * (1 + valve + 0.4 pulse) * (0.9 + 0.2 noise)`: valves a faint 10 percent swelling every 2.6 yd, no
    crease; **the pulse** a travelling bulge (`exp(-(((s * 0.5 - 2T) % 1 - 0.5) / 0.07)^2)`) with a dull red flush;
  - `taper=True`: thinning to 25 percent at its creeping tip;
  - `organic=True` (Derek: not a tube): it swells and pinches (`0.6 + 0.75 noise`), knots into a varix (+55 percent at
    one place a cycle), lies flattened and half sunk (`z - 0.35 r`, the normal's z scaled 0.75), its skin lumped and
    fibrous (the normal broken up) and mottled along its length (bruise and old blood);
  - `ground` given: the flesh pressed dark along both sides where it lies low, and **the skin closes over it only right at
    the ground line** (within 0.09 yd);
  - striations round the tube's angle; the moon's highlight gated by `skylit`; warm lights added through the normal;
  - `R_VEIN` (`#0c0710` to `#8a4a5e`), the dark blue-violet of a vein seen through hide, unless a ramp is given.

**The Gate's vein** (`flesh_scene.py`): `vessel.path(..., humps=2.5, depth=0.6, lift=0.42, r0=0.3)` drawn `organic=True`
with the ground; **six smaller veins fork off it** at random points, each heading off to one side, dipping from 0.12 yd
proud to 0.18 yd under, drawn `taper=True, organic=True` (r0 0.12) so they dive back under the stones; fine dark
capillaries branching off into the ground, pulsing faintly; rubble and debris heaped where it broke the floor; the game's
blood seeping beside it (pass 91).

**The gore tendrils** (`tools/landkit/gore_pillar.py:climb(p, g, hgt, prad=0.6, sd)`): two raw-flesh ropes per pillar out
of the ground and up the plinth (the first 12 percent of the path), then spiralling up the shaft (`a0 + spin * (z - g)`,
spin 0.9 to 1.6 turns a yard either way) to 0.5 to 1.0 of the height; at a random point a thinner branch (r 0.08) forks
off the other way; tube radius 0.15 to 0.2; drawn `taper=True` with `R_GORE`; 2 to 4 pustules per rope (radius 0.1 to
0.2), each breathing and a small sickly yellow light (`SICKC`, short reach, weak; `pustule_lights`).

**The glade's blood tendrils** (`vigil._tendril_paths`, `blood_tendrils`): six on the altar tree, one each on four
other trees; each starts as a root back across the ground to the blood (ten points, 0.08 yd apart, at ground height),
then climbs the bark hugging the warped trunk's real lobed and channelled surface (`_lobe`, `_channels`,
`Warp.from_canon`, plus the wind's lean), 1 to 2.6 yd high on the altar tree, 0.35 to 0.7 elsewhere; on the altar tree
they set off beside the arch (`(W + 0.18) / r` round the trunk) and are steered so they **never cross its mouth**; 45
percent are **husks**: `R_HUSK` (dried brown-black), radius x0.8, drawn at `T = 0` so no pulse; the wet ones `R_TENDRIL`
(dark blood red) and pulsing; radius `0.035` (altar) or `0.025`, then **35 percent bigger** (Derek); `taper=True`.

**The mycelium** (Gate passes 7 to 8, scene-local): living strands from the manes' feet, the eye's folds and the fangs,
above ground with a shadow, diving in through small dark holes and surfacing, branching, a slow glow travelling along
them, the tips creeping; fewer, shorter, continuous lines, each fading as it reaches away from where it grew.

## Variants and parameters
| Use | Settings |
|---|---|
| Gate vein | `path(humps=2.5, depth=0.6, lift=0.42, r0=0.3)`, `organic=True`, `ground` |
| Gate forks | r0 0.12, `taper=True`, `organic=True`, six per vein |
| Gore tendrils | `climb`: two ropes, spin 0.9 to 1.6, branch r 0.08, `R_GORE`, `taper=True` |
| Glade tendrils | r0 0.035 / 0.025 x1.35, `R_TENDRIL` or `R_HUSK` (45 percent), husk `T = 0`, `taper=True` |

## What worked
- **Sphere splats with real normals:** "the vein round and lit at last" (pass 45).
- **Half buried, arching clear only at its crests** (pass 46), the skin closing only at the ground line (pass 48).
- **Not a tube** (pass 92): swelling, pinching, knots, flattened, lumped and mottled, forking into the cracks: "the vein
  sunk, lumped and knotted".
- **Following the real surface:** the glade's tendrils hug the warped bark's lobes and channels.
- **Story by state:** wet and pulsing beside dry husks leaves the question open, as the lore wants.
- **Routed round the arch,** never across the opening.

## What failed, and why (traps)
- **Separate red worms,** one from inside the pore (Gate pass 1); **floating arcs** above the swell (passes 2 to 20).
- **A flat pink pipe** of ellipse splats with ad-hoc light (pass 40).
- **A thin hose with hooked ends,** too straight (pass 45).
- **Grub segments:** valve creases every 1.3 yd read as segments (pass 46); a regular period reads as segments.
- **Each dive ending in a round cap;** then the skin **swallowing nearly all of it** (pass 47, an overcorrection).
- **"Tubish"** (Derek, pass 90): a uniform tube, however lit, reads as a pipe.
- **Pustule lights flooding the cavern yellow** (pass 65): 25 lights reaching yards, summed; then thin red threads
  that did not read. Small local pools, thicker tendrils.
- **The tendrils crossing the altar's opening** (glade bug).
- **The mycelium netting the ground like scribble,** dotted (pass 7).
- **The Moor's veins as flat lines like paths** (moor pass 5, scene-local): narrower, swollen dark cords lit on their
  backs with a shadow on the ash, diving under in places (pass 9).

## Derek's rulings and grades (verbatim)
- 2026-10-07: "a pulsating vein digs underground".
- 2026-10-07: "And some gore tendrils running up the pillars with pustules emitting a sickly yellow light."
- 2026-10-07: **"A+ on the gore."**
- 2026-10-07: "fix the big purple vein so it isn't so tubish".
- 2026-10-07: "pull the pillars out, and keep the tendril on them, turn them into assets".
- 2026-10-07: "the first hint of the blood tendrils creeping up the tree and a tiny amount on the others"; "increase the
  tendrils in size by 35%".

## Where it is used
- [Caves and the organic deep](../environments/caves-and-the-organic-deep.md): the Gate's vein, its forks and
  capillaries; the gore pillar.
- [The ritual glade](../environments/the-vigil.md): the blood tendrils.
- [The Ashen Moor](../environments/ash-moor.md): the veins breaching the ash (scene-local, `moor_scene.py`).

## Status
- **Gate vein and gore:** **A+ on the gore** (after pass 61; the vein reworked at 92 at Derek's word).
- **Glade blood tendrils:** 3 passes, **C+**; owed seven.
- **To do:** the tendrils "meatier and more fibrous" (chapter 3's fascicles, pass 66 note); Y-forks with cross-links on
  the glade's tendrils (they do not fork yet).
- **Duplicates to merge:** the Moor's painted veins and the mycelium (scene-local) onto `vessel.py`; `gore_pillar.climb`
  and the copy of it in `flesh_scene.py`.
