"""The dracolich, outline first (Derek 2026-10-06: "I want you to sketch the outline first"). A design sketch, not a
render: a faint construction pass (the gesture line, the landmarks where bone breaks the surface), then the contour as
designed curves (round 8: bellies swelling on alternating sides, joints pinched, never two parallel lines), and a few
inner contours where masses overlap. Our own design; the reference painting is for mood and value only.

  python tools/art_study/sketch_dracolich.py OUT.png
"""
import sys
import numpy as np
from PIL import Image, ImageDraw

W, H = 600, 800
RNG = np.random.default_rng(12)


def spline(pts, n=24):
    """Catmull-Rom through the points"""
    pts = np.array(pts, float)
    if len(pts) < 3:
        return pts
    P = np.vstack([pts[0] * 2 - pts[1], pts, pts[-1] * 2 - pts[-2]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2])
    return np.array(out)


class Sketch:
    def __init__(self):
        self.im = Image.new("RGB", (W, H), (222, 212, 192))
        self.d = ImageDraw.Draw(self.im)
        # the paper's tooth
        a = np.array(self.im).astype(float)
        a += (RNG.random((H, W, 1)) - 0.5) * 10
        self.im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
        self.d = ImageDraw.Draw(self.im)

    def line(self, pts, w=2.0, col=(38, 32, 28), passes=2, jit=0.8, taper=True):
        c = spline(pts)
        for k in range(passes):
            off = RNG.normal(0, jit, 2)
            q = c + off + RNG.normal(0, jit * 0.3, c.shape)
            n = len(q)
            for i in range(n - 1):
                f = i / max(n - 1, 1)
                ww = w * (0.55 + 0.45 * np.sin(np.pi * f)) if taper else w
                self.d.line([tuple(q[i]), tuple(q[i + 1])], fill=col, width=max(1, int(round(ww))))

    def faint(self, pts, w=1):
        self.line(pts, w, (140, 146, 160), passes=1, jit=0.3, taper=False)

    def circle(self, c, r):
        t = np.linspace(0, 2 * np.pi, 40)
        self.faint([(c[0] + np.cos(a) * r, c[1] + np.sin(a) * r) for a in t])


