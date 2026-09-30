class_name Fx
extends RefCounted
## small effects: dark blood that falls and stays a while. No glow, nothing bright.

static func blood(parent: Node, pos: Vector2, dir: Vector2, n: int) -> void:
	var p := CPUParticles2D.new()
	p.one_shot = true
	p.emitting = true
	p.amount = n * 3
	p.lifetime = 0.7
	p.explosiveness = 0.95
	p.direction = dir if dir.length() > 0.1 else Vector2.UP
	p.spread = 55.0
	p.initial_velocity_min = 40.0
	p.initial_velocity_max = 110.0
	p.gravity = Vector2(0, 260)
	p.scale_amount_min = 1.2
	p.scale_amount_max = 2.4
	p.color = Color(0.22, 0.03, 0.03)
	p.position = pos
	p.z_index = 5
	parent.add_child(p)
	p.finished.connect(p.queue_free)
	# a few drops stay on the ground
	for i in n:
		var s := Polygon2D.new()
		var r := randf_range(1.2, 3.2)
		var pts := PackedVector2Array()
		for k in 7:
			var a := k / 7.0 * TAU
			pts.append(Vector2(cos(a) * r * randf_range(0.7, 1.3), sin(a) * r * 0.5 * randf_range(0.7, 1.3)))
		s.polygon = pts
		s.color = Color(0.16, 0.02, 0.02, 0.85)
		s.position = pos + Vector2(randf_range(-14, 14) + dir.x * 12.0, 26 + randf_range(-5, 5))
		s.z_index = -50
		parent.add_child(s)
		var tw: Tween = s.create_tween()
		tw.tween_interval(randf_range(14, 22))
		tw.tween_property(s, "modulate:a", 0.0, 3.0)
		tw.tween_callback(s.queue_free)
