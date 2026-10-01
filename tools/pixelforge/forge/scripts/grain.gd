extends Control
## scripts/grain.gd: the page behind everything: a faint vignette and a slow drift of ash, so the dark is not flat.

var t := 0.0
var ash: Array = []

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	for i in 26:
		ash.append([rng.randf() * 640.0, rng.randf() * 360.0, 3.0 + rng.randf() * 6.0, rng.randf() * TAU])

func _process(dt: float) -> void:
	t += dt
	for a in ash:
		a[1] += a[2] * dt
		a[0] += sin(t * 0.4 + a[3]) * 4.0 * dt
		if a[1] > size.y + 2.0:
			a[1] = -2.0
			a[0] = randf() * size.x
	queue_redraw()

func _draw() -> void:
	var s := size
	# the vignette: stepped, as the game draws its veils
	for i in 8:
		var k := float(i) / 8.0
		var c := Color(0, 0, 0, 0.22 * (1.0 - k))
		draw_rect(Rect2(0, i * 6.0, s.x, 6.0), c)
		draw_rect(Rect2(0, s.y - (i + 1) * 6.0, s.x, 6.0), c)
		draw_rect(Rect2(i * 8.0, 0, 8.0, s.y), Color(0, 0, 0, 0.16 * (1.0 - k)))
		draw_rect(Rect2(s.x - (i + 1) * 8.0, 0, 8.0, s.y), Color(0, 0, 0, 0.16 * (1.0 - k)))
	for a in ash:
		draw_rect(Rect2(roundf(a[0]), roundf(a[1]), 1, 1), Color(0.42, 0.40, 0.46, 0.35))
