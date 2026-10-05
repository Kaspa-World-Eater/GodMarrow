"""Write assets/shapes/characters/keeper_hd.shapes.json: the Shrine Keeper, drawn by hand from Derek's own sheets
(docs/concepts/shrine_keeper/sheet_58e07eae_3.png the main one, the other two for the jars, the paper and the plates),
by the Ossuarch's process and to DESIGN.md:
- a wide straw rain-hat worn low;
- a tattered lilac veil over the face to the chest, two violet eyes;
- dark plum lamellar plates on the shoulders and forearms, and two long panels down the front of the robe;
- thick rope coiled round the chest and the waist;
- sealed clay breath-jars at the hips and on the back;
- zig-zag paper streamers from the rope belt;
- a long layered violet robe tattered to the ground;
- clawed gloves; wrapped feet in straw sandals.
The quiet things: the horns pressing up under the veil at the brow; six jars seen, two more tied inside the robe
(eight, the Myriad's number).

Run from tools/pixelforge with the Forge's Python: python ../../docs/concepts/shrine_keeper/make_keeper_shapes.py
"""
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PF = os.path.normpath(os.path.join(HERE, "..", "..", "..", "tools", "pixelforge"))
if PF not in sys.path:
    sys.path.insert(0, PF)
from pixelforge import shape_parts as K   # noqa: E402

CX = 75.0
OUT = os.path.join(PF, "assets", "shapes", "characters", "keeper_hd.shapes.json")

M = {
    # violet cloth: indigo-black shadows up to a dusty lilac, the last step the rim
    "robe":  {"ramp": ["#050407", "#09070b", "#0e0b11", "#141017", "#1b151e", "#221a25", "#2a202d", "#332736", "#3d2e40", "#7a6584"],
              "texture": "weave", "texture_strength": 0.5},
    "veil":  {"ramp": ["#130d16", "#1e1522", "#2b1e30", "#3a293f", "#4a3550", "#5c4362", "#6f5374", "#836487", "#98789a"],
              "texture": "weave", "texture_strength": 0.55},
    "plate": {"ramp": ["#050407", "#0a080c", "#100c13", "#17111a", "#1f1723", "#281e2c", "#322636", "#3e3042", "#4b3a4f", "#8c7a9c"],
              "texture": "grain", "texture_strength": 0.3, "rim_edge": True},
    "lace":  {"ramp": ["#1a0f0d", "#2c1a15", "#41271d", "#573426"]},
    "rope":  {"ramp": ["#0c0807", "#150e0b", "#1f1510", "#2a1d15", "#36251a", "#43301f", "#523b26", "#634830"], "texture": "weave", "texture_strength": 0.6},
    "clay":  {"ramp": ["#0f0b0a", "#1a1311", "#261c18", "#33251f", "#412f27", "#503a30", "#60463a", "#715345"], "texture": "grain", "texture_strength": 0.4},
    "paper": {"ramp": ["#2a2530", "#3d3744", "#524b58", "#68606c", "#7f7782", "#978f98", "#aea6ad"]},
    "straw": {"ramp": ["#09070a", "#100c12", "#17121a", "#1f1823", "#271f2c", "#302636", "#3a2e41", "#7a6488"],
              "texture": "weave", "texture_strength": 0.6, "rim_edge": True},
    "wrap":  {"ramp": ["#120d12", "#1d151d", "#2a1f2a", "#382a37", "#473645", "#584452"], "texture": "weave", "texture_strength": 0.5},
    "glove": {"ramp": ["#060407", "#0c080e", "#140e17", "#1d1520", "#271c2a", "#33263a"]},
    "claw":  {"ramp": ["#0a0909", "#1a1716", "#2e2a28", "#48423e", "#68605a"]},
    "eye":   {"ramp": ["#3a0d5c", "#6a1fa0", "#a14be0", "#d59bff"], "emissive": True},
    "void":  {"ramp": ["#020103", "#050307", "#09060c"]},
}

S = []
def add(**k): S.append(k)

# ================================================================ the head: hat, veil, eyes, the horns under the cloth
add(name="head", kind="ellipsoid", centre=[CX, 28.0, 0.6], radii=[5.6, 7.0, 5.8], material="void", bone="head")
add(name="hat", kind="ellipsoid", centre=[CX, 22.2, 0.4], radii=[19.0, 1.3, 18.0], material="straw", bone="head",
    rules=[{"dy": [0.3, None], "t": -3}, {"hash": [0.05, 2, 3], "t": -1}])
add(name="hat_crown", kind="capsule", a=[CX, 21.6, 0.4], b=[CX, 16.6, 0.2], r=[6.4, 1.0], material="straw", bone="head",
    rules=[{"hash": [0.05, 2, 4], "t": -1}])
