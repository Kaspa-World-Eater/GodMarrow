# Plants and litter

The small life of the floor: grass, ferns, bracken, moss, the leaf litter and twigs, and the dead plants that grew
where a little light came down and then died. In a dying world it is mostly tired, rusting or dead, and it follows its
causes: grass only where light reaches (gaps, edges, a cavern's moon shaft), ferns in wet shade, moss on the wet and
still, litter drifting against things and thin on mounds. It must never crowd the screen (MASTER_RULES 5: "Nothing small
and leafy crowds the screen") and never repeat. This page covers `deadplants.py`, `flora.py`, the wood's scatter
(`scatter_wood.py`) and the hand-drawn litter (`litter_stamps.py`).

## The real thing
- **The floor in layers** (STUDY round 13, [`old_growth_forest.md`](../../ecosystems/old_growth_forest.md)): litter
  (this year's leaves, whole and loose), fermentation (older, broken, matted, dark), humus (black, greasy); a few cm
  deep under broadleaves, drifting against logs, roots and the windward side of every obstacle, into pits, thin on
  mounds and in the lee. Moss is a map of moisture. Ferns in the damp, the pits, the seeps; grass only where light
  allows; ancient-woodland carpets mean centuries unbroken.
- **Where plants grow among stone** (chapter 2): only where water and fines collect (paving joints, wall bases, the
  uphill side of fallen blocks, cracks on top faces).
- **Variety is species** (Derek, STUDY round 11): "trees come in many forms, many shapes, many species, many age groups.
  This is true for all plants."

## How it is made
**Dead plants** (`tools/landkit/deadplants.py`), true thin 3D strokes placed in the world, depth-tested against the scene,
lit by the caller's `light(P)` (the shaft, the lamps):
- `grass(img, zb, dep, to_px, root, n, height, seed, light, wind=(0.3, -0.1))`: **each tuft its own species, size, lean,
  colour and wear from its seed:** kind chosen from tussock (twice as likely), stalk with a burst seed head, dead fern
  curled in on itself, fallen stems in a jumble; tone from straw (`STRAW`), grey, brown or blackened; blades dark at the
  root (`base * 0.45`) and pale at the tip; a quarter of a tussock's blades flattened and lying over; every blade leans
  with the draught;
- `thorn(...)`: a dried thorn bush of forking twigs with thorns (`TWIG`);
- `vine(img, zb, dep, to_px, path, seed, light)`: a dead vine along a path, stem and curled brown leaves (`LEAF`).
- Placed by cause: in the Gate, only where the moon came down (the shaft's footprint) and only in the joints where fines
  and damp gathered; lit no brighter than the stones.

**Floor life as scatter sprites** (`tools/landkit/flora.py`, for the zone's scatter layer: still pieces, and swaying
ones with three frames; no collision, no cover):
- **fern clump:** five to nine fronds arching out of a crown, paired leaflets shortening toward the tip, lit side warm
  green, shade side blue-green (`FROND`), three sway frames with the tips moving most;
- **bracken drift:** taller, coarser fronds held flat like hands, half going rust in the dying wood (`RUSTF`);
- **moss cushion:** a lumpy domed mound, its top lit, its foot dark where it meets the litter, a few spore stalks
  (`MOSS`);
- **mushroom cluster:** see [fungi and the three lights](fungi-and-lights.md).

**Grass clumps** (`tools/art_study/scatter_wood.py:grass_clump(seed, frames)`): tired grass of a dying wood; each blade a
tapered stroke from a dark pooled root to a lit tip, the clump tallest in its heart and fanning out; living blades
blue-green at the root and yellow-green at the tip, a third dead straw; blades leaning toward the upper-left light take a
step of light; three sway frames (sway -1, 0, +1).

**Litter stamps** (`tools/art_study/litter_stamps.py`): leaves and twigs drawn by hand at the 2:1 angle of a thing lying
flat, each character a tone offset from the ground under it: `H` +2 (the lit edge's brightest), `L` +1, `B` 0 (the
body), `D` -1 (dark underside or far edge), `P` the pale underside of a curled leaf (+3), `V` a vein on a skeleton leaf,
`S` shadow cast on the ground (the leaf not drawn). The light comes from the upper left: every leaf's upper-left rim lit,
its shadow to the lower right. Set down with spacing so each reads, dense on lit slopes, soft and sparse in shade.

**Litter as ground** (fen and glade): matted leaves in broad patches, their ramp brought near the peat's hue
(`fen_ground.R_LEAF`), so the ground is quiet and the bones and stones read against it; litter as height (drifts on the
windward side, deep in pits, thin on mounds) is the ecosystem's recipe; see [ground generators](ground-generators.md).

**Life:** grass sways in a wave rolling with the one wind (`core/gust.gd`, `wood_scene.gust`); leaves skitter at the
gust and fall from the canopy with their shadows closing on them as they land; each living layer has its own fixed
random sequence. See [living layers](../methods/07-living-layers.md).

**Reuse switched off in new scenes** (`wood_scene.py` switches, default on so older scenes keep theirs): `GRASS` (the old
scene's tufts in the gap), `FERNS` (its ferns in the damp), `FOREST_LIFE` (fallen and falling leaves, the wisp), `MIST`,
`BEAMS`. A new scene turns them off and brings its own (`vigil.py`, `flesh_scene.py`).

## Variants and parameters
| Piece | Where | Key parameters |
|---|---|---|
| Dead tuft, thorn, vine | `deadplants.grass` / `thorn` / `vine` | `n`, `height`, `seed`, `light`, `wind`, `path` |
| Fern, bracken, moss cushion | `flora.fern(seed, frames, bracken)`, `flora.moss_cushion(seed)` | sway frames |
| Grass clump | `scatter_wood.grass_clump` | `frames` |
| Leaf and twig stamps | `litter_stamps.py` | eight hand-made stamps |

## What worked
- **Species, not one stamp** (Gate passes 75 to 80): tussocks, seed stalks, curled ferns and fallen stems, each with its
  own colour and wear, read as dead growth.
- **Growing only where the cause allows:** the moon's footprint, the joints, the lantern's pool.
- **Form first, leaves drawn:** STUDY round 12's litter read once the drifts' light and shade were a smooth value and the
  leaves only nudged it (±0.04), and once leaves were drawn stamps with spacing.
- **Neighbours close in value:** humus one step under the leaves; contrast saved for form and focus.
- ~~**Calming the floor**~~ **OVERTURNED by Derek, 2026-10-08** ("you lost the life, the ground is 35% too barren now, looks more flat because of the vast swathes of brown, lack of litter"). Never calm a floor into broad brown patches; `litter_ground.py` now builds every leaf and twig as real height, leaves leaning by species in patches, drifts and humus a yard or two across, worn ground near bare, green moss back. The old note, kept as history: (the glade's last round): matted leaves in broad patches near the peat's hue; "no green on the
  floor" for the grim old wood.

## What failed, and why (traps)
- **One Y-shaped tuft repeated:** a pattern. Derek: "the plants in the tiles don't look unique and novel".
- **Dead plants near-black off the light,** and none placed at first because the shaft fell on flesh (pass 75).
- **Thousands of true-size leaves at full contrast:** speckle. **Drifts in hard-edged colours:** camouflage. **Each leaf
  with a random value as large as the form's:** noise. **Near-black humus between leaves:** every gap a hole.
- **Baked-in stones and leaves in a tile:** the repeat shows at once; depth can never show. Things with a shape are
  placed, not painted into ground.
- **Reused engine life in a new scene:** grass, ferns, mushrooms, falling leaves and mist from the old wood (against
  MASTER_RULES 2b.3).
- **Moss as green blotches** (fen pass 1, giant roots): camouflage; brown mosses dulled by night with ragged edges.
- **Grass that teleported:** every layer drew from one shared random sequence, so one change reshuffled the rest.
- **The hero drawn over the grass in front of his feet:** living layers keep their depth.
- **The fern loop reused the time variable's name,** freezing every layer after it.

## Derek's rulings and grades (verbatim)
- 2026-10-06: "Add bare patches and sticks and stones and grass clumps ... like a real forest floor"; the environment
  "needs a ton of work" to feel alive.
- 2026-10-06: "needs much more work and refining to even get close to even the desert tile" (the wood litter, **C-**);
  "what's the plan to get rid of the obvious patterns?"
- 2026-10-07: "Throw a little dead plant life into the scene."
- 2026-10-07: "the plants in the tiles don't look unique and novel"; "It's a good scene but nothing really blends
  smoothly. It all looks patchy and jumbled together".
- 2026-10-07: "i want this part to be dark and grimmer, older" (no green on the glade's floor).

## Where it is used
- [Caves and the organic deep](../environments/caves-and-the-organic-deep.md): the Gate's dead tufts round the shaft,
  thorn bushes by the drums, a dead vine up the front pillar.
- [Old-growth wood](../environments/old-growth-wood.md): the judge scene's grass in the gap, ferns in the damp, litter
  drifts, falling and skittering leaves; `flora.py` in the game's set; `scatter_wood.py`'s clumps.
- [The ritual glade](../environments/the-vigil.md): no reused life; the floor is matted carr (green off).

## Status
- **Dead plants:** Gate passes 75 and 80 (each its own, quiet in the floor); no Derek grade on their own.
- **`flora.py`, `scatter_wood.py`, `litter_stamps.py`:** first versions from 2026-10-06 (litter graded C-); never ten
  passes; reused in older scenes only.
- **Not built:** bramble, fallen sticks and branches, nurse-log seedlings, sedge and reed beds (fen), ancient-woodland
  carpets, a grass and fern population per scene that is its own design (MASTER_RULES 2b.3).
- **Duplicates to merge:** `deadplants.grass` and `scatter_wood.grass_clump` (one grass, living or dead by parameter);
  `flora.MOSS`, `rock.MOSS`, `log.MOSS`, `deadwood.MOSS`, `wood_scene.R_MOSS` are one moss.
