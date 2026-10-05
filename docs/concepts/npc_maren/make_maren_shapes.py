"""Write assets/shapes/characters/maren.shapes.json: Maren the Gravekeeper (the camp's trader), drawn by hand from her
Midjourney sheet (the third: 12366666_..._ed5dfe30...png): gaunt, short grey hair, a hard tired face; grey wool tunic to
the shins with a scarf-cowl; a long stained leather apron with straps; a grave-spade across her back; a satchel of
candles at her hip; heavy gloves; wrapped boots.

Run from tools/pixelforge with the Forge's Python: python ../../docs/concepts/npc_maren/make_maren_shapes.py
"""
import json, os, random, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PF = os.path.normpath(os.path.join(HERE, "..", "..", "..", "tools", "pixelforge"))
if PF not in sys.path:
    sys.path.insert(0, PF)
from pixelforge import shape_parts as K   # noqa: E402

CX = 69.0
OUT = os.path.join(PF, "assets", "shapes", "characters", "maren.shapes.json")
rnd = random.Random(5)

M = {
    "paleskin": {"ramp": ["#231c1b", "#3a2f2c", "#544541", "#6d5a54", "#857068", "#9c867c"]},
    "greyhair": {"ramp": ["#1f1e1e", "#343232", "#4a4747", "#625e5d", "#7b7675"], "texture": "weave", "texture_strength": 0.3},
    "wool":     {"ramp": ["#0e0f0e", "#181a19", "#232624", "#2f3330", "#3c403c", "#4b504b"], "texture": "weave", "texture_strength": 0.45},
    "apron":    {"ramp": ["#0e0807", "#19100c", "#251812", "#322017", "#3f291d", "#4d3224"], "texture": "grain", "texture_strength": 0.35,
                 "runs": {"colour_from": "dirtstain", "density": 0.25, "length": [2, 5]}},
    "dirtstain": {"ramp": ["#120c08", "#1f150e", "#2e2016", "#3c2b1e"]},
    "strap":    {"ramp": ["#120a07", "#22130c", "#341e13", "#48291a", "#5c3624"]},
    "glove":    {"ramp": ["#0f0d0c", "#1c1917", "#2b2623", "#3b3430", "#4c443e"], "texture": "weave", "texture_strength": 0.3},
    "boot":     {"ramp": ["#0d0a09", "#1a1411", "#2a201b", "#3a2c25", "#4b3a30"]},
    "spadewood": {"ramp": ["#110a07", "#1d120c", "#2b1b12", "#392419", "#472d20"], "texture": "grain", "texture_strength": 0.5},
    "iron":     {"ramp": ["#0e0e0f", "#1f1f21", "#333436", "#4a4b4e", "#626468", "#7d8085"], "spec": True, "spec_t": 0.85, "texture": "scratch", "texture_strength": 0.3},
    "wax":      {"ramp": ["#4a4232", "#6e634b", "#968a6c", "#bcb08f", "#ddd2b2"]},
}

S = []
def add(**k): S.append(k)

# ---- head: gaunt, hollow cheeks, short grey hair, a hard mouth
add(name="head", kind="ellipsoid", centre=[CX, 22.5, 0.6], radii=[5.0, 7.2, 5.6], material="paleskin", bone="head", rules=[
    {"y": [18.6, 19.4], "z": [3.6, None], "x": [65.8, 72.2], "t": -1},                               # brow line
    {"z": [3.8, None], "near": [[[67.1, 21.8, None], [70.9, 21.8, None]], 1.0], "t": -3},           # sunken eyes
    {"z": [4.2, None], "near": [[[67.1, 21.9, None], [70.9, 21.9, None]], 0.5], "t": 1},
    {"x": [68.5, 69.5], "y": [21.5, 24.8], "z": [4.9, None], "t": 1}, {"x": [68.0, 70.5], "y": [24.8, 25.6], "z": [4.4, None], "t": -2},                                # nose
    {"z": [3.4, None], "near": [[[65.4, 24.8, None], [72.6, 24.8, None]], 0.6], "t": -1},           # hollow cheeks
    {"y": [26.2, 27.2], "z": [3.6, None], "x": [66.8, 71.2], "t": -3},                                # the hard mouth
    {"hash": [0.06, 31, 1], "t": -1, "px": [90, None]}])
add(name="hair", kind="ellipsoid", centre=[CX, 20.0, -1.4], radii=[5.3, 5.2, 5.6], material="greyhair", bone="head",
    rules=[{"every_angle": [14, 0], "t": -1}, {"y": [None, 16.0], "t": 1}, {"z": [2.6, None], "y": [18.8, None], "material": "paleskin"}, {"z": [2.6, None], "y": [17.6, 18.8], "t": -1}])
