"""Attach effects to a sprite: "pale glowing smoke on this eye".

Drag an effect from the list and drop it on the sprite; the marker is the effect's anchor for that view. Place it
once per view, or place it on one and copy to all (left-facing views mirror). Preview plays the idle clip with the
effects composited; Save writes ``attachments`` into the sprite set's JSON and renders each effect's sheet into the
effects folder, where the Godot add-on (PFFx.spawn_attachments) picks them up.

Attachment: {"name", "kind", "palette", "scale", "glow", "z": "front" | "behind", "fx": "<sheet name>", "views": {view: [ox, oy]}}
with (ox, oy) in sprite pixels from the entity's ground point (the same origin as the frames' dx, dy).
"""
from __future__ import annotations

import json
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

from . import vfx

LEFT_VIEWS = {"front_l": "front", "side_l": "side", "back_l": "back"}


def mirror_to_all(offset: list[float], view: str, views: list[str]) -> dict:
    """The same placement on every view; left-facing views (``*_l``) get x mirrored."""
    out = {}
    src_left = view in LEFT_VIEWS
    for v in views:
        ox, oy = offset
        if (v in LEFT_VIEWS) != src_left:
            ox = -ox
        out[v] = [round(ox, 1), round(oy, 1)]
    return out


def load_set(json_path: str | Path) -> dict:
    p = Path(json_path)
    d = json.loads(p.read_text())
    sheets = [np.array(Image.open(p.parent / s).convert("RGBA")) for s in d["sheets"]]
    return {"path": p, "data": d, "sheets": sheets}


def frame_of(s: dict, anim: str, view: str, i: int):
    e = s["data"]["idx"].get(f"{anim}/{view}/{i}")
    if e is None:
        return None, (0, 0)
    sheet, x, y, w, h, dx, dy = e
    return s["sheets"][sheet][y:y + h, x:x + w], (dx, dy)


def effect_frames(att: dict, fx_dir: str | Path) -> tuple[list[np.ndarray], list[int], float]:
    """Render (or reuse) the effect's sheet; frames as RGBA arrays, the anchor, fps."""
    out = Path(fx_dir)
    name = att["fx"]
    meta_p = out / f"{name}.json"
    if not meta_p.exists():
        vfx.make_vfx(att["kind"], name, out, palette=att.get("palette", "lantern"), glow=att.get("glow"), seed=att.get("seed", 1))
    meta = json.loads(meta_p.read_text())
    strip = np.array(Image.open(out / f"{name}.png").convert("RGBA"))
    fw = meta["frame_width"]
    frames = [strip[:, i * fw:(i + 1) * fw] for i in range(meta["frames"])]
    return frames, meta["anchor"], float(meta.get("fps", 10))


def composite(frame: np.ndarray, ground: tuple[int, int], atts: list[dict], view: str, fx_dir, t: int) -> np.ndarray:
    """One frame with every attachment drawn at its offset (effects advance with ``t``)."""
    base = Image.fromarray(frame, "RGBA")
    gx, gy = ground
    for att in atts:
        if view not in att.get("views", {}):
            continue
        frames, anchor, _fps = effect_frames(att, fx_dir)
        f = frames[t % len(frames)]
        sc = float(att.get("scale", 1.0))
        im = Image.fromarray(f, "RGBA")
        if sc != 1.0:
            im = im.resize((max(1, int(im.width * sc)), max(1, int(im.height * sc))), Image.NEAREST)
        ox, oy = att["views"][view]
        x = int(round(gx + ox - anchor[0] * sc))
        y = int(round(gy + oy - anchor[1] * sc))
        layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
        layer.paste(im, (x, y), im)
        base = Image.alpha_composite(base, layer)
    return np.array(base)


def save_attachments(json_path: str | Path, atts: list[dict], fx_dir: str | Path) -> dict:
    p = Path(json_path)
    d = json.loads(p.read_text())
    for att in atts:
        effect_frames(att, fx_dir)   # make sure every sheet exists
    d.setdefault("meta", {})["attachments"] = atts
    d["meta"]["fx_dir"] = str(Path(fx_dir).name)
    p.write_text(json.dumps(d, separators=(",", ":")) + "\n")
    return {"ok": True, "json": str(p), "attachments": len(atts), "fx_dir": str(fx_dir)}


def _studio_of(master):
    """The Studio an old-style ``master`` belongs to (the editors are pages of it now, never separate windows)."""
    st = getattr(master, "studio", None) or (master if hasattr(master, "show") and hasattr(master, "pages") else None)
    if st is None:
        raise RuntimeError("The effects editor is a page of PixelForge Studio (pixelforge studio); pass the Studio, or use save_attachments")
    return st


def open_fx_editor(master, sprite_json, fx_dir, on_save=None):
    """Open the effects page on a sprite set (kept for older callers)."""
    return _studio_of(master).show("fx", sprite_json=str(sprite_json), on_save=on_save)
