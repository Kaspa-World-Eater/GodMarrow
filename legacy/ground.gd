extends Sprite2D
## The ground of one land, drawn as one huge repeating sprite with a mixing shader (shaders/ground.gdshader).

func build(land: String, area: Rect2, road_y: float, camp: Vector2) -> void:
	var g := Assets.ground(land)
	var mains: Array = g.get("main", [])
	texture = Assets.tex(mains[0])
	texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	centered = false
	region_enabled = true
	# painted at twice the world grain
	scale = Vector2(0.5, 0.5)
	position = area.position
	region_rect = Rect2(Vector2.ZERO, area.size * 2.0)
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/ground.gdshader")
	m.set_shader_parameter("main_b", Assets.tex(mains[mains.size() - 1]))
	m.set_shader_parameter("dirt", Assets.tex(g.get("dirt", mains)[0]))
	m.set_shader_parameter("road", Assets.tex(g.get("road", mains)[0]))
	m.set_shader_parameter("road_y", road_y)
	m.set_shader_parameter("camp", camp)
	material = m
	z_index = -100
