extends "res://scripts/screen.gd"
## Characters: a shape model (.shapes.json) through the shape-sprite engine. A picture dropped or chosen here is the
## reference and nothing else: it is shown as it is (downscaled for the window, never cut, quantised or converted) and
## Claude Code draws the model against it in rounds (`character author`: a generator script, rendered and compared
## each round; nothing appears on the bench until the rounds finish). A sentence on the describe line draws from the
## words; with a model on the bench it is the note for another round. Without Claude Code the picture stays as the
## reference and the bench says Claude is needed to draw. Tabs: Reference (the compare screen),
## Model (the solid list: select a solid, move and scale it, change its material), Materials (ramps and emissives),
## Motion (clips and the lag / sway / hang levers, the direction wheel), Frames (the frame editor), Export (sheets,
## put it in the game, see it in the game). The file is the state: every edit is a change to the model file in the
## project, which the engine renders again (`shapes still` for a standing picture, `shapes render` for a clip's
## frames, `project render-shapes` for the whole set, `project export-game` for the sheets).

const DIRS := ["S", "SE", "E", "NE", "N", "NW", "W", "SW"]
const CLIPS := ["idle", "walk", "run", "attack", "cast", "hit", "death"]
const GLOW_KINDS := ["flame", "orb", "eyes", "runes", "embers", "crackle"]
const ENGINE_GLOWS := {"flame": "flame", "orb": "orb", "eyes": "", "runes": "runes", "embers": "motes"}
const SHAPE_KINDS := ["ellipsoid", "capsule", "box", "ring", "prism", "union"]
const IMAGE_EXTS := ["png", "jpg", "jpeg", "webp", "bmp", "gif"]

var doc := {}                  # the model file, as a dictionary (the state the levers edit)
var orig := {}                 # the file as imported (what Reset returns a shape or ramp to)
var library := {}              # the material library (names -> ramps)
var light_stop := 2
var clip_frames: Array = []    # the textures of the clip showing
var full_render := false       # the whole set is rendered (frames/ is complete)
var frame_i := 0
var retime := {}               # Frames tab edits: {"<clip>_<DIR>": {"hold": {i: n}, "deleted": [i], "mirror": false}}

func build() -> void:
	tabs = PackedStringArray(["Reference", "Model", "Materials", "Motion", "Frames", "Export"])
	hint_text = "Esc back · LB/RB tabs"
	if state.is_empty():
		state = {"name": "", "title": "", "model_file": "", "painting": String(args.get("painting", "")), "direction": String(args.get("direction", "S")), "clip": String(args.get("clip", "idle")),
			"part": "", "shape": -1, "material": "", "emissive": 0, "exported": "", "in_game": false, "shot": "",
			"pictures": [], "compare": "", "road_warnings": [], "judgement": "", "rounds": [], "road_error": "", "needs_claude": false, "author_words": ""}
	library = app.backend.read_json(app.backend.pf_root.path_join("assets/shapes/materials.json"))
	tab = 0 if state["painting"] != "" else 1
	tab_from_args()
	rebuild()
	if args.has("pictures"):
		start_from_pictures(_paths_of(args["pictures"]))
	elif args.has("model"):
		import_model(String(args["model"]))
	elif args.has("describe") and String(args["describe"]) != "" and String((args.get("draft", {}) if args.get("draft") is Dictionary else {}).get("what", "shapes")) != "skin":
		# a sentence from Home: Claude draws it (the automatic draft from the words never appears on the bench)
		_author_from_sentence(String(args["describe"]))
	elif args.has("character"):
		_open_character(String(args["character"]))
	elif args.has("painting"):
		app.scene.show_compare(painting_tex(String(args["painting"])), null, "the reference")

# ------------------------------------------------------------------ the reference and the author loop
static func _paths_of(v) -> PackedStringArray:
	if v is PackedStringArray:
		return v
	if v is Array:
		return PackedStringArray(v)
	return PackedStringArray(String(v).split(";", false))

## the painting as a texture for the window: downscaled with plain filtering when it is bigger than the window needs,
## never quantised, never cut out, never pixelated; the file on disk is not touched
static func painting_tex(path: String) -> Texture2D:
	if path == "" or not FileAccess.file_exists(path):
		return null
	var img := Image.load_from_file(path)
	if img == null:
		return null
	var w := img.get_width()
	var h := img.get_height()
	var limit := 720.0
	if w > limit or h > limit:
		var k := minf(limit / w, limit / h)
		img.resize(maxi(int(round(w * k)), 1), maxi(int(round(h * k)), 1), Image.INTERPOLATE_LANCZOS)
	return ImageTexture.create_from_image(img)

## is Claude Code there to draw? (the mock counts; the title line's status is the truth once it is in)
func claude_ready() -> bool:
	var st: Dictionary = app.claude_state
	return st.is_empty() or bool(st.get("ok", false))

const NEEDS_CLAUDE := "Claude Code is needed to draw; the picture is on the bench as the reference. Install it (claude.com/claude-code), run `claude` once to sign in, drop the picture again."

## a picture dropped or chosen is the reference, and nothing else is done to it: it is placed beside the bench as it is,
## and Claude draws the model against it in rounds (`character author`); the rounds' words run on the state line and
## nothing appears on the bench until they finish. Without Claude: the plain line, and "Use as reference only".
func start_from_pictures(paths: PackedStringArray) -> void:
	var pics: PackedStringArray = []
	for p in paths:
		if p.get_extension().to_lower() in IMAGE_EXTS and FileAccess.file_exists(p):
			pics.append(p)
	if pics.is_empty():
		app.say("That is not a picture the Forge can read (PNG, JPG or WEBP).")
		return
	if job != null:
		app.say("Still working on the last thing.")
		return
	state["pictures"] = Array(pics)
	state["painting"] = pics[0]
	state["road_error"] = ""
	state["needs_claude"] = false
	tab = 0
	app.scene.show_compare(painting_tex(pics[0]), null, "the reference")
	if not claude_ready():
		state["needs_claude"] = true
		rebuild()
		say_notes(NEEDS_CLAUDE)
		return
	rebuild()
	if pics.size() > 1:
		app.say("Several pictures: the first is the painting Claude draws from.", 4.0)
	_run_author(["--painting", pics[0]], "Claude draws from the painting")

## a sentence: a new character from the words when the bench is empty, else the note for another round
func _author_from_sentence(text: String) -> void:
	if text.strip_edges() == "":
		return
	if has_model():
		_another_round(text)
		return
	if not claude_ready():
		state["needs_claude"] = true
		rebuild()
		say_notes(NEEDS_CLAUDE)
		return
	_run_author(["--sentence", text], "Claude draws from the words")

## another round on the model on the bench, with the person's note (the describe line's words)
func _another_round(note: String = "") -> void:
	if not has_model() or not claude_ready():
		if has_model():
			say_notes(NEEDS_CLAUDE)
			rebuild()
		return
	var a := [String(state["name"]), "--rounds", "1"]
	if String(state.get("painting", "")) != "" and FileAccess.file_exists(String(state["painting"])):
		a += ["--painting", String(state["painting"])]
	if note.strip_edges() != "":
		a += ["--note", note.strip_edges()]
	_run_author(a, "another round" + (": " + note.strip_edges() if note.strip_edges() != "" else ""))

## `character author`: the rounds run in the backend; the state line carries each round's words; the result lands the
## model on the bench facing S with the painting beside it and the round scores on the Reference tab
func _run_author(extra: Array, words: String) -> void:
	if job != null:
		app.say("Still working on the last thing.")
		return
	state["author_words"] = words
	var style := app.style_name
	app.backend.ensure_project(style, func(_r):
		if not is_inside_tree():
			return
		var cmd := ["character", "author"]
		cmd.append_array(extra)
		cmd.append_array(["-p", app.backend.project_dir, "--style", style])
		app.set_claude_working("starting")
		if describe and is_instance_valid(describe):
			describe.editable = false
		run(cmd, words, func(r: Dictionary):
			app.set_claude_working("")
			if describe and is_instance_valid(describe):
				describe.editable = true
			if not r.get("ok", false):
				_author_failed(r)
				return
			_author_done(r)))

## the loop's progress lines carry `note` (the round's words); the render's carry clip and dir
func on_progress(info: Dictionary) -> void:
	if String(info.get("step", "")) == "author":
		var words := String(info.get("note", "")).replace("+", " ")
		busy_words = words
		state["author_words"] = words
		if progress and is_instance_valid(progress):
			progress.set_progress(int(info.get("done", "0")), int(info.get("total", "1")), words)
		if state_label and is_instance_valid(state_label):
			state_label.set_text("Claude draws: %s" % words)
		app.set_claude_working(words)
		app.set_hint("working: " + words)
		return
	if not info.has("what"):
		super.on_progress(info)
		return
	var words := String(info["what"]).replace("_", " ")
	if words == "done":
		return
	busy_words = words
	if progress and is_instance_valid(progress):
		progress.set_progress(int(info.get("done", "0")), int(info.get("total", "1")), words)
	if state_label and is_instance_valid(state_label):
		state_label.set_text("%s..." % words)
	app.set_hint("working: " + words)

func _author_done(r: Dictionary) -> void:
	state["name"] = String(r.get("character", ""))
	state["title"] = String(r.get("title", state["name"])).capitalize()
	state["compare"] = String(r.get("compare", ""))
	state["judgement"] = String(r.get("judgement", ""))
	state["rounds"] = r.get("rounds", [])
	state["road_warnings"] = []
	state["road_error"] = ""
	state["needs_claude"] = false
	state["exported"] = ""
	state["in_game"] = false
	if String(r.get("painting", "")) != "":
		state["painting"] = String(r["painting"])
	state.erase("edits"); state.erase("ramps"); state.erase("lights"); state.erase("motion")
	retime = {}
	clip_frames = []
	_frames_dirty = true
	undo_stack = []
	redo_stack = []
	_claude_text = ""
	tab = 0
	_model_loaded()
	var n: int = state["rounds"].size()
	var score = r.get("score", null)
	say_notes("%s: Claude drew it in %d round%s%s. %s" % [String(state["title"]), n, "s" if n != 1 else "", (" · overlap %.2f" % float(score)) if score != null else "", String(r.get("stopped", ""))])

