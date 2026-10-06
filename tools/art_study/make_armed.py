"""The Ossuarch armed, for testing weapons on the frames (Derek 2026-10-06: "Create a sword and shield to test
things"). Writes tools/pixelforge/assets/shapes/characters/ossuarch_sword_shield.shapes.json: his model, plus a
one-handed sword in the right fist and a heater shield on the left forearm, bound to those bones, and the keyed
strike as his attack. Weapons follow D2: one rendered set per weapon CLASS (here one hand + shield); a particular
sword later changes colours and detail on top. Colour per the art study: hue-shifted ramps (cool violet shadows,
warm lights, saturation highest in the mid-tones).

    tools/pixelforge/.venv/Scripts/python tools/art_study/make_armed.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "tools/pixelforge/assets/shapes/characters/ossuarch.shapes.json"
DST = ROOT / "tools/pixelforge/assets/shapes/characters/ossuarch_sword_shield.shapes.json"

# hand.R in the author pose: the gauntlet at (52.2, 103.6, 0), fingers down (+y), the figure facing +z (the viewer)
HX, HY, HZ = 52.2, 106.5, 1.0
BLADE = 40.0           # a third of his 120: an arming sword

MATERIALS = {
    # steel: violet-black shadow -> cool greys -> a warm white edge (hue shift ~12 degrees a step)
    "steel": {"ramp": ["#0a0912", "#15151f", "#232430", "#363844", "#4d5059", "#686b70", "#8a8b88", "#b3b0a2", "#ddd6c0", "#fff6dc"],
              "texture": "scratch", "texture_strength": 0.25, "spec": True, "spec_t": 0.72, "rim_edge": True},
    # old oak, darkened: plum shadows, warm brown mids, a dry ochre light
    "oak": {"ramp": ["#0f0709", "#1d0e0d", "#2c1712", "#3f2216", "#55301b", "#6b4122", "#82552e", "#9c6c3c"],
            "texture": "grain", "texture_strength": 0.45},
    # the grip's leather wrap
    "grip": {"ramp": ["#0c0606", "#190c0a", "#28140f", "#3b2016", "#4f2d1d", "#663d27"], "texture": "weave", "texture_strength": 0.4},
}


def sword() -> list:
    z0 = HZ + 4.0                       # the blade starts past the guard, forward of the fist
    return [
        {"name": "sword_grip", "kind": "capsule", "a": [HX, HY, HZ - 3.5], "b": [HX, HY, HZ + 2.6], "r": [1.1, 1.1], "material": "grip", "bone": "hand.R"},
        {"name": "sword_pommel", "kind": "ellipsoid", "centre": [HX, HY, HZ - 4.6], "radii": [1.7, 1.7, 1.5], "material": "steel", "bone": "hand.R"},
        {"name": "sword_guard", "kind": "box", "centre": [HX, HY, HZ + 3.3], "half": [0.9, 5.2, 0.8], "material": "steel", "bone": "hand.R"},
        # the blade: its flats face the sides (x), its edges up and down (y); a fuller as a darker strip down the middle
        {"name": "sword_blade", "kind": "box", "centre": [HX, HY, z0 + BLADE / 2], "half": [0.45, 1.7, BLADE / 2], "material": "steel", "bone": "hand.R",
         "rules": [{"dy": [-0.5, 0.5], "t": -2}]},
        {"name": "sword_tip", "kind": "ellipsoid", "centre": [HX, HY, z0 + BLADE + 0.5], "radii": [0.45, 1.3, 2.4], "material": "steel", "bone": "hand.R"},
    ]


def shield() -> list:
    # a heater shield strapped to the left forearm, its face outward (+x, the character's left), point down
    cx, cy, cz = 101.5, 93.0, 1.5
    return [
        {"name": "shield_board", "kind": "ellipsoid", "centre": [cx, cy, cz], "radii": [1.3, 13.0, 10.0], "material": "oak", "bone": "forearm.L",
         "clip_y": [None, cy + 9.5]},
        {"name": "shield_point", "kind": "ellipsoid", "centre": [cx, cy + 9.0, cz], "radii": [1.3, 5.5, 5.0], "material": "oak", "bone": "forearm.L"},
        {"name": "shield_rim", "kind": "ellipsoid", "centre": [cx + 0.3, cy, cz], "radii": [1.0, 13.6, 10.6], "material": "ironw", "bone": "forearm.L",
         "clip_y": [None, cy + 9.5]},
        {"name": "shield_boss", "kind": "ellipsoid", "centre": [cx + 1.6, cy - 1.0, cz], "radii": [1.4, 2.6, 2.6], "material": "steel", "bone": "forearm.L"},
    ]


def main():
    d = json.loads(SRC.read_text(encoding="utf8"))
    d["name"] = "Ossuarch (sword and shield)"
    d["materials"].update(MATERIALS)
    d["shapes"] = [s for s in d["shapes"] if not s["name"].startswith(("sword_", "shield_"))] + sword() + shield()
    # the silhouette study (STUDY.md round 3): the cloak hangs BEHIND him, open at the front, so the planted legs read
    # as two shapes with a gap (it wrapped three quarters of the way round: back_strip 2.4 rad either side of the back)
    for s in d["shapes"]:
        if s["name"] == "cloak":
            s["keep"] = {"back_strip": 1.75}
            # shorter, in deep ragged tongues: the hem ends about the knee so the gap between the legs stays open in
            # silhouette, the tongues still trail to mid-shin (it ran to 142 of a 166 ground line)
            s["y"] = [62, 126]
            s["hem"] = {"tongues": 9, "depth": 20, "seed": 7}
    # the silhouette study (STUDY.md round 3): the armed stance, legs apart and the sword out from the body, as his idle
    d["clips"] = dict(d.get("clips") or {}, attack="strike", idle="attack_idle")
    DST.write_bytes(json.dumps(d, indent=1, ensure_ascii=False).encode("utf8"))
    print("wrote", DST)


if __name__ == "__main__":
    main()
