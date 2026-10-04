"""Write assets/shapes/characters/hemomancer.shapes.json: the Hemomancer (test 1 sheet) as a solid shape sprite."""
import json, math, os, random

CX = 69.0
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..", "tools", "pixelforge", "assets", "shapes", "characters", "hemomancer.shapes.json")
rnd = random.Random(7)

M = {
    "darkskin": {"ramp": ["#0d0907", "#1a120e", "#291d17", "#3a2a22", "#4e3a30", "#654c41"]},
    "locs":     {"ramp": ["#050506", "#0c0c0f", "#151519", "#1f1f25", "#2b2b33"], "texture": "weave", "texture_strength": 0.3},
    "mantle":   {"ramp": ["#180a0c", "#2b1115", "#421b20", "#5a262c", "#72353c", "#8a4a52"], "texture": "weave", "texture_strength": 0.4},
    "blood":    {"ramp": ["#1c0204", "#360508", "#55090d", "#760f12", "#951a19"]},
    "bandage":  {"ramp": ["#3a2b25", "#5e4a3f", "#83705f", "#a69380", "#c2b19c"], "texture": "weave", "texture_strength": 0.5},
    "plank":    {"ramp": ["#0f0d0d", "#1c1919", "#2b2726", "#3c3735", "#504945", "#675e59"], "texture": "grain", "texture_strength": 0.6},
    "legwrap":  {"ramp": ["#160e0a", "#261911", "#38251a", "#4b3223", "#5f412e"], "texture": "weave", "texture_strength": 0.5},
    "chain":    {"ramp": ["#121110", "#26231f", "#3d3832", "#5a534a", "#7d7468", "#a89d8e"], "spec": True, "spec_t": 0.8, "texture": "scratch", "texture_strength": 0.3},
    "rustiron": {"ramp": ["#0e0c0b", "#201b18", "#363029", "#504840", "#6f655a", "#958a7c"], "spec": True, "spec_t": 0.9, "texture": "scratch", "texture_strength": 0.4},
}

S = []
def add(**k): S.append(k)

# ---- head, face, crown
add(name="head", kind="ellipsoid", centre=[CX, 22.5, 0.6], radii=[5.6, 7.6, 6.2], material="darkskin", bone="head", rules=[
    {"y": [19.6, 21.0], "z": [4.0, None], "t": -2},                                                   # brow shadow
    {"z": [4.5, None], "near": [[[66.9, 22.4, None], [71.1, 22.4, None]], 0.9], "t": -3},            # eye sockets
    {"x": [68.4, 69.6], "y": [22, 25.5], "z": [5.5, None], "t": 1},                                  # nose
    {"y": [26.5, 27.5], "z": [4.0, None], "x": [67, 71], "t": -2},                                    # mouth
    {"y": [27.5, 30.5], "z": [3.0, None], "hash": [0.55, 71, 1], "t": -2},                           # beard
    {"z": [4.0, None], "near": [[[65.6, 24.2, None], [72.4, 24.2, None]], 0.9], "t": 1},             # cheekbones
    ])
add(name="hair_cap", kind="ellipsoid", centre=[CX, 19.3, -1.3], radii=[6.3, 6.2, 6.7], material="locs", bone="head",
    rules=[{"every_angle": [9, 0], "t": -1}, {"y": [None, 15], "t": 1}])
add(name="crown_band", kind="ring", y=[15.6, 18.4], rx=6.7, rz=6.9, cz=-0.4, thickness=1.2, material="rustiron", bone="head",
    rules=[{"every_angle": [10, 0], "t": -1}, {"y": [15.6, 16.4], "t": 1}])
# horizontal spikes: long to the sides, shorter on the diagonals
for i, (deg, length, rise) in enumerate([(90, 10, 0.5), (-90, 10, 0.5), (155, 8, 0.3), (-155, 8, 0.3)]):
    a = math.radians(deg)
    r0 = 6.4
    p0 = [CX + r0 * math.sin(a), 17.0, -0.4 + r0 * math.cos(a)]
    p1 = [CX + (r0 + length) * math.sin(a), 17.0 - rise, -0.4 + (r0 + length) * math.cos(a)]
    add(name=f"spike{i}", kind="capsule", a=p0, b=p1, r=[0.75, 0.3], material="rustiron", bone="head", px=[90, None])
    add(name=f"spike{i}_s", kind="capsule", a=p0, b=p1, r=[1.0, 0.55], material="rustiron", bone="head", px=[None, 90])
