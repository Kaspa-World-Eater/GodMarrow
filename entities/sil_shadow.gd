class_name SilShadow
extends Sprite2D
## A figure's silhouette shadow laid on the ground (checklist 7: "the hero's silhouette shadow (lantern, flames, sun);
## lantern-cast monster shadows"). It copies its figure's current frame, black, and leans it away from the light that
## throws it: the sun by day, the hero's lantern by night (and for every creature in its reach).

var src: AnimSprite
var owner_node: Node2D       # the figure (hero or monster), for its tile position
var is_hero := false
var base_a := 0.42

func _init(s: AnimSprite, who: Node2D, hero_flag: bool) -> void:
	src = s
	owner_node = who
	is_hero = hero_flag
	centered = false
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	# it lives on the zone's shadow layer (under all standing things, over the ground), following its figure

func _process(_dt: float) -> void:
	if src == null or not is_instance_valid(src) or not src.visible:
		visible = false
		return
	texture = src.texture
	offset = src.offset
	flip_h = src.flip_h
	if owner_node == null or not is_instance_valid(owner_node) or owner_node.is_queued_for_deletion():
		queue_free()
		return
	var zone = owner_node.get("zone")
	if zone == null or owner_node.get("dead") == true or owner_node.get("buried") == true:
		visible = false
		return
	var outdoor: bool = zone.d.get("outdoor", false)
	var dk := Game.day_k() if outdoor else 0.0
	var dir := Vector2.ZERO        # screen direction the shadow falls (the figure's head goes this way)
	var k := 0.0                   # its length (1 = as tall as the figure)
	var a := 0.0
	var hero = zone.hero_ref
	var tp: Vector2 = owner_node.get("tp")
	if is_hero:
		if dk > 0.3:
			# the sun: from the upper left; long at the day's ends
			dir = Vector2(0.85, 0.45)
			k = lerpf(2.1, 1.15, clampf((dk - 0.3) / 0.7, 0.0, 1.0))
			a = 0.42 * clampf((dk - 0.3) * 2.0, 0.0, 1.0)
		if dk < 0.8:
			# the lantern hangs beside him: a short shadow falls away from it
			var la := 0.4 * (1.0 - dk)
			if la > a:
				dir = Vector2(-0.7, 0.35)
				var ln = owner_node.get("lantern")
				if ln != null and is_instance_valid(ln):
					var sv := Iso.to_screen(tp - ln.tp)
					if sv.length() > 1.0:
						dir = Vector2(sv.x, sv.y * 0.6).normalized()
				k = 1.0
				a = la
	elif hero != null and is_instance_valid(hero) and not hero.dead:
		var lamp: Vector2 = hero.lantern.tp if hero.lantern and is_instance_valid(hero.lantern) else hero.tp + Vector2(0.25, -0.1)
		var dv: Vector2 = tp - lamp
		var d := dv.length()
		var R: float = hero.light_radius() * 0.55
		if d < R and d > 0.05:
			var s := Iso.to_screen(dv).normalized()
			dir = Vector2(s.x, s.y * 0.6).normalized()
			k = clampf(0.5 + d / R * 1.4, 0.5, 1.9)
			a = base_a * clampf((R - d) / (R * 0.35), 0.0, 1.0)
		if dk > 0.3 and a < 0.22 * dk:
			dir = Vector2(0.85, 0.45)
			k = 0.9
			a = 0.34 * clampf((dk - 0.3) * 2.0, 0.0, 1.0)
	if a <= 0.01:
		visible = false
		return
	visible = true
	# the upward axis of the sprite (-y) is laid along dir, flattened onto the ground
	transform = Transform2D(Vector2(1.0, 0.0), -dir * k * 0.9, owner_node.global_position)
	modulate = Color(0.02, 0.02, 0.05, a)
	if OS.get_cmdline_user_args().has("--shred"):
		modulate = Color(1, 0, 0, 1)
