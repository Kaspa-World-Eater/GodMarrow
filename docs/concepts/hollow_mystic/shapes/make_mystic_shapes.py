"""Write assets/shapes/characters/mystic.shapes.json: the Hollow Mystic (sheet_c2451ff8_3.png, "Servant of the Veiled
Crone") drawn by hand as a solid shape sprite, the way the Hemomancer was.

From the painting: a tall peaked hood with nothing in it but dark; a wide weathered shawl of teal-grey wool over the
shoulders and arms, studded with small brass coins and charms, its hem torn into tongues; under it an open coat of the
same cloth to the ground, and a long brown under-robe showing down the front; pale blue-white cords looped from the
neck over the chest with a ring at the bottom; strings of dark beads and coins hanging from the shawl's edges; dark
clawed hands; a pouch at the hip. No legs show: the robe hangs to the ground and sways after the hips.

Run from tools/pixelforge with the Forge's Python: python ../../docs/concepts/hollow_mystic/shapes/make_mystic_shapes.py
"""
import json, math, os, random, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PF = os.path.normpath(os.path.join(HERE, "..", "..", "..", "..", "tools", "pixelforge"))
if PF not in sys.path:
    sys.path.insert(0, PF)
from pixelforge import shape_parts as K   # noqa: E402

CX = 69.0
OUT = os.path.join(PF, "assets", "shapes", "characters", "mystic.shapes.json")
if "--out" in sys.argv:
    OUT = sys.argv[sys.argv.index("--out") + 1]
rnd = random.Random(11)

M = {
    # the painting's wool: a weathered teal-grey, darker in the folds, paler where it is worn
    "slate":    {"ramp": ["#0a1010", "#121b1b", "#1b2828", "#253535", "#314444", "#3f5655", "#506a69"], "texture": "weave", "texture_strength": 0.45},
    "robe":     {"ramp": ["#0f0907", "#1a100c", "#261812", "#332118", "#412b1f", "#503628"], "texture": "weave", "texture_strength": 0.35},
    "void":     {"ramp": ["#010102", "#040405", "#08080a", "#0d0d10"]},
    "brass":    {"ramp": ["#1a130a", "#302414", "#4b3a20", "#6c5530", "#927546", "#b89a62"], "spec": True, "spec_t": 0.85, "texture": "scratch", "texture_strength": 0.3},
    "cord":     {"ramp": ["#24403f", "#3f6b69", "#62a09c", "#8dc9c4", "#bde6e1", "#e2f7f4"]},
    "bead":     {"ramp": ["#0b0807", "#1a1411", "#2d2420", "#43372f", "#5b4b3f"], "spec": True, "spec_t": 0.8},
    "claw":     {"ramp": ["#080606", "#120e0d", "#1e1816", "#2b2320", "#3a302b"]},
}

S = []
def add(**k): S.append(k)

# ---- the hood: a peak leaning back, the opening a shadow with nothing in it
add(name="head", kind="ellipsoid", centre=[CX, 23.0, 0.6], radii=[5.4, 7.2, 5.8], material="void", bone="head")
add(name="hood", kind="ellipsoid", centre=[CX, 22.5, -0.6], radii=[7.6, 9.8, 7.8], material="slate", bone="head",
    rules=[{"z": [2.0, None], "near": [[[CX, 21.0, None], [CX, 28.5, None]], 4.6], "t": 1},          # the opening's worn rim, lit
           {"z": [2.6, None], "near": [[[CX, 21.5, None], [CX, 28.5, None]], 3.7], "material": "void"},    # the opening: only dark
           {"every_angle": [11, 0], "t": -1},
           {"hash": [0.02, 3, 1], "material": "brass", "px": [90, None]}])
add(name="hood_peak", kind="capsule", a=[CX, 16.5, -3.6], b=[CX, 11.0, -7.2], r=[4.2, 1.0], material="slate", bone="head",
    rules=[{"every_y": [3, 0], "t": -1}])
add(name="hood_fall", kind="ring", y=[24, 40], rx=[7.6, 0.25], rz=[7.4, 0.2], thickness=1.4, keep={"back_strip": 2.04},
    material="slate", bone="neck", rules=[{"every_angle": [9, 0], "t": -1}, {"hash": [0.02, 5, 1], "material": "brass", "px": [90, None]}])

add(name="neck", kind="capsule", a=[CX, 33, 0], b=[CX, 28, 0.2], r=[3.0, 2.8], material="void", bone="neck")

# ---- body under the cloth: lean, the robe's brown
add(name="chest", kind="ellipsoid", centre=[CX, 46, 0.2], radii=[9.6, 12.0, 6.6], material="robe", bone="spine.002",
    rules=[{"every_y": [3, 0], "t": -1}])
