# The Ashen Moor

Open upland under ash: the Ashen Moor, with its neighbours the Burnt Heath, the Sighing Ridge and the Ash Shore
(Act I, the Hide; Maren's camp, the Act I town, stands on the Moor). Here the god's body is its **cheek**, where it
struck first. "The ash is warm because the flesh beneath is still cooling"; black glass forms where a Husk's blood
ran into the ash; the surveyor thinks "the ground draws in with the cold and lets out with the warm, as a face does".
Landmarks: the Sighing Lantern, the Widow's Stumps, the Broken Kneeler, the Ashwake milestones, and the ring of
teeth below the Kneeler. The Gate in the Flesh also belongs to the Moor: the god breaking its skin, which later
became a cavern under it (see [caves-and-the-organic-deep](caves-and-the-organic-deep.md)).

## The real thing
The ecosystem chapter is [`ecosystems/moor_and_heath.md`](../../ecosystems/moor_and_heath.md): poor acid upland,
heather and grass, bracken on the drier slopes, few trees and those wind-bent and alone, peat in the wet hollows, rock
breaking through, heath burning in patches and regrowing as a mosaic, constant wind, everything leaning.

Ash is studied in [chapter 1](../../chapters/01-detail-and-nuance.md) (ash on the Moor) and
[chapter 2](../../chapters/02-ruins-ash-rock-scree.md) (volcanic tephra and wildfire ash):
- **Grain sizes:** ash under 2 mm is colour only; lapilli are half-pixel speckle; blocks and bombs are objects.
- **Wind:** ripples 5 to 20 cm apart across the wind, coarse lag on the crests; against every object a windward
  pile, a scour-moat at its foot and a tapering tail downwind.
- **Rain:** fresh ash crusts and carves branching rills; wet ash goes 30 to 40% darker and cracks into polygons with
  curled, lit rims.
- **Burial:** ash fills every ledge, flute bottom and joint first, so **groove bottoms are pale and ribs dark**, the
  reverse of the usual dark-crevice rule.
- **Wildfire ash is a thermometer:** black char at about 300 °C, grey to white above 400 °C, and white "ghosts" in
  the shapes of what burned away.
- **Obsidian:** black glass with conchoidal rippled fractures, razor edges and glints: the lore's black glass.

## How it is built
**Causes first.** The wind map makes the open ground: ash deepest in the hollows and in the lee of rocks, drifts and
tails behind every object, ripples only on soft drift. Heather on the drier slopes, grass and peat in the wet, lone
trees only in shelter, everything leaning one way. Then the god's places, each by its lore: the hide where the ash
has blown thin, veins running in toward what they feed, black glass where blood ran.

**The floor** is a world-position generator: `ground.ash` in `tools/landkit/ground.py` (broad tone pools, drifts
banked along the wind, ripples only on soft drift, crusted plates in patches on warped cells so no lattice shows,
cinders and rare bone grit). The older seamless tiles in `art_study/tiles_moor.py` (`ash_0`, `hide_0`) are the retired
tile road (MASTER_RULES 2b.6). For Godot, the plan is a ground shader painting from world position
(`docs/archive/ACT1_PLAN.md`, "The new art and the seeded maps").

**Objects and methods:**
- The teeth of the Jaw (`landkit/tooth.py`, fang or molar in its gum) and the Gate's fangs (`fang.py`):
  [teeth-and-fangs](../objects/teeth-and-fangs.md). The two are duplicates to merge.
- The Broken Kneeler (`kneeler.py`): [columns-ruins-iron](../objects/columns-ruins-iron.md).
- The eye in the ash: [eyes](../objects/eyes.md). The Moor scene's own eye predates the approved `eye.py` and should
  be rebuilt on it.
- Veins breaching the ash: [tendrils-and-vessels](../objects/tendrils-and-vessels.md).
- Ash, hide and flesh grounds: [ground-generators](../objects/ground-generators.md); stone and black glass:
  [stones-rocks-paving](../objects/stones-rocks-paving.md).
- No canopy: the moon full on the ash, the Sighing Lantern breathing as the warm light ([light](../methods/04-light.md));
  ash drifting in the one wind ([living layers](../methods/07-living-layers.md)); forms under the law
  ([form and depth](../methods/01-form-and-depth.md)).

## Its scenes
- **The Jaw, `tools/art_study/moor_scene.py`** (log `landkit/passes/moor_scene.md`, 10 passes). The ring of teeth
  below the Broken Kneeler round a breathing pit of ash, about 11 yd across; teeth 2.5 to 4.5 yd; the eye in the ash;
  hide and veins; the Kneeler five yards high as it kneels, its head fallen face up; the Sighing Lantern with the
  tenders' tally notches. Built on the wood's engine with the forest life switched off.
  Progress: the ring reads as a jaw in the ash (pass 3); teeth lit by their own round normals (pass 4); the god
  everywhere (pass 5); hide as soft domes with coarse hairs, veins as swollen dark cords (passes 8, 9).
  **No grade from Derek recorded.** Last open faults: the eye a clean cartoon ellipse, the molars' stain read as
  grilles, the Kneeler's folds first cut as slits.
- **The Gate in the Flesh, `tools/art_study/flesh_scene.py`** began on the open Moor (fangs bursting up through ash,
  ash with drifts and ripples, Pompeii paving) and became a cavern under it. Its full story is on
  [caves-and-the-organic-deep](caves-and-the-organic-deep.md).

## What worked
- Ash given form: drifts and ripples lit on the moon's side and shaded on the far side, crests lit (Gate, pass 53);
  light-direction slope shading for the ground's micro-form (report 1, technique 11).
- Ash as a generator painted from world position: no repeat anywhere.
- Gradual edges: paving running out under ash in stages, the joints filling first (ash fills the lows first).
- One swollen gum ridge under the whole ring of teeth, with ash drifted over it in broad tongues: one jaw, not
  separate red rings.
- Teeth lit by their own true round normals: height-field normals on a steep cone flicker into a checker.

## What failed (traps)
- The wood engine's leaves and saplings all over the Moor: a non-forest land must switch the forest life off (pass 2
  set the flag in the wrong place; check it took).
