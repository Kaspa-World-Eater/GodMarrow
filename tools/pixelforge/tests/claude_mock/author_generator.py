"""The mock author's generator: what the mock Claude "writes" into characters/<name>/shapes/ each round of
``pixelforge character author`` (tests/claude_mock/author.jsonl). A hand-authored figure in the Hemomancer method
(a materials table, a shape list, loops for the two sides, the parts kit), drawn against the Keeper's front
(assets/styles/keeper_front.png) in three fixed rounds whose silhouette overlap rises:

    round 1: the body alone (head, torso, arms, legs): too thin, no hat, no robe
    round 2: + the straw hat and the robe to the ground: the mass is right
    round 3: + the wide brim, the shawl, the sleeves and the belt: the silhouette

    python author_generator.py --round N --out NAME.shapes.json
"""
import json
import sys

from pixelforge import shape_parts as K

CX = 69.0
ROUND = int(sys.argv[sys.argv.index("--round") + 1]) if "--round" in sys.argv else 3
OUT = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else "mock.shapes.json"

M = {
    "wrapdark": {"ramp": ["#15101a", "#241a2c", "#36283f", "#4a3855", "#5e4a6a"], "texture": "weave", "texture_strength": 0.4},
    "strawdim": {"ramp": ["#15100c", "#241b13", "#35291c", "#473826", "#594832", "#6b5a40"], "texture": "grain", "texture_strength": 0.5},
    "ragdark":  {"ramp": ["#0c0a0e", "#171419", "#242028", "#302b36", "#3d3744"], "texture": "weave", "texture_strength": 0.5},
    "ropeold":  {"ramp": ["#2a2318", "#3f3524", "#574a33", "#6f6044", "#877656"]},
}
S = []


def add(**k):
    S.append(k)


# ---- the body, every round
add(name="head", kind="ellipsoid", centre=[CX, 23.5, 0.3], radii=[6.0, 8.0, 6.6], material="wrapdark", bone="head",
    rules=[{"z": [4.3, None], "near": [[[66.6, 23.0, None], [71.4, 23.0, None]], 1.0], "t": -3}])
add(name="neck", kind="capsule", a=[CX, 33, 0], b=[CX, 27.5, 0], r=[2.8, 2.6], material="wrapdark", bone="neck")
add(name="chest", kind="ellipsoid", centre=[CX, 50, 0], radii=[10, 12.5, 7.2], material="wrapdark", bone="spine.002")
add(name="waist", kind="capsule", a=[CX, 58.0, -0.3], b=[CX, 72.0, -1.5], r=[8.6, 9.8], material="wrapdark", bone="spine.001")
for s, sg in (("L", 1), ("R", -1)):
    X = K.mirror(CX, sg)
    add(name=f"upper_arm.{s}", kind="capsule", a=[X(82.02), 36.24, -4.44], b=[X(85.89), 54.45, -4.76], r=[3.9, 3.2], material="wrapdark", bone=f"upper_arm.{s}")
    add(name=f"forearm.{s}", kind="capsule", a=[X(85.89), 54.45, -4.76], b=[X(89.74), 72.08, -0.68], r=[3.6, 2.7], material="wrapdark", bone=f"forearm.{s}")
    add(name=f"hand.{s}", kind="ellipsoid", centre=[X(90.2), 75.0, 0.2], radii=[2.9, 3.6, 2.5], material="wrapdark", t=-1, bone=f"hand.{s}")
    add(name=f"thigh.{s}", kind="capsule", a=[X(75.04), 70.76, 0.09], b=[X(75.04), 97.92, -0.1], r=[4.4, 3.5], material="ragdark", bone=f"thigh.{s}")
    add(name=f"shin.{s}", kind="capsule", a=[X(75.04), 97.92, -0.09], b=[X(75.04), 126.97, -2.43], r=[3.7, 2.6], material="wrapdark", bone=f"shin.{s}")
    add(name=f"foot.{s}", kind="box", centre=[X(75.04), 131.4, 3.0], half=[3.3, 2.4, 6.4], round=1.3, material="wrapdark", bone=f"foot.{s}")

