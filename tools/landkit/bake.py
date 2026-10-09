"""The baker (landkit): every piece rendered through the same scene engine as the scenes (tools/art_study/wood_scene.py),
alone on bare ground under the moon, and cut out in the game's form (docs/archive/REWORK_AND_SEEDS_PLAN.md, stage 2). So the
assets carry every technique the scenes have: the warped, channelled trunks, the form law, the real normals, the moon's
shadows. Written for the game as world/landkit.gd reads a set:

  <name>.webp          the sprite, lit by the moon (RGBA)
  <name>_n.webp        its normal map in screen space (for the game's lantern and lights)
  <name>_h.webp        its height (0..1 of its own height)
  <name>_shadow.webp   the moon's shadow it casts on the ground
  <name>.json          kind, height, foot (px), size, posts [[x, y, r] yd], cover, material, hp, and the rest

  bake(name, spec, out_dir) -> meta      spec: dict(kind=..., the piece's parameters); see PIECES below
"""
import os
import sys
import json
import numpy as np
from PIL import Image
from scipy import ndimage as nd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "art_study"))
import wood_scene as ws          # noqa: E402
import wood_pale                 # noqa: E402
import vein_tree                 # noqa: E402
import vein_stump                # noqa: E402
import flat_stone                # noqa: E402

wood_pale.install()
C0 = np.array([20.0, 20.0])
AX = np.array([1.0, 1.0]) / np.sqrt(2)


def _reset(frame_w, frame_h, focus):
    ws.GW, ws.GH = frame_w, frame_h
    ws._CACHE.clear()                                                  # the engine's caches are sized to a frame
    ws.FOCUS = np.array(focus, float)
    ws.HERO = np.array([focus[0] - 40.0, focus[1] - 40.0])            # the lantern far away BEHIND: the moon alone lights a piece, and
                                                                       # no night air lies between it and us (the engine fills the
                                                                       # space in front of the pilgrim with stepped air: dark, blue, dithered)
    ws.LIGHTS.clear()
    ws.WOOD_HOOKS.clear()
    keep = [h for h in ws.BUILD_HOOKS if h is wood_pale.keep_world]
    ws.BUILD_HOOKS[:] = keep
    ws.LIVING[:] = []
    ws.TRUNK_WARP = None
    ws.AUTO_WARP = True
    ws.GRASS = ws.FERNS = ws.MIST = ws.BEAMS = False
    ws.FOREST_LIFE = False
    ws.NORMAL_BLUR = 0.0
    ws.RIM_EXTRA = tuple(range(600, 700))


GAME_TONE = (1.04, 1.04, 0.94)     # the moon's violet taken off: the game lays its own night over every sprite (core/main.gd's
                                   # CanvasModulate and lamp_night), so a piece ships at the old set's day values
                                   # (art/landkit/old_growth: bark near 48/255) or it darkens twice


def game_tone(rgb):
    return np.clip(rgb * np.array(GAME_TONE), 0, 1)


def clean_mask(mask, keep=0.03):
    """only the piece: no stray specks cut loose from it (a stump's far chips read as floating blots in the game)"""
    lab, n = nd.label(mask)
    if n <= 1:
        return mask
    area = nd.sum(mask, lab, range(1, n + 1))
    return np.isin(lab, 1 + np.nonzero(area >= max(area.max() * keep, 6))[0])


BAYER4 = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16


