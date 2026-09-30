"""Port one painted concept (a character on a flat dark ground) into a game sprite set.

The cut follows the figure's OUTLINE: whatever lies inside the silhouette stays opaque, however dark
(dark cloth, shadowed armour, the black under a robe). Only ground reachable from the picture's edge is removed.

Usage:
  python3 tools/port_concept.py SRC.png KIND [--height 195] [--colours 56] [--robe 0.55:0.94] [--ground-pool]
    --robe A:B   rows A..B of the figure (fractions of its height) are filled edge to edge along each row,
                 so the dark inside of a robe or cloak between the legs is kept. Pick the band from the hands
                 down to the hem; leave it out for figures with open gaps (arms held away, legs apart).
    --ground-pool  also removes a dim coloured shadow pool painted under the feet.
Writes art/sprites/KIND.png and KIND.json (one front frame, used for idle and walk: a look test).
"""
import argparse, json
import numpy as np
from PIL import Image
from scipy import ndimage as nd

GROUND_LUM = 11      # summed RGB at or under this is the painted ground
MIN_BLOB = 400       # source pixels; smaller specks are noise


def silhouette(rgb: np.ndarray, robe, ground_pool: bool) -> np.ndarray:
    lum = rgb.sum(2)
    fig = lum > GROUND_LUM
    if ground_pool:  # a dim teal pool under the feet: low red, some green, in the bottom tenth
        rows = np.arange(rgb.shape[0])[:, None]
        fig &= ~((rows > rgb.shape[0] * 0.9) & (rgb[..., 0] < 6) & (rgb[..., 1] < 36))
    fig = nd.binary_opening(fig)
    lab, n = nd.label(fig)
    sizes = nd.sum(fig, lab, range(1, n + 1))
    fig = np.isin(lab, 1 + np.flatnonzero(sizes > MIN_BLOB))
    fig = nd.binary_closing(fig, iterations=4)
    if robe:
        ys = np.flatnonzero(fig.any(1))
        top, h = ys[0], ys[-1] - ys[0]
        for y in range(int(top + robe[0] * h), int(top + robe[1] * h)):
            xs = np.flatnonzero(fig[y])
            if xs.size:
                fig[y, xs[0]:xs[-1] + 1] = True
    # the ground is only what the picture's edge can reach; every enclosed dark pocket is the figure
    return nd.binary_fill_holes(fig)


def to_sprite(rgb, fig, height, colours):
    ys, xs = np.nonzero(fig)
    rgb, fig = rgb[ys.min():ys.max() + 1, xs.min():xs.max() + 1], fig[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    k = height / fig.shape[0]
    size = (round(fig.shape[1] * k), height)
    alpha = np.array(Image.fromarray((fig * 255).astype(np.uint8)).resize(size, Image.BOX)) / 255.0
    premul = rgb * fig[..., None]
    col = np.array(Image.fromarray(premul.astype(np.uint8)).resize(size, Image.BOX)).astype(float)
    col = np.where(alpha[..., None] > 0.01, col / np.maximum(alpha[..., None], 1e-3), 0).clip(0, 255)
    solid = alpha > 0.45
    pal = Image.fromarray(col.astype(np.uint8)).quantize(colours, method=Image.FASTOCTREE, dither=Image.NONE).convert('RGB')
    out = np.dstack([np.array(pal), solid * 255]).astype(np.uint8)
    edge = solid & ~nd.binary_erosion(solid)          # a dark outline on the silhouette's edge
    out[edge, :3] = (out[edge, :3] * 0.35).astype(np.uint8)
    fy = np.flatnonzero(solid.any(1))[-1]            # feet: the lowest opaque row,
    fx = int(np.nonzero(solid[:height // 6])[1].mean())  # under the head (a figure standing square to us)
    return out, (int(fx), int(fy))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('kind')
    ap.add_argument('--height', type=int, default=195)
    ap.add_argument('--colours', type=int, default=56)
    ap.add_argument('--robe', default=None)
    ap.add_argument('--ground-pool', action='store_true')
    ap.add_argument('--out', default='art/sprites')
    a = ap.parse_args()
    rgb = np.array(Image.open(a.src).convert('RGB')).astype(int)
    robe = tuple(map(float, a.robe.split(':'))) if a.robe else None
    img, (fx, fy) = to_sprite(rgb, silhouette(rgb, robe, a.ground_pool), a.height, a.colours)
    Image.fromarray(img, 'RGBA').save(f'{a.out}/{a.kind}.png')
    h, w = img.shape[:2]
    idx = {f'{anim}/front/{i}': [0, 0, 0, w, h, -fx, -fy] for anim, n in (('idle', 4), ('walk', 8)) for i in range(n)}
    meta = {'kind': a.kind, 'category': 'hero', 'anims': {'idle': {'frames': 4, 'views': ['front']}, 'walk': {'frames': 8, 'views': ['front']}},
            'source': f'ported from a concept by tools/port_concept.py ({a.src.split("/")[-1]}); one still front frame, a look test'}
    json.dump({'meta': meta, 'sheets': [f'{a.kind}.png'], 'idx': idx}, open(f'{a.out}/{a.kind}.json', 'w'))
    print(a.kind, w, 'x', h, 'feet at', fx, fy)


if __name__ == '__main__':
    main()