# upright spikes leaning out
for i, (deg, top) in enumerate([(0, 2.5), (40, 4.0), (-40, 4.0), (180, 3.5)]):
    a = math.radians(deg)
    p0 = [CX + 6.4 * math.sin(a), 16.5, -0.4 + 6.6 * math.cos(a)]
    p1 = [CX + 7.6 * math.sin(a), top, -0.4 + 7.8 * math.cos(a)]
    add(name=f"upright{i}", kind="capsule", a=p0, b=p1, r=[0.7, 0.28], material="rustiron", bone="head", px=[90, None])
    add(name=f"upright{i}_s", kind="capsule", a=p0, b=p1, r=[0.95, 0.5], material="rustiron", bone="head", px=[None, 90])

add(name="neck", kind="capsule", a=[CX, 33, 0], b=[CX, 27.5, 0.2], r=[3.6, 3.2], material="darkskin", bone="neck")

# ---- locs: strands down the back over the mantle and cape, a few falling in front of the shoulders
def ell(rx, rz, deg, cz=0.0):
    a = math.radians(deg)
    return CX + rx * math.sin(a), cz + rz * math.cos(a)
for i, deg in enumerate([115, 135, 152, 168, 180, 192, 208, 225, 245]):
    x0, z0 = ell(6.4, 6.8, deg, -1.0)
    x1, z1 = ell(10.6, 10.0, deg + (deg - 180) * 0.15, -0.6)
    x2, z2 = ell(10.4, 12.2, deg + (deg - 180) * 0.25, -0.4)
    y2 = 58 + rnd.uniform(-3, 7)
    for j, (pa, pb) in enumerate([([x0, 21, z0], [x1, 34, z1]), ([x1, 34, z1], [x2, y2, z2])]):
        add(name=f"loc_b{i}_{j}", kind="capsule", a=pa, b=pb, r=[1.15, 0.95] if j == 0 else [0.95, 0.7], material="locs", part="locs",
            rules=[{"every_y": [3, i % 3], "t": -1}, {"dz": [None, -0.4], "t": -1}])
for i, deg in enumerate([62, 80, 98, -62, -80, -98]):
    x0, z0 = ell(6.2, 6.6, deg, -0.6)
    side = 1 if deg > 0 else -1
    xe = CX + side * (4.6 + (abs(deg) - 62) * 0.12)
    add(name=f"loc_f{i}_0", kind="capsule", a=[x0, 21, z0], b=[xe + side * 2.2, 31, 9.2], r=[1.1, 0.95], material="locs", part="locs_front",
        rules=[{"every_y": [3, i % 3], "t": -1}])
    add(name=f"loc_f{i}_1", kind="capsule", a=[xe + side * 2.2, 31, 9.2], b=[xe, 52 + rnd.uniform(0, 8), 12.4], r=[0.95, 0.65], material="locs", part="locs_front",
        rules=[{"every_y": [3, (i + 1) % 3], "t": -1}])

# ---- torso and arms (bare, muscular)
add(name="chest", kind="ellipsoid", centre=[CX, 46, 0.4], radii=[12.4, 12.6, 7.9], material="darkskin", bone="spine.002", rules=[
    {"y": [44.5, 46.0], "z": [6.0, None], "t": -1},                      # under the pecs
    {"x": [68.5, 69.5], "y": [40, 58], "z": [6.0, None], "t": -1},       # sternum line
    {"hash": [0.05, 9, 2], "t": -1, "px": [90, None]}])
add(name="waist", kind="capsule", a=[CX, 56, -0.2], b=[CX, 70, -1.4], r=[10.0, 10.6], material="darkskin", bone="spine.001", rules=[
    {"every_y": [4, 1], "y": [52, 66], "z": [7.5, None], "t": -1}, {"x": [68.5, 69.5], "z": [7.5, None], "t": -1}])
