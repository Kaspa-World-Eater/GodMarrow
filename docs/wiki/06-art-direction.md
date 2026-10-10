# 06 · Art direction: what Godmarrow looks like

*Rewritten 2026-10-08; brought up to date 2026-10-09. The laws are `docs/MASTER_RULES.md`; how a pixel gets its
colour is `docs/PAINTED_STANDARD.md`; how the art is made is page 07. This page is the look itself and the reasons for
it.*

## 1. The standard in one breath

- **Grimdark, hand-made pixel art, painted:** broad tones laid like gouache on warm paper, in whole world pixels.
- **Real form under the paint:** everything with height is real geometry, lit by the moon and the lantern, casting and
  catching true shadows. Form is never painted flat.
- **True scale:** the pilgrim small in a big world, under trees whose crowns are out of sight.
- **Seen through Diablo II's camera**, in the register of Dark Souls and Blasphemous.
- **The bars to judge against:** the Seer's Bowl title (the god's stone face weeping blood into the bowl) and the
  Sunken Bog's pit of offering (Derek: "exceptional").
- **Every piece is art, not product** (Derek: "We are not a factory. We are making art"). It is designed from the lore,
  built true to its real-world cause, and made one at a time.

## 2. The camera and true scale

- **Diablo II's proportion:** the pilgrim is about an eighth of the screen's height. A yard is a 72 × 36 Godot-unit
  tile, a yard of height 84 units. Figures are drawn at 0.78 against the ground (`Iso.FIG`), so the world is large
  round them.
- **Everything at its true size**, worked out in yards before it is drawn:
  - a man is 2 yards;
  - the rainforest's spruce and cedar are 60 to 80 m, their trunks wider than the pilgrim is tall;
  - a village temple hall is about 13 × 8 yards, its ridge 9 to 10 yards up;
  - an old broadleaf is 15 to 25 m.
- **Plants are populations** (species, shapes and ages, every one grown). **Built things** (ruins, fortresses) have one
  fixed true size each.
- **Forests are felt from under them:**
  - the giants' crowns are above the frame, and the canopy shows only as light and shade on the floor;
  - small trees are mostly dead, or seedlings;
  - the generator keeps open ways and clearings;
  - nothing small and leafy crowds the screen.
- **Always show the pilgrim beside a study for scale.** Test captures use the Ossuarch.

## 3. Light and the dark

- **The dark is the canvas.** Light is scarce, so where it lands matters.
  - **At night** the land stays readable past the lantern. The night's floor is 0.52 (Derek, 2026-10-08: "unplayably
    dark" at 0.72).
  - **Each difficulty is a little darker,** so light matters more as you go.
