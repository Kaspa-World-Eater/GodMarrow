"""The stick pass (docs/animation/02-method.md, section 3): every bone chain of the newborn's clips as a coloured line,
side and front, frame by frame, so the arcs, the timing and the drag are checked before the body is.

    python newborn_sticks.py STICKS.json OUT.png [clip,clip]
"""
import json
import sys

from PIL import Image, ImageDraw

CHAINS = {
    "trunk": (["DEF-hips", "DEF-spine.001", "DEF-spine.002", "DEF-spine.003", "DEF-neck", "DEF-head"], (235, 225, 200)),
    "arm.L": (["DEF-shoulder.L", "DEF-upper_arm.L", "DEF-forearm.L", "DEF-hand.L"], (90, 170, 255)),
    "arm.R": (["DEF-shoulder.R", "DEF-upper_arm.R", "DEF-forearm.R", "DEF-hand.R"], (255, 120, 90)),
    "leg.L": (["DEF-thigh.L", "DEF-shin.L", "DEF-foot.L", "DEF-toe.L"], (110, 230, 140)),
    "leg.R": (["DEF-thigh.R", "DEF-shin.R", "DEF-foot.R", "DEF-toe.R"], (240, 200, 70)),
}
S = 90          # px a metre
CW, CH = 230, 200


def draw(d, bones, ox, oy, view):
    def pr(p):
        x, y, z = p
        u = -y if view == "side" else x            # side: the body faces screen left (-Y to the left)
        return ox + CW / 2 + u * S, oy + CH - 12 - z * S
    d.line([(ox + 6, oy + CH - 12), (ox + CW - 6, oy + CH - 12)], fill=(70, 60, 60))
    for name, (chain, col) in CHAINS.items():
        for bn in chain:
            h, t = bones[bn]
            d.line([pr(h), pr(t)], fill=col, width=3)
        d.ellipse([pr(bones[chain[-1]][1])[0] - 2, pr(bones[chain[-1]][1])[1] - 2,
                   pr(bones[chain[-1]][1])[0] + 2, pr(bones[chain[-1]][1])[1] + 2], fill=col)
    h = bones["DEF-head"][1]
    hx, hy = pr(h)
    d.ellipse([hx - 7, hy - 4, hx + 7, hy + 10], outline=(235, 225, 200), width=2)


def main():
    data = json.load(open(sys.argv[1]))
    clips = sys.argv[3].split(",") if len(sys.argv) > 3 else sorted({k.split("/")[0] for k in data})
    rows = []
    for c in clips:
        n = len([k for k in data if k.split("/")[0] == c])
        rows.append((c, n))
    cols = max(n for _, n in rows)
    img = Image.new("RGB", (cols * CW, sum(2 * CH + 20 for _ in rows)), (24, 20, 22))
    d = ImageDraw.Draw(img)
    y = 0
    for c, n in rows:
        d.text((6, y + 4), c, fill=(220, 210, 190))
        for i in range(n):
            b = data["%s/%d" % (c, i)]
            draw(d, b, i * CW, y + 16, "side")
            draw(d, b, i * CW, y + 16 + CH, "front")
            d.text((i * CW + 6, y + 18), str(i), fill=(150, 140, 130))
        y += 2 * CH + 20
    img.save(sys.argv[2])
    print(sys.argv[2], img.size)


if __name__ == "__main__":
    main()
