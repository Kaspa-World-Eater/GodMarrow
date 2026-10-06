class_name Gust
## The wind (Derek 2026-10-05: "Have the candles flicker in the wind every now and then as if a breeze is blowing by.
## And then apply the same ideas to everything"). One breeze for the whole game: a slow restless base, and now and then
## a gust that swells over a second or two, holds, and dies away. The wind's sound follows it (world/cm_audio.gd), and
## so do the candles, torches, braziers, the lantern's flame and the grass. Gust.k() is 0..1; Gust.dir() is its heading.

static var _frame := -1
static var _t := 0.0
static var _next := 6.0
static var _g0 := -100.0       # when the current gust began
static var _gl := 3.0          # how long it lasts
static var _gs := 1.0          # how strong
static var _dir := 1.0

## advance the wind (any caller, once a frame is enough)
static func step(dt: float) -> void:
	var f := Engine.get_process_frames()
	if f == _frame:
		return
	_frame = f
	_t += dt
	if _t >= _next:
		_g0 = _t
		_gl = randf_range(2.2, 4.5)
		_gs = randf_range(0.55, 1.0)
		_dir = -1.0 if randf() < 0.3 else 1.0
		_next = _t + _gl + randf_range(9.0, 22.0)

static func now() -> float:
	return _t

## the breeze's strength now, 0..1: the restless base plus the gust's swell
static func k() -> float:
	var base := 0.12 + 0.1 * (0.5 + 0.5 * sin(_t * 0.37) * sin(_t * 0.23 + 1.3))
	var u := (_t - _g0) / _gl
	var g := 0.0
	if u >= 0.0 and u <= 1.0:
		# up fast, a ragged hold, down slow
		var env := smoothstep(0.0, 0.25, u) * (1.0 - smoothstep(0.55, 1.0, u))
		g = env * _gs * (0.85 + 0.15 * sin(_t * 9.0) * sin(_t * 4.3))
	return clampf(base + g, 0.0, 1.0)

## which way it blows across the screen: -1 or 1
static func dir() -> float:
	return _dir