add(name="neck", kind="capsule", a=[CX, 32, 0], b=[CX, 27.5, 0.2], r=[2.8, 2.6], material="paleskin", bone="neck")
# the scarf-cowl, thick wool wound round the neck and over the shoulders
add(name="cowl", kind="ring", y=[27.5, 36.5], rx=[6.0, 0.5], rz=[6.0, 0.45], thickness=2.6, material="wool", bone="spine.003",
    bump={"folds": [0.6, 7, 1.0]}, rules=[{"every_y": [2, 0], "t": -1}, {"y": [27.5, 28.5], "t": 1}])

# ---- body: lean, in grey wool; long sleeves rolled at the forearm
add(name="chest", kind="ellipsoid", centre=[CX, 45, 0.2], radii=[9.4, 11.6, 6.6], material="wool", bone="spine.002", rules=[{"every_y": [4, 0], "hash": [0.5, 3, 1], "t": -1}])
add(name="waist", kind="capsule", a=[CX, 55, -0.2], b=[CX, 69, -0.8], r=[7.8, 8.8], material="wool", bone="spine.001")
for s, sg in (("L", 1), ("R", -1)):
    X = K.mirror(CX, sg)
    add(name=f"delt.{s}", kind="ellipsoid", centre=[X(79.0), 38.0, -1.2], radii=[4.2, 4.2, 4.4], material="wool", bone=f"shoulder.{s}")
    add(name=f"upper_arm.{s}", kind="capsule", a=[X(79.5), 37.0, -3.0], b=[X(84.0), 54.0, -3.8], r=[3.3, 2.9], material="wool", bone=f"upper_arm.{s}",
        rules=[{"every_y": [4, 0], "hash": [0.5, 5, 1], "t": -1}])
    add(name=f"forearm.{s}", kind="capsule", a=[X(84.0), 54.0, -3.8], b=[X(87.4), 70.4, -0.8], r=[3.2, 2.5], material="wool", bone=f"forearm.{s}",
        rules=[{"y": [54, 58], "t": 1}, {"y": [57.5, 58.5], "t": -2}, {"dy": [7, None], "material": "glove"}])
    add(name=f"hand.{s}", kind="ellipsoid", centre=[X(88.0), 73.8, 0.2], radii=[2.7, 3.4, 2.4], material="glove", bone=f"hand.{s}",
        rules=[{"every_y": [2, 0], "t": -1}])
    for k, dx in enumerate((-1.4, 0.0, 1.4)):
        add(name=f"finger{k}.{s}", kind="capsule", a=[X(88.0 + dx), 75.8, 0.6], b=[X(88.0 + dx * 1.15), 80.0, 1.4], r=[0.8, 0.6],
            material="glove", bone=f"hand.{s}", t=-1 if k != 1 else 0, px=[90, None])
    add(name=f"thigh.{s}", kind="capsule", a=[X(73.6), 70.5, 0.1], b=[X(73.6), 97.6, -0.1], r=[4.2, 3.4], material="wool", bone=f"thigh.{s}")
    add(name=f"shin.{s}", kind="capsule", a=[X(73.6), 97.6, -0.1], b=[X(73.6), 126.6, -2.4], r=[3.6, 3.2], material="boot", bone=f"shin.{s}",
        rules=[{"every_y": [3, 0], "t": -1}, {"y": [None, 104], "material": "wool"}, {"y": [104, 106], "material": "strap"}])
    add(name=f"foot.{s}", kind="box", centre=[X(73.6), 131.2, 2.8], half=[3.4, 2.6, 6.0], round=1.4, material="boot", bone=f"foot.{s}",
        rules=[{"dy": [1.4, None], "t": -2}, {"dz": [4.0, None], "y": [None, 130.0], "t": 1}])

# ---- the tunic's skirt to mid-shin, split at the sides so the legs walk
add(name="tunic", kind="ring", y=[64, 112], rx=[9.4, 0.08], rz=[8.2, 0.06], thickness=1.6, hem={"tongues": 11, "depth": 3, "seed": 4},
    open={"angle": 0.18, "below": 92}, material="wool", part="tunic", bump={"folds": [0.5, 9, 1.4]},
    rules=[{"every_angle": [9, 0], "t": -1}, {"hem_band": [0, 2], "t": -1}, {"hash": [0.04, 7, 2], "t": -2, "px": [90, None]}])
# ---- the apron: long, stiff leather, a bib over the chest, stained low
add(name="apron", kind="ring", y=[36, 114], rx=[9.8, 0.05], rz=[7.4, 0.06], thickness=1.3, keep={"front": 1.05},
    hem={"tongues": 5, "depth": 3, "seed": 2}, material="apron", part="apron", bump={"folds": [0.3, 5, 0.6]},
    rules=[{"hem_band": [0, 22], "t": -1}, {"hem_band": [0, 6], "material": "dirtstain"}, {"y": [62, 64.5], "material": "strap", "t": 1},
           {"hash": [0.05, 9, 2], "t": -2, "px": [90, None]}, {"y": [36, 38], "t": 1}])
