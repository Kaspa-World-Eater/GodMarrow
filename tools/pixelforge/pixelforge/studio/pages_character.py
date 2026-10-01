"""The character pages: one page per step (1-9), the quick path and the new-character form.

Every step page says in one sentence what it does, shows its inputs, has one clear primary button, shows its
previews large (zoomable) with the actions under them, and its check note. The result or stop of a run is shown on
the page and in the status line. Continue always does the next right thing.
"""
from __future__ import annotations

import webbrowser
from pathlib import Path

from . import theme as T
from .app import Page, STEP_BLURB
from .widgets import (AnimPlayer, Collapsible, Confirm, Note, PreviewArea, ScrollFrame, ThumbStrip, Tooltip, heading, hsep, para, steps_text, tk)

STEP_TITLES = {
    "prompts": ("Step 1: Get the prompts for Midjourney", "You paint the character in Midjourney; PixelForge writes the prompts so the pictures come out the way the next steps need them."),
    "import": ("Step 2: Bring the pictures in", "Pick the PNG files you saved from Midjourney. The sheet (several views side by side) is the one that matters."),
    "split": ("Step 3: Cut the figures out", "PixelForge finds each figure on the sheet and removes the background. Fix a cutout by hand with Edit; paint on it with Skin; change a colour with Colour."),
    "palette": ("Step 4: Lock the colours", "The character's colours are picked once so every frame of every animation uses the same ones (no shimmer)."),
    "model": ("Step 5: Build the 3D figure", "A figure is carved from the views of your painting and the painting wrapped around it (Blender, free). You never model anything by hand."),
    "rig": ("Step 6: Skeleton and moves", "Automatic: a skeleton and the built-in animations (idle, walk, run, attack, punch, cast, hit, death, roll)."),
    "render": ("Step 7: Film it from 8 directions", "Blender films every animation from every direction with the game camera (30° above, the classic isometric view). The slow step."),
    "pixelate": ("Step 8: Turn the film into pixel art", "Every frame becomes a pixel sprite in the project's style with the locked colours, so nothing flickers between frames."),
    "export": ("Step 9: Make the game files", "Packs every animation into sprite sheets and writes the files a game loads; the game atlas is what Godmarrow uses."),
    "still": ("Quick path: one picture, one sprite", "No 3D. One picture (the pixel-style image or the front view) becomes a sprite with a simple animation: a first look, bosses, portraits, items."),
    "new": ("New character", "A short name for the files and one sentence about the character. Have the painting already? Choose it here and skip to the cutting."),
}
CLEAN = ("cutouts clean", "carve clean", "frames clean")


