"""The Tools page: one workbench with tabs along the top (Effects · Spells · Objects · Tiles · Icons · Portraits ·
UI · Sounds · Music · More). Each tab keeps its state; each tool is a card: what it does, its form, Run, the result
shown under it. The forms come from the same spec the old Tools window used (``tools_window.TOOLS``), so a new tool
is ten lines there and appears here.
"""
from __future__ import annotations

import threading
from pathlib import Path

from PIL import Image, ImageSequence

from . import theme as T
from .app import Page, TOOL_TABS, game_dir
from .widgets import AnimPlayer, Collapsible, Form, LabeledScale, Note, PreviewArea, ScrollFrame, Tooltip, heading, hsep, para, tk

TAB_TOOLS = {   # tab key -> the TOOLS titles on it
    "effects": ["Effects", "Painted effect"],
    "spells": [],
    "objects": ["Prop / tree", "Painted object", "World prompts"],
    "tiles": ["Ground tiles"],
    "icons": ["Item icons"],
    "portraits": ["Portrait"],
    "ui": ["UI frame"],
    "sounds": [],
    "music": [],
    "more": ["Recolour", "Compare", "Godot add-on"],
}
TAB_BLURB = {
    "effects": "Looping spell, aura, fire, smoke and impact sheets, and painted Midjourney effects made into game effects. Glow only on the magic kinds.",
    "spells": "Layered spells (fire + burst + embers, ring + rune + wisp…) in the designer; plain words through Describe it.",
    "objects": "Props and trees from paintings or sheets, and the style-locked prompts to paint them.",
    "tiles": "Ground: a painted texture becomes iso diamonds, edge tiles to a second material, and a Godot TileSet.",
    "icons": "One painting of several items on a plain background becomes inventory icons.",
    "portraits": "Head-and-shoulders portraits from a front-view cutout.",
    "ui": "A painted panel or frame becomes a 9-slice texture and a Godot StyleBox.",
    "sounds": "Synthesised effects: hits, bone clicks, pours, glass, casts, UI ticks. Low and dry. Click a pad to hear it; Keep writes them.",
    "music": "The score: a cue for every act's camp, wilds and depths, the bosses and the title. Turn the knobs, Play, Render.",
    "more": "Recolour a finished set, compare before and after, edit the skill trees, install the Godot add-on.",
}