parts = {}
# ---- round 2: the hat and the robe (the mass)
if ROUND >= 2:
    add(name="hat", kind="ring", y=[6, 20], rx=[2.6, 1.7], rz=[2.6, 1.62], thickness=1.3, material="strawdim", part="hat", rotate={"x": 16, "about": [CX, 16, 0]})
    add(name="hat_cap", kind="ellipsoid", centre=[CX, 6.4, 0], radii=[2.3, 2.0, 2.3], material="strawdim", t=-1, part="hat", rotate={"x": 16, "about": [CX, 16, 0]})
    add(name="robe", kind="ring", y=[74, 112], rx=[12.4, 0.2], rz=[9.6, 0.15], thickness=2.2, hem={"tongues": 14, "depth": 9, "seed": 8}, material="ragdark", part="robe",
        bump={"folds": [0.4, 8, 0.8]})
    parts["hat"] = {"bone": "head", "lag": {"frames": 1, "sway": 0.12}}
    parts["robe"] = {"bone": "hips", "lag": {"frames": 2, "sway": 0.8}, "hang": 0.25}
# ---- round 3: the brim, the shawl, the sleeves, the belt (the silhouette)
if ROUND >= 3:
    hat = S[[s["name"] for s in S].index("hat")]          # the painting's hat sits lower and its brim is narrower than round 2's cone
    hat["y"] = [9, 20]; hat["rx"] = [2.6, 1.45]; hat["rz"] = [2.6, 1.35]
    robe = S[[s["name"] for s in S].index("robe")]        # the robe ends above the ankles, the legs show
    robe["y"] = [74, 106]; robe["rx"] = [13.0, 0.24]
    add(name="shawl", kind="ring", y=[27, 46], rx=[6.6, 0.34], rz=[6.2, 0.26], thickness=1.8, hem={"tongues": 12, "depth": 7, "seed": 4}, open={"angle": 0.75, "below": 30},
        material="ragdark", part="shawl", bump={"folds": [0.4, 7, 1.0]})
    for s, sg in (("L", 1), ("R", -1)):
        X = K.mirror(CX, sg)
        add(name=f"pauldron.{s}", kind="ellipsoid", centre=[X(82.0), 38.5, -2.0], radii=[7.4, 4.8, 7.0], material="ragdark", bone=f"shoulder.{s}")
        add(name=f"sleeve.{s}", kind="capsule", a=[X(82.02), 36.24, -4.44], b=[X(86.5), 54.45, -4.76], r=[5.4, 4.8], material="ragdark", bone=f"upper_arm.{s}")
        add(name=f"cuff.{s}", kind="capsule", a=[X(86.5), 54.45, -4.76], b=[X(91.0), 72.08, -0.68], r=[4.6, 3.6], material="ragdark", bone=f"forearm.{s}")
    add(name="belt", kind="ring", y=[68, 74], rx=12.6, rz=9.6, material="ropeold", bone="hips")
    parts["shawl"] = {"bone": "spine.003", "lag": {"frames": 1, "sway": 0.3}, "hang": 0.6}

spec = {
    "name": OUT.replace("\\", "/").split("/")[-1].split(".")[0],
    "about": f"The mock author's figure, round {ROUND}: drawn by hand in the Hemomancer method against the Keeper's front.",
    "mode": "solid", "size": [138, 138], "height": 120, "ground": 134, "axis": [CX, 0], "view": {"elevation": 12}, "outline": "#0a080c",
    "skeleton": {"height": 120, "ground": 134, "cx": CX}, "materials": M, "parts": parts, "shapes": S, "effects": [], "lights": [],
    "shadow": {"radii": [22, 4.2], "colour": "#4b4a4f"},
}
json.dump(spec, open(OUT, "w"), indent=1)
print("wrote", OUT, len(S), "shapes")
