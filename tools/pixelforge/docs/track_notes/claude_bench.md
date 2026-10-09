# track/claude: Claude on the bench, and Midjourney through the owner's Chrome

The brief: one line typed on any bench of the Forge, and Claude does the work through PixelForge's own tools while
the person watches; and Claude fetches Midjourney paintings through the owner's signed-in Chrome.

## What is built

- **`pixelforge/claude_bridge.py`**, the bridge to the Claude Code CLI: finds `claude` (`PIXELFORGE_CLAUDE`, PATH, the
  usual Windows and Unix places); `status()` (ready / not found / not signed in, one sentence; `claude auth status
  --json`, `claude mcp get pixelforge`); `register()` (`claude mcp add -s user pixelforge -- <python> -m pixelforge.cli
  mcp`, idempotent); `run(bench, project, text, ctx, on_progress)` builds `claude -p --output-format stream-json
  --mcp-config <project>/claude/mcp_config.json --tools Read --allowedTools mcp__pixelforge,Read --permission-prompts
  none --strict-mcp-config --max-budget-usd 3 --append-system-prompt ...` (the bench, the project, what is on the bench,
  the bench's tools, the style rules and the banned words from HANDOFF section 4, the conduct, the JSON ending),
  streams the events, turns tool calls into progress sentences, enforces a timeout, logs everything to
  `<project>/claude/logs/`, snapshots the bench's files first (`<project>/claude/undo/`, `restore()` for Undo), and
  names what changed (the summary's `changed` united with the files that moved on disk). `fetch_midjourney()` runs the
  same with `--chrome`, the extension's tools allowed, and a procedure prompt (open midjourney.com/imagine, attach the
  clay view, type the prompt, wait for the grid, pick, upscale, download into the folder, one job at a human pace).
- **CLI**: `pixelforge describe --bench B -p P "text" [--context JSON] [--dry-run] --json` (progress as `PF_PROGRESS
  step=claude ... note=words+with+pluses`, then the result; Characters and Objects results carry the prompts),
  `pixelforge claude status | register | log | undo <manifest>`, `pixelforge midjourney fetch | prompt`.
- **The mock**: `PIXELFORGE_CLAUDE=mock:<script.jsonl>` runs `python -m pixelforge.claude_bridge mock` through the same
  reader; a script is stream-json lines plus `{"mock": "run", "args": [...]}` (the CLI runs, so the bench really
  changes), `sleep`, `exit`. `tests/claude_mock/`: characters (add, draft, import), music (tempo 76, crunch, a note),
  midjourney (Chrome connected, a file lands), no_chrome, slow (the timeout), error (not signed in).
- **The Forge**: `screen.gd` gives every workbench a *Claude:* line (`/` jumps to it); `_describe` snapshots the levers'
  values, pushes undo, runs the verb; `on_progress` shows the words on the strip; `app.gd` shows *Claude: ready /
  working / not found / not signed in* in the title line (ember pulse while working; `claude status` at launch,
  `claude register` when needed); on done each bench's `on_claude_done` reloads (Characters: the model file re-read
  or a new one imported, the prompts to the Reference tab with a *prompt* cycler, **Copy prompt**, **Paint it in
  Midjourney**; Objects: **Fetch a turnaround**, **Fetch a prop sheet of nine**; Music: the song re-read, new notes
  ringed in gold for 4 s; Effects: a spell file or a strip; Tiles / Interface / Sound: the files shown or played); the
  levers whose values changed are lit for 2.5 s; the notes sit on the state line for 12 s; **Undo** runs `claude undo
  <manifest>` and `on_claude_undone` (Redo refuses to re-run Claude). Errors are one line on the state line.
- **install.bat** runs `pixelforge claude register` when `claude` is on PATH.

## Verified (cloud, no Chrome, no Midjourney)

- `tests/test_claude_bridge.py` (25): finding and status sentences, the auth JSON, register's idempotence and user
  scope, the command (tools, allowed tools, permission prompts, strict MCP config, the Chrome variant, the budget), the
  MCP config, the system prompt per bench, the tool-to-words map and song ops, the summary parser, snapshot / restore,
  changed-file detection, the mock on Characters (a model made, Undo removes it) and Music (tempo 76), the timeout, an
  error result, no CLI, dry run, the Midjourney mock (files, the no-Chrome sentence), the prompt kinds, the mock's
  placeholders and exit code, the CLI parsers, `describe_on_bench`'s prompts and progress lines, `claude log` / `undo`.
  225 pytest green in all.
- `check_scripts.gd`: 33 scripts, 0 failed. The sweep's `describe_characters` and `describe_music` walkthroughs
  (`forge/tools/describe_walk*.txt`, 0 SCRIPT ERRORs): `docs/screens/forgeapp/describe_characters_working.png`
  (the pulse, the strip "drafting the model"), `describe_characters_done.png` (the drafted figure, the prompt cycler,
  Copy prompt, Paint it in Midjourney), `describe_characters_undone.png` (the files back, the bench empty),
  `describe_music_working.png`, `describe_music_done.png` (the notes on the state line, the tempo at 76).
- One real `claude -p ... --output-format stream-json` call was made to confirm the event shapes (init, assistant,
  result) the parser reads.

## What the Chrome step needs on the owner's PC (not exercised here)

Chrome or Edge, open, not under WSL; the Claude in Chrome extension 1.0.36 or later, signed in with the same Anthropic
account; Claude Code signed in through `/login` (an API key or a `setup-token` token keeps the integration off);
midjourney.com signed in in that Chrome; one `claude --chrome` session by hand first for the one-time dialog and the
site permission. The bridge reads the init event's `mcp_servers` for `claude-in-chrome` and stops with *Chrome is not
connected...* when it is missing; a CAPTCHA or a sign-in in the result text becomes *Midjourney asked for a sign-in or
a check*; no file in the folder becomes *Midjourney gave nothing back*. The first run should be watched: whether `-p`
print mode pairs with the extension the way an interactive session does, whether the extension's per-site permission
prompt is answered by `--allowedTools mcp__claude-in-chrome`, and how long a grid takes (the timeout is 900 s).

## Short

- The levers' highlight compares value texts by control name, so a lever Claude moved to the same value shows nothing.
- `changed` for Tiles / Interface / Sound is read from the files the run touched; a bench shows the first match.
- Redo after a Claude Undo is refused (the files cannot be re-made without running Claude again).
- The Creatures bench uses the characters' hooks on the humanoid skeleton.
- The describe line is 14 px high in the small face so the racks still fit; a bench whose choices wrap to a third
  line would push it off the text box.
