# Animation in Godmarrow

Derek, 2026-10-09: "do a study on the animation teachings of John Lasseter and take what you learned and create an
entire section in our repository about the animations. So when we get to animations again they can be done better."

This section is the rule book for everything that moves in the game: the pilgrim, the monsters, the Stranger, the
bosses, fire, blood, the Red, cloth, lanterns, spells. Read it before any animation work, the way `CINEMATOGRAPHY.md` is
read before any frame is lit. The source is study chapter 14
(`tools/art_study/chapters/14-lasseter-animation.md`): John Lasseter's 1987 SIGGRAPH paper on the principles of
traditional animation in computer animation, his 1994 "Tricks to Animating Characters with a Computer", and Ollie
Johnston's notes from the same course.

## Why it matters

Lasseter: "It was not the software that gave life to the characters, it was these principles." A Luxo lamp has no face
and moves like a child; a helmeted pilgrim with every pixel in place moves like a puppet if its timing is even and its
joints all start and stop together. Our art is held to the Hand standard and the painted standard. Our motion has had
no standard at all. Until now every clip has been a captured motion played through eight evenly spaced frames, and
that is the single biggest thing between our sprites and the games we measure against (Diablo II, Blasphemous, Eitr,
Morbid).

## What we have now (2026-10-09)

- **Characters** are PixelForge shape models on the standard skeleton, at the game's hero height, played by motion
  clips (46 CC0 humanoid clips from the Quaternius library) and rendered to pixel frames in eight views.
- **Every clip is 8 frames** (the hit 6, the wind-up 4), played at one even rate per clip. The Ossuarch: attack 5 frames
  a second, cast 15, idle 3.2, walk 6, death 3.25, hit 16.
- **Effects** are scripted in the game (`skills/*/fx.gd`, `world/`), the fire and the Red's heave in shaders, and the
  baked scenes' life in their own loops.

## The pages

| Page | What it holds |
|---|---|
| `01-principles.md` | Lasseter's eleven principles, each restated for our sprites and given a test you can check on a clip |
| `02-method.md` | How a clip is made: plan, timing sheet, layers down the skeleton, eight views, pose test, then frames |
| `03-the-clips.md` | Every clip a character has (idle, walk, run, attack, charged attack, cast, hit, death, dodge, and the rest), what it must do and how it reads |
| `04-the-world-moves.md` | Things that are not characters: fire, the Red, blood, cloth, lanterns, objects in combat, spells, the wind |
| `05-checklist.md` | The checklist every animation is graded against, in writing, in its pass log |
| `06-our-animations.md` | Where our animations stand (the Ossuarch measured frame by frame) and the plan to make them better, in order |
| `07-the-body-in-motion.md` | Hips, feet and lean (from Lincoln Margison's locomotion notes): the pelvis drop, the counter-turn, the relaxed foot, lean from speed, the lagging feet that overshoot a stop |

## The laws in brief

1. **Timing is weight.** Frames are held for different lengths. No clip plays at one even rate.
2. **Every action has three parts:** the preparation, the action, the end. The anticipation is long enough to read, the
   action short, the end settles.
3. **The head leads.** Our pilgrim has no visible eyes, so the head turns first, then the body. When struck, the body
   moves first and the head is dragged.
4. **Nothing stops dead.** Every hold is a moving hold: cloth, plume, breath and flame keep going.
5. **Read it in silhouette,** in all eight views, at the game's size, with the sound off.
6. **Fast moves overlap.** No frame jumps so far that the eye sees two pictures: stretch, smear or add a frame.
7. **One idea at a time.** In a crowded fight the important action is the one that contrasts.
8. **Weight by material.** Bone, iron, cloth, flesh and blood each drag and settle at their own rate.
9. **It moves for a reason.** Ollie Johnston: "Don't move anything unless it's for a purpose."
10. **Ask why before how.** "It is the thinking that gives the illusion of life."