## the loop stopped: its words stay on the bench (the toast fades; the state line does not)
func _author_failed(r: Dictionary) -> void:
	var err := plain_error(r)
	if "Claude Code was not found" in err or "not signed in" in err:
		state["needs_claude"] = true          # the plain line, not an error: the picture stays as the reference
		state["road_error"] = ""
		say_notes(NEEDS_CLAUDE)
	else:
		state["road_error"] = err
	rebuild()
	if has_model():
		refresh_preview()

## the describe line on this bench is the author's: a sentence draws a new character; with a model on the bench it is
## the note for another round (the base class's describe --bench never runs here)
func _describe() -> void:
	if describe == null:
		return
	var text := describe.text.strip_edges()
	if text == "":
		return
	if job != null:
		app.say("Still working on the last thing.")
		return
	if not app.backend.python_ok():
		app.say("Python was not found; see Settings.")
		return
	if not claude_ready():
		say_notes(String(app.claude_state.get("sentence", "Claude Code is not ready.")))
		rebuild()
		return
	_author_from_sentence(text)

## the round scores, one line: "round 1 front 0.50 · round 2 front 0.64 · round 3 front 0.69 (best)"
func _rounds_line() -> String:
	var rounds: Array = state.get("rounds", [])
	if rounds.is_empty():
		return ""
	var best := -1
	var best_score := -1.0
	for h in rounds:
		if h.get("score", null) != null and float(h["score"]) > best_score:
			best_score = float(h["score"]); best = int(h["round"])
	var bits: PackedStringArray = []
	for h in rounds:
		var words := ""
		if h.has("error") and String(h.get("error", "")) != "":
			words = "stopped"
		elif h.get("score", null) == null:
			words = "%d shapes" % int(h.get("shapes", 0))
		else:
			var vs: Dictionary = h.get("views", {})
			var parts: PackedStringArray = []
			for k in vs:
				parts.append("%s %.2f" % [String(k), float(vs[k])])
			words = " ".join(parts)
		bits.append("round %d %s%s" % [int(h["round"]), words, " (best)" if int(h["round"]) == best and best >= 0 else ""])
	return "Claude's rounds: " + " · ".join(bits)

## the compare picture: the painting's views beside the sprite's matching directions at one height, with the overlap
func _show_compare_picture() -> void:
	var t := tex(String(state.get("compare", "")))
	if t == null:
		app.say("No compare picture yet: drop a picture and Claude draws against it.")
		return
	app.scene.show_picture(t, "%s · painting beside sprite per view · %s" % [String(state["title"]), String(state.get("judgement", ""))])

## the editor on the idle clip facing the bench's direction, rendered first when it is not yet
func _open_in_editor() -> void:
	if not has_model():
		return
	state["clip"] = "idle"
	var d := String(state["direction"])
	var preview_dir := previews_dir().path_join("frames").path_join("idle_%s" % d)
	if DirAccess.dir_exists_absolute(preview_dir) and not _frames_dirty:
		_load_clip(preview_dir, 12.0)
		_edit_frames()
		return
	run(["shapes", "render", model_path(), "-o", previews_dir().path_join("frames"), "--clips", "idle", "--directions", d, "--style", app.style_name], "rendering idle %s for the editor" % d, func(r: Dictionary):
		if not r.get("ok", false):
			return
		_frames_dirty = false
		_load_clip(preview_dir, float(r.get("fps", {}).get("idle", 12.0)))
		_edit_frames())

# ------------------------------------------------------------------ getting a model onto the bench
func char_dir() -> String:
	return app.backend.project_dir.path_join("characters").path_join(String(state["name"]))

func model_path() -> String:
	return char_dir().path_join("shapes").path_join(String(state["name"]) + ".shapes.json")

func previews_dir() -> String:
	var d := char_dir().path_join("previews")
	DirAccess.make_dir_recursive_absolute(d)
	return d

## a model file dropped or chosen: into the project as a character, then onto the bench
func import_model(path: String) -> void:
	var d := app.backend.read_json(path)
	if d.is_empty() or not d.has("shapes"):
		app.say("That is not a shape model (.shapes.json).")
		return
	var name := slug(String(d.get("name", path.get_file().split(".")[0])))
	state["name"] = name
	state["title"] = String(d.get("name", name)).capitalize()
	var style := app.style_name
	app.backend.ensure_project(style, func(_r):
		if not is_inside_tree():
			return
		# an existing character is fine: the model file is imported over it
		app.backend.run(["project", "add", name, "-p", app.backend.project_dir], "adding " + name, func(_r2):
			if not is_inside_tree():
				return
			run(["project", "import-shapes", name, path, "-p", app.backend.project_dir], "importing the model", func(r3: Dictionary):
				if not r3.get("ok", false):
					return
				_model_loaded(), false)))

func _open_character(name: String) -> void:
	state["name"] = name
	state["title"] = name.capitalize()
	if FileAccess.file_exists(model_path()):
		_model_loaded()
	else:
		app.say("That character has no shape model yet; drop one on the bench.")

func _model_loaded() -> void:
	doc = app.backend.read_json(model_path())
	orig = app.backend.read_json(model_path())
	state["model_file"] = model_path()
	app.cfg["last_character"] = {"name": String(state["name"]), "model": model_path()}   # the Detail bench and Build on Home take it
	state["title"] = String(doc.get("name", state["name"])).capitalize()
	full_render = FileAccess.file_exists(char_dir().path_join("frames").path_join("animations.json"))
	retime = app.backend.read_json(char_dir().path_join("frames").path_join("retime.json"))
	rebuild()
	if tab in [3, 4]:
		show_clip()
	else:
		refresh_preview()

func has_model() -> bool:
	return not doc.is_empty()

## write the edited model back to its file (the file is the state an AI edits the same way)
func save_doc() -> void:
	if has_model():
		app.backend.write_json(model_path(), doc)

# ------------------------------------------------------------------ the picture window
## a standing picture of the model facing the chosen direction, with its lights on the backdrop. A request, not a
## run: a wheel turned through several facings draws the last one once; a turn made while a render runs waits for
## it instead of being dropped; a render that comes back after a newer request is stale and leaves the window alone.
func refresh_preview() -> void:
	if not has_model():
		return
	if tab in [3, 4] and not clip_frames.is_empty() and not _frames_dirty:
		return
	request(_render_still)

func _render_still() -> void:
	if not has_model() or not is_inside_tree():
		return
	var d := String(state["direction"])
	var out := previews_dir().path_join("still_%s.png" % d)
	var t_ := ticket()
	run(["shapes", "still", model_path(), "-o", out, "--direction", d, "--style", app.style_name, "--zoom", "1"], "drawing the model", func(r: Dictionary):
		if not r.get("ok", false) or not fresh(t_) or d != String(state["direction"]):
			return
		var t := tex(String(r.get("png", out)))
		if t == null:
			return
		var anchor: Array = r.get("anchor", [t.get_width() / 2.0, t.get_height()])
		var lts: Array = r.get("lights", [])
		state["last_lights"] = lts
		state["last_anchor"] = anchor
		app.scene.show_still(t, Vector2(float(anchor[0]), float(anchor[1])), lts, "%s · %s · %s" % [String(state["title"]), d, app.style_name.replace("_", " ")])
		if tab == 0:
			_show_compare(t)
		, false)

var _frames_dirty := true

## the frames of the chosen clip and direction: from the full render when there is one, else a quick preview render
func show_clip(force_render: bool = false) -> void:
	if not has_model():
		return
	var clip := String(state["clip"])
	var d := String(state["direction"])
	var key := "%s_%s" % [clip, d]
	var frames_dir := char_dir().path_join("frames").path_join(key)
	var preview_dir := previews_dir().path_join("frames").path_join(key)
	var src := frames_dir if (full_render and DirAccess.dir_exists_absolute(frames_dir)) else preview_dir
	if force_render or not DirAccess.dir_exists_absolute(src) or _frames_dirty:
		request(_render_clip)
		return
	var anims := app.backend.read_json(src.get_base_dir().path_join("animations.json"))
	_load_clip(src, float(anims.get("clip_fps", {}).get(clip, 12.0)))

## a quick preview render of the chosen clip and direction (the same request rules as the still: see refresh_preview)
func _render_clip() -> void:
	if not has_model() or not is_inside_tree():
		return
	var clip := String(state["clip"])
	var d := String(state["direction"])
	var preview_dir := previews_dir().path_join("frames").path_join("%s_%s" % [clip, d])
	var out := previews_dir().path_join("frames")
	var t_ := ticket()
	run(["shapes", "render", model_path(), "-o", out, "--clips", clip, "--directions", d, "--style", app.style_name], "rendering %s %s" % [clip, d], func(r: Dictionary):
		if not r.get("ok", false) or not fresh(t_) or clip != String(state["clip"]) or d != String(state["direction"]):
			return
		_frames_dirty = false
		_load_clip(preview_dir, r.get("fps", {}).get(clip, 12.0)))

func _load_clip(dir: String, fps: float) -> void:
	clip_frames = frame_textures(dir)
	if clip_frames.is_empty():
		return
	var anims := app.backend.read_json(dir.get_base_dir().path_join("animations.json"))
	var gy := float(anims.get("ground_y", clip_frames[0].get_height()))
	var ax := float(anims.get("axis_x", clip_frames[0].get_width() / 2.0))
	state["fps"] = fps
	state["ground_y"] = gy
	state["axis_x"] = ax
	state["frames_dir"] = dir
	app.scene.show_frames(_apply_retime(clip_frames), fps, gy, ax, state.get("last_lights", []),
		"%s · %s %s · %d frames at %s a second" % [String(state["title"]), String(state["clip"]), String(state["direction"]), clip_frames.size(), T.fmt(fps, 1)])
	app.scene.onion = bool(state.get("onion", false))
	if tab == 4:
		rebuild()

## the Frames tab's edits laid over the rendered frames (holds, deletions, a mirrored direction)
func _apply_retime(frames: Array) -> Array:
	var key := "%s_%s" % [String(state["clip"]), String(state["direction"])]
	var r: Dictionary = retime.get(key, {})
	if r.is_empty():
		return frames
	var out := []
	var deleted: Array = r.get("deleted", [])
	var holds: Dictionary = r.get("hold", {})
	for i in frames.size():
		if i in deleted or str(i) in deleted:
			continue
		var n := int(holds.get(str(i), 1))
		for k in maxi(n, 1):
			out.append(frames[i])
	return out if not out.is_empty() else frames

func _show_compare(sprite: Texture2D) -> void:
	var painting := painting_tex(String(state["painting"]))
	app.scene.show_compare(painting, sprite, "the reference · the sprite at game size" if painting else "no reference painting · the sprite at game size")

