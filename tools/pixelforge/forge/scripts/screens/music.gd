extends "res://scripts/screen.gd"
## Music: the score's cues as cards and a rack of real controls (docs/track_notes/music_editor.md), backed by
## `pixelforge music`: tempo, key, mode, metre, tune (with a dice), level, wind, wind pitch, echo, drone note, drone
## level, drone darkness, drone kind, length. Play renders twenty seconds and plays them; the spectrogram strip goes
## in the picture window; Keep writes the OGG and the sheet into the game's music.

const MODES := ["aeol", "dor", "phr", "hij", "hmin", "pmin"]
const MODE_NAMES := {"aeol": "minor", "dor": "dorian", "phr": "phrygian", "hij": "hijaz", "hmin": "harmonic", "pmin": "pentatonic"}
const NOTES := ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
var cues: Array = []          # from `music list --json`
var player: AudioStreamPlayer

func build() -> void:
	tabs = PackedStringArray(["Rack", "Cues"])
	hint_text = "Enter plays the cue · Esc back"
	if state.is_empty():
		state = {"cue": "a1_town", "knobs": {}, "seconds": 20, "exported": ""}
	if args.has("draft") and args["draft"] is Dictionary and String(args["draft"].get("what", "")) == "music":
		state["cue"] = String(args["draft"].get("cue", state["cue"]))
		var kn: Dictionary = args["draft"].get("knobs", {})
		state["knobs"][String(state["cue"])] = kn.duplicate()
	if args.has("cue"):
		state["cue"] = String(args["cue"])
	player = AudioStreamPlayer.new()
	add_child(player)
	tab_from_args()
	rebuild()
	app.scene.show_text(PackedStringArray(["the music rack", "pick a cue, turn the knobs, Play; the spectrogram is drawn here"]), "music")
	if app.backend.python_ok():
		app.backend.run(["music", "list"], "the cue table", func(r: Dictionary):
			if r.get("ok", false) and is_inside_tree():
				cues = r.get("cues", [])
				rebuild())

func music_dir() -> String:
	return app.backend.out_dir("music")

func cue_info(key: String) -> Dictionary:
	for c in cues:
		if String(c.get("key", "")) == key:
			return c
	return {}

## the cue's knobs: the table's numbers under the person's overrides
func knob(name: String, fallback: float) -> float:
	var k: Dictionary = state["knobs"].get(String(state["cue"]), {})
	if k.has(name):
		return float(k[name])
	var info := cue_info(String(state["cue"]))
	if info.has(name) and info[name] != null and not (info[name] is String) and not (info[name] is Array):
		return float(info[name])
	return fallback

func knob_str(name: String, fallback: String) -> String:
	var k: Dictionary = state["knobs"].get(String(state["cue"]), {})
	if k.has(name):
		return String(k[name])
	var info := cue_info(String(state["cue"]))
	return String(info.get(name, fallback)) if info.has(name) else fallback

func drone() -> Array:
	var k: Dictionary = state["knobs"].get(String(state["cue"]), {})
	if k.has("drone") and k["drone"] is Array:
		return k["drone"]
	var info := cue_info(String(state["cue"]))
	if info.get("drone") is Array:
		return info["drone"]
	return [38, 0.03, 300, ""]

