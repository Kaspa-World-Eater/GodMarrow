# Chapter 14: John Lasseter's teachings on animation

*Study, 2026-10-09. Derek: "do a study on the animation teachings of John Lasseter and take what you learned and create
an entire section in our repository about the animations. So when we get to animations again they can be done
better." The applied rules are in `docs/animation/`; this chapter is the source, in his own words.*

**Sources** (read in full unless marked):
- **The 1987 paper:** Lasseter, "Principles of Traditional Animation Applied to 3D Computer Animation", *Computer
  Graphics* 21(4), SIGGRAPH 87, pp. 35-44. Text: https://www.ics.uci.edu/~fowlkes/class/ics162/exercises/lasseter.pdf
  (an OCR scan; obvious scan errors are fixed in the quotes); DOI https://doi.org/10.1145/37401.37407.
- **The 1994 notes:** "Tricks to Animating Characters with a Computer", SIGGRAPH 94 Course 1 ("Animation Tricks"),
  reprinted in *Computer Graphics* 35(2), 2001. Text:
  https://education.siggraph.org/static/HyperGraph/animation/character_animation/principles/lasseter_s94.htm
- **Ollie Johnston's notes,** from the same course, written down by Glen Keane and kept on Lasseter's table:
  https://education.siggraph.org/static/HyperGraph/animation/character_animation/principles/ollie_johnston.htm
- **Interviews:**
  - *Animato* #19 (1990), Harry McCracken: https://harrymccracken.com/luxo.htm;
  - his tribute to Frank Thomas, AWN, 2004: https://www.awn.com/animationworld/tribute-frank-thomas;
  - the Christian Science Monitor, 1989: https://csmonitor.com/1989/0602/plass.html.
- **Secondary, marked where used:** Wikipedia's Luxo Jr., Red's Dream and Tin Toy pages, citing David Price, *The
  Pixar Touch*.

## 1. Why he matters to us

Lasseter took the Disney principles (Thomas and Johnston, *The Illusion of Life*) and showed they survive a change of
medium: "It was not the software that gave life to the characters, it was these principles." Our characters are built
as 3D shape models and rendered to pixel frames, which is his medium squeezed down to about two hundred pixels and eight
frames. Everything he learned about making a desk lamp alive applies to a helmeted figure with no visible face.

## 2. The eleven principles, as he stated them (1987)

| Principle | His definition |
|---|---|
| Squash and stretch | "Defining the rigidity and mass of an object by distorting its shape during an action." |
| Timing | "Spacing actions to define the weight and size of objects and the personality of characters." |
| Anticipation | "The preparation for an action." |
| Staging | "Presenting an idea so that it is unmistakably clear." |
| Follow through and overlapping action | "The termination of an action and establishing its relationship to the next action." |
| Straight ahead and pose-to-pose | "The two contrasting approaches to the creation of movement." |
| Slow in and out | "The spacing of the inbetween frames to achieve subtlety of timing and movement." |
| Arcs | "The visual path of action for natural movement." |
| Exaggeration | "Accentuating the essence of an idea via the design and the action." |
| Secondary action | "The action of an object resulting from another action." |
| Appeal | "Creating a design or an action that the audience enjoys watching." |

**Squash and stretch, "the most important principle".**
- "No matter how squashed or stretched out a particular object gets, its volume remains constant."
- "Flexible parts should squash more and rigid parts less."
- A rigid, jointed thing squashes by folding: "a hinged object like Luxo Jr. ... squashes by folding over on itself, and
  stretches by extending out fully." That is how an armoured figure squashes: by its joints, never by its plates.
- **Strobing,** the one point closest to sprites: when a fast object's positions "do not overlap from frame to frame,
  the eye then begins to perceive separate images." The fix is motion blur, or "the object should be stretched enough so
  that its positions do overlap from frame to frame (or nearly so), and the eye will smooth the action out again."

**Timing.**
- "The speed of an action defines how well the idea behind the action will read to an audience."
- "It is important to spend enough time (but no more) preparing the audience for: the anticipation of an action; the
  action itself; and the reaction to the action."
- "More than any other principle, timing defines the weight of an object." Two identical objects can be "two vastly
  different weights by manipulating timing alone"; the effect depends "mostly on the spacing of the poses and less on
  the poses themselves" (1994).
- A giant is slow and a tiny thing quick.
- **Thomas and Johnston's head-turn table,** which he reprints: with no inbetweens the head looks "hit by a
  tremendous force"; with one, "hit by a brick"; two, "a nervous tic"; three, "dodging a brick"; four, "giving a crisp
  order"; five, "more friendly"; and so on, up to ten, "stretches a sore muscle". The same two poses, read as ten
  different meanings, by spacing alone.

