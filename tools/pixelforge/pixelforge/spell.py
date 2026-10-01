"""Spell designer: build a complex effect from layers of the Forge's effect generators.

A spell is a JSON file: a canvas size, a length in frames, fps, and layers. Each layer is one effect kind with its
own colours, size, position, rotation, start frame, speed, opacity, blend (normal or add) and look (a finishing layer
from :mod:`fxlook`, e.g. ``"phosphorus"`` or ``"echo:count=3"``), so a fireball is a burst layer over a fire layer
with an ember layer trailing behind, a ward is a ring under a rune under a wisp, and so on. The spell itself may carry
a top-level ``"look"`` applied to the composite (its palette is the colours the layers used, plus the look's own). The composer renders the layers to one strip and the same files `pixelforge vfx` writes (<name>.png,
<name>.json; optional atlas set), so the Godot add-on plays a spell like any effect.

    pixelforge spell new fireball -o art/fx --preset fireball       # a starting point to edit
    pixelforge spell render art/fx/fireball.spell.json [--gif]      # the strip + json (+ GIF)
    spell_designer.open_spell_designer(master, path)                # the window: layers, knobs, live preview
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

from . import vfx

LAYER_DEFAULTS = {"kind": "fire", "image": "", "palette": "lantern", "scale": 1.0, "x": 0, "y": 0, "rotation": 0.0, "start": 0, "speed": 1.0,
                  "opacity": 1.0, "blend": "normal", "glow": None, "seed": 1, "flip": False, "loop": True, "name": "", "look": ""}

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
    "bone_spear_hit": {"size": [80, 64], "frames": 10, "fps": 14, "loop": False, "anchor": [40, 36],
                       "layers": [{"name": "burst", "kind": "bone_burst", "palette": "bone", "scale": 1.5},
                                  {"name": "dust", "kind": "cloud", "palette": "bone", "scale": 0.8, "y": 8, "start": 2, "opacity": 0.5}]},
    "frost_nova": {"size": [160, 96], "frames": 12, "fps": 14, "loop": False, "anchor": [80, 48],
                   "layers": [{"name": "ring", "kind": "nova", "palette": "frost", "scale": 1.2},
                              {"name": "flash", "kind": "flash", "palette": "frost", "scale": 0.8, "blend": "add", "opacity": 0.7},
                              {"name": "mist", "kind": "fog", "palette": "frost", "scale": 0.9, "start": 3, "opacity": 0.5}]},
    "fire_wall": {"size": [160, 80], "frames": 12, "fps": 12, "loop": True, "anchor": [80, 72],
                  "layers": [{"name": "flames", "kind": "firewall", "palette": "lantern", "scale": 1.25, "y": 8},
                             {"name": "embers", "kind": "embers", "palette": "lantern", "scale": 1.3, "y": -10, "opacity": 0.8}]},
    "corpse_burst": {"size": [96, 72], "frames": 10, "fps": 14, "loop": False, "anchor": [48, 48],
                     "layers": [{"name": "flash", "kind": "flash", "palette": "blood", "scale": 0.9, "blend": "add"},
                                {"name": "bone", "kind": "bone_burst", "palette": "bone", "scale": 1.1},
                                {"name": "blood", "kind": "shards", "palette": "blood", "scale": 1.2, "opacity": 0.9},
                                {"name": "miasma", "kind": "cloud", "palette": "miasma", "scale": 1.0, "start": 2, "opacity": 0.6}]},
    "bone_armor": {"size": [112, 64], "frames": 16, "fps": 12, "loop": True, "anchor": [56, 32],
                   "layers": [{"name": "back", "kind": "bone_armor_back", "palette": "bone", "opacity": 0.85},
                              {"name": "front", "kind": "bone_armor_front", "palette": "bone"}],
                   "attach": {"back": "behind", "front": "front"}},
    "bone_shard_aura": {"size": [112, 64], "frames": 16, "fps": 12, "loop": True, "anchor": [56, 32],
                        "layers": [{"name": "back", "kind": "bone_shard_aura_back", "palette": "iron", "opacity": 0.85},
                                   {"name": "front", "kind": "bone_shard_aura_front", "palette": "iron"},
                                   {"name": "glints", "kind": "wisp", "palette": "wisp", "scale": 0.5, "y": -14, "opacity": 0.6, "blend": "add"}],
                        "attach": {"back": "behind", "front": "front"}},
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


def render_kind(kind: str, w: int, h: int, frames: int, palette, seed: int = 1, glow: bool | None = None, bands: int = 6, looks=None) -> list[np.ndarray]:
    """One effect kind as RGBA frames (what make_vfx renders, without files); ``looks`` finishes them (see fxlook)."""
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
    else:
        out = [vfx.paint(i, a, lut, hl) for i, a, hl in gen]
    if looks:
        from .fxlook import apply_looks

        out, _info = apply_looks(out, looks, colors, loop=kind in vfx.LOOPING, seed=seed)
    return out


def load_image_frames(path: str | Path) -> list[np.ndarray]:
    """A layer from a painted or exported effect: a <name>.json next to its strip (the vfx layout), or a plain PNG."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"image layer not found: {p}")
    if p.suffix == ".json":
        meta = json.loads(p.read_text())
        strip = np.array(Image.open(p.with_suffix(".png")).convert("RGBA"))
        fw, fh = int(meta["frame_width"]), int(meta.get("frame_height", meta["size"][1]))
        return [strip[0:fh, i * fw:(i + 1) * fw] for i in range(int(meta["frames"]))]
    return [np.array(Image.open(p).convert("RGBA"))]


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


