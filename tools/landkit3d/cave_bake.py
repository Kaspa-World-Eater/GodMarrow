"""Bake the opening cave (cave3d.py, painted by paint_cave.py) for the game, in the baked-land format the cove uses
(cove_bake.py, read by world/baked_ground.gd), into art/zones/opening_cave_s<SEED>/:

  c<A>_<B>.webp / _n.webp      the floors at the engine's scale (alpha 255 floor, 254 the blood pool, 0 solid rock)
  c<A>_<B>_up.webp / _up_n     what stands up off the floor (the walls' columns, the pillars, the faces, the heaps, the
                               braziers), cut into half-yard bands of depth, each sorted with the bodies
  height.png                   the floor's height on the half-yard lattice (z = v * k + z0); the blood pool at its surface
  block.png                    255 where the rock is solid or something stands at a body's height (taken from the
                               render itself: any surface 0.35 to 2.4 yards above the highest walk floor within half a
                               yard blocks its half-yard; in the pool, half a yard above the blood's surface)
  index.json                   the chunks and their bands, with "water": "red" (the pool moves with the Red's shader)

The tiles are rendered in one Blender run (blend_tiles.py) with each camera placed so every pixel's centre lands on an
engine pixel of the zone's screen; check_align proves it from the position pass.

  python tools/landkit3d/cave_bake.py WORK_DIR [render|paint|all]
"""
import os
import sys
import json
import time
import types
import subprocess
import numpy as np
from PIL import Image
from scipy import ndimage as nd

os.environ.setdefault("GM_T", "0.0")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
for _m in ("bpy", "bmesh", "mathutils"):                                  # cave3d's floor is plain maths; its module
    if _m not in sys.modules:                                             # imports Blender's at the top
        sys.modules[_m] = types.ModuleType(_m)
sys.modules["mathutils"].Vector = sys.modules["mathutils"].Matrix = object
import cave3d as CV                                                       # noqa: E402

BLENDER = r"C:/Program Files/Blender Foundation/Blender 4.5/blender.exe"
ZONE, SEED = "opening_cave", 9301
KX, KY, KZ = 18.0, 9.0, 21.0
RES = 2
SCALE = 4 // RES
CW, CH = 320, 176
TA = 2
MX, MY = 96, 64
OX, OY = -14.0, -42.0                                                     # the zone's (0, 0) corner in the world (yards)
W, H = 25, 51                                                             # the zone, tiles (yards)
HZ0, HK = -1.0, 0.05
BAND = 0.5
PAD = 4
POOL_MAT = 24
POOL_Z = -0.18                                                            # the blood's surface: the pilgrim wades on it
BLOCK_LO, BLOCK_HI = 0.35, 2.4
BLOCK_POOL = 0.5                                                          # in the blood the pilgrim wades past the half-sunk dead
# the stairs' head to the hall's edge: cave3d's floor leaves it as rock, but the render cuts the columns there low, at
# the hall's height (its camera-side cut, near_low + 0.45), so the stairs climb onto them; walked at their mean height
# (to do at the next render: make it real floor in cave3d.floor_at, so the mesh and the walk read one function)
LANDING = (CV.STAIR[0], CV.STAIR[1], CV.STAIR[3] - 3.2, CV.STAIR[3])     # x from, x to, y from, y to (yards)
LANDING_Z = CV.FLOOR_HALL + 0.2
G0X, G0Y, GQ = OX - 4.0, OY - 4.0, 0.25                                   # the walk grid: its corner and step (yards)
VOID = np.array([0.03, 0.026, 0.034])                                     # the rock's last step above black
OUT = os.path.join(ROOT, "art", "zones", "%s_s%d" % (ZONE, SEED))


def floor_np(X, Y):
    f = np.vectorize(lambda x, y: np.nan if CV.floor_at(x, y) is None else CV.floor_at(x, y), otypes=[float])
    return f(X, Y)


