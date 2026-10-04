extends Node
## scripts/backend.gd: the only way the Forge touches the pipeline. Every action is one PixelForge command
## (`python -u -c "<boot>" <command> ... --json`) run in its own thread with its output piped back line by line, so
## the screens can show progress (the PF_PROGRESS lines) and the log drawer can show everything. The JSON the
## command prints last is the result; `{"ok": false, "error": ...}` is a StepError in plain words. Nothing is
## reimplemented here: an assistant driving the CLI or the MCP server does exactly what a screen does.

signal line(job, text)
signal progress(job, info)
signal finished(job, result)

const BOOT := "import sys, os\nsys.path.insert(0, sys.argv[1])\nsys.stderr = sys.stdout\nsys.argv = ['pixelforge'] + sys.argv[2:]\nfrom pixelforge.cli import main\nsys.exit(main() or 0)"

var python := ""            # the interpreter that has PixelForge
var pf_root := ""           # tools/pixelforge (the package's parent)
var game_dir := ""          # the Godot project with project.godot (the game)
var godot := ""             # the Godot executable, for the game
var project_dir := ""       # the Forge project folder (project.json)
var jobs: Array = []
var log_lines: PackedStringArray = []

class Job:
	extends RefCounted
	var args: PackedStringArray
	var label := ""
	var thread: Thread
	var pid := -1
	var done := false
	var cancelled := false
	var output: PackedStringArray = []
	var result := {}
	var on_done: Callable
	var progress := {}        # the last PF_PROGRESS line's fields
	var mutex := Mutex.new()
	var pending: PackedStringArray = []
	var thread_done := false
	var exit_code := 0
	var failed_to_start := false
	var started := 0.0

func setup(args: Dictionary, cfg: Dictionary = {}) -> void:
	pf_root = ProjectSettings.globalize_path("res://").path_join("..").simplify_path()
	python = _find_python(String(args.get("python", cfg.get("python", ""))))
	game_dir = _find_game(String(args.get("game", cfg.get("game", ""))))
	godot = String(args.get("godot", OS.get_environment("PIXELFORGE_GODOT")))
	if godot == "":
		godot = OS.get_executable_path()   # the Forge runs in Godot, so the game can too
	project_dir = String(args.get("project", cfg.get("project", "")))
	if project_dir == "":
		project_dir = _default_project_dir()

## the interpreter: --python=, PIXELFORGE_PYTHON, the private environment install.bat makes, then PATH
func _find_python(hint: String) -> String:
	var cands: Array = [hint, OS.get_environment("PIXELFORGE_PYTHON")]
	for v in [".venv/Scripts/python.exe", ".venv/bin/python", ".venv/bin/python3"]:
		cands.append(pf_root.path_join(v))
	for c in cands:
		if c != "" and FileAccess.file_exists(c):
			return c
	for name in ["python3", "python", "py"]:
		var out := []
		if OS.execute(name, ["-c", "import sys; print(sys.version_info[0])"], out, true) == 0 and not out.is_empty() and str(out[0]).strip_edges().begins_with("3"):
			return name
	return ""

## the game: --game=, PIXELFORGE_GAME, or the folder three above (the Forge lives at <game>/tools/pixelforge/forge).
## Never the Forge's own folder: it has a project.godot too, and the game's art must not land in it.
func _find_game(hint: String) -> String:
	for c in [hint, OS.get_environment("PIXELFORGE_GAME"), pf_root.path_join("../..").simplify_path()]:
		if is_game_folder(c):
			return c
	return ""

## a folder with a project.godot that is not the Forge app's own
static func is_game_folder(path: String) -> bool:
	if path == "" or not FileAccess.file_exists(path.path_join("project.godot")):
		return false
	var own := ProjectSettings.globalize_path("res://").simplify_path().rstrip("/")
	if path.simplify_path().rstrip("/") == own:
		return false
	var f := FileAccess.open(path.path_join("project.godot"), FileAccess.READ)
	if f and f.get_as_text().contains("config/name=\"PixelForge\""):
		return false
	return true