def render_spell(spell: dict, *, with_look: bool = True) -> list[np.ndarray]:
    """Every layer rendered (each with its own look) and composited on the spell's canvas, then the spell's top-level
    look; frames of the strip. ``with_look=False`` leaves the composite plain (the designer's before/after)."""
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
            look = lyr.get("look") or ""
            key = (lyr["kind"], str(lyr["palette"]), lyr["seed"], lyr["glow"], n, lyr.get("image", ""), str(look))
            if key not in cache:
                pad = (0, 0, 0, 0)   # a look's margin round the layer's frames (left, top, right, bottom)
                if lyr["kind"] == "image":
                    frames_img = load_image_frames(lyr.get("image", ""))
                    if look:
                        from .fxlook import apply_looks

                        frames_img, _info = apply_looks(frames_img, look, None, loop=bool(lyr["loop"]), seed=int(lyr["seed"]))
                        pad = tuple(_info["pad"])
                    cache[key] = (frames_img, pad)
                else:
                    w, h = vfx.DEFAULT_SIZE.get(lyr["kind"], (48, 48))
                    if look:
                        from .fxlook import chain_reach

                        pad = chain_reach(look, w, h)
                    cache[key] = (render_kind(lyr["kind"], w, h, n, lyr["palette"], int(lyr["seed"]), lyr["glow"], looks=look or None), pad)
            seq, pad = cache[key]
            local = (t - int(lyr["start"])) * float(lyr["speed"])
            if local < 0:
                continue
            i = int(local)
            if i >= len(seq) and not lyr["loop"]:
                continue
            f = Image.fromarray(seq[i % len(seq)], "RGBA")
            # the look's margin can be uneven (smoke rises, afterimages trail): (cx, cy) is where the effect's own centre
            # sits from the frame centre, so the layer stays where the designer put it
            cx, cy = (pad[0] - pad[2]) / 2, (pad[1] - pad[3]) / 2
            sc = float(lyr["scale"])
            if sc != 1.0:
                f = f.resize((max(1, int(f.width * sc)), max(1, int(f.height * sc))), Image.NEAREST)
                cx, cy = cx * sc, cy * sc
            if lyr["flip"]:
                f = f.transpose(Image.FLIP_LEFT_RIGHT)
                cx = -cx
            if lyr["rotation"]:
                f = f.rotate(float(lyr["rotation"]), resample=Image.NEAREST, expand=True)
                ang = math.radians(float(lyr["rotation"]))
                cx, cy = cx * math.cos(ang) + cy * math.sin(ang), -cx * math.sin(ang) + cy * math.cos(ang)
            layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            layer.paste(f, (int(W / 2 + lyr["x"] - f.width / 2 - cx), int(H / 2 + lyr["y"] - f.height / 2 - cy)), f)
            canvas = _blend(canvas, layer, lyr["blend"], float(lyr["opacity"]))
        frames_out.append(np.asarray(canvas).copy())
    if with_look and spell.get("look"):
        frames_out, _info = spell_look(spell, frames_out)
    return frames_out


