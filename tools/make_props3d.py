#!/usr/bin/env python3
"""Real props (hr 4: one texel per screen px, heroes are ~195 px): CC0 3D kits (Kenney: graveyard, castle, nature, mini-dungeon; License.txt in each) and the Forge's
own grown trees, rendered with the game's camera and lantern light, weathered, graded to the Hollow Mystic
painting's tones and pressed to pixels (`pixelforge prop3d`). Writes art/objects/<key>/ and objects.json.

    python3 tools/make_props3d.py --kits /path/to/kenney [--only crypt,gravestone]
"""
import argparse, json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, os.path.join(HERE, "pixelforge"))
from pixelforge.prop3d import make_prop3d
from pixelforge import api

OUT = os.path.join(ROOT, "art", "objects"); OJ = os.path.join(OUT, "objects.json")
G, C, N, D = "graveyard-kit/Models/GLB format", "castle-kit/Models/GLB format", "nature-kit/Models/GLTF format", "mini-dungeon/Models/GLB format"
# key: (kit path, height m, yaw, extra)
CATALOG = {
    # graves and stones
    "gravestone": (f"{G}/gravestone-decorative.glb", 1.2, 45, {}),
    "gravestone_round": (f"{G}/gravestone-round.glb", 1.0, 45, {}),
    "gravestone_broken": (f"{G}/gravestone-broken.glb", 0.8, 45, {}),
    "gravestone_cross": (f"{G}/gravestone-cross-large.glb", 1.6, 45, {}),
    "gravestone_wide": (f"{G}/gravestone-wide.glb", 1.1, 45, {}),
    "grave": (f"{G}/grave.glb", 0.35, 45, {}),
    "grave_border": (f"{G}/grave-border.glb", 0.3, 45, {}),
    "cross_wood": (f"{G}/cross-wood.glb", 1.4, 45, {}),
    "obelisk": (f"{G}/pillar-obelisk.glb", 2.6, 45, {}),
    "pillar": (f"{G}/pillar-large.glb", 2.2, 45, {}),
    "column": (f"{G}/column-large.glb", 2.8, 45, {}),
    "urn": (f"{G}/urn-round.glb", 0.7, 45, {}),
    "altar": (f"{G}/altar-stone.glb", 1.0, 45, {}),
    "altar_wood": (f"{G}/altar-wood.glb", 1.0, 45, {}),
    "bench": (f"{G}/bench-damaged.glb", 0.6, 45, {}),
    "coffin": (f"{G}/coffin-old.glb", 0.6, 45, {}),
    "crypt": (f"{G}/crypt.glb", 3.4, 45, {}),
    "crypt_small": ([f"{G}/crypt-small.glb", f"{G}/crypt-small-roof.glb"], 3.0, 45, {"stack": True}),
    "crypt_large": ([f"{G}/crypt-large.glb", f"{G}/crypt-large-roof.glb"], 4.4, 45, {"stack": True}),
    "crypt_door": (f"{G}/crypt-door.glb", 2.4, 45, {}),
    "fence": (f"{G}/fence.glb", 1.0, 45, {}),
    "fence_damaged": (f"{G}/fence-damaged.glb", 1.0, 45, {}),
    "fence_gate": (f"{G}/fence-gate.glb", 1.3, 45, {}),
    "iron_fence": (f"{G}/iron-fence.glb", 1.4, 45, {}),
    "iron_fence_gate": (f"{G}/iron-fence-border-gate.glb", 2.0, 45, {}),
    "stone_wall": (f"{G}/stone-wall.glb", 1.2, 45, {}),
    "stone_wall_damaged": (f"{G}/stone-wall-damaged.glb", 1.1, 45, {}),
    "stone_wall_column": (f"{G}/stone-wall-column.glb", 1.6, 45, {}),
    "lantern_post": (f"{G}/lightpost-single.glb", 2.6, 45, {}),
    "lantern_post_double": (f"{G}/lightpost-double.glb", 2.6, 45, {}),
    "lantern_candle": (f"{G}/lantern-candle.glb", 0.5, 45, {}),
    "fire_basket": (f"{G}/fire-basket.glb", 1.1, 45, {}),
    "candles": (f"{G}/candle-multiple.glb", 0.3, 45, {}),
    "debris": (f"{G}/debris.glb", 0.4, 45, {}),
    "debris_wood": (f"{G}/debris-wood.glb", 0.4, 45, {}),
    "shovel": (f"{G}/shovel-dirt.glb", 1.1, 45, {}),
    "rocks": (f"{G}/rocks.glb", 0.8, 45, {}),
    "rocks_tall": (f"{G}/rocks-tall.glb", 1.6, 45, {}),
    "trunk": (f"{G}/trunk.glb", 0.6, 45, {}),
    "trunk_long": (f"{G}/trunk-long.glb", 0.6, 45, {}),
    "hay_bale": (f"{G}/hay-bale.glb", 0.9, 45, {}),
    # castle
    "tower_square": (f"{C}/tower-square.glb", 6.0, 45, {}),
    "tower_hexagon": ([f"{C}/tower-hexagon-base.glb", f"{C}/tower-hexagon-mid.glb", f"{C}/tower-hexagon-mid.glb", f"{C}/tower-hexagon-top.glb", f"{C}/tower-hexagon-roof.glb"], 7.5, 45, {"stack": True}),
    "tower_square_tall": ([f"{C}/tower-square-base.glb", f"{C}/tower-square-mid-windows.glb", f"{C}/tower-square-mid.glb", f"{C}/tower-square-top-roof-high-windows.glb"], 9.0, 45, {"stack": True}),
    "tower_roof": (f"{C}/tower-square-top-roof-high.glb", 5.5, 45, {}),
    "wall": (f"{C}/wall.glb", 3.0, 45, {}),
    "wall_gate": (f"{C}/gate.glb", 4.0, 45, {}),
    "wall_corner": (f"{C}/wall-corner-half-tower.glb", 3.4, 45, {}),
    "bridge": (f"{C}/bridge-straight.glb", 1.0, 45, {}),
    "stairs_stone": (f"{C}/stairs-stone.glb", 1.2, 45, {}),
    "flag": (f"{C}/flag.glb", 3.0, 45, {}),
    "banner_long": (f"{C}/flag-banner-long.glb", 3.2, 45, {}),
    "siege_tower_ruin": (f"{C}/siege-tower-demolished.glb", 4.0, 45, {}),
    "catapult": (f"{C}/siege-catapult.glb", 2.4, 45, {}),
    "rocks_large": (f"{C}/rocks-large.glb", 1.4, 45, {}),
    # nature
    "cliff_block": (f"{N}/cliff_block_rock.glb", 2.0, 45, {}),
    "cliff_slope": (f"{N}/cliff_blockSlope_rock.glb", 2.0, 45, {}),
    "cliff_cave": (f"{N}/cliff_blockCave_rock.glb", 2.0, 45, {}),
    "log": (f"{N}/log_large.glb", 0.6, 45, {}),
    "stump": (f"{N}/stump_round.glb", 0.6, 45, {}),
    "campfire": (f"{N}/campfire_logs.glb", 0.5, 45, {}),
    "mushrooms": (f"{N}/mushroom_redGroup.glb", 0.5, 45, {}),
    "grass_tuft": (f"{N}/grass_large.glb", 0.5, 45, {}),
    "bush": (f"{N}/plant_bushDetailed.glb", 1.0, 45, {}),
    "pine_tall": (f"{N}/tree_pineTallA_detailed.glb", 7.0, 45, {}),
    "pine_small": (f"{N}/tree_pineSmallA.glb", 3.5, 45, {}),
    "tree_dark": (f"{N}/tree_tall_dark.glb", 6.0, 45, {}),
    # dungeon / interiors
    "chest": (f"{D}/chest.glb", 0.7, 45, {}),
    "barrel": (f"{D}/barrel.glb", 0.9, 45, {}),
    "table": (f"{D}/table.glb", 0.8, 45, {}),
    "chair": (f"{D}/chair.glb", 0.9, 45, {}),
    "pot": (f"{D}/pot.glb", 0.6, 45, {}),
    "dungeon_column": (f"{D}/column.glb", 3.0, 45, {}),
    "dungeon_wall": (f"{D}/wall.glb", 3.0, 45, {}),
    "dungeon_gate": (f"{D}/gate.glb", 3.0, 45, {}),
    "wood_support": (f"{D}/wood-support.glb", 2.6, 45, {}),
    "stones": (f"{D}/stones.glb", 0.4, 45, {}),
}
TREES = {"dead_tree": ("dead", 1, 5.0), "dead_tree_2": ("dead", 7, 4.4), "dead_tree_3": ("dead", 12, 5.6), "pine": ("pine", 2, 6.0), "pine_2": ("pine", 9, 5.0), "willow": ("willow", 3, 4.5)}


