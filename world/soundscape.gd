class_name Soundscape
extends Node
## What the pilgrim hears (checklist 12, music; zz_zz_music96.js).
## - The score: the web's live-synthesised Act I cues rendered to seamless loops (audio/music/*.ogg, tools/render_mus.js):
##   the camp's twelve-string, the wilds' long silences and drones, the deep's sub-drones and far bells, the boss's drums.
##   Places cross-fade slowly; a waking great one cuts in fast; when it falls the land's own cue comes back.
## - The land: wind that rises with the gust you see (Game.wind), rain in the fen that swells with the shower, a low hum
##   under the ground with drips from the roof (world/weather.gd calls drip()), and, on the moor, now and then a bell
##   very far off. The land's sounds are made here once, from noise, as small loops.

const RATE := 22050
var main: Node
var mus_a: AudioStreamPlayer
var mus_b: AudioStreamPlayer
var mus_key := ""
var fade := 1.0              # 0..1, how far the cross-fade from b (old) to a (new) has gone
var fade_len := 3.0
var wind_p: AudioStreamPlayer
var rain_p: AudioStreamPlayer
var hum_p: AudioStreamPlayer
var one_p: Array = []        # one-shots (drips, bells)
var bell_t := 60.0
var boss_gone_t := 0.0
var streams := {}            # instance cache (static Resources crash Godot at exit)

func _init(m: Node) -> void:
	main = m

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	mus_a = _player()
	mus_b = _player()
	wind_p = _player()
	rain_p = _player()
	hum_p = _player()
	for i in 4:
		one_p.append(_player())
	wind_p.stream = _noise_loop("wind")
	rain_p.stream = _noise_loop("rain")
	hum_p.stream = _noise_loop("hum")
	for p in [wind_p, rain_p, hum_p]:
		p.volume_db = -80.0
		p.play()
	bell_t = randf_range(40.0, 90.0)

func _player() -> AudioStreamPlayer:
	var p := AudioStreamPlayer.new()
	add_child(p)
	return p

# ------------------------------------------------------------------ the score

func _music(key: String) -> AudioStream:
	if streams.has(key):
		return streams[key]
	var path := "res://audio/music/%s.ogg" % key
	if not ResourceLoader.exists(path):
		return null
	var s = load(path)
	if s is AudioStreamOggVorbis:
		s.loop = true
	streams[key] = s
	return s

func _pick() -> String:
	var z = main.zone
	if z == null:
		return ""
	var b = main.boss_awake
	if b != null and is_instance_valid(b) and not b.dead:
		boss_gone_t = 4.0
		return "boss1"
	if boss_gone_t > 0.0 and mus_key == "boss1":
		return "boss1"      # the drums ring out a little after it falls
	if z.id == "moor" or z.d.get("town", false):
		return "a1_town"
	if not z.d.get("outdoor", false):
		return "a1_deep"
	return "a1_wild"

func _swap(key: String) -> void:
	# the old cue moves to b and fades out; the new one comes in on a
	var tmp := mus_b
	mus_b = mus_a
	mus_a = tmp
	mus_key = key
	fade = 0.0
	fade_len = 0.8 if key == "boss1" else 3.5
	var s := _music(key)
	mus_a.stream = s
	mus_a.volume_db = -80.0
	if s:
		mus_a.play()

func _process(dt: float) -> void:
	if main == null:
		return
	boss_gone_t = maxf(0.0, boss_gone_t - dt)
	var key := _pick()
	if key != mus_key:
		_swap(key)
	fade = minf(1.0, fade + dt / fade_len)
	var mv := float(Settings.music_vol)
	var paused := main.get_tree().paused
	var mk := mv * (0.55 if paused else 1.0)
	mus_a.volume_db = linear_to_db(maxf(0.0001, mk * fade))
	mus_b.volume_db = linear_to_db(maxf(0.0001, mk * (1.0 - fade)))
	if fade >= 1.0 and mus_b.playing:
		mus_b.stop()
	_land(dt)

# ------------------------------------------------------------------ the land

func _land(dt: float) -> void:
	var z = main.zone
	var sv := float(Settings.sfx_vol)
	if z == null or main.hero == null:
		return
	var outdoor: bool = z.d.get("outdoor", false)
	var wind := Game.wind
	# wind: a floor of breath, rising with each gust (the pitch climbs a little with it)
	var wv := (0.1 + 0.55 * clampf(wind, 0.0, 1.2)) if outdoor else 0.03
	wind_p.volume_db = lerpf(wind_p.volume_db, linear_to_db(maxf(0.0001, wv * sv * 0.5)), minf(1.0, dt * 2.0))
	wind_p.pitch_scale = 0.8 + 0.35 * clampf(wind, 0.0, 1.2)
	# rain: with the shower
	var sky = main.get("sky")
	var rv := 0.0
	if sky != null and sky.kind == "rain":
		rv = 0.25 + 0.55 * float(sky.beat)
	rain_p.volume_db = lerpf(rain_p.volume_db, linear_to_db(maxf(0.0001, rv * sv * 0.28)), minf(1.0, dt * 1.5))
	# the hum under the ground
	var hv := 0.0 if outdoor else 0.4
	hum_p.volume_db = lerpf(hum_p.volume_db, linear_to_db(maxf(0.0001, hv * sv * 0.5)), minf(1.0, dt * 1.0))
	# a bell very far off, on the open moor
	if outdoor and sky != null and sky.kind == "ash":
		bell_t -= dt
		if bell_t <= 0.0:
			bell_t = randf_range(70.0, 150.0)
			_one(_bell(), -24.0 + linear_to_db(maxf(0.0001, sv)), randf_range(0.94, 1.03))