add(name="waist", kind="capsule", a=[CX, 56, -0.2], b=[CX, 70, -1.0], r=[8.0, 8.6], material="robe", bone="spine.001")
for s, sg in (("L", 1), ("R", -1)):
    X = K.mirror(CX, sg)
    add(name=f"delt.{s}", kind="ellipsoid", centre=[X(80.0), 38.6, -1.6], radii=[4.6, 4.4, 4.6], material="slate", bone=f"shoulder.{s}")
    add(name=f"upper_arm.{s}", kind="capsule", a=[X(80.5), 37.5, -3.6], b=[X(85.4), 54.4, -4.4], r=[3.4, 3.0], material="slate", bone=f"upper_arm.{s}",
        rules=[{"every_y": [3, 0], "t": -1}])
    add(name=f"forearm.{s}", kind="capsule", a=[X(85.4), 54.4, -4.4], b=[X(89.0), 71.5, -0.8], r=[3.2, 2.4], material="robe", bone=f"forearm.{s}",
        rules=[{"every_y": [3, 0], "t": -1}, {"dy": [5.5, None], "material": "slate", "t": -1}])
    # the hands: dark and bony, long hooked fingers
    add(name=f"hand.{s}", kind="ellipsoid", centre=[X(89.8), 74.6, 0.2], radii=[2.5, 3.2, 2.1], material="claw", bone=f"hand.{s}",
        rules=[{"every_y": [2, 0], "t": -1}])
    for k, (dx, ln, t) in enumerate(((-1.8, 6.0, -1), (-0.6, 7.4, 0), (0.6, 7.0, 0), (1.8, 5.6, -1))):
        add(name=f"finger{k}.{s}", kind="capsule", a=[X(89.8 + dx), 76.6, 0.6], b=[X(89.8 + dx * 1.3), 76.6 + ln, 2.2], r=[0.7, 0.35],
            material="claw", bone=f"hand.{s}", t=t, px=[90, None])
        add(name=f"claw{k}.{s}", kind="capsule", a=[X(89.8 + dx * 1.3), 76.6 + ln, 2.2], b=[X(89.8 + dx * 1.35), 78.0 + ln, 3.6], r=[0.4, 0.15],
            material="claw", bone=f"hand.{s}", t=-2, px=[90, None])
    add(name=f"thumb.{s}", kind="capsule", a=[X(88.0), 74.5, 1.4], b=[X(86.8), 78.6, 3.0], r=[0.7, 0.4], material="claw", bone=f"hand.{s}", px=[90, None])
    # legs are there for the skeleton's sake, hidden under the robe; only the toes of the boots show at the hem
    add(name=f"thigh.{s}", kind="capsule", a=[X(74.5), 70.8, 0.1], b=[X(74.5), 97.9, -0.1], r=[3.0, 2.4], material="robe", bone=f"thigh.{s}")
    add(name=f"shin.{s}", kind="capsule", a=[X(74.5), 97.9, -0.1], b=[X(74.5), 126.9, -2.4], r=[2.4, 2.0], material="robe", bone=f"shin.{s}")
    add(name=f"foot.{s}", kind="box", centre=[X(74.5), 131.6, 3.0], half=[3.0, 2.2, 5.6], round=1.2, material="claw", bone=f"foot.{s}")

# ---- the long brown under-robe, to the ground, flaring
add(name="robe", kind="ring", y=[40, 133], rx=[8.4, 0.14], rz=[7.0, 0.105], thickness=1.6, hem={"tongues": 18, "depth": 3, "seed": 5},
    material="robe", part="robe", bump={"folds": [0.4, 9, 1.0]},
    rules=[{"every_angle": [8, 0], "t": -1}, {"hem_band": [0, 30], "t": -1}, {"hem_band": [0, 6], "t": -1}, {"hem_band": [0, 2], "t": -2}])
# ---- the open coat of teal wool over it, to the ground, parted down the front
add(name="coat", kind="ring", y=[38, 134], rx=[9.6, 0.165], rz=[8.2, 0.12], thickness=1.6, keep={"back_strip": 2.72},
    hem={"tongues": 12, "depth": 4, "seed": 9}, holes={"p": 0.05, "band": 14, "seed": 4}, material="slate", part="coat",
    bump={"folds": [0.5, 7, 1.5]},
    rules=[{"every_angle": [10, 0], "t": -1}, {"hem_band": [0, 40], "t": -1}, {"hem_band": [0, 18], "t": -1}, {"hem_band": [0, 8], "t": -1}, {"hem_band": [0, 3], "material": "robe", "t": -2},
           {"hash": [0.012, 9, 1], "material": "brass", "px": [90, None]}])
# ---- the shawl: wide over the shoulders and the arms, torn at the hem, sewn with coins
add(name="shawl", kind="ring", y=[29, 72], rx=[9.0, 0.42], rz=[8.2, 0.22], thickness=2.0, hem={"tongues": 17, "depth": 12, "seed": 7},
    open={"angle": 0.5, "below": 34},
    holes={"p": 0.05, "band": 16, "seed": 8}, material="slate", part="shawl", bump={"folds": [0.5, 9, 2.0]},
    rules=[{"every_y": [5, 1], "hash": [0.4, 14, 2], "t": -1, "px": [90, None]}, {"hem_band": [0, 2], "t": -2},
           {"hash": [0.025, 21, 1], "material": "brass", "px": [90, None]}, {"hash": [0.008, 23, 1], "material": "brass", "t": 2, "px": [90, None]},
           {"y": [29, 33], "t": 1}])

