"""Settings, Help and Describe-it pages."""
from __future__ import annotations

import json
import sys
import webbrowser
from pathlib import Path

from . import theme as T
from .app import HELP_URL, Page, forget, game_dir, prefs, repo_root, set_pref
from .widgets import Note, ScrollFrame, Tooltip, heading, hsep, para, tk


class SettingsPage(Page):
    key = "settings"
    title = "Settings"
    blurb = "The open project's settings, the game and Godot paths, and this program."

    def build(self) -> None:
        self.scroll = ScrollFrame(self.frame)
        self.scroll.pack(fill="both", expand=True)

    def on_show(self, **kw) -> None:
        self.render()

    def refresh(self) -> None:
        self.render()

    def render(self) -> None:
        t = tk()
        from tkinter import filedialog

        from .. import api
        from ..styles import STYLES

        self.scroll.clear()
        p = self.scroll.inner
        app = self.app
        self.note = Note(p, pady=(0, 6))
        heading(p, "Project")
        prj = app.project
        if prj is None:
            para(p, "No project is open. Opening a painting makes one for you in Documents; or open or make one here.", style="Dim.TLabel")
        else:
            para(p, f"{prj.name}  ·  {prj.root}", style="Dim.TLabel")
            rows = [("Quality style", "style", prj.style), ("Blender (blank = find it automatically)", "blender", prj.blender),
                    ("Directions to render (4 / 8 / 16)", "directions", str(prj.directions)), ("Render size in pixels (256 is plenty)", "render_size", str(prj.render_size)),
                    ("Godot res:// folder for sprites", "godot_res_dir", prj.godot_res_dir)]
            vars_ = {}
            grid = t.ttk.Frame(p)
            grid.pack(anchor="w", pady=4)
            for i, (label, key, val) in enumerate(rows):
                t.ttk.Label(grid, text=label).grid(row=i, column=0, sticky="w", padx=(0, 10), pady=3)
                v = t.StringVar(value=val)
                vars_[key] = v
                if key == "style":
                    t.ttk.Combobox(grid, textvariable=v, values=sorted(STYLES), state="readonly", width=14).grid(row=i, column=1, sticky="w")
                elif key == "blender":
                    f = t.ttk.Frame(grid)
                    f.grid(row=i, column=1, sticky="w")
                    t.ttk.Entry(f, textvariable=v, width=48).pack(side="left")
                    t.ttk.Button(f, text="Browse…", command=lambda v=v: v.set(filedialog.askopenfilename(title="The Blender program") or v.get()), style="Tool.TButton").pack(side="left", padx=4)
                else:
                    t.ttk.Entry(grid, textvariable=v, width=36).grid(row=i, column=1, sticky="w")
            found = api.find_blender(prj)
            para(p, f"Blender found: {found}" if found else "Blender: not found. Step 5 can download it for you, or give the path above.", style="Good.TLabel" if found else "Warn.TLabel", pady=(4, 2))

            def save():
                try:
                    api.configure(prj, **{k: v.get() for k, v in vars_.items()})
                except Exception as e:  # noqa: BLE001
                    self.note.warn(str(e))
                    return
                app._open(str(prj.root), go=False)
                app._tell("Settings saved.")

            row = t.ttk.Frame(p)
            row.pack(anchor="w", pady=(4, 8))
            t.ttk.Button(row, text="Save settings", command=save, style="Go.TButton").pack(side="left")
            if not found:
                t.ttk.Button(row, text="Download Blender for me", command=lambda: app._run(lambda: api.download_blender(prj, log=app._log), after=lambda r: self.render(), what="Downloading Blender (380 MB)…")).pack(side="left", padx=6)
            t.ttk.Button(row, text="Open the project folder", command=lambda: webbrowser.open(str(prj.root))).pack(side="left", padx=6)
        row = t.ttk.Frame(p)
        row.pack(anchor="w", pady=(2, 4))
        t.ttk.Button(row, text="Open another project…", command=app._open_dialog).pack(side="left")
        t.ttk.Button(row, text="New project…", command=app._new).pack(side="left", padx=6)
        if prj is not None:
            b = t.ttk.Button(row, text="Forget this project", command=lambda: (forget(str(prj.root)), app._tell("Removed from the recent list; the folder stays.")))
            b.pack(side="left")
            Tooltip(b, "Removes it from the recent list. Nothing is deleted.")
        hsep(p)
        heading(p, "Game and Godot")
        pf = prefs()
        g = game_dir()
        para(p, f"Game folder: {g}" if g else "Game folder: not found (a folder with project.godot). Set it below to use the Game page.", style="Good.TLabel" if g else "Warn.TLabel", pady=(0, 2))
        gd = t.StringVar(value=pf.get("game_dir", ""))
        gp = t.StringVar(value=pf.get("godot", ""))
        grid = t.ttk.Frame(p)
        grid.pack(anchor="w", pady=4)
        t.ttk.Label(grid, text="Game folder (blank = the one this Forge lives in)").grid(row=0, column=0, sticky="w", padx=(0, 10), pady=3)
        f = t.ttk.Frame(grid)
        f.grid(row=0, column=1, sticky="w")
        t.ttk.Entry(f, textvariable=gd, width=48).pack(side="left")
        t.ttk.Button(f, text="Folder…", command=lambda: gd.set(filedialog.askdirectory(title="The game folder (with project.godot)") or gd.get()), style="Tool.TButton").pack(side="left", padx=4)
        t.ttk.Label(grid, text="Godot program (blank = find it automatically)").grid(row=1, column=0, sticky="w", padx=(0, 10), pady=3)
        f = t.ttk.Frame(grid)
        f.grid(row=1, column=1, sticky="w")
        t.ttk.Entry(f, textvariable=gp, width=48).pack(side="left")
        t.ttk.Button(f, text="Browse…", command=lambda: gp.set(filedialog.askopenfilename(title="The Godot program") or gp.get()), style="Tool.TButton").pack(side="left", padx=4)
        from ..game_preview import find_godot

        godot = find_godot(pf.get("godot") or None)
        para(p, f"Godot found: {godot}" if godot else "Godot: not found. The Game page can still run 'Play Godmarrow.bat', which downloads it.", style="Good.TLabel" if godot else "Warn.TLabel", pady=(2, 2))

        def save_game():
            set_pref("game_dir", gd.get().strip())
            set_pref("godot", gp.get().strip())
            app._tell("Game settings saved.")
            self.render()

        t.ttk.Button(p, text="Save game settings", command=save_game, style="Go.TButton").pack(anchor="w", pady=(2, 6))
        hsep(p)
        heading(p, "This program")
        try:
            import tkinterdnd2  # noqa: F401

            dnd = "Drag-and-drop: on (tkinterdnd2 is installed)."
        except Exception:  # noqa: BLE001
            dnd = "Drag-and-drop: off. Install it with  pip install tkinterdnd2  (install.bat does this) and restart."
        para(p, dnd, style="Dim.TLabel", pady=(0, 2))
        log_open = t.BooleanVar(value=bool(pf.get("log_open", False)))
        t.ttk.Checkbutton(p, text="Open the log drawer at start", variable=log_open, command=lambda: set_pref("log_open", bool(log_open.get()))).pack(anchor="w")
        row = t.ttk.Frame(p)
        row.pack(anchor="w", pady=(6, 0))
        t.ttk.Button(row, text="Check for updates", command=self._check).pack(side="left")
        t.ttk.Button(row, text="Update and restart", command=app._update_forge).pack(side="left", padx=6)
        repo = repo_root()
        para(p, f"Installed from: {repo}" if repo else "Not installed from git (no self-update).", style="Small.TLabel", pady=(4, 0))
        para(p, f"Python {sys.version.split()[0]}  ·  {sys.executable}", style="Small.TLabel", pady=(0, 0))
        self.scroll.refit()

    def _check(self) -> None:
        import shutil
        import subprocess

        repo = repo_root()
        if repo is None or not shutil.which("git"):
            self.note.warn("Not a git checkout, or git is not installed.")
            return

        def work():
            subprocess.run(["git", "fetch", "--quiet"], cwd=str(repo), capture_output=True, text=True, timeout=60)
            r = subprocess.run(["git", "rev-list", "--count", "HEAD..@{u}"], cwd=str(repo), capture_output=True, text=True, timeout=30)
            return {"behind": int(r.stdout.strip() or 0)}

        self.app._run(work, after=lambda r: self.note.say(f"{r['behind']} newer change(s) available." if r["behind"] else "Up to date.", "warn" if r["behind"] else "good"),
                      what="Checking for updates…")


