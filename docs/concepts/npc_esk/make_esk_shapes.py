"""Write assets/shapes/characters/esk.shapes.json: Warden-Crone Esk (the camp's keeper of errands), drawn by hand from her
Midjourney sheet (esk_mj_v1): small and bent double, a heavy hood of rag pulled down so only dark shows; layer on layer
of torn grey funeral rags hanging to the ground in strips; thin grey arms wrapped in rag; a tall staff of bound bone in
her right hand with an iron lantern hanging from its crook; feet wrapped in cloth strips.

She is drawn hunched: the head and shoulders sit low and forward of the standard skeleton, so the same clips move her.
Her walk is the library's hunched walk; her idle the torch-holder's (the lantern held up).

Run from tools/pixelforge with the Forge's Python: python ../../docs/concepts/npc_esk/make_esk_shapes.py
"""
import json, os, random, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PF = os.path.normpath(os.path.join(HERE, "..", "..", "..", "tools", "pixelforge"))
if PF not in sys.path:
    sys.path.insert(0, PF)
from pixelforge import shape_parts as K   # noqa: E402

CX = 69.0
OUT = os.path.join(PF, "assets", "shapes", "characters", "esk.shapes.json")
rnd = random.Random(3)

M = {
    "rag":     {"ramp": ["#151a1d", "#20272b", "#2c3439", "#394348", "#475258", "#56636a", "#69767c"], "texture": "weave", "texture_strength": 0.5},
    "ragpale": {"ramp": ["#262c30", "#343c41", "#444d53", "#556067", "#68737a", "#7d888e", "#939ea3"], "texture": "weave", "texture_strength": 0.5},
    "void":    {"ramp": ["#020203", "#060607", "#0b0b0d"]},
    "greyskin": {"ramp": ["#141414", "#232322", "#353331", "#474441", "#5a5652", "#6e6964"]},
    "wrap":    {"ramp": ["#2a2a28", "#3f3e3b", "#56544f", "#6d6a64", "#85817a", "#9c978f"], "texture": "weave", "texture_strength": 0.5},
    "bonewrap": {"ramp": ["#3a3530", "#57504a", "#766d63", "#958a7d", "#b3a796", "#cfc3b0"], "texture": "grain", "texture_strength": 0.5},
    "iron":    {"ramp": ["#0c0c0d", "#1b1c1e", "#2d2f32", "#414448", "#575b60"], "spec": True, "spec_t": 0.85},
    "glass":   {"ramp": ["#3a3222", "#5e4f30", "#87713f", "#b39652", "#d9bc6e"]},
}

S = []
def add(**k): S.append(k)

# She stands on a short skeleton (height 100: a small woman), every piece close to its bone so the clips move her
# whole; the bend is in her hood and the hump of her back, and her walk is the library's hunched walk.
# ---- the hood, deep and drooping forward; the face only dark
add(name="head", kind="ellipsoid", centre=[CX, 40.0, 3.4], radii=[4.4, 5.2, 4.6], material="void", bone="head")
add(name="hood", kind="ellipsoid", centre=[CX, 38.0, 2.0], radii=[8.6, 9.0, 9.0], material="ragpale", bone="head",
    rules=[{"z": [6.4, None], "near": [[[CX, 40.0, None], [CX, 44.5, None]], 3.6], "material": "void"},
           {"z": [5.6, None], "near": [[[CX, 39.5, None], [CX, 45.0, None]], 4.6], "t": -1},
           {"every_angle": [12, 0], "t": -1}, {"hash": [0.05, 3, 2], "t": -2, "px": [90, None]}])
add(name="hood_tip", kind="capsule", a=[CX, 31.0, 6.0], b=[CX, 35.0, 10.0], r=[3.6, 1.6], material="ragpale", bone="head")
add(name="neck", kind="capsule", a=[CX, 50, -0.4], b=[CX, 45, 0.2], r=[3.0, 2.8], material="void", bone="neck")
add(name="hump", kind="ellipsoid", centre=[CX, 55, -3.4], radii=[11.0, 9.6, 9.0], material="ragpale", bone="spine.003",
    rules=[{"every_y": [3, 0], "t": -1}])
add(name="chest", kind="ellipsoid", centre=[CX, 62, 0.0], radii=[8.6, 8.6, 6.4], material="rag", bone="spine.002")
add(name="waist", kind="capsule", a=[CX, 67, -0.6], b=[CX, 81, -2.0], r=[7.4, 8.2], material="rag", bone="spine.001")
add(name="hoodfall", kind="ring", y=[44, 70], rx=[9.4, 0.32], rz=[9.4, 0.28], cz=-0.6, thickness=1.8, hem={"tongues": 14, "depth": 9, "seed": 2},
    open={"angle": 0.85, "below": 52}, material="ragpale", part="rags_top", bump={"folds": [0.5, 8, 2.0]},
    rules=[{"every_angle": [8, 0], "t": -1}, {"hem_band": [0, 2], "t": -2}])

