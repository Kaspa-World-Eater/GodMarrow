# Our animations now, and how to make them better

Derek, 2026-10-09: "Do you think we can improve our animations with what you learned. Not that we're going to do it
now, but I want a committed chapter that you can reference later."

**Yes, a great deal, and most of the gain is cheap.** Our art is ahead of our motion. The biggest faults are not in the
drawings: they are in the timing, and timing is the one thing Lasseter says defines weight "more than any other
principle". This page is the diagnosis of the Ossuarch, the hero every other calling will follow, measured frame by
frame, and the plan in the order it should be done.

## How it was measured

`tools/anim/contact_sheet.py <sprite> <view> [out.png]` lays every clip's frames side by side on one ground line and
prints, for each step from one frame to the next, the share of the figure that changed:
- near 0 is a dead frame;
- 0.1 to 0.3 is a gentle step;
- above about 0.6 is a jump the eye sees as two pictures (strobing).

For loops it also prints the seam, from the last frame back to the first. Run it for "side" and "front", Lasseter's two
views. The numbers below are from `art/sprites/ossuarch_hd` on 2026-10-09.

## The diagnosis, clip by clip (the Ossuarch)

| Clip | Frames x hold | Length | Change per step (side) | What is wrong |
|---|---|---|---|---|
| attack (`atk`) | 8 x 198 ms | 1.58 s | 0.55 0.81 0.44 0.49 0.68 0.54 0.09 | One even shove: every frame a new pose at the same rate, so no anticipation is held, no strike snaps, nothing settles. Far too slow for a blow (1.6 s). No weapon in the hands, so no blade, no arc, no contact. In the front view the body twists side-on and the action is lost. |
| charge wind-up (`wind`) | 4 x 198 ms | 0.79 s | the attack's first four frames | Not a coil: it is the start of the attack, cut off. Nothing deepens or trembles as the charge builds. |
| second attack (`atk2`) | 8 x 130 ms | 1.04 s | 0.00 0.53 0.14 0.15 0.47 0.52 0.38 | Its first two frames are the same picture. It is the cast's pointing pose with a lean: not a different idea from the first attack. |
| cast | 8 x 67 ms | 0.54 s | 0.11 0.29 0.02 0.07 0.08 0.28 0.03 | One pose held for eight frames: an arm pointing. No gathering, no release, no thought first. |
| hit | 6 x 62 ms | 0.38 s | 0.27 0.38 0.46 0.41 0.21 | The best of the set: fast, and the head and plume tip back. But the whole figure rocks as one block; the body is not struck first with the head dragged after it. |
| death | 8 x 307 ms | 2.46 s | 0.56 0.72 0.87 0.62 0.39 0.00 0.00 | The fall happens in one or two frames (0.87): from standing to the ground with nothing between, at a third of a second a frame. No knees going, no weight, no thud, no settle; then two frames of nothing. |
| dodge | 8 x 187 ms | 1.50 s | 0.80 0.88 0.87 0.78 0.72 0.70 0.35 | Strobes on every frame: a full dive and roll on the ground, the body two widths away each frame. An armoured man rolling flat reads as a different character, and at 1.5 s it is too long for a dodge. |
| walk | 8 x 166 ms | 1.33 s | 0.31 0.19 0.23 0.21 0.27 0.15 0.24 · seam 0.34 | Even steps with no down and up: the cloak hides the legs, the head does not bob, so it reads as gliding. A small hitch at the loop's wrap (seam above the mean step). |
| idle | 8 x 312 ms | 2.50 s | front 0.06 0.07 0.04 0.07 0.06 0.06 0.04 | A dead hold: nothing breathes, nothing drifts. (The side view's higher numbers are the paint's texture flickering frame to frame, not motion: a fault of its own.) |

**Across every clip:**
- **The plume never drags.** The helm's green plume is rigid, the one part that should follow through most. The cloak
  barely moves.
- **No head lead.** The helm turns with the body in every action, never first.
- **The texture flickers.** The painted grain changes from frame to frame even where nothing moves (the side idle's
  0.18 per step). The tooth must be fixed to the figure, not re-rolled each frame (painted standard 6).

## Why it is like this

1. **The clips are captured motion played as it came.** Generic humanoid clips, retargeted and rendered at eight
   evenly spaced frames: a body that moves, but not this man, with this weight, thinking this.
2. **One rate per clip.** The engine plays every frame of a clip for the same time, so no clip can hold an anticipation
   or snap a strike. Timing, the first principle of weight, is out of our hands entirely.
3. **No weapon layer.** The attacks have nothing in the hands, so the most important arc in the game does not exist.
4. **No secondary layer.** The plume, cloak and lantern are fixed to the body.

## The plan, in order (when we come back to animation)

**1. The engine: holds per frame (small, unlocks everything).**
- `meta.timing[clip]` becomes a list of holds in 1/60 s ticks, replacing the single `fps`.
- `core/sprite_set.gd fps()` becomes a per-frame duration, and `entities/anim_sprite.gd` plays each frame for its hold.
- **Hit-stop** goes in the game: a few ticks' freeze for the attacker and the struck on contact, scaled by the blow.
- Clips without a sheet keep their old even rate, so nothing breaks.

**2. The tools.**
- `tools/anim/contact_sheet.py` (now) for every pass.
- A seam check on loops (now, in the same tool).
- A pose test: the timing sheet's key poses in grey at game size in all eight views, played at their holds.

**3. Re-time what we have, before redrawing anything.** With holds alone, the existing eight frames improve at once:
- **attack:** hold the coil (frames 1 and 2) long, show the strike frames for a tick or two, hold the extreme, settle.
  The same drawings in about 0.7 s instead of 1.6.
- **death:** hold the stagger, add the frames between standing and down, land hard, hold.
- **dodge:** shorter, the far frames quicker.

This is Lasseter's point exactly: the same poses, spaced differently, are a different weight.

**4. The weapon and the secondary layers.**
- **The weapon:** the Ossuarch's blade and shield in the attack clips, on arcs, with a smear frame on the fastest step
  so it does not strobe.
- **The secondary parts:** the plume, cloak and lantern driven by the joints' velocity (the pixel road already does
  this for cloth), each dragging by its weight: the plume most.

**5. Redo the clips that are the wrong idea**, on the timing sheet, layered down the skeleton (`02-method.md`):
- **the cast:** a thought, a gathering, a release, aimed;
- **the second attack:** a thrust or a shield-bash, not a point;
- **the dodge:** a short armoured sidestep or hop for the Ossuarch, not a roll;
- **the charge:** a real coil that deepens and trembles;
- **the idle:** a moving hold, with breath, drift and a rare small action from the mind (he counts);
- **the walk:** contact, down, passing, up, the head on its arc, the feet locked.

**6. Then every calling and monster** goes through the checklist (`05-checklist.md`), the Ossuarch first, as with
everything (Derek's order).

## What to expect

Steps 1 to 3 change no drawings, cost little and fix the worst of it: weight, snap, readable wind-ups, a death with a
thud. Steps 4 and 5 are real work per clip and per calling, and are where the motion comes up to the Hand standard.
