# Values, ramps and dither

Every lit value is snapped to a short hue-shifted ramp per material, in whole world pixels, with the 4x4 ordered
dither only where one tone meets the next. How many tones a form gets depends on its size on screen. Big shapes are
laid in a few clean tone groups first; texture stays subordinate; open ground stays quiet so the story's small
things can read against it. Small things read by contrast, never by being drawn larger than they are. Use this page
whenever a ramp is chosen, a material painted or a small detail placed.

## The rule
- [PAINTED_STANDARD](../../../../docs/PAINTED_STANDARD.md) rules 1 (broad flat tones from a short ramp), 2 (dither
  lightly, at edges), 7 (whole world pixels), 9 (hue-shift every ramp), 14 (detail where it counts, open ground
  quiet); checklist lines 5 to 7 and 9.
- [MASTER_RULES](../../../../docs/MASTER_RULES.md) section 3 and checklist lines 5 to 7.
- [Chapter 4](../../chapters/04-stone-and-caves.md) section 3 (tones by size) and section 5E (ramp 3 to 4 steps per
  material plus near-black; dither never on stone faces).

## How it is done
**Hue-shifted ramps.** Darks lean violet-blue, lights lean warm; saturation highest in the mid-tones, lower at the
ends (STUDY round 1: about 10 to 15 degrees a step for skin, wood and bone, 15 to 20 for foliage, crystal, slime).
A ramp is a list of hex colours, dark to light (`kit.py:ramp`, `tiles_wood.ramp`); a value `v` in 0..1 picks
`ramp[int(v * len(ramp))]`. Examples in use: `bark.R_BARK` and `wood_scene.R_BARK` (8 tones), `flat_stone.STONE`
(8, this Wood's dark damp stone), `fen_ground.R_PEAT`, `R_LEAF`, `R_SPHAG` (6 each), `hollow.R_ROT` (6), the red wax
`R_WAXRED` (6), `blood.py` (4: clot, dark red, body, lit red).

**Tones by size.** Chapter 4 (from the pixel-art tutorials): two tones at 16 px, three at 32, four to five at 64,
"so **a 10 px stone gets three tones at most**" plus a lit edge and a black joint. The stump's top, about 30 px
wide, was simplified to three planes, one tone each (stump pass 6). Big forms (a trunk 36 px wide, a giant's flank)
carry six to eight tones.

**OPEN QUESTION for Derek: how many tones per material?** The rule documents disagree:
- PAINTED_STANDARD rule 1: "Four or five tones per material";
- PAINTED_STANDARD rule 9 and checklist line 6, MASTER_RULES section 3 rule 9 and checklist line 6: "six to eight
  tones per material";
- chapter 4: by size (three for a 10 px stone; "3 to 4 steps per material plus near-black" in its recipe);
- the Seer's Bowl title (the quality bar) uses 12 (library README).
Practice now is by size: big forms 6 to 8, small stones 3 to 4. Until Derek rules, note in each pass log which
count a piece uses and why.

**Dither only at tone borders, in a narrow band.**
- The 4x4 Bayer matrix `B4` (`kit.py`, `blood.py`, `fog.py`, `wisp_fire.py`, `candle.py`, `wood_lights.py`) indexed by
  the screen pixel `(sy % 4, sx % 4)`.
- Narrow band: dither only where the value is within 0.035 of a step, `|q - round(q)| < 0.035` (report 1, technique
  9). Amplitude about plus or minus 0.07 of the value at most (PAINTED_STANDARD rule 2); the engine's whole-field
  `(bay - 0.5) * 0.05` and `kit.paint(..., dither=0.05)` stay under that.
- Effects dither only their own edge: `fog.py` drops alpha on the Bayer threshold only where density is 0.1 to 0.16;
  `wisp_fire.py` dithers only the flame's border; `candle.py` and `wood_lights.py` dither the falloff of their glow.
- Never dither stone faces (chapter 4). On sand, a stroke-shaped jitter along the crests replaced Bayer where the
  checker showed in shade (STUDY round 10).

**Quiet ground.** Neighbours close in value; contrast saved for form and focus (STUDY round 12). The fen floor's fix
(`fen_ground.py:paint`, "finishing the glade"):
- matted leaves in **broad patches**: `vn(px * 2.6, py * 2.6) * 0.8 + vn(px * 8, py * 8) * 0.2 > 0.45`, a large
  low-frequency field, not pixel noise;
- the leaf ramp `R_LEAF` brought **near the peat's hue** (`R_PEAT`), so the patches change material, not value;
- moss with ragged cushion edges (a small noise added to the threshold, plus or minus 0.06), never blobs;
- the result: "the ground is quiet, the eye rests on it, and the bones and stones read against it".

**Small things need contrast, not size** (report 1, technique 22). True scale is the law
([MASTER_RULES](../../../../docs/MASTER_RULES.md) section 5), so small story pieces are a few pixels:
- a human skull is **about 4 px**; on busy flesh it vanished, on calm stone in the lantern it reads;
- a rune is a **4 x 5 px glyph** with whole-pixel strokes (`hollow.py:rune_mask`: glyph cell 0.22 yd, band 5 px tall,
  stroke width a whole pixel, gaps between glyphs);
- a cap of the three lights is **2 px** (`wood_lights.py`: three or four cells, top, top shaded, rim); a ground
  candle is a wax column 2 px wide with a 2 to 3 px flame (`candle.py`);
- the stump's bores, which carry its story, had to grow from 2 to 3 px with a lit wet lip rolled out as height
  (stump pass 11);
- in pixel art a carved line is one lit pixel on the near lip and one shadow pixel on the far lip (chapter 2);
- place small story pieces on quiet ground and in light; brighten bone to ivory under any light (Gate pass 84).

## What worked
- The fangs in clean tone groups (light, half, core shadow, warm light thrown up into the shade): "painted ivory"
  (Gate passes 51, 52).
- The narrow dither band: the checker over the enamel went away (passes 42, 43, 52).
- The fen floor calmed: broad leaf patches near the peat's hue (glade, "finishing the glade").
- `flat_stone.STONE`, the Wood's own dark damp stone, in place of the borrowed sandstone ramp: the stones "no
  longer shine cream in the lantern; they sit in the ground".
- The ruin's flag tones and temperatures between neighbours halved: "a floor, not a board" (ruin pass 16).
- The runes as 4 x 5 px glyphs: "the runes ring the arch" (C+).

## What failed, and why
- **Speckle**: thousands of true-size leaves at full contrast, each with its own random value as large as the
  form's (STUDY round 12); fine crusts of noise on every surface (report 1: "texture louder than form").
- **The floor speckle in the glade** (critique, B- round): the fen's fine speckle stayed busy at the edges until the
  broad patches and near-hue ramp.
- **Camouflage**: hard-edged masses in different colours (round 12's drifts; the fen's first moss "too green and
  blotchy"; lichen in blotches on the gate, pass 67).
- **The wide dither band**: a checker over whole surfaces (fangs pass 41).
- **Every gap a hole**: humus near-black between leaves (round 12). Neighbours one step apart.
- **A ramp that tops out too low**: on a ramp ending at 0.4, a +2 tone step is invisible (STUDY round 4). Brighten
  the lit end first.
- **The cream stone**: the stump (pass 2) and the near flat slab were the brightest things in the frame until their
  ramps were greyed and scaled down.
- **Sub-pixel marks**: runes a third of a pixel; giant's limb scars 2 to 3 px read as specks until drawn at true
  size 0.2 to 0.3 yd (giant passes 7, 8); vein cords 1 to 2 px wide broke into a checker until painted as one clean
  tone (ruin passes 8, 9); a 7 px knot barely resolves (STUDY round 4).
- **Pale on pale**: Cap Hollow's bones lit to glare were white scribbles until held to ivory with a one-pixel contact
  shadow (hollow_camp pass 7).
- **Checkerboard flags**: the nave floor's tones jumped too far between neighbours (ruin_scene rules check).

## Derek's rulings and grades
- 2026-10-06: "Make it the new standard and apply it to everything moving forward." (the painted standard)
- 2026-10-06, the wood tile, graded C-: "needs much more work and refining to even get close to even the desert tile";
  then "what's the plan to get rid of the obvious patterns?"
- 2026-10-07: "Tiles look terrible and reused, rule was every piece unique and a work of art."
- 2026-10-07, after Gate pass 61: "The stone tiles look too similar."
- 2026-10-07, the glade's floor: "for the tiles make them a little fen like". The glade was graded B- with "the
  floor's fine speckle ... still busy at the edges" left to do; Derek then: "do the upgrades, then rewrite the
  guide", and the speckle was calmed in that round.

## Used by
- Landkit: `kit.py` (`ramp`, `paint`, `B4`), `fen_ground.py`, `flat_stone.py`, `hollow.py` (`rune_mask`),
  `wood_lights.py`, `candle.py`, `blood.py`, `fog.py`, `fang.py`, `bark.py`.
- Scenes: `wood_scene.py:paint`, `vigil.py`, `flesh_scene.py`, `ruin_scene.py`, `hollow_camp.py`.

## Sources
- [PAINTED_STANDARD](../../../../docs/PAINTED_STANDARD.md); [MASTER_RULES](../../../../docs/MASTER_RULES.md) section 3
- [Chapter 4](../../chapters/04-stone-and-caves.md) sections 3, 5E; [chapter 2](../../chapters/02-ruins-ash-rock-scree.md)
- [Report 1](../../reports/01-gate-in-the-flesh.md), techniques 8, 9, 22, 23
- [STUDY.md](../../STUDY.md) rounds 1, 4, 10, 12
- Pass logs: [vigil.md](../../../landkit/passes/vigil.md), [flesh_scene.md](../../../landkit/passes/flesh_scene.md),
  [ruin_scene.md](../../../landkit/passes/ruin_scene.md), [hollow_camp.md](../../../landkit/passes/hollow_camp.md),
  [giant.md](../../../landkit/passes/giant.md)
- [Library README](../README.md), "Open questions for Derek"
