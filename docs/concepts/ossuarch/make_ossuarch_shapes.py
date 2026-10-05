"""Write assets/shapes/characters/ossuarch.shapes.json: the Ossuarch, drawn by hand from Derek's own painting
(ossuarch_009202c4_2.png, his favourite) with his must-haves of 2026-10-05 and the design in DESIGN.md.

From his painting:
- a tall pointed helm of black iron, a narrow slit visor, a pale green plume rising from the tip of its spike;
- a dark teal hood and mantle draped over the shoulders;
- black plate: big layered pauldrons, vambraces, gauntlets, knee cops, greaves, sabatons;
- small white bones hung on the chest and at the belt like charms;
- a skirt of mail between plate tassets;
- a long tattered teal cloak to the ground behind.

The count, quietly:
- nine vertebrae climb the back of the spike;
- nine charm bones in all (five on the chest, four at the belt);
- tally notches cut in nines on the pauldrons' bone rims, each ninth slashed across;
- a bone brow band, cut with a row of marks.

He stands a head over the other heroes: the skeleton is 128 tall where theirs is 120, on a taller canvas for the
spike and the plume.

Run from tools/pixelforge with the Forge's Python: python ../../docs/concepts/ossuarch/make_ossuarch_shapes.py
"""
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PF = os.path.normpath(os.path.join(HERE, "..", "..", "..", "tools", "pixelforge"))
if PF not in sys.path:
    sys.path.insert(0, PF)
from pixelforge import shape_parts as K   # noqa: E402

CX = 75.0
OUT = os.path.join(PF, "assets", "shapes", "characters", "ossuarch.shapes.json")

# hue-shifted ramps, dark to light (the Tithe-Hand's standard): iron runs violet-black to a cold teal-grey; the cloth
# deep teal; bone from plum-brown shadow to warm ivory; the plume from deep grave-green to near white
M = {
    "iron":   {"ramp": ["#040404", "#080708", "#0d0c0c", "#131212", "#1a1818", "#22201f", "#2c2928", "#3a3534", "#4f4746", "#706563", "#4f7a6a"], "texture": "grain", "texture_strength": 0.35,
               "spec": True, "spec_t": 0.84, "rim_edge": True},
    "ironw":  {"ramp": ["#060606", "#0b0a0a", "#121111", "#1a1818", "#232120", "#2e2b2a", "#3c3837", "#524b4a", "#706866", "#978b88", "#86b8a3"], "texture": "grain", "texture_strength": 0.3,
               "spec": True, "spec_t": 0.8, "rim_edge": True},       # the worn edges, rubbed to a lighter gunmetal
    "cloth":  {"ramp": ["#030505", "#060a09", "#0a100f", "#0e1715", "#121f1c", "#172823", "#1d332c", "#22302a", "#3a6656"], "rim_edge": True,
               "texture": "weave", "texture_strength": 0.45},
    "bone":   {"ramp": ["#2a1518", "#46262a", "#683c3b", "#8c574f", "#ad7563", "#c9937b", "#ddb096", "#ebc8b0", "#f4dcc8", "#fbede0"],
               "texture": "grain", "texture_strength": 0.4},
    "plume":  {"ramp": ["#0f211c", "#173229", "#20463a", "#2c5d4d", "#3c7863", "#52957d", "#6fb298", "#94ccb4", "#bce3d0", "#e0f4ea"]},
    "mail":   {"ramp": ["#040304", "#090707", "#0f0c0b", "#161210", "#1e1916", "#26201c", "#3a6656"], "rim_edge": True, "spec": True, "spec_t": 0.8},
    "leather": {"ramp": ["#0a0606", "#140c0b", "#1f1411", "#2b1c17", "#38251d", "#463024"]},
    "void":   {"ramp": ["#010102", "#030305", "#06060a"]},
}

S = []
def add(**k): S.append(k)

# ================================================================ the helm
HY = 45.0                                        # the helm's centre (head bone runs 52.5 -> 38)
add(name="helm", kind="ellipsoid", centre=[CX, HY, 0.8], radii=[7.0, 9.0, 7.4], material="iron", bone="head",
    rules=[{"z": [5.0, None], "y": [43.8, 45.8], "material": "void"},                     # the slit visor
           {"z": [5.6, None], "y": [47.2, 50.4], "every_x": [2, 0], "every_y": [2, 0], "material": "void"},   # breath holes
           {"z": [5.0, None], "y": [42.6, 43.8], "t": 2},                                  # the visor's lit upper lip
           {"z": [5.6, None], "x": [CX - 0.6, CX + 0.6], "y": [45.6, 50.0], "material": "void"},   # the breath slit below it
           {"every_angle": [14, 0], "t": -1}])
