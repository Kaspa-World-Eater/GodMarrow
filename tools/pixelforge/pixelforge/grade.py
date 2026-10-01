"""Grade a rendered image toward a painting's tones (the game's look), in OKLab:

- lightness: a smooth curve that pulls the median toward the target and keeps blacks and highlights;
- chroma: scaled toward the target (muted), with a floor so metals and bone do not go grey;
- hue: shadows drift toward the painting's shadow hue (teal here), highlights toward its warm light;
- grain: a fine periodic noise on lightness so flat planes read as painted;

then the usual pixel pass (nearest scale, dark outline) happens elsewhere. ``Target`` can be measured from any
reference image with ``measure()`` so another game gets its own look."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .color import oklab_to_rgb, rgb_to_oklab


@dataclass
class Target:
    l_median: float = 0.35
    l_p5: float = 0.14
    l_p95: float = 0.64
    chroma: float = 0.035
    shadow_ab: tuple[float, float] = (-0.027, 0.0)
    light_ab: tuple[float, float] = (0.015, 0.03)


def measure(rgba: np.ndarray) -> Target:
    px = rgba[rgba[..., 3] > 0][:, :3] if rgba.shape[-1] == 4 else rgba.reshape(-1, 3)
    lab = rgb_to_oklab(px)
    L = lab[:, 0]
    C = np.hypot(lab[:, 1], lab[:, 2])
    dark, light = lab[L < np.percentile(L, 35)], lab[L > np.percentile(L, 80)]
    return Target(float(np.percentile(L, 50)), float(np.percentile(L, 5)), float(np.percentile(L, 95)), float(np.percentile(C, 60)),
                  (float(dark[:, 1].mean()), float(dark[:, 2].mean())), (float(light[:, 1].mean()), float(light[:, 2].mean())))


def grade(rgba: np.ndarray, target: Target = Target(), *, strength: float = 1.0, grain: float = 0.025, seed: int = 1, keep_chroma_floor: float = 0.02) -> np.ndarray:
    out = rgba.copy()
    mask = rgba[..., 3] > 0 if rgba.shape[-1] == 4 else np.ones(rgba.shape[:2], bool)
    if not mask.any():
        return out
    lab = rgb_to_oklab(rgba[..., :3][mask]).astype(np.float64)
    L, a, b = lab[:, 0], lab[:, 1], lab[:, 2]
    # lightness: map the source's 5/50/95 percentiles onto the target's with a monotone piecewise curve
    s5, s50, s95 = np.percentile(L, [5, 50, 95])
    xs = np.array([0.0, s5, s50, s95, 1.0])
    ys = np.array([0.0, target.l_p5, target.l_median, target.l_p95, 1.0])
    L2 = np.interp(L, xs, ys)
    L2 = L * (1 - strength) + L2 * strength
    # chroma toward the target, with a floor
    C = np.hypot(a, b)
    cm = np.median(C[C > 1e-4]) if (C > 1e-4).any() else 1.0
    k = target.chroma / max(cm, 1e-4)
    k = k * strength + (1 - strength)
    C2 = np.maximum(C * k, np.minimum(C, keep_chroma_floor))
    scale = np.where(C > 1e-6, C2 / np.maximum(C, 1e-6), 1.0)
    a2, b2 = a * scale, b * scale
    # hue drift: shadows toward the shadow tint, lights toward the light tint
    w_dark = np.clip((0.45 - L2) / 0.3, 0, 1) * 0.6 * strength
    w_light = np.clip((L2 - 0.6) / 0.3, 0, 1) * 0.15 * strength
    a2 = a2 * (1 - w_dark - w_light) + target.shadow_ab[0] * w_dark + target.light_ab[0] * w_light
    b2 = b2 * (1 - w_dark - w_light) + target.shadow_ab[1] * w_dark + target.light_ab[1] * w_light
    # pure blues (kit paint, sky-blue flags) have no place in this palette: turn them toward teal
    hue = np.arctan2(b2, a2)
    blue = (hue < -1.2) & (hue > -2.6) & (np.hypot(a2, b2) > 0.03)
    if blue.any():
        c = np.hypot(a2[blue], b2[blue])
        a2[blue], b2[blue] = -c * 0.8, -c * 0.25
    # grain
    if grain > 0:
        rng = np.random.default_rng(seed)
        h, w = rgba.shape[:2]
        n = rng.normal(0, 1, (h, w))
        n = (n + np.roll(n, 1, 0) + np.roll(n, 1, 1)) / 3   # a touch of spatial coherence
        L2 = np.clip(L2 + n[mask] * grain, 0, 1)
    out[..., :3][mask] = oklab_to_rgb(np.stack([L2, a2, b2], axis=1))
    return out
