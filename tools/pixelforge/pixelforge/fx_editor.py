"""Attach effects to a sprite: "pale glowing smoke on this eye".

Drag an effect from the list and drop it on the sprite; the marker is the effect's anchor for that view. Place it
once per view, or place it on one and copy to all (left-facing views mirror). Preview plays the idle clip with the
effects composited; Save writes ``attachments`` into the sprite set's JSON and renders each effect's sheet into the
effects folder, where the Godot add-on (PFFx.spawn_attachments) picks them up.

Attachment: {"name", "kind", "palette", "scale", "glow", "look", "z": "front" | "behind", "fx": "<sheet name>", "views": {view: [ox, oy]}}
with (ox, oy) in sprite pixels from the entity's ground point (the same origin as the frames' dx, dy). ``look`` is an
fxlook spec ("phosphorus", "echo:count=2"...) rendered into the sheet; ``fx`` names the sheet and must change with
the look (``attachment_fx_name``), since a sheet that exists is reused.
"""
from __future__ import annotations

import json
import re
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

from . import vfx

LEFT_VIEWS = {"front_l": "front", "side_l": "side", "back_l": "back"}


def mirror_to_all(offset: list[float], view: str, views: list[str]) -> dict:
    """The same placement on every view; left-facing views (``*_l``) get x mirrored."""
    out = {}
    src_left = view in LEFT_VIEWS
    for v in views:
        ox, oy = offset
        if (v in LEFT_VIEWS) != src_left:
            ox = -ox
        out[v] = [round(ox, 1), round(oy, 1)]
    return out


def attachment_fx_name(att: dict, set_kind: str = "sprite") -> str:
    """The sheet name an attachment renders to: kind, name, palette, glow and the look (slugged), so a changed look
    means a new sheet rather than a stale one."""
    slug = re.sub(r"[^a-z0-9]+", "_", str(att.get("look") or "").lower()).strip("_")
    return f"{set_kind}_{att['name']}_{att.get('palette', 'lantern')}{'_glow' if att.get('glow', True) else ''}" + (f"_{slug}" if slug else "")


def load_set(json_path: str | Path) -> dict:
    p = Path(json_path)
    d = json.loads(p.read_text())
    sheets = [np.array(Image.open(p.parent / s).convert("RGBA")) for s in d["sheets"]]
    return {"path": p, "data": d, "sheets": sheets}


def frame_of(s: dict, anim: str, view: str, i: int):
    e = s["data"]["idx"].get(f"{anim}/{view}/{i}")
    if e is None:
        return None, (0, 0)
    sheet, x, y, w, h, dx, dy = e
    return s["sheets"][sheet][y:y + h, x:x + w], (dx, dy)


def effect_frames(att: dict, fx_dir: str | Path) -> tuple[list[np.ndarray], list[int], float]:
    """Render (or reuse) the effect's sheet; frames as RGBA arrays, the anchor, fps."""
    out = Path(fx_dir)
    name = att["fx"]
    meta_p = out / f"{name}.json"
    if not meta_p.exists():
        vfx.make_vfx(att["kind"], name, out, palette=att.get("palette", "lantern"), glow=att.get("glow"), seed=att.get("seed", 1), looks=att.get("look") or None)
    meta = json.loads(meta_p.read_text())
    strip = np.array(Image.open(out / f"{name}.png").convert("RGBA"))
    fw = meta["frame_width"]
    frames = [strip[:, i * fw:(i + 1) * fw] for i in range(meta["frames"])]
    return frames, meta["anchor"], float(meta.get("fps", 10))


def composite(frame: np.ndarray, ground: tuple[int, int], atts: list[dict], view: str, fx_dir, t: int) -> np.ndarray:
    """One frame with every attachment drawn at its offset (effects advance with ``t``)."""
    base = Image.fromarray(frame, "RGBA")
    gx, gy = ground
    for att in atts:
        if view not in att.get("views", {}):
            continue
        frames, anchor, _fps = effect_frames(att, fx_dir)
        f = frames[t % len(frames)]
        sc = float(att.get("scale", 1.0))
        im = Image.fromarray(f, "RGBA")
        if sc != 1.0:
            im = im.resize((max(1, int(im.width * sc)), max(1, int(im.height * sc))), Image.NEAREST)
        ox, oy = att["views"][view]
        x = int(round(gx + ox - anchor[0] * sc))
        y = int(round(gy + oy - anchor[1] * sc))
        layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
        layer.paste(im, (x, y), im)
        base = Image.alpha_composite(base, layer)
    return np.array(base)