add(name="helm_ridge", kind="capsule", a=[CX, 52.0, 6.8], b=[CX, 37.0, 5.2], r=[1.0, 0.8], material="ironw", bone="head")
add(name="cheek_l", kind="box", centre=[CX + 4.6, 49.0, 4.0], half=[1.8, 3.4, 2.4], round=1.0, material="iron", bone="head")
add(name="cheek_r", kind="box", centre=[CX - 4.6, 49.0, 4.0], half=[1.8, 3.4, 2.4], round=1.0, material="iron", bone="head")
# the bone brow band, a row of tally marks cut round it
add(name="brow_band", kind="ring", y=[40.8, 42.0], rx=[7.2, 0.0], rz=[7.6, 0.0], cz=0.8, thickness=1.0, material="bone", bone="head",
    rules=[{"every_angle": [36, 0], "t": -3}, {"every_angle": [9, 8], "t": -2}])
# the spike: a tall narrow cone of iron, like a lancet arch, its rim bound with a bone collar where the plume comes out
add(name="crown", kind="ellipsoid", centre=[CX, 37.6, 0.4], radii=[4.4, 3.2, 4.6], material="ironw", bone="head", rules=[{"every_angle": [8, 0], "t": -1}])
add(name="spike", kind="capsule", a=[CX, 36.0, 0.2], b=[CX, 19.0, -1.0], r=[2.4, 0.7], material="iron", bone="head",
    rules=[{"every_angle": [6, 0], "t": -1}, {"y": [None, 26.0], "material": "ironw"}])
add(name="finial", kind="ellipsoid", centre=[CX, 18.6, -1.0], radii=[1.5, 1.3, 1.5], material="bone", bone="head")
# nine vertebrae climbing the back of the spike, smaller as they go up
for i in range(9):
    t = i / 8.0
    y = 35.5 - 15.5 * t
    z = -2.6 + 1.8 * t
    r = 1.25 - 0.6 * t
    add(name=f"vert{i}", kind="ellipsoid", centre=[CX, y, z - 0.6], radii=[r * 1.2, r * 0.7, r], material="bone", bone="head",
        rules=[{"dy": [None, -0.2], "t": 1}])
    add(name=f"vert{i}_sp", kind="capsule", a=[CX, y, z - 0.6], b=[CX, y - 0.6, z - 0.6 - r * 1.3], r=[r * 0.45, r * 0.2], material="bone", bone="head")
# the plume: one pale flame from the finial: a single teardrop body that widens as it rises and leans back and to
# one side, and licks that tear off its top (one form, so it reads as a flame, never as segments or fingers)
add(name="flame_body", kind="capsule", a=[CX, 16.0, -1.2], b=[CX + 2.4, 6.4, -5.0], r=[1.3, 4.2], material="plume", part="plume",
    rules=[{"y": [None, 10.0], "t": 1}, {"hash": [0.1, 2, 1], "t": -1}])
for k, (dx, h, back, r0) in enumerate(((1.4, 6.4, 2.6, 1.7), (5.0, 5.0, 1.6, 1.4), (-1.6, 4.8, 3.4, 1.3), (7.4, 2.6, 0.6, 1.1),
                                       (-3.6, 2.8, 2.0, 1.0), (3.2, 7.2, 4.4, 1.0), (9.0, 0.6, -0.6, 0.8), (-5.0, 0.8, 1.0, 0.8))):
    add(name=f"flame_lick{k}", kind="capsule", a=[CX + 2.4, 5.4, -5.0], b=[CX + 2.4 + dx, 5.4 - h, -5.0 - back], r=[r0, 0.25],
        material="plume", part="plume", rules=[{"t": 1}])

# ================================================================ the hood and mantle over the shoulders
add(name="neck", kind="capsule", a=[CX, 60.0, -1.0], b=[CX, 52.0, 0.2], r=[5.4, 4.6], material="mail", bone="neck",
    rules=[{"every_y": [1, 0], "t": -1}])
