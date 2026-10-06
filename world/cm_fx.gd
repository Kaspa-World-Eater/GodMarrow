extends Node2D
## One of Cursemark's effects, played (the fork): an animation from its effect atlases (Effects_<Book>.atlas, frames by
## index), at a place in the world, turned, scaled, optionally laid on bone (shaders/cm_bone.gdshader), its glow frames
## over it when it has them; it plays once and frees itself, or loops while `hold` > 0, or shows one frame for as long
## as its owner keeps it (play_frame). A Cursemark px is 4 units.

const U := 4.0
static var _bone: ShaderMaterial
static var _add: CanvasItemMaterial

var frames: Array = []
var gframes: Array = []
var fps := 14.0
var t := 0.0
var hold := 0.0           # seconds to loop before playing out; < 0 forever (the owner frees it)
var spr: Sprite2D
var gspr: Sprite2D
var fade := 0.0           # seconds of fade at the end

static func bone_mat() -> ShaderMaterial:
	if _bone == null:
		_bone = ShaderMaterial.new()
		_bone.shader = load("res://shaders/cm_bone.gdshader")
	return _bone

static func add_mat() -> CanvasItemMaterial:
	if _add == null:
		_add = CanvasItemMaterial.new()
		_add.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		_add.light_mode = CanvasItemMaterial.LIGHT_MODE_UNSHADED
	return _add

## anim "ice/spikes_up" (its book is Effects_Ice); "curse_ring" (plain Effects)
static func frames_of(anim: String) -> Array:
	var CmS = load("res://world/cm_sprites.gd")
	var book := "Effects_" + anim.split("/")[0].capitalize() if anim.contains("/") else "Effects"
	var A: Dictionary = CmS.atlas(book)
	var G: Dictionary = CmS.atlas(book + "_glow") if FileAccess.file_exists("res://cursemark/raw/sprites/" + book + "_glow.atlas") else {}
	return [A.get(anim, []), G.get(anim, [])]

static func play(parent: Node, anim: String, at: Vector2, o := {}) -> Node2D:
	var fg := frames_of(anim)
	if (fg[0] as Array).is_empty() or parent == null:
		return null
	var n = load("res://world/cm_fx.gd").new()
	n.frames = fg[0]
	n.gframes = fg[1] if not o.get("bone", false) else []
	n.fps = float(o.get("fps", 14.0))
	n.hold = float(o.get("hold", 0.0))
	n.fade = float(o.get("fade", 0.0))
	n.position = at
	n.rotation = float(o.get("rot", 0.0))
	var sc := float(o.get("scale", 1.0))
	n.scale = Vector2(sc, sc * (-1.0 if o.get("flip_v", false) else 1.0))
	n.z_index = int(o.get("z", 20))
	n.modulate = o.get("tint", Color.WHITE)
	parent.add_child(n)
	n._build(o.get("bone", false))
	return n

func _build(bone: bool) -> void:
	spr = Sprite2D.new()
	spr.region_enabled = true
	spr.centered = false
	spr.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	spr.scale = Vector2(U, U)
	if bone:
		spr.material = bone_mat()
	add_child(spr)
	if not gframes.is_empty():
		gspr = Sprite2D.new()
		gspr.region_enabled = true
		gspr.centered = false
		gspr.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		gspr.scale = Vector2(U, U)
		gspr.material = add_mat()
		gspr.self_modulate = Color(1, 1, 1, 0.6)
		add_child(gspr)
	_show(0)

func _put(s: Sprite2D, f: Dictionary) -> void:
	s.texture = f["tex"]
	s.region_rect = f["rect"]
	s.position = ((f["off"] as Vector2) - (f["orig"] as Vector2) * 0.5) * U

func _show(i: int) -> void:
	_put(spr, frames[clampi(i, 0, frames.size() - 1)])
	if gspr:
		_put(gspr, gframes[clampi(i, 0, gframes.size() - 1)])

func _process(dt: float) -> void:
	t += dt
	var n := frames.size()
	var i := int(t * fps)
	if hold != 0.0 and (hold < 0.0 or t < hold):
		i = i % n
	elif i >= n:
		if fade > 0.0 and t < float(n) / fps + fade:
			modulate.a = 1.0 - (t - float(n) / fps) / fade
			i = n - 1
		else:
			queue_free()
			return
	_show(i)