def main(out):
    S = Sketch()
    # ---------------- construction: the gesture, the landmarks
    S.faint([(110, 260), (210, 160), (330, 130), (410, 190), (440, 300), (520, 360), (600, 420)], 2)   # the line of action
    S.faint([(330, 400), (310, 540), (220, 650)], 1)                     # the near arm's axis
    S.faint([(470, 370), (520, 480), (500, 610)], 1)                     # the far arm's axis
    for c, r in [((205, 165), 26), ((330, 405), 30), ((345, 545), 14), ((222, 652), 16), ((520, 480), 12),
                 ((500, 610), 12), ((268, 128), 10)]:
        S.circle(c, r)
    # ---------------- the skull: long and low, three-quarter; a heavy brow over the orbit; the jaw dropped
    S.line([(305, 118), (268, 112), (232, 124), (210, 142), (176, 160), (140, 188), (108, 214), (92, 232)], 3)   # brow to snout
    S.line([(92, 232), (100, 246), (128, 244), (166, 232), (208, 216), (246, 204)], 2.5)                        # the upper lip
    S.line([(246, 206), (226, 246), (190, 276), (146, 300), (114, 306), (104, 312), (126, 318), (170, 306), (218, 282), (256, 240)], 3)  # the lower jaw
    S.line([(184, 158), (196, 150), (222, 150), (232, 162), (222, 178), (198, 180), (184, 170), (184, 158)], 2)   # the orbit
    S.line([(176, 150), (200, 140), (232, 142), (246, 154)], 2.5)        # the brow's overhang
    S.line([(104, 220), (114, 216), (120, 222)], 1.5)                    # the nostril
    S.line([(232, 196), (250, 182), (282, 176), (306, 184)], 2)          # the cheek's arch
    for k in range(7):                                                   # fangs: uneven, some broken
        x0, y0 = 116 + k * 17, 244 - k * 5
        ln = [16, 24, 10, 28, 12, 6, 18][k]
        S.line([(x0, y0), (x0 + 2, y0 + ln * 0.6), (x0 + 5, y0 + ln)], 1.6)
    for k in range(6):
        x0, y0 = 132 + k * 20, 302 - k * 10
        ln = [14, 20, 9, 18, 12, 8][k]
        S.line([(x0, y0), (x0 - 1, y0 - ln * 0.6), (x0 + 3, y0 - ln)], 1.5)
    # horns: swept back and up, ridged, a spur off each
    S.line([(270, 116), (300, 84), (346, 58), (398, 54), (420, 62)], 3)
    S.line([(282, 128), (318, 102), (360, 84), (420, 62)], 2.5)
    S.line([(346, 64), (360, 36), (374, 26)], 2)
    S.line([(236, 118), (240, 84), (256, 52), (282, 30)], 2.6)
    S.line([(252, 120), (262, 90), (282, 30)], 2)
    for k in range(4):
        S.line([(300 + k * 22, 82 - k * 6), (304 + k * 22, 92 - k * 6)], 1.2)          # rings on the horn
    for k in range(4):                                                   # spines trailing from the cheek and jaw
        S.line([(262 + k * 12, 214 + k * 8), (300 + k * 14, 220 + k * 12)], 1.6)
    # ---------------- the neck: arching up and back from the skull, thick into the shoulders; spikes along its crest
    S.line([(306, 120), (348, 126), (388, 152), (418, 196), (436, 248), (452, 296)], 3)    # the crest
    S.line([(256, 240), (272, 284), (286, 330), (298, 372), (310, 404)], 3)                # the throat
    for k in range(11):
        t = k / 10
        base = np.array([306 + (452 - 306) * t, 120 + (296 - 120) * t ** 1.2])
        ln = 26 - abs(k - 4) * 2.2
        S.line([tuple(base), tuple(base + (ln * 0.55, -ln * 0.85)), tuple(base + (ln * 0.9, -ln * 0.95))], 2.0 if k % 2 else 1.6)
    S.line([(292, 300), (318, 316), (340, 340)], 1.4)                    # hide hanging in a fold under the throat
    S.line([(300, 350), (326, 364), (350, 392)], 1.4)
    # ---------------- the torso: shoulders broad, the chest deep and split, the waist drawn in
    S.line([(452, 296), (500, 318), (556, 352), (600, 384)], 3)          # the back
    S.line([(310, 404), (300, 450), (306, 506), (326, 556), (366, 600), (420, 626)], 3)   # the chest's front and belly
    S.line([(338, 418), (330, 470), (334, 520), (352, 566)], 2.4)        # the chasm: its near lip
    S.line([(372, 416), (384, 468), (380, 524), (362, 570)], 2.4)        # its far lip
    for k in range(7):                                                   # ribs lining it, pointing in like teeth
        y = 432 + k * 20
        ln = 20 - abs(k - 3) * 2
        S.line([(320 - k, y - 8), (334 - k * 0.3, y), (334 + ln * 0.6, y + 8)], 1.8)
        S.line([(396, y - 6), (382, y + 1), (382 - ln * 0.6, y + 9)], 1.6)
    S.line([(420, 300), (446, 330), (470, 372)], 1.8)                    # the far shoulder blade, under the hide
    # ---------------- the near forelimb: the cap of the shoulder, the triceps swelling back, the elbow's point, the
    #                  forearm full near the elbow and tapering, a pinched wrist, a splayed hand, hooked claws
    S.line([(300, 384), (262, 400), (246, 436), (250, 476), (262, 514), (256, 552), (240, 592), (226, 628), (214, 652)], 3)  # front
    S.line([(366, 430), (376, 474), (366, 512), (350, 540), (338, 552), (318, 566), (290, 600), (262, 636), (246, 662)], 3)  # back
    S.line([(338, 548), (352, 548), (358, 540)], 2.2)                    # the elbow's point
    S.line([(262, 470), (292, 486), (320, 478)], 1.4)                    # where the shoulder's cap overlaps the arm
    S.line([(252, 562), (280, 556), (304, 566)], 1.4)                    # skin bunched at the bend
    S.line([(214, 652), (196, 668), (178, 690), (160, 704)], 2.6)        # the hand's top, the digits splaying
    S.line([(220, 664), (210, 690), (204, 712)], 2.4)
    S.line([(240, 668), (240, 694), (244, 716)], 2.4)
    S.line([(246, 662), (262, 684), (272, 702)], 2.2)
    for (x0, y0, dx) in [(160, 704, -1), (204, 712, -0.5), (244, 716, 0.2), (272, 702, 0.6)]:   # claws, hooked over the stone
        S.line([(x0, y0), (x0 + dx * 6 - 4, y0 + 16), (x0 + dx * 8 - 2, y0 + 30), (x0 + dx * 6 + 4, y0 + 36)], 2.4)
    # ---------------- the far forelimb, partly behind the chest
    S.line([(470, 372), (500, 410), (526, 456), (528, 492), (514, 540), (504, 590), (498, 622)], 2.6)
    S.line([(444, 410), (476, 470), (498, 500), (486, 540), (478, 590), (482, 626)], 2.0)
    S.line([(482, 626), (470, 650), (466, 674)], 2.0)
    S.line([(498, 622), (510, 650), (522, 668)], 2.0)
    S.line([(490, 630), (492, 660), (496, 680)], 2.0)
    # ---------------- the wing, half folded behind: its arm, the finger bones, the membrane hanging torn
    S.line([(452, 292), (478, 230), (514, 172), (560, 128)], 2.8)
    S.line([(560, 128), (590, 60), (600, 40)], 2.0)
    S.line([(560, 128), (600, 130)], 2.0)
    S.line([(560, 128), (580, 200), (600, 240)], 1.8)
    S.line([(478, 236), (500, 270), (522, 268), (540, 300), (562, 296), (580, 330), (600, 330)], 1.5)   # the membrane's torn hem
    S.line([(530, 190), (540, 236)], 1.0)
    S.line([(574, 176), (584, 230)], 1.0)
    # ---------------- the stones under its claws: a broken course of the castle's wall
    S.line([(0, 716), (90, 712), (180, 724), (300, 718), (420, 726), (600, 718)], 2.2)
    S.line([(0, 770), (140, 766), (330, 776), (600, 770)], 1.4)
    for x in [70, 190, 310, 450, 560]:
        S.line([(x, 718), (x + 4, 770)], 1.2)
    S.im.save(out)
    print("saved", out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "sketch_dracolich.png")
