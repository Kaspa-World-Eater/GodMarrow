#!/usr/bin/env python3
"""World art made with PixelForge: ground tiles, UI frames, props, sounds, portraits, variant skins.

Run from the project root: `python3 tools/make_world_art.py`. Where a Midjourney painting does not exist yet, this
script paints a stand-in in the game's own colours (noise and simple shapes) and feeds it through the same tools a
real painting would go through, so swapping in real art later is one path change. Everything stays in theme:
near-black, bone, iron, dull teal, amber only for lanterns and the Empty Hand's sand; blood dark and unlit; no red.
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
sys.path.insert(0, os.path.join(HERE, "pixelforge"))
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from pixelforge.vfx import periodic_noise
from pixelforge.tiles import make_tiles
from pixelforge.ui9 import make_ui9
from pixelforge.props import make_prop
from pixelforge.sfx import make_sfx
from pixelforge.portrait import make_portrait
from pixelforge.recolor import recolor_set

rng = np.random.default_rng(7)


def hexc(h):
    h = h.lstrip("#"); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def texture(c_dark, c_light, seed, n=192, cells=5, speck=None):
    """A painted ground: fBm between two colours, with optional flecks."""
    f = periodic_noise(n, n, cells, np.random.default_rng(seed))
    f = (f - f.min()) / (f.max() - f.min() + 1e-6)
    img = hexc(c_dark) * (1 - f[..., None]) + hexc(c_light) * f[..., None]
    if speck:
        s = periodic_noise(n, n, cells * 6, np.random.default_rng(seed + 1))
        m = (s > 0.72)[..., None]
        img = np.where(m, hexc(speck), img)
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB")


def frame_image(w, h, border, c_edge, c_mid, c_fill, rivets=None, seed=1):
    """A painted panel: a worn border with highlights and a dark fill, flat enough for a 9-slice."""
    im = Image.new("RGB", (w, h), tuple(int(x) for x in hexc(c_fill)))
    d = ImageDraw.Draw(im)
    for i in range(border):
        t = i / max(border - 1, 1)
        col = hexc(c_edge) * (1 - t) + hexc(c_mid) * t
        d.rectangle([i, i, w - 1 - i, h - 1 - i], outline=tuple(int(x) for x in col))
    d.rectangle([border - 2, border - 2, w - border + 1, h - border + 1], outline=tuple(int(x) for x in hexc(c_edge) * 0.5))
    if rivets:
        r = max(2, border // 4)
        for (x, y) in ((border // 2, border // 2), (w - border // 2, border // 2), (border // 2, h - border // 2), (w - border // 2, h - border // 2)):
            d.ellipse([x - r, y - r, x + r, y + r], fill=tuple(int(x) for x in hexc(rivets)))
    # grain
    g = (periodic_noise(w, h, 8, np.random.default_rng(seed)) - 0.5) * 18
    arr = np.clip(np.asarray(im).astype(np.float32) + g[..., None], 0, 255).astype(np.uint8)
    return Image.fromarray(arr, "RGB")


def prop_painting(kind, seed):
    """Stand-in paintings for props: tall canvas, white background, soft shading."""
    W, H = 160, 260
    im = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(im)
    bone, iron, dark, moss, teal = "#cbbfa3", "#4a4c52", "#1c1a18", "#3b4a30", "#2a5c5a"
    if kind == "gravestone":
        d.rounded_rectangle([45, 60, 115, 230], radius=30, fill=tuple(int(x) for x in hexc(iron)))
        d.rounded_rectangle([52, 68, 108, 222], radius=26, outline=tuple(int(x) for x in hexc("#6a6c72")), width=3)
        for y in range(100, 190, 18):
            d.line([62, y, 98, y], fill=tuple(int(x) for x in hexc("#2c2e33")), width=2)
        d.ellipse([30, 215, 130, 250], fill=tuple(int(x) for x in hexc(moss)))
    elif kind == "bone_pile":
        for i in range(14):
            x, y = rng.integers(20, 140), rng.integers(170, 240)
            a = rng.uniform(0, 3.14)
            L = rng.integers(20, 50)
            d.line([x, y, x + np.cos(a) * L, y - np.sin(a) * L * 0.5], fill=tuple(int(v) for v in hexc(bone)), width=6)
        for i in range(3):
            x, y = rng.integers(40, 120), rng.integers(180, 230)
            d.ellipse([x - 11, y - 10, x + 11, y + 8], fill=tuple(int(v) for v in hexc("#e2d8be")))
            d.ellipse([x - 7, y - 5, x - 2, y], fill=(30, 28, 26)); d.ellipse([x + 2, y - 5, x + 7, y], fill=(30, 28, 26))
    elif kind == "dead_tree":
        d.rectangle([72, 120, 88, 250], fill=tuple(int(x) for x in hexc(dark)))
        for (x0, y0, x1, y1) in ((80, 150, 30, 60), (80, 130, 125, 40), (80, 170, 135, 120), (80, 140, 45, 110), (30, 60, 10, 20), (125, 40, 150, 10)):
            d.line([x0, y0, x1, y1], fill=tuple(int(x) for x in hexc(dark)), width=7)
        d.ellipse([60, 240, 100, 256], fill=tuple(int(x) for x in hexc(moss)))
    elif kind == "banner":
        d.rectangle([76, 20, 84, 250], fill=tuple(int(x) for x in hexc(iron)))
        d.rectangle([20, 24, 140, 32], fill=tuple(int(x) for x in hexc(iron)))
        d.polygon([(28, 34), (132, 34), (132, 170), (80, 200), (28, 170)], fill=tuple(int(x) for x in hexc(teal)))
        d.polygon([(40, 46), (120, 46), (120, 160), (80, 184), (40, 160)], outline=tuple(int(x) for x in hexc(bone)), width=3)
        d.ellipse([66, 80, 94, 108], outline=tuple(int(x) for x in hexc(bone)), width=4)
    elif kind == "brazier":
        d.polygon([(40, 140), (120, 140), (105, 200), (55, 200)], fill=tuple(int(x) for x in hexc(iron)))
        d.rectangle([74, 200, 86, 240], fill=tuple(int(x) for x in hexc(iron)))
        d.rectangle([50, 238, 110, 252], fill=tuple(int(x) for x in hexc("#3a3c42")))
        d.ellipse([48, 128, 112, 150], fill=tuple(int(x) for x in hexc("#2e2f34")))
        d.polygon([(60, 136), (80, 60), (100, 136)], fill=tuple(int(x) for x in hexc("#d08a2a")))
        d.polygon([(70, 136), (80, 90), (90, 136)], fill=tuple(int(x) for x in hexc("#fff1b0")))
    elif kind == "lantern_post":
        d.rectangle([76, 60, 84, 250], fill=tuple(int(x) for x in hexc(iron)))
        d.line([80, 70, 112, 70], fill=tuple(int(x) for x in hexc(iron)), width=6)
        d.rectangle([100, 70, 124, 110], fill=tuple(int(x) for x in hexc("#2e2f34")))
        d.rectangle([104, 76, 120, 104], fill=tuple(int(x) for x in hexc("#f3c75c")))
        d.rectangle([60, 240, 100, 254], fill=tuple(int(x) for x in hexc("#3a3c42")))
    elif kind == "cairn":
        for (x, y, r) in ((80, 230, 34), (80, 200, 28), (82, 176, 22), (78, 158, 16), (80, 144, 11)):
            d.ellipse([x - r, y - r * 0.7, x + r, y + r * 0.7], fill=tuple(int(v) for v in hexc("#5a5c62")), outline=tuple(int(v) for v in hexc("#3a3c42")), width=2)
    # soft shading: a left-top light, blurred noise
    arr = np.asarray(im).astype(np.float32)
    mask = (arr.sum(-1) < 740)
    shade = np.linspace(1.08, 0.82, W)[None, :, None]
    arr = np.where(mask[..., None], np.clip(arr * shade, 0, 255), arr)
    return Image.fromarray(arr.astype(np.uint8), "RGB").filter(ImageFilter.GaussianBlur(0.6))


def main():
    out = {}
    # --- ground tiles: four materials, three transitions
    grass = texture("#1f2a1c", "#3f5a33", 1, speck="#566b3a")
    mud = texture("#1a1613", "#3a3028", 2)
    ash = texture("#232326", "#4c4c50", 3, speck="#6a6a6e")
    stone = texture("#2c2e33", "#595c64", 4, speck="#3a3c42")
    tiles_dir = os.path.join(ROOT, "art", "tiles")
    for name, a, b in (("moor_grass", grass, stone), ("fen_mud", mud, grass), ("ash_shore", ash, stone), ("stone_flags", stone, mud)):
        out[name] = make_tiles(a, name, tiles_dir, second=b, variants=6, seed=11)
        print("tiles", name, out[name]["tiles"])
    # --- UI frames
    ui_dir = os.path.join(ROOT, "art", "ui")
    for name, img in (("pf_bone_frame", frame_image(160, 120, 14, "#e2d8be", "#8f8470", "#14161a", rivets="#4a4336", seed=1)),
                      ("pf_iron_frame", frame_image(160, 120, 12, "#80838a", "#2e2f33", "#121214", rivets="#aeb2b9", seed=2)),
                      ("pf_vellum_panel", frame_image(160, 120, 10, "#b09a6a", "#6b5a3a", "#2a2318", seed=3)),
                      ("pf_teal_ward_frame", frame_image(160, 120, 8, "#4fd1c5", "#1d4a4c", "#0b1c20", seed=4))):
        out[name] = make_ui9(img, name, ui_dir, mid=10)
        print("ui9", name, out[name]["margins"])
    # --- props into the game's objects.json
    obj_dir = os.path.join(ROOT, "art", "objects")
    oj = os.path.join(obj_dir, "objects.json")
    for kind, sway in (("gravestone", None), ("bone_pile", None), ("dead_tree", "canopy"), ("banner", "banner"), ("brazier", "flame"), ("lantern_post", None), ("cairn", None)):
        img = prop_painting(kind, 1)
        out[kind] = make_prop(img, f"pf_{kind}", obj_dir, height=96, sway=sway, frames=8, fps=6, game_objects=oj, hr=2)
        print("prop", kind, out[kind]["variations"]["v1"]["size"])
    # --- sounds
    out["sfx"] = make_sfx("all", os.path.join(ROOT, "art", "sfx", "pf"), seed=1, variations=3)
    print("sfx", len(out["sfx"]["files"]))
    # --- portraits of the Hollow Mystic (the wraith test skin's front view) if the Forge project is around
    front = os.environ.get("PF_FRONT_VIEW")
    if front and os.path.exists(front):
        out["portrait"] = make_portrait(front, "mystic", os.path.join(ROOT, "art", "portraits"), sizes=(48, 96))
        print("portrait", out["portrait"]["files"])
    # --- variant skins from the base set
    sp = os.path.join(ROOT, "art", "sprites")
    if os.path.exists(os.path.join(sp, "wraith.json")):
        out["champion"] = recolor_set(sp, "wraith", "@champion", hue=-25, lightness=1.08, chroma=1.15)
        out["unique"] = recolor_set(sp, "wraith", "@unique", mapping={"#2a5c5a": "#8f8470"}, lightness=1.05)
        print("variants", out["champion"]["sheets"], out["unique"]["sheets"])
    with open(os.path.join(ROOT, "art", "world_art.json"), "w") as f:
        json.dump({k: {kk: vv for kk, vv in v.items() if kk in ("png", "json", "tres", "tiles", "margins", "dir", "sheets", "files")} for k, v in out.items()}, f, indent=1, default=str)
    print("done")


if __name__ == "__main__":
    main()
