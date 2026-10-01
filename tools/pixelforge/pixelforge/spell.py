"""Spell designer: build a complex effect from layers of the Forge's effect generators.

A spell is a JSON file: a canvas size, a length in frames, fps, and layers. Each layer is one effect kind with its
own colours, size, position, rotation, start frame, speed, opacity and blend (normal or add), so a fireball is a
burst layer over a fire layer with an ember layer trailing behind, a ward is a ring under a rune under a wisp, and
so on. The composer renders the layers to one strip and the same files `pixelforge vfx` writes (<name>.png,
<name>.json; optional atlas set), so the Godot add-on plays a spell like any effect.

    pixelforge spell new fireball -o art/fx --preset fireball       # a starting point to edit
    pixelforge spell render art/fx/fireball.spell.json [--gif]      # the strip + json (+ GIF)
    spell_designer.open_spell_designer(master, path)                # the window: layers, knobs, live preview
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

from . import vfx

LAYER_DEFAULTS = {"kind": "fire", "palette": "lantern", "scale": 1.0, "x": 0, "y": 0, "rotation": 0.0, "start": 0, "speed": 1.0,
                  "opacity": 1.0, "blend": "normal", "glow": None, "seed": 1, "flip": False, "loop": True, "name": ""}

PRESETS = {
    "fireball": {"size": [96, 64], "frames": 12, "fps": 12, "loop": True, "anchor": [48, 32],
                 "layers": [{"name": "trail", "kind": "embers", "palette": "lantern", "scale": 0.8, "x": -24, "y": 0, "opacity": 0.8},
                            {"name": "core", "kind": "fire", "palette": "lantern", "scale": 1.0, "x": 8, "y": 10, "rotation": -90},
                            {"name": "flash", "kind": "burst", "palette": "amber", "scale": 0.7, "x": 16, "y": 0, "blend": "add", "opacity": 0.6}]},
    "ward": {"size": [96, 72], "frames": 16, "fps": 10, "loop": True, "anchor": [48, 60],
             "layers": [{"name": "ring", "kind": "ring", "palette": "wisp", "scale": 1.4, "y": 24},
                        {"name": "rune", "kind": "rune", "palette": "wisp", "scale": 0.9, "y": 22, "blend": "add", "opacity": 0.8},
                        {"name": "wisp", "kind": "wisp", "palette": "wisp", "scale": 0.8, "y": -8, "speed": 0.5}]},
    "soul_drain": {"size": [80, 96], "frames": 16, "fps": 12, "loop": True, "anchor": [40, 90],
                   "layers": [{"name": "pool", "kind": "pool", "palette": "miasma", "scale": 1.2, "y": 40},
                              {"name": "rise", "kind": "smoke", "palette": "miasma", "scale": 1.0, "y": 0, "opacity": 0.9},
                              {"name": "sparks", "kind": "embers", "palette": "wisp", "scale": 0.7, "y": -4, "blend": "add"}]},
    "bone_shatter": {"size": [96, 64], "frames": 10, "fps": 14, "loop": False, "anchor": [48, 32],
                     "layers": [{"name": "flash", "kind": "flash", "palette": "bone", "scale": 1.0, "blend": "add"},
                                {"name": "shards", "kind": "shards", "palette": "bone", "scale": 1.1},
                                {"name": "dust", "kind": "cloud", "palette": "smoke", "scale": 0.9, "start": 2, "opacity": 0.7}]},
    "lightning_strike": {"size": [64, 128], "frames": 8, "fps": 16, "loop": False, "anchor": [32, 124],
                         "layers": [{"name": "bolt", "kind": "lightning", "palette": "silver", "scale": 1.0},
                                    {"name": "impact", "kind": "burst", "palette": "silver", "scale": 0.8, "y": 44, "start": 2, "blend": "add"},
                                    {"name": "scorch", "kind": "decal", "palette": "black", "scale": 0.8, "y": 54, "start": 3}]},
}


def new_spell(name: str, preset: str = "fireball") -> dict:
    base = json.loads(json.dumps(PRESETS.get(preset, PRESETS["fireball"])))
    base["name"] = name
    base["layers"] = [{**LAYER_DEFAULTS, **lyr} for lyr in base["layers"]]
    return base


def render_kind(kind: str, w: int, h: int, frames: int, palette, seed: int = 1, glow: bool | None = None, bands: int = 6) -> list[np.ndarray]:
    """One effect kind as RGBA frames (what make_vfx renders, without files)."""
    colors = vfx.PRESETS[palette] if isinstance(palette, str) else list(palette)
    rng = np.random.default_rng(seed)
    if glow is None:
        glow = kind in vfx.GLOW_KINDS
    gen = vfx.GENERATORS[kind](w, h, frames, rng, glow)
    lut = vfx.ramp_lut(colors, bands)
    if kind == "cookie":
        out = []
        for inten, _a, _h in gen:
            rgba = np.zeros((h, w, 4), dtype=np.uint8)
            rgba[..., :3] = lut[-1]
            rgba[..., 3] = (np.clip(inten, 0, 1) * 255).astype(np.uint8)
            out.append(rgba)
        return out
    return [vfx.paint(i, a, lut, hl) for i, a, hl in gen]


def _blend(base: Image.Image, layer: Image.Image, mode: str, opacity: float) -> Image.Image:
    if opacity < 1.0:
        a = layer.split()[3].point(lambda v: int(v * opacity))
        layer = layer.copy()
        layer.putalpha(a)
    if mode == "add":
        b = np.asarray(base).astype(np.int32)
        l = np.asarray(layer).astype(np.int32)
        w = l[..., 3:4] / 255.0
        rgb = np.clip(b[..., :3] + l[..., :3] * w, 0, 255)
        alpha = np.clip(b[..., 3:4] + l[..., 3:4], 0, 255)
        return Image.fromarray(np.concatenate([rgb, alpha], axis=-1).astype(np.uint8), "RGBA")
    return Image.alpha_composite(base, layer)


def render_spell(spell: dict) -> list[np.ndarray]:
    """Every layer rendered and composited on the spell's canvas; frames of the strip."""
    W, H = spell["size"]
    n = int(spell["frames"])
    frames_out = []
    cache = {}
    for t in range(n):
        canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        for lyr in spell["layers"]:
            lyr = {**LAYER_DEFAULTS, **lyr}
            if lyr.get("hidden"):
                continue
            key = (lyr["kind"], str(lyr["palette"]), lyr["seed"], lyr["glow"], n)
            if key not in cache:
                w, h = vfx.DEFAULT_SIZE.get(lyr["kind"], (48, 48))
                cache[key] = render_kind(lyr["kind"], w, h, n, lyr["palette"], int(lyr["seed"]), lyr["glow"])
            seq = cache[key]
            local = (t - int(lyr["start"])) * float(lyr["speed"])
            if local < 0:
                continue
            i = int(local)
            if i >= len(seq) and not lyr["loop"]:
                continue
            f = Image.fromarray(seq[i % len(seq)], "RGBA")
            sc = float(lyr["scale"])
            if sc != 1.0:
                f = f.resize((max(1, int(f.width * sc)), max(1, int(f.height * sc))), Image.NEAREST)
            if lyr["flip"]:
                f = f.transpose(Image.FLIP_LEFT_RIGHT)
            if lyr["rotation"]:
                f = f.rotate(float(lyr["rotation"]), resample=Image.NEAREST, expand=True)
            layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            layer.paste(f, (int(W / 2 + lyr["x"] - f.width / 2), int(H / 2 + lyr["y"] - f.height / 2)), f)
            canvas = _blend(canvas, layer, lyr["blend"], float(lyr["opacity"]))
        frames_out.append(np.asarray(canvas).copy())
    return frames_out


