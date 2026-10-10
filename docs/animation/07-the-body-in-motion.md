# 07 · The body in motion: hips, feet and lean

*Added 2026-10-10, from a study Derek set: Lincoln Margison's notes on procedural locomotion
(x.com/LincolnMargison/status/2108689789109096587, eight tips with a demo, given to a Godot developer). What follows
is what we take from them, restated for our sprites. Read with `01-principles.md` (weight, follow-through, arcs) and
`03-the-clips.md` (walk, run, stop, turn).*

## Why it matters to us

A walk that only swings the legs reads as a puppet sliding. A body has weight because the hips, the feet and the lean
answer each other and lag behind what the body wants. These rules make that happen, and most of them can be keyed into
our motion clips; the last ones want a small layer in the game itself.

## The rules we keep

1. **The pelvis drops on the side that isn't standing.** At each step, the hip over the swinging leg sinks a little and
   the body leans over the standing foot. Keyed into every walk and run, in all eight views.
2. **The hips turn with the feet, the shoulders against them.** As a leg swings forward, the pelvis turns with it and
   the chest and shoulders turn the other way, so the arms swing opposite the legs. The head stays nearly still.
3. **The pelvis's facing sits between the two feet.** Never on the front foot or the back one; halfway, eased, so the
   hips never snap.
4. **A swinging foot relaxes.** In the air the foot hangs at its relaxed angle (toes a little down, a little out); it
   comes flat only to land. A foot carried flat and level reads as a stamp.
5. **Lean comes from speed and from its change.** Moving, the body tips into the move; starting, it tips further;
   stopping, it rocks back. The head stays level while the body leans: the lean is below it.
6. **The feet lag the body like a spring.** Think of a point between the feet that chases where the body wants to be
   and never quite catches it. Starting, the body leaves it behind (the body leans forward); stopping, it overshoots,
   so the feet take a last step past the stop and the body settles back; turning hard, the body banks into the turn.

## What does not apply

Margison's tips about aiming while moving (the pelvis turning to an aim, the lead foot turning further when
strafing) are for a body that looks one way and walks another. Our pilgrims face where they go, as in Diablo II, so we
leave those.

## How we will use them

- **In the clips** (`02-method.md`, the layers down the skeleton): rules 1 to 4 are keyed into the walk and run of
  every character and creature, checked in the timing sheet: the pelvis drop and the counter-turn on the step frames,
  the relaxed foot on the passing frame.
- **In the game** (when animation work resumes, with the Ossuarch's rebuild): rules 5 and 6 want a small runtime layer,
  a spring on the body's root that lags the true position and leans the sprite a pixel or two into a start, a turn and
  a stop, with an overshoot on the stop. It gives weight to all eight views without new clips.
- **In the checklist** (`05-checklist.md`): a walk is graded on rules 1 to 4; a start, a stop and a hard turn on rules 5
  and 6 once the layer exists.