# ---- the pale cords: looped from the neck down the chest, a ring at the bottom
def cord(name, pts, r=0.55, part="cords"):
    for i in range(len(pts) - 1):
        add(name=f"{name}_{i}", kind="capsule", a=pts[i], b=pts[i + 1], r=r, material="cord", part=part, px=[90, None])
for i, (dx, drop, bow) in enumerate(((-3.0, 22, 1.4), (2.6, 26, -1.8), (-1.2, 30, 2.4), (3.6, 19, 0.6), (0.4, 24, -0.6))):
    top_l, top_r = [CX - 4.5, 34.5, 8.6], [CX + 4.5, 34.5, 8.6]
    mid = [CX + dx, 34.5 + drop, 8.4]
    cord(f"loop{i}", [top_l, [CX - 4 + dx * 0.4 + bow, 34.5 + drop * 0.55, 9.6], mid, [CX + 4 + dx * 0.4 - bow, 34.5 + drop * 0.55, 9.6], top_r])
add(name="ring", kind="ring", y=[58.0, 59.6], rx=2.8, rz=2.8, cz=8.8, thickness=0.8, material="cord", part="cords",
    rotate={"x": 82, "about": [CX, 58.8, 9.4]}, px=[90, None])
cord("tail", [[CX + 0.4, 60, 8.8], [CX + 0.8, 70, 9.4], [CX + 0.2, 79, 9.6]], r=0.5)

# ---- strings of beads and coins hanging from the shawl's edges, and a pouch at the hip
for s, sg in (("L", 1), ("R", -1)):
    X = K.mirror(CX, sg)
    for j, (x0, y0, ln) in enumerate(((84.0, 63.0, 16), (87.5, 66.5, 20), (80.5, 66.0, 13))):
        pts = [[X(x0), y0 + t * ln, -1.5 + 6.0 * (j % 2) + 0.5 * t] for t in (0, 0.5, 1.0)]
        S.extend(K.chain(f"beads{s}{j}", pts, step=2.2, material="bead", link=(1.1, 1.1, 1.1), thin=(0.9, 0.9, 0.9), part="beads"))
        add(name=f"coin{s}{j}", kind="ellipsoid", centre=[X(x0), y0 + ln + 2.0, -1.5 + 6.0 * (j % 2) + 0.6], radii=[1.6, 1.6, 0.5], material="brass",
            part="beads", t=1)
add(name="pouch", kind="ellipsoid", centre=[CX - 10.5, 78, 6.2], radii=[3.4, 4.0, 2.6], material="leather5", part="pouch",
    rules=[{"dy": [None, -2.5], "t": -1}, {"y": [77.0, 78.0], "material": "brass"}])

spec = {
    "name": "mystic",
    "about": "The Hollow Mystic (sheet_c2451ff8_3, 'Servant of the Veiled Crone') as a solid shape sprite drawn by hand: a peaked hood "
             "with only dark in it, a wide weathered teal shawl sewn with brass coins and torn at the hem, an open teal coat to the "
             "ground over a long brown robe, pale cords looped over the chest with a ring, strings of beads and coins at the shawl's "
             "edges, dark clawed hands, a pouch at the hip. Drawn around the 120 px author pose.",
    "mode": "solid", "size": [138, 138], "height": 120, "ground": 134, "axis": [CX, 0],
    "view": {"elevation": 12}, "outline": "#060809",
    "skeleton": {"height": 120, "ground": 134, "cx": CX},
    "materials": M,
    "parts": {
        "shawl": {"bone": "spine.003", "lag": {"frames": 1, "sway": 0.4}, "hang": 0.55},
        "coat": {"bone": "hips", "lag": {"frames": 2, "sway": 0.8}, "hang": 0.3},
        "robe": {"bone": "hips", "lag": {"frames": 2, "sway": 0.6}, "hang": 0.25},
        "cords": {"bone": "spine.002", "lag": {"frames": 2, "sway": 0.5}, "hang": 0.4},
        "beads": {"bone": "spine.003", "lag": {"frames": 2, "sway": 0.8}, "hang": 0.5},
        "pouch": {"bone": "hips", "lag": {"frames": 1, "sway": 0.5}, "hang": 0.5},
    },
    "shapes": S,
    "clips": {"attack": "punch"},   # the stock attack is a wide kicking lunge that pushes a leg out through the robe
    "effects": [], "lights": [],
    "shadow": {"radii": [20, 4.0], "colour": "#4b4a4f"},
}
json.dump(spec, open(OUT, "w"), indent=1)
print("wrote", OUT, len(S), "shapes")
try:
    from pixelforge import shape_detail, shapes as PS
    r = shape_detail.stock(PS.load_shapes(OUT), replace=True)
    print("stock detail for", r["count"], "parts")
except Exception as e:   # noqa: BLE001
    print("detail layer not made:", e)