def spell_palette(spell: dict) -> list[str]:
    """The colours a spell's layers draw with: every layer palette (presets or hex lists), dark -> bright."""
    from .fxlook import as_palette, hexes

    cols = []
    for lyr in spell.get("layers", []):
        pal = lyr.get("palette", "lantern")
        if lyr.get("kind") == "image":
            continue
        cols += vfx.PRESETS[pal] if isinstance(pal, str) else list(pal)
    return hexes(as_palette(cols)) if cols else []


def spell_look(spell: dict, frames: list[np.ndarray]) -> tuple[list[np.ndarray], dict]:
    """The spell's top-level look on composited frames. The lock palette is the colours the frames actually use
    (layer palettes, image layers, additive blends) plus the look's own colours."""
    from .fxlook import apply_looks, frames_palette

    return apply_looks(frames, spell["look"], frames_palette(frames), loop=bool(spell.get("loop", True)), seed=int(spell.get("seed", 1)),
                       fps=float(spell.get("fps", 12)))


def save_spell(spell: dict, path: str | Path) -> str:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(spell, indent=1))
    return str(path)


def load_spell(path: str | Path) -> dict:
    return json.loads(Path(path).read_text())


def export_spell(spell: dict, out_dir: str | Path, gif: bool = False, atlas_dir: str | Path | None = None) -> dict:
    """The strip and json a game loads (same layout as `pixelforge vfx`), plus the editable spell file."""
    seq = render_spell(spell, with_look=False)
    fps, loop = float(spell.get("fps", 12)), bool(spell.get("loop", True))
    W, H = spell["size"]
    anchor = [int(v) for v in spell.get("anchor", [W // 2, H // 2])]
    look_info = None
    if spell.get("look"):
        seq, look_info = spell_look(spell, seq)
        fps, loop = fps * look_info["fps_scale"], look_info["loop"]
        (W, H), (pl, pt) = look_info["size"], look_info["pad"][:2]   # the spell's look grows the frame; the anchor moves with the spell
        anchor = [anchor[0] + pl, anchor[1] + pt]
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    name = spell["name"]
    strip = np.concatenate(seq, axis=1)
    Image.fromarray(strip, "RGBA").save(out / f"{name}.png")
    meta = {"name": name, "kind": "spell", "size": [W, H], "frames": len(seq), "frame_width": W, "frame_height": H, "fps": fps, "loop": loop,
            "anchor": anchor, "glow": True, "layers": [l.get("kind") for l in spell["layers"]],
            "layer_looks": [l.get("look", "") for l in spell["layers"]], "palette": look_info["palette"] if look_info else spell_palette(spell),
            "source": "pixelforge spell"}
    if look_info:
        meta["look"], meta["looks"], meta["pad"] = look_info["spec"], look_info["looks"], look_info["pad"]
    (out / f"{name}.json").write_text(json.dumps(meta, indent=2) + "\n")
    save_spell(spell, out / f"{name}.spell.json")
    r = {"ok": True, "png": str(out / f"{name}.png"), "json": str(out / f"{name}.json"), "spell": str(out / f"{name}.spell.json"), "frames": len(seq),
         "fps": fps, "loop": loop, "palette": meta["palette"], "size": [W, H], "anchor": anchor}
    if look_info:
        r["look"] = look_info["spec"]
    if gif:
        from .spritesheet import save_gif
        save_gif([Image.fromarray(f, "RGBA") for f in seq], out / f"{name}.gif", fps=fps, zoom=4)
        r["gif"] = str(out / f"{name}.gif")
    if atlas_dir:
        r["atlas"] = vfx.export_vfx_set(seq, name, atlas_dir, fps=fps, loop=loop, anchor=meta["anchor"])
    return r
