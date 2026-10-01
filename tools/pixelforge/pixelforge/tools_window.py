"""The Studio's Tools window: every non-character tool as a plain form (effects, props, icons, portraits,
tiles, UI frames, sounds, recolour, compare, skill trees, Godot add-on). One tab each, one Run button each.
Forms are built from a small spec so a new tool is ten lines."""

from __future__ import annotations

import threading
import webbrowser
from pathlib import Path
from tkinter import BOTH, END, LEFT, X, BooleanVar, StringVar, Toplevel, filedialog, messagebox
from tkinter import ttk
from tkinter.scrolledtext import ScrolledText

# field kinds: file, dir, text, int, float, choice, check
TOOLS = [
    ("Effects", "Looping spell, aura, fire, smoke and impact sheets. Glow is added only to the magic kinds.",
     [("kind", "choice", "fire", ["fire", "smoke", "wisp", "burst", "embers", "ring", "bolt", "slash", "circle", "cloud", "shards", "pillar", "decal", "drip", "flash", "ward", "vortex", "rain", "ashfall", "fog", "lightning", "swarm", "chain", "rune", "pool", "cookie"]),
      ("name", "text", "my_effect", None), ("out", "dir", "art/fx", None),
      ("palette", "choice", "lantern", ["lantern", "wisp", "silver", "miasma", "paper", "poison", "bone", "iron", "amber", "black", "frost", "blood", "smoke"]),
      ("frames", "int", 8, None), ("fps", "float", 10.0, None), ("gif", "check", True, None)],
     "vfx"),
    ("Prop / tree", "A painted object (or a sheet of 4) becomes a game sprite with a foot point; trees and banners can sway.",
     [("image", "file", "", None), ("name", "text", "dead_tree", None), ("out", "dir", "art/objects", None),
      ("height", "int", 96, None), ("sway", "choice", "none", ["none", "canopy", "banner", "flame"]), ("variations", "int", 1, None),
      ("game_objects", "file", "", None)],
     "prop"),
    ("Item icons", "One painting of several items on a plain background becomes inventory icons.",
     [("image", "file", "", None), ("out", "dir", "art/items", None), ("names", "text", "", None), ("cell", "int", 12, None), ("scale", "int", 4, None)],
     "icons"),
    ("Portrait", "Head-and-shoulders portraits from a front-view cutout.",
     [("image", "file", "", None), ("name", "text", "hero", None), ("out", "dir", "art/portraits", None), ("sizes", "text", "48 96", None)],
     "portrait"),
    ("Ground tiles", "A painted ground texture becomes iso diamonds (plus edge tiles to a second material) and a Godot TileSet.",
     [("texture", "file", "", None), ("name", "text", "moor_grass", None), ("out", "dir", "art/tiles", None), ("second", "file", "", None), ("variants", "int", 6, None)],
     "tiles"),
    ("UI frame", "A painted panel or frame becomes a 9-slice texture and a Godot StyleBox.",
     [("image", "file", "", None), ("name", "text", "panel", None), ("out", "dir", "art/ui", None), ("mid", "int", 8, None)],
     "ui9"),
    ("Sounds", "Synthesised effects: hits, bone clicks, pours, glass, casts, UI ticks. Low and dry.",
     [("preset", "choice", "all", ["all", "hit", "heavy_hit", "bone_click", "bone_break", "thud", "whoosh", "pour", "glass", "cast", "wisp", "pickup", "ui_tick", "ui_open", "death_rattle", "lantern_light", "step_stone", "step_soft", "coin"]),
      ("out", "dir", "art/sfx", None), ("variations", "int", 1, None), ("seed", "int", 0, None)],
     "sfx"),
    ("Recolour", "Tint a finished sprite or atlas (champion / unique variants) without re-rendering.",
     [("image", "file", "", None), ("out", "text", "recoloured.png", None), ("hue", "float", 0.0, None), ("lightness", "float", 1.0, None), ("chroma", "float", 1.0, None), ("map", "text", "", None)],
     "recolor"),
    ("Compare", "Before / after strip and GIF for two images or two frame folders.",
     [("a", "file", "", None), ("b", "file", "", None), ("out", "text", "compare.png", None), ("zoom", "int", 2, None)],
     "compare"),
    ("Skill trees", "Open the skill-tree editor over a game's data/skills.json.",
     [("skills", "file", "", None)],
     "skilltree"),
    ("Godot add-on", "Copy the PixelForge loaders (sprite sets, effects, props) into a Godot project.",
     [("godot_project", "dir", "", None)],
     "godot-addon"),
]


