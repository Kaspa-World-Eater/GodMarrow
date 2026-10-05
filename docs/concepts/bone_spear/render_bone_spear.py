"""Render the Bone Spear in 32 headings for the game: art/fx/bone_spear.png (one row of frames) and bone_spear.json
({"frames": [{"rect": [x, y, w, h], "anchor": [ax, ay], "angle": screen degrees the point faces}]}). The game picks the
frame whose angle is nearest the projectile's flight on screen and draws it anchored at the spear's middle.

  tools/pixelforge/.venv/Scripts/python docs/concepts/bone_spear/render_bone_spear.py [--preview OUT.png]
"""
import json, math, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "pixelforge"))
from pixelforge import shapes as S  # noqa: E402

doc = S.load_shapes(os.path.join(HERE, "bone_spear.shapes.json"))
look = {k: True for k in S.LOOK_KEYS}
SCALE = 1.8                     # file units -> pixels (about 80 px nose to tail, D2R's length on screen)
N = 32
model = S.Model(doc, SCALE, None, look=look)
el = doc["view"]["elevation"]
frames = []
for i in range(N):
    phi = i / N * 2 * math.pi
    fr = model.render(0, phi, el, None, outline=S.hexrgb(doc["outline"]))
    im = Image.fromarray(fr.rgba.astype(np.uint8), "RGBA")
    # where the point and the tail land on screen: the heading this frame shows
    tail = model.project((50.0, 50.0, -22.0), phi, el); tip = model.project((50.0, 50.0, 22.0), phi, el); mid = model.project((50.0, 50.0, 0.0), phi, el)
    ang = math.degrees(math.atan2(tip[1] - tail[1], tip[0] - tail[0]))
    bb = im.getbbox()
    frames.append((im.crop(bb), ang, (mid[0] - bb[0], mid[1] - bb[1])))
W = sum(f[0].width for f in frames) + N; H = max(f[0].height for f in frames)
sheet = Image.new("RGBA", (W, H), (0, 0, 0, 0)); x = 0; meta = []
for im, ang, (ax, ay) in frames:
    sheet.alpha_composite(im, (x, 0))
    meta.append({"rect": [x, 0, im.width, im.height], "anchor": [round(ax, 1), round(ay, 1)], "angle": round(ang, 2)})
    x += im.width + 1
os.makedirs(os.path.join(ROOT, "art", "fx"), exist_ok=True)
sheet.save(os.path.join(ROOT, "art", "fx", "bone_spear.png"))
json.dump({"about": "The Bone Spear in 32 headings (docs/concepts/bone_spear)", "scale": SCALE, "frames": meta},
          open(os.path.join(ROOT, "art", "fx", "bone_spear.json"), "w"), indent=1)
print("frames", N, "sheet", sheet.size)
if len(sys.argv) > 2 and sys.argv[1] == "--preview":
    cols = 8; cw = max(f[0].width for f in frames) + 8; ch = H + 8
    pv = Image.new("RGBA", (cols * cw, (N // cols) * ch), (24, 22, 28, 255))
    for k, (im, ang, _) in enumerate(frames):
        pv.alpha_composite(im, ((k % cols) * cw + 4, (k // cols) * ch + 4))
    pv.resize((pv.width * 3, pv.height * 3), Image.NEAREST).save(sys.argv[2]); print(sys.argv[2])
