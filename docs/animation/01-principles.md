# The principles, for our sprites

Lasseter's eleven principles (study chapter 14), each with what it means for a pixel character of about two hundred
pixels in eight views, and a **test** that can be checked on a finished clip. A clip that fails a test is not finished.

## 1. Squash and stretch

**His rule:** the most important principle; "no matter how squashed or stretched out a particular object gets, its
volume remains constant"; "flexible parts should squash more and rigid parts less"; a jointed thing "squashes by
folding over on itself, and stretches by extending out fully."

**For us:**
- **Armour never bends.** The Ossuarch's plate, helm and shield are rigid: he squashes by his joints, folding at hip,
  knee and spine into a crouch, and stretches by opening out to full reach. The bone and iron keep their shapes.
- **Soft things squash:** cloth, the plume, flesh, the bloated monsters, blood, the Red. A body that lands squashes
  its belly and its cloth; the plate does not.
- **Strobing is the trap at our frame counts.** When a fast part moves so far between frames that its two positions do
  not overlap, the eye sees two pictures. Lasseter: stretch the object "enough so that its positions do overlap from
  frame to frame (or nearly so)". For us: stretch the blade and the forearm along the arc of a swing, or paint a smear
  frame, or add a frame.

**Test:** step the strike frame by frame; a fast part's silhouette in one frame touches or overlaps its silhouette in
the next. In the value-only view, the rigid parts keep their shape in every frame.

## 2. Timing

**His rule:** "More than any other principle, timing defines the weight of an object." It depends "mostly on the
spacing of the poses and less on the poses themselves." Give the audience "enough time (but no more)" for the
anticipation, the action and the reaction.

**For us:**
- **Our clips play at one even rate.** That is the first thing to change: each frame gets its own hold (the timing
  sheet, `02-method.md`). The same eight drawings, timed differently, read as a heavy man or a light one.
- **Weight by size:** the Gorrhaun-sized bosses move slowly and take long to start and stop; small things are quick.
- **Weight by mind:** a heavy, tired, mournful thing moves slowly; an eager one quickly. The pilgrim at the start moves
  differently from the pilgrim at the end.
- **The head-turn table:** the same two poses read as a blow, a tic, a crisp order or a long look by the number of
  inbetweens alone. Choose the spacing for the meaning.

**Test:** the clip has a written timing sheet; no two neighbouring frames have the same hold unless the sheet says why;
turned to grey and played at game speed, the figure's weight reads.

## 3. Anticipation

**His rule:** "An action occurs in three parts: the preparation for the action, the action proper, and the
termination." "If the audience expects something to happen, then it can be much faster." Wally B.'s zip is "only 3 or
4 frames long, but he anticipates the zip long enough for the audience to know exactly what is coming next."

