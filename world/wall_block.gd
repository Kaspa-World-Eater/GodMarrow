class_name WallBlock
extends Node2D
## A cliff, dungeon wall or ruin cell: an iso block with two lit faces and a top, textured with the painted wtex
## textures at 3 texels per world px, mirrored-tiling, following the face slope (zz_walls63.js). Palisades are stakes.

var tile := Vector2i.ZERO
var kind := "cliff"
var height := 256.0
var face_tex: Texture2D
var top_tex: Texture2D
var show_left := true
var show_right := true
var fade := 1.0
var _fade_to := 1.0

func _ready() -> void:
	texture_repeat = CanvasItem.TEXTURE_REPEAT_MIRROR
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST

func set_cut(on: bool) -> void:
	_fade_to = 0.28 if on else 1.0

func _process(dt: float) -> void:
	if absf(fade - _fade_to) > 0.01:
		fade = move_toward(fade, _fade_to, dt * 3.0)
		modulate.a = fade
		set_process(true)
	elif fade == _fade_to:
		set_process(false)

func _uv_face(p: Vector2, slope: float) -> Vector2:
	# world px of the global point, then 3 texels per world px over a 122 px texture
	var g := (global_position + p) / Iso.WPX
	return Vector2(g.x * 3.0 / 122.0, (g.y + slope * g.x * 0.5) * 3.0 / 122.0)

func _uv_top(p: Vector2) -> Vector2:
	var g := (global_position + p) / Iso.WPX
	return Vector2(g.x * 3.0 / 122.0, g.y * 3.0 / 122.0)

func _draw() -> void:
	var N := Vector2(0, -Iso.HY)
	var E := Vector2(Iso.HX, 0)
	var S := Vector2(0, Iso.HY)
	var W := Vector2(-Iso.HX, 0)
	var H := Vector2(0, -height)
	if kind == "palisade":
		_stakes()
		return
	var lc := Color(0.6, 0.58, 0.56)
	var rc := Color(0.8, 0.78, 0.75)
	if show_left:
		var pts := PackedVector2Array([W, S, S + H, W + H])
		if face_tex:
			draw_polygon(pts, PackedColorArray([lc, lc, lc, lc]), PackedVector2Array(Array(pts).map(func(p): return _uv_face(p, -1.0))), face_tex)
		else:
			draw_colored_polygon(pts, Color(0.16, 0.15, 0.14))
	if show_right:
		var pts2 := PackedVector2Array([S, E, E + H, S + H])
		if face_tex:
			draw_polygon(pts2, PackedColorArray([rc, rc, rc, rc]), PackedVector2Array(Array(pts2).map(func(p): return _uv_face(p, 1.0))), face_tex)
		else:
			draw_colored_polygon(pts2, Color(0.22, 0.2, 0.19))
	var top := PackedVector2Array([N + H, E + H, S + H, W + H])
	if top_tex:
		# the web lays the texture over the block's own dark colour (70% base, the texture only for grain): pale stone tops
		# must read as shadowed stone, not bright paving
		var tc := Color(0.46, 0.44, 0.45) if top_tex.resource_path.contains("top_stone") else Color(0.85, 0.85, 0.85)
		draw_polygon(top, PackedColorArray([tc, tc, tc, tc]), PackedVector2Array(Array(top).map(func(p): return _uv_top(p))), top_tex)
	elif face_tex:
		draw_polygon(top, PackedColorArray([Color(0.9, 0.9, 0.9), Color(0.9, 0.9, 0.9), Color(0.9, 0.9, 0.9), Color(0.9, 0.9, 0.9)]), PackedVector2Array(Array(top).map(func(p): return _uv_top(p))), face_tex)
	# a dark line where the faces meet the ground and each other
	draw_line(W, S, Color(0, 0, 0, 0.5), 2.0)
	draw_line(S, E, Color(0, 0, 0, 0.5), 2.0)
	draw_line(S, S + H, Color(0, 0, 0, 0.25), 1.0)

func _stakes() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = tile.x * 7919 + tile.y * 104729
	for i in 4:
		var q := float(i) / 3.0
		var base := Vector2(-Iso.HX, 0).lerp(Vector2(0, Iso.HY), q) * 0.8
		var hh := rng.randf_range(120, 160)
		var wd := 14.0
		var c := Color(0.2, 0.15, 0.11).lerp(Color(0.3, 0.23, 0.16), rng.randf())
		draw_colored_polygon(PackedVector2Array([base + Vector2(-wd * 0.5, 0), base + Vector2(wd * 0.5, 0), base + Vector2(wd * 0.5, -hh), base + Vector2(0, -hh - 18), base + Vector2(-wd * 0.5, -hh)]), c)
		draw_line(base + Vector2(-wd * 0.5, -hh * 0.6), base + Vector2(wd * 0.5, -hh * 0.62), Color(0.35, 0.3, 0.22), 2.0)