# ------------------------------------------------------------------ the tabs
func build_tab(i: int) -> void:
	if not has_model():
		_build_empty()
		return
	match i:
		0: _build_reference()
		1: _build_model()
		2: _build_materials()
		3: _build_motion()
		4: _build_frames()
		5: _build_export()

func on_tab() -> void:
	_frames_dirty = _frames_dirty
	if tab in [3, 4]:
		show_clip()
	else:
		refresh_preview()

func _build_empty() -> void:
	var line := "The bench is empty. Drop a painting and Claude draws it as a shape model in rounds; or type the character on the line below; or drop a shape model (.shapes.json)."
	var err := String(state.get("road_error", ""))
	var needs := bool(state.get("needs_claude", false))
	if err != "":
		line = "Claude did not finish the character: " + err + " Try again, or drop a model file."
	elif needs:
		line = NEEDS_CLAUDE
	elif String(state.get("painting", "")) != "":
		line = "The painting is on the bench as the reference. Claude draws against it when you drop it again, or drop a shape model (.shapes.json) to stand beside it."
	state_line(line, "Gold" if (err != "" or needs) else "", 2)
	add_spacer()
	var items := []
	if needs or (String(state.get("painting", "")) != "" and err == ""):
		items.append({"label": "Use as reference only", "cb": func():
			state["needs_claude"] = false
			rebuild()
			app.scene.show_compare(painting_tex(String(state["painting"])), null, "the reference")})
	items.append_array([
		{"label": "Choose a painting", "cb": func(): app.choose_file(PackedStringArray(["*.png, *.jpg, *.jpeg, *.webp ; paintings"]), func(p): start_from_pictures(PackedStringArray([p])), "Choose a painting")},
		{"label": "Choose a model file", "cb": func(): app.choose_file(PackedStringArray(["*.json ; shape models"]), import_model, "Choose a shape model")},
		{"label": "Start from the Keeper", "cb": func(): import_model(app.backend.pf_root.path_join("assets/shapes/characters/keeper.shapes.json"))},
		{"label": "Start from the necromancer", "cb": func(): import_model(app.backend.pf_root.path_join("assets/shapes/necromancer_3d.shapes.json"))},
	])
	add_choices(items)

## a row of cyclers: [{label, value, left, right}] and plain choices, in the small face
func add_cyclers(items: Array) -> Control:
	var c := W.Choices.new()
	c.font_size = T.SMALL_SIZE
	c.arrow_gap = 12
	c.flow = true
	c.flow_gap = 14
	c.setup(items, maxi(items.size(), 1), app)
	c.row_h = 13
	c.custom_minimum_size = Vector2(0, 13)
	add_extra(c)
	return c

static func _cycle(list: Array, cur, delta: int):
	var i := list.find(cur)
	return list[posmod(i + delta, list.size())] if not list.is_empty() else cur

func direction_wheel() -> Control:
	var w := W.Wheel.new()
	var idx := DIRS.find(String(state["direction"]))
	# the wheel keeps its fine angle across the rebuild a turn causes (so three presses make a facing, every time);
	# the facing's centre when a cycler or undo moved the facing without it
	var a0 := idx * 45.0 if idx >= 0 else 0.0
	var kept := float(state.get("wheel_angle", a0))
	if DIRS[posmod(int(round(kept / 45.0)), 8)] == String(state["direction"]):
		a0 = kept
	w.init_wheel("facing", a0, 0.0, func(a): return DIRS[posmod(int(round(a / 45.0)), 8)], Callable(), func(a):
		var d: String = DIRS[posmod(int(round(a / 45.0)), 8)]
		state["wheel_angle"] = a
		if d != String(state["direction"]):
			state["direction"] = d
			if tab in [3, 4]:
				show_clip()
			else:
				refresh_preview()
			call_deferred("_rebuild_turned"))
	w.hint = "left and right turn the model"
	return w

func scene_light_lever() -> Control:
	var l := W.Lever3.new()
	l.init_lever3("scene light", app.scene.light_mode, 2, PackedStringArray(["off", "sprite only", "on"]), func(s): app.scene.set_light_mode(s); app.cfg["light"] = s; app.save_cfg())
	return l

func set_light_stop(s: int) -> void:
	app.scene.set_light_mode(s)

## --- Reference: the compare screen
func _build_reference() -> void:
	var judgement := String(state.get("judgement", ""))
	var err := String(state.get("road_error", ""))
	var rounds_line := _rounds_line()
	if err != "":
		state_line("%s · reference. Claude did not finish the round: %s" % [String(state["title"]), err], "Gold", 2)
	elif bool(state.get("needs_claude", false)):
		state_line("%s · reference. %s" % [String(state["title"]), NEEDS_CLAUDE], "Gold", 2)
	elif judgement != "":
		state_line("%s · drawn by Claude. %s" % [String(state["title"]), judgement], "", 2)
	else:
		state_line("%s · reference. %s" % [String(state["title"]), _summary()])
	dim_line(rounds_line if rounds_line != "" else _checks(), 2)
	# one row of cyclers (the facing and the scene light as on Export; the prompt when a describe run brought the set), so the
	# rows of choices and the Claude line fit under them
	var cy := []
	var prompts: Dictionary = state.get("prompts", {})
	if not prompts.is_empty():
		var kinds: Array = prompts.keys()
		var kind := String(state.get("prompt_kind", kinds[0]))
		if not prompts.has(kind):
			kind = String(kinds[0])
		state["prompt_kind"] = kind
		var titles: Dictionary = state.get("prompt_titles", {})
		cy.append({"label": "prompt", "value": String(titles.get(kind, kind)).split(" (")[0], "left": func(): state["prompt_kind"] = _cycle(kinds, kind, -1); rebuild(),
			"right": func(): state["prompt_kind"] = _cycle(kinds, kind, 1); rebuild()})
	cy.append({"label": "facing", "value": String(state["direction"]), "left": func(): _pick_direction(_cycle(DIRS, String(state["direction"]), -1)), "right": func(): _pick_direction(_cycle(DIRS, String(state["direction"]), 1))})
	cy.append({"label": "scene light", "value": ["off", "sprite only", "on"][app.scene.light_mode], "left": func(): _set_scene_light(app.scene.light_mode - 1), "right": func(): _set_scene_light(app.scene.light_mode + 1)})
	add_cyclers(cy)
	add_spacer()
	var items := []
	items.append({"label": "Another round", "cb": _another_round_from_line})
	if String(state.get("compare", "")) != "":
		items.append({"label": "Compare", "cb": _show_compare_picture})
	items.append({"label": "Render all", "cb": render_all})
	items.append({"label": "Open in editor", "cb": _open_in_editor})
	items.append({"label": "Export", "cb": _export_after_render})
	items.append({"label": "Draw from a painting", "cb": func(): app.choose_file(PackedStringArray(["*.png, *.jpg, *.jpeg, *.webp ; paintings"]), func(p): start_from_pictures(PackedStringArray([p])), "Choose a painting")})
	items.append({"label": "Use as reference only", "cb": func(): app.choose_file(PackedStringArray(["*.png, *.jpg, *.jpeg, *.webp ; paintings"]), func(p):
		state["painting"] = p
		rebuild()
		refresh_preview(), "Choose a painting to stand beside the model")})
	items.append({"label": "Copy prompt", "cb": _copy_prompt})
	items.append({"label": midjourney_label(), "cb": _paint_in_midjourney})
	add_choices(standard_choices(items, false))
	if String(state["painting"]) == "":
		hint_text = "drop a painting anywhere: Claude draws it"
	app.set_hint(hint_text)

## Another round: the describe line's words are the note; with nothing typed the line takes the focus
func _another_round_from_line() -> void:
	var note := _claude_text.strip_edges()
	if note == "" and describe and is_instance_valid(describe):
		describe.grab_focus()
		app.say_hint("type your note on the line, then Enter: Claude does another round")
		return
	_another_round(note)

## Export: the sheets, rendering the whole set first when it is not yet
func _export_after_render() -> void:
	if full_render:
		_export_sheets()
		return
	if not has_model() or job != null:
		return
	save_doc()
	run(["project", "render-shapes", String(state["name"]), "--style", app.style_name, "-p", app.backend.project_dir], "rendering every clip in every direction", func(r: Dictionary):
		if not r.get("ok", false):
			return
		full_render = true
		_frames_dirty = false
		retime = {}
		_export_sheets())

func _summary() -> String:
	var n: int = doc.get("shapes", []).size()
	var mats := {}
	for s in doc.get("shapes", []):
		mats[String(s.get("material", ""))] = true
	var live := 0
	for s in doc.get("shapes", []):
		var px: Array = s.get("px", [null, null])
		var h := float(doc.get("height", 120))
		var lo = px[0] if px.size() > 0 else null
		var hi = px[1] if px.size() > 1 else null
		if (lo == null or h >= float(lo)) and (hi == null or h <= float(hi)):
			live += 1
	return "%d solids (%d live at %d px), %d materials, %d lights, %d effects." % [n, live, int(doc.get("height", 120)), mats.size(), doc.get("lights", []).size(), doc.get("effects", []).size()]

## what to change: the file's own checks, as plain lines
func _checks() -> String:
	var road: Array = state.get("road_warnings", [])
	if not road.is_empty():
		var ws: PackedStringArray = []
		for w in road:
			ws.append(String(w))
		return "Worth knowing: " + " ".join(ws)
	var notes := []
	if String(state["painting"]) == "":
		notes.append("No painting on the bench: drop one to compare against.")
	if doc.get("lights", []).is_empty():
		notes.append("No emissives: a figure reads better with one light (eyes, a flame, an orb).")
	var mats := {}
	for s in doc.get("shapes", []):
		mats[String(s.get("material", ""))] = true
	if mats.size() < 4:
		notes.append("Few materials: the silhouette will read as one mass at game size; split cloth from metal from skin.")
	if notes.is_empty():
		return "Checks clean: feet on the ground, one piece in every direction, no shimmer between held poses."
	return "What to change: " + " ".join(PackedStringArray(notes))

## the description the prompts are built from: the describe line's words, else the file's "about", else the title
func about_text() -> String:
	var a := String(state.get("about", ""))
	if a == "":
		a = String(doc.get("about", state["title"]))
	if a.to_lower().begins_with("drafted from:"):
		a = a.split(":", true, 1)[1].strip_edges()
	return a

