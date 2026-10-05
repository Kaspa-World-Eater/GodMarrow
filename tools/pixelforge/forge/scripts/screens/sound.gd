extends "res://scripts/screen.gd"
## Sound: the synthesised effects (`pixelforge sfx`) as pads, each with a few knobs (pitch, length, grit, tone, the
## wave) and Play; Keep writes into the game's sounds. Every knob is a `--set` of the same command.

const PADS := ["hit", "heavy_hit", "bone_click", "bone_break", "thud", "whoosh", "pour", "glass", "cast", "wisp", "pickup", "ui_tick", "ui_open",
	"death_rattle", "lantern_light", "step_stone", "step_soft", "coin"]
const WAVES := ["preset", "square", "saw", "triangle", "sine", "noise"]
var player: AudioStreamPlayer

func build() -> void:
	tabs = PackedStringArray(["Pads"])
	hint_text = "Enter plays the pad · Esc back"
	if state.is_empty():
		state = {"pad": "hit", "knobs": {}, "exported": "", "seed": 0}
	player = AudioStreamPlayer.new()
	add_child(player)
	tab_from_args()
	rebuild()
	app.scene.show_text(PackedStringArray(["the sound bench", "pick a pad, turn its knobs, Play; the wave is drawn here"]), "sound")
	if app.backend.python_ok():
		play()

func sfx_dir() -> String:
	return app.backend.out_dir("sfx")

func knobs() -> Dictionary:
	return state["knobs"].get(String(state["pad"]), {})

func build_tab(_i: int) -> void:
	var pad := String(state["pad"])
	var k := knobs()
	state_line("Sound · %s · %s" % [pad.replace("_", " "), "as the preset has it" if k.is_empty() else "with your knobs"])
	var items := []
	for p in PADS:
		items.append({"label": ("* " if p == pad else "") + p.replace("_", " "), "cb": func(): state["pad"] = p; rebuild(); play()})
	var c := W.Choices.new()
	c.font_size = T.SMALL_SIZE
	c.arrow_gap = 12
	c.flow = true
	c.flow_gap = 6
	c.wrap_width = App.TEXTBOX.size.x - 16
	c.setup(items, 1, app)
	c.row_h = 13
	add_extra(c)
	var controls := []
	var lp := W.Lever.new()
	lp.init("pitch", clampf(float(k.get("pitch", 0.5)), 0.0, 1.0), 0.5, func(v): return "%+d st" % int(round((v - 0.5) * 24)), Callable(), func(v): _setv("pitch", snappedf(v, 0.02)))
	var ll := W.Lever.new()
	ll.init("length", clampf(float(k.get("length", 0.5)), 0.0, 1.0), 0.5, func(v): return "x" + T.fmt(0.25 + v * 1.5, 2), Callable(), func(v): _setv("length", snappedf(v, 0.02)))
	var lg := W.Lever.new()
	lg.init("grit", clampf(float(k.get("grit", 0.0)), 0.0, 1.0), 0.0, func(v): return "%d bits" % int(round(v * 7)), Callable(), func(v): _setv("grit", snappedf(v, 0.02)))
	var lt := W.Lever.new()
	lt.init("tone", clampf(float(k.get("tone", 0.5)), 0.0, 1.0), 0.5, func(v): return "muffled" if v < 0.33 else ("bright" if v > 0.66 else "even"), Callable(), func(v): _setv("tone", snappedf(v, 0.02)))
	var wave := String(k.get("wave", "preset"))
	var lw := W.Wheel.new()
	lw.init_wheel("wave", WAVES.find(wave) * 60.0 - 150.0, -150.0, func(a): return WAVES[clampi(int(round((a + 150.0) / 60.0)), 0, WAVES.size() - 1)], Callable(), func(a):
		_set_str("wave", WAVES[clampi(int(round((a + 150.0) / 60.0)), 0, WAVES.size() - 1)]))
	lw.wrap = false
	controls.append_array([lp, ll, lg, lt, lw])
	add_rack(controls, 8)
	add_choices(standard_choices([{"label": "Play", "cb": play}, {"label": "Dice", "cb": _dice}], false))

func _setv(key: String, value: float) -> void:
	push_undo()
	if not state["knobs"].has(String(state["pad"])):
		state["knobs"][String(state["pad"])] = {}
	state["knobs"][String(state["pad"])][key] = value
	rebuild()
	play()

func _set_str(key: String, value: String) -> void:
	push_undo()
	if not state["knobs"].has(String(state["pad"])):
		state["knobs"][String(state["pad"])] = {}
	if value == "preset":
		state["knobs"][String(state["pad"])].erase(key)
	else:
		state["knobs"][String(state["pad"])][key] = value
	rebuild()
	play()