for s, sg in (("L", 1), ("R", -1)):
    X = lambda v: CX + sg * (v - CX)
    add(name=f"delt.{s}", kind="ellipsoid", centre=[X(82.0), 38.6, -2.0], radii=[5.8, 5.4, 5.8], material="darkskin", bone=f"shoulder.{s}")
    add(name=f"upper_arm.{s}", kind="capsule", a=[X(82.02), 36.24, -4.44], b=[X(85.89), 54.45, -4.76], r=[4.6, 3.8], material="darkskin", bone=f"upper_arm.{s}",
        rules=[{"hash": [0.05, 4, 2], "t": -1, "px": [90, None]}])
    add(name=f"forearm.{s}", kind="capsule", a=[X(85.89), 54.45, -4.76], b=[X(89.74), 72.08, -0.68], r=[4.3, 3.3], material="bandage", bone=f"forearm.{s}",
        rules=[{"every_y": [2, 0], "t": -1}, {"hash": [0.16, 31 if sg > 0 else 32, 2], "material": "blood"},
               {"y": [64, 69], "hash": [0.45, 33, 2], "material": "blood", "t": -1}, {"y": [54, 56.5], "t": -2}])
    add(name=f"hand.{s}", kind="ellipsoid", centre=[X(90.2), 75.2, 0.2], radii=[2.9, 3.6, 2.5], material="darkskin", bone=f"hand.{s}",
        rules=[{"every_y": [2, 0], "t": -1}, {"hash": [0.2, 35, 2], "material": "blood"}], px=[90, None])
    add(name=f"hand_s.{s}", kind="ellipsoid", centre=[X(90.2), 75.2, 0.2], radii=[3.3, 4.1, 2.9], material="darkskin", bone=f"hand.{s}",
        rules=[{"hash": [0.2, 35, 2], "material": "blood"}], px=[None, 90])
    for k, (dx, t) in enumerate(((-1.6, -1), (0, 0), (1.6, -1))):
        add(name=f"finger{k}.{s}", kind="capsule", a=[X(90.2 + dx), 77.6, 0.6], b=[X(90.2 + dx * 1.15), 82.6, 1.4], r=[0.8, 0.55], material="darkskin", bone=f"hand.{s}", t=t, px=[90, None])
    add(name=f"drip.{s}", kind="capsule", a=[X(90.6), 80, 0.8], b=[X(90.8), 86.5, 1.0], r=[0.5, 0.3], material="blood", bone=f"hand.{s}", px=[90, None])
    # legs: dark wrapped trousers, wrapped shins, bare wrapped feet
    add(name=f"thigh.{s}", kind="capsule", a=[X(75.04), 70.76, 0.09], b=[X(75.04), 97.92, -0.1], r=[5.0, 4.0], material="legwrap", bone=f"thigh.{s}",
        rules=[{"every_y": [5, 2], "t": -1}])
    add(name=f"shin.{s}", kind="capsule", a=[X(75.04), 97.92, -0.09], b=[X(75.04), 126.97, -2.43], r=[4.2, 3.0], material="legwrap", bone=f"shin.{s}",
        rules=[{"every_y": [3, 0], "t": -1}, {"every_y": [3, 1], "t": 1}, {"y": [99, 102], "t": -2}, {"y": [117, 126], "hash": [0.25, 41, 2], "material": "blood", "t": -1, "px": [90, None]}])
    add(name=f"foot.{s}", kind="box", centre=[X(75.04), 131.4, 3.0], half=[3.4, 2.4, 6.4], round=1.3, material="darkskin", bone=f"foot.{s}",
        rules=[{"every_z": [3, 0], "material": "legwrap", "t": -1}, {"dy": [1.3, None], "material": "leather5", "t": -2}, {"dz": [4.5, None], "y": [None, 130.6], "t": 1}])
    add(name=f"toe.{s}", kind="ellipsoid", centre=[X(75.04), 132.0, 9.6], radii=[3.0, 1.8, 2.7], material="darkskin", bone=f"foot.{s}", rules=[{"dy": [0.6, None], "material": "leather5", "t": -2}])