## the prompt kind the Reference tab's cycler shows (a describe result brought the whole set), else the pixel-styled sheet
func current_prompt_kind() -> String:
	return String(state.get("prompt_kind", "sheet_px"))

func _copy_prompt() -> void:
	var prompts: Dictionary = state.get("prompts", {})
	var kind := current_prompt_kind()
	if prompts.has(kind):
		DisplayServer.clipboard_set(String(prompts[kind]))
		app.say("The %s prompt is on the clipboard." % kind.replace("_", " "))
		return
	run(["prompt", "--describe", about_text(), "--kind", kind], "building the prompt", func(r: Dictionary):
		if r.get("ok", false):
			DisplayServer.clipboard_set(String(r.get("prompt", "")))
			app.say("The %s prompt is on the clipboard." % kind.replace("_", " "))
		, false)

# ------------------------------------------------------------------ Claude on the bench
func claude_context() -> Dictionary:
	var ctx := {}
	if has_model():
		ctx["model_file"] = model_path()
		ctx["character"] = String(state["name"])
	if String(state.get("painting", "")) != "":
		ctx["painting"] = String(state["painting"])
	if String(state.get("frames_dir", "")) != "":
		ctx["frames_dir"] = String(state["frames_dir"])
	return ctx

## Claude's run is done: a model it made or changed goes on the bench (the file is the truth: the levers' edits start again
## from it), the prompts it brought go to the Reference tab
func on_claude_done(r: Dictionary) -> void:
	if r.has("prompts") and r["prompts"] is Dictionary and not r["prompts"].is_empty():
		state["prompts"] = r["prompts"]
		state["prompt_titles"] = r.get("prompt_titles", {})
		state["prompt_kind"] = "sheet_px" if r["prompts"].has("sheet_px") else String(r["prompts"].keys()[0])
		state["about"] = String(r.get("about", ""))
	var f := String(r.get("model_file", pick_changed(r, ".shapes.json")))
	if f == "":
		f = pick_changed(r, ".shapes.json")
	if f != "" and FileAccess.file_exists(f):
		var name := f.get_file().split(".")[0]
		state.erase("edits"); state.erase("ramps"); state.erase("lights"); state.erase("motion")
		if has_model() and f.simplify_path() == model_path().simplify_path():
			_frames_dirty = true
			_model_loaded()
		elif f.simplify_path() == _model_path_of(name).simplify_path():
			state["name"] = name
			_frames_dirty = true
			tab = 0
			_model_loaded()
		else:
			tab = 0
			import_model(f)
	elif has_model():
		_frames_dirty = true
		_model_loaded()

func _model_path_of(name: String) -> String:
	var keep := String(state["name"])
	state["name"] = name
	var p := model_path()
	state["name"] = keep
	return p

## Undo put the model file back as it was before Claude: read it again (or clear the bench when it made the model)
func on_claude_undone() -> void:
	state.erase("edits"); state.erase("ramps"); state.erase("lights"); state.erase("motion")
	if String(state.get("name", "")) != "" and FileAccess.file_exists(model_path()):
		_frames_dirty = true
		_model_loaded()
	else:
		doc = {}
		orig = {}
		clip_frames = []
		state["name"] = ""
		state["model_file"] = ""
		app.scene.clear()

## --- Midjourney through the owner's Chrome (Claude in Chrome): the bench's prompt and its clay view, the painting onto the Reference tab
func midjourney_label() -> String:
	return "Paint it in Midjourney"

func midjourney_kind() -> String:
	return current_prompt_kind()

func reference_dir() -> String:
	var d := char_dir().path_join("reference")
	DirAccess.make_dir_recursive_absolute(d)
	return d

func _paint_in_midjourney(kind: String = "") -> void:
	if job != null:
		app.say("Still working on the last thing.")
		return
	var st: Dictionary = app.claude_state
	if not st.is_empty() and not st.get("ok", false):
		say_notes(String(st.get("sentence", "Claude Code is not ready.")) + " Copy prompt and drop the painting on the bench instead.")
		rebuild()
		return
	if kind == "":
		kind = midjourney_kind()
	var prompts: Dictionary = state.get("prompts", {})
	var a := ["midjourney", "fetch", "-o", reference_dir(), "-p", app.backend.project_dir, "--kind", kind]
	if prompts.has(kind):
		a += ["--prompt", String(prompts[kind])]
	else:
		a += ["--describe", about_text()]
	var clay := previews_dir().path_join("still_%s.png" % String(state["direction"]))
	if FileAccess.file_exists(clay):
		a += ["--image", clay]
	say_notes("Watch the browser: a Chrome tab opens on midjourney.com and Claude works it at a human pace. One job; it can take a few minutes.")
	rebuild()
	app.set_claude_working("opening Chrome")
	run(a, "Claude paints it in Midjourney", func(r: Dictionary):
		app.set_claude_working("")
		if not r.get("ok", false):
			say_notes("Midjourney: " + plain_error(r) + " Copy prompt and drop the painting on the bench instead.")
			rebuild()
			return
		var files: Array = r.get("files", [])
		if not files.is_empty():
			state["painting"] = String(files[0])
			tab = 0
		say_notes("The painting is on the Reference tab. " + String(r.get("notes", "")))
		rebuild()
		refresh_preview())

## --- Model: the solid list
func _build_model() -> void:
	var parts := _parts()
	if String(state["part"]) == "" and not parts.is_empty():
		state["part"] = parts[0]
	var shapes_of := _shapes_of(String(state["part"]))
	if int(state["shape"]) < 0 or not shapes_of.has(int(state["shape"])):
		state["shape"] = shapes_of[0] if not shapes_of.is_empty() else -1
	var s := _shape()
	var what := ""
	if not s.is_empty():
		what = "%s: %s of %s, on %s" % [String(s.get("name", "solid")), String(s.get("kind", "")), String(s.get("material", "")), String(s.get("bone", _part_bone(String(state["part"]))))]
	state_line("%s · model · %s" % [String(state["title"]), what])
	var part := String(state["part"])
	var si := int(state["shape"])
	var sname := String(doc["shapes"][si].get("name", "solid %d" % si)) if si >= 0 else "none"
	add_cyclers([
		{"label": "part", "value": part, "left": func(): _pick_part(_cycle(parts, part, -1)), "right": func(): _pick_part(_cycle(parts, part, 1))},
		{"label": "solid", "value": sname, "left": func(): _pick_shape(_cycle(shapes_of, si, -1)), "right": func(): _pick_shape(_cycle(shapes_of, si, 1))},
		{"label": "material", "value": String(s.get("material", "")), "left": func(): _step_material(-1), "right": func(): _step_material(1)},
	])
	var e := _edit()
	var controls := []
	var lx := W.Lever.new()
	lx.init("move x", (float(e.get("dx", 0)) + 10.0) / 20.0, 0.5, func(v): return "%+d" % int(round(v * 20.0 - 10.0)), Callable(), func(v): _set_edit("dx", round(v * 20.0 - 10.0)))
	var ly := W.Lever.new()
	ly.init("move y", (float(e.get("dy", 0)) + 10.0) / 20.0, 0.5, func(v): return "%+d" % int(round(v * 20.0 - 10.0)), Callable(), func(v): _set_edit("dy", round(v * 20.0 - 10.0)))
	var lz := W.Lever.new()
	lz.init("move z", (float(e.get("dz", 0)) + 10.0) / 20.0, 0.5, func(v): return "%+d" % int(round(v * 20.0 - 10.0)), Callable(), func(v): _set_edit("dz", round(v * 20.0 - 10.0)))
	var ls := W.Lever.new()
	ls.init("size", (float(e.get("k", 1.0)) - 0.5) / 1.0, 0.5, func(v): return "x" + T.fmt(0.5 + v, 2), Callable(), func(v): _set_edit("k", snappedf(0.5 + v, 0.05)))
	var lt := W.Lever.new()
	lt.init("tone", (float(e.get("tone", 0)) + 2.0) / 4.0, 0.5, func(v): return "%+d" % int(round(v * 4.0 - 2.0)), Callable(), func(v): _set_edit("tone", round(v * 4.0 - 2.0)))
	var lg := W.Lever.new()
	lg.init("hang", float(e.get("hang", _hang_of(s))), _hang_of(s), func(v): return T.fmt(v, 2), Callable(), func(v): _set_edit("hang", snappedf(v, 0.05)))
	controls.append_array([lx, ly, lz, ls, lt, lg, direction_wheel(), scene_light_lever()])
	add_rack(controls, 8)
	var items := [{"label": "Hide" if not s.get("hidden", false) else "Show", "cb": _toggle_hidden}]
	add_choices(standard_choices(items))

## the Advanced fold: the chosen solid's offsets in half units and its scale in hundredths (the levers step whole ones)
func advanced_extra() -> Array:
	if tab != 1 or not has_model():
		return []
	var e := _edit()
	return [
		fine_slider("x fine", float(e.get("dx", 0)), -20.0, 20.0, 0.0, 1, func(v): _set_edit("dx", snappedf(v, 0.5))),
		fine_slider("y fine", float(e.get("dy", 0)), -20.0, 20.0, 0.0, 1, func(v): _set_edit("dy", snappedf(v, 0.5))),
		fine_slider("z fine", float(e.get("dz", 0)), -20.0, 20.0, 0.0, 1, func(v): _set_edit("dz", snappedf(v, 0.5))),
		fine_slider("scale", float(e.get("k", 1.0)), 0.5, 1.5, 1.0, 2, func(v): _set_edit("k", snappedf(v, 0.01))),
	]

func _pick_part(p) -> void:
	state["part"] = String(p)
	state["shape"] = -1
	rebuild()

func _pick_shape(i) -> void:
	state["shape"] = int(i)
	rebuild()

func _step_material(delta: int) -> void:
	var sh := _shape()
	if sh.is_empty():
		return
	var names := _material_names()
	var cur := names.find(String(sh.get("material", "")))
	_set_edit_str("material", String(names[posmod(cur + delta, names.size())]))

func _parts() -> Array:
	var out := []
	for s in doc.get("shapes", []):
		var p := String(s.get("part", s.get("bone", "body")))
		if not out.has(p):
			out.append(p)
	return out

func _part_bone(part: String) -> String:
	var parts: Dictionary = doc.get("parts", {})
	if parts.has(part) and parts[part] is Dictionary:
		return String(parts[part].get("bone", part))
	return part

