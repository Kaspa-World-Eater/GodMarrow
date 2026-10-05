extends Node
## scripts/audio.gd: the Forge's sound graph. Two music players crossfade between the family's loops (forge_home,
## forge_working: assets/audio, rendered by `pixelforge music forge`; forge_done is kept for the music bench and never
## plays on a finished step); a small pool plays the interface sounds (`pixelforge music blips`). The sounds level
## (Settings: off / quiet / full, quiet by default) decides which: quiet keeps the cursor blip, the select click and
## the back thud only; full adds the lever scrape, the wheel ratchet, the chain clunk and the drop. Nothing plays
## when a render or a step finishes, at any level. Everything is silent with --nosound.

const LOOPS := {"home": "forge_home", "working": "forge_working", "done": "forge_done"}
const BLIPS := ["cursor_hi", "cursor_lo", "confirm", "back", "scrape", "ratchet", "clunk", "done", "fail", "drop", "tab"]
const GAIN := {"cursor_hi": -14.0, "cursor_lo": -14.0, "confirm": -10.0, "back": -8.0, "scrape": -16.0, "ratchet": -18.0, "clunk": -10.0,
	"done": -12.0, "fail": -10.0, "drop": -8.0, "tab": -14.0}

var sounds_on := true
var level := "quiet"           # off | quiet | full
var music_on := true
var sound_volume := 0.8        # 0..1
var music_volume := 0.6        # 0..1
var state := ""                # home | working | done
var streams := {}              # name -> AudioStream
var music_a: AudioStreamPlayer
var music_b: AudioStreamPlayer
var front: AudioStreamPlayer   # the one playing the current loop
var pool: Array = []
var fade := 0.0                # seconds left in the crossfade
var fade_len := 2.5
var last := {}
var missing: PackedStringArray = []

func _ready() -> void:
	music_a = AudioStreamPlayer.new()
	music_b = AudioStreamPlayer.new()
	for p in [music_a, music_b]:
		p.bus = "Master"
		add_child(p)
	front = music_a
	for i in 6:
		var p := AudioStreamPlayer.new()
		add_child(p)
		pool.append(p)
	for n in BLIPS:
		_load("ui_" + n)
	for n in LOOPS.values():
		_load(n)

func _load(name: String) -> AudioStream:
	if streams.has(name):
		return streams[name]
	var dir := ProjectSettings.globalize_path("res://assets/audio/")
	var s: AudioStream = null
	if FileAccess.file_exists(dir + name + ".ogg"):
		s = AudioStreamOggVorbis.load_from_file(dir + name + ".ogg")
	elif FileAccess.file_exists(dir + name + ".wav"):
		s = AudioStreamWAV.load_from_file(dir + name + ".wav")
	if s == null:
		missing.append(name)
	elif s is AudioStreamOggVorbis and not name.begins_with("ui_"):
		s.loop = true
	streams[name] = s
	return s

## every file the graph needs is there (the headless check asks)
func loaded() -> Dictionary:
	return {"missing": missing, "streams": streams.size()}

# ------------------------------------------------------------------ interface sounds
const QUIET := ["cursor_hi", "cursor_lo", "confirm", "back"]
const NEVER := ["done", "fail"]

func set_level(l: String) -> void:
	level = l if l in ["off", "quiet", "full"] else "quiet"
	sounds_on = level != "off"

func blip(name: String, pitch: float = 1.0) -> void:
	if not sounds_on or sound_volume <= 0.0 or level == "off" or name in NEVER:
		return
	if name == "tab":
		name = "cursor_lo"
	if level == "quiet" and not name in QUIET:
		return
	var now := Time.get_ticks_msec() / 1000.0
	if now - float(last.get(name, -9.0)) < 0.03:
		return
	last[name] = now
	var s: AudioStream = streams.get("ui_" + name)
	if s == null:
		return
	for p in pool:
		if not p.playing:
			p.stream = s
			p.volume_db = float(GAIN.get(name, -12.0)) + linear_to_db(maxf(sound_volume, 0.01)) + (-6.0 if level == "quiet" else 0.0)
			p.pitch_scale = pitch
			p.play()
			return

## the cursor moved: higher for right and down, lower for left and up
func cursor(dir: String) -> void:
	blip("cursor_hi" if dir in ["right", "down"] else "cursor_lo")

# ------------------------------------------------------------------ music
func set_state(s: String) -> void:
	if s == "done":
		s = "home"   # a finished step is quiet: the home loop simply carries on
	if s == state:
		return
	state = s
	if not music_on:
		return
	_start(s)

func _start(s: String) -> void:
	var stream: AudioStream = streams.get(LOOPS.get(s, "forge_home"))
	if stream == null:
		return
	var back_p := music_b if front == music_a else music_a
	back_p.stream = stream
	back_p.volume_db = -60.0
	back_p.play()
	front = back_p
	fade = fade_len

func set_music(on: bool) -> void:
	music_on = on
	if on:
		if state == "":
			state = "home"
		_start(state)
	else:
		for p in [music_a, music_b]:
			p.stop()

func _process(dt: float) -> void:
	var target := linear_to_db(maxf(music_volume, 0.001))
	if fade > 0.0:
		fade = maxf(fade - dt, 0.0)
		var k := 1.0 - fade / fade_len
		var back_p := music_b if front == music_a else music_a
		front.volume_db = lerpf(-60.0, target, k)
		if back_p.playing:
			back_p.volume_db = lerpf(target, -60.0, k)
			if fade == 0.0:
				back_p.stop()
	elif front.playing:
		front.volume_db = target