def walk_z(X, Y):
    """the height a body stands at: the floor, the stairs' landing, the throne's dais (cave3d.dais_at), or the blood's
    surface over the pool"""
    z = floor_np(X, Y)
    land = (X > LANDING[0]) & (X < LANDING[1]) & (Y > LANDING[2]) & (Y <= LANDING[3] + 0.01) & np.isnan(z)   # the top
    z = np.where(land, LANDING_Z, z)                                       # step's own edge too: no seam of rock
    dais = np.vectorize(lambda x, y: np.nan if CV.dais_at(x, y) is None else CV.dais_at(x, y), otypes=[float])(X, Y)
    z = np.where(~np.isnan(dais) & ~np.isnan(z), CV.FLOOR_HALL + dais, z)
    inpool = np.vectorize(lambda x, y: CV._ell(x, y, CV.POOL) < 1.0 and np.hypot(x - CV.BASIN[0], y - CV.BASIN[1]) < CV.BASIN[2] + 1.3,
                          otypes=[bool])(X, Y)
    return np.where(inpool & ~np.isnan(z), np.maximum(z, POOL_Z), z), inpool


def walk_grid():
    """the walk floor read once on a quarter-yard grid over the zone and a margin:
    - the height a body stands at (NaN in the rock), and where the pool is;
    - the highest walk floor within half a yard: what a thing's height is measured from (a sword lying across a step's
      edge rests on the step above it, not 0.4 yards over the one below, so it does not block the stairs);
    - the highest within 2.5 yards: the floor a wall borders, which sets its depth (a wall sorted as if it stood on the
      ground drew over a pilgrim on the stairs or in the hall, six yards up)"""
    nx, ny = int((W + 8) / GQ) + 1, int((H + 8) / GQ) + 1
    gx, gy = np.meshgrid(G0X + np.arange(nx) * GQ, G0Y + np.arange(ny) * GQ)
    z, inpool = walk_z(gx, gy)
    zi = np.where(np.isnan(z), -np.inf, z)
    return z, inpool, nd.maximum_filter(zi, size=5), nd.maximum_filter(zi, size=21)


def at(grid, X, Y):
    j = np.clip(np.round((Y - G0Y) / GQ).astype(int), 0, grid.shape[0] - 1)
    i = np.clip(np.round((X - G0X) / GQ).astype(int), 0, grid.shape[1] - 1)
    return grid[j, i]


def void_fade(img, X, Y, Z, rock, wz):
    """the rock on the camera's side falls into the dark below the rooms. A still frames the rooms; the bake shows the
    whole zone, so the cliffs under the hall and beside the stairs (cut low on the camera's side) stand open to the
    void, and the paint's bounce (the weak light of everything lit nearby) left their faces a flat grey. Below the floor
    of the room each borders (found toward the camera's back), they fall to black within a couple of yards
    (CINEMATOGRAPHY rule 6, far black; rule 5, near-black foreground mass)"""
    fr = np.full(X.shape, np.nan)
    for dd in (0.5, 1.0, 1.5, 2.0, 3.0, 4.5, 6.0, 8.0, 10.0, 13.0, 16.0):
        fr = np.where(np.isnan(fr) & rock, at(wz, X - dd, Y - dd), fr)
    depth = np.where(np.isnan(fr), 0.0, fr - Z)
    k = np.exp(-np.clip(depth - 0.25, 0, None) / 1.1)[..., None]
    return img * k + VOID * (1 - k)


def grid_of(w, h):
    x0 = int(np.floor(-h * KX / 16.0)) * 16
    y0 = -160
    nx = int(np.ceil((w * KX - x0) / CW))
    ny = int(np.ceil(((w + h) * KY - y0) / CH))
    keep = []
    for b in range(ny):
        for a in range(nx):
            ex = x0 + a * CW + np.linspace(0, CW, 9)
            ey = y0 + b * CH + np.linspace(0, CH + 8.0 * KZ, 13)
            u, v = np.meshgrid(ex / KX, ey / KY)
            x, y = (u + v) / 2, (v - u) / 2
            if ((x > -3) & (x < w + 3) & (y > -3) & (y < h + 3)).any():
                keep.append((a, b))
    return x0, y0, nx, ny, keep


