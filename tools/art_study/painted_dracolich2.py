"""The dracolich, test 2, started over from Derek's reference painting (a dark concept piece, 2026-10-06): "Scrap the
statue. It's bad. Start over. Use the last image as the reference."

What the reference does, and so what this does:
- value: almost all of it a dark mass against a near-black sky, lifting into a pale cold mist low on the right; the one
  bright thing the bleached skull, so the eye goes there first;
- the skull: bare bone turned toward us, the jaw gaping with long fangs, antler-branching horns, black orbits;
- the defining thing: the chest split open down its middle into a dark chasm, the ribs lining it like teeth pointing
  inward: the body is a second mouth;
- the hide: dusky mauve-grey, rough and peeling, rows of bone spikes down the neck and back;
- the arms: bony, wrapped in leathery strips, great dark claws gripping a ledge;
- edges soft and lost in the shadows, hard only where the light catches bone.
Painted to docs/PAINTED_STANDARD.md: broad tones, hue-shifted ramps, a light dither only where tones meet, forms built
in depth and lit (a key from the upper right, a cold rim from the mist), then atmosphere.

  python tools/art_study/painted_dracolich2.py OUT.png [OUT.webp]
"""
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

RNG = np.random.default_rng(5)
_P = RNG.random((1024, 1024))
B4 = np.array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]).reshape(4, 4) / 16.0 + 1 / 32
W, H = 240, 320
YY, XX = np.mgrid[0:H, 0:W].astype(float)
BAY = B4[YY.astype(int) % 4, XX.astype(int) % 4]


def vn(x, y):
    xi, yi = np.floor(x).astype(int), np.floor(y).astype(int)
    xf, yf = x - xi, y - yi
    u, v = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    def h(a, b):
        return _P[a % 1024, b % 1024]
    return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v


def fbm(x, y):
    return vn(x, y) * 0.55 + vn(x * 2.1 + 9, y * 2.1 + 9) * 0.3 + vn(x * 4.3 + 3, y * 4.3 + 3) * 0.15


