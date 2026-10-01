"""Animated examples of the look presets: the same painting turned with every look.

``make_demo(out)`` writes, for every look preset, ``<name>.gif`` (the Keeper's front cutout pixelated in that look and
animated with the still path, idle breathing plus cloak sway, with one effect loop beside her in that look's effect
style), a contact sheet ``styles_sheet.png`` with one frame per preset side by side and the preset's numbers printed
under it, and ``styles.json`` (the table). The Studio's Style page plays these GIFs on its cards; ``pixelforge styles
--demo OUT`` and the MCP tool ``style_demo`` make them.
"""

from __future__ import annotations

import copy
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from .animate import PRESETS, animate
from .pixelate import pixelate
from .spritesheet import save_gif
from .styles import LOOKS, STYLES, conversion_summary, get_style, options_for_style
from .vfx import DEFAULT_SIZE, render_frames

SOURCE = Path(__file__).resolve().parent.parent / "assets" / "styles" / "keeper_front.png"
BACKGROUND = (12, 14, 16, 255)        # the game's near-black
BONE = (201, 191, 166, 255)
TEAL = (63, 156, 146, 255)
DIM = (110, 112, 118, 255)
MIN_HEIGHT = 96                       # a GIF is zoomed until the figure stands at least this tall
GAP = 6
REFERENCE_FIGURE = 76.0               # the effect kinds' default sizes suit a figure about this tall


