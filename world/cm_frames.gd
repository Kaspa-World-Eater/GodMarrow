class_name CmFrames
extends Node2D
## A Cursemark doodad: its frames (centred, a Cursemark pixel = 4 units), looping when it has more than one (torches,
## braziers), and its glow frames drawn over it additively and unlit, as Cursemark's Emissive pass does.

var frames: Array = []
var glow: Array = []
var flip := false
var fps := 8.0
var phase := 0.0
var spr: Sprite2D
var gspr: Sprite2D
var fi := -1
var region := ""             # the atlas region shown ("doodads/chest_1")

## turn to a state's frames, as the templates name them: doodads/chest_1 -> doodads/chest_open_1
func cm_state(state: String) -> void:
	if region == "":
		return
	var A: Dictionary = load("res://world/cm_sprites.gd").atlas("Doodads")
	var parts := region.rsplit("_", true, 1)
	for k in [parts[0] + "_" + state + "_" + (parts[1] if parts.size() > 1 else "1"), parts[0] + "_" + state + "_1", parts[0] + "_" + state]:
		if A.has(k):
			frames = A[k]
			region = k
			glow = []
			if gspr:
				gspr.visible = false
			fi = -1
			_show(0)
			set_process(frames.size() > 1)
			return

func setup() -> void:
	spr = Sprite2D.new()
	spr.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	spr.region_enabled = true
	spr.centered = false
	spr.scale = Vector2(4, 4)
	add_child(spr)
	if not glow.is_empty():
		gspr = Sprite2D.new()
		gspr.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		gspr.region_enabled = true
		gspr.centered = false
		gspr.scale = Vector2(4, 4)
		var m := CanvasItemMaterial.new()
		m.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		m.light_mode = CanvasItemMaterial.LIGHT_MODE_UNSHADED
		gspr.material = m
		add_child(gspr)
	_show(0)
	set_process(frames.size() > 1)

func _process(dt: float) -> void:
	phase += dt
	_show(int(phase * fps) % frames.size())

func _show(i: int) -> void:
	if i == fi:
		return
	fi = i
	_put(spr, frames[i])
	if gspr and not glow.is_empty():
		_put(gspr, glow[mini(i, glow.size() - 1)])

func _put(s: Sprite2D, f: Dictionary) -> void:
	s.texture = f["tex"]
	s.region_rect = f["rect"]
	var off: Vector2 = (f["off"] as Vector2) - (f["orig"] as Vector2) * 0.5
	s.flip_h = flip
	if flip:
		off.x = -(off.x + (f["rect"] as Rect2).size.x)
	s.position = off * 4.0
