# Godmarrow — read first

Godmarrow is Derek's grimdark isometric ARPG (Godot 4.7 at the repo root; the
browser build in `web/` is the reference). Before touching anything:

1. `docs/HANDOFF.md` — what this is, where everything lives, how Derek works,
   the rules of the game (law), and the current plan. The newest section at the
   bottom is from the PixelForge session (tools + port parity work).
2. `PORTING.md` — architecture of the Godot build and the hard rules.
3. `docs/wiki/` — the design wiki (start at `00-start-here.md`, then
   `01-rules-and-decisions.md`).
4. `tools/pixelforge/NOTES.md` and `tools/pixelforge/docs/GUIDE_AI.md` — the
   asset forge. **Characters are shape sprites** (`.shapes.json` files of
   solids on the standard skeleton, rendered as pixel art and moved by the
   motion clips from 8 directions): `pixelforge shapes ...` and the Forge
   app's Characters bench are the character road, at the game's hero height
   (the `godmarrow` preset, 195 px). `pixelforge hero` and the cutout → Blender
   → Mixamo chain are the **old** road (it made the Hemomancer blob); a painting
   is the reference a shape file is measured from (`shapes measure`, `shapes
   compare`), not the source. `tools/pixelforge/.gdignore` keeps Godot out of
   it; run it with Python from `tools/pixelforge/`.

**The painted standard** (`docs/PAINTED_STANDARD.md`, Derek 2026-10-06): everything
from now on is painted like the lake test (broad tones, pooled wet edges, dry-brush
strokes, a paper tooth fixed to the world). Read it before making any art or effect.

Never invent where a reference exists: the browser build decides look and
behaviour. Test with `tools/smoke.sh OUT` before calling a change done.
