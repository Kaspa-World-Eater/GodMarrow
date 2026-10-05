"""Write assets/shapes/characters/husk.shapes.json: the Husk (the game's `hollow`), Act I's commonest creature, drawn by
hand from its Midjourney sheet (husk_v1): a tall gaunt dead thing, a skull face deep in a hood of wrapped grave-cloth that
winds round the neck and shoulders in heavy loops; a body of sinew and bone bound in strips; very long thin arms with
wrapped wrists and long clawed hands hanging past the knees; torn rags hanging in long points to the ground; thin legs.
All one dusty grave-brown. It leans a little forward, as if smelling for us.

Run from tools/pixelforge with the Forge's Python: python ../../docs/concepts/mon_husk/make_husk_shapes.py
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PF = os.path.normpath(os.path.join(HERE, "..", "..", "..", "tools", "pixelforge"))
if PF not in sys.path:
    sys.path.insert(0, PF)
from pixelforge import shape_parts as K   # noqa: E402

CX = 69.0
OUT = os.path.join(PF, "assets", "shapes", "characters", "husk.shapes.json")

M = {
    "cloth":  {"ramp": ["#141110", "#211c18", "#2f2822", "#3d352d", "#4b4238", "#5a5044", "#6a5f51"], "texture": "weave", "texture_strength": 0.55},
    "sinew":  {"ramp": ["#120e0c", "#1f1915", "#2d241e", "#3b3027", "#4a3d31", "#594a3c"], "texture": "grain", "texture_strength": 0.5},
    "skull":  {"ramp": ["#2a241d", "#463d32", "#64584a", "#82755f", "#9d9077", "#b7aa90"]},
    "void":   {"ramp": ["#050404", "#0b0908", "#14100e"]},
    "claw":   {"ramp": ["#0d0b0a", "#1d1915", "#332c25", "#4b4136"]},
}

S = []
def add(**k): S.append(k)

# ---- the skull in its hood, leaning forward
add(name="skull", kind="ellipsoid", centre=[CX, 20.4, 5.4], radii=[3.7, 4.6, 3.6], material="skull", bone="head",
    rules=[{"z": [7.0, None], "near": [[[CX - 1.6, 19.8, None], [CX + 1.6, 19.8, None]], 1.0], "material": "void"},
           {"z": [7.6, None], "near": [[[CX, 22.0, None], [CX, 22.0, None]], 0.6], "material": "void"},
           {"y": [23.6, None], "every_x": [1, 0], "material": "void"}])
add(name="jaw", kind="capsule", a=[CX - 1.8, 24.6, 6.6], b=[CX + 1.8, 24.6, 6.6], r=1.0, material="skull", bone="head",
    rules=[{"every_x": [1, 0], "t": -1}])
add(name="hood", kind="ellipsoid", centre=[CX, 20.0, 1.6], radii=[7.0, 8.6, 7.0], material="cloth", bone="head",
    rules=[{"z": [4.4, None], "near": [[[CX, 17.0, None], [CX, 26.0, None]], 4.2], "material": "void", "t": 0},
           {"every_angle": [11, 0], "t": -1}, {"hash": [0.06, 4, 2], "t": -2, "px": [90, None]}])
add(name="hood_peak", kind="capsule", a=[CX, 15.0, 0.4], b=[CX, 12.2, -1.2], r=[5.4, 3.4], material="cloth", bone="head")
# the wrapped loops of grave-cloth round the neck and shoulders
for k, (y, rx, rz, cz) in enumerate(((27.6, 7.2, 6.8, 1.8), (31.4, 8.8, 7.6, 1.0), (35.4, 10.0, 8.0, 0.2), (39.2, 10.6, 8.0, -0.6))):
    add(name=f"wrap{k}", kind="ring", y=[y - 2.6, y + 2.6], rx=[rx, 0.0], rz=[rz, 0.0], cz=cz, thickness=2.4, material="cloth", bone="spine.003",
        rules=[{"every_angle": [9, k], "t": -1}, {"hash": [0.08, 5, k], "t": 1}])
add(name="mantle", kind="ring", y=[36, 50], rx=[9.0, 0.12], rz=[7.4, 0.06], thickness=1.6, hem={"tongues": 9, "depth": 16, "seed": 2},
    holes={"p": 0.1, "band": 16, "seed": 4}, open={"angle": 1.1, "below": 40}, material="cloth", part="mantle",
    bump={"folds": [0.5, 8, 1.8]}, rules=[{"every_angle": [8, 0], "t": -1}, {"hem_band": [0, 2], "t": -2}])

# ---- the body: sinew and bone bound in strips
add(name="chest", kind="ellipsoid", centre=[CX, 44.0, -0.6], radii=[8.0, 9.4, 5.6], material="sinew", bone="spine.003",
    rules=[{"every_y": [2, 0], "t": -1}, {"z": [3.0, None], "every_y": [3, 1], "t": 1}])
add(name="waist", kind="capsule", a=[CX, 52, -0.4], b=[CX, 66, -1.4], r=[5.0, 6.0], material="sinew", bone="spine.001",
    rules=[{"every_y": [2, 0], "t": -1}])
add(name="rags", kind="ring", y=[56, 92], rx=[6.6, 0.05], rz=[5.4, 0.04], thickness=1.4, hem={"tongues": 11, "depth": 40, "seed": 6},
    holes={"p": 0.12, "band": 30, "seed": 7}, material="cloth", part="rags",
    bump={"folds": [0.6, 9, 2.0]}, rules=[{"every_angle": [7, 0], "t": -1}, {"hem_band": [0, 3], "t": -2}])

add(name="rags_over", kind="ring", y=[54, 78], rx=[7.6, 0.06], rz=[6.2, 0.05], cz=0.4, thickness=1.4, hem={"tongues": 8, "depth": 26, "seed": 13},
    material="cloth", part="rags", bump={"folds": [0.6, 7, 2.0]}, rules=[{"every_angle": [6, 1], "t": 1}, {"hem_band": [0, 3], "t": -2}])

# ---- long thin arms, wrapped wrists, long clawed hands hanging past the knees
for s, sg in (("L", 1), ("R", -1)):
    X = K.mirror(CX, sg)
    add(name=f"upper_arm.{s}", kind="capsule", a=[X(80.4), 36.0, -4.0], b=[X(84.6), 55.0, -4.8], r=[2.6, 1.9], material="sinew", bone=f"upper_arm.{s}",
        rules=[{"every_y": [3, 0], "t": -1}])
    add(name=f"elbow.{s}", kind="ellipsoid", centre=[X(84.6), 55.0, -4.8], radii=[2.0, 2.0, 2.0], material="sinew", bone=f"upper_arm.{s}")
    add(name=f"forearm.{s}", kind="capsule", a=[X(84.6), 55.0, -4.8], b=[X(88.6), 75.0, -0.8], r=[1.8, 1.6], material="sinew", bone=f"forearm.{s}",
        rules=[{"y": [68, None], "every_y": [1, 0], "material": "cloth"}])
    add(name=f"hand.{s}", kind="ellipsoid", centre=[X(89.4), 79.0, 0.0], radii=[2.4, 3.6, 1.6], material="sinew", bone=f"hand.{s}")
    for k, dx in enumerate((-1.8, -0.6, 0.6, 1.8)):
        add(name=f"finger{k}.{s}", kind="capsule", a=[X(89.4 + dx), 81.6, 0.2], b=[X(89.4 + dx * 1.6), 90.0, 1.8], r=[0.6, 0.35],
            material="sinew", bone=f"hand.{s}", px=[90, None], rules=[{"y": [87.0, None], "material": "claw"}])
    add(name=f"thigh.{s}", kind="capsule", a=[X(73.0), 69.7, 0.1], b=[X(73.0), 97.3, -0.1], r=[2.6, 2.0], material="sinew", bone=f"thigh.{s}")
    add(name=f"shin.{s}", kind="capsule", a=[X(73.0), 97.3, -0.1], b=[X(73.0), 126.8, -2.4], r=[1.9, 1.6], material="sinew", bone=f"shin.{s}",
        rules=[{"every_y": [2, 0], "t": -1}])
    add(name=f"foot.{s}", kind="box", centre=[X(73.0), 131.0, 2.6], half=[2.4, 2.0, 5.0], round=1.4, material="sinew", bone=f"foot.{s}",
        rules=[{"dy": [1.2, None], "t": -2}])

spec = {
    "name": "husk",
    "about": "The Husk (hollow), drawn by hand from its Midjourney sheet: a tall gaunt dead thing, a skull deep in a hood of "
             "wrapped grave-cloth, the cloth wound round neck and shoulders, sinew bound in strips, very long thin arms with "
             "clawed hands past the knees, rags hanging in long points to the ground.",
    "mode": "solid", "size": [138, 138], "height": 120, "ground": 134, "axis": [CX, 0],
    "view": {"elevation": 12}, "outline": "#050404",
    "skeleton": {"height": 120, "ground": 134, "cx": CX},
    "materials": M,
    "parts": {
        "mantle": {"bone": "spine.003", "lag": {"frames": 1, "sway": 0.5}, "hang": 0.5},
        "rags": {"bone": "hips", "lag": {"frames": 2, "sway": 0.8}, "hang": 0.3},
    },
    "shapes": S,
    "clips": {"walk": "walk_hunched", "attack": "attack"},
    "effects": [],
    "shadow": {"radii": [16, 3.6], "colour": "#4b4a4f"},
}
json.dump(spec, open(OUT, "w"), indent=1)
print("wrote", OUT, len(S), "shapes")
try:
    from pixelforge import shape_detail, shapes as PS
    r = shape_detail.stock(PS.load_shapes(OUT), replace=True)
    print("stock detail for", r["count"], "parts")
except Exception as e:   # noqa: BLE001
    print("detail layer not made:", e)