**Anticipation.**
- "An action occurs in three parts: the preparation for the action, the action proper, and the termination of the
  action." "A foot must be pulled back before it can be swung forward."
- "If the audience expects something to happen, then it can be much faster without losing them."
- **Wally B.:** "The actual action of the zip off is only 3 or 4 frames long, but he anticipates the zip long enough
  for the audience to know exactly what is coming next."
- **Weight:** "an exaggerated anticipation, like bending way down before picking up the object" sells a heavy load.

**Staging.**
- "Only one idea be seen by the audience at a time." "In a still scene, the eye will be attracted to movement. In a
  very busy scene, the eye will be attracted to something that is still."
- **Silhouette:** "It is always better to show an action in silhouette." Andre scratches his side, not his stomach,
  because in front of the body "the action would be unclear". "In Luxo Jr., all the action was animated with silhouette
  in mind."
- "Only Dad or Jr. was doing an important action at any one time, never both."

**Follow through and overlap.**
- "Actions very rarely come to a sudden and complete stop."
- Some part leads: "in walking, the action starts with the hips", then torso, shoulder, arm, wrist, fingers.
- "The degree that the appendages drag behind and the time it takes for them to stop is directly proportional to their
  weight." Wally B.'s light antennae drag a little; his steel stinger more; his water-balloon feet drag so far they are
  "left on screen frames after the body had disappeared".
- "An action should never be brought to a complete stop before starting another action, and the second action should
  overlap the first."

**Straight ahead and pose-to-pose, and his layered method for 3D.**
- Whole poses keyed at once give the computer "too unpredictable" inbetweens. Instead: "one transformation is animated
  at a time, starting with the trunk of the hierarchical tree structure, working transformation by transformation down
  the branches ... Fewer extremes are used."
- **Luxo Jr.'s hop:**
  1. the travel, keyed at take-off and landing, which "defined the timing";
  2. the height, one key;
  3. the arms, keyed nearly every frame: together for the anticipation, apart for the stretch, together at the top,
     stretching before the landing, and "to indicate the shock of the landing, the arms were rotated quickly together
     two frames after the base lands";
  4. then the base and the shade.

**Slow in and out.** Inbetweens bunch near the extremes, "with only one fleeting drawing halfway between". A timing
chart says where they go. A spline overshot Jr.'s heavy base through the floor; extra keys "locked" it, giving "the
desired feeling of weight to his little base".

**Arcs.** "Arcs in nature are the most economical routes." "The faster the action, the flatter the arc." "Straight
inbetweens can completely kill the essence of an action."

**Exaggeration** "does not mean arbitrarily distorting shapes ... If a character is sad, make him sadder; if he is
bright, make him shine." "If just one thing is exaggerated in an otherwise lifelike scene, it will stick out."
**Luxo Jr.:** "when Jr. hit the ball, he really whacked it", and the landings were exaggerated for weight; "the ironic
effect of all this exaggeration was to make the film more realistic."

**Secondary action** is "always kept subordinate to the primary action. If it conflicts, becomes more interesting, or
dominates in any way, it is either the wrong choice or is staged improperly."
- Examples: Wally B.'s feet, and "the rippling movement of Luxo Jr.'s cord".
- A change of expression "must come before, or after, the move. A change in the middle of a major move will go
  unnoticed."

**Appeal:** "charm, pleasing design, simplicity, communication, or magnetism ... A design that is complicated or hard to
read lacks appeal."
- Jr. keeps Dad's bulb and rod thickness but is shorter: a thing bought at the hardware store "doesn't grow".
- **No "twins":** "both arms and both legs in the same position" is "stiff, wooden".

**Personality is the principles together.** "Personality ... is not a principle unto itself, but the intelligent
application of all of the principles." "All actions and movements of a character are the result of its thought
processes. 'The thinking animation character becomes a character.'" (Don Graham.) Jr. chasing the ball: fast hops,
"head up", little time on the ground. After the ball pops: "each hop is slower, with much more time on the ground
between hops, his head down ... Now he is just hopping off to nowhere." The same hop, two minds.

## 3. The tricks (1994)

- **Plan first:** "Plan out the action with thumbnail sketches and plot timing ideas on an exposure sheet." Ollie
  Johnston: "Spend half your time planning your scene and the other half animating."
- **Two views always:** his first computer run "looked great from the side view, but when I looked at it from the
  front, the arms were going through the body and the knees were bending the wrong way. From then on I always animated
  with two views of my character always showing."
- **Re-use, varied:** the same motion from another angle looks new; copies that look alike get "the timing of the
  motion" varied, or an arm or head changed.
