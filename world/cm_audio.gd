extends Node
## Cursemark's music and air in Cursemark's world (the fork), as its level table names them (data.cdb "level": music,
## music_active, ambient): the place's track (its intro once, then its loop), the fight's track while something hunts
## the pilgrim near, a boss's own track while a boss is up, and the ambient bed under it all. Tracks cross-fade.

const RAW := "res://cursemark/raw/"
const CmData := preload("res://core/cm_data.gd")

var main
var calm := ""          # music ids for this place
var active := ""
var amb := ""
var want := ""
var fight_t := 0.0
var players: Array = []        # [current, previous]
var cur_id := ""
var amb_p: AudioStreamPlayer
var _streams := {}
var wind_p: AudioStreamPlayer     # the mournful wind under everything outdoors and in the chapel, swelling with Gust

func _init(m) -> void:
	main = m

func _ready() -> void:
	for i in 2:
		var p := AudioStreamPlayer.new()
		p.bus = "Music" if AudioServer.get_bus_index("Music") >= 0 else "Master"
		add_child(p)
		players.append(p)
	amb_p = AudioStreamPlayer.new()
	add_child(amb_p)
	wind_p = AudioStreamPlayer.new()
	wind_p.stream = load("res://audio/amb/wind.ogg")
	if wind_p.stream is AudioStreamOggVorbis:
		(wind_p.stream as AudioStreamOggVorbis).loop = true
	add_child(wind_p)

## Godmarrow's lands in Cursemark's music and air: the theme of the land, the fight's own track, the camp's shrine theme
## inside its safe circle, a boss's own (Derek 2026-10-05: our score "loops the same beat"; all sound is Cursemark's)
const LAND := {
	"moor": ["music_lowlands", "music_lowlands_active", "ambient_ominous"],
	"heath": ["music_lowlands", "music_lowlands_active", "ambient_ominous"],
	"ridge": ["music_mountains", "music_mountains_active", "ambient_ominous"],
	"fen": ["music_swamp", "music_swamp_active", "ambient_swamp"],
	"wood": ["music_forest", "music_forest_active", "ambient_forest"],
	"crypt": ["music_void", "", "ambient_cave"], "barrow": ["music_void", "", "ambient_cave"],
	"bone": ["music_void", "", "ambient_cave"],
}
const BOSS := {"boss": "music_osric", "matron": "music_vessel", "qb_calcifer": "music_lucian", "qb_brood": "music_swampboss",
	"qb_abbot": "music_hexapede", "qb_slayer": "music_lucian"}
var zone_ref
var camp := false

func bind(zone) -> void:
	zone_ref = zone
	var land := str(zone.d.get("land", zone.d.get("theme", "moor")))
	var row: Array = LAND.get(land, LAND["moor"])
	calm = row[0]
	active = row[1]
	amb = row[2]
	camp = false
	_ambient(amb)

## a track by id: [intro or null, loop]
func _track(id: String) -> Array:
	if _streams.has(id):
		return _streams[id]
	var out: Array = [null, null]
	var j = JSON.parse_string(load("res://core/cm_data.gd").text(RAW + "sounds/music/" + id + ".json"))
	var files: Array = []
	if j is Dictionary:
		for s in j.get("sounds", []):
			files.append(str(s.get("file", "")))
	for f in files:
		var st := AudioStreamOggVorbis.load_from_file(RAW + f)
		if st == null:
			continue
		if f.contains("_intro"):
			out[0] = st
		else:
			st.loop = true
			out[1] = st
	if out[1] == null and out[0] != null:      # an intro alone: it is the loop
		out[1] = out[0]
		out[1].loop = true
		out[0] = null
	_streams[id] = out
	return out

func _ambient(id: String) -> void:
	amb_p.stop()
	if id == "":
		return
	var j = JSON.parse_string(load("res://core/cm_data.gd").text(RAW + "sounds/ambient/" + id + ".json"))
	if not (j is Dictionary) or j.get("sounds", []).is_empty():
		return
	var st := AudioStreamOggVorbis.load_from_file(RAW + str(j["sounds"][0].get("file", "")))
	if st:
		st.loop = true
		amb_p.stream = st
		amb_p.play()

