# The opening: the cave under the black cliffs (where the game begins)

Derek, 2026-10-09: "Pause on the ocean. Build the starting area." The opening as settled
(`docs/wiki/mythology/areas/the-red-shore.md`, "The opening"):
- the pilgrim rises from a visceral pool of blood in the dark;
- it climbs stairs past faces carved in the walls and blue wisp-fire torches in rusted iron holders;
- a weapon falls from a skeleton on the wall;
- in the hall, an empty throne with the weapons of all who came before heaped before it, "just like the movie" (Conan's
  tomb), and the Stranger beside it;
- the reading; then a door of white light out through the black cliffs onto the beach.

No enemies.

## Rules check, before pass 1

**Read:**
- `MASTER_RULES`:
  - section 0: overhangs and enclosed spaces on the 3D road;
  - section 6: no red light, and the blood never glows;
  - section 7: lore only in in-world voices.
- The area page's opening, the Stranger's lines, and the bible's Reading.
- The temple's inside (Derek: "Great job on the inside. The new technique really is paid off"): darkness, one real
  light, the roof and the near walls hidden from the camera but still shading.
- The black cliffs' columns (`cliff3d.prism`): the cave is cut in the same rock.
- Chapter 04 (caves, columnar basalt) and chapter 11 (Northwest Coast faces, forms only).
- The library: fire, candles and wax (the wisp-fire), blood and fluids (one blood effect), hollows, alcoves and
  altars.

**The real thing:** Fingal's Cave on Staffa, a sea cave cut into columnar basalt. Its walls are columns, its floor
steps over broken column stumps, and the sea comes in. Here the sea is the Red, which comes in under the cliffs and
stands in the pool.

**Confirmed:**
- Everything is new for this place; the columns share the cliffs' generator, since this is the same rock.
- It is real form: columns, stumps, steps, faces in relief, the throne, the heap of weapons.
- It is placed by cause: the pool where the Red seeps in at the lowest point; the steps cut up the column stumps; the
  hall where the rock opens out under the cliff's top; the door where the cave meets the cliff face.

**The one true detail:** the heap before the throne is everything left by everyone who came up the stairs before (the
Stranger: "Most left what they were holding").

## The brief

- **The pool chamber** (about 12 by 9 yd, under a low vault): a floor of column stumps stepping down into a basin
  where the blood stands, its edge pooled dark. Two blue wisp-fires in rusted iron holders light the chamber.
- **The stairs** climb away from the pool (up the screen) on column stumps cut into steps, the walls close on both
  sides. Faces are carved in the column faces, blunt and distinct: some without eyes, some without mouths, some half
  cut. A skeleton is fixed to the wall with iron, holding its weapon out. More blue fire.
- **The hall** (about 16 by 12 yd): a throne of black basalt on a dais of three steps, empty; the heap of rusted
  weapons and armour before it (swords, spears, helms, shields, bones); faces all round; the door to the cliff face,
  full of white light.
- **The camera** sees in as the game will. The cave's roof and the near walls are hidden from it, cut to low stubs, but
  they still shade, so the light is the cave's own: dark, blue, cold, with the white of the door.

## Pass 1: the massing (2026-10-09)

**Built** (`tools/landkit3d/cave3d.py`):
- **The rooms, on the cliffs' columns:** the pool chamber's floor of stumps, the basin under blood, the stairs cut in
  thirteen steps, the hall, and walls of columns round them.
- **The roof** is hidden from the camera but keeps the sky out.
- **Seven blue wisp-fires** in rusted iron holders, real lamps of their own colour. The lamp pass now carries colour,
  and the old warm candle is unchanged.
- **Twelve faces** in relief: eyeless, mouthless, blank, half cut, whole.
- **The skeleton** fixed to the wall by rusted iron, holding its sword out over the stairs.
- **The throne room:** the throne on its dais of three steps, an empty ovoid cut in its back, and seventy rusted
  things heaped before it (swords, spears, helms, shields, skulls and bones).
- **The door's white day,** as a lamp.

**The layout rule, learned:**
- Every room climbs up the screen, so the walls the camera sees are back walls.
- Any wall that would hide a room is cut down to just above the lowest floor it hides, and painted near black as solid
  rock (`cutrock`), the iso convention.
- The first render hid the stairs and the hall behind tall walls. The second showed the cut walls as more floor. The
  third cut them to the highest floor nearby, so they still buried the stairs' foot.

**Also fixed:** the pool is held dark (it rendered as ketchup again); no lichen grows in the cave's dark; the beach's
splash stain is no longer painted on the cave's stumps.

**Grade: D+, a layout.** **Still short:**
- the stairs don't read between the pool and the hall;
- the faces are too small to see at this zoom;
- the pool is a flat oval;
- the stumps read as slabs;
- there is no close view at the game's scale yet.

**Next:** the pool chamber at the game's scale with the Ossuarch rising from the pool, then the stairs, then the hall.

## Derek, 2026-10-09: "Have the cave started as the rough real looking ... basalt but then it becomes more carved and more. Obviously some sort of forgotten Temple shrine on the inside."

**The arc from nature to the made:**
- **The pool chamber** is raw columnar basalt, untouched (Fingal's Cave).
- **The stairs:** the lowest steps are rough stumps; the upper steps are cut true, worn hollow in the middle. The faces
  are half cut near the bottom and whole near the top.
- **The hall** is a forgotten temple cut into the living rock:
  - dressed walls to about four yards, with pilasters, a frieze of faces and a cornice, and raw columns rising above
    the carving where the builders stopped;
  - squared pillars rising out of frame;
  - a floor of dressed flags;
  - a carved frame round the door;
  - the throne cut from one block.

**Derek's grade, D:** "Make it bigger, more defined, darker, glowing red near the pool, way way way more detail. The
only light after the pool comes from the wisp fire torches."

## Pass 2 (after Derek's notes)

**Changes:**
- **Bigger:** about 1.6 times, a longer climb of seventeen steps to 6 yd.
- **Darker:** the scene's `AMBIENT` at 0.3, and deeper crevices.
- **The pool's red glow:** two low red lamps that stay near it. Its surface is dark (it throws the glow, it isn't
  lava). Its shoreline is the column stumps themselves, hex by hex with islands. Three dead lie at its edge, with bones.
