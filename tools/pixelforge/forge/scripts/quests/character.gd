extends "res://scripts/quest.gd"
## Make a character: drop a painting; the Forge cuts it out, locks the colours, builds the figure, gives it its
## moves, films it from 8 directions, turns the film into pixels and packs it; then a preview with a direction
## dial, and "Put it in the game".

const STEPS := ["Painting", "Cut out", "Colours", "Build", "Moves", "Film", "Pixels", "Pack", "Preview", "In the game"]
const CLI_STEP := {1: "split", 2: "palette", 3: "model", 4: "rig", 5: "render", 6: "pixelate", 7: "export"}
const DONE_KEY := {1: "split", 2: "palette", 3: "model", 4: "rig", 5: "render", 6: "pixelate", 7: "export"}
const DIRS := ["S", "SW", "W", "NW", "N", "NE", "E", "SE"]
const DIR_WORDS := {"S": "towards you", "SW": "down-left", "W": "left", "NW": "up-left", "N": "away", "NE": "up-right", "E": "right", "SE": "down-right"}
const CLIPS := ["idle", "walk", "run", "attack", "cast", "hit", "death", "roll"]

var cname := ""
var status := {}
var player: Control = null
var clip := "walk"
var dir := "S"
var quick := false        # the no-3D road (a still sprite with a procedural idle)

func _init() -> void:
	quest_title = "Make a character"
	steps = STEPS

func begin() -> void:
	if args.has("drop"):
		state["painting"] = String(args["drop"])
	if args.has("character"):
		cname = String(args["character"])
		_load_status(func():
			_position_from_status()
			if args.has("step"):
				step = int(args["step"])
			show_step())

func char_dir() -> String:
	return app.backend.project_dir.path_join("characters").path_join(cname)

func _load_status(cb: Callable) -> void:
	if not app.backend.project_exists():
		cb.call()
		return
	run(["project", "status", "--project", app.backend.project_dir], "status", func(r: Dictionary):
		status = r
		cb.call())

func _position_from_status() -> void:
	done.clear()
	var chars: Dictionary = status.get("characters", {})
	if not chars.has(cname):
		return
	var dn: Array = chars[cname].get("done", [])
	if "import" in dn:
		mark_done(0)
	for i in DONE_KEY:
		if DONE_KEY[i] in dn:
			mark_done(i)
	var notes: Dictionary = chars[cname].get("notes", {})
	if notes.has("export_game"):
		mark_done(7)
	if chars[cname].get("sources", {}).has("style") and not ("split" in dn):
		quick = true
	# stand on the first step not done; past Pack, the preview
	step = 8 if is_done(7) else 1
	for i in range(1, 8):
		if not is_done(i):
			step = i
			break

# ------------------------------------------------------------------ the steps
func build_step(i: int) -> void:
	match i:
		0: _painting()
		1, 2, 3, 4, 5, 6, 7: _auto_step(i)
		8: _preview()
		9: _in_game()

func _painting() -> void:
	picture(W.drop_zone("Drop your painting here", "Choose a painting", func(): app.choose_file(PackedStringArray(["*.png, *.jpg, *.jpeg, *.webp ; Pictures"]), _dropped)))
	headline("Start with a painting")
	words("A turnaround sheet works best: the same figure from the front, the side and the back on one plain background. A single front view works too.")
	prompt_card()
	next_line("the Forge cuts the figure out, locks its colours, builds it, films it from 8 directions and makes it pixels. Nothing to set up.")
	var chars: Dictionary = status.get("characters", {})
	if chars.is_empty() and app.backend.project_exists() and status.is_empty():
		_load_status(func(): if step == 0: show_step())
	if not chars.is_empty():
		words("Or continue one already begun:", "Small")
		var r := W.row(4)
		for k in chars:
			r.add_child(W.chip(W.pretty(k), false, func(): cname = k; _position_from_status(); show_step()))
		right.add_child(r)
	advanced([
		{"key": "name", "label": "Name", "type": "text", "default": "", "hint": "blank = the file's name"},
		{"key": "describe", "label": "One line about it", "type": "text", "default": ""},
		{"key": "source_kind", "label": "Sheet or single view", "type": "choice", "default": "auto", "choices": ["auto", "sheet", "front"]},
	])
	if state.has("painting") and not state.get("started", false):
		state["started"] = true
		call_deferred("_dropped", state["painting"])

func on_drop(paths: PackedStringArray) -> void:
	if step == 0 and not paths.is_empty():
		_dropped(paths[0])