- Ash as Voronoi cracks: a hex lattice; ash crust in a seamless tile read as "terrible and reused".
- Lantern-lit ash confetti-noisy; a white dash grid that was a thread pattern over too wide a band.
- Ash "flat dirty concrete" until drifts and ripples were real form.
- Hide as flat pink carpets and veins as flat lines like paths: both needed height lit by the moon.
- Gum blotched across the way in; the way in must stay open.

## Derek's rulings (verbatim)
- "pick another place in Act 1 lore and do it ... more of the god peeking through from now on" (the Jaw).
- "Tiles look terrible and reused, rule was every piece unique and a work of art."
- "The ground looks pretty bad still"; "the stones and tiles just look awful, you really need to spend a lot of time
  on that".
- "study famous ruins and Ashen grounds and the forms of different types of rocks and scree and then apply it to your
  tile building."
- MASTER_RULES section 5: more of the god in every place, "its bones, hide, veins, eyes, teeth and blood in the
  ground, the stone and the trees, always as the lore of that place describes it".

## Status and what is next
- The Jaw: ten passes, waiting on Derek's grade; the eye to be rebuilt on `eye.py`, the teeth merged into one tooth
  generator built from chapter 3.
- The Moor's own open ground (heather cushions, moor-grass tussocks, bracken, peat pools, outcrops, cairns, wind-bent
  trees, the Widow's Stumps) is not built. The game's `moor`, `heath` and `ridge` sets are the old tile road.
- Black glass and white ash ghosts are studied (chapter 2) but not yet built as objects.
- Next: the Moor as its own scene from its ecosystem (wind map first), and `ground.ash` ported to the Godot ground
  shader.
