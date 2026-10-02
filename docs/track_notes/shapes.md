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

## Numbers the app can rely on

At 120 px (gothic_hd): the Keeper voxelises in 0.15 s (30k shell voxels) and renders a frame in about 25 ms; a clip
of 24 frames in a direction in 0.6 s; the seven game clips in eight directions in about 16 s. At 76 px
(rendered_arpg): 9k voxels, about 5 s for the set. The flat necromancer renders in 15 ms a frame. Idle frames differ
by 3-5% of their pixels (the breath, the pulsing eyes, the motes); a walk by 7-11%; the lowest opaque row is the
same in every frame of the standing clips.