def into_the_dark(rgb, alpha, hz, start=0.7):
    """a living trunk rises into the canopy's dark and is gone (MASTER_RULES 5: crowns above the frame, the canopy
    only as light and shade on the floor). At the game's camera a trunk standing south of the view shows its top
    on screen, so no trunk may end in a cut: over its top it darkens and dithers away, in the art's own pixels"""
    f = np.clip((hz - start) / (1 - start), 0, 1)
    h, w = alpha.shape
    th = np.tile(BAYER4, (h // 4 + 1, w // 4 + 1))[:h, :w]
    keep = alpha & (f < th * 0.98)
    return rgb * (1 - 0.55 * f[..., None]), keep


def _dying(spec):
    wood_pale.DYING_IN_FIVE = tuple(range(5)) if spec.get("dying") else ()
    wood_pale.DISEASE = (0.5, 0.0)       # a set piece is seen at the game's size: the healthy clean (the flat peel and cankers
                                         # read as paint blots there); the dying keep theirs


def _bare(w):
    """bare ground: nothing of the old plan, open sky"""
    w.trees, w.logs, w.rocks, w.sapl, w.shrooms = [], [], [], [], []
    w.light = np.ones_like(w.light)
    w.gap = (-100.0, -100.0, 1.0)
    w.H = w.H * 0.0
    for name in ("fern", "grass", "moss", "bare", "pool"):
        a_ = getattr(w, name, None)
        if isinstance(a_, np.ndarray) and a_.dtype == bool:
            setattr(w, name, np.zeros_like(a_))


def _stamp_vein(spec):
    def hook(W, w):
        x, y = C0
        R, hgt, sd = spec["girth"], spec["height"], spec["seed"]
        trees = [(x, y, R, hgt, sd)]
        g0 = float(ws.look(W, W["Hrest"], np.array(x), np.array(y)))
        ws.TRUNK_WARP = vein_tree.Warp(trees, [g0])
        H, tags = vein_tree.stamp(W["X"], W["Y"], W["H"], trees, -AX, seed=sd)
        if spec.get("broken"):                                         # a dead one, its top snapped off, jagged
            top = g0 + hgt * spec["broken"] + vein_tree.broken_top(W["X"], W["Y"], x, y, R, sd)
            H = np.where(tags == 1, np.minimum(H, top), H)
        W["H"] = H
        W["Hrest"] = np.where(tags < 0, H, W["Hrest"])
        W["HT"] = np.where(tags > 0, H, W["HT"])
        W["tag"] = np.where(tags == 1, 600, np.where(tags == -1, 640, W["tag"]))
        W["obj"][600] = dict(kind="veintree", c=np.array([x, y]), r=R)
        W["obj"][640] = dict(kind="veinroot", c=np.array([x, y]), r=R * 0.2)
    return hook


def vn_(x, y):
    return ws.vn(x, y)


def _stamp_stump(spec):
    def hook(W, w):
        H, part, info = vein_stump.stamp(W["X"], W["Y"], W["H"], C0, R=spec["girth"], fall=spec["fall"], seed=spec["seed"],
                                         north=-AX, cut=spec["cut"])
        W["H"] = H
        W["Hrest"] = np.where(part != 0, H, W["Hrest"])
        W["tag"] = np.where(part == -1, 640, W["tag"])
        W["obj"][640] = dict(kind="veinroot", c=C0.copy(), r=0.16)
        for k in range(1, 6):
            W["tag"] = np.where(part == k, 670 + k, W["tag"])
            W["obj"][670 + k] = dict(kind="vstump", part=k, c=C0.copy(), r=spec["girth"])
        hook.info = info
    return hook


def _stamp_stone(spec):
    def hook(W, w):
        H, part, info = flat_stone.stamp(W["X"], W["Y"], W["H"], C0, size=spec["size"], yaw=spec["yaw"], seed=spec["seed"])
        W["H"] = H
        W["Hrest"] = np.where(part > 0, H, W["Hrest"])
        for pt in (1, 2, 3):
            W["tag"] = np.where(part == pt, 690 + pt, W["tag"])
            W["obj"][690 + pt] = dict(kind="flatstone", part=pt, info=info, c=info["c"], r=spec["size"] * 0.5)
        hook.info = info
    return hook


def _painters():
    ws.PAINTERS["veintree"] = lambda img, m, v, n, px, py, pz, o, W, L: wood_pale.pale_bark(img, m, v, n, px, py, pz, o)
    ws.PAINTERS["veinroot"] = ws.PAINTERS["veintree"]
    ws.PAINTERS["vstump"] = lambda img, m, v, n, px, py, pz, o, W, L: vein_stump.paint(img, m, v, n, px, py, pz, o["part"],
                                                                                      _STATE["stump_info"], ws.SUN)
    ws.PAINTERS["flatstone"] = lambda img, m, v, n, px, py, pz, o, W, L: flat_stone.paint(img, m, v, n, px, py, pz, o["part"],
                                                                                         o["info"], L["side"], ws.SUN)


_STATE = {}


def _screen_nmap(n):
    """the game's screen-space normal (as kit.export)"""
    VIEW = np.array([1.0, 1.0, 2 * 9.0 / 21.0])
    VIEW = VIEW / np.linalg.norm(VIEW)
    sr = (n[..., 0] - n[..., 1]) / np.sqrt(2)
    su = n[..., 2] * 0.85 - (n[..., 0] + n[..., 1]) / np.sqrt(2) * 0.5
    sz = (n * VIEW).sum(2)
    nm = np.dstack([sr, su, sz])
    return nm / (np.linalg.norm(nm, axis=2, keepdims=True) + 1e-9)


def bake(name, spec, out_dir):
    kind = spec["kind"]
    hgt = spec.get("height", 1.0)
    fw = int(max(spec.get("span", 3.0), 2.0) * 36) + 40
    fh = int(hgt * 21 + spec.get("span", 3.0) * 18) + 50
    _reset(fw, fh, C0 - AX * (hgt * 21 / 2) / (2 * 9.0 / np.sqrt(2)) * 0.0)
    # centre the frame so the piece's foot sits low and its top high: shift the focus back along the view
    ws.FOCUS = C0 - AX * (hgt * 21.0 / 2.0 - 18) / (2 * 9.0) * np.sqrt(2) * 0.5
    ws.WOOD_HOOKS.append(_bare)
    if kind in ("vein_tree", "vein_snag"):
        hook = _stamp_vein(spec)
        tags = (600, 640)
        material, cover, hp = ("wood_living" if kind == "vein_tree" else "wood_dead"), hgt * (spec.get("broken") or 1.0), (None if kind == "vein_tree" else 400)
        posts = [[0.0, 0.0, round(spec["girth"] * 1.15, 3)]]
    elif kind == "vein_stump":
        hook = _stamp_stump(spec)
        tags = (640, 671, 672, 673, 674, 675)
        material, cover, hp = "wood_dead_wet", spec["cut"], 300
        posts = [[0.0, 0.0, round(spec["girth"] * 1.1, 3)]]
    elif kind == "flat_stone":
        hook = _stamp_stone(spec)
        tags = (691, 692, 693)
        material, cover, hp = "stone", 0.12 * spec["size"], None
        posts = [[0.0, 0.0, round(spec["size"] * 0.45, 3)]] if spec["size"] > 0.6 else []
    else:
        raise ValueError(kind)
    ws.BUILD_HOOKS.insert(0, hook)
    _dying(spec)
    wood_pale._EYES.clear()
    _painters()
    w = ws.Wood()
    for f in ws.WOOD_HOOKS:
        f(w)
    W = ws.build(w)
    for f in ws.BUILD_HOOKS:
        f(W, w)
    if kind == "vein_stump":
        _STATE["stump_info"] = hook.info
    px, py, pz, SX, SY = ws.cast(W, 0.0)
    L = ws.shade(W, px, py, pz, SX, SY, 0.0)
    img = ws.paint(W, px, py, pz, SX, SY, L, 0.0)
    if spec.get("dying"):                                                  # its eyes, the approved 3D eye in each socket
        img = wood_pale.tree_eyes(img, w, W, px, py, pz, L, 0.0)
    if kind == "vein_stump":
        B = ws.look(W, hook.info["B"], px, py)
        D = ws.look(W, hook.info["DRY"], px, py)
        img = vein_stump.paint_blood(img, px, py, B, D, np.clip(L["moon"] * 0.9 + 0.1, 0, 1.2), 0.0)
    mask = np.isin(L["tg"], tags)
    reach = spec.get("girth", spec.get("size", 1.0)) * 2.6
    mask &= ~((L["tg"] == 640) & (np.hypot(px - C0[0], py - C0[1]) > reach))   # the roots near its foot, not the braid to the next tree
    mask = nd.binary_opening(mask, iterations=1) | (mask & nd.binary_erosion(mask))
    mask = clean_mask(mask)
    if not mask.any():
        raise RuntimeError("nothing of %s in frame" % name)
    # the moon's shadow on the bare ground round it
    shadow = (L["tg"] == 0) & L["sh"]
    ys, xs = np.nonzero(mask | shadow)
    y0, y1, x0, x1 = max(ys.min() - 1, 0), ys.max() + 2, max(xs.min() - 1, 0), xs.max() + 2
    crop = lambda a: a[y0:y1, x0:x1]
    os.makedirs(out_dir, exist_ok=True)
    g0_ = float(ws.look(W, W["Hrest"], np.array(C0[0]), np.array(C0[1])))
    if kind == "vein_tree":
        img, mask = into_the_dark(img, mask, np.clip((pz - g0_) / max(hgt, 1e-3), 0, 1))
    rgba = np.dstack([game_tone(img), mask.astype(float)])
    Image.fromarray((crop(rgba) * 255).astype(np.uint8), "RGBA").save(os.path.join(out_dir, name + ".webp"), lossless=True)
    nm = _screen_nmap(L["n"])
    Image.fromarray((crop(np.dstack([nm * 0.5 + 0.5, mask.astype(float)])) * 255).astype(np.uint8), "RGBA").save(
        os.path.join(out_dir, name + "_n.webp"), lossless=True)
    g0 = float(ws.look(W, W["Hrest"], np.array(C0[0]), np.array(C0[1])))
    hz = np.clip((pz - g0) / max(hgt, 1e-3), 0, 1)
    Image.fromarray((crop(np.dstack([hz, hz, hz, mask.astype(float)])) * 255).astype(np.uint8), "RGBA").save(
        os.path.join(out_dir, name + "_h.webp"), lossless=True)
    Image.fromarray((crop(np.dstack([np.zeros(mask.shape + (3,)), shadow * 0.55])) * 255).astype(np.uint8), "RGBA").save(
        os.path.join(out_dir, name + "_shadow.webp"), lossless=True)
    fx, fy = ws.to_px((C0[0], C0[1], g0))
    meta = dict(kind=kind, height=hgt, foot=[round(fx - x0, 1), round(fy - y0, 1)], size=[int(x1 - x0), int(y1 - y0)],
                posts=posts, cover=round(float(cover), 3), material=material, hp=hp, spec=spec,
                baked="landkit/bake.py through the scene engine (wood_scene.py)")
    with open(os.path.join(out_dir, name + ".json"), "w", newline="\n") as fh_:
        json.dump(meta, fh_, indent=1)
    return meta


def hollow_wood_pieces():
    """the Hollow Wood's set (stage 2): enough of each that none repeats within a screen. Each its own seed, so its
    own ridges, channels, taper, swell, wander and twist"""
    P = {}
    rr = np.random.default_rng(2026)
    for i in range(10):                                                    # the giants, towering out of frame
        P["vein_giant_%d" % i] = ("tree_giant", dict(kind="vein_tree", girth=float(rr.uniform(1.0, 1.4)),
                                  height=float(rr.uniform(15.5, 18.0)), seed=1000 + i, span=4.2))
    for i in range(8):                                                     # middle age
        P["vein_middle_%d" % i] = ("tree_middle", dict(kind="vein_tree", girth=float(rr.uniform(0.55, 0.85)),
                                   height=float(rr.uniform(13.0, 15.0)), seed=1100 + i, span=3.2))
    for i in range(4):                                                     # dying: two eyes at most, well apart
        P["vein_dying_%d" % i] = ("tree_dying", dict(kind="vein_tree", girth=float(rr.uniform(0.95, 1.25)),
                                  height=float(rr.uniform(15.0, 17.0)), seed=1200 + i, span=4.0, dying=True))
    for i in range(6):                                                     # the dead: snags, their tops snapped
        P["vein_snag_%d" % i] = ("snag", dict(kind="vein_snag", girth=float(rr.uniform(0.35, 0.95)),
                                 height=float(rr.uniform(8.0, 13.0)), seed=1300 + i, span=3.0, broken=float(rr.uniform(0.35, 0.7))))
    for i in range(6):                                                     # small trees, mostly dead (the forest feel)
        P["vein_pole_%d" % i] = ("tree_young", dict(kind="vein_snag", girth=float(rr.uniform(0.16, 0.26)),
                                 height=float(rr.uniform(6.0, 9.0)), seed=1400 + i, span=1.6, broken=float(rr.uniform(0.5, 0.85))))
    for i in range(6):                                                     # the woodcutters' stumps, some still weeping
        a = float(rr.uniform(0, 2 * np.pi))
        P["vein_stump_%d" % i] = ("stump", dict(kind="vein_stump", girth=float(rr.uniform(0.6, 0.95)), fall=[np.cos(a), np.sin(a)],
                                  seed=1500 + i, cut=float(rr.uniform(0.45, 0.75)), height=0.9, span=2.6))
    for i in range(10):                                                    # this Wood's flat stones
        P["flat_stone_%d" % i] = ("rock", dict(kind="flat_stone", size=float(rr.uniform(0.45, 1.3)), yaw=float(rr.uniform(0, 3.14)),
                                  seed=1600 + i, height=0.3 + 0.2 * i / 9, span=2.6))
    return P


def build(out):
    """bake the whole set into out (art/landkit/<set>/) with its index.json, as world/landkit.gd reads it"""
    import time
    pieces = hollow_wood_pieces()
    index = dict(set=os.path.basename(out.rstrip("/\\")), roles={}, pieces={}, ground="litter_ground (landkit), to become a Godot shader")
    for name, (role, spec) in pieces.items():
        t0 = time.time()
        meta = bake(name, spec, out)
        index["roles"].setdefault(role, []).append(name)
        index["pieces"][name] = dict(kind=meta["kind"], foot=meta["foot"], size=meta["size"], posts=meta["posts"],
                                     cover=meta["cover"], material=meta["material"], hp=meta["hp"], height=meta["height"])
        print("baked", name, role, "%.0fs" % (time.time() - t0), flush=True)
    with open(os.path.join(out, "index.json"), "w", newline="\n") as fh_:
        json.dump(index, fh_, indent=1, default=float)
    return index


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "set":
        build(sys.argv[2])
    else:
        out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "previews", "bake_test")
        m = bake("veingiant_test", dict(kind="vein_tree", girth=1.2, height=16.0, seed=111, span=4.0), out)
        print(m)
