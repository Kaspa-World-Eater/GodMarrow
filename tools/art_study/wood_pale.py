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

_WORLD = {}
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
    img, _ = bark.paint(img, m, bole, vb, n, arc, along, max(o["r"], 0.25), seed, ws.SUN,
                        scar_band=(1.8, 7.0) if dying else (2.5, 11.0), top=18.0, dying=dying, disease=disease)
    return img


def keep_world(W, w):
    _WORLD["W"] = W


def install():
    ws.paint_bark = pale_bark
    if keep_world not in ws.BUILD_HOOKS:
        ws.BUILD_HOOKS.append(keep_world)
    ws.RIM = (1.12, (0.01, 0.015, 0.035))                                # a soft, cool moon edge on the pale trunks
