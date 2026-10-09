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

## Pass 4 (Derek: "It all looks very plain. There's no details. The sand doesn't even look as good as your desert sand, the water looks very plain"; "Those curvy lines look ridiculous"; "the artifact has an animated image too")

**Rebuilt on the best work we have:**
- **The black sand** on the dune's method (`painted_dune.py`): bold ripples, each lit from its own profile (the
  overcast alone is too soft to carve them); dry-brush strokes along the crests; washes; tooth; grit pooled in the
  troughs and a lit lip on each crest; a hue-shifted eight-tone ramp, warm in the light and violet in the shade.
- **The sea** on the painted lake's method (`shaders/lake.gdshader`, kind 1): dragged strokes, a paper grain, the
  sheen in dabs toward the sky side, and clots drifting.
- **The wet sand mirrors the grey sky,** strongest where it is wettest, in strokes along the shore. This is the
  beach's own read, and it gives the scene its value bands: dark sea, pale glossy strand, dry sand.
- **Details:**
  - 140 black cobbles, in a band and strewn;
  - scattered bones (long bones, vertebrae, jaws);
  - the pilgrims' things: a lantern, a bowl, a sandal, a coil of rope, beads;
  - two dead floating face down in the shallows, with a cloak spread on the water.
- **The waterline** is irregular and runs up and back, with a thin broken lace of foam at its edge.

**Removed** (Derek: "ridiculous"): every sine-drawn line, meaning the rills, the repeated swash ridges, the ripples'
forced forks that bent them into chevrons, and the sea's wrinkle curls. Loose bones no longer leave blood stains.

