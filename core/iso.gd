class_name Iso
extends RefCounted
## The isometric grid, exactly as the web build: a tile (a yard) is a 36x18 diamond in world px, and the web shows
## 4 screen px per world px at 1920x1080. Godot units are those screen px, so the camera sits at zoom 1.
## iso(x, y) = ((x - y) * 72, (x + y) * 36).

const WPX := 4.0            # Godot units per web world px
const HX := 18.0 * WPX      # 72
const HY := 9.0 * WPX       # 36

## how large a figure stands against the world (Derek 2026-10-05: "the hero seems too big and the world feels too
## small, everything should be larger"): every body is drawn at this against the ground, so the land, its walls and
## its keeps read larger round them. One number for all of them: the hero, the creatures, the folk, the summoned.
const FIG := 0.78

## the floor's height where a baked land has one (world/baked_ground.gd: the Sunken Bog's Back stands up out of the
## water, its skull and its pit higher still): whatever stands at a point is drawn lifted onto it, KZ (21) world px a
## yard. Empty everywhere else, so every other zone is flat as before.
static var lift_z := PackedFloat32Array()
static var lift_w := 0
static var lift_h := 0
static var lift_res := 0.5
static var lift_px := 84.0

static func set_lift(z: PackedFloat32Array, w: int, h: int, res: float, px: float) -> void:
	lift_z = z
	lift_w = w
	lift_h = h
	lift_res = res
	lift_px = px

static func clear_lift() -> void:
	lift_z = PackedFloat32Array()
	lift_w = 0
	lift_h = 0

## screen px a thing at t is lifted by (its floor's height, smooth between the lattice's points)
static func lift(t: Vector2) -> float:
	if lift_w == 0:
		return 0.0
	var fx := clampf(t.x / lift_res, 0.0, float(lift_w - 1) - 0.001)
	var fy := clampf(t.y / lift_res, 0.0, float(lift_h - 1) - 0.001)
	var ix := int(fx)
	var iy := int(fy)
	var ax := fx - ix
	var ay := fy - iy
	var i := iy * lift_w + ix
	var z := lerpf(lerpf(lift_z[i], lift_z[i + 1], ax), lerpf(lift_z[i + lift_w], lift_z[i + lift_w + 1], ax), ay)
	return z * lift_px

static func to_screen(t: Vector2) -> Vector2:
	return Vector2((t.x - t.y) * HX, (t.x + t.y) * HY - lift(t))

## a direction or an offset on the ground (no place, so never lifted)
static func vec(v: Vector2) -> Vector2:
	return Vector2((v.x - v.y) * HX, (v.x + v.y) * HY)

static func to_tile(s: Vector2) -> Vector2:
	var u := s.x / HX
	var v := s.y / HY
	var t := Vector2((u + v) * 0.5, (v - u) * 0.5)
	if lift_w > 0:                 # a point seen on lifted ground lies further south: walk back down to it
		for i in 4:
			v = (s.y + lift(t)) / HY
			t = Vector2((u + v) * 0.5, (v - u) * 0.5)
	return t

## depth for y-sorting: the web sorts by x + y; screen y is proportional to it
static func depth(t: Vector2) -> float:
	return t.x + t.y
