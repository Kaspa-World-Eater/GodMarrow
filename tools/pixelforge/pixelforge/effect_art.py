"""Painted spell and missile art -> game effects.

Paint the effect in Midjourney (world prompt kinds ``missile``, ``effect`` and ``spell_frames``), then:

    make_effect("spear.png", "bone_spear", "art/fx", kind="missile", rotations=16)   # one painted missile, flying right
    make_effect("nova.png", "frost_nova", "art/fx", kind="burst")                   # one painted frame -> a one-shot
    make_effect("aura.png", "ward", "art/fx", kind="loop", preset="glow")           # one painted frame -> a loop
    make_effect("frames.png", "cast", "art/fx", kind="frames")                       # a strip of painted key frames

The painting is cut out (black or white background, found from the corners), animated the way the kind needs
(missiles spin their stripe and shed chips, loops breathe or flicker, bursts expand and dissolve, key frames are
split and looped), optionally turned into a rotation sheet, and written in the same strip + json layout as
``pixelforge vfx``, so the Godot add-on, the effects editor and the spell designer (layer kind ``image``) use it
like any generated effect. Colours stay the painting's own.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

from . import cleanup, vfx
from .animate import PRESETS as ANIM_PRESETS, animate
from .sheet import cutout, normalize_heights, split_sheet
from .transform import rotate

KINDS = ("missile", "loop", "burst", "frames")


def cut_effect(image: Image.Image, tolerance: float = 0.1) -> np.ndarray:
    """RGBA cutout of a painted effect on a plain background (black or white, read from the corners)."""
    rgba = cutout(image.convert("RGB"), tolerance=tolerance, soft=True)
    rgba[..., 3] = cleanup.remove_islands(rgba[..., 3], min_fraction=0.002)
    a = rgba[..., 3] > 0
    ys, xs = np.nonzero(a)
    if len(ys) == 0:
        raise ValueError("nothing found on the painting; is the background a plain black or white?")
    pad = 2
    y0, y1, x0, x1 = max(0, ys.min() - pad), min(rgba.shape[0], ys.max() + 1 + pad), max(0, xs.min() - pad), min(rgba.shape[1], xs.max() + 1 + pad)
    return rgba[y0:y1, x0:x1]


def _fit(rgba: np.ndarray, width: int) -> np.ndarray:
    """Scale the cutout to ``width`` game pixels (nearest-free: LANCZOS then the pixel pass keeps colours)."""
    h, w = rgba.shape[:2]
    if w == width:
        return rgba
    im = Image.fromarray(rgba, "RGBA").resize((width, max(1, round(h * width / w))), Image.LANCZOS)
    return np.array(im)


def _missile_frames(rgba: np.ndarray, frames: int, rng: np.random.Generator, spin: float = 1.0, chips: int = 10) -> list[np.ndarray]:
    """A painted missile spins: a light band travels along it, and chips of its own colours fly off behind."""
    h, w = rgba.shape[:2]
    pad = 6
    base = np.pad(rgba, ((pad, pad), (pad, pad), (0, 0)))
    H, W = base.shape[:2]
    a = base[..., 3] > 0
    ys, xs = np.nonzero(a)
    cy = float(ys.mean()) if len(ys) else H / 2
    cols = base[a][:, :3]
    rng2 = np.random.default_rng(1)
    chip_cols = cols[rng2.integers(0, len(cols), size=max(chips, 1))] if len(cols) else np.zeros((chips, 3), np.uint8)
    p = rng.random((chips, 3)).astype(np.float32)
    xx, yy = np.meshgrid(np.arange(W), np.arange(H))
    out = []
    for i in range(frames):
        t = i / frames
        f = base.copy()
        # the travelling band: lighten pixels where a diagonal stripe passes (the spin)
        band = 0.5 + 0.5 * np.cos(2 * math.pi * (xx / max(W, 1) * 3 - spin * t) + (yy - cy) / max(h / 2, 1))
        lift = (band * 0.35)[..., None]
        f[..., :3] = np.clip(f[..., :3] * (1 - lift) + 255 * lift * (a[..., None]), 0, 255).astype(np.uint8)
        f[..., :3][~a] = base[..., :3][~a]
        # chips behind the tail
        for j in range(chips):
            s, ph, sz = p[j]
            life = (s + t) % 1.0
            px = int(xs.min() - life * W * 0.25) if len(xs) else 0
            py = int(cy + math.sin(2 * math.pi * (ph + t)) * h * 0.3 * life)
            r = 1 + int(sz * 2)
            if 0 <= px < W - r and 0 <= py < H - r:
                f[py:py + r, px:px + r, :3] = chip_cols[j]
                f[py:py + r, px:px + r, 3] = int(255 * (1 - life))
        out.append(f)
    return out


def _burst_frames(rgba: np.ndarray, frames: int) -> list[np.ndarray]:
    """One painted frame becomes a one-shot: it grows from the centre, brightens, then thins out and fades."""
    h, w = rgba.shape[:2]
    pad = int(max(h, w) * 0.3)
    H, W = h + 2 * pad, w + 2 * pad
    out = []
    im = Image.fromarray(rgba, "RGBA")
    for i in range(frames):
        t = (i + 0.5) / frames
        s = 0.35 + 0.95 * (1 - (1 - t) ** 2)
        fw, fh = max(1, int(w * s)), max(1, int(h * s))
        fr = im.resize((fw, fh), Image.NEAREST)
        canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        canvas.paste(fr, ((W - fw) // 2, (H - fh) // 2), fr)
        arr = np.array(canvas)
        fade = 1.0 if t < 0.55 else max(0.0, 1 - (t - 0.55) / 0.45)
        # dissolve: drop pixels by a noise threshold as it fades
        if fade < 1.0:
            noise = np.random.default_rng(i).random(arr.shape[:2])
            arr[..., 3] = np.where(noise < fade, arr[..., 3], 0)
        bright = 1.0 + 0.5 * max(0.0, 1 - t * 2.5)
        arr[..., :3] = np.clip(arr[..., :3] * bright, 0, 255).astype(np.uint8)
        out.append(arr)
    return out


def make_effect(image: str | Path, name: str, out_dir: str | Path, *, kind: str = "loop", preset: str = "glow", frames: int = 8, fps: float = 10.0,
                width: int | None = None, rotations: int = 0, seed: int = 1, gif: bool = True, tolerance: float = 0.1, anchor: str = "auto",
                atlas_dir: str | Path | None = None, looks=None) -> dict:
    """A painted effect -> strip + json (+ gif) in the vfx layout. ``looks`` (see fxlook) finishes the frames before any
    rotation sheet; the lock palette is the painting's own colours (k-means to 96 when it has more) plus the look's."""
    if kind not in KINDS:
        raise ValueError(f"kind must be one of {KINDS}")
    src = Image.open(image)
    rng = np.random.default_rng(seed)
    if kind == "frames":
        views = normalize_heights(split_sheet(src.convert("RGB"), tolerance=tolerance))
        seq = [np.array(v.image.convert("RGBA")) for v in views]
        if not seq:
            raise ValueError("no frames found on the sheet")
        if width:
            seq = [_fit(f, width) for f in seq]
        h = max(f.shape[0] for f in seq); w = max(f.shape[1] for f in seq)
        padded = []
        for f in seq:
            c = np.zeros((h, w, 4), np.uint8)
            c[(h - f.shape[0]) // 2:(h - f.shape[0]) // 2 + f.shape[0], (w - f.shape[1]) // 2:(w - f.shape[1]) // 2 + f.shape[1]] = f
            padded.append(c)
        seq = padded
        loop = True
    else:
        rgba = cut_effect(src, tolerance)
        if width:
            rgba = _fit(rgba, width)
        if kind == "missile":
            seq = _missile_frames(rgba, frames, rng)
            loop = True
        elif kind == "burst":
            seq = _burst_frames(rgba, frames)
            loop = False
        else:
            effects = ANIM_PRESETS.get(preset, ANIM_PRESETS["glow"])
            seq = animate(rgba, effects, frames)
            loop = True
    look_info = None
    h0, w0 = seq[0].shape[:2]
    pl, pt = 0, 0   # a look's margin: the frame grows, the anchor moves with the painting
    if looks:
        from .fxlook import apply_looks, frames_palette

        seq, look_info = apply_looks(seq, looks, frames_palette(seq), loop=loop, seed=seed, fps=fps)
        loop, fps = look_info["loop"], fps * look_info["fps_scale"]
        pl, pt = look_info["pad"][:2]
    h, w = seq[0].shape[:2]
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    if anchor == "auto":
        anc = [pl + w0 // 2, pt + h0 - 1] if (kind == "loop" and preset in ("flame", "grass")) else [pl + w0 // 2, pt + h0 // 2]
    else:
        anc = [int(v) for v in str(anchor).split(",")]
        anc = [anc[0] + pl, anc[1] + pt]
    rows = [seq]
    if rotations and rotations > 1:
        turned = [[rotate(f, k * 360.0 / rotations, expand=True) for f in seq] for k in range(rotations)]
        cw = max(f.shape[1] for r in turned for f in r); ch = max(f.shape[0] for r in turned for f in r)
        rows = []
        for r in turned:
            cells = []
            for f in r:
                cell = np.zeros((ch, cw, 4), np.uint8)
                oy, ox = (ch - f.shape[0]) // 2, (cw - f.shape[1]) // 2
                cell[oy:oy + f.shape[0], ox:ox + f.shape[1]] = f
                cells.append(cell)
            rows.append(cells)
        w, h = cw, ch
        anc = [cw // 2, ch // 2]
    sheet = np.concatenate([np.concatenate(r, axis=1) for r in rows], axis=0)
    Image.fromarray(sheet, "RGBA").save(out / f"{name}.png")
    meta = {"name": name, "kind": f"painted_{kind}", "size": [w, h], "frames": len(seq), "frame_width": w, "frame_height": h, "fps": fps, "loop": loop,
            "anchor": anc, "glow": True, "rotations": int(rotations or 1), "source": "pixelforge effect (painted)", "painting": str(image)}
    if look_info:
        meta.update(look=look_info["spec"], looks=look_info["looks"], palette=look_info["palette"], pad=look_info["pad"])
    (out / f"{name}.json").write_text(json.dumps(meta, indent=2) + "\n")
    r = {"ok": True, "png": str(out / f"{name}.png"), "json": str(out / f"{name}.json"), "frames": len(seq), "size": [w, h], "kind": kind}
    if look_info:
        r["look"], r["palette"] = look_info["spec"], look_info["palette"]
    if gif:
        from .spritesheet import save_gif
        save_gif([Image.fromarray(f, "RGBA") for f in seq], out / f"{name}.gif", fps=fps, zoom=3)
        r["gif"] = str(out / f"{name}.gif")
    if atlas_dir:
        r["atlas"] = vfx.export_vfx_set(seq, name, atlas_dir, fps=fps, loop=loop, anchor=anc)
    return r
