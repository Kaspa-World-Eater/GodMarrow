extends RefCounted
## Cursemark's sprites in Godot (the Cursemark fork): its libGDX atlases read as they are (cursemark_raw/sprites),
## each page a CanvasTexture with its normal map when it has one (Characters_*, Doodads), so Godot's 2D lights shade
## them as Cursemark's LitSurface does; the glow atlases drawn over them additively (engine/light/Emissive).
## Frames are centred on their position, as Cursemark draws them; a Cursemark pixel is 4 Godot units.

const RAW := "res://cursemark/raw/sprites/"
const U := 4.0
const CHAR_ATLASES := ["Characters_Blighted", "Characters_Bound", "Characters_Corrupted", "Characters_Crusader",
	"Characters_Cultist", "Characters_Forsaken", "Characters_Fungal", "Characters_Other", "Characters_Starspawn"]

static var _atlas := {}      # name -> {region name: [frame...]}, frame = {tex, rect: Rect2, orig: Vector2, off: Vector2}
static var _char_home := {}  # character sprite -> atlas name

static func _image_tex(path: String) -> Texture2D:
	var img := Image.load_from_file(path)
	return ImageTexture.create_from_image(img) if img else null

## one atlas, parsed once; pages carry their normal map when <name>_normal.atlas exists (same layout)
static func atlas(name: String) -> Dictionary:
	if _atlas.has(name):
		return _atlas[name]
	var out := {}
	var text: String = load("res://core/cm_data.gd").text(RAW + name + ".atlas")
	var has_normal := FileAccess.file_exists(RAW + name + "_normal.atlas")
	var page_tex: Texture2D = null
	var reg := {}
	var in_page := false
	for raw_line in text.split("\n"):
		var line := raw_line.strip_edges(false, true)
		if line.strip_edges() == "":
			_flush(out, reg, page_tex)
			reg = {}
			in_page = false
			continue
		if not line.begins_with(" ") and not line.contains(":"):
			_flush(out, reg, page_tex)
			reg = {}
			if not in_page:
				in_page = true
				var diffuse := _image_tex(RAW + line)
				if has_normal and not name.ends_with("_glow"):
					var ct := CanvasTexture.new()
					ct.diffuse_texture = diffuse
					ct.normal_texture = _image_tex(RAW + line.replace(".png", "_normal.png"))
					ct.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
					page_tex = ct
				else:
					page_tex = diffuse
			else:
				reg = {"name": line.strip_edges()}
			continue
		if line.begins_with(" ") and not reg.is_empty():
			var kv := line.strip_edges().split(":", true, 1)
			reg[kv[0].strip_edges()] = kv[1].strip_edges()
	_flush(out, reg, page_tex)
	for k in out:
		(out[k] as Array).sort_custom(func(a, b): return a["i"] < b["i"])
	_atlas[name] = out
	return out

static func _flush(out: Dictionary, reg: Dictionary, tex: Texture2D) -> void:
	if reg.is_empty() or not reg.has("xy"):
		return
	var xy := _v(reg["xy"])
	var sz := _v(reg["size"])
	var orig := _v(reg.get("orig", reg["size"]))
	var off := _v(reg.get("offset", "0,0"))
	# libGDX measures the offset from the bottom of the original canvas; keep it from the top-left
	var top_left := Vector2(off.x, orig.y - off.y - sz.y)
	var f := {"tex": tex, "rect": Rect2(xy, sz), "orig": orig, "off": top_left, "i": int(reg.get("index", "-1"))}
	if not out.has(reg["name"]):
		out[reg["name"]] = []
	out[reg["name"]].append(f)

static func _v(s: String) -> Vector2:
	var p := s.split(",")
	return Vector2(float(p[0]), float(p[1]))

# ------------------------------------------------------------------ doodads
## the region for a doodad: doodads/<sprite>[_<state>]_<variant>, as the templates name them
static func doodad_frames(o: Dictionary) -> Array:
	var spr := str(o.get("sprite", ""))
	if spr == "":
		return []
	var A := atlas("Doodads")
	var base := "doodads/" + spr
	var v := str(int(o["variant"])) if o.get("variant") != null and int(o["variant"]) > 0 else "1"
	var cands: Array = []
	if o.get("state") != null and str(o["state"]) != "":
		cands.append("%s_%s_%s" % [base, o["state"], v])
		cands.append("%s_%s_1" % [base, o["state"]])
	cands.append_array(["%s_%s" % [base, v], base + "_1", base])
	for c in cands:
		if A.has(c):
			return [c, A[c]]
	var tl := atlas("Tiles")         # terrain scatter can name a tile sprite
	if tl.has(spr):
		return [spr, [tl[spr][randi() % tl[spr].size()]]]
	return []

static func doodad(o: Dictionary) -> Node2D:
	var fr := doodad_frames(o)
	if fr.is_empty():
		return null
	var node := CmFrames.new()
	node.frames = fr[1]
	node.region = fr[0]
	node.flip = bool(o.get("flip", false))
	node.fps = 8.0
	node.phase = randf() * 10.0
	var glow := atlas("Doodads_glow")
	if glow.has(fr[0]):
		node.glow = glow[fr[0]]
	node.setup()
	return node

