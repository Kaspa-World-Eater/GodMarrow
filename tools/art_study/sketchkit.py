"""A pencil sketching kit (Derek 2026-10-06: the first sketch "looks like a child drew it").

What makes a drawing read as trained, and so what this does:
- every part is a closed designed shape, drawn back to front; each part's paper covers what is behind it, so a near
  form's contour cuts across a far one (real overlaps, T-junctions), instead of lines crossing through each other;
- line weight follows the light: thin and broken on the lit edge, heavy on the edge turned away and where a form
  overlaps another;
- hatching on each form's shadow side, its density by how dark, cross-hatched in the core shadow, broken and slightly
  irregular like a hand's;
- detail strokes taper (thin at both ends).
The light comes from the upper left.
"""
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

RNG = np.random.default_rng(12)
GRAPH = np.array([40, 34, 30], float)


def spline(pts, n=16, closed=False):
    pts = np.array(pts, float)
    if closed:
        P = np.vstack([pts[-1], pts, pts[0], pts[1]])
    else:
        P = np.vstack([pts[0] * 2 - pts[1], pts, pts[-1] * 2 - pts[-2]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    if not closed:
        out.append(P[-2])
    return np.array(out)


class Sheet:
    def __init__(self, w, h, light=(-0.6, -0.8)):
        self.W, self.H = w, h
        self.YY, self.XX = np.mgrid[0:h, 0:w].astype(float)
        tooth = (RNG.random((h, w)) - 0.5) * 8 + (self._vn(self.XX * 0.05, self.YY * 0.05) - 0.5) * 10
        self.paper = np.dstack([224 + tooth, 214 + tooth, 194 + tooth])
        self.img = self.paper.copy()
        L = np.array(light, float)
        self.L = L / np.linalg.norm(L)

    @staticmethod
    def _vn(x, y):
        P = np.random.default_rng(3).random((256, 256))
        xi, yi = np.floor(x).astype(int), np.floor(y).astype(int)
        xf, yf = x - xi, y - yi
        u, v = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
        h = lambda a, b: P[a % 256, b % 256]
        return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v

    def _ink(self, mask, alpha):
        a = np.clip(alpha, 0, 1)[..., None] * mask[..., None]
        self.img = self.img * (1 - a) + GRAPH * a

    def mask_of(self, pts, closed=True, n=16):
        c = spline(pts, n, closed)
        im = Image.new("L", (self.W, self.H), 0)
        ImageDraw.Draw(im).polygon([tuple(q) for q in c], fill=1)
        return np.array(im) > 0, c

    def shape(self, pts, shade=0.0, hatch_ang=None, weight=1.0, fill=True, tone=0.0, puff=0.55):
        """a closed form: cover what is behind it, hatch its shadow side, draw its contour weighted by the light.
        shade: extra darkness (0..1) for forms that sit in shadow; hatch_ang: the hatching's direction (radians)
        so it can follow the form; puff: how round the form is (higher = rounder shading)."""
        m, c = self.mask_of(pts)
        if fill:
            self.img[m] = self.paper[m] * (1 - tone) + np.array([150, 140, 125]) * tone
        # the form's shading: a height from its distance-to-edge, lit from the upper left
        d = ndimage.distance_transform_edt(m)
        h = d ** puff
        gy, gx = np.gradient(h)
        n3 = np.dstack([-gx, -gy, np.full_like(gx, 0.35)])
        n3 /= np.linalg.norm(n3, axis=2, keepdims=True)
        L3 = np.array([self.L[0], self.L[1], 0.75])
        L3 /= np.linalg.norm(L3)
        lit = np.clip((n3 * L3).sum(2), 0, 1)
        dark = np.clip(0.62 - lit + shade, 0, 1) * m
        self.hatch(m, dark, hatch_ang)
        self.contour(c, m, weight)
        return m

    def hatch(self, m, dark, ang=None):
        if ang is None:
            ang = np.arctan2(self.L[1], self.L[0]) + np.pi / 2 + 0.3
        XX, YY = self.XX, self.YY
        jit = self._vn(XX * 0.15, YY * 0.15) * 2.0
        for k, (thr, a_off, sp) in enumerate([(0.18, 0.0, 5.0), (0.36, 0.0, 2.6), (0.5, 1.15, 4.0), (0.66, -0.6, 3.0)]):
            a = ang + a_off
            u = XX * np.cos(a) + YY * np.sin(a) + jit
            line = (np.abs((u % sp) - sp / 2) < 0.55) & (dark > thr)
            broken = self._vn(XX * 0.35 + k * 7, YY * 0.35) > 0.25          # a hand's strokes break
            self._ink(line & broken & m, 0.55 + dark * 0.35)

    def contour(self, c, m, weight=1.0):
        im = Image.new("L", (self.W, self.H), 0)
        dr = ImageDraw.Draw(im)
        n = len(c)
        for i in range(n):
            a, b = c[i], c[(i + 1) % n]
            t = b - a
            ln = np.hypot(*t) + 1e-6
            nrm = np.array([t[1], -t[0]]) / ln
            mid = (a + b) / 2
            probe = (mid + nrm * 2).astype(int)
            if 0 <= probe[0] < self.W and 0 <= probe[1] < self.H and m[probe[1], probe[0]]:
                nrm = -nrm                                                  # make it point outward
            facing = float(nrm @ self.L)                                     # > 0: the edge faces the light
            w = weight * (2.6 - 1.7 * np.clip(facing + 0.2, 0, 1))
            if facing > 0.45 and self._vn(np.array(mid[0] * 0.08), np.array(mid[1] * 0.08)) > 0.62:
                continue                                                    # the lit edge lost in places
            dr.line([tuple(a), tuple(b)], fill=255, width=max(1, int(round(w))))
        a = np.array(im) / 255.0
        self._ink(a > 0, 0.9)

    def stroke(self, pts, w=1.6, alpha=0.85, clip=None):
        """a tapered detail stroke"""
        c = spline(pts, 12)
        im = Image.new("L", (self.W, self.H), 0)
        dr = ImageDraw.Draw(im)
        n = len(c)
        for i in range(n - 1):
            f = i / max(n - 2, 1)
            ww = w * (0.35 + 0.65 * np.sin(np.pi * f))
            dr.line([tuple(c[i]), tuple(c[i + 1])], fill=255, width=max(1, int(round(ww))))
        a = np.array(im) > 0
        if clip is not None:
            a &= clip
        self._ink(a, alpha)

    def dark(self, pts, alpha=0.85):
        """a hole or a deep crevice: filled dark, its edge soft"""
        m, c = self.mask_of(pts)
        self._ink(m, alpha)
        return m

    def construct(self, pts, closed=False):
        c = spline(pts, 16, closed)
        im = Image.new("L", (self.W, self.H), 0)
        ImageDraw.Draw(im).line([tuple(q) for q in c], fill=255, width=1)
        a = np.array(im) > 0
        aa = a[..., None] * 0.35
        self.img = self.img * (1 - aa) + np.array([120, 128, 150]) * aa

    def save(self, path, scale=1):
        im = Image.fromarray(np.clip(self.img, 0, 255).astype(np.uint8))
        if scale != 1:
            im = im.resize((self.W * scale, self.H * scale), Image.LANCZOS)
        im.save(path)
