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
