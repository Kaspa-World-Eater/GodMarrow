# Organic parts: working notes (the Gate in the Flesh)

Derek 2026-10-07: "make notes on the final product with the organic parts when I pass it."
Kept as the work goes; when Derek passes the scene this becomes the final record of how each organic part is made,
so every later scene can reuse the parts as they are.

## The eye (landkit `eye.py`)
- Ray-cast, not painted flat: each pixel is a ray along the iso camera (orthographic), hitting a lid shell
  (1.07 R), the ball (R) and the cornea dome (0.5 R, set 0.6 R forward along the gaze). The nearest hit wins.
- Lids: the shell outside an almond opening centred on the gaze; the blink closes the opening (the upper lid travels
  further). Folds run parallel to the margin, the margin is rolled and raw, with lashes, crusted pus, the wet meniscus
  and the caruncle at the inner corner. A red warmth (light through thin skin) is added.
- Ball: yellows toward the rim. Its vessels are branching paths in the gaze's polar frame, coming in from the corners
  and thinning toward the limbus. The lids shade it near their margin.
- Cornea: Snell refraction (1.34) into the eye finds the iris plane, so the iris is seen through clear fluid and
  shifts with the angle. Fresnel sky at the rim; sharp specular from the moon and every warm light.
- Iris: fibres, crypts, collarette, limbal ring, pupil (0.1 R, a little wider when the lids close).
- Lessons: a flat 2D ellipse read as a decal (D-). Only a true ball read as an eye. The gaze must point up to look
  "up"; pointing it at the camera made it stare.

## The ground (landkit `ground.py`)
- No stamped tiles anywhere (Derek: "tiles look terrible and reused"). Every surface is painted from its own world
  position, and the generator is the asset.
- Ash: broad tone pools, drifts banked along the wind, ripples only on soft drift, crusted plates only in patches.
  Its cells are warped so no lattice shows, the cracks are broken, and it carries cinders and rare bone grit.
- Flags: courses wander as if laid by hand, and every stone has its own length, tone, bed, tilt, corner chips, crack,
  and fate (sunk or gone). Joints are thin and ash-packed, edges ragged and worn round.
- Flesh: lumps lit as domes, deep creases between the larger folds, two nets of veins, bruise and rot by place,
  pores and weeping spots, and wet sheen on the swollen tops that face the light.

## Still to note when final
The vein (pulse, dives, capillaries), the pus drips and pool, the mycelium strands, the pustules, the breathing
wave, the gate's red glow, the fangs' gum collar and blood runs.
