"""Bake the Red Shore's cove (beach3d.py, painted by paint_shore.py) for the game, in the baked-land format the Sunken Bog
made (tools/worldgen/bog_bake.py, read by world/baked_ground.gd), into art/zones/red_shore_s<SEED>/:

  c<A>_<B>.webp      the ground at the engine's scale (the game draws it at 4, nearest): alpha 255 land, 254 the Red (the
                     game moves it), 0 past the zone's edge
  c<A>_<B>_n.webp    its screen-space normal map (the pilgrim's lantern lights the painted form through it)
  c<A>_<B>_up.webp   what stands up off the sand (the cliffs' columns, the bones, the shrine, the canoes, the cairns, the
  c<A>_<B>_up_n.webp dead), cut into half-yard bands of depth, each sorted with the bodies; and their normals
  height.png         the floor's height on the half-yard lattice (z = v * k + z0), which the game lifts bodies onto
  block.png          255 where something stands (the cliffs, every column, the shrine, the bones), 128 the Red
  index.json         the chunks and their bands, in bog_bake.py's schema, with "water": "red"

The 3D road renders whole tiles of chunks at once (blend_tiles.py builds the cove a single time): each tile's camera is
placed so every pixel's centre lands on an engine pixel of the zone's own screen, and the check below proves it from
the position pass. The Red is baked between beats (GM_CALM): the game moves it.

  python tools/landkit3d/cove_bake.py WORK_DIR [render|paint|all]
"""
import os
import sys
import json
import time
import subprocess
import numpy as np
from PIL import Image

os.environ.setdefault("GM_CALM", "1")
os.environ.setdefault("GM_T", "0.6")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import shore_floor as S                                                   # noqa: E402
import beach_floor as BF                                                  # noqa: E402

BLENDER = r"C:/Program Files/Blender Foundation/Blender 4.5/blender.exe"
ZONE, SEED = "red_shore", 9201
KX, KY, KZ = 18.0, 9.0, 21.0                                              # engine px a yard; the game is 4 times this
RES = 2                                                                   # texels an engine px (the 2 x 2 art grid,
SCALE = 4 // RES                                                          # painted standard 7): the game draws a texel at 2
CW, CH = 320, 176                                                         # a chunk, engine px (bog_bake.py)
TA = 2                                                                    # chunks along each side of a rendered tile
MX, MY = 96, 64                                                           # a tile's margin each side
O = -108.0                                                                # the zone's (0, 0) corner in the world (yards)
W = H = 145                                                               # the zone, tiles (yards)
HZ0, HK = -1.0, 0.05                                                      # the height map's byte: z = v * HK + HZ0
BAND = 0.5
PAD = 4
GROUND_MATS = (1, 24, 28)                                                 # the sand, the Red, the glossy coat
OUT = os.path.join(ROOT, "art", "zones", "%s_s%d" % (ZONE, SEED))


def grid_of(w, h):
    """bog_bake.grid_of: the chunk grid over the zone's screen, engine px, the zone's (0, 0) corner at the origin"""
    x0 = int(np.floor(-h * KX / 16.0)) * 16
    y0 = -128
    nx = int(np.ceil((w * KX - x0) / CW))
    ny = int(np.ceil(((w + h) * KY - y0) / CH))
    keep = []
    for b in range(ny):
        for a in range(nx):
            ex = x0 + a * CW + np.linspace(0, CW, 9)
            ey = y0 + b * CH + np.linspace(0, CH + 6.0 * KZ, 13)
            u, v = np.meshgrid(ex / KX, ey / KY)
            x, y = (u + v) / 2, (v - u) / 2
            if ((x > -3) & (x < w + 3) & (y > -3) & (y < h + 3)).any():
                keep.append((a, b))
    return x0, y0, nx, ny, keep


