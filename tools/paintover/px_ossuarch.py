"""The Ossuarch at the Tithe-Hand's pixel scale, every frame (Derek 2026-10-05: "take the faster test route"): the hand
pass of docs/concepts/ossuarch/pixel/polish_frame.py, applied by body part to every rendered frame (the frame's
.parts.png says which part each pixel is, so nothing is guessed from colour and nothing is placed by coordinates):
- colours snapped to the fixed ramps of each material; edges lit on the upper left, shaded on the lower right;
- the charm bones crisp ivory with a shaded side and a shadow on the plate behind;
- the pauldrons as lames of plate with a dark line under each; the legs each lit apart from the cloak;
- the cloak in broad folds; the plume a pale flame, its core bright up the light side.

  tools/pixelforge/.venv/Scripts/python tools/paintover/px_ossuarch.py --preview OUT.png
  tools/pixelforge/.venv/Scripts/python tools/paintover/px_ossuarch.py --apply
"""
import os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import Frame, run, ROOT  # noqa: E402
sys.path.insert(0, os.path.join(ROOT, "tools", "pixelforge"))
import json  # noqa: E402
from pixelforge.shapes import part_table  # noqa: E402

CHAR = os.environ.get("OSSPX_CHAR", r"C:/Users/derek/PixelForge Projects/godmarrow/characters/ossuarch_px")
SHAPES = os.path.join(ROOT, "tools", "pixelforge", "assets", "shapes", "characters", "ossuarch_px.shapes.json")
DOC = json.load(open(SHAPES))
TABLE, _ = part_table(DOC)
NAME = {e["index"]: e["name"] for e in TABLE}
PMAT = {e["index"]: sorted(set(DOC["shapes"][i].get("material", "") for i in e["shapes"])) for e in TABLE}

def C(h):
    h = h.lstrip("#"); return np.array([int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)], float)

IRON = [C(c) for c in ("#060509", "#0e0b11", "#18131a", "#241c24", "#33292f", "#45383c", "#5d4c4e", "#7b6865", "#9d8a83")]
CLOTH = [C(c) for c in ("#050b0a", "#0b1614", "#12211e", "#1a2f2a", "#24413a", "#33584d", "#5e9a85")]
BONE = [C(c) for c in ("#3a2622", "#6a4a3c", "#a07e66", "#cdb091", "#ecd9bf", "#fbf1e2")]
PLUME = [C(c) for c in ("#1a4337", "#2f6b56", "#4f9a7f", "#86c7ad", "#c2ebd9", "#f0fcf6")]
LEATH = [C(c) for c in ("#160e0b", "#271912", "#3b2619", "#4f3421")]
RAMPS = {"iron": IRON, "cloth": CLOTH, "bone": BONE, "plume": PLUME, "leath": LEATH}
KIND = {"iron": "iron", "ironw": "iron", "mail": "iron", "cloth": "cloth", "bone": "bone", "plume": "plume", "leather": "leath"}


def paint(rgba, parts, view):
    f = Frame(rgba, parts, view)
    a = f.a; p = f.p; H, W = p.shape
    solid = f.solid
    # what each pixel is
    K = np.full((H, W), "", object)
    for y in range(H):
        for x in range(W):
            if not solid[y, x]:
                continue
            mats = PMAT.get(int(p[y, x]), ["iron"])
            k = KIND.get(mats[0], "iron") if len(mats) == 1 else None
            if k is None:                                   # a part that mixes materials: the colour decides among its own
                r, g, b = a[y, x, :3]
                k = "bone" if ("bone" in mats and r > 95 and r > b + 15) else ("cloth" if ("cloth" in mats and g > r + 4) else "iron")
            K[y, x] = k
    def same(y, x, k):
        return 0 <= y < H and 0 <= x < W and K[y, x] == k
    out = a.copy()
    for y in range(H):
        for x in range(W):
            k = K[y, x]
            if not k:
                continue
            ramp = RAMPS[k]
            i = int(np.argmin([np.sum((c - a[y, x, :3]) ** 2) for c in ramp]))
            n = len(ramp)
            if k != "plume":
                if not same(y, x - 1, k) or not same(y - 1, x, k):
                    i = min(n - 1, i + (2 if k == "bone" else 1))
                elif not same(y, x + 1, k) or not same(y + 1, x, k):
                    i = max(0, i - 1)
            nm = NAME.get(int(p[y, x]), "")
            if k == "bone" and nm.startswith(("charm", "vert", "relic")):
                i = 2 if not same(y, x + 1, "bone") else 4      # crisp: ivory, its right side shaded
            if nm.startswith("pauldron"):
                ytop = y
                while ytop > 0 and NAME.get(int(p[ytop - 1, x]), "").startswith("pauldron"):
                    ytop -= 1
                if (y - ytop) % 5 == 4:
                    i = 0                                    # the line under each lame
            if nm.split(".")[0] in ("thigh", "knee", "greave", "sabaton"):
                me = nm
                if NAME.get(int(p[y, x - 1]) if x > 0 else 0, "") != me:
                    i = 6
                elif x + 1 < W and NAME.get(int(p[y, x + 1]), "") != me:
                    i = 1
            if nm in ("cloak", "mantle"):
                ph = (x + int(2.0 * np.sin(y * 0.12 + x * 0.3))) % 7
                i = max(0, i - 1) if ph == 0 else (min(n - 1, i + 1) if ph == 4 else i)
            if k == "plume":
                xs = [xx for xx in range(W) if K[y, xx] == "plume"]
                u = (x - min(xs)) / max(1, max(xs) - min(xs))
                i = 5 if u < 0.3 else (4 if u < 0.55 else (3 if u < 0.8 else 2))
            out[y, x, :3] = ramp[i]
    # a shadow pixel behind each charm bone
    for y in range(H):
        for x in range(W - 2):
            if K[y, x] == "bone" and NAME.get(int(p[y, x]), "").startswith("charm") and K[y, x + 2] == "iron" and K[y, x + 1] != "bone":
                out[y, x + 1, :3] = IRON[0]
    f.a = out
    return f.image()


if __name__ == "__main__":
    run(paint, CHAR, picks=("idle_S", "idle_SE", "idle_E", "idle_NE", "idle_N", "walk_SE", "attack_SE"))
