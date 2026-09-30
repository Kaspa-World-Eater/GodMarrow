extends Node
## Autoload "Data": the tables exported from the web build (tools/export_data.js), loaded on first use,
## and the sprite atlases (tools/export_sprites.js).

var _json := {}
var _sets := {}

func table(name: String) -> Variant:
	if not _json.has(name):
		var f := FileAccess.open("res://data/%s.json" % name, FileAccess.READ)
		_json[name] = JSON.parse_string(f.get_as_text()) if f else {}
	return _json[name]

func zone_index() -> Dictionary:
	if not _json.has("zones_index"):
		var f := FileAccess.open("res://data/zones/index.json", FileAccess.READ)
		_json["zones_index"] = JSON.parse_string(f.get_as_text()) if f else {}
	return _json["zones_index"]

func zone(id: String, seed: int) -> Dictionary:
	var f := FileAccess.open("res://data/zones/%s_s%d.json" % [id, seed], FileAccess.READ)
	return JSON.parse_string(f.get_as_text()) if f else {}

func zone_seeds(id: String) -> Array:
	var z: Dictionary = zone_index().get("zones", {}).get(id, {})
	return z.get("seeds", [12345, 777, 4242])

## a sprite atlas: {anim/view -> [[AtlasTexture, Vector2 offset], ...]}, plus meta
func sprite_set(kind: String) -> SpriteSet:
	if _sets.has(kind):
		return _sets[kind]
	var s := SpriteSet.new()
	s.load_kind(kind)
	_sets[kind] = s
	return s
