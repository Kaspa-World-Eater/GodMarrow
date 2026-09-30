class_name Monster
extends Node2D
## A creature of the god, spawned from the zone export. Behaviour comes from its AI kind (Ai.gd); this node holds
## its body, numbers and drawing.

var zone: Zone
var info: Dictionary
var kind := ""
var ai := "husk"
var rank := "normal"
var level := 1
var tp := Vector2.ZERO
var home := Vector2.ZERO
var hp := 10.0
var hp_max := 10.0
var radius := 0.3
var spr: AnimSprite
var face := 1
var view := "front"
var dead := false
var state := "idle"
var st := 0.0
var awake := false
var brain: RefCounted

func setup(z: Zone, m: Dictionary) -> void:
	zone = z
	info = m
	kind = m["kind"]
	ai = m.get("ai", "husk")
	rank = m.get("rank", "normal")
	level = int(m.get("level", 1))
	tp = Vector2(m["x"], m["y"])
	home = tp
	hp_max = float(m.get("hp", 10))
	hp = hp_max
	radius = float(m.get("r", 0.3))
	var sk := kind
	if rank == "champion" or rank == "unique":
		if ResourceLoader.exists("res://art/sprites/%s@%s.json" % [kind, rank]):
			sk = kind + "@" + rank
	spr = AnimSprite.new(Data.sprite_set(sk))
	add_child(spr)
	spr.play("idle")
	spr.t = randf()
	spr.face = 1 if randf() < 0.5 else -1
	_shadow()
	position = Iso.to_screen(tp)
	add_to_group("monsters")

func _shadow() -> void:
	var s := Polygon2D.new()
	var pts := PackedVector2Array()
	var rw := 30.0 * clampf(radius / 0.3, 0.7, 3.0)
	for i in 16:
		var a := i / 16.0 * TAU
		pts.append(Vector2(cos(a) * rw, sin(a) * rw * 0.38 + 8.0))
	s.polygon = pts
	s.color = Color(0, 0, 0, 0.32)
	add_child(s)
	move_child(s, 0)

func _physics_process(dt: float) -> void:
	if brain:
		brain.tick(self, dt)
	else:
		spr.step(dt)
	position = Iso.to_screen(tp)