**For us:**
- **Every attack and every cast has a wind-up the player can read,** for monsters above all: it is how a player learns
  to dodge (Derek's Dark Souls death; the D2 lessons on readable monsters). A boss's wind-up is long and huge.
- **The action itself is short:** the swing is two or three frames, and the frames around it are held.
- **Heavy is shown by the wind-up:** "an exaggerated anticipation, like bending way down before picking up the object".
- **The charged melee** (Derek's Secret of Mana charge) is anticipation made into a mechanic: the longer the hold, the
  bigger the coil.

**Test:** name the three parts of the clip and their frames; a player who has never seen the move can say what is about
to happen before it lands.

## 4. Staging

**His rule:** "Only one idea be seen by the audience at a time." "In a still scene, the eye will be attracted to
movement. In a very busy scene, the eye will be attracted to something that is still." "It is always better to show an
action in silhouette."

**For us:**
- **Silhouette in all eight views.** A strike thrown straight at the camera reads as nothing. Angle the action so the
  weapon and limb clear the body in every view; cheat it if needed ("staging 'cheated' if it simplifies the picture").
- **One idea at a time in a fight.** When a boss winds up, the room around it goes quieter: its minions hold, its light
  gathers. The boss's tell is the one big thing moving.
- **Contrast directs the eye:** in a busy fight the one still thing (a boss gathering) or the one fast thing (an
  elite's dart) is what the player sees.

**Test:** fill the clip's silhouette black on grey: the action reads in every one of the eight views.

## 5. Follow through and overlapping action

**His rule:** "Actions very rarely come to a sudden and complete stop." Some part leads, and the rest follow in order;
"the degree that the appendages drag behind and the time it takes for them to stop is directly proportional to their
weight." "An action should never be brought to a complete stop before starting another action."

**For us:**
- **The order of a swing:** hips, then chest, shoulder, arm, wrist, and last the blade's tip and the cloth.
- **Drag by weight:** the plume and the cloth tails drag far and settle late; the bone shield drags a little; the iron
  barely. A heavy weapon pulls the body past the end of the swing.
- **Clips overlap:** an attack does not end on a dead stop before the walk resumes; its last frames are the walk's
  first.

**Test:** in the strike's last frames, at least two parts are still moving at different rates; nothing starts and stops
on the same frame as everything else.

## 6. Straight ahead and pose-to-pose: animate in layers

**His rule:** for the computer, key the trunk first and work "transformation by transformation down the branches";
"fewer extremes are used". Luxo Jr.'s hop: the travel first (two keys, which "defined the timing"), then the height,
then the arms keyed nearly every frame, then the base and shade.

**For us:** the clip is built in layers on the skeleton (`02-method.md`): the root's travel and timing first, then the
hips and spine, then the limbs, then the head, then the secondary parts (cloth, plume, weapon tassels) driven by the
joints' velocity. Each layer is checked before the next.

**Test:** the root alone, played as a moving dot, already shows the timing and the weight.

## 7. Slow in and slow out

**His rule:** the inbetweens bunch near the extremes, "with only one fleeting drawing halfway between". A timing chart
places them. Too-soft splines overshoot; lock them.

**For us:** with eight drawings, slow in and out is done by **holds**, not more drawings: the extremes are held longer,
the passing frame is shown once, briefly. Never let interpolation push a foot through the floor or a hand through the
body; lock the contacts.

**Test:** the extremes of every move are held longer than the frame between them; the feet do not slide or sink.

## 8. Arcs

**His rule:** "Arcs in nature are the most economical routes." "The faster the action, the flatter the arc." "Straight
inbetweens can completely kill the essence of an action."

**For us:** blades, fists, heads and dropping bodies travel on arcs. A sword that slides in a straight line between two
poses looks pasted. The head bobs on an arc in the walk.

**Test:** trace the weapon's tip and the head across the clip's frames: the dots fall on a smooth curve.

## 9. Exaggeration

**His rule:** not "arbitrarily distorting shapes", but "if a character is sad, make him sadder ... worried, make him
fret". "If just one thing is exaggerated in an otherwise lifelike scene, it will stick out." Exaggeration made *Luxo
Jr.* more real.

**For us:** at two hundred pixels and Diablo II's distance, real-world motion reads as nothing. Push the poses: the
wind-up deeper, the strike further, the hit harder, the death heavier. Push everything in a clip together, so nothing
sticks out.

**Test:** at the game's zoom, from across the screen, a stranger can name the action.

## 10. Secondary action

**His rule:** "always kept subordinate to the primary action. If it conflicts, becomes more interesting, or dominates in
any way, it is either the wrong choice or is staged improperly." A change of expression comes "before, or after, the
move", never in the middle.

**For us:** the plume, the cloth, the chains, the lantern's swing, the dust off the feet, the breath's plume. They make
it alive and never take the eye from the action.

**Test:** watch only the secondary parts: they move; then watch the clip: you did not notice them before the action.

## 11. Appeal

**His rule:** "charm, pleasing design, simplicity, communication, or magnetism ... A design that is complicated or hard to
read lacks appeal." No "twins": "both arms and both legs in the same position" is "stiff, wooden".

**For us:** in grimdark, appeal is clarity and magnetism, never cuteness: the Ossuarch's silhouette is a pleasure to
watch move. No twins: in idle, walk and cast, the two sides of the body are never mirror images.

**Test:** no frame of the clip has both arms or both legs in the same pose.

## The thinking character

Lasseter: "Personality ... is not a principle unto itself, but the intelligent application of all of the principles."
"All actions and movements of a character are the result of its thought processes." Jr. hops fast with his head up
while he chases the ball; after it pops, each hop is slower, longer on the ground, head down, "just hopping off to
nowhere". The same hop, two minds.

**For us:** every character's motion is designed from what it is thinking. The Ossuarch counts and is certain, so his
moves are exact and unhurried, like a man doing sums. The Hollow are hollow, so their moves have no lead and no
intent. A Tithe-Hand is a hand that wants. The Stranger is old, amused and a little mad, so he is still for a long time
and then makes one quick gesture. **Before a clip is made, write one line: what is it thinking?**
