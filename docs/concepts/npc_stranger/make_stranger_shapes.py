"""Write assets/shapes/characters/stranger.shapes.json: the Stranger, drawn by hand from his Midjourney sheet
(stranger_upscale_1): tall and thin, all in black; a tall peaked hat with a wide brim; under it no face but a long pale
grey-green visage like a beak or a mask; a black shoulder cape over a long black coat to the ground, a hood bunched at
the back; belts and straps at the waist; grey ringed hands; a fan of old cards in his right hand and an iron lantern
burning green hanging from his left.

Run from tools/pixelforge with the Forge's Python: python ../../docs/concepts/npc_stranger/make_stranger_shapes.py
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PF = os.path.normpath(os.path.join(HERE, "..", "..", "..", "tools", "pixelforge"))
if PF not in sys.path:
    sys.path.insert(0, PF)
from pixelforge import shape_parts as K   # noqa: E402

CX = 69.0
OUT = os.path.join(PF, "assets", "shapes", "characters", "stranger.shapes.json")

M = {
    "black":   {"ramp": ["#060708", "#0c0e0f", "#131617", "#1b1f20", "#24292a", "#2f3536"], "texture": "weave", "texture_strength": 0.4},
    "felt":    {"ramp": ["#050606", "#0b0c0d", "#121415", "#1a1d1e", "#232728"], "texture": "grain", "texture_strength": 0.4},
    "visage":  {"ramp": ["#141a17", "#212b26", "#303d36", "#425249", "#56685d", "#6c8072"]},
    "hand":    {"ramp": ["#121212", "#1f1f1f", "#2e2d2c", "#3e3c3a", "#504d4a"]},
    "strap":   {"ramp": ["#070707", "#111111", "#1b1a19", "#262422"]},
    "brass":   {"ramp": ["#2a2010", "#4a3a1c", "#6d5629", "#927438", "#b4914a"], "spec": True, "spec_t": 0.8},
    "iron":    {"ramp": ["#0b0b0c", "#18191b", "#28292c", "#3b3d41"], "spec": True, "spec_t": 0.85},
    "green":   {"ramp": ["#0f3a12", "#18621c", "#228c27", "#36b83a", "#6ee26a"]},
    "card":    {"ramp": ["#2a2412", "#4a3f1e", "#6d5c2c", "#8f7a3c", "#ae9650"], "texture": "grain", "texture_strength": 0.5},
}

S = []
def add(**k): S.append(k)

# ---- the hat: a tall bent peak, a wide brim
add(name="brim", kind="ellipsoid", centre=[CX, 13.2, 0.6], radii=[16.0, 1.3, 15.0], material="felt", bone="head",
    rules=[{"hash": [0.06, 4, 2], "t": 1}])
add(name="crown", kind="capsule", a=[CX, 12.0, 0.4], b=[CX + 1.0, 2.0, -1.6], r=[6.2, 2.4], material="felt", bone="head",
    rules=[{"y": [9.5, 11.5], "material": "strap"}])
# ---- no face: dark under the brim, a long pale visage
add(name="head", kind="ellipsoid", centre=[CX, 19.0, 0.2], radii=[5.0, 6.0, 5.0], material="black", bone="head")
add(name="visage", kind="capsule", a=[CX, 15.0, 3.4], b=[CX, 28.0, 5.6], r=[2.6, 1.2], material="visage", bone="head",
    rules=[{"every_y": [5, 0], "t": -1}])
add(name="hair.L", kind="capsule", a=[CX + 4.0, 15.0, -0.8], b=[CX + 4.2, 26.0, -1.2], r=[1.4, 0.8], material="black", bone="head")
add(name="hair.R", kind="capsule", a=[CX - 4.0, 15.0, -0.8], b=[CX - 4.2, 26.0, -1.2], r=[1.4, 0.8], material="black", bone="head")
add(name="hood", kind="ellipsoid", centre=[CX, 30.0, -6.0], radii=[7.0, 6.0, 4.4], material="black", bone="spine.003",
    rules=[{"every_angle": [14, 0], "t": -1}])
add(name="collar", kind="capsule", a=[CX, 34, 0.0], b=[CX, 25, 1.0], r=[5.6, 4.6], material="black", bone="neck")

# ---- the body: thin, the long coat to the ground, the shoulder cape over it
add(name="chest", kind="ellipsoid", centre=[CX, 40.0, -0.4], radii=[9.0, 10.0, 6.8], material="black", bone="spine.003")
add(name="waist", kind="capsule", a=[CX, 50, -0.4], b=[CX, 66, -1.8], r=[7.6, 8.2], material="black", bone="spine.001")
add(name="coat", kind="ring", y=[48, 131], rx=[8.4, 0.11], rz=[7.4, 0.095], thickness=1.6,
    hem={"tongues": 16, "depth": 5, "seed": 3}, material="black", part="coat", bump={"folds": [0.6, 9, 1.8]},
    rules=[{"every_angle": [9, 0], "t": -1}, {"hem_band": [0, 2], "t": -2}, {"hash": [0.06, 9, 3], "t": 1, "px": [90, None]}])
add(name="coat_under", kind="ring", y=[66, 130], rx=[7.4, 0.09], rz=[6.4, 0.08], thickness=1.4, material="black", part="coat")
add(name="cape", kind="ring", y=[26, 54], rx=[11.0, 0.3], rz=[9.4, 0.24], thickness=1.6, hem={"tongues": 10, "depth": 4, "seed": 5},
    material="black", part="cape", bump={"folds": [0.5, 7, 1.6]}, rules=[{"every_angle": [8, 0], "t": -1}, {"hem_band": [0, 2], "t": 1}])
add(name="belt", kind="ring", y=[57, 60], rx=[8.8, 0.0], rz=[7.8, 0.0], thickness=1.6, material="strap", bone="hips")
add(name="belt2", kind="ring", y=[62, 64.4], rx=[9.0, 0.0], rz=[8.0, 0.0], thickness=1.4, material="strap", bone="hips")
add(name="buckle", kind="box", centre=[CX, 58.5, 8.6], half=[1.4, 1.6, 0.5], round=0.3, material="brass", bone="hips")
add(name="baldric", kind="capsule", a=[CX + 7.0, 33.0, 6.4], b=[CX - 6.4, 57.0, 8.2], r=0.9, material="strap", bone="spine.002")
add(name="disc", kind="ellipsoid", centre=[CX + 4.6, 45.0, 7.8], radii=[2.0, 2.0, 0.8], material="brass", bone="spine.002",
    rules=[{"near": [[[CX + 4.6, 45.0, None], [CX + 4.6, 45.0, None]], 0.8], "material": "iron"}])
add(name="hang_strap", kind="capsule", a=[CX - 3.0, 60.0, 8.4], b=[CX - 3.4, 84.0, 9.0], r=0.7, material="strap", part="coat")

# ---- the arms: long black sleeves with deep cuffs, grey ringed hands
for s, sg in (("L", 1), ("R", -1)):
    X = K.mirror(CX, sg)
    add(name=f"upper_arm.{s}", kind="capsule", a=[X(79.6), 33.0, -3.6], b=[X(83.0), 50.5, -4.4], r=[3.4, 3.2], material="black", bone=f"upper_arm.{s}",
        rules=[{"every_y": [4, 0], "t": -1}])
    add(name=f"forearm.{s}", kind="capsule", a=[X(83.0), 50.5, -4.4], b=[X(87.6), 66.0, -1.4], r=[3.4, 4.0], material="black", bone=f"forearm.{s}")
    add(name=f"cuff.{s}", kind="capsule", a=[X(87.0), 63.0, -1.8], b=[X(87.9), 67.6, -0.9], r=4.4, material="black", bone=f"forearm.{s}",
        rules=[{"y": [None, 64], "t": 1}])
    add(name=f"hand.{s}", kind="ellipsoid", centre=[X(91.2), 72.4, 0.0], radii=[2.2, 3.4, 1.8], material="hand", bone=f"hand.{s}",
        rules=[{"every_y": [2, 0], "t": -1}, {"y": [72, 73.2], "x": [X(90.4) if sg > 0 else None, X(90.4) if sg < 0 else None], "material": "brass"}])
    for k, dx in enumerate((-1.2, 0.0, 1.2)):
        add(name=f"finger{k}.{s}", kind="capsule", a=[X(91.2 + dx), 74.4, 0.3], b=[X(91.4 + dx * 1.2), 79.4, 1.0], r=[0.6, 0.45],
            material="hand", bone=f"hand.{s}", t=-1 if k != 1 else 0, px=[90, None])
    add(name=f"thigh.{s}", kind="capsule", a=[X(74.0), 67.6, 0.1], b=[X(74.0), 96.1, -0.1], r=[2.4, 2.0], material="black", bone=f"thigh.{s}")
    add(name=f"shin.{s}", kind="capsule", a=[X(74.0), 96.1, -0.1], b=[X(74.0), 126.6, -2.5], r=[1.9, 1.7], material="black", bone=f"shin.{s}")
    add(name=f"boot.{s}", kind="box", centre=[X(74.0), 130.6, 3.4], half=[3.0, 2.4, 6.4], round=1.6, material="felt", bone=f"foot.{s}")

# ---- the lantern burning green, hanging from his left hand
LX = CX + 22.6
add(name="bail", kind="capsule", a=[LX, 76.0, 1.0], b=[LX, 79.0, 1.0], r=0.4, material="iron", part="lantern", px=[90, None])
add(name="lamp_cap", kind="box", centre=[LX, 80.0, 1.0], half=[3.0, 1.0, 3.0], round=0.6, material="iron", part="lantern")
add(name="lamp", kind="box", centre=[LX, 85.4, 1.0], half=[2.7, 4.6, 2.7], round=0.4, material="green", part="lantern",
    rules=[{"every_x": [3, 0], "material": "iron"}, {"dy": [3.8, None], "material": "iron"}])
# ---- the fan of cards in his right hand
add(name="cards", kind="box", centre=[CX - 23.4, 77.0, 2.6], half=[2.8, 4.0, 0.5], round=0.2, material="card", part="cards",
    rules=[{"every_x": [2, 0], "t": -1}, {"hash": [0.2, 2, 1], "t": 1}])

spec = {
    "name": "stranger",
    "about": "The Stranger, drawn by hand from his Midjourney sheet: tall and thin in black, a tall peaked wide-brimmed hat, "
             "no face but a long pale grey-green visage, a shoulder cape over a long coat to the ground, belts at the waist, "
             "grey ringed hands, a fan of old cards in the right and a lantern burning green in the left.",
    "mode": "solid", "size": [138, 138], "height": 126, "ground": 134, "axis": [CX, 0],
    "view": {"elevation": 12}, "outline": "#020303",
    "skeleton": {"height": 126, "ground": 134, "cx": CX},
    "materials": M,
    "parts": {
        "coat": {"bone": "hips", "lag": {"frames": 2, "sway": 0.5}, "hang": 0.55},
        "cape": {"bone": "spine.003", "lag": {"frames": 1, "sway": 0.4}, "hang": 0.5},
        "lantern": {"bone": "hand.L", "lag": {"frames": 1, "sway": 0.6}, "hang": 0.6, "upright_from": "hips"},
        "cards": {"bone": "hand.R", "lag": {"frames": 0, "sway": 0.0}},
    },
    "shapes": S,
    "clips": {"attack": "punch"},
    "effects": [],
    "lights": [{"name": "lantern", "part": "lantern", "at": [LX, 85.4, 1.0], "radius": 11, "strength": 0.7, "pulse": 0.2, "colour": "#4fd04a"}],
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
