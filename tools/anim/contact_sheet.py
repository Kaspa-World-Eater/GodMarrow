"""Contact sheet and motion sensor for a character sprite's clips (docs/animation/06-our-animations.md).

Usage: python tools/anim/contact_sheet.py <sprite name, e.g. ossuarch_hd> [view] [out.png]

For every clip in art/sprites/<name>.json, in one view, it lays the frames side by side on their shared ground line
(each frame placed by its anchor), labels each with its number and hold, and measures:
- **change**: the share of the figure's pixels that differ from the previous frame (silhouette and value), so a
  dead hold reads near 0 and a strobing jump reads high;
- **seam** (looping clips: idle, walk): the change from the last frame back to the first; a loop whose seam is far
  above its average step jumps when it wraps.
It prints the numbers too, so a pass log can quote them. Lasseter's two-views rule: run it for "side" and "front".
"""
import json
import sys

import numpy as np
from PIL import Image, ImageDraw

G = __file__.replace("\\", "/").rsplit("/tools/", 1)[0] + "/"
LOOPS = ("idle", "walk", "run")
CW, CH, PAD = 200, 290, 18


def frames(name, view):
    d = json.load(open(G + "art/sprites/%s.json" % name, encoding="utf8"))
    sheet = Image.open(G + "art/sprites/%s.png" % name).convert("RGBA")
    meta, idx = d["meta"], d["idx"]
    out = []
    for anim, a in meta["anims"].items():
        fr = []
        for i in range(a["frames"]):
            k = "%s/%s/%d" % (anim, view, i)
            if k in idx:
                s, x, y, w, h, ox, oy = idx[k][:7]
                fr.append((sheet.crop((x, y, x + w, y + h)), ox, oy))
        out.append((anim, fr, float(meta.get("fps", {}).get(anim, 8.0))))
    return out


def placed(im, ox, oy):
    """the frame on a fixed canvas, anchored at its foot, as an array"""
    c = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    c.alpha_composite(im, (int(CW // 2 + ox), int(CH - PAD + oy)))
    return np.asarray(c).astype(np.float32)


def change(a, b):
    ma, mb = a[..., 3] > 32, b[..., 3] > 32
    union = np.logical_or(ma, mb)
    if not union.any():
        return 0.0
    diff = (ma != mb) | (ma & mb & (np.abs(a[..., :3] - b[..., :3]).max(axis=2) > 24))
    return float((diff & union).sum() / union.sum())


def main():
    name = sys.argv[1] if len(sys.argv) > 1 else "ossuarch_hd"
    view = sys.argv[2] if len(sys.argv) > 2 else "side"
    rows = frames(name, view)
    W = 170 + CW * max(len(f) for _, f, _ in rows)
    img = Image.new("RGBA", (W, CH * len(rows)), (40, 38, 44, 255))
    dr = ImageDraw.Draw(img)
    print("%s / %s" % (name, view))
    for r, (anim, fr, fps) in enumerate(rows):
        y0 = r * CH
        arr = [placed(*f) for f in fr]
        steps = [change(arr[i - 1], arr[i]) for i in range(1, len(arr))]
        seam = change(arr[-1], arr[0]) if anim in LOOPS and len(arr) > 1 else None
        ms = 1000.0 / max(0.01, fps)
        line = "%-6s %d frames x %d ms = %.2f s | change per step %s" % (
            anim, len(fr), ms, len(fr) * ms / 1000.0, " ".join("%.2f" % c for c in steps))
        if seam is not None:
            line += " | seam %.2f (mean step %.2f)" % (seam, sum(steps) / max(1, len(steps)))
        print(line)
        dr.text((8, y0 + 8), "%s\n%d frames\n%d ms each\n%.2f s" % (anim, len(fr), ms, len(fr) * ms / 1000.0),
                fill=(230, 220, 200, 255))
        if seam is not None:
            dr.text((8, y0 + 80), "seam %.2f" % seam, fill=(220, 120, 100, 255) if seam > 1.5 * max(steps) else (150, 200, 150, 255))
        for i, (im, ox, oy) in enumerate(fr):
            x0 = 170 + i * CW
            img.alpha_composite(im, (int(x0 + CW // 2 + ox), int(y0 + CH - PAD + oy)))
            dr.line((x0, y0, x0, y0 + CH), fill=(70, 66, 74, 255))
            lab = "%d" % i if i == 0 else "%d  %.2f" % (i, steps[i - 1])
            dr.text((x0 + 4, y0 + 4), lab, fill=(220, 120, 100, 255) if i and (steps[i - 1] < 0.03 or steps[i - 1] > 0.6) else (160, 150, 140, 255))
        dr.line((0, y0 + CH - PAD, W, y0 + CH - PAD), fill=(90, 80, 70, 255))
    out = sys.argv[3] if len(sys.argv) > 3 else "contact_%s_%s.png" % (name, view)
    img.convert("RGB").save(out)
    print("saved", out)


if __name__ == "__main__":
    main()