class HelpPage(Page):
    key = "help"
    title = "Help"
    blurb = "How the Forge works, the keys, where the files go, and what this computer has."

    def build(self) -> None:
        t = tk()
        self.scroll = ScrollFrame(self.frame)
        self.scroll.pack(fill="both", expand=True)
        p = self.scroll.inner
        row = t.ttk.Frame(p)
        row.pack(anchor="w", pady=(0, 8))
        t.ttk.Button(row, text="Open the user guide", command=lambda: webbrowser.open(HELP_URL), style="Go.TButton").pack(side="left")
        docs = Path(__file__).resolve().parents[2] / "docs"
        if (docs / "GUIDE_HUMANS.md").exists():
            t.ttk.Button(row, text="Guide (local file)", command=lambda: webbrowser.open(str(docs / "GUIDE_HUMANS.md"))).pack(side="left", padx=6)
        if (docs / "GUIDE_AI.md").exists():
            t.ttk.Button(row, text="Guide for AI assistants", command=lambda: webbrowser.open(str(docs / "GUIDE_AI.md"))).pack(side="left")
        heading(p, "How it works")
        para(p, "1. Paint the character in Midjourney with the prompts from step 1 (a sheet of views: front, three-quarter, side, back).\n"
                "2. Open the painting (Home, or Ctrl+P). PixelForge cuts the figures out (step 3), locks the colours (4), carves a 3D figure from the views and wraps the painting on it (5, Blender), "
                "adds a skeleton and the moves (6), films it from 8 directions with the game camera (7), presses every frame to pixel art (8) and writes the game files (9).\n"
                "3. Judge the result in the Game page. Fix a cutout with the Cutout editor, paint on it with the Skin editor, change a colour with the Colour editor, attach smoke or glow with Effects on a sprite.\n"
                "4. The Tools pages make everything else: effects and spells, props and trees, ground tiles, icons, portraits, UI frames, sounds and music.")
        heading(p, "Keys")
        para(p, "Ctrl+P open a painting · F5 run every automatic step · Ctrl+T tools · Ctrl+D describe it · Ctrl+O open a project · Ctrl+N new project\n"
                "In the editors: Ctrl+Z undo · Ctrl+Y redo · Ctrl+S save · + / − zoom · Shift+click adds to a selection · Alt+click takes away · Alt+click with the Clone brush sets its source\n"
                "Ctrl+L the log drawer · Esc back · F1 this page")
        heading(p, "Where the files are")
        para(p, "A project is a folder with project.json and one folder per character:\n"
                "characters/<name>/source  the pictures you brought in · views  the cutouts (and <view>_raw.png, the untouched crop) · palette.hex / palette.png · "
                "model  the 3D figure (.blend, .fbx) · renders/<clip>/<direction>/frame_NNN.png · frames/<clip>_<direction>/  the pixel frames · export/  the game files.\n"
                "The game atlas goes into the game's art/sprites/<kind>.png + .json. The Game page runs the game with it.", style="Dim.TLabel")
        heading(p, "For an AI assistant")
        para(p, "Everything on these pages is a command (pixelforge …) and an MCP tool: project status / run / run-all / reset, skin ops, vfx, spell, describe, game-preview, music. "
                "docs/GUIDE_AI.md lists them all; the Studio and the commands share one project.json so they never disagree.", style="Dim.TLabel")
        hsep(p)
        heading(p, "This computer")
        self.doc_frame = t.ttk.Frame(p)
        self.doc_frame.pack(fill="x")
        t.ttk.Button(p, text="Check again", command=self.doctor).pack(anchor="w", pady=(6, 0))
        hsep(p)
        from .. import __version__

        para(p, f"PixelForge Studio {__version__}. Paintings in, game-ready pixel art out: characters in 8 directions, props, effects, tiles, UI, sounds and music. "
                "Every step is also a command line and an AI-assistant tool.", style="Small.TLabel")

    def on_show(self, **kw) -> None:
        self.doctor()

    def doctor(self) -> None:
        from ..doctor import run

        def work():
            return run(str(self.app.project.root) if self.app.project else None)

        def show(r):
            t = tk()
            for w in self.doc_frame.winfo_children():
                w.destroy()
            for row in r["rows"]:
                ok = row.get("ok")
                line = f"{'✔' if ok else '✖'} {row.get('check', row.get('name'))}: {row.get('detail', '')}" + (f"  →  {row['fix']}" if row.get("fix") and not ok else "")
                para(self.doc_frame, line, style="Good.TLabel" if ok else "Warn.TLabel", pady=(0, 1))
            self.scroll.refit()

        self.app._run(work, after=show, what="Checking this computer…")


