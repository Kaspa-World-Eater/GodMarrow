"""Write assets/shapes/characters/keeper_hd.shapes.json: the Shrine Keeper, second design (2026-10-05, Derek: "too
purple, not ninja enough... nuance, not just purple on purple. Straw hat, white veil with purple stains. The dress
should be samurai armor. Gourds. Paper talismans.").

Purple is now an accent only: the stains on the veil, the lacing of the armour, the eyes, the stain at the hem.
- a wide straw rain-hat, warm tan, with a pointed crown;
- a white veil from under the brim, stained violet, over a black ninja face-cloth; only the violet eyes show;
- samurai armour in black lacquer laced with indigo: a laced breastplate in lames, big hanging shoulder plates, a
  skirt of plate panels over the hips, thigh guards, armoured sleeves, gauntlets with claws;
- ninja beneath: close dark trousers bound at the shins, split-toe foot wraps;
- a rope belt with its knot; two-bulb gourds of warm lacquered brown hanging from cords at the hips;
- paper talismans (cream, black ink, a red seal) hanging from the belt and pasted on the armour; zig-zag paper.
The quiet things stay: the horns pressing up under the veil at the brow; the violet climbing from the hem.

Run from tools/pixelforge with the Forge's Python: python ../../docs/concepts/shrine_keeper/make_keeper_shapes.py
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PF = os.path.normpath(os.path.join(HERE, "..", "..", "..", "tools", "pixelforge"))
if PF not in sys.path:
    sys.path.insert(0, PF)
from pixelforge import shape_parts as K   # noqa: E402

CX = 75.0
OUT = os.path.join(PF, "assets", "shapes", "characters", "keeper_hd.shapes.json")

M = {
    # black lacquer: blue-black shadows, a cool grey lustre, the rim a cold lilac
    "lacquer": {"ramp": ["#040406", "#08080b", "#0d0d12", "#131319", "#1a1a22", "#22222c", "#2c2c38", "#383846", "#4a4a5a", "#8a86a6"],
                "spec": True, "spec_t": 0.82, "rim_edge": True},
    "lace":    {"ramp": ["#0d0a1c", "#17122e", "#221a42", "#2e2456", "#3c2f6c", "#4d3d84"]},          # indigo lacing
    "violet":  {"ramp": ["#1a1020", "#271830", "#352242", "#442d52", "#553a64"]},                    # the accents
    "straw":   {"ramp": ["#0c0906", "#140f0a", "#1d160e", "#271d13", "#312518", "#3c2e1e", "#473724", "#53402a", "#604a31", "#9e875e"],
                "texture": "weave", "texture_strength": 0.6, "rim_edge": True},
    "veil":    {"ramp": ["#2a2630", "#423d48", "#5d5862", "#79747e", "#958f98", "#b0aab1", "#c8c2c7", "#dcd7da", "#ece8e9"],
                "texture": "weave", "texture_strength": 0.5},
    "mask":    {"ramp": ["#050506", "#0a0a0c", "#111114", "#18181c"], "texture": "weave", "texture_strength": 0.4},
    "cloth":   {"ramp": ["#07070b", "#0c0c12", "#12121a", "#191924", "#21212e", "#2a2a3a", "#343447", "#3f3f55", "#6e6e8c"],
                "texture": "weave", "texture_strength": 0.5, "rim_edge": True},                    # dark grey-indigo trousers
    "wrap":    {"ramp": ["#1a1a1e", "#29292e", "#3b3b41", "#4e4e55", "#62626a", "#77777f"], "texture": "weave", "texture_strength": 0.5},
    "rope":    {"ramp": ["#1a120a", "#2a1d10", "#3c2a17", "#4f381f", "#634628", "#795632", "#90683d"], "texture": "weave", "texture_strength": 0.6},
    "gourd":   {"ramp": ["#160a06", "#24100a", "#35180e", "#472013", "#5a2a18", "#6e351e", "#834125", "#a2573a"], "spec": True, "spec_t": 0.85},
    "paper":   {"ramp": ["#3e3a33", "#5c574d", "#7c7668", "#9c9584", "#b9b2a0", "#d2cbb8", "#e6e0cf"]},
    "ink":     {"ramp": ["#0a0908", "#141210", "#1e1b18"]},
    "seal":    {"ramp": ["#3a0806", "#5c0f0a", "#80180f", "#a32416"]},
    "claw":    {"ramp": ["#0a0909", "#1a1716", "#2e2a28", "#48423e", "#68605a"]},
    "eye":     {"ramp": ["#3a0d5c", "#6a1fa0", "#a14be0", "#d59bff"], "emissive": True},
    "void":    {"ramp": ["#020103", "#050307", "#09060c"]},
}

S = []
def add(**k): S.append(k)

# ================================================================ the head: straw hat, white veil stained violet, the mask, the eyes
add(name="head", kind="ellipsoid", centre=[CX, 28.0, 0.6], radii=[5.4, 6.8, 5.6], material="mask", bone="head",
    rules=[{"z": [4.0, None], "y": [27.0, 31.2], "x": [CX - 4.2, CX + 4.2], "material": "void"},      # the dark of the eye-slit
           {"z": [4.4, None], "y": [28.0, 30.2], "x": [CX - 3.4, CX - 1.2], "material": "eye"},         # (later rules win)
           {"z": [4.4, None], "y": [28.0, 30.2], "x": [CX + 1.2, CX + 3.4], "material": "eye"}])
add(name="hat", kind="ellipsoid", centre=[CX, 20.4, 0.4], radii=[19.0, 1.3, 18.0], material="straw", bone="head",
    rules=[{"dy": [0.3, None], "t": -3}, {"hash": [0.05, 2, 3], "t": -1}])
add(name="hat_crown", kind="capsule", a=[CX, 19.8, 0.4], b=[CX, 14.6, 0.2], r=[6.4, 1.0], material="straw", bone="head",
    rules=[{"hash": [0.05, 2, 4], "t": -1}])
add(name="hat_cord", kind="capsule", a=[CX - 5.0, 23.2, 2.0], b=[CX - 4.2, 34.0, 4.0], r=0.45, material="rope", bone="head")
# the veil: white cloth falling from the brim at the sides and back, open over the masked face, stained violet
add(name="veil", kind="ring", y=[21.0, 44], rx=[7.0, 0.34], rz=[7.0, 0.26], cz=0.4, thickness=1.4, open={"angle": 0.62, "below": 21.0},
    hem={"tongues": 10, "depth": 10, "seed": 5}, holes={"p": 0.06, "band": 10, "seed": 2}, material="veil", part="veil",
    bump={"folds": [0.5, 8, 1.6]},
    rules=[{"every_angle": [7, 0], "t": -1}, {"hem_band": [0, 2], "t": -2},
           {"hash": [0.22, 2, 7], "y": [36.0, None], "material": "violet"}, {"hash": [0.05, 2, 11], "material": "violet"}])
add(name="veil_front", kind="ring", y=[30.6, 46], rx=[6.0, 0.24], rz=[6.4, 0.2], cz=0.6, thickness=1.2, keep={"front": 0.7},
    hem={"tongues": 5, "depth": 8, "seed": 13}, material="veil", part="veil",
    rules=[{"every_angle": [6, 1], "t": -1}, {"hash": [0.18, 2, 9], "y": [38.0, None], "material": "violet"}])
for sg in (-1, 1):   # the horns coming in: two hard bumps under the cloth at the brow
    add(name=f"horn{'L' if sg > 0 else 'R'}", kind="ellipsoid", centre=[CX + sg * 2.6, 24.0, 4.4], radii=[1.1, 1.0, 1.0], material="mask", bone="head")
add(name="neck", kind="capsule", a=[CX, 39.0, -0.6], b=[CX, 33.0, 0.3], r=[3.8, 3.4], material="mask", bone="neck")

# ================================================================ the armour: laced breastplate, shoulder plates, skirt of plates
add(name="do", kind="ellipsoid", centre=[CX, 51.0, 0.4], radii=[11.4, 11.6, 8.2], material="lacquer", bone="spine.003",
    rules=[{"every_y": [3, 0], "t": -3},                                   # the seams between the lames
           {"every_y": [3, 1], "every_x": [2, 0], "material": "lace"},     # the lacing threaded through each lame
           {"x": [CX - 0.6, CX + 0.6], "z": [6.0, None], "t": 2}])
add(name="do_low", kind="capsule", a=[CX, 60.0, 0.2], b=[CX, 68.0, -0.6], r=[9.6, 9.0], material="lacquer", bone="spine.001",
    rules=[{"every_y": [3, 0], "t": -3}, {"every_y": [3, 1], "every_x": [2, 1], "material": "lace"}])
# the rope belt and its knot
for k in range(2):
    add(name=f"belt{k}", kind="ring", y=[67.6 + k * 2.4, 69.8 + k * 2.4], rx=[10.0, 0.0], rz=[8.8, 0.0], thickness=1.8, material="rope", bone="hips",
        rules=[{"every_angle": [22, k], "t": -1}])
add(name="belt_knot", kind="ellipsoid", centre=[CX - 2.4, 70.2, 9.4], radii=[2.6, 2.2, 1.8], material="rope", bone="hips")
add(name="belt_ends", kind="capsule", a=[CX - 2.6, 71.0, 9.6], b=[CX - 3.6, 80.0, 10.4], r=[0.9, 0.6], material="rope", part="skirt")
# the skirt of plates: panels round the hips to mid-thigh, three lames each, laced, a gap between panels
for j in range(3):
    y0 = 72.0 + j * 5.8
    add(name=f"skirt{j}", kind="ring", y=[y0, y0 + 6.4], rx=[11.2 + j * 1.0, 0.1], rz=[10.0 + j * 0.9, 0.1], cz=0.2, thickness=1.6,
        material="lacquer", part="skirt",
        rules=[{"every_angle": [6, 5], "material": "void"},                # the gaps between the panels
               {"dy": [2.2, None], "t": 1}, {"dy": [None, -2.4], "t": -3},
               {"dy": [-1.2, -0.4], "every_angle": [36, 3], "material": "lace"}])
# a short under-robe hem showing below the plates, stained violet at its edge
add(name="underhem", kind="ring", y=[88, 98], rx=[12.4, 0.06], rz=[11.0, 0.05], thickness=1.2, hem={"tongues": 14, "depth": 5, "seed": 3},
    material="cloth", part="skirt", rules=[{"hem_band": [0, 3], "material": "violet"}, {"every_angle": [9, 0], "t": -1}])

# ================================================================ the gourds: two-bulb, lacquered, hanging from cords at the hips
def gourd(name, x, y, z, r):
    add(name=name + "_cord", kind="capsule", a=[x, y - r * 2.8, z - 0.4], b=[x, y - r * 1.6, z], r=0.35, material="rope", part="skirt")
    add(name=name + "_top", kind="ellipsoid", centre=[x, y - r * 1.15, z], radii=[r * 0.62, r * 0.62, r * 0.62], material="gourd", part="skirt",
        rules=[{"dy": [None, -r * 0.3], "t": 1}])
    add(name=name, kind="ellipsoid", centre=[x, y, z], radii=[r, r * 1.05, r], material="gourd", part="skirt",
        rules=[{"dy": [None, -r * 0.4], "t": 1}, {"hash": [0.06, 2, int(x)], "t": -1}])
    add(name=name + "_stop", kind="capsule", a=[x, y - r * 1.7, z], b=[x, y - r * 2.1, z], r=[r * 0.25, r * 0.2], material="rope", part="skirt")

gourd("gourd0", CX - 13.4, 81.0, 4.4, 4.6)
gourd("gourd1", CX + 13.6, 80.0, 3.6, 4.2)

# ================================================================ the paper: talismans with ink and a red seal, zig-zag streamers
def talisman(name, x, y, z, h, owner, on_bone=False):
    kw = {"bone": owner} if on_bone else {"part": owner}
    add(name=name, kind="box", centre=[x, y + h / 2.0, z], half=[2.2, h / 2.0, 0.25], round=0.15, material="paper",
        rules=[{"x": [x - 0.4, x + 0.4], "every_y": [2, 1], "material": "ink"},               # the brushed column of script
               {"dy": [h / 2.0 - 1.6, h / 2.0 - 0.4], "x": [x - 0.8, x + 0.8], "material": "seal"},   # the red seal at its foot
               {"dy": [None, -h / 2.0 + 0.6], "t": -2}], **kw)

talisman("tal_belt0", CX + 4.4, 73.0, 11.6, 11.0, "skirt")
talisman("tal_belt1", CX + 7.6, 72.6, 11.0, 8.6, "skirt")
talisman("tal_chest", CX - 5.4, 45.0, 9.6, 10.0, "spine.003", True)
talisman("tal_back", CX + 0.0, 50.0, -9.2, 9.0, "spine.003", True)
for k, dx in enumerate((-6.6, -0.6)):               # zig-zag paper from the belt
    for j in range(4):
        add(name=f"shide{k}_{j}", kind="box", centre=[CX + dx + (1.0 if j % 2 else -1.0), 73.0 + j * 3.4, 11.4], half=[1.1, 1.7, 0.25],
            round=0.15, material="paper", part="skirt", rules=[{"dy": [1.0, None], "t": -1}])

# ================================================================ the arms: big hanging shoulder plates, armoured sleeves, clawed gauntlets
for s, sg in (("L", 1), ("R", -1)):
    X = K.mirror(CX, sg)
    for j in range(4):                               # a big flat shoulder plate hanging in four laced lames
        add(name=f"sode{j}.{s}", kind="box", centre=[X(90.6 + j * 1.1), 44.6 + j * 3.6, -0.4], half=[3.6, 2.0, 7.4], round=0.6,
            material="lacquer", bone=f"upper_arm.{s}",
            rules=[{"dy": [1.0, None], "t": 1}, {"dy": [None, -1.2], "t": -3}, {"dy": [-0.4, 0.4], "every_z": [2, j % 2], "material": "lace"}])
    add(name=f"sode_cord.{s}", kind="capsule", a=[X(88.6), 43.0, 6.6], b=[X(89.4), 57.0, 7.0], r=0.5, material="violet", bone=f"upper_arm.{s}")
    add(name=f"upper_arm.{s}", kind="capsule", a=[X(88.0), 44.0, -4.4], b=[X(91.9), 60.5, -4.8], r=[4.4, 4.0], material="cloth", bone=f"upper_arm.{s}",
        rules=[{"every_y": [3, 0], "t": -1}])
    add(name=f"kote.{s}", kind="capsule", a=[X(91.9), 60.5, -4.8], b=[X(95.7), 77.0, -0.9], r=[4.2, 3.6], material="lacquer", bone=f"forearm.{s}",
        rules=[{"every_y": [3, 0], "t": -3}, {"x": [X(93.8) - 0.6, X(93.8) + 0.6], "z": [1.0, None], "t": 2}])
    add(name=f"glove.{s}", kind="ellipsoid", centre=[X(96.4), 81.6, 0.0], radii=[3.0, 3.6, 2.4], material="lacquer", bone=f"hand.{s}")
    for k, dx in enumerate((-1.6, -0.5, 0.6, 1.7)):
        add(name=f"finger{k}.{s}", kind="capsule", a=[X(96.4 + dx), 83.6, 0.4], b=[X(96.6 + dx * 1.25), 88.0, 1.4], r=[0.75, 0.5], material="mask",
            bone=f"hand.{s}")
        add(name=f"claw{k}.{s}", kind="capsule", a=[X(96.6 + dx * 1.25), 88.0, 1.4], b=[X(96.8 + dx * 1.35), 91.0, 3.0], r=[0.5, 0.12], material="claw",
            bone=f"hand.{s}", rules=[{"t": 1}])
    # legs: thigh guards over close trousers, shins bound in wraps, split-toe foot wraps
    add(name=f"thigh.{s}", kind="capsule", a=[X(81.0), 76.8, 0.1], b=[X(81.0), 103.9, -0.1], r=[5.0, 4.4], material="cloth", bone=f"thigh.{s}",
        rules=[{"every_y": [4, 0], "t": -1}])
    add(name=f"haidate.{s}", kind="box", centre=[X(81.4), 96.0, 4.4], half=[4.6, 6.0, 1.0], round=0.8, material="lacquer", bone=f"thigh.{s}",
        rules=[{"every_x": [2, 0], "every_y": [2, 0], "t": -2}, {"dy": [5.0, None], "t": 1}])
    add(name=f"shin.{s}", kind="capsule", a=[X(81.0), 103.9, -0.1], b=[X(81.0), 132.0, -2.2], r=[3.6, 2.8], material="wrap", bone=f"shin.{s}",
        rules=[{"every_y": [2, 0], "t": -1}, {"every_y": [6, 3], "material": "rope"}])
    add(name=f"knee.{s}", kind="ellipsoid", centre=[X(81.0), 104.0, 2.8], radii=[3.8, 3.4, 2.4], material="cloth", bone=f"shin.{s}")
    add(name=f"foot.{s}", kind="box", centre=[X(81.0), 136.6, 3.0], half=[3.0, 2.2, 5.6], round=1.4, material="mask", bone=f"foot.{s}",
        rules=[{"x": [X(81.0) + sg * 0.4 - 0.4, X(81.0) + sg * 0.4 + 0.4], "z": [6.0, None], "material": "void"}])   # the split toe

spec = {
    "name": "keeper_hd",
    "about": "The Shrine Keeper (second design): a straw rain-hat, a white veil stained violet over a black face-cloth and violet "
             "eyes, samurai armour of black lacquer laced in indigo (breastplate, hanging shoulder plates, a skirt of plates, thigh "
             "guards, armoured sleeves, clawed gauntlets), close trousers and bound shins, a rope belt, lacquered gourds, paper "
             "talismans with ink and red seals, zig-zag paper.",
    "mode": "solid", "size": [150, 145], "height": 120, "ground": 140, "axis": [CX, 0],
    "view": {"elevation": 12, "contrast": 1.35, "light": [-0.78, -0.62, 0.24]}, "outline": "#040306",
    "skeleton": {"height": 120, "ground": 140, "cx": CX},
    "materials": M,
    "parts": {
        "veil": {"bone": "head", "lag": {"frames": 1, "sway": 0.6}, "hang": 0.5},
        "skirt": {"bone": "hips", "lag": {"frames": 1, "sway": 0.5}, "hang": 0.4},
    },
    "shapes": S,
    "clips": {},
    "effects": [],
    "shadow": {"radii": [20, 4.4], "colour": "#4b4a4f"},
}
json.dump(spec, open(OUT, "w"), indent=1)
print("wrote", OUT, len(S), "shapes")
try:
    from pixelforge import shape_detail, shapes as PS
    r = shape_detail.stock(PS.load_shapes(OUT), replace=True)
    print("stock detail for", r["count"], "parts")
except Exception as e:   # noqa: BLE001
    print("detail layer not made:", e)
