---
name: godmarrow-2x2-grid
description: Use whenever Godmarrow code, shaders, bakes or painters draw pixels (effects, overlays, light maps, dither, decals, halos, textures, baked lands, sprite scales), when tools/check_2x2.py or the smoke test's first line reports a hit, or when deciding whether a 4 is a size or a unit. The law - every art pixel is a 2 x 2 block of screen px, never a 4 px cell - and how to keep it.
---

# The 2 x 2 art grid

**The law** (MASTER_RULES section 3 rule 7; painted standard 7): every art pixel in the game is a 2 x 2 block of
screen pixels. Derek, 2026-10-09: "2x2" (it was the 4 px grid). Derek, 2026-10-10, angry, on seeing candle halos and
the dark layer's rings in 4 px steps: "we need to eliminate the 4x4 shit from ever happening again and wasting our
time".

**Why it keeps coming back:** the retired browser build drew in 4 px cells. Its unit, `Iso.WPX = 4`, is a *unit of
length* (a web world px is 4 Godot units: positions, radii, heights, offsets), and ports copied it as a *cell size*.

## The rules for new and changed code

- The drawing cell is **2.0**. `Iso.WPX` converts web lengths only; never use it as the size of a drawn pixel, a
  snapping step, a `draw_rect` size, or a texture's per-texel scale.
- Shaders snap to whole art pixels on the 2 grid:
  ```glsl
  vec2 px = floor(UV * rect_size / 2.0) * 2.0;                                   // whole art pixels
  suv = (floor(suv / SCREEN_PIXEL_SIZE / 2.0) * 2.0 + 1.0) * SCREEN_PIXEL_SIZE;  // a screen read on the grid
  vec2 w = floor(W / 2.0) * 2.0 + 1.0;                                           // a world point's art pixel
  ```
- A dithered or painted texture that would have been drawn at 4 per texel is generated at twice the texels and drawn
  at 2.
- A 4 x 4 **Bayer matrix** (`B4[16]`, `% 4`, `& 3`) is a pattern, not a size, and is fine; its cells are still 2 px.
- Bakes render at `RES = 2` texels an engine px and write `"scale": 2` in their `index.json` (`SCALE = 4 // RES`), so
  the game draws each texel 2 x 2 (`tools/landkit3d/cove_bake.py`, `cave_bake.py`).
- Every pixel-sized constant in a painter (blur radii, edge depths, run lengths) scales with the render's zoom
  (`d["zoom"]`), or carries a comment saying why not (painted standard 15). Unscaled, the cave's pool went flat red
  at zoom 2. `paint3d.py` reads no zoom at all.
- A still from `blend_scene.py` defaults to zoom 1 and the painters enlarge each texel 4 x 4; that matches the game's
  size only at zoom 1. Judge the grid in the game, not in a still.

## The guard: `tools/check_2x2.py`

```bash
tools/pixelforge/.venv/Scripts/python tools/check_2x2.py ; echo "exit $?"
```

- Scans `shaders/*.gdshader` and the `.gd` files under `world/`, `fx/`, `entities/`, `ui/`, `skills/` (never `web/`,
  `.godot/`, Cursemark paths or `cm_*` files). Comments are ignored; code is matched.
- It matches a 4 used as a drawn cell: `floor(x / 4.0) * 4.0`, `rect_size / 4.0`, `floor(px / 4.0)`, a constant named
  like a cell or a pixel set to 4 (`CELL := 4.0`, `PX := 4`, `W := 4.0`), `Vector2(4, 4)` / `vec2(4.0)`,
  `Rect2(x, y, 4, 4)`, `(WPX, WPX)`, `WPX` inside `draw_rect`, `get_size() * WPX`, `scale = Vector2.ONE * WPX`.
- It runs first in `tools/smoke.sh`; the report's first line is its verdict. `2x2 check: ok` passes; a hit fails the
  smoke test with `file:line: <pattern>: <the line>`.
- **Exit 0** is ok, **exit 1** means hits.

### The two markers (a comment on the same line)

| Marker | Means | Effect |
|---|---|---|
| `# 2x2-ok: <reason>` (GDScript), `// 2x2-ok: <reason>` (shaders) | a genuine non-cell use: a unit, Cursemark's own art at its own pixel, a painting's coordinate unit | the line is skipped |
| `# 2x2-debt: <reason>`, `// 2x2-debt: <reason>` | a known 4 px use waiting on other work (art baked at 4 px a texel, due a rebake) | listed as `debt:` on every run, never hidden, does not fail |

A reason is required after the colon. Never add `2x2-ok` to silence a real cell: fix the cell. Use `2x2-debt` only
for art that is truly still at 4 px, and name what will retire it.

The open debts (2026-10-11), each due its own fix:
- `shaders/baked_ground.gdshader` (two lines): the Sunken Bog's old bake is at 4 px a texel; its water moves on its
  own texels until the bog is rebuilt on the 3D road.
- `world/landkit.gd` (four lines): the landkit sets are baked at 4 px per texel, due a rebake at 2
  (`tools/landkit/bake.py`).

## When the check is clean but it still looks chunky

The check reads code, not pictures. Capture the place (`godmarrow-capture`), crop the area, enlarge it with nearest
neighbour (`grid.py ... --scale 4 --nearest`) and look at the steps of halos, rings, dither and edges. If a step is
two art pixels wide, find the drawing code (often a texture made at half the texels, or a sprite scaled by
`Iso.WPX`) and move it to the grid. Then add the pattern to `check_2x2.py` if it slipped past, so it can never come
back unseen.
