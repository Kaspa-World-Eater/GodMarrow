"""The Sunken Bog's chambers (study scenes; log `tools/landkit/passes/spine_path.md`). Derek 2026-10-08: "large open
marsh areas where the player can walk around a bit and choose different paths. These can be just raw nature in the big,
some can be ancient ruins, maybe a straw hut with a wisp fire in a pit, a giant eye socket and the top of a snake
skull ... Make sure the path can twist and turn too." Like D2's maggot lair: tight walks along the Long Back broken by
these larger places. Each is the bog scene (bog_scene.py) with its own ground, pieces and twisting Back.

  python tools/art_study/bog_chambers.py NAME OUT.png [value]      NAME: nature | ruins | hut | socket | skull
"""
import os
import sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bog_scene as bs                       # noqa: E402
import wood_scene as ws                      # noqa: E402
import vessel                                # noqa: E402
import bog_structures                        # noqa: E402
from kit import vn, fbm                      # noqa: E402

C, AX, PERP, LEVEL = bs.C, bs.AX, bs.PERP, bs.LEVEL


def twisting_line(seed, span=17.0, bends=((0.0, 3.4, 3.0),), n=1400):
    """the Back's line for a frame: in from one side, twisting (a few bends of its own sharpness), out the other.
    bends: (where along -1..1, how far it swings in yd, how tight)"""
    t = np.linspace(-1.0, 1.0, n)
    off = np.zeros(n)
    for (at, amp, tight) in bends:
        off = off + amp * np.tanh((t - at) * tight)
    off = off + np.sin(t * 2.3 + seed) * 1.0
    return C[None] + PERP[None] * (t * span)[:, None] + AX[None] * off[:, None]


def shelf(cx, cy, r, rise=0.16, seed=3):
    """a marsh shelf: ground risen just above the water table, hummock and hollow, a wide place to walk and choose"""
    def mod(X, Y, bed):
        from scipy import ndimage as nd
        d = np.hypot(X - cx, Y - cy) / r + (fbm(X * 0.25 + seed, Y * 0.25) - 0.5) * 0.7
        k = np.clip(1.15 - d, 0, 1) ** 0.6
        mean = nd.gaussian_filter(bed, 40)                                 # lift the ground as a whole, keep its own
        # hummock and hollow (the bog's grammar: the hollows still hold water, the hummocks stand out of it)
        hum = (fbm(X * 0.7 + seed, Y * 0.7) - 0.5) * 0.95 + (vn(X * 2.6, Y * 2.6 + seed) - 0.5) * 0.16
        return bed + k * np.clip(LEVEL + rise - mean, 0, None) + k * hum
    return mod
    return mod


def tendrils_round_post(px_, py_, h, seed):
    """the god's tendrils wound up a post, and the pale pustule in their grip"""
    def living(img, w, W, px, py, pz, L, T=0.0):
        GH, GW = img.shape[:2]
        zb = np.full((GH, GW), -1e9)
        dep = px + py
        g = LEVEL
        hero = np.array(ws.HERO, float)
        lts = [((hero[0] + 0.25, hero[1] - 0.25, float(ws.look(W, W["H"], np.array(hero[0]), np.array(hero[1]))) + 0.7),
                (0.95, 0.6, 0.32), 2.6 * 1.4)]
        rr = np.random.default_rng(seed)
        for k in range(3):
            ph = rr.uniform(0, 2 * np.pi)
            turns = rr.uniform(1.2, 2.2)
            zs = np.linspace(g - 0.1, g + h * rr.uniform(0.55, 0.9), 60)
            a = ph + np.linspace(0, turns * 2 * np.pi, 60)
            rad = 0.26 + 0.04 * np.sin(a * 3)
            P = np.stack([px_ + np.cos(a) * rad, py_ + np.sin(a) * rad, zs], 1)
            vessel.draw(img, zb, dep, ws.to_px, P, 0.075, T, lts, ws.SUN, seed=seed + k, tol=0.35,
                        ramp_=None, taper=True)
        c = (px_ + 0.18, py_ + 0.12, g + h * 0.62)
        img = bog_structures.pustule(img, zb, dep, ws.to_px, c, 0.2, T, ws.SUN)
        return img
    return living


def scene_nature():
    bs.LINE = twisting_line(2, bends=((-0.35, 3.6, 4.0), (0.3, -3.2, 5.0)))
    bs.BED_MODS[:] = [shelf(*(C - AX * 4.5 + PERP * 2.0), 7.5)]
    bs.DROWNED_TREES = [(C + AX * 6.0 - PERP * 8.0, 0.4, 6.0, 71)]
    bs.DROWNED_WALLS = []
    bs.GIANT_RIBS = []
    post = C + AX * 1.6 + PERP * 1.6
    bs.STRUCTS[:] = [("stump", *(C - AX * 6.0 + PERP * 5.0), 0.55, 81),
                     ("snag", *(C + AX * 5.5 + PERP * 3.5), 2.6, 6.5, 0.34, 82),
                     ("post", post[0], post[1], 0.22, 1.8, 83)]
    bs.EXTRA_LIVING[:] = [tendrils_round_post(post[0], post[1], 1.8, 84)]
    ws.HERO = bs.LINE[len(bs.LINE) // 2] + AX * 0.2                  # on the Back


SCENES = dict(nature=scene_nature)

if __name__ == "__main__":
    SCENES[sys.argv[1]]()
    if len(sys.argv) > 3 and sys.argv[3] == "value":
        bs.VALUE_ONLY = True
    ws.main(sys.argv[2])