def hexc(s):
    s = s.lstrip("#")
    return [int(s[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def ramp(*cs):
    return np.array([hexc(c) for c in cs])


RAMPS = {
    "hide": ramp("#08070a", "#0f0c11", "#171218", "#221a21", "#30242c", "#45343c", "#5e4a4e"),   # dusky mauve, near-black
    "bone": ramp("#1a1716", "#363029", "#5a4f44", "#857766", "#b0a28c", "#d4cab4", "#eee6d4"),
    "claw": ramp("#0b0908", "#1a1512", "#2e251e", "#463a2e", "#64543f", "#8a7656"),
    "strap": ramp("#0c0907", "#1c140e", "#2e2016", "#44301e", "#5e4428"),
    "rock": ramp("#08090c", "#121519", "#1d2227", "#2a3036", "#3a4148", "#535b62"),
}


def poly(points):
    im = Image.new("L", (W, H), 0)
    ImageDraw.Draw(im).polygon([tuple(map(float, q)) for q in points], fill=1)
    return np.array(im) > 0


class Body:
    def __init__(self):
        self.Z = np.full((H, W), -999.0)
        self.part = np.full((H, W), "", dtype=object)

    def put(self, zf, mask, name):
        upd = mask & (zf > self.Z)
        self.Z = np.where(upd, zf, self.Z)
        self.part = np.where(upd, name, self.part)

    def limb(self, pts, r0, r1, z0, z1, name, flat=1.0):
        pts = np.array(pts, float)
        seg = np.cumsum(np.r_[0, np.hypot(*np.diff(pts, axis=0).T)])
        Lt = seg[-1]
        for i in range(len(pts) - 1):
            a, b = pts[i], pts[i + 1]
            d = b - a
            L2 = (d * d).sum()
            t = np.clip(((XX - a[0]) * d[0] + (YY - a[1]) * d[1]) / L2, 0, 1)
            dist = np.hypot(XX - a[0] - t * d[0], YY - a[1] - t * d[1])
            f = (seg[i] + t * np.sqrt(L2)) / Lt
            r = r0 + (r1 - r0) * f
            self.put(z0 + (z1 - z0) * f + np.sqrt(np.clip(r * r - dist * dist, 0, None)) * flat, dist < r, name)

    def lump(self, cx, cy, rx, ry, cz, rz, name, rot=0.0):
        c, s_ = np.cos(rot), np.sin(rot)
        u = (XX - cx) * c + (YY - cy) * s_
        v = -(XX - cx) * s_ + (YY - cy) * c
        e = 1 - (u / rx) ** 2 - (v / ry) ** 2
        self.put(cz + rz * np.sqrt(np.clip(e, 0, None)), e > 0, name)

    def cone(self, base, tip, r, z, name):
        """a spike or a fang: a cone from its base to its point"""
        self.limb([base, tip], r, 0.3, z, z + 1, name)


def along(pts, t):
    pts = np.array(pts, float)
    seg = np.cumsum(np.r_[0, np.hypot(*np.diff(pts, axis=0).T)])
    s_ = t * seg[-1]
    i = max(min(np.searchsorted(seg, s_) - 1, len(pts) - 2), 0)
    f = (s_ - seg[i]) / max(seg[i + 1] - seg[i], 1e-6)
    d = pts[i + 1] - pts[i]
    return pts[i] + d * f, d / (np.hypot(*d) + 1e-6)


def build():
    B = Body()
    # ---- the ledge the claws grip, along the bottom
    ledge = poly([(0, 300), (40, 292), (90, 298), (140, 290), (196, 296), (240, 288), (240, 320), (0, 320)])
    B.put(np.where(ledge, 6 + (fbm(XX * 0.06, YY * 0.06) - 0.5) * 8, -999), ledge, "rock")
    # ---- the torso: a great dark mass, shoulders broad, the chest deep
    B.lump(118, 196, 58, 62, 10, 40, "hide", rot=0.15)
    B.lump(118, 262, 46, 34, 10, 30, "hide")
    B.lump(80, 176, 34, 30, 30, 22, "hide", rot=0.4)                 # the near shoulder
    B.lump(168, 182, 30, 28, 24, 20, "hide", rot=-0.4)               # the far shoulder
    # ---- the neck: thick from the shoulders, rising and curving up to the skull, its back toward the left
    neck = [(110, 168), (112, 136), (126, 108), (148, 88), (168, 70)]
    B.limb(neck, 24, 12, 36, 52, "hide")
    # spikes: rows down the neck's back (its left/upper side) and out over the shoulders
    for k in range(16):
        p, d = along(neck, k / 15.0)
        nx, ny = -d[1], d[0]                                          # toward the neck's left (its back)
        r_here = 30 + (15 - 30) * k / 15.0
        for row, (off, ln) in enumerate([(0.95, 11), (0.7, 7), (0.45, 5)]):
            if row == 2 and k % 2:
                continue
            bx, by = p[0] + nx * r_here * off, p[1] + ny * r_here * off
            tip = (bx + nx * ln + d[0] * 3, by + ny * ln + d[1] * 3 - 2)
            B.cone((bx, by), tip, 2.4 - row * 0.5, 50 + k * 1.0 - row * 3, "spike")
    for k in range(9):                                                  # down the back, over the near shoulder
        bx, by = 52 + k * 6, 158 + k * 1.5 + np.sin(k) * 2
        B.cone((bx, by), (bx - 7 + k * 0.5, by - 10), 2.2, 54, "spike")
    # ---- the chest split open: a dark chasm down its middle, the ribs lining it like teeth pointing in
    chasm = poly([(112, 156), (122, 160), (126, 176), (134, 200), (132, 222), (138, 246), (130, 282), (120, 290), (112, 274), (104, 250), (108, 228), (102, 204), (108, 182)])
    chasm &= ~((vn(XX * 0.3, YY * 0.3) > 0.7) & ~ndimage.binary_erosion(chasm, iterations=3))
    for k in range(10):                                                 # the ribs: pale, curving inward and down
        y0 = 166 + k * 12
        ln = (20 - abs(k - 4) * 1.2) * (0.45 if k in (2, 7) else 1.0) * (0.8 + _P[k, 3] * 0.4)
        lx = 104 - (2 if 3 < k < 8 else 0) - k * 0.1
        B.limb([(lx - 16, y0 - 6), (lx - 4, y0), (lx + ln * 0.45, y0 + 7)], 3.4 - k * 0.12, 0.6, 52, 56, "rib")
        rx_ = 136 + (2 if 3 < k < 8 else 0)
        B.limb([(rx_ + 15, y0 - 5), (rx_ + 3, y0 + 1), (rx_ - ln * 0.4, y0 + 8)], 3.2 - k * 0.12, 0.6, 50, 54, "rib")
    # ---- the far arm (right): from the far shoulder out to the elbow, down to its claws on the ledge
    B.limb([(176, 190), (208, 222), (216, 248)], 15, 11, 30, 34, "hide")
    B.limb([(214, 246), (210, 280), (204, 298)], 10, 8, 34, 40, "arm")
    for k in range(4):
        bx = 188 + k * 9
        B.limb([(204, 296), (bx, 302)], 4.5, 4, 40, 42, "arm")
        B.limb([(bx, 302), (bx - 2, 312), (bx + 3, 318)], 3.6, 0.8, 42, 40, "claw")
    # ---- the near arm (left): the upper arm down and out, the forearm forward to a hand gripping the ledge's lip
    B.limb([(76, 186), (44, 226), (36, 252)], 18, 13, 40, 46, "hide")
    B.limb([(38, 250), (54, 280), (72, 296)], 12, 9, 46, 54, "arm")
    for k in range(4):
        bx = 52 + k * 11
        B.limb([(70, 294), (bx, 300)], 5.5, 5, 54, 56, "arm")
        B.lump(bx, 300, 5, 4.5, 56, 4, "arm")
        B.limb([(bx, 300), (bx - 3, 310), (bx + 2, 319)], 4.4, 1.0, 56, 54, "claw")
    # ---- the skull: a dragon's, long and low, three-quarter toward us; the snout running down-left, the near orbit at
    #      its side under a heavy brow, the far one barely showing; the jaw dropped; horns branching back like antlers
    B.lump(184, 54, 20, 15, 56, 15, "bone", rot=-0.3)                  # the cranium, back and up
    B.limb([(178, 58), (160, 70), (138, 86), (124, 98)], 14, 7, 60, 66, "bone", flat=0.7)   # the long upper jaw
    B.lump(166, 56, 8, 5, 72, 4, "bone", rot=-0.5)                    # the brow over the near orbit
    B.limb([(184, 66), (162, 80)], 4, 3, 70, 70, "bone")              # the cheek's arch
    B.limb([(192, 70), (170, 92), (146, 108), (130, 116)], 7, 4, 54, 60, "bone", flat=0.8)  # the lower jaw, dropped
    for pts_ in ([(194, 42), (206, 26), (212, 8)], [(206, 26), (224, 22)], [(209, 14), (200, 3)],
                 [(182, 42), (186, 22), (178, 6)], [(185, 26), (196, 14)]):
        B.limb(pts_, 3.4 if len(pts_) == 3 else 2.2, 0.9, 60, 58, "bone")
    for k in range(5):
        B.cone((186 + k * 5, 64 + k * 3), (196 + k * 6, 66 + k * 4), 2.0, 60, "bone")   # spurs behind the jaw
    Z, part = B.Z, B.part
    show = Z > -500
    hide_ = show & (part == "hide")
    sinew = (1 - np.abs(vn(XX * 0.09 + YY * 0.03, YY * 0.22) * 2 - 1)) * 3.0 + (vn(XX * 0.3, YY * 0.3) - 0.5) * 2.5
    Z = np.where(hide_ | (part == "arm"), Z + sinew, Z)
    Z = np.where(show & (part == "bone"), Z + (vn(XX * 0.4, YY * 0.4) - 0.5) * 1.6, Z)
    rag = hide_ & ~ndimage.binary_erosion(show, iterations=2) & (vn(XX * 0.35, YY * 0.35) > 0.55)
    show = show & ~rag
    # the mouth's dark, the orbits, the nasal holes
    mouth = poly([(184, 70), (190, 74), (168, 94), (144, 110), (130, 112), (128, 104), (150, 92), (170, 78)])
    orb_n = np.hypot((XX - 168) / 6.5, (YY - 62) / 4.5) < 1
    orb_f = np.hypot((XX - 190) / 2.5, (YY - 52) / 3) < 1
    nasal = (np.hypot((XX - 130) / 2.6, (YY - 94) / 1.8) < 1)
    fangs = np.zeros((H, W), bool)
    for k in range(7):                                                 # upper fangs down along the upper jaw
        x0, y0 = 178 - k * 7.0, 76 + k * 4.0
        ln = [8, 12, 6, 14, 7, 10, 5][k]
        fangs |= (np.abs(XX - x0 - (YY - y0) * 0.15) < 1.8 - (YY - y0) / (ln * 1.0)) & (YY > y0) & (YY < y0 + ln)
    for k in range(5):                                                 # lower fangs up from the jaw
        x0, y0 = 182 - k * 10.0, 82 + k * 7.5
        ln = [7, 10, 6, 9, 5][k]
        fangs |= (np.abs(XX - x0 + (y0 - YY) * 0.1) < 1.6 - (y0 - YY) / (ln * 1.1)) & (YY < y0) & (YY > y0 - ln)
    holes = (mouth | orb_n | orb_f | nasal) & ~fangs
    # the chasm in the chest: its dark, the ribs drawn over it
    chasm_dark = chasm & (part != "rib")
    # leather strips wound round the forearms
    strap = show & (part == "arm") & (np.abs(((XX * 0.35 + YY * 0.55) % 9) - 4.5) < 1.1) & (vn(XX * 0.2, YY * 0.2) > 0.3)
    return dict(Z=Z, part=part, show=show, holes=holes, fangs=fangs, chasm=chasm_dark, strap=strap, mouth=mouth)


S = build()


def light(Z, show):
    Zs = np.where(show, Z, -60.0)
    gy_, gx_ = np.gradient(Zs)
    gx_ = np.clip(gx_, -5, 5)
    gy_ = np.clip(gy_, -5, 5)
    n = np.dstack([-gx_, -gy_, np.ones_like(Z)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    L = np.array([0.45, -0.6, 0.62])                                  # the key: from the upper right
    L /= np.linalg.norm(L)
    dif = np.clip((n * L).sum(2), 0, 1)
    shad = np.zeros_like(Z, bool)
    hl = np.hypot(L[0], L[1])
    for k in range(1, 80):
        sx_ = np.clip((XX + L[0] / hl * k).astype(int), 0, W - 1)
        sy_ = np.clip((YY + L[1] / hl * k).astype(int), 0, H - 1)
        shad |= Zs[sy_, sx_] > Zs + k * L[2] / hl + 1.5
    dif = np.where(shad, dif * 0.1, dif)
    rimL = np.array([0.7, 0.45, 0.3])                                 # the cold rim: the mist below and right
    rimL /= np.linalg.norm(rimL)
    rim = np.clip((n * rimL).sum(2), 0, 1) ** 3 * (1 - n[..., 2]) ** 0.5
    Zb = Zs.copy()
    for _ in range(7):
        Zb = (Zb + np.roll(Zb, 2, 0) + np.roll(Zb, -2, 0) + np.roll(Zb, 2, 1) + np.roll(Zb, -2, 1)) / 5
    ao = np.clip((Zb - Zs) * 0.05, 0, 1)
    return n, dif, rim, ao


N_, DIF, RIM, AO = light(S["Z"], S["show"])


def frame(t):
    Z, part, show = S["Z"], S["part"], S["show"]
    # the sky: near-black above, lifting into a pale cold mist low and to the right
    sky_v = np.clip((YY / H) ** 1.6 * 0.9 + (XX / W) * 0.25 - 0.25 + (fbm(XX * 0.02 + t * 0.03, YY * 0.03) - 0.5) * 0.25, 0, 1)
    skyr = ramp("#07080b", "#0c0f14", "#131920", "#1e272e", "#2f3b42", "#46555a", "#66767a")
    rgb = skyr[np.clip((sky_v * 7 + (BAY - 0.5) * 0.25).astype(int), 0, 6)]
    breath = 0.5 + 0.5 * np.sin(t * 1.6)
    I = 0.04 + DIF * 0.85 + RIM * 0.45 - AO * 0.6
    # the hide: rough, peeling, brush-stroked along the forms; flecks of pale where bone shows through
    stroke = vn(XX * 0.12 + YY * 0.05, YY * 0.35 - XX * 0.1) * 0.6 + vn(XX * 0.4, YY * 0.4) * 0.4
    v = I * 0.85 + (stroke - 0.5) * 0.16 + (BAY - 0.5) * 0.03
    out = np.zeros((H, W, 3))
    for mt, rn, k_ in (("hide", "hide", 1.0), ("arm", "hide", 0.95), ("bone", "bone", 1.0), ("rib", "bone", 0.85),
                       ("spike", "bone", 0.8), ("claw", "claw", 1.0), ("rock", "rock", 0.9)):
        m = show & (part == mt)
        rp = RAMPS[rn]
        out[m] = rp[np.clip((v[m] * k_ * len(rp)).astype(int), 0, len(rp) - 1)]
    fleck = show & (part == "hide") & (vn(XX * 0.6, YY * 0.6) > 0.86) & (DIF > 0.25) & (YY < 200)
    out[fleck] = RAMPS["bone"][3]
    st = S["strap"]
    out[st] = RAMPS["strap"][np.clip((v[st] * 5).astype(int), 0, 4)]
    out[st & (np.roll(~st, 1, 0))] = RAMPS["strap"][4]                  # each strap's lit edge
    # the holes: the mouth and orbits black; the chasm black, a faint cold breath in its depth
    out[S["holes"]] = hexc("#050506")
    ch = S["chasm"]
    deep = ch & (np.abs(XX - 120) < 6 + np.sin(YY * 0.1) * 2)
    out[ch] = hexc("#060506")
    out[deep & (BAY < 0.22 * breath)] = hexc("#2a3438")
    fg = S["fangs"]
    out[fg] = RAMPS["bone"][np.clip(((I[fg] * 0.8 + 0.25) * 7).astype(int), 0, 6)]
    rgb = np.where(show[..., None], out, rgb)
    # edges: lost in the shadows (no outline there), a hard light edge only where the light catches bone
    edge = show & ~ndimage.binary_erosion(show)
    lit_edge = edge & (DIF > 0.4) & np.isin(part, ["bone", "spike", "rib"])
    rgb[lit_edge] = np.clip(rgb[lit_edge] * 1.25, 0, 1)
    # atmosphere: the lower body sinks into the cold mist, the mist drifting
    mist = np.clip((YY - 200) / 120, 0, 1) * (0.4 + 0.6 * fbm(XX * 0.03 - t * 0.05, YY * 0.05))
    lv = np.round(np.clip(mist * 0.6 + (BAY - 0.5) * 0.1, 0, 0.45) * 8) / 8
    rgb = rgb * (1 - lv[..., None]) + np.array(hexc("#4a585e")) * lv[..., None]
    return np.clip(rgb, 0, 1)


def main(out_png, out_webp=None):
    Image.fromarray((frame(0.4) * 255).astype(np.uint8)).resize((W * 3, H * 3), Image.NEAREST).save(out_png)
    print("saved", out_png)
    if out_webp:
        ims = [Image.fromarray((frame(i / 10.0) * 255).astype(np.uint8)).resize((W * 3, H * 3), Image.NEAREST) for i in range(30)]
        ims[0].save(out_webp, save_all=True, append_images=ims[1:], duration=100, loop=0, quality=85)
        print("saved", out_webp)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "dracolich2.png", sys.argv[2] if len(sys.argv) > 2 else None)
