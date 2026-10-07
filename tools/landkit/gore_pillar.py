"""The gore pillar (landkit asset). Derek 2026-10-07: "pull the pillars out, and keep the tendril on them, turn them into
assets". Kept as it stood in the Gate in the Flesh (passes 60-66): an old Doric shaft (column.py) on its plinth, gore
tendrils climbing it out of the ground (raw flesh ropes spiralling up, a branch forking off the other way, thinning to
creeping tips; vessel.py with the gore ramp), and pustules along them, each a sickly yellow light.

  climb(p_xy, ground_z, height, radius, seed) -> (tendrils, pustules)
      tendrils: [(points (N,3), tube radius, seed)], pustules: [(position xyz, radius, phase)]
  pillar(p_xy, ground_z, height, seed) -> dict(shaft=column.shaft, tendrils=..., pustules=...)
  draw(img, zb, dep, to_px, pillar, T, lights, moon)  draws the shaft, its tendrils and its pustules (their light is
      the caller's to add to its lights: pustule_lights(pillar))
  python gore_pillar.py OUT.png [height] [seed]      a lone preview, lit by its own pustules
"""
import sys
import numpy as np
import column
import vessel
from kit import ramp

R_GORE = ramp("#12060a", "#2a0b12", "#45121c", "#641c26", "#842a30", "#a33d3a", "#c25a4a")
SICKC = np.array([0.72, 0.8, 0.22])


def climb(p, g, hgt, prad=0.6, sd=1):
    rr = np.random.default_rng(sd + 500)
    tendrils, pustules = [], []
    for k in range(2):
        a0 = rr.uniform(0, 2 * np.pi)
        spin = rr.choice([-1, 1]) * rr.uniform(0.9, 1.6)
        top = g + 0.6 + rr.uniform(0.5, 1.0) * (hgt - 0.8)
        pts = []
        for s_ in np.linspace(0, 1, 90):
            if s_ < 0.12:                                                    # out of the ground and up the plinth
                f_ = s_ / 0.12
                rad, z = prad + 0.45 - f_ * 0.45, g - 0.15 + f_ * 0.62
            else:
                f_ = (s_ - 0.12) / 0.88
                rad, z = prad, g + 0.47 + f_ * (top - g - 0.47)
            a = a0 + spin * (z - g) + np.sin(s_ * 17 + sd) * 0.12
            pts.append((p[0] + np.cos(a) * rad, p[1] + np.sin(a) * rad, z))
        pts = np.array(pts)
        tendrils.append((pts, 0.15 + rr.uniform(0, 0.05), sd * 10 + k))
        j0 = int(rr.integers(30, 70))                                         # a branch forking off, the other way
        bp = []
        for s_ in np.linspace(0, 1, 40):
            z = pts[j0][2] + s_ * rr.uniform(0.8, 1.4)
            a = np.arctan2(pts[j0][1] - p[1], pts[j0][0] - p[0]) - spin * s_ * 1.6
            bp.append((p[0] + np.cos(a) * (prad - 0.02), p[1] + np.sin(a) * (prad - 0.02), min(z, top + 0.3)))
        tendrils.append((np.array(bp), 0.08, sd * 10 + k + 5))
        for j in rr.choice(np.arange(15, 88), size=int(rr.integers(2, 5)), replace=False):
            q = pts[j]
            out = np.array([q[0] - p[0], q[1] - p[1], 0.0])
            out /= np.linalg.norm(out) + 1e-9
            pr = rr.uniform(0.1, 0.2)
            pustules.append((q + out * (0.08 + pr * 0.55), pr, rr.uniform(0, 6.28)))
    return tendrils, pustules


def pillar(p, g, hgt, seed=40):
    t, pu = climb(p, g, hgt, 0.6, seed)
    return dict(shaft=column.shaft((p[0], p[1], g + 0.45), 0.5, max(hgt - 0.45, 0.3), seed=seed), tendrils=t, pustules=pu)


def pustule_lights(pl):
    return [(tuple(q), tuple(SICKC * (0.18 + pr * 1.0)), 0.7 + pr * 2.5) for (q, pr, ph) in pl["pustules"]]


def draw_pustules(img, zb, dep, to_px, pustules, T):
    GH, GW = img.shape[:2]
    for (q, pr, ph) in pustules:
        breath = 0.72 + 0.28 * np.sin(T * 6.283 + ph)
        sx, sy = to_px(tuple(q))
        rp = max(pr * 18, 1.2)
        for yy in range(int(sy - rp * 2.2), int(sy + rp * 2.2) + 1):
            for xx in range(int(sx - rp * 2.2), int(sx + rp * 2.2) + 1):
                if not (0 <= yy < GH and 0 <= xx < GW):
                    continue
                u, v = (xx + 0.5 - sx) / rp, (yy + 0.5 - sy) / rp
                r2 = u * u + v * v
                dd = q[0] + q[1] + 0.3
                if r2 <= 1:
                    if dd < zb[yy, xx] - 0.4 or dd < dep[yy, xx] - 0.6:
                        continue
                    k = np.sqrt(1 - r2)
                    col = np.array([0.95, 0.88, 0.55]) * (0.55 + 0.45 * k) * (0.6 + 0.5 * breath)
                    if r2 > 0.6:
                        col = col * 0.7 + np.array([0.5, 0.2, 0.1]) * 0.3
                    if (u + 0.35) ** 2 + (v + 0.4) ** 2 < 0.07:
                        col = np.array([1.0, 0.98, 0.9])
                    img[yy, xx] = np.clip(col, 0, 1)
                    zb[yy, xx] = max(zb[yy, xx], dd)
                elif r2 <= 2.4 and dd >= zb[yy, xx] - 0.5:
                    img[yy, xx] = img[yy, xx] * 0.7 + np.array([0.42, 0.06, 0.06]) * 0.3


def draw(img, zb, dep, to_px, pl, T, lights, moon, ambient=0.07):
    lts = list(lights) + pustule_lights(pl)
    column.draw(img, zb, dep, to_px, [pl["shaft"]], lts, moon, ambient=ambient)
    for (tp, tr, tsd) in pl["tendrils"]:
        vessel.draw(img, zb, dep, to_px, tp, tr, T, lts, moon, seed=tsd, tol=0.35, ramp_=R_GORE, taper=True)
    draw_pustules(img, zb, dep, to_px, pl["pustules"], T)
    return img


if __name__ == "__main__":
    from PIL import Image
    out = sys.argv[1] if len(sys.argv) > 1 else "gore_pillar.png"
    hgt = float(sys.argv[2]) if len(sys.argv) > 2 else 5.0
    seed = int(sys.argv[3]) if len(sys.argv) > 3 else 42
    GH, GW = 200, 120
    def to_px(q):
        x, y, z = q
        return GW / 2 + (x - y) * 18, GH - 24 + (x + y - 20) * 9 - z * 21
    img = np.zeros((GH, GW, 3)) + np.array([0.04, 0.03, 0.04])
    zb = np.full((GH, GW), -1e9)
    dep = np.full((GH, GW), -1e9)
    pl = pillar((10.0, 10.0), 0.0, hgt, seed)
    draw(img, zb, dep, to_px, pl, 0.3, [], np.array([-0.36, 0.13, 0.92]) / 1.0)
    Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).resize((GW * 4, GH * 4), Image.NEAREST).save(out)
    print("saved", out)