class DescribePage(Page):
    key = "describe"
    title = "Describe it, get it"
    blurb = "Say what you want in plain words. A spell opens in the spell designer, a skin change in the skin editor, a prompt goes to the clipboard, a music cue plays."

    def build(self) -> None:
        t = tk()
        self.scroll = ScrollFrame(self.frame)
        self.scroll.pack(fill="both", expand=True)
        p = self.scroll.inner
        para(p, "Examples:  'a wisp lantern spell, pale blue, slow, with embers'  ·  'make the left eye teal with a pale glow'  ·  'a slow sombre act 2 wilds tune'  ·  "
                "'a skeleton warrior wielding a bone spear' (a sheet prompt)", style="Dim.TLabel")
        row = t.ttk.Frame(p)
        row.pack(fill="x", pady=(6, 2))
        self.text = t.ttk.Entry(row, width=80, font=(T.FONT_FAMILY, 12))
        self.text.pack(side="left", fill="x", expand=True)
        self.text.bind("<Return>", lambda e: self.go())
        t.ttk.Button(row, text="Get it", command=self.go, style="Go.TButton").pack(side="left", padx=8)
        row2 = t.ttk.Frame(p)
        row2.pack(fill="x", pady=(4, 2))
        t.ttk.Label(row2, text="Make it a:").pack(side="left")
        self.what = t.StringVar(value="auto")
        for val, label in (("auto", "let the words decide"), ("spell", "spell"), ("skin", "skin change"), ("prompt", "Midjourney prompt"), ("music", "music cue")):
            t.ttk.Radiobutton(row2, text=label, value=val, variable=self.what).pack(side="left", padx=4)
        row3 = t.ttk.Frame(p)
        row3.pack(fill="x", pady=(4, 2))
        t.ttk.Label(row3, text="Picture for skin changes:").pack(side="left")
        self.img = t.StringVar(value="")
        t.ttk.Entry(row3, textvariable=self.img, width=56).pack(side="left", padx=4)
        from tkinter import filedialog

        t.ttk.Button(row3, text="Choose…", command=lambda: self.img.set(filedialog.askopenfilename(filetypes=[("PNG", "*.png")]) or self.img.get()), style="Tool.TButton").pack(side="left")
        self.note = Note(p)
        self.out = t.Text(p, height=10, wrap="word", font=T.FONT_MONO, bg=T.FIELD, fg=T.BONE, relief="flat", highlightthickness=1, highlightbackground=T.BORDER, state="disabled")
        self.out.pack(fill="x", pady=(6, 0))

    def on_show(self, **kw) -> None:
        c = self.app.current_char()
        if c is not None and not self.img.get():
            front = self.app.project.sub(c.name, "views") / "front.png"
            if front.exists():
                self.img.set(str(front))
        self.text.focus_set()

    def _say(self, text: str) -> None:
        self.out.configure(state="normal")
        self.out.delete("1.0", "end")
        self.out.insert("1.0", text)
        self.out.configure(state="disabled")

    def go(self) -> None:
        from .. import describe as D

        text = self.text.get().strip()
        if not text:
            return
        what = None if self.what.get() == "auto" else self.what.get()
        try:
            d = D.draft(text, image=self.img.get() or None, what=what)
        except Exception as e:  # noqa: BLE001
            self.note.warn(f"Could not read that: {e}")
            return
        read = "; ".join(d["read"])
        self.note.say("I read: " + read, "good")
        self.app._log("DESCRIBE " + text + " -> " + d["what"] + ": " + read)
        fx_dir = (self.app.project.root / "fx") if self.app.project else (Path.home() / "PixelForge" / "fx")
        if d["what"] == "spell":
            from .. import spell as S

            fx_dir.mkdir(parents=True, exist_ok=True)
            path = S.save_spell(d["spell"], fx_dir / f"{d['spell']['name']}.spell.json")
            self._say(json.dumps(d["spell"], indent=1))
            self.app.show("spell", path=str(path), out_dir=str(fx_dir), back=("describe", {}))
        elif d["what"] == "skin":
            self._say(json.dumps(d["ops"], indent=1))
            if not self.img.get():
                self.note.warn("Choose the picture so the parts (eyes, hands, lantern) can be located; the ops are shown below.")
                return
            self.app.show("skin", path=self.img.get(), ops=d["ops"], back=("describe", {}))
        elif d["what"] == "prompt":
            self.app.root.clipboard_clear()
            self.app.root.clipboard_append(d["prompt"])
            self._say(d["prompt"])
            self.note.good("Prompt copied to the clipboard; the text is below.")
        else:
            from .. import music

            self._say(f"cue {d['cue']}\nknobs {json.dumps(d['knobs'])}")

            def work():
                out = fx_dir.parent / "music"
                r = music.make_music(d["cue"], out, seconds=60, overrides=d["knobs"])
                wav = next((f for f in r["files"] if f.endswith(".wav")), r["files"][0] if r["files"] else None)
                if wav:
                    music.play(wav)
                return r

            self.app._run(work, after=lambda r: self.note.good("Rendered " + ", ".join(Path(f).name for f in r["files"]) + " (playing)"), what="Rendering the tune…")
