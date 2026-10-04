extends RefCounted
const Doc := preload("res://scripts/editor/document.gd")
## scripts/editor/anchors.gd: effects dropped on a frame. An anchor is a point on the figure where an effect from
## the library (the effects bench's kinds and spell presets) sits; it follows through the clip and the directions
## by frame index, and by its part's centroid when the render wrote part masks. Anchors live in the project's frame
## data (`<root>/anchors.json`) so the export can bake them; `bake` writes the list into the export's JSON (a stub:
## the game does not read it yet).

const LIBRARY := ["fire", "smoke", "wisp", "burst", "embers", "ring", "bolt", "slash", "circle", "cloud", "shards", "pillar", "flash", "ward",
	"vortex", "lightning", "swarm", "rune", "pool", "nova", "fireball", "soul_drain", "bone_shatter", "lightning_strike"]

var root := ""
var list: Array = []     # [{id, effect, clip, dir, frame, x, y, scale, rotation, part, levers}]
var next_id := 1

func load(root_: String) -> void:
	root = root_
	list = []
	next_id = 1
	var f := FileAccess.open(root.path_join("anchors.json"), FileAccess.READ)
	if f:
		var d = JSON.parse_string(f.get_as_text())
		if d is Dictionary and d.get("anchors") is Array:
			list = d["anchors"]
			for a in list:
				next_id = maxi(next_id, int(a.get("id", 0)) + 1)

func save() -> bool:
	if root == "":
		return false
	var f := FileAccess.open(root.path_join("anchors.json"), FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify({"anchors": list, "version": 1}, " "))
	return true

func snapshot() -> Array:
	return list.duplicate(true)

func restore(snap: Array) -> void:
	list = snap.duplicate(true)

## a new anchor at (x, y) on the frame showing; `part` is the part id under it when masks exist (-1 otherwise)
func add(effect: String, key: String, frame: int, x: int, y: int, part: int) -> Dictionary:
	var a := {"id": next_id, "effect": effect, "clip": Doc.clip_of(key), "dir": "all", "frame": frame, "x": x, "y": y,
		"scale": 1.0, "rotation": 0.0, "part": part, "levers": {"strength": 1.0, "speed": 1.0}}
	next_id += 1
	list.append(a)
	return a

func by_id(id: int) -> Dictionary:
	for a in list:
		if int(a.get("id", -1)) == id:
			return a
	return {}

func remove(id: int) -> bool:
	for i in list.size():
		if int(list[i].get("id", -1)) == id:
			list.remove_at(i)
			return true
	return false

## the anchors that show on a frame: the clip's, for every direction or this one
func on_frame(key: String) -> Array:
	var out := []
	var clip := Doc.clip_of(key)
	var dir := Doc.dir_of(key)
	for a in list:
		if String(a.get("clip", "")) == clip and (String(a.get("dir", "all")) == "all" or String(a.get("dir", "")) == dir):
			out.append(a)
	return out

## where an anchor sits on a frame: its point, shifted by how its part moved since the frame it was dropped on
## (part masks), else the same place (the renders are deterministic frame for frame)
func place(a: Dictionary, doc: Doc, f: Doc.Frame) -> Vector2i:
	var p := Vector2i(int(a.get("x", 0)), int(a.get("y", 0)))
	var part := int(a.get("part", -1))
	if part < 0 or f == null:
		return p
	var here := doc.parts_of(f)
	var home := doc.parts_of(doc.frame(f.key, int(a.get("frame", 0))))
	if here == null or home == null:
		return p
	var c1 := _centroid(here, part)
	var c0 := _centroid(home, part)
	if c0.x < 0 or c1.x < 0:
		return p
	return p + (c1 - c0)

static func _centroid(parts: Image, part: int) -> Vector2i:
	var sx := 0
	var sy := 0
	var n := 0
	for y in parts.get_height():
		for x in parts.get_width():
			if Doc.part_at(parts, x, y) == part:
				sx += x
				sy += y
				n += 1
	return Vector2i(sx / n, sy / n) if n > 0 else Vector2i(-1, -1)

## the export stub: the anchor list beside the sheets, and into the export's JSON when one exists
func bake(export_dir: String, name: String) -> Dictionary:
	var out := {"anchors": list, "name": name, "baked": false, "note": "anchors listed; the game's loader does not read effect anchors yet"}
	DirAccess.make_dir_recursive_absolute(export_dir)
	var side := export_dir.path_join(name + ".anchors.json")
	var f := FileAccess.open(side, FileAccess.WRITE)
	if f == null:
		return {"ok": false, "error": "Could not write " + side}
	f.store_string(JSON.stringify(out, " "))
	var sheet_json := export_dir.path_join(name + ".json")
	var merged := false
	if FileAccess.file_exists(sheet_json):
		var d := Doc._read_json(sheet_json)
		if not d.is_empty():
			d["effects"] = list
			var g := FileAccess.open(sheet_json, FileAccess.WRITE)
			if g:
				g.store_string(JSON.stringify(d, " "))
				merged = true
	return {"ok": true, "file": side, "merged": merged, "count": list.size()}
