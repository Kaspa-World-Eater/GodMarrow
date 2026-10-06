"""Painted ruins and stone, to docs/PAINTED_STANDARD.md (Derek 2026-10-06): a broken pillar, a wall fragment, two
gravestones and rubble. Same rules as painted_tiles.py: short ramps, broad tones by face (lit left, dark right, light
from the upper left), weathering as long vertical strokes (rain-streaks run down stone), pigment pooled dark at the
foot and in every crack and joint, a soft paper tooth, moss in strokes where water sits. Carving (bands, a sigil ring)
so nothing is a plain tube.

  python tools/art_study/painted_ruins.py OUT.png
"""
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, __file__.rsplit("\\", 1)[0].rsplit("/", 1)[0])
from painted_tiles import vn, fbm, strokes, hexc, bayer, ground, place  # noqa: E402

STONE = [hexc(c) for c in ("#121014", "#25222a", "#3b3740", "#57525a", "#7d7678", "#a59c96")]
MOSS = [hexc(c) for c in ("#151d10", "#25321a", "#3a4a24", "#56682f")]


def shade(v, ramp, d, dith=0.06):
    v = np.clip(v + (d - 0.5) * dith * 2, 0, 0.999)
    return np.array(ramp)[(v * len(ramp)).astype(int)]


def canvas(w, h):
    return np.zeros((h, w, 4))


def pillar(seed=1):
    """a fluted column snapped off: a cylinder lit from the left, flutes as vertical grooves, a carved band, the break
    jagged on top with its raw stone lighter, rain-streaks down it, moss pooled at the foot"""
    W, H = 30, 70
    c = canvas(W, H)
    d = bayer(H, W)
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    cx, R = W / 2, 10.5
    u = (xx - cx) / R                                      # -1 left edge .. 1 right edge
    inside = np.abs(u) <= 1
    nrm = np.sqrt(np.clip(1 - u * u, 0, 1))
    # lit from the upper left: a broad lit side, a core shadow just past the middle, reflected light at the far edge
    light = 0.62 - u * 0.38 - np.clip(u - 0.25, 0, 1) * 0.25 + np.clip(u - 0.8, 0, 1) * 0.6
    flute = (np.cos(np.arcsin(np.clip(u, -1, 1)) * 8) < -0.55) * -0.14 * (0.5 + nrm * 0.5)   # eight flutes, cut grooves
    streak = strokes(xx, yy, np.pi / 2, 0.04, 0.55, seed) # rain-streaks running down
    v = light + flute + (streak - 0.5) * 0.18 + (fbm(xx * 0.2, yy * 0.2) - 0.5) * 0.06
    rng = np.random.default_rng(seed)
    top = 14 + (vn(xx * 0.35 + seed, np.zeros_like(xx)) - 0.5) * 12      # the break, jagged
    body = inside & (yy > top) & (yy < H - 4)
    v = np.where((yy > 40) & (yy < 44), v - 0.08 + (yy == 40) * 0.25, v)  # a carved band: lit lip, shadow under
    v = np.where((yy > 40) & (yy < 44) & (((xx + yy) % 4) < 1.5), v - 0.15, v)   # its pattern, cut
    v = np.where(body & (yy < top + 2.5), v + 0.25, v)                    # the raw broken stone, lighter
    crack = (strokes(xx, yy, 1.35, 0.08, 2.4, seed + 3) > 0.93) & body & (fbm(xx * 0.1, yy * 0.05 + seed) > 0.55)
    v = np.where(crack, 0.05, v)
    v = np.where(body & (yy > H - 14), v - (yy - (H - 14)) / 14 * 0.3, v)  # pooled dark toward the foot
    col = shade(v, STONE, d)
    moss = body & (yy > H - 16) & (strokes(xx, yy, -1.2, 0.2, 0.7, seed + 5) > 0.55)
    col = np.where(moss[..., None], shade(0.2 + (yy - (H - 16)) / 16 * -0.1 + strokes(xx, yy, -1.2, 0.3, 0.9) * 0.6, MOSS, d), col)
    c[..., :3] = col
    c[..., 3] = body.astype(float)
    # base plinth
    for y in range(H - 6, H):
        for x in range(2, W - 2):
            lv = 0.62 - (x / W) * 0.35 - (y - (H - 6)) * 0.04
            c[y, x, :3] = shade(np.array([lv]), STONE, np.array([d[y, x]]))[0]
            c[y, x, 3] = 1
    for x in range(2, W - 2):
        c[H - 6, x, :3] = STONE[5] if x < W / 2 else STONE[3]
        c[H - 1, x, :3] = STONE[0]
    return c


