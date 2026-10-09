"""Run inside Blender: build a scene once and render its data passes for many frames (the bake's tiles), each to its own
folder, so a whole zone is not rebuilt for every tile (tools/landkit3d/cove_bake.py).

  blender --background --python blend_tiles.py -- SCENE TILES.json

TILES.json: [{"out": DIR, "focus": [x, y], "w": W, "h": H}, ...]. Each frame is blend_scene's camera at that focus and
size, so a pixel's centre lands where cove_bake.py asked it to (it checks)."""
import bpy
import sys
import os
import json
import importlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import blend_scene as BS                                          # noqa: E402

if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:]
    scene, tiles = argv[0], json.load(open(argv[1]))
    BS.clear()
    root = BS.game_root()
    mod = importlib.import_module(scene)
    mod.build(root, BS.material)
    BS.setup_sun()
    BS.setup_render(getattr(mod, "SAMPLES", 24))
    for k, tl in enumerate(tiles):
        for o in [o for o in bpy.data.objects if o.type == "CAMERA"]:
            bpy.data.objects.remove(o, do_unlink=True)
        BS.setup_camera(tuple(tl["focus"]), int(tl["w"]), int(tl["h"]), 1.0)
        os.makedirs(tl["out"], exist_ok=True)
        BS.render_passes(tl["out"], getattr(mod, "LAMPS", ()), getattr(mod, "FLOOR_MODULE", "floor3d"), 1.0,
                         getattr(mod, "LAMP_REF", 0.09), getattr(mod, "AMBIENT", 1.0), getattr(mod, "SPOUTS", ()),
                         getattr(mod, "WORN", ()))
        print("tile %d/%d saved %s" % (k + 1, len(tiles), tl["out"]), flush=True)