func _shapes_of(part: String) -> Array:
	var out := []
	var shapes: Array = doc.get("shapes", [])
	for i in shapes.size():
		if String(shapes[i].get("part", shapes[i].get("bone", "body"))) == part:
			out.append(i)
	return out

func _shape() -> Dictionary:
	var i := int(state["shape"])
	var shapes: Array = doc.get("shapes", [])
	return shapes[i] if i >= 0 and i < shapes.size() else {}

func _hang_of(s: Dictionary) -> float:
	if s.has("hang"):
		return float(s["hang"])
	var parts: Dictionary = doc.get("parts", {})
	var p: Dictionary = parts.get(String(s.get("part", "")), {}) if parts.get(String(s.get("part", ""))) is Dictionary else {}
	return float(p.get("hang", 1.0))

func _edit() -> Dictionary:
	var edits: Dictionary = state.get("edits", {})
	return edits.get(str(state["shape"]), {})

## an edit is kept as a total offset from the imported file, so the levers are absolute and Reset is exact
func _set_edit(key: String, value: float) -> void:
	var i := int(state["shape"])
	if i < 0:
		return
	push_undo()
	if not state.has("edits"):
		state["edits"] = {}
	if not state["edits"].has(str(i)):
		state["edits"][str(i)] = {}
	state["edits"][str(i)][key] = value
	_apply_edits()
	save_doc()
	_frames_dirty = true
	refresh_preview()
	if tab == 1:
		rebuild()

## rebuild the model's shapes from the imported file plus the edits
func _apply_edits() -> void:
	var edits: Dictionary = state.get("edits", {})
	var shapes: Array = []
	for s in orig.get("shapes", []):
		shapes.append(s.duplicate(true))
	for k in edits:
		var i := int(k)
		if i < 0 or i >= shapes.size():
			continue
		var e: Dictionary = edits[k]
		var s: Dictionary = shapes[i]
		var d := Vector3(float(e.get("dx", 0)), float(e.get("dy", 0)), float(e.get("dz", 0)))
		var kk := float(e.get("k", 1.0))
		_move_shape(s, d, kk)
		if e.has("tone"):
			s["tone"] = int(e["tone"])
		if e.has("hang"):
			s["hang"] = float(e["hang"])
		if e.has("hidden"):
			s["hidden"] = bool(e["hidden"])
		if e.has("material"):
			s["material"] = String(e["material"])
	doc["shapes"] = shapes

static func _add3(a: Array, d: Vector3) -> Array:
	return [float(a[0]) + d.x, float(a[1]) + d.y, float(a[2]) + d.z] if a.size() >= 3 else a

static func _move_shape(s: Dictionary, d: Vector3, k: float) -> void:
	match String(s.get("kind", "")):
		"ellipsoid":
			s["centre"] = _add3(s.get("centre", [0, 0, 0]), d)
			if s.has("radii"):
				s["radii"] = [float(s["radii"][0]) * k, float(s["radii"][1]) * k, float(s["radii"][2]) * k]
		"box":
			s["centre"] = _add3(s.get("centre", [0, 0, 0]), d)
			if s.has("half"):
				s["half"] = [float(s["half"][0]) * k, float(s["half"][1]) * k, float(s["half"][2]) * k]
		"capsule":
			s["a"] = _add3(s.get("a", [0, 0, 0]), d)
			s["b"] = _add3(s.get("b", [0, 0, 0]), d)
			if s.has("r"):
				if s["r"] is Array:
					s["r"] = [float(s["r"][0]) * k, float(s["r"][1]) * k]
				else:
					s["r"] = float(s["r"]) * k
		"ring":
			if s.has("y"):
				s["y"] = [float(s["y"][0]) + d.y, float(s["y"][1]) + d.y]
			for key in ["rx", "rz"]:
				if s.has(key):
					if s[key] is Array:
						s[key] = [float(s[key][0]) * k, float(s[key][1]) * k]
					else:
						s[key] = float(s[key]) * k
		"prism":
			if s.has("centre"):
				s["centre"] = [float(s["centre"][0]) + d.x, float(s["centre"][1]) + d.y]
			if s.has("z"):
				s["z"] = [float(s["z"][0]) + d.z, float(s["z"][1]) + d.z]
			if s.has("radii"):
				s["radii"] = [float(s["radii"][0]) * k, float(s["radii"][1]) * k]
		"union":
			for sub in s.get("of", []):
				_move_shape(sub, d, k)

func _toggle_hidden() -> void:
	var s := _shape()
	if s.is_empty():
		return
	_set_edit("hidden", 0.0 if s.get("hidden", false) else 1.0)

func _set_edit_str(key: String, value: String) -> void:
	var i := int(state["shape"])
	if i < 0:
		return
	push_undo()
	if not state.has("edits"):
		state["edits"] = {}
	if not state["edits"].has(str(i)):
		state["edits"][str(i)] = {}
	state["edits"][str(i)][key] = value
	_apply_edits()
	save_doc()
	_frames_dirty = true
	refresh_preview()
	rebuild()

func _material_names() -> Array:
	var names := []
	for k in doc.get("materials", {}):
		names.append(String(k))
	for k in library:
		if not String(k).begins_with("_") and not names.has(String(k)):
			names.append(String(k))
	return names

## --- Materials: ramps and emissives
func _build_materials() -> void:
	var used := _used_materials()
	if String(state["material"]) == "" or not used.has(String(state["material"])):
		state["material"] = used[0] if not used.is_empty() else ""
	var m := String(state["material"])
	state_line("%s · materials · %s. The ramps are the sprite's whole palette; a glow has a shape." % [String(state["title"]), m])
	var lights0: Array = doc.get("lights", [])
	var li0 := clampi(int(state["emissive"]), 0, maxi(lights0.size() - 1, 0))
	var cy := [
		{"label": "material", "value": m, "left": func(): state["material"] = _cycle(used, m, -1); rebuild(), "right": func(): state["material"] = _cycle(used, m, 1); rebuild()},
	]
	if not lights0.is_empty():
		var lname := String(lights0[li0].get("name", "light"))
		cy.append({"label": "light", "value": lname, "left": func(): state["emissive"] = posmod(li0 - 1, lights0.size()); rebuild(), "right": func(): state["emissive"] = posmod(li0 + 1, lights0.size()); rebuild()})
		cy.append({"label": "glow", "value": _glow_kind(), "left": func(): _set_glow_kind(_cycle(GLOW_KINDS, _glow_kind(), -1)), "right": func(): _set_glow_kind(_cycle(GLOW_KINDS, _glow_kind(), 1))})
	add_cyclers(cy)
	# the sprite's whole palette: one swatch row per material, the chosen one framed
	var swatches := []
	for name in used:
		var row := W.RampRow.new()
		row.init("", _ramp_of(name), func(_n): state["material"] = name; rebuild())
		row.on = name == m
		swatches.append(row)
	var rr := W.RampRack.new()
	rr.setup(swatches, app, 8)
	rr.custom_minimum_size = Vector2(0, 13)
	rows.add_child(rr)
	groups.append(rr)
	var k := _ramp_knobs(m)
	var controls := []
	var lh := W.Wheel.new()
	lh.init_wheel("hue", float(k.get("hue", 0)), 0.0, func(a): return "%+d" % int(round(a)), Callable(), func(a): _set_ramp_knob("hue", round(a)))
	var ll := W.Lever.new()
	ll.init("lightness", (float(k.get("light", 0)) + 0.3) / 0.6, 0.5, func(v): return "%+.2f" % (v * 0.6 - 0.3), Callable(), func(v): _set_ramp_knob("light", snappedf(v * 0.6 - 0.3, 0.02)))
	var lc := W.Lever.new()
	lc.init("contrast", (float(k.get("contrast", 1.0)) - 0.5), 0.5, func(v): return T.fmt(0.5 + v, 2), Callable(), func(v): _set_ramp_knob("contrast", snappedf(0.5 + v, 0.05)))
	var steps_now := _ramp_of(m).size()
	var ls := W.Lever.new()
	ls.init("steps", (float(k.get("steps", steps_now)) - 3.0) / 5.0, (float(_orig_ramp(m).size()) - 3.0) / 5.0, func(v): return "%d steps" % int(round(3 + v * 5)), Callable(), func(v): _set_ramp_knob("steps", round(3 + v * 5)))
	controls.append_array([lh, ll, lc, ls])
	# the emissives: the file's lights
	var lights: Array = doc.get("lights", [])
	var li := int(state["emissive"])
	if li >= lights.size():
		li = 0
		state["emissive"] = 0
	if not lights.is_empty():
		var L: Dictionary = lights[li]
		var lcw := W.Wheel.new()
		lcw.init_wheel("glow hue", Color(str(L.get("colour", "#7dff78"))).h * 360.0 - 180.0, 0.0, func(a): return _hue_name(a), Callable(), func(a): _set_light("colour", _hue_hex(a, Color(str(L.get("colour", "#7dff78"))))))
		var lst := W.Lever.new()
		lst.init("strength", clampf(float(L.get("strength", 1.0)) / 2.0, 0.0, 1.0), 0.5, func(v): return T.fmt(v * 2.0, 2), Callable(), func(v): _set_light("strength", snappedf(v * 2.0, 0.05)))
		var lpu := W.Lever.new()
		lpu.init("pulse", clampf(float(L.get("pulse", 0.0)), 0.0, 1.0), 0.0, func(v): return T.fmt(v, 2), Callable(), func(v): _set_light("pulse", snappedf(v, 0.05)))
		var lra := W.Lever.new()
		lra.init("radius", clampf(float(L.get("radius", 20)) / 60.0, 0.0, 1.0), 0.33, func(v): return "%d" % int(round(v * 60)), Callable(), func(v): _set_light("radius", round(v * 60)))
		controls.append_array([lcw, lst, lpu, lra])
	add_rack(controls, 8)
	var items := [{"label": "Randomise", "cb": _randomise_ramps}, {"label": "Champion", "cb": _save_champion}]
	add_choices(standard_choices(items, false))

func _used_materials() -> Array:
	var out := []
	for s in doc.get("shapes", []):
		var m := String(s.get("material", ""))
		if m != "" and not out.has(m):
			out.append(m)
	for e in doc.get("effects", []):
		var m := String(e.get("material", ""))
		if m != "" and not out.has(m):
			out.append(m)
	return out