add(name="hood", kind="ring", y=[51, 61], rx=[7.6, 0.24], rz=[8.0, 0.22], cz=-0.8, thickness=2.6, material="cloth", bone="spine.003",
    bump={"folds": [0.7, 8, 2.4]}, rules=[{"every_angle": [7, 0], "t": -1}, {"y": [None, 54], "t": 1}])
add(name="scarf_fold", kind="capsule", a=[CX - 8.0, 58.0, 5.0], b=[CX + 7.0, 62.0, 6.2], r=[2.6, 2.2], material="cloth", bone="spine.003", rules=[{"every_x": [3, 0], "t": -1}])
add(name="hood_back", kind="ellipsoid", centre=[CX, 52.0, -6.4], radii=[7.6, 6.4, 4.2], material="cloth", bone="spine.003",
    rules=[{"every_angle": [12, 0], "t": -1}])
add(name="mantle", kind="ring", y=[58, 74], rx=[15.0, 0.12], rz=[10.6, 0.1], cz=-1.2, thickness=1.8, keep={"back_strip": 2.3},
    hem={"tongues": 11, "depth": 8, "seed": 4}, material="cloth", part="mantle", bump={"folds": [0.6, 9, 2.4]},
    rules=[{"every_angle": [8, 0], "t": -1}, {"hem_band": [0, 2], "t": -2}])

# ================================================================ the body: black plate
add(name="chest", kind="ellipsoid", centre=[CX, 70.0, 0.4], radii=[13.4, 12.0, 9.4], material="iron", bone="spine.003",
    rules=[{"z": [6.0, None], "every_y": [5, 1], "t": -1}, {"x": [CX - 0.6, CX + 0.6], "z": [7.0, None], "material": "ironw", "t": 1},
           {"y": [76.0, 77.0], "every_x": [3, 1], "z": [5.0, None], "rivet": True, "px": [150, None]},
           {"hash": [0.06, 3, 5], "t": -2}, {"hash": [0.03, 2, 9], "t": 2}])
add(name="plackart", kind="ellipsoid", centre=[CX, 81.0, 2.2], radii=[10.4, 6.2, 7.6], material="iron", bone="spine.002",
    rules=[{"every_y": [3, 0], "t": -1}, {"y": [84.5, 85.5], "every_x": [3, 0], "z": [4.0, None], "rivet": True, "px": [150, None]}])
add(name="waist", kind="capsule", a=[CX, 84.0, -0.4], b=[CX, 96.0, -1.6], r=[10.0, 11.4], material="mail", bone="spine.001",
    rules=[{"every_y": [1, 0], "t": -1}, {"every_x": [1, 1], "t": -1}])
add(name="belt", kind="ring", y=[91.5, 95.5], rx=[11.2, 0.0], rz=[9.6, 0.0], thickness=1.8, material="leather", bone="hips",
    rules=[{"every_angle": [18, 0], "t": 1}])
add(name="buckle", kind="box", centre=[CX, 93.5, 10.2], half=[2.0, 2.0, 0.6], round=0.4, material="ironw", bone="hips")
for k, (dx, dz) in enumerate(((-8.6, 6.8), (9.4, 6.0))):
    add(name=f"pouch{k}", kind="box", centre=[CX + dx, 98.0, dz], half=[2.4, 3.0, 1.6], round=0.8, material="leather", bone="hips",
        rules=[{"dy": [None, -1.6], "t": 1}, {"dy": [-1.4, -0.8], "t": -2}])
add(name="relic_bone", kind="capsule", a=[CX - 11.6, 94.0, 2.0], b=[CX - 13.4, 117.0, 3.4], r=[1.7, 1.5], material="bone", part="skirt")
add(name="relic_knob", kind="ellipsoid", centre=[CX - 13.5, 118.2, 3.4], radii=[2.4, 1.8, 1.9], material="bone", part="skirt")
add(name="relic_wrap", kind="capsule", a=[CX - 12.0, 98.0, 2.2], b=[CX - 12.9, 110.0, 2.9], r=[2.1, 1.9], material="cloth", part="skirt",
    rules=[{"every_y": [2, 0], "t": -2}])
# the mail skirt in front, plate tassets either side, a cloak to the ground behind
add(name="tabard", kind="ring", y=[94, 122], rx=[11.2, 0.05], rz=[10.0, 0.05], cz=0.4, thickness=1.4, keep={"front": 0.42},
    hem={"tongues": 5, "depth": 16, "seed": 11}, holes={"p": 0.08, "band": 14, "seed": 2}, material="cloth", part="skirt",
    bump={"folds": [0.6, 5, 1.6]}, rules=[{"every_angle": [5, 0], "t": -1}, {"hem_band": [0, 2], "t": -2}, {"hash": [0.05, 3, 6], "t": 1}])