# straps over the shoulders and the spade's sling
add(name="strapL", kind="capsule", a=[CX - 5.5, 37, 6.4], b=[CX - 6.6, 30, 3.6], r=0.9, material="strap", bone="spine.003", px=[90, None])
add(name="strapR", kind="capsule", a=[CX + 5.5, 37, 6.4], b=[CX + 6.6, 30, 3.6], r=0.9, material="strap", bone="spine.003", px=[90, None])
add(name="sling", kind="capsule", a=[CX + 8.0, 32, 4.5], b=[CX - 9.0, 62, 6.8], r=0.9, material="strap", bone="spine.002", px=[90, None])
add(name="buckle", kind="box", centre=[CX - 1.0, 47.5, 7.6], half=[1.2, 1.2, 0.5], material="iron", bone="spine.002", px=[90, None])

# ---- the grave-spade across her back, the D-handle above her right shoulder, the blade low at the left
add(name="spade_haft", kind="capsule", a=[CX + 10.5, 17, -8.6], b=[CX - 9.5, 76, -8.0], r=[1.1, 1.0], material="spadewood", part="spade",
    rules=[{"every_y": [6, 0], "t": -1}])
# the D-handle: a crossbar above the haft's top, off her right shoulder (a ring here centres on the body axis)
add(name="spade_grip", kind="capsule", a=[CX + 8.6, 15.0, -8.6], b=[CX + 13.4, 16.6, -8.6], r=0.9, material="spadewood", part="spade")
add(name="spade_grip_l", kind="capsule", a=[CX + 8.6, 15.0, -8.6], b=[CX + 10.0, 19.0, -8.6], r=0.8, material="spadewood", part="spade")
add(name="spade_grip_r", kind="capsule", a=[CX + 13.4, 16.6, -8.6], b=[CX + 11.6, 20.0, -8.6], r=0.8, material="spadewood", part="spade")
add(name="spade_blade", kind="box", centre=[CX - 10.6, 82, -8.0], half=[4.0, 6.4, 0.6], round=0.8, material="iron", part="spade",
    rotate={"z": -18, "about": [CX - 10.6, 82, -8.0]}, rules=[{"dy": [3.5, None], "t": -1}, {"hash": [0.12, 3, 2], "t": -2}, {"dy": [None, -5.0], "t": 1}])

# ---- the satchel at her left hip, candles standing out of it
add(name="satchel", kind="box", centre=[CX + 11.6, 78, 3.0], half=[3.4, 4.0, 2.4], round=1.0, material="strap", part="satchel",
    rules=[{"dy": [None, -2.4], "t": 1}, {"dy": [-2.6, -1.6], "t": -2}, {"x": [80, 81], "material": "iron", "px": [90, None]}])
for k, (dx, h) in enumerate(((-1.6, 4.0), (0.0, 5.4), (1.5, 3.4))):
    add(name=f"candle{k}", kind="capsule", a=[CX + 11.6 + dx, 74.5, 2.6], b=[CX + 11.6 + dx, 74.5 - h, 2.6], r=0.55, material="wax", part="satchel", px=[90, None])

spec = {
    "name": "maren",
    "about": "Maren the Gravekeeper, the camp's trader, drawn by hand from her Midjourney sheet: gaunt, grey-haired, a hard tired "
             "face; grey wool with a scarf-cowl; a long stained leather apron; a grave-spade across her back; a satchel of candles; "
             "heavy gloves and boots. Drawn around the 120 px author pose.",
    "mode": "solid", "size": [138, 138], "height": 120, "ground": 134, "axis": [CX, 0],
    "view": {"elevation": 12}, "outline": "#080706",
    "skeleton": {"height": 120, "ground": 134, "cx": CX},
    "materials": M,
    "parts": {
        "tunic": {"bone": "hips", "lag": {"frames": 2, "sway": 0.5}, "hang": 0.3},
        "apron": {"bone": "spine.001", "lag": {"frames": 1, "sway": 0.3}, "hang": 0.4},
        "spade": {"bone": "spine.003", "lag": {"frames": 1, "sway": 0.2}},
        "satchel": {"bone": "hips", "lag": {"frames": 1, "sway": 0.5}, "hang": 0.5},
    },
    "shapes": S, "clips": {"attack": "punch", "idle": "talk"},   # a trader at her stall: she talks with her hands
    "effects": [], "lights": [],
    "shadow": {"radii": [18, 3.8], "colour": "#4b4a4f"},
}
json.dump(spec, open(OUT, "w"), indent=1)
print("wrote", OUT, len(S), "shapes")
try:
    from pixelforge import shape_detail, shapes as PS
    r = shape_detail.stock(PS.load_shapes(OUT), replace=True)
    print("stock detail for", r["count"], "parts")
except Exception as e:   # noqa: BLE001
    print("detail layer not made:", e)
