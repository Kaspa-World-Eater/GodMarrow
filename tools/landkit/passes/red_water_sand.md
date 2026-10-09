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

## Rules check, after pass 5 (2026-10-09, the reminder)

Re-read `MASTER_RULES` in full, the area page (the Red Water's "thick and slow", "the tide is its heartbeat", the
footprints coming up out of the water), chapter 13 with its new section 6b, and the review page's notes (no new grade
on pass 5 yet; the last notes are the D grades on pass 4 and the cave's pass 1).

**The checklist, line by line:**
1. **Brief, the one true detail: FAILS.** The footprints coming up out of the Red do not read at all: 0.035 yd deep on a
   0.06 yd mesh is less than a pixel of form, and the red in them is a few stray dots.
2. **Scale:** passes; the Ossuarch at true size at the water's edge.
3. **Form:** passes the value-only test: in grey the swell, the coat, the berm, the logs and the columns read as solid
   and lit.
4. **Light:** the overcast sky by facing and occlusion, with a soft key. There is no warm local light on the open beach,
   and none belongs there by the lore.
5. **Values:** five masses (measured).
6. **Ramps:** hue-shifted throughout; the sea's darks desaturated as the area page asks.
7. **Paint: weak.** No dry-brush strokes on the sand or the sea yet; tooth only.
8. **Contact:** occlusion under the logs and the dead; the pebbles sit in the sand.
9. **Detail where it counts: weak.** The dead are hard to read.
10. **Life:** passes; everything moves on the heartbeat clock.
11. **Seen as the player sees it:** the game's camera and zoom; not in the game yet.
12. **Skeptic round:** beside the pit of offering and the cave's hall, the worst difference is the one big smooth dark
    swell face, with nothing on it for the eye.
13. **Cinematography:** 4 of 7 measured (rules 1, 22 and 27 fail, as logged in pass 5).