- **Past the pool, only wisp-fire:** the door's white lamp is removed.
- **Raw to made:** the cut steps above the rough ones; the hall's dressed walls (pilasters, a frieze of faces, a
  cornice) with raw columns above them; squared pillars; irregular flags; a carved door frame.
- **Detail:** offerings under the faces (candle stubs, teeth, coins), chains on the pillars, rags from the cornice,
  skulls in niches, cold braziers, wax mounds at the throne's foot, and the Stranger's nine cards on the step.
- **Three views at the game's scale** with the Ossuarch, beside the overview.

**Grade: D+. Still short at the game's scale:**
- the faces are too dim to read;
- the hall's flags are a noisy jumble;
- the hall view cuts off the throne and the back wall;
- the stumps are lit too flatly;
- the detail is too small and dark to tell.

**Next:** one room at a time at the game's scale, the pool chamber first.

## Rules check (1st since Derek's notes), then pass 3: the pool chamber at the game's scale

**Worst failure, line 5 (values):** the stumps were lit flat. The basalt paint set each face's tone by its direction
alone and never dimmed it by the light actually there, so in the cave's dark every top came out mid-grey.

**Fixes:**
- **The stone's planes are scaled by the light that reaches them** (basalt and dressed alike), so the dark is real and
  only the lamps carve the stone.
- **The pool glows from its depths:** its tone follows the depth from its edge in smooth bands, with small clots, never
  blotches.
- **Three red lamps just above the blood,** so the glow rakes across every stump face that looks into the pool and
  fades fast, lighting the raw columns behind a dull red.

**Grade: the pool chamber C+.** The mood is there: a black chamber, a pool lit from beneath with islands of stumps and
bones in it, red light raking the stone. **Still short:**
- the dead at the edge don't read as bodies;
- the floor beyond the glow is an even dark;
- the surface could show a slow skin.

**Next:** the stairs and the hall at the game's scale.

## Rules check (2nd since Derek's notes), then pass 4: the stairs at the game's scale

**Worst failure, line 9 (detail where it counts):** the faces were built on the room's boundary line, but the wall's
columns stand a little inside it, so the faces, torches and skeleton were buried in the rock.