# ------------------------------------------------------------------ characters
## which atlas holds a character sprite (bound_stag -> Characters_Bound)
static func char_atlas(sprite: String) -> String:
	if _char_home.is_empty():
		for a in CHAR_ATLASES + ["Characters"]:
			for k in atlas(a):
				var who := str(k).split("/")[0]
				if not _char_home.has(who):
					_char_home[who] = a
	return _char_home.get(sprite.split("/")[0], "")

## a SpriteSet of a Cursemark character: every anim under "<anim>/front" (it faces left or right only), each frame an
## AtlasTexture and its offset from the position (the canvas centre) to the trimmed frame's top-left
static func sprite_set(sprite: String) -> SpriteSet:
	var s := SpriteSet.new()
	s.kind = "cm:" + sprite
	var an := char_atlas(sprite)
	if an == "":
		push_warning("no Cursemark sprite " + sprite)
		return s
	var A := atlas(an)
	var raw := {}
	for k in A:
		var key := str(k)
		if not key.begins_with(sprite + "/"):
			continue
		var anim := key.substr(sprite.length() + 1)
		if anim.contains("/"):
			continue
		var arr: Array = []
		for f in A[k]:
			var at := AtlasTexture.new()
			at.atlas = f["tex"]
			at.region = f["rect"]
			arr.append([at, (f["off"] as Vector2) - (f["orig"] as Vector2) * 0.5])
		raw[anim] = arr
	var fps := {}
	for anim in raw:
		_put(s, anim, "front", raw[anim], fps)
	# directional sets (the player): <anim>_down/_side/_up become the views; diagonals use the side
	for anim in raw:
		for v in ["down", "side", "up"]:
			if str(anim).ends_with("_" + v):
				var base := str(anim).trim_suffix("_" + v)
				_put(s, base, v, raw[anim], fps)
				if v == "side":
					_put(s, base, "front", raw[anim], fps)
					_put(s, base, "back", raw[anim], fps)
	if raw.has("idle_up"):
		_put(s, "idle", "up", raw["idle_up"], fps)
		_put(s, "idle", "back", raw["idle_up"], fps)
	# Godmarrow's acts by their Cursemark names (the first that exists)
	for want in ALIAS:
		if s.anims.has(want):
			continue
		for src in ALIAS[want]:
			if raw.has(src):
				_put(s, want, "front", raw[src], fps)
				break
			if s.anims.has(src):
				for v in ["front", "down", "side", "up", "back"]:
					if s.frames.has(src + "/" + v):
						_put(s, want, v, s.frames[src + "/" + v], fps)
				break
	# a body with no stance of its own (the skeletal minion) stands in the first frame of its walk
	if not s.anims.has("idle") and s.anims.has("walk"):
		for v in ["front", "down", "side", "up", "back"]:
			if s.frames.has("walk/" + v):
				_put(s, "idle", v, [s.frames["walk/" + v][0]], fps)
	# Godmarrow stands a body on its feet (its position is where it touches the ground); Cursemark draws a body round
	# its middle. The feet: the bottom of its standing frame, measured once; every frame is lifted by it.
	var feet := 0.0
	for k in ["idle/front", "walk/front", "idle/down", "walk/down"]:
		if s.frames.has(k) and not s.frames[k].is_empty():
			var f0: Array = s.frames[k][0]
			feet = (f0[1] as Vector2).y + (f0[0] as AtlasTexture).region.size.y - 1.0
			break
	if feet != 0.0:
		for k in s.frames:
			var arr2: Array = s.frames[k]
			var lifted: Array = []
			for f2 in arr2:
				lifted.append([f2[0], (f2[1] as Vector2) - Vector2(0, feet)])
			s.frames[k] = lifted
	s.meta = {"source": "cursemark", "fps": fps, "scale": U, "feet": feet}
	s.ok = not s.frames.is_empty()
	return s

## Godmarrow's anims -> Cursemark's (the player's knight first, then the creatures' own names)
const ALIAS := {
	"walk": ["run", "walk", "move"],
	"atk": ["attack_stab", "attack1", "attack", "lunge_poke", "swipe", "spin", "attack2", "cast", "cast_loop", "pulse"],
	"atk2": ["attack_slash", "attack2", "attack1", "swipe", "cast"],
	"atk3": ["attack_chop", "attack3", "attack2", "attack1"],
	"heavy": ["attack_chop", "attack_combo", "attack2", "attack1"],
	"wind": ["attack_stab_pre", "telegraph1", "telegraph", "cast_telegraph", "swipe_telegraph", "lunge_telegraph",
		"spin_start", "jump_windup", "channel_telegraph", "cast_start", "activate"],
	"cast": ["cast1", "cast", "cast_loop", "attack2", "attack1"],
	"hit": ["hit", "hit_"],
	"stun": ["hit", "hit_", "recover"],
	"recover": ["recover", "cast_recover", "spin_end", "lunge_post"],
	"roll": ["roll", "dash_side", "dash"],
	"dodge": ["roll", "dash_side", "dash"],
	"drink": ["use", "pray"],
	"death": ["die", "death"],
	"die": ["die", "death"],
	"idle": ["idle", "idle_aggressive", "dormant"],
}

static func _put(s: SpriteSet, anim: String, view: String, arr: Array, fps: Dictionary) -> void:
	s.frames[anim + "/" + view] = arr
	s.anims[anim] = {"n": arr.size()}
	fps[anim] = 12.0 if anim.begins_with("run") or anim == "walk" else 10.0