class CharacterPage(Page):
    key = "character"

    def __init__(self, app):
        super().__init__(app)
        self.step = None
        self.mode = "step"
        self.players: list[AnimPlayer] = []

    # ---------------------------------------------------------------- frame
    def build(self) -> None:
        t = tk()
        bar = t.ttk.Frame(self.frame, padding=(16, 8, 16, 4))
        bar.pack(fill="x")
        self.go_btn = t.ttk.Button(bar, text="▶ Continue", command=self.app.continue_, style="Go.TButton")
        self.go_btn.pack(side="left")
        Tooltip(self.go_btn, "Opens the next step and runs it when it is automatic.")
        b = t.ttk.Button(bar, text="Run all automatic steps", command=self.app._run_all)
        b.pack(side="left", padx=6)
        Tooltip(b, "F5. Runs every remaining step and stops where something is needed (Blender, a picture).")
        t.ttk.Button(bar, text="Check", command=self.check).pack(side="left")
        self.redo_btn = t.ttk.Button(bar, text="Redo from here", command=self.redo_from_here)
        self.redo_btn.pack(side="right")
        Tooltip(self.redo_btn, "Marks this step and every later one as not done, so Continue runs them again. Files are kept until they are rebuilt.")
        self.reset_btn = t.ttk.Button(bar, text="Start over", command=self.start_over, style="Danger.TButton")
        self.reset_btn.pack(side="right", padx=6)
        Tooltip(self.reset_btn, "Throws away this character's cutouts, model, renders, frames and exports. The painting and the description are kept.")
        self.confirm = Confirm(self.frame)
        self.note = Note(self.frame, pady=(0, 0))
        self.note.label.pack_configure(padx=16)
        self.scroll = ScrollFrame(self.frame)
        self.scroll.pack(fill="both", expand=True)

    def header_title(self) -> tuple[str, str]:
        c = self.app.current_char()
        if self.mode == "new" or c is None:
            return STEP_TITLES["new"] if self.mode == "new" else ("Character", "Open a painting (Ctrl+P) or add a character by name to begin.")
        title, blurb = STEP_TITLES.get(self.step, ("Character", ""))
        return f"{c.name}  ·  {title}", blurb

    def on_show(self, step: str | None = None, new: bool = False, **_kw) -> None:
        if new:
            self.mode = "new"
            self.step = None
        else:
            self.mode = "step"
            c = self.app.current_char()
            self.step = step or (self.app.next_step(c) if c else "prompts")
        self.render()

    def on_hide(self) -> None:
        self._stop_players()

    def refresh(self) -> None:
        self.render()

    def set_busy(self, on: bool) -> None:
        for b in (self.go_btn, self.redo_btn, self.reset_btn):
            b.configure(state="disabled" if on else "normal")

    # ---------------------------------------------------------------- render
    def _stop_players(self) -> None:
        for pl in self.players:
            pl.stop()
        self.players.clear()

    def render(self) -> None:
        t = tk()
        self._stop_players()
        self.confirm.hide()
        self.scroll.clear()
        self.p = self.scroll.inner
        c = self.app.current_char()
        self._update_go(c)
        if self.mode == "new":
            self._new_character()
        elif c is None:
            self.app.set_header(*self.header_title())
            para(self.p, "No character yet. Open a painting and the character is made from it, or add one by name.", style="Dim.TLabel")
            row = t.ttk.Frame(self.p)
            row.pack(anchor="w")
            t.ttk.Button(row, text="Open a painting…", command=self.app._start_from_picture, style="Go.TButton").pack(side="left")
            t.ttk.Button(row, text="Add a character by name", command=self.app._add_character).pack(side="left", padx=6)
        else:
            self.app.set_header(*self.header_title())
            getattr(self, f"_step_{self.step}")(c)
        self.scroll.refit()

    def _update_go(self, c) -> None:
        from ..project import STEPS

        if c is None:
            self.go_btn.configure(text="▶ Add a character")
        elif all(c.done.get(k) for k, _ in STEPS):
            self.go_btn.configure(text="✔ All steps done")
        else:
            nxt = self.app.next_step(c)
            self.go_btn.configure(text=f"▶ Continue: {STEP_BLURB.get(nxt, nxt)}")
        issues = [v for k, v in (c.notes.items() if c else []) if k.endswith("_check") and v not in CLEAN]
        if issues:
            self.note.say("Checks: " + " · ".join(issues), "warn")
        elif c is not None and any(k.endswith("_check") for k in c.notes):
            self.note.say("Checks: clean", "good")
        else:
            self.note.clear()

    def _check_note(self, c, key: str) -> None:
        note = c.notes.get(key)
        if not note:
            return
        clean = note in CLEAN
        para(self.p, ("✔ " if clean else "⚠ ") + note, style="Good.TLabel" if clean else "Warn.TLabel", pady=(6, 0))

    def _how(self, lines: list[str], open: bool = True) -> None:
        col = Collapsible(self.p, "How", open=open)
        col.pack(fill="x", pady=(0, 6))
        steps_text(col.body, lines, pady=(2, 4))

    def _result(self, text: str) -> None:
        if text:
            para(self.p, text, style="Dim.TLabel", pady=(4, 0))

    def _run_then_render(self, fn, what: str, after=None):
        def done(r):
            if after:
                after(r)
            self.render()
        self.app._run(fn, after=done, what=what)

    # ------------------------------------------------------------- actions
    def check(self) -> None:
        c = self.app.current_char()
        if c is None:
            return
        from ..checks import check_character

        r = check_character(self.app.project, c.name)
        text = "Checks: nothing to fix." if r["ok"] else "Checks: " + " · ".join(r["issues"])
        self.app._log("CHECK " + c.name + ": " + text)
        self.note.say(text, "good" if r["ok"] else "warn")

    def redo_from_here(self) -> None:
        c = self.app.current_char()
        if c is None or self.step in (None, "still"):
            return
        from .. import api

        r = api.reset_character(self.app.project, c.name, from_step=self.step)
        self.app.refresh_all()
        self.app._tell(f"Steps {', '.join(r['cleared'])} will run again; press Continue.")

    def start_over(self) -> None:
        c = self.app.current_char()
        if c is None:
            return
        from .. import api

        def yes():
            r = api.reset_character(self.app.project, c.name, keep_sources=True)
            self.app.refresh_all()
            self.app.show("character", step="split" if c.sources else "prompts")
            self.app._tell(f"'{c.name}' started over: removed {len(r['removed'])} folder(s); the painting and the description are kept.")

        self.confirm.ask(f"Start '{c.name}' over? The cutouts, model, renders, frames and exports are deleted. The painting and the description are kept.",
                         "Start over", yes, before=self.scroll.outer)

    def edit_cutout(self, path) -> None:
        self.app.show("cutout", path=str(path), back=("character", {"step": "split"}))

    def skin_cutout(self, path) -> None:
        self.app.show("skin", path=str(path), back=("character", {"step": "split"}))

    def colour_cutout(self, path) -> None:
        self.app.show("colour", path=str(path), back=("character", {"step": "split"}))

    # ------------------------------------------------------------- the form
    def _new_character(self) -> None:
        t = tk()
        from ..prompts import DESCRIPTION_TIPS, EXAMPLE_DESCRIPTION
        from .. import api

        p = self.p
        self.app.set_header(*STEP_TITLES["new"])
        t.ttk.Label(p, text="Name (for the files, e.g. lantern_wraith):").pack(anchor="w", pady=(4, 0))
        name = t.ttk.Entry(p, width=40)
        name.pack(anchor="w")
        name.focus_set()
        t.ttk.Label(p, text="One-sentence description:").pack(anchor="w", pady=(10, 0))
        para(p, DESCRIPTION_TIPS + "  For example: " + EXAMPLE_DESCRIPTION, style="Dim.TLabel", pady=(0, 4))
        desc = t.Text(p, width=80, height=4, wrap="word", font=T.FONT, bg=T.FIELD, fg=T.BONE, insertbackground=T.BONE, relief="flat", highlightthickness=1, highlightbackground=T.BORDER)
        desc.pack(anchor="w", pady=4, fill="x")
        para(p, "Your painting (optional now): the Midjourney sheet with the front, side and back views, or any single picture of the character.", pady=(10, 0))
        pic = t.StringVar(value="")
        prow = t.ttk.Frame(p)
        prow.pack(anchor="w", fill="x")
        t.ttk.Entry(prow, textvariable=pic, width=56).pack(side="left")
        from tkinter import filedialog

        t.ttk.Button(prow, text="Choose picture…", command=lambda: pic.set(filedialog.askopenfilename(title="The character's painting", filetypes=[("Images", "*.png *.jpg *.jpeg *.webp")]) or pic.get())).pack(side="left", padx=4)
        kind_var = t.StringVar(value="sheet")
        krow = t.ttk.Frame(p)
        krow.pack(anchor="w", pady=(2, 0))
        t.ttk.Label(krow, text="That picture is:").pack(side="left")
        for val, label in (("sheet", "a sheet (several views side by side)"), ("front", "one front view"), ("style", "a pixel-style image")):
            t.ttk.Radiobutton(krow, text=label, value=val, variable=kind_var).pack(side="left", padx=4)
        note = Note(p)

        def ok():
            if not desc.get("1.0", "end").strip():
                desc.insert("1.0", EXAMPLE_DESCRIPTION)
            try:
                r = api.add_character(self.app.project, name.get(), desc.get("1.0", "end").strip())
            except Exception as e:  # noqa: BLE001
                note.warn(str(e))
                return
            api.set_description(self.app.project, r["character"], desc.get("1.0", "end").strip())
            picture = pic.get().strip()
            imported = None
            if picture:
                try:
                    imported = api.import_source(self.app.project, r["character"], kind_var.get(), picture)
                except Exception as e:  # noqa: BLE001
                    self.app._log(f"The character was made, but the picture could not be brought in: {e}. Use step 2 to add it.")
            self.app._open(str(self.app.project.root), go=False)
            self.app.char.set(r["character"])
            self.app.refresh_nav()
            if imported:
                self.app.show("character", step="split")
                self.app._tell(f"'{r['character']}' added with its picture. Press Continue to cut the figures out, or Run all automatic steps.")
            else:
                self.app.show("character", step="prompts")
                self.app._tell(f"'{r['character']}' added. Step 1 gives the Midjourney prompt; step 2 brings the picture in.")

        row = t.ttk.Frame(p)
        row.pack(anchor="w", pady=10)
        t.ttk.Button(row, text="Create", command=ok, style="Go.TButton").pack(side="left")
        t.ttk.Button(row, text="Cancel", command=lambda: self.app.show("home")).pack(side="left", padx=6)
        name.bind("<Return>", lambda e: ok())

    # --------------------------------------------------------------- steps
    def _step_prompts(self, c) -> None:
        t = tk()
        from ..prompts import DESCRIPTION_TIPS, EXAMPLE_DESCRIPTION
        from .. import api

        p = self.p
        self._how(["Write one sentence about the character in the box (what they wear, their colours, one or two details).",
                   "Click 'Update prompts'.",
                   "Click 'Copy A2: 4-view sheet' and paste it into Midjourney. Upscale the result and save it as a PNG.",
                   "Optional: 'Copy C' gives a single pixel-style picture for the colours; 'Copy A3' a plan sheet for hats and shoulders."])
        t.ttk.Label(p, text="Description:").pack(anchor="w")
        desc = t.Text(p, height=3, wrap="word", font=T.FONT, bg=T.FIELD, fg=T.BONE, insertbackground=T.BONE, relief="flat", highlightthickness=1, highlightbackground=T.BORDER)
        desc.insert("1.0", c.description or EXAMPLE_DESCRIPTION)
        desc.pack(fill="x")
        para(p, DESCRIPTION_TIPS, style="Dim.TLabel", pady=(2, 4))
        ref = t.StringVar(value="[SHEET IMAGE URL]")
        f = t.ttk.Frame(p)
        f.pack(fill="x", pady=4)
        t.ttk.Label(f, text="Sheet image URL for the B prompts (after you made the sheet):").pack(side="left")
        t.ttk.Entry(f, textvariable=ref, width=40).pack(side="left", padx=4)
        btns = t.ttk.Frame(p)
        btns.pack(fill="x", pady=(2, 4))
        from tkinter.scrolledtext import ScrolledText

        box = ScrolledText(p, height=16, font=T.FONT_MONO, wrap="word", bg=T.FIELD, fg=T.BONE, relief="flat", highlightthickness=1, highlightbackground=T.BORDER, insertbackground=T.BONE)
        box.pack(fill="both", expand=True, pady=4)

        def regen():
            api.set_description(self.app.project, c.name, desc.get("1.0", "end").strip())
            r = api.get_prompts(self.app.project, c.name, ref.get().strip() or "[SHEET IMAGE URL]")
            box.delete("1.0", "end")
            for pr in r["prompts"]:
                box.insert("end", f"{pr['title']}\n{pr['purpose']}\n\n{pr['prompt']}\n\n{'-' * 100}\n\n")
            box.insert("end", "RULES\n" + "\n".join(f"• {x}" for x in r["rules"]))
            self.app.refresh_nav()

        def copy(kind):
            api.set_description(self.app.project, c.name, desc.get("1.0", "end").strip())
            r = api.get_prompts(self.app.project, c.name, ref.get().strip() or "[SHEET IMAGE URL]")
            text = next(pr["prompt"] for pr in r["prompts"] if pr["key"] == kind)
            self.app.root.clipboard_clear()
            self.app.root.clipboard_append(text)
            self.app._tell(f"Copied prompt {kind.upper()} to the clipboard. Paste it into Midjourney.")

        t.ttk.Button(btns, text="Update prompts", command=regen, style="Go.TButton").pack(side="left")
        for kind, label in (("sheet4", "Copy A2: 4-view sheet"), ("sheet", "Copy A: 3-view sheet"), ("sheet_t", "Copy A4: T-pose"), ("sheet_top", "Copy A3: plan"),
                            ("front", "Copy B1: front"), ("back", "Copy B2: back"), ("sprite", "Copy C: sprite"), ("item", "Copy D: item")):
            t.ttk.Button(btns, text=label, command=lambda k=kind: copy(k), style="Tool.TButton").pack(side="left", padx=2)
        regen()

    def _step_import(self, c) -> None:
        t = tk()
        from .. import api
        from tkinter import filedialog

        p = self.p
        self._how(["Click 'Choose file' next to 'Character sheet' and pick the sheet (front, side, back in one image). This one is needed.",
                   "If you also made a single pixel-style picture (prompt C), add it under 'Pixel-style image'. It helps the colours.",
                   "The single front / back / side pictures and the plan sheet are optional extras.",
                   "Then press Continue (or Run all automatic steps)."], open=not c.sources)
        rows = [("sheet", "A / A2. Character sheet (front / three-quarter / side / back)"), ("front", "B1. Front view (optional)"), ("back", "B2. Back view (optional)"),
                ("side", "Side view (optional)"), ("quarter", "Three-quarter view (optional)"), ("topbottom", "A3. Plan sheet: top view + underside (optional)"),
                ("style", "C. Pixel-style image (palette / quick path)")]
        for kind, label in rows:
            f = t.ttk.Frame(p)
            f.pack(fill="x", pady=2)
            t.ttk.Label(f, text=label, width=58, anchor="w").pack(side="left")

            def pick(kind=kind):
                path = filedialog.askopenfilename(title=f"Choose the {kind} image", filetypes=[("Images", "*.png *.jpg *.jpeg *.webp")])
                if path:
                    self._run_then_render(lambda: api.import_source(self.app.project, c.name, kind, path), "Bringing the picture in…")

            t.ttk.Button(f, text="Choose file…", command=pick, style="Go.TButton" if kind == "sheet" and "sheet" not in c.sources else "TButton").pack(side="left", padx=6)
            t.ttk.Label(f, text=("✔ " + Path(c.sources[kind]).name) if kind in c.sources else "—", style="Good.TLabel" if kind in c.sources else "Dim.TLabel").pack(side="left", padx=6)
        if c.sources:
            hsep(p)
            self.preview = PreviewArea(p, height=300, caption="Click a picture below to see it large.")
            self.preview.pack(fill="x")
            strip = ThumbStrip(p, height=150, on_click=lambda pth: self.preview.show(pth, caption=Path(pth).name))
            strip.pack(fill="x", pady=(6, 0))
            items = [(self.app.project.root / rel, f"{k}: {Path(rel).name}") for k, rel in c.sources.items()]
            strip.set(items)
            first = self.app.project.root / (c.sources.get("sheet") or next(iter(c.sources.values())))
            self.preview.show(first, caption=first.name)

    def _step_split(self, c) -> None:
        t = tk()
        from .. import api

        p = self.p
        self._how(["Click 'Run split' (or Continue). The cutouts appear below.",
                   "Look at them. Background still stuck to a figure, or a part cut away? Click 'Edit' under that view: erase, restore, magic erase, lasso.",
                   "'Skin' paints on a cutout (recolour, brush, glow, clone); 'Colour' changes one colour and keeps the shading.",
                   "Wrong number of figures? Set 'Figures on the sheet' and run again. Loosen the tolerance if background remains; tighten it if the figure loses parts."],
                  open=not c.done.get("split"))
        f = t.ttk.Frame(p)
        f.pack(anchor="w", pady=(0, 4))
        tol = t.StringVar(value=str(c.settings.get("tolerance", 0.08)))
        t.ttk.Label(f, text="Background tolerance (0.03 strict … 0.2 loose):").pack(side="left")
        t.ttk.Spinbox(f, textvariable=tol, from_=0.01, to=0.5, increment=0.01, width=6).pack(side="left", padx=4)
        nviews = t.StringVar(value=str(c.settings.get("sheet_views", 0) or "auto"))
        t.ttk.Label(f, text="Figures on the sheet:").pack(side="left", padx=(12, 0))
        t.ttk.Combobox(f, textvariable=nviews, values=["auto", "2", "3", "4"], width=5, state="readonly").pack(side="left", padx=4)
        note = Note(p, pady=(0, 0))

        def run_split():
            try:
                tv = float(tol.get())
            except ValueError:
                note.warn("Tolerance must be a number, e.g. 0.08")
                return
            n = None if nviews.get() == "auto" else int(nviews.get())
            if n:
                c.settings["sheet_views"] = n
            self._run_then_render(lambda: api.split(self.app.project, c.name, tolerance=tv, expected_views=n), "Cutting the figures out…")

        row = t.ttk.Frame(p)
        row.pack(anchor="w", pady=(4, 2))
        t.ttk.Button(row, text="Run split" if not c.done.get("split") else "Run split again", command=run_split, style="Go.TButton").pack(side="left")
        views_dir = self.app.project.sub(c.name, "views")
        views = [v for v in sorted(views_dir.glob("*.png")) if not v.stem.endswith("_raw")]
        if views:
            t.ttk.Button(row, text="Open folder", command=lambda: webbrowser.open(str(views_dir))).pack(side="left", padx=(12, 3))
            t.ttk.Button(row, text="Reload", command=self.render).pack(side="left")
        self._check_note(c, "split_check")
        if not c.sources:
            para(p, "No picture yet: bring the sheet in at step 2 first.", style="Warn.TLabel")
        if views:
            hsep(p)
            para(p, "Under each cutout: Edit erases leftover background or puts parts back · Skin paints on it · Colour changes one colour and keeps the shading. Click a cutout to see it large below.",
                 style="Dim.TLabel", pady=(0, 2))
            self.preview = PreviewArea(p, height=340, caption="", checkerboard=True)
            strip = ThumbStrip(p, height=190, on_click=lambda pth: self.preview.show(pth, caption=Path(pth).name))
            strip.pack(fill="x")
            strip.set(views, actions=[("Edit", self.edit_cutout), ("Skin", self.skin_cutout), ("Colour", self.colour_cutout)])
            self.preview.pack(fill="x", pady=(6, 0))
            front = next((v for v in views if v.stem == "front"), views[0])
            self.preview.show(front, caption=front.name)
            para(p, "The front view decides the body: make sure nothing of the background is left inside it. After editing, run the next steps again (Redo from here on step 4).",
                 style="Dim.TLabel", pady=(6, 0))

    def _step_palette(self, c) -> None:
        t = tk()
        from .. import api

        p = self.p
        self._how(["Click 'Build palette' (or Continue). That is all. The full-colour style keeps every colour; the other styles reduce to a fixed set."], open=not c.done.get("palette"))
        t.ttk.Button(p, text="Build palette", command=lambda: self._run_then_render(lambda: api.make_palette(self.app.project, c.name), "Locking the colours…"), style="Go.TButton").pack(anchor="w", pady=(2, 4))
        self._result(c.notes.get("palette", ""))
        sw = self.app.project.char_dir(c.name) / "palette.png"
        if sw.exists():
            pv = PreviewArea(p, height=160, caption="The locked colours")
            pv.pack(fill="x", pady=(8, 0))
            pv.show(sw)
            pv.view.set_mode(4 if pv.view.image is not None and pv.view.image.height < 40 else "fit")

    def _step_model(self, c) -> None:
        t = tk()
        from .. import api

        p = self.p
        self._how(["Blender (free) must be on this computer. If the line below says 'not found', click 'Download Blender for me' and wait (380 MB).",
                   "Click 'Build model' (or Continue). It takes a minute or two; the status line and the log show progress.",
                   "Wide hats become real cones; thin cords and charms become painted cards. A plan sheet (prompt A3) gives the top of the figure its own painting."],
                  open=not c.done.get("model"))
        found = api.find_blender(self.app.project)
        para(p, f"Blender: {found}" if found else "Blender: not found on this computer.", style="Good.TLabel" if found else "Warn.TLabel", pady=(0, 2))
        if not found:
            row = t.ttk.Frame(p)
            row.pack(anchor="w", pady=(0, 6))
            t.ttk.Button(row, text="Download Blender for me", command=lambda: self._run_then_render(lambda: api.download_blender(self.app.project, log=self.app._log), "Downloading Blender (380 MB)…"), style="Go.TButton").pack(side="left")
            t.ttk.Button(row, text="I have Blender: set its path", command=lambda: self.app.show("settings")).pack(side="left", padx=6)
        f = t.ttk.Frame(p)
        f.pack(anchor="w", pady=(4, 2))
        t.ttk.Label(f, text="Body:").pack(side="left")
        mode = t.StringVar(value=c.settings.get("model_mode", "auto"))
        box = t.ttk.Combobox(f, textvariable=mode, values=["auto", "template", "hull"], state="readonly", width=10)
        box.pack(side="left", padx=4)
        Tooltip(box, "auto: the human mannequin fitted to the painting when legs show, else the carved shape.\ntemplate: always the mannequin (a short robe).\nhull: always the carved shape.")

        def set_mode(*_):
            c.settings["model_mode"] = mode.get()
            self.app.project.save()

        box.bind("<<ComboboxSelected>>", set_mode)
        t.ttk.Button(p, text="Build model", command=lambda: self._run_then_render(lambda: api.build_model(self.app.project, c.name, log=self.app._log), "Building the 3D figure…"),
                     style="Go.TButton" if found else "TButton").pack(anchor="w", pady=4)
        self._result(c.notes.get("model_note", ""))
        self._check_note(c, "model_check")
        prev = self.app.project.char_dir(c.name) / "model" / f"{c.name}_hull.png"
        if prev.exists():
            pv = PreviewArea(p, height=260, caption="The carved shape: front, side, three-quarter, top")
            pv.pack(fill="x", pady=(8, 0))
            pv.show(prev)

    def _step_rig(self, c) -> None:
        t = tk()
        from .. import api

        p = self.p
        mix = self.app.project.sub(c.name, "mixamo")
        self._how(["Click 'Rig and animate' (or Continue). Nothing else is needed.", "Mixamo is only an optional extra for motion-capture moves; you can ignore it."], open=not c.done.get("rig"))
        t.ttk.Button(p, text="Rig and animate automatically", command=lambda: self._run_then_render(lambda: api.rig(self.app.project, c.name, log=self.app._log), "Adding the skeleton and the moves…"), style="Go.TButton").pack(anchor="w", pady=4)
        self._result(c.notes.get("rig", ""))
        hsep(p)
        col = Collapsible(p, "Optional: Mixamo motion capture (free Adobe account, a browser)", open=False)
        col.pack(fill="x")
        para(col.body, f"1. Upload  {self.app.project.sub(c.name, 'model') / (c.name + '.fbx')}  at mixamo.com, place the markers, pick animations.\n"
                       "2. Download the FIRST as FBX 'With Skin', the others 'Without Skin' (30 fps).\n"
                       f"3. Put the .fbx files in  {mix}  and click Import.", style="Dim.TLabel")
        row = t.ttk.Frame(col.body)
        row.pack(anchor="w")
        t.ttk.Button(row, text="Open the mixamo folder", command=lambda: webbrowser.open(str(mix))).pack(side="left")
        t.ttk.Button(row, text="Import Mixamo files", command=lambda: self._run_then_render(lambda: api.import_mixamo(self.app.project, c.name, log=self.app._log), "Importing Mixamo files…")).pack(side="left", padx=6)
        files = sorted(mix.glob("*.fbx")) + sorted(mix.glob("*.FBX"))
        t.ttk.Label(row, text=f"{len(files)} FBX file(s) in the folder.", style="Dim.TLabel").pack(side="left", padx=6)

    def _step_render(self, c) -> None:
        t = tk()
        from .. import api

        p = self.p
        self._how(["Click 'Render' (or Continue). This is the slow step: minutes on a laptop. The status line counts the clips.",
                   "'Every Nth frame' 2 is the normal setting. 'Frames per clip' 24 gives smooth motion in the game (the game keeps up to 24).",
                   "Tick normal and depth when the character is final: the lantern then lights the sprite properly (three renders per frame, slower)."],
                  open=not c.done.get("render"))
        f = t.ttk.Frame(p)
        f.pack(anchor="w", pady=(0, 4))
        step = t.StringVar(value="2")
        elev = t.StringVar(value="30")
        per_clip = t.StringVar(value="24")
        t.ttk.Label(f, text="Every Nth frame:").pack(side="left")
        t.ttk.Spinbox(f, textvariable=step, from_=1, to=6, width=4).pack(side="left", padx=4)
        t.ttk.Label(f, text="Frames per clip:").pack(side="left", padx=(8, 0))
        t.ttk.Spinbox(f, textvariable=per_clip, from_=4, to=48, width=4).pack(side="left", padx=4)
        t.ttk.Label(f, text="Camera elevation °:").pack(side="left", padx=(8, 0))
        t.ttk.Spinbox(f, textvariable=elev, from_=10, to=60, width=4).pack(side="left", padx=4)
        f2 = t.ttk.Frame(p)
        f2.pack(anchor="w", pady=(0, 4))
        t.ttk.Label(f2, text="Passes:").pack(side="left")
        normal = t.BooleanVar(value=False)
        depth = t.BooleanVar(value=False)
        t.ttk.Checkbutton(f2, text="normal map", variable=normal).pack(side="left", padx=4)
        t.ttk.Checkbutton(f2, text="depth map", variable=depth).pack(side="left", padx=4)
        t.ttk.Label(f2, text="Clips (blank = all):").pack(side="left", padx=(12, 0))
        clips = t.StringVar(value="")
        e = t.ttk.Entry(f2, textvariable=clips, width=28)
        e.pack(side="left", padx=4)
        Tooltip(e, "e.g. idle,walk  to render only those while judging the look")
        note = Note(p, pady=(0, 0))

        def render():
            try:
                st, el, pc = int(step.get()), float(elev.get()), int(per_clip.get())
            except ValueError:
                note.warn("Every Nth frame and frames per clip must be whole numbers; the elevation a number of degrees.")
                return
            passes = ",".join(["color"] + (["normal"] if normal.get() else []) + (["depth"] if depth.get() else [])) if (normal.get() or depth.get()) else None
            acts = [a.strip() for a in clips.get().split(",") if a.strip()] or None
            self._run_then_render(lambda: api.render(self.app.project, c.name, actions=acts, step=st, elevation=el, passes=passes, per_clip=pc, log=self.app._log), "Filming from 8 directions…")

        t.ttk.Button(p, text="Render", command=render, style="Go.TButton").pack(anchor="w", pady=4)
        self._result(c.notes.get("render", ""))
        self._check_note(c, "render_check")
        renders = self.app.project.sub(c.name, "renders")
        if any(renders.iterdir()):
            hsep(p)
            heading(p, "Watch a clip")
            pl = AnimPlayer(p, on_gif=lambda clip, d: self._save_gif(c, clip, d, "renders"), height=300)
            pl.pack(fill="x")
            pl.set_source(renders, "renders", fps=12)
            self.players.append(pl)

    def _step_pixelate(self, c) -> None:
        t = tk()
        from .. import api

        p = self.p
        self._how(["Tick 'Add a dark 1-pixel outline' if your game draws sprites with an outline (Godmarrow does not).",
                   "Click 'Pixelate all frames' (or Continue).",
                   "Watch the clip below and judge it. If it looks wrong, the fix is usually in step 3 (cutout) or step 5 (model): Redo from there."],
                  open=not c.done.get("pixelate"))
        outline = t.BooleanVar(value=False)
        t.ttk.Checkbutton(p, text="Add a dark 1-pixel outline", variable=outline).pack(anchor="w")
        t.ttk.Button(p, text="Pixelate all frames", command=lambda: self._run_then_render(lambda: api.pixelate_renders(self.app.project, c.name, outline="auto" if outline.get() else None, log=self.app._log), "Turning the film into pixel art…"),
                     style="Go.TButton").pack(anchor="w", pady=4)
        self._result(c.notes.get("pixelate", ""))
        frames = self.app.project.sub(c.name, "frames")
        if any(frames.glob("*_S")):
            hsep(p)
            heading(p, "Watch a clip")
            pl = AnimPlayer(p, on_gif=lambda clip, d: self._save_gif(c, clip, d, "frames"), height=300)
            pl.pack(fill="x")
            pl.set_source(frames, "frames", fps=10)
            self.players.append(pl)
            hsep(p)
            strip = ThumbStrip(p, height=180)
            strip.pack(fill="x")
            sample = sorted(frames.glob("*_S/frame_000.png"))[:3] + sorted(frames.glob("*_W/frame_000.png"))[:1] + sorted(frames.glob("*_N/frame_000.png"))[:1]
            strip.set([(s, s.parent.name) for s in sample])

    def _save_gif(self, c, clip: str, direction: str, source: str) -> None:
        from .. import api

        def done(r):
            self.app._tell(f"GIF saved: {r['gif']}")
            webbrowser.open(r["gif"])

        self.app._run(lambda: api.preview_gif(self.app.project, c.name, clip, direction, source=source), after=done, what="Writing the GIF…")

    def _step_export(self, c) -> None:
        t = tk()
        from .. import api

        p = self.p
        self._how(["Game atlas (Godmarrow): type the kind name (for example 'keeper') and click 'Export game atlas'. It writes <kind>.png + <kind>.json with 8 views and foot anchors.",
                   "Any Godot game: 'Export for Godot' gives a sprite sheet, a SpriteFrames (.tres) and a ready scene (.tscn).",
                   "Then the Game page shows the set in the game, and the Skin and Effects editors touch up the finished set."], open=not c.done.get("export"))
        f = t.ttk.Frame(p)
        f.pack(anchor="w", pady=2)
        kind = t.StringVar(value=c.notes.get("export_kind", c.name))
        t.ttk.Label(f, text="Kind (file name in the game):").pack(side="left")
        t.ttk.Entry(f, textvariable=kind, width=16).pack(side="left", padx=4)

        def export_game():
            k = kind.get().strip() or c.name
            self._run_then_render(lambda: api.export_game(self.app.project, c.name, k), "Writing the game atlas…", after=lambda r: self.app._tell("Exported " + r["color"]["png"]))

        t.ttk.Button(f, text="Export game atlas", command=export_game, style="Go.TButton").pack(side="left", padx=6)
        self._result(c.notes.get("export_game", ""))
        row = t.ttk.Frame(p)
        row.pack(anchor="w", pady=(6, 2))
        t.ttk.Button(row, text="Export for Godot (SpriteFrames)", command=lambda: self._run_then_render(lambda: api.export(self.app.project, c.name), "Writing the Godot files…", after=lambda r: self.app._tell("Exported: " + str(r.get("godot", ""))))).pack(side="left")
        self._result(c.notes.get("export", ""))
        js = c.notes.get("export_game_json")
        if js and Path(js).exists():
            hsep(p)
            heading(p, "Touch up the finished set")
            row = t.ttk.Frame(p)
            row.pack(anchor="w", pady=4)
            png = Path(js).with_suffix(".png")
            t.ttk.Button(row, text="Skin editor (every frame at once)", command=lambda: self.app.show("skin", path=str(png), back=("character", {"step": "export"}))).pack(side="left")
            t.ttk.Button(row, text="Colour editor", command=lambda: self.app.show("colour", path=str(png), back=("character", {"step": "export"}))).pack(side="left", padx=6)
            t.ttk.Button(row, text="Attach effects (smoke, glow, embers…)", command=lambda: self.app.show("fx", sprite_json=js, back=("character", {"step": "export"}))).pack(side="left")
            t.ttk.Button(row, text="▶ Preview in game", command=lambda: self.app.show("game", skin=Path(js).stem), style="Go.TButton").pack(side="left", padx=6)
            pv = PreviewArea(p, height=320, caption=f"{png.name}  (the first sheet of the game atlas)")
            pv.pack(fill="x", pady=(8, 0))
            pv.show(png)
        else:
            sheet = self.app.project.sub(c.name, "export") / f"{c.name}.png"
            if sheet.exists():
                pv = PreviewArea(p, height=320, caption=sheet.name)
                pv.pack(fill="x", pady=(8, 0))
                pv.show(sheet)

    def _step_still(self, c) -> None:
        t = tk()
        from .. import api

        p = self.p
        self._how(["Pick the picture and an animation.", "Click 'Make sprite' to see it, or 'Make sprite + animate + export' to get the game files."], open=True)
        view = t.StringVar(value="style" if "style" in c.sources else "front")
        f = t.ttk.Frame(p)
        f.pack(anchor="w")
        t.ttk.Label(f, text="Image:").pack(side="left")
        t.ttk.Combobox(f, textvariable=view, values=["style", "front", "side", "back"], state="readonly", width=8).pack(side="left", padx=4)
        preset = t.StringVar(value="idle")
        t.ttk.Label(f, text="Animation:").pack(side="left")
        t.ttk.Combobox(f, textvariable=preset, values=["idle", "cloak", "hover", "flame", "glow", "grass"], state="readonly", width=8).pack(side="left", padx=4)
        row = t.ttk.Frame(p)
        row.pack(anchor="w", pady=4)
        t.ttk.Button(row, text="Make sprite", command=lambda: self._run_then_render(lambda: api.pixelate_still(self.app.project, c.name, view.get()), "Making the sprite…"), style="Go.TButton").pack(side="left")
        t.ttk.Button(row, text="Make sprite + animate + export", command=lambda: self._run_then_render(
            lambda: (api.animate_still(self.app.project, c.name, view.get(), [preset.get()]), api.export(self.app.project, c.name))[-1], "Sprite, animation, export…")).pack(side="left", padx=6)
        sprites = sorted(self.app.project.sub(c.name, "sprites").glob("*_x4.png"))
        anim = self.app.project.sub(c.name, "anim")
        if sprites:
            hsep(p)
            pv = PreviewArea(p, height=320, caption=sprites[0].name)
            pv.pack(fill="x")
            pv.show(sprites[0])
            strip = ThumbStrip(p, height=160, on_click=lambda pth: pv.show(pth, caption=Path(pth).name))
            strip.pack(fill="x", pady=(6, 0))
            strip.set(sprites)
        clips = [d for d in sorted(anim.iterdir()) if d.is_dir()] if anim.exists() else []
        if clips:
            hsep(p)
            heading(p, "Animation")
            pl = AnimPlayer(p, height=240)
            pl.pack(fill="x")
            frames = sorted(clips[-1].glob("frame_*.png"))
            pl.set_frames(frames, fps=8, caption=clips[-1].name)
            self.players.append(pl)
