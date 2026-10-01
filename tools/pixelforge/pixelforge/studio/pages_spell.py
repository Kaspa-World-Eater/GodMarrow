"""The spell designer as a page: layers on the left, the selected layer's knobs, a live looping preview, and the
bottom bar (Play / Stop, Randomise, Keep, Save as preset, Reset layer, Undo / Redo). Every knob is a field of the
same spell JSON the command line renders (pixelforge spell render x.spell.json)."""
from __future__ import annotations

import json
import random
import threading
from pathlib import Path

from PIL import Image

from . import theme as T
from .app import Page, game_dir
from .widgets import LabeledScale, Note, Tooltip, ZoomCanvas, tk, to_pil


class SpellPage(Page):
    key = "spell"
    title = "Spell designer"
    blurb = "Build a spell from layers of effects (fire + burst + embers, ring + rune + wisp…) with a live preview; Keep writes the strip the game plays. A painted effect joins as a layer of kind 'image'."

    def __init__(self, app):
        super().__init__(app)
        self.spell = None
        self.path = None
        self.out_dir = None
        self.frames: list = []
        self.photos: list = []
        self.sel = 0
        self.t = 0
        self.job = None
        self.dirty = False
        self.rendering = False
        self.loading = False
        self.undo_stack: list = []
        self.redo_stack: list = []
        self.playing = True

    def build(self) -> None:
        t = tk()
        from .. import spell as S
        from .. import vfx

        f = self.frame
        top = t.ttk.Frame(f, style="Tool.TFrame", padding=(8, 4))
        top.pack(side="top", fill="x")
        right = t.ttk.Frame(top, style="Tool.TFrame")
        right.pack(side="right")
        t.ttk.Label(top, text="Name", style="Tool.TLabel").pack(side="left")
        self.name = t.StringVar(value="fireball")
        e = t.ttk.Entry(top, textvariable=self.name, width=16)
        e.pack(side="left", padx=4)
        e.bind("<KeyRelease>", lambda ev: self.mark_dirty(rerender=False))
        t.ttk.Label(top, text="Start from", style="Tool.TLabel").pack(side="left", padx=(8, 2))
        self.preset = t.StringVar(value="fireball")
        t.ttk.Combobox(top, textvariable=self.preset, values=sorted(S.PRESETS), state="readonly", width=15).pack(side="left")
        t.ttk.Button(top, text="Load preset", command=self.load_preset, style="Tool.TButton").pack(side="left", padx=2)
        t.ttk.Button(top, text="Open…", command=self.open_file, style="Tool.TButton").pack(side="left")
        t.ttk.Button(right, text="↶ Undo", width=7, command=self.undo, style="Tool.TButton").pack(side="left")
        t.ttk.Button(right, text="↷ Redo", width=7, command=self.redo, style="Tool.TButton").pack(side="left", padx=(2, 8))
        t.ttk.Button(right, text="Save spell", command=self.save, style="Tool.TButton").pack(side="left", padx=2)
        b = t.ttk.Button(right, text="Keep (export)", command=self.export, style="Go.TButton")
        b.pack(side="left", padx=(6, 0))
        Tooltip(b, "Writes the strip and json the game's add-on plays (PFFx), plus a GIF to look at.")
        g = t.ttk.Frame(f, style="Tool.TFrame", padding=(8, 2))
        g.pack(side="top", fill="x")
        self.frames_n = t.IntVar(value=12)
        self.fps = t.DoubleVar(value=12.0)
        self.w = t.IntVar(value=96)
        self.h = t.IntVar(value=96)
        self.loop = t.BooleanVar(value=True)
        for label, var, width in (("Frames", self.frames_n, 5), ("fps", self.fps, 5), ("Width", self.w, 5), ("Height", self.h, 5)):
            t.ttk.Label(g, text=label, style="Tool.TLabel").pack(side="left", padx=(8, 2))
            en = t.ttk.Entry(g, textvariable=var, width=width)
            en.pack(side="left")
            en.bind("<Return>", lambda _e: self.mark_dirty())
            en.bind("<FocusOut>", lambda _e: self.mark_dirty())
        t.ttk.Checkbutton(g, text="Loops", variable=self.loop, command=self.mark_dirty, style="Card.TCheckbutton").pack(side="left", padx=8)
        t.ttk.Button(g, text="Apply", command=self.mark_dirty, style="Tool.TButton").pack(side="left")
        t.ttk.Label(g, text="Preview", style="Tool.TLabel").pack(side="left", padx=(16, 2))
        self.play_btn = t.ttk.Button(g, text="Pause", width=6, command=self.toggle_play, style="Tool.TButton")
        self.play_btn.pack(side="left")
        for label, mode in (("1x", 1), ("2x", 2), ("3x", 3), ("4x", 4), ("Fit", "fit")):
            t.ttk.Button(g, text=label, width=3, command=lambda m=mode: self.view.set_mode(m), style="Tool.TButton").pack(side="left", padx=1)
        t.ttk.Button(g, text="Randomise", command=self.randomise, style="Tool.TButton").pack(side="left", padx=(12, 2))
        t.ttk.Button(g, text="In the game", command=self.in_game, style="Tool.TButton").pack(side="left", padx=2)

        body = t.ttk.Frame(f)
        body.pack(fill="both", expand=True)
        left = t.ttk.Frame(body, padding=(8, 6), width=330)
        left.pack(side="left", fill="y")
        left.pack_propagate(False)
        t.ttk.Label(left, text="Layers (bottom first)", style="Sub.TLabel").pack(anchor="w")
        self.list = t.Listbox(left, height=6, exportselection=False, bg=T.FIELD, fg=T.BONE, selectbackground=T.TEAL_DK, selectforeground="#eafff8",
                              highlightthickness=0, relief="flat", font=T.FONT_S)
        self.list.pack(fill="x")
        self.list.bind("<<ListboxSelect>>", lambda e: self.select())
        row = t.ttk.Frame(left)
        row.pack(fill="x", pady=3)
        self.add_kind = t.StringVar(value="fire")
        t.ttk.Combobox(row, textvariable=self.add_kind, values=["image", *vfx.KINDS], state="readonly", width=9).pack(side="left")
        t.ttk.Button(row, text="Add", width=5, command=self.add_layer, style="Tool.TButton").pack(side="left", padx=2)
        t.ttk.Button(row, text="Remove", width=7, command=self.remove_layer, style="Tool.TButton").pack(side="left")
        row2 = t.ttk.Frame(left)
        row2.pack(fill="x")
        t.ttk.Button(row2, text="Up", width=4, command=lambda: self.move(-1), style="Tool.TButton").pack(side="left")
        t.ttk.Button(row2, text="Down", width=6, command=lambda: self.move(1), style="Tool.TButton").pack(side="left", padx=2)
        t.ttk.Button(row2, text="Copy", width=5, command=self.duplicate, style="Tool.TButton").pack(side="left")
        t.ttk.Button(row2, text="Reset", width=6, command=self.reset_layer, style="Tool.TButton").pack(side="left", padx=2)
        t.ttk.Label(left, text="Selected layer", style="Sub.TLabel").pack(anchor="w", pady=(8, 2))
        self.vars: dict = {}
        form = t.ttk.Frame(left)
        form.pack(fill="x")
        for key, kind in (("name", "text"), ("kind", "kind"), ("image", "file"), ("palette", "palette"), ("blend", "blend")):
            r = t.ttk.Frame(form)
            r.pack(fill="x", pady=1)
            t.ttk.Label(r, text=key, width=8, style="Small.TLabel").pack(side="left")
            v = t.StringVar()
            if kind == "text":
                en = t.ttk.Entry(r, textvariable=v, width=16)
                en.pack(side="left")
                en.bind("<KeyRelease>", lambda ev, k=key: self.set_prop(k))
            elif kind == "file":
                en = t.ttk.Entry(r, textvariable=v, width=12)
                en.pack(side="left")
                en.bind("<Return>", lambda ev, k=key: self.set_prop(k))
                t.ttk.Button(r, text="…", width=2, command=self.pick_image, style="Tool.TButton").pack(side="left", padx=2)
            else:
                values = ["image", *vfx.KINDS] if kind == "kind" else (sorted(vfx.PRESETS) if kind == "palette" else ["normal", "add"])
                cb = t.ttk.Combobox(r, textvariable=v, values=values, state="readonly", width=14)
                cb.pack(side="left")
                cb.bind("<<ComboboxSelected>>", lambda ev, k=key: self.set_prop(k))
            self.vars[key] = v
        self.scales: dict = {}
        for key, lo, hi, fmt in (("scale", 0.1, 4.0, "{:.2f}"), ("x", -96, 96, "{:+.0f}"), ("y", -96, 96, "{:+.0f}"), ("rotation", -180, 180, "{:+.0f}"),
                                 ("start", 0, 32, "{:.0f}"), ("speed", 0.1, 4.0, "{:.2f}"), ("opacity", 0.0, 1.0, "{:.2f}"), ("seed", 1, 99, "{:.0f}")):
            v = t.DoubleVar(value=1.0)
            self.vars[key] = v
            self.scales[key] = LabeledScale(form, key, v, lo, hi, command=lambda _v, k=key: self.set_prop(k), length=290, fmt=fmt, default=1.0)
            self.scales[key].pack(fill="x")
        r = t.ttk.Frame(form)
        r.pack(fill="x", pady=(4, 0))
        self.flip = t.BooleanVar()
        self.hidden = t.BooleanVar()
        t.ttk.Checkbutton(r, text="flip", variable=self.flip, command=lambda: self.set_prop("flip")).pack(side="left")
        t.ttk.Checkbutton(r, text="hide", variable=self.hidden, command=lambda: self.set_prop("hidden")).pack(side="left", padx=8)
        self.view = ZoomCanvas(body, height=400, bg="#202226")
        self.view.pack(side="left", fill="both", expand=True)
        self.note = Note(f, pady=(2, 4))
        self.note.label.pack_configure(padx=10)
        self.view.set_mode(3)

    def header_title(self) -> tuple[str, str]:
        return f"{self.title}: {self.spell['name'] if self.spell else ''}", self.blurb

    # ------------------------------------------------------------- loading
    def on_show(self, path: str | None = None, preset: str | None = None, out_dir: str | None = None, back=None, **_kw) -> None:
        from .. import spell as S

        if out_dir:
            self.out_dir = Path(out_dir)
        if self.out_dir is None:
            g = game_dir()
            self.out_dir = (g / "art" / "fx") if g else ((self.app.project.root / "fx") if self.app.project else Path.home() / "PixelForge" / "fx")
        if path and Path(path).exists():
            self.spell = S.load_spell(path)
            self.path = Path(path)
            self.after_load()
        elif preset or self.spell is None:
            self.spell = S.new_spell(preset or "fireball", preset or "fireball")
            self.path = self.out_dir / f"{self.spell['name']}.spell.json"
            self.after_load()
        self.app.set_header(*self.header_title())
        self.playing = True
        self.tick()

    def on_hide(self) -> None:
        self.stop()

    def after_load(self) -> None:
        sp = self.spell
        self.name.set(sp["name"])
        self.frames_n.set(int(sp["frames"]))
        self.fps.set(float(sp.get("fps", 12)))
        self.w.set(int(sp["size"][0]))
        self.h.set(int(sp["size"][1]))
        self.loop.set(bool(sp.get("loop", True)))
        self.fill_list()
        self.sel = 0
        self.list.selection_clear(0, "end")
        if sp["layers"]:
            self.list.selection_set(0)
        self.select()
        self.rerender()

    def on_drop(self, paths: list[str]) -> bool:
        for p in paths:
            if p.endswith(".spell.json"):
                self.on_show(path=p)
                return True
            if p.lower().endswith((".png", ".json")):
                self.push()
                from .. import spell as S

                self.spell["layers"].append({**S.LAYER_DEFAULTS, "kind": "image", "image": p, "name": Path(p).stem})
                self.fill_list()
                self.rerender()
                return True
        return False

    def open_file(self) -> None:
        from tkinter import filedialog

        p = filedialog.askopenfilename(title="Spell file", filetypes=[("Spell", "*.spell.json"), ("JSON", "*.json")])
        if p:
            self.on_show(path=p)

    def pick_image(self) -> None:
        from tkinter import filedialog

        p = filedialog.askopenfilename(title="Painted effect (a vfx json or a PNG)", filetypes=[("Effect", "*.json *.png")])
        if p:
            self.vars["image"].set(p)
            self.set_prop("image")

    def load_preset(self) -> None:
        from .. import spell as S

        self.push()
        self.spell = S.new_spell(self.name.get() or self.preset.get(), self.preset.get())
        self.after_load()
        self.app.set_header(*self.header_title())

    # --------------------------------------------------------------- layers
    def fill_list(self) -> None:
        self.list.delete(0, "end")
        for lyr in self.spell["layers"]:
            self.list.insert("end", f"{lyr.get('name') or lyr['kind']}  ({lyr['kind']}, {lyr.get('palette', 'lantern')})" + ("  hidden" if lyr.get("hidden") else ""))

    def select(self) -> None:
        from .. import spell as S

        sel = self.list.curselection()
        if sel:
            self.sel = sel[0]
        if not self.spell["layers"]:
            return
        self.sel = min(self.sel, len(self.spell["layers"]) - 1)
        lyr = {**S.LAYER_DEFAULTS, **self.spell["layers"][self.sel]}
        self.loading = True
        for k, v in self.vars.items():
            try:
                v.set(lyr.get(k, ""))
            except Exception:  # noqa: BLE001
                pass
        for k, sc in self.scales.items():
            sc.default = S.LAYER_DEFAULTS.get(k, 1.0)
            sc.refresh()
        self.flip.set(bool(lyr.get("flip")))
        self.hidden.set(bool(lyr.get("hidden")))
        self.loading = False

    def set_prop(self, key: str) -> None:
        if self.loading or not self.spell["layers"]:
            return
        lyr = self.spell["layers"][self.sel]
        if key == "flip":
            val = bool(self.flip.get())
        elif key == "hidden":
            val = bool(self.hidden.get())
        else:
            val = self.vars[key].get()
            if key in ("start", "seed"):
                val = int(round(float(val)))
            elif key not in ("name", "kind", "palette", "blend", "image"):
                val = round(float(val), 2)
        if key == "image" and val and not Path(str(val)).exists():
            return
        if lyr.get(key) == val:
            return
        self.push(coalesce=key)
        lyr[key] = val
        if key in ("name", "kind", "palette", "hidden"):
            i = self.sel
            self.fill_list()
            self.list.selection_set(i)
        self.mark_dirty()

    def add_layer(self) -> None:
        from .. import spell as S

        self.push()
        self.spell["layers"].append({**S.LAYER_DEFAULTS, "kind": self.add_kind.get(), "name": self.add_kind.get()})
        self.fill_list()
        self.list.selection_clear(0, "end")
        self.list.selection_set("end")
        self.select()
        self.mark_dirty()

    def remove_layer(self) -> None:
        if self.spell["layers"]:
            self.push()
            self.spell["layers"].pop(self.sel)
            self.fill_list()
            self.sel = max(0, self.sel - 1)
            if self.spell["layers"]:
                self.list.selection_set(self.sel)
                self.select()
            self.mark_dirty()

    def duplicate(self) -> None:
        if self.spell["layers"]:
            self.push()
            self.spell["layers"].insert(self.sel + 1, dict(self.spell["layers"][self.sel]))
            self.fill_list()
            self.list.selection_clear(0, "end")
            self.list.selection_set(self.sel + 1)
            self.select()
            self.mark_dirty()

    def move(self, d: int) -> None:
        L = self.spell["layers"]
        j = self.sel + d
        if 0 <= j < len(L):
            self.push()
            L[self.sel], L[j] = L[j], L[self.sel]
            self.sel = j
            self.fill_list()
            self.list.selection_clear(0, "end")
            self.list.selection_set(j)
            self.mark_dirty()

    def reset_layer(self) -> None:
        from .. import spell as S

        if self.spell["layers"]:
            self.push()
            lyr = self.spell["layers"][self.sel]
            keep = {k: lyr[k] for k in ("kind", "name", "image") if k in lyr}
            lyr.clear()
            lyr.update({**S.LAYER_DEFAULTS, **keep})
            self.select()
            self.mark_dirty()

    def randomise(self) -> None:
        self.push()
        for lyr in self.spell["layers"]:
            lyr["seed"] = random.randint(1, 99)
        self.select()
        self.mark_dirty()
        self.note.say("New seeds on every layer.")

    # ---------------------------------------------------------------- undo
    def push(self, coalesce: str | None = None) -> None:
        snap = json.loads(json.dumps(self.spell))
        if coalesce and self.undo_stack and self.undo_stack[-1][1] == coalesce:
            return
        self.undo_stack.append((snap, coalesce))
        if len(self.undo_stack) > 40:
            self.undo_stack.pop(0)
        self.redo_stack.clear()

    def undo(self) -> None:
        if not self.undo_stack:
            return
        self.redo_stack.append((json.loads(json.dumps(self.spell)), None))
        self.spell = self.undo_stack.pop()[0]
        self.after_load()

    def redo(self) -> None:
        if not self.redo_stack:
            return
        self.undo_stack.append((json.loads(json.dumps(self.spell)), None))
        self.spell = self.redo_stack.pop()[0]
        self.after_load()

    # ------------------------------------------------------- render / play
    def sync(self) -> None:
        try:
            self.spell["name"] = self.name.get().strip() or self.spell["name"]
            self.spell["frames"] = max(1, int(self.frames_n.get()))
            self.spell["fps"] = float(self.fps.get())
            self.spell["size"] = [max(8, int(self.w.get())), max(8, int(self.h.get()))]
            self.spell["loop"] = bool(self.loop.get())
        except Exception:  # noqa: BLE001
            pass

    def mark_dirty(self, rerender: bool = True) -> None:
        self.sync()
        if rerender:
            self.dirty = True
            self.frame.after_idle(self.rerender)

    def rerender(self) -> None:
        """Render on a worker thread; a change while rendering queues one more render."""
        from .. import spell as S

        if self.spell is None:
            return
        if self.rendering:
            self.dirty = True
            return
        self.sync()
        self.dirty = False
        self.rendering = True
        snap = json.loads(json.dumps(self.spell))
        self.note.say("Rendering…")

        def work():
            try:
                frames = S.render_spell(snap)
                err = None
            except Exception as e:  # noqa: BLE001
                frames, err = [], str(e)
            self.app.root.after(0, lambda: self.rendered(frames, err, snap))

        threading.Thread(target=work, daemon=True).start()

    def rendered(self, frames, err, snap) -> None:
        self.rendering = False
        if err:
            self.note.warn(f"Render error: {err}")
        else:
            self.frames = [to_pil(f) for f in frames]
            self.note.say(f"{len(self.frames)} frames, {snap['size'][0]}x{snap['size'][1]} px, {len(snap['layers'])} layer(s)")
        if self.dirty:
            self.rerender()

    def toggle_play(self) -> None:
        self.playing = not self.playing
        self.play_btn.configure(text="Pause" if self.playing else "Play")
        if self.playing:
            self.tick()
        else:
            self.stop()

    def tick(self) -> None:
        self.stop()
        if self.frames and self.playing:
            self.view.set_image(self.frames[self.t % len(self.frames)], keep_zoom=True)
            self.t += 1
        if self.playing:
            try:
                fps = max(1.0, float(self.fps.get()))
            except Exception:  # noqa: BLE001
                fps = 12.0
            self.job = self.frame.after(int(1000 / fps), self.tick)

    def stop(self) -> None:
        if self.job is not None:
            try:
                self.frame.after_cancel(self.job)
            except Exception:  # noqa: BLE001
                pass
            self.job = None

    def zoom(self, delta: int) -> None:
        self.view.zoom_in() if delta > 0 else self.view.zoom_out()

    # ------------------------------------------------------------ save/keep
    def save(self) -> None:
        from .. import spell as S

        self.sync()
        self.out_dir.mkdir(parents=True, exist_ok=True)
        self.path = self.out_dir / f"{self.spell['name']}.spell.json"
        S.save_spell(self.spell, self.path)
        self.note.good(f"Saved {self.path}")
        self.app.set_header(*self.header_title())

    def export(self) -> None:
        from .. import spell as S

        self.sync()
        snap = json.loads(json.dumps(self.spell))
        out = self.out_dir

        def work():
            out.mkdir(parents=True, exist_ok=True)
            S.save_spell(snap, out / f"{snap['name']}.spell.json")
            return S.export_spell(snap, out, gif=True)

        self.app._run(work, after=lambda r: self.note.good(f"Kept {r['png']} ({r['frames']} frames) and {r['gif']}. The game plays it by name: --fx={snap['name']}."), what="Exporting the spell…")

    def in_game(self) -> None:
        if self.spell is None:
            return
        name = self.spell["name"]
        png = self.out_dir / f"{name}.png"
        if not png.exists():
            self.note.warn("Keep (export) the spell first; then it can play in the game.")
            return
        self.app.show("game", fx=[name])