def save_attachments(json_path: str | Path, atts: list[dict], fx_dir: str | Path) -> dict:
    p = Path(json_path)
    d = json.loads(p.read_text())
    for att in atts:
        effect_frames(att, fx_dir)   # make sure every sheet exists
    d.setdefault("meta", {})["attachments"] = atts
    d["meta"]["fx_dir"] = str(Path(fx_dir).name)
    p.write_text(json.dumps(d, separators=(",", ":")) + "\n")
    return {"ok": True, "json": str(p), "attachments": len(atts), "fx_dir": str(fx_dir)}


class FxEditor:
    ZOOM = 3

    def __init__(self, master, sprite_json: str | Path, fx_dir: str | Path, on_save=None):
        global BOTH, END, LEFT, RIGHT, X, Y, BooleanVar, Canvas, DoubleVar, IntVar, StringVar, Toplevel, Listbox, colorchooser, messagebox, ttk
        from tkinter import BOTH, END, LEFT, RIGHT, X, Y, BooleanVar, Canvas, DoubleVar, IntVar, StringVar, Toplevel, Listbox, colorchooser, messagebox  # noqa: PLW0603
        from tkinter import ttk
        global ImageTk
        from PIL import ImageTk  # noqa: PLW0603  (needs Tk; the functions above do not)
        self.s = load_set(sprite_json)
        self.fx_dir = Path(fx_dir)
        self.on_save = on_save
        meta = self.s["data"]["meta"]
        self.anim = "idle" if "idle" in meta["anims"] else next(iter(meta["anims"]))
        self.views = list(meta["anims"][self.anim]["views"])
        self.atts: list[dict] = list(meta.get("attachments", []))
        self.sel = None
        self.drag_kind = None
        self.ghost = None
        self.marker_drag = None
        self.n_frames = int(meta["anims"][self.anim]["frames"])

        self.win = Toplevel(master)
        self.win.configure(bg="#1b1e24")
        self.win.title(f"Effects editor: {meta.get('name', meta.get('kind'))}")
        top = ttk.Frame(self.win, padding=6)
        top.pack(fill=X)
        ttk.Label(top, text="View").pack(side=LEFT)
        self.view = StringVar(value="down" if "down" in self.views else self.views[0])
        ttk.Combobox(top, textvariable=self.view, values=self.views, state="readonly", width=8).pack(side=LEFT, padx=4)
        self.view.trace_add("write", lambda *_: self.draw())
        ttk.Button(top, text="Copy this view's placement to all views", command=self.copy_all).pack(side=LEFT, padx=8)
        ttk.Button(top, text="Preview animation", command=self.preview).pack(side=LEFT)
        ttk.Button(top, text="Delete selected", command=self.delete).pack(side=LEFT, padx=8)
        ttk.Button(top, text="Save", command=self.save, style="Go.TButton").pack(side=RIGHT)
        ttk.Label(self.win, text="Drag an effect from the list and drop it on the sprite. Drag a marker to move it. Settings on the left apply to the selected marker.",
                  foreground="#888", wraplength=900).pack(fill=X, padx=8)

        body = ttk.Frame(self.win)
        body.pack(fill=BOTH, expand=True)
        left = ttk.Frame(body, padding=6)
        left.pack(side=LEFT, fill=Y)
        ttk.Label(left, text="Effects (drag one onto the sprite)").pack(anchor="w")
        self.list = Listbox(left, height=18, width=16, exportselection=False, bg="#23272f", fg="#e8e2d2", selectbackground="#1f4a46",
                            selectforeground="#eafff8", highlightthickness=0, relief="flat", font=("Segoe UI", 10))
        for k in vfx.KINDS:
            self.list.insert(END, k)
        self.list.pack(fill=Y)
        self.list.bind("<ButtonPress-1>", self.drag_start)
        self.list.bind("<B1-Motion>", self.drag_move)
        self.list.bind("<ButtonRelease-1>", self.drag_drop)
        ttk.Label(left, text="Colours").pack(anchor="w", pady=(8, 0))
        self.palette = StringVar(value="wisp")
        ttk.Combobox(left, textvariable=self.palette, values=sorted(vfx.PRESETS), state="readonly", width=12).pack(anchor="w")
        ttk.Label(left, text="Size (x sprite)").pack(anchor="w", pady=(8, 0))
        self.scale = DoubleVar(value=0.5)
        ttk.Scale(left, from_=0.15, to=2.0, variable=self.scale, orient="horizontal", length=120, command=lambda _v: self.apply_props()).pack(anchor="w")
        self.glow = BooleanVar(value=True)
        ttk.Checkbutton(left, text="Glow", variable=self.glow, command=self.apply_props).pack(anchor="w", pady=4)
        self.behind = BooleanVar(value=False)
        ttk.Checkbutton(left, text="Behind the body", variable=self.behind, command=self.apply_props).pack(anchor="w")
        self.palette.trace_add("write", lambda *_: self.apply_props())
        self.info = ttk.Label(left, text="", foreground="#888", wraplength=150)
        self.info.pack(anchor="w", pady=8)

        self.canvas = Canvas(body, bg="#303030", highlightthickness=0, width=720, height=640)
        self.canvas.pack(side=LEFT, fill=BOTH, expand=True)
        self.canvas.bind("<ButtonPress-1>", self.marker_press)
        self.canvas.bind("<B1-Motion>", self.marker_move)
        self.canvas.bind("<ButtonRelease-1>", self.marker_release)
        self.photo = None
        self.draw()

    # --------------------------------------------------------------- drawing
    def current(self):
        fr, (dx, dy) = frame_of(self.s, self.anim, self.view.get(), 0)
        return fr, (-dx, -dy)   # the ground point in frame coordinates

    def draw(self) -> None:
        fr, (gx, gy) = self.current()
        self.canvas.delete("all")
        if fr is None:
            return
        z = self.ZOOM
        im = Image.fromarray(fr, "RGBA")
        bg = Image.new("RGBA", im.size, (48, 48, 48, 255))
        im = Image.alpha_composite(bg, im).resize((im.width * z, im.height * z), Image.NEAREST)
        self.photo = ImageTk.PhotoImage(im)
        self.ox, self.oy = 40, 20
        self.canvas.create_image(self.ox, self.oy, anchor="nw", image=self.photo)
        self.canvas.create_line(self.ox + gx * z - 6, self.oy + gy * z, self.ox + gx * z + 6, self.oy + gy * z, fill="#c9a24a")
        self.canvas.create_line(self.ox + gx * z, self.oy + gy * z - 6, self.ox + gx * z, self.oy + gy * z + 6, fill="#c9a24a")
        for i, att in enumerate(self.atts):
            if self.view.get() not in att.get("views", {}):
                continue
            ax, ay = att["views"][self.view.get()]
            cx, cy = self.ox + (gx + ax) * z, self.oy + (gy + ay) * z
            col = "#4fd1c5" if i == self.sel else "#e8e2d2"
            self.canvas.create_oval(cx - 7, cy - 7, cx + 7, cy + 7, outline=col, width=2, tags=(f"m{i}",))
            self.canvas.create_text(cx + 10, cy - 10, text=att["name"], fill=col, anchor="w", tags=(f"m{i}",))
        self.canvas.configure(scrollregion=(0, 0, im.width + 80, im.height + 40))
        n = sum(1 for a in self.atts if self.view.get() in a.get("views", {}))
        self.info.configure(text=f"{len(self.atts)} effect(s); {n} placed on this view.")

    def to_sprite(self, x: float, y: float) -> tuple[float, float]:
        _fr, (gx, gy) = self.current()
        z = self.ZOOM
        return round((self.canvas.canvasx(x) - self.ox) / z - gx, 1), round((self.canvas.canvasy(y) - self.oy) / z - gy, 1)

    # ------------------------------------------------------- drag from the list
    def drag_start(self, e) -> None:
        i = self.list.nearest(e.y)
        self.drag_kind = self.list.get(i)
        self.list.selection_clear(0, END)
        self.list.selection_set(i)

    def drag_move(self, e) -> None:
        if not self.drag_kind:
            return
        if self.ghost is None:
            self.ghost = Toplevel(self.win)
            self.ghost.overrideredirect(True)
            ttk.Label(self.ghost, text=self.drag_kind, padding=4).pack()
        self.ghost.geometry(f"+{e.x_root + 12}+{e.y_root + 12}")

    def drag_drop(self, e) -> None:
        if self.ghost is not None:
            self.ghost.destroy()
            self.ghost = None
        kind = self.drag_kind
        self.drag_kind = None
        if not kind:
            return
        w = self.win.winfo_containing(e.x_root, e.y_root)
        if w is not self.canvas:
            return
        x, y = e.x_root - self.canvas.winfo_rootx(), e.y_root - self.canvas.winfo_rooty()
        ox, oy = self.to_sprite(x, y)
        n = sum(1 for a in self.atts if a["kind"] == kind) + 1
        name = f"{kind}_{n}"
        att = {"name": name, "kind": kind, "palette": self.palette.get(), "scale": round(float(self.scale.get()), 2), "glow": bool(self.glow.get()),
               "fx": f"{self.s['data']['meta'].get('kind', 'sprite')}_{name}", "views": {self.view.get(): [ox, oy]}}
        self.atts.append(att)
        self.sel = len(self.atts) - 1
        self.draw()

    # ------------------------------------------------------- markers on the canvas
    def marker_press(self, e) -> None:
        hit = self.canvas.find_overlapping(self.canvas.canvasx(e.x) - 8, self.canvas.canvasy(e.y) - 8, self.canvas.canvasx(e.x) + 8, self.canvas.canvasy(e.y) + 8)
        for item in hit:
            for tag in self.canvas.gettags(item):
                if tag.startswith("m"):
                    self.sel = int(tag[1:])
                    self.marker_drag = self.sel
                    att = self.atts[self.sel]
                    self.palette.set(att.get("palette", "lantern"))
                    self.scale.set(att.get("scale", 1.0))
                    self.glow.set(bool(att.get("glow", True)))
                    self.behind.set(att.get("z") == "behind")
                    self.draw()
                    return
        self.sel = None
        self.draw()

    def marker_move(self, e) -> None:
        if self.marker_drag is None:
            return
        ox, oy = self.to_sprite(e.x, e.y)
        self.atts[self.marker_drag]["views"][self.view.get()] = [ox, oy]
        self.draw()

    def marker_release(self, e) -> None:
        self.marker_drag = None

    def apply_props(self) -> None:
        if self.sel is None or self.sel >= len(self.atts):
            return
        att = self.atts[self.sel]
        att["palette"] = self.palette.get()
        att["scale"] = round(float(self.scale.get()), 2)
        att["glow"] = bool(self.glow.get())
        att["z"] = "behind" if self.behind.get() else "front"
        att["fx"] = attachment_fx_name(att, self.s["data"]["meta"].get("kind", "sprite"))
        self.draw()

    def copy_all(self) -> None:
        if self.sel is None:
            messagebox.showinfo("Effects editor", "Select a marker first (click it).")
            return
        att = self.atts[self.sel]
        v = self.view.get()
        if v not in att["views"]:
            return
        att["views"] = mirror_to_all(att["views"][v], v, self.views)
        self.draw()

    def delete(self) -> None:
        if self.sel is not None and self.sel < len(self.atts):
            self.atts.pop(self.sel)
            self.sel = None
            self.draw()

    # ------------------------------------------------------------- preview / save
    def preview(self) -> None:
        if not self.atts:
            messagebox.showinfo("Effects editor", "Drop an effect on the sprite first.")
            return
        tmp = Path(tempfile.mkdtemp(prefix="pf_fx_"))
        v = self.view.get()
        frames = []
        for i in range(self.n_frames):
            fr, (dx, dy) = frame_of(self.s, self.anim, v, i)
            if fr is None:
                continue
            pad = 48
            canvas = np.zeros((fr.shape[0] + 2 * pad, fr.shape[1] + 2 * pad, 4), np.uint8)
            canvas[pad:pad + fr.shape[0], pad:pad + fr.shape[1]] = fr
            frames.append(composite(canvas, (pad - dx, pad - dy), self.atts, v, tmp, i))
        if not frames:
            return
        win = Toplevel(self.win)
        win.configure(bg="#1b1e24")
        win.title("Preview")
        lbl = ttk.Label(win)
        lbl.pack(padx=8, pady=8)
        photos = []
        for f in frames:
            im = Image.fromarray(f, "RGBA")
            bg = Image.new("RGBA", im.size, (40, 40, 40, 255))
            im = Image.alpha_composite(bg, im).resize((im.width * 2, im.height * 2), Image.NEAREST)
            photos.append(ImageTk.PhotoImage(im))
        state = {"i": 0, "job": None}

        def tick():
            lbl.configure(image=photos[state["i"] % len(photos)])
            state["i"] += 1
            state["job"] = win.after(120, tick)

        win.protocol("WM_DELETE_WINDOW", lambda: (win.after_cancel(state["job"]) if state["job"] else None, win.destroy()))
        win._photos = photos  # keep alive
        tick()

    def save(self) -> None:
        r = save_attachments(self.s["path"], self.atts, self.fx_dir)
        self.info.configure(text=f"Saved {r['attachments']} attachment(s); effect sheets in {self.fx_dir.name}.")
        if self.on_save:
            self.on_save(r)


def open_fx_editor(master, sprite_json, fx_dir, on_save=None) -> FxEditor:
    return FxEditor(master, sprite_json, fx_dir, on_save)
