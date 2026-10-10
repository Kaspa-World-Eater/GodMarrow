# The world moves

Lasseter gave a desk lamp a mind with no face and no words. Everything in our world that moves is animated by the same
principles: it has a weight, a material, a timing and, often, something like a thought. Derek's laws hold here too:
weather happens in the world, not on it; no fog layers; restrained effects in the manner of Diablo II Resurrected; the
one wind (`core/gust.gd`).

## Trees, plants and grass (Derek, 2026-10-09: "use some in the animation study to ... the way things animate like trees and plants")

A plant is a chain of parts, and Lasseter's follow-through applies along it: the base leads and the tips follow.

- **The bend travels up the plant.** The wind moves the trunk or stem first, and each part above follows a little later
  and a little further: trunk, then boughs, then twigs, then the leaves flickering last. The motion is a wave climbing
  the plant, not a lean. **Today:** the game's sway (`shaders/cm_sway.gdshader`) bends every height of a sprite in
  step, scaled by its height, which reads as a rigid tilt. The fix is a phase lag that grows with height: the bend at
  height `up` is the wind of a moment ago, `s(t - up * lag)`.
- **Weight by material:**
  - grass is light: it answers fast and settles fast;
  - a dead branch is stiff: it barely answers and then shudders;
  - a great trunk hardly moves while its crown makes slow, large moves;
  - cloth and hanging moss lag furthest and flutter.

  A plant's stiffness, lag and settle come from what it is, never one setting for all.
- **Gusts arrive; they are not everywhere at once.** A gust is an anticipation the player can watch: the far grass
  bends first, and the bend runs across the field toward the pilgrim in the wind's direction, then the near trees take
  it. The wave's delay comes from position along the wind, so a field moves as one weather, not as a thousand random
  beats.
- **Slow in and slow out on the gust:** it builds, peaks, and dies away, and the plants overshoot a little on the way
  back (follow-through) and settle.
- **Moving holds in the calm:** even between gusts something moves, a single stem or a leaf turning, so the forest is
  never frozen.
- **No twins:** neighbours never sway in step; each keeps its own stiffness and a small offset.
- **Secondary and subordinate:** the forest moves less than anything the player must read. When a fight starts, the
  plants are background (the LottieFiles rule of thumb: about a tenth to a fifth of the main motion's size).
- **Bodies push through** (the shader already does this): the push is fast, and the plant comes back slowly, overshoots
  once, and settles.

## Water

Timing makes the liquid. The same ripple read fast is water; read slow and blunt, it is blood (the Red, below).
- **Still water** (the bog, the fen, the pools after rain) is a moving hold: a slow skin of reflections breathing, and
  small events on it. Rings spread from a drip, a rain drop or a footfall, fast at first, slowing as they widen (slow
  out), and fading.
- **Running water** never scrolls as one sheet. It speeds up over a lip and slows in a pool. Its surface lines bunch
  where it turns, and it breaks white only where it strikes (follow-through at every rock).
- **Waves** have the three parts: the swell gathering (anticipation), the break (the short action), and the swash and
  the drain-back (follow-through and settle). Foam is the secondary action and lags the wave.
- **Water answers the world,** by material and weight: a body falling in throws a heavy splash that rises slowly and
  falls fast, then rings. Rain on blood barely dents it.
- **Loops close.** Every looping water texture or wave cycle must pass the seam check: its last frame flows into its
  first (`tools/anim/contact_sheet.py` checks sprite loops; the same test applies to a shader's period).

## Fire

- **A moving hold that never repeats:** a flame's seat holds its shape while its tongues rise, narrow and tear off;
  each tongue on its own timing (overlapping action), none in step with its neighbours. Flames swell and gutter
  slowly, and never strobe (cinematography rule 10).
- **Fire answers the world:** it leans away from the wind, flattens when something passes close, flares when fed.
- **Embers** rise on arcs, slow at the top, and wink out.

## The Red

The Red's motion is already ruled (Derek, 2026-10-09: "based on dying heart beats", "blood is thick and viscous"), and
it is Lasseter's timing law exactly: the same wave reads as water or as blood by its timing alone.
- **The heartbeat sheet:** a surge, a weaker second surge, a long stillness; slower than any sea.
- **Viscosity is slow in and slow out:** the swell starts late, the roll sags instead of curling, the swash is a blunt
  tongue that stops early and drains back leaving a coat.
- **No chop, no spray:** blood does not break into small parts; its secondary motion is the skin on its surface
  wrinkling.

## Blood and wounds

- Blood runs by weight: it starts slowly, gathers, runs faster down a slope, and pools. It never squirts like water.
- A spray from a strike is one shape that stretches and breaks into a few heavy drops, on arcs, and lands with a small
  squash.

## Cloth, plumes, hair, chains

- **Secondary action, subordinate:** they move because the body moved, and they never take the eye.
- **Drag by weight:** a plume drags far and settles late; a heavy cloak drags less and swings longer; a chain drags,
  then swings back and forth, each time less.
- **The one wind** moves all of them the same way at once, a little.

## The lantern

The pilgrim's lantern is our Luxo: a light carried by a character, self-shadowing the world as it moves.
- **It swings behind the walk** and settles after the stop, on an arc.
- **Its light moves with it:** every swing moves every shadow it casts, slightly. The world breathes with the walk.
- **When the dark presses close,** the flame leans away (the old lantern-tender's letter), so the lantern acts, and the
  player reads the danger from it before they see anything.

## Objects in combat

Derek's rule: world objects react by material. Each reaction is a small animation with a weight:
- **Bone and stone shatter:** a held first frame of impact, then fragments on arcs, the heavy ones falling first.
- **Wood splinters and burns;** dry wood catches and the fire runs over the litter; wet wood smoulders.
- **Iron rings:** a short shudder, a dent, no break.
- **Rotten things give:** a sag, a slump, a slow collapse.

## Spells and projectiles

- **Anticipation at the caster,** then the travel, then the impact, then the after: the same three parts.
- **No strobing:** a fast missile is stretched along its path so its positions overlap from frame to frame, or carries
  a trail; never a dot that jumps.
- **Weight:** a bone lance is heavy and flies flat and fast; a cloud of miasma is light and drifts; the Red Penitent's
  blood is thick and falls short.
- **One idea at a time:** in a crowded fight, the most dangerous effect is the one that contrasts (the only still thing
  gathering, or the only bright thing moving).

## The dead that come up

The things that come up out of the ground have the oldest mind in the game (the deep lore: fears given back with
teeth). Their rising is an anticipation the player watches: the ground first, then the hands, then the head last,
looking.
