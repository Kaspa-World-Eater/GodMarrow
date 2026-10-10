"""The Red's field for the game's live sea (world/red_sea.gd, shaders/red_sea.gdshader): the cove's true floor under and
round the water, fine enough for a swash a few centimetres deep, on the shore's own (s, t) grid.

  seafield.bin   float32 triples, row by row along t: (the floor's height in yards, solid 1/0 where rock or a column
                 stands, so no water is drawn there, the distance to the nearest column in yards up to 6); one texel
                 every RES yards from (S0, T0)
  index.json     "seafield": {file, s0, t0, res, ns, nt, cols}: cols the columns standing in the surf and the Red,
                 (s, t, r), for the foam that wraps them

Derek, 2026-10-10: "what happened to the cool sideways blood foam tide ... we need to enhance the blood ocean much
much more": the waves of the Blender loops (beach_floor.py's model) played live in the game.

  python tools/landkit3d/sea_field.py          (after cove_bake.py; cove_export.py calls it too)
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import beach_floor as BF                                                    # noqa: E402
import cove_bake as CB                                                      # noqa: E402

S0, S1 = 46.0, 178.0          # from the backshore out past the zone's seaward edge
T0, T1 = -122.0, 122.0
RES = 0.25


def write(out=None):
    out = out or CB.OUT
    ns = int(round((S1 - S0) / RES))
    nt = int(round((T1 - T0) / RES))
    s = S0 + (np.arange(ns) + 0.5) * RES
    t = T0 + (np.arange(nt) + 0.5) * RES
    ss, tt = np.meshgrid(s, t)
    g = BF.height_st(ss, tt).astype(np.float32)
    solid = (BF.cove_d(ss, tt) > -0.4).astype(np.float32)
    cols = []
    op = os.path.join(out, "obstacles.json")
    if os.path.exists(op):
        for (os_, ot_, r) in json.load(open(op)):
            if os_ > BF.WATER - 3.0 and r >= 0.4:                         # the columns, not the pebbles
                cols.append([round(float(os_), 3), round(float(ot_), 3), round(float(r), 3)])
                solid[np.hypot(ss - os_, tt - ot_) < r - 0.1] = 1.0
    # how far each texel lies from the nearest column's face (yards, to 6): the foam wraps them and trails off them
    from scipy import ndimage as nd
    cm = np.zeros(ss.shape, bool)
    for (os_, ot_, r) in cols:
        cm |= np.hypot(ss - os_, tt - ot_) < r
    cd = (np.minimum(nd.distance_transform_edt(~cm) * RES, 6.0) if cm.any() else np.full(ss.shape, 6.0)).astype(np.float32)
    data = np.stack([g, solid, cd], axis=-1).astype("<f4")
    data.tofile(os.path.join(out, "seafield.bin"))
    ip = os.path.join(out, "index.json")
    bi = json.load(open(ip, encoding="utf-8"))
    bi["seafield"] = dict(file="seafield.bin", s0=S0, t0=T0, res=RES, ns=ns, nt=nt, cols=cols)
    with open(ip, "w", newline="\n") as fh:
        json.dump(bi, fh, indent=0)
    print("sea field %dx%d (%.1f MB), %d columns in the Red" % (ns, nt, data.nbytes / 1e6, len(cols)), flush=True)


if __name__ == "__main__":
    write(sys.argv[1] if len(sys.argv) > 1 else None)