# ---- the crimson: cowl and mantle over the shoulders, a tabard down the front, a cape down the back
add(name="cowl", kind="ring", y=[30.5, 35], rx=7.0, rz=7.2, cz=0.2, thickness=2.6, material="mantle", bone="spine.003",
    bump={"folds": [0.5, 6, 1.0]}, rules=[{"every_y": [2, 0], "t": -1}, {"y": [30.5, 31.5], "t": 1}])
add(name="mantle", kind="ring", y=[32, 49], rx=[10.6, 0.6], rz=[8.2, 0.26], thickness=2.4, hem={"tongues": 13, "depth": 6, "seed": 4},
    material="mantle", part="mantle", bump={"folds": [0.5, 9, 2.0]},
    rules=[{"hem_band": [0, 1.5], "t": -1}, {"hash": [0.025, 13, 2], "material": "blood", "px": [90, None]}, {"every_y": [5, 1], "hash": [0.4, 14, 2], "t": -1, "px": [90, None]}])
add(name="tabard", kind="ring", y=[37, 118], rx=[9.0, 0.05], rz=[9.0, 0.085], thickness=1.4, keep={"front": 0.3},
    hem={"tongues": 5, "depth": 8, "seed": 3}, material="mantle", part="tabard", bump={"folds": [0.4, 5, 0.5]},
    rules=[{"every_angle": [7, 0], "t": -1}, {"hash": [0.03, 17, 2], "material": "blood", "t": -1}, {"hem_band": [0, 4], "material": "blood", "t": -1, "hash": [0.3, 18, 2]}])
add(name="cape", kind="ring", y=[32, 122], rx=[10.0, 0.07], rz=[9.2, 0.095], thickness=1.6, keep={"back": 2.42},
    hem={"tongues": 7, "depth": 9, "seed": 6}, material="mantle", part="cape", bump={"folds": [0.5, 6, 1.5]},
    rules=[{"every_angle": [11, 0], "t": -1}, {"hash": [0.02, 19, 2], "material": "blood", "px": [90, None]}, {"hem_band": [0, 4], "t": -1}])

# ---- belt, plank skirt, plank shield
add(name="belt", kind="ring", y=[65.5, 70.5], rx=12.0, rz=10.6, cz=-0.8, material="leather5", bone="hips",
    rules=[{"every_angle": [14, 0], "t": 1}, {"y": [67.5, 68.5], "t": -1}])
for i, deg in enumerate([22, 46, 70, 94, 118, 142, 166, -166, -142, -118, -94, -70, -46, -22]):
    h = rnd.uniform(17, 20.5)
    seed = 50 + i
    add(name=f"plank{i}", kind="box", centre=[CX, 67 + h, 12.2], half=[2.5, h, 0.95], round=0.4, material="plank", part=("planks_L" if 0 < deg <= 100 else "planks_R" if -100 <= deg < 0 else "planks_back"),
        t=rnd.choice([-1, 0, 0, 1]), rotate={"x": 4, "y": deg, "about": [CX, 67, -0.6]},
        rules=[{"hash": [0.05, seed, 2], "t": -3, "px": [90, None]}, {"hash": [0.015, seed + 100, 2], "material": "blood"}, {"dy": [h - 6, None], "hash": [0.25, seed + 200, 2], "material": "blood", "t": -1},
               {"dy": [None, -h + 1.5], "t": 1}, {"dy": [h - 2.0, None], "t": -1}])
add(name="shield", kind="union", material="plank", part="shield", rotate={"x": 9, "about": [CX, 76, 14.0]},
    of=[{"kind": "box", "centre": [CX, 78, 14.0], "half": [7.4, 17, 1.0], "round": 0.5},
        {"kind": "prism", "centre": [CX, 61], "radii": [7.4, 6.5], "z": [13.0, 15.0]}],
    rules=[{"every_x": [4, 2], "t": -3}, {"near": [[[65.5, 68, None], [72.5, 68, None], [69, 84, None]], 0.9], "t": -3},
           {"x": [65.0, 66.0], "y": [69, 82], "material": "blood"}, {"x": [72.0, 73.0], "y": [69, 79], "material": "blood"},
           {"x": [68.5, 69.5], "y": [85, 93], "material": "blood"}, {"hash": [0.025, 61, 2], "material": "blood", "t": -1},
           {"y": [None, 57.5], "t": 1}, {"hash": [0.04, 62, 2], "t": -3, "px": [90, None]}])
