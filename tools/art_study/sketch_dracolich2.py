"""The dracolich, sketched again after the master study (round 9), in our own design, with the sketching kit.

The rules from the study: a small head on great bulk, seen from low; one gesture carrying everything (from the near
claw up the arm, through the shoulder, up the neck to the skull turned down at us); the chest's chasm with its
rib-teeth as the defining shape; texture by number (dozens of spikes, all sizes); few edges, lost on the lit side and
in the shadow masses; five values, the bone the only light.

  python tools/art_study/sketch_dracolich2.py OUT.png
"""
import sys
import numpy as np
from sketchkit import Sheet, RNG

W, H = 600, 800


def wedge(base, tip, w):
    """a spike or a rib: a tapered wedge from its base to its point, a slight curve"""
    base, tip = np.array(base, float), np.array(tip, float)
    d = tip - base
    n = np.array([-d[1], d[0]]) / (np.hypot(*d) + 1e-6)
    mid = base + d * 0.5 + n * w * 0.3
    return [tuple(base + n * w), tuple(mid + n * w * 0.35), tuple(tip), tuple(mid - n * w * 0.25), tuple(base - n * w)]


def main(out):
    S = Sheet(W, H, light=(0.55, -0.83))                              # the light from the upper right, as in the study
    # ---- construction: the gesture, faint
    S.construct([(120, 770), (180, 640), (240, 520), (300, 400), (330, 280), (300, 190), (250, 150)])
    # ---- the broken wall under its claws (behind the near claws)
    S.shape([(0, 700), (120, 690), (260, 706), (420, 694), (600, 700), (600, 800), (0, 800)], shade=0.05, puff=0.3)
    for x in (90, 230, 380, 520):
        S.stroke([(x, 704), (x + 3, 760), (x - 2, 800)], 1.2, 0.6)
    S.stroke([(0, 752), (180, 748), (330, 758), (600, 750)], 1.0, 0.5)
    # ---- the wings behind, torn: arm bones rising from the shoulders, the membrane hanging between, holed
    for side in (1,):
        S.shape([(372, 430), (430, 300), (500, 200), (560, 120), (600, 96), (600, 190), (586, 240), (600, 300),
                 (566, 312), (580, 370), (540, 368), (520, 420), (470, 420), (430, 470)], shade=0.25, puff=0.35)
        S.stroke([(372, 430), (440, 290), (510, 190), (560, 122)], 4.0, 0.9)
        S.stroke([(560, 122), (600, 100)], 3.0, 0.9)
        S.stroke([(560, 122), (590, 240)], 2.6, 0.9)
        S.stroke([(560, 122), (548, 318)], 2.4, 0.9)
        S.stroke([(520, 180), (500, 380)], 2.2, 0.85)
        for (cx, cy, r) in [(570, 200, 14), (520, 280, 10), (560, 340, 9), (488, 330, 7)]:
            ang = np.linspace(0, 2 * np.pi, 9)
            S.dark([(cx + np.cos(a) * r * (0.7 + 0.5 * RNG.random()), cy + np.sin(a) * r * (0.7 + 0.5 * RNG.random())) for a in ang[:-1]], 0.25)
    S.shape([(150, 300), (110, 240), (60, 190), (14, 170), (0, 172), (0, 250), (30, 290), (20, 330), (70, 350),
             (110, 380), (170, 380)], shade=0.3, puff=0.35)            # the far wing, behind the neck on the left
    S.stroke([(170, 360), (110, 250), (40, 186), (0, 176)], 3.0, 0.85)
    S.stroke([(80, 222), (40, 330)], 2.0, 0.8)
    # ---- the far arm, behind the body on the right, down to its claws on the wall
    S.shape([(420, 470), (470, 520), (486, 590), (474, 650), (486, 700), (444, 716), (424, 660), (414, 590), (392, 520)],
            shade=0.45, puff=0.45)
    for k in range(3):
        S.shape(wedge((436 + k * 18, 706), (430 + k * 20, 744), 6), shade=0.2, puff=0.6, weight=0.8)
    # ---- the body: a great dark mass, the shoulders humped, the chest deep; most of it lost in shadow
    S.shape([(250, 470), (276, 430), (330, 408), (392, 418), (430, 452), (448, 510), (440, 580), (420, 640),
             (380, 690), (320, 706), (268, 690), (236, 640), (226, 580), (232, 520)], shade=0.42, puff=0.5)
    # ---- the chasm: a long bent oval of black down the chest, ribs lining both lips like teeth
    chasm = [(312, 452), (324, 448), (336, 480), (340, 540), (334, 600), (322, 652), (310, 664), (300, 640),
             (296, 590), (298, 530), (302, 480)]
    S.dark(chasm, 0.92)
    for k in range(11):
        y = 466 + k * 18 + RNG.normal(0, 2)
        ln = 22 - abs(k - 5) * 1.6 + RNG.normal(0, 3)
        if k in (3, 8):
            ln *= 0.5                                                   # broken
        lx = 300 - (2 if 2 < k < 8 else 0)
        S.shape(wedge((lx - 26, y - 10), (lx + ln * 0.5, y + 6), 4.2 - k * 0.12), shade=-0.1, puff=0.6, weight=0.8)
        rx = 338 + (2 if 2 < k < 8 else 0)
        S.shape(wedge((rx + 22, y - 8), (rx - ln * 0.45, y + 8), 3.8 - k * 0.12), shade=0.05, puff=0.6, weight=0.7)
    # ---- the neck: long, rising from the shoulders, bending over to the skull; ridged by its vertebrae
    neck = [(262, 468), (250, 420), (262, 360), (290, 300), (310, 240), (306, 200), (286, 172), (262, 166),
            (246, 184), (268, 214), (276, 252), (268, 300), (246, 352), (232, 410), (230, 452)]
    neck_r = [(262, 468), (300, 430), (322, 370), (338, 300), (344, 236), (334, 184), (306, 150), (272, 140),
              (248, 150), (286, 172), (306, 200), (310, 240), (290, 300), (262, 360), (250, 420)]
    S.shape([(232, 470), (226, 410), (244, 350), (268, 296), (284, 238), (280, 196), (262, 176), (296, 150),
             (330, 168), (346, 222), (344, 290), (330, 352), (306, 412), (290, 460)], shade=0.32, puff=0.5)
    for k in range(9):                                                  # the vertebrae's ridges across the neck
        t = k / 8
        y = 450 - t * 280
        x = 262 + np.sin(t * 2.6) * 50
        S.stroke([(x - 18 + t * 6, y + 4), (x, y - 4), (x + 22 - t * 6, y + 2)], 1.3, 0.55)
    # ---- spikes, by the dozen: along the neck's crest, over the shoulders and back, all sizes
    crest = [(290, 460), (306, 412), (330, 352), (344, 290), (346, 222), (330, 168), (300, 148)]
    from sketchkit import spline
    cr = spline(crest, 10)
    for i in range(0, len(cr) - 1, 2):
        p = cr[i]
        d = cr[min(i + 1, len(cr) - 1)] - p
        n = np.array([d[1], -d[0]]) / (np.hypot(*d) + 1e-6)              # out from the crest (to the right)
        ln = RNG.uniform(10, 26) * (1.2 if 8 < i < 40 else 0.8)
        S.shape(wedge(tuple(p - n * 3), tuple(p + n * ln + d * 0.4 - (0, ln * 0.35)), RNG.uniform(2.5, 4.5)), shade=-0.15, puff=0.6, weight=0.7)
    for k in range(26):                                                 # over the shoulders and back
        bx = RNG.uniform(250, 440)
        by = 430 + (bx - 340) ** 2 * 0.004 + RNG.uniform(-14, 14)
        ln = RNG.uniform(6, 18)
        S.shape(wedge((bx, by), (bx + RNG.uniform(-4, 8), by - ln), RNG.uniform(1.8, 3.4)), shade=-0.1, puff=0.6, weight=0.6)
    # ---- the skull: small, turned down at us; antler horns; the orbits and nasal openings dark; the jaw hanging
    S.shape([(222, 112), (250, 96), (290, 100), (312, 120), (316, 150), (302, 178), (292, 206), (270, 230),
             (250, 236), (232, 222), (220, 196), (212, 160), (214, 130)], shade=-0.3, puff=0.55, weight=1.1)
    S.shape([(240, 200), (276, 206), (290, 230), (282, 262), (262, 282), (246, 278), (236, 250)], shade=-0.15, puff=0.5)  # the lower jaw, hanging
    S.dark([(230, 214), (276, 214), (282, 236), (268, 262), (248, 268), (238, 244)], 0.92)   # the mouth's dark
    for k in range(6):                                                  # fangs, uneven
        x0 = 236 + k * 8
        ln = [14, 22, 10, 24, 12, 16][k]
        S.shape(wedge((x0, 212), (x0 + 1, 212 + ln), 2.4), shade=-0.4, puff=0.6, weight=0.6)
    for k in range(5):
        x0 = 244 + k * 8
        ln = [10, 14, 8, 12, 9][k]
        S.shape(wedge((x0, 272 - k * 2), (x0 - 1, 272 - k * 2 - ln), 2.0), shade=-0.4, puff=0.6, weight=0.6)
    S.dark([(228, 140), (250, 132), (258, 150), (248, 166), (232, 164)], 0.9)   # the near orbit
    S.dark([(278, 132), (298, 128), (304, 146), (292, 160), (278, 154)], 0.9)   # the far orbit
    S.dark([(246, 186), (254, 182), (256, 194), (248, 196)], 0.85)             # nasal openings
    S.dark([(262, 184), (270, 180), (272, 192), (264, 194)], 0.85)
    S.stroke([(226, 128), (246, 120), (262, 128)], 1.6, 0.8)                     # the brow's edge
    # the horns: branching back like antlers
    for pts_, w in [([(232, 104), (214, 72), (206, 40), (214, 14)], 7), ([(214, 72), (190, 60), (178, 40)], 4),
                    ([(208, 44), (224, 30)], 3), ([(294, 104), (318, 76), (330, 46), (326, 20)], 7),
                    ([(318, 76), (344, 66), (360, 50)], 4), ([(328, 44), (344, 30)], 3)]:
        c = np.array(pts_, float)
        left = []
        right = []
        for i, p in enumerate(c):
            d = c[min(i + 1, len(c) - 1)] - c[max(i - 1, 0)]
            n = np.array([-d[1], d[0]]) / (np.hypot(*d) + 1e-6)
            ww = w * (1 - i / (len(c) - 0.6))
            left.append(tuple(p + n * ww))
            right.append(tuple(p - n * ww))
        S.shape(left + right[::-1], shade=-0.25, puff=0.55, weight=0.9)
    # ---- the near arm: from the shoulder down to the elbow and on to the wrist, bony, strapped, the claws on the wall
    arm = [(252, 500), (226, 540), (196, 590), (170, 630), (150, 668), (134, 700), (110, 712), (132, 726), (166, 716),
           (190, 690), (212, 652), (240, 606), (266, 560), (282, 520)]
    S.shape(arm, shade=0.18, puff=0.5, weight=1.1)
    S.shape([(214, 540), (240, 520), (262, 540), (250, 580), (226, 586)], shade=0.1, puff=0.6)   # the elbow's knob
    for k in range(5):                                                  # straps wound round the forearm
        t = 0.45 + k * 0.1
        x = 226 + (130 - 226) * t
        y = 580 + (706 - 580) * t
        S.stroke([(x - 22, y - 10), (x, y - 2), (x + 26, y + 8)], 2.4, 0.85)
    for k in range(4):                                                  # the claws hooked over the wall's lip
        bx = 96 + k * 22
        S.shape(wedge((bx, 708), (bx - 6, 760), 7.5), shade=0.3, puff=0.6, weight=1.0)
        S.stroke([(bx - 4, 716), (bx - 6, 740)], 1.0, 0.5)               # a highlight's edge
    S.save(out)
    print("saved", out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "sketch_dracolich2.png")