def wall(seed=2):
    """a wall fragment in iso: two faces (lit front-left, dark right), courses of blocks with dark pooled joints, the top
    broken away in steps, ivy hanging in strokes"""
    W, H = 74, 58
    c = canvas(W, H)
    d = bayer(H, W)
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    split = 50                                             # the corner: left face is x < split
    # left face runs down-right at 1:2, right face up-right
    base_l = H - 4 - (split - xx) * 0.5
    base_r = H - 4 - (xx - split) * 0.5
    base = np.where(xx < split, base_l, base_r)
    top = 6 + (vn(xx * 0.18 + seed, np.zeros_like(xx)) - 0.5) * 18 + np.abs(xx - 24) * 0.25
    top = np.floor(top / 3) * 3                            # broken in steps, course by course
    face_l = (xx < split) & (yy > top + (split - xx) * -0.5 + (split - xx) * 0.5 - (split - xx) * 0.5) & (yy < base)
    face_l = (xx < split) & (yy > top - (split - xx) * 0.5 + 10) & (yy < base)
    face_r = (xx >= split) & (xx < W - 2) & (yy > top - (xx - split) * 0.5 + 10 - 0) & (yy < base)
    # blocks: courses every 6 rows (sloped with each face), staggered joints
    cy_l = yy + (split - xx) * 0.5
    cy_r = yy + (xx - split) * 0.5
    cy = np.where(xx < split, cy_l, cy_r)
    course = np.floor(cy / 6)
    jx = np.where(xx < split, xx, xx * 1.6)
    joint_h = (cy % 6) < 1
    joint_v = ((jx + course * 5) % 11) < 1
    streak = strokes(xx, yy, np.pi / 2, 0.05, 0.5, seed)
    blk = vn(np.floor((jx + course * 5) / 11) * 3.1, course * 1.7)       # each block its own tone
    v = np.where(xx < split, 0.58, 0.3) + (blk - 0.5) * 0.18 + (streak - 0.5) * 0.16
    v = np.where(joint_h | joint_v, 0.06, v)
    v = np.where(((cy % 6) >= 1) & ((cy % 6) < 2) & ~joint_v, v + 0.1, v)  # each block's lit upper edge
    v = v - np.clip((yy - (base - 10)) / 10, 0, 1) * 0.2                  # pooled dark at the foot
    solid = face_l | face_r
    col = shade(v, STONE, d)
    # the broken top: a lighter raw edge
    edge = solid & ~np.roll(solid, 1, axis=0)
    col = np.where(edge[..., None], np.array(STONE[5]) * np.where(xx < split, 1.0, 0.75)[..., None], col)
    # ivy: strokes hanging from the top
    ivy = solid & (strokes(xx, yy, np.pi / 2, 0.09, 0.8, seed + 9) > 0.66) & (yy < top + 30) & (fbm(xx * 0.08 + 2, yy * 0.02) > 0.5)
    col = np.where(ivy[..., None], shade(0.35 + strokes(xx, yy, 0.6, 0.4, 0.9) * 0.6 - (xx >= split) * 0.25, MOSS, d), col)
    c[..., :3] = col
    c[..., 3] = solid.astype(float)
    return c


