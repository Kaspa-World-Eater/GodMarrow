extends SceneTree
## tools/test_scene.gd: headless checks of the picture window and the request rules behind it (no pipeline).
##   godot --headless --path tools/pixelforge/forge --script res://tools/test_scene.gd
## The window holds one still however many times show_still is called (the facing wheel's "stacked models");
## a tall figure stands at a half instead of cut off; a Wheel commits its angle in degrees (the mouse paths);
## a screen's requests debounce, wait for a running job (the last one wins) and mark older tickets stale.
## Exit code 1 when any check fails.

const Scene := preload("res://scripts/scene.gd")
const Screen := preload("res://scripts/screen.gd")
const W := preload("res://scripts/widgets.gd")

var fails := 0
var checks := 0
var calls: Array = []

func ok(cond: bool, what: String) -> void:
	checks += 1
	if not cond:
		fails += 1
		print("FAIL ", what)

func _init() -> void:
	test_one_still()
	test_frames_and_fit()
	test_wheel_commit()
	test_tickets()
	_async()

func _async() -> void:
	await process_frame   # _init runs before the tree is up; the request rules need nodes inside it
	await test_requests()
	print("scene checks: %d run, %d failed" % [checks, fails])
	quit(1 if fails > 0 else 0)

static func _tex(w: int, h: int) -> ImageTexture:
	var img := Image.create(w, h, false, Image.FORMAT_RGBA8)
	img.fill(Color(0.5, 0.3, 0.6, 1.0))
	return ImageTexture.create_from_image(img)

func _scene() -> Control:
	var sc: Control = Scene.new()
	root.add_child(sc)
	sc.size = Vector2(596, 140)
	return sc

## the facing wheel turned N times: N stills shown, one figure in the window, the last one
func test_one_still() -> void:
	var sc := _scene()
	ok(sc.figures() == 0, "an empty window has no figure")
	var last: ImageTexture = null
	for i in 5:
		last = _tex(40 + i, 60)
		sc.show_still(last, Vector2(20, 60), [], "facing %d" % i)
	ok(sc.figures() == 1, "five stills in a row leave one figure (%d)" % sc.figures())
	ok(sc.still_tex == last and sc.still_tex.get_width() == 44, "the last still is the one that stands")
	ok(sc.mode == "still" and sc.frames.is_empty() and sc.picture == null, "a still clears the other kinds")
	sc.show_frames([_tex(30, 50), _tex(30, 50)], 12.0, 50.0, 15.0)
	sc.show_still(_tex(32, 48), Vector2(16, 48))
	ok(sc.figures() == 1 and sc.frames.is_empty(), "a still after a clip leaves one figure and no frames")
	sc.queue_free()

## the clip's playback sprite: one frame at a time (three with onion skin), and a tall figure stands at a half
func test_frames_and_fit() -> void:
	var sc := _scene()
	sc.show_frames([_tex(30, 50), _tex(30, 50), _tex(30, 50)], 12.0, 50.0, 15.0)
	ok(sc.figures() == 1, "a playing clip is one figure")
	sc.onion = true
	ok(sc.figures() == 3, "onion skin is the frame and its neighbours")
	sc.onion = false
	ok(absf(sc.figure_scale() - 1.0) < 0.001, "a 50 px figure stands at 1x")
	sc.show_still(_tex(224, 224), Vector2(112, 224))   # a godmarrow hero's still: 195 px in a 224 px picture
	ok(absf(sc.figure_scale() - 0.5) < 0.001, "a 224 px figure in a 140 px window stands at a half (%s)" % sc.figure_scale())
	var o: Vector2 = sc._sprite_origin()
	ok(o.y >= 0.0 and o.y + 112 <= sc.size.y, "at a half the whole figure is inside the window (top %s)" % o.y)
	sc.show_still(_tex(64, 100), Vector2(32, 100))
	ok(absf(sc.figure_scale() - 1.0) < 0.001, "a 100 px figure stands whole at 1x")
	sc.queue_free()

## the wheel's mouse paths commit the angle in degrees (a 0..1 value read as degrees always meant "S")
func test_wheel_commit() -> void:
	var w := W.Wheel.new()
	var got := []
	w.init_wheel("facing", 0.0, 0.0, func(a): return str(a), Callable(), func(a): got.append(a))
	w.set_angle(90.0, false)
	ok(absf(float(w.commit_value()) - 90.0) < 0.001, "a wheel's commit value is its angle (%s)" % str(w.commit_value()))
	var k := W.Lever.new()
	k.init("lag", 0.25, 0.25, Callable(), Callable(), Callable())
	ok(absf(float(k.commit_value()) - 0.25) < 0.001, "a lever's commit value is its 0..1 value")
	w.step(1, "right")
	w.step(1, "right")
	w.step(1, "right")
	ok(got.size() == 3 and absf(float(got[2]) - 135.0) < 0.001, "three steps right commit 105, 120, 135 (%s)" % str(got))
	w.free()
	k.free()

## tickets: a result that comes back for an older request is stale
func test_tickets() -> void:
	var s: Control = Screen.new()
	var a: int = s.ticket()
	ok(s.fresh(a), "the newest ticket is fresh")
	s.request(func(): pass, 0.0)
	ok(not s.fresh(a), "a request made after it makes an older ticket stale")
	var b: int = s.ticket()
	ok(s.fresh(b), "the ticket taken after the request is the fresh one")
	s.free()

## requests: a quick run asks once (the last), a request during a job waits for it, a later one replaces it
func test_requests() -> void:
	var s: Control = Screen.new()
	root.add_child(s)
	calls = []
	for i in 4:
		s.request(func(): calls.append("turn %d" % i), 0.05)
	await create_timer(0.3).timeout
	ok(calls == ["turn 3"], "four quick requests run once, for the last (%s)" % str(calls))
	calls = []
	s.job = RefCounted.new()   # a job running
	s.request(func(): calls.append("while busy 1"), 0.0)
	s.request(func(): calls.append("while busy 2"), 0.0)
	ok(calls.is_empty() and s.has_queued(), "requests during a job wait")
	s.job = null
	s._job_ended()
	ok(calls == ["while busy 2"] and not s.has_queued(), "when the job ends the last waiting request runs (%s)" % str(calls))
	s._job_ended()
	ok(calls.size() == 1, "nothing runs twice")
	s.queue_free()
