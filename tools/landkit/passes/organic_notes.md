# Organic parts: working notes (the Gate in the Flesh)

Derek 2026-10-07: "make notes on the final product with the organic parts when I pass it."
Kept as the work goes; when Derek passes the scene this becomes the final record of how each organic part is made,
so every later scene can reuse the parts as they are.

## The eye (landkit `eye.py`): APPROVED

Derek's grade: D- at pass 24 ("needs a ton more work"); after passes 25-39: **"Eye looks great, document it"**
(2026-10-07). From now on it is a canonical asset: any change must keep or raise it, and every eye of the god in the
game (weeping tree eyes, eyes in walls, the eyes that name monsters) should be built on this one, in this one place.

### The brief (all Derek's words, all met)
"3 dimensional and slowly blink a pus filled blink then drips into the pool"; "where the cyst was, looking up,
and include the folds and everything in the flesh"; "elliptical and seen slightly from the side, looking up, so we
can see the vitreous fluid transparency"; "more bulbous".

### How it is made
It is ray-cast per pixel, not painted: each screen pixel is a ray along the game's iso camera (orthographic, view
direction (1, 1, 2*9/21) normalised), started behind the eye and run toward the camera. Three shapes are hit and the
nearest wins:
- **The lid shell**, a sphere of 1.13 R round the ball. Everywhere outside the almond opening it is the lid. The
  opening is centred on the gaze: half-width 0.84 and half-height 0.4 (on the unit sphere), shaped
  `(1 - (a/W)^2)^0.6`. The blink shrinks the height to nothing while the upper lid's centre travels further
  (`-0.15 H` at full blink).
- **The ball**, a sphere of R.
- **The cornea**, a sphere of 0.5 R set 0.66 R forward along the gaze, so it bulges as a clear dome over the iris.

Lighting is the moon (cool, `ws.SUN`) plus every warm scene light as (position, colour, reach), with ambient 0.16.

### Each part
- **Lids:**
  - folds run parallel to the margin (`sin(edge*26 + noise)`), tilting the normal so each fold lights and shades;
  - the margin rolls toward the opening, raw and redder;
  - fine bump noise, small veins, and a red warmth added for light through thin skin;
  - a soft sheen; pus crusts the margin, beads along the lower lid and thickens in the corners, glossier than the skin;
  - coarse lashes lean out of the margin, and the wet pink caruncle sits in the inner corner;
  - the lid's foot darkens as it sinks into the socket (contact).
- **Ball (the white):**
  - sallow and sick: a warm base (0.84, 0.74, 0.5), blotched, yellowing harder toward the lids;
  - 22 branching vessels grown in the gaze's polar frame. They start near the lids' edge (about 90 degrees from the
    gaze), mostly from the corners, wander, fork, and thin toward the limbus, each with a flush round it;
  - the lids shade it near their margins, and a wet meniscus shines where lid meets ball.
- **Cornea and iris:**
  - each ray that hits the cornea is refracted (Snell, index 1.34) into the eye to find the iris plane at 0.72 R
    along the gaze. The iris is therefore seen *through* clear fluid and shifts with the viewing angle; this is the
    "vitreous transparency";
  - the iris carries radiating fibres, dark crypts, a bright collarette ring, a dark limbal ring and the pupil
    (0.1 R, a little larger as the lids close);
  - rays passing the iris's edge see the white through the dome;
  - Fresnel reflection of the cold sky grows toward the dome's rim;
  - sharp highlights (power 140) of the moon and of each warm light make it wet.
- **The socket (in the scene's height field):**
  - a raised ring of flesh round the eye at 1.0 x its radius;
  - concentric folds beyond it, with radial wrinkles;
  - the ball's centre only 0.12 R above the ground, so it rises out of the flesh rather than sitting on it.
- **The pus runs (scene):**
  - four runs leave the lower lid's margin and travel over the socket's own surface (each point lifted to the
    ground's height) down to the pool, meandering a little;
  - a wet trail lies behind each drop and a dull old trail ahead;
  - the drop itself swells as it goes.

### In the scene
`EYE = (C + AX*8.6 + PERP*3.4, 1.7)`, radius `Ry = 1.7*0.95` yd. The gaze is `AX*0.25 + PERP*0.3 + up*1.0`: up, a
little toward us and aside. Blink: `clip(1 - |T-0.62|/0.13)^0.8`, slow, once a loop. It is drawn in `living_flesh()`
with the shared z-buffer, so the scene's nearer objects hide it.

### Lessons from its passes (for every organic piece after)
1. A flat 2D ellipse read as a decal (D-), and only a true ball read as an eye. Form first, ray-cast.
2. Pointing the gaze at the camera made it stare. "Looking up" means the gaze truly points up and is seen from the
   side.
3. A ball standing on the ground read as a helmet. It must sink into a raised socket, with the lids' foot darkening
   into it.
4. With the gaze up, the far lid is unseen unless the lid shell stands proud of the ball (1.13 R). Thickness is what
   shows a lid.
5. A clean grey white looked dead. Sick yellow, blotches and many fine vessels made it alive and wrong.
6. Keep other objects' see-through ghosts and plinths off it, and give it room.
7. Pus must travel over real surfaces. Straight lines through the air read as scratches.

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
