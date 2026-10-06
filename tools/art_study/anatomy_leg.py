"""Round 8 practice: dreaming anatomy, not tubes (Derek: "You need to learn to dream anatomy. You keep making tubes").

One dragon foreleg, side view, four panels:
  1. tubes: capsules along the bones (how I had been building), the baseline;
  2. bones: the levers and their landmarks (shoulder blade, humerus, the elbow's point, forearm bones, wrist, digits);
  3. muscles dreamed onto the bones: each mass a designed lopsided contour with its belly near its origin, opposing
     masses peaking at different heights, overlapping, pinching to tendon at the joints;
  4. skin over all: draped, bunched in folds on the inside of the bend, knuckle pads, claws; lit, in the hide's ramp.

  python tools/art_study/anatomy_leg.py OUT.png
"""
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

PW, PH = 150, 220
YY, XX = np.mgrid[0:PH, 0:PW].astype(float)
B4 = np.array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]).reshape(4, 4) / 16.0 + 1 / 32
BAY = B4[YY.astype(int) % 4, XX.astype(int) % 4]
_P = np.random.default_rng(2).random((512, 512))


def vn(x, y):
    xi, yi = np.floor(x).astype(int), np.floor(y).astype(int)
    xf, yf = x - xi, y - yi
    u, v = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    def h(a, b):
        return _P[a % 512, b % 512]
    return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v


