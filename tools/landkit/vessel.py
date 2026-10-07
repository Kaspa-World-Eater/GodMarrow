"""A vessel of the god (landkit): a vein as thick as a man's leg, threading in and out of the ground. Derek
2026-10-07: "a pulsating vein digs underground".

A true tube in 3D: dense spheres along a path, each lit through its real normal, so the tube is round, catches the moon
along its top and the warm light on its flank, and sinks into the ground where its path dives (the ground hides it by
depth, so it truly goes under). Its skin is the dark blue-violet of a vein seen through hide, striated along its
length, swelling at its valves; the pulse travels along it as a bulge with a dull red flush; where it meets the ground
the flesh is darkened round it.

  path(pts2d, ground, seed, n, depth)     -> (N, 3) a meandering path dipping under and humping out
  draw(img, zb, dep_scene, to_px, P, r0, T, lights, moon, seed)
"""
import numpy as np
from kit import vn, ramp, skylit

KX, KY, KZ = 18.0, 9.0, 21.0
VIEW = np.array([1.0, 1.0, 2 * KY / KZ])
VIEW = VIEW / np.linalg.norm(VIEW)
R_VEIN = ramp("#0c0710", "#1a0d1c", "#2a1428", "#3d1d36", "#552844", "#6e3651", "#8a4a5e")


def path(pts2d, ground, seed=1, humps=3.5, depth=0.35, lift=0.3, r0=0.24):
    rr = np.random.default_rng(seed)
    P = np.array(pts2d, float)
    n = len(P)
    s = np.linspace(0, 1, n)
    tang = np.gradient(P, axis=0)
    tang /= np.linalg.norm(tang, axis=1, keepdims=True) + 1e-9
    side = np.stack([-tang[:, 1], tang[:, 0]], 1)
    span = np.linalg.norm(np.diff(P, axis=0), axis=1).sum()
    mean = sum(np.sin(s * span * k * 0.9 + rr.uniform(0, 6)) / k for k in (1, 2, 3.3)) * 0.35   # meander
    P = P + side * mean[:, None]
    z = np.array([ground(x, y) for x, y in P])
    hump = np.sin(s * np.pi * humps * 2 + rr.uniform(0, 6))
    arch = np.clip(hump - 0.55, 0, 1) / 0.45                             # only the crests arch out clear
    dive = np.clip(-hump - 0.7, 0, 1) / 0.3                              # and the deepest troughs go right under
    z = z + r0 * 0.4 + arch * lift - dive * depth
    return np.column_stack([P, z])


