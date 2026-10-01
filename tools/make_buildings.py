#!/usr/bin/env python3
"""Buildings and objects for the world, painted with tools/pf_paint.py and cut by PixelForge's `prop` into
art/objects (objects.json entries, hr 2). Run from the project root. Stand-ins until Midjourney paintings exist:
every entry here is one `prop_painting()` call away from a real picture."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..")
sys.path.insert(0, os.path.join(HERE, "pixelforge")); sys.path.insert(0, HERE)
from pf_paint import Canvas, hexc, BONE, IRON, DARK, MOSS, TEAL, WOOD, WOOD_D, STONE, STONE_D, STONE_L, GLOW, SLATE
from pixelforge.props import make_prop

OUT = os.path.join(ROOT, "art", "objects"); OJ = os.path.join(OUT, "objects.json")


def building(kind):
    c = Canvas(360, 320)
    d = c.d
    if kind == "hut":
        c.stone((100, 170, 260, 290), course=10); c.thatch([(80, 175), (180, 90), (280, 175)]); c.door((165, 230, 195, 290)); c.window((215, 200, 240, 225))
        c.ground_shadow(180, 292, 110, 16)
    elif kind == "longhouse":
        c.planks((60, 160, 300, 290), vertical=True); c.shingles([(45, 165), (180, 70), (315, 165)]); c.door((165, 225, 200, 290), arch=False)
        for x in (90, 240): c.window((x, 195, x + 24, 220))
        c.ground_shadow(180, 292, 140, 16)
    elif kind == "chapel_ruin":
        c.stone((90, 120, 270, 290), course=11); d.rectangle([150, 60, 210, 130], fill=hexc(STONE))
        c.stone((150, 60, 210, 130), course=9)
        c.window((165, 150, 195, 215), lit=False, arch=True); c.window((110, 180, 130, 215), lit=False, arch=True); c.window((230, 180, 250, 215), lit=False, arch=True)
        # the roof is gone: a broken edge
        d.polygon([(90, 120), (130, 95), (150, 120), (200, 100), (240, 125), (270, 110), (270, 125), (90, 125)], fill=(255, 255, 255))
        d.polygon([(90, 125), (130, 100), (150, 125), (200, 105), (240, 128), (270, 115), (270, 132), (90, 132)], fill=hexc(STONE_D))
        c.door((165, 230, 195, 290)); c.ground_shadow(180, 292, 110, 16); d.ellipse([70, 270, 140, 300], fill=hexc(MOSS))
    elif kind == "watchtower":
        c.stone((130, 60, 230, 290), course=10); c.shingles([(115, 65), (180, 20), (245, 65)])
        for y in (100, 160, 220): c.window((170, y, 190, y + 22), lit=(y == 160), arch=True)
        d.rectangle([120, 60, 240, 70], fill=hexc(STONE_D)); c.ground_shadow(180, 292, 70, 14)
    elif kind == "well":
        c.stone((120, 200, 240, 270), course=9); d.ellipse([120, 185, 240, 215], fill=hexc(DARK)); d.ellipse([130, 190, 230, 210], fill=(10, 14, 16))
        c.post(135, 110, 200, w=8); c.post(225, 110, 200, w=8); c.shingles([(110, 115), (180, 70), (250, 115)])
        d.line([135, 150, 225, 150], fill=hexc(WOOD_D), width=6); d.rectangle([176, 150, 184, 180], fill=hexc(IRON)); d.rectangle([168, 180, 192, 196], fill=hexc(WOOD))
        c.ground_shadow(180, 272, 80, 14)
    elif kind == "gallows":
        c.planks((110, 230, 250, 260), vertical=False); c.post(130, 60, 230, w=10); d.rectangle([125, 55, 250, 67], fill=hexc(WOOD_D)); d.line([130, 110, 180, 60], fill=hexc(WOOD_D), width=6)
        for k in range(12): d.ellipse([228 + (k % 2) * 2, 70 + k * 9, 236 + (k % 2) * 2, 80 + k * 9], outline=hexc(IRON), width=2)
        c.ground_shadow(180, 262, 80, 12)
    elif kind == "shrine":
        c.stone((140, 150, 220, 250), course=8); c.shingles([(120, 155), (180, 110), (240, 155)]); d.rectangle([150, 170, 210, 215], fill=hexc(DARK))
        d.ellipse([170, 180, 190, 200], fill=hexc(GLOW)); d.rectangle([120, 250, 240, 262], fill=hexc(STONE_D)); c.ground_shadow(180, 264, 70, 12)
        for x in (128, 232): d.rectangle([x - 4, 200, x + 4, 250], fill=hexc(BONE))
    elif kind == "gate_arch":
        c.stone((80, 120, 130, 290), course=10); c.stone((230, 120, 280, 290), course=10); c.stone((80, 90, 280, 130), course=10)
        d.pieslice([130, 90, 230, 200], 180, 360, fill=(255, 255, 255)); d.rectangle([130, 145, 230, 290], fill=(255, 255, 255))
        d.arc([126, 86, 234, 204], 180, 360, fill=hexc(STONE_D), width=6); c.ground_shadow(180, 292, 110, 14)
    elif kind == "wall_segment":
        c.stone((40, 170, 320, 290), course=11); d.rectangle([40, 160, 320, 172], fill=hexc(STONE_D))
        for x in range(50, 320, 40): d.rectangle([x, 140, x + 22, 162], fill=hexc(STONE))
        c.ground_shadow(180, 292, 150, 12)
    elif kind == "crypt_door":
        c.stone((110, 130, 250, 290), course=9); c.door((160, 200, 200, 290)); d.rectangle([110, 120, 250, 134], fill=hexc(STONE_D))
        d.ellipse([170, 150, 190, 170], outline=hexc(BONE), width=3); c.ground_shadow(180, 292, 80, 12)
    elif kind == "smithy":
        c.planks((70, 170, 290, 290), vertical=True); c.shingles([(55, 175), (180, 95), (305, 175)]); c.door((100, 225, 135, 290), arch=False)
        c.stone((190, 110, 230, 180), course=8); d.rectangle([150, 220, 260, 290], fill=hexc(DARK)); d.ellipse([180, 245, 230, 285], fill=hexc(GLOW))
        d.polygon([(195, 285), (205, 250), (215, 285)], fill=hexc("#fff1b0")); c.ground_shadow(180, 292, 125, 14)
    elif kind == "market_stall":
        c.post(110, 150, 270); c.post(250, 150, 270); d.polygon([(90, 155), (180, 120), (270, 155)], fill=hexc(TEAL))
        d.polygon([(100, 158), (180, 128), (260, 158)], outline=hexc(BONE), width=2); c.planks((100, 220, 260, 250), vertical=False)
        for x in (120, 160, 200): d.ellipse([x, 205, x + 22, 222], fill=hexc(BONE))
        c.ground_shadow(180, 272, 90, 12)
    return c.finish()


def thing(kind):
    c = Canvas(200, 200); d = c.d
    if kind == "chest":
        c.planks((50, 110, 150, 170), vertical=False); d.rectangle([48, 100, 152, 114], fill=hexc(IRON)); d.rectangle([92, 125, 108, 140], fill=hexc(IRON)); c.ground_shadow(100, 172, 55, 9)
    elif kind == "barrel":
        c.planks((65, 80, 135, 175), vertical=True, step=8); d.rectangle([62, 95, 138, 101], fill=hexc(IRON)); d.rectangle([62, 150, 138, 156], fill=hexc(IRON)); c.ground_shadow(100, 177, 40, 8)
    elif kind == "crate":
        c.planks((55, 95, 145, 175), vertical=False, step=10); d.line([55, 95, 145, 175], fill=hexc(WOOD_D), width=3); d.line([145, 95, 55, 175], fill=hexc(WOOD_D), width=3); c.ground_shadow(100, 177, 50, 8)
    elif kind == "cart":
        c.planks((40, 110, 160, 150), vertical=False); d.ellipse([45, 135, 85, 175], outline=hexc(WOOD_D), width=6); d.ellipse([115, 135, 155, 175], outline=hexc(WOOD_D), width=6); d.line([160, 125, 195, 150], fill=hexc(WOOD_D), width=5); c.ground_shadow(100, 177, 60, 8)
    elif kind == "cage":
        d.rectangle([60, 50, 140, 160], outline=hexc(IRON), width=4)
        for x in range(70, 140, 12): d.line([x, 50, x, 160], fill=hexc(IRON), width=3)
        d.line([100, 20, 100, 50], fill=hexc(IRON), width=4); c.ground_shadow(100, 164, 45, 8)
    elif kind == "coffin":
        d.polygon([(70, 60), (130, 60), (150, 100), (135, 180), (65, 180), (50, 100)], fill=hexc(WOOD_D)); d.polygon([(78, 68), (122, 68), (140, 100), (128, 172), (72, 172), (60, 100)], outline=hexc(WOOD), width=3); c.ground_shadow(100, 182, 50, 8)
    elif kind == "altar":
        c.stone((50, 110, 150, 170), course=10); d.rectangle([45, 102, 155, 112], fill=hexc(STONE_L)); d.ellipse([85, 85, 115, 100], fill=hexc(BONE)); c.ground_shadow(100, 172, 60, 9)
    elif kind == "bell_frame":
        c.post(60, 60, 170, w=7); c.post(140, 60, 170, w=7); d.line([55, 60, 145, 60], fill=hexc(WOOD_D), width=7)
        d.polygon([(85, 110), (115, 110), (122, 125), (78, 125)], fill=hexc(IRON)); d.rectangle([92, 70, 108, 112], fill=hexc(IRON)); c.ground_shadow(100, 172, 45, 8)
    elif kind == "candles":
        for i, (x, hgt) in enumerate(((70, 40), (95, 60), (120, 30), (105, 45))):
            d.rectangle([x - 5, 150 - hgt, x + 5, 150], fill=hexc(BONE)); d.polygon([(x - 4, 150 - hgt), (x, 150 - hgt - 14), (x + 4, 150 - hgt)], fill=hexc(GLOW))
        d.ellipse([55, 145, 140, 160], fill=hexc(STONE_D))
    elif kind == "skull_pile":
        for i in range(9):
            x, y = 55 + (i % 4) * 28 + (i // 4) * 12, 150 - (i // 4) * 22
            d.ellipse([x - 13, y - 12, x + 13, y + 10], fill=hexc(BONE)); d.ellipse([x - 8, y - 5, x - 3, y], fill=(30, 28, 26)); d.ellipse([x + 3, y - 5, x + 8, y], fill=(30, 28, 26))
        c.ground_shadow(100, 162, 60, 8)
    elif kind == "dead_bush":
        for a in range(-80, 81, 20):
            import math
            d.line([100, 170, 100 + math.sin(math.radians(a)) * 60, 170 - math.cos(math.radians(a)) * 70], fill=hexc(DARK), width=3)
        c.ground_shadow(100, 172, 30, 6)
    elif kind == "reeds":
        for x in range(60, 145, 9):
            d.line([x, 175, x + int((x % 3) - 1) * 6, 90 - (x % 4) * 8], fill=hexc(MOSS), width=3)
        d.ellipse([50, 168, 150, 182], fill=hexc("#1a2a2e"))
    elif kind == "mushrooms":
        for x, s in ((75, 1.0), (105, 1.4), (125, 0.8)):
            d.rectangle([x - 3 * s, 150 - 18 * s, x + 3 * s, 150], fill=hexc(BONE)); d.ellipse([x - 12 * s, 150 - 28 * s, x + 12 * s, 150 - 12 * s], fill=hexc("#8a7f6a"))
        c.ground_shadow(100, 152, 40, 6)
    elif kind == "rocks":
        for (x, y, r) in ((70, 150, 22), (115, 158, 30), (150, 148, 16)):
            d.ellipse([x - r, y - r * 0.7, x + r, y + r * 0.7], fill=hexc(STONE), outline=hexc(STONE_D), width=2)
        c.ground_shadow(110, 170, 60, 7)
    elif kind == "signpost":
        c.post(100, 60, 170, w=7); c.planks((60, 70, 150, 92), vertical=False, step=30); d.polygon([(150, 70), (165, 81), (150, 92)], fill=hexc(WOOD)); c.ground_shadow(100, 172, 20, 5)
    elif kind == "fence":
        for x in range(40, 170, 32): c.post(x, 100, 170, w=7)
        d.line([35, 115, 170, 115], fill=hexc(WOOD), width=5); d.line([35, 145, 170, 145], fill=hexc(WOOD), width=5); c.ground_shadow(100, 172, 70, 6)
    elif kind == "chained_post":
        c.post(100, 50, 170, w=9, col=STONE_D)
        for k in range(10): d.ellipse([112 + k * 4, 70 + k * 9, 120 + k * 4, 80 + k * 9], outline=hexc(IRON), width=2)
        c.ground_shadow(100, 172, 25, 6)
    elif kind == "bone_statue":
        d.polygon([(80, 170), (120, 170), (115, 60), (85, 60)], fill=hexc(BONE)); d.ellipse([88, 35, 112, 62], fill=hexc(BONE))
        d.ellipse([93, 45, 98, 51], fill=(30, 28, 26)); d.ellipse([102, 45, 107, 51], fill=(30, 28, 26)); c.stone((70, 170, 130, 185), course=7); c.ground_shadow(100, 187, 40, 7)
    elif kind == "lantern":
        d.rectangle([88, 70, 112, 115], fill=hexc("#2e2f34")); d.rectangle([92, 76, 108, 108], fill=hexc(GLOW)); d.arc([90, 55, 110, 80], 180, 360, fill=hexc(IRON), width=3); d.rectangle([84, 112, 116, 118], fill=hexc(IRON))
    elif kind == "tombstone_cross":
        c.stone((85, 90, 115, 180), course=8); c.stone((60, 110, 140, 130), course=8); c.ground_shadow(100, 182, 40, 8)
    return c.finish()


BUILDINGS = ("hut", "longhouse", "chapel_ruin", "watchtower", "well", "gallows", "shrine", "gate_arch", "wall_segment", "crypt_door", "smithy", "market_stall")
THINGS = {"chest": None, "barrel": None, "crate": None, "cart": None, "cage": None, "coffin": None, "altar": None, "bell_frame": None, "candles": "flame", "skull_pile": None,
          "dead_bush": "canopy", "reeds": "canopy", "mushrooms": None, "rocks": None, "signpost": None, "fence": None, "chained_post": None, "bone_statue": None, "lantern": None, "tombstone_cross": None}


def main():
    for b in BUILDINGS:
        r = make_prop(building(b), f"pf_{b}", OUT, height=220, game_objects=OJ, hr=2, key_all=True)
        print("building", b, r["variations"]["v1"]["size"])
    for t, sway in THINGS.items():
        r = make_prop(thing(t), f"pf_{t}", OUT, height=72 if sway is None else 72, sway=sway, frames=8, fps=6, game_objects=OJ, hr=2, key_all=True)
        print("thing", t, r["variations"]["v1"]["size"])


if __name__ == "__main__":
    main()