## a material's ramp may name another material's ("ramp": "wood5"): follow the names through the file and the library
func _resolve_ramp(v, depth: int = 0) -> Array:
	if v is Array:
		return v
	if v is String and depth < 6:
		var mats: Dictionary = orig.get("materials", {})
		if mats.has(v) and mats[v] is Dictionary and mats[v].has("ramp"):
			return _resolve_ramp(mats[v]["ramp"], depth + 1)
		if library.has(v) and library[v] is Dictionary and library[v].has("ramp"):
			return _resolve_ramp(library[v]["ramp"], depth + 1)
	return ["#202020", "#404040", "#606060", "#808080", "#a0a0a0"]

func _orig_ramp(name: String) -> Array:
	var mats: Dictionary = orig.get("materials", {})
	if mats.has(name) and mats[name] is Dictionary and mats[name].has("ramp"):
		return _resolve_ramp(mats[name]["ramp"])
	if library.has(name) and library[name] is Dictionary and library[name].has("ramp"):
		return _resolve_ramp(library[name]["ramp"])
	return ["#202020", "#404040", "#606060", "#808080", "#a0a0a0"]

func _ramp_of(name: String) -> Array:
	var mats: Dictionary = doc.get("materials", {})
	if mats.has(name) and mats[name] is Dictionary and mats[name].has("ramp") and mats[name]["ramp"] is Array:
		return mats[name]["ramp"]
	return _orig_ramp(name)

func _ramp_knobs(name: String) -> Dictionary:
	return state.get("ramps", {}).get(name, {})

## a ramp knob: hue, lightness and contrast in OK-HSL on the imported ramp; steps resample it
func _set_ramp_knob(key: String, value: float) -> void:
	var m := String(state["material"])
	if m == "":
		return
	push_undo()
	if not state.has("ramps"):
		state["ramps"] = {}
	if not state["ramps"].has(m):
		state["ramps"][m] = {}
	state["ramps"][m][key] = value
	_apply_ramps()
	save_doc()
	_frames_dirty = true
	refresh_preview()
	rebuild()

func _apply_ramps() -> void:
	var ramps: Dictionary = state.get("ramps", {})
	if not doc.has("materials") or not (doc["materials"] is Dictionary):
		doc["materials"] = {}
	for m in ramps:
		var k: Dictionary = ramps[m]
		var base := _orig_ramp(m)
		var spec: Dictionary = {}
		var mats: Dictionary = orig.get("materials", {})
		if mats.has(m) and mats[m] is Dictionary:
			spec = mats[m].duplicate(true)
		elif library.has(m) and library[m] is Dictionary:
			spec = library[m].duplicate(true)
		var steps := int(k.get("steps", base.size()))
		var cols := _resample(base, steps)
		var out := []
		var mean := 0.0
		for c in cols:
			mean += Color(str(c)).ok_hsl_l
		mean /= maxi(cols.size(), 1)
		for c in cols:
			var col := Color(str(c))
			var h := col.ok_hsl_h
			var s := col.ok_hsl_s
			var l := col.ok_hsl_l
			h = fposmod(h + float(k.get("hue", 0)) / 360.0, 1.0)
			l = mean + (l - mean) * float(k.get("contrast", 1.0)) + float(k.get("light", 0.0))
			var nc := Color.from_ok_hsl(h, s, clampf(l, 0.0, 1.0), 1.0)
			out.append("#" + nc.to_html(false))
		spec["ramp"] = out
		doc["materials"][m] = spec

static func _resample(ramp: Array, n: int) -> Array:
	n = clampi(n, 2, 12)
	if ramp.size() == n:
		return ramp.duplicate()
	var out := []
	for i in n:
		var t := float(i) / maxi(n - 1, 1) * (ramp.size() - 1)
		var a := Color(str(ramp[int(floor(t))]))
		var b := Color(str(ramp[mini(int(ceil(t)), ramp.size() - 1)]))
		var f := t - floorf(t)
		var c := Color.from_ok_hsl(lerp_angle(a.ok_hsl_h * TAU, b.ok_hsl_h * TAU, f) / TAU, lerpf(a.ok_hsl_s, b.ok_hsl_s, f), lerpf(a.ok_hsl_l, b.ok_hsl_l, f), 1.0)
		out.append("#" + c.to_html(false))
	return out

func _set_light(key: String, value) -> void:
	var lights: Array = doc.get("lights", [])
	var li := int(state["emissive"])
	if li < 0 or li >= lights.size():
		return
	push_undo()
	lights[li][key] = value
	if not state.has("lights"):
		state["lights"] = {}
	state["lights"][str(li)] = lights[li].duplicate(true)
	save_doc()
	_frames_dirty = true
	refresh_preview()
	rebuild()

static func _hue_name(a: float) -> String:
	var h := fposmod(a + 180.0, 360.0)
	var names := ["red", "orange", "gold", "green", "green", "teal", "blue", "violet", "magenta", "red"]
	return names[clampi(int(h / 40.0), 0, names.size() - 1)]

static func _hue_hex(a: float, base: Color) -> String:
	var c := Color.from_hsv(fposmod(a + 180.0, 360.0) / 360.0, maxf(base.s, 0.4), maxf(base.v, 0.6), 1.0)
	return "#" + c.to_html(false)

## the glow kind of the selected light: the effect that rides the same bone, else "eyes"
func _glow_kind() -> String:
	var lights: Array = doc.get("lights", [])
	var li := int(state["emissive"])
	if li < 0 or li >= lights.size():
		return ""
	var L: Dictionary = lights[li]
	for e in doc.get("effects", []):
		if String(e.get("for", "")) == String(L.get("name", "")):
			for k in ENGINE_GLOWS:
				if ENGINE_GLOWS[k] == String(e.get("kind", "")):
					return k
	return "eyes"

## a glow has a shape: the kind becomes an effect of the engine's riding the light's bone at its place
func _set_glow_kind(kind: String) -> void:
	if kind == "crackle":
		app.say("Crackle is not in the engine yet; flame, orb, eyes, runes and embers are.")
		return
	var lights: Array = doc.get("lights", [])
	var li := int(state["emissive"])
	if li < 0 or li >= lights.size():
		return
	push_undo()
	var L: Dictionary = lights[li]
	var effects: Array = doc.get("effects", [])
	var kept := []
	for e in effects:
		if String(e.get("for", "")) != String(L.get("name", "")):
			kept.append(e)
	var engine := String(ENGINE_GLOWS.get(kind, ""))
	if engine != "":
		var mat := _emissive_material(str(L.get("colour", "#7dff78")))
		var e := {"name": String(L.get("name", "light")) + "_" + kind, "kind": engine, "material": mat, "for": String(L.get("name", "")),
			"bone": L.get("bone", "head"), "at": L.get("at", [0, 0, 0])}
		if engine == "motes":
			e["spread"] = 2.0; e["rate"] = 0.4; e["vy"] = [-0.4, -0.9]; e["life"] = [8, 14]; e["seed"] = 5
		kept.append(e)
	doc["effects"] = kept
	state["glow"] = kind
	save_doc()
	_frames_dirty = true
	refresh_preview()
	rebuild()

## an emissive material for a glow in the light's colour (made in the file when the library has none that fits)
func _emissive_material(colour: String) -> String:
	var name := "glow_" + colour.trim_prefix("#")
	if not doc.has("materials") or not (doc["materials"] is Dictionary):
		doc["materials"] = {}
	if not doc["materials"].has(name):
		var c := Color(colour)
		var ramp := []
		for i in 6:
			var l := lerpf(0.25, 0.98, i / 5.0)
			ramp.append("#" + Color.from_ok_hsl(c.ok_hsl_h, maxf(c.ok_hsl_s * (1.0 - i / 8.0), 0.1), l, 1.0).to_html(false))
		doc["materials"][name] = {"ramp": ramp, "emissive": true}
	return name

func _randomise_ramps() -> void:
	push_undo()
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	if not state.has("ramps"):
		state["ramps"] = {}
	for m in _used_materials():
		var k: Dictionary = state["ramps"].get(m, {})
		k["hue"] = float(k.get("hue", 0.0)) + rng.randf_range(-24.0, 24.0)
		k["light"] = clampf(float(k.get("light", 0.0)) + rng.randf_range(-0.06, 0.06), -0.3, 0.3)
		state["ramps"][m] = k
	_apply_ramps()
	save_doc()
	_frames_dirty = true
	refresh_preview()
	rebuild()
	app.say("A variant within the style; Undo takes it back.")

## a champion: the same model with these ramps saved as an alternate file beside it
func _save_champion() -> void:
	var out := char_dir().path_join("shapes").path_join(String(state["name"]) + "@champion.shapes.json")
	var d := doc.duplicate(true)
	d["name"] = String(doc.get("name", state["name"])) + "@champion"
	app.backend.write_json(out, d)
	app.say("Saved the champion recolour beside the model.")

## --- Motion
func _build_motion() -> void:
	var clip := String(state["clip"])
	var n := clip_frames.size()
	state_line("%s · motion · %s facing %s%s" % [String(state["title"]), clip, String(state["direction"]), (" · %d frames at %s a second" % [n, T.fmt(float(state.get("fps", 12.0)), 1)]) if n > 0 else ""])
	add_cyclers([
		{"label": "clip", "value": clip, "left": func(): _pick_clip(_cycle(CLIPS, clip, -1)), "right": func(): _pick_clip(_cycle(CLIPS, clip, 1))},
		{"label": "facing", "value": String(state["direction"]), "left": func(): _pick_direction(_cycle(DIRS, String(state["direction"]), -1)), "right": func(): _pick_direction(_cycle(DIRS, String(state["direction"]), 1))},
	])
	var mo: Dictionary = state.get("motion", {})
	var controls := []
	var ll := W.Lever.new()
	ll.init("lag", float(mo.get("lag", 2.0)) / 6.0, 2.0 / 6.0, func(v): return "%d frames" % int(round(v * 6)), Callable(), func(v): _set_motion("lag", round(v * 6)))
	var ls := W.Lever.new()
	ls.init("sway", float(mo.get("sway", 0.6)) / 1.5, 0.4, func(v): return T.fmt(v * 1.5, 2), Callable(), func(v): _set_motion("sway", snappedf(v * 1.5, 0.05)))
	var lh := W.Lever.new()
	lh.init("hang", float(mo.get("hang", 1.0)), 1.0, func(v): return T.fmt(v, 2), Callable(), func(v): _set_motion("hang", snappedf(v, 0.05)))
	var lt := W.Lever.new()
	lt.init("turn step", float(mo.get("turn_step", 5.0)) / 10.0, 0.5, func(v): return "%d deg" % int(round(v * 10)), Callable(), func(v): _set_motion("turn_step", round(v * 10)))
	var lm := W.Lever.new()
	lm.init("move step", float(mo.get("move_step", 1.5)) / 3.0, 0.5, func(v): return T.fmt(v * 3.0, 1) + " px", Callable(), func(v): _set_motion("move_step", snappedf(v * 3.0, 0.5)))
	var le := W.Lever.new()
	le.init("camera", (float(mo.get("elevation", float(doc.get("view", {}).get("elevation", 12)))) ) / 45.0, float(orig.get("view", {}).get("elevation", 12)) / 45.0, func(v): return "%d deg" % int(round(v * 45)), Callable(), func(v): _set_motion("elevation", round(v * 45)))
	controls.append_array([ll, ls, lh, lt, lm, le, direction_wheel(), scene_light_lever()])
	add_rack(controls, 8)
	var items := [{"label": "Pause" if app.scene.playing else "Play", "cb": func(): app.scene.playing = not app.scene.playing; rebuild()}, {"label": "Render clip", "cb": func(): _frames_dirty = true; show_clip(true)}]
	add_choices(standard_choices(items))