add(name="mail_skirt", kind="ring", y=[94, 110], rx=[10.6, 0.06], rz=[9.4, 0.05], thickness=1.4, keep={"front": 0.95},
    hem={"tongues": 9, "depth": 3, "seed": 2}, material="mail", part="skirt",
    rules=[{"every_y": [1, 0], "t": -1}, {"every_x": [2, 0], "t": -1}, {"hem_band": [0, 2], "t": -2}])
for s, sg in (("L", 1), ("R", -1)):
    X = K.mirror(CX, sg)
    for j in range(3):                            # three lames, each a little lower and wider
        y0 = 95.0 + j * 7.0
        add(name=f"tasset{j}.{s}", kind="box", centre=[X(84.0 + j * 0.6), y0 + 3.0, 3.6 - j * 0.6], half=[5.4 + j * 0.4, 3.6, 2.6], round=1.2,
            material="iron", bone=f"thigh.{s}", rules=[{"dy": [2.4, None], "material": "ironw"}])
add(name="cloak", kind="ring", y=[62, 142], rx=[15.0, 0.2], rz=[12.0, 0.12], cz=-2.4, thickness=1.8, keep={"back_strip": 2.4},
    hem={"tongues": 15, "depth": 22, "seed": 7}, holes={"p": 0.08, "band": 26, "seed": 3}, material="cloth", part="cloak",
    bump={"folds": [0.7, 11, 2.8]}, rules=[{"every_angle": [7, 0], "t": -1}, {"hem_band": [0, 3], "t": -2}])

add(name="charm_cord", kind="capsule", a=[CX - 9.0, 61.0, 7.2], b=[CX + 8.6, 61.4, 7.4], r=0.45, material="leather", bone="spine.003", px=[90, None])
add(name="baldric", kind="capsule", a=[CX + 11.0, 60.0, 5.0], b=[CX - 9.0, 92.0, 9.6], r=1.3, material="leather", bone="spine.002",
    rules=[{"every_y": [6, 0], "material": "ironw"}])
# ================================================================ the charm bones: five on the chest, four at the belt (nine)
def charm(name, x, y, z, length, bone, tilt=0.0):
    a = [x, y, z]; b = [x + tilt, y + length, z + 0.2]
    add(name=name + "_cord", kind="capsule", a=[x, y - 2.4, z - 0.4], b=a, r=0.3, material="leather", bone=bone, px=[90, None])
    add(name=name, kind="capsule", a=a, b=b, r=[1.25, 1.1], material="bone", bone=bone)
    for e, p in (("top", a), ("bot", b)):            # the knuckled ends of a long bone
        for side in (-1, 1):
            add(name=f"{name}_{e}{side}", kind="ellipsoid", centre=[p[0] + side * 1.15, p[1], p[2] + 0.2], radii=[1.3, 1.25, 1.1],
                material="bone", bone=bone)

for i, (dx, dy, ln, tl) in enumerate(((-7.8, 62.4, 9.0, -1.4), (-3.4, 63.6, 13.0, 0.8), (0.6, 64.2, 11.0, 2.2), (2.0, 64.2, 14.5, -1.6), (7.0, 63.0, 8.0, 1.2))):
    z = 8.0 - abs(dx) * 0.18
    charm(f"charm_chest{i}", CX + dx, dy, z + 1.0, ln, "spine.003", tl)
for i, (dx, ln, tl) in enumerate(((-6.8, 10.0, -1.0), (-2.4, 14.0, 0.6), (1.6, 12.0, -0.8), (6.0, 15.0, 1.4))):
    charm(f"charm_belt{i}", CX + dx, 97.0, 11.0 - abs(dx) * 0.15, ln, "hips", tl)

