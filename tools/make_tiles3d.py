#!/usr/bin/env python3
"""The world's ground, rendered in 3D with the props' light rig (pixelforge tiles3d): a 6x6 patch per material
gives 36 variants; the 16 edge tiles blend to a second material on the same relief. Run from the project root."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, os.path.join(HERE, "pixelforge"))
from pixelforge.tiles3d import make_tiles3d
SETS = {"moor_grass": ("grass", "stone"), "fen_mud": ("mud", "grass"), "ash_shore": ("ash", "stone"), "stone_flags": ("stone", "mud"),
        "bone_field": ("bone", "ash"), "water_edge": ("water", "mud"), "snow_ground": ("snow", "stone")}
for name, (a, b) in SETS.items():
    r = make_tiles3d(a, b, name, os.path.join(ROOT, "art", "tiles"), tiles=6, seed=3)
    print(name, r["tiles"], "tiles,", r["variants"], "variants")