add(name="hat_cord", kind="ring", y=[22.6, 23.6], rx=[6.2, 0.0], rz=[6.2, 0.0], cz=0.4, thickness=0.8, material="rope", bone="head")
# the veil: from under the brim over the face and down to the chest, torn into strips; the eyes look out through it
add(name="veil", kind="ring", y=[22, 40], rx=[7.2, 0.5], rz=[7.2, 0.32], cz=0.6, thickness=1.6,
    hem={"tongues": 11, "depth": 14, "seed": 5}, holes={"p": 0.1, "band": 14, "seed": 2}, material="veil", part="veil",
    bump={"folds": [0.5, 7, 1.6]},
    rules=[{"every_angle": [7, 0], "t": -1}, {"hem_band": [0, 2], "t": -2},
           {"z": [5.0, None], "y": [27.4, 29.6], "x": [CX - 3.6, CX - 1.4], "material": "eye"},
           {"z": [5.0, None], "y": [27.4, 29.6], "x": [CX + 1.4, CX + 3.6], "material": "eye"},
           {"z": [5.0, None], "y": [26.6, 30.4], "x": [CX - 4.4, CX + 4.4], "t": -3}])
add(name="veil_back", kind="ring", y=[23, 58], rx=[7.2, 0.1], rz=[7.2, 0.1], cz=-0.6, thickness=1.6, keep={"back_strip": 1.6},
    hem={"tongues": 7, "depth": 14, "seed": 9}, material="veil", part="veil", rules=[{"every_angle": [6, 1], "t": -1}, {"hem_band": [0, 2], "t": -2}])
for sg in (-1, 1):   # the horns coming in: two hard bumps under the cloth at the brow
    add(name=f"horn{'L' if sg > 0 else 'R'}", kind="ellipsoid", centre=[CX + sg * 2.8, 24.2, 4.6], radii=[1.2, 1.0, 1.0], material="veil", bone="head",
        rules=[{"t": 1}])
add(name="neck", kind="capsule", a=[CX, 39.0, -0.6], b=[CX, 33.0, 0.3], r=[4.0, 3.6], material="veil", bone="neck")

# ================================================================ the body: robe, plates, ropes
add(name="chest", kind="ellipsoid", centre=[CX, 50.0, 0.0], radii=[12.0, 11.0, 8.4], material="robe", bone="spine.003",
    rules=[{"every_x": [4, 0], "t": -1}])
add(name="waist", kind="capsule", a=[CX, 58.0, -0.2], b=[CX, 72.0, -1.6], r=[8.2, 9.4], material="robe", bone="spine.001")
# the rope: coiled round and round the chest (seven turns, slanting), and twice round the waist as a belt
for k in range(5):
    y = 43.0 + k * 3.2
    rx = 10.0 + 0.4 * math.sin(k * 1.3)
    add(name=f"coil{k}", kind="ring", y=[y, y + 1.8], rx=[rx + 2.2, 0.0], rz=[9.0 - 0.1 * k, 0.0], cz=0.4, thickness=1.8, material="rope",
        bone="spine.003" if k < 4 else "spine.002", rules=[{"every_angle": [20, k % 2], "t": -1}, {"every_angle": [40, k], "t": 1}])
for sg in (-1, 1):   # two lengths crossing over the chest from the shoulders
    add(name=f"cross{'L' if sg > 0 else 'R'}", kind="capsule", a=[CX + sg * 9.0, 41.0, 6.4], b=[CX - sg * 7.0, 60.0, 9.0], r=1.2, material="rope",
        bone="spine.003", rules=[{"every_y": [2, 0], "t": -1}])
add(name="coil_knot", kind="ellipsoid", centre=[CX - 3.0, 52.0, 8.4], radii=[2.4, 2.2, 1.6], material="rope", bone="spine.003")
for k in range(2):
    add(name=f"belt{k}", kind="ring", y=[68.0 + k * 2.6, 70.4 + k * 2.6], rx=[10.2, 0.0], rz=[9.0, 0.0], thickness=1.8, material="rope", bone="hips",
        rules=[{"every_angle": [22, k], "t": -1}])
add(name="belt_knot", kind="ellipsoid", centre=[CX + 2.0, 70.6, 9.6], radii=[2.6, 2.4, 1.8], material="rope", bone="hips")
# the robe: long, layered, tattered to the ground; an over-layer shorter and torn deeper
add(name="robe", kind="ring", y=[66, 128], rx=[10.6, 0.14], rz=[9.4, 0.11], thickness=1.6, hem={"tongues": 17, "depth": 11, "seed": 3},
    holes={"p": 0.05, "band": 14, "seed": 4}, material="robe", part="robe", bump={"folds": [0.6, 11, 2.0]},
    rules=[{"every_angle": [8, 0], "t": -1}, {"hem_band": [0, 3], "t": -2}])