func _dropped(path: String) -> void:
	state["painting"] = path
	var img := Image.load_from_file(path)
	if img == null:
		app.say("That is not a picture the Forge can read.")
		return
	picture(W.picture(ImageTexture.create_from_image(img)))
	var kind := String(adv.get("source_kind", "auto"))
	if kind == "auto":
		kind = "sheet" if img.get_width() >= img.get_height() * 1.3 else "front"
	var want := String(adv.get("name", "")).strip_edges()
	cname = W.slug(want if want != "" else path.get_file().get_basename())
	ensure_project(func(): _load_status(func():
		var chars: Dictionary = status.get("characters", {})
		var base := cname
		var n := 2
		while chars.has(cname):
			cname = "%s_%d" % [base, n]
			n += 1
		var describe := String(adv.get("describe", "")).strip_edges()
		run(["project", "add", cname, "--project", app.backend.project_dir] + (["--describe", describe] if describe != "" else []), "add", func(_r):
			run(["project", "import", cname, kind, path, "--project", app.backend.project_dir], "import", func(_r2):
				mark_done(0)
				chain = true
				done = [0]
				go_step(1)))))

## the automatic steps: run on arrival (when chaining), show the result, carry on
func _auto_step(i: int) -> void:
	var cli: String = CLI_STEP[i]
	var titles := {1: "Cutting the figure out", 2: "Locking the colours", 3: "Building the figure", 4: "Giving it its moves", 5: "Filming from 8 directions", 6: "Pressing the film to pixels", 7: "Packing the game files"}
	var what := {
		1: "The figures on the painting are found, cut from the background and lined up at one height.",
		2: "Every colour in the painting is kept (the game's style), so the pixels match the paint.",
		3: "A 3D figure is carved from the cutouts and the painting is projected onto it. Blender does this part.",
		4: "A skeleton goes in and the library's moves are fitted: idle, walk, run, attack, cast, hit, death, roll.",
		5: "A camera 30 degrees above the ground films every move from 8 directions. This is the slow part: ten minutes or more on a laptop.",
		6: "Each film frame is pressed to the game's pixel grid with the locked colours.",
		7: "The frames are packed into the sheet and the list the game reads.",
	}
	var nexts := {1: "the colours are locked", 2: "the 3D figure is built", 3: "it gets its moves", 4: "it is filmed from 8 directions", 5: "the film becomes pixels", 6: "the files are packed", 7: "you see it walk in every direction"}
	var done_titles := {1: "The figure is cut out", 2: "The colours are locked", 3: "The figure is built", 4: "It has its moves", 5: "It is filmed", 6: "It is pixels", 7: "The game files are packed"}
	headline(titles[i] if not is_done(i) else done_titles[i])
	words(what[i])
	_step_picture(i)
	next_line(nexts[i])
	if is_done(i):
		var cont := big("Continue", func(): advance())
		var again := W.ghost("Do this step again", func(): done.erase(i); chain = false; show_step())
		right.add_child(again)
		cont.grab_focus()
	else:
		big(titles[i].split(" ")[0] + " now", func(): _run_step(i))   # "Working…" while it runs (quest.run), its own words after
		if chain:
			var pause := W.ghost("Pause after this step", func(): chain = false; app.say("The Forge will pause after this step."))
			right.add_child(pause)
	_step_advanced(i)
	if chain and not is_done(i) and not working:
		call_deferred("_run_step", i)

func _step_picture(i: int) -> void:
	var views := char_dir().path_join("views")
	match i:
		1, 2:
			var r := W.row(4)
			r.alignment = BoxContainer.ALIGNMENT_CENTER
			var any := false
			for v in ["front", "side", "back", "quarter"]:
				var t := FT.tex(views.path_join(v + ".png"), false)
				if t:
					any = true
					var p := W.picture(t)
					r.add_child(p)
			if i == 2:
				var pal := FT.tex(char_dir().path_join("palette.png"), false)
				if pal:
					var col := W.col(4)
					col.add_child(r)
					var pp := W.picture(pal)
					pp.custom_minimum_size = Vector2(0, 40)
					pp.size_flags_vertical = Control.SIZE_SHRINK_END
					col.add_child(pp)
					picture(col)
					return
			if any:
				picture(r)
			else:
				picture_file(state.get("painting", ""))
		3, 4:
			var hull := char_dir().path_join("model").path_join(cname + "_hull.png")
			if FileAccess.file_exists(hull):
				picture_file(hull)
			else:
				_step_picture(1)
		5:
			var f := char_dir().path_join("renders").path_join("walk").path_join("S")
			if DirAccess.dir_exists_absolute(f):
				var fp := W.frames_player()
				fp.load_dir(f, 12.0)
				picture(fp)
			else:
				_step_picture(3)
		6, 7:
			var f := char_dir().path_join("frames").path_join("walk_S")
			if DirAccess.dir_exists_absolute(f):
				var fp := W.frames_player()
				fp.load_dir(f, _fps("walk"))
				picture(fp)
			else:
				_step_picture(5)