func _process(dt: float) -> void:
	Gust.step(dt)
	_wind(dt)
	# the title (the Seer's bowl): the shrine's theme, slowed and low, quiet under the wind (Derek 2026-10-05: "a mournful
	# wind and a slow mournful, somewhat quiet, dreadful temple-like tune playing lightly in the background")
	if main and main.get("title_open") == true:
		if cur_id != "music_shrine":
			_swap("music_shrine")
			amb_p.stop()
		var ta: AudioStreamPlayer = players[0]
		ta.pitch_scale = 0.84
		ta.volume_db = move_toward(ta.volume_db, linear_to_db(maxf(0.0001, float(Settings.music_vol) * 0.32)), 20.0 * dt)
		var tb: AudioStreamPlayer = players[1]
		tb.volume_db = move_toward(tb.volume_db, -60.0, 30.0 * dt)
		if not ta.playing:
			var tt: Array = _track(cur_id)
			if tt[1]:
				ta.stream = tt[1]
				ta.play()
		return
	(players[0] as AudioStreamPlayer).pitch_scale = 1.0
	var z = main.zone if main else null
	if z == null:
		for p in players:
			p.stop()
		amb_p.stop()
		cur_id = ""
		return
	# the fight: something awake and hunting within 9 yards, or a boss up
	var h = main.hero
	var hunted := false
	var boss_up: bool = main.boss_awake != null and is_instance_valid(main.boss_awake) and not main.boss_awake.dead
	if h and not h.dead:
		for m in get_tree().get_nodes_in_group("monsters"):
			if not m.dead and m.awake and m.tp.distance_to(h.tp) < 9.0:
				hunted = true
				break
	fight_t = 6.0 if (hunted or boss_up) else maxf(0.0, fight_t - dt)
	want = active if (fight_t > 0.0 and active != "") else (calm if calm != "" else active)
	if boss_up:
		want = str(BOSS.get(str(main.boss_awake.kind), "music_swampboss"))
	# the camp's safe circle: the shrine theme and the fire
	var sc = z.markers.get("safeCircle") if z else null
	var in_camp: bool = sc is Dictionary and h != null and h.tp.distance_to(Vector2(sc["x"], sc["y"])) < float(sc["r"])
	if in_camp:
		want = "music_shrine"
	if in_camp != camp:
		camp = in_camp
		_ambient("ambient_campfire" if camp else amb)
	if want != cur_id:
		_swap(want)
	var mv := float(Settings.music_vol) * (0.0 if main.get_tree().paused else 1.0)
	var a: AudioStreamPlayer = players[0]
	var b: AudioStreamPlayer = players[1]
	a.volume_db = move_toward(a.volume_db, linear_to_db(maxf(0.0001, mv * 0.8)), 30.0 * dt)
	b.volume_db = move_toward(b.volume_db, -60.0, 30.0 * dt)
	if b.playing and b.volume_db <= -59.0:
		b.stop()
	amb_p.volume_db = linear_to_db(maxf(0.0001, float(Settings.sfx_vol) * 0.55))
	# an intro rolls into its loop
	if a.playing == false and cur_id != "":
		var tr: Array = _track(cur_id)
		if tr[1]:
			a.stream = tr[1]
			a.play()

## the wind: always there in the chapel and out of doors, low; it rises with each gust and falls away after
func _wind(dt: float) -> void:
	if wind_p == null or wind_p.stream == null:
		return
	var z = main.zone if main else null
	var title: bool = main != null and main.get("title_open") == true
	var outdoor: bool = z != null and z.d.get("outdoor", false)
	var on := title or outdoor
	if on and not wind_p.playing:
		wind_p.play(randf() * 20.0)
	var g := Gust.k()
	var lin := (0.08 + 0.42 * g) * (1.0 if title else 0.8) if on else 0.0
	wind_p.volume_db = move_toward(wind_p.volume_db, linear_to_db(maxf(0.0001, lin * float(Settings.sfx_vol))), 24.0 * dt)
	wind_p.pitch_scale = 0.9 + 0.12 * g
	if not on and wind_p.volume_db < -50.0:
		wind_p.stop()

func _swap(id: String) -> void:
	cur_id = id
	players.reverse()                 # the old one fades out as [1]
	var a: AudioStreamPlayer = players[0]
	a.stop()
	if id == "":
		return
	var tr: Array = _track(id)
	a.stream = tr[0] if tr[0] else tr[1]
	a.volume_db = -40.0
	a.play()