class ToolCard:
    """One tool on a tab: title, blurb, form, Run, the result (picture or animation) under it."""

    def __init__(self, page: "ToolsPage", parent, spec, base_dir):
        t = tk()
        self.page = page
        self.app = page.app
        self.title, self.blurb, self.fields, self.key = spec
        self.frame = t.ttk.Frame(parent, style="Card.TFrame", padding=12)
        self.frame.pack(fill="x", pady=(0, 10))
        t.ttk.Label(self.frame, text=self.title, style="Card.TLabel", font=T.FONT_B).pack(anchor="w")
        lbl = t.ttk.Label(self.frame, text=self.blurb, style="CardDim.TLabel", wraplength=800, justify="left")
        lbl._wrap = True
        lbl.pack(anchor="w", fill="x", pady=(0, 6))
        self.form = Form(self.frame, self.fields, base_dir=base_dir, label_width=14, entry_width=40)
        self.form.frame.configure(style="Card.TFrame")
        for row in self.form.frame.winfo_children():
            row.configure(style="Card.TFrame")
            for w in row.winfo_children():
                if isinstance(w, t.ttk.Label):
                    w.configure(style="Card.TLabel")
                elif isinstance(w, t.ttk.Checkbutton):
                    w.configure(style="Card.TCheckbutton")
        self.form.pack(fill="x")
        row = t.ttk.Frame(self.frame, style="Card.TFrame")
        row.pack(fill="x", pady=(8, 0))
        t.ttk.Button(row, text=f"Run {self.title.lower()}", command=self.run, style="Go.TButton").pack(side="left")
        t.ttk.Button(row, text="Reset", command=self.form.reset, style="Tool.TButton").pack(side="left", padx=6)
        self.note = Note(self.frame, pady=(4, 0))
        self.note.label.configure(style="CardDim.TLabel")
        self.result = t.ttk.Frame(self.frame, style="Card.TFrame")
        self.player = None
        self.preview = None

    def run(self) -> None:
        from ..tools_window import run_tool

        v = self.form.values()
        key = self.key
        self.note.say("Running…")
        if key == "effect_art":
            from ..effect_art import make_effect

            fn = lambda: make_effect(v["image"], v["name"], v["out"], kind=v["kind"], preset=v["preset"], frames=int(v["frames"]), width=int(v["width"]) or None, rotations=int(v["rotations"]))  # noqa: E731
        else:
            fn = lambda: run_tool(key, v)  # noqa: E731
        self.app._run(fn, after=self.show_result, what=f"Running {self.title.lower()}…", on_error=lambda msg: self.note.warn(msg))
        self.app._log(f"> {key} {v}")

    def show_result(self, r: dict) -> None:
        t = tk()
        brief = ", ".join(f"{k}={v}" for k, v in r.items() if k in ("png", "dir", "files", "json", "tres", "found", "installed", "gif", "mean_abs_diff", "sheet", "notes", "played", "count", "tiles"))
        self.note.good("Done. " + brief[:400])
        if r.get("prompt"):
            self.app.root.clipboard_clear()
            self.app.root.clipboard_append(r["prompt"])
            self.note.good("Prompt copied to the clipboard:\n" + r["prompt"])
        for w in self.result.winfo_children():
            w.destroy()
        self.result.pack(fill="x", pady=(8, 0))
        if r.get("gif") and Path(r["gif"]).exists():
            self.player = AnimPlayer(self.result, height=240, simple=True)
            self.player.pack(fill="x")
            try:
                im = Image.open(r["gif"])
                frames = [fr.convert("RGBA") for fr in ImageSequence.Iterator(im)]
                dur = im.info.get("duration", 100) or 100
                self.player.set_frames(frames, fps=1000 / dur, caption=Path(r["gif"]).name)
                self.page.players.append(self.player)
            except Exception as e:  # noqa: BLE001
                self.note.warn(f"Could not play the GIF: {e}")
        elif r.get("png") and Path(str(r["png"])).exists():
            self.preview = PreviewArea(self.result, height=260, caption=Path(r["png"]).name)
            self.preview.pack(fill="x")
            self.preview.show(r["png"])
        self.page.scroll_tab_refit()