def draw(img, zb, dep_scene, to_px, P, r0, T, lights, moon, seed=1, tol=0.06, ground=None, ramp_=None, taper=False, organic=False):
    R_ = R_VEIN if ramp_ is None else ramp_
    GH, GW = img.shape[:2]
    n = len(P)
    seg = np.linalg.norm(np.diff(P, axis=0), axis=1)
    sl = np.concatenate([[0], np.cumsum(seg)])                          # length along it, yards
    for i in range(n):
        x, y, z = P[i]
        s = sl[i]
        valve = np.exp(-(((s % 2.6) - 1.3) / 0.18) ** 2) * 0.1              # its valves, a faint swelling, far apart
        pulse = np.exp(-((((s * 0.5 - T * 2) % 1.0) - 0.5) / 0.07) ** 2)
        r = r0 * (1 + valve + 0.4 * pulse) * (0.9 + 0.2 * vn(s * 0.8 + seed, 1))
        if organic:                                                        # not a tube (Derek): it swells and pinches, knots, and lies
            r = r * (0.6 + 0.75 * vn(s * 0.9 + seed * 3, 2.0))                # flattened, half sunk in what it lies on
            r = r * (1 + 0.55 * np.exp(-((((s * 0.37 + seed) % 1.0) - 0.5) / 0.06) ** 2))   # a knot, a varix
            z = z - r * 0.35
        if taper:
            r = r * (1 - 0.75 * i / max(n - 1, 1))                              # thinning to its creeping tip
        sx, sy = to_px((x, y, z))
        rp = r * KX
        if ground is not None and z - ground(x, y) < r * 0.6:
            for yy in range(int(sy - rp * 1.7), int(sy + rp * 1.7) + 1):
                for xx in range(int(sx - rp * 1.7), int(sx + rp * 1.7) + 1):
                    if 0 <= yy < GH and 0 <= xx < GW and zb[yy, xx] < -1e8:
                        q = np.hypot(xx + 0.5 - sx, (yy + 0.5 - sy) * 1.3) / (rp * 1.7)
                        if q < 1:
                            img[yy, xx] = img[yy, xx] * (0.55 + 0.45 * q)     # the flesh pressed dark along it
        for yy in range(int(sy - rp - 1), int(sy + rp + 2)):
            if not 0 <= yy < GH:
                continue
            for xx in range(int(sx - rp - 1), int(sx + rp + 2)):
                if not 0 <= xx < GW:
                    continue
                u_ = (xx + 0.5 - sx) / rp
                v_ = (yy + 0.5 - sy) / rp
                q2 = u_ * u_ + v_ * v_
                if q2 > 1:
                    continue
                k = np.sqrt(1 - q2)
                # the sphere's normal in the world: screen right is (1,-1,0)/sqrt2; screen up is perpendicular to it and VIEW
                right = np.array([0.7071, -0.7071, 0.0])
                up = np.cross(VIEW, right)
                N = right * u_ - up * v_ + VIEW * k
                if organic:                                                # lumped, fibrous skin: the normal broken up
                    N = N + np.array([vn(s * 5 + u_ * 2, v_ * 2 + seed) - 0.5, vn(s * 5 + 7, u_ * 3 + v_) - 0.5, 0.0]) * 0.7
                    N[2] = N[2] * 0.75                                     # flattened: wider than it stands tall
                N = N / np.linalg.norm(N)
                Pp = np.array([x, y, z]) + N * r
                d = Pp[0] + Pp[1]
                if d < dep_scene[yy, xx] - tol or d <= zb[yy, xx]:
                    continue
                zb[yy, xx] = d
                ndl = max(0.0, float(N @ moon)) * float(skylit(Pp[None])[0])
                val = 0.14 + ndl * 0.55
                warm = np.zeros(3)
                spec = (max(0.0, float(N @ ((moon + VIEW) / np.linalg.norm(moon + VIEW))))) ** 40 * 0.5 * float(skylit(Pp[None])[0])
                for (lp, lc, reach) in lights:
                    v = np.array(lp) - Pp
                    dist = np.linalg.norm(v)
                    att = 1 / (1 + (dist / reach) ** 2)
                    warm += max(0.0, float(N @ (v / dist))) * att * np.array(lc) * 0.7
                # striations along it: fine lines round the tube's angle
                ang = np.arctan2(v_, u_)
                stri = 0.06 * np.sin(ang * 9 + s * 0.6 + vn(s * 3 + seed, ang) * 2)
                idx = int(np.clip((val + stri) * len(R_), 0, len(R_) - 1))
                col = R_[idx].copy()
                if organic:                                                # mottled along its length: bruise and old blood
                    mot = vn(s * 1.7 + seed, ang * 0.5)
                    col = col * (0.75 + mot * 0.45) * np.array([1.0 + (mot - 0.5) * 0.3, 0.9, 1.0 - (mot - 0.5) * 0.2])
                col = col + np.array([0.25, 0.02, 0.04]) * pulse * (0.4 + k * 0.6)   # the pulse: a dull red flush
                col = col * (1 + warm * 1.3) + spec * np.array([0.7, 0.66, 0.75])
                if ground is not None:                                        # the skin closes over it near the ground
                    sk = float(np.clip((Pp[2] - ground(Pp[0], Pp[1])) / 0.09, 0, 1))
                    col = img[yy, xx] * 0.8 * (1 - sk) + col * sk
                img[yy, xx] = np.clip(col, 0, 1)
    return img
