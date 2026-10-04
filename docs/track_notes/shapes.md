# Shape sprites: what the Forge app shows (for the app track)

The engine is built (`tools/pixelforge/pixelforge/shapes.py`, `shape_rig.py`, `shape_tools.py`, `joints.py`; the
format and the commands in `tools/pixelforge/docs/GUIDE_AI.md`, "Shape sprites"). This note says what the Forge app's
pages should show for it. Nothing here touches gui.py or the studio package; the app track owns those.

## The character quest

A character starts as a sentence or a painting, and ends as a shape file playing in the game. The quest's steps:

1. **Describe** (one sentence) or **drop a painting** (the reference). `describe.draft_shapes(text)` returns a starter
   file: a humanoid on the author pose with the costume words as parts and materials (hat, hood, veil, cape, skirt,
   armour, pauldrons, belt, gourds, cords, staff, sword, shield) and `read` (what it understood, as short lines). Show
   the lines and the first render (`shapes.render_still`) side by side with the painting, if any.
2. **Shape it.** The live render of the file (S view, 3x) with a list of the shapes grouped by part (head, torso,
   arms, legs, hat, veil, skirt, ...). Selecting a shape highlights its pixels (render the model with only that shape
   lit: `Model.render` with every other shape's tone forced down is enough) and shows its knobs: kind, position,
   radii / points, material, tone, bone, lag frames and sway, hem depth and tongues, open angle. Dragging a shape moves
   its centre; the file is the state, every edit is a JSON patch (so an AI can make the same edit headlessly).
3. **Materials.** The ramp editor: a row per material the file uses, each step a swatch, "longer ramp" / "shorter
   ramp" (the renderer takes any length), texture (weave / fur / scratch / grain) and strength, spec for metal, lift.
   Changing a ramp re-renders in under 50 ms at 120 px.
4. **Motion.** The clip picker (idle, walk, run, attack, cast, hit, death and the rest of the library) and the
   direction wheel (8); `shape_rig.render_clip` makes the frames; play them in the frame strip with onion skin. Knobs
   that change the motion: per part lag frames and sway, the ground lock, the camera elevation.
5. **Look.** The preset picker (figure height, bands, outline): `shape_tools.options_for` gives the numbers; the same
   file renders at 120 and at 76.
6. **Keep.** `api.render_shapes` + `api.export_game`: the atlas with foot anchors goes into the game; "Preview in game"
   launches it with `--skin`. Export also writes the GIFs and the contact sheet for the compare screen.

## The frame editor (Aseprite-like, in-window)

The frames are rendered, not drawn, so the editor edits the *file* and the *clip*, and paints on top only as the
last resort:

- The timeline: frames as thumbnails per clip and direction, play / pause / step, fps (the preset's clip cap decides
  the count; the clip keeps its duration), onion skin.
- **Redo this frame from the file**: any paint-over is kept as a per-frame overlay layer (`frames/<clip>_<DIR>/
  over_NNN.png`), applied after the render, so a re-render keeps hand fixes where the figure has not moved.
- Knobs on the right rack: ramps (see above), the lights (position, radius, strength, pulse, colour; a light can ride a
  bone), the hem depth and tongues of every ring, the breath (flat files), the lag of every loose part, the shadow.
  Each knob is a path into the file; the preview re-renders the current frame only.
- "Mirror a direction", "copy / paste / insert / delete a frame", "hold a frame", "ease" act on the exported frame
  list (a re-time table in `animations.json`: `{"walk": {"hold": {3: 2}, "ease": "in"}}`), never on the file.
- The compare screen: the painting (if any), the shape sprite at the preset size, and the game shot, at one height.

## Describe-it

`draft_shapes` is a vocabulary, not a model: colour words become library ramps (`violet`, `crimson`, `straw`,
`lacquer`, `iron`, `steel`, `rope`, `bone`, `wrap`, `rag`, ...), garment words become rings (`skirt`, `robe`, `cape`,
`cloak`, `veil`, `shawl`), armour words become plates (`armour`, `plate`, `pauldrons`), held things become capsules
and boxes (`staff`, `sword`, `shield`), `glowing <colour> eyes` becomes emissive eye voxels and a light. The app
should show the `read` lines ("a wide hat (straw)", "glowing eyes (miasma)") so the person sees what landed, and
offer "adjust in Shape it" rather than more sentences. An AI connected to the MCP tools (`draft_shapes`,
`validate_shapes`, `preview_shape_sprite`, `render_shape_sprite`) writes the file directly for anything the
vocabulary does not cover; the guide's worked example (the necromancer, flat and solid) is what it reads first.

## Knobs added in the review round (2026-10-02)

- Per part (and per shape): `hang` 0..1 (1 rigid; 0.25 a skirt, 0.35 a veil or cape, 0.5 gourds): the slider the
  motion page should show next to the lag frames and sway. `lag.max` (0.1 of the part's height) caps the trailing.
- `hash` rules take a speck size (`[p, seed, cell]`); the materials page can show it as "speck size".
- Objects: `shape_tools.export_object(doc, out_dir, name, directions, game_objects, hr)` writes the trimmed PNGs with
  foot anchors and the `objects.json` entries; an object quest is: draft or write the file, `still` from S, SE and E,
  export. The game's camera for objects is 30 degrees (`view.elevation`).
- The ground lock works on the screen (the lowest foot pixel on one row); the canvas widens per clip for a death that
  lies down, so the frame editor should expect frames of one square side per set, not the file's size.
- The step-by-step procedure for a session (and for the app's help page) is `docs/GUIDE_SESSION.md`.

## Knobs added in the second review round (2026-10-02)

- The holds, `view.turn_step` (degrees, 5) and `view.move_step` (pixels, 1.5): a body's drawn turn and place hold until
  the clip has moved them that far, then step. Two sliders on the motion page, with a "continuous" position (0) for
  comparison; the frame strip should make the difference obvious (a held pose is pixel for pixel the frame before).
- A lagged part is a swing about its top, held like a turn; the shapes of a part are one body. The motion page can
  show the swing angle per part per frame as a small graph under the strip.
- `px` ranges on shapes and rules are the size variants: the shape list should show, per preset, which shapes and
  rules are live (grey out the rest), and offer "copy as the small-size twin" on a shape.
- The ground lock is contact-aware: a foot within 6 units (at 120) of the clip's floor is planted; the frame strip can
  mark airborne frames (`Poser.contact(t)` is false).
- `game-preview` runs under a virtual display by itself where there is none; the app's "Preview in game" button can
  report `virtual_display` in its log line.
- `Frame.pid` (the shape index per pixel) is what the shape list's "highlight this shape's pixels" should use.

## Numbers the app can rely on

At 120 px (gothic_hd): the Keeper (58 shapes, 52 live at 120 px) voxelises in about 0.15 s (one surface per rigid
body) and renders a frame in about 30 ms; a clip of 24 frames in a direction in about 0.8 s; the seven game clips in
eight directions in about a minute (the death clip renders on a canvas twice as wide). At 76 px (rendered_arpg):
about 30 s for the set. The flat necromancer renders in 15 ms a frame. At the game's own 24 frames consecutive idle
frames differ in 3% (S) to 10% (W) of the figure's pixels, 0.2-0.4% change and change straight back, and the hat rows
are pixel for pixel the frame before; a walk frame differs in 32-37% (the legs, the arms, a 1 px bob) with 1-3% of
the hat rows left over after a whole-pixel shift; a static model moved by a fraction of a pixel renders identically.
Every frame of idle, walk, run, attack, cast, hit and death is one piece in all eight directions; the lowest foot
pixel is on one row in every walk and idle frame in every direction, and the run's airborne frames lift.

## The character-road fixes (2026-10-04, track/pf-fixes: what the Hemomancer's first build taught)

The Hemomancer's shape README (`docs/concepts/hemomancer/shapes/README.md`, "Why the first build was a blob") listed
what let a character go down the old cutout road and come out a blob; these landed in PixelForge, and the app's
pages should show them:

- **The road is signposted.** Both CLAUDE.md files, GUIDE_AI and GUIDE_HUMANS say characters are shape sprites;
  `pixelforge hero` prints a note that it is the old cutout road (`--cutout` silences it). The Characters bench is the
  character road; nothing on it should offer cutouts.
- **The game's size by default.** A character (a solid file whose shapes ride bones) renders at the `godmarrow`
  preset (195 px) whenever no `--style` or `--scale` is named; objects keep their own size. `project new` and the
  Forge app default to `godmarrow`. `export-game` returns `warnings` (and writes it into the character's notes) when
  the frames' figure height is not the game's for the category (hero 195, within 10%): the Export tab should show it
  in gold before *Put it in the game*.
- **Painting to shapes** (`pixelforge/shape_measure.py`): `shapes measure FRONT [SIDE] [BACK] -o M.json` (silhouette
  widths per 2% band and the landmarks: head, shoulders, chest, waist, hips, hem, limb widths, as fractions of the
  height), `shapes draft "..." --from-measure M.json` (the template's rings and limbs sized from them), `shapes
  sample-materials FRONT --model X.shapes.json` (the painting's colours under each material's region become its ramp,
  OKLab k-means), `shapes compare X.shapes.json --ref SHEET -o cmp.png` (painting beside sprite per view at one
  height, with the silhouette overlap). The Reference tab is this: drop the sheet, measure, draft, sample, and the
  compare picture with the overlap numbers as the checks line. MCP: `measure_views`, `sample_materials`,
  `compare_shapes`, `draft_shapes(measure=)`.
- **Format traps.** `keep: {"back_strip": w}` replaces the backwards `keep.back` (still read, with a deprecation
  warning naming the `back_strip` to write). `shapes.warnings(doc)` (in `validate_file` as `warnings`, printed by
  `shapes validate` and to stderr by every shapes command): a full ring below the knee that covers the legs, a hanging
  part on a limb bone without `upright_from`, a prism centre in 3D or an ellipsoid / box centre in 2D (both now
  render; the validator says what was assumed). The Model tab should list them under the model name.
- **The parts kit** (`pixelforge/shape_parts.py`): chains, chain loops, rivet rows, spike rings and rows, a plank
  skirt split per leg (with its parts), greaves with knee cops and spikes, thigh plates, shackles with a broken chain,
  locs, a back cape; `shapes draft` builds them from the nouns (crown, locs, chains, shackles, planks, greaves,
  rivets, cape). The Hemomancer generator is the worked example and the test regenerates the committed file from it.
- **The game install.** `export-game` into `art/sprites` writes the `skins.json` entry (`--skin-for CLASS` for a set
  that stands in for another class), and the hero loader (`entities/hero.gd`, `Data.is_pixelforge_set`) prefers a
  PixelForge set over `<kind>_unclipped`, so a new build is used as soon as it lands.
- **A per-model clip map.** `"clips": {"attack": "punch"}` in the file plays another library clip as a game clip
  (the Hemomancer's attack is the planted thrust); the Motion tab's clip picker should show the mapping and offer the
  library's clips for each game clip.
