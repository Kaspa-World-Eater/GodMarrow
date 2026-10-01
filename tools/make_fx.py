#!/usr/bin/env python3
"""Godmarrow's effect sheets, made by PixelForge (`tools/pixelforge`, `pixelforge vfx`).

Run from the project root: `python3 tools/make_fx.py` (re-runnable; same seeds = same frames). Writes
`art/fx/<name>.png` (frames in a row), `art/fx/<name>.json` and the manifest `art/fx/fx.json` that `fx/sheet_fx.gd`
reads. Texels at hr 2 (two texels per web world px, like art/objects).

The game's law: glow only on magic, lanterns and wisps (the Forge adds a halo only to those kinds; melee slashes,
smoke, dust, shards, blood never glow); no red light (blood is dark, not lit); every colour from the order's ramp.
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "pixelforge"))
from pixelforge.vfx import make_vfx  # noqa: E402

OUT = os.path.join(HERE, "..", "art", "fx")
# name: (kind, palette, size or None, frames, fps, extra)
CATALOG = {
    # --- the Hollow Mystic (mirrors, silver, wisps, threads)
    "mystic_wisp":        ("wisp",   "wisp",   None, 8, 10, {}),
    "mystic_soul_ring":   ("ring",   "wisp",   None, 8, 8,  {}),
    "mystic_mirror_bolt": ("bolt",   "silver", None, 6, 12, {}),
    "mystic_mirror_shards": ("shards", "silver", None, 8, 14, {}),
    "mystic_mirror_ward": ("ward",   "silver", None, 8, 8,  {}),
    "mystic_thread_vortex": ("vortex", "wisp", None, 8, 10, {}),
    "mystic_cast_circle": ("circle", "silver", None, 8, 6,  {}),
    # --- the Ossuarch (bone, pale, iron; never gold)
    "ossuarch_bone_shards": ("shards", "bone", None, 8, 14, {}),
    "ossuarch_bone_bolt": ("bolt",   "bone",   None, 6, 12, {}),
    "ossuarch_bone_slash": ("slash", "bone",   None, 6, 18, {}),
    "ossuarch_raise_circle": ("circle", "bone", None, 8, 6, {}),
    "ossuarch_carapace_ward": ("ward", "bone", None, 8, 8, {}),
    "ossuarch_count_ring": ("ring",  "bone",   None, 8, 8,  {}),
    "ossuarch_grave_dust": ("cloud", "iron",   None, 8, 6,  {}),
    "ossuarch_bone_decal": ("decal", "bone",   None, 1, 0,  {}),
    # --- the Shrine Keeper (miasma violet, paper charms, poison)
    "keeper_miasma_cloud": ("cloud", "miasma", (64, 44), 8, 6, {}),
    "keeper_poison_cloud": ("cloud", "poison", None, 8, 6,  {}),
    "keeper_paper_bolt":  ("bolt",   "paper",  None, 6, 12, {}),
    "keeper_charm_circle": ("circle", "paper", None, 8, 6,  {}),
    "keeper_omen_ring":   ("ring",   "miasma", None, 8, 8,  {}),
    "keeper_miasma_vortex": ("vortex", "miasma", None, 8, 10, {}),
    "keeper_haze":        ("smoke",  "miasma", (48, 64), 8, 6, {}),
    # --- the Empty Hand (amber sand by day, black sand by night, stone)
    "hand_amber_slash":   ("slash",  "amber",  None, 6, 18, {}),
    "hand_black_slash":   ("slash",  "black",  None, 6, 18, {}),
    "hand_amber_sand":    ("cloud",  "amber",  None, 8, 8,  {}),
    "hand_black_sand":    ("cloud",  "black",  None, 8, 8,  {}),
    "hand_noon_pillar":   ("pillar", "amber",  None, 8, 12, {}),
    "hand_night_ring":    ("ring",   "black",  None, 8, 8,  {"glow": False}),
    "hand_amber_flash":   ("flash",  "amber",  None, 4, 20, {}),
    "hand_stone_shards":  ("shards", "iron",   None, 8, 14, {}),
    # --- the Red Penitent (blood, dark, unlit)
    "penitent_blood_drip": ("drip",  "blood",  None, 8, 8,  {}),
    "penitent_blood_burst": ("burst", "blood", None, 6, 14, {"glow": False}),
    "penitent_blood_decal": ("decal", "blood", None, 1, 0,  {}),
    "penitent_blood_ring": ("ring",  "blood",  None, 8, 8,  {"glow": False}),
    "penitent_blood_slash": ("slash", "blood", None, 6, 18, {}),
    "penitent_scourge_shards": ("shards", "blood", None, 8, 14, {}),
    # --- the world and everyone
    "world_lantern_flame": ("fire",  "lantern", (20, 32), 8, 10, {}),
    "world_campfire":     ("fire",   "lantern", (40, 56), 8, 10, {}),
    "world_torch_smoke":  ("smoke",  "smoke",  None, 8, 6,  {}),
    "world_embers":       ("embers", "lantern", None, 8, 8,  {}),
    "world_hit_flash":    ("flash",  "silver", None, 4, 20, {}),
    "world_level_pillar": ("pillar", "lantern", (48, 112), 10, 12, {}),
    "world_dust":         ("cloud",  "iron",   (48, 32), 8, 6, {}),
    "world_frost_cloud":  ("cloud",  "frost",  None, 8, 6,  {}),
    "world_chill_ring":   ("ring",   "frost",  None, 8, 8,  {}),
    "world_burn":         ("fire",   "lantern", (16, 24), 8, 12, {}),
    "world_scorch_decal": ("decal",  "black",  None, 1, 0,  {}),
    "world_heal_ring":    ("ring",   "lantern", None, 8, 8, {}),
    "world_summon_circle": ("circle", "miasma", None, 8, 6, {}),
    "world_death_burst":  ("burst",  "bone",   None, 6, 14, {"glow": False}),
    "world_waypoint_pillar": ("pillar", "wisp", (32, 96), 8, 8, {}),
    "world_shrine_ward":  ("ward",   "lantern", None, 8, 8, {}),
    # --- weather and world (second batch)
    "world_rain":         ("rain",   "rain",   None, 8, 12, {}),
    "world_ashfall":      ("ashfall", "iron",  None, 8, 8,  {}),
    "world_snowfall":     ("ashfall", "white", None, 8, 8,  {}),
    "world_fog_bank":     ("fog",    "smoke",  None, 8, 5,  {}),
    "world_lightning":    ("lightning", "silver", None, 8, 16, {}),
    "world_chain":        ("chain",  "iron",   None, 8, 6,  {}),
    "world_blood_pool":   ("pool",   "blood",  None, 8, 10, {}),
    "world_tar_pool":     ("pool",   "black",  None, 8, 10, {}),
    "mystic_wisp_swarm":  ("swarm",  "wisp",   None, 8, 8,  {}),
    "mystic_rune":        ("rune",   "silver", None, 8, 6,  {}),
    "ossuarch_rune":      ("rune",   "bone",   None, 8, 6,  {}),
    "keeper_rune":        ("rune",   "miasma", None, 8, 6,  {}),
    "hand_rune":          ("rune",   "amber",  None, 8, 6,  {}),
    "penitent_rune":      ("rune",   "blood",  None, 8, 6,  {"glow": False}),
    # --- light cookies (PointLight2D textures): warm lantern, cold moon, window
    "light_lantern":      ("cookie", "lantern", (128, 128), 8, 8, {}),
    "light_moon":         ("cookie", "frost",  (192, 192), 4, 2,  {}),
    "light_window":       ("cookie", "amber",  (96, 96),   4, 4,  {}),
    "light_wisp":         ("cookie", "wisp",   (64, 64),   8, 8,  {}),
}


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    for name, (kind, palette, size, frames, fps, extra) in CATALOG.items():
        r = make_vfx(kind, name, OUT, size=size, frames=frames, fps=fps, palette=palette, seed=sum(ord(c) for c in name), **extra)
        meta = json.load(open(os.path.join(OUT, name + ".json")))
        manifest[name] = {"png": f"res://art/fx/{name}.png", "kind": kind, "frames": meta["frames"], "frame_width": meta["frame_width"],
                          "size": meta["size"], "fps": meta["fps"], "loop": meta["loop"], "anchor": meta["anchor"], "glow": meta["glow"], "hr": 2}
        print(f"{name:28s} {kind:7s} {palette:8s} {meta['size']}  x{meta['frames']}")
    with open(os.path.join(OUT, "fx.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    print(len(manifest), "effects ->", os.path.abspath(OUT))


if __name__ == "__main__":
    main()
