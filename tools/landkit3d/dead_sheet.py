"""The proof sheet for the dead (tools/landkit/passes/the_dead.md): every pose and state of body3d laid on a gently
uneven ground, a stump to drape one over, for the value-only render (value_render.py) and the painters.

  blender --background --python tools/landkit3d/blend_scene.py -- dead_sheet OUT_DIR 0 0 640 360 --zoom 3
"""
import math
import parts3d as P
import body3d as B

SAMPLES = 16
LAMPS = []
FLOOR_MODULE = "floor3d"


def gz(x, y):
    """the ground: low swells, so the bodies must lie over them"""
    return 0.06 * math.sin(x * 0.9 + 0.4) * math.cos(y * 0.7) + 0.04 * math.sin(x * 2.3 - y * 1.7)


def ground():
    n, lo, hi = 60, -9.0, 9.0
    verts, faces = [], []
    for j in range(n + 1):
        for i in range(n + 1):
            x, y = lo + (hi - lo) * i / n, lo + (hi - lo) * j / n
            verts.append((x, y, gz(x, y)))
    for j in range(n):
        for i in range(n):
            a = j * (n + 1) + i
            faces.append((a, a + 1, a + n + 2, a + n + 1))
    P.poly("sheet_ground", verts, faces, "ash")


SHEET = [
    ("prone", "fresh"), ("prone_reach", "fresh"), ("supine", "fresh"), ("side", "fresh"),
    ("prone", "bloat"), ("prone_reach", "bloat"), ("supine", "rot"), ("side", "rot"),
    ("prone", "bone"), ("supine", "bone"),
]


def build(root, material):
    P.init(root, material)
    ground()
    for k, (pose, state) in enumerate(SHEET):
        col, row = k % 5, k // 5
        x, y = -4.6 + col * 2.4 + row * 1.6, 2.0 - col * 0.6 + row * 2.6 - 2.6
        B.body("dk%d" % k, pose, state, x, y, 0.5 + 0.35 * k, gz, seed=k)