def tiles_for(keep, x0, y0, work):
    """the rendered tiles: TA x TA chunks each with a margin; each camera's focus set so a pixel (i, j)'s centre is the
    zone's screen point (SX0 + i, SY0 + j)"""
    groups = {}
    for a, b in keep:
        groups.setdefault((a // TA, b // TA), []).append((a, b))
    out = []
    gw, gh = RES * (TA * CW + 2 * MX), RES * (TA * CH + 2 * MY)
    for (ga, gb), chs in sorted(groups.items()):
        A0, B0 = ga * TA, gb * TA
        sx0, sy0 = x0 + A0 * CW - MX, y0 + B0 * CH - MY
        d1 = (sx0 + (gw - 1) / (2.0 * RES)) / KX                          # fx - fy (a texel's centre at sx0 + i / RES)
        d2 = (sy0 + (gh - 1) / (2.0 * RES)) / KY + 2 * O                  # fx + fy
        out.append(dict(out=os.path.join(work, "t%d_%d" % (ga, gb)), focus=[(d1 + d2) / 2.0, (d2 - d1) / 2.0], w=gw, h=gh,
                        A0=A0, B0=B0, sx0=sx0, sy0=sy0, chunks=chs))
    return out


def render(tiles, work):
    js = os.path.join(work, "tiles.json")
    json.dump([dict(out=t["out"], focus=t["focus"], w=t["w"], h=t["h"], zoom=RES) for t in tiles], open(js, "w"))
    env = dict(os.environ, GM_CALM="1", GM_T=os.environ["GM_T"], GM_OBST=os.path.join(work, "obst.json"))
    t0 = time.time()
    p = subprocess.run([BLENDER, "--background", "--python", os.path.join(HERE, "blend_tiles.py"), "--", "beach3d", js],
                       env=env, capture_output=True, text=True)
    open(os.path.join(work, "blender.log"), "w").write(p.stdout + p.stderr)
    print("rendered %d tiles in %.0fs (exit %d)" % (len(tiles), time.time() - t0, p.returncode), flush=True)


def check_align(d, t):
    """the pixel lattice against the zone's screen: from the position pass, where each pixel's surface point falls"""
    pos, al = d["pos"], d["alpha"] > 0.5
    jj, ii = np.nonzero(al)
    sel = np.linspace(0, len(jj) - 1, min(len(jj), 4000)).astype(int)
    jj, ii = jj[sel], ii[sel]
    x, y, z = pos[jj, ii, 0], pos[jj, ii, 1], pos[jj, ii, 2]
    sx = (x - y) * KX
    sy = (x + y - 2 * O) * KY - z * KZ
    return float(np.median(sx - (t["sx0"] + ii / RES))), float(np.median(sy - (t["sy0"] + jj / RES)))


def screen_nmap(n):
    """bog_bake.screen_nmap: the game's screen-space normal of a world normal"""
    VIEW = np.array([1.0, 1.0, 2 * KY / KZ])
    VIEW = VIEW / np.linalg.norm(VIEW)
    sr = (n[..., 0] - n[..., 1]) / np.sqrt(2)
    su = n[..., 2] * 0.85 - (n[..., 0] + n[..., 1]) / np.sqrt(2) * 0.5
    sz = (n * VIEW).sum(2)
    nm = np.dstack([sr, su, sz])
    return nm / (np.linalg.norm(nm, axis=2, keepdims=True) + 1e-9)


def cut_chunks(t, d, img):
    """the tile's chunks: the ground, its normals, the sorted tall layer"""
    pos, mat, n, al = d["pos"], d["mat"], d["normal"], d["alpha"] > 0.5
    X, Y, Zp = pos[..., 0], pos[..., 1], pos[..., 2]
    zx, zy = X - O, Y - O
    outside = ~al | (zx < -2.5) | (zy < -2.5) | (zx > W + 2.5) | (zy > H + 2.5)
    fz = BF.height(X, Y)
    water = (mat == 24)
    hz = Zp - fz
    tall = (hz > 0.45) & ~water & ~np.isin(mat, GROUND_MATS) & al
    sortk = (zx + zy) - (KZ / KY) * np.maximum(fz, 0.0)
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


def lattice(obst):
    """the floor's height and the block map on the half-yard lattice"""
    gx, gy = np.meshgrid(np.arange(0, 2 * W + 1), np.arange(0, 2 * H + 1))
    X, Y = O + gx * 0.5, O + gy * 0.5
    z = BF.height(X, Y)
    hg = np.clip(np.round((z - HZ0) / HK), 0, 255).astype(np.uint8)
    s, t = S.st(X, Y)
    bl = np.zeros(hg.shape, np.uint8)
    bl[s > BF.WATER + 0.6] = 128
    bl[BF.cove_d(s, t) > -0.4] = 255
    for (os_, ot_, r) in obst:
        bl[np.hypot(s - os_, t - ot_) < r] = 255
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
    if os.environ.get("GM_ONLY"):                                          # a trial: only these tiles (names "tA_B")
        only = set(os.environ["GM_ONLY"].split(","))
        tiles = [t for t in tiles if os.path.basename(t["out"]) in only]
    print("zone %dx%d: %d chunks of %d, %d tiles" % (W, H, len(keep), nx * ny, len(tiles)), flush=True)
    if step in ("render", "all"):
        render(tiles, work)
    if step in ("paint", "all"):
        import paint_shore as PS
        rows = []
        t0 = time.time()
        for t in tiles:
            pz = os.path.join(t["out"], "passes.npz")
            if not os.path.exists(pz):
                print("  missing", pz, flush=True)
                continue
            d = dict(np.load(pz))
            ex, ey = check_align(d, t)
            img, _ = PS.paint(d, float(os.environ["GM_T"]))
            rows += cut_chunks(t, d, img)
            print("  %s: aligned to %.2f, %.2f px; %d chunks (%.0fs)" % (os.path.basename(t["out"]), ex, ey, len(t["chunks"]),
                                                                          time.time() - t0), flush=True)
        obst = json.load(open(os.path.join(work, "obst.json"))) if os.path.exists(os.path.join(work, "obst.json")) else []
        hg, bl = lattice(obst)
        Image.fromarray(hg, "L").save(os.path.join(OUT, "height.png"))
        Image.fromarray(bl, "L").save(os.path.join(OUT, "block.png"))
        json.dump(obst, open(os.path.join(OUT, "obstacles.json"), "w"))
        rows.sort(key=lambda r: (r["b"], r["a"]))
        idx = dict(zone=ZONE, seed=SEED, w=W, h=H, scale=SCALE, res=RES, chunk=[CW, CH], origin=[x0, y0], band=BAND, chunks=rows,
                   fx=[], water="red", world_origin=[O, O],
                   height=dict(file="height.png", res=0.5, z0=HZ0, k=HK, lift=KZ * 4),       # Godot units a yard of height
                   baked="tools/landkit3d/cove_bake.py through beach3d.py and paint_shore.py")
        with open(os.path.join(OUT, "index.json"), "w", newline="\n") as fh:
            json.dump(idx, fh, indent=0)
        print("wrote", OUT, len(rows), "chunks", flush=True)


if __name__ == "__main__":
    main()
