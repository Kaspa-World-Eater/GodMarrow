"""A small colour editor for sprites, atlases and cutouts.

Click a colour on the picture (the eyedropper), set how wide a range of similar colours to take, and give it a new
colour: every selected pixel moves by the same OKLab offset, so shading and texture stay and only the colour changes.
Lightness, chroma and hue sliders refine it. Works on a single cutout before the build (the model then carries the
change into every frame) or on a finished atlas (every frame at once, since they share the sheet).

The editor itself is a page of the Studio (``pixelforge.studio.pages_editors.ColourPage``); the two functions
here are what it and ``skin_ops`` compute with.
"""
from __future__ import annotations

import math
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

from .color import oklab_to_rgb, rgb_to_oklab


def select_like(lab: np.ndarray, alpha: np.ndarray, src: np.ndarray, tolerance: float, center: tuple[int, int] | None = None,
                radius: int = 0) -> np.ndarray:
    """Pixels within ``tolerance`` (OKLab distance) of ``src``; with ``radius`` > 0 only within that many pixels of
    ``center`` (x, y), for a local change such as one eye."""
    m = (np.linalg.norm(lab - src, axis=-1) <= tolerance) & (alpha > 0)
    if radius > 0 and center is not None:
        yy, xx = np.mgrid[0:lab.shape[0], 0:lab.shape[1]]
        m &= (xx - center[0]) ** 2 + (yy - center[1]) ** 2 <= radius * radius
    return m


def shift_colors(rgba: np.ndarray, mask: np.ndarray, src_lab: np.ndarray, dst_lab: np.ndarray | None,
                 lightness: float = 0.0, chroma: float = 1.0, hue: float = 0.0) -> np.ndarray:
    """Recolour the masked pixels: move each by (dst - src) in OKLab (shading kept), then the sliders."""
    out = rgba.copy()
    if not mask.any():
        return out
    lab = rgb_to_oklab(rgba[..., :3][mask]).astype(np.float32)
    if dst_lab is not None:
        lab = lab + (np.asarray(dst_lab, np.float32) - np.asarray(src_lab, np.float32))
    L, a, b = lab[:, 0] + lightness, lab[:, 1], lab[:, 2]
    th = math.radians(hue)
    a2 = (a * math.cos(th) - b * math.sin(th)) * chroma
    b2 = (a * math.sin(th) + b * math.cos(th)) * chroma
    lab = np.stack([np.clip(L, 0, 1), a2, b2], axis=1)
    out[..., :3][mask] = oklab_to_rgb(lab)
    return out


def _studio_of(master):
    """The Studio an old-style ``master`` belongs to (the editors are pages of it now, never separate windows)."""
    st = getattr(master, "studio", None) or (master if hasattr(master, "show") and hasattr(master, "pages") else None)
    if st is None:
        raise RuntimeError("The colour editor is a page of PixelForge Studio (pixelforge studio); pass the Studio, or use select_like / shift_colors or the skin ops")
    return st


def open_color_editor(master, image_path, on_save=None):
    """Open the colour editor page on ``image_path`` (kept for older callers)."""
    return _studio_of(master).show("colour", path=str(image_path), on_save=on_save)
