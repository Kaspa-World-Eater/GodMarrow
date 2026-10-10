# How a clip is made

Lasseter's working method (study chapter 14) fitted to PixelForge: shape models on the standard skeleton, motion clips,
eight views, pixel frames. Ollie Johnston: "Spend half your time planning your scene and the other half animating."

## 1. Why, before how

Lasseter: "You must understand why an object moves before you can figure out how it should move." Before anything is
keyed, write in the clip's pass log (`tools/landkit/passes/anim_<character>_<clip>.md`):
- **What it is thinking.** One line. "The Ossuarch does the sum, and then the sum is done." "The Tithe-Hand wants the
  warm thing and cannot see it."
- **What it is made of.** Bone, iron, cloth, flesh, tallow, smoke: this sets the drag and the settle (follow through
  is "directly proportional to their weight").
- **How heavy and how big.** Timing is weight.
- **What the player must read from it,** and how early: the wind-up a player dodges, the death that tells them the
  fight is over.

## 2. Thumbnails and the timing sheet

**Thumbnails.** Small drawings, or posed shape renders in grey, of the key poses: the anticipation, the extreme, the
contact, the follow-through, the settle. In silhouette, from the side and from the front. Explore more than one; keep
the clearest ("clear, not clean").

**The timing sheet** replaces our one-rate clips. Lasseter's "exposure sheet": every frame of the clip with how long it
is held, in game ticks of 1/60 s, with the parts named.

```
clip: ossuarch / atk (the overhead blow)          thinking: "the sum is done"
frame  pose                         hold   note
 0     settle from guard            6
 1     anticipation: rise, weight back 10   the read: shield up, blade high
 2     anticipation extreme         14     held: the player sees it coming
 3     strike (smear frame)          2     blade stretched along its arc
 4     contact                       3     + hit-stop on impact (game side)
 5     follow-through, past the line 6     plume and cloth still rising
 6     recoil, weight forward        8
 7     settle toward guard          10     overlaps into idle or walk
```

- The sheet lives in the clip's metadata (`meta.timing[clip] = [holds...]`, replacing the one `fps` number), and the
  game's `AnimSprite` plays each frame for its hold. *(The engine change is small: `core/sprite_set.gd fps()` becomes a
  per-frame duration; until it lands, the sheet is still written and the frame count chosen to fit it.)*
- **Hit-stop** (a few frames' freeze on contact, for the attacker and the struck) is part of the sheet, played by the
  game, not drawn.
- **Moving holds:** a held frame of a character is never a dead frame. When a pose is held long, the held frame is two
  or three drawings with only the secondary parts drifting (the plume, the cloth, the breath), so "some part continue[s]
  to move slightly in the same direction".

## 3. Layers down the skeleton

Lasseter's method for the computer: key the trunk first and work down the branches, one layer at a time, "fewer
extremes", each layer checked before the next. Luxo Jr.'s hop: the travel, then the height, then the arms, then the base
and shade.

On our skeleton:
1. **The root:** travel and timing. Play it as a dot; the weight and the rhythm must read already.
2. **The hips and spine:** the weight shift, the coil and the release. In a walk, "the action starts with the hips".
3. **The limbs:** the arms and legs on arcs, never twins.
4. **The head:** it leads (section 5).
5. **The weapon:** on its own arc, stretched or smeared on the fastest frame.
6. **The secondary parts:** cloth, plume, chains, tassels, the lantern, driven by the joints' velocity
   (PixelForge's pixel road already does this), each with its own drag and settle by weight.

**The stick pass: every layer as coloured lines before any detail** (added 2026-10-10, from a process clip Derek set:
Catnip Studio's boss arm for DAY50, x.com/CatnipStudio_G/status/2108766714326597992, where the motion is laid down as
stick lines in a different colour per limb and tentacle, and the detailed arm and tentacles are drawn over them after).
- Each moving part (a limb, a tentacle, a chain, a cloak tail, a strand of the plume) is first animated as one line
  along its bones, in its own colour, over every frame of the clip.
- Read as lines, each part's arc, its timing and its drag behind the part before it can be seen and fixed: a
  tentacle's base moves first and its tip some frames later, and a wrong lag shows at once. Under finished detail it
  only reads as "something is off".
- The detail is drawn last, onto timing that is already right, so it cannot break the motion.
- **Tool, when animation resumes** (with the Ossuarch's rebuild): `tools/anim/contact_sheet.py` to draw every bone chain
  of a clip as a coloured line across its frames, so a clip's stick pass can be checked at a glance.

**Captured clips are a start, never the result.** A Quaternius clip gives a plausible body; it does not give our
character's thought, weight or timing. Re-time it on the sheet, push its extremes (exaggeration), add the lead and the
follow-through, and replace the parts that read as someone else.

## 4. Eight views

Lasseter's first computer run "looked great from the side view, but when I looked at it from the front, the arms were
going through the body and the knees were bending the wrong way. From then on I always animated with two views."

- **Work with two views open, side and front; check all eight** before the clip is called done. A pose that reads from
  the side and dies from the front is restaged (cheated) for the front.
- **Real left views** (`front_l`, `side_l`, `back_l`) are rendered, never mirrored: the shield and the weapon are on
  their own sides.
- **The camera is ours, fixed:** Diablo II's iso. The "side" in our sheet is the view the player sees most; stage for
  it first.

## 5. The pose test

Before the full clip is rendered to pixel frames, render only the key poses of the timing sheet in grey at game size,
in all eight views, held for their sheet times. Play it at game speed in the game's light, with the Ossuarch beside it
for scale. This is Lasseter's "blocking", and where most problems are cheapest to fix.

## 6. Render, pixelate, paint

The full clip is rendered on the 3D road or the pixel road (`tools/pixelforge/docs/track_notes/animation_is_frames.md`)
and pixelated with the style preset. Then the frames are painted like any art (the painted standard, the five tones of
form): a smear frame is drawn by hand where the render strobes, the contact frame gets its dust and its spark.

## 7. In the game

The finished clip is placed and captured in the game, never judged in a viewer only:
- at the game's zoom and light;
- in a fight, with other things moving, where it must still read ("one idea at a time");
- with the sound off (the sound-off test).

The clip is graded on `05-checklist.md` in its pass log, and passes like every piece: ten passes, the worst failure
fixed first.

## 8. Re-use, varied

Lasseter: the same motion from another angle looks new; copies that look alike get "the timing of the motion" varied, or
an arm or head changed. A pack of the same monster never moves in step: each gets its own small timing offset, and
the variants of a creature differ in one held pose or one secondary part, so no two are twins.
