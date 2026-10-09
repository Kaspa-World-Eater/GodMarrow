# Editor tools wanted in the overhauled Studio (cutout, skin and colour editors)

Backed by `pixelforge/skin_ops.py` (shipped on main; tests in `tests/test_tools.py`):

- **Selection with modifiers.** Magic wand (click: the connected patch of one colour, OKLab range slider), lasso
  (click round a part), rectangle. **Shift+click / Shift+drag adds** to the current selection, **Alt+click / Alt+drag
  subtracts**, a plain click starts over. Marching outline on the canvas; the selection can be named (a region op
  with `mode: add|subtract`, stored in `<image>.regions.json`) and every tool then works inside it: erase, restore,
  recolour, lightness, glow, smooth, paint. The same rules in the cutout editor's magic erase (Shift adds patches
  before one Erase).
- **Clone brush** (key C). Alt+click sets the source; painting copies pixels from the source offset along the stroke
  (`{"op": "clone", "from", "to", "radius", "path", "opacity", "soft"}`); the offset stays fixed for the stroke, as a
  clone stamp does; never copies from bare background. Show a small crosshair at the source while painting.
- Toolbar order: Select (wand, lasso, rect) · Brush · Erase · Restore · Clone · Recolour · Glow · Lightness · Smooth
  · Eyedropper · Zoom; size and softness sliders; Undo/Redo (Ctrl+Z / Ctrl+Y); before/after toggle; Save; "Save ops
  as JSON" for the AI path.
