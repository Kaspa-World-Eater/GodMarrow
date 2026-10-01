"""Before / after for any art change: two images (or two folders of frames) -> a side-by-side strip PNG and,
for frame folders, a GIF that alternates. For every push that touches art."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


def _load(p: Path) -> list[Image.Image]:
    if p.is_dir():
        return [Image.open(f).convert("RGBA") for f in sorted(p.glob("*.png"))]
    return [Image.open(p).convert("RGBA")]


def compare(a: str | Path, b: str | Path, out: str | Path, *, zoom: int = 2, labels=("before", "after")) -> dict:
    A, B = _load(Path(a)), _load(Path(b))
    n = max(len(A), len(B))
    w = max(i.width for i in A + B)
    h = max(i.height for i in A + B)
    strip = Image.new("RGBA", ((w * 2 + 12) * zoom, (h + 14) * zoom), (28, 30, 36, 255))
    d = ImageDraw.Draw(strip)
    for k, (ims, lab) in enumerate(((A, labels[0]), (B, labels[1]))):
        im = ims[0].resize((ims[0].width * zoom, ims[0].height * zoom), Image.NEAREST)
        strip.paste(im, ((k * (w + 12)) * zoom, 14 * zoom), im)
        d.text(((k * (w + 12)) * zoom + 2, 2), f"{lab} ({len(ims)} frames)", fill=(200, 196, 180))
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    strip.save(out)
    result = {"ok": True, "strip": str(out), "frames": [len(A), len(B)]}
    if n > 1 or len(A) != len(B):
        frames = []
        for i in range(n):
            fr = Image.new("RGBA", ((w * 2 + 12) * zoom, h * zoom), (28, 30, 36, 255))
            for k, ims in enumerate((A, B)):
                im = ims[i % len(ims)]
                fr.paste(im.resize((im.width * zoom, im.height * zoom), Image.NEAREST), ((k * (w + 12)) * zoom, 0), im.resize((im.width * zoom, im.height * zoom), Image.NEAREST))
            frames.append(fr.convert("P", palette=Image.ADAPTIVE, colors=255))
        gif = out.with_suffix(".gif")
        frames[0].save(gif, save_all=True, append_images=frames[1:], duration=100, loop=0, disposal=2)
        result["gif"] = str(gif)
    # a one-number difference so a script can gate on it
    if len(A) == len(B) and all(x.size == y.size for x, y in zip(A, B)):
        diff = float(np.mean([np.abs(np.asarray(x, dtype=np.int16) - np.asarray(y, dtype=np.int16)).mean() for x, y in zip(A, B)]))
        result["mean_abs_diff"] = round(diff, 3)
    return result
