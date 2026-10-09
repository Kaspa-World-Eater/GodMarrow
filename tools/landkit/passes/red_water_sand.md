# The Red Water and the black sand (the Red Shore, piece 1)

## Rules check, before pass 1 (2026-10-09)

**Read:**
- `MASTER_RULES` (unchanged since the 2026-10-09 rulings).
- The area page's band 1 and band 2:
  - "thick and slow. Long swells, heavy breakers that fold late and fall slowly, dark foam that clings";
  - "a deep red-brown, near black in the troughs and under cloud shadow, dark wet crimson where the light lies on a
    swell. Nothing glows";
  - "glossy and red-black where the surf has just left it, dry grey-black above the tide";
  - "tide marks of dried red film";
  - "the washed-up dead along the strand: pilgrims' cloaks, staffs";
  - "footprints coming up out of the water".
- The shore folk's texts: whatever goes into the Red comes back; the dead come up the black sand at night.
- Chapter 10, the foreshore and the sand by wetness: swash, backwash, cusps, rills, the wet sheen, dry ripples.
- The library's water and effects pages; Derek's rules: no red light, no fog, weather in the world, ground alive,
  true scale with the Ossuarch.

**Confirmed:**
- The sea and the sand are new designs for this place.
- Everything with height is real form: swells and the breaking crest are a real surface; ripples, cusps, rills and
  footprints are real height on a fine mesh; the swash film is a real sheet over the sand.
- The placement follows the beach's causes (`shore_floor`).

**The one true detail:** footprints coming up out of the water, bare, a trail from the waterline up the wet sand, each
print holding a little of the red.

## The brief

**The sea:** a heavy surface of blood.
- Long swells running in parallel to the shore, slow, their faces taking the grey sky as dark wet crimson, the
  troughs near black.
- A line of breakers that fold late, their crests steepened and capped with dark foam that clings in strands and
  patches.
- The thin sheet of the swash running up the sand in lobes, with the sand showing through it.

**The sand:**
- Wet near the water: red-black, glossy, the sky's grey lying on it.
- Damp above that: matt.
- Dry above the tide: grey-black, rippled by the wind (real ripples, lit crests).
- The tide lines of dried red film and wrack: kelp, strands of foam scum.
- A pilgrim's cloak and staff lying on the wrack line.
- The footprints.

**Seen as the player sees it:** the game's camera and scale, the Ossuarch on the sand.

## Pass 1 (2026-10-09; Derek: "reference those effects" for the ocean; "I want bodies embedded into the shoreline. Rotting corpses")

**Built** (`tools/landkit3d/redwater3d.py`, `shore_fine.py`):
- **The sand at a footprint's scale:** a fine mesh at 0.05 yd holding the dry sand's wind ripples (enlarged to a
  crest every third of a yard so they read), the swash's lobed ridges, beach cusps and rills.
- **The footprints coming up out of the water** (the one true detail): bare, alternating, a stride apart, from the
  waterline up to the dry sand, each holding a little of the red.
- **The sea as a real surface:** steep-crested swells, a breaker line, and the swash's thin film over the sand. The
  water's faces under the sand are dropped, not hidden.
- **The wrack:** kelp along both tide lines; a pilgrim's cloak and staff on the high-water line.
- **The rotting dead embedded in the shoreline:** six bodies face down as the water left them, sunk in the wet sand.
  They are drowned and bloated, half rotted, or rotted to the spine, ribs and skull, with arms flung, rags of
  pilgrims' cloaks plastered over their backs, and their undersides soaked red. The sand round each is stained dark
  where they bled, running out past the body (the library's pool rule).

**The paint**, from the effects already made (Derek: "reference those effects"):
- The sea uses `blood.py`'s ramp (C0 to C3), the game's one blood, held dark. Its tone comes from the real light and
  each swell's slope, its churn shows only as small clots, and the light breaks into few dull dabs.
- Dark foam lies in strands on the breaker.
- The shallows let the red-black sand show through in dithered steps, with a thin dark wet edge.
- The sand is wet, damp or dry with ragged edges, the wet sand giving back the sky in dabs.

**What failed on the way:**
- Ketchup: `blood.shade`'s churn at the sea's scale painted bright red clouds, the library's named trap. It is now
  held dark.
- The wet and dry sand met in a dither gradient band; they now meet at ragged edges.
- The sky's sheen on the wet sand came out as big grey blotches, camouflage again. It is now fine, sparse dabs.
- The red stains round the dead read as bright rims, like stickers; they are now soaked dark.
- Diagonal shards at the waterline turned out to be the film's depth thresholds tracing the rills. They are now
  dithered depth steps.
- The foam came out as pale blobs, then as ornamental curls.

**Grade: C.** The beach is B- (the wet sand, the prints, the dead, the kelp). **The sea fails:**
- the swells don't read as bands of tone;
- the breaker is a band, not a wave folding late;
- the foam doesn't cling as it should.

**Next:** the sea as its own pass. The breaker gets real 3D form (the crest curling over, on the 3D road), the swells'
backs carry the sky in dragged strokes, and foam lies in the troughs behind the break.

## Rules check, 2026-10-09 (Derek's last word: the corpses, "reference those effects"), then pass 2: the sea

Checked against pass 1:
- Lines 2, 3, 8 and 11 pass for the beach (true scale with the Ossuarch, real ripples and prints, the dead sunk in
  the sand, the game's camera).
- **Lines 5, 7 and 9 fail on the sea,** the worst failure: one flat red sheet, no swell bands, a breaker that is a
  band, foam that does not cling. The lore's line: "heavy breakers that fold late and fall slowly, dark foam that
  clings".

**Pass 2, the sea:**
- **The breaker is real form** (`redwater3d.breaker`, `curl_profile`): a sheet swept along the shore through its
  cross-section. The back rises slow and heavy, the lip is thrown forward over a dark hollow and curls down, and the
  curl changes slowly along its length, sections already collapsed to a slumped wall. The height field keeps only a low
  swell under it.
- **Its paint:** the hollow under the lip in the blood's own shadow; the lip's face a step lighter; a thin broken line
  of foam along the lip's top, strands clinging down the face, and the spent foam lying in strands behind the break,
  thinning toward the beach.
- **The swells' backs** carry the grey sky in dragged strokes along their line. The dither falls only at a tone's
  edge; the first try showed rows of dots across the whole sea, against rule 2.

**Grade: the sea C+, the piece C+.** A breaking wave reads as one, dark and heavy, from the beach. **Still short:**
- the lip's foam breaks into blocky rectangles;
- the spent strands curl too neatly;
- the swells beyond the break are bands, not yet heavy shapes;
- the breaker doesn't move (that comes with the game's animation pass: "fold late and fall slowly").

## Rules check (2nd since Derek's last word), then pass 3: the sea's foam and swells

**Worst failure:** the sea's paint:
- the lip's foam broke into blocks;
- the spent strands curled like ornament;
- the swells beyond were even bands.

**Fixes:**
- A second swell set crosses at an angle, shorter, so the sea is heavy and irregular.
- The lip's foam is a fine broken line, from two noises at the scale of a hand.
- The spent foam lies in dry-brush streaks dragged along the shore and broken where the brush lifts (the lake
  effect's method, from the library's water page).

**Grade: the sea B-, the piece B-. Still short:**
- a few rows of dither in the near swells;
- the far sea needs its own darker distance under cloud shadow (the area page: "near black ... under cloud shadow");
- the corpses read as bodies only up close;
- the breaker doesn't move yet (that comes in the game).
