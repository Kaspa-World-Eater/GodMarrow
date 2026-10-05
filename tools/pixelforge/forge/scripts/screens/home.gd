extends "res://scripts/screen.gd"
## Home: the narrative line, the nine choices with the selector, the describe line. The picture window shows the
## last thing made, standing in the chosen ground. A painting or a model file dropped anywhere opens the matching
## workbench with it.

const CHOICES := [
	["Characters", "characters"], ["Creatures", "creatures"], ["Objects", "objects"],
	["Effects", "effects"], ["Tiles and ground", "tiles"], ["Interface", "interface"],
	["Sound", "sound"], ["Music", "music"], ["Settings", "settings"],
]
var describe: LineEdit
var reading := false

func build() -> void:
	hint_text = "drop a painting anywhere"
	rebuild()
	_show_last()

func build_tab(_i: int) -> void:
	var last: Dictionary = app.cfg.get("last", {})
	var line := "The forge is lit."
	if last.has("info"):
		var info: Dictionary = last["info"]
		line = "The forge is lit. On the bench: %s, %s." % [String(info.get("title", "the last thing made")), String(info.get("note", "finished")).to_lower()]
	elif not app.backend.python_ok():
		line = "The forge is lit, but Python was not found: run install.bat once, or set it in Settings."
	else:
		line = "The forge is lit. The bench is clear: pick what to make, drop a painting, or describe it below."
	state_line(line, "", 2)
	add_spacer()
	var items := []
	for c in CHOICES:
		items.append({"label": c[0], "cb": app.go.bind(c[1])})
	add_choices(items, 3)
	add_choices([{"label": "Exit", "cb": func(): app.request_exit()}])
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 6)
	row.custom_minimum_size = Vector2(0, 18)
	var l := Label.new()
	l.text = "or describe it:"
	l.theme_type_variation = "Dim"
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(l)
	describe = LineEdit.new()
	describe.placeholder_text = "a hooded necromancer with a skull-topped staff burning green"
	describe.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	describe.text_submitted.connect(func(_t): _describe())
	describe.focus_entered.connect(func(): app.say_hint("Enter drafts it and opens its workbench; Esc leaves the line"))
	describe.focus_exited.connect(func(): app.set_hint(hint_text))
	row.add_child(describe)
	rows.add_child(row)
	if args.has("describe"):
		describe.text = String(args["describe"])
		if args.has("go"):
			call_deferred("_describe")

func on_key(ev: InputEvent) -> bool:
	# the describe line takes typing when it has the focus; Esc hands the keys back
	if describe and describe.has_focus():
		if ev is InputEventKey and ev.pressed and ev.keycode == KEY_ESCAPE:
			describe.release_focus()
			return true
		return false
	if ev is InputEventKey and ev.pressed and not ev.echo and ev.keycode == KEY_SLASH:
		describe.grab_focus()
		return true
	return false

## the last thing made, on the bench
func _show_last() -> void:
	var last: Dictionary = app.cfg.get("last", {})
	var info: Dictionary = last.get("info", {})
	var kind := String(last.get("kind", ""))
	if kind in ["characters", "creatures", "objects"] and info.has("frames_dir") and DirAccess.dir_exists_absolute(String(info["frames_dir"])):
		var texs := frame_textures(String(info["frames_dir"]))
		if not texs.is_empty():
			app.scene.show_frames(texs, float(info.get("fps", 12.0)), float(info.get("ground_y", texs[0].get_height())), float(info.get("axis_x", texs[0].get_width() / 2.0)), info.get("lights", []))
			return
	if info.has("png") and FileAccess.file_exists(String(info["png"])):
		var t := tex(String(info["png"]))
		if t:
			if kind in ["effects"] and info.has("meta"):
				app.scene.show_strip(t, info["meta"])
			elif kind in ["characters", "creatures", "objects"]:
				var anchor: Array = info.get("anchor", [t.get_width() / 2.0, t.get_height()])
				app.scene.show_still(t, Vector2(float(anchor[0]), float(anchor[1])), info.get("lights", []))
			elif kind == "tiles" and info.has("meta"):
				app.scene.show_tiles(t, info["meta"])
			else:
				app.scene.show_picture(t)
			return
	# nothing yet: the bench stands empty in the chosen ground

## the classifier: say what you want, the right workbench opens with a draft
func _describe() -> void:
	var text := describe.text.strip_edges()
	if text == "" or reading:
		return
	if not app.backend.python_ok():
		app.say("Python was not found; see Settings.")
		return
	reading = true
	describe.editable = false
	app.set_hint("reading it")
	app.backend.run(["describe", text], "describe", func(r: Dictionary):
		reading = false
		if not is_inside_tree():
			return
		describe.editable = true
		app.set_hint(hint_text)
		_described(r, text))

func _described(r: Dictionary, text: String) -> void:
	if not r.get("ok", true) and not r.has("what"):
		app.say(String(r.get("error", "Could not read that.")))
		return
	var what := String(r.get("what", "spell"))
	var a := {"describe": text, "draft": r}
	var screen := "effects"
	match what:
		"spell":
			screen = "effects"
		"skin":
			screen = "characters"
		"music":
			screen = "music"
		"shapes":
			screen = "characters"
		"prompt":
			screen = _prompt_screen(r, a)
	app.go(screen, a)

## a painting prompt opens the workbench that will take the painting: a character-sheet prompt goes to Characters
## (the drafter makes a starter model from the words); a world prompt to its kind
static func _prompt_screen(r: Dictionary, a: Dictionary) -> String:
	var kind := ""
	var reads: Array = r.get("read", [])
	if not reads.is_empty():
		var first := String(reads[0])
		if first.begins_with("world prompt, kind "):
			kind = first.trim_prefix("world prompt, kind ").split(":")[0].strip_edges()
	if kind == "" and r.has("kinds"):
		kind = "object"
	a["prompt_kind"] = kind
	match kind:
		"object", "building", "tree", "topdown":
			return "objects"
		"ground":
			return "tiles"
		"ui", "icons", "portrait":
			a["tab"] = {"ui": "Frames", "icons": "Icons", "portrait": "Portraits"}[kind]
			return "interface"
		"missile", "spell_frames", "effect":
			return "effects"
	return "characters"

func on_drop(paths: PackedStringArray) -> void:
	if paths.is_empty():
		return
	var p := paths[0]
	if p.ends_with(".shapes.json") or p.ends_with(".json"):
		app.go("characters", {"model": p})
		return
	# a picture is a character's: the Characters bench cuts it out, measures it, drafts and colours a shape model from
	# it and stands the model beside it (several pictures at once are a sheet's views: front, side, back)
	var pics: PackedStringArray = []
	for q in paths:
		if q.get_extension().to_lower() in ["png", "jpg", "jpeg", "webp", "bmp", "gif"]:
			pics.append(q)
	if pics.is_empty():
		app.say("That is not a picture the Forge can read (PNG, JPG or WEBP).")
		return
	app.go("characters", {"pictures": pics})
