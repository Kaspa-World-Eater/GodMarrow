"""The act palettes: ``data/global/palette/ACT1..ACT5/pal.dat`` (256 colours as B, G, R bytes) and ``pal.pl2``
(the same 256 colours as R, G, B, 0 at the start, then the light and blend tables). Index 0 is transparent in
every unit sprite. Quantising to a palette is OKLab nearest, as everywhere in PixelForge."""
from __future__ import annotations

from pathlib import Path

import numpy as np

from ..color import rgb_to_oklab

ACTS = ["ACT1", "ACT2", "ACT3", "ACT4", "ACT5"]
OTHER_PALETTES = ["UNITS", "ENDGAME", "ENDGAME2", "FECHAR", "LOADING", "MENU0", "MENU1", "MENU2", "MENU3", "MENU4", "SKY", "STATIC", "TRADEMARK"]


class ActPalette:
    def __init__(self, rgb: np.ndarray, name: str = "palette"):
        rgb = np.asarray(rgb, dtype=np.uint8).reshape(256, 3)
        self.rgb = rgb
        self.name = name
        self.lab = rgb_to_oklab(rgb)

    @classmethod
    def load(cls, path: str | Path) -> "ActPalette":
        path = Path(path)
        data = path.read_bytes()
        if path.suffix.lower() == ".pl2" or len(data) >= 1024 and len(data) != 768:
            if len(data) < 1024:
                raise ValueError(f"{path} is too short for a pl2 palette")
            arr = np.frombuffer(data[:1024], np.uint8).reshape(256, 4)[:, :3]
            return cls(arr, path.parent.name or path.stem)
        if len(data) < 768:
            raise ValueError(f"{path} is too short for a pal.dat (768 bytes)")
        arr = np.frombuffer(data[:768], np.uint8).reshape(256, 3)[:, ::-1]    # B G R -> R G B
        return cls(arr, path.parent.name or path.stem)

    def save_dat(self, path: str | Path) -> None:
        Path(path).write_bytes(self.rgb[:, ::-1].astype(np.uint8).tobytes())

    def quantise(self, rgba: np.ndarray, threshold: float = 0.05) -> tuple[np.ndarray, dict]:
        """RGBA (h, w, 4) -> palette indices (h, w) with 0 for transparent (alpha <= 127), nearest in OKLab among
        indices 1..255, and the colour loss: mean and largest OKLab distance over the opaque pixels, the share
        past ``threshold`` (0.05 is about a just-visible step), and how many distinct colours became how many."""
        rgba = np.asarray(rgba)
        if rgba.ndim != 3 or rgba.shape[2] < 3:
            raise ValueError("quantise wants an RGBA image")
        alpha = rgba[..., 3] if rgba.shape[2] == 4 else np.full(rgba.shape[:2], 255, np.uint8)
        opaque = alpha > 127
        out = np.zeros(rgba.shape[:2], np.uint8)
        loss = {"pixels": int(opaque.sum()), "mean": 0.0, "max": 0.0, "share_visible": 0.0, "colours_in": 0, "colours_out": 0}
        if not opaque.any():
            return out, loss
        px = rgba[..., :3][opaque]
        uniq, inv = np.unique(px, axis=0, return_inverse=True)
        lab = rgb_to_oklab(uniq)
        cand = self.lab[1:]
        d = ((lab[:, None, :] - cand[None, :, :]) ** 2).sum(-1)
        best = d.argmin(1)
        dist = np.sqrt(d[np.arange(len(uniq)), best])
        idx = (best + 1).astype(np.uint8)
        out[opaque] = idx[inv.reshape(-1)]
        per_px = dist[inv.reshape(-1)]
        loss.update(mean=round(float(per_px.mean()), 4), max=round(float(per_px.max()), 4), share_visible=round(float((per_px > threshold).mean()), 4),
                    colours_in=int(len(uniq)), colours_out=int(len(np.unique(idx))))
        return out, loss

    def to_rgba(self, indices: np.ndarray) -> np.ndarray:
        idx = np.asarray(indices, np.uint8)
        out = np.zeros(idx.shape + (4,), np.uint8)
        out[..., :3] = self.rgb[idx]
        out[..., 3] = np.where(idx == 0, 0, 255).astype(np.uint8)
        return out


def synthetic_palette(seed: int = 0) -> ActPalette:
    """A stand-in 256-colour palette for tests and demos (index 0 black): ramps of greys, browns, blues, greens, reds, golds."""
    rng = np.random.default_rng(seed)
    cols = [(0, 0, 0)]
    bases = [(1, 1, 1), (0.8, 0.6, 0.4), (0.4, 0.5, 0.9), (0.4, 0.8, 0.4), (0.9, 0.3, 0.3), (0.95, 0.8, 0.3), (0.6, 0.4, 0.8), (0.3, 0.8, 0.8)]
        
    for b in bases:
        for k in range(1, 32):
            t = k / 32
            cols.append(tuple(int(min(255, max(0, c * 255 * t + rng.integers(-3, 4)))) for c in b))
    while len(cols) < 256:
        cols.append(tuple(int(v) for v in rng.integers(0, 256, 3)))
    return ActPalette(np.array(cols[:256], np.uint8), f"synthetic{seed}")
