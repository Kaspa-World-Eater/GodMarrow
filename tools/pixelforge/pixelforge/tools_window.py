"""The Studio's Tools window: every non-character tool as a plain form (effects, props, icons, portraits,
tiles, UI frames, sounds, recolour, compare, skill trees, Godot add-on). One tab each, one Run button each.
Forms are built from a small spec so a new tool is ten lines."""

from __future__ import annotations

import json
import threading
import webbrowser
from pathlib import Path
from tkinter import BOTH, END, LEFT, X, BooleanVar, StringVar, Toplevel, filedialog, messagebox
from tkinter import ttk
from tkinter.scrolledtext import ScrolledText

# field kinds: file, dir, text, int, float, choice, check
TOOLS = [
    ("Effects", "Looping spell, aura, fire, smoke and impact sheets. Glow is added only to the magic kinds.",
     [("kind", "choice", "fire", ["fire", "smoke", "wisp", "burst", "embers", "ring", "bolt", "slash", "circle", "cloud", "shards", "pillar", "decal", "drip", "flash", "ward", "vortex", "rain", "ashfall", "fog", "lightning", "swarm", "chain", "rune", "pool", "cookie", "bone_spear", "teeth", "ice_bolt", "fire_bolt"]),
      ("name", "text", "my_effect", None), ("out", "dir", "art/fx", None),
      ("palette", "choice", "auto", ["auto", "lantern", "wisp", "silver", "miasma", "paper", "poison", "bone", "iron", "amber", "black", "frost", "blood", "smoke"]),
      ("frames", "int", 8, None), ("fps", "float", 10.0, None), ("rotations", "int", 0, None), ("gif", "check", True, None)],
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
    ("Music", "The score: looping cues for every act's camp, wilds and depths, the bosses and the title. Pick a cue, set a length, Run; "
               "the picture is its waveform and spectrogram. 'seed' gives the same place another tune; 'knobs' overrides e.g. bpm=90 sc=phr root=45. "
               "'sheet' writes a JSON of every knob to edit and render with.",
     [("cue", "choice", "a1_town", ["all", "act", "sheet", "a1_town", "a1_wild", "a1_deep", "a2_town", "a2_wild", "a2_deep", "a3_town", "a3_wild", "a3_deep",
                                    "a4_town", "a4_wild", "a4_deep", "a5_town", "a5_wild", "a5_deep", "boss1", "boss2", "boss3", "boss4", "boss5", "title"]),
      ("out", "dir", "art/music", None), ("seconds", "float", 120.0, None), ("seed", "text", "", None), ("act", "int", 1, None),
      ("knobs", "text", "", None), ("sheet", "file", "", None), ("format", "choice", "wav", ["wav", "ogg", "both"]), ("play", "check", True, None)],
     "music"),
    ("Describe it", "Say what you want in plain words and get a draft to adjust: a spell ('a wisp lantern spell, pale blue, slow, with embers'), a skin edit "
                    "('make the left eye teal with a pale glow', with the picture chosen), a Midjourney prompt, or a music cue. The draft opens in the right editor.",
     [("text", "text", "a wisp lantern spell, pale blue, slow, with embers", None), ("image", "file", "", None), ("out", "dir", "art/fx", None)],
     "describe"),
    ("Preview in game", "See it in the game: launches Godot on the moor with a character skin, effects playing at the hero, or the attachments from the effects editor.",
     [("game", "dir", "", None), ("skin", "text", "", None), ("fx", "text", "", None), ("attach", "check", False, None), ("screenshot", "check", False, None)],
     "game_preview"),
    ("Spell designer", "Build a spell from layers of effects (fire + burst + embers, ring + rune + wisp...) with a live preview; export the strip the game plays.",
     [("start_from", "choice", "fireball", ["fireball", "ward", "soul_drain", "bone_shatter", "lightning_strike"]), ("out", "dir", "art/fx", None)],
     "spell_designer"),
    ("Skin editor", "A paint-program toolbar over a sprite, atlas or cutout: pick + recolour, brush, glow, erase, restore, smooth, named regions. Every stroke is an op an AI can replay.",
     [("image", "file", "", None)],
     "skin_editor"),
    ("Colour editor", "Click a colour on a sprite, atlas or cutout, widen the range, give it a new colour: shading stays, only the colour changes. Every frame of an atlas at once.",
     [("image", "file", "", None)],
     "color_editor"),
    ("Effects editor", "Drag an effect (smoke, wisp, embers, glow…) onto a point of an exported sprite set, per view; saved into the set and spawned by the Godot add-on.",
     [("sprite_json", "file", "", None), ("fx_dir", "dir", "art/fx", None)],
     "fx_editor"),
    ("Recolour", "Tint a finished sprite or atlas (champion / unique variants) without re-rendering.",
     [("image", "file", "", None), ("out", "text", "recoloured.png", None), ("hue", "float", 0.0, None), ("lightness", "float", 1.0, None), ("chroma", "float", 1.0, None), ("map", "text", "", None)],
     "recolor"),
    ("Compare", "Before / after strip and GIF for two images or two frame folders.",
     [("a", "file", "", None), ("b", "file", "", None), ("out", "text", "compare.png", None), ("zoom", "int", 2, None)],
     "compare"),
    ("World prompts", "Midjourney prompts for objects, buildings, trees, ground, effects, UI, icons and portraits, locked to the heroes' style.",
     [("kind", "choice", "object", ["object", "building", "tree", "ground", "effect", "ui", "icons", "portrait"]), ("description", "text", "a weathered stone gravestone with a worn bone sigil", None),
      ("sref", "text", "", None)],
     "worldprompt"),
    ("Painted object", "A painted object / building / tree sheet becomes a carved, filmed, pixelated prop the hero way.",
     [("sheet", "file", "", None), ("name", "text", "gravestone", None), ("out", "dir", "art/objects", None), ("height", "float", 1.2, None),
      ("views", "choice", "auto", ["auto", "2", "3", "4"]), ("top", "file", "", None), ("canopy", "check", False, None), ("game_objects", "file", "", None)],
     "object"),
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
        if v.get("palette") == "auto":
            v = {**v, "palette": None}
        return make_vfx(v["kind"], v["name"], v["out"], frames=int(v["frames"]), fps=float(v["fps"]), palette=v["palette"], gif=bool(v["gif"]), rotations=int(v.get("rotations", 0) or 0))
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
    if key == "music":
        from . import music
        if v["cue"] == "sheet":
            return music.write_sheet(str(Path(v["out"]) / "music_sheet.json"))
        r = music.make_music(v["cue"], v["out"], seconds=float(v["seconds"]), seed=int(v["seed"]) if str(v["seed"]).strip() else None,
                             overrides=music.parse_overrides(str(v["knobs"]).split()), act=int(v["act"]), sheet=v["sheet"] or None, fmt=v["format"])
        if v.get("play") and v["cue"] not in ("all", "act"):
            wav = next((f for f in r["files"] if f.endswith(".wav")), None)
            if wav:
                r["played"] = music.play(wav)
        return r
    if key == "recolor":
        from .recolor import recolor_file
        mapping = dict(p.split("=", 1) for p in v["map"].split(",")) if v["map"].strip() else None
        return recolor_file(v["image"], v["out"], mapping=mapping, hue=float(v["hue"]), lightness=float(v["lightness"]), chroma=float(v["chroma"]))
    if key == "compare":
        from .compare import compare
        return compare(v["a"], v["b"], v["out"], zoom=int(v["zoom"]))
    if key == "worldprompt":
        from .world_prompts import build_world_prompt
        return {"ok": True, "prompt": build_world_prompt(v["kind"], v["description"], v["sref"])}
    if key == "object":
        from .object3d import make_object
        return make_object(v["sheet"], v["name"], v["out"], height=float(v["height"]), views=None if v["views"] == "auto" else int(v["views"]), game_objects=v["game_objects"] or None,
                           top=v.get("top") or None, canopy=bool(v.get("canopy")))
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


GROUPS = [("Start", ["Describe it", "Preview in game"]), ("Art", ["Effects", "Spell designer", "Effects editor", "Skin editor", "Colour editor", "Prop / tree", "Painted object", "Item icons", "Portrait", "Ground tiles", "UI frame", "Recolour", "Compare", "World prompts"]),
          ("Audio", ["Sounds", "Music"]),
          ("Game", ["Skill trees", "Godot add-on"])]


class ToolsWindow:
    """One window for every tool that is not the character pipeline: a list on the left (grouped Art / Audio / Game),
    the chosen tool's form on the right, a log below. Forms are built from TOOLS, so a new tool is ten lines."""

    def __init__(self, master, log=None, base_dir: str | None = None):
        self.log = log or (lambda m: None)
        self.base = Path(base_dir) if base_dir else Path.cwd()
        self.win = Toplevel(master)
        self.win.title("PixelForge tools")
        self.win.geometry("1100x680")
        self.win.minsize(900, 560)
        body = ttk.Panedwindow(self.win, orient="horizontal")
        body.pack(fill=BOTH, expand=True, padx=6, pady=6)
        left = ttk.Frame(body, padding=4)
        body.add(left, weight=0)
        self.tree = ttk.Treeview(left, show="tree", selectmode="browse", height=22)
        self.tree.column("#0", width=200)
        by_title = {t[0]: t for t in TOOLS}
        for group, names in GROUPS:
            gid = self.tree.insert("", END, text=group, open=True)
            for n in names:
                if n in by_title:
                    self.tree.insert(gid, END, iid=n, text=n)
        for t in TOOLS:   # anything not in a group still shows
            if not self.tree.exists(t[0]):
                self.tree.insert("", END, iid=t[0], text=t[0])
        self.tree.pack(fill=BOTH, expand=True)
        self.tree.bind("<<TreeviewSelect>>", lambda e: self._show())
        right = ttk.Frame(body, padding=8)
        body.add(right, weight=1)
        self.form = ttk.Frame(right)
        self.form.pack(fill=BOTH, expand=True)
        self.out = ScrolledText(right, height=7, state="disabled", font=("Consolas", 9))
        self.out.pack(fill=X, pady=(6, 0))
        self.by_title = by_title
        self.tree.selection_set(TOOLS[0][0])

    def _show(self) -> None:
        sel = self.tree.selection()
        if not sel or sel[0] not in self.by_title:
            return
        for w in self.form.winfo_children():
            w.destroy()
        title, blurb, fields, key = self.by_title[sel[0]]
        ttk.Label(self.form, text=title, style="Head.TLabel").pack(anchor="w")
        ttk.Label(self.form, text=blurb, wraplength=760, justify=LEFT, style="Dim.TLabel").pack(anchor="w", pady=(2, 10))
        vars_ = {}
        for name, kind, default, choices in fields:
            row = ttk.Frame(self.form)
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
                ttk.Entry(row, textvariable=var, width=48).pack(side=LEFT)
                if kind == "file":
                    ttk.Button(row, text="Choose…", command=lambda v=var: v.set(filedialog.askopenfilename() or v.get())).pack(side=LEFT, padx=4)
                elif kind == "dir":
                    ttk.Button(row, text="Folder…", command=lambda v=var: v.set(filedialog.askdirectory() or v.get())).pack(side=LEFT, padx=4)
            vars_[name] = var
        ttk.Button(self.form, text=f"Run {title.lower()}", style="Go.TButton", command=lambda k=key, vs=vars_: self._run(k, vs)).pack(anchor="w", pady=10)

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
        if key == "describe":
            from . import describe as D
            d = D.draft(values["text"], image=values["image"] or None)
            self._say("I read: " + "; ".join(d["read"]))
            if d["what"] == "spell":
                from . import spell as S
                from .spell_designer import open_spell_designer
                path = S.save_spell(d["spell"], Path(values["out"]) / f"{d['spell']['name']}.spell.json")
                open_spell_designer(self.win, path, values["out"], on_save=lambda r: self._say("exported " + r["png"]))
            elif d["what"] == "skin":
                if not values["image"]:
                    self._say("ops: " + json.dumps(d["ops"]) + "  (choose the picture to locate the parts and open the skin editor)")
                else:
                    from .skin_editor import open_skin_editor
                    ed = open_skin_editor(self.win, values["image"], on_save=lambda: self._say("saved " + values["image"]))
                    for op in d["ops"]:
                        ed._do(op)
                    ed.pick_label.set(f"Applied {len(d['ops'])} drafted op(s): adjust, Undo, or Save.")
            elif d["what"] == "prompt":
                self.win.clipboard_clear(); self.win.clipboard_append(d["prompt"])
                self._say(d["prompt"] + "\n(copied to the clipboard)")
            else:
                self._say(f"music: cue {d['cue']}, knobs {d['knobs']}; rendering…")
                from . import music
                r = music.make_music(d["cue"], values["out"], seconds=60, overrides=d["knobs"])
                self._say("rendered " + ", ".join(r["files"]))
                if r["files"]:
                    music.play(next((f for f in r["files"] if f.endswith(".wav")), r["files"][0]))
            return
        if key == "game_preview":
            from .game_preview import preview_in_game
            shot = str(self.base / "preview_shot.png") if values.get("screenshot") else None
            try:
                r = preview_in_game(values["game"] or None, skin=values["skin"] or None, fx=values["fx"].split(",") if values["fx"] else None,
                                    attach=bool(values["attach"]), shot=shot, log=self._say)
            except Exception as e:  # noqa: BLE001
                messagebox.showerror("Preview in game", str(e))
                return
            self._say("launched " + " ".join(r["command"][-6:]) if not shot else ("screenshot " + str(r.get("png") or r.get("error"))))
            if shot and r.get("png"):
                webbrowser.open(r["png"])
            return
        if key == "spell_designer":
            from .spell_designer import open_spell_designer
            open_spell_designer(self.win, values["start_from"], values["out"], on_save=lambda r: self._say("exported " + r["png"]))
            return
        if key == "skin_editor":
            from .skin_editor import open_skin_editor
            open_skin_editor(self.win, values["image"], on_save=lambda: self._say("saved " + values["image"]))
            return
        if key == "color_editor":   # windows open on the main thread
            from .color_editor import open_color_editor
            open_color_editor(self.win, values["image"], on_save=lambda: self._say("saved " + values["image"]))
            return
        if key == "fx_editor":
            from .fx_editor import open_fx_editor
            open_fx_editor(self.win, values["sprite_json"], values["fx_dir"], on_save=lambda r: self._say(f"saved {r['attachments']} attachment(s)"))
            return
        if key == "skilltree":   # Tk must stay on the main thread
            try:
                run_tool(key, values)
            except Exception as e:  # noqa: BLE001
                messagebox.showerror("PixelForge tools", str(e))
            return

        def work():
            try:
                r = run_tool(key, values)
                self.win.after(0, lambda: self._say("OK " + ", ".join(f"{k}={v}" for k, v in r.items() if k in ("png", "dir", "files", "json", "tres", "found", "installed", "gif", "mean_abs_diff", "prompt", "sheet", "notes", "played"))))
                if r.get("prompt"):
                    self.win.after(0, lambda: (self.win.clipboard_clear(), self.win.clipboard_append(r["prompt"]), self._say("(copied to the clipboard)")))
                if r.get("gif"):
                    self.win.after(0, lambda: webbrowser.open(r["gif"]))
            except Exception as e:  # noqa: BLE001
                self.win.after(0, lambda: (self._say("ERROR " + str(e)), messagebox.showerror("PixelForge tools", str(e))))

        threading.Thread(target=work, daemon=True).start()
