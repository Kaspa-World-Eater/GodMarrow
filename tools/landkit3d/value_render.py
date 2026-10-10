"""The value-only test (MASTER_RULES 0.4): a frame's passes rendered in one grey material, lit by the moon pass (its
true shadows) and a little occlusion, nothing else. If the form reads here, it is real; if it goes flat, it fails.

  python tools/landkit3d/value_render.py PASSES_DIR OUT.png [SCALE]
"""
import sys
import os
import numpy as np
from PIL import Image


def render(d):
    n, al = d["normal"], d["alpha"] > 0.5
    moon = d["moon"] if "moon" in d else np.clip(n[..., 2], 0, 1)
    ao = d["ao"] if "ao" in d else np.ones(al.shape)
    L = np.array([-0.62, 0.25, 0.74])
    L = L / np.linalg.norm(L)
    lam = np.clip((n * L).sum(2), 0, 1)
    v = 0.06 + 0.5 * moon + 0.22 * lam * (0.4 + 0.6 * moon) + 0.18 * np.clip(ao, 0, 1) ** 1.5
    v = np.where(al, np.clip(v, 0, 1), 0.02)
    return (v * 255).astype(np.uint8)


if __name__ == "__main__":
    d = dict(np.load(os.path.join(sys.argv[1], "passes.npz"), allow_pickle=True))
    k = int(sys.argv[3]) if len(sys.argv) > 3 else 2
    im = Image.fromarray(render(d), "L")
    im.resize((im.width * k, im.height * k), Image.NEAREST).save(sys.argv[2])
    print("wrote", sys.argv[2])
