class_name PFFx
extends RefCounted
## Effect strips made by `pixelforge vfx` (a manifest `fx.json` next to the PNGs, as `make_fx.py` writes it,
## or a single `<name>.json`). `PFFx.spawn(parent, "res://art/fx", "lantern_flame", pos, 2.0)` adds an
## AnimatedSprite2D anchored at the effect's ground point / centre. One-shots free themselves.

static var _cache := {}

static func _meta(dir: String, name: String) -> Dictionary:
	var key := dir + "/" + name
	if _cache.has(key):
		return _cache[key]
	var e := {}
	var mf := FileAccess.open(dir + "/fx.json", FileAccess.READ)
	if mf:
		var d = JSON.parse_string(mf.get_as_text())
		if d is Dictionary and d.has(name):
			e = d[name]
	if e.is_empty():
		var f := FileAccess.open(dir + "/" + name + ".json", FileAccess.READ)
		if f:
			var d2 = JSON.parse_string(f.get_as_text())
			if d2 is Dictionary:
				e = d2
				e["png"] = dir + "/" + name + ".png"
	_cache[key] = e
	return e

static func frames_for(dir: String, name: String) -> SpriteFrames:
	var e := _meta(dir, name)
	var sf := SpriteFrames.new()
	if e.is_empty():
		return sf
	var tex: Texture2D = load(e["png"])
	var w := int(e["frame_width"])
	var h := int(e["size"][1])
	sf.add_animation("play")
	sf.set_animation_speed("play", maxf(float(e.get("fps", 8)), 0.01))
	sf.set_animation_loop("play", bool(e.get("loop", true)))
	for i in int(e["frames"]):
		var at := AtlasTexture.new()
		at.atlas = tex
		at.region = Rect2(i * w, 0, w, h)
		sf.add_frame("play", at)
	return sf

static func spawn(parent: Node, dir: String, name: String, pos: Vector2, scale: float = 1.0, z: int = 0) -> AnimatedSprite2D:
	var e := _meta(dir, name)
	if e.is_empty():
		push_warning("PFFx: no effect " + name + " in " + dir)
		return null
	var sp := AnimatedSprite2D.new()
	sp.sprite_frames = frames_for(dir, name)
	sp.animation = "play"
	sp.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	sp.centered = false
	sp.offset = -Vector2(float(e["anchor"][0]), float(e["anchor"][1]))
	sp.scale = Vector2(scale, scale)
	sp.position = pos
	sp.z_index = z
	parent.add_child(sp)
	sp.play("play")
	if not bool(e.get("loop", true)):
		sp.animation_finished.connect(sp.queue_free)
	return sp