add(name="robe_over", kind="ring", y=[64, 112], rx=[11.6, 0.14], rz=[10.2, 0.1], cz=-0.4, thickness=1.6, hem={"tongues": 12, "depth": 16, "seed": 8},
    holes={"p": 0.07, "band": 18, "seed": 6}, open={"angle": 0.35, "below": 74}, material="robe", part="robe_over", bump={"folds": [0.7, 9, 2.4]},
    rules=[{"every_angle": [9, 1], "t": -1}, {"hem_band": [0, 2], "t": -2}])
# the armoured apron down the front: one curved plate wrapping the front of the robe in three lames, split down the
# middle into two panels, laced
for j in range(3):
    y0 = 73.0 + j * 11.0
    add(name=f"apron{j}", kind="ring", y=[y0, y0 + 11.6], rx=[12.4 + j * 1.4, 0.06], rz=[11.2 + j * 1.3, 0.06], cz=0.6, thickness=1.6,
        keep={"front": 0.78}, material="plate", part="apron",
        rules=[{"x": [CX - 0.8, CX + 0.8], "material": "void"}, {"dy": [4.6, None], "t": 1}, {"dy": [None, -4.6], "t": -2},
               {"every_angle": [36, 1], "dy": [-1.2, -0.4], "material": "lace"}, {"hash": [0.05, 3, j], "t": -2}])

# ================================================================ the paper streamers: zig-zag strips from the belt
for k, dx in enumerate((-5.5, -2.0, 3.4)):
    x0 = CX + dx
    for j in range(5):
        y0 = 72.0 + j * 4.2
        xo = (1.2 if j % 2 else -1.2)
        add(name=f"paper{k}_{j}", kind="box", centre=[x0 + xo, y0 + 2.0, 10.6 - 0.1 * j], half=[1.2, 2.0, 0.3], round=0.2,
            material="paper", part="robe_over", rules=[{"dy": [1.2, None], "t": -1}])

# ================================================================ the breath-jars, sealed with paper: three at the hips, three on the back
def jar(name, x, y, z, r, bone):
    add(name=name, kind="ellipsoid", centre=[x, y, z], radii=[r, r * 1.1, r], material="clay", bone=bone,
        rules=[{"hash": [0.12, 2, int(x)], "t": -1}, {"dy": [None, -r * 0.45], "t": 1}])
    add(name=name + "_neck", kind="capsule", a=[x, y - r * 0.9, z], b=[x, y - r * 1.35, z], r=[r * 0.45, r * 0.4], material="clay", bone=bone)
    add(name=name + "_seal", kind="ellipsoid", centre=[x, y - r * 1.4, z], radii=[r * 0.55, r * 0.22, r * 0.55], material="paper", bone=bone)
    add(name=name + "_tie", kind="ring", y=[y - r * 1.1, y - r * 0.95], rx=[r * 0.5, 0.0], rz=[r * 0.5, 0.0], cz=z - 0.0 if False else z,
        thickness=0.6, material="rope", bone=bone) if False else None
    add(name=name + "_script", kind="ellipsoid", centre=[x, y + r * 0.1, z + (r * 0.92 if z >= 0 else -r * 0.92)], radii=[r * 0.45, r * 0.5, 0.25],
        material="clay", bone=bone, rules=[{"every_y": [2, 0], "t": -3}, {"every_x": [3, 1], "t": -2}])

jar("jar_hip0", CX - 12.0, 78.0, 6.0, 5.0, "hips")
jar("jar_hip1", CX - 6.4, 82.6, 10.0, 4.4, "hips")
jar("jar_hip2", CX + 12.4, 79.0, 5.6, 4.6, "hips")
jar("jar_back0", CX - 5.0, 52.0, -10.4, 4.6, "spine.003")
jar("jar_back1", CX + 4.6, 56.0, -10.6, 4.0, "spine.003")
jar("jar_back2", CX + 0.0, 63.6, -10.4, 4.8, "spine.002")

