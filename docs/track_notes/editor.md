# track/editor: the pixel editor in the Forge

The owner's brief: a real editor, Photoshop-class for pixel art, on the Frames tab and reachable for any picture, in
the approved look (ember gold, the dungeon framing, pixel-drawn controls, the selector arrow and its sounds), with
everything a person can do callable by an assistant.

## Where it lives

`tools/pixelforge/forge/scripts/editor/` holds plain classes with no window in them, so a headless script tests them:

- `palette.gd`: OKLab (the reference maths), the palette (the frame set's colours, slot = index), the lock: *locked*
  snaps to the nearest slot and says which; *open* adds the colour and counts it.
- `pixels.gd`: the raster algorithms on plain Images: Bresenham lines, brush tips (1, 2x2, plus, round), strokes,
  rectangles, ellipses, flood (contiguous or global, OKLab tolerance), lasso rasterising (even-odd on pixel centres),
  mask combine (replace / add / subtract / intersect), bounds, shift, edge, flip within the selection, lift / stamp /
  nudge, the clone stamp (never copies bare background; colours through the lock), diff, composite.
- `document.gd`: a frame set (`<root>/<clip>_<DIR>/frame_NNN.png`) or one picture; frames load on demand with a base
  layer (the file) and a paint layer (`.layers/`); the selection mask; the reference overlay; the frame order (a
  reordered strip saves by position); save flattens.
- `history.gd`: unlimited undo and redo; an entry keeps whole-layer copies before and after for every layer it
  touched (sprite frames are small), the selection before and after, and an `extra` for anchors, layer adds and
  removals, and the frame order; `goto(n)` for the clickable list.
- `carry.gd`: the last change on one frame laid on the clip's other frames and the same index of the other
  directions; by part id when `frame_NNN.parts.png` exists, else by position; one history entry; a review list.
- `anchors.gd`: effect anchors in `<root>/anchors.json`; follow by frame index, and by the part's centroid when part
  masks exist; `bake` writes the list beside the export and into its JSON (a stub: the game does not read it).
- `canvas.gd`: the picture-window view (zoom in whole steps about the pointer, pan, onion, reference, marching
  outline, brush footprint, anchors with handles, the library ghost).
- `toolrow.gd`, `icons.gd`: the tools as 12x12 pixel icons at 2x with their names; `picker.gd`: the colour picker;
  `browser.gd`: the in-app file browser every "Choose a file" uses.

`scripts/screens/editor.gd` is the screen: six tabs (Paint, Colour, Layers, History, Carry, Effects), the pointer
protocol with the canvas, the keys, and `exec_line` (the command line the driver, a JSON file and an assistant use;
GUIDE_AI lists it). It runs headless (`headless = true`, no app) for the tests.

Shell changes: `app.pic_layer` (a screen's own view over the picture window), `request_exit` (Home's *Exit* and the
top line's, one plain confirm line when the bench has unsaved work), `choose_file` / `choose_dir` through the
browser, `editor` in SCREENS. Widgets: `NumberEntry` (click a value, type; arrows step, shift tens) on every lever,
wheel, slider and cycler with `set`; the wheel nudges levers and sliders; `Choices.drag_start/move/end` (the library
is picked up and dropped on the canvas); `Timeline.on_reorder` (drag a thumbnail), `Timeline.max_cell`. Cycler labels
and dimmed choices use the bone-grey FRAME tone instead of DIM for contrast.

## Tests and shots

- `godot --headless --path tools/pixelforge/forge --script res://tools/test_editor.gd` (106 checks: OKLab, the lock,
  points, fill and wand, masks, the history round trip, clone offset, carry by frame index, anchors, exec).
- `tools/check_scripts.gd` (32 scripts), `tools/screens.sh` (editor_paint ... editor_effects on the Keeper's idle
  frames, three directions rendered first).
- A walkthrough: `--script` with `go editor frames=... clip=idle direction=S`, `edit ...` lines, `shot`.

## Short, and what is stubbed

- Part ids: the engine does not write `frame_NNN.parts.png` yet, so carry and anchors match by position; the reader
  is in place (`document.parts_of`, `Doc.part_at`) and switches on when the render writes them.
- Baking anchors writes the list (`<name>.anchors.json`, `effects` in the export JSON); nothing draws them in the game.
- Layers blend "normal" only, with opacity; no blend modes.
- The lever labels are the app's SMALL size (12 px in the 640x360 canvas, 24 px on screen): about 10% smaller than the
  mockup's 18 px on its 860 px frame; the body text (16 px, 32 on screen) matches the mockup's 22 px on 860.
- The whole 138 px Keeper fits the 140 px picture window at 1x (2 screen px per sprite pixel); 2x and up need panning,
  which the wheel and middle-drag give.
