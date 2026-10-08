extends RefCounted
## A zone painted whole (tools/worldgen/bog_bake.py: the Sunken Bog, every chunk through the bog scene's engine) in
## art/zones/<zone>_s<seed>/: the ground drawn over the tile ground; what stands up off it (the hut, the stones, the
## racks, the drowned trunks, the reeds, the loose bone) cut into bands by depth, each band sorted with the bodies;
## and the floor's height, which core/iso.gd lifts every body onto (the Back stands out of the water). --baked=0
## switches it off.

static func dir_for(z) -> String:
	var sc = Engine.get_main_loop().current_scene
	if sc and sc.get("args") is Dictionary and str(sc.args.get("baked", "1")) == "0":
		return ""
	var d := "res://art/zones/%s_s%d" % [z.id, z.seed]
	return d if FileAccess.file_exists(d + "/index.json") else ""

static func _tex(path: String) -> Texture2D:
	if ResourceLoader.exists(path):
		return load(path)
	var img := Image.load_from_file(ProjectSettings.globalize_path(path))
	return ImageTexture.create_from_image(img) if img else null

## lay the baked land into zone z; false when it has none (the tile ground stands alone)
static func build(z) -> bool:
	Iso.clear_lift()
	var d := dir_for(z)
	if d == "":
		return false
	var f := FileAccess.open(d + "/index.json", FileAccess.READ)
	var idx = JSON.parse_string(f.get_as_text()) if f else null
	if not (idx is Dictionary):
		return false
	# the floor's height: one byte a half yard
	var hz: Dictionary = idx.get("height", {})
	if not hz.is_empty():
		var img := Image.load_from_file(ProjectSettings.globalize_path(d + "/" + str(hz["file"])))
		if img:
			img.convert(Image.FORMAT_L8)
			var raw := img.get_data()
			var zs := PackedFloat32Array()
			zs.resize(raw.size())
			var k := float(hz["k"])
			var z0 := float(hz["z0"])
			for i in raw.size():
				zs[i] = raw[i] * k + z0
			Iso.set_lift(zs, img.get_width(), img.get_height(), float(hz["res"]), float(hz["lift"]))
	var sc: float = float(idx.get("scale", 4))
	var mat := ShaderMaterial.new()
	mat.shader = load("res://shaders/baked_ground.gdshader")
	var ground := Node2D.new()
	ground.name = "BakedGround"
	ground.z_index = -90
	z.add_child(ground)
	var bands := 0
	for c in idx["chunks"]:
		var pos := Vector2(c["pos"][0], c["pos"][1])
		var t := _tex(d + "/" + str(c["file"]))
		if t:
			var s := Sprite2D.new()
			s.texture = t
			s.centered = false
			s.scale = Vector2(sc, sc)
			s.position = pos
			s.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
			s.material = mat
			ground.add_child(s)
		if str(c.get("up", "")) == "":
			continue
		var at := _tex(d + "/" + str(c["up"]))
		if at == null:
			continue
		for b in c["bands"]:
			# each band sorts where a body of the same depth on the same floor would (bog_bake.py: depth less lift)
			var a := AtlasTexture.new()
			a.atlas = at
			a.region = Rect2(0, b["ay"], b["w"], b["h"])
			var top := pos + Vector2(b["x"], b["y"]) * sc
			var s2 := Sprite2D.new()
			s2.texture = a
			s2.centered = false
			s2.scale = Vector2(sc, sc)
			s2.position = Vector2(top.x, float(b["d"]) * Iso.HY)
			s2.offset = Vector2(0, (top.y - s2.position.y) / sc)
			s2.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
			z.sorted.add_child(s2)
			bands += 1
	print("baked ground: %d chunks, %d sorted bands from %s" % [idx["chunks"].size(), bands, d])
	return true