# ---- thin arms wrapped in rag, grey bony hands
for s, sg in (("L", 1), ("R", -1)):
    X = K.mirror(CX, sg)
    add(name=f"upper_arm.{s}", kind="capsule", a=[X(79.8), 52.5, -3.7], b=[X(83.1), 67.7, -4.0], r=[2.8, 2.4], material="ragpale", bone=f"upper_arm.{s}",
        rules=[{"every_y": [3, 0], "t": -1}])
    add(name=f"forearm.{s}", kind="capsule", a=[X(83.1), 67.7, -4.0], b=[X(86.3), 82.4, -0.6], r=[2.4, 1.9], material="wrap", bone=f"forearm.{s}",
        rules=[{"every_y": [2, 0], "t": -1}])
    add(name=f"hand.{s}", kind="ellipsoid", centre=[X(86.8), 84.8, 0.0], radii=[2.2, 2.8, 1.9], material="greyskin", bone=f"hand.{s}",
        rules=[{"every_y": [2, 0], "t": -1}])
    for k, dx in enumerate((-1.2, 0.0, 1.2)):
        add(name=f"finger{k}.{s}", kind="capsule", a=[X(86.8 + dx), 86.6, 0.4], b=[X(86.8 + dx * 1.2), 90.6, 1.2], r=[0.55, 0.4],
            material="greyskin", bone=f"hand.{s}", t=-1 if k != 1 else 0, px=[90, None])
    add(name=f"thigh.{s}", kind="capsule", a=[X(74.0), 81.3, 0.1], b=[X(74.0), 103.9, -0.1], r=[3.2, 2.6], material="rag", bone=f"thigh.{s}")
    add(name=f"shin.{s}", kind="capsule", a=[X(74.0), 103.9, -0.1], b=[X(74.0), 128.1, -2.0], r=[2.4, 2.2], material="wrap", bone=f"shin.{s}",
        rules=[{"every_y": [2, 0], "t": -1}])
    add(name=f"foot.{s}", kind="box", centre=[X(74.0), 131.0, 2.8], half=[3.0, 2.2, 5.0], round=1.5, material="wrap", bone=f"foot.{s}",
        rules=[{"every_z": [2, 0], "t": -1}, {"dy": [1.3, None], "t": -2}])

# ---- the rags: two layers torn into long strips to the shin, the outer paler and shorter
add(name="rags_in", kind="ring", y=[60, 116], rx=[9.8, 0.05], rz=[8.8, 0.05], thickness=1.6, hem={"tongues": 22, "depth": 12, "seed": 6},
    holes={"p": 0.06, "band": 30, "seed": 3}, open={"angle": 0.2, "below": 104}, material="rag", part="rags",
    bump={"folds": [0.6, 11, 2.0]}, rules=[{"every_angle": [7, 0], "t": -1}, {"hem_band": [0, 3], "t": -2}])
add(name="rags_out", kind="ring", y=[56, 98], rx=[10.8, 0.07], rz=[9.8, 0.06], cz=-0.6, thickness=1.6, hem={"tongues": 16, "depth": 16, "seed": 9},
    holes={"p": 0.08, "band": 28, "seed": 5}, material="ragpale", part="rags_out", bump={"folds": [0.6, 9, 2.4]},
    rules=[{"every_angle": [9, 0], "t": -1}, {"hem_band": [0, 2], "t": -2}, {"every_y": [6, 2], "hash": [0.4, 11, 2], "t": 1, "px": [90, None]}])

# ---- the staff of bound bone through her right hand, the iron lantern hanging from the crook
STX = CX - 17.3
add(name="staff", kind="capsule", a=[STX, 133.0, 0.6], b=[STX + 0.4, 30.0, -0.2], r=[1.0, 1.3], material="bonewrap", part="staff",
    rules=[{"every_y": [3, 0], "t": -1}, {"y": [None, 42], "t": 1}, {"hash": [0.1, 4, 2], "t": -2, "px": [90, None]}])
add(name="staff_knob", kind="ellipsoid", centre=[STX + 0.5, 28.0, -0.2], radii=[2.4, 2.8, 2.2], material="bonewrap", part="staff",
    rules=[{"every_angle": [20, 0], "t": -1}])
add(name="crook", kind="capsule", a=[STX + 0.5, 28.0, -0.2], b=[STX - 5.0, 29.0, -0.2], r=[1.0, 0.8], material="bonewrap", part="staff")
add(name="lantern_cord", kind="capsule", a=[STX - 5.0, 29.0, -0.2], b=[STX - 5.0, 33.5, -0.2], r=0.35, material="iron", part="staff", px=[90, None])
add(name="lantern_cap", kind="box", centre=[STX - 5.0, 34.4, -0.2], half=[2.2, 0.8, 2.2], round=0.4, material="iron", part="staff")
add(name="lantern", kind="box", centre=[STX - 5.0, 38.6, -0.2], half=[1.9, 3.4, 1.9], round=0.3, material="glass", part="staff",
    rules=[{"every_x": [2, 0], "material": "iron"}, {"dy": [2.8, None], "material": "iron"}])

spec = {
    "name": "esk",
    "about": "Warden-Crone Esk, the camp's keeper of errands, drawn by hand from her Midjourney sheet: bent double under a rag "
             "hood with only dark in it, torn grey funeral rags hanging to the ground in strips, thin rag-wrapped arms, a tall "
             "staff of bound bone with an iron lantern hanging from its crook, feet wrapped in strips.",
    "mode": "solid", "size": [138, 138], "height": 120, "ground": 134, "axis": [CX, 0],
    "view": {"elevation": 12}, "outline": "#060708",
    "skeleton": {"height": 100, "ground": 134, "cx": CX},   # a small woman
    "materials": M,
    "parts": {
        "rags_top": {"bone": "spine.003", "lag": {"frames": 1, "sway": 0.4}, "hang": 0.5},
        "rags": {"bone": "hips", "lag": {"frames": 2, "sway": 0.7}, "hang": 0.25},
        "rags_out": {"bone": "spine.001", "lag": {"frames": 2, "sway": 0.9}, "hang": 0.3},
        "staff": {"bone": "hand.R", "lag": {"frames": 0, "sway": 0.0}},
    },
    "shapes": S,
    "clips": {"walk": "walk_hunched", "attack": "punch"},
    "effects": [],
    "lights": [{"name": "lantern", "part": "staff", "at": [STX - 5.0, 38.6, -0.2], "radius": 9, "strength": 0.6, "pulse": 0.15, "colour": "#d9a95a"}],
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
