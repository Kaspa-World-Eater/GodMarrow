"""Home: open a painting, recent projects, and what to do next for the open project."""
from __future__ import annotations

from pathlib import Path

from . import theme as T
from .app import Page, STEP_BLURB, forget, recent
from .widgets import ScrollFrame, Tooltip, heading, para, tk


class HomePage(Page):
    key = "home"
    title = "PixelForge Studio"
    blurb = "Paintings in, game-ready pixel art out: characters in 8 directions, props, effects, tiles, UI, sounds and music."

    def build(self) -> None:
        t = tk()
        self.scroll = ScrollFrame(self.frame)
        self.scroll.pack(fill="both", expand=True)
        p = self.scroll.inner
        # the one big action
        card = t.ttk.Frame(p, style="Card.TFrame", padding=18)
        card.pack(fill="x", pady=(4, 12))
        t.ttk.Label(card, text="Start with a painting", style="Card.TLabel", font=T.FONT_H).pack(anchor="w")
        self.drop_hint = t.ttk.Label(card, text="", style="CardDim.TLabel", wraplength=800, justify="left")
        self.drop_hint._wrap = True
        self.drop_hint.pack(anchor="w", pady=(2, 10), fill="x")
        row = t.ttk.Frame(card, style="Card.TFrame")
        row.pack(anchor="w")
        b = t.ttk.Button(row, text="Open a painting…", command=self.app._start_from_picture, style="Big.Go.TButton")
        b.pack(side="left")
        Tooltip(b, "Ctrl+P. The character is named after the file; every automatic step runs.")
        t.ttk.Button(row, text="Add a character by name", command=self.app._add_character, style="Big.TButton").pack(side="left", padx=8)
        t.ttk.Button(row, text="Describe it, get it", command=lambda: self.app.show("describe"), style="Big.TButton").pack(side="left")
        # what to do next
        self.next_card = t.ttk.Frame(p, style="Card.TFrame", padding=14)
        self.next_card.pack(fill="x", pady=(0, 12))
        t.ttk.Label(self.next_card, text="What to do next", style="Card.TLabel", font=T.FONT_B).pack(anchor="w")
        self.next_text = t.ttk.Label(self.next_card, text="", style="Card.TLabel", wraplength=800, justify="left")
        self.next_text._wrap = True
        self.next_text.pack(anchor="w", pady=(4, 6), fill="x")
        self.next_row = t.ttk.Frame(self.next_card, style="Card.TFrame")
        self.next_row.pack(anchor="w")
        # recent projects, then the short guide
        left = t.ttk.Frame(p)
        left.pack(fill="x")
        right = t.ttk.Frame(p, padding=(0, 12, 0, 0))
        right.pack(fill="x")
        heading(left, "Projects")
        self.recent_frame = t.ttk.Frame(left)
        self.recent_frame.pack(fill="x")
        prow = t.ttk.Frame(left)
        prow.pack(anchor="w", pady=(6, 0))
        t.ttk.Button(prow, text="Open a project folder…", command=self.app._open_dialog).pack(side="left")
        t.ttk.Button(prow, text="New project…", command=self.app._new).pack(side="left", padx=6)
        heading(right, "A character in five moves")
        para(right, "1. Open a painting: the character is made from it and every automatic step runs. A project folder is made for you in Documents.\n"
                    "2. Or add a character by name: step 1 writes the Midjourney prompts, step 2 brings the painting in.\n"
                    "3. Watch the status line at the bottom (Log ▴ shows the detail). The app stops and says so if it needs something: Blender, a picture.\n"
                    "4. Step 3 shows the cutouts with Edit, Skin and Colour under each; step 8 plays the animation.\n"
                    "5. Step 9 writes the files the game loads; the Game page shows them in the game.")
        para(right, "Everything here is also a command line and an AI-assistant tool (Help).", style="Dim.TLabel")
        heading(right, "Keys")
        para(right, "Ctrl+P open a painting · F5 run every automatic step · Ctrl+T tools · Ctrl+D describe it · Ctrl+Z / Ctrl+Y undo and redo in the editors · + / − zoom · Ctrl+L the log · Esc back", style="Dim.TLabel")

    def on_show(self, **kw) -> None:
        self.refresh()

    def refresh(self) -> None:
        t = tk()
        app = self.app
        dnd = "Drag a picture onto this window, or click the button. A wide picture is taken as a sheet of views, a tall one as a single front view." if app.dnd_ok \
            else "Click the button and pick the PNG you saved from Midjourney. A wide picture is taken as a sheet of views, a tall one as a single front view."
        self.drop_hint.configure(text=dnd)
        for w in self.recent_frame.winfo_children():
            w.destroy()
        items = recent()
        if not items:
            t.ttk.Label(self.recent_frame, text="No projects yet. Opening a painting makes one for you.", style="Dim.TLabel").pack(anchor="w")
        for pth in items[:6]:
            row = t.ttk.Frame(self.recent_frame)
            row.pack(fill="x", pady=1)
            name = Path(pth).name
            b = t.ttk.Button(row, text=name, command=lambda p=pth: app._open(p), style="Link.TButton")
            b.pack(side="left")
            Tooltip(b, pth)
            short = self._short(pth)
            t.ttk.Label(row, text=short if len(short) < 70 else "…" + short[-68:], style="Small.TLabel").pack(side="left", padx=6)
            x = t.ttk.Button(row, text="forget", command=lambda p=pth: (forget(p), self.refresh()), style="Link.TButton")
            x.pack(side="right")
            Tooltip(x, "Remove from this list (the folder stays)")
        # what to do next
        for w in self.next_row.winfo_children():
            w.destroy()
        c = app.current_char()
        if app.project is None:
            self.next_text.configure(text="No project is open. Open a painting to start a character; a project folder is made for you.")
            t.ttk.Button(self.next_row, text="Open a painting…", command=app._start_from_picture, style="Go.TButton").pack(side="left")
            return
        if c is None:
            self.next_text.configure(text=f"Project '{app.project.name}' is open with no character yet. Open a painting, or add a character by name.")
            t.ttk.Button(self.next_row, text="Open a painting…", command=app._start_from_picture, style="Go.TButton").pack(side="left")
            t.ttk.Button(self.next_row, text="Add a character", command=app._add_character).pack(side="left", padx=6)
            return
        nxt = app.next_step(c)
        done = sum(1 for k in c.done.values() if k)
        from .. import api

        if all(c.done.get(k) for k, _ in __import__("pixelforge.project", fromlist=["STEPS"]).STEPS):
            text = f"'{c.name}' is finished (all 9 steps). Preview the set in the game, or touch up the exported sheet with the Skin and Effects editors."
            t.ttk.Button(self.next_row, text="Game page", command=lambda: app.show("game"), style="Go.TButton").pack(side="left")
            t.ttk.Button(self.next_row, text="Step 9", command=lambda: app.show("character", step="export")).pack(side="left", padx=6)
        elif nxt == "prompts":
            text = f"'{c.name}' has no picture yet. Step 1 writes the Midjourney prompts; step 2 brings the painting in. Or open a painting now."
            t.ttk.Button(self.next_row, text="Step 1: prompts", command=lambda: app.show("character", step="prompts"), style="Go.TButton").pack(side="left")
            t.ttk.Button(self.next_row, text="Open a painting…", command=app._start_from_picture).pack(side="left", padx=6)
        elif nxt == "import":
            text = f"'{c.name}' needs its painting: bring the sheet in at step 2."
            t.ttk.Button(self.next_row, text="Step 2: pictures", command=lambda: app.show("character", step="import"), style="Go.TButton").pack(side="left")
        elif nxt == "model" and not api.find_blender(app.project):
            text = f"'{c.name}': {done} of 9 steps done. Step 5 needs Blender (free). The step can download it for you, then press Continue."
            t.ttk.Button(self.next_row, text="Step 5: Blender", command=lambda: app.show("character", step="model"), style="Go.TButton").pack(side="left")
        else:
            text = f"'{c.name}': {done} of 9 steps done. Next: {STEP_BLURB.get(nxt, nxt)}. Continue runs it; Run all runs every remaining automatic step."
            t.ttk.Button(self.next_row, text=f"Continue: {STEP_BLURB.get(nxt, nxt)}", command=app.continue_, style="Go.TButton").pack(side="left")
            t.ttk.Button(self.next_row, text="Run all (F5)", command=app._run_all).pack(side="left", padx=6)
        issues = [v for k, v in c.notes.items() if k.endswith("_check") and v not in ("cutouts clean", "carve clean", "frames clean")]
        if issues:
            text += "  Checks: " + " · ".join(issues)
        self.next_text.configure(text=text)
        self.scroll.refit()

    @staticmethod
    def _short(p: str) -> str:
        home = str(Path.home())
        return ("~" + p[len(home):]) if p.startswith(home) else p
