class_name DarkLayer
extends CanvasLayer
## The dark over the world (shaders/dark.gdshader), fed each frame with the pools of light the web build cuts into it
## (zz_zx_dark64.js): the hero's lantern (the main light, with shadows from walls, trunks, stones and camp things), the
## world's flames (the nearest four also throw shadows), the pyres and ground fires, and every PointLight2D that other
## systems place (wisps, skills, objects), which is turned into a pool here and switched off so nothing is lit twice.

const ISO_R := 25.456          # one yard across the screen, in web world px (TW * 0.7071)
const RND := {2: 0.24, 3: 0.4, 9: 0.34}
const SQ := {5: true, 7: true, 10: true}
const DR := {"statue_saint": 0.32, "statue_angel": 0.34, "cage": 0.22, "cage2": 0.22, "tent": 0.75}
const MAXH := 48
const MAXO := 128

var rect: ColorRect
var mat: ShaderMaterial
var zone: Zone
var hero: Hero
var statics: Array = []        # [{t (tile), r (world px), core, far, w, rgb, kind}]
var round_things: Array = []   # [[tile, radius yd]] camp things that throw shadows
var extra_lights: Array = []   # PointLight2D nodes found in the zone
var scan_t := 0.0
var mood := 1.0
var enabled := true

func _ready() -> void:
	layer = 5
	rect = ColorRect.new()
	rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	mat = ShaderMaterial.new()
	mat.shader = load("res://shaders/dark.gdshader")
	rect.material = mat
	add_child(rect)

func bind(z: Zone, h: Hero) -> void:
	zone = z
	hero = h
	statics.clear()
	round_things.clear()
	extra_lights.clear()
	scan_t = 0.0
	for L in z.d.get("lights", []):
		var rgb := _rgb(L.get("rgb", "255,150,72"))
		match L.get("type", ""):
			"fire":
				var k: String = L.get("kind", "fire")
				var kk := 0.26 if k == "lantern" else (0.36 if k == "brazier" else 0.32)
				statics.append({"t": Vector2(L["x"], L["y"]), "r": maxf(14.0, float(L.get("radius", 3)) * ISO_R * kk), "core": 0.4, "far": 1.6, "w": 0.3, "rgb": rgb, "kind": k})
			"raw":
				statics.append({"t": Vector2(L["x"], L["y"]), "r": maxf(10.0, float(L.get("radiusPx", 30))), "core": 0.35, "far": 1.5, "w": 0.3, "rgb": rgb, "kind": "raw"})
			"wallCandle":
				statics.append({"t": Vector2(L["x"], L["y"]), "r": maxf(14.0, float(L.get("radiusPx", 34)) * 0.9), "core": 0.4, "far": 1.6, "w": 0.3, "rgb": rgb, "kind": "wallc"})
	for dc in z.d.get("decor", []):
		var rr = DR.get(dc.get("key", ""))
		if rr != null:
			round_things.append([Vector2(dc["x"], dc["y"]), float(rr)])
	for o in z.objects:
		if o.get("type", "") in ["shrine", "altar"]:
			round_things.append([Vector2(o["x"], o["y"]), 0.4])

static func _rgb(s) -> Color:
	if s is Array:
		return Color8(int(s[0]), int(s[1]), int(s[2]))
	var p: PackedStringArray = String(s).split(",")
	return Color8(int(p[0]), int(p[1]), int(p[2]))

