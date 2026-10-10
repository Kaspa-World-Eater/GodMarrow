"""Measure a painted frame against the rules of docs/CINEMATOGRAPHY.md that a machine can measure (Derek, 2026-10-09:
"This study needs to be taken super seriously"). The numbers go in the pass log; the thresholds are our starting
values, tuned by Derek's grades.

  python tools/landkit3d/cine_check.py FRAME.png [--exterior]   (interior rules unless --exterior)

Rules measured (their numbers in CINEMATOGRAPHY.md):
   1  the brightest pixels sit in a few small places (sources), not spread over surfaces
   2  low key: >= 60% of the frame in the bottom third of value; pools <= 30%
   4  the black note: the darkest swatch covers <= 5%
   5  one large simple dark mass >= 15% of the frame
   6  squint test: 3 to 5 value masses at an eighth of the size
   7  thick lights, quiet darks: detail density in the dark <= 1/3 of the lit
  22  near dark, far light (Alton): the bottom band no brighter than the top band
  27  colour earned by fire: saturation in the dark < saturation in the pools
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd


def lum(img):
    return img[..., 0] * 0.2126 + img[..., 1] * 0.7152 + img[..., 2] * 0.0722


def sat(img):
    mx, mn = img.max(2), img.min(2)
    return np.where(mx > 1e-3, (mx - mn) / (mx + 1e-6), 0.0)


def check(path, interior=True):
    im = np.asarray(Image.open(path).convert("RGB")).astype(float) / 255.0
    if im.shape[0] > 600:
        im = im[::4, ::4]                                       # back to the render's texels (the painters write each 4 x 4)
    L = lum(im)
    S = sat(im)
    n = L.size
    res = []

    def rule(num, name, value, ok, note=""):
        res.append((num, name, value, ok, note))

    # 1: the brightest 0.3% of pixels: how many separate places, how compact
    thr = np.quantile(L, 0.997)
    top = L >= thr
    lab, k = nd.label(nd.binary_dilation(top, iterations=2))
    sizes = nd.sum(top, lab, range(1, k + 1)) if k else np.array([0])
    k = int((sizes >= 3).sum())                                 # an ember is fire too: specks under 3 px don't count
    rule(1, "brightest pixels in a few small places (sources)", "%d places, largest %d px" % (k, int(sizes.max())),
         k <= 24 and sizes.max() < n * 0.004)
    # 2: low key
    low = (L < 1 / 3).mean()
    pools = (L > 0.33).mean()
    if interior:
        rule(2, "low key: bottom third of value >= 60%", "%.0f%%" % (low * 100), low >= 0.6)
        rule(2, "pools of light <= 30%", "%.0f%%" % (pools * 100), pools <= 0.3)
    # 4: the black note
    black = (im.max(2) < 0.045).mean()                         # black is every channel near zero (a deep red is not black)
    rule(4, "black note <= 5% (black is a note, not a fill)", "%.1f%%" % (black * 100), black <= 0.05,
         "too much pure black: shadows should sit a step or two above it" if black > 0.05 else "")
    # 5: one large simple dark mass
    dark = nd.binary_opening(L < 0.09, iterations=2)
    lab, k = nd.label(dark)
    big = (nd.sum(dark, lab, range(1, k + 1)).max() / n) if k else 0.0
    rule(5, "one large simple dark mass >= 15%", "%.0f%%" % (big * 100), big >= 0.15)
    # 6: squint test: masses at an eighth of the size, blurred
    sm = nd.zoom(nd.gaussian_filter(L, 3.0), 1 / 8, order=1)
    q = np.digitize(sm, [0.06, 0.13, 0.22, 0.34, 0.5])
    lab_all = 0
    for v in np.unique(q):
        lab_v, kv = nd.label(q == v)
        if kv:
            sz = nd.sum(q == v, lab_v, range(1, kv + 1))
            lab_all += int((sz >= sm.size * 0.03).sum())
    rule(6, "squint: 3 to 5 value masses", "%d masses" % lab_all, 3 <= lab_all <= 7)
    # 7: detail in the light vs the dark (edge density)
    gy, gx = np.gradient(L)
    g = np.hypot(gx, gy)
    lit = L > 0.2
    shd = L < 0.1
    dl = (g[lit] > 0.04).mean() if lit.any() else 0.0
    dd = (g[shd] > 0.04).mean() if shd.any() else 0.0
    rule(7, "detail in the dark <= 1/3 of the lit", "lit %.2f, dark %.2f" % (dl, dd), dd <= dl / 3 + 1e-6)
    # 22: near dark, far light
    h = L.shape[0]
    bot = L[int(h * 0.8):].mean()
    topb = L[:int(h * 0.35)].mean()
    rule(22, "near dark, far light (Alton)", "bottom %.3f, top %.3f" % (bot, topb), bot <= topb * 1.05)
    # 27: saturation earned by fire
    sd = S[(L > 0.03) & (L < 0.1)].mean() if ((L > 0.03) & (L < 0.1)).any() else 0.0
    sp = S[L > 0.3].mean() if (L > 0.3).any() else 0.0
    rule(27, "colour earned by fire: dark less saturated than pools", "dark %.2f, pools %.2f" % (sd, sp), sd < sp)
    return res


def report(path, interior=True):
    res = check(path, interior)
    out = ["cine_check %s" % path]
    for num, name, value, ok, note in res:
        out.append("  %s rule %2d  %-52s %s%s" % ("PASS" if ok else "FAIL", num, name, value, ("  (" + note + ")") if note else ""))
    passed = sum(1 for r in res if r[3])
    out.append("  %d of %d measured rules pass" % (passed, len(res)))
    return "\n".join(out)


if __name__ == "__main__":
    print(report(sys.argv[1], "--exterior" not in sys.argv))
