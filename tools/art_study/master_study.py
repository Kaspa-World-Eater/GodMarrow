"""A master study: drawing a reference painting in pencil, measured from it as a student copies with a grid (Derek
2026-10-06: "I want you to literally draw the image I gave you"). The reference is someone else's signed painting, so
this is a private study only: kept here, never in the game.

How it is drawn:
- the figure separated from the ground by its colour (the creature's warm hide against the cold ground and mist);
- values measured from the painting, pushed into four graphite levels, the paper left for the lights;
- hatching laid along the forms: its direction from the painting's own local structure (strokes run along the
  contours, across the slope of the value), denser and cross-hatched as the value darkens;
- contours where the forms break (strong value edges and the figure's outline), heavier on the shadow side;
- the lightest bone left almost bare, picked out with a few dark accents.

  python tools/art_study/master_study.py REF.jpg OUT.png
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

RNG = np.random.default_rng(4)


def vn(x, y, seed=3):
    P = np.random.default_rng(seed).random((256, 256))
    xi, yi = np.floor(x).astype(int), np.floor(y).astype(int)
    xf, yf = x - xi, y - yi
    u, v = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    h = lambda a, b: P[a % 256, b % 256]
    return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v


def main(ref, out):
    src = np.array(Image.open(ref).convert("RGB")).astype(float) / 255.0
    Hh, Ww = src.shape[:2]
    S = 2                                                            # draw at twice the size for finer strokes
    src = np.array(Image.fromarray((src * 255).astype(np.uint8)).resize((Ww * S, Hh * S), Image.BICUBIC)).astype(float) / 255.0
    H, W = src.shape[:2]
    YY, XX = np.mgrid[0:H, 0:W].astype(float)
    r, g, b = src[..., 0], src[..., 1], src[..., 2]
    L = 0.3 * r + 0.59 * g + 0.11 * b
    Ls = ndimage.gaussian_filter(L, 1.2)
    # a dark painting is studied as charcoal: its full values, the local contrast lifted so the dark body still
    # parts from the dark ground (what the eye does looking at it)
    loc = Ls - ndimage.gaussian_filter(Ls, 24)
    v = np.clip((Ls - np.percentile(Ls, 2)) / (np.percentile(Ls, 99.7) - np.percentile(Ls, 2)), 0, 1) ** 0.6 + loc * 2.2
    v = np.clip(v, 0, 1)
    tone = 1 - v
    fig = np.ones_like(tone, bool)
    # the forms' direction: the structure tensor of the painting's values; strokes run across the slope
    gy, gx = np.gradient(ndimage.gaussian_filter(L, 2.0))
    Jxx = ndimage.gaussian_filter(gx * gx, 6)
    Jyy = ndimage.gaussian_filter(gy * gy, 6)
    Jxy = ndimage.gaussian_filter(gx * gy, 6)
    theta = 0.5 * np.arctan2(2 * Jxy, Jxx - Jyy) + np.pi / 2            # along the contour
    coh = np.sqrt((Jxx - Jyy) ** 2 + 4 * Jxy ** 2) / (Jxx + Jyy + 1e-6)
    theta = np.where(coh > 0.15, theta, np.pi * 0.3)                     # flat areas: a default diagonal
    # hatching layers: each a field of strokes along theta, broken like a hand's, by tone
    img = np.full((H, W), 1.0)
    ink = np.zeros((H, W))
    jit = vn(XX * 0.06, YY * 0.06) * 3.0
    for k, (thr, d_ang, sp, a) in enumerate([(0.12, 0.0, 7.0, 0.35), (0.3, 0.0, 3.6, 0.45), (0.48, 0.9, 4.6, 0.5),
                                              (0.64, -0.7, 3.4, 0.55), (0.8, 0.35, 2.4, 0.6)]):
        th = theta + d_ang
        # the stroke coordinate across the hatch; warped by the local angle (a flow, not a ruler)
        u = XX * np.cos(th + np.pi / 2) + YY * np.sin(th + np.pi / 2) + jit
        line = np.abs((u % sp) - sp / 2) < 0.6 + tone * 0.5
        brk = vn(XX * 0.09 + k * 11, YY * 0.09, seed=k + 5) > 0.22
        lay = line & brk & (tone > thr + (vn(XX * 0.2, YY * 0.2, seed=9) - 0.5) * 0.06)
        ink = np.maximum(ink, lay * a)
    # a soft graphite smudge under the hatching in the darkest parts, so they read as mass
    ink = np.maximum(ink, np.clip(tone - 0.55, 0, 1) * 0.55)
    # contours: the figure's outline and the strong breaks inside it, heavier where the form turns from the light
    edge_out = np.zeros_like(fig)
    gm = np.hypot(*np.gradient(ndimage.gaussian_filter(L, 1.5)))
    edge_in = gm > np.percentile(gm, 93)
    thin = ndimage.binary_erosion(edge_in, iterations=0) if False else edge_in
    shadow_side = ndimage.gaussian_filter(tone, 2) > 0.5
    contour = edge_out | (thin & (vn(XX * 0.05, YY * 0.05, seed=2) > 0.2))
    contour_heavy = ndimage.binary_dilation(contour & shadow_side, iterations=1)
    ink = np.maximum(ink, contour * 0.75)
    ink = np.maximum(ink, contour_heavy * 0.85)
    # the paper and the graphite
    paper = np.dstack([226 + (RNG.random((H, W)) - 0.5) * 9, 216 + (RNG.random((H, W)) - 0.5) * 9, 196 + (RNG.random((H, W)) - 0.5) * 9])
    graph = np.array([38, 34, 32], float)
    out_img = paper * (1 - ink[..., None]) + graph * ink[..., None]
    Image.fromarray(np.clip(out_img, 0, 255).astype(np.uint8)).save(out)
    print("saved", out, W, H)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