KITS = ("graveyard-kit", "castle-kit", "nature-kit", "mini-dungeon")   # Kenney, CC0 (kenney.nl)


def fetch_kits(kits_dir: str) -> None:
    """Download and unpack the four Kenney kits (CC0) if they are not there yet."""
    import re, urllib.request, zipfile
    os.makedirs(kits_dir, exist_ok=True)
    for kit in KITS:
        if os.path.isdir(os.path.join(kits_dir, kit, "Models")):
            continue
        page = urllib.request.urlopen(f"https://kenney.nl/assets/{kit}", timeout=30).read().decode("utf-8", "ignore")
        m = re.search(rf"https://kenney\.nl/media/pages/assets/{kit}/[^'\"]*\.zip", page)
        if not m:
            print("could not find the zip link for", kit); continue
        z = os.path.join(kits_dir, kit + ".zip")
        print("downloading", kit)
        urllib.request.urlretrieve(m.group(0), z)
        with zipfile.ZipFile(z) as zf:
            zf.extractall(os.path.join(kits_dir, kit))


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--kits", default=os.path.join(ROOT, "tools", "pixelforge", "assets", "kits")); ap.add_argument("--only"); ap.add_argument("--blender")
    a = ap.parse_args()
    fetch_kits(a.kits)
    only = set(a.only.split(",")) if a.only else None
    blender = a.blender or api.find_blender(None)
    scratch = os.path.join(ROOT, "art", "objects", "_models"); os.makedirs(scratch, exist_ok=True)
    done, failed = [], []
    for key, (kind, seed, height) in TREES.items():
        if only and key not in only:
            continue
        glb = os.path.join(scratch, f"{key}.glb")
        if not os.path.exists(glb):
            r = subprocess.run([blender, "-b", "--python", os.path.join(HERE, "pixelforge", "pixelforge", "blender", "gen_tree.py"), "--", "--out", glb, "--seed", str(seed), "--height", str(height), "--kind", kind], capture_output=True, text=True)
            if "PF_OK" not in r.stdout:
                failed.append((key, "tree gen")); continue
        try:
            make_prop3d(glb, f"pf_{key}", OUT, height=height, grime=0.5, bump=0.5, dust=0.12, game_objects=OJ, hr=4, blender=blender)
            done.append(key); print("tree", key)
        except Exception as e:  # noqa: BLE001
            failed.append((key, str(e)[:120]))
    for key, (rel, height, yaw, extra) in CATALOG.items():
        if only and key not in only:
            continue
        model = [os.path.join(a.kits, r) for r in rel] if isinstance(rel, list) else os.path.join(a.kits, rel)
        if any(not os.path.exists(m) for m in (model if isinstance(model, list) else [model])):
            failed.append((key, "missing " + str(rel))); continue
        try:
            r = make_prop3d(model, f"pf_{key}", OUT, height=height, yaw=yaw, game_objects=OJ, hr=4, blender=blender, **extra)
            done.append(key); print("prop", key, r["size"])
        except Exception as e:  # noqa: BLE001
            failed.append((key, str(e)[:160]))
    print(len(done), "done;", len(failed), "failed:", failed)


if __name__ == "__main__":
    main()
