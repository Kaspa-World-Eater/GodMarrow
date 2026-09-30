class_name AffixFx
extends Node2D
## What the deeds leave in the world (entities/affixes.gd): the dust of one that slips through the earth, and the
## ground giving up the Grave-Called. Nothing here hurts, and nothing glows (the user's rule: nothing left on the
## ground by a death may do harm).

const P := 4.0                 # the pixel grain
var kind := ""
var tp := Vector2.ZERO
var zone
var t := 0.0
var life := 1.0
var m                          # the creature, for slip and graves
var n := 0

static func _make(z, k: String, at: Vector2, lf: float) -> AffixFx:
	var f := AffixFx.new()
	f.zone = z
	f.kind = k
	f.tp = at
	f.life = lf
	f.position = Iso.to_screen(at)
	f.z_index = -45
	z.sorted.add_child(f)
	return f

## an Unquiet creature sinks, and comes up beside the hero
static func slip(mon, h) -> void:
	var f := _make(mon.zone, "slip", mon.tp, 0.5)
	f.m = mon
	mon.buried = true
	mon.stun = maxf(mon.stun, 0.5)
	_dust(mon.zone, mon.position, 10)
	Sfx.play("roll", 0.5, 0.7)

## the ground under a fallen Grave-Called gives up others
static func graves(mon, count: int) -> void:
	var f := _make(mon.zone, "graves", mon.tp, 1.0)
	f.m = mon
	f.n = count

static func _dust(z, at: Vector2, amount: int) -> void:
	var p := CPUParticles2D.new()
	p.one_shot = true
	p.emitting = true
	p.amount = amount
	p.lifetime = 0.8
	p.explosiveness = 0.9
	p.direction = Vector2.UP
	p.spread = 70.0
	p.initial_velocity_min = 20.0
	p.initial_velocity_max = 70.0
	p.gravity = Vector2(0, 90)
	p.scale_amount_min = 3.0
	p.scale_amount_max = 5.0
	p.color = Color(0.3, 0.28, 0.26, 0.8)
	p.position = at + Vector2(0, -6)
	p.z_index = 5
	z.sorted.add_child(p)
	p.finished.connect(p.queue_free)

func _physics_process(dt: float) -> void:
	t += dt
	var h = zone.hero_ref if zone else null
	match kind:
		"slip":
			if t >= life and m and is_instance_valid(m) and not m.dead:
				var to: Vector2 = m.tp
				if h:
					for k in 8:
						var a := randf() * TAU
						var q: Vector2 = h.tp + Vector2(cos(a), sin(a)) * 1.9
						if not zone.is_solid(q):
							to = q
							break
				m.tp = to
				m.buried = false
				m.stun = maxf(m.stun, 0.35)
				m.position = Iso.to_screen(to)
				_dust(zone, m.position, 12)
				Sfx.play("roll", 0.6, 0.6)
				m = null
		"graves":
			if t >= life and m != null:
				var kd_kind: String = m.kind if (m.kind in Monster.RAISED and m.radius <= 0.4) else "hollow"
				for i in n:
					var a := randf() * TAU
					var at: Vector2 = tp + Vector2(cos(a), sin(a)) * 0.9
					var g = Brain.spawn(zone, kd_kind, at, maxi(1, m.level - 1), "minion", str(m.pack))
					if g:
						g.name_shown = "Grave-Called " + String(g.name_shown)
						_dust(zone, g.position, 10)
				Sfx.play("break", 0.6, 0.55)
				m = null
	if t >= life + 0.3:
		queue_free()
	queue_redraw()

func _draw() -> void:
	match kind:
		"graves":
			# the ground cracks open where they will come up
			var k := clampf(t / life, 0.0, 1.0)
			for i in 10:
				var ang := i / 10.0 * TAU
				var r := 30.0 * k
				draw_rect(Rect2(Vector2(floorf(cos(ang) * r / P) * P, floorf(sin(ang) * r * 0.5 / P) * P), Vector2(P, P)), Color(0.08, 0.07, 0.07, 0.9))