## the knobs as the CLI's --set words: pitch and length scale the preset's own numbers (freq_mul, decay_mul)
func _set_args(seed: int) -> Array:
	var k := knobs()
	var a := []
	if k.has("pitch"):
		a += ["--set", "freq_mul=%s" % T.fmt(pow(2.0, (float(k["pitch"]) - 0.5) * 2.0), 3)]
	if k.has("length"):
		a += ["--set", "decay_mul=%s" % T.fmt(0.25 + float(k["length"]) * 1.5, 3)]
	if k.has("grit"):
		a += ["--set", "crush=%d" % int(round(float(k["grit"]) * 7))]
	if k.has("tone"):
		a += ["--set", "lowpass=%s" % T.fmt(0.05 + float(k["tone"]) * 0.95, 3)]
	if k.has("wave"):
		a += ["--set", "wave=%s" % String(k["wave"])]
	a += ["--seed", str(seed)]
	return a

func play() -> void:
	var pad := String(state["pad"])
	run(["sfx", pad, "-o", sfx_dir()] + _set_args(int(state.get("seed", 0))), "making the sound", func(r: Dictionary):
		if not r.get("ok", false):
			return
		var files: Array = r.get("files", [])
		if files.is_empty():
			return
		var wav := String(files[0])
		var s := AudioStreamWAV.load_from_file(wav)
		if s and app.audio.sounds_on:
			player.stream = s
			player.volume_db = linear_to_db(maxf(app.audio.sound_volume, 0.01))
			player.play()
		_draw_wave(wav)
		app.remember_last("sound", {"title": pad.replace("_", " "), "note": "played", "wav": wav}), false)

## the wave, drawn as pixels in the picture window (16-bit mono WAV, 44-byte header)
func _draw_wave(wav: String) -> void:
	var f := FileAccess.open(wav, FileAccess.READ)
	if f == null:
		return
	var bytes := f.get_buffer(f.get_length())
	if bytes.size() < 48:
		return
	var w := int(App.PIC.size.x)
	var h := int(App.PIC.size.y)
	var img := Image.create_empty(w, h, false, Image.FORMAT_RGBA8)
	img.fill(T.WELL)
	var n := (bytes.size() - 44) / 2
	var mid := h / 2
	for x in w:
		var i0 := 44 + int(float(x) / w * n) * 2
		var i1 := 44 + int(float(x + 1) / w * n) * 2
		var lo := 0
		var hi := 0
		var i := i0
		while i < i1 and i + 1 < bytes.size():
			var v := bytes[i] | (bytes[i + 1] << 8)
			if v >= 32768:
				v -= 65536
			lo = mini(lo, v)
			hi = maxi(hi, v)
			i += 2
		var y0 := clampi(mid - hi * (h / 2 - 4) / 32768, 0, h - 1)
		var y1 := clampi(mid - lo * (h / 2 - 4) / 32768, 0, h - 1)
		for y in range(y0, y1 + 1):
			img.set_pixel(x, y, T.BONE)
	app.scene.show_picture(ImageTexture.create_from_image(img), "%s · %.2f s" % [String(state["pad"]).replace("_", " "), n / 44100.0], 1)

func _dice() -> void:
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	state["seed"] = rng.randi_range(0, 99)
	play()

func keep() -> void:
	if not app.backend.game_ok():
		app.say("No game folder is set; see Settings.")
		return
	var out := app.game_art("sfx")
	var pad := String(state["pad"])
	run(["sfx", pad, "-o", out] + _set_args(int(state.get("seed", 0))), "putting the sound in the game", func(r: Dictionary):
		if r.get("ok", false):
			state["exported"] = out
			app.say("%s is in the game's sounds." % pad.replace("_", " ")))

func render_all() -> void:
	run(["sfx", "all", "-o", sfx_dir()], "making every sound", func(r: Dictionary):
		if r.get("ok", false):
			app.say("Every pad is in the project's sfx folder."))

func reset() -> void:
	push_undo()
	state["knobs"].erase(String(state["pad"]))
	rebuild()
	app.audio.blip("clunk")

func start_over_question() -> String:
	return "Start the sounds over? Every pad's knobs go back to the preset; nothing in the game changes."

func do_start_over() -> void:
	state = {"pad": "hit", "knobs": {}, "exported": "", "seed": 0}
	undo_stack = []
	redo_stack = []
	rebuild()

func on_state_restored() -> void:
	pass

# ------------------------------------------------------------------ Claude on the bench
func claude_context() -> Dictionary:
	return {"pad": String(state["pad"]), "out_dir": sfx_dir()}

## the sound Claude made plays, and its wave is drawn
func on_claude_done(r: Dictionary) -> void:
	var wav := pick_changed(r, ".wav", sfx_dir())
	if wav == "":
		wav = pick_changed(r, ".wav")
	if wav == "":
		return
	var pad := wav.get_file().get_basename()
	for p in PADS:
		if pad.begins_with(p):
			state["pad"] = p
	var s := AudioStreamWAV.load_from_file(wav)
	if s and app.audio.sounds_on:
		player.stream = s
		player.volume_db = linear_to_db(maxf(app.audio.sound_volume, 0.01))
		player.play()
	_draw_wave(wav)
