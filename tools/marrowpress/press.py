"""Marrowpress: our own pixel-art animation press. It animates a painted concept by deforming the painting itself,
then presses each frame down to the game's pixel grain.

How a frame is made:
  1. The concept is cut along its outline (tools/port_concept.py: enclosed dark stays opaque).
  2. A skeleton of bones is laid over the painting (rigs/<name>.json: joints in concept pixels, parents, a depth
     order). Every painted pixel is skinned to its two nearest bones, weighted by distance.
  3. A pose gives each bone a turn about its joint, a stretch along its length (foreshortening) and a shift.
     Forward kinematics carries a parent's motion to its children.
  4. The painting is splatted into place at full resolution, front parts over back ones; the few holes a stretch
     opens are filled from their nearest painted neighbour.
  5. The frame is pressed to the game's grain (box filter, alpha threshold), mapped to one palette shared by every
     frame (so nothing shimmers), and given the dark outline.
Because the deformation happens on the full painting and the pixels are made afterwards, turned parts never go
jagged the way rotated pixel art does, and every frame keeps the concept's own brushwork.

Usage: python3 tools/marrowpress/press.py RIG ANIMS OUT_KIND [--sheet PREVIEW.png]
  e.g. python3 tools/marrowpress/press.py tools/marrowpress/rigs/ossuarch_front.json tools/marrowpress/anims/walker.py ossuarch
"""
import sys, json, math, argparse, importlib.util, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
import port_concept  # noqa: E402

MARGIN = 90          # concept pixels of room round the rest pose, so a swinging cloak stays inside the frame


def load_rig(path):
    rig = json.load(open(path))
    rgb = np.array(Image.open(rig['source']).convert('RGB')).astype(int)
    cut = rig.get('cut', {})
    fig = port_concept.silhouette(rgb, tuple(cut['robe']) if cut.get('robe') else None, cut.get('ground_pool', False))
    rgb = np.pad(rgb, ((MARGIN, MARGIN), (MARGIN, MARGIN), (0, 0)))
    fig = np.pad(fig, MARGIN)
    ys, xs = np.nonzero(fig)
    y0, y1, x0, x1 = ys.min() - MARGIN, ys.max() + 20, xs.min() - MARGIN, xs.max() + MARGIN
    canvas, mask = rgb[y0:y1, x0:x1], fig[y0:y1, x0:x1]
    x0, y0 = x0 - MARGIN, y0 - MARGIN          # back to concept pixels, for the joints
    bones = {}
    for k, b in rig['bones'].items():
        bones[k] = dict(b, a=np.array(b['a'], float) - [x0, y0], b=np.array(b['b'], float) - [x0, y0])
    return rig, canvas, mask, bones, (x0, y0)


def skin(mask, bones):
    """each painted pixel's two nearest bones and their weights (inverse distance cubed)"""
    ys, xs = np.nonzero(mask)
    P = np.stack([xs, ys], 1).astype(float)
    names = list(bones)
    D = np.zeros((len(P), len(names)))
    for j, n in enumerate(names):
        a, b = bones[n]['a'], bones[n]['b']
        ab = b - a
        t = np.clip(((P - a) @ ab) / max(1e-6, ab @ ab), 0, 1)
        D[:, j] = np.linalg.norm(P - (a + t[:, None] * ab), axis=1)
    order = np.argsort(D, 1)[:, :2]
    d = np.take_along_axis(D, order, 1)
    w = 1.0 / (d + 6.0) ** 3
    w /= w.sum(1, keepdims=True)
    z = np.array([bones[names[i]]['z'] for i in order[:, 0]])
    return P, names, order, w, z


def rot(deg):
    r = math.radians(deg)
    return np.array([[math.cos(r), -math.sin(r)], [math.sin(r), math.cos(r)]])