func _process(dt: float) -> void:
	if zone == null or not is_instance_valid(zone) or hero == null or not is_instance_valid(hero):
		rect.visible = false
		return
	rect.visible = enabled
	var outdoor: bool = zone.d.get("outdoor", false)
	var dk := Game.day_k() if outdoor else 0.0
	var A := (0.82 - 0.5 * dk * dk) if outdoor else 0.84
	var dark_rgb := Color8(8, 13, 27) if outdoor else Color8(8, 9, 20)
	var vp := get_viewport()
	var xf := vp.get_screen_transform() * vp.get_canvas_transform()
	var sc := xf.get_scale().x
	var vis := Rect2(Vector2.ZERO, Vector2(vp.get_visible_rect().size) * vp.get_screen_transform().get_scale())
	var holes: Array = []
	var occs: Array = []
	# ---- the hero's lantern
	var hp := hero.tp
	if not hero.dead:
		var lampk := 1.5 + hero.st.item("lrad") / 100.0 * 0.5
		var R := minf(hero.light_radius(), 5.4 * lampk / 1.5) * ISO_R * 0.4 * (1.0 + 0.5 * dk) * mood
		if hero.st.dim_wick:
			R *= 0.62
		R *= 1.0 - 0.12 * hero.st.kept
		var foot := hp + Vector2(0.25, -0.1)
		var rgb := Color8(120, 178, 255) if hero.cls == "animancer" else (Color8(255, 164, 84) if hero.cls == "hemomancer" else Color8(255, 170, 96))
		var hi := holes.size()
		holes.append([xf * Iso.to_screen(foot) + Vector2(0, sc * 4.0), R * 4.0 * sc, 2.1, 0.22, 0.26, 1.0, rgb, 1.0, 0.0, 0.18])
		_occluders(occs, foot, R * 2.1 / ISO_R, hi, xf)
	# ---- the world's flames (the nearest four throw shadows)
	var near: Array = []
	for s in statics:
		near.append([s["t"].distance_to(hp), s])
	near.sort_custom(func(a, b): return a[0] < b[0])
	var n_sh := 0
	for e in near:
		var s: Dictionary = e[1]
		var pos: Vector2 = xf * Iso.to_screen(s["t"])
		var r: float = s["r"] * 4.0 * sc
		if not vis.grow(r * float(s["far"])).has_point(pos):
			continue
		if holes.size() >= MAXH:
			break
		var hi2 := holes.size()
		var shadowed := 0.0
		if n_sh < 4 and s["kind"] != "wallc":
			n_sh += 1
			shadowed = 1.0
			_occluders(occs, s["t"], s["r"] * 1.6 / ISO_R, hi2, xf)
		holes.append([pos, r, float(s["far"]), float(s["core"]), 0.0, float(s["w"]), s["rgb"], shadowed, 0.0, 0.0 if s["kind"] == "wallc" else 0.45])
	# ---- lights other systems placed (wisps, skills, objects, fires): made into pools
	scan_t -= dt
	if scan_t <= 0.0:
		scan_t = 0.5
		extra_lights = zone.find_children("*", "PointLight2D", true, false)
	for l in extra_lights:
		if not is_instance_valid(l):
			continue
		var pl := l as PointLight2D
		if pl.has_meta("dark_skip"):
			pl.enabled = false
			continue
		if pl.visible and pl.is_visible_in_tree():
			pl.enabled = false
			if holes.size() >= MAXH:
				continue
			# the pool lies on the ground under the light (a light hung at a height sets meta dark_dy, its drop in px)
			var pos2: Vector2 = xf * (pl.global_position + Vector2(0, float(pl.get_meta("dark_dy", 0.0))))
			if pl.has_meta("dark_r"):   # a light that asks for an exact pool, in web world px (wisps: r 21, core .25, far 1.5)
				var rw: float = float(pl.get_meta("dark_r")) * 4.0 * sc
				if vis.grow(rw * 1.6).has_point(pos2):
					holes.append([pos2, rw, float(pl.get_meta("dark_far", 1.5)), float(pl.get_meta("dark_core", 0.25)), 0.0, float(pl.get_meta("dark_w", 0.5)), pl.color, 0.0, 0.0, 0.0])
				continue
			var tw := float(pl.texture.get_width()) if pl.texture else 256.0
			var r2 := tw * 0.5 * pl.texture_scale * 0.5 * sc * clampf(pl.energy, 0.4, 1.4)
			r2 = clampf(r2, 20.0 * sc, 600.0 * sc)
			if vis.grow(r2 * 1.8).has_point(pos2):
				var fl := clampf(1.0 - pl.energy * 0.9, 0.0, 0.7)   # faint lights never clear the dark
				holes.append([pos2, r2, 1.8, 0.12, 0.0, 0.45, pl.color, 0.0, fl])
	# ---- feed the shader
	var hA := PackedVector4Array()
	var hB := PackedVector4Array()
	var hC := PackedVector4Array()
	var hD := PackedVector4Array()
	for h in holes:
		var pos3: Vector2 = h[0]
		hA.append(Vector4(pos3.x, pos3.y, float(h[1]), float(h[2])))
		var sh := float(h[7]) if h.size() > 7 else 0.0
		hB.append(Vector4(float(h[3]), float(h[4]), float(h[5]), sh))
		var c: Color = h[6]
		hC.append(Vector4(c.r, c.g, c.b, float(h[8]) if h.size() > 8 else 0.0))
		hD.append(Vector4(float(h[9]) if h.size() > 9 else 0.0, 0, 0, 0))
	while hA.size() < MAXH:
		hA.append(Vector4.ZERO)
		hB.append(Vector4.ZERO)
		hC.append(Vector4.ZERO)
		hD.append(Vector4.ZERO)
	var oA := PackedVector4Array()
	var oH := PackedFloat32Array()
	for o in occs:
		if oA.size() >= MAXO:
			break
		oA.append(o[0])
		oH.append(o[1])
	var n_occ := oA.size()
	while oA.size() < MAXO:
		oA.append(Vector4.ZERO)
		oH.append(-1.0)
	mat.set_shader_parameter("n_holes", holes.size())
	mat.set_shader_parameter("hA", hA)
	mat.set_shader_parameter("hB", hB)
	mat.set_shader_parameter("hC", hC)
	mat.set_shader_parameter("hD", hD)
	mat.set_shader_parameter("n_occ", n_occ)
	mat.set_shader_parameter("occ", oA)
	mat.set_shader_parameter("occ_h", oH)
	mat.set_shader_parameter("dark_a", A)
	mat.set_shader_parameter("dark_rgb", Vector3(dark_rgb.r, dark_rgb.g, dark_rgb.b))
	mat.set_shader_parameter("tint_a", 0.2 + 0.1 * (1.0 - dk))
	mat.set_shader_parameter("cell", 4.0 * sc)
	var am := zone.ambient_at(Game.phase())
	mat.set_shader_parameter("amb", Vector3(am.r, am.g, am.b))