func _pick_clip(c) -> void:
	state["clip"] = String(c)
	_frames_dirty = false
	show_clip()
	rebuild()

func _pick_direction(d) -> void:
	state["direction"] = String(d)
	if tab in [3, 4]:
		_frames_dirty = false
		show_clip()
	else:
		refresh_preview()
	_rebuild_turned()

## the tab's words again after a turn, the selector staying on the facing control so the next press turns further
func _rebuild_turned() -> void:
	rebuild()
	refocus("facing")

## a motion lever: the lag of every loose part, its sway, the hang, the holds, the camera
func _set_motion(key: String, value: float) -> void:
	push_undo()
	if not state.has("motion"):
		state["motion"] = {}
	state["motion"][key] = value
	_apply_motion()
	save_doc()
	_frames_dirty = true
	show_clip(true)
	rebuild()

func _apply_motion() -> void:
	var mo: Dictionary = state.get("motion", {})
	var parts: Dictionary = orig.get("parts", {}).duplicate(true) if orig.get("parts") is Dictionary else {}
	for p in parts:
		if not (parts[p] is Dictionary):
			continue
		var spec: Dictionary = parts[p]
		if spec.has("lag") and spec["lag"] is Dictionary:
			if mo.has("lag"):
				spec["lag"]["frames"] = int(mo["lag"])
			if mo.has("sway"):
				spec["lag"]["sway"] = float(mo["sway"])
		if mo.has("hang") and spec.has("hang"):
			spec["hang"] = float(spec["hang"]) * float(mo["hang"])
	doc["parts"] = parts
	if not doc.has("view") or not (doc["view"] is Dictionary):
		doc["view"] = {}
	if mo.has("turn_step"):
		doc["view"]["turn_step"] = float(mo["turn_step"])
	if mo.has("move_step"):
		doc["view"]["move_step"] = float(mo["move_step"])
	if mo.has("elevation"):
		doc["view"]["elevation"] = float(mo["elevation"])

## --- Frames: the frame editor
func _build_frames() -> void:
	var clip := String(state["clip"])
	var key := "%s_%s" % [clip, String(state["direction"])]
	var shown := _apply_retime(clip_frames)
	var fi := clampi(frame_i, 0, maxi(shown.size() - 1, 0))
	frame_i = fi
	state_line("%s · frames · %s %s · frame %d of %d%s" % [String(state["title"]), clip, String(state["direction"]), fi + 1, shown.size(),
		"" if full_render else " (preview render)"])
	var tl := W.Timeline.new()
	tl.setup(shown, fi, app, func(i): frame_i = i; app.scene.playing = false; app.scene.set_frame(i))
	var r: Dictionary = retime.get(key, {})
	for k in r.get("hold", {}):
		tl.marks[int(k)] = "h"
	add_extra(tl)
	var fps := float(state.get("fps", 12.0))
	add_cyclers([
		{"label": "clip", "value": clip, "left": func(): _pick_clip(_cycle(CLIPS, clip, -1)), "right": func(): _pick_clip(_cycle(CLIPS, clip, 1))},
		{"label": "facing", "value": String(state["direction"]), "left": func(): _pick_direction(_cycle(DIRS, String(state["direction"]), -1)), "right": func(): _pick_direction(_cycle(DIRS, String(state["direction"]), 1))},
		{"label": "fps", "value": T.fmt(fps, 1), "left": func(): _set_fps(fps - 1.0), "right": func(): _set_fps(fps + 1.0), "set": func(t): _set_fps(float(t))},
		{"label": "onion skin", "value": "on" if state.get("onion", false) else "off", "left": func(): _set_onion(false), "right": func(): _set_onion(true)},
		{"label": "scene light", "value": ["off", "sprite only", "on"][app.scene.light_mode], "left": func(): _set_scene_light(app.scene.light_mode - 1), "right": func(): _set_scene_light(app.scene.light_mode + 1)},
	])
	var items := [
		{"label": "Pause" if app.scene.playing else "Play", "cb": func(): app.scene.playing = not app.scene.playing; rebuild()},
		{"label": "Step", "cb": func(): app.scene.playing = false; frame_i = (frame_i + 1) % maxi(shown.size(), 1); app.scene.set_frame(frame_i); rebuild()},
		{"label": "Hold", "cb": _hold_frame},
		{"label": "Delete", "cb": _delete_frame},
		{"label": "Mirror %s" % _mirror_of(String(state["direction"])), "cb": _mirror_direction},
		{"label": "Edit", "cb": _edit_frames},
		{"label": "Redo frame", "cb": func(): _frames_dirty = true; show_clip(true)},
	]
	add_choices(standard_choices(items, false))

func _set_fps(v: float) -> void:
	state["fps"] = clampf(snappedf(v, 0.5), 1.0, 30.0)
	app.scene.frame_fps = float(state["fps"])
	rebuild()

func _set_onion(on: bool) -> void:
	state["onion"] = on
	app.scene.onion = on
	rebuild()

func _set_scene_light(m: int) -> void:
	app.scene.set_light_mode(clampi(m, 0, 2))
	app.cfg["light"] = app.scene.light_mode
	app.save_cfg()
	rebuild()

func _retime_entry() -> Dictionary:
	var key := "%s_%s" % [String(state["clip"]), String(state["direction"])]
	if not retime.has(key):
		retime[key] = {"hold": {}, "deleted": []}
	return retime[key]

func _hold_frame() -> void:
	push_undo()
	var r := _retime_entry()
	var src := _source_index(frame_i)
	r["hold"][str(src)] = int(r["hold"].get(str(src), 1)) + 1
	_save_retime()

func _delete_frame() -> void:
	push_undo()
	var r := _retime_entry()
	var src := _source_index(frame_i)
	if not r["deleted"].has(src):
		r["deleted"].append(src)
	_save_retime()

## the rendered frame behind a shown frame (holds repeat frames, deletions skip them)
func _source_index(shown_i: int) -> int:
	var key := "%s_%s" % [String(state["clip"]), String(state["direction"])]
	var r: Dictionary = retime.get(key, {})
	var deleted: Array = r.get("deleted", [])
	var holds: Dictionary = r.get("hold", {})
	var k := 0
	for i in clip_frames.size():
		if i in deleted:
			continue
		var n := int(holds.get(str(i), 1))
		if shown_i < k + n:
			return i
		k += n
	return clampi(shown_i, 0, maxi(clip_frames.size() - 1, 0))

func _save_retime() -> void:
	app.backend.write_json(char_dir().path_join("frames").path_join("retime.json"), retime)
	_load_clip(String(state.get("frames_dir", previews_dir().path_join("frames").path_join("%s_%s" % [String(state["clip"]), String(state["direction"])]))), float(state.get("fps", 12.0)))
	rebuild()

static func _mirror_of(d: String) -> String:
	return {"E": "W", "W": "E", "NE": "NW", "NW": "NE", "SE": "SW", "SW": "SE", "N": "N", "S": "S"}[d]

## a mirrored direction: the frames of the opposite side flipped, written as this direction's preview frames
func _mirror_direction() -> void:
	var d := String(state["direction"])
	var other := _mirror_of(d)
	if other == d:
		app.say("S and N have no mirror.")
		return
	var clip := String(state["clip"])
	var src := previews_dir().path_join("frames").path_join("%s_%s" % [clip, other])
	if full_render:
		src = char_dir().path_join("frames").path_join("%s_%s" % [clip, other])
	if not DirAccess.dir_exists_absolute(src):
		app.say("Render %s %s first; its frames are what gets mirrored." % [clip, other])
		return
	push_undo()
	var dst := src.get_base_dir().path_join("%s_%s" % [clip, d])
	DirAccess.make_dir_recursive_absolute(dst)
	var da := DirAccess.open(src)
	for f: String in da.get_files():
		if f.begins_with("frame_") and f.ends_with(".png"):
			var img := Image.load_from_file(src.path_join(f))
			if img:
				img.flip_x()
				img.save_png(dst.path_join(f))
	_frames_dirty = false
	show_clip()
	app.say("%s %s is now %s mirrored." % [clip, d, other])

## the editor on this clip and direction (the frame set the engine rendered); Esc comes back to this tab
func _edit_frames() -> void:
	var dir := String(state.get("frames_dir", ""))
	if dir == "" or not DirAccess.dir_exists_absolute(dir):
		app.say("Render the clip first; the editor works on its frames.")
		return
	args = {"character": String(state["name"]), "tab": "Frames", "clip": String(state["clip"]), "direction": String(state["direction"])}
	app.go("editor", {"frames": dir.get_base_dir(), "clip": String(state["clip"]), "direction": String(state["direction"]), "frame": str(_source_index(frame_i)),
		"reference": String(state.get("painting", "")), "name": String(state["name"]), "title": String(state["title"]), "export": char_dir().path_join("export_game")})

