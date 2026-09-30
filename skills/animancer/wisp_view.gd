extends Node2D
## A wisp of the choir (or the great wisp, or a lantern's wisp) standing in the y-sorted layer. The sprite's bloom is
## additive (the web draws it "lighter"); each wisp cuts a small pool in the dark but casts no shadow. No comet tail.

var w                        # the wisp's state (animancer.gd Wisp): tp, z, gone, scale, alpha
var spr: AnimSprite
var lamp: PointLight2D
var ft := 0.0

func setup(wisp, kind: String = "wisp_rev") -> void:
	w = wisp
	w.node = self
	spr = AnimSprite.new(Data.sprite_set(kind))
	var mat := CanvasItemMaterial.new()
	mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	spr.material = mat
	spr.view = "front"
	spr.play("drift")
	spr.set_index(randi() % 8)
	add_child(spr)
	lamp = PointLight2D.new()
	lamp.texture = Lights.radial(256)
	lamp.color = Color8(176, 214, 255)
	lamp.energy = 0.45
	lamp.texture_scale = 1.1
	lamp.shadow_enabled = false
	lamp.set_meta("dark_r", 21.0)   # (lighting): the web's wisp pool on the ground under it
	add_child(lamp)
	ft = randf() * 8.0
	_place()

func _place() -> void:
	# the atlas already hovers the wisp at z = 12 world px; lift it by the rest (4 screen px per world px)
	position = Iso.to_screen(w.tp)
	var lift: float = (w.z - 12.0) * 4.0
	spr.position = Vector2(0, -lift)
	spr.scale = Vector2.ONE * w.scale
	lamp.position = Vector2(0, -lift - 48.0 * w.scale)
	lamp.texture_scale = 1.1 * w.scale
	lamp.set_meta("dark_dy", lift + 48.0 * w.scale)   # (lighting): its pool lies on the ground under it
	spr.modulate.a = w.alpha

func _process(dt: float) -> void:
	if w == null or w.gone or w.node != self:
		queue_free()
		return
	ft += dt * 3.8
	spr.set_index(int(ft) % 8)
	_place()