def grave(seed=3, sigil=True):
    """a gravestone, leaning a little: rounded head, lit left edge, dark right, a carved sigil ring, lichen, rain-streaks"""
    W, H = 26, 40
    c = canvas(W, H)
    d = bayer(H, W)
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    lean = 0.08 if seed % 2 else -0.06
    x0 = xx - (H - yy) * lean
    cx = W / 2
    hw = 8.5
    head = 4 + hw * 0.0
    inside = (np.abs(x0 - cx) <= hw) & (yy < H - 2) & ((yy > head + hw) | (((x0 - cx) / hw) ** 2 + ((yy - (head + hw)) / hw) ** 2 <= 1))
    u = (x0 - cx) / hw
    v = 0.55 - u * 0.25 + (strokes(xx, yy, np.pi / 2, 0.06, 0.6, seed) - 0.5) * 0.2
    edge_l = inside & ~np.roll(inside, 1, axis=1)
    edge_r = inside & ~np.roll(inside, -1, axis=1)
    v = np.where(edge_l, 0.85, v)
    v = np.where(edge_r, 0.08, v)
    if sigil:
        rr = np.hypot(x0 - cx, yy - 15)
        ring = (np.abs(rr - 4.5) < 0.7) | (rr < 1.3)        # a ring round a seed: the lantern's mark
        cut_lip = (np.abs(rr - 5.3) < 0.5) & (yy < 15)
        v = np.where(ring & inside, 0.1, v)
        v = np.where(cut_lip & inside, v + 0.2, v)
    for k in range(3):                                     # lines of worn lettering
        y = 24 + k * 3
        v = np.where(inside & (np.abs(yy - y) < 0.5) & (np.abs(x0 - cx) < 5 - k) & (vn(xx * 0.8, yy) > 0.35), 0.15, v)
    v = v - np.clip((yy - (H - 10)) / 10, 0, 1) * 0.25
    col = shade(v, STONE, d)
    lich = inside & (fbm(xx * 0.3 + seed, yy * 0.3) > 0.66)
    col = np.where(lich[..., None], np.array(hexc("#6e7448")) * (1 - (u > 0) * 0.3)[..., None], col)
    c[..., :3] = col
    c[..., 3] = inside.astype(float)
    return c


def rubble(seed=4):
    W, H = 44, 18
    c = canvas(W, H)
    rng = np.random.default_rng(seed)
    d = bayer(H, W)
    for i in range(9):
        bx, by = rng.uniform(4, W - 6), rng.uniform(6, H - 2)
        bw, bh = rng.uniform(3, 7), rng.uniform(2, 4)
        for y in range(int(by - bh), int(by) + 1):
            for x in range(int(bx - bw / 2), int(bx + bw / 2) + 1):
                if 0 <= x < W and 0 <= y < H:
                    top = y < by - bh + 1.5
                    left = x < bx
                    lv = 0.75 if top else (0.45 if left else 0.22)
                    c[y, x, :3] = STONE[int(np.clip(lv + (d[y, x] - 0.5) * 0.1, 0, 0.99) * 6)]
                    c[y, x, 3] = 1
        for x in range(int(bx - bw / 2), int(bx + bw / 2) + 1):   # pooled shadow under each
            if 0 <= x < W and int(by) + 1 < H and c[int(by) + 1, x, 3] == 0:
                c[int(by) + 1, x, :3] = STONE[0]
                c[int(by) + 1, x, 3] = 0.8
    return c


def main(out):
    W, H = 300, 120
    sheet = np.zeros((H, W, 4))
    sheet[..., :3] = hexc("#0b0a0c")
    sheet[..., 3] = 1
    g = ground("grass", 300, 36)
    place(sheet, np.dstack([g[0], np.ones((36, 300))]), 0, 84)
    place(sheet, wall(), 8, 48)
    place(sheet, pillar(), 92, 34)
    place(sheet, grave(3), 136, 66)
    place(sheet, grave(6, False), 166, 70)
    place(sheet, rubble(), 196, 90)
    place(sheet, pillar(9), 246, 40)
    im = Image.fromarray((np.clip(sheet, 0, 1) * 255).astype(np.uint8), "RGBA").resize((W * 4, H * 4), Image.NEAREST)
    im.save(out)
    print("saved", out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "painted_ruins.png")