def run_tool(key: str, v: dict) -> dict:
    """Call the library directly (no subprocess) so errors come back as text."""
    if key == "vfx":
        from .vfx import make_vfx
        return make_vfx(v["kind"], v["name"], v["out"], frames=int(v["frames"]), fps=float(v["fps"]), palette=v["palette"], gif=bool(v["gif"]))
    if key == "prop":
        from .props import make_prop
        return make_prop(v["image"], v["name"], v["out"], height=int(v["height"]), sway=None if v["sway"] == "none" else v["sway"],
                         variations=int(v["variations"]), game_objects=v["game_objects"] or None)
    if key == "icons":
        from .icons import make_icons
        names = [n.strip() for n in v["names"].split(",")] if v["names"].strip() else None
        return make_icons(v["image"], v["out"], names, cell_art=int(v["cell"]), scale=int(v["scale"]))
    if key == "portrait":
        from .portrait import make_portrait
        return make_portrait(v["image"], v["name"], v["out"], sizes=tuple(int(x) for x in v["sizes"].split()))
    if key == "tiles":
        from .tiles import make_tiles
        return make_tiles(v["texture"], v["name"], v["out"], second=v["second"] or None, variants=int(v["variants"]))
    if key == "ui9":
        from .ui9 import make_ui9
        return make_ui9(v["image"], v["name"], v["out"], mid=int(v["mid"]))
    if key == "sfx":
        from .sfx import make_sfx
        return make_sfx(v["preset"], v["out"], seed=int(v["seed"]), variations=int(v["variations"]))
    if key == "recolor":
        from .recolor import recolor_file
        mapping = dict(p.split("=", 1) for p in v["map"].split(",")) if v["map"].strip() else None
        return recolor_file(v["image"], v["out"], mapping=mapping, hue=float(v["hue"]), lightness=float(v["lightness"]), chroma=float(v["chroma"]))
    if key == "compare":
        from .compare import compare
        return compare(v["a"], v["b"], v["out"], zoom=int(v["zoom"]))
    if key == "skilltree":
        from .skilltree import gui
        gui(v["skills"])
        return {"ok": True}
    if key == "godot-addon":
        import shutil
        src = Path(__file__).resolve().parent.parent / "godot_addon" / "pixelforge"
        dst = Path(v["godot_project"]) / "addons" / "pixelforge"
        dst.mkdir(parents=True, exist_ok=True)
        for f in src.iterdir():
            shutil.copy(f, dst / f.name)
        return {"ok": True, "installed": str(dst)}
    raise ValueError(key)


class ToolsWindow:
    def __init__(self, master, log=None, base_dir: str | None = None):
        self.log = log or (lambda m: None)
        self.base = Path(base_dir) if base_dir else Path.cwd()
        self.win = Toplevel(master)
        self.win.title("PixelForge tools")
        self.win.geometry("760x560")
        nb = ttk.Notebook(self.win)
        nb.pack(fill=BOTH, expand=True, padx=6, pady=6)
        self.out = ScrolledText(self.win, height=6, state="disabled", font=("Consolas", 9))
        self.out.pack(fill=X, padx=6, pady=(0, 6))
        for title, blurb, fields, key in TOOLS:
            tab = ttk.Frame(nb, padding=10)
            nb.add(tab, text=title)
            ttk.Label(tab, text=blurb, wraplength=700, justify=LEFT).pack(anchor="w", pady=(0, 8))
            vars_ = {}
            for name, kind, default, choices in fields:
                row = ttk.Frame(tab)
                row.pack(fill=X, pady=2)
                ttk.Label(row, text=name.replace("_", " "), width=16).pack(side=LEFT)
                if kind == "check":
                    var = BooleanVar(value=bool(default))
                    ttk.Checkbutton(row, variable=var).pack(side=LEFT)
                elif kind == "choice":
                    var = StringVar(value=str(default))
                    ttk.Combobox(row, textvariable=var, values=choices, state="readonly", width=18).pack(side=LEFT)
                else:
                    var = StringVar(value=str(default))
                    ttk.Entry(row, textvariable=var, width=44).pack(side=LEFT)
                    if kind == "file":
                        ttk.Button(row, text="Choose…", command=lambda v=var: v.set(filedialog.askopenfilename() or v.get())).pack(side=LEFT, padx=4)
                    elif kind == "dir":
                        ttk.Button(row, text="Folder…", command=lambda v=var: v.set(filedialog.askdirectory() or v.get())).pack(side=LEFT, padx=4)
                vars_[name] = var
            ttk.Button(tab, text=f"Run {title.lower()}", command=lambda k=key, vs=vars_: self._run(k, vs)).pack(anchor="w", pady=8)

    def _say(self, text: str) -> None:
        self.out.configure(state="normal")
        self.out.insert(END, text + "\n")
        self.out.see(END)
        self.out.configure(state="disabled")
        self.log(text)

    def _run(self, key: str, vars_: dict) -> None:
        values = {k: (v.get() if not isinstance(v, BooleanVar) else bool(v.get())) for k, v in vars_.items()}
        for k, val in values.items():
            if isinstance(val, str) and val and k in ("out",) and not Path(val).is_absolute():
                values[k] = str(self.base / val)
        self._say(f"> {key} {values}")
        if key == "skilltree":   # Tk must stay on the main thread
            try:
                run_tool(key, values)
            except Exception as e:  # noqa: BLE001
                messagebox.showerror("PixelForge tools", str(e))
            return

        def work():
            try:
                r = run_tool(key, values)
                self.win.after(0, lambda: self._say("OK " + ", ".join(f"{k}={v}" for k, v in r.items() if k in ("png", "dir", "files", "json", "tres", "found", "installed", "gif", "mean_abs_diff"))))
                if r.get("gif"):
                    self.win.after(0, lambda: webbrowser.open(r["gif"]))
            except Exception as e:  # noqa: BLE001
                self.win.after(0, lambda: (self._say("ERROR " + str(e)), messagebox.showerror("PixelForge tools", str(e))))

        threading.Thread(target=work, daemon=True).start()