func build_tab(i: int) -> void:
	if i == 1:
		_build_cues()
		return
	var cue := String(state["cue"])
	var info := cue_info(cue)
	state_line("Music · %s · %s" % [String(info.get("title", cue)), String(info.get("description", "")) if not cues.is_empty() else "the cue table is loading"])
	var root := int(knob("root", 50))
	var mode := knob_str("sc", "aeol")
	var steps := int(knob("steps", 8))
	var seed := int(knob("seed", 1))
	var dr := drone()
	var dist: bool = dr.size() > 3 and String(dr[3]) == "dist"
	add_cyclers([
		{"label": "cue", "value": cue, "left": func(): _pick_cue(-1), "right": func(): _pick_cue(1)},
		{"label": "key", "value": "%s%d" % [NOTES[posmod(root, 12)], int(root / 12) - 1], "left": func(): _setv("root", root - 1), "right": func(): _setv("root", root + 1)},
		{"label": "mode", "value": String(MODE_NAMES.get(mode, mode)), "left": func(): _set_str("sc", _cycle(MODES, mode, -1)), "right": func(): _set_str("sc", _cycle(MODES, mode, 1))},
		{"label": "metre", "value": "lilting" if steps == 6 else "straight", "left": func(): _setv("steps", 6 if steps == 8 else 8), "right": func(): _setv("steps", 8 if steps == 6 else 6)},
		{"label": "tune", "value": str(seed), "left": func(): _setv("seed", maxi(seed - 1, 1)), "right": func(): _setv("seed", seed + 1)},
		{"label": "drone", "value": "%s%d" % [NOTES[posmod(int(dr[0]), 12)], int(int(dr[0]) / 12) - 1], "left": func(): _set_drone(0, int(dr[0]) - 1), "right": func(): _set_drone(0, int(dr[0]) + 1)},
		{"label": "kind", "value": "dist" if dist else "clean", "left": _toggle_drone_kind, "right": _toggle_drone_kind},
	])
	var controls := []
	var lt := W.Lever.new()
	lt.init("tempo", (knob("bpm", 90) - 40.0) / 120.0, (float(info.get("bpm", 90)) - 40.0) / 120.0, func(v): return "%d bpm" % int(round(40 + v * 120)), Callable(), func(v): _setv("bpm", round(40 + v * 120)))
	var ll := W.Lever.new()
	ll.init("level", knob("gain", 1.0) / 2.0, float(info.get("gain", 1.0)) / 2.0, func(v): return T.fmt(v * 2.0, 2), Callable(), func(v): _setv("gain", snappedf(v * 2.0, 0.05)))
	var lw := W.Lever.new()
	lw.init("wind", knob("wind", 0.0) / 0.05, float(info.get("wind", 0.0)) / 0.05, func(v): return T.fmt(v * 0.05, 3), Callable(), func(v): _setv("wind", snappedf(v * 0.05, 0.002)))
	var lwp := W.Lever.new()
	lwp.init("wind pitch", (knob("windF", 420) - 100.0) / 900.0, (float(info.get("windF", 420)) - 100.0) / 900.0, func(v): return "%d Hz" % int(round(100 + v * 900)), Callable(), func(v): _setv("windF", round(100 + v * 900)))
	var le := W.Lever.new()
	le.init("echo", knob("ds", 0.0), float(info.get("ds", 0.0)), func(v): return T.fmt(v, 2), Callable(), func(v): _setv("ds", snappedf(v, 0.05)))
	var ldl := W.Lever.new()
	ldl.init("drone level", float(dr[1]) / 0.1, float(dr[1]) / 0.1, func(v): return T.fmt(v * 0.1, 3), Callable(), func(v): _set_drone(1, snappedf(v * 0.1, 0.002)))
	var ldd := W.Lever.new()
	ldd.init("drone dark", 1.0 - (float(dr[2]) - 60.0) / 740.0, 1.0 - (float(dr[2]) - 60.0) / 740.0, func(v): return "%d Hz" % int(round(60 + (1.0 - v) * 740)), Callable(), func(v): _set_drone(2, round(60 + (1.0 - v) * 740)))
	var ln := W.Lever.new()
	ln.init("length", (float(state["seconds"]) - 10.0) / 110.0, 10.0 / 110.0, func(v): return "%d s" % int(round(10 + v * 110)), Callable(), func(v): state["seconds"] = int(round(10 + v * 110)); rebuild())
	controls.append_array([lt, ll, lw, lwp, le, ldl, ldd, ln])
	add_rack(controls, 8)
	add_choices(standard_choices([{"label": "Stop" if player.playing else "Play", "cb": _play_or_stop}, {"label": "Dice", "cb": _dice}], false))

func _play_or_stop() -> void:
	if player.playing:
		player.stop()
		rebuild()
	else:
		play()

## the Advanced fold: the exact tempo and the loop's length
func advanced_extra() -> Array:
	if tab != 0:
		return []
	var info := cue_info(String(state["cue"]))
	return [
		fine_slider("tempo exact", knob("bpm", 90), 40.0, 160.0, float(info.get("bpm", 90)), 0, func(v): _setv("bpm", round(v)), func(v): return "%d bpm" % int(v)),
		fine_slider("seconds", float(state["seconds"]), 10.0, 120.0, 20.0, 0, func(v): state["seconds"] = int(round(v)); rebuild(), func(v): return "%d s" % int(v)),
	]

## the cue cards: every place in the game and the Forge's own three loops
func _build_cues() -> void:
	state_line("Music · cues · the places of the game and the Forge's own loops; pick one, then the rack")
	var items := []
	for c in cues:
		var key := String(c.get("key", ""))
		items.append({"label": key, "line": String(c.get("title", "")), "on": key == String(state["cue"]), "cb": func(): state["cue"] = key; set_tab(0)})
	var cards := W.Cards.new()
	cards.font_size = T.SMALL_SIZE
	cards.setup_cards(items, 6, app)
	cards.row_h = 22
	cards.custom_minimum_size = Vector2(0, 22 * ceili(items.size() / 6.0))
	add_extra(cards)
	add_choices(standard_choices([{"label": "Play", "cb": play}], false))

func _pick_cue(delta: int) -> void:
	var keys := []
	for c in cues:
		keys.append(String(c.get("key", "")))
	if keys.is_empty():
		return
	state["cue"] = _cycle(keys, String(state["cue"]), delta)
	rebuild()

