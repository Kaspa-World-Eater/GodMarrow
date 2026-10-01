"""The spell designer window: layers on the left, the selected layer's knobs, a live looping preview.

    open_spell_designer(master, "art/fx/fireball.spell.json")   # or a preset name to start from
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from . import spell as S
from . import vfx


class SpellDesigner:
    def __init__(self, master, path_or_preset: str | Path = "fireball", out_dir: str | Path = "art/fx", on_save=None):
        global BOTH, END, LEFT, RIGHT, X, Y, BooleanVar, Canvas, DoubleVar, IntVar, Listbox, StringVar, Toplevel, filedialog, messagebox, ttk, ImageTk
        from tkinter import BOTH, END, LEFT, RIGHT, X, Y, BooleanVar, Canvas, DoubleVar, IntVar, Listbox, StringVar, Toplevel, filedialog, messagebox  # noqa: PLW0603
        from tkinter import ttk
        from PIL import ImageTk  # noqa: PLW0603

        self.out_dir = Path(out_dir)
        self.on_save = on_save
        p = Path(str(path_or_preset))
        if p.exists():
            self.spell = S.load_spell(p)
            self.path = p
        else:
            self.spell = S.new_spell(str(path_or_preset), str(path_or_preset))
            self.path = self.out_dir / f"{self.spell['name']}.spell.json"
        self.frames: list = []
        self.sel = 0
        self.job = None
        self.t = 0
        self.dirty = True

        self.win = Toplevel(master)
        self.win.configure(bg="#1b1e24")
        self.win.title(f"Spell designer: {self.spell['name']}")
        top = ttk.Frame(self.win, padding=6)
        top.pack(fill=X)
        ttk.Label(top, text="Name").pack(side=LEFT)
        self.name = StringVar(value=self.spell["name"])
        ttk.Entry(top, textvariable=self.name, width=16).pack(side=LEFT, padx=4)
        ttk.Label(top, text="Start from").pack(side=LEFT, padx=(8, 2))
        self.preset = StringVar(value="fireball")
        ttk.Combobox(top, textvariable=self.preset, values=sorted(S.PRESETS), state="readonly", width=14).pack(side=LEFT)
        ttk.Button(top, text="Load preset", command=self.load_preset).pack(side=LEFT, padx=4)
        ttk.Button(top, text="Open…", command=self.open_file).pack(side=LEFT)
        ttk.Button(top, text="Export (png + json + gif)", command=self.export, style="Go.TButton").pack(side=RIGHT)
        ttk.Button(top, text="Save spell", command=self.save).pack(side=RIGHT, padx=4)

        g = ttk.Frame(self.win, padding=(6, 0))
        g.pack(fill=X)
        self.frames_n = IntVar(value=int(self.spell["frames"]))
        self.fps = DoubleVar(value=float(self.spell.get("fps", 12)))
        self.w = IntVar(value=int(self.spell["size"][0]))
        self.h = IntVar(value=int(self.spell["size"][1]))
        self.loop = BooleanVar(value=bool(self.spell.get("loop", True)))
        for label, var, width in (("Frames", self.frames_n, 5), ("fps", self.fps, 5), ("Width", self.w, 5), ("Height", self.h, 5)):
            ttk.Label(g, text=label).pack(side=LEFT, padx=(8, 2))
            e = ttk.Entry(g, textvariable=var, width=width)
            e.pack(side=LEFT)
            e.bind("<Return>", lambda _e: self.rerender())
        ttk.Checkbutton(g, text="Loops", variable=self.loop, command=self.rerender).pack(side=LEFT, padx=8)
        ttk.Button(g, text="Apply", command=self.rerender).pack(side=LEFT)

        body = ttk.Frame(self.win)
        body.pack(fill=BOTH, expand=True)
        left = ttk.Frame(body, padding=6)
        left.pack(side=LEFT, fill=Y)
        ttk.Label(left, text="Layers (bottom first)").pack(anchor="w")
        self.list = Listbox(left, height=10, width=26, exportselection=False, bg="#23272f", fg="#e8e2d2", selectbackground="#1f4a46",
                            selectforeground="#eafff8", highlightthickness=0, relief="flat", font=("Segoe UI", 10))
        self.list.pack(fill=X)
        self.list.bind("<<ListboxSelect>>", lambda e: self.select())
        row = ttk.Frame(left)
        row.pack(fill=X, pady=4)
        self.add_kind = StringVar(value="fire")
        ttk.Combobox(row, textvariable=self.add_kind, values=list(vfx.KINDS), state="readonly", width=10).pack(side=LEFT)
        ttk.Button(row, text="+ Add", command=self.add_layer).pack(side=LEFT, padx=2)
        ttk.Button(row, text="Remove", command=self.remove_layer).pack(side=LEFT)
        row2 = ttk.Frame(left)
        row2.pack(fill=X)
        ttk.Button(row2, text="Up", command=lambda: self.move(-1)).pack(side=LEFT)
        ttk.Button(row2, text="Down", command=lambda: self.move(1)).pack(side=LEFT, padx=2)
        ttk.Button(row2, text="Duplicate", command=self.duplicate).pack(side=LEFT)

        ttk.Label(left, text="Selected layer", style="Head.TLabel").pack(anchor="w", pady=(10, 2))
        self.vars = {}
        form = ttk.Frame(left)
        form.pack(fill=X)
        spec = [("name", "text"), ("kind", "kind"), ("palette", "palette"), ("scale", 0.1, 4.0), ("x", -96, 96), ("y", -96, 96), ("rotation", -180, 180),
                ("start", 0, 32), ("speed", 0.1, 4.0), ("opacity", 0.0, 1.0), ("blend", "blend"), ("seed", 1, 99)]
        for i, item in enumerate(spec):
            key = item[0]
            ttk.Label(form, text=key).grid(row=i, column=0, sticky="w", pady=1)
            if item[1] == "text":
                v = StringVar(); ttk.Entry(form, textvariable=v, width=14).grid(row=i, column=1, sticky="w")
                v.trace_add("write", lambda *_, k=key: self.set_prop(k))
            elif item[1] == "kind":
                v = StringVar(); ttk.Combobox(form, textvariable=v, values=list(vfx.KINDS), state="readonly", width=12).grid(row=i, column=1, sticky="w")
                v.trace_add("write", lambda *_, k=key: self.set_prop(k))
            elif item[1] == "palette":
                v = StringVar(); ttk.Combobox(form, textvariable=v, values=sorted(vfx.PRESETS), state="readonly", width=12).grid(row=i, column=1, sticky="w")
                v.trace_add("write", lambda *_, k=key: self.set_prop(k))
            elif item[1] == "blend":
                v = StringVar(); ttk.Combobox(form, textvariable=v, values=["normal", "add"], state="readonly", width=12).grid(row=i, column=1, sticky="w")
                v.trace_add("write", lambda *_, k=key: self.set_prop(k))
            else:
                v = DoubleVar()
                ttk.Scale(form, from_=item[1], to=item[2], variable=v, orient="horizontal", length=130, command=lambda _v, k=key: self.set_prop(k)).grid(row=i, column=1, sticky="w")
            self.vars[key] = v
        self.flip = BooleanVar(); ttk.Checkbutton(form, text="flip", variable=self.flip, command=lambda: self.set_prop("flip")).grid(row=len(spec), column=0, sticky="w")
        self.hidden = BooleanVar(); ttk.Checkbutton(form, text="hide", variable=self.hidden, command=lambda: self.set_prop("hidden")).grid(row=len(spec), column=1, sticky="w")
        self.loading = False

        right = ttk.Frame(body, padding=6)
        right.pack(side=LEFT, fill=BOTH, expand=True)
        self.canvas = Canvas(right, bg="#202226", highlightthickness=0, width=520, height=420)
        self.canvas.pack(fill=BOTH, expand=True)
        self.status = ttk.Label(right, text="", foreground="#888")
        self.status.pack(anchor="w")
        self.photos = []
        self.fill_list()
        self.list.selection_set(0)
        self.select()
        self.rerender()
        self.tick()

    # ------------------------------------------------------------- layers
    def fill_list(self) -> None:
        self.list.delete(0, END)
        for lyr in self.spell["layers"]:
            self.list.insert(END, f"{lyr.get('name') or lyr['kind']}  ({lyr['kind']}, {lyr.get('palette', 'lantern')})")

    def select(self) -> None:
        sel = self.list.curselection()
        if not sel:
            return
        self.sel = sel[0]
        lyr = {**S.LAYER_DEFAULTS, **self.spell["layers"][self.sel]}
        self.loading = True
        for k, v in self.vars.items():
            try:
                v.set(lyr[k])
            except Exception:  # noqa: BLE001
                pass
        self.flip.set(bool(lyr.get("flip"))); self.hidden.set(bool(lyr.get("hidden")))
        self.loading = False

    def set_prop(self, key: str) -> None:
        if self.loading or not self.spell["layers"]:
            return
        lyr = self.spell["layers"][self.sel]
        if key == "flip":
            lyr["flip"] = bool(self.flip.get())
        elif key == "hidden":
            lyr["hidden"] = bool(self.hidden.get())
        else:
            val = self.vars[key].get()
            if key in ("start", "seed"):
                val = int(round(float(val)))
            elif key not in ("name", "kind", "palette", "blend"):
                val = round(float(val), 2)
            lyr[key] = val
        if key in ("name", "kind", "palette"):
            i = self.sel
            self.fill_list()
            self.list.selection_set(i)
        self.dirty = True
        self.win.after_idle(self.rerender_if_dirty)

    def add_layer(self) -> None:
        self.spell["layers"].append({**S.LAYER_DEFAULTS, "kind": self.add_kind.get(), "name": self.add_kind.get()})
        self.fill_list(); self.list.selection_clear(0, END); self.list.selection_set(END); self.select(); self.rerender()

    def remove_layer(self) -> None:
        if self.spell["layers"]:
            self.spell["layers"].pop(self.sel)
            self.fill_list(); self.sel = max(0, self.sel - 1)
            if self.spell["layers"]:
                self.list.selection_set(self.sel); self.select()
            self.rerender()

    def duplicate(self) -> None:
        if self.spell["layers"]:
            self.spell["layers"].insert(self.sel + 1, dict(self.spell["layers"][self.sel]))
            self.fill_list(); self.list.selection_set(self.sel + 1); self.select(); self.rerender()

    def move(self, d: int) -> None:
        L = self.spell["layers"]
        j = self.sel + d
        if 0 <= j < len(L):
            L[self.sel], L[j] = L[j], L[self.sel]
            self.sel = j
            self.fill_list(); self.list.selection_set(j); self.rerender()

    def load_preset(self) -> None:
        self.spell = S.new_spell(self.name.get() or self.preset.get(), self.preset.get())
        self.frames_n.set(self.spell["frames"]); self.fps.set(self.spell.get("fps", 12)); self.w.set(self.spell["size"][0]); self.h.set(self.spell["size"][1]); self.loop.set(self.spell.get("loop", True))
        self.fill_list(); self.list.selection_set(0); self.select(); self.rerender()

    def open_file(self) -> None:
        p = filedialog.askopenfilename(title="Spell file", filetypes=[("Spell", "*.spell.json")])
        if p:
            self.spell = S.load_spell(p); self.path = Path(p); self.name.set(self.spell["name"])
            self.frames_n.set(self.spell["frames"]); self.fps.set(self.spell.get("fps", 12)); self.w.set(self.spell["size"][0]); self.h.set(self.spell["size"][1])
            self.fill_list(); self.list.selection_set(0); self.select(); self.rerender()

    # ------------------------------------------------------------- render / play
    def sync(self) -> None:
        self.spell["name"] = self.name.get().strip() or self.spell["name"]
        self.spell["frames"] = max(1, int(self.frames_n.get())); self.spell["fps"] = float(self.fps.get())
        self.spell["size"] = [max(8, int(self.w.get())), max(8, int(self.h.get()))]; self.spell["loop"] = bool(self.loop.get())

    def rerender_if_dirty(self) -> None:
        if self.dirty:
            self.rerender()

    def rerender(self) -> None:
        self.sync()
        self.dirty = False
        try:
            self.frames = S.render_spell(self.spell)
        except Exception as e:  # noqa: BLE001
            self.status.configure(text=f"render error: {e}")
            return
        z = max(1, min(6, int(400 / max(self.spell["size"][1], 1))))
        self.photos = []
        for f in self.frames:
            im = Image.fromarray(f, "RGBA")
            bg = Image.new("RGBA", im.size, (32, 34, 38, 255))
            im = Image.alpha_composite(bg, im).resize((im.width * z, im.height * z), Image.NEAREST)
            self.photos.append(ImageTk.PhotoImage(im))
        self.status.configure(text=f"{len(self.frames)} frames, {self.spell['size'][0]}x{self.spell['size'][1]} px, {len(self.spell['layers'])} layers, shown at {z}x")

    def tick(self) -> None:
        if self.photos:
            self.canvas.delete("all")
            ph = self.photos[self.t % len(self.photos)]
            self.canvas.create_image(self.canvas.winfo_width() // 2, self.canvas.winfo_height() // 2, image=ph)
            self.t += 1
        self.job = self.win.after(int(1000 / max(float(self.fps.get() or 12), 1)), self.tick)

    def save(self) -> None:
        self.sync()
        self.path = self.out_dir / f"{self.spell['name']}.spell.json"
        S.save_spell(self.spell, self.path)
        self.status.configure(text=f"Saved {self.path}")

    def export(self) -> None:
        self.sync()
        r = S.export_spell(self.spell, self.out_dir, gif=True)
        self.status.configure(text=f"Exported {r['png']} ({r['frames']} frames), GIF {r['gif']}")
        if self.on_save:
            self.on_save(r)


def open_spell_designer(master, path_or_preset="fireball", out_dir="art/fx", on_save=None) -> SpellDesigner:
    return SpellDesigner(master, path_or_preset, out_dir, on_save)
