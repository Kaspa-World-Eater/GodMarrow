"""Write assets/shapes/characters/brannoc.shapes.json: Brannoc the smith, drawn by hand from his Midjourney sheet
(brannoc_mj_1): a huge broad bald man with a long grey beard braided at the end and an iron nail driven through his head
from ear to ear; a long rust-stained leather apron with a bib, straps over the shoulders crossing on his bare muscled
back; a heavy belt with pouches and tongs; forearms wrapped thick in dark rag; big work gloves; dark trousers and heavy
strapped boots; a smith's hammer hanging in his right hand.

Run from tools/pixelforge with the Forge's Python: python ../../docs/concepts/npc_brannoc/make_brannoc_shapes.py
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PF = os.path.normpath(os.path.join(HERE, "..", "..", "..", "tools", "pixelforge"))
if PF not in sys.path:
    sys.path.insert(0, PF)
from pixelforge import shape_parts as K   # noqa: E402

CX = 69.0
OUT = os.path.join(PF, "assets", "shapes", "characters", "brannoc.shapes.json")

M = {
    "skin":    {"ramp": ["#1a1211", "#2a1e1b", "#3b2b26", "#4d3a33", "#604a41", "#735b51", "#866d62"]},
    "beard":   {"ramp": ["#1f1d1b", "#33302d", "#4a4642", "#625d57", "#7b756e", "#948e85"], "texture": "grain", "texture_strength": 0.6},
    "apron":   {"ramp": ["#110a08", "#1b100c", "#261611", "#311c14", "#3e2317", "#4e2b1a", "#5f341d"], "texture": "grain", "texture_strength": 0.6},
    "strap":   {"ramp": ["#0f0a09", "#18110e", "#221813", "#2d2019", "#3a2a20"]},
    "cloth":   {"ramp": ["#110d0c", "#1c1614", "#28201d", "#352a26", "#433631", "#52433d"], "texture": "weave", "texture_strength": 0.5},
    "wrap":    {"ramp": ["#141010", "#221b19", "#312724", "#41352f", "#52443c"], "texture": "weave", "texture_strength": 0.6},
    "iron":    {"ramp": ["#0b0b0c", "#18191b", "#28292c", "#3b3d41", "#53565b", "#6e7177"], "spec": True, "spec_t": 0.85},
    "wood":    {"ramp": ["#1d120c", "#2f1e14", "#45301f", "#5c412b", "#735237"], "texture": "grain", "texture_strength": 0.5},
    "eye":     {"ramp": ["#0a0605", "#1a0d0a", "#3a1a12"]},
}

S = []
def add(**k): S.append(k)

# ---- the head: bald, heavy brow, the nail through it, the beard down the chest in a braid
add(name="skull", kind="ellipsoid", centre=[CX, 21.5, 2.4], radii=[6.2, 7.0, 6.4], material="skin", bone="head",
    rules=[{"z": [4.6, None], "dy": [None, -0.5], "near": [[[CX - 2.4, 22.5, None], [CX + 2.4, 22.5, None]], 1.1], "material": "eye"},
           {"y": [None, 16], "t": 1}, {"hash": [0.06, 5, 2], "t": -1, "px": [90, None]}])
add(name="brow", kind="capsule", a=[CX - 3.4, 20.8, 6.6], b=[CX + 3.4, 20.8, 6.6], r=1.3, material="skin", bone="head")
add(name="nose", kind="capsule", a=[CX, 22.0, 7.4], b=[CX, 25.0, 8.4], r=[0.9, 1.3], material="skin", bone="head")
for s, sg in (("L", 1), ("R", -1)):
    add(name=f"ear.{s}", kind="ellipsoid", centre=[CX + sg * 6.2, 23.0, 1.8], radii=[1.0, 2.0, 1.4], material="skin", bone="head")
add(name="nail", kind="capsule", a=[CX - 9.5, 21.6, 4.0], b=[CX + 8.5, 19.4, 1.0], r=[0.25, 0.75], material="iron", bone="head")
add(name="nail_head", kind="ellipsoid", centre=[CX + 8.8, 19.3, 0.9], radii=[0.7, 1.7, 1.7], material="iron", bone="head")
add(name="beard", kind="ellipsoid", centre=[CX, 34.0, 8.0], radii=[6.2, 10.6, 3.8], material="beard", bone="head",
    rules=[{"every_x": [1, 0], "t": -1}, {"hash": [0.2, 3, 1], "t": 1, "px": [90, None]}])
add(name="moustache", kind="capsule", a=[CX - 3.6, 26.6, 8.4], b=[CX + 3.6, 26.6, 8.4], r=1.1, material="beard", bone="head")
add(name="braid", kind="capsule", a=[CX, 40.0, 10.0], b=[CX - 0.6, 54.0, 12.6], r=[2.6, 1.3], material="beard", part="braid",
    rules=[{"every_y": [2, 0], "t": -1}])
add(name="braid_tie", kind="capsule", a=[CX - 0.5, 50.0, 12.0], b=[CX - 0.5, 51.4, 12.2], r=1.6, material="strap", part="braid")
add(name="neck", kind="capsule", a=[CX, 34, -1.0], b=[CX, 27, 1.0], r=[6.4, 5.6], material="skin", bone="neck")

# ---- the body: a barrel of a man, the bare back and shoulders
for s_, sg in (("L", 1), ("R", -1)):
    add(name=f"trap.{s_}", kind="capsule", a=[CX + sg * 2.0, 28.0, -2.0], b=[CX + sg * 12.0, 34.0, -2.6], r=[5.2, 5.6], material="skin", bone="spine.003")
add(name="chest", kind="ellipsoid", centre=[CX, 42.0, -0.6], radii=[15.0, 11.6, 9.6], material="skin", bone="spine.003",
    rules=[{"every_x": [7, 0], "z": [None, -4], "t": -1}, {"hash": [0.05, 6, 2], "t": -1, "px": [90, None]}])
add(name="belly", kind="ellipsoid", centre=[CX, 55.0, 2.4], radii=[13.2, 10.0, 10.2], material="skin", bone="spine.001")
add(name="hips", kind="capsule", a=[CX, 62, -0.4], b=[CX, 70, -1.6], r=[11.4, 11.0], material="cloth", bone="hips")
# the apron: the bib over chest and belly, the long skirt in front, a dark cloth skirt behind
add(name="bib", kind="ring", y=[34, 62], rx=[12.4, 0.12], rz=[10.4, 0.12], cz=0.6, thickness=1.6, keep={"front": 1.15},
    material="apron", bone="spine.002", rules=[{"hash": [0.14, 7, 3], "t": 1}, {"hash": [0.16, 5, 2], "t": -1}, {"every_y": [9, 0], "t": -1}])
add(name="skirt", kind="ring", y=[60, 108], rx=[12.6, 0.07], rz=[11.0, 0.06], thickness=1.6, keep={"front": 1.35},
    hem={"tongues": 12, "depth": 6, "seed": 4}, material="apron", part="apron", bump={"folds": [0.5, 7, 1.6]},
    rules=[{"hash": [0.14, 7, 3], "t": 1}, {"hash": [0.16, 5, 2], "t": -1}, {"hem_band": [0, 2], "t": -2}])
add(name="backskirt", kind="ring", y=[60, 104], rx=[12.8, 0.07], rz=[11.2, 0.06], thickness=1.6, keep={"back_strip": 2.2},
    hem={"tongues": 14, "depth": 7, "seed": 8}, material="cloth", part="apron", bump={"folds": [0.5, 8, 1.8]},
    rules=[{"every_angle": [10, 0], "t": -1}, {"hem_band": [0, 2], "t": -2}])
add(name="belt", kind="ring", y=[58, 63], rx=[13.4, 0.0], rz=[11.6, 0.0], thickness=2.0, material="strap", bone="hips",
    rules=[{"every_angle": [16, 0], "t": 1}])
add(name="buckle", kind="box", centre=[CX, 60.6, 12.0], half=[1.8, 2.0, 0.6], round=0.3, material="iron", bone="hips")
for k, (dx, dz) in enumerate(((-9.0, 7.6), (8.6, 7.8))):
    add(name=f"pouch{k}", kind="box", centre=[CX + dx, 66.0, dz], half=[2.4, 3.2, 1.6], round=0.8, material="strap", bone="hips")
add(name="tongs_a", kind="capsule", a=[CX + 12.6, 62.0, 2.0], b=[CX + 13.2, 84.0, 2.6], r=0.6, material="iron", part="apron")
add(name="tongs_b", kind="capsule", a=[CX + 12.6, 62.0, 2.0], b=[CX + 12.0, 84.0, 4.2], r=0.6, material="iron", part="apron")
# the straps: over each shoulder, crossing on the back
for s, sg in (("L", 1), ("R", -1)):
    X = K.mirror(CX, sg)
    add(name=f"strap_front.{s}", kind="capsule", a=[X(76.0), 32.0, 6.0], b=[X(76.4), 37.0, 9.4], r=1.3, material="strap", bone="spine.003")
    add(name=f"strap_back.{s}", kind="capsule", a=[X(75.0), 32.0, -8.0], b=[X(61.0), 57.0, -8.4], r=1.4, material="strap", bone="spine.003",
        rules=[{"hash": [0.1, 5, 2], "material": "apron", "t": 1}])

# ---- the arms: huge bare upper arms, forearms wrapped thick in rag, big gloves
for s, sg in (("L", 1), ("R", -1)):
    X = K.mirror(CX, sg)
    add(name=f"deltoid.{s}", kind="ellipsoid", centre=[X(83.0), 36.0, -2.6], radii=[6.4, 6.0, 6.8], material="skin", bone=f"upper_arm.{s}")
    add(name=f"upper_arm.{s}", kind="capsule", a=[X(83.0), 36.0, -4.5], b=[X(86.2), 53.1, -4.8], r=[6.0, 5.0], material="skin", bone=f"upper_arm.{s}",
        rules=[{"hash": [0.05, 6, 2], "t": -1, "px": [90, None]}])
    add(name=f"forearm.{s}", kind="capsule", a=[X(86.2), 53.1, -4.8], b=[X(90.1), 71.0, -0.7], r=[5.8, 4.8], material="wrap", bone=f"forearm.{s}",
        rules=[{"every_y": [2, 0], "t": -1}, {"hash": [0.12, 4, 2], "t": 1}])
    add(name=f"glove.{s}", kind="ellipsoid", centre=[X(91.0), 75.4, 0.4], radii=[4.0, 4.6, 3.6], material="strap", bone=f"hand.{s}",
        rules=[{"every_y": [2, 0], "t": -1}])
    # legs: dark trousers, the shins wrapped, big strapped boots
    add(name=f"thigh.{s}", kind="capsule", a=[X(75.6), 69.7, 0.1], b=[X(75.6), 97.3, -0.1], r=[6.6, 5.4], material="cloth", bone=f"thigh.{s}")
    add(name=f"shin.{s}", kind="capsule", a=[X(75.6), 97.3, -0.1], b=[X(75.6), 124.0, -2.2], r=[5.4, 5.0], material="wrap", bone=f"shin.{s}",
        rules=[{"every_y": [3, 0], "t": -1}])
    add(name=f"boot.{s}", kind="box", centre=[X(75.6), 129.6, 2.4], half=[4.8, 3.8, 7.2], round=2.0, material="strap", bone=f"foot.{s}",
        rules=[{"every_z": [3, 0], "t": -1}, {"dy": [2.6, None], "t": -2}])
    add(name=f"bootcuff.{s}", kind="capsule", a=[X(75.6), 118.0, -1.6], b=[X(75.6), 123.0, -2.0], r=5.8, material="strap", bone=f"shin.{s}")

# ---- the hammer, hanging head-down in his right hand
HX = CX - 21.0
add(name="haft", kind="capsule", a=[HX + 0.4, 73.0, 1.0], b=[HX - 2.4, 97.0, 3.2], r=[1.1, 1.2], material="wood", part="hammer",
    rules=[{"every_y": [3, 0], "t": -1}])
add(name="hammer_head", kind="box", centre=[HX - 2.6, 99.6, 3.4], half=[5.4, 3.0, 3.0], round=0.6, material="iron", part="hammer",
    rules=[{"hash": [0.1, 3, 2], "t": -1}])

spec = {
    "name": "brannoc",
    "about": "Brannoc the smith, drawn by hand from his Midjourney sheet: a huge bald man with an iron nail through his head, "
             "a long grey beard ending in a braid, a rust-stained leather apron with straps crossing on his bare back, "
             "rag-wrapped forearms, gloves, heavy boots, a smith's hammer in his right hand.",
    "mode": "solid", "size": [138, 138], "height": 122, "ground": 134, "axis": [CX, 0],
    "view": {"elevation": 12}, "outline": "#070504",
    "skeleton": {"height": 122, "ground": 134, "cx": CX},
    "materials": M,
    "parts": {
        "braid": {"bone": "neck", "lag": {"frames": 1, "sway": 0.5}, "hang": 0.4},
        "apron": {"bone": "hips", "lag": {"frames": 1, "sway": 0.5}, "hang": 0.35},
        "hammer": {"bone": "hand.R", "lag": {"frames": 0, "sway": 0.0}},
    },
    "shapes": S,
    "clips": {"attack": "punch"},   # the talking idle waves the hammer about
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
