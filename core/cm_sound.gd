extends RefCounted
## Cursemark's sounds by id (cursemark_raw/sounds/**/<id>.json: one or more .ogg files, a volume), played once at a
## random pick (the Cursemark fork).

static var RAW: String = load("res://core/cm_data.gd").root() + "raw/"
static var _defs := {}
static var _streams := {}

static func _def(id: String) -> Dictionary:
	if _defs.is_empty():
		_index("sounds")
	return _defs.get(id, {})

static func _index(dir: String) -> void:
	var d := DirAccess.open(RAW + dir)
	if d == null:
		return
	for f in d.get_files():
		if f.ends_with(".json"):
			var j = JSON.parse_string(load("res://core/cm_data.gd").text(RAW + dir + "/" + f))
			if j is Dictionary and j.has("id"):
				_defs[str(j["id"])] = j
	for sub in d.get_directories():
		_index(dir + "/" + sub)

static func play(parent: Node, id: String, vol_db := 0.0, pitch := 1.0) -> void:
	if id == "" or parent == null or not parent.is_inside_tree():
		return
	var d := _def(id)
	var files: Array = d.get("sounds", [])
	if files.is_empty():
		return
	var f := str(files[randi() % files.size()].get("file", ""))
	if not _streams.has(f):
		_streams[f] = AudioStreamOggVorbis.load_from_file(RAW + f)
	var p := AudioStreamPlayer.new()
	p.stream = _streams[f]
	p.volume_db = vol_db + linear_to_db(float(d.get("volume", 1.0))) - 4.0
	p.pitch_scale = pitch * randf_range(0.96, 1.04)
	p.bus = "SFX" if AudioServer.get_bus_index("SFX") >= 0 else "Master"
	parent.add_child(p)
	p.play()
	p.finished.connect(p.queue_free)