## the Forge project folder: Documents/PixelForge/Forge (made on first use), else next to the user data
func _default_project_dir() -> String:
	var docs := OS.get_system_dir(OS.SYSTEM_DIR_DOCUMENTS)
	if docs == "" or not DirAccess.dir_exists_absolute(docs):
		docs = OS.get_user_data_dir()
	return docs.path_join("PixelForge").path_join("Forge")

func project_exists() -> bool:
	return FileAccess.file_exists(project_dir.path_join("project.json"))

func project_name() -> String:
	return project_dir.get_file()

func python_ok() -> bool:
	return python != ""

func game_ok() -> bool:
	return is_game_folder(game_dir)

## a sub-folder of the project for a workbench's output
func out_dir(kind: String) -> String:
	var d := project_dir.path_join(kind)
	DirAccess.make_dir_recursive_absolute(d)
	return d

## make the project folder when there is none (the pipeline makes it: `project new`)
func ensure_project(style: String, on_done: Callable = Callable()) -> void:
	if project_exists():
		if on_done.is_valid():
			on_done.call({"ok": true, "existed": true})
		return
	DirAccess.make_dir_recursive_absolute(project_dir)
	run(["project", "new", project_dir, "--name", "Forge", "--style", style], "project new", on_done)

## the style the project is set to (project.json), else the default
func project_style(fallback: String = "godmarrow") -> String:
	var d := read_json(project_dir.path_join("project.json"))
	var s = d.get("settings", {}).get("style", d.get("style", ""))
	if s is String and s != "":
		return s
	return fallback

## run one PixelForge command; `cli_args` are the words after `pixelforge`. `--json` is added when missing.
func run(cli_args: Array, label: String = "", on_done: Callable = Callable()) -> Job:
	var j := Job.new()
	var a: PackedStringArray = []
	for x in cli_args:
		a.append(str(x))
	if not "--json" in a and not a.is_empty() and a[0] != "forge":
		a.append("--json")
	j.args = a
	j.label = label if label != "" else " ".join(a)
	j.on_done = on_done
	j.started = Time.get_ticks_msec() / 1000.0
	jobs.append(j)
	_log("$ pixelforge " + " ".join(a))
	if python == "":
		j.failed_to_start = true
		j.thread_done = true
		return j
	j.thread = Thread.new()
	j.thread.start(_work.bind(j))
	return j

func _work(j: Job) -> void:
	var args: PackedStringArray = ["-u", "-c", BOOT, pf_root]
	args.append_array(j.args)
	var r := OS.execute_with_pipe(python, args, true)
	if r.is_empty() or not r.has("stdio"):
		j.mutex.lock()
		j.exit_code = -1
		j.failed_to_start = true
		j.thread_done = true
		j.mutex.unlock()
		return
	j.pid = int(r["pid"])
	var io: FileAccess = r["stdio"]
	var empties := 0
	while io.is_open():
		var l := io.get_line()
		if l == "":
			if io.eof_reached() or io.get_error() != OK:
				break
			empties += 1
			if empties > 50 and not OS.is_process_running(j.pid):
				break
			if empties > 50:
				OS.delay_msec(10)
			continue
		empties = 0
		j.mutex.lock()
		j.pending.append(l)
		j.mutex.unlock()
	while OS.is_process_running(j.pid):
		OS.delay_msec(30)
	var code := OS.get_process_exit_code(j.pid)
	j.mutex.lock()
	j.exit_code = code
	j.thread_done = true
	j.mutex.unlock()

## the main thread drains each job's lines and finishes the ones whose process ended
func _process(_dt: float) -> void:
	for j in jobs.duplicate():
		j.mutex.lock()
		var lines: PackedStringArray = j.pending.duplicate()
		j.pending.clear()
		var ended: bool = j.thread_done
		var code: int = j.exit_code
		var failed: bool = j.failed_to_start
		j.mutex.unlock()
		for l in lines:
			_line(j, l)
		if ended:
			if failed:
				_done(j, {"ok": false, "error": "Python was not found. Run install.bat once, or set the interpreter in Settings.", "exit": -1})
			else:
				_finish(j, code)

