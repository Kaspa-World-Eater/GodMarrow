"""The hand pass on the small render of the Ossuarch (one frame, idle facing down-right), at the Tithe-Hand's pixel
scale. The base is the shape model rendered straight at this size with its details pushed (bones, vertebrae, plume),
so its forms are clean; this pass does what a pixel artist does on top:
- every pixel snapped to the fixed ramps (no in-between colours);
- lone pixels folded into their cluster;
- the bones made crisp ivory with a shaded side;
- the helm given its slit visor and a lit dome;
- each pauldron a lit crescent on its upper-left;
- the iron a lit column on the light side of each plate.

Writes frame.png and frame_6x.png beside this file, and a comparison beside the Tithe-Hand and today's sprite.
"""
import json, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", "..", "..", ".."))
BASE = os.path.join(HERE, "base.png")

def C(h):
    h = h.lstrip("#"); return np.array([int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)], float)

IRON = [C(c) for c in ("#060509", "#0e0b11", "#18131a", "#241c24", "#33292f", "#45383c", "#5d4c4e", "#7b6865", "#9d8a83")]
CLOTH = [C(c) for c in ("#050b0a", "#0b1614", "#12211e", "#1a2f2a", "#24413a", "#33584d", "#5e9a85")]
BONE = [C(c) for c in ("#3a2622", "#6a4a3c", "#a07e66", "#cdb091", "#ecd9bf", "#fbf1e2")]
PLUME = [C(c) for c in ("#1a4337", "#2f6b56", "#4f9a7f", "#86c7ad", "#c2ebd9", "#f0fcf6")]
LEATH = [C(c) for c in ("#160e0b", "#271912", "#3b2619", "#4f3421")]
RAMPS = {"iron": IRON, "cloth": CLOTH, "bone": BONE, "plume": PLUME, "leath": LEATH}

im = Image.open(BASE).convert("RGBA")
a = np.asarray(im).astype(float)
H, W = a.shape[:2]
alpha = a[..., 3] > 0

def kind_of(p, y):
    r, g, b = p
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    if y < H * 0.16 and g > r + 30 and lum > 70:
        return "plume"
    if r > 110 and r > b + 20:
        return "bone"
    if g > r + 4 and g >= b - 6:
        return "cloth"
    if r > g + 10 and r > b + 6:
        return "leath"
    return "iron"

# what each pixel is comes from the renderer (the material of the shape that painted it), never guessed from colour
MAT = json.load(open(os.path.join(HERE, "base_mat.json")))
KIND = {"iron": "iron", "ironw": "iron", "mail": "iron", "cloth": "cloth", "bone": "bone", "plume": "plume", "leather": "leath"}
K = np.full((H, W), "", object)
for y in range(H):
    for x in range(W):
        if alpha[y, x]:
            m = MAT[y][x] if y < len(MAT) and x < len(MAT[y]) else ""
            K[y, x] = KIND.get(m, "iron") if m else "iron"
            if K[y, x] == "bone":
                # one body part (the skirt) mixes bone, mail and cloth: there the colour decides between them
                r, g, bl = a[y, x, :3]
                if not (r > 95 and r > bl + 15):
                    K[y, x] = "cloth" if g > r + 4 else "iron"
# fold lone pixels into their cluster (bones and plume kept: they're the point)
for _ in range(2):
    K2 = K.copy()
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            k = K[y, x]
            if not k or k in ("bone", "plume"):
                continue
            nb = [K[y - 1, x], K[y + 1, x], K[y, x - 1], K[y, x + 1]]
            nb = [n for n in nb if n and n not in ("bone",)]
            if nb and k not in nb:
                K2[y, x] = max(set(nb), key=nb.count)
    K = K2

def snap(k, p):
    ramp = RAMPS[k]
    d = [np.sum((c - p) ** 2) for c in ramp]
    return int(np.argmin(d))

I = np.zeros((H, W), int)
for y in range(H):
    for x in range(W):
        if K[y, x]:
            I[y, x] = snap(K[y, x], a[y, x, :3])

def same(y, x, k):
    return 0 <= y < H and 0 <= x < W and K[y, x] == k

# the light: lit column on the upper-left edge of every cluster, shadow on its lower-right
J = I.copy()
for y in range(H):
    for x in range(W):
        k = K[y, x]
        if not k or k == "plume":
            continue
        n = len(RAMPS[k])
        if not same(y, x - 1, k) or not same(y - 1, x, k):
            J[y, x] = min(n - 1, I[y, x] + (2 if k == "bone" else 1))
        elif not same(y, x + 1, k) or not same(y + 1, x, k):
            J[y, x] = max(0, I[y, x] - 1)