def local_of(bones, n, p):
    """a bone's own transform (2x3): a turn about its joint, a stretch along its length, a shift"""
    b = bones[n]
    a = b['a']
    axis = b['b'] - a
    R_ax = rot(math.degrees(math.atan2(axis[1], axis[0])))
    S = R_ax @ np.diag([p.get('scale', 1.0), p.get('width', 1.0)]) @ R_ax.T
    L = rot(p.get('rot', 0.0)) @ S
    return np.hstack([L, (a - L @ a + np.array(p.get('move', (0.0, 0.0))))[:, None]])


def h(m):
    return np.vstack([m, [0, 0, 1]])


def world(bones, pose):
    """each bone's world affine (2x3) from the pose (forward kinematics). pose['ik'] plants a two-bone limb:
    {upper bone: (dx, dy)} puts the end of its child where it rests, shifted by (dx, dy), whatever the parents did;
    the upper bone turns about its joint and the limb shortens along itself (a knee bending toward us)."""
    out = {}
    ik = pose.get('ik', {})

    def M(n):
        if n in out:
            return out[n]
        b = bones[n]
        p = dict(pose.get(n, {}))
        par = b['parent']
        G = M(par) if par else np.array([[1.0, 0, 0], [0, 1.0, 0]])
        if n in ik:
            child = next(c for c in bones if bones[c]['parent'] == n)
            end = bones[child]['b']
            target_w = end + np.array(ik[n], float)
            target = (np.linalg.inv(h(G)) @ np.append(target_w, 1.0))[:2]    # in the parent's frame
            a = b['a']
            v0, v1 = end - a, target - a
            p['rot'] = math.degrees(math.atan2(v1[1], v1[0]) - math.atan2(v0[1], v0[0]))
            p['scale'] = float(np.linalg.norm(v1) / max(1e-6, np.linalg.norm(v0)))
            p.pop('move', None)
        L = local_of(bones, n, p)
        out[n] = (h(G) @ h(L))[:2] if par else L
        if n in ik:
            # the lower bone shortens by the same share (it rides on the upper bone's turn)
            child = next(c for c in bones if bones[c]['parent'] == n)
            pose.setdefault(child, {})
            pose[child] = dict(pose[child], scale=p['scale'])
        return out[n]

    for n in bones:
        M(n)
    return out


def splat(canvas, P, names, order, w, z, bones, pose, shape):
    mats = world(bones, pose)
    T = np.stack([mats[n] for n in names])            # (bones, 2, 3)
    Ph = np.hstack([P, np.ones((len(P), 1))])
    Q = np.zeros_like(P)
    for k in range(2):
        Mk = T[order[:, k]]                            # (px, 2, 3)
        Q += w[:, k:k + 1] * np.einsum('nij,nj->ni', Mk, Ph)
    H, W = shape
    qx = np.clip(np.round(Q[:, 0]).astype(int), 0, W - 1)
    qy = np.clip(np.round(Q[:, 1]).astype(int), 0, H - 1)
    src = canvas[P[:, 1].astype(int), P[:, 0].astype(int)]
    out = np.zeros((H, W, 3), int)
    m = np.zeros((H, W), bool)
    idx = np.argsort(z, kind='stable')               # back parts first, front parts over them
    out[qy[idx], qx[idx]] = src[idx]
    m[qy[idx], qx[idx]] = True
    # holes a stretch opened: close the silhouette, fill from the nearest painted pixel
    filled = nd.binary_fill_holes(nd.binary_closing(m, iterations=2)) & nd.binary_dilation(m, iterations=2)
    _, (iy, ix) = nd.distance_transform_edt(~m, return_indices=True)
    out = np.where((filled & ~m)[..., None], out[iy, ix], out)
    return out, filled