def _font(size: int):
    for name in ("DejaVuSans.ttf", "LiberationSans-Regular.ttf", "Arial.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def effect_size(kind: str, figure_height: int) -> tuple[int, int]:
    """The effect's default size scaled to the figure, never smaller than 12 x 12."""
    w, h = DEFAULT_SIZE.get(kind, (24, 36))
    k = figure_height / REFERENCE_FIGURE
    return max(12, int(round(w * k))), max(12, int(round(h * k)))


def demo_frames(style, source: Image.Image, effect: str = "wisp", seed: int = 1) -> dict:
    """The frames of one preset's example: the figure (idle + cloak sway) with the effect loop beside it."""
    st = get_style(style)
    r = pixelate(source, options_for_style(st, crop=True))
    sprite = np.asarray(r.image)
    sh, sw = sprite.shape[:2]
    effects = copy.deepcopy(PRESETS["idle"]) + copy.deepcopy(PRESETS["cloak"])
    figure = animate(sprite, effects, st.anim_frames, palette=r.palette)
    fx, info = render_frames(effect, size=effect_size(effect, sh), frames=st.anim_frames, bands=st.fx_bands, seed=seed,
                             glow=st.glow_arg, haze=st.fx_haze, palette="wisp" if effect == "wisp" else None)
    fh, fw = fx[0].shape[:2]
    gh, gw = figure[0].shape[:2]
    H = max(gh, fh) + 2
    W = gw + GAP + fw + 2
    fx_y = max(0, int(round(H - 2 - gh * 0.62 - fh / 2)))     # beside the hands, where a wisp or a flame would be held
    fx_y = min(fx_y, H - fh)
    out = []
    for g, f in zip(figure, fx):
        canvas = np.zeros((H, W, 4), dtype=np.uint8)
        canvas[H - gh : H, 1 : 1 + gw] = g
        patch = canvas[fx_y : fx_y + fh, 1 + gw + GAP : 1 + gw + GAP + fw]
        a = f[..., 3:4].astype(np.float32) / 255.0
        patch[..., :3] = (f[..., :3] * a + patch[..., :3] * (1 - a)).astype(np.uint8)
        patch[..., 3] = np.maximum(patch[..., 3], f[..., 3])
        out.append(canvas)
    zoom = 1 if sh >= MIN_HEIGHT else int(math.ceil(MIN_HEIGHT / sh))
    return {"style": st, "frames": out, "fps": st.anim_fps, "zoom": zoom, "sprite": r.image, "colors": len(r.palette),
            "figure_size": [sw, sh], "effect": {"kind": effect, "size": list(info["size"]), "bands": info["bands"],
                                                "glow": info["glow"], "haze": info["haze"]}}


def contact_sheet(examples: list[dict], path: str | Path) -> Path:
    """One frame per preset side by side, each over its title and numbers."""
    font, small = _font(13), _font(11)
    cells = []
    for ex in examples:
        st = ex["style"]
        fr = ex["frames"][0]
        im = Image.fromarray(fr, "RGBA")
        im = im.resize((im.width * ex["zoom"], im.height * ex["zoom"]), Image.NEAREST)
        lines = [
            (st.title, font, TEAL),
            (f"{st.figure_height} px tall, {'every colour' if st.colors <= 0 else f'{st.colors} colours'}"
             + (f", shown x{ex['zoom']}" if ex["zoom"] > 1 else ""), small, BONE),
            (f"outline {st.outline}, {'painted shading' if st.shading_bands <= 0 else f'{st.shading_bands} bands'}", small, BONE),
            (f"sat x{st.saturation:g}, contrast x{st.contrast:g}, edge {st.edge}" + (f", clean x{st.clean}" if st.clean else ""), small, BONE),
            (conversion_summary(st), small, BONE),
            (f"{st.anim_frames} f @ {st.anim_fps:g} fps, clips to {st.clip_frames}", small, BONE),
            (f"fx {st.fx_bands} bands, glow {st.fx_glow}, haze {'on' if st.fx_haze else 'off'}", small, BONE),
            (f"tile {st.tile_width}x{st.tile_height} @ {st.tile_hr}, step {st.pixel_step}", small, DIM),
        ]
        cells.append((im, lines))
    draw0 = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    widths = [max(im.width, max(int(draw0.textlength(t, font=f)) for t, f, _ in lines)) + 16 for im, lines in cells]
    top = max(im.height for im, _ in cells)
    line_h = 15
    text_h = line_h * len(cells[0][1]) + 10
    W = sum(widths) + 8 * (len(cells) + 1)
    H = top + text_h + 24
    sheet = Image.new("RGBA", (W, H), BACKGROUND)
    draw = ImageDraw.Draw(sheet)
    x = 8
    for (im, lines), cw in zip(cells, widths):
        sheet.alpha_composite(im, (x + (cw - im.width) // 2, 12 + top - im.height))
        y = 12 + top + 8
        for text, f, colour in lines:
            draw.text((x + 8, y), text, font=f, fill=colour)
            y += line_h
        x += cw + 8
    path = Path(path)
    sheet.convert("RGB").save(path, optimize=True)
    return path


def make_demo(out_dir: str | Path, *, source: str | Path | None = None, only: list[str] | None = None, effect: str = "wisp",
              sheet: bool = True, log=None) -> dict:
    """Write a GIF per look preset, the contact sheet and ``styles.json`` into ``out_dir``."""
    say = log or (lambda m: None)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    src_path = Path(source) if source else SOURCE
    if not src_path.exists():
        raise FileNotFoundError(f"no source image at {src_path}")
    src = Image.open(src_path).convert("RGBA")
    names = [n.strip() for n in only] if only else list(LOOKS)
    for n in names:
        get_style(n)
    gifs, examples, table = {}, [], {}
    for n in names:
        ex = demo_frames(n, src, effect=effect)
        gif = out / f"{n}.gif"
        save_gif(ex["frames"], gif, fps=ex["fps"], zoom=ex["zoom"], background=BACKGROUND)
        gifs[n] = str(gif)
        examples.append(ex)
        table[n] = {**STYLES[n].as_dict(), "gif": gif.name, "figure_size": ex["figure_size"], "colors_used": ex["colors"],
                    "zoom": ex["zoom"], "effect": ex["effect"]}
        say(f"{n}: {ex['figure_size'][0]}x{ex['figure_size'][1]} px, {ex['colors']} colours, {len(ex['frames'])} frames @ {ex['fps']:g} fps -> {gif.name}")
    result = {"ok": True, "out": str(out), "gifs": gifs, "source": str(src_path), "effect": effect}
    if sheet and examples:
        result["sheet"] = str(contact_sheet(examples, out / "styles_sheet.png"))
    (out / "styles.json").write_text(json.dumps(table, indent=2) + "\n")
    result["table"] = str(out / "styles.json")
    return result