func _line(j: Job, l: String) -> void:
	j.output.append(l)
	_log("  " + l)
	if l.begins_with("PF_PROGRESS"):
		var d := {}
		for part in l.substr(11).strip_edges().split(" "):
			var kv := part.split("=")
			if kv.size() == 2:
				d[kv[0]] = kv[1]
		j.progress = d
		progress.emit(j, d)
	line.emit(j, l)

## the result is the last JSON object in the output (the CLI prints it indented, "{" and "}" alone on their lines)
static func parse_result(lines: PackedStringArray) -> Dictionary:
	var end := -1
	for i in range(lines.size() - 1, -1, -1):
		if lines[i].strip_edges() == "}" and lines[i].begins_with("}"):
			end = i
			break
	if end < 0:
		for i in range(lines.size() - 1, -1, -1):
			var s := lines[i].strip_edges()
			if s.begins_with("{") and s.ends_with("}"):
				var one = JSON.parse_string(s)
				if one is Dictionary:
					return one
		return {}
	var start := -1
	for i in range(end, -1, -1):
		if lines[i] == "{":
			start = i
			break
	if start < 0:
		return {}
	var txt := "\n".join(lines.slice(start, end + 1))
	var d = JSON.parse_string(txt)
	return d if d is Dictionary else {}

func _finish(j: Job, code: int) -> void:
	var res := parse_result(j.output)
	if res.is_empty():
		var tail := "\n".join(j.output.slice(maxi(0, j.output.size() - 6)))
		res = {"ok": false, "error": _plain_error(tail, code), "exit": code, "raw": tail}
	elif not res.has("ok"):
		res["ok"] = code == 0
	res["exit"] = code
	if j.cancelled:
		res = {"ok": false, "error": "Stopped.", "cancelled": true, "exit": code}
	_done(j, res)

func _done(j: Job, res: Dictionary) -> void:
	j.done = true
	j.result = res
	if j.thread and j.thread.is_started():
		j.thread.wait_to_finish()
	jobs.erase(j)
	var secs := Time.get_ticks_msec() / 1000.0 - j.started
	_log("  -> " + ("ok" if res.get("ok", false) else "stopped: " + str(res.get("error", ""))) + " (%.1f s)" % secs)
	finished.emit(j, res)
	if j.on_done.is_valid():
		j.on_done.call(res)

static func _plain_error(tail: String, code: int) -> String:
	if "No module named" in tail:
		if "pixelforge" in tail:
			return "PixelForge is not installed for this Python. Run install.bat once."
		return "A Python package is missing. Run install.bat once; it installs what PixelForge needs."
	if "MemoryError" in tail:
		return "The computer ran out of memory for this step. Close other programs and try again."
	if code == 0 and tail.strip_edges() == "":
		return "The step finished but said nothing."
	return "The step stopped unexpectedly. The log has the details."

func cancel(j: Job) -> void:
	if j and not j.done and j.pid > 0:
		j.cancelled = true
		OS.kill(j.pid)

func busy() -> bool:
	return not jobs.is_empty()

func _log(s: String) -> void:
	log_lines.append(s)
	if log_lines.size() > 2000:
		log_lines = log_lines.slice(log_lines.size() - 1500)

## start a program and let it go (the game); returns the pid or -1
func launch(path: String, args: PackedStringArray) -> int:
	_log("$ " + path + " " + " ".join(args))
	return OS.create_process(path, args)

## read a JSON file into a Dictionary ({} when missing or not a dictionary)
static func read_json(path: String) -> Dictionary:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return {}
	var d = JSON.parse_string(f.get_as_text())
	return d if d is Dictionary else {}

static func write_json(path: String, d: Dictionary) -> bool:
	DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify(d, " "))
	return true

## copy a file (the app's own backups before "put it in the game")
static func copy_file(src: String, dst: String) -> bool:
	DirAccess.make_dir_recursive_absolute(dst.get_base_dir())
	return DirAccess.copy_absolute(src, dst) == OK

func _exit_tree() -> void:
	for j in jobs:
		cancel(j)
