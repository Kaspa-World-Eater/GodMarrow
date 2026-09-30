# Brief for the 3D-to-pixel tool (for the Fable session)

*Written 2026-09-30 by the Godmarrow session, so the new tool plugs straight into the game. The user is building the tool in a separate session.*

## What the game needs from it
- **Input:** the user's painted concepts (Midjourney PNGs; e.g. `Desktop\Ossuarch`, 14 concepts of the Ossuarch; the chosen one is `_2` of set 009202c4). The painting's look is the target: **its colours, brushwork and silhouette must survive.** The user rejected a "3D look" before, and rejected reduced palettes ("why did you reduce the colors?").
- **Camera (from the D2R-3D video):** Diablo II's fixed view has **no perspective**, looks down at **30°** (not true isometric 35.26°), and so a tile is exactly **2:1**. In the game one yard (tile) = **108 x 54 px**.
- **Output: sprite sheets the Godot build already reads** (`art/sprites/<kind>.png` + `<kind>.json`, loaded by `core/sprite_set.gd`):
  - `idx`: `"<anim>/<view>/<i>": [sheet_index, x, y, w, h, dx, dy]`, where (dx, dy) is the offset from the **foot anchor** (the entity's ground point) to the frame's top-left.
  - **Views:** `down`, `front`, `side`, `back`, `up` (five). Frames face **screen-right**; the game mirrors for the left three octants. Octants: R side, DR front, D down, DL front mirrored, L side mirrored, UL back mirrored, U up, UR back.
  - **Heroes' anims (frames):** idle 8, walk 8, atk 8, atk2 8, cast 8, hit 6, death 8, dodge 8. `meta.anims` lists frames and views per anim; `meta.fps` optional.
  - **Scale:** 3 atlas px per world px, nearest-neighbour; the Ossuarch stands about 195 px tall at game size. Hard pixel edges, a dark 1-px outline, no anti-aliased fringe, **no shadow in the frames** (the game draws it).
  - A reference sheet: `art/sprites/animancer.json` (the Hollow Mystic, 304 frames).
- **For real light later (optional):** the same frames as a normal map and a height/depth map in matching sheets. With those, the lantern can be a real light in Godot: lit sides, rims, and shadows that fall correctly. That fixes today's flat, painted-on shadows and the "overlay" dark.

## What we already learned (so the tool doesn't repeat it)
- **Marrowpress** (`tools/marrowpress/`, this session): bend the full-resolution painting on a 2D bone rig with two-bone IK, then press each frame to pixels with one palette shared by every frame. It works for the front view (Ossuarch idle and walk in the game now), but **it cannot make side or back views** from one painting. That is the hole a 3D body fills.
- Rotating finished pixel art makes jaggies. Always deform or render at full resolution, and press to pixels last.
- Cut the figure along its outline. Masking dark pixels punched holes in dark armour.
- Keep every colour of the concept; if the palette must be shared across frames, build it from all frames at full depth.
- Animation references: `claude/godmarrow-motion-study.md` (pelvis rides over the planted foot, arms against legs, cloth late).

## The user's standing rules the art must keep
- No glows or trails on attacks and casts. Lanterns and wisps may glow. No red light. Every danger plainly seen.
- No animals or animal imagery anywhere.
- Things belong *in* the world, never pasted over the screen.
- Dark Souls-grim, never gold for the Ossuarch (bone and iron).

## Contact point
The Godmarrow session will take the tool's sheets and wire them in (`--skin=<kind>` shows any sheet on any hero for a look test).
