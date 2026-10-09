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
