# Caves and the organic deep

Underground, and further into the god. In Act I this is the Root Deep under the Hollow Wood (the country under the
Hide, which breathes), the Rib Crypts dug between the god's ribs, the catacombs ("at the bottom there is something
warm"), and the cavern of the Gate in the Flesh under the Ashen Moor. Deeper acts follow the same road: the Marrow
Cavity in the Ossa, Shog-Mire's flesh and blood, the Breath-Caves of An-Vhar, and the Descent of Act V, where "no
ecosystem is left that isn't the god". The one cave built so far is the Gate in the Flesh: the god breaking up
through ancient paving in a room it "held open inside itself, wide as the Moor and wider".

## The real thing
- [`ecosystems/organic_deep.md`](../../ecosystems/organic_deep.md): every land carries a hidden variable, **depth
  into the god**. As it rises, materials shift (litter greasy, water red, stone to bone), the god's own structures
  intrude (ribs, veins, marrow along roots), life thins (fungi first, then only the body's growths) and the body
  glows with its own light, restrained. Within one zone the deep places carry more of the god than the surface.
  Restraint: hint, never explain; the deeper the act, the more open.
- [Chapter 4, stone and caves](../../chapters/04-stone-and-caves.md): real cave walls (scallops, flowstone, lava-tube
  benches and lavacicles, columnar basalt), floors (breakdown slabs, silt, drip pits, level puddles), and cave light
  (a skylight shaft throwing a hard-edged pool; a beam seen only where dust hangs in it and only against darkness;
  "the blacks were most important"; few lights, each with a reason). What reads as deep: black as a shape, overhead
  mass, grazing light, value steps by distance.
- [Chapter 3, teeth, sinew, muscle and flesh](../../chapters/03-teeth-sinew-muscle.md): the tooth's one gradient
  (dentin-yellow at the gum, translucent blue-grey at the tip), fangs lobed and keeled, dried sinew translucent amber,
  flesh read by its fibre grain and coloured by exposure, veins blue-grey under skin, pustules with a red halo.
- [Chapter 2](../../chapters/02-ruins-ash-rock-scree.md): the flesh enters through the joints and lifts stones by
  their edges, as Angkor's roots do.
- [Report 1, the Gate in the Flesh](../../reports/01-gate-in-the-flesh.md): every technique tried, what worked, what
  failed and why. Read it before any organic or cave piece.

## How it is built
**One rule for the whole place.** Ancient stone everywhere; the god only where it breaks up from below, through the
fractures and the joints, welling into sheets and opening into wounds at its own parts (the eye, the vein, the pool).
Then one light and one air. In order:
1. **The cause:** a network of great fractures across the old floor, hairline far off, opening into wounds at the
   god's parts. The heave is placed only near those parts.
2. **The floor's form into the world** (the depth effect, MASTER_RULES 0.6): `ground.paving_height`,
   `ground.flesh_height` and the locked `ground.craggy_height` add real height on the 0.04 yd grid; the colour is
   called with `selfshade=False`, and the engine lights the real normals.
3. **The walls:** columnar basalt prisms at broken heights, bevelled, dark joints; the same warm basalt as the floor
   (one stone); fissures low in them where the god's heat still glows dull amber.
4. **The light:** a cavern roof with one ragged hole letting the moon down as a single shaft onto the star (the eye);
   every piece's moon terms gated by the shaft; banked offering-fires, the pustules' small sickly pools, the ember glow
   deep in the gate's passage backlighting the bars. Light adds, then tints. No red light.
5. **Contact and sinking:** the eye rises out of rolls of flesh; the vein half buried, the skin closing at the ground
   line; bones and rubble take their ground from the same height.

**Objects and methods:** [eyes](../objects/eyes.md) (`eye.py`, approved B+); [tendrils-and-vessels](../objects/tendrils-and-vessels.md)
(`vessel.py`, `gore_pillar.py`); [teeth-and-fangs](../objects/teeth-and-fangs.md) (`fang.py`); [bone](../objects/bone.md)
(`bone.py`, `remains.py`); [blood-and-fluids](../objects/blood-and-fluids.md) (`blood.py`, the pus pool);
[columns-ruins-iron](../objects/columns-ruins-iron.md) (`column.py`, `gate.py`);
[stones-rocks-paving](../objects/stones-rocks-paving.md); [plants-and-litter](../objects/plants-and-litter.md)
(`deadplants.py`, grown only where the shaft came down); [fungi-and-lights](../objects/fungi-and-lights.md) (`fungus.py`,
kept as an asset); [ground-generators](../objects/ground-generators.md). Methods: [form and depth](../methods/01-form-and-depth.md),
[ray-casting](../methods/02-ray-casting.md) (a shared z-buffer, depth tolerance 0.4 to 0.7 yd),
[light](../methods/04-light.md), [values, ramps, dither](../methods/05-values-ramps-dither.md),
[living layers](../methods/07-living-layers.md) (the blink, the pulse, breathing glows).

## Its scenes
**The Gate in the Flesh, `tools/art_study/flesh_scene.py`** (log `tools/landkit/passes/flesh_scene.md`, over 100
passes; report 1). Derek's design: "a few large fangs busting through in a line, with rot and fungus spreading across
the ground like putrid flesh, a pulsating vein digs underground"; "the eye should be 3 dimensional and slowly blink a
pus filled blink then drips into the pool"; "put a huge gate in the back, we will have a mini boss that emerges from it
later". Its course:
- Open-Moor courtyard (passes 1 to 61): the eye from **D-** ("needs a ton more work") to **"Eye looks great, document
  it"**, then **B+**; stamped tiles replaced by `ground.py`; Pompeii paving; the colonnade from chapter 2.
- After pass 61, Derek: **"A+ on the gore."** "The teeth still look lacking. And the ruins need more going on ... And
  let's turn this into a cavern. The cinematography is lacking." The cavern and its single shaft (62 to 64), gore
  tendrils with pustule lights (65, 66), the gate rebuilt (67 to 69).
- "It's a good scene but nothing really blends smoothly. It all looks patchy and jumbled together": one rule, one
  light, one air (78 to 85). The pillars pulled out as assets; skeleton pieces placed by story.
- "remove all the teeth. remove the cloud stuff ... it looks cartoony": fangs, drums and stalagmites out (kept as
  assets); chapter 4 written.
- "it's 1 dimensional, there's no depth to it, no 3D": the depth effect (89, 90), then "Much better"; the craggy floor
  locked; stones faceted (93); walls as columnar basalt (94).
- The latest passes: one stone for floor and walls, the eye rising out of the ground, the rib arch and skull hung
  high over the door ("move it higher").

Derek's purpose for it: "This area can be an entrance to an underground area later after we fight the gatekeeper." In
the seeded maps it is a set piece dropped in whole, as Diablo II drops fixed rooms (`docs/ACT1_PLAN.md`).

## What worked
- Ray-casting organic forms along the game's camera (the eye from D- to B+ only as a true ball); refraction through
  the cornea; sinking things into their ground (a thing set on the ground reads as a helmet).
- Fluids that travel over real surfaces; the pool levelled.
- A cavern lit by one shaft: it turned a lit diorama into a shot.
- One rule, one light, one air, gradual edges: cohesion.
- The depth effect, and faceted stones and basalt prisms under it.
- Small true-scale things (a 4 px skull) placed on calm stone in light, not on busy flesh.
- Things removed are kept as assets (gore pillar, fangs, columns, fungi, the cyst in git history).

## What failed (traps)
- Building from imagination: every harshest grade (eye D-, tiles, stones, teeth) came from it.
- Colour pretending to be form: painted lips, painted stains, a floor whose heights only shaded its colour.
- The low moon put the roof's hole over a wall and shadowed the floor; ungated moon terms made every piece glow as
  under an open sky; dust as a starfield.
- 25 pustule lights with long reach summed flooded the cavern yellow; each must be a small local pool.
- Heave from the distance to any flesh tipped every stone (a boulder field; Derek liked it, so it is locked as the
  craggy floor for ground torn up from below).
- The rib's tube distance dropped the along-segment offset (a dark brown gable); stamped and ray-cast twins
  disagreeing on the ground (columns standing on themselves).
- The gate's red glow broke "no red light".

## Derek's rulings (verbatim)
- "Review what it means to detail and nuance things, make it like the real world."
- "pull the pillars out, and keep the tendril on them, turn them into assets ... So everything looks ancient except
  this weird biological stuff coming through the cracks in the floor."
- "The sheets are fine too. We can have both."
- "Add the form rule to the rules. It's important because it gives depth and realness, not flat painted bullshit."
- "blend the eyelid flesh down and have folds making it look like it's coming out of the ground ... the grey wall
  clashes with the brown floor, it should be the same materials for the most part".

## Status and what is next
- In work; report 1 is still open. Its list: the teeth (removed here, owed as an asset from chapter 3), sinew as
  translucent amber, flesh by fibre grain with pustule halos, the animation checked as a loop.
- The Root Deep, the crypts and the catacombs have no scene yet. Depth into the god is not yet a map the generator
  reads.
- Next: port the floor generators (paving, flesh, craggy) to the Godot ground shader, and bake the set piece's
  objects as sprites with normal maps and collision.