**Worst failure first: line 1, the footprints.** They become real form: each a bare foot (heel, ball, five toes, the
arch's shallow link) 0.05 yd deep, with a ridge of squeezed sand round it, on a fine 0.015 yd mesh along the trail, and
painted holding the blood with a lit far lip.

## Pass 6 (2026-10-09): the prints, and the logs become bones

**The prints (the rules check's worst failure):** each bare foot is now real form on its own fine mesh (0.015 yd) along
the trail: a heel 0.05 yd deep, the ball, five toes, the arch's shallow link on the outer side, and a low ridge of
squeezed sand round it, the older prints softened by the wind. Each holds the blood with a pale lip on its far edge.
At true scale a foot is a few pixels, so they read as a trail of small dark-red marks coming up out of the Red, which
is what the lore asks.

**Derek: "Turn the logs into bones."** Recorded in the decision log and the area page (the wrack's drift logs are now a
bone jam; whose bones is never said). `beach3d.bones_jam` replaces the logs:
- long bones, 5 to 10 yd: a waisted shaft flaring to its ends, a ball head on a short neck at one end, two knuckles at
  the other, piled crosswise as drift logs pile;
- one side of a ribcage half buried, four broad flat ribs arching out of the sand, and more strewn;
- vertebrae the size of casks, tipped over, with the arch, the spine and the side processes;
- the wrack's wood splinters are bone shards now.
- **Painted** (`paint_shore`): an old ivory-grey ramp of its own, grain split along each bone's own axis, pits, spume
  on the seaward sides. The first try was so dark it read as branches, and the first ribs read as wire hoops; they are
  lighter now, and broad, two strands across the blade.

**cine_check (exterior):** 4 of 7, unchanged (rules 1, 22, 27 fail as before).

**Grade: C.** The bones read as bones and the trail reads. **Still short:** the swell's front is one big smooth dark
mass, the roll is hard to read, the froth is blotchy, the tall column is plain, and the dead are hard to read.

## Rules check, after pass 6 (2026-10-09, the reminder)

`MASTER_RULES` unchanged since my last full reading (last edited this morning). Read again: the area page (the Red Water,
the wrack now a bone jam, "the washed-up dead along the strand"), the review page's notes.

**Derek's new note on pass 5:** "Don't forget the bodies in the water." Pass 4 had the dead floating in the shallows;
the rebuild dropped them. **This is the worst failure,** and line 1 of the checklist (the brief from the lore: "whatever
goes into the Red comes back"; the dead the sleeper's breath carries back to the shore).

The other lines stand as logged after pass 5 and 6: form passes the value test; the prints read; the paint is weak
(no dry-brush strokes); the dead on the sand are hard to read; the swell's front is one smooth dark mass; cine_check 4
of 7.

**Fix first:** the dead in the Red, as real forms riding the surface: face down with only the back and shoulders out,
one face up, one half sunk with a cloak spread round it, one tumbling in the swash; each bobbing on the heave and
swaying on the beat, the blood running off their backs.

## Pass 7 (2026-10-09): the bodies in the water

Derek: "Don't forget the bodies in the water." `beach3d.drowned`: five of the dead riding the Red as real forms on
its surface (`beach_floor.sea_z`), rebuilt every frame so they rise and fall on the heave and drift a little shoreward
on each surge of the beat, then back:
- face down, the back and the shoulder blades standing out of the blood, the head's crown with the hair spread on
  the surface, the arms flung out or hanging down into the red, the legs trailing under;
- one face up, pale;
- two in sodden cloaks clinging to the back, their ragged edges sinking under the surface so the Red cuts their
  outline;
- one rolled in the bore's froth; one at the swash's edge with the tongue running round it.
- **Painted** soaked in the Red: skin blotched dark red, cloth near black, a wet glaze where the sky catches the tops.

**The first try failed:** sunk too deep, the bodies were pale blobs, and the cloaks were flat square sheets reading as
tiles. Raised, given shoulder blades and flung arms at the surface, with the cloaks' edges sinking, they read as the
drowned.

**cine_check (exterior):** 4 of 7, unchanged.

**Grade: C.** **Still short:** the swell's front is one smooth dark mass, the roll is hard to read, the froth is
blotchy, the tall column is plain, and the drowned's legs read as stubs.

## Rules check, after pass 7, and pass 8 (2026-10-09): the swell's face

**Rules check:** `MASTER_RULES` and `CINEMATOGRAPHY.md` unchanged since my last full reading; no new notes on the
review page. Line by line as after pass 7, except line 1, which now passes (the drowned are in the water). **Worst
failure: the skeptic round's,** the swell's front as one big smooth dark mass with nothing for the eye.

**Pass 8:**
- **Form:** the crest is never even along the shore now (`beach_floor.crest`): it humps and sags, up to a third
  higher or lower, and stands forward or back, so the face breaks into broad facets that take the grey sky each its
  own way, and the lit band along the crest wanders.
- **Paint:** on the steep face the blood's skin is stretched as the wave climbs: long slow streaks running down the
  slope, a dull grey-pink sheen on the stretched lines and dark creases between, torn so no streak runs the whole face.
  The first try ran them too regular and read as a curtain of vertical bars; thinned and broken, they read as thick
  blood pulling.

**cine_check (exterior):** 4 of 7, unchanged.

**Grade: C+.** The face has structure and the viscosity shows on it. **Still short:** the roll is hard to read at this
angle, the froth is blotchy, the tall column at the right is plain, and the drowned's legs read as stubs.

## Rules check, after pass 8, and pass 9 (2026-10-09): the roll

**Rules check:** the rules, the cinematography chapter and the area page unchanged; no new notes on the review page.
Derek's last word was to keep doing what I think best, so the work goes on (the pause rule is for waiting). **Worst
failure: the roll is hard to read** (line 12, the skeptic round).

**Tried and failed:** a sky that is brighter overhead than at the horizon (about three to one), each facet mirroring
the part of the sky its reflected ray points at, to light the roll's top. At our camera height a facet tilted away
from us reflects the horizon or below, not the zenith, so the sheen fell everywhere and the crest's lit band went
out. Reverted. **Lesson:** under this camera, the high-Fresnel facets see the dim horizon; a sky gradient only
flattens the sea.

**The real fault was form:** where the roll gives way to the bore, `sea_z` cut the rest of the hump off at one phase,
so the wave ended along the shore in a sheer vertical wall. Now the roll sinks into the bore over a long stretch of
the crest (a smooth fall from phase 0.34 to 0.48), the lace of froth spreading over its collapsing back. The wave reads
as one heavy mass sweeping diagonally from the open beach down into the froth against the headland, its lit crest
leading the eye to the pilgrim.

**cine_check (exterior):** 4 of 7, unchanged.

**Grade: B-.** The frame composes, the motion has the heartbeat, the dead are in it. **Still short:** the froth is
blotchy where it is thickest, the tall column at the right is plain, the drowned's legs read as stubs, and the sand and
the sea want dry-brush strokes.

## Rules check, after pass 9, and pass 10 (2026-10-09): the froth

**Rules check:** the rules, the cinematography chapter and the area page unchanged; no new notes on the review page.
**Worst failure: the froth was blotchy** (line 7, the paint): the heaped froth a scatter of flat pale-pink blobs, the
lace two flat tones with holes punched in it, reading as paint.

**Pass 10:**
- **The lace has relief:** its value follows the sheet's fullness, thickest midway between the holes and thinning to
  a dark rim round each, pocked with small pores (a second, finer cellular noise). Thick froth is salmon-maroon, pale
  only where it is freshest and fullest.
- **The heaped froth is one mass:** many small lumps packed with a few large (7 to 12 to a stretch of crest, most of
  them 0.05 to 0.11 yd), lit as a mass: the tops facing the sky pale, the sides salmon, the contacts between lumps and
  at the foot dark, pocked with bubbles.

**cine_check (exterior):** 4 of 7, unchanged (rules 1, 22, 27 as logged).

**Grade: B-.** This is the tenth pass. **Still short of finished:** the tall column at the right is plain, the
drowned's legs read as stubs, the sand and the sea want dry-brush strokes, and the near-dark/far-light rule fails
because the dry backshore is lighter than the sea.

## Rules check, after pass 10, and pass 11 (2026-10-09): the column

**Rules check:** the rules and the area page unchanged; no grade from Derek on pass 10 yet. **Worst failure:** the tall
basalt column at the right, a large plain slab beside the pilgrim (line 9, detail where it counts).

**Pass 11** (paint only, `paint_shore`'s basalt):
- the joints between the drums hold the dark, so each column reads as stacked drums;
- long dark runs weep down the faces from the joints;
- the strokes along each column are stronger;
- **the tide marks** (the area page's "tide marks of dried red film"): wavering, broken bands of dried blood crust round
  the columns at four heights where past tides reached. First painted darker than the wet rock and invisible; dried
  crust is matte and browner, a step lighter than wet black basalt, and reads at that value.

The loop was repainted from pass 10's passes (the forms did not change).

**cine_check (exterior):** 4 of 7, unchanged.

**Grade: B-.** **Still short:** the drowned's legs read as stubs, the sand and the sea want dry-brush strokes, and the
dry backshore is lighter than the sea (rule 22).

## Rules check, after pass 11, and pass 12 (2026-10-09): the strokes

**Rules check:** the rules, the painted standard and the area page unchanged; no grade from Derek on pass 10 or 11
yet. **Worst failure: line 7, the paint:** no dry-brush strokes on the sand or the sea (painted standard, rule 4:
"Long dry-brush strokes: noise stretched along one axis ... Not round blobs, not cells").

**Pass 12** (paint only):
- the dry sand laid in strokes along the ripple crests: a stretched noise long along the shore and thin across it, a
  step lighter where the brush catches the grain tops and a step darker in the hollows, only where the light grazes;
- fainter strokes along the shore on the wet matte band;
- faint strokes along the swell's run on the sea, heavier where the sky's glaze lies.

**One bug:** the sea's strokes first used the sand's coordinates (a leftover variable) and crashed; fixed.

**cine_check (exterior):** 4 of 7, unchanged.

**Grade: B-.** **Still short:** the drowned's legs read as stubs, and the dry backshore is lighter than the sea (rule
22).

## Paused (2026-10-09), waiting for Derek's grade

Third rules-check reminder in a row with no reply from Derek, and the piece now waits on his grade of passes 10 to 12
(keep refining, or move to the next piece of the Red Shore). By the pause rule the reminder job is deleted; it is to be
recreated with the same prompt (`scratchpad/rules_check_cron.txt`) when he next writes. Rules unchanged; no new notes
on the review page.

## Rules check, before the cove (2026-10-09)

Derek, after pass 12: "Do another refinement pass on the beach and make sure it's at least 4 screens long and leads to
more bluffs and forces the player inland. You can add and old crumbled basalt shrine and other such things sparsely
to give it more identity. And the sand should extend inland for 2 screen before hitting cliffs that stop the player
like it's a big cove. Do another refinement pass, and make sure it's all walkable and ship it to game assets. Add
random columns of basalt in the water sparsely." The reminder job is recreated (he wrote).

**Read:** `MASTER_RULES` (the gate; 2b: the scene builds the game's tiles too; 5: placement by cause, layouts breathe,
collision at every base, objects in combat, the D2 camera); the area page (the bands from the water inland; the upturned
canoes above the tide line; sea stacks; the memorial poles of stacked faces on the headland; the spirit houses of the
shore folk's Thai side; the bluffs eroding, the river mouths; "the pilgrim small on a black beach"); chapter 13 and its
section 6b; report 07 (basalt) and report 08 (this piece).

**Confirmed:**
- Everything with height stays real form: the cove's cliffs (`cliff3d` basalt), the shrine, the cairns, the canoes, the
  columns in the sea.
- Every object is a new design for this place (a crumbled basalt spirit house, not the temple's; canoes as the area
  page gives them).
- Placement by cause: the cliffs where the coast's basalt stands; columns in the sea where the Red has cut the
  headlands down; the shrine above the storm line where the folk could reach it dry; the bone jam at the storm line.

**The brief (the cove):**
1. **The size, true to the game's screen** (480 x 270 art px; a screen is about 19 yd along the shore and 21 yd of
   depth): the beach runs **four screens along the shore** (about 76 yd), and the black sand runs **two screens inland**
   from the water (about 42 yd) to a back wall of basalt cliffs. The cliffs curve round at both ends into headlands
   running out into the Red: **a closed cove**.
2. **The one way on:** a cleft in the back wall, near one end, where the cliffs have broken: a talus ramp climbing
   between walls up into **the bluffs**, the only exit, forcing the player inland toward the old growth and the village.
3. **The sand by its bands,** as built: the swash and the coat, the wet band, the berm, the backshore rising to the cliff
   foot, wind-rippled, with a talus of fallen drums and breakdown at the cliffs' feet.
4. **Sparse identity:**
   - **an old crumbled basalt shrine:** a spirit house of the shore folk raised on a stump of column above the storm
     line, its little roof of slabs fallen in, drums toppled round it, worn tools laid in a line across its step (the
     new lore's ward);
   - **upturned canoes**, grey and split, above the tide line (the area page);
   - **cairns** of stacked drums;
   - **a memorial pole** of stacked faces on one headland, looking out to sea;
   - the bone jam at the storm line, kept.
5. **Lone basalt columns standing in the Red,** sparse, where the headlands have been cut down.
6. **All walkable:** the sand from the swash to the cliff foot and up the cleft; collision at every base (columns,
   shrine, canoes, the jam's bones, cairns, the cliffs); the water and the cliffs closed.
7. **Shipped to the game** as a baked zone on the pipeline the game already uses (being mapped), with its walk mask and
   collision, captured in the game with the Ossuarch.

## Pass 13 (2026-10-09): the cove, and the road into the game

**The cove** (`beach_floor`: `back_s`, `side_t`, `cove_d`, `cleft_t`, `in_cleft`, `cove_ground`): the beach runs about
100 yd along the shore between two headlands, the back wall about 42 yd (two screens) inland of the water, its corners
rounded into the headlands. One cleft through the back wall near the left end, its floor a gentle ramp between stumps,
is the only way on.

**The camera ruled the back wall:** the game's camera looks out to sea, so the back wall stands between it and the sand.
At true height (20 yd and more) it would hide half a screen of beach. As Diablo II cuts its near walls, the back wall
and its corners are a rim of broken stumps 2 to 5 yd tall, stepping up inland like a pavement of column tops. Round the
cleft, the stumps stand above its ramp so it reads as a cut. The headlands at the sides stand full height (20 to 28
yd); what they hide is only more headland and sea. Past the rim the ground is painted near dark: ground no one walks
and the camera cannot honestly see.

**New, sparse** (`beach3d`):
- **the shrine:** a crumbled basalt spirit house on a stump of three drums, its back roof slab fallen in and its front
  slab slid off broken onto the sand, a face worn smooth in the niche looking at the sea, a ring of low drums half
  toppled, and a line of worn tools across its step (the new lore's ward);
- **two upturned canoes,** grey and split, one with a sprung plank, one with its prow carved as the serpent's head;
- **five cairns** of stacked drums, one fallen;
- **a memorial pole** of stacked faces at the foot of the left headland, looking out to sea, the lowest face worn
  almost away, a little tiered roof on top;
- **nine lone basalt columns and clusters in the Red,** some cupped and holding blood;
- **the dead, the wrack and the bone jam** across the whole cove; more of the drowned.

**Into the game** (there was no road from the 3D road into the game before):
- **`blend_tiles.py`** builds a scene once in Blender and renders many frames.
- **`cove_bake.py`:**
  - lays the bog's chunk grid over a 145 x 145 yd zone;
  - renders tiles of 4 x 4 chunks, each camera placed so every pixel's centre falls on an engine pixel (checked from
    the position pass: 0.00 px off);
  - paints them with `paint_shore`;
  - cuts each chunk's ground (the Red at alpha 254), normals and tall bands sorted by depth less lift;
  - writes the half-yard height and block lattices and the index (with `"water": "red"`).
- **The Red is baked between beats** (`GM_CALM`): no breaking wave frozen into the ground.
- **`cove_export.py`:** the zone file. The sand is walkable, the Red and the cliffs solid, and every piece on the sand
  solid by its reach. The way on is a portal at the cleft's top (the moor's camp stands in for the bluffs until they
  are built). The start is under the right headland, with a lantern and a waystone. It proves every walkable tile and
  the portal are reached from the start.
- **The shader:** the Red has its own water branch (`shaders/baked_ground.gdshader`, `red`): no glint, the slide only
  in the beat's two surges, the surface darkening a breath with each.

**Derek's notes during the pass:**
- "The triangle shaped wedges are bad ... looks lazy." Basalt breaks along its cross-joints, so `cliff3d.rough_prism`'s
  "broken" tops now stay level (chipped back, never slanted). `chunk` lays whole drums on their side or standing. The
  column tops are near flat (a top fanned to a raised centre shaded as a pyramid of wedges). Sliver cells are left
  out, and only the high headlands split into the entablature's thin columns.
- "They need that raw gritty rough texture that you did inside of the cave." The cave's stone is in `paint_shore`'s
  basalt: per-column tone, strokes, grit specks and pits, rust runs, pale mineral in the crevices, and the weeping
  tears. The grit's pale specks are held back in daylight; at full strength they read as snow.
- "There's some that are like doing an accordion thing." Each long bone's points were lifted one by one where it crossed
  another, so it kinked. Bones are rigid now, lying straight on the two supports that bracket their middle (the upper
  hull of what they must clear).
- "The wave should be coming in not from the side." The break no longer peels sideways (`PEEL` 400 yd: a long stretch of
  crest breaks almost at once). In the game, the Red's shader heaves it shoreward on each surge, and swell bands travel
  in from the open Red.
- "The shadows being cast from objects look pretty bad but we can handle the fine detail later." These are the paint's
  key-light shadows baked into the ground (long dark streaks behind the bones and the dead). Logged for the
  fine-detail pass.
- Recorded in the area page: Derek's mountains-as-a-dead-behemoth and blood rivers into estuaries, for later.

**In the game** (`--zone=red_shore`, the Ossuarch):
- **The bake:** 174 chunks, 1912 sorted bands, 8.5 MB, every tile aligned to 0.00 px.
- **Walkable:** 2553 tiles, every one reached from the start, and the cleft's portal reached.
- **Collision:** checked (`--show=collision`): the jam, the dead, the shrine and the waystone stand solid.
- **The light:** the zone's own: a pale cool day over the paint's overcast (the bog's ambience was a heavy veil), and
  the moor's blue night.
- **Performance:** 60 fps, 17 ms a frame, about 300 draws.
- **The smoke test:** every order, champions, sigils, panels and the title: 0 errors.

**Still to do:**
- the shadows (fine detail);
- the pixel scale question (Derek: "why does it look so pixely?");
- the Red's true heartbeat loop in the game;
- the bluffs zone the cleft leads to.