## a drop from the roof reaching the floor (world/weather.gd)
func drip() -> void:
	_one(_drip_s(), -22.0 + linear_to_db(maxf(0.0001, float(Settings.sfx_vol))), randf_range(0.8, 1.3))

func _one(s: AudioStream, db: float, pitch: float) -> void:
	for p in one_p:
		if not p.playing:
			p.stream = s
			p.volume_db = db
			p.pitch_scale = pitch
			p.play()
			return

# ------------------------------------------------------------------ sounds made from noise

func _wav(samples: PackedFloat32Array, loop: bool) -> AudioStreamWAV:
	var data := PackedByteArray()
	data.resize(samples.size() * 2)
	for i in samples.size():
		data.encode_s16(i * 2, int(clampf(samples[i], -1.0, 1.0) * 32767.0))
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = RATE
	w.stereo = false
	w.data = data
	if loop:
		w.loop_mode = AudioStreamWAV.LOOP_FORWARD
		w.loop_begin = 0
		w.loop_end = samples.size()
	return w

## 6 s of filtered noise, its tail folded into its head so it loops without a seam
func _noise_loop(kind: String) -> AudioStreamWAV:
	var n := RATE * 6
	var xf := RATE / 2
	var raw := PackedFloat32Array()
	raw.resize(n + xf)
	var lp1 := 0.0
	var lp2 := 0.0
	var hp := 0.0
	var prev := 0.0
	var br := 0.0
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(kind)
	for i in n + xf:
		var w := rng.randf() * 2.0 - 1.0
		var v := 0.0
		match kind:
			"wind":
				# a soft band of noise that breathes (two slow swells)
				lp1 += (w - lp1) * 0.06
				lp2 += (lp1 - lp2) * 0.06
				hp = lp2 - br
				br += (lp2 - br) * 0.004
				var t := float(i) / RATE
				v = hp * 5.0 * (0.7 + 0.3 * sin(t * TAU / 6.0) * sin(t * TAU / 3.0 + 1.0))
			"rain":
				# a hiss (high noise) and many small ticks of drops
				hp = w - prev
				prev = w
				lp1 += (hp - lp1) * 0.3
				lp2 += (lp1 - lp2) * 0.45
				v = lp2 * 0.4
				if rng.randf() < 0.0025:
					br = rng.randf_range(0.2, 0.6)
				v += br * (rng.randf() * 2.0 - 1.0)
				br *= 0.93
			_:
				# the hum: brown noise far down, and a faint low tone under it
				br += (w * 0.02)
				br *= 0.998
				lp1 += (br - lp1) * 0.02
				v = lp1 * 2.2 + sin(float(i) / RATE * TAU * 41.0) * 0.03
		raw[i] = v
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		out[i] = raw[i]
	for i in xf:
		var f := float(i) / float(xf)
		out[i] = raw[i] * f + raw[n + i] * (1.0 - f)
	return _wav(out, true)

func _drip_s() -> AudioStreamWAV:
	if streams.has("_drip"):
		return streams["_drip"]
	var n := int(RATE * 0.25)
	var s := PackedFloat32Array()
	s.resize(n)
	for i in n:
		var t := float(i) / RATE
		var f := 1500.0 * pow(0.55, t / 0.25) + 700.0
		s[i] = sin(TAU * f * t) * exp(-t * 26.0) * 0.5
	streams["_drip"] = _wav(s, false)
	return streams["_drip"]

## a bronze bell: inharmonic partials, a long fade, dulled by distance
func _bell() -> AudioStreamWAV:
	if streams.has("_bell"):
		return streams["_bell"]
	var n := RATE * 6
	var s := PackedFloat32Array()
	s.resize(n)
	var f0 := 146.8
	var parts := [[0.5, 0.5, 0.35], [1.0, 1.0, 0.5], [1.19, 0.6, 0.7], [1.5, 0.4, 0.9], [2.0, 0.3, 1.2], [2.74, 0.15, 1.6]]
	var lp := 0.0
	for i in n:
		var t := float(i) / RATE
		var v := 0.0
		for p in parts:
			v += sin(TAU * f0 * float(p[0]) * t) * float(p[1]) * exp(-t * float(p[2]))
		var a := minf(1.0, t / 0.02)
		lp += (v * a - lp) * 0.25        # far off: the high edge is gone
		s[i] = lp * 0.3
	streams["_bell"] = _wav(s, false)
	return streams["_bell"]