func _fps(c: String) -> float:
	var f := FileAccess.open(char_dir().path_join("frames").path_join("animations.json"), FileAccess.READ)
	if f:
		var d = JSON.parse_string(f.get_as_text())
		if d is Dictionary:
			return float(d.get("clip_fps", {}).get(c, d.get("fps", 8.0)))
	return 8.0

func _step_advanced(i: int) -> void:
	match i:
		1: advanced([
			{"key": "tolerance", "label": "Background tolerance", "type": "float", "default": 0.08, "hint": "higher removes more background"},
			{"key": "views", "label": "Figures on the sheet", "type": "choice", "default": "auto", "choices": ["auto", "3", "4"]}])
		2: advanced([{"key": "colors", "label": "Colours to keep", "type": "int", "default": 0, "hint": "0 = every colour (the game's style)"}])
		3: advanced([
			{"key": "model_mode", "label": "Body", "type": "choice", "default": "auto", "choices": ["auto", "template", "hull"], "hint": "template = fit the human figure; hull = carve only"},
			{"key": "height", "label": "Height (m)", "type": "float", "default": 1.8}])
		4: advanced([{"key": "clips", "label": "Moves", "type": "text", "default": "idle,walk,run,attack,punch,cast,hit,death,roll"}])
		5: advanced([
			{"key": "per_clip", "label": "Frames a move", "type": "int", "default": 24, "hint": "12 is quicker and choppier"},
			{"key": "elevation", "label": "Camera angle", "type": "float", "default": 30.0, "hint": "30 is the game's"},
			{"key": "passes", "label": "Light maps", "type": "choice", "default": "color", "choices": ["color", "color,normal,depth"], "labels": ["none", "normal and depth"], "hint": "they let the lantern light the sprite (slower)"},
			{"key": "actions", "label": "Only these moves", "type": "text", "default": "", "hint": "blank = all"}])
		6: advanced([{"key": "outline", "label": "Outline", "type": "choice", "default": "auto", "choices": ["auto", "none"]}])
		7: advanced([
			{"key": "kind", "label": "Name in the game", "type": "text", "default": "", "hint": "blank = the character's name"},
			{"key": "display", "label": "Shown as", "type": "text", "default": ""},
			{"key": "category", "label": "Category", "type": "choice", "default": "hero", "choices": ["hero", "monster", "npc"]}])

func _run_step(i: int) -> void:
	if working:
		return
	var cli: Array = ["project"]
	var p := ["--project", app.backend.project_dir]
	match i:
		1:
			cli += ["run", cname, "split"] + flag("tolerance", "--tolerance", 0.08)
			if str(adv.get("views", "auto")) != "auto":
				cli += ["--views", str(adv["views"])]
		2:
			cli += ["run", cname, "palette"] + flag("colors", "--colors", 0)
		3:
			cli += ["run", cname, "model"] + flag("model_mode", "--model-mode", "auto") + flag("height", "--height", 1.8)
		4:
			cli += ["run", cname, "rig"] + flag("clips", "--clips", "idle,walk,run,attack,punch,cast,hit,death,roll")
		5:
			cli += ["run", cname, "render"] + flag("per_clip", "--per-clip", 24) + flag("elevation", "--elevation", 30.0) + flag("passes", "--passes", "color") + flag("actions", "--actions", "")
		6:
			cli += ["run", cname, "pixelate"]
			if str(adv.get("outline", "auto")) == "none":
				cli += ["--outline", "none"]
		7:
			cli += ["export-game", cname, "--kind", _kind()] + flag("display", "--name", "") + flag("category", "--category", "hero")
	run(cli + p, STEPS[i], func(r: Dictionary):
		mark_done(i)
		if r.has("check") and not r["check"].get("ok", true):
			var issues: Array = r["check"].get("issues", [])
			if not issues.is_empty():
				app.say("Noted: " + String(issues[0]), 5.0)
		if chain and i < 7:
			await get_tree().create_timer(0.5).timeout
			if step == i and chain:
				go_step(i + 1)
		elif i == 7:
			chain = false
			go_step(8)
		else:
			show_step())

func _kind() -> String:
	var k := String(adv.get("kind", "")).strip_edges()
	return W.slug(k) if k != "" else cname

