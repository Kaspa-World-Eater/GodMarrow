extends SceneTree
## tools/test_detail.gd: headless checks of the Detail bench's own rules (no pipeline): the grey level of a texel and
## back (the same rule as pixelforge.shapes.encode_detail), a tool's footprint clipped to the grid, painting and the
## undo of a stroke, the shade order. Exit code 1 when any check fails.
##   godot --headless --path tools/pixelforge/forge --script res://tools/test_detail.gd

const Detail := preload("res://scripts/screens/detail.gd")

var fails := 0
var checks := 0

func ok(cond: bool, what: String) -> void:
	checks += 1
	if not cond:
		fails += 1
		print("FAIL ", what)

func _init() -> void:
	# grey levels: 128 is no change, 32 a step, 0 a seed; every offset survives the round trip
	ok(Detail.grey_of(0) == 128 and Detail.grey_of(1) == 160 and Detail.grey_of(-3) == 32 and Detail.grey_of(3) == 224, "grey levels of the steps")
	ok(Detail.grey_of(Detail.SEED) == 0 and Detail.offset_of(0) == Detail.SEED, "a seed is grey 0")
	for off in [-3, -2, -1, 0, 1, 2, 3, Detail.SEED]:
		ok(Detail.offset_of(Detail.grey_of(off)) == off, "round trip %d" % off)
	ok(Detail.offset_of(255) == 3 and Detail.offset_of(1) == -3 and Detail.offset_of(140) == 0, "levels between the steps round to the nearest")
	# footprints: the pencil is one texel, a brush of n a square of n, clipped at the edges
	ok(Detail.footprint(3, 2, 1, 8, 8) == PackedInt32Array([19]), "the pencil paints one texel")
	ok(Detail.footprint(3, 2, 2, 8, 8).size() == 4 and Detail.footprint(3, 2, 3, 8, 8).size() == 9, "brushes 2 and 3")
	ok(Detail.footprint(0, 0, 3, 8, 8).size() == 4 and Detail.footprint(7, 7, 4, 8, 8).size() == 4, "a brush is clipped at the corners")
	ok(Detail.footprint(-1, 0, 1, 8, 8).is_empty(), "outside the grid paints nothing")
	# a stroke and its undo, on a bench without the app
	var d: Control = Detail.new()
	d.state = {"model": "", "part": "hat", "direction": "S", "tool": 2, "shade": -2, "title": ""}
	d.parts = [{"name": "hat", "size": [6, 5], "ramp": ["#101010", "#303030", "#505050", "#707070", "#909090"], "class": "hair", "stock": true}]
	d.tw = 6
	d.th = 5
	d.grid = PackedInt32Array()
	d.grid.resize(30)
	d.grid.fill(0)
	d.stroke_begin()
	d.paint_at(2, 2, false)
	var painted := 0
	for v in d.grid:
		if v == -2:
			painted += 1
	ok(painted == 9 and d.dirty, "a brush of 3 paints nine texels of the shade (%d)" % painted)
	ok(d.texel_colour(0) == Color("#505050") and d.texel_colour(2) == Color("#909090") and d.texel_colour(-3) == Color("#101010"), "a texel's colour is the ramp step moved by the offset")
	ok(d.texel_colour(Detail.SEED) != d.texel_colour(-3), "a seed is marked apart from the darkest step")
	d.undo_stack.append(d.stroke_before.duplicate())
	d.grid = d.undo_stack.pop_back()
	var left := 0
	for v in d.grid:
		if v != 0:
			left += 1
	ok(left == 0, "undo puts the texture back")
	d.paint_at(0, 0, true)
	ok(d.grid[0] == 0, "the right button erases to no change")
	d.free()
	print("detail checks: %d run, %d failed" % [checks, fails])
	quit(1 if fails > 0 else 0)