def press(rgb, fig, height_px, k, palette=None):
    """a frame pressed to the game's grain: box filter, alpha threshold, the shared palette, the dark outline"""
    H, W = fig.shape
    size = (max(1, round(W * k)), max(1, round(H * k)))
    alpha = np.array(Image.fromarray((fig * 255).astype(np.uint8)).resize(size, Image.BOX)) / 255.0
    premul = rgb * fig[..., None]
    col = np.array(Image.fromarray(premul.clip(0, 255).astype(np.uint8)).resize(size, Image.BOX)).astype(float)
    col = np.where(alpha[..., None] > 0.01, col / np.maximum(alpha[..., None], 1e-3), 0).clip(0, 255)
    solid = alpha > 0.45
    img = Image.fromarray(col.astype(np.uint8))
    if palette is not None:
        img = img.quantize(palette=palette, dither=Image.NONE).convert('RGB')
    out = np.dstack([np.array(img), solid * 255]).astype(np.uint8)
    edge = solid & ~nd.binary_erosion(solid)
    out[edge, :3] = (out[edge, :3] * 0.35).astype(np.uint8)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('rig'); ap.add_argument('anims'); ap.add_argument('kind')
    ap.add_argument('--out', default='art/sprites')
    ap.add_argument('--sheet', default=None)
    ap.add_argument('--colours', type=int, default=128)
    a = ap.parse_args()
    rig, canvas, mask, bones, _ = load_rig(a.rig)
    P, names, order, w, z = skin(mask, bones)
    spec = importlib.util.spec_from_file_location('anims', a.anims)
    A = importlib.util.module_from_spec(spec); spec.loader.exec_module(A)
    ys = np.nonzero(mask)[0]
    k = rig['height'] / (ys.max() - ys.min() + 1)
    # the shared palette, from the rest pose
    rest, rest_fig = splat(canvas, P, names, order, w, z, bones, {}, mask.shape)
    rest_px = press(rest, rest_fig, rig['height'], k)
    pal = Image.fromarray(rest_px[..., :3]).quantize(a.colours, method=Image.FASTOCTREE, dither=Image.NONE)
    solid0 = rest_px[..., 3] > 0
    fy = int(np.nonzero(solid0.any(1))[0][-1])
    fx = int(np.nonzero(solid0[:rig['height'] // 6 + np.nonzero(solid0.any(1))[0][0]])[1].mean())
    frames = []   # (anim, i, image)
    for anim, poses in A.ANIMS.items():
        for i, pose in enumerate(poses):
            img, fig = splat(canvas, P, names, order, w, z, bones, pose, mask.shape)
            frames.append((anim, i, press(img, fig, rig['height'], k, pal)))
    h, wd = frames[0][2].shape[:2]
    sheet = np.zeros((h, wd * len(frames), 4), np.uint8)
    idx = {}
    for j, (anim, i, im) in enumerate(frames):
        sheet[:, j * wd:(j + 1) * wd] = im
        idx[f'{anim}/front/{i}'] = [0, j * wd, 0, wd, h, -fx, -fy]
    Image.fromarray(sheet, 'RGBA').save(f'{a.out}/{a.kind}.png')
    meta = {'kind': a.kind, 'category': 'hero', 'name': rig['name'],
            'anims': {an: {'frames': len(ps), 'views': ['front']} for an, ps in A.ANIMS.items()},
            'fps': getattr(A, 'FPS', {}),
            'source': 'tools/marrowpress/press.py: the concept deformed on a bone rig (%s), pressed to the grain' % os.path.basename(a.rig)}
    json.dump({'meta': meta, 'sheets': [f'{a.kind}.png'], 'idx': idx}, open(f'{a.out}/{a.kind}.json', 'w'))
    if a.sheet:
        prev = Image.new('RGBA', (sheet.shape[1], h), (40, 44, 40, 255))
        prev.alpha_composite(Image.fromarray(sheet, 'RGBA'))
        prev.convert('RGB').resize((sheet.shape[1] * 3, h * 3), Image.NEAREST).save(a.sheet)
    print(a.kind, len(frames), 'frames', wd, 'x', h, 'feet at', fx, fy)


if __name__ == '__main__':
    main()
