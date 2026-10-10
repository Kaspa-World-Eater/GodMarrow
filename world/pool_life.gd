extends Node
## The opening cave's pool, alive (Derek, 2026-10-10: "a blood pool that flows like it has an underground source that
## swells it and sloshes it, with the blood flowing from the faces into it like real water"; and before, its ripples
## "dont even make sense", "depth to the pool so we sink when we go in or out"). Made by world/baked_ground.gd when the
## zone carries a "pool" (tools/landkit3d/cave_export.py writes it, with its simulation field pool_sim.png):
## - the surface simulated (shaders/pool_sim.gdshader): a wave field over the pool, stepped every frame in two small
##   viewports that each read the other's last frame; the stumps and the shore reflect the waves; the spring at the heart wells up on the heartbeat
##   and wanders a little; the faces' ropes of blood churn where they strike; a step or a hand pushes the surface down
##   (entities/hero.gd footfall, `ring`); a wading body is a moving hollow that pushes a wake;
## - the ground's shader draws the pool from it (shaders/baked_ground.gdshader, `pool`): lit by the surface's slope,
##   the blood's pattern refracted by it and carried along the field's flow, out from the faces and round the stumps;
## - the wading depth under a body (`depth_at`), which sinks the live body to its true waterline (entities/body3d.gd).

static var me = null

var mat: ShaderMaterial
var data: Dictionary
var spouts: Array = []          # their tiles
var rect := Rect2()             # the simulated area, screen px
var cells := Vector2(192, 96)
var vps: Array = []             # the simulation's viewport
var sims: Array = []            # its material
var imps: Array = []            # [uv, strength, radius], each for one frame
var spring_uv := Vector2(0.5, 0.5)
var t := 0.0
var level := 0.0                # the tide: -1 drained down, +1 welled up
var welling := 0.0              # rising (+) or sinking (-)
var _frames := 0

func _init(m: ShaderMaterial, zd: Dictionary) -> void:
	mat = m
	data = zd.get("pool", {})
	for s in zd.get("spouts", []):
		spouts.append(Vector2(float(s["x"]), float(s["y"])))

func _enter_tree() -> void:
	me = self

func _exit_tree() -> void:
	if me == self:
		me = null

func _ready() -> void:
	var sim: Dictionary = data.get("sim", {})
	if sim.is_empty():
		return
	var r: Array = sim["rect"]
	rect = Rect2(float(r[0]), float(r[1]), float(r[2]), float(r[3]))
	cells = Vector2(float(sim["nx"]), float(sim["ny"]))
	var zd: String = load("res://world/baked_ground.gd").dir_for(get_parent())
	var fpath := zd + "/" + String(sim["file"])
	var field: Texture2D = load(fpath) if ResourceLoader.exists(fpath) else ImageTexture.create_from_image(Image.load_from_file(ProjectSettings.globalize_path(fpath)))
	var sh: Shader = load("res://shaders/pool_sim.gdshader")
	for k in 2:
		var vp := SubViewport.new()
		vp.size = Vector2i(cells)
		vp.disable_3d = true
		vp.transparent_bg = false
		vp.use_hdr_2d = true                 # a float target: the height stored as it is
		vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
		vp.render_target_clear_mode = SubViewport.CLEAR_MODE_NEVER
		var cr := ColorRect.new()
		cr.size = cells
		var m := ShaderMaterial.new()
		m.shader = sh
		m.set_shader_parameter("field", field)
		m.set_shader_parameter("cells", cells)
		cr.material = m
		vp.add_child(cr)
		add_child(vp)
		vps.append(vp)
		sims.append(m)
	# each reads the other's last frame: two interleaved steps a frame, both stepping the same surface
	sims[0].set_shader_parameter("prev", (vps[1] as SubViewport).get_texture())
	sims[1].set_shader_parameter("prev", (vps[0] as SubViewport).get_texture())
	mat.set_shader_parameter("pool_state", (vps[0] as SubViewport).get_texture())
	mat.set_shader_parameter("pool_field", field)
	mat.set_shader_parameter("pool_rect", Vector4(rect.position.x, rect.position.y, rect.size.x, rect.size.y))
	mat.set_shader_parameter("pool_cells", cells)
	spring_uv = _uv(Vector2(float(data["cx"]), float(data["cy"])))

