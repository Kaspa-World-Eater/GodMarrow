"""A normal map for a painted sprite sheet, so the game can light it as the title lights its stone (lesson 2: forms are
lit by real lights). The height of each pixel is its depth inside the silhouette (a rounded dome from the edge in, so a
figure reads as a volume) plus its own painted value (the folds, plates and bones the painter already shaded), and the
normal is the slope of that height. Green points up the screen, as Cursemark's maps do (shaders read it that way).

    python tools/title_study/normals.py art/sprites/ossuarch_hd.png      # writes art/sprites/ossuarch_hd_n.png
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage


def normals(rgba: np.ndarray, dome_px: float = 9.0, dome_h: float = 5.0, value_h: float = 3.5) -> np.ndarray:
    a = rgba[..., 3] > 8
    d = ndimage.distance_transform_edt(a)
    t = np.clip(d / dome_px, 0.0, 1.0)
    dome = np.sqrt(1.0 - (1.0 - t) ** 2) * dome_h               # round at the edge, flat in the middle
    lum = (rgba[..., 0] * 0.3 + rgba[..., 1] * 0.59 + rgba[..., 2] * 0.11) / 255.0
    lum = ndimage.gaussian_filter(lum, 0.9) * value_h
    h = np.where(a, dome + lum, 0.0)
    gy, gx = np.gradient(h)                                      # gy: down the image
    n = np.dstack([-gx, gy, np.ones_like(h)])                    # y flipped: green up
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    out = np.zeros(rgba.shape, dtype=np.uint8)
    out[..., :3] = np.clip((n * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)
    out[..., 3] = np.where(a, 255, 0)
    return out


if __name__ == "__main__":
    src = Path(sys.argv[1])
    img = np.array(Image.open(src).convert("RGBA")).astype(np.float64)
    out = normals(img)
    dst = src.with_name(src.stem + "_n.png")
    Image.fromarray(out, "RGBA").save(dst)
    print("wrote", dst, out.shape)
