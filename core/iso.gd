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

static func to_screen(t: Vector2) -> Vector2:
	return Vector2((t.x - t.y) * HX, (t.x + t.y) * HY)

static func to_tile(s: Vector2) -> Vector2:
	var u := s.x / HX
	var v := s.y / HY
	return Vector2((u + v) * 0.5, (v - u) * 0.5)

## depth for y-sorting: the web sorts by x + y; screen y is proportional to it
static func depth(t: Vector2) -> float:
	return t.x + t.y
