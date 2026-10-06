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