def hexc(s):
    s = s.lstrip("#")
    return [int(s[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def ramp(*cs):
    return np.array([hexc(c) for c in cs])


HIDE = ramp("#0e0b10", "#1c161d", "#2e232c", "#433440", "#5e4a54", "#836a6e", "#a88e86")
BONE = ramp("#1a1716", "#363029", "#5a4f44", "#857766", "#b0a28c", "#d4cab4", "#eee6d4")
MUSC = ramp("#140808", "#2a0f0e", "#481a16", "#6a2a20", "#8e4230", "#b4644a", "#d89276")
CLAW = ramp("#0b0908", "#1a1512", "#2e251e", "#463a2e", "#64543f", "#8a7656")


def poly(points):
    im = Image.new("L", (PW, PH), 0)
    ImageDraw.Draw(im).polygon([tuple(map(float, q)) for q in points], fill=1)
    return np.array(im) > 0


class Field:
    def __init__(self):
        self.Z = np.full((PH, PW), -99.0)
        self.part = np.full((PH, PW), "", dtype=object)

    def put(self, zf, mask, name):
        upd = mask & (zf > self.Z)
        self.Z = np.where(upd, zf, self.Z)
        self.part = np.where(upd, name, self.part)

    def tube(self, pts, r0, r1, z, name):
        pts = np.array(pts, float)
        seg = np.cumsum(np.r_[0, np.hypot(*np.diff(pts, axis=0).T)])
        for i in range(len(pts) - 1):
            a, b = pts[i], pts[i + 1]
            d = b - a
            L2 = (d * d).sum()
            t = np.clip(((XX - a[0]) * d[0] + (YY - a[1]) * d[1]) / L2, 0, 1)
            dist = np.hypot(XX - a[0] - t * d[0], YY - a[1] - t * d[1])
            f = (seg[i] + t * np.sqrt(L2)) / seg[-1]
            r = r0 + (r1 - r0) * f
            self.put(z + np.sqrt(np.clip(r * r - dist * dist, 0, None)), dist < r, name)

    def mass(self, contour, peak, z, h, name, sharp=0.55):
        """a designed mass: its contour drawn, its belly rising toward its peak (near its origin), lopsided"""
        m = poly(contour)
        d = ndimage.distance_transform_edt(m)
        dn = d / max(d.max(), 1)
        size = np.sqrt(m.sum())
        w = 0.45 + 0.55 * np.exp(-(np.hypot(XX - peak[0], YY - peak[1]) / (size * 0.55)) ** 2)
        self.put(z + h * dn ** sharp * w, m, name)

    def knob(self, cx, cy, r, z, h, name):
        e = 1 - ((XX - cx) / r) ** 2 - ((YY - cy) / r) ** 2
        self.put(z + h * np.sqrt(np.clip(e, 0, None)), e > 0, name)


# the skeleton (shared): the shoulder blade, humerus, the elbow's point behind, the forearm's two bones, wrist, digits
SHO, ELB, WRI = (80, 34), (96, 104), (70, 164)
DIGITS = [[(68, 170), (52, 184), (36, 192), (24, 198)], [(70, 172), (58, 190), (46, 200), (38, 206)],
          [(72, 172), (66, 192), (60, 204), (56, 212)]]


def bones(F, z=0):
    F.tube([(58, 8), (84, 36)], 7, 4, z, "bone")                       # scapula's spine
    F.knob(SHO[0] + 2, SHO[1], 9, z, 7, "bone")                         # the humerus's head
    F.tube([SHO, (92, 70), ELB], 6, 7, z, "bone")
    F.knob(ELB[0] + 2, ELB[1], 7, z, 6, "bone")
    F.tube([(ELB[0] + 4, ELB[1] - 2), (106, 102)], 5, 4, z, "bone")     # the elbow's point (olecranon) behind
    F.tube([ELB, (84, 134), WRI], 4.5, 4, z, "bone")                    # radius
    F.tube([(ELB[0] + 3, ELB[1] + 2), (88, 136), (74, 166)], 3.5, 3, z, "bone")   # ulna behind it
    F.knob(WRI[0], WRI[1], 6, z, 5, "bone")                              # carpals
    for dg in DIGITS:
        F.tube(dg, 3.2, 2.0, z, "bone")
        for p in dg[1:-1]:
            F.knob(p[0], p[1], 3.2, z, 3, "bone")


def tubes():
    F = Field()
    F.tube([SHO, ELB], 15, 12, 0, "hide")
    F.tube([ELB, WRI], 12, 8, 0, "hide")
    for dg in DIGITS:
        F.tube(dg, 5, 3, 4, "hide")
    for dg in DIGITS:
        F.tube([dg[-1], (dg[-1][0] - 4, dg[-1][1] + 6)], 2.5, 0.6, 8, "claw")
    return F


def muscles(F, z0=4):
    # the shoulder's cap over the humerus's head, peaking high and forward
    F.mass([(56, 18), (84, 14), (104, 26), (106, 50), (94, 62), (74, 58), (60, 42)], (80, 30), z0, 14, "musc")
    # triceps: the big mass behind the upper arm, swelling back early and high, pinching to the elbow's point
    F.mass([(92, 40), (110, 44), (122, 60), (118, 84), (108, 100), (100, 98), (94, 72)], (113, 58), z0 + 2, 16, "musc")
    # the front of the upper arm: its belly lower than the triceps' (so the outline zig-zags)
    F.mass([(70, 54), (82, 52), (92, 72), (92, 96), (84, 100), (74, 84)], (80, 80), z0 + 2, 12, "musc")
    # forearm, the top (extensors): fat near the elbow, falling slowly to tendon at the wrist
    F.mass([(84, 100), (98, 104), (98, 120), (84, 144), (74, 160), (70, 158), (74, 132)], (88, 112), z0 + 6, 11, "musc")
    # forearm, the underside (flexors): peaking lower and further back, a long slope to the wrist
    F.mass([(98, 106), (110, 110), (108, 132), (94, 150), (78, 164), (76, 158), (90, 134)], (104, 126), z0 + 4, 12, "musc")
    # the wrist pinched: tendons only, the carpals' knobs at the surface (from the bones)
    # the hand: a palm pad, a pad under each knuckle
    F.mass([(58, 168), (76, 164), (80, 178), (66, 190), (54, 186)], (66, 176), z0 + 2, 8, "musc")
    for dg in DIGITS:
        for p in dg[1:-1]:
            F.knob(p[0], p[1] + 2, 4.5, z0 + 4, 4, "musc")


def skinned():
    F = Field()
    bones(F)
    muscles(F)
    Z = F.Z.copy()
    show = Z > -50
    S = Z.copy()
    for _ in range(2):
        S = np.where(show, (S + np.roll(S, 1, 0) + np.roll(S, -1, 0) + np.roll(S, 1, 1) + np.roll(S, -1, 1)) / 5, S)
    S = np.maximum(S, Z - 0.6)                                          # skin softens the edges by its thickness
    # folds bunched on the inside of the bend (the front of the elbow), stretched smooth on the outside
    bend = np.hypot(XX - 86, YY - 104) < 14
    S = np.where(show & bend & (np.sin((XX * 0.6 + YY * 0.9)) > 0.55), S - 1.6, S)
    # tendons showing as ridges where the skin is thin above the wrist
    tend = show & (YY > 140) & (YY < 166) & (np.abs(((XX + YY * 0.55) % 5) - 2.5) < 0.6)
    S = np.where(tend, S + 0.8, S)
    F.Z = S
    for dg in DIGITS:
        tip = dg[-1]
        F.tube([tip, (tip[0] - 3, tip[1] + 5), (tip[0] - 1, tip[1] + 9)], 2.8, 0.6, S[int(tip[1]), int(tip[0])] - 2, "claw")
    return F


def light(F, rmp_by_part):
    Z, part = F.Z, F.part
    show = Z > -50
    Zs = np.where(show, Z, -30)
    gy, gx = np.gradient(Zs)
    n = np.dstack([-np.clip(gx, -4, 4), -np.clip(gy, -4, 4), np.ones_like(Z)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    L = np.array([-0.55, -0.6, 0.6])
    L /= np.linalg.norm(L)
    dif = np.clip((n * L).sum(2), 0, 1)
    sh = np.zeros_like(show)
    for k in range(1, 30):
        sx = np.clip((XX - 0.675 * k).astype(int), 0, PW - 1)
        sy = np.clip((YY - 0.737 * k).astype(int), 0, PH - 1)
        sh |= Zs[sy, sx] > Zs + k * 0.6 + 0.8
    dif = np.where(sh, dif * 0.15, dif)
    Zb = Zs.copy()
    for _ in range(5):
        Zb = (Zb + np.roll(Zb, 2, 0) + np.roll(Zb, -2, 0) + np.roll(Zb, 2, 1) + np.roll(Zb, -2, 1)) / 5
    ao = np.clip((Zb - Zs) * 0.08, 0, 1)
    I = 0.1 + dif * 0.95 - ao * 0.5 + (vn(XX * 0.3, YY * 0.3) - 0.5) * 0.06 + (BAY - 0.5) * 0.04
    out = np.full((PH, PW, 3), hexc("#0b0c10"))
    for nm, rp in rmp_by_part.items():
        m = show & (part == nm)
        out[m] = rp[np.clip((I[m] * len(rp)).astype(int), 0, len(rp) - 1)]
    edge = show & ~ndimage.binary_erosion(show)
    out[edge & (dif < 0.3)] *= 0.6
    return out


def main(out):
    panels = [
        ("tubes", light(tubes(), {"hide": HIDE, "claw": CLAW})),
        ("bones", None),
        ("muscles", None),
        ("skin", None),
    ]
    Fb = Field()
    bones(Fb)
    panels[1] = ("bones", light(Fb, {"bone": BONE}))
    Fm = Field()
    bones(Fm)
    muscles(Fm)
    panels[2] = ("muscles", light(Fm, {"bone": BONE, "musc": MUSC}))
    Fs = skinned()
    Fs.part = np.where((Fs.Z > -50) & (Fs.part != "claw"), "hide", Fs.part)
    panels[3] = ("skin", light(Fs, {"hide": HIDE, "claw": CLAW}))
    sheet = np.full((PH, PW * 4, 3), hexc("#0b0c10"))
    for i, (_, img) in enumerate(panels):
        sheet[:, i * PW:(i + 1) * PW] = img
    im = Image.fromarray((np.clip(sheet, 0, 1) * 255).astype(np.uint8)).resize((PW * 4 * 3, PH * 3), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for i, (nm, _) in enumerate(panels):
        d.text((i * PW * 3 + 12, 10), ["1  tubes (what I did)", "2  bones", "3  muscles dreamed on", "4  skin over all"][i], fill=(200, 196, 186))
    im.save(out)
    print("saved", out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "anatomy_leg.png")