class ToolsPage(Page):
    key = "tools"
    title = "Tools"
    blurb = "Everything that is not a character: effects, spells, objects, tiles, icons, portraits, UI, sounds and music. Each tab keeps its state."

    def __init__(self, app):
        super().__init__(app)
        self.tab = "effects"
        self.tabs: dict = {}
        self.built_tabs: set = set()
        self.players: list = []

    def build(self) -> None:
        t = tk()
        self.nb = t.ttk.Notebook(self.frame)
        self.nb.pack(fill="both", expand=True, padx=8, pady=(6, 4))
        for label, key in TOOL_TABS:
            fr = t.ttk.Frame(self.nb)
            self.nb.add(fr, text=label)
            self.tabs[key] = fr
        self.nb.bind("<<NotebookTabChanged>>", self._tab_changed)
        self.note = Note(self.frame, pady=(0, 4))
        self.note.label.pack_configure(padx=12)

    def header_title(self) -> tuple[str, str]:
        label = next((l for l, k in TOOL_TABS if k == self.tab), "Tools")
        return f"Tools  ·  {label}", TAB_BLURB.get(self.tab, self.blurb)

    def on_show(self, tab: str | None = None, **_kw) -> None:
        if tab and tab in self.tabs:
            self.tab = tab
        keys = [k for _l, k in TOOL_TABS]
        self.nb.select(keys.index(self.tab))
        self._ensure_tab(self.tab)
        self.app.set_header(*self.header_title())

    def on_hide(self) -> None:
        for pl in self.players:
            pl.stop()

    def _tab_changed(self, _e=None) -> None:
        keys = [k for _l, k in TOOL_TABS]
        i = self.nb.index(self.nb.select())
        self.tab = keys[i]
        self._ensure_tab(self.tab)
        self.app.set_header(*self.header_title())
        from .app import NAV_TAB_OF

        self.app._nav_mark(NAV_TAB_OF.get(self.tab, "tools:effects"))

    def base_dir(self) -> Path:
        g = game_dir()
        if g:
            return g
        return self.app.project.root if self.app.project else Path.home() / "PixelForge"

    def scroll_tab_refit(self) -> None:
        sc = getattr(self, "_scrolls", {}).get(self.tab)
        if sc:
            sc.refit()

    def _ensure_tab(self, key: str) -> None:
        if key in self.built_tabs:
            return
        self.built_tabs.add(key)
        if not hasattr(self, "_scrolls"):
            self._scrolls = {}
        sc = ScrollFrame(self.tabs[key], padding=12)
        sc.pack(fill="both", expand=True)
        self._scrolls[key] = sc
        p = sc.inner
        builder = getattr(self, f"_tab_{key}", None)
        if builder:
            builder(p)
        from ..tools_window import TOOLS

        by_title = {spec[0]: spec for spec in TOOLS}
        for title in TAB_TOOLS.get(key, []):
            if title in by_title:
                ToolCard(self, p, by_title[title], self.base_dir())
        sc.refit()

    # ------------------------------------------------------------- tabs
    def _tab_effects(self, p) -> None:
        t = tk()
        row = t.ttk.Frame(p)
        row.pack(anchor="w", pady=(0, 10))
        t.ttk.Button(row, text="Attach effects to a sprite (editor)", command=lambda: self.app.show("fx")).pack(side="left")
        t.ttk.Button(row, text="Spell designer", command=lambda: self.app.show("spell")).pack(side="left", padx=6)
        t.ttk.Button(row, text="See effects in the game", command=lambda: self.app.show("game")).pack(side="left")

    def _tab_spells(self, p) -> None:
        t = tk()
        from .. import spell as S

        card = t.ttk.Frame(p, style="Card.TFrame", padding=12)
        card.pack(fill="x", pady=(0, 10))
        t.ttk.Label(card, text="Spell designer", style="Card.TLabel", font=T.FONT_B).pack(anchor="w")
        lbl = t.ttk.Label(card, text="Start from a preset and turn the knobs: every layer has kind, palette, size, position, speed, start, opacity, blend and seed; the preview plays live. Keep exports the strip the game plays.",
                          style="CardDim.TLabel", wraplength=800, justify="left")
        lbl._wrap = True
        lbl.pack(anchor="w", fill="x", pady=(0, 6))
        row = t.ttk.Frame(card, style="Card.TFrame")
        row.pack(anchor="w")
        preset = t.StringVar(value="fireball")
        t.ttk.Label(row, text="Preset", style="Card.TLabel").pack(side="left")
        t.ttk.Combobox(row, textvariable=preset, values=sorted(S.PRESETS), state="readonly", width=16).pack(side="left", padx=6)
        t.ttk.Button(row, text="Open in the spell designer", command=lambda: self.app.show("spell", preset=preset.get()), style="Go.TButton").pack(side="left")
        row2 = t.ttk.Frame(card, style="Card.TFrame")
        row2.pack(anchor="w", pady=(8, 0))
        t.ttk.Button(row2, text="Describe a spell in words", command=lambda: self.app.show("describe")).pack(side="left")
        t.ttk.Button(row2, text="Painted effect (Effects tab)", command=lambda: self.on_show(tab="effects")).pack(side="left", padx=6)
        g = game_dir()
        spells = sorted((g / "art" / "fx").glob("*.spell.json")) if g and (g / "art" / "fx").exists() else []
        if spells:
            heading(p, "Spells in the game")
            fr = t.ttk.Frame(p)
            fr.pack(fill="x")
            for i, sp in enumerate(spells):
                t.ttk.Button(fr, text=sp.name.replace(".spell.json", ""), command=lambda s=sp: self.app.show("spell", path=str(s)), style="Tool.TButton").grid(row=i // 6, column=i % 6, padx=2, pady=2, sticky="w")

    def _tab_sounds(self, p) -> None:
        t = tk()
        from .. import sfx

        card = t.ttk.Frame(p, style="Card.TFrame", padding=12)
        card.pack(fill="x", pady=(0, 10))
        t.ttk.Label(card, text="Pads", style="Card.TLabel", font=T.FONT_B).pack(anchor="w")
        lbl = t.ttk.Label(card, text="Click a pad to render that sound with the knobs below and hear it. Keep writes every preset (with variations) into the folder.", style="CardDim.TLabel", wraplength=800, justify="left")
        lbl._wrap = True
        lbl.pack(anchor="w", fill="x", pady=(0, 6))
        pads = t.ttk.Frame(card, style="Card.TFrame")
        pads.pack(anchor="w")
        presets = [k for k in sfx.PRESETS]
        self.sfx_seed = t.IntVar(value=0)
        self.sfx_var = t.IntVar(value=1)
        self.sfx_out = t.StringVar(value=str(self.base_dir() / "art" / "sfx"))
        for i, name in enumerate(presets):
            t.ttk.Button(pads, text=name.replace("_", " "), width=13, command=lambda n=name: self.play_sfx(n), style="TButton").grid(row=i // 6, column=i % 6, padx=2, pady=2)
        knobs = t.ttk.Frame(card, style="Card.TFrame")
        knobs.pack(anchor="w", pady=(8, 0))
        t.ttk.Label(knobs, text="Seed", style="Card.TLabel").pack(side="left")
        t.ttk.Spinbox(knobs, textvariable=self.sfx_seed, from_=0, to=999, width=5).pack(side="left", padx=(4, 12))
        t.ttk.Label(knobs, text="Variations", style="Card.TLabel").pack(side="left")
        t.ttk.Spinbox(knobs, textvariable=self.sfx_var, from_=1, to=8, width=4).pack(side="left", padx=(4, 12))
        t.ttk.Label(knobs, text="Folder", style="Card.TLabel").pack(side="left")
        t.ttk.Entry(knobs, textvariable=self.sfx_out, width=40).pack(side="left", padx=4)
        row = t.ttk.Frame(card, style="Card.TFrame")
        row.pack(anchor="w", pady=(8, 0))
        t.ttk.Button(row, text="Keep: write every preset", command=lambda: self.render_sfx("all"), style="Go.TButton").pack(side="left")
        t.ttk.Button(row, text="Another seed", command=lambda: self.sfx_seed.set(int(self.sfx_seed.get()) + 1), style="Tool.TButton").pack(side="left", padx=6)
        self.sfx_note = Note(card)
        self.sfx_note.label.configure(style="CardDim.TLabel")

    def play_sfx(self, name: str) -> None:
        from .. import music, sfx

        out = Path.home() / ".pixelforge" / "sfx_preview"
        out.mkdir(parents=True, exist_ok=True)

        def work():
            r = sfx.make_sfx(name, out, seed=int(self.sfx_seed.get()), variations=1)
            f = r["files"][0] if r["files"] else None
            if f:
                music.play(f)
            return r

        self.app._run(work, after=lambda r: self.sfx_note.good(f"{name}: " + ", ".join(Path(f).name for f in r["files"])), what=f"Rendering {name}…")

    def render_sfx(self, preset: str) -> None:
        from .. import sfx

        out = Path(self.sfx_out.get())
        self.app._run(lambda: sfx.make_sfx(preset, out, seed=int(self.sfx_seed.get()), variations=int(self.sfx_var.get())),
                      after=lambda r: self.sfx_note.good(f"Wrote {len(r['files'])} file(s) into {out}"), what="Rendering the sounds…")

    def _tab_music(self, p) -> None:
        t = tk()
        from .. import music

        card = t.ttk.Frame(p, style="Card.TFrame", padding=12)
        card.pack(fill="x", pady=(0, 10))
        t.ttk.Label(card, text="The rack", style="Card.TLabel", font=T.FONT_B).pack(anchor="w")
        lbl = t.ttk.Label(card, text="Pick a place, turn the knobs, Play (a 20-second audition), then Render this cue or every cue. Every knob is the same override the command line takes (pixelforge music a1_town --set bpm=70 …). Double-click a knob to reset it.",
                          style="CardDim.TLabel", wraplength=800, justify="left")
        lbl._wrap = True
        lbl.pack(anchor="w", fill="x", pady=(0, 6))
        self.cues = {r["key"]: r for r in music.cue_table()}
        row = t.ttk.Frame(card, style="Card.TFrame")
        row.pack(anchor="w")
        t.ttk.Label(row, text="Cue", style="Card.TLabel").pack(side="left")
        self.cue = t.StringVar(value="a1_town")
        cb = t.ttk.Combobox(row, textvariable=self.cue, values=list(self.cues), state="readonly", width=12)
        cb.pack(side="left", padx=6)
        cb.bind("<<ComboboxSelected>>", lambda e: self.load_cue())
        self.cue_title = t.ttk.Label(row, text="", style="Card.TLabel", font=T.FONT_B)
        self.cue_title.pack(side="left", padx=(8, 4))
        self.cue_desc = t.ttk.Label(card, text="", style="CardDim.TLabel", wraplength=800, justify="left")
        self.cue_desc._wrap = True
        self.cue_desc.pack(anchor="w", fill="x", pady=(2, 6))
        rack = t.ttk.Frame(card, style="Card.TFrame")
        rack.pack(anchor="w", fill="x")
        self.knobs: dict = {}
        self.knob_widgets: dict = {}
        spec = [("bpm", 40, 160, "{:.0f}", "Tempo"), ("steps", 6, 8, "{:.0f}", "Metre (6 lilting / 8 straight)"), ("root", 36, 72, "{:.0f}", "Key (MIDI note, 50 = D)"),
                ("seed", 1, 99, "{:.0f}", "Tune (seed)"), ("gain", 0.2, 2.0, "{:.2f}", "Level"), ("wind", 0.0, 1.0, "{:.2f}", "Wind"),
                ("windF", 200, 1200, "{:.0f}", "Wind pitch (Hz)"), ("ds", 0.0, 1.0, "{:.2f}", "Echo")]
        cols = 4
        for i, (key, lo, hi, fmt, label) in enumerate(spec):
            v = t.DoubleVar(value=0.0)
            self.knobs[key] = v
            cell = t.ttk.Frame(rack, style="Card.TFrame", padding=(0, 0, 16, 4))
            cell.grid(row=i // cols, column=i % cols, sticky="w")
            ls = LabeledScale(cell, label, v, lo, hi, fmt=fmt, length=170)
            ls.frame.configure(style="Card.TFrame")
            for w in ls.frame.winfo_children():
                if isinstance(w, t.ttk.Frame):
                    w.configure(style="Card.TFrame")
                    for ww in w.winfo_children():
                        ww.configure(style="CardDim.TLabel")
            ls.pack()
            self.knob_widgets[key] = ls
        mode_row = t.ttk.Frame(card, style="Card.TFrame")
        mode_row.pack(anchor="w", pady=(4, 0))
        t.ttk.Label(mode_row, text="Mode", style="Card.TLabel").pack(side="left")
        self.mode = t.StringVar(value="aeol")
        t.ttk.Combobox(mode_row, textvariable=self.mode, values=list(music.SC), state="readonly", width=8).pack(side="left", padx=6)
        t.ttk.Label(mode_row, text="Length (s)", style="Card.TLabel").pack(side="left", padx=(16, 4))
        self.seconds = t.IntVar(value=120)
        t.ttk.Spinbox(mode_row, textvariable=self.seconds, from_=20, to=300, increment=10, width=5).pack(side="left")
        ml = t.ttk.Label(card, text="Modes: aeol minor · dor dorian · phr phrygian (dark) · hij hijaz (eastern) · hmin harmonic minor · pmin pentatonic minor", style="CardDim.TLabel", wraplength=800, justify="left")
        ml._wrap = True
        ml.pack(anchor="w", fill="x", pady=(2, 0))
        out_row = t.ttk.Frame(card, style="Card.TFrame")
        out_row.pack(anchor="w", pady=(6, 0))
        t.ttk.Label(out_row, text="Folder", style="Card.TLabel").pack(side="left")
        self.music_out = t.StringVar(value=str(self.base_dir() / "art" / "music"))
        t.ttk.Entry(out_row, textvariable=self.music_out, width=44).pack(side="left", padx=4)
        self.fmt = t.StringVar(value="wav")
        t.ttk.Label(out_row, text="Format", style="Card.TLabel").pack(side="left", padx=(8, 2))
        t.ttk.Combobox(out_row, textvariable=self.fmt, values=["wav", "ogg", "both"], state="readonly", width=6).pack(side="left")
        btns = t.ttk.Frame(card, style="Card.TFrame")
        btns.pack(anchor="w", pady=(10, 0))
        t.ttk.Button(btns, text="▶ Play (20 s)", command=self.play_cue, style="Go.TButton").pack(side="left")
        t.ttk.Button(btns, text="Render this cue", command=lambda: self.render_cue(False)).pack(side="left", padx=6)
        t.ttk.Button(btns, text="Render every cue", command=lambda: self.render_cue(True)).pack(side="left")
        t.ttk.Button(btns, text="Another tune", command=lambda: (self.knobs["seed"].set(int(self.knobs["seed"].get()) % 99 + 1), self.knob_widgets["seed"].refresh())).pack(side="left", padx=6)
        t.ttk.Button(btns, text="Reset cue", command=self.load_cue).pack(side="left")
        t.ttk.Button(btns, text="Write the sheet (JSON)", command=self.write_sheet).pack(side="left", padx=6)
        self.music_note = Note(card)
        self.music_note.label.configure(style="CardDim.TLabel")
        self.spectro = PreviewArea(card, height=160, caption="The waveform and spectrogram of the last render")
        self.spectro.pack(fill="x", pady=(6, 0))
        self.load_cue()

    def load_cue(self) -> None:
        r = self.cues[self.cue.get()]
        self.cue_title.configure(text=f"{r['title']}  (act {r['act']}, {r['place']})")
        self.cue_desc.configure(text=r["description"])
        for k, v in self.knobs.items():
            v.set(float(r.get(k, 0) or 0))
            self.knob_widgets[k].default = float(r.get(k, 0) or 0)
            self.knob_widgets[k].refresh()
        self.mode.set(r.get("sc", "aeol"))

    def overrides(self) -> dict:
        r = self.cues[self.cue.get()]
        out = {}
        for k, v in self.knobs.items():
            val = float(v.get())
            if k in ("steps", "root", "seed"):
                val = int(round(val))
            if abs(val - float(r.get(k, 0) or 0)) > 1e-9:
                out[k] = val
        if self.mode.get() != r.get("sc"):
            out["sc"] = self.mode.get()
        return out

    def play_cue(self) -> None:
        from .. import music

        key, ov = self.cue.get(), self.overrides()
        out = Path.home() / ".pixelforge" / "music_preview"

        def work():
            r = music.make_music(key, out, seconds=20, overrides=ov, fmt="wav")
            wav = next((f for f in r["files"] if f.endswith(".wav")), None)
            if wav:
                r["played"] = music.play(wav)
            return r

        def done(r):
            self.music_note.good(f"{key} with {ov or 'the defaults'}" + (" (playing)" if r.get("played") else " (no player found on this machine; the file is in " + str(out) + ")"))
            if r.get("png"):
                self.spectro.show(r["png"], caption=Path(r["png"]).name)

        self.app._run(work, after=done, what="Rendering 20 seconds…")

    def render_cue(self, every: bool) -> None:
        from .. import music

        key, ov = ("all" if every else self.cue.get()), ({} if every else self.overrides())
        out = Path(self.music_out.get())
        secs, fmt = int(self.seconds.get()), self.fmt.get()

        def done(r):
            self.music_note.good(f"Wrote {len(r['files'])} file(s) into {out}" + (f"; {', '.join(r['notes'])}" if r.get("notes") else ""))
            if r.get("png"):
                self.spectro.show(r["png"], caption=Path(r["png"]).name)

        self.app._run(lambda: music.make_music(key, out, seconds=secs, overrides=ov, fmt=fmt), after=done, what="Rendering the music… (a minute per cue)")

    def write_sheet(self) -> None:
        from .. import music

        out = Path(self.music_out.get()) / "music_sheet.json"
        r = music.write_sheet(out)
        self.music_note.good(f"Sheet written: {r['sheet']} ({len(r['cues'])} cues). Edit the numbers and render with  pixelforge music all --sheet {out}")

    def _tab_more(self, p) -> None:
        t = tk()
        card = t.ttk.Frame(p, style="Card.TFrame", padding=12)
        card.pack(fill="x", pady=(0, 10))
        t.ttk.Label(card, text="Skill trees", style="Card.TLabel", font=T.FONT_B).pack(anchor="w")
        lbl = t.ttk.Label(card, text="Move skills on the grid (drag or arrow keys), rename, rewrite descriptions. Edits live in tools/skill_tree_edits.json and are applied last by the game's script, which stays the source of truth.",
                          style="CardDim.TLabel", wraplength=800, justify="left")
        lbl._wrap = True
        lbl.pack(anchor="w", fill="x", pady=(0, 6))
        g = game_dir()
        self.skills_path = t.StringVar(value=str(g / "data" / "skills.json") if g and (g / "data" / "skills.json").exists() else "")
        row = t.ttk.Frame(card, style="Card.TFrame")
        row.pack(anchor="w", fill="x")
        t.ttk.Label(row, text="skills.json", style="Card.TLabel").pack(side="left")
        t.ttk.Entry(row, textvariable=self.skills_path, width=50).pack(side="left", padx=4)
        from tkinter import filedialog

        t.ttk.Button(row, text="Choose…", command=lambda: self.skills_path.set(filedialog.askopenfilename(filetypes=[("JSON", "*.json")]) or self.skills_path.get()), style="Tool.TButton").pack(side="left")
        t.ttk.Button(row, text="Open the editor", command=self.open_skilltree, style="Go.TButton").pack(side="left", padx=8)
        self.skill_note = Note(card)
        self.skill_note.label.configure(style="CardDim.TLabel")
        self.skill_host = t.ttk.Frame(card, style="Card.TFrame")
        self.skill_host.pack(fill="both", expand=True, pady=(6, 0))

    def open_skilltree(self) -> None:
        from .. import skilltree

        for w in self.skill_host.winfo_children():
            w.destroy()
        path = self.skills_path.get().strip()
        if not path or not Path(path).exists():
            self.skill_note.warn("Choose the game's data/skills.json first.")
            return
        try:
            ed = skilltree.build_editor(self.skill_host, path, status_cb=lambda text: (self.skill_note.good(text), self.app._log(text)))
        except Exception as e:  # noqa: BLE001
            self.skill_note.warn(f"Could not open the trees: {e}")
            return
        ed["frame"].pack(fill="both", expand=True)
        self.skill_note.say("Click a skill; arrow keys move it; Save + apply writes the edits.")
        self.scroll_tab_refit()