add(name="shield_strap", kind="capsule", a=[CX - 6, 57, 12.4], b=[CX - 11, 42, 9.0], r=0.8, material="leather5", part="shield", px=[90, None])

# ---- iron: spiked greaves, knee plates, thigh plates; chains
def chain(name, pts, step=2.0, **bind):
    """Links along a polyline: alternating face-on and edge-on ovals, so it reads as a chain."""
    k = 0
    for (ax, ay, az), (bx, by, bz) in zip(pts, pts[1:]):
        L = math.dist((ax, ay, az), (bx, by, bz)); n = max(1, int(L / step))
        horiz = abs(bx - ax) > abs(by - ay)
        for i in range(n):
            f = i / n; c = [ax + (bx - ax) * f, ay + (by - ay) * f, az + (bz - az) * f]
            big = [1.5, 0.95, 0.55] if horiz else [0.95, 1.5, 0.55]
            thin = [1.5, 0.5, 0.9] if horiz else [0.5, 1.5, 0.9]
            add(name=f"{name}{k}", kind="ellipsoid", centre=c, radii=big if k % 2 == 0 else thin, material="chain", t=1 if k % 2 == 0 else -1, **bind)
            k += 1
for s_, sg in (("L", 1), ("R", -1)):
    X = lambda v: CX + sg * (v - CX)
    add(name=f"greave.{s_}", kind="box", centre=[X(75.04), 112.5, 3.6], half=[4.6, 11.5, 1.5], round=0.8, material="rustiron", bone=f"shin.{s_}",
        rules=[{"every_y": [4, 0], "t": -1}, {"dy": [None, -10], "t": 1}, {"hash": [0.08, 81, 2], "t": -2},
               {"y": [102.5, 103.5], "every_x": [3, 0], "z": [3.0, None], "rivet": True, "px": [90, None]},
               {"y": [121.5, 122.5], "every_x": [3, 1], "z": [3.0, None], "rivet": True, "px": [90, None]}])
    add(name=f"kneecop.{s_}", kind="ellipsoid", centre=[X(75.04), 98.6, 3.4], radii=[5.0, 4.0, 3.2], material="rustiron", bone=f"shin.{s_}",
        rules=[{"dy": [None, -1.5], "t": 1}, {"every_y": [2, 0], "t": -1}])
    add(name=f"thighplate.{s_}", kind="box", centre=[X(75.04), 86, 4.0], half=[4.4, 8, 1.0], round=0.6, material="rustiron", bone=f"thigh.{s_}",
        rules=[{"every_y": [4, 1], "t": -1}, {"dy": [6.5, None], "t": -2}, {"dy": [-7, -6], "every_x": [3, 0], "rivet": True, "px": [90, None]}])
    spikes = [([X(76.5), 98.0, 5.6], [X(80.5), 94.0, 10.5], [1.3, 0.25]),          # the knee spike, up and out
              ([X(79.0), 104, 3.5], [X(85.5), 101.5, 5.5], [1.0, 0.2]),            # a row out the outer side
              ([X(79.0), 110, 3.5], [X(86.0), 108, 5.5], [1.0, 0.2]),
              ([X(79.0), 116, 3.5], [X(85.5), 114.5, 5.0], [1.0, 0.2]),
              ([X(79.0), 122, 3.0], [X(84.0), 121, 4.5], [0.9, 0.2]),
              ([X(74.0), 107, 5.0], [X(73.0), 104, 9.5], [0.9, 0.2]),              # two forward
              ([X(74.0), 117, 5.0], [X(73.0), 114, 9.0], [0.9, 0.2]),
              ([X(71.6), 109, 3.5], [X(70.4), 107.5, 6.0], [0.7, 0.2])]            # a short one on the inner edge
    for k, (a, b, r) in enumerate(spikes):
        add(name=f"legspike{k}.{s_}", kind="capsule", a=a, b=b, r=r, material="rustiron", bone=f"shin.{s_}", rules=[{"hash": [0.3, 90 + k, 1], "t": 1}])
    add(name=f"thighspike.{s_}", kind="capsule", a=[X(78.5), 84, 4.2], b=[X(82), 83, 7.5], r=[0.8, 0.2], material="rustiron", bone=f"thigh.{s_}")
    # a shackle at each wrist with a broken chain hanging from it
    add(name=f"shackle.{s_}", kind="ellipsoid", centre=[X(89.3), 70.2, -1.0], radii=[4.3, 1.7, 4.0], material="rustiron", bone=f"forearm.{s_}",
        rules=[{"dy": [None, -0.6], "t": 1}, {"every_x": [3, 0], "z": [2.5, None], "rivet": True, "px": [90, None]}])
    chain(f"wristchain{s_}_", [[X(93.4), 71.5, 0.5], [X(94.4), 78, 1.5], [X(94.0), 86, 2.0]], bone=f"forearm.{s_}")
