extends "res://scripts/screen.gd"
## The boot card: the name, a lantern, one line. Any key skips it; it goes to Home on its own.

var t := 0.0
var card: Control
var holding := false

func build() -> void:
	header.visible = false
	footer.visible = false
	holding = args.get("screen", "") == "boot"
	card = Control.new()
	card.size_flags_vertical = Control.SIZE_EXPAND_FILL
	card.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card.draw.connect(_draw_card)
	body.add_child(card)

func _process(dt: float) -> void:
	t += dt
	card.queue_redraw()
	if not holding and t > 2.2 and not app.transitioning:
		holding = true
		app.home()

func _input(ev: InputEvent) -> void:
	if (ev is InputEventKey or ev is InputEventMouseButton or ev is InputEventJoypadButton) and ev.pressed and t > 0.4 and not holding:
		holding = true
		app.home()

func _flick(s: float) -> float:
	return 0.5 + 0.5 * sin(t * 9.0 + s) * sin(t * 5.3 + s * 2.0)

func _draw_card() -> void:
	var s := card.size
	var fade := clampf(t / 0.9, 0.0, 1.0)
	var cx := s.x / 2.0
	var cy := s.y / 2.0 - 10.0
	var sc := FT.font("sc")
	var it := FT.font("italic")
	var px := FT.font("pixel")
	# the lantern: an iron cage, an amber flame, the only glow on the page
	var g := 0.85 + 0.15 * _flick(0.3)
	var lx := cx - 118.0
	var ly := cy - 6.0
	for i in 5:
		var r := 10.0 + i * 7.0
		card.draw_rect(Rect2(lx - r, ly - r, r * 2, r * 2), Color(FT.AMBER, 0.045 * g * fade * (1.0 - i / 5.0)))
	card.draw_rect(Rect2(lx - 6, ly - 12, 12, 22), Color(FT.SEAM, fade))
	card.draw_rect(Rect2(lx - 5, ly - 11, 10, 20), Color("#1a1510", fade))
	card.draw_rect(Rect2(lx - 3, ly - 4 + (1.0 - g) * 3.0, 6, 9 - (1.0 - g) * 3.0), Color(FT.AMBER, fade))
	card.draw_rect(Rect2(lx - 1, ly - 1, 2, 5), Color("#fff1b0", fade * g))
	card.draw_rect(Rect2(lx - 7, ly - 14, 14, 2), Color(FT.IRON_L, fade))
	card.draw_rect(Rect2(lx - 1, ly - 18, 2, 4), Color(FT.IRON_L, fade))
	card.draw_rect(Rect2(lx - 7, ly + 10, 14, 2), Color(FT.IRON_L, fade))
	# the name
	var name := "PIXELFORGE"
	var fs := 30
	var w := sc.get_string_size(name, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
	card.draw_string(sc, Vector2(cx - w / 2.0 + 2, cy + 2), name, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(0, 0, 0, 0.8 * fade))
	card.draw_string(sc, Vector2(cx - w / 2.0, cy), name, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(FT.TEXT, fade))
	# the rule with its diamonds
	var rw := w + 24.0
	card.draw_rect(Rect2(cx - rw / 2.0, cy + 8, rw, 1), Color(FT.SEAM, fade))
	card.draw_rect(Rect2(cx - rw / 2.0, cy + 9, rw, 1), Color(FT.IRON_L, 0.6 * fade))
	card.draw_rect(Rect2(cx - rw / 2.0 - 2, cy + 7, 3, 3), Color(FT.TEAL, fade))
	card.draw_rect(Rect2(cx + rw / 2.0 - 1, cy + 7, 3, 3), Color(FT.TEAL, fade))
	var lede := "Paintings in. Game art out."
	var lw := it.get_string_size(lede, HORIZONTAL_ALIGNMENT_LEFT, -1, 12).x
	card.draw_string(it, Vector2(cx - lw / 2.0, cy + 28), lede, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(FT.MUTED, fade))
	var sub := "The forge of Godmarrow"
	var sw := px.get_string_size(sub, HORIZONTAL_ALIGNMENT_LEFT, -1, 8).x
	card.draw_string(px, Vector2(cx - sw / 2.0, cy + 46), sub, HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color(FT.DIM, fade))
	if t > 1.0:
		var k := clampf((t - 1.0) / 0.5, 0.0, 1.0) * (0.6 + 0.4 * sin(t * 3.0))
		var hint_s := "press any key"
		var hw := px.get_string_size(hint_s, HORIZONTAL_ALIGNMENT_LEFT, -1, 8).x
		card.draw_string(px, Vector2(cx - hw / 2.0, s.y - 18), hint_s, HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color(FT.FAINT, k))
