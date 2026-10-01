# The Studio: one window, pages, and how to add one (track/ui)

`tools/pixelforge/pixelforge/studio/` is the desktop app. `pixelforge.gui` only forwards to it (`Studio`,
`apply_theme`, `main`), so `pixelforge studio`, the desktop shortcut and older scripts keep working.

```
studio/
  theme.py            the palette and apply_theme(root): every ttk and classic Tk widget dark (combobox lists,
                      scrollbars, Text, Listbox, Canvas, Spinbox, Scale, Notebook, Menu)
  widgets.py          ScrollFrame (scrolling page that re-wraps its text), ZoomCanvas / PreviewArea (fit, 1x, 2x,
                      4x, +, −), ThumbStrip (pictures with buttons under each), AnimPlayer, Form (from a field
                      spec), Note (inline message), Confirm (inline yes/cancel), Collapsible, Toolbar, ColourPicker,
                      Tooltip (placed inside the window), LabeledScale
  editor_core.py      ImageDoc: layers, selection (wand / lasso / rect, add / subtract), undo/redo, skin ops,
                      clone source, regions, save with .bak, ops JSON. SpriteSetDoc: an exported set's attachments.
                      No Tk in here: tests/test_studio.py drives it headlessly.
  app.py              Studio: the shell (nav, page host, header, status line, progress bar, log drawer, keys,
                      drag-and-drop, update bar, run-on-a-thread, project open/start-from-painting), Page base, PAGES
  pages_home.py       Home
  pages_character.py  the nine steps, the quick path, the new-character form (CharacterPage.on_show(step=...))
  pages_editors.py    EditorPage base; CutoutPage, SkinPage, ColourPage
  pages_fx.py         FxPage (effects on a sprite, drag-and-drop from the list)
  pages_spell.py      SpellPage (the spell designer)
  pages_tools.py      ToolsPage (tabs: Effects · Spells · Objects · Tiles · Icons · Portraits · UI · Sounds · Music · More)
  pages_game.py       GamePage (preview in game, screenshot, play)
  pages_misc.py       SettingsPage, HelpPage, DescribePage
```

Rules the shell keeps: no `Toplevel`, no `messagebox` (the only box left is "could not start" in `app.main`);
OS file and folder pickers are fine. Results and stops go to `app._tell(text, warn)` (status line + the current
page's `note` + the log). Long work runs through `app._run(fn, after, what)` on a worker thread; `after(result)`
runs on the Tk thread.

## Adding a page

1. Write a class in a `pages_*.py` module:

```python
from .app import Page
from .widgets import ScrollFrame, heading, para, tk

class LooksPage(Page):
    key = "looks"
    title = "Effect looks"
    blurb = "One sentence on what this page does."

    def build(self):                       # once, the first time it is shown
        self.scroll = ScrollFrame(self.frame)
        self.scroll.pack(fill="both", expand=True)
        heading(self.scroll.inner, "...")

    def on_show(self, **kw):               # every time; kw are the show() arguments
        ...

    def refresh(self):                     # after a run finishes or the project changes
        ...
    # optional: on_hide, undo, redo, save, zoom(delta), on_drop(paths) -> bool, set_busy(on), header_title()
```

2. Register it in `app.PAGES`: `"looks": ("pages_looks", "LooksPage")`.
3. Give it a row in the nav (`Studio._build_nav`, `self._nav_item("looks", "Effect looks", style="NavStep.TLabel")`)
   or a tab on the Tools page (`app.TOOL_TABS` + `pages_tools.TAB_TOOLS` / a `_tab_<key>` builder).
4. Open it from anywhere with `self.app.show("looks", some_arg=..., back=("character", {"step": "export"}))`;
   `back` gives the page a Back button and Esc.

## Adding a character step or a road choice

- A step page is a method `_step_<key>(self, c)` on `CharacterPage` plus a title in `STEP_TITLES`; the step itself
  comes from `project.STEPS` and `api.STEP_FUNCS` (Continue and Run all use those). `self._run_then_render(fn, what)`
  runs the step and redraws the page; `self._how([...])` is the numbered "How" block; `PreviewArea`, `ThumbStrip`
  and `AnimPlayer` are the previews.
- A per-character option (the model `Body: auto / template / hull` box on step 5 is the pattern) is a widget that
  writes `c.settings[...]` and `project.save()`.
- A road choice (3D / pixel) belongs on step 5 (and the Continue label through `STEP_BLURB`): add the choice there
  and route `api.run_step` by `c.settings["road"]` in `api.py`.

## Adding a tool

Ten lines in `tools_window.TOOLS` (title, blurb, fields, key) and a branch in `tools_window.run_tool`; then the title
in `pages_tools.TAB_TOOLS[<tab>]`. The form, Run, result preview (PNG or GIF) and error note come for free. Field
kinds: file, dir, text, int, float, choice, check. A tool that needs its own layout (the Music rack, the Sounds pads,
the skill trees) is a `_tab_<key>(self, parent)` builder on `ToolsPage`.

## Adding an editor tool

`EditorPage.TOOLS` is the list of `(key, glyph, tip)`; `op_for(tool, x, y, r)` returns the skin op a brush step
makes; `_opt(key)` builds that tool's options row. Selections are `doc.select(mask, mode, piece)` with `mode` from
`_mods(event)` (Shift adds, Alt subtracts). New op kinds go into `skin_ops.apply_op` first so the CLI / MCP path
(`pixelforge skin`, `edit_skin`) stays equal to the clicking path.

## Verifying

- `cd tools/pixelforge && python -m pytest -q` (tests/test_studio.py covers the headless parts).
- Under a virtual display: a driver that builds `Studio(root, project)`, calls `show(...)` per page and saves the
  window with ImageMagick (`import -window root out.png`); the walkthrough script opens a painting on a fresh fake HOME,
  waits for `st.busy` to clear, checks it stopped at step 5, opens the cutout editor from step 3 and comes back.
  Both scripts are described in `docs/HANDOFF.md` section 6 (2026-10-01, Studio overhaul).
