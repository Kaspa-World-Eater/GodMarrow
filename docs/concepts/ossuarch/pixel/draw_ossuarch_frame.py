"""One frame of the Ossuarch drawn at the Tithe-Hand's pixel scale (Derek 2026-10-05: redraw him the way the Hand is
drawn). Idle, facing the camera, lit from the upper left. The first try drew him from rectangles and came out a block
of a tank; this one works the way a pixel artist does: Derek's painting (ossuarch_009202c4_2.png) shrunk to the size
underneath as the guide, every pixel snapped to fixed hue-shifted ramps by what it is (iron, cloth, bone, plume,
leather), lone pixels cleaned into their clusters, then the details placed by hand over it: the visor, the brow band,
the vertebrae, the bones, the plume's licks, the light along the edges, and an outline in each piece's own dark that
breaks where the light strikes.

Run with the Forge's Python; writes frame.png and frame_6x.png next to this file.
"""
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", "..", "..", ".."))
SRC = os.path.join(ROOT, "docs", "concepts", "ossuarch", "ossuarch_009202c4_2.png")
H_OUT = 92

def C(h):
    h = h.lstrip("#"); return np.array([int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)], float)

RAMPS = {
    "iron":  [C(c) for c in ("#07060a", "#110e13", "#1b161b", "#272024", "#352b30", "#463a3e", "#5c4e50", "#7a6a6a")],
    "cloth": [C(c) for c in ("#050b0a", "#0b1614", "#12211e", "#1a2f2a", "#24413a", "#33584d", "#4c7a6a")],
    "bone":  [C(c) for c in ("#3a2622", "#6a4a3c", "#a07e66", "#cdb091", "#ecd9bf", "#fbf1e2")],
    "plume": [C(c) for c in ("#1a4337", "#2f6b56", "#4f9a7f", "#86c7ad", "#c2ebd9", "#f0fcf6")],
    "leath": [C(c) for c in ("#160e0b", "#271912", "#3b2619", "#4f3421", "#66452c")],
}
RIM = C("#6aa892")

# ---------------------------------------------------------------- the painting, cut out and shrunk to the size
src = Image.open(SRC).convert("RGB")
a = np.asarray(src).astype(float)
fig = a.max(axis=2) > 22                                # the figure against the black
ys, xs = np.nonzero(fig)
y0, y1 = ys.min(), ys.max() - 40                        # drop the painted ground shadow
x0, x1 = xs.min(), xs.max()
crop = src.crop((x0, y0, x1 + 1, y1 + 1))
W_OUT = int(round(crop.width * H_OUT / crop.height))
small = crop.resize((W_OUT, H_OUT), Image.LANCZOS)
mask_s = Image.fromarray((fig[y0:y1 + 1, x0:x1 + 1] * 255).astype(np.uint8)).resize((W_OUT, H_OUT), Image.LANCZOS)
S = np.asarray(small).astype(float)
M = np.asarray(mask_s) > 110

# ---------------------------------------------------------------- what each pixel is, then its step in that ramp
def classify(p, y):
    r, g, b = p
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    if y < H_OUT * 0.13 and g > r + 25 and lum > 60:
        return "plume"
    if r > 120 and r > b + 25 and lum > 105:            # pale warm: bone
        return "bone"
    if r > g + 18 and r > b + 12 and lum < 90:           # warm dark: leather and rust
        return "leath"
    if g > r + 6 and b > r - 4 and lum < 120:            # cold green: the cloak and scarf
        return "cloth"
    return "iron"

def step(ramp, lum, lo, hi):
    t = np.clip((lum - lo) / max(1.0, hi - lo), 0, 1)
    return int(round(t * (len(ramp) - 1)))

H, W = S.shape[:2]
kind = np.full((H, W), "", object)
idx = np.zeros((H, W), int)
for y in range(H):
    for x in range(W):
        if not M[y, x]:
            continue
        k = classify(S[y, x], y)
        lum = 0.3 * S[y, x, 0] + 0.59 * S[y, x, 1] + 0.11 * S[y, x, 2]
        lo, hi = {"iron": (6, 95), "cloth": (8, 85), "bone": (80, 225), "plume": (60, 235), "leath": (10, 80)}[k]
        kind[y, x] = k
        idx[y, x] = step(RAMPS[k], lum, lo, hi)

# clean lone pixels: a pixel whose kind matches none of its four neighbours takes the commonest neighbour's
for _ in range(2):
    k2 = kind.copy()
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if not kind[y, x]:
                continue
            nb = [kind[y - 1, x], kind[y + 1, x], kind[y, x - 1], kind[y, x + 1]]
            nb = [n for n in nb if n]
            if nb and kind[y, x] not in nb and kind[y, x] not in ("bone", "plume"):
                k2[y, x] = max(set(nb), key=nb.count)
    kind = k2

# ---------------------------------------------------------------- the light: a lit edge on the upper-left of every piece
out = np.zeros((H, W, 4), np.uint8)
for y in range(H):
    for x in range(W):
        k = kind[y, x]
        if not k:
            continue
        i = min(idx[y, x], len(RAMPS[k]) - 1)
        left_out = x == 0 or not kind[y, x - 1]
        up_out = y == 0 or not kind[y - 1, x]
        if (left_out or up_out) and k in ("iron", "cloth"):
            i = min(len(RAMPS[k]) - 1, i + 2)
        col = RAMPS[k][i]
        if (left_out and k == "iron" and y > H * 0.25) or (left_out and k == "cloth"):
            col = col * 0.4 + RIM * 0.6                  # the teal rim on the light side, as in the painting
        out[y, x, :3] = np.clip(col, 0, 255)
        out[y, x, 3] = 255

# ---------------------------------------------------------------- details placed by hand (coordinates read off the 6x preview)
def P(x, y, c):
    if 0 <= x < W and 0 <= y < H:
        out[y, x, :3] = c; out[y, x, 3] = 255

cx = W // 2
# the bright root of the plume and its licks tearing off
for (x, y, k) in ((cx, 9, 5), (cx + 1, 8, 5), (cx - 1, 8, 4), (cx + 2, 3, 3), (cx + 4, 1, 2), (cx + 3, 0, 1)):
    P(x, y, RAMPS["plume"][k])

# ---------------------------------------------------------------- the outline in each piece's own dark, broken where the light strikes
alpha = out[..., 3] > 0
o2 = out.copy()
for y in range(H):
    for x in range(W):
        if alpha[y, x]:
            continue
        nbs = [(x + 1, y), (x, y + 1), (x - 1, y), (x, y - 1)]
        ins = [(a2, b2) for a2, b2 in nbs if 0 <= a2 < W and 0 <= b2 < H and alpha[b2, a2]]
        if not ins:
            continue
        lit = all(a2 >= x for a2, b2 in ins) and all(b2 >= y for a2, b2 in ins) and y < H * 0.45
        if lit:
            continue
        a2, b2 = ins[0]
        o2[y, x, :3] = (out[b2, a2, :3] * 0.25).astype(np.uint8)
        o2[y, x, 3] = 255
img = Image.fromarray(o2, "RGBA")
img.save(os.path.join(HERE, "frame.png"))
img.resize((img.width * 6, img.height * 6), Image.NEAREST).save(os.path.join(HERE, "frame_6x.png"))
print("drew", img.size)