## --- Export
func _build_export() -> void:
	var exported := String(state.get("exported", ""))
	var line := "%s · export · %s" % [String(state["title"]), ("sheets written%s" % (", in the game" if state.get("in_game", false) else "")) if exported != "" else ("the full set is rendered; the sheets can be written" if full_render else "Render all first, then the sheets")]
	state_line(line)
	dim_line("The in-game shot is in the picture window." if (state.get("shot", "") != "" and FileAccess.file_exists(String(state["shot"]))) else "Put it in the game copies the sheets into the game's art; See it opens the game.")
	add_cyclers([
		{"label": "facing", "value": String(state["direction"]), "left": func(): _pick_direction(_cycle(DIRS, String(state["direction"]), -1)), "right": func(): _pick_direction(_cycle(DIRS, String(state["direction"]), 1))},
		{"label": "scene light", "value": ["off", "sprite only", "on"][app.scene.light_mode], "left": func(): _set_scene_light(app.scene.light_mode - 1), "right": func(): _set_scene_light(app.scene.light_mode + 1)},
	])
	add_spacer()
	var items := [
		{"label": "Export sheets", "cb": _export_sheets},
		{"label": "Put it in the game", "cb": _put_in_game},
		{"label": "See it in the game", "cb": _see_in_game},
		{"label": "Take it out", "cb": _take_out},
	]
	add_choices(standard_choices(items))

func _export_sheets(then: Callable = Callable()) -> void:
	if not full_render:
		app.say("Render all first.")
		return
	var out := char_dir().path_join("export_game")
	run(["project", "export-game", String(state["name"]), "--kind", String(state["name"]), "--name", String(state["title"]), "--out", out, "-p", app.backend.project_dir], "writing the sheets", func(r: Dictionary):
		if not r.get("ok", false):
			return
		state["exported"] = out
		app.remember_last("characters", {"title": String(state["title"]), "note": "sheets written", "frames_dir": String(state.get("frames_dir", "")), "fps": state.get("fps", 12.0),
			"ground_y": state.get("ground_y", 0.0), "axis_x": state.get("axis_x", 0.0), "lights": state.get("last_lights", [])})
		rebuild()
		if then.is_valid():
			then.call())

## into the game's art/sprites, with the files it replaces kept beside the project for "Take it out of the game"
func _put_in_game() -> void:
	if not app.backend.game_ok():
		app.say("No game folder is set; see Settings.")
		return
	if not full_render:
		app.say("Render all first.")
		return
	var sprites := app.game_art("sprites")
	var kind := String(state["name"])
	var backup := char_dir().path_join("game_backup")
	for ext in [".png", ".json"]:
		var f := sprites.path_join(kind + ext)
		if FileAccess.file_exists(f):
			app.backend.copy_file(f, backup.path_join(kind + ext))
	run(["project", "export-game", kind, "--kind", kind, "--name", String(state["title"]), "--out", sprites, "-p", app.backend.project_dir], "putting it in the game", func(r: Dictionary):
		if not r.get("ok", false):
			return
		state["in_game"] = true
		state["exported"] = sprites
		app.remember_last("characters", {"title": String(state["title"]), "note": "in the game", "frames_dir": String(state.get("frames_dir", "")), "fps": state.get("fps", 12.0),
			"ground_y": state.get("ground_y", 0.0), "axis_x": state.get("axis_x", 0.0), "lights": state.get("last_lights", [])})
		run(["game-preview", "--import", "--game", app.backend.game_dir, "--godot", app.backend.godot], "the game reads its new files", func(_r2):
			rebuild()))

func _see_in_game() -> void:
	if not app.backend.game_ok():
		app.say("No game folder is set; see Settings.")
		return
	var kind := String(state["name"])
	if args.has("shot_in_game") or app.args.has("script"):
		var shot := previews_dir().path_join("in_game.png")
		run(["game-preview", "--skin", kind, "--shot", shot, "--shot-t", "6", "--game", app.backend.game_dir, "--godot", app.backend.godot], "the game takes a look", func(r: Dictionary):
			if r.get("ok", false) and FileAccess.file_exists(shot):
				state["shot"] = shot
				app.scene.show_picture(tex(shot), "in the game")
				rebuild())
	else:
		app.backend.run(["game-preview", "--skin", kind, "--game", app.backend.game_dir, "--godot", app.backend.godot], "the game opens", Callable())
		app.say("The game is opening with %s on the moor." % String(state["title"]))

func _take_out() -> void:
	var sprites := app.game_art("sprites")
	var kind := String(state["name"])
	var backup := char_dir().path_join("game_backup")
	var restored := 0
	for ext in [".png", ".json"]:
		var b := backup.path_join(kind + ext)
		if FileAccess.file_exists(b):
			app.backend.copy_file(b, sprites.path_join(kind + ext))
			restored += 1
		elif FileAccess.file_exists(sprites.path_join(kind + ext)):
			DirAccess.remove_absolute(sprites.path_join(kind + ext))
	state["in_game"] = false
	app.say("Taken out of the game%s." % (": the earlier files are back" if restored > 0 else ""))
	rebuild()

# ------------------------------------------------------------------ the standard actions
func keep() -> void:
	if not has_model():
		return
	save_doc()
	match tab:
		4:
			_materialise_retime()
		5:
			_export_sheets()
		_:
			app.remember_last("characters", {"title": String(state["title"]), "note": "kept", "png": previews_dir().path_join("still_%s.png" % String(state["direction"])),
				"anchor": state.get("last_anchor", []), "lights": state.get("last_lights", [])})
			app.say("Kept.")

## the Frames tab's holds and deletions written into the frame folder (renumbered files), so the export sees them
func _materialise_retime() -> void:
	var key := "%s_%s" % [String(state["clip"]), String(state["direction"])]
	var r: Dictionary = retime.get(key, {})
	if r.is_empty() or (r.get("hold", {}).is_empty() and r.get("deleted", []).is_empty()):
		app.say("No frame edits to keep.")
		return
	var dir := String(state.get("frames_dir", ""))
	var da := DirAccess.open(dir)
	if da == null:
		return
	var imgs := []
	for f in da.get_files():
		if f.begins_with("frame_") and f.ends_with(".png") and not f.contains(".parts."):
			imgs.append(f)
	imgs.sort()
	var out := []
	var deleted: Array = r.get("deleted", [])
	var holds: Dictionary = r.get("hold", {})
	for i in imgs.size():
		if i in deleted:
			continue
		var img := Image.load_from_file(dir.path_join(imgs[i]))
		for k in maxi(int(holds.get(str(i), 1)), 1):
			out.append(img)
	for f in imgs:
		DirAccess.remove_absolute(dir.path_join(f))
	for i in out.size():
		out[i].save_png(dir.path_join("frame_%03d.png" % i))
	retime.erase(key)
	_save_retime()
	app.say("Frame edits written into the clip.")

func render_all() -> void:
	if not has_model():
		return
	save_doc()
	run(["project", "render-shapes", String(state["name"]), "--style", app.style_name, "-p", app.backend.project_dir], "rendering every clip in every direction", func(r: Dictionary):
		if not r.get("ok", false):
			return
		full_render = true
		_frames_dirty = false
		retime = {}
		app.remember_last("characters", {"title": String(state["title"]), "note": "rendered in full", "frames_dir": char_dir().path_join("frames").path_join("idle_S"),
			"fps": r.get("fps", {}).get("idle", 12.0), "ground_y": state.get("ground_y", 0.0), "axis_x": state.get("axis_x", 0.0), "lights": state.get("last_lights", [])})
		show_clip()
		rebuild())

func reset() -> void:
	if not has_model():
		return
	push_undo()
	match tab:
		1:
			state.erase("edits")
			_apply_edits()
		2:
			state.erase("ramps")
			state.erase("lights")
			doc["materials"] = orig.get("materials", {}).duplicate(true)
			doc["lights"] = orig.get("lights", []).duplicate(true)
			doc["effects"] = orig.get("effects", []).duplicate(true)
		3:
			state.erase("motion")
			doc["parts"] = orig.get("parts", {}).duplicate(true)
			doc["view"] = orig.get("view", {}).duplicate(true)
		4:
			retime.erase("%s_%s" % [String(state["clip"]), String(state["direction"])])
			_save_retime()
	save_doc()
	_frames_dirty = true
	rebuild()
	if tab in [3, 4]:
		show_clip(true)
	else:
		refresh_preview()
	app.audio.blip("clunk")

func start_over_question() -> String:
	return "Start %s over? Every render, frame edit and sheet is thrown away; the model file as it was imported is kept." % String(state["title"])

func do_start_over() -> void:
	if not has_model():
		return
	run(["project", "reset", String(state["name"]), "-p", app.backend.project_dir], "starting over", func(_r):
		var pv := previews_dir()
		var da := DirAccess.open(pv)
		if da:
			for f in da.get_files():
				DirAccess.remove_absolute(pv.path_join(f))
		var fd := pv.path_join("frames")
		if DirAccess.dir_exists_absolute(fd):
			_rm_tree(fd)
		doc = orig.duplicate(true)
		save_doc()
		state["exported"] = ""
		state["in_game"] = false
		state.erase("edits"); state.erase("ramps"); state.erase("lights"); state.erase("motion")
		retime = {}
		full_render = false
		clip_frames = []
		_frames_dirty = true
		undo_stack = []
		redo_stack = []
		rebuild()
		refresh_preview(), false)

static func _rm_tree(path: String) -> void:
	var d := DirAccess.open(path)
	if d == null:
		return
	for f in d.get_files():
		DirAccess.remove_absolute(path.path_join(f))
	for sub in d.get_directories():
		_rm_tree(path.path_join(sub))
	DirAccess.remove_absolute(path)

func on_state_restored() -> void:
	if not has_model():
		return
	_apply_edits()
	_apply_ramps()
	_apply_motion()
	var lights: Dictionary = state.get("lights", {})
	for k in lights:
		var i := int(k)
		if i >= 0 and i < doc.get("lights", []).size():
			doc["lights"][i] = lights[k].duplicate(true)
	save_doc()
	_frames_dirty = true
	if tab in [3, 4]:
		show_clip(true)
	else:
		refresh_preview()

## a model file is imported; a picture is the reference and Claude draws against it
func on_drop(paths: PackedStringArray) -> void:
	if paths.is_empty():
		return
	var pics: PackedStringArray = []
	for p in paths:
		if p.ends_with(".json"):
			import_model(p)
			return
		if p.get_extension().to_lower() in IMAGE_EXTS:
			pics.append(p)
	if pics.is_empty():
		app.say("That is not a picture the Forge can read (PNG, JPG or WEBP), nor a shape model (.shapes.json).")
		return
	start_from_pictures(pics)

func can_leave() -> bool:
	return true