# bones: crisp; the core of each bone pixel run is ivory, its right side shaded
for y in range(H):
    for x in range(W):
        if K[y, x] == "bone":
            J[y, x] = 4 if same(y, x + 1, "bone") or not same(y, x - 1, "bone") else 2
            if not same(y, x + 1, "bone"):
                J[y, x] = max(J[y, x] - 1, 2)

out = np.zeros((H, W, 4), np.uint8)
for y in range(H):
    for x in range(W):
        if K[y, x]:
            out[y, x, :3] = RAMPS[K[y, x]][J[y, x]]
            out[y, x, 3] = 255

# the helm: find its rows (the first iron below the plume's root), cut the slit visor, light the dome
iron_rows = [y for y in range(H) if any(K[y, x] == "iron" for x in range(W))]
plume_rows = [y for y in range(H) if any(K[y, x] == "plume" for x in range(W))]
top = max(plume_rows) + 1 if plume_rows else iron_rows[0]
helm_rows = [y for y in range(top, min(H, top + 30)) if sum(1 for x in range(W) if K[y, x] == "iron") >= 6]
if helm_rows:
    hy = helm_rows[0]
    xs = [x for x in range(W) if K[hy + 4, x] == "iron"] if hy + 4 < H else []
    if xs:
        hx0, hx1 = min(xs), max(xs)
        for x in range(hx0 + 1, hx1):
            out[hy + 5, x, :3] = IRON[0]                 # the slit visor
            out[hy + 4, x, :3] = BONE[2] if (x - hx0) % 2 == 0 else BONE[1]   # the bone brow band, marked
        for x in range(hx0 + 1, hx0 + 3):
            out[hy + 1, x, :3] = IRON[7]                 # the dome's light
            out[hy + 2, x - 1 if x > hx0 + 1 else x, :3] = IRON[6]
# ---------------------------------------------------------------- by body part (the renderer says which part every pixel is)
PART = json.load(open(os.path.join(HERE, "base_part.json")))
def part(x, y):
    return PART[y][x] if 0 <= y < len(PART) and 0 <= x < len(PART[y]) else ""
def setc(x, y, c):
    if 0 <= x < W and 0 <= y < H and out[y, x, 3] > 0:
        out[y, x, :3] = np.clip(c, 0, 255)