def tiles_for(keep, x0, y0, work):
    groups = {}
    for a, b in keep:
        groups.setdefault((a // TA, b // TA), []).append((a, b))
    out = []
    gw, gh = RES * (TA * CW + 2 * MX), RES * (TA * CH + 2 * MY)
    for (ga, gb), chs in sorted(groups.items()):
        A0, B0 = ga * TA, gb * TA
        sx0, sy0 = x0 + A0 * CW - MX, y0 + B0 * CH - MY
        d1 = (sx0 + (gw - 1) / (2.0 * RES)) / KX + (OX - OY)              # fx - fy
        d2 = (sy0 + (gh - 1) / (2.0 * RES)) / KY + (OX + OY)              # fx + fy
        out.append(dict(out=os.path.join(work, "t%d_%d" % (ga, gb)), focus=[(d1 + d2) / 2.0, (d2 - d1) / 2.0], w=gw, h=gh,
                        A0=A0, B0=B0, sx0=sx0, sy0=sy0, chunks=chs))
    return out


def render(tiles, work):
    js = os.path.join(work, "tiles.json")
    json.dump([dict(out=t["out"], focus=t["focus"], w=t["w"], h=t["h"], zoom=RES) for t in tiles], open(js, "w"))
    t0 = time.time()
    p = subprocess.run([BLENDER, "--background", "--python", os.path.join(HERE, "blend_tiles.py"), "--", "cave3d", js],
                       env=dict(os.environ), capture_output=True, text=True)
    open(os.path.join(work, "blender.log"), "w").write(p.stdout + p.stderr)
    print("rendered %d tiles in %.0fs (exit %d)" % (len(tiles), time.time() - t0, p.returncode), flush=True)


def check_align(d, t):
    pos, al = d["pos"], d["alpha"] > 0.5
    jj, ii = np.nonzero(al)
    sel = np.linspace(0, len(jj) - 1, min(len(jj), 4000)).astype(int)
    jj, ii = jj[sel], ii[sel]
    x, y, z = pos[jj, ii, 0], pos[jj, ii, 1], pos[jj, ii, 2]
    sx = (x - y - (OX - OY)) * KX
    sy = (x + y - OX - OY) * KY - z * KZ
    return float(np.median(sx - (t["sx0"] + ii / RES))), float(np.median(sy - (t["sy0"] + jj / RES)))


def screen_nmap(n):
    VIEW = np.array([1.0, 1.0, 2 * KY / KZ])
    VIEW = VIEW / np.linalg.norm(VIEW)
    sr = (n[..., 0] - n[..., 1]) / np.sqrt(2)
    su = n[..., 2] * 0.85 - (n[..., 0] + n[..., 1]) / np.sqrt(2) * 0.5
    sz = (n * VIEW).sum(2)
    nm = np.dstack([sr, su, sz])
    return nm / (np.linalg.norm(nm, axis=2, keepdims=True) + 1e-9)


def cut_chunks(t, d, img, blocks, G):
    wz, inpool, near, wide = G
    pos, mat, n, al = d["pos"], d["mat"], d["normal"], d["alpha"] > 0.5
    X, Y, Zp = pos[..., 0], pos[..., 1], pos[..., 2]
    zx, zy = X - OX, Y - OY
    fz = at(wz, X, Y)                                                     # the walk floor under each pixel
    solid = np.isnan(fz)
    fz = np.where(solid, Zp, fz)
    water = (mat == POOL_MAT)
    hz = Zp - fz
    outside = ~al | (zx < -2.5) | (zy < -2.5) | (zx > W + 2.5) | (zy > H + 2.5)
    img = void_fade(img, X, Y, Zp, solid & al, wz)
    tall = ((hz > 0.45) | solid) & ~water & al
    # what blocks a body: surfaces standing at a body's height over the highest walk floor within half a yard (the blood's
    # surface in the pool, where only what stands half a yard clear of it blocks), by half-yard cell
    hb = Zp - at(near, X, Y)
    lo = np.where(at(inpool, X, Y), BLOCK_POOL, BLOCK_LO)
    bm = al & ~solid & ~water & (hb > lo) & (hb < BLOCK_HI)
    if bm.any():
        gi = np.clip(np.round(zx[bm] * 2).astype(int), 0, 2 * W)
        gj = np.clip(np.round(zy[bm] * 2).astype(int), 0, 2 * H)
        np.add.at(blocks, (gj, gi), 1)
    # the depth each pixel sorts at: its own floor; the rock at the floor of the room it borders
    lift = np.where(solid, at(wide, X, Y), fz)
    sortk = (zx + zy) - (KZ / KY) * np.maximum(np.where(np.isfinite(lift), lift, 0.0), 0.0)
    nrgb = np.clip(screen_nmap(np.where(water[..., None], np.array([0.0, 0.0, 1.0]), n)) * 0.5 + 0.5, 0, 1)
    rows = []
    for a, b in t["chunks"]:
        iy0, ix0 = RES * (MY + (b - t["B0"]) * CH), RES * (MX + (a - t["A0"]) * CW)
        sl = (slice(iy0, iy0 + RES * CH), slice(ix0, ix0 + RES * CW))
        rgb = np.clip(img[sl], 0, 1)
        alpha = np.where(outside[sl], 0, np.where(water[sl], 254, 255)).astype(np.uint8)
        name = "c%d_%d" % (a, b)
        Image.fromarray(np.dstack([(rgb * 255).astype(np.uint8), alpha]), "RGBA").save(
            os.path.join(OUT, name + ".webp"), lossless=True, method=6)
        Image.fromarray((nrgb[sl] * 255).astype(np.uint8), "RGB").save(os.path.join(OUT, name + "_n.webp"), lossless=True, method=6)
        up = tall[sl] & ~outside[sl]
        dep = sortk[sl]
        bands = []
        if up.any():
            kb = np.floor(dep / BAND).astype(int)
            parts, nparts, hy = [], [], 0
            for kk in np.unique(kb[up]):
                m = up & (kb == kk)
                ys, xs = np.nonzero(m)
                if len(ys) < 3:
                    continue
                r0, r1, c0, c1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
                tile = np.zeros((r1 - r0, c1 - c0 + 2 * PAD, 4), np.uint8)
                tile[:, PAD:PAD + c1 - c0, :3] = (rgb[r0:r1, c0:c1] * 255).astype(np.uint8)
                tile[:, PAD:PAD + c1 - c0, 3] = m[r0:r1, c0:c1] * 255
                parts.append(tile)
                nt = np.zeros((r1 - r0, c1 - c0 + 2 * PAD, 4), np.uint8)
                nt[:, PAD:PAD + c1 - c0, :3] = (nrgb[sl][r0:r1, c0:c1] * 255).astype(np.uint8)
                nt[:, PAD:PAD + c1 - c0, 3] = m[r0:r1, c0:c1] * 255
                nparts.append(nt)
                bands.append(dict(d=round((kk + 0.5) * BAND, 2), x=int(c0) - PAD, y=int(r0), w=int(c1 - c0) + 2 * PAD,
                                  h=int(r1 - r0), ay=int(hy), sway=False))
                hy += r1 - r0
            if parts:
                wmax = max(p_.shape[1] for p_ in parts)
                atlas = np.zeros((hy, wmax, 4), np.uint8)
                natlas = np.zeros((hy, wmax, 4), np.uint8)
                for p_, q_, bd in zip(parts, nparts, bands):
                    atlas[bd["ay"]:bd["ay"] + bd["h"], :bd["w"]] = p_
                    natlas[bd["ay"]:bd["ay"] + bd["h"], :bd["w"]] = q_
                Image.fromarray(atlas, "RGBA").save(os.path.join(OUT, name + "_up.webp"), lossless=True, method=6)
                Image.fromarray(natlas, "RGBA").save(os.path.join(OUT, name + "_up_n.webp"), lossless=True, method=6)
        rows.append(dict(a=a, b=b, file=name + ".webp", normal=name + "_n.webp", up=(name + "_up.webp") if bands else "",
                         up_n=(name + "_up_n.webp") if bands else "", bands=bands,
                         pos=[4 * (t["x0"] + a * CW) - SCALE / 2.0, 4 * (t["y0"] + b * CH) - SCALE / 2.0]))
    return rows


def lattice(blocks):
    gx, gy = np.meshgrid(np.arange(0, 2 * W + 1), np.arange(0, 2 * H + 1))
    X, Y = OX + gx * 0.5, OY + gy * 0.5
    z, inpool = walk_z(X, Y)
    solid = np.isnan(z)
    hg = np.clip(np.round((np.where(solid, HZ0, z) - HZ0) / HK), 0, 255).astype(np.uint8)
    bl = np.zeros(hg.shape, np.uint8)
    bl[solid] = 255
    bl[blocks >= 3] = 255
    bl[inpool & ~solid & (bl == 0)] = 128
    return hg, bl


def main():
    work = sys.argv[1]
    step = sys.argv[2] if len(sys.argv) > 2 else "all"
    os.makedirs(work, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    x0, y0, nx, ny, keep = grid_of(W, H)
    tiles = tiles_for(keep, x0, y0, work)
    for t in tiles:
        t["x0"], t["y0"] = x0, y0
    if os.environ.get("GM_ONLY"):
        only = set(os.environ["GM_ONLY"].split(","))
        tiles = [t for t in tiles if os.path.basename(t["out"]) in only]
    print("zone %dx%d: %d chunks of %d, %d tiles" % (W, H, len(keep), nx * ny, len(tiles)), flush=True)
    if step in ("render", "all"):
        render(tiles, work)
    if step in ("paint", "all"):
        import paint_cave as PC
        rows = []
        blocks = np.zeros((2 * H + 1, 2 * W + 1), np.int32)
        G = walk_grid()
        t0 = time.time()
        for t in tiles:
            pz = os.path.join(t["out"], "passes.npz")
            if not os.path.exists(pz):
                print("  missing", pz, flush=True)
                continue
            d = dict(np.load(pz, allow_pickle=True))
            ex, ey = check_align(d, t)
            img = PC.paint(d, float(os.environ["GM_T"]))
            img = img[0] if isinstance(img, tuple) else img
            rows += cut_chunks(t, d, img, blocks, G)
            print("  %s: aligned to %.2f, %.2f px; %d chunks (%.0fs)" % (os.path.basename(t["out"]), ex, ey, len(t["chunks"]),
                                                                          time.time() - t0), flush=True)
        hg, bl = lattice(blocks)
        Image.fromarray(hg, "L").save(os.path.join(OUT, "height.png"))
        Image.fromarray(bl, "L").save(os.path.join(OUT, "block.png"))
        rows.sort(key=lambda r: (r["b"], r["a"]))
        idx = dict(zone=ZONE, seed=SEED, w=W, h=H, scale=SCALE, res=RES, chunk=[CW, CH], origin=[x0, y0], band=BAND, chunks=rows,
                   fx=[], water="red", world_origin=[OX, OY],
                   height=dict(file="height.png", res=0.5, z0=HZ0, k=HK, lift=KZ * 4),
                   baked="tools/landkit3d/cave_bake.py through cave3d.py and paint_cave.py")
        with open(os.path.join(OUT, "index.json"), "w", newline="\n") as fh:
            json.dump(idx, fh, indent=0)
        print("wrote", OUT, len(rows), "chunks", flush=True)


if __name__ == "__main__":
    main()
