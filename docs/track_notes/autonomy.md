# track/autonomy: the tool adapters and the job runner

The brief, in the owner's words: "I don't want to reinvent the wheel. I want to use free tools that exist, but I want
to just type something and Claude figures it out." The Forge is a window onto the work.

## What is built

- **`pixelforge/tools/`**, one adapter per tool with the same face (`find`, `version`, `run(action, **params)`,
  `explain_missing`, `ACTIONS`): Aseprite (a frame set into one sprite through a Lua import script, open-and-wait,
  the frames written back; sheets, exports, scripts), LibreSprite (the shared command line; open-and-wait on the
  files), Pixelorama (open-and-wait only), Furnace (our songs as ProTracker `.mod` through `music/mod_export.py`;
  open; render through `furnace -output`), Blender and Godot (the finders the pipeline had), ffmpeg (GIF, MP4, OGG,
  ffprobe), ImageMagick (strip, montage, convert, point scale, identify; 6 and 7), rembg (cutouts), Tiled and LDtk
  (open-and-wait, Tiled's `--export-map`, both to one plain layout JSON for the game), Mixamo and Midjourney
  (websites: the install sentence names the browser road). `pixelforge tools status | explain | run`; on the MCP
  server `tool_<name>(action, params)` for each and `tools_status()`.
- **`pixelforge/jobs.py`**: `pixelforge job start "sentence" -p P [--approve steps|none] [--plan FILE]` and `list |
  status | log | approve [--run] | cancel | resume | report`. Claude writes the plan through the bridge (the planner's
  prompt names the pipeline's commands, the tools found here and the benches); the runner carries it out in order,
  writes `<project>/jobs/<id>/{plan,state}.json`, `log.jsonl`, `steps/`, `report.md` and `report.json` with pictures,
  streams `PF_PROGRESS step=job`, pauses at approval steps, tries a failed step once more with Claude asked to fix it,
  skips what depended on it, honours a cancel flag written from outside, and resumes from the last finished step after
  a restart (`running` with a dead pid reads as `interrupted`).
- **The Forge**: Home's Jobs panel (running with the step and its words, waiting with the step that needs approval,
  done / failed / stopped / interrupted with what to do; Approve, Resume, Cancel, Report; a job cycler); a describe
  sentence naming two or more benches starts a job; the report opens on the bench it concerns with its pictures in
  the window; a reopened Forge lists the interrupted jobs with Resume. `PxText` breaks on `\n`.
- **Docs**: GUIDE_HUMANS *Jobs* and *Tools we use instead of building* (the table: tool, what it does for us, the
  official page, the licence); GUIDE_AI *Tool adapters* (the rule for future sessions, the actions, the map layout),
  *Jobs* (the plan format, the runner's contract, the report, how a planning session behaves); HANDOFF 7.26.

## Verified (cloud: ffmpeg, ImageMagick, rembg and Godot present; Aseprite, LibreSprite, Pixelorama, Furnace, Blender, Tiled, LDtk absent)

- `tests/test_tool_adapters.py` and `tests/test_jobs.py` with mocks (`tests/claude_mock/plan.jsonl` is the mock
  planner): status is honest about what is installed, every adapter's commands and output parsing, the `.mod` header
  read back, the map converters, the MCP registration, the CLI; ffmpeg's GIF and ImageMagick's strip for real; plan
  parsing and validation, order, the approval pause and resume, the fix retry, failure with skipped dependants, resume
  after an interruption, cancel from outside, the report. 278 pytest green in all.
- Godot: `check_scripts` 33/0, `test_editor` 106/0, `test_scene` 21/0; the `jobs` walkthrough at 0 errors with five
  shots (`docs/screens/forgeapp/jobs_running.png`, `jobs_waiting.png`, `jobs_rendering.png`, `jobs_done.png`,
  `jobs_report.png`).

## The two features left for the owner's machine, on purpose

1. **Automatic downloading or installing of a tool.** The adapters only find what is installed; a missing tool is
   one sentence with the official page (`explain_missing`). Installing is the owner's own step, where he can see what
   lands on his disk. (The Blender download under Settings predates this and runs only when he asks for it.)
2. **Detached or daemon processes.** A job runs as an ordinary child of the Forge or the terminal and stops when its
   parent stops. What survives is the state on disk: on the next launch the job shows as *interrupted* and **Resume**
   carries on from the last finished step. A job that should outlive the Forge (a long render overnight) would need a
   service of his own choosing on his machine; nothing here starts one.

## What was not exercised here

The real editors and trackers: the Aseprite road (the Lua import, `--save-as` with `{frame000}`), LibreSprite,
Pixelorama, Furnace (`-output`, `-loops`) and Tiled's `--export-map` are built to their documented command lines and
run only through mocks in this session; the first run on the owner's machine should be watched (the Aseprite frame
placeholder and Furnace's flags in particular). A real planning call to Claude was not made (the mock planner stands
in); the planner prompt follows the bench prompt's shape, which was confirmed against a real `claude -p` stream on
track/claude.

## Short

- The planner's tool list is built at plan time from `tools.status()`, so a tool installed later is offered on the
  next job without a code change.
- `benches_in` is a word list; a sentence that names one bench with many things ("three wisps and a nova") opens the
  bench as before; `job start` from a prompt takes any sentence.
- The Forge shows PNG pictures from a report; a GIF in the list is skipped (Godot does not load GIFs), the runner's
  strip of a frames folder stands in for it.
- A job's `claude` step snapshots the bench's files as the describe line does, so `pixelforge claude undo` works on
  it, but Home has no Undo for a whole job: what a job made stays, and the report names every file.