- **The eyes lead:** "always lead with the eyes or the head. If the character has eyes, the eyes should move first,
  locking the focus of its action a few frames before the head. The head should move next, followed a few frames later
  by his body and the main action." "If the character has no eyes, such as an inanimate object like a Luxo lamp, it is
  even more important to lead with the head." The lead is long for a careful thought and "just a couple of frames" for a
  dodge.
- **Except when struck:** "The only time that the eyes or head would not lead the action would be when an external
  force is driving the character's movements ... the force of the impact would cause the body to move first, snapping
  the head back and dragging it behind."
- **Moving holds:** "as soon as you go into a held pose, the action dies immediately ... it begins to look like robotic
  motion ... have some part continue to move slightly in the same direction ... Even the slightest movement will keep
  your character alive."
- **Motion matches design:** "The motion should match the design of the character and the world."
- **Emotion sets the speed:** happy is faster, sad slower; characters are told apart by "contrast of movement". In
  *Red's Dream* the "50% OFF" tag flops more actively than anything else, and "this contrast of action directs the
  audience's attention".
- **Ask why before how:** "You must understand why an object moves before you can figure out how it should move ...
  Character animation is when an object moves like it is alive ... It is the thinking that gives the illusion of life."
  "There must be rules for your world to be believable."

**Ollie Johnston's list (kept on Lasseter's table), the lines for us:**
- "Don't move anything unless it's for a purpose."
- "Simple animated shapes."
- "Concentrate on drawing clear, not clean."
- "Make definite changes from one attitude to another in timing and expression."
- "The audience has a difficult time reading the first 6-8 frames in a scene."
- "Does the added action ... help sell it or confuse it?"
- "Actions can be eliminated and staging 'cheated' if it simplifies the picture."

## 4. From the shorts

- **Story and character first:** "The thing I wanted to do in Luxo Jr. was make the characters and story the most
  important thing, not the fact that it was done with computer graphics." He locked the camera and used a black ground.
- **Life without a face:** "I wanted to get the sense that he was a character without doing the typical thing of
  sticking a face on an inanimate object."
- **Material is weight:** "I wanted the feeling with the lamps that their bases were very heavy, so when they land it's
  with a thud." The tin toy is tin and the baby is "much more massive". "Sound really helps."
- **The sound-off test:** after Chuck Jones, with really good animation "you should be able to turn the sound off and
  still know what's going on".
- **The computer does the mechanical motion** (the ball's roll, the unicycle's wheels, the snow), but the animator
  keeps "initial control".
- **Pathos:** Frank Thomas, asked when computer animation would reach Disney's level: "When computer animation can
  create pathos." After *Red's Dream*: "John, you did it."
- **The lamp lights the world:** *Luxo Jr.* was "a lamp whose head is a light-source, moving around and
  self-shadowing the world around him, ... a perfect matching of technology and subject matter" (*To Infinity and
  Beyond*, via Wikipedia).

## 5. What carries to Godmarrow

1. **Our clips are too few frames, timed too evenly.** Every clip is 8 frames (hit 6, wind-up 4) played at one rate,
   so there is no slow in and out, no held anticipation and no snap. Timing is "more than any other principle" the
   weight; we need a timing sheet per clip: frames held for different lengths (`docs/animation/02-method.md`).
2. **Our hero has no visible eyes.** The Ossuarch's helm hides his face, so "it is even more important to lead with the
   head". Monsters are identified by their eyes (Derek's rule), so eyed monsters lead with the eyes and eyeless ones
   with the head.
3. **Fast moves strobe at our frame counts.** A swing that crosses half a body in one frame reads as two pictures.
   Stretch the weapon and the limb along the arc, or paint a smear frame, so frames overlap.
4. **Eight views are his "two views", times four.** A clip is judged in all eight, never only from the side.
5. **Rigid armour squashes at the joints,** like the lamp, never by bending the plates.
6. **Moving holds for every idle,** including the Stranger, braziers and lanterns: nothing ever stops dead.
7. **One idea at a time:** in a crowded fight, the one important action reads by contrast, either the only fast thing
   or the only still one.
8. **The lantern is our Luxo:** a light source carried by a character, self-shadowing the world as it moves.
9. **Weight by material,** as with the lamp bases and the tin: bone, iron, cloth and blood each drag and settle at
   their own rate.

## What could not be verified

- No Lasseter text was found for "acting it out" or "pose tests" as stated techniques (he acted out *Tin Toy* while
  pitching it).
- The 1987 and 1994 texts disagree on one Luxo detail ("all eyes are on him" against "on Jr.").
