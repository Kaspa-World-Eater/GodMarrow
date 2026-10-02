"""Effects on a sprite: drag an effect from the list onto the exported sprite ("pale glowing smoke on this eye"),
per view or copied to all views; preview the idle clip with the effects playing; Save writes the attachments into
the sprite set's JSON and renders each effect's sheet, which the Godot add-on (PFFx.spawn_attachments) picks up.
"""
from __future__ import annotations

import threading
from pathlib import Path

from PIL import Image

from . import theme as T
from .app import Page, game_dir
from .editor_core import SpriteSetDoc
from .widgets import LabeledScale, Note, Tooltip, ZoomCanvas, tk, to_pil


class FxPage(Page):
    key = "fx"
    title = "Effects on a sprite"
    blurb = "Drag an effect from the list and drop it on the sprite. Drag a marker to move it. Settings on the left apply to the selected marker. Preview plays the idle clip with the effects; Save writes them into the set."

    def __init__(self, app):
        super().__init__(app)
        self.doc: SpriteSetDoc | None = None
        self.sel = None
        self.drag_kind = None
        self.ghost = None
        self.marker_drag = None
        self.playing = None
        self.frames: list = []
        self.job = None

    def build(self) -> None:
        t = tk()
        from .. import vfx

        f = self.frame
        # row 1: which set and view on the left; undo / redo, zoom and Save on the right
        top = t.ttk.Frame(f, style="Tool.TFrame", padding=(8, 4, 8, 2))
        top.pack(side="top", fill="x")
        right = t.ttk.Frame(top, style="Tool.TFrame")
        right.pack(side="right")
        t.ttk.Label(top, text="Sprite set", style="Tool.TLabel").pack(side="left")
        self.set_box = t.ttk.Combobox(top, values=[], width=14, state="readonly")
        self.set_box.pack(side="left", padx=4)
        self.set_box.bind("<<ComboboxSelected>>", lambda e: self.load(self.sets.get(self.set_box.get())))
        t.ttk.Button(top, text="Open…", width=6, command=self.open_dialog, style="Tool.TButton").pack(side="left")
        t.ttk.Label(top, text="View", style="Tool.TLabel").pack(side="left", padx=(12, 2))
        self.view_var = t.StringVar(value="down")
        self.view_box = t.ttk.Combobox(top, textvariable=self.view_var, values=["down"], width=8, state="readonly")
        self.view_box.pack(side="left")
        self.view_box.bind("<<ComboboxSelected>>", lambda e: self.draw())
        t.ttk.Button(right, text="↶ Undo", width=7, command=self.undo, style="Tool.TButton").pack(side="left")
        t.ttk.Button(right, text="↷ Redo", width=7, command=self.redo, style="Tool.TButton").pack(side="left", padx=(2, 8))
        for label, mode in (("Fit", "fit"), ("2x", 2), ("3x", 3), ("4x", 4)):
            t.ttk.Button(right, text=label, width=3, command=lambda m=mode: self.view.set_mode(m), style="Tool.TButton").pack(side="left", padx=1)
        t.ttk.Button(right, text="Save", width=6, command=self.save, style="Go.TButton").pack(side="left", padx=(8, 0))
        # row 2: what to do with the markers (its own row, so it is never pushed off the right edge); In the game
        act = t.ttk.Frame(f, style="Tool.TFrame", padding=(8, 2, 8, 4))
        act.pack(side="top", fill="x")
        self.play_btn = t.ttk.Button(act, text="▶ Preview", width=10, command=self.preview, style="Tool.TButton")
        self.play_btn.pack(side="left")
        Tooltip(self.play_btn, "Plays the idle clip of this view with the effects on it. Click again to stop.")
        b = t.ttk.Button(act, text="Copy to all views", width=17, command=self.copy_all, style="Tool.TButton")
        b.pack(side="left", padx=(8, 2))
        Tooltip(b, "Places the selected marker on every view (left-facing views mirrored).")
        b = t.ttk.Button(act, text="Delete marker", width=13, command=self.delete, style="Tool.TButton")
        b.pack(side="left", padx=2)
        Tooltip(b, "Removes the selected marker from every view.")
        self.act_info = t.ttk.Label(act, text="", style="Tool.TLabel")
        self.act_info.pack(side="left", padx=(12, 0))
        b = t.ttk.Button(act, text="In the game", width=11, command=self.in_game, style="Tool.TButton")
        b.pack(side="right")
        Tooltip(b, "Save first; then the Game page shows the sprite with its effects attached.")
        body = t.ttk.Frame(f)
        body.pack(fill="both", expand=True)
        left = t.ttk.Frame(body, padding=(8, 6), width=236)
        left.pack(side="left", fill="y")
        left.pack_propagate(False)
        t.ttk.Label(left, text="Effects", style="Sub.TLabel").pack(anchor="w")
        t.ttk.Label(left, text="Drag one onto the sprite.", style="Dim.TLabel", wraplength=216, justify="left").pack(anchor="w")
        self.list = t.Listbox(left, height=14, exportselection=False, bg=T.FIELD, fg=T.BONE, selectbackground=T.TEAL_DK, selectforeground="#eafff8",
                              highlightthickness=0, relief="flat", font=T.FONT_S)
        for k in vfx.KINDS:
            self.list.insert("end", k)
        self.list.pack(fill="x")
        self.list.bind("<ButtonPress-1>", self.drag_start)
        self.list.bind("<B1-Motion>", self.drag_move)
        self.list.bind("<ButtonRelease-1>", self.drag_drop)
        t.ttk.Label(left, text="Selected marker", style="Sub.TLabel").pack(anchor="w", pady=(10, 0))
        row = t.ttk.Frame(left)
        row.pack(fill="x")
        t.ttk.Label(row, text="Colours").pack(side="left")
        self.palette = t.StringVar(value="wisp")
        pb = t.ttk.Combobox(row, textvariable=self.palette, values=sorted(vfx.PRESETS), state="readonly", width=11)
        pb.pack(side="left", padx=4)
        pb.bind("<<ComboboxSelected>>", lambda e: self.apply_props())
        self.scale = t.DoubleVar(value=0.5)
        LabeledScale(left, "Size (x sprite)", self.scale, 0.15, 2.0, command=lambda v: self.apply_props(), length=190).pack(fill="x", pady=(4, 0))
        self.glow = t.BooleanVar(value=True)
        cb = t.ttk.Checkbutton(left, text="Glow", variable=self.glow, command=self.apply_props)
        cb.pack(anchor="w", pady=(4, 0))
        Tooltip(cb, "Only for magic, lanterns and wisps.")
        self.behind = t.BooleanVar(value=False)
        t.ttk.Checkbutton(left, text="Behind the body", variable=self.behind, command=self.apply_props).pack(anchor="w")
        self.info = t.ttk.Label(left, text="", style="Dim.TLabel", wraplength=216, justify="left")
        self.info.pack(anchor="w", pady=8)
        self.view = ZoomCanvas(body, height=400)
        self.view.pack(side="left", fill="both", expand=True)
        self.view.after_draw = self.draw_markers
        c = self.view.canvas
        c.bind("<ButtonPress-1>", self.marker_press)
        c.bind("<B1-Motion>", self.marker_move)
        c.bind("<ButtonRelease-1>", self.marker_release)
        self.note = Note(f, pady=(2, 4))
        self.note.label.pack_configure(padx=10)
        self.sets: dict = {}

    def header_title(self) -> tuple[str, str]:
        name = self.doc.name if self.doc else "no sprite set"
        return f"{self.title}: {name}", self.blurb

    # ---------------------------------------------------------------- loading
    def _scan_sets(self) -> None:
        self.sets = {}
        g = game_dir()
        if g and (g / "art" / "sprites").exists():
            for p in sorted((g / "art" / "sprites").glob("*.json")):
                if "@" not in p.stem and not p.stem.endswith(("_normal", "_depth")) and p.stem != "skins":
                    self.sets[p.stem] = str(p)
        c = self.app.current_char()
        js = c.notes.get("export_game_json") if c else None
        if js and Path(js).exists():
            self.sets.setdefault(Path(js).stem, js)
        self.set_box.configure(values=sorted(self.sets))

    def on_show(self, sprite_json: str | None = None, back=None, **_kw) -> None:
        self._scan_sets()
        if sprite_json:
            self.load(sprite_json)
        elif self.doc is None:
            c = self.app.current_char()
            js = c.notes.get("export_game_json") if c else None
            if js and Path(js).exists():
                self.load(js)
            elif self.sets:
                self.note.say("Pick a sprite set at the top (the game's art/sprites, or a character exported at step 9).")
            else:
                self.note.say("No exported sprite set found. Export a character at step 9 (game atlas), or Open… a <kind>.json.")
        self.app.set_header(*self.header_title())

    def on_hide(self) -> None:
        self.stop_preview()

    def open_dialog(self) -> None:
        from tkinter import filedialog

        p = filedialog.askopenfilename(title="A sprite set (<kind>.json)", filetypes=[("Sprite set", "*.json")])
        if p:
            self.load(p)

    def on_drop(self, paths: list[str]) -> bool:
        for p in paths:
            if p.endswith(".json"):
                self.load(p)
                return True
        return False

    def load(self, path) -> None:
        if not path:
            return
        self.stop_preview()
        try:
            fx_dir = Path(path).parent.parent / "fx"
            self.doc = SpriteSetDoc(path, fx_dir)
        except Exception as e:  # noqa: BLE001
            self.note.warn(f"Could not open {path}: {e}")
            return
        self.sel = None
        self.view_box.configure(values=self.doc.views)
        self.view_var.set("down" if "down" in self.doc.views else self.doc.views[0])
        self.set_box.set(Path(path).stem)
        self.app.set_header(*self.header_title())
        self.draw()
        self.view.set_mode(3)
        self.note.say(f"{self.doc.name}: {len(self.doc.atts)} effect(s) attached; sheets go to {fx_dir}.")

    # ---------------------------------------------------------------- drawing
    def draw(self) -> None:
        if self.doc is None:
            self.view.set_image(None)
            self.act_info.configure(text="")
            return
        fr, _g = self.doc.frame(self.view_var.get(), 0)
        self.view.set_image(fr, keep_zoom=True)   # after_draw draws the markers
        n = sum(1 for a in self.doc.atts if self.view_var.get() in a.get("views", {}))
        self.act_info.configure(text=f"{len(self.doc.atts)} effect(s); {n} on this view")
        self.info.configure(text=("Selected: " + self.doc.atts[self.sel]["name"] + ". Drag it to move it." if self.sel is not None and self.sel < len(self.doc.atts) else "Click a marker to select it."))

    def draw_markers(self) -> None:
        if self.doc is None or self.playing:
            return
        c = self.view.canvas
        c.delete("marker")
        _fr, (gx, gy) = self.doc.frame(self.view_var.get(), 0)
        x, y = self.view.from_image(gx, gy)
        c.create_line(x - 6, y, x + 6, y, fill=T.GOLD, tags=("marker",))
        c.create_line(x, y - 6, x, y + 6, fill=T.GOLD, tags=("marker",))
        v = self.view_var.get()
        for i, att in enumerate(self.doc.atts):
            if v not in att.get("views", {}):
                continue
            ax, ay = att["views"][v]
            cx, cy = self.view.from_image(gx + ax, gy + ay)
            col = T.TEAL if i == self.sel else T.BONE
            c.create_oval(cx - 7, cy - 7, cx + 7, cy + 7, outline=col, width=2, tags=("marker", f"m{i}"))
            c.create_text(cx + 10, cy - 10, text=att["name"], fill=col, anchor="w", tags=("marker", f"m{i}"), font=T.FONT_S)

    def to_sprite(self, ex, ey) -> tuple[float, float]:
        _fr, (gx, gy) = self.doc.frame(self.view_var.get(), 0)
        x, y = self.view.to_image_f(ex, ey)
        return round(x - gx, 1), round(y - gy, 1)

    # --------------------------------------------------- drag from the list
    def drag_start(self, e) -> None:
        i = self.list.nearest(e.y)
        self.drag_kind = self.list.get(i)
        self.list.selection_clear(0, "end")
        self.list.selection_set(i)

    def drag_move(self, e) -> None:
        t = tk()
        if not self.drag_kind:
            return
        top = self.app.root
        if self.ghost is None:
            self.ghost = t.Label(top, text=self.drag_kind, bg=T.TEAL_DK, fg="#eafff8", font=T.FONT_S, padx=6, pady=2)
        self.ghost.place(x=e.x_root - top.winfo_rootx() + 12, y=e.y_root - top.winfo_rooty() + 12)
        self.ghost.lift()

    def drag_drop(self, e) -> None:
        if self.ghost is not None:
            self.ghost.destroy()
            self.ghost = None
        kind = self.drag_kind
        self.drag_kind = None
        if not kind or self.doc is None:
            return
        c = self.view.canvas
        w = self.app.root.winfo_containing(e.x_root, e.y_root)
        if w is not c:
            return
        x, y = e.x_root - c.winfo_rootx(), e.y_root - c.winfo_rooty()
        ox, oy = self.to_sprite(x, y)
        self.sel = self.doc.add(kind, self.view_var.get(), (ox, oy), palette=self.palette.get(), scale=float(self.scale.get()), glow=bool(self.glow.get()), behind=bool(self.behind.get()))
        self.draw()
        self.note.say(f"{kind} placed at ({ox}, {oy}) from the ground point on view {self.view_var.get()}. Drag the marker to move it; 'Copy to all views' when it is right.")

    # ---------------------------------------------------- markers on canvas
    def marker_press(self, e) -> None:
        if self.doc is None or self.playing:
            return
        c = self.view.canvas
        x, y = c.canvasx(e.x), c.canvasy(e.y)
        for item in c.find_overlapping(x - 8, y - 8, x + 8, y + 8):
            for tag in c.gettags(item):
                if tag.startswith("m") and tag[1:].isdigit():
                    self.sel = int(tag[1:])
                    self.marker_drag = self.sel
                    att = self.doc.atts[self.sel]
                    self.palette.set(att.get("palette", "lantern"))
                    self.scale.set(att.get("scale", 1.0))
                    self.glow.set(bool(att.get("glow", True)))
                    self.behind.set(att.get("z") == "behind")
                    self.doc.push()
                    self.draw()
                    return
        self.sel = None
        self.draw()

    def marker_move(self, e) -> None:
        if self.marker_drag is None or self.doc is None:
            return
        self.doc.move(self.marker_drag, self.view_var.get(), self.to_sprite(e.x, e.y))
        self.draw_markers()

    def marker_release(self, e) -> None:
        self.marker_drag = None
        self.draw()

    def apply_props(self) -> None:
        if self.doc is None or self.sel is None or self.sel >= len(self.doc.atts):
            return
        self.doc.set_props(self.sel, palette=self.palette.get(), scale=round(float(self.scale.get()), 2), glow=bool(self.glow.get()), behind=bool(self.behind.get()))
        self.draw()

    def copy_all(self) -> None:
        if self.doc is None or self.sel is None:
            self.note.warn("Select a marker first (click it).")
            return
        self.doc.copy_to_all(self.sel, self.view_var.get())
        self.draw()
        self.note.good("Placed on every view (left-facing views mirrored).")

    def delete(self) -> None:
        if self.doc is not None and self.sel is not None:
            self.doc.delete(self.sel)
            self.sel = None
            self.draw()

    def undo(self) -> None:
        if self.doc and self.doc.undo():
            self.sel = None
            self.draw()

    def redo(self) -> None:
        if self.doc and self.doc.redo():
            self.sel = None
            self.draw()

    def zoom(self, delta: int) -> None:
        self.view.zoom_in() if delta > 0 else self.view.zoom_out()

    # ------------------------------------------------------------- preview
    def preview(self) -> None:
        if self.playing:
            self.stop_preview()
            return
        if self.doc is None or not self.doc.atts:
            self.note.warn("Drop an effect on the sprite first.")
            return
        v = self.view_var.get()
        self.note.say("Rendering the effect sheets for the preview…")
        self.play_btn.configure(state="disabled")

        def work():
            frames = self.doc.preview_frames(v)
            try:
                self.app.root.after(0, lambda: self.start_preview(frames))
            except RuntimeError:   # the window closed while rendering
                pass

        threading.Thread(target=work, daemon=True).start()

    def start_preview(self, frames) -> None:
        self.play_btn.configure(state="normal", text="■ Stop")
        self.frames = [to_pil(f) for f in frames]
        if not self.frames:
            self.note.warn("No frames to play.")
            return
        self.playing = {"i": 0}
        self.view.canvas.delete("marker")
        self.note.say(f"Playing {len(self.frames)} frames with the effects. Stop to edit again.")
        self.tick()

    def tick(self) -> None:
        if not self.playing:
            return
        self.view.set_image(self.frames[self.playing["i"] % len(self.frames)], keep_zoom=True)
        self.playing["i"] += 1
        self.job = self.frame.after(120, self.tick)

    def stop_preview(self) -> None:
        if self.job is not None:
            try:
                self.frame.after_cancel(self.job)
            except Exception:  # noqa: BLE001
                pass
            self.job = None
        self.playing = None
        try:
            self.play_btn.configure(text="▶ Preview", state="normal")
        except Exception:  # noqa: BLE001
            pass
        if self.doc is not None:
            self.draw()

    def save(self) -> None:
        if self.doc is None:
            return
        self.app._run(self.doc.save, after=lambda r: self.note.good(f"Saved {r['attachments']} attachment(s) into {Path(r['json']).name}; effect sheets in {Path(r['fx_dir']).name}. The Game page shows them (attach)."),
                      what="Rendering the effect sheets and saving…")

    def in_game(self) -> None:
        if self.doc is None:
            return
        self.app.show("game", skin=self.doc.kind, attach=True)