func _uv(tile: Vector2) -> Vector2:
	var p := Iso.to_screen(tile) + Vector2(0.0, float(data.get("surface", 0.0)) * -Iso.lift_px)
	return (p - rect.position) / rect.size

## a push down into the surface at a tile (a step 1, a hand or a drip less)
func ring(tile: Vector2, strength: float = 1.0) -> void:
	imps.append([_uv(tile), 0.06 * strength, 3.5])        # a heavy step, a broad dent
	while imps.size() > 8:
		imps.pop_front()

## how deep the blood is over the floor at a tile (metres): deepest at the heart, nothing past the shore, falling off
## smoothly between, so a body wading out climbs out of it step by step
func depth_at(tile: Vector2) -> float:
	if data.is_empty():
		return 0.0
	var d := tile.distance_to(Vector2(float(data["cx"]), float(data["cy"])))
	var deep := (float(data["surface"]) - float(data["floor_deep"])) * 0.9144 * 0.85
	return deep * (1.0 - smoothstep(0.0, float(data["r_shore"]), d))

func _process(dt: float) -> void:
	if vps.is_empty():
		return
	t += dt
	_frames += 1
	var u_: Dictionary = {"t": t, "init": _frames < 4}
	# the welling (Derek, 2026-10-10: "it should have an upwelling and downwelling like a real cave ocean pool"): the
	# blood comes up from beneath and sinks back on a long slow tide, a rise of about eleven seconds and a fall, the level
	# of the whole pool with it; the heart beneath only a faint pulse on top
	var tide := sin(TAU * t / 22.0) + 0.25 * sin(TAU * t / 9.0 + 1.3)
	var dtide := cos(TAU * t / 22.0) * TAU / 22.0 + 0.25 * cos(TAU * t / 9.0 + 1.3) * TAU / 9.0
	level = tide
	welling = dtide
	var ph := fmod(t / 3.6, 1.0)
	var push := exp(-pow((ph - 0.06) / 0.05, 2.0)) + 0.55 * exp(-pow((ph - 0.27) / 0.035, 2.0))
	var wander := Vector2(sin(t * 0.07), cos(t * 0.09)) * 0.035
	u_["spring"] = Vector4(spring_uv.x + wander.x, spring_uv.y + wander.y, 0.006 * dtide + 0.006 * (push - 0.123), 0.0)
	mat.set_shader_parameter("pool_level", tide)
	mat.set_shader_parameter("pool_welling", dtide)
	var sp: Array = []
	for i in 6:
		if i < spouts.size():
			var u := _uv(spouts[i])
			sp.append(Vector4(u.x, u.y, 0.16, 0.0))
		else:
			sp.append(Vector4.ZERO)
	u_["spouts"] = sp
	var im: Array = []
	for i in 8:
		im.append(Vector4(imps[i][0].x, imps[i][0].y, imps[i][1], imps[i][2]) if i < imps.size() else Vector4.ZERO)
	u_["imps"] = im
	imps.clear()
	var h = get_tree().current_scene.get("hero") if get_tree() and get_tree().current_scene else null
	if h != null and is_instance_valid(h) and depth_at(h.tp) > 0.01:
		var u := _uv(h.tp)
		u_["body"] = Vector4(u.x, u.y, 2.2, 0.25)
	else:
		u_["body"] = Vector4(-1.0, -1.0, 0.0, 0.0)
	for sm in sims:
		for k in u_:
			(sm as ShaderMaterial).set_shader_parameter(k, u_[k])
	# (a look at the simulation itself: GM_POOLDUMP=path saves its height field as a grey image after five seconds)
	if OS.get_environment("GM_POOLDUMP") != "" and t > 5.0 and not has_meta("dumped"):
		set_meta("dumped", true)
		var dimg := (vps[0] as SubViewport).get_texture().get_image()
		var out := Image.create(dimg.get_width(), dimg.get_height(), false, Image.FORMAT_L8)
		var lo := 99.0
		var hi := -99.0
		for y in dimg.get_height():
			for x in dimg.get_width():
				var c := dimg.get_pixel(x, y)
				var v := c.r
				lo = minf(lo, v)
				hi = maxf(hi, v)
				out.set_pixel(x, y, Color(clampf(0.5 + v * 0.6, 0.0, 1.0), 0, 0))
		out.save_png(OS.get_environment("GM_POOLDUMP"))
		print("POOLDUMP h range ", lo, " .. ", hi)