def save_spell(spell: dict, path: str | Path) -> str:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(spell, indent=1))
    return str(path)


def load_spell(path: str | Path) -> dict:
    return json.loads(Path(path).read_text())


def export_spell(spell: dict, out_dir: str | Path, gif: bool = False, atlas_dir: str | Path | None = None) -> dict:
    """The strip and json a game loads (same layout as `pixelforge vfx`), plus the editable spell file."""
    seq = render_spell(spell)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    name = spell["name"]
    W, H = spell["size"]
    strip = np.concatenate(seq, axis=1)
    Image.fromarray(strip, "RGBA").save(out / f"{name}.png")
    meta = {"name": name, "kind": "spell", "size": [W, H], "frames": len(seq), "frame_width": W, "fps": spell.get("fps", 12), "loop": bool(spell.get("loop", True)),
            "anchor": spell.get("anchor", [W // 2, H // 2]), "glow": True, "layers": [l.get("kind") for l in spell["layers"]], "source": "pixelforge spell"}
    (out / f"{name}.json").write_text(json.dumps(meta, indent=2) + "\n")
    save_spell(spell, out / f"{name}.spell.json")
    r = {"ok": True, "png": str(out / f"{name}.png"), "json": str(out / f"{name}.json"), "spell": str(out / f"{name}.spell.json"), "frames": len(seq)}
    if gif:
        from .spritesheet import save_gif
        save_gif([Image.fromarray(f, "RGBA") for f in seq], out / f"{name}.gif", fps=float(spell.get("fps", 12)), zoom=4)
        r["gif"] = str(out / f"{name}.gif")
    if atlas_dir:
        r["atlas"] = vfx.export_vfx_set(seq, name, atlas_dir, fps=float(spell.get("fps", 12)), loop=bool(spell.get("loop", True)), anchor=meta["anchor"])
    return r
