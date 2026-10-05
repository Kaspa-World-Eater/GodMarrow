"""Write assets/shapes/characters/tithehand.shapes.json: the Tithe-Hand (the game's `hound`). Drawn by hand from the
codex ("Hands the size of a man, walking on their fingers. They come round behind, in threes and fives... When the
fingers spread, bring the spade down flat") and the browser's own sprite, since the Midjourney sheets (mj_*) drew men
with big hands instead: a severed hand as long as a man, palm down and arched, walking on its four fingertips; the
thumb trailing; at the back the wrist cut through, bone showing, wrapped in a bloody tithe-cloth and dripping.

On a short skeleton (height 64): the palm rides the hips, the fingers are the legs (two to each leg, so the walk steps
them in pairs) and the leap is its attack.

Run from tools/pixelforge with the Forge's Python: python ../../docs/concepts/mon_tithehand/make_tithehand_shapes.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
PF = os.path.normpath(os.path.join(HERE, "..", "..", "..", "tools", "pixelforge"))
CX = 69.0
OUT = os.path.join(PF, "assets", "shapes", "characters", "tithehand.shapes.json")

M = {
    "skin":  {"ramp": ["#1c1615", "#2e2523", "#433633", "#5a4a45", "#725f58", "#8b746b", "#a3897e"]},
    "knuck": {"ramp": ["#241c1a", "#3a2e2b", "#54443f", "#6e5b54", "#8a736a"]},
    "nail":  {"ramp": ["#0e0b0b", "#1d1716", "#2f2725", "#463b37"], "spec": True, "spec_t": 0.8},
    "flesh": {"ramp": ["#2a0507", "#45080c", "#640d12", "#83161a", "#a32424"]},
    "bone":  {"ramp": ["#5a5246", "#7b7262", "#9c927f", "#bcb29c", "#d6ccb5"]},
    "cloth": {"ramp": ["#1d0a09", "#30110e", "#471a14", "#5c241b", "#723024"], "texture": "weave", "texture_strength": 0.6},
}

S = []
def add(**k): S.append(k)

# ---- the palm, back up and arched, riding the hips behind the knuckles; tendons on the back of the hand
add(name="palm", kind="ellipsoid", centre=[CX, 94.0, -10.0], radii=[11.0, 5.4, 12.0], material="skin", bone="hips",
    rules=[{"y": [None, 91.0], "every_x": [5, 2], "t": 1}, {"hash": [0.05, 4, 2], "t": -1, "px": [90, None]},
           {"hash": [0.03, 7, 5], "material": "flesh", "px": [90, None]}])
add(name="palm_arch", kind="ellipsoid", centre=[CX, 91.0, -6.0], radii=[9.0, 4.0, 8.0], material="skin", bone="hips")

# ---- the four fingers: the knuckles over the hip joints, each finger arching up and down along its leg to the nail
XS = (-7.6, -2.6, 2.4, 7.4)
for k, dx in enumerate(XS):
    leg = "R" if dx < 0 else "L"
    x = CX + dx
    lean = dx * 0.2                    # the fingers splay a little
    add(name=f"knuckle{k}", kind="ellipsoid", centre=[x, 94.0, 0.5], radii=[2.7, 2.7, 2.7], material="knuck", bone="hips")
    add(name=f"finger{k}_a", kind="capsule", a=[x, 94.0, 0.5], b=[x + lean, 90.0, 5.0], r=[2.9, 2.6], material="skin", bone=f"thigh.{leg}",
        rules=[{"y": [None, 92.0], "t": 1}])
    add(name=f"joint{k}", kind="ellipsoid", centre=[x + lean, 90.0, 5.0], radii=[2.3, 2.3, 2.3], material="knuck", bone=f"thigh.{leg}")
    add(name=f"finger{k}_b", kind="capsule", a=[x + lean, 90.0, 5.0], b=[x + lean * 1.4, 114.8, 3.0], r=[2.6, 2.3], material="skin", bone=f"thigh.{leg}",
        rules=[{"every_y": [7, 3], "t": -1}])
    add(name=f"joint{k}_b", kind="ellipsoid", centre=[x + lean * 1.4, 114.8, 3.0], radii=[1.9, 1.9, 1.9], material="knuck", bone=f"shin.{leg}")
    add(name=f"finger{k}_c", kind="capsule", a=[x + lean * 1.4, 114.8, 3.0], b=[x + lean * 1.6, 131.0, 2.0], r=[2.3, 1.8], material="skin", bone=f"shin.{leg}")
    add(name=f"nail{k}", kind="capsule", a=[x + lean * 1.6, 127.0, 2.6], b=[x + lean * 1.7, 133.0, 3.2], r=[1.5, 0.8], material="nail", bone=f"shin.{leg}")

# ---- the thumb, out from the side of the palm and down
add(name="thumb_a", kind="capsule", a=[CX - 10.0, 95.0, -8.0], b=[CX - 17.0, 99.0, -3.0], r=[3.0, 2.4], material="skin", bone="hips")
add(name="thumb_b", kind="capsule", a=[CX - 17.0, 99.0, -3.0], b=[CX - 19.0, 131.0, -1.0], r=[2.2, 1.6], material="skin", bone="hips")
add(name="thumb_nail", kind="capsule", a=[CX - 19.0, 127.0, -0.6], b=[CX - 19.2, 133.0, 0.0], r=[1.6, 0.9], material="nail", bone="hips")

# ---- the wrist, cut through at the back: the bloody stump, the bone, the tithe-cloth wrapped round
add(name="wrist", kind="capsule", a=[CX, 94.0, -18.0], b=[CX, 92.0, -27.0], r=[7.4, 6.6], material="skin", bone="hips")
add(name="tithecloth", kind="capsule", a=[CX, 93.6, -21.0], b=[CX, 92.6, -25.6], r=[8.0, 7.4], material="cloth", bone="hips",
    rules=[{"every_x": [2, 0], "t": -1}, {"hash": [0.2, 3, 2], "t": 1}])
add(name="cloth_tail", kind="capsule", a=[CX + 5.0, 95.0, -23.0], b=[CX + 8.0, 117.0, -25.0], r=[1.8, 0.8], material="cloth", part="cloth")
add(name="stump", kind="ellipsoid", centre=[CX, 92.0, -27.6], radii=[6.4, 5.8, 1.6], material="flesh", bone="hips",
    rules=[{"hash": [0.2, 2, 1], "t": 1}])
add(name="radius", kind="capsule", a=[CX - 2.4, 91.0, -27.0], b=[CX - 2.8, 88.0, -34.0], r=[1.5, 1.2], material="bone", bone="hips")
add(name="ulna", kind="capsule", a=[CX + 2.6, 93.0, -27.0], b=[CX + 3.0, 91.6, -31.4], r=[1.3, 1.1], material="bone", bone="hips")
for k, (dx, ln) in enumerate(((-3.0, 10.0), (1.0, 16.0), (4.0, 7.0))):
    add(name=f"drip{k}", kind="capsule", a=[CX + dx, 96.0, -28.0], b=[CX + dx, 96.0 + ln, -28.4], r=[0.9, 0.5], material="flesh", part="drip")

spec = {
    "name": "tithehand",
    "about": "The Tithe-Hand (hound): a severed hand as long as a man, palm down and arched, walking on its four fingertips, "
             "the thumb trailing, the wrist cut through at the back with bone showing, wrapped in a bloody tithe-cloth.",
    "mode": "solid", "size": [138, 138], "height": 120, "ground": 134, "axis": [CX, 0],
    "view": {"elevation": 12}, "outline": "#0a0606",
    "skeleton": {"height": 64, "ground": 134, "cx": CX},
    "materials": M,
    "parts": {
        "cloth": {"bone": "hips", "lag": {"frames": 2, "sway": 0.8}, "hang": 0.3},
        "drip": {"bone": "hips", "lag": {"frames": 1, "sway": 0.5}, "hang": 0.2},
    },
    "shapes": S,
    "clips": {"attack": "jump", "punch": "jump"},
    "effects": [],
    "shadow": {"radii": [26, 6.0], "colour": "#4b4a4f"},
}
json.dump(spec, open(OUT, "w"), indent=1)
print("wrote", OUT, len(S), "shapes")
import sys
sys.path.insert(0, PF)
try:
    from pixelforge import shape_detail, shapes as PS
    r = shape_detail.stock(PS.load_shapes(OUT), replace=True)
    print("stock detail for", r["count"], "parts")
except Exception as e:   # noqa: BLE001
    print("detail layer not made:", e)
