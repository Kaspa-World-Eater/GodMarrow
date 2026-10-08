"""The Hollow Wood's trees for every scene built on the wood's engine (wood_scene.py): the god's veins stood up as
pale trees, painted by the game's own bark (tools/landkit/bark.py: twelve graded passes, sap as dark blood, the dying
trees' weeping eyes). One place, so every scene's trees are the same trees and an improvement reaches them all.

  import wood_pale; wood_pale.install()     (after importing wood_scene)
"""
import os
import sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "landkit"))
import wood_scene as ws                      # noqa: E402
import bark                                  # noqa: E402
import eye as eyegen                         # noqa: E402

_WORLD = {}
_EYES = {}                                   # (tree centre) -> (centre, girth, ground, [sockets]): the 3D eyes to cast
DYING_IN_FIVE = (0, 2)                       # two in five of the Wood's trees are dying, and weep (a scene may set more)
DISEASE = (0.0, 0.0)                         # disease on the dying, on the rest (a scene sets it; 0 keeps a scene as it was)


def pale_bark(img, m, v, n, px, py, pz, o, along=None, arc=None, lichen=True):
    """a trunk of the Hollow Wood, at its own girth, lit by the scene's moon, lantern and fires"""
    if along is None:
        ang = np.arctan2(py - o["c"][1], px - o["c"][0])
        arc = ang * o["r"]
        W = _WORLD["W"]
        ground = float(ws.look(W, W["Hrest"], np.array(o["c"][0]), np.array(o["c"][1])))
        along = pz - ground
    bole = m & (n[..., 2] < 0.35) & (along > 0.9)                       # its round side, above the flare
    cc_ = o["c"] if "c" in o else o["a"]                                 # a log has its start, not a centre
    seed = int(abs(cc_[0] * 131 + cc_[1] * 71)) % 997
    form = bark.form_value(n, ws.SUN)
    vb = np.clip(form * (0.55 + v * 0.75), 0, 0.99)                     # the pale form, under the scene's own light
    vb = vb * (1 - np.clip((along - 5.0) / 14.0, 0, 0.32))                # climbing into the canopy's shade
    dying = 1.0 if seed % 5 in DYING_IN_FIVE else 0.0
    disease = DISEASE[0] if dying else DISEASE[1]
    eyes = []
    img, _ = bark.paint(img, m, bole, vb, n, arc, along, max(o["r"], 0.25), seed, ws.SUN,
                        scar_band=(1.8, 7.0) if dying else (2.5, 11.0), top=18.0, dying=dying, disease=disease,
                        eyes=eyes if "c" in o and along is not None else None)
    if eyes and "c" in o:
        W = _WORLD["W"]
        g0 = float(ws.look(W, W["Hrest"], np.array(o["c"][0]), np.array(o["c"][1])))
        for e in eyes:                                                      # where the socket truly is on the bark
            mm = e.pop("mask")
            if mm.sum() >= 3:
                e["P"] = np.array([px[mm].mean(), py[mm].mean(), pz[mm].mean()])
                nn = np.array([n[..., 0][mm].mean(), n[..., 1][mm].mean()])
                e["N"] = nn / (np.linalg.norm(nn) + 1e-6)
        eyes = [e for e in eyes if "P" in e]
        if not eyes:
            return img
        _EYES[(round(float(o["c"][0]), 3), round(float(o["c"][1]), 3))] = (np.array(o["c"], float), max(o["r"], 0.25), g0, eyes)
    return img


def tree_eyes(img, w, W, px, py, pz, L, T):
    """the dying trees' eyes, each a true ball ray-cast into its bark socket (landkit eye.py, the approved eye): it
    leans with its trunk, blinks slowly on its own time, and turns a little toward the pilgrim"""
    if not _EYES:
        return img
    GH, GW = img.shape[:2]
    dep = px + py
    zb = np.full((GH, GW), -1e9)
    hero = np.array(ws.HERO, float)
    hg = float(ws.look(W, W["H"], np.array(hero[0]), np.array(hero[1])))
    lts = [((hero[0] + 0.25, hero[1] - 0.25, hg + 0.7), (0.95, 0.6, 0.32), 2.6 * 1.4)]
    lts += [((lx, ly, lz), (0.95, 0.6, 0.32), rch * 1.4) for (lx, ly, lz, rch) in ws.LIGHTS]
    view = np.array([1.0, 1.0]) / np.sqrt(2)
    for (c, r, g0, eyes) in _EYES.values():
        seen = set()
        for e in eyes:
            key = (round(e["a"], 3), round(e["z"], 3))
            if key in seen:
                continue
            seen.add(key)
            u = e["N"]
            if u @ view < 0.15:                                             # turned away from the camera
                continue
            z = e["P"][2]
            R = e["w"] * 0.5
            p = e["P"][:2] - u * R * 0.75                                   # sunk deep: only its opening stands out of the bark
            lx_, ly_ = ws.lean(np.array(p[0]), np.array(p[1]), np.array(z - g0), T)
            centre = (p[0] + float(lx_), p[1] + float(ly_), z)
            sx_, sy_ = ws.to_px(centre)
            mrg = R * 18 * 1.6 + 4
            if not (-mrg < sx_ < GW + mrg and -mrg < sy_ < GH + mrg):          # out of frame
                continue
            to_h = hero - p
            to_h = to_h / (np.linalg.norm(to_h) + 1e-6)
            gz = np.array([u[0] * 0.45 + to_h[0] * 0.25 + 0.3 * 0.7, u[1] * 0.45 + to_h[1] * 0.25 + 0.3 * 0.7, 0.18])   # out of the bark, toward us and the pilgrim
            ph = (e["k"] * 0.37 + c[0] * 0.13 + c[1] * 0.07) % 1.0
            blink = np.clip(1 - abs(((T + ph) % 1.0) - 0.5) / 0.07, 0, 1) ** 0.8
            eyegen.draw(img, zb, dep, ws.to_px, centre, R, gz, blink, lts, ws.SUN, seed=int(c[0] * 17 + e["k"]),
                        ambient=0.14, aperture=(0.95, 0.52))
    return img


def keep_world(W, w):
    _WORLD["W"] = W


def install():
    ws.paint_bark = pale_bark
    if keep_world not in ws.BUILD_HOOKS:
        ws.BUILD_HOOKS.append(keep_world)
    if tree_eyes not in ws.LIVING:
        ws.LIVING.append(tree_eyes)
    ws.RIM = (1.12, (0.01, 0.015, 0.035))                                # a soft, cool moon edge on the pale trunks
