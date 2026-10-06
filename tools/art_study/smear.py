"""Smear frames for a weapon's strike (the art study: "a smear is a non-key frame shaped like the path"; SLYNYRD: one
sharp smear, few and fast). On the frame where the blade crosses, the space it swept since the previous frame is painted
as a pale streak: dense along the blade's leading edge, thinning back toward where it was, in whole pixels thinned by
the 4x4 ordered dither (the title's method). Behind the blade only; it never paints over the figure.

The blade is found by its part mask (frame_NNN.parts.png, the shape file's part table: sword_blade, sword_tip).

    python tools/art_study/smear.py CHAR_DIR SHAPES_FILE [--clip attack] [--frames 3] [--preview OUT.png]
"""
import argparse, json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'pixelforge'))
from pixelforge.shapes import part_table  # noqa: E402

B4 = np.array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]) / 16.0
STEEL = np.array([236.0, 232.0, 214.0])
EDGE = np.array([255.0, 250.0, 232.0])


def blade_line(parts: np.ndarray, ids: list[int]):
    """The blade as a line (hilt end, tip end) from its mask: the principal axis of its pixels, ends at the extremes."""
    m = np.isin(parts, ids)
    ys, xs = np.nonzero(m)
    if len(xs) < 4:
        return None
    pts = np.stack([xs, ys], 1).astype(float)
    c = pts.mean(0)
    u = np.linalg.svd(pts - c, full_matrices=False)[2][0]
    t = (pts - c) @ u
    return c + u * t.min(), c + u * t.max()


def smear(prev_parts, cur_rgba, cur_parts, ids, hand_ids):
    a = np.asarray(cur_rgba).astype(float)
    L0, L1 = blade_line(prev_parts, ids), blade_line(cur_parts, ids)
    if L0 is None or L1 is None:
        return Image.fromarray(a.astype(np.uint8), 'RGBA')
    # orient both lines hilt-first: the hilt is the end nearer the hand
    def hilt_first(L, parts):
        hy, hx = np.nonzero(np.isin(parts, hand_ids))
        if len(hx) == 0:
            return L
        h = np.array([hx.mean(), hy.mean()])
        return L if np.linalg.norm(L[0] - h) <= np.linalg.norm(L[1] - h) else (L[1], L[0])
    p0, q0 = hilt_first(L0, prev_parts)
    p1, q1 = hilt_first(L1, cur_parts)
    H, W = a.shape[:2]
    # sample the swept band: for s along the blade (hilt 0 -> tip 1) and k back in time (now 0 -> before 1)
    ns = int(max(np.linalg.norm(q1 - p1), np.linalg.norm(q0 - p0)) * 2) + 2
    nk = int(max(np.linalg.norm(q1 - q0), np.linalg.norm(p1 - p0)) * 2) + 2
    for s in np.linspace(0.15, 1.0, ns):
        now = p1 + (q1 - p1) * s
        was = p0 + (q0 - p0) * s
        for k in np.linspace(0.0, 1.0, nk):
            x, y = now + (was - now) * k
            xi, yi = int(round(x)), int(round(y))
            if not (0 <= xi < W and 0 <= yi < H):
                continue
            if a[yi, xi, 3] > 0 and k > 0.02:
                continue                          # never over the figure (only the blade's own edge at k=0)
            dens = (1.0 - k) ** 1.6 * (0.35 + 0.65 * s)   # thick at the leading edge and toward the tip
            if dens > B4[(yi & 3) * 4 + (xi & 3)]:
                col = EDGE if k < 0.12 else STEEL
                al = 255 if k < 0.12 else 200
                a[yi, xi, :3] = col
                a[yi, xi, 3] = max(a[yi, xi, 3], al)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('char_dir'); ap.add_argument('shapes')
    ap.add_argument('--clip', default='attack'); ap.add_argument('--frames', default='3')
    ap.add_argument('--preview')
    A = ap.parse_args()
    table, _ = part_table(json.load(open(A.shapes, encoding='utf8')))
    ids = [e['index'] for e in table if e['name'] in ('sword_blade', 'sword_tip')]
    hand_ids = [e['index'] for e in table if e['name'] in ('sword_grip', 'sword_guard')]
    fr = [int(x) for x in A.frames.split(',')]
    root = os.path.join(A.char_dir, 'frames')
    raw = os.path.join(A.char_dir, 'frames_raw')
    shots = []
    for d in sorted(os.listdir(root)):
        if not d.startswith(A.clip + '_'):
            continue
        src = os.path.join(raw if os.path.isdir(os.path.join(raw, d)) else root, d)
        for f in fr:
            cur = os.path.join(src, f'frame_{f:03d}.png')
            if not os.path.exists(cur):
                continue
            prev_p = np.asarray(Image.open(os.path.join(src, f'frame_{f - 1:03d}.parts.png'))).astype(np.int32)
            cur_p = np.asarray(Image.open(os.path.join(src, f'frame_{f:03d}.parts.png'))).astype(np.int32)
            before = Image.open(cur).convert('RGBA')
            after = smear(prev_p, before, cur_p, ids, hand_ids)
            if A.preview:
                shots.append((before, after))
            else:
                after.save(os.path.join(root, d, f'frame_{f:03d}.png'))
    if A.preview and shots:
        W = sum(b.width for b, _ in shots); H = shots[0][0].height
        o = Image.new('RGBA', (W, H * 2), (40, 36, 40, 255)); x = 0
        for b, af in shots:
            o.alpha_composite(b, (x, 0)); o.alpha_composite(af, (x, H)); x += b.width
        o.save(A.preview)
        print(A.preview, len(shots))
    else:
        print('smeared', len(fr), 'frames in each', A.clip, 'view')


if __name__ == '__main__':
    main()
