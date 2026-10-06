class_name AnimSprite
extends Sprite2D
## Draws one frame of a SpriteSet at the foot anchor, mirrored about the anchor for face -1, as the web does.

var set: SpriteSet
var anim := "idle"
var view := "front"
var face := 1
var fi := 0
var t := 0.0
var fps_override := 0.0
var loop := true
var done := false

func _init(s: SpriteSet = null) -> void:
	set = s
	centered = false
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	if s and str(s.meta.get("source", "")) == "cursemark":   # (Cursemark assets): a Cursemark pixel is 4 units
		scale = Vector2.ONE * float(s.meta["scale"])

func play(a: String, restart: bool = false, looping: bool = true) -> void:
	if a == anim and not restart:
		return
	anim = a
	fi = 0
	t = 0.0
	loop = looping
	done = false

func step(dt: float, speed: float = 1.0) -> void:
	if set == null:
		return
	var fr := set.get_frames(anim, view)
	if fr.is_empty():
		return
	var f := fps_override if fps_override > 0.0 else set.fps(anim)
	t += dt * f * speed
	while t >= 1.0:
		t -= 1.0
		fi += 1
		if fi >= fr.size():
			if loop:
				fi = 0
			else:
				fi = fr.size() - 1
				done = true
	apply()

func set_index(i: int) -> void:
	fi = i
	apply()

func frame_count() -> int:
	return set.get_frames(anim, view).size() if set else 0

func apply() -> void:
	if set == null:
		return
	var fr := set.get_frames(anim, view)
	if fr.is_empty():
		return
	var f: Array = fr[clampi(fi, 0, fr.size() - 1)]
	texture = f[0]
	var off: Vector2 = f[1]
	flip_h = face < 0
	if flip_h:
		off.x = -(off.x + (f[0] as AtlasTexture).region.size.x)
	offset = off

## the eight octants in screen space to (view, face), following meta.view_map (heroes) or facing8 (monsters)
static func hero_view(dir: Vector2, last_face: int, s8: SpriteSet = null) -> Array:
	var s := Iso.to_screen(dir)
	if s.length() < 0.001:
		return ["", last_face]
	var a := rad_to_deg(atan2(s.y, s.x))
	var o := int(round(a / 45.0)) % 8
	if o < 0:
		o += 8
	# 0 R, 1 DR, 2 D, 3 DL, 4 L, 5 UL, 6 U, 7 UR
	var m := [["side", 1], ["front", 1], ["down", 0], ["front", -1], ["side", -1], ["back", -1], ["up", 0], ["back", 1]]
	var v: Array = m[o]
	# an 8-view set (PixelForge) has real left-facing frames: use them instead of mirroring
	if v[1] == -1 and s8 != null and s8.has_view(v[0] + "_l"):
		return [v[0] + "_l", 1]
	return [v[0], last_face if v[1] == 0 else v[1]]

static func mon_view(dir: Vector2, last_face: int) -> Array:
	var s := Iso.to_screen(dir)
	if s.length() < 0.001:
		return ["", last_face]
	var a := rad_to_deg(atan2(s.y, s.x))
	var o := int(round(a / 45.0)) % 8
	if o < 0:
		o += 8
	var m := [["front", 1], ["front", 1], ["front", 0], ["front", -1], ["front", -1], ["back", -1], ["back", 0], ["back", 1]]
	var v: Array = m[o]
	return [v[0], last_face if v[1] == 0 else v[1]]