func retry() -> void:
	if step >= 1 and step <= 7:
		chain = true
		_run_step(step)
	else:
		show_step()

## the stopped-at-Blender card gets a second road: a still sprite, no 3D
func fail(r: Dictionary) -> void:
	super.fail(r)
	var msg := String(r.get("error", ""))
	if "Blender" in msg and step == 3:
		var q := W.button("No 3D for now: make a still sprite that breathes", "", func(): _quick())
		right.add_child(q)

func _quick() -> void:
	quick = true
	run(["project", "still", cname, "--view", "front", "--animate", "idle", "--export", "--project", app.backend.project_dir], "quick sprite", func(_r):
		for i in range(1, 8):
			mark_done(i)
		go_step(8))

# ------------------------------------------------------------------ the preview with its dial
func _preview() -> void:
	headline(W.pretty(cname) + " walks")
	words("Turn the dial to see every direction; pick a move below. This is what the game will show.")
	player = W.frames_player()
	var box := W.col(2)
	box.add_child(player)
	var dial := W.row(2)
	dial.alignment = BoxContainer.ALIGNMENT_CENTER
	var order := ["W", "NW", "N", "NE", "E", "SE", "S", "SW"]
	for d in order:
		var b := W.chip(d, d == dir, func(): dir = d; _load_clip(); _refresh_dial(dial, order))
		b.tooltip_text = "faces " + DIR_WORDS[d]
		dial.add_child(b)
	box.add_child(dial)
	picture(box)
	var clips := W.row(2)
	var avail := _clips()
	for c in avail:
		clips.add_child(W.chip(W.pretty(c), c == clip, func(): clip = c; _load_clip(); for k in clips.get_children(): k.theme_type_variation = "ChipOn" if k.text == W.pretty(c) else "Chip"))
	right.add_child(clips)
	_load_clip()
	next_line("it goes into the game's art, and you see it on the moor.")
	big("Put it in the game", func(): go_step(9))
	if args.has("autoput") and not state.get("auto_went", false):
		state["auto_went"] = true
		call_deferred("go_step", 9)
	buttons([W.ghost("Save a GIF of this", func():
		run(["project", "preview-gif", cname, "--clip", clip, "--dir", dir, "--project", app.backend.project_dir], "gif", func(r):
			app.say("GIF saved in the project's previews folder.", 4.0)))])

func _refresh_dial(dial: HBoxContainer, order: Array) -> void:
	for k in dial.get_child_count():
		dial.get_child(k).theme_type_variation = "ChipOn" if order[k] == dir else "Chip"

func _clips() -> Array:
	var out := []
	var frames := char_dir().path_join("frames")
	var d := DirAccess.open(frames)
	if d:
		for sub in d.get_directories():
			var c := sub.rsplit("_", true, 1)[0]
			if not c in out:
				out.append(c)
	if out.is_empty():
		var a := DirAccess.open(char_dir().path_join("anim"))
		if a:
			for sub in a.get_directories():
				out.append("still:" + sub)
	out.sort_custom(func(a, b): return CLIPS.find(a) < CLIPS.find(b) if CLIPS.has(a) and CLIPS.has(b) else a < b)
	if not out.is_empty() and not clip in out:
		clip = out[0]
	return out

func _load_clip() -> void:
	if player == null:
		return
	if clip.begins_with("still:"):
		player.load_dir(char_dir().path_join("anim").path_join(clip.substr(6)), 8.0)
		return
	var n: int = player.load_dir(char_dir().path_join("frames").path_join(clip + "_" + dir), _fps(clip))
	if n == 0:
		app.say("No frames for that move yet.")

# ------------------------------------------------------------------ in the game
func _in_game() -> void:
	if game_card():
		return
	if not state.get("in_game", false):
		_step_picture(6)
		headline("Put " + W.pretty(cname) + " in the game")
		words("The packed files go into the game's sprites, and the game is told to look. Then you can see it walk on the moor.")
		next_line("the game opens with your character as the hero.")
		big("Put it in the game", func():
			run(["project", "export-game", cname, "--kind", _kind(), "--out", app.backend.game_dir.path_join("art").path_join("sprites"), "--project", app.backend.project_dir] + flag("display", "--name", "") + flag("category", "--category", "hero"),
				"put in the game", func(_r): import_game(func(): state["in_game"] = true; show_step())))
		if args.has("autoput") and not state.get("auto_put", false):
			state["auto_put"] = true
			call_deferred("_auto_press")
		return
	_step_picture(6)
	in_game_step(W.pretty(cname) + " is in the game's art as \"" + _kind() + "\".", ["--skin", _kind()], _kind())