# a chain across the chest, shoulder to hip, and one round the waist over the planks with two loops hanging in front
chain("chestchain", [[81, 36.5, 11.0], [75, 43, 12.8], [67, 52, 13.0], [60, 61, 13.0]], bone="spine.002")
add(name="waistchain", kind="ring", y=[70.2, 72.6], rx=15.2, rz=14.0, cz=-0.6, thickness=1.6, material="chain", bone="hips",
    rules=[{"every_angle": [38, 0], "t": -2}, {"every_angle": [38, 1], "t": 1}])
for side in (1, -1):
    a0, a1 = math.radians(side * 20), math.radians(side * 80)
    pts = []
    for i in range(9):
        f = i / 8; a = a0 + (a1 - a0) * f
        pts.append([CX + 15.6 * math.sin(a), 72 + 9 * math.sin(math.pi * f), -0.6 + 14.6 * math.cos(a) + 1.4 * math.sin(math.pi * f)])
    chain(f"loop{'L' if side > 0 else 'R'}_", pts, part="planks_back")

spec = {
    "name": "hemomancer",
    "about": "The Hemomancer (Derek's test 1 sheet) as a solid shape sprite: a crown of rusted iron spikes over black locs, dark skin, "
             "a crimson cowl and mantle, a tabard down the front and a cape down the back, bare muscular arms with bloody bandaged forearms, "
             "a skirt of weathered planks and a plank shield stained with blood, wrapped legs, bare wrapped feet. Drawn around the 120 px author pose.",
    "mode": "solid", "size": [138, 138], "height": 120, "ground": 134, "axis": [CX, 0],
    "view": {"elevation": 12}, "outline": "#08060a",
    "skeleton": {"height": 120, "ground": 134, "cx": CX},
    "materials": M,
    "parts": {
        "locs": {"bone": "spine.003", "lag": {"frames": 2, "sway": 0.5}, "hang": 0.5},
        "locs_front": {"bone": "spine.003", "lag": {"frames": 1, "sway": 0.4}, "hang": 0.6},
        "mantle": {"bone": "spine.003", "lag": {"frames": 1, "sway": 0.3}, "hang": 0.6},
        "tabard": {"bone": "spine.001", "lag": {"frames": 2, "sway": 0.6}, "hang": 0.3},
        "cape": {"bone": "spine.003", "lag": {"frames": 2, "sway": 0.7}, "hang": 0.3},
        "planks_L": {"bone": "thigh.L", "lag": {"frames": 1, "sway": 0.3}, "hang": 0.3, "upright_from": "hips"},
        "planks_R": {"bone": "thigh.R", "lag": {"frames": 1, "sway": 0.3}, "hang": 0.3, "upright_from": "hips"},
        "planks_back": {"bone": "hips", "lag": {"frames": 1, "sway": 0.5}, "hang": 0.4},
        "shield": {"bone": "spine.001", "lag": {"frames": 1, "sway": 0.3}, "hang": 0.6},
    },
    "shapes": S,
    "effects": [], "lights": [],
    "shadow": {"radii": [22, 4.2], "colour": "#4b4a4f"},
}
json.dump(spec, open(OUT, "w"), indent=1)
print("wrote", OUT, len(S), "shapes")