# ================================================================ the arms: lamellar shoulders, plated forearms, clawed gloves
for s, sg in (("L", 1), ("R", -1)):
    X = K.mirror(CX, sg)
    for j in range(3):
        add(name=f"shoulder{j}.{s}", kind="box", centre=[X(87.0 + j * 0.8), 44.0 + j * 4.4, -0.2 - j * 0.4], half=[6.4, 2.8, 7.4 - j * 0.4], round=1.0,
            material="plate", bone=f"upper_arm.{s}",
            rules=[{"dy": [1.6, None], "t": 1}, {"dy": [None, -1.6], "t": -2}, {"every_x": [2, j % 2], "dy": [-0.4, 0.4], "material": "lace"}])
    add(name=f"upper_arm.{s}", kind="capsule", a=[X(88.0), 44.0, -4.4], b=[X(91.9), 60.5, -4.8], r=[4.8, 4.4], material="robe", bone=f"upper_arm.{s}",
        rules=[{"every_y": [3, 0], "t": -1}])
    add(name=f"forearm.{s}", kind="capsule", a=[X(91.9), 60.5, -4.8], b=[X(95.7), 77.0, -0.9], r=[4.6, 3.8], material="plate", bone=f"forearm.{s}",
        rules=[{"every_y": [3, 0], "t": -2}, {"every_y": [3, 1], "t": 1}, {"hash": [0.05, 3, 4], "t": -2}])
    add(name=f"wrist_wrap.{s}", kind="capsule", a=[X(95.4), 75.6, -1.2], b=[X(95.9), 79.0, -0.6], r=[4.0, 3.8], material="wrap", bone=f"forearm.{s}",
        rules=[{"every_y": [1, 0], "t": -1}])
    add(name=f"glove.{s}", kind="ellipsoid", centre=[X(96.4), 82.0, 0.0], radii=[3.2, 3.8, 2.6], material="glove", bone=f"hand.{s}")
    for k, dx in enumerate((-1.6, -0.5, 0.6, 1.7)):
        add(name=f"finger{k}.{s}", kind="capsule", a=[X(96.4 + dx), 84.0, 0.4], b=[X(96.6 + dx * 1.25), 88.4, 1.4], r=[0.75, 0.5], material="glove",
            bone=f"hand.{s}")
        add(name=f"claw{k}.{s}", kind="capsule", a=[X(96.6 + dx * 1.25), 88.4, 1.4], b=[X(96.8 + dx * 1.35), 91.4, 3.0], r=[0.5, 0.12], material="claw",
            bone=f"hand.{s}", rules=[{"t": 1}])
    # legs: wrapped shins, straw sandals (the robe hides the rest)
    add(name=f"thigh.{s}", kind="capsule", a=[X(81.0), 76.8, 0.1], b=[X(81.0), 103.9, -0.1], r=[5.0, 4.2], material="robe", bone=f"thigh.{s}")
    add(name=f"shin.{s}", kind="capsule", a=[X(81.0), 103.9, -0.1], b=[X(81.0), 132.0, -2.2], r=[3.4, 2.8], material="wrap", bone=f"shin.{s}",
        rules=[{"every_y": [2, 0], "t": -1}])
    add(name=f"foot.{s}", kind="box", centre=[X(81.0), 136.6, 3.0], half=[3.2, 2.2, 5.8], round=1.4, material="wrap", bone=f"foot.{s}",
        rules=[{"every_z": [2, 0], "t": -1}])
    add(name=f"sandal.{s}", kind="box", centre=[X(81.0), 138.9, 3.4], half=[3.6, 0.7, 6.4], round=0.4, material="straw", bone=f"foot.{s}")

S = [x for x in S if x]
spec = {
    "name": "keeper_hd",
    "about": "The Shrine Keeper, drawn by hand from Derek's sheets: a wide straw rain-hat, a tattered lilac veil with violet eyes, dark "
             "plum lamellar plates, rope coiled round chest and waist, sealed clay breath-jars at the hips and back, zig-zag paper "
             "streamers, a long tattered violet robe, clawed gloves, wrapped feet in straw sandals.",
    "mode": "solid", "size": [150, 145], "height": 120, "ground": 140, "axis": [CX, 0],
    "view": {"elevation": 12, "contrast": 1.35, "light": [-0.78, -0.62, 0.24]}, "outline": "#040306",
    "skeleton": {"height": 120, "ground": 140, "cx": CX},
    "materials": M,
    "parts": {
        "veil": {"bone": "head", "lag": {"frames": 1, "sway": 0.6}, "hang": 0.5},
        "robe": {"bone": "hips", "lag": {"frames": 2, "sway": 0.7}, "hang": 0.3},
        "robe_over": {"bone": "spine.001", "lag": {"frames": 2, "sway": 0.9}, "hang": 0.35},
        "apron": {"bone": "hips", "lag": {"frames": 1, "sway": 0.4}, "hang": 0.45},
    },
    "shapes": S,
    "clips": {},
    "effects": [],
    "shadow": {"radii": [22, 4.6], "colour": "#4b4a4f"},
}
json.dump(spec, open(OUT, "w"), indent=1)
print("wrote", OUT, len(S), "shapes")
try:
    from pixelforge import shape_detail, shapes as PS
    r = shape_detail.stock(PS.load_shapes(OUT), replace=True)
    print("stock detail for", r["count"], "parts")
except Exception as e:   # noqa: BLE001
    print("detail layer not made:", e)
