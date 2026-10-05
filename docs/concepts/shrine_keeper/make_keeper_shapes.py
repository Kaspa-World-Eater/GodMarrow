"""Write assets/shapes/characters/keeper_hd.shapes.json: the Shrine Keeper, second design (2026-10-05, Derek: "too
purple, not ninja enough... nuance, not just purple on purple. Straw hat, white veil with purple stains. The dress
should be samurai armor. Gourds. Paper talismans.").

Purple is now an accent only: the stains on the veil, the lacing of the armour, the eyes, the stain at the hem.
- a wide rain-hat of black lacquered straw with a pointed crown, a blade-bright silver edge and a violet tassel on top;
- a white veil stained violet over the front of the face from under the eyes to the chin, tied at the sides; blank white eyes
  in the band of face above it; black hair white at the roots, two locks framing the face, a long braid down the back with paper
  talismans tied into it (Derek 2026-10-05);
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
    "veil":    {"ramp": ["#242027", "#38333c", "#4f4952", "#67616a", "#7f7982", "#97919a", "#aea8af", "#c1bbc0", "#d1ccce"],
                "texture": "weave", "texture_strength": 0.5},
    "hatblk":  {"ramp": ["#030304", "#070709", "#0c0c0f", "#121216", "#19191e", "#212127", "#2b2b33", "#383843", "#6c6c80"],
                "texture": "weave", "texture_strength": 0.35, "rim_edge": True},                    # black lacquered straw
    "silver":  {"ramp": ["#2a2c33", "#474a54", "#6a6e7a", "#9196a2", "#b8bdc7", "#dde1e8", "#ffffff"], "spec": True, "spec_t": 0.75},
    "eyew":    {"ramp": ["#8e8a8c", "#b9b5b5", "#dcd8d6", "#f4f1ee"]},                             # blank white eyes, no glow
    "skin":    {"ramp": ["#2a1e1c", "#43302c", "#5e453e", "#7a5c52", "#957467", "#ad8b7c"]},
    "hair":    {"ramp": ["#040305", "#0a090c", "#121116", "#1b1a21", "#25242d", "#31303b", "#41414f", "#5a5b6e", "#7c7e94"], "texture": "weave",
                "texture_strength": 0.6},                                                        # black, a cold sheen
    "hairw":   {"ramp": ["#3c3a40", "#5e5b62", "#827e85", "#a6a1a7", "#c9c4c8"]},                  # white at the roots
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
    "void":    {"ramp": ["#020103", "#050307", "#09060c"]},
}

S = []
def add(**k): S.append(k)

# ================================================================ the head: straw hat, white veil stained violet, the mask, the eyes
add(name="head", kind="ellipsoid", centre=[CX, 28.0, 0.6], radii=[5.4, 6.8, 5.6], material="mask", bone="head",
    rules=[{"z": [4.0, None], "y": [28.0, 31.6], "x": [CX - 4.4, CX + 4.4], "material": "skin"},      # the band of face the cloth leaves
           {"z": [4.4, None], "y": [29.2, 30.8], "x": [CX - 3.4, CX - 1.2], "material": "eyew"},        # the eyes, blank white (later rules
           {"z": [4.4, None], "y": [29.2, 30.8], "x": [CX + 1.2, CX + 3.4], "material": "eyew"}])       #  win; Derek 2026-10-05)
add(name="hat", kind="ellipsoid", centre=[CX, 20.4, 0.4], radii=[19.0, 1.3, 18.0], material="hatblk", bone="head",
    rules=[{"dy": [0.3, None], "t": -3}, {"hash": [0.05, 2, 3], "t": -1}])
add(name="hat_crown", kind="capsule", a=[CX, 19.8, 0.4], b=[CX, 14.6, 0.2], r=[6.4, 1.0], material="hatblk", bone="head",
    rules=[{"hash": [0.05, 2, 4], "t": -1}])
# the brim's edge: a thin band of bright steel all the way round, sharp as a blade (Derek 2026-10-05)
add(name="hat_edge", kind="ring", y=[20.0, 20.9], rx=[19.3, 0.0], rz=[18.3, 0.0], cz=0.4, thickness=0.9, material="silver", bone="head",
    rules=[{"every_angle": [48, 0], "t": 1}])
# the tassel on top: a knot at the crown's tip and violet strands falling over one side
add(name="tassel_knot", kind="ellipsoid", centre=[CX, 14.0, 0.2], radii=[1.4, 1.2, 1.4], material="violet", bone="head")
for k, (dx, dz, ln) in enumerate(((2.4, 0.6, 6.0), (3.0, -0.6, 5.2), (1.8, 1.4, 5.6), (2.8, -1.6, 4.6), (2.0, -0.2, 6.6))):
    add(name=f"tassel{k}", kind="capsule", a=[CX + 0.6, 14.2, 0.2 + dz * 0.3], b=[CX + dx + 1.6, 14.2 + ln * 0.55, 0.2 + dz], r=[0.6, 0.3],
        material="violet", part="hair")
add(name="hat_cord", kind="capsule", a=[CX - 5.0, 23.2, 2.0], b=[CX - 4.2, 34.0, 4.0], r=0.45, material="rope", bone="head")
# the veil: over the front of the face only, from just under the eyes to the chin, white stained violet, close to the
# face and tied at the sides (Derek 2026-10-05: "only the front of her face, not all the way around"; ending at the chin
# so it never reads as a beard)
add(name="veil", kind="ring", y=[31.4, 37.4], rx=[6.0, 0.12], rz=[6.2, 0.1], cz=0.8, thickness=1.0, keep={"front": 1.15},
    hem={"tongues": 5, "depth": 2.6, "seed": 5}, material="veil", part="veil",
    rules=[{"every_angle": [10, 0], "t": -1}, {"hem_band": [0, 1.2], "t": -2},
           {"hash": [0.2, 2, 7], "y": [33.0, None], "material": "violet"}, {"hash": [0.05, 2, 11], "material": "violet"}])
for sg in (-1, 1):   # the ties at the sides, running back under the hair
    add(name=f"veil_tie{'L' if sg > 0 else 'R'}", kind="capsule", a=[CX + sg * 5.6, 31.0, 1.4], b=[CX + sg * 5.0, 30.6, -3.6], r=0.5,
        material="veil", bone="head")
# the hair: black, white at the roots, falling from under the hat; tied low at the nape with a cord, the tail hanging
# below the veil; two locks framing the face
add(name="hair_back", kind="capsule", a=[CX, 24.0, -3.8], b=[CX, 36.0, -6.4], r=[6.0, 3.6], material="hair", part="hair",
    rules=[{"y": [None, 25.6], "material": "hairw"}, {"every_x": [1, 0], "t": -1}])
add(name="hair_tie", kind="ellipsoid", centre=[CX, 37.0, -8.6], radii=[2.6, 1.4, 2.2], material="rope", part="hair")
# the braid: long, down the back past the waist, its plaits drawn as lobes leaning left and right in turn; paper
# talismans tied into it at three places, a cord at the tip and a last talisman hanging from it
BR = 15
for k in range(BR):
    t = k / (BR - 1)
    y = 39.0 + t * 58.0
    z = -10.6 - t * 5.4
    r = 3.0 - 1.2 * t
    lean = 0.9 * (1 if k % 2 else -1) * (1 - 0.4 * t)
    add(name=f"braid{k}", kind="ellipsoid", centre=[CX + 0.6 * t + lean, y, z], radii=[r, 2.6, r * 0.9], material="hair", part="hair_tail",
        rules=[{"dy": [None, -1.2], "t": 1}, {"every_x": [1, k % 2], "t": -1}])
add(name="braid_cord", kind="ellipsoid", centre=[CX + 0.6, 98.6, -16.2], radii=[1.6, 1.0, 1.4], material="rope", part="hair_tail")
add(name="braid_end", kind="capsule", a=[CX + 0.6, 99.4, -16.2], b=[CX + 0.9, 105.0, -16.8], r=[1.2, 0.3], material="hair", part="hair_tail")
for k, (y, h) in enumerate(((52.0, 6.4), (68.0, 7.2), (84.0, 6.0), (100.4, 8.0))):
    t = (y - 39.0) / 58.0
    x = CX + 0.6 * t
    z = -10.6 - t * 5.4 - 2.4
    add(name=f"braid_tie{k}", kind="ellipsoid", centre=[x, y, z + 2.0], radii=[2.2, 0.8, 1.9], material="rope", part="hair_tail")
    add(name=f"braid_tal{k}", kind="box", centre=[x + (2.2 if k % 2 else -2.2), y + h / 2.0 + 0.6, z - 0.6], half=[2.2, h / 2.0 + 1.0, 0.25], round=0.15,
        material="paper", part="hair_tail",
        rules=[{"x": [x - 0.4 + (1.6 if k % 2 else -1.6), x + 0.4 + (1.6 if k % 2 else -1.6)], "every_y": [2, 1], "material": "ink"},
               {"dy": [h / 2.0 - 1.4, h / 2.0 - 0.3], "material": "seal"}])
for sg in (-1, 1):
    add(name=f"lock{'L' if sg > 0 else 'R'}", kind="capsule", a=[CX + sg * 4.8, 24.0, 3.6], b=[CX + sg * 5.6, 41.0, 5.6], r=[1.8, 0.6],
        material="hair", part="hair", rules=[{"y": [None, 25.4], "material": "hairw"}, {"every_x": [1, 0], "t": -1}])
for sg in (-1, 1):   # the horns coming in: two hard bumps under the cloth at the brow
    add(name=f"horn{'L' if sg > 0 else 'R'}", kind="ellipsoid", centre=[CX + sg * 2.6, 24.0, 4.4], radii=[1.1, 1.0, 1.0], material="mask", bone="head")
add(name="neck", kind="capsule", a=[CX, 39.0, -0.6], b=[CX, 33.0, 0.3], r=[3.8, 3.4], material="mask", bone="neck")

# ================================================================ the armour: laced breastplate, shoulder plates, skirt of plates
add(name="do", kind="ellipsoid", centre=[CX, 51.0, 0.4], radii=[11.4, 11.6, 8.2], material="lacquer", bone="spine.003",
    rules=[{"every_y": [3, 0], "t": -3},                                   # the seams between the lames
           {"every_y": [3, 1], "every_x": [2, 0], "material": "lace"},     # the lacing threaded through each lame
           {"every_y": [6, 2], "material": "silver", "t": -1}])            # a silver edge on every other lame
# her bust under the plate: the cuirass shaped over it, the two forms meeting at a V of bare skin at the neckline
for sg in (-1, 1):
    add(name=f"bust{'L' if sg > 0 else 'R'}", kind="ellipsoid", centre=[CX + sg * 4.0, 49.6, 6.2], radii=[4.6, 4.2, 3.6], material="lacquer",
        bone="spine.003", rules=[{"every_y": [3, 0], "t": -3}, {"every_y": [3, 1], "every_x": [2, 0], "material": "lace"},
                                 {"dy": [None, -1.6], "material": "silver", "t": -1}])
add(name="cleavage", kind="capsule", a=[CX, 41.8, 7.4], b=[CX, 47.4, 9.0], r=[2.2, 0.5], material="skin", bone="spine.003",
    rules=[{"x": [CX - 0.4, CX + 0.4], "y": [44.0, None], "t": -2}])
for sg in (-1, 1):   # the plate's neckline, a bright silver edge running down to the V
    add(name=f"neckline{'L' if sg > 0 else 'R'}", kind="capsule", a=[CX + sg * 5.6, 41.0, 6.0], b=[CX + sg * 0.6, 48.4, 9.4], r=0.45,
        material="silver", bone="spine.003")
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
def talisman(name, x, y, z, h, owner, on_bone=False, side=False):
    kw = {"bone": owner} if on_bone else {"part": owner}
    half = [0.25, h / 2.0, 2.0] if side else [2.2, h / 2.0, 0.25]
    add(name=name, kind="box", centre=[x, y + h / 2.0, z], half=half, round=0.15, material="paper",
        rules=[({"z": [z - 0.4, z + 0.4]} if side else {"x": [x - 0.4, x + 0.4]}) | {"every_y": [2, 1], "material": "ink"},   # the script
               {"dy": [h / 2.0 - 1.6, h / 2.0 - 0.4], "material": "seal"},                     # the red seal at its foot
               {"dy": [None, -h / 2.0 + 0.6], "t": -2}], **kw)

talisman("tal_belt0", CX + 4.4, 73.0, 11.6, 11.0, "skirt")
talisman("tal_belt1", CX + 7.6, 72.6, 11.0, 8.6, "skirt")
talisman("tal_chest", CX - 8.2, 47.0, 8.0, 8.0, "spine.003", True)
talisman("tal_back", CX + 0.0, 50.0, -9.2, 9.0, "spine.003", True)
for k, dx in enumerate((-6.6, -0.6)):               # zig-zag paper from the belt
    for j in range(4):
        add(name=f"shide{k}_{j}", kind="box", centre=[CX + dx + (1.0 if j % 2 else -1.0), 73.0 + j * 3.4, 11.4], half=[1.1, 1.7, 0.25],
            round=0.15, material="paper", part="skirt", rules=[{"dy": [1.0, None], "t": -1}])

# ================================================================ the bandolier: a leather strap from the right shoulder across
# the chest to the left hip, small gourds and lidded urns hung along it
add(name="bandolier", kind="capsule", a=[CX - 10.6, 41.0, 6.4], b=[CX + 10.8, 67.0, 8.6], r=1.3, material="rope", bone="spine.002",
    rules=[{"every_y": [3, 0], "t": -1}])
def urn(name, x, y, z, r):
    add(name=name, kind="ellipsoid", centre=[x, y, z], radii=[r, r * 1.15, r * 0.9], material="gourd", bone="spine.002",
        rules=[{"dy": [None, -r * 0.4], "t": 1}, {"dy": [-0.3, 0.3], "material": "silver", "t": -2}])
    add(name=name + "_lid", kind="ellipsoid", centre=[x, y - r * 1.15, z], radii=[r * 0.6, r * 0.3, r * 0.6], material="silver", bone="spine.002")
for k, t in enumerate((0.18, 0.4, 0.62, 0.84)):
    x = CX - 10.6 + 21.4 * t; y = 41.0 + 26.0 * t; z = 6.4 + 2.2 * t + 1.8
    if k % 2:
        urn(f"urn{k}", x, y + 3.4, z + 0.6, 2.6)
    else:
        add(name=f"bgourd{k}_top", kind="ellipsoid", centre=[x, y + 1.8, z + 0.6], radii=[1.6, 1.6, 1.4], material="gourd", bone="spine.002")
        add(name=f"bgourd{k}", kind="ellipsoid", centre=[x, y + 5.0, z + 0.6], radii=[2.5, 2.6, 2.2], material="gourd", bone="spine.002",
            rules=[{"dy": [None, -0.6], "t": 1}])

# ================================================================ the arms: big hanging shoulder plates, armoured sleeves, clawed gauntlets
for s, sg in (("L", 1), ("R", -1)):
    X = K.mirror(CX, sg)
    for j in range(4):                               # a big flat shoulder plate hanging in four laced lames
        add(name=f"sode{j}.{s}", kind="box", centre=[X(90.6 + j * 1.1), 44.6 + j * 3.6, -0.4], half=[3.6, 2.0, 7.4], round=0.6,
            material="lacquer", bone=f"upper_arm.{s}",
            rules=[{"dy": [1.0, None], "t": 1}, {"dy": [None, -1.2], "t": -3}, {"dy": [-0.4, 0.4], "every_z": [2, j % 2], "material": "lace"}])
    add(name=f"sode_cord.{s}", kind="capsule", a=[X(88.6), 43.0, 6.6], b=[X(89.4), 57.0, 7.0], r=0.5, material="violet", bone=f"upper_arm.{s}")
    # the shoulder's detail: a curved lacquered cap over the lames with a bright steel rim and studs, silk tassels at the
    # lower corners, a round steel crest-plate on its face, and paper talismans pasted over it
    add(name=f"sode_cap.{s}", kind="ellipsoid", centre=[X(89.4), 43.2, -0.4], radii=[5.4, 2.6, 8.0], material="lacquer", bone=f"upper_arm.{s}",
        rules=[{"dy": [None, -1.2], "t": 1}, {"dy": [0.9, None], "material": "silver"},
               {"dy": [-0.2, 0.6], "every_z": [3, 1], "rivet": True, "px": [150, None]}])
    for j in range(4):
        add(name=f"sode_rim{j}.{s}", kind="box", centre=[X(90.6 + j * 1.1 + 3.4), 46.3 + j * 3.6, -0.4], half=[0.3, 0.5, 7.5], round=0.15,
            material="silver", bone=f"upper_arm.{s}", rules=[{"t": -2}, {"every_z": [3, j % 2], "t": -1}])
    add(name=f"sode_crest.{s}", kind="ellipsoid", centre=[X(93.6), 50.0, 6.8], radii=[0.6, 2.2, 2.2], material="silver", bone=f"upper_arm.{s}",
        rules=[{"near": [[[None, 50.0, 6.8], [None, 50.0, 6.8]], 1.0], "material": "violet"}])
    for k, dz in enumerate((-5.6, 5.6)):
        add(name=f"sode_tassel{k}.{s}", kind="capsule", a=[X(94.4), 58.0, dz], b=[X(94.8), 64.0, dz + 0.4], r=[0.7, 0.4], material="violet",
            part="hair")
    talisman(f"tal_sode0.{s}", X(94.9), 45.4, -2.4, 9.0, f"upper_arm.{s}", True, True)
    talisman(f"tal_sode1.{s}", X(94.7), 47.0, 2.6, 7.0, f"upper_arm.{s}", True, True)
    talisman(f"tal_sodef.{s}", X(91.4), 44.6, 7.6, 8.0, f"upper_arm.{s}", True)     # one on the plate's front face
    add(name=f"upper_arm.{s}", kind="capsule", a=[X(88.0), 44.0, -4.4], b=[X(91.9), 60.5, -4.8], r=[4.4, 4.0], material="cloth", bone=f"upper_arm.{s}",
        rules=[{"every_y": [3, 0], "t": -1}])
    add(name=f"kote.{s}", kind="capsule", a=[X(91.9), 60.5, -4.8], b=[X(95.7), 77.0, -0.9], r=[4.2, 3.6], material="lacquer", bone=f"forearm.{s}",
        rules=[{"every_y": [3, 0], "t": -3}, {"x": [X(93.8) - 0.6, X(93.8) + 0.6], "z": [1.0, None], "material": "silver", "t": -1}])
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
        rules=[{"every_x": [2, 0], "every_y": [2, 0], "t": -2}, {"dy": [5.2, None], "material": "silver", "t": -1}])
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
        "hair": {"bone": "head", "lag": {"frames": 1, "sway": 0.5}, "hang": 0.6},
        "hair_tail": {"bone": "spine.003", "lag": {"frames": 2, "sway": 1.0}, "hang": 0.25},
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
