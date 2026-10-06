# Art study log

Derek (2026-10-06): study drawing, painting and animating; study great games (Blasphemous, Dark Souls, Elden Ring,
Demon's Crest, Path of Exile); study how I draw now, pixel by frame; practise; apply; repeat. The bar is the Seer's
Bowl title (tools/title_study/, its method in the memory note "godmarrow-title-method").

## Round 1: reading (2026-10-06)

**Animation (SLYNYRD Pixelblog 9, 56; Blasphemous animator Raul Vivar)**
- A strike is phases: anticipation (1 frame, held), smear (2-3 brief frames), optional rebound, follow-through (held,
  1 px past the target), recover (fast). No smear on anticipation or recover: it muddies the forward motion.
- Timings (ms per frame) for 6-frame top-down attacks: sword 100 50 50 50 100 50 (400 ms);
  spear 200 50 50 50 150 50; hammer 250 50 50 50 300 100 with a rebound and screen shake.
  Weight comes from LONGER anticipation and follow-through, never from slower smears ("smears always few and fast").
- Overshoot: anything stopping misses its stop point a little, the faster the further.
- Hold a pose a few frames on a strong collision (hit-stop), subtly.
- Smears: sharp geometry reads as impact; curved reads as a sweep. A smear is a non-key frame shaped like the path.
- Blasphemous: new frames are made by manipulating the previous ones (pose iteration, not redrawing); the hero was
  first animated slow and heavy, then sped up for gameplay: weight must not cost responsiveness.

**Colour and shading (Pedro Medeiros / Saint11; hue-shifting guides)**
- Work in large clusters that imitate how light falls; flat faces one colour, round forms a ramp.
- Hue-shift every ramp: shadows drift cool (toward blue/purple), lights drift warm (toward yellow); about 10-15
  degrees a step for skin, wood, bone; 15-20 for foliage, crystal, slime. Saturation highest in the mid-tones,
  lower at the darkest and the brightest. A value-only ramp looks dull and muddy.

**Composition (Dark Souls / Elden Ring environment art)**
- Focal points: one landmark per view, given its own space; everything round it rendered looser and darker.
- Restraint: detail where the eye should go; let the rest fade. Silhouettes checked from every angle.
- Value first, colour second: Elden Ring's palette is near-monochrome; materials must belong together by value.
- Light directs the player, carves the forms and keeps no area dead black or flat.

**Pixel craft (SLYNYRD Castlevania study)**
- Build the head first, then the torso follows. Don't trace. Readability over authenticity. A few extra colours
  where they earn their place.

## Round 1: measuring my own work

| piece | colours used | value p5..p95 | saturation | orphan px |
|---|---|---|---|---|
| Ossuarch idle/front/0 | 60 | 0.01 .. 0.41 | 0.28 | 8% |
| Cursemark Crusader page | 78 | 0.11 .. 0.95 | 0.45 | 11% |
| Title chapel (the bar) | 94 | 0.03 .. 0.41 | 0.42 | 38% (dither, on purpose) |

**What this says about the Ossuarch:**
1. No lights. Every pixel is in the bottom 41% of value. The title is equally dark overall but its light POOLS:
   the brow, the bowl's rim, the candles reach 0.8+. A figure needs dark masses cut by small bright edges.
2. Grey. Saturation 0.28 against 0.42-0.45 for everything round him: he reads as a dead patch, not as black iron.
3. No hue shift visible: the plate's ramp is near-neutral grey from 0.01 to 0.4.
4. Clusters are fairly clean (8% orphans), good: the problem is value and colour, not noise.

**Next (round 2, exercises before touching the sheet):**
- E1: one shoulder pauldron of black iron, lit by a warm lantern from the right and a cold sky from the upper left.
  Ramp of 6: deep violet-black shadow, cool dark, neutral mid, warm lit, hot edge, a single specular. Compare to the
  Ossuarch's current pauldron.
- E2: a bone (the spurs, the Mantle): ivory ramp shifting from grey-violet shadows to warm cream lights.
- E3: a cloak fold (the green plume, the mantle cloth): saturated mid-tones, desaturated ends.
- E4: the six-frame sword strike at SLYNYRD's timings, on a simple figure, then on him.

## Round 1b: form, weight and feel (Derek: "Study form as well. What makes a 2D frame move and have weight and feel")

**Form in a still frame**
- Line of action: one curve through the whole figure; arrange the body along it. A straight figure is a dead one.
- Weight must go somewhere: the weight-bearing leg's hip rises, that shoulder drops (contrapposto), the spine curves,
  the head tilts to balance. Shoulders and hips are never parallel in a living pose.
- Silhouette test: fill the figure black; the action must still read. Arms clear of the body, weapon clear of both.
- Solid drawing: know the centre of mass and the limb chains from every angle; no cheating in gameplay views.

**What makes frames move with weight (12 principles, as games use them)**
- Timing is the single biggest factor; speed reads as weight (fast = light). Ease in and out; a sword is "fast in,
  slow out": instant response, heavy follow-through.
- Anticipation sells weight but costs responsiveness: keep the player's short, give creatures long ones (telegraphs).
- Follow-through and overlap: parts move at different rates; cloak, plume, chains and hair keep going after the body
  stops (Street Fighter III: one frame of flutter at the bottom of the trouser legs makes an idle live).
- Arcs: limbs and weapons travel on curves; a break in an arc reads as a snap (use only on purpose).
- Squash and stretch: even one pixel of compression on landing or striking.
- Overshoot: the striking limb passes its stop point, then settles (Street Fighter III: the kick's overshoot and the
  slow-down at its end give it apparent power).
- Exaggeration, kept consistent across every action.
- Secondary action layered on, never lengthening the gameplay window.

**Critique of the Ossuarch's attack (atk/side, 8 frames)**
1. No weapon in the frames: he swings empty arms. The Bone Blade must be painted into every attack frame.
2. Limbs read as stacked tubes (the shape model shows through): no anatomy for weight to live in.
3. Phases exist (1-2 wind up, 3-5 lunge low, 6 recoil, 7-8 return) but frame 2 turns to face the viewer mid-swing:
   the arc breaks.
4. No smear frame; and the engine played the 8 frames at EVEN speed.
   Fixed in code (entities/hero.gd BLOW_TIME): 10/20/6/6/22/14/12/10 % of the swing: the wind-up held, the strike
   rushed, the follow-through held on the hit.

**Next exercises (round 2)**
- E0: repaint atk/side as a 6-key strike with the Bone Blade: anticipation (blade drawn back over the shoulder, weight
  on the back leg, hips and shoulders counter-rotated), one sharp smear frame along the blade's arc, follow-through
  1 px past contact with the cloak still travelling, recover. Silhouette-test every key.
- then E1-E4 above.

## Round 2: a keyed rig (2026-10-06; Derek: "you might need to create a new rig system and alter his animations")

**Why the frames looked weightless:** they are driven by a generic mocap clip (Quaternius Sword_Attack, 38 frames),
sampled EVENLY down to the game's 8. Even sampling skips the key poses: the wind-up's peak, the strike, the low
follow-through each fall between samples, so every frame is an in-between.

**What I built (tools/pixelforge/pixelforge/keyed.py, pose_view.py):**
- a keyed clip is a list of poses held for N frames, written beside the library (assets/animations/keyed/*.json)
  and loaded with it, so `clips: {"attack": "strike"}` in a shapes file plays it in all 8 directions;
- each key may start from a chosen library frame (`from`), then push it: `turn` (rotate a joint and everything below
  it about world axes), `aim` (point a bone along a world direction: the easy control for arms), `move` (the body);
- `python -m pixelforge.pose_view CLIP OUT.png` draws the skeleton front and side for every key, with the sword
  hand's facing, so a pose is judged in seconds, not after a render.
- strike.json: 0 ready, 1 the wind-up peak pushed further back (held), 2 rising, 3 crossing, 4 the low follow-through
  pushed further forward (held: the hit lands here), 5-7 recovery; the off arm brought in to a guard.

**What it does not fix (seen on the render):**
- From E/SE the sword arm is on the FAR side, behind the cloak: the blow is hidden. Needs a deliberate choice: show
  the weapon side in the side views, or turn the body more toward the camera in the strike keys.
- The limbs are still stacked tubes in the shapes file. Keys cannot give anatomy; the model needs tapered forearms,
  gauntlets, a pauldron with a real silhouette (exercise E1) before posing pays off fully.
- No weapon art yet (by design: the weapon is drawn by what he holds). Next: export the hand.R socket (position and
  blade angle per frame, from the rig) so the game draws the held weapon on the frames.

**Derek on the repaint (2026-10-06):** "the armor should not look like tubes. You should have edges and filigree and
designs." And: "we can make his model extremely articulated and detailed since all we need is frames." So the model
gets real plate construction: every plate with a hard bevelled edge (a lit lip and a dark underside), overlapping
lames instead of capsules, raised filigree and engraved designs on the pauldrons, couters, greaves and helm, rivets,
and the paint pass sharpens all of it frame by frame. Render cost is no object; only the frames ship.

**E1 result (iron ramp):** the iron's ramp topped out at #706563 (value 0.4), so no light could ever make a highlight.
New ramp: violet-black shadows, neutral mids, warm lights to #8a7060, the worn edge (ironw) to #b0927a. On a still
the pauldrons and gauntlets now catch the lantern; subtle at 195 px, right in direction. Apply with the repaint.
Derek, same day: "This is true for everything. A muscle, a vein, a leather strap, a plume, a fine, everything." Every
material gets its own construction and detail, not only the armour: muscle masses and the veins over them, straps
with stitched edges, buckles and wear, the plume's barbs and shafts, cloth weave and fraying, bone ridges.
Derek: "We don't need perfect 3D models, we need the illusion of it." The model is scaffolding for form, light and
motion; the illusion (edges, filigree, glints, the readable silhouette) is made in the paint on each frame. Spend
effort where the eye lands, fake the rest.

## Round 3: silhouettes (2026-10-06; Derek: "Study silhouettes to learn what things should look like")

Reading: a silhouette is the figure filled black; "if the silhouette reads, it works". It carries proportion,
gesture, line of action and NEGATIVE SPACE (the gaps inside and around the shape). Shape language: circles soft,
squares solid, triangles aggressive. Test every key pose filled black.

Study: Blasphemous (the Penitent One and the Custodian of the Stained Glass, from The Spriters Resource, kept out of
the repo) and Demon's Crest (Firebrand), against our frames filled black (img/r3_silhouettes_ours.png: top his
current sheet, below the keyed sword-and-shield strike).

What the Penitent One does that we don't:
- Thin, angular limbs on strong diagonals; a wide stance with open space between the legs in every frame.
- The weapon is a long line far outside the body; it is the brightest thing in the frame (cyan steel highlights).
- One saturated accent (the red sash) against cool grey-teal armour; the cone helm is the signature and is never lost.
Firebrand: hard yellow lights on every muscle mass over warm orange, small blue accents at wrist and ankle, the
wings as two big readable shapes, asymmetric poses.

Ours, filled black:
1. Idle and walk are a block with a spike: the cloak swallows the legs; there is no negative space anywhere.
2. The old attack: empty arms out like a scarecrow.
3. The keyed strike reads (lunge, blade out, cloak as a long triangle) except the follow-through, where the blade
   is lost inside the mass.
4. The helm's spike and the plume are a strong signature: keep and protect them.

To do (applying it):
- The cloak opens at the front and hangs BEHIND the legs, so the legs show as two shapes with a gap; its hem is a
  ragged, notched edge, not a straight line.
- An idle with weight: the weight on one leg, the sword held out from the body, the shield arm off the torso.
- Every attack key keeps the blade outside the silhouette; the follow-through angles the blade forward and down,
  clear of the cloak.
- The steel's highlight is the brightest value on the figure; one saturated accent (the green plume already is).

**Cloak opened (armed variant):** back_strip 2.4 -> 1.75 rad. In colour the planted legs now read from every view;
filled black, the cloak behind still fills the gap between the legs. Next: a shorter, split back hem.

## The effects library (Derek 2026-10-06: "your liquid fire looks good but fire comes in many forms ... blood can
borrow from it too. You'll need many types of effects and animations, movements")
The liquid fire's method (a flowing value field snapped to a short ramp with the ordered dither, lit and lighting)
becomes the base for a family:
- Fire: the spreading ground fire (done); a running flame front that eats along grass and wood; an incinerating
  radiant blaze (white-gold core, heat shimmer, a body burning out from inside); a burnt corpse or object: charring,
  glowing ember cracks, ash flaking off and drifting, the shape slumping, smoke.
- Blood: pools that run and seep along the ground's low places, spurts and arcs on hits, drips, smears where a body is
  dragged, drying darker over time; the same field and dither, red ramps.
- Then bone (splinters, dust, marrow glow), miasma (heavy creeping breath, as on the title), void, radiance, cold,
  poison, lightning; and movements for every creature family, each judged filled black first.

## Round 4: plate, not tubes (2026-10-06)
make_armed.py armour_pass(): every plate a lit lip and a dark underside at its ends (+4/-3 tones), a raised ridge
down its front, lames, rivets; bone-inlay knotwork bitmaps on the greaves, breastplate and pauldrons; the E1 iron ramp.
img/r4_armour_before_after.png: left before, middle after (S), right after (SE).

Lessons:
- **Debug render first.** The first pass changed nothing visible: painted in flat debug colours, most lips landed
  where other plates cover them (the knee cop over the greave's top, the sabaton over its foot, the pauldron and the
  couter over the arm's ends). Detail must be placed on the surface that SHOWS, per view.
- **The ramp limits everything.** On a ramp that tops out at value 0.4, a +2 tone step is invisible. Brighten the lit
  end first, then the edges have somewhere to go.
- **Size.** At 195 px a 7-pixel knot barely resolves; filigree belongs to the hand pass on the frames (pixel by pixel)
  and to larger renders (portraits, the title); the model carries the big forms: plate breaks, lips, ridges, rivets.

## Effects library, progress (2026-10-06)
Built on one method: a value field (warped fbm) snapped to a short ramp with the 4x4 ordered dither, in whole world
pixels, lit by and lighting the scene.
- shaders/ground_fire.gdshader: fire as liquid (spreads, veins, tongues, scorch).
- entities/ai/ai_world.gd wildfire(): a running flame front over dry ground, with the wind; scorch with dying embers.
- shaders/radiant_blaze.gdshader: the incinerating radiant blaze (white core, gold body, torn tongues, heat shimmer
  read from the screen). Lesson: a column at full heat saturates to one tone; the hot core must be narrow and the
  body torn by a second, faster noise, or it reads as a solid bar.
- shaders/burn.gdshader: the burning corpse (char, ember cracks, crumble to ash from the top). Lessons: cracks must be
  sized to the SPRITE's texel grid (Cursemark bodies are small textures drawn x4, so the noise scale doubles); and a
  creature's own death animation can fight the effect (Cursemark's shrinks the body): hold the frame while it burns.
- shaders/blood_pool.gdshader: blood that runs, seeps, glints toward the lantern, dries. Lesson: a pool under a body is
  hidden by it; it must run out past the body to read.

## Derek's list, 2026-10-06 (be as inventive as with the fire; the heat shimmer is the bar for detail)
- Armour by silhouette: each PIECE has its own outline (pointed, scalloped, flanged lames; a flared greave top), not
  only the whole figure.
- Elements and skills: blood splashes where it fits; BONE GROWTH spreading over enemies like a cancer (bone skills);
  lightning; soul magic; wisps; ice; acid; miasma; then the rest.
- Environment: grass, ruins, stone, snow, water, blood lakes, anything.
- Fabric that moves; skin that pulses (living flesh: veins, breathing masses), everything alive.
Ideas to carry (my notes):
- Bone growth: ivory crust creeping over a body from where it was struck, spurs pushing out through the silhouette,
  a dry crackle; at death the body calcifies white, splits along its cracks and falls apart into bone dust.
- Lightning: a forked bolt drawn in whole pixels, its afterimage burnt into the screen for a frame, the ground lit
  blue-white for a blink, scorched fern-shaped marks (Lichtenberg) left on the ground.
- Ice: frost growing in feathers across the ground, a body glazing over from its feet, breath fogging; shattering
  into shards that keep their colour.
- Acid: a bubbling pool that eats the ground's colour away, fumes that bend the light (the shimmer, green), bodies
  pitting and smoking.
- Souls: pale threads pulled out of the dying toward the lantern, faces in the drift, cold light.
- Water: ripples where anything steps, reflections of the lantern and figures, rain rings.
- Blood lakes: the pool shader at the size of a lake, slow churn, bodies half-sunk.
Derek, later: "Work on shadows at some point too, and radiance and absence. And all the skill tree types" (every
order's trees: the Animancer's mirrors and wisps, the Hemomancer's blood, the Miasmancer's rot, the Empty Hand's
radiance and absence and sand, the Ossuarch's bone and the soul).

## Round 5: faces, carving and anatomy (2026-10-06; Derek: "the stones should be more irregular and the lines less intense. Do a study on face structures and carving, and body anatomy, both in art form like statues and real anatomy")

Sources read: the Asaro head (planes for light), the Loomis construction, the Bayon's stone faces, medical notes on
emaciation (temporal hollowing, buccal fat loss, zygomatic prominence).

### The head's structure (real anatomy)
- **Proportions.** The eyes sit at half the head's height (crown to chin), not high on it. The face divides into
  thirds: hairline to brow, brow to the base of the nose, nose to chin. The eye is about a fifth of the face's width,
  with one eye's width between the two. The nose's base is as wide as the gap between the eyes; the mouth's corners
  fall under the pupils.
- **Bone sets the planes.** Four masses carry every face: the brow ridge (the frontal bone's shelf over the eyes),
  the zygomatic bone and its arch (the cheekbone running back toward the ear), the maxilla and the dental arch (the
  "muzzle", a cylinder round the teeth that the lips lie on), and the mandible (jaw angle, jawline, chin box).
- **The eye socket** is a hole with a hard upper rim that overhangs and a soft lower rim that slopes out to the cheek.
  The eyeball is a sphere set back in it; the lids wrap the sphere, the upper lid thicker and casting shadow.
- **The nose** is a wedge: a flat-topped bridge with two side planes, a ball at the tip, wings (alae) flaring at its
  base, and the septum under it.
- **The mouth** sits on the muzzle's cylinder, so it curves back at its corners; the upper lip is a flat plane facing
  down (dark), the lower lip a plane facing up (lit), with a shadow under it.
- **Starvation** takes the fat first and the muscle after: the temples sink (the temporal hollow), and the frontal
  process and arch of the zygoma stand out as a hard edge with shadow behind; the buccal pads go, so the cheeks fall
  in under the cheekbones; the eyes sink back in their sockets; skin draws tight over the jaw and the dental arch, so
  the muzzle reads as the teeth beneath; the nasolabial fold cuts from the nose's wing to past the mouth's corner.

### The head as a statue (carving)
- **Asaro's lesson:** light reads planes, not curves. A carved face is a few large planes meeting at a few hard edges
  (brow, cheekbone, jaw, nose's ridge) and everything else is soft. Put the hard edges where the bone is.
- **Monumental faces simplify.** The Bayon's faces, Egyptian colossi, the moai: big calm planes, eyes as incised
  almonds or drilled pupils, lips as two clean bands, ornament (diadems, earrings) as the identity. Detail is spent on
  a few things; the rest is broad.
- **Built faces.** The Bayon's faces are stacked sandstone blocks, carved after setting, mortarless. The blocks are not
  a grid: courses run roughly level but every block is its own size, and the carving crosses the joints as if they
  were not there. Joints are thin dark hairlines, not grooves; weather softens the blocks' edges and the joints read
  only where light rakes them. Some blocks shift, some fall.
- **Weathering follows gravity and water.** Stains run down from every ledge (the brow, the eye's lower rim, the
  lips' corners); lichen grows in rosettes on what faces up and toward the light; moss in what stays wet (joints,
  under ledges, the waterline); edges round off; the deepest cuts stay sharpest.

### The body (for the hands and what comes later)
- **The hand:** the fingers' three bones shorten toward the tip (about 1 : 0.6 : 0.45), the knuckles are the widest
  points, the back of the hand shows the tendons as ridges; starved, the knuckles stand out as knots and the spaces
  between the metacarpals sink.
- **Statues of bodies** reduce muscle to masses with clean boundaries; the joints (knees, elbows, wrists) are where
  the hard edges go.

### What I will change in the Famine
1. Irregular blocks: each stone its own size and shape, courses only roughly level; mortarless hairline joints at low
   contrast; weathered, rounded edges; the carving runs across the joints.
2. Rebuild the face on the bones: a hard brow shelf overhanging the sockets and a soft lower rim; the eyeball set back;
   the zygomatic arch running back from the cheekbone with the temple sunk above it and the cheek fallen in below; the
   muzzle as a cylinder with the mouth's portal cut into it; the jaw's angle and line; the nose as a wedge with wings;
   the nasolabial folds from the wings past the portal's corners.
3. Stains running down from the brow, the eye's rim and the lips; lichen in rosettes on up-facing planes only.
4. The hand: three segments in proportion, knuckles as knots.

## Round 6: depth, and how things sit in it (2026-10-06; Derek: "depth is a valuable lesson then, and how things interact with depth")

The ghost-flame first looked pasted on: a light drawn over a surface rather than inside it. What put it inside:
- **Occlusion.** Whatever is in front hides what is behind. The flame's root went down behind the socket's lower rim,
  so it climbs out of the dark instead of sitting on the face. A thing in a hole is half hidden by the hole's lip.
- **Light from within.** A light in a cavity lights the cavity's walls, and most the wall that faces it (the upper
  wall, lit from below). The depth behind the light stays dark. Light thrown upward onto the underside of a ledge
  is the strongest single sign of "inside and below".
- **Shadowing by form.** What the rim keeps the light off (the cheek under the socket) stays dark: the light obeys
  the same geometry as everything else.
- **Transparency in steps.** Thin parts of a glow let the surface show through; only the core is opaque.
- **The same holds everywhere:** grass in front of a wall's foot, the water's line on stone, a step meeting a
  doorway, a reflection that breaks with distance. Depth is told by overlap, by contact (dark where things meet), by
  light that respects the forms, and by atmosphere (mist thicker further off and low down).

## Round 7: building a head in layers (bone, muscle, skin)

Sculptors build an écorché from the inside: the skull, then the muscles laid on it, then fat and skin over all.
Each layer decides what the next can do. The face's surface is the skin's envelope over everything beneath.

### Bone (the skull)
- The cranium's dome, and the face hung under its front: the frontal bone with its brow ridge; the orbits (deep
  rounded-square holes, the upper rim sharp and overhanging); the nasal bones (only the upper third of the nose; the
  rest is cartilage) and the pear-shaped nasal aperture beneath them; the zygoma (cheekbone) with its arch running
  back to the ear; the maxilla carrying the upper teeth; the mandible, a U with its ramus rising to the ear, its angle,
  its body and the chin's mental protuberance. The teeth sit in two arches: the "muzzle" is their curve.

### Muscle (laid on the bone)
- **Temporalis:** a fan filling the temple from the skull's side down under the arch to the jaw. Starved, it
  wastes: the temple sinks and the arch stands out.
- **Masseter:** a thick block from the arch down to the jaw's angle; it squares the lower face. Wasted, the angle
  shows as bone.
- **Frontalis:** a thin sheet on the forehead (horizontal folds when raised).
- **Orbicularis oculi:** a flat ring round the eye, the lids its inner part; it makes the soft lower rim and the
  crow's feet.
- **Zygomaticus major and minor:** bands from the cheekbone down to the mouth's corner: the cheek's front ridge.
- **Buccinator:** deep in the cheek between the jaws, under the buccal fat; when the fat goes, the cheek falls in
  onto it.
- **Orbicularis oris:** the ring of the lips, standing on the teeth's curve.

### Fat and skin
- Fat pads fill the hollows between muscles: the temples, under the cheekbones (buccal), round the eyes. Skin drapes
  over all of it, softening every edge by about its own thickness.
- **Starved:** the fat goes first, so the skin falls straight onto muscle and bone; the muscles waste after. The
  surface then follows the skull nearly everywhere, bridging the hollows taut: temple sunk, arch and orbital rims
  sharp, cheeks fallen in between the arch and the jaw, the teeth's curve showing through the lips, the jaw's angle
  and the cords of the neck stark.

### How I will build heads from now on
1. A skull height field from its parts (cranium, brow, orbits, nasal aperture, zygoma and arch, maxilla, mandible,
   teeth).
2. Muscles as soft volumes on the skull (temporalis, masseter, frontalis, orbicularis oculi and oris, zygomatici,
   buccinator), each a shape following its origin and insertion.
3. Fat pads in the hollows, scaled by how fed the creature is (a Famine: nearly none).
4. Skin: an envelope over the maximum of those layers, smoothed by its thickness and drawn taut over hollows.
5. Then the material (stone, flesh), weathering and light.
