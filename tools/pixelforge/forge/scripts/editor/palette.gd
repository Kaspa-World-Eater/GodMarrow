extends RefCounted
## scripts/editor/palette.gd: colour maths for the editor. Every distance is OKLab (the pipeline's rule); the palette
## is the frame set's own colours, and the lock snaps anything painted to the nearest of them. "open" lets a colour in
## knowingly and counts what was added.

const LOCKED := "locked"
const OPEN := "open"

var colours: PackedColorArray = []     # the palette, in the order found (slot = index)
var labs: PackedVector3Array = []      # OKLab of each slot
var mode := LOCKED
var added := 0                         # colours let in while open
var source_count := 0                  # how many came from the frames

# ------------------------------------------------------------------ OKLab (Björn Ottosson's reference)
static func _lin(c: float) -> float:
	return c / 12.92 if c <= 0.04045 else pow((c + 0.055) / 1.055, 2.4)

static func _gam(c: float) -> float:
	return 12.92 * c if c <= 0.0031308 else 1.055 * pow(c, 1.0 / 2.4) - 0.055

static func to_oklab(c: Color) -> Vector3:
	var r := _lin(c.r)
	var g := _lin(c.g)
	var b := _lin(c.b)
	var l := 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
	var m := 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
	var s := 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
	var l_ := signf(l) * pow(absf(l), 1.0 / 3.0)
	var m_ := signf(m) * pow(absf(m), 1.0 / 3.0)
	var s_ := signf(s) * pow(absf(s), 1.0 / 3.0)
	return Vector3(
		0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
		1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
		0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_)

static func from_oklab(lab: Vector3) -> Color:
	var l_ := lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z
	var m_ := lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z
	var s_ := lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z
	var l := l_ * l_ * l_
	var m := m_ * m_ * m_
	var s := s_ * s_ * s_
	var r := 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
	var g := -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
	var b := -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
	return Color(clampf(_gam(r), 0.0, 1.0), clampf(_gam(g), 0.0, 1.0), clampf(_gam(b), 0.0, 1.0), 1.0)

static func distance(a: Color, b: Color) -> float:
	return to_oklab(a).distance_to(to_oklab(b))

## OKLab as the picker shows it: L 0..100, a and b in -0.4..0.4 as hundredths
static func oklab_text(c: Color) -> String:
	var lab := to_oklab(c)
	return "L %d  a %+.2f  b %+.2f" % [int(round(lab.x * 100.0)), lab.y, lab.z]

static func hex(c: Color) -> String:
	return "#" + c.to_html(false)

static func same_rgb(a: Color, b: Color) -> bool:
	return a.r8 == b.r8 and a.g8 == b.g8 and a.b8 == b.b8

# ------------------------------------------------------------------ the palette
func clear() -> void:
	colours = []
	labs = []
	added = 0
	source_count = 0

func size() -> int:
	return colours.size()

## every opaque colour of an image (alpha over half) that is not yet a slot
func add_image(img: Image) -> int:
	if img == null:
		return 0
	var before := colours.size()
	var seen := {}
	for i in colours.size():
		seen[colours[i].to_rgba32() & 0xFFFFFF00] = true
	var w := img.get_width()
	var h := img.get_height()
	for y in h:
		for x in w:
			var c := img.get_pixel(x, y)
			if c.a < 0.5:
				continue
			var key := c.to_rgba32() & 0xFFFFFF00
			if seen.has(key):
				continue
			seen[key] = true
			_push(Color(c.r, c.g, c.b, 1.0))
	source_count = colours.size()
	return colours.size() - before

func _push(c: Color) -> int:
	colours.append(c)
	labs.append(to_oklab(c))
	return colours.size() - 1

## the slot of an exact colour, or -1
func slot_of(c: Color) -> int:
	for i in colours.size():
		if same_rgb(colours[i], c):
			return i
	return -1

## the nearest slot in OKLab
func nearest(c: Color) -> int:
	if colours.is_empty():
		return -1
	var lab := to_oklab(c)
	var best := 0
	var best_d := 1e9
	for i in labs.size():
		var d := labs[i].distance_squared_to(lab)
		if d < best_d:
			best_d = d
			best = i
	return best

## the colour that may be painted: locked snaps to the nearest slot; open lets a new one in (and counts it).
## Returns {colour, slot, snapped, added}
func resolve(c: Color) -> Dictionary:
	if c.a < 0.5:
		return {"colour": Color(0, 0, 0, 0), "slot": -1, "snapped": false, "added": false}
	var opaque := Color(c.r, c.g, c.b, 1.0)
	var s := slot_of(opaque)
	if s >= 0:
		return {"colour": colours[s], "slot": s, "snapped": false, "added": false}
	if mode == OPEN or colours.is_empty():
		s = _push(opaque)
		added += 1
		return {"colour": opaque, "slot": s, "snapped": false, "added": true}
	s = nearest(opaque)
	return {"colour": colours[s], "slot": s, "snapped": true, "added": false}

func snap(c: Color) -> Color:
	return resolve(c)["colour"]

## the palette as hex strings (for the project's frame data and the driver's `info`)
func to_hex_list() -> PackedStringArray:
	var out: PackedStringArray = []
	for c in colours:
		out.append(hex(c))
	return out

func from_hex_list(list: Array) -> void:
	clear()
	for h in list:
		_push(Color(String(h)))
	source_count = colours.size()