## the edges that stop a light at tile l within rw yards, as screen-space segments (the near side of each blocker:
## round bases for trunks, stones and pillars; the two corners that bound a wall tile's silhouette)
func _occluders(out: Array, l: Vector2, rw: float, hole_i: int, xf: Transform2D) -> void:
	var x0 := int(floor(l.x - rw))
	var x1 := int(floor(l.x + rw))
	var y0 := int(floor(l.y - rw))
	var y1 := int(floor(l.y + rw))
	for ty in range(y0, y1 + 1):
		for tx in range(x0, x1 + 1):
			if out.size() >= MAXO:
				return
			var t := zone.type_at(Vector2(tx + 0.5, ty + 0.5))
			var rr = RND.get(t)
			var sq: bool = SQ.has(t)
			if rr == null and not sq:
				continue
			var c := Vector2(tx + 0.5, ty + 0.5)
			var dv := c - l
			var dd := dv.length()
			if dd < 0.45 or dd > rw + 1.0:
				continue
			var a: Vector2
			var b: Vector2
			if rr != null:
				if dd <= float(rr) + 0.05:
					continue
				var th := atan2(dv.y, dv.x)
				var al := asin(minf(0.99, float(rr) / dd))
				var tl := sqrt(dd * dd - float(rr) * float(rr))
				a = l + Vector2(cos(th - al), sin(th - al)) * tl
				b = l + Vector2(cos(th + al), sin(th + al)) * tl
			else:
				var th2 := atan2(dv.y, dv.x)
				var mn := 9.0
				var mx := -9.0
				for cc in [Vector2(tx, ty), Vector2(tx + 1, ty), Vector2(tx, ty + 1), Vector2(tx + 1, ty + 1)]:
					var da := atan2(cc.y - l.y, cc.x - l.x) - th2
					da = atan2(sin(da), cos(da))
					if da < mn:
						mn = da
						a = cc
					if da > mx:
						mx = da
						b = cc
			var A2: Vector2 = xf * Iso.to_screen(a)
			var B2: Vector2 = xf * Iso.to_screen(b)
			out.append([Vector4(A2.x, A2.y, B2.x, B2.y), float(hole_i)])
	for rt in round_things:
		var c2: Vector2 = rt[0]
		var rr2: float = rt[1]
		var dv2 := c2 - l
		var dd2 := dv2.length()
		if dd2 <= rr2 + 0.05 or dd2 > rw + 1.0:
			continue
		var th3 := atan2(dv2.y, dv2.x)
		var al2 := asin(minf(0.99, rr2 / dd2))
		var tl2 := sqrt(dd2 * dd2 - rr2 * rr2)
		var a3: Vector2 = xf * Iso.to_screen(l + Vector2(cos(th3 - al2), sin(th3 - al2)) * tl2)
		var b3: Vector2 = xf * Iso.to_screen(l + Vector2(cos(th3 + al2), sin(th3 + al2)) * tl2)
		out.append([Vector4(a3.x, a3.y, b3.x, b3.y), float(hole_i)])
