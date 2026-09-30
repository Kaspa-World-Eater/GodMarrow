class_name ScatterLayer
extends Node2D
## Ground litter (leaves, twigs, stones, bone chips, black glass...): drawn flat, in one batch, at grain 2.
var items: Array = []
var texs := {}

func _ready() -> void:
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST

func _draw() -> void:
	for it in items:
		var tex: Texture2D = texs.get(it[2])
		if tex == null:
			continue
		var s := Iso.to_screen(Vector2(it[0], it[1]))
		var sz := Vector2(tex.get_width(), tex.get_height()) * (Iso.WPX / 2.0)
		var tl := s + Vector2(-sz.x * 0.5, -sz.y + Iso.WPX)
		var flip: bool = it.size() > 3 and bool(it[3])
		if flip:
			draw_set_transform(Vector2(tl.x + sz.x, tl.y), 0.0, Vector2(-1, 1))
			draw_texture_rect(tex, Rect2(Vector2.ZERO, sz), false)
			draw_set_transform(Vector2.ZERO)
		else:
			draw_texture_rect(tex, Rect2(tl, sz), false)