# the pauldrons: hard plate, not lumps. Each lame a lit top row, a body, and a black line under it.
for side in ("L", "R"):
    pix = [(x, y) for y in range(H) for x in range(W) if part(x, y).startswith("pauldron") and part(x, y).endswith(side)]
    if not pix:
        continue
    ytop = min(y for x, y in pix)
    for (x, y) in pix:
        # three lames: only each lame's lower edge is a dark line; its face keeps its own light, lit on the left
        rowi = (y - ytop) % 5
        lit = part(x - 1, y) == "" or not part(x - 1, y).startswith("pauldron")
        face = int(J[y, x]) if K[y, x] == "iron" else 3
        c = IRON[0] if rowi == 4 else IRON[min(8, face + (2 if lit else 0) + (1 if rowi == 0 else 0))]
        setc(x, y, c)
    # a rivet on each lame's face
    xs = sorted(set(x for x, y in pix))
    xm = xs[len(xs) // 3]
    for k in range(3):
        y = ytop + 1 + 4 * k
        if (xm, y) in pix:
            setc(xm, y, IRON[8])

# the legs: each its own lit edge and shaded edge, a bright knee, so they stand apart from the cloak
for (x, y) in [(x, y) for y in range(H) for x in range(W) if part(x, y).split(".")[0] in ("thigh", "knee", "greave", "sabaton", "sabaton_toe")]:
    me = part(x, y).split(".")[-1]
    left = part(x - 1, y).split(".")[-1] != me or part(x - 1, y).split(".")[0] not in ("thigh", "knee", "greave", "sabaton")
    right = part(x + 1, y).split(".")[-1] != me or part(x + 1, y).split(".")[0] not in ("thigh", "knee", "greave", "sabaton")
    if left:
        setc(x, y, IRON[6])
    elif right:
        setc(x, y, IRON[1])
for side in ("L", "R"):
    kp = [(x, y) for y in range(H) for x in range(W) if part(x, y) == "knee." + side]
    if kp:
        x0 = min(x for x, y in kp); y0 = min(y for x, y in kp)
        setc(x0 + 1, y0 + 1, IRON[8]); setc(x0 + 2, y0 + 1, IRON[7])

# the cloak: long hanging folds, light ridge then shadowed hollow, wavering down
for (x, y) in [(x, y) for y in range(H) for x in range(W) if part(x, y) in ("cloak", "mantle")]:
    # broad folds, not stripes: a fold every 7 px, its hollow one step darker, its ridge one step lighter
    ph = (x + int(2.0 * np.sin(y * 0.12 + x * 0.3))) % 7
    base = int(J[y, x]) if K[y, x] == "cloth" else 2
    if ph == 0:
        setc(x, y, CLOTH[max(0, base - 1)])
    elif ph == 4:
        setc(x, y, CLOTH[min(6, base + 1)])

# the plume: redrawn as one pale flame, a bright core up the light side, licks tearing off the top
pp = [(x, y) for y in range(H) for x in range(W) if part(x, y) == "plume"]
if pp:
    px0 = min(x for x, y in pp); px1 = max(x for x, y in pp); py0 = min(y for x, y in pp); py1 = max(y for x, y in pp)
    for (x, y) in pp:
        u = (x - px0) / max(1, px1 - px0)
        t = (y - py0) / max(1, py1 - py0)
        k = 5 if u < 0.3 and t > 0.3 else (4 if u < 0.55 else (3 if u < 0.8 else 2))
        if t < 0.2:
            k = min(k, 3)
        setc(x, y, PLUME[k])
    for (dx, dy, k) in ((1, -1, 3), (2, -2, 2), (px1 - px0 + 1, 1, 2), (px1 - px0 + 2, 0, 1), (-1, 2, 2)):
        x, y = px0 + dx, py0 + dy
        if 0 <= x < W and 0 <= y < H:
            out[y, x, :3] = PLUME[k]; out[y, x, 3] = 255

# ---------------------------------------------------------------- placed by hand (coordinates read off a 10x grid of this frame)
def put(x, y, c):
    if 0 <= x < W and 0 <= y < H and out[y, x, 3] > 0:
        out[y, x, :3] = np.clip(c, 0, 255)

def charm(x, y, length):
    """a long bone hung from its cord: a knuckled head, a 2-px shaft (ivory, its right side in shade), a knuckled foot"""
    put(x - 1, y, BONE[3]); put(x, y, BONE[5]); put(x + 1, y, BONE[2])
    for yy in range(y + 1, y + length):
        put(x, yy, BONE[4]); put(x + 1, yy, BONE[2])
    put(x - 1, y + length, BONE[3]); put(x, y + length, BONE[4]); put(x + 1, y + length, BONE[1])
    put(x + 2, y + 1, IRON[0])                          # its shadow on the plate

def sag(x):                                             # the cord sags across the chest
    return 39 + int(round(2.2 * (1 - ((x - 24.5) / 6.5) ** 2)))
for x in range(18, 32):
    put(x, sag(x), LEATH[3] if x % 2 else LEATH[1])
for x, ln in ((19, 4), (22, 6), (25, 8), (28, 5), (31, 3)):
    charm(x, sag(x) + 1, ln)                             # five bones on the chest, each its own length
for x, y, ln in ((19, 62, 5), (23, 63, 8), (26, 62, 6), (29, 63, 4)):
    charm(x, y, ln)                                      # four at the belt (nine in all)
for x in range(20, 28):
    put(x, 29, IRON[0])                                  # the slit visor
for x in range(20, 28, 2):
    put(x, 27, BONE[3])                                  # the brow band's marks
put(20, 22, IRON[8]); put(21, 21, IRON[7])               # the dome's light

img = Image.fromarray(out, "RGBA")
img.save(os.path.join(HERE, "frame.png"))
img.resize((W * 6, H * 6), Image.NEAREST).save(os.path.join(HERE, "frame_6x.png"))

# the comparison at game scale: the Tithe-Hand (browser), this frame, today's 1:1 sprite
def atlas(kind, key):
    d = json.load(open(os.path.join(ROOT, "art", "sprites", kind + ".json")))
    s, x, y, w, h, dx, dy = d["idx"][key]
    return Image.open(os.path.join(ROOT, "art", "sprites", d["sheets"][s])).convert("RGBA").crop((x, y, x + w, y + h))
hand = atlas("hound", "idle/front/0")
now = atlas("ossuarch_hd", "idle/front/0")
SC = 8 / 3                                               # an art pixel at the creatures' scale (~2.7 screen px)
mine = img.resize((round(W * SC), round(H * SC)), Image.NEAREST)
hand_s = hand.resize((round(hand.width * 1.3), round(hand.height * 1.3)), Image.NEAREST)   # true size, as in the game
Wc = hand_s.width + mine.width + now.width + 60; Hc = max(mine.height, now.height, hand_s.height) + 20
c = Image.new("RGBA", (Wc, Hc), (20, 18, 24, 255)); x = 10
for part in (hand_s, mine, now):
    c.alpha_composite(part, (x, Hc - 10 - part.height)); x += part.width + 20
c.resize((c.width * 2, c.height * 2), Image.NEAREST).save(os.path.join(HERE, "compare_2x.png"))
print("frame", img.size, "compare", c.size)