func _knobs() -> Dictionary:
	if not state["knobs"].has(String(state["cue"])):
		state["knobs"][String(state["cue"])] = {}
	return state["knobs"][String(state["cue"])]

func _setv(key: String, value: float) -> void:
	push_undo()
	_knobs()[key] = value
	rebuild()

func _set_str(key: String, value: String) -> void:
	push_undo()
	_knobs()[key] = value
	rebuild()

func _set_drone(i: int, value) -> void:
	push_undo()
	var d := drone().duplicate()
	while d.size() < 4:
		d.append("" if d.size() == 3 else 0)
	d[i] = value
	_knobs()["drone"] = d
	rebuild()

func _toggle_drone_kind() -> void:
	var d := drone()
	_set_drone(3, "" if (d.size() > 3 and String(d[3]) == "dist") else "dist")

func _dice() -> void:
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	_setv("seed", rng.randi_range(1, 999))
	play()

## the knobs as the CLI's --set words
func _set_args() -> Array:
	var a := []
	var k := _knobs()
	for key in k:
		if key == "seed":
			a += ["--seed", str(int(k[key]))]
		elif key == "drone":
			var d: Array = k[key]
			a += ["--set", "drone=[%d,%s,%d%s]" % [int(d[0]), T.fmt(float(d[1]), 3), int(d[2]), (",\"dist\"" if d.size() > 3 and String(d[3]) == "dist" else "")]]
		elif key in ["steps", "root"]:
			a += ["--set", "%s=%d" % [key, int(k[key])]]
		elif key == "sc":
			a += ["--set", "sc=%s" % String(k[key])]
		else:
			a += ["--set", "%s=%s" % [key, T.fmt(float(k[key]), 3)]]
	return a

func play() -> void:
	var cue := String(state["cue"])
	run(["music", cue, "-o", music_dir(), "--seconds", str(int(state["seconds"]))] + _set_args(), "rendering %s" % cue, func(r: Dictionary):
		if not r.get("ok", false):
			return
		var files: Array = r.get("files", [])
		var wav := ""
		for f in files:
			if String(f).ends_with(".wav"):
				wav = String(f)
		if wav != "":
			var s := AudioStreamWAV.load_from_file(wav)
			if s and app.audio.sounds_on:
				app.audio.set_music(false)
				player.stream = s
				player.volume_db = linear_to_db(maxf(app.audio.music_volume, 0.01))
				player.play()
				rebuild()
		var png := String(r.get("png", ""))
		var t := tex(png)
		if t:
			app.scene.show_picture(t, "%s · %d s · waveform and spectrogram" % [cue, int(state["seconds"])])
		app.remember_last("music", {"title": cue, "note": "rendered", "png": png}))

func keep() -> void:
	if not app.backend.game_ok():
		app.say("No game folder is set; see Settings.")
		return
	var out := app.backend.game_dir.path_join("audio").path_join("music")
	DirAccess.make_dir_recursive_absolute(out)
	var cue := String(state["cue"])
	run(["music", cue, "-o", out, "--seconds", "120", "--format", "ogg"] + _set_args(), "writing %s into the game" % cue, func(r: Dictionary):
		if r.get("ok", false):
			state["exported"] = out
			var notes: Array = r.get("notes", [])
			app.say("%s is in the game's music%s." % [cue, ((" (" + String(notes[0]) + ")") if not notes.is_empty() else "")]))

func render_all() -> void:
	run(["music", "all", "-o", music_dir(), "--seconds", str(int(state["seconds"]))], "rendering every cue", func(r: Dictionary):
		if r.get("ok", false):
			app.say("Every cue is in the project's music folder."))

func reset() -> void:
	push_undo()
	state["knobs"].erase(String(state["cue"]))
	rebuild()
	app.audio.blip("clunk")

func start_over_question() -> String:
	return "Start the music over? Every cue's knobs go back to the score's; nothing in the game changes."

func do_start_over() -> void:
	player.stop()
	state = {"cue": "a1_town", "knobs": {}, "seconds": 20, "exported": ""}
	undo_stack = []
	redo_stack = []
	rebuild()

func can_leave() -> bool:
	player.stop()
	if app.cfg.get("music", true):
		app.audio.set_music(true)
	return true

func add_cyclers(items: Array) -> Control:
	var c := W.Choices.new()
	c.font_size = T.SMALL_SIZE
	c.arrow_gap = 12
	c.flow = true
	c.flow_gap = 10
	c.setup(items, maxi(items.size(), 1), app)
	c.row_h = 13
	c.custom_minimum_size = Vector2(0, 13)
	add_extra(c)
	return c

static func _cycle(list: Array, cur, delta: int):
	var i := list.find(cur)
	return list[posmod(i + delta, list.size())] if not list.is_empty() else cur