**Fixes:**
- They are set on the stone's real surface.
- The stairs' wisp-fires are stronger and the pool's red glow weaker, so past the pool the blue owns the light
  (Derek's note).

**Grade: the stairs C.** The rough stumps at the foot turn into cut steps as they climb into the wisp-light: the raw
becoming the made, readable in one climb. **Still short:** the faces are too shallow and small to catch the light,
and need their own pass (deeper carving, bigger, lit from the side by the torches).

**Rules check paused** (2026-10-09): the third reminder with no word from Derek, so the reminder is off by his pause
rule until he next writes. **Next when work resumes:** the faces' own pass (deeper carving, bigger, lit from the side),
then the hall at the game's scale.

## Derek, 2026-10-09 (after pass 4)

His notes on the cave:
- "The cave looks too blocks not enough painted look, lacks fine details is too brightly lit. The floor and walls aren't
  rough enough, I don't see the faces, it doesn't give mystical ancient and forlorn vibes."
- "There's no cinematography. No. Ambiance. It doesn't inspire wonder."
- "The basalt is too uniform."
- "Study cinematography again ... Add it to the rules why it's important."
- "Depth and lighting in atmosphere and cinematog[raphy are] very incredibly important for everything we do."
- "The throne sucks too. Add some mirrors as well."
- "The wisp light flame should be white blue. Flickering ethereal."

## The study first

- **Chapter 12** (cinematography, atmosphere, wonder) and a deeper second round of research
  (`tools/art_study/private/cinematography_research.md`).
- **Bound as its own rules chapter,** `docs/CINEMATOGRAPHY.md`: 39 rules, `MASTER_RULES` 0c, checklist line 13.
- **`tools/landkit3d/cine_check.py`** measures the testable rules on every render.
- **Its verdict on pass 4's stairs:** the brightness spread over 152 places, the even, sourceless light Derek saw.

## Pass 5: the cave remade by chapter 12

**The light** (`tools/landkit3d/paint_cave.py`, the cave's own painter):
- The light is the lamps. Tone comes from the light that truly reaches each surface, on a logarithmic curve, so a
  carving's turn to or from a fire stays readable beside the flame.
- Pools of light with black between them. The shadow sits a step above black (Gurney), the contacts darkest.
- Dither and paper tooth fade with the light (quiet darks). The render runs at 128 samples, with the light's hue
  smoothed (no red specks).
- **Every source is seen:** the wisp flames are painted at their lamps:
  - white heart, pale cyan, cold blue body, the edge half there;
  - each on its own breath, swaying, tongues tearing off;
  - an aura only on the stone near it, and cold motes rising and dying within a yard.

  A brazier burns as a bowl of tongues.
- Glints toward the fires on the wet stone near the pool and on the worn floor.

**The basalt, not uniform** (`cliff3d.seeds`, `cells`, `rough_prism`, `chunk`):
- Every column is a cell of a power diagram of every girth, thick in the colonnade and thin where the rock cooled fast.
- Drums of uneven height with cupped or domed joints. Faces spalled and bellied, arrises worn round and chipped, flakes
  gone.
- The tall walls break at four or five yards into the entablature's thin crooked columns, rising out of the light.
- At the walls' feet: breakdown, fallen drums lying among the stumps, and grit.
- Each column has its own value step by the object pass (`blend_scene` now writes object ids), laid in vertical strokes,
  with rust running from the joints and pale zeolite in the crevices.

**The faces** (`cave3d.relief`, `face_depth`):
- Recarved to be read from far off in the dark, as the Bayon's faces at Angkor and the moai are: a brow that is a
  shelf, sockets cut deep enough to hold black, a long nose, the cheek falling away under the bone, a Bayon smile or no
  mouth.
- Kinds:
  - the half face, left unfinished in hewn planes;
  - the eyeless;
  - the sleeping Bayon face;
  - the blind;
  - the effaced, chiselled off by someone.
- **The stair faces,** each 2.3 to 2.6 yd (taller than the pilgrim):
  - turned on the wall to look down the stairs at whoever climbs, since square to the wall they were seen in profile;
  - each rising out of a bulge of the living rock, its rim sloping back so it never stands in a box;
  - each raked by its own wisp-fire from its up-stair side at the brow's height.

**The throne** (Derek: "The throne sucks too"):
- Bomarzo's Orcus is the real thing: the giant face in the Sacro Bosco whose open mouth holds a seat. The empty throne
  sits in the mouth of a face eight yards tall, cut into the raw columns at the head of the nave. Whoever sits on it
  sits in the god's mouth.
- A dais of five worn steps; the seat too big for a man; an iron circlet left on it.
- Chains hang out of the dark into the mouth.
- Two braziers burn low beside the dais, the hall's brightest fires, lighting the face from below (sinister, saint11).
  Its crown fades into the unseen roof (withhold).
- The heap of everything left by the ones before spills down the steps: swords driven in, helms, shields, skulls,
  spears leaning, rotted cloth.
- The Stranger's wax and cards on the step.

**The mirrors:**
- Four dark mirrors of obsidian in rings of dressed stone, human teeth set round them, two at each side of the hall.
- A wisp candle stands before each, placed on the camera's reflected ray, so the mirror holds a second flame.
- `blend_scene.mirror_pass` renders what each mirror sees: every surface gives off its own position as light and the
  mirror is perfect gloss. The painter finds that point in the frame.
- The pilgrim has no reflection. This is deliberate, and Derek can overrule it.

**Also:**
- The hall's flags made great, some cracked through or missing, dust drifted where no foot goes.
- The stair treads cupped, their nosings worn, dust against the risers.
- Two dim torches only at the hall's ends, so its edges are found, not lit.

**Bugs fixed:**
- `P.sphere` objects turned with `rotation_euler` swung round the world's origin, flinging shields 19 yd up; spheres now
  take `rot`, turned about their own centre.
- Python's `hash()` on strings differs every run, so the columns changed between renders; it is now `zlib.crc32`.

**`cine_check`:**
- The hall passes 8 of 9. Rule 22 fails on the measure: the face's crown is kept dark on purpose, so the top band is
  dark.
- The stairs pass 9 of 9.

**Grade:**
- The hall is B-: a real composition. The face reads as a face from across the hall; the throne in its mouth is the
  subject; the pillars frame it in silhouette; the mirrors catch the fires.
- The stairs are C+.
- The pool chamber is C.

**Still short:**
- The heap reads as a murky mass, not a heap of things.
- The colossal face's planes are still crude (its brow reads as a band), and the stair faces are small at this zoom.
- The pool's surface is blotchy.
- The flags and the cut-rock mass in the foreground are plain.

## Rules check (1st since pass 5), against every checklist line

**Read:**
- `MASTER_RULES` in full, including the new 0c.
- `CINEMATOGRAPHY.md`.
- The area page's opening. One true detail: "the rusted weapons and armour of everyone who came up before heaped
  before it". The Stranger sits on the dais step, never on the throne.

| Line | Verdict |
|---|---|
| 1. Brief | Passes: built from the lore, with the heap as its true detail. But the heap fails at the game's scale (line 9). |
| 2. Scale | Passes: the pilgrim is 2 yd; the faces are 2.3 to 2.6 yd and the colossal face 8 yd; the seat is too big for a man, on purpose. |
| 3. Form | Passes: every column, relief, flag, step and heap item is geometry, and the value-only test reads. |
| 4. Light | Passes: the wisp-fires and the pool glow (the ruled red exception); no sky. |
| 5. Values | Passes: `cine_check` puts each frame's squint test at 3 to 5 masses. |
| 6. Ramps | Passes: hue-shifted. |
| 7. Paint | Partly: the stone is laid in strokes, but the colossal face's brow reads as a flat band. |
| 8. Contact | Passes: occlusion is dark at the feet. |
| 9. Detail where it counts | **Fails (worst):** the heap, the room's true detail, reads as a murky brown mass; nothing in it catches the braziers' light. |
| 10. Life | Passes: the flames flicker, the motes rise, the pool's skin drifts. |
| 11. Seen as the player sees it | Passes: the game's camera, with the Ossuarch. |
| 12. Skeptic round | Against the temple's inside, the cave is darker and grander but rougher in finish. |
| 13. Cinematography | Passes: the stairs 9 of 9, the pool 9 of 9, the hall 8 of 9 (its crown dark on purpose). |

**Fix first: the heap.**
- The heap is the room's true detail, and it must read as a heap of things left by people: blades catching the
  braziers, rims on helms and shields, dense and spilling.

**The fix (pass 5b): the heap** (detail where it counts):
- 460 things, dense and spilling low down the steps.
- Blades and helms of dark iron (light on dark), rust for the rest; shields with bosses, helms with nasals.
- A banner pole with its rag, a great axe and a hauberk, so the heap says what it is at a glance.
- Old metal takes glints of the fires.
- **The light:** the braziers stand behind the heap and backlit it into a murk. Three of the Stranger's candles still
  burn low at its front, on both sides. He sits on the dais step and has kept them there for years. Their light rakes
  back across the heap, so the helms, skulls and shield rims catch it at the foot and the swords rise into the dark.

**Grade:** the hall stays B-. The heap now reads as things left behind. **Still short:** the heap's middle is dark.

## Rules check (2nd since pass 5)

**Read:** `MASTER_RULES` and `CINEMATOGRAPHY.md`. The checklist stands as at the 1st check, with the heap now passing
line 9.

**Worst failure now, line 7 (paint and form):** the colossal face, the hall's subject, had a brow that read as one
black band. A single straight shelf threw one continuous shadow over both sockets.

**Pass 5c:**
- The brow is recarved as two arches, one over each eye, as carved brows are (the Bayon's included).
- The ridge between the eyes rises to meet the nose, with a swell to the forehead.
- Each socket now holds its own shape of black.
- Every face shares `face_depth`, so the stair faces gained it too.

**Results:**
- `cine_check`: the stairs pass 9 of 9, the hall 8 of 9 (its crown dark on purpose).
- At the game's scale: the colossal face reads as a face from across the hall; the upper stair face reads brow,
  socket, nose and mouth in its torch's raking light.

## Derek, 2026-10-09: B

"The faces needs work but it's a B, good job on the lighting, but make the flames more flames like with embers, and
flickering, little darker, more defines light zones"

**Next (pass 6):**
- **The flames** become real fire, per saint11's fire tutorial:
  - a bright base that holds its volume, with tongues born at the base, rising, narrowing to points and tearing off;
  - ragged edges that change every frame;
  - embers: cold sparks flicking up and dying.
- **The light** flickers more, without strobing.
- **A step darker.**
- **Light zones defined:** each pool stepped in bands by its falloff (rule 10: at least three bands, each wider than
  the one inside it), the form's shading kept within each band.
- **Later:** the faces.

## Pass 6 (Derek's B, his notes)

**The flames** (`paint_cave.fires`, saint11's fire tutorial):
- A bright base that holds its volume.
- Tongues (three to a torch, six to a brazier) born at the base, rising, narrowing to points and tearing off, their
  edges ragged by a noise that moves with time.
- White heart, pale cyan, cold blue; the dying tips violet-blue and half there.
- Embers flick up, wink and die within about a yard.
- The light's own flicker is stronger (integer frequencies so the loop closes; never a strobe).
- The loops have 12 frames at 90 ms.

**A step darker:** `EXPO` from 0.30 to 0.25; the shadow's bounce from 0.09 to 0.06.

**The light zones defined:**
- The light is split into its falloff (from the lamps' positions and power, matched to the pass) and the form's own
  shading (the pass over the falloff: shadows and turn to the fire).
- The falloff is stepped into six bands, equal steps in the log, so each band is wider than the one inside it
  (rule 10), with a narrow dither at each seam.
- The form keeps its shading inside each band.
- The faint fringe stays continuous (at most a quarter dimmer). The first try stepped it to black and the colossal face
  vanished.
- A wide dither seam brought the stipple back over whole walls, so it is held to a thin line.

**Grade:** B. **Still short:** the faces (Derek: "The faces needs work"), then the heap's middle and the pool's
surface.

**`cine_check`:**
- The stairs pass 9 of 9, the pool 9 of 9, the hall 8 of 9 (rule 22: the face's crown is dark on purpose).
- Rule 1 now ignores specks under 3 px, since an ember is fire too.

## Rules check (1st since Derek's B)

**Read:**
- `MASTER_RULES` and `CINEMATOGRAPHY.md`.
- The area page: the faces are "blunt, distinct, worn; some without eyes, some without mouths, some only half cut", and
  the Stranger says "Everyone sees faces but there's no faces here".

**The checklist:**
- Lines 1 to 8, 10, 11 and 13 pass, as at pass 6.
- **Line 9 (detail where it counts) fails worst,** in Derek's words: "The faces needs work".
  - Every face is the same template at different scales: one egg, one set of features. Not distinct.
  - They are too clean for their age: no cracks, no broken pieces, no weeping from the sockets.
  - Nothing about them is wrong in the way the brief asks ("they look weird").
  - The stair faces are small at the game's zoom.

**Pass 7, the faces:**
- Each face its own design from its seed: the head's width and length, how high the brow sits, how far apart the eyes
  are, the length of the nose, the width of the mouth.
- Some are wrong:
  - a third socket in the brow;
  - one eye too low;
  - sockets of different sizes;
  - a mouth stitched shut in vertical cuts;
  - a second, smaller face carved inside the mouth.
- Age:
  - cracks running across, as real grooves;
  - a piece of jaw or brow broken away to the rough;
  - the mineral weeping dark from every socket and crevice down the wall (the painter: tears of mineral, ancient and
    forlorn).
- The stair faces taller: 3.2 to 3.6 yd against the pilgrim's 2.

**Pass 7, the faces** (`cave3d.face_params`, `face_depth`; `paint_cave` weeping):
- **Each face its own design from its seed:** the head's width and length, how high the brow sits, how far apart the
  eyes are, the length of the nose, the width and height of the mouth, one brow lifted.
- **About half are wrong, one wrong thing each:**
  - a third socket in the brow;
  - one eye fallen lower;
  - one socket far larger;
  - the mouth stitched shut in cuts;
  - a small face looking out of the mouth.
- **Age:**
  - one to three cracks right across each, cut as ragged grooves;
  - more than half have a piece of jaw or brow broken away to the rough;
  - the colossal face is cracked from crown to cheek.
- **The weeping:** water has seeped from every socket and crevice for longer than anyone remembers, and the painter
  runs dark mineral tears down the wall below each (a pale crust at the lip where a fire finds them). It shows most on
  the colossal face, which weeps from its sockets.
- **The stair faces are taller,** 3.2 to 3.6 yd against the pilgrim's 2. Each torch moved to its face's middle height
  and burns brighter (125 W), so its light rakes the whole face, not just the brow.

**`cine_check`:** the stairs 9 of 9; the hall 8 of 9 (rule 22, the crown dark on purpose).

**Grade:**
- The faces C+ to B-. The great eyeless face on the stairs reads from across the frame, brow, sockets, nose and broken
  jaw; the colossal face weeps.
- **Still short:** the half-cut face sits low and dark at the stairs' foot. The faces' cut stone is lit evenly within
  each band and wants more chisel in the light.

## Rules check (2nd since Derek's B), then pass 7b

**Read:** `MASTER_RULES`, `CINEMATOGRAPHY.md` and the area's opening. The checklist stands as at pass 7. Worst first:

1. **Line 9:** the half-cut face at the stairs' foot sits low and dark. Its fire is too far and too weak (80 W, 1.8 yd
   off).
2. **Line 7, paint:** the carved stone is lit evenly within each band, with no hand in it. Rule 37 (ancient) and the
   real thing: carved basalt keeps the chisel's marks, fine parallel strokes changing direction from plane to plane,
   seen only where the light rakes them.

**Pass 7b:**
- The carvings take their own material, `carved` (30). The painter lays the chisel on it: short parallel strokes in the
  face's own plane, the direction turning with the surface. They are smaller than a pixel in depth, so painted, as the
  form law allows, and only in the light (rule 7: quiet darks).
- The foot torch comes closer to the half-cut face and burns brighter.

**Results:**
- The chisel shows in the lit stone of every carving; the upper stair face reads brow, socket, nose and mouth with the
  hand in it.
- The half-cut face is lit but remains the weakest.
- `cine_check`: the stairs 9 of 9, the hall 8 of 9.

## Derek, 2026-10-09 (after pass 7b)

"The torches on the walls need iron holders. The bug [big] face need to be a bunch of little faces, dim it down some
more, with a emphasis of light on the throne, make the floor and walls that are carved more raw and gritty. The throne
itself is so hard to see I couldn't see it at all"

**Pass 8, worst first:**
1. **The throne, unseen** (rule 1: the subject must be the brightest lit surface).
   - The seat sat back inside the mouth's hollow, hidden behind the lower lip at the camera's angle.
   - It comes forward onto the top step, a great seat with a tall back and arms, silhouetted against the black of the
     open mouth (light on dark).
   - Four of the Stranger's wisp candles on its arms and step make it the brightest lit thing in the hall; every other
     fire is turned down.
2. **The big face as many little faces:** the colossal face's form stays (brows, sockets, nose, the mouth that holds the
   throne), but its surface is covered in small faces, each its own, turned with the big face's surface. Its sockets
   and mouth stay empty and black.
3. **Dimmer overall.**
4. **The carved stone raw and gritty:**
   - the flags, walls, pillars, steps and dais roughened as true geometry (subdivided and displaced);
   - grit, pits and pale fresh bites painted in their light.
5. **Iron holders:** each wall torch in a wrought-iron sconce (a wall plate, a curled arm, a basket of bars round the
   fire), big enough to read as a dark shape against its own light.

## Derek, 2026-10-09: the pool

"Reduce the blood glow and make the blood more realistic and gross with faces on the wall having blood pour from their
mouths into the pool"

**The real thing:** the mascarons of old fountains, stone faces spouting from their mouths.

**The plan (pass 8, the pool):**
- **The faces:** the chamber's back walls stand about nine yards from the blood, too far to pour into. So three raw
  basalt pillars rise at the pool's back edge, each with a crude face cut into it, the first carving in the cave (the
  raw becoming the made). From each mouth a thick rope of blood pours straight down into the pool.
- **The glow cut well down.**
- **The blood:**
  - near-black red;
  - a congealed skin wrinkling at its edges;
  - clots floating as real lumps;
  - pink froth and spreading rings where the streams strike;
  - the surface glossy, holding the wisp-fires in it, as blood does in the dark (the mirror pass now treats the pool as
    gloss).

## Derek, 2026-10-09: no exit

"Give the room no exit. There will be a large mirror the player looks in in a large face, it reflects nothing but
darkness."

**Built (pass 8):**
- The door and its frame are gone; the hall is closed.
- On the hall's back wall to the right of the throne, facing the camera, a great face rises out of the floor to its
  chin.
- Its open mouth, at standing height, holds a great dark mirror. The material is new (`voidmirror`, 31), and the
  reflection pass never touches it: the painter lays it the deepest black, with a faint cold rim and a slow breath in
  the black.
- Two wisp candles stand before it, exactly where any mirror would show their flames. Every other mirror in the hall
  holds its fires; this one holds none, and no pilgrim.
- The right-hand wall mirrors moved further round to make room.

**Left to Derek:** how the pilgrim leaves the hall. The mirror is not assumed to be the way out.

**Derek, the same hour:** "The mirror is the way out, they will walk into it and disappear." "The large mirror will be
at the top of the throne stairs." So the void mirror moves to the top of the dais.

**Derek's choice:** "Mirror replaces it" (the throne).
- The colossal face's open mouth at the top of the dais is the great dark mirror, about 3.7 by 2.2 yd, framed by the
  lips.
- No seat. The heap stays at the stairs' foot.
- The Stranger's candles burn on the top step either side of it.
- The separate void-mirror face was removed.
- The area page marks the throne's lines for rework.

## Derek, 2026-10-09: the pool again

"I liked the blood pool better without the wall in it, have define plain faces on the chamber walls, with mouths opens
while blood oozes from their mouths in the poo[l]."

**The rebuild:**
- The pillars are gone.
- The pool moves nearer the back wall.
- Three plain, defined faces are cut into the raw columns there: taller than the pilgrim, turned to the camera, no cracks
  and nothing wrong with them, mouths open.
- Blood oozes from each mouth as a thick tongue down the chin and the wall, and runs to the pool along a channel worn low
  through the stumps.
- The blood stands level in every low place on the floor, so the runnels and the pool are one.

## Derek, 2026-10-09: one face, one mirror; the rest masks

"You can have one large face with a mirror in its mouth. The other faces on the walls Should be kind of just like
almost like just the features like porcelain Mass [masks] but made of the wall obviously. Nothing in their mouths. The
central large mouth will have the only black onyx mirror."

**Changes:**
- The great face at the top of the stairs is one face, without the small faces on it.
- Its mouth holds the only mirror in the cave: black onyx, reflecting nothing.
- The four wall mirrors, their candles and the little mouth-mirrors are gone.
- Every other face is a mask in the wall's own stone: just the features, smooth as porcelain, with no cracks, broken
  pieces, pits or wrong things, and nothing in the mouths. The blood still oozes from the pool chamber's faces.
- The mirror pass still runs for the pool's gloss.

## Pass 8, results

**Changes, all to Derek's notes:**
- **Fire:** orange, with iron sconces.
- **The hall:**
  - no exit;
  - the onyx mirror in the great face's mouth at the top of the cleared stairs, the only mirror;
  - the heaps either side of the stairs' foot;
  - an iron fire-basket hung on chains, raking the great face;
  - the throne gone.
- **The masks:** every other face is a smooth stone mask.
- **The stone:** gritty dressed stone (displaced geometry and painted grit).
- **Relics:** iron relics scattered through the cave.
- **The pool:**
  - contained again, nearer the back wall;
  - its glow cut well down;
  - near-black blood with a congealed skin, clots and gloss;
  - three plain masks oozing blood along runnels into it, each with its fire.

**At the game's scale:**
- The great face reads from across the hall: brows, sockets, nose, and the black mouth framed by candles.
- The stair masks read.
- The pool's masks read in a row on the lit wall.

**`cine_check`:** the hall passes 9 of 9; the stairs 8 of 9 (black note 6.2%); the pool as reported.

**Grade:**
- Hall B+, stairs B, pool B-.
- **Still short:** the heaps sit dim, and the pool masks want a closer look.

## Rules check (1st since pass 8)

**Read:** `MASTER_RULES`, `CINEMATOGRAPHY.md` and the area's opening (the pool beat: "a visceral pool of blood"; the
mirror the way out).

**Checklist:** lines 1 to 11 pass at pass 8 (the heaps sit dim, a line 9 note). **Line 13 fails worst, in the pool
frame:**
- the black note covers 10.2% (rule 4);
- the squint test finds one mass (rule 6).

The frame's lower half is near-black stumps far from any fire, and the shadow there touches black.

**Fix (8b):**
- Frame the pool by its subject: the lit wall of masks and the pool fill the frame, the dark foreground kept to a band
  (rule 21: the near plane darkest, but a band, not half the frame).
- The shadow's bounce raised a breath (0.06 to 0.075), so the dark sits a step above black (Gurney; rule 3).

**8b results:**
- The pool is framed by its subject: the lit wall of masks, each with its fire and its blood, above the pool.
- The weeping, the dark lips and the light's tint had pushed shadowed stone below its ramp's darkest swatch, so stone
  now never goes below that swatch, except in the contacts and the onyx mirror.
- `cine_check` measured a deep red as black (luminance). Black is now measured as every channel near zero.
- All three frames pass 9 of 9.

## Derek, 2026-10-09 (after 8b)

"Make the mouth taller s[o] we can walk through it like we are being eaten. The faces have a weird orange squish line,
make them smooth like they were hand carved to a smooth finish, to offer contrast to the rough walls. Dim the t[orch]es
by 35% and add the embers and heat shimmer our fire effects have. Add carved runes into the steps"

**Pass 9:**
- **The maw:** the great face's nose is shortened and its mouth made a maw about three yards tall, its lower lip at the
  top step. The onyx fills it, and the pilgrim walks in as if being eaten.
- **Smooth faces:** the orange line was the hard lit lip painted on every turn of a carving, with the chisel strokes.
  Both are gone. The carvings are one even stone with a soft polish that takes a highlight of the fire, against the
  rough walls.
- **The torches** burn at 65%.
- **Shimmer:** above and round every fire the scene bends a little in whole pixels and the air warms a breath (the
  game's own method, `radiant_blaze.gdshader`).
- **Embers:** more of them, some streaking.
- **The marks:** the builders' script, ten marks of straight strokes, cut in a line along the riser of every throne
  step. No one living can read it. (Derek said "runes"; the game's word for item runes is "sigil", so these are the
  builders' marks.)

**Derek, the same hour:** "The mirror in the large mouth is not able to be seen, give it an ornate carved runic stone
border."
- The onyx gets a border: two raised rings of smooth carved stone, a flat band between them with the builders' marks cut
  round it, and twelve bosses on the outer ring.
- The step candles light it, so the black reads against lit stone (dark on light, the Windmill relation).

**Derek, the same hour:** "Don't make the steps reflective, give them a bit more grit. But worn smooth in the center
where countless have walked up."
- The dressed floor's polish glints are gone.
- More grit and pits are painted on all dressed stone.
- The scene records each path as a worn line (up the throne's stairs to the mouth; up the cave's stairs), and the
  painter thins the grit along them and lays the stone a breath paler there. Matte, worn smooth, never reflective.

**Derek, the same hour:** "Here is a good carved face example" (a reference: a serene stone face rising out of rough rock,
heavy closed lids, a rounded nose, full parted lips, no outline, raked from above); then "Make the face expression more
one of despair."
- Every face is now carved by a new model to his reference (`cave3d.serene_depth`):
  - a rounded head tapering to the jaw, rising out of the rock with no outline (its edge broken by noise, joined to the
    rock by a smooth maximum);
  - soft sockets and heavy closed lids, each with a dark crease;
  - a nose rising to a rounded tip with shadowed nostrils;
  - full lips and a firm chin.
- **Despair:**
  - the inner brows raised and drawn together;
  - a knot and creases between them, furrows across the middle of the brow;
  - lids sagging at the outer corners;
  - the mouth's corners pulled down, the lips parted on a moan;
  - cheeks hollow under the bone.
- The kinds stay: closed lids, empty sockets, open eyes, the mouth open (the pool's), the maw.

**The faces were lost in the paint, not the geometry.** Shaded from above in the normal pass they read, despair and all.
Their fires beside them at mid-height flooded them near front-on. Every face's fire now hangs above its head (the
reference is lit from above), so the light falls down the face, shadowing the sockets, under the nose and under the
lip. The painter keeps a little more of the form's turn inside each band. The carved faces paint in a paler, warm ramp
against the dark walls, and their features are cut 1.7 times deeper.

**Pass 9 results (honest):**
- **The hall:** the maw is tall, a black gate at the top of the clear stairs, with candles either side. The onyx and its
  border were moved forward to the lips' plane, but the border still reads only faintly, not yet ornate.
- **The stairs:** the upper face reads in its light from above: sockets, nose, the mouth pulled down.
- **The pool:** the three faces (now 3 yd) still do not read; the lit wall shows pale blobs. They are next.
- Torches at 65%, shimmer and embers, the marks on the risers, gritty steps worn in the centre: all in.

## Rules check (1st since pass 9)

**Read:**
- `MASTER_RULES` and `CINEMATOGRAPHY.md` (rule 19, grazing light; rule 18, flatten the lights only within two steps).
- The area's pool beat.

**Worst failure, line 9 (detail where it counts):** the pool's three faces read as pale blobs. Their geometry reads
lit from above (the normal pass). But each fire hangs 1.5 yd off its face, so the face washes into the top band, where
the form's turn is lost. **Fix (9b):** the fire higher and further out, weaker, so the face lies in the middle bands
and its sockets, nose and lips keep their shadow.

**9b, what was really wrong with the pool faces (two causes, both in the light, not the carving):**
1. Near a fire the painter laid a flat pale wash over everything bright ("the stone goes pale by the flame"), erasing a
   face's shading. Now the wash comes only right beside a flame and follows the form.
2. The form inside each band was the light over a falloff estimated from the lamps alone, scaled once for the whole
   frame. Beside close fires the estimate ran low and the form saturated on most of each face. Now the falloff is
   calibrated locally to the light that truly arrives (wide blur). Tried and set aside: the form taken as the light
   over its own blur, which flattened the great face's large shapes.

Also the pool faces' fires: close, above and to one side, grazing (115 W).

**Results:** the pool's faces now show brows and sockets, still faint; the hall's great face reads; `cine_check` 9 of 9 on
all three.
**Correction:** `cine_check` after 9b: the stairs 9 of 9 and the pool 9 of 9, but the hall 8 of 9. Rule 6, the squint,
finds 2 masses: the locally calibrated light flattened the hall's broad value structure. To fix next.

## Rules check (2nd since pass 9)

**Read:** `MASTER_RULES` and `CINEMATOGRAPHY.md` (rule 1, the subject brightest; rule 6, the squint).

**Worst failure:** the hall's squint finds 2 masses (rule 6). Since 9b the maw's frame of lit stone sits at the walls'
value, so the frame reads as dark plus mid.

**Fix (9c):** the candles framing the maw from 52 to 72 W, so the subject is again its own light mass round the black.

**9c result:**
- Brighter maw candles (72 W) and, as a trial, gentler form contrast did not lift the hall's squint off 2 masses. The
  gentle form softened the faces, so it was put back (the candles stay).
- The bins show the middle-light mass is not missing but broken up (7% of the frame, in fragments). Its large lit area
  is cut by the black maw, the hanging chains and the dark mineral weeping.
- **Next for the hall:** compose the light mass whole. Fewer weeping streaks across the great face's lit planes, the
  chains moved off its centre, so the lit stone round the maw reads as one shape.

**Rules check paused** (2026-10-09): the third reminder in a row with no word from Derek, so the reminder is off by his
pause rule until he next writes. **Next when work resumes:** the hall's light mass composed whole (fewer weeping streaks
across the great face's lit planes, the chains off its centre), and the onyx's border made to read as ornate.

## Derek, 2026-10-09: "Make the mouth more like an archway and less like an o on the exit"

**Pass 10, the archway:**
- The great face's mouth is now an archway: flat at the top step, straight sides, a round arch overhead, with a raised
  moulding round it, cut in the face's own surface.
- The face grew from 8 to 10 yd, so the arch (about 3.7 by 3 yd) walks through under the nose.
- The onyx fills the arch just behind the lips. Its carved border (two mouldings, the marked band between them, bosses)
  follows the arch and stands just proud of the lips, so it reads.
- The candles stepped clear of the border; the wall, the sconces and the fire-basket moved out for the bigger face.

**Rules check** resumed (Derek wrote).

**Derek, the same hour:** "Carve runes into the stairs. Overall I like it. Be sure to write about how you massively
improved the stone look. Then move on to what's next when you are ready."
- The builders' marks are now cut along every cut riser of the cave's stairs, facing whoever climbs (the rough stumps
  below stay unmarked: the raw before the made).
- The stone's remaking is written up as report 07 (`tools/art_study/reports/07-opening-cave.md`) and indexed in the
  library.

**Pass 10 results:**
- The archway reads: flat at the step, straight sides, a round head.
- Its carved border shows clearly, with its bosses.
- The great face over it reads strongly: brows, deep sockets, the nose bridge running down to the arch's crown.

**Next:** the Red Water and the black sand. Its study comes first (Derek's D: "need a study in the tide, oceans,
water, black sand").
- `cine_check`: the hall 9 of 9 (the squint recovered with the archway), the stairs 9 of 9.
- The runes on the cave stairs' cut risers are cut, but in the stairs frame those steps sit up in the dark and the marks
  are too small to show there. They read best at the throne steps in the hall.

## Pass 11 (2026-10-09): depth, blood from every face, the 2 x 2 grid

**Derek's notes:**
- (On the cove) "We need to set these as the rules ... Which means you need to go back and fix the starting area too."
- "I'd like the faces to be a little bit more defined as well and all of them having blood running out of their nose and
  mouth. And then the main face remove two of the torches on the top of the stairs. And also I don't know if it's just
  the pictures but the flames look not great."

**The bare-floor test** (MASTER_RULES 0.5b, value only, the floors alone):
- **The pool chamber passes:** a pavement of column stumps at many heights.
- **The stairs pass:** cut steps.
- **The throne hall fails:** its flags lay within a finger of dead level, a sheet with joints drawn on it, and the worn
  way existed only in the paint.

**Fixed** (`cave3d.hall_relief`, read by the flags and by everything standing on them):
- long low swells of heave under the floor, plus a finer one;
- a shallow trough worn along the way from the stairs' head to the great face's mouth (real form now);
- each flag's corners at the floor's own height there, one in twenty tipped where a corner sank;
- dust banked against the walls and the pillars as real drifts, thick at the wall and thinning across the flags.

In the value-only render the hall's floor now shows its shape.

**Every face bleeds** (`cave3d.bleed`, called by every `relief`): from both nostrils and both corners of the mouth,
runs of blood follow the carved surface down over the lips and the chin, gathering as they go, drip off the slab's foot
and keep a small pool filling. A source that falls in a hole (the great face's archway) is skipped.

**The faces more defined** (`paint_cave`, the carved stone): a steeper turn from the lit planes into the shade, and
every crease (the sockets, the lids, the lips, the nostrils) holding its own dark through its occlusion. There are no
hard lit lips; Derek rejected those as the "orange squish line".

**The great face's torches:** Derek then made it clear: "I meant to remove the two on the stairs." The two flank
sconces are back, and the two candles on the stair are gone; the cresset and the sconces light the face. Checked in
`cv18_face`: a sconce on each side of the archway, and no flame left on the steps.

**The flames:** at the old 4 px grid a candle's flame was a few texels, so its shape could not read. The cave is now
rendered on the 2 x 2 grid (painted standard 7), where each flame has four times the texels.

**Then, from the renders on the 2 x 2 grid:**
- **The faces' real fault was the mesh:** about 36 by 44 vertices over a three-yard face, so a lid or a nostril was three
  or four vertices and rendered as smeared triangles whatever the light did. `relief` now scales the mesh to the face,
  about 28 vertices a yard across and 34 up. The features are deeper too (2.4 times the old depth, the head a fifth
  fuller). The lids with their creases, the noses and the downturned mouths now read on the stair faces.
- **The carved stone's tone** rolls off in the highlights (a tanh curve), so a face beside its fire keeps turning. A
  steeper curve blew the faces out to one orange mass.
- **The blood runs** are twice as thick, painted as wet blood with a glint where the fire catches them.
- **The flames:** a small hot seat and four separate tongues (seven in a brazier), narrower, taller and swaying more,
  with dark between them. They had merged into one soft teardrop.

## Rules check (1st since pass 11)

**Read:** `MASTER_RULES` in full, the area's opening (the Stranger's new lines), `CINEMATOGRAPHY.md`.
**Checklist on `cv18_face` (the hall, game zoom, 2 x 2):** lines 1, 2, 4 to 8, 10 and 12 pass; line 3 now passes its
bare-floor test (pass 11). `cine_check`: 9 of 9 measured rules pass. Line 11 (seen in the game) waits on the cave's
bake, which waits on Derek's go.
**Worst failure, line 3 (0.5c, the five tones of form):** the fallen shields on the hall floor were squashed spheres
of rust. From the game's camera each read as a flat orange plate with a dot, one value across, and they were the
loudest things on the floor.
**Fixed** (`cave3d.shield`, used on the floor and in the heaps): a dished face of rusted iron (a polar mesh with real
depth at the boss), a rolled iron rim, an iron boss, tipped up on its edge so the fire turns over the dish; face down
it shows its hollow back and the grip. In `cv19_face` the dark rims outline every shield, the dishes turn from lit to
shade, and the heap's leaning shields catch the brazier.

## Rules check (2nd since pass 11)

**Read:** `MASTER_RULES` (unchanged since the last check but for the new `docs/animation/` row), the area's opening.
**Checklist on `cv19_face`:** as at the last check; `cine_check` 9 of 9. **Worst failure, line 9 (detail where it
counts) and cinematography rule 2 (pools of light):** the heaps at the stair's foot, the room's one true detail ("the
rusted weapons and armour of everyone who came up before"), still read as dark mounds with a glint; nothing near them
lit their fronts.
**Fixed** (`cave3d`, the heaps): five candle stubs on each heap's camera-facing side, left by those who came before,
their wax run down over the mail, four burning low and one guttered out. In `cv20_face` each heap is now a small pool
of light: the shields' rims, a helm and the sword hilts catch it, and the heap reads as a heap. `cine_check`: 9 of 9.

## Rules check (3rd since pass 11): the pool on the 2 x 2 grid

**Read:** `MASTER_RULES` (unchanged), the area's opening ("a visceral pool of blood ... the Red, come in under the
cliffs"; pass 8: near-black, a congealed skin, clots, a gloss that catches the fires).
**The pool re-rendered at game scale on the 2 x 2 grid (`cv20_pool`):** `cine_check` 9 of 9, but by eye the worst
failure was the room's subject: **the blood had gone flat and bright**, one red fill with dark specks, like a painted
rug. **Cause:** the pool's depth from its edge was measured in pixels (`edt / 18`), a constant set for the old 4 px
grid; on the 2 x 2 grid the same pool is twice the pixels, the depth saturated, and almost all of it took the
brightest red.
**Fixed** (`paint_cave`, the pool): the depth scaled by the render's zoom. In `cv21_pool` the blood is near-black red
again, with the dull heart, the skin and the clots reading; 9 of 9.
**Next, by the checklist:**
- **2.3, no primitive stand-ins:** two of the dead at the pool's edge (the ones who came up and did not stand) are grey
  tubes and blobs, a puppet, not a body. They need real form: the five tones, the weight lying on the stumps.
- **Follow-up:** `paint_cave.light_field`'s grain smoothing (2 px) and the local-contrast blur (16 px) are the same kind
  of pixel constant; scaling them by the zoom changes every room's light, so it is its own pass, checked on all three
  rooms.
- **The dead are a piece of their own (MASTER_RULES 2b, 2.3):** the cave's `pool_bodies` and the beach's
  `redwater3d.corpse` and `beach3d.drowned` are all built the same way, a sphere torso and straight tube limbs; the
  beach's only read better because `paint_shore.form_tones` turns them. A body is a reusable asset: one shared
  builder (shaped limbs with knees, elbows, hands and feet, the weight lying on what it lies on, bloat and rot as
  states), with its own ten graded passes, then used by the beach, the cave and every later dead. Queued, not patched.

## Rules check (4th since pass 11): the light's pixel constants

**Read:** `MASTER_RULES` (unchanged). **Worked:** the follow-up from the last check, `paint_cave`'s two pixel-sized light
constants on the 2 x 2 grid, tested on all three rooms from their saved passes (before, after, then each alone):
- **The local-contrast blur (16 px):** scaled with the zoom, the hall's step-tops lost some orange blotching, but the
  stairs' faces beside their fires went flatter and dimmer: against Derek's "the faces ... more defined". **Kept at
  16 px on purpose**, with a note in the code.
- **The light's grain smoothing (2 px):** scaled with the zoom; it changes almost nothing (mean difference 0.03 of 255),
  kept as the right value.
`cine_check`: 9 of 9 in all three rooms, before and after. The follow-up is closed. **Open:** the shared corpse asset
(queued above); Derek's grade of pass 11; then the cave's bake into the game.

