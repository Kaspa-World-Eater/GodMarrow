extends Node
## A great tree or stone that stands between the eye and the pilgrim thins to a ghost of itself while it hides them, and
## comes back when they have passed (Diablo's see-through walls; Derek 2026-10-05 wants the trees huge, so this keeps
## the pilgrim and the creatures round them in sight). zone.gd fills `props` with [holder, CmFrames] for each big one.

var zone
var props: Array = []
var _fade := {}          # holder -> current alpha

func _process(dt: float) -> void:
	var sc = get_tree().current_scene
	var h = sc.get("hero") if sc else null
	if h == null or not is_instance_valid(h):
		return
	var hp: Vector2 = h.global_position
	var body := Rect2(hp + Vector2(-40, -150), Vector2(80, 150))
	for e in props:
		var holder: Node2D = e[0]
		var cn = e[1]
		if not is_instance_valid(holder) or cn == null or not is_instance_valid(cn) or cn.spr == null:
			continue
		var want := 1.0
		# in front of the pilgrim (drawn after them) and over them
		if holder.global_position.y > hp.y + 4.0 and absf(holder.global_position.x - hp.x) < 900.0:
			var r: Rect2 = cn.spr.get_global_transform() * cn.spr.get_rect()
			if r.intersects(body):
				want = 0.38
		var a: float = _fade.get(holder, 1.0)
		if absf(a - want) > 0.005:
			a = move_toward(a, want, dt * 2.5)
			_fade[holder] = a
			holder.modulate.a = a