# ================================================================ the arms: great layered pauldrons, vambraces, gauntlets
for s, sg in (("L", 1), ("R", -1)):
    X = K.mirror(CX, sg)
    for j in range(3):                            # one great top plate, two lames tucked under it
        add(name=f"pauldron{j}.{s}", kind="ellipsoid", centre=[X(89.4 + j * 2.0), 59.4 + j * 5.0 + (1.2 if j else 0), -0.8 - j * 0.6],
            radii=[(11.4 if j == 0 else 8.0 - j * 0.8), (6.0 if j == 0 else 3.4), (11.0 if j == 0 else 8.4 - j * 0.8)], material="iron", bone=f"upper_arm.{s}",
            rules=[{"every_angle": [16, j], "t": -1},
                   {"dy": [2.6, 3.6], "t": -3},                                  # the shadow crease under the next lame
                   {"dy": [3.6, None], "material": "ironw", "t": 1},              # the hard bright lower edge
                   {"dy": [2.9, 3.4], "every_x": [3, j % 3], "z": [2.0, None], "rivet": True, "px": [150, None]},
                   {"hash": [0.05, 3, 7 + j], "t": -2}])
    # the top lame's front edge cut with tally notches in nines (bright worn iron), each ninth slashed deeper
    add(name=f"pauldron_edge.{s}", kind="capsule", a=[X(81.6), 58.6, 6.0], b=[X(94.4), 61.2, 4.2], r=[0.8, 0.7], material="ironw",
        bone=f"upper_arm.{s}", rules=[{"every_x": [2, 0], "t": -3}, {"every_x": [18, 17], "t": -6}])
    add(name=f"upper_arm.{s}", kind="capsule", a=[X(89.0), 64.0, -4.7], b=[X(93.0), 81.2, -5.1], r=[5.0, 4.6], material="iron",
        bone=f"upper_arm.{s}", rules=[{"dy": [6.0, 7.2], "t": -3}, {"dy": [7.2, None], "material": "ironw"}, {"hash": [0.05, 3, 2], "t": -2}])
    add(name=f"couter.{s}", kind="ellipsoid", centre=[X(93.4), 81.2, -4.6], radii=[4.6, 4.4, 4.6], material="ironw", bone=f"forearm.{s}")
    add(name=f"vambrace.{s}", kind="capsule", a=[X(93.0), 82.5, -4.8], b=[X(96.8), 98.5, -0.9], r=[4.8, 4.2], material="iron",
        bone=f"forearm.{s}", rules=[{"every_y": [5, 0], "t": -3}, {"x": [X(95.0) - 0.7, X(95.0) + 0.7], "z": [2.0, None], "material": "ironw", "t": 1},
                                    {"hash": [0.05, 3, 3], "t": -2}])
    add(name=f"gauntlet_cuff.{s}", kind="capsule", a=[X(96.4), 96.0, -1.2], b=[X(97.2), 100.4, -0.6], r=[5.2, 5.4], material="ironw", bone=f"forearm.{s}",
        rules=[{"dy": [1.6, None], "t": 1}, {"dy": [None, -1.6], "t": -1}])
    add(name=f"gauntlet.{s}", kind="ellipsoid", centre=[X(97.8), 103.6, 0.0], radii=[3.8, 4.4, 3.2], material="iron", bone=f"hand.{s}",
        rules=[{"every_y": [2, 0], "t": -1}])
    for k, dx in enumerate((-1.5, -0.5, 0.5, 1.5)):
        add(name=f"finger{k}.{s}", kind="capsule", a=[X(97.8 + dx), 106.0, 0.4], b=[X(98.0 + dx * 1.15), 110.4, 1.2], r=[0.9, 0.7],
            material="iron", bone=f"hand.{s}", rules=[{"every_y": [2, 0], "t": 1}])

# the left pauldron: bone that nobody carved, knotted over the iron, and one small spur curling out of it
for k, (dx, dy, dz, r) in enumerate(((2.0, -1.0, 4.0, 2.2), (4.4, 0.6, 2.4, 1.8), (0.6, 1.4, 5.6, 1.5), (5.6, -1.4, 0.6, 1.4), (3.2, 2.6, 4.4, 1.2))):
    add(name=f"growth{k}", kind="ellipsoid", centre=[CX + 13.6 + dx, 57.0 + dy, dz], radii=[r * 1.1, r * 0.85, r], material="bone",
        bone="upper_arm.L", rules=[{"hash": [0.2, 1, k], "t": -1}])
add(name="spur", kind="capsule", a=[CX + 18.6, 56.0, 3.0], b=[CX + 21.4, 50.6, 1.6], r=[1.1, 0.25], material="bone", bone="upper_arm.L")
add(name="spur_tip", kind="capsule", a=[CX + 21.4, 50.6, 1.6], b=[CX + 22.6, 49.6, 0.4], r=[0.3, 0.15], material="bone", bone="upper_arm.L")

