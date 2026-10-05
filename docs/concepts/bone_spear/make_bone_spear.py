"""The Ossuarch's Bone Spear, after Diablo II Resurrected's: a long jagged spike of pale bone flying point first,
knuckled along its length like a spine, small barbs swept back from it, a hard bright point, and a splintered
tail. Cold ivory, nearly white, a little blue in the shadows. Written as a shape model and rendered from above at
the game's viewing angle in 32 headings (render_bone_spear.py); the game draws the heading nearest its flight.

Run from tools/pixelforge with the Forge's Python: python ../../docs/concepts/bone_spear/make_bone_spear.py
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "bone_spear.shapes.json")
CX, CY, CZ = 50.0, 50.0, 0.0       # the spear lies along z (its point toward +z), centred here
L = 44.0                            # tail to point

M = {
    "bone": {"ramp": ["#14131c", "#24232f", "#383848", "#4f5163", "#6a6f80", "#8a91a0", "#aab3bf", "#c8d0d8", "#e0e7ea", "#f2f6f6", "#ffffff"],
             "texture": "grain", "texture_strength": 0.35},
    "marrow": {"ramp": ["#2a1810", "#4a2c1a", "#6e4426", "#966034"]},
}
S = []
def add(**k): S.append(k)

z0, z1 = CZ - L * 0.5, CZ + L * 0.5
# the shaft: thick at the tail, tapering to the point
add(name="shaft", kind="capsule", a=[CX, CY, z0 + 4.0], b=[CX, CY, z1 - 7.0], r=[3.6, 2.0], material="bone",
    rules=[{"every_z": [4, 0], "t": -1}, {"hash": [0.06, 3, 1], "t": -2}])
# the point: long and hard, the brightest bone
add(name="point", kind="capsule", a=[CX, CY, z1 - 8.0], b=[CX, CY, z1], r=[2.1, 0.25], material="bone", rules=[{"t": 1}])
# knuckles along it, like vertebrae, smaller toward the point
for i in range(6):
    t = i / 5.0
    z = z0 + 6.0 + t * (L - 16.0)
    r = 4.6 - 2.0 * t
    add(name=f"knuckle{i}", kind="ellipsoid", centre=[CX, CY, z], radii=[r, r * 0.9, r * 0.55], material="bone",
        rules=[{"hash": [0.12, 1, i], "t": -1}])
    # a barb swept back from each knuckle, alternating sides and up and down (a spine's processes)
    ang = (i * 2.4) % (2 * math.pi)
    dx, dy = math.cos(ang), math.sin(ang)
    add(name=f"barb{i}", kind="capsule", a=[CX + dx * r * 0.6, CY + dy * r * 0.6, z],
        b=[CX + dx * (r + 3.6 - t), CY + dy * (r + 3.6 - t), z - 5.0 + t], r=[1.2 - 0.4 * t, 0.2], material="bone")
# the splintered tail: three jagged spurs breaking away behind
for k, (dx, dy, ln) in enumerate(((1.6, 0.8, 6.0), (-1.4, 1.2, 4.6), (0.2, -1.8, 5.4))):
    add(name=f"tail{k}", kind="capsule", a=[CX + dx * 0.4, CY + dy * 0.4, z0 + 4.4], b=[CX + dx, CY + dy, z0 + 4.4 - ln], r=[1.4, 0.2], material="bone",
        rules=[{"t": -1}])
add(name="core", kind="capsule", a=[CX, CY, z0 + 4.0], b=[CX, CY, z0 + 2.2], r=[1.2, 1.0], material="marrow")

spec = {"name": "bone_spear", "about": "The Bone Spear, after D2R's: a long jagged spike of pale cold bone, knuckled like a spine, barbs swept back, a hard point, a splintered tail.",
        "mode": "solid", "size": [100, 100], "height": 100, "ground": 99, "axis": [CX, CZ],
        "view": {"elevation": 30, "contrast": 1.3, "light": [-0.5, -0.8, 0.35]}, "outline": "#0b0a10",
        "materials": M, "shapes": S}
json.dump(spec, open(OUT, "w"), indent=1)
print("wrote", OUT, len(S), "shapes")