- **The lantern is the key light and a stat.** Its pool pushes the dark back and rakes across real form through the
  normal maps. Its reach, its mood (stuttering under 30% life, guttering when a boss wakes) and its keeping are part of
  play. A bearer carries it: each calling starts with its own small companion (the Ossuarch's is the Candle-Hand).
- **The moon is the cool key**, from the screen's upper left (world −x, a little +y). Faces toward the left are lit;
  faces toward the right fall in shade.
- **Warm light only from real sources:** lantern, fire, candle. Temperature tints the tone in steps.
- **No red light,** with one ruled exception: the pit of offering's throat, which glows red from below, unseen.
- **Readability is for the near and the lit.** At the edge of the dark, creatures stay unseen. **Each kind is known by
  its eyes**, which gleam their own way (colour, shape, spacing, height, blink). The eyeless are the jump scares.
- **Cinematography:** light drives mood (Derek: "Shadows bring life to a world just like light does").
  - Every light has a visible or plainly motivated source.
  - Low key: mostly dark, pockets of light.
  - Shadow is information: contact, direction, the hour, threat.
  - Restraint: take light away rather than add it.
  - The brightest spot leads the eye.
  - Moving light makes a frame alive, but there is no strobing: flames swell and gutter slowly.
  - The full rules and their reasons: `docs/MASTER_RULES.md` section 0c and chapter 12 of the art library (Derek,
    2026-10-09: "There's no cinematography. No. Ambiance. It doesn't inspire wonder").
- **The first area is almost always overcast:** flat grey-green light, wet surfaces, soft shadows.

## 4. Paint (the painted standard, in short)

- **Tones:** broad flat tones from short, hue-shifted ramps (darks lean violet-blue, lights warm). Big forms get 6 to 8
  tones, small things 3 to 4.
- **Dither** lightly, only where one tone meets the next. Full Bayer speckle reads as gravel.
- **Pigment pools** at a wet edge: a dark band inside, then a lit lip.
- **Dry-brush strokes** along the form, the wind or the flow. **Highlights** are dragged, never dabbed.
- **A paper tooth** fixed to the world, never to the screen. **Whole world pixels** on the 2 x 2 art grid (Derek,
  2026-10-09: "2x2"; baked lands are painted at two texels an engine pixel).
- **Turn every form:** everything rounded gets the five tones of form (light, halftone, core shadow, reflected light,
  cast shadow and contact); soft light is no excuse for a flat shaft.
- **Contact:**
  - ambient occlusion where things meet;
  - moss, litter and grass over the feet of things;
  - a lit rim against what is behind.
- **Detail where it counts:** on the lit side and the silhouette. The shade stays flat.
- **Still alive:** everything moves a little in the one wind (`core/gust.gd`); glows breathe.

## 5. Form

- **FORM IS LAW** (Derek: "not flat painted bullshit"): paving stones' tilt and proud edges, joints, cracks, bone, roots,
  ripples, drifts. If it has height in the real world, it has height in ours.
- **The value-only test, every pass:** with all colour taken away, the piece must still read as solid, deep and lit.
- **Ground is never flat** (Derek, 2026-10-09: the cove's sand "just so flat"): every ground has its depth at three
  scales, the landform, the drift and the grain, and the bare ground alone passes the value-only test.
- **Everything is made on the 3D road** now: built things, overhangs, cliffs and sheer rock as real geometry; ground as
  one floor function that the mesh, the bake and the walk grid all read. The game never *looks* 3D: the 3D is the form
  under the paint. How: page 07; the code: `tools/landkit3d/README.md`.

## 6. The world's surface

- **The world is a body,** the dead god's, and it shows through: bone, hide, veins, eyes, teeth, blood, as each place's
  lore says.
  - The deeper you go, the more of it shows (Derek, 2026-10-07: "more of the god peeking through").
  - In the first area it is only a hint (Derek, 2026-10-08): a pale root warm to the touch, a vein in a stone.
- **Sap is dark blood** everywhere: red-black, glossy where fresh, crusted brown where old.
- **Lands grow from their ecology, not from texture** (`tools/art_study/LIVING_LANDSCAPES.md`, `ecosystems/`). Causes
  are placed first; the light and wet maps follow; the floor is read off them.
- **The ground stays alive** (Derek, 2026-10-08: "35% too barren"):
  - dense litter in many tones, twigs, moss, value variety at leaf scale;
  - never a calm, flat brown;
  - every ground generated from world position, never a repeated tile.
- **Weather happens in the world, not on it:**
  - rain wets by material, runs down trunks, rings on water, splashes on stone;
  - wind moves what it touches;
  - snow settles on tops.
- **No fog or mist layers** (removed twice; the bog's: "its ugly").
- **Objects matter in a fight:** every object has a cover height, a material and hit points. Shots stop in what is
  taller than their flight; fire takes dry wood, water douses, bone and stone shatter shots.
- **See-through is total:** anything standing between the camera and the pilgrim vanishes while it hides them.

## 7. The lands of Act I, as they stand

| Land | Look | State |
|---|---|---|
| **The Red Shore** (Act I's start; Derek, 2026-10-08) | It begins in **a cave under the black cliffs**: the pilgrim rises out of a pool of blood, climbs a stair of carved faces bleeding from their noses and mouths, finds the Stranger on the top step under a great face, and walks out through the onyx mirror in its mouth. Then **the cove**: black sand at the edge of the Red, a sea of blood on a dying heartbeat (a surge, a weaker surge, a long stillness; thick, no chop, a sagging roll), under a grey overcast, closed by basalt headlands, with a jam of giant bones where drift logs would lie and the dead the Red gives back. Inland by real ecology, like the Olympic coast, into old-growth rainforest, and the shore folk's dead village: round hide huts, a broken cedar palisade, a fire pit still burning the dead with nobody seen to feed it, a temple with a serpent stair, spirit houses on carved posts. Thai and Northwest Coast forms (human faces, the serpent and insects only), a true Dark Souls mood. Safe, its one soul a mad, mocking merchant | **The cove** is baked and in the game (B-). **The cave** is baked and in the game on trial (`--cave`), with the Stranger and the mirror. The temple won the method trial. The rest is planned. Area lore: `docs/wiki/mythology/areas/the-red-shore.md` |
| **The Sunken Bog** | The Long Back, a long-dead serpent god's spine, walked as a causeway through black mirror water, mostly overgrown, vertebrae breaking through. Lots of plant life; drowned trees and ruins; open marsh chambers (raw nature, ruins, a straw hut with a cold wisp-fire, the eye socket, the skull's crown, the worms' ground); board causeways to islands; the pit of offering. A maze like Diablo II's maggot lair | Baked and in the game (seed 9101), lit by the lantern through its normals, plants in the wind. Review page graded; the pit "exceptional" |
| **The Hollow Wood** | The god's veins stood up as pale trees, warm a hand's depth in, a slow beat in them; every tenth trunk has grown round something the god was carrying. Towering, crowns out of frame | A 50-piece set baked; a seeded zone (s9001). Open: the trees' white stripes; some trees mostly straight |
| **The Ashen Moor** | Wiped to a bare camp (Derek, 2026-10-08: "fucking trash"): a small clearing with the camp's people, the stash, the lantern and the waystone, and the roads out | A stand-in until the first area is built |
| Other Act I zones | Still the old browser-generated maps and tiles | To be rebuilt one by one with the bog's method; area lore in `docs/wiki/mythology/areas/` |

**Studies kept as references:**
- the Gate in the Flesh: the craggy floor, locked;
- the night chapel ruin;
- the Jaw;
- Cap Hollow, the Vigil, the old-growth judge;
- the dunes.

The art library holds what each taught.

## 8. Figures

- **True proportions:** 7.5 to 8 heads, grounded and heavy, worn and tattered. One bold saturated mass per figure,
  everything else muted and hue-shifted.
- **The callings** (each a calling, never a fixed character):

| Calling | Look | In the game |
|---|---|---|
| **The Ossuarch** | A tall pointed helm like the Adeptus Custodes, a ghostly pale green plume, black iron armour with bone set into it, counts in nines everywhere | in the game now; to be rebuilt from the ground up (Derek, 2026-10-09), his motion by `docs/animation/` |
| **The Hollow Mystic** | slate coat, iron, cold silver-blue mirrors and soul-wire | `mystic_hd` |
| **The Shrine Keeper** | white robe, madder hakama, miasma violet | `keeper_hd` |
| **The Empty Hand** | gaunt barefoot beggar-monk, ash robe, a dried-blood vermilion shawl | the HD monk |
| **The Red Penitent** | dark brown skin, iron, church cloth, fresh wet crimson; brutal, penitent, never a mummy | data only |

- **Creatures:**
  - **The standard:** the Tithe-Hand's level of detail is the minimum (a lore brief, many materials with their own
    ramps and outlines, real light, motion made for the body).
  - Each kind behaves differently, so players fear specific packs.
  - No animals: every creature is a piece of the god. The only exceptions are insects, the moor's crows and the
    bog's dead serpent.
- **NPCs** are people of the world. None of them ever explains controls or how to play.

## 9. Effects, interface, sound

- **Effects:**
  - restrained and purposeful, in the manner of Diablo II Resurrected;
  - no glow for its own sake, though glow is fine on magic, lanterns and wisps;
  - no swing arcs or comet trails;
  - nothing pasted over the screen;
  - every danger plainly seen.
- **The interface:** the carved slab and bronze rail, stone serpents holding the glass orbs, the Stranger's box or the
  Seer's Bowl on the title.
- **Music** (Derek, 2026-10-08): the old score is deleted. The new main music is **Middle-Eastern in the manner of
  Diablo II, dark, with a slight tone of traditional Muay Thai fight music**: the sarama's oboe (pi java), the glong
  khaek drums, the ching cymbals.
- **Sound** comes from the world: wind with the gust, rain by material, footsteps by ground, fire near flames.
- **Motion** (`docs/animation/`, from the Lasseter study): timing is weight, so frames are held for different lengths;
  every action has an anticipation, the action and a settle; the head leads (the helmed and the eyeless above all);
  nothing stops dead; plants bend from the base up, water's timing makes the liquid.

## 10. Lessons to keep

- **Composition:**
  - Silhouette first: three or four big shapes with negative space, then detail.
  - Pose for legibility.
  - Heads and hands by hand.
- **Under the game's light:**
  - Check under the game's own grade and lighting. Pale greys wash out; deep darks survive.
  - Stone on stone needs a full value step; dark on dark needs a lit crest.
- **Form and placement:**
  - Stones are tilted planes with chips and a bevel, never pillows. Never blur normals.
  - Holding glints back is what makes a material read (the pit's obsidian).
  - Everything placed by its cause reads as a place; scatter reads as a level.
- **Process:**
  - Build the landmark by the pit's method: one strong shape, story by cause in layers, a material made for the place,
    one hidden-source light, age and setting.
  - Show Derek early, take his notes, and rework the same day.