**The loop:** an eight-frame animation (`GM_T`, the scene's time 0 to 1). The swells roll in one wavelength a loop,
the breaker's curl peels along the shore, the swash runs up and draws back, and the foam drifts. It is on the page
beside the still.

**Grade: C+, better but not there.** **Still short:**
- the mirror is too even;
- the frame has nothing standing in it to give structure: no cliff, stack or drift log;
- the far sea is still noisy.

**Next, by Derek's word:** the beach runs long side to side, closed at both ends by large black cliffs.

**Derek's grade, D:** "Doesn't look real enough, need a study in the tide, oceans, water, black sand, the details are
lacking. It's very plain." **Next for this piece, when the ocean resumes:** a study chapter on real oceans, surf, tides
and black sand beaches, then the piece rebuilt from it.

## Rules check, before the rebuild (2026-10-09)

Derek graded pass 4 D: "Doesn't look real enough, need a study in the tide, oceans, water, black sand, the details are
lacking. It's very plain." He paused the ocean for the cave, then after it: "Looks good go on."

**Read:**
- `MASTER_RULES` (form law; 0c cinematography; no fog; no red light, so the blood is red by colour).
- `CINEMATOGRAPHY.md`.
- **Study chapter 13** (tide, surf, foam, black sand) and its research.
- Report 07 (the cave's stone and painter).
- The area page: "a sea of blood ... black sands"; the pilgrim comes out of the black cliffs onto "the beach of the
  dead"; the footprints coming up out of the water.

**The one true detail:** the footprints coming up out of the Red, ahead of the pilgrim's own.

**Confirmed:**
- Everything with height is real form: the profile, cusps, pebbles, the swell, the breaker and its lip, the bore, the
  swash front, kelp, logs, the dead, the cliffs.
- Only the sub-pixel is painted: the swash sheet, lace, grain, swash marks.

## The brief (pass 5, the rebuild)

1. **The profile:**
   - a submerged step;
   - a steep 1:8 face;
   - a berm crest casting shadow;
   - the backshore;
   - the log jam;
   - the cliff foot.
2. **Beach cusps** about 15 yd apart: horns of pebbles, drier and lighter; bays wetter and glossy, holding foam.
3. **One heavy shore-break, peeling along its crest,** part unbroken, part curling (a real lip with its shadow), part
   white (the bore as lumpy geometry). Behind it, only one or two long swells.
4. **The swash:** a lobed front (a real step), the sheet painted, backwash rills.
5. **The sand by its state:**
   - the glossy film band, mirroring the cliffs, the dead and the pilgrim through the reflection pass, with the grey
     sky where nothing is hit;
   - the wet matte band, the darkest value;
   - the drying band, mottled;
   - the dry charcoal, grain-lit.
6. **The blood:**
   - an oxblood body;
   - a Fresnel sheen on the slopes facing away;
   - pink stage-A foam, and lace as holes;
   - a maroon stain drying to brown crust below the high-tide line;
   - spume caught on the logs.
7. **The shore's painter** in the cave painter's manner: overcast light, quiet darks, `cine_check`.
8. **The black cliffs** (`cliffs_v2`) closing the frame.

## Pass 5 (2026-10-09): rebuilt from chapter 13, then on Derek's heartbeat ruling

**Built** (`tools/landkit3d/beach_floor.py`, `beach3d.py`, `paint_shore.py`), every height real form:
- **The profile by cause:** a submerged step with a yard's drop and a steep shelf beyond, the 1:8 face, a berm 0.48 yd
  tall at the high water, a backshore rising gently with wind ripples in patches; cusps about 15 yd apart (horns pushed
  seaward and higher, bays drawn in with a worn runnel); the footprints coming up out of the Red.
- **What the waves sorted:** about 4,000 pebbles (one mesh) and cobbles on the horns, along the berm and at the cliff
  foot, fewer under the seepage film.
- **One wave's life at every place along the shore,** peeling from the headland: the swell shoaling, the roll, the bore
  of foam lumps, the swash with a real raised front, the backwash drawn down past the still line. The film the
  backwash leaves is a mirror mesh, so the reflection pass finds the cliffs and the dead in it.
- **The wrack:** a broken high-tide line of kelp, splinters and bones, an older storm line dried grey; a drift-log jam
  at the back of the beach, some with root wads; five of the dead; the pilgrim's lost staff and lantern.
- **The black cliffs** (`cliffs_v2`) stand on the new beach, closing the right of the frame.
- **The shore's painter:** overcast light (the sky pass by facing, a soft blurred key, the contacts darkest); the sea
  by Fresnel on an oxblood body, the reflection pass darkening the glaze where it sees the cliffs; foam stage A lit as
  form, stage B as lace by holes from a cellular noise, aging; the sand by its state band (glossy coat, wet matte,
  drying mottle, dry charcoal with grain), the stain below the high-tide line, swash residue in broken specks, the
  prints holding the red; the pilgrim's reflection in the film when he stands on it.

**Derek, mid-pass:** "Make sure the tide moves rather slow as it's based on dying heart beats not normal speeds and
blood is think and viscous." Recorded in the decision log, the area page, chapter 13 (new section 6b) and memory. I had
built a water ocean's physics (a fast plunging lip, chop), against the area page's own "thick and slow".
- **The heartbeat clock** (`beach_floor.heart`): one loop is one beat. The sea's time runs in a surge, a weaker second
  surge close behind, then crawls through a long stillness. Everything (the swell, the roll, the bore, the swash) moves
  on that clock.
- **Viscosity:** the short chop is gone (only long, low, slow undulations remain); the front never sharpens to an
  edge; the lip is a heavy rounded roll sagging over onto a dark crease, not a thrown curl; the foam is heaped flat
  froth, no spray; the swash is a slow tongue with a blunt nose a hand high, reaching 3 to 4 yd, its backwash slower;
  the coat it leaves lingers and is red lacquer, not clear water; the painted surface carries a skin creased where the
  beat pushes it, and clots.
- **Fixed in the painting rounds:** the sea flat maroon (now Fresnel on near-black, the troughs desaturated as the area
  page asks); the wet band a "river of blood" (the stain cut to a trace); the swash marks drawn as parallel lines (the
  "curvy lines" Derek rejected: now broken specks); the lace too white (capped); the basalt's camouflage lichen; the
  logs as pale pipes (each log's own grain from its pixels' long axis, and darkened as the near plane).

**cine_check (exterior):** 4 of 7. Rules 4, 5, 6, 7 pass. Rule 1 fails on the scattered foam; rule 22 fails because the
dry backshore at the bottom is lighter than the sea at the top; rule 27 fails because the sea is red by its own colour.

**Grade: C.** The form is right by cause and the motion now has the heartbeat. **Still short:**
- the swell's front face is one big smooth dark mass across the upper left;
- the roll is hard to read at this angle;
- the froth reads blotchy;
- the cliffs' tall foreground column is plain;
- the corpses are hard to read.
