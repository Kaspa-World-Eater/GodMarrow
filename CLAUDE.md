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
   asset forge (Midjourney concept → carved 3D → 8-direction pixel sprites in
   this game's own atlas format). `tools/pixelforge/.gdignore` keeps Godot out
   of it; run it with Python from `tools/pixelforge/`.

Never invent where a reference exists: the browser build decides look and
behaviour. Test with `tools/smoke.sh OUT` before calling a change done.
