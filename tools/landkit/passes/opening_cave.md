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