# ================================================================ the legs: dark cuisses, knee cops, greaves, sabatons
for s, sg in (("L", 1), ("R", -1)):
    X = K.mirror(CX, sg)
    add(name=f"thigh.{s}", kind="capsule", a=[X(81.8), 98.5, 0.1], b=[X(81.6), 124.0, -0.1], r=[6.2, 5.2], material="iron", bone=f"thigh.{s}",
        rules=[{"dy": [7.0, 8.4], "t": -3}, {"dy": [8.4, None], "material": "ironw"}, {"hash": [0.05, 3, 1], "t": -2}])
    add(name=f"knee.{s}", kind="ellipsoid", centre=[X(81.4), 127.5, 3.2], radii=[5.6, 5.4, 4.6], material="ironw", bone=f"shin.{s}",
        rules=[{"every_angle": [8, 0], "t": -1}, {"x": [X(81.4) - 0.6, X(81.4) + 0.6], "z": [6.0, None], "t": 2}, {"dy": [3.4, None], "t": -2}])
    add(name=f"knee_wing.{s}", kind="ellipsoid", centre=[X(84.6), 127.5, 1.6], radii=[2.2, 3.4, 2.6], material="iron", bone=f"shin.{s}")
    add(name=f"greave.{s}", kind="capsule", a=[X(81.4), 130.0, -0.2], b=[X(81.4), 157.0, -2.4], r=[5.2, 4.2], material="iron", bone=f"shin.{s}",
        rules=[{"x": [X(81.4) - 0.6, X(81.4) + 0.6], "z": [3.0, None], "material": "ironw", "t": 1},
               {"y": [132.5, 133.5], "every_x": [3, 0], "z": [2.0, None], "rivet": True, "px": [150, None]},
               {"hash": [0.05, 3, 4], "t": -2}])
    add(name=f"sabaton.{s}", kind="box", centre=[X(81.4), 161.6, 3.6], half=[5.0, 3.2, 8.2], round=2.2, material="iron", bone=f"foot.{s}",
        rules=[{"every_z": [2, 0], "t": -1}, {"dy": [2.2, None], "t": -2}])
    add(name=f"sabaton_toe.{s}", kind="capsule", a=[X(81.4), 162.6, 8.0], b=[X(81.4), 163.6, 12.4], r=[2.6, 1.0], material="ironw", bone=f"foot.{s}")

spec = {
    "name": "ossuarch",
    "about": "The Ossuarch, from Derek's painting (ossuarch_009202c4_2): black plate, a tall pointed iron helm with a slit visor, a bone "
             "brow band and nine vertebrae up its spike, a pale green plume rising from the tip; a dark teal hood and mantle; nine "
             "charm bones on the chest and belt; a mail skirt between plate tassets; great layered pauldrons with bone rims cut with "
             "tally notches in nines; a long tattered teal cloak to the ground.",
    "mode": "solid", "size": [150, 170], "height": 120, "ground": 166, "axis": [CX, 0],
    "view": {"elevation": 12, "contrast": 1.4, "light": [-0.78, -0.62, 0.22]}, "outline": "#030305",
    "skeleton": {"height": 128, "ground": 166, "cx": CX},
    "materials": M,
    "parts": {
        "plume": {"bone": "head", "lag": {"frames": 2, "sway": 1.0}, "hang": 0.7},
        "mantle": {"bone": "spine.003", "lag": {"frames": 1, "sway": 0.4}, "hang": 0.6},
        "skirt": {"bone": "hips", "lag": {"frames": 1, "sway": 0.5}, "hang": 0.35},
        "cloak": {"bone": "spine.002", "lag": {"frames": 2, "sway": 0.8}, "hang": 0.3},
    },
    "shapes": S,
    "clips": {},
    "effects": [],
    "shadow": {"radii": [24, 5.0], "colour": "#4b4a4f"},
}
json.dump(spec, open(OUT, "w"), indent=1)
print("wrote", OUT, len(S), "shapes")
try:
    from pixelforge import shape_detail, shapes as PS
    r = shape_detail.stock(PS.load_shapes(OUT), replace=True)
    print("stock detail for", r["count"], "parts")
except Exception as e:   # noqa: BLE001
    print("detail layer not made:", e)
