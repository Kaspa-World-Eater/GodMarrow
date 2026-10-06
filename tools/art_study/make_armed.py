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
              "texture": "scratch", "texture_strength": 0.25, "spec": True, "spec_t": 0.6, "rim_edge": True, "lift": 0.35, "detail": "metal"},
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


# ------------------------------------------------------------------ the armour pass (art study: plate, not tubes)
# Derek: "the armor should not look like tubes. You should have edges and filigree and designs." Every plate gets a lit
# lip and a dark underside at its ends (a hard bevelled edge), a raised ridge down its front, lames on the long pieces,
# rivets at the ends; the greaves, the breastplate and the pauldrons carry a knotwork of bone inlaid in the iron.
KNOT = ["0010100", "0101010", "1001001", "0101010", "0010100", "0001000", "0010100", "0101010", "1001001", "0101010", "0010100"]
KNOT_SMALL = ["01010", "10101", "01010", "00100", "01010", "10101", "01010"]
PLATES = ("upper_arm.", "vambrace.", "thigh.", "greave.")


def armour_pass(shapes: list) -> None:
    for s in shapes:
        if s.get("material") not in ("iron", "ironw"):
            continue
        n = s["name"]
        rules = s.setdefault("rules", [])
        if s["kind"] == "capsule" and n.startswith(PLATES):
            y0, y1 = sorted([s["a"][1], s["b"][1]])
            # only where it shows: the knee cop covers a greave's top, the sabaton its foot, the pauldron and couter
            # the arm's ends (the debug render, art study round 4)
            m0, m1 = {"greave.": (6.0, 7.0), "upper_arm.": (6.0, 2.0), "vambrace.": (3.0, 2.0), "thigh.": (4.0, 4.0)}[n.split(".")[0] + "."]
            y0, y1 = y0 + m0, y1 - m1
            x0 = (s["a"][0] + s["b"][0]) / 2.0
            rules += [
                {"y": [y0, y0 + 1.2], "t": 4},            # the top lip catches the light
                {"y": [y0 + 1.2, y0 + 2.2], "t": -3},     # and throws a shadow under it
                {"y": [y1 - 2.2, y1 - 1.2], "t": 3},
                {"y": [y1 - 1.2, y1], "t": -3},
                {"front": 0.2, "y": [y0 + 2.2, y1 - 2.2], "t": 2},     # the raised ridge down the front
                {"every_y": [4, 1], "y": [y0 + 3.0, y1 - 3.0], "t": -1},  # lames
                {"near": [[[x0 - 2.2, y0 + 3.0, None], [x0 + 2.2, y0 + 3.0, None], [x0 - 2.2, y1 - 3.0, None], [x0 + 2.2, y1 - 3.0, None]], 0.6],
                 "front": 1.0, "rivet": True},
            ]
            if n.startswith("greave."):
                rules.append({"bitmap": {"rows": KNOT, "y": y0 + 3.0, "by": "x", "x": x0, "scale": 1.0}, "front": 0.9,
                              "material": "bone", "t": 0})
        elif n.startswith("pauldron0.") or n == "chest":
            c = s["centre"]
            rows, y = (KNOT, c[1] - 15.0) if n == "chest" else (KNOT_SMALL, c[1] - 3.5)
            rules.append({"bitmap": {"rows": rows, "y": y, "by": "x", "x": c[0], "scale": 1.0}, "front": 1.4, "material": "bone", "t": 0})
            rules.append({"dy": [None, -(s["radii"][1] - 1.2)], "t": 4})      # the plate's top rim lit


def main():
    d = json.loads(SRC.read_text(encoding="utf8"))
    d["name"] = "Ossuarch (sword and shield)"
    d["materials"].update(MATERIALS)
    d["shapes"] = [s for s in d["shapes"] if not s["name"].startswith(("sword_", "shield_"))] + sword() + shield()
    armour_pass(d["shapes"])
    # the iron ramp from exercise E1: violet-black shadows to a warm worn edge (the old one stopped at value 0.4)
    d["materials"]["iron"]["ramp"] = ["#040308", "#08060d", "#0e0b13", "#151119", "#1d181f", "#272026", "#342b2e", "#463a3a", "#5e4d48", "#8a7060", "#4f7a6a"]
    d["materials"]["ironw"]["ramp"] = ["#06050a", "#0c0a10", "#141118", "#1d1920", "#28222a", "#352d33", "#473c3e", "#5f504d", "#806a5f", "#b0927a"]
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
