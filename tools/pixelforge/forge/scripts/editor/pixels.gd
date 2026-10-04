extends RefCounted
const Pal := preload("res://scripts/editor/palette.gd")
## scripts/editor/pixels.gd: the raster algorithms, all static and all on plain Images, so a headless test can run
## them. A mask is a PackedByteArray of width*height (1 = selected); an empty mask means no selection, everything
## allowed. Points are Vector2i. Nothing here is anti-aliased.

# ------------------------------------------------------------------ point sets
static func line_points(a: Vector2i, b: Vector2i) -> Array:
	var out := []
	var dx := absi(b.x - a.x)
	var dy := -absi(b.y - a.y)
	var sx := 1 if a.x < b.x else -1
	var sy := 1 if a.y < b.y else -1
	var err := dx + dy
	var p := a
	while true:
		out.append(p)
		if p == b:
			break
		var e2 := 2 * err
		if e2 >= dy:
			err += dy
			p.x += sx
		if e2 <= dx:
			err += dx
			p.y += sy
	return out

## a brush tip of diameter `size`: 1 a pixel, 2 a 2x2 block, 3 a plus, 4 and up a round dot
static func brush_points(c: Vector2i, size: int) -> Array:
	size = maxi(size, 1)
	if size == 1:
		return [c]
	if size == 2:
		return [c, c + Vector2i(1, 0), c + Vector2i(0, 1), c + Vector2i(1, 1)]
	if size == 3:
		return [c, c + Vector2i(1, 0), c + Vector2i(-1, 0), c + Vector2i(0, 1), c + Vector2i(0, -1)]
	var out := []
	var r := size / 2.0
	var lo := -int(floor(r))
	var hi := int(ceil(r))
	for y in range(lo, hi + 1):
		for x in range(lo, hi + 1):
			var px := x + (0.5 if size % 2 == 0 else 0.0)
			var py := y + (0.5 if size % 2 == 0 else 0.0)
			if px * px + py * py <= r * r + 0.1:
				out.append(c + Vector2i(x, y))
	return out

## a stroke: the brush stamped along the line from a to b (a == b is one dab)
static func stroke_points(a: Vector2i, b: Vector2i, size: int) -> Array:
	var seen := {}
	var out := []
	for p in line_points(a, b):
		for q in brush_points(p, size):
			if not seen.has(q):
				seen[q] = true
				out.append(q)
	return out

static func rect_points(a: Vector2i, b: Vector2i, filled: bool) -> Array:
	var x0 := mini(a.x, b.x)
	var x1 := maxi(a.x, b.x)
	var y0 := mini(a.y, b.y)
	var y1 := maxi(a.y, b.y)
	var out := []
	for y in range(y0, y1 + 1):
		for x in range(x0, x1 + 1):
			if filled or x == x0 or x == x1 or y == y0 or y == y1:
				out.append(Vector2i(x, y))
	return out

## an ellipse in the box a..b: the midpoint algorithm on the box's centre and radii (odd and even sizes both)
static func ellipse_points(a: Vector2i, b: Vector2i, filled: bool) -> Array:
	var x0 := mini(a.x, b.x)
	var x1 := maxi(a.x, b.x)
	var y0 := mini(a.y, b.y)
	var y1 := maxi(a.y, b.y)
	var w := x1 - x0 + 1
	var h := y1 - y0 + 1
	if w <= 2 or h <= 2:
		return rect_points(a, b, filled)
	var rx := w / 2.0
	var ry := h / 2.0
	var cx := x0 + rx - 0.5
	var cy := y0 + ry - 0.5
	var inside := {}
	for y in range(y0, y1 + 1):
		for x in range(x0, x1 + 1):
			var dx := (x - cx) / rx
			var dy := (y - cy) / ry
			if dx * dx + dy * dy <= 1.0 + 0.5 / maxf(rx, ry):
				inside[Vector2i(x, y)] = true
	var out := []
	for p in inside:
		if filled:
			out.append(p)
			continue
		var edge := false
		for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
			if not inside.has(p + d):
				edge = true
				break
		if edge:
			out.append(p)
	return out

# ------------------------------------------------------------------ masks
static func empty_mask(w: int, h: int) -> PackedByteArray:
	var m := PackedByteArray()
	m.resize(w * h)
	m.fill(0)
	return m

static func full_mask(w: int, h: int) -> PackedByteArray:
	var m := PackedByteArray()
	m.resize(w * h)
	m.fill(1)
	return m

static func mask_count(m: PackedByteArray) -> int:
	var n := 0
	for v in m:
		if v != 0:
			n += 1
	return n

static func mask_allows(m: PackedByteArray, w: int, p: Vector2i) -> bool:
	return m.is_empty() or m[p.y * w + p.x] != 0

static func rect_mask(w: int, h: int, a: Vector2i, b: Vector2i) -> PackedByteArray:
	var m := empty_mask(w, h)
	for p in rect_points(a, b, true):
		if p.x >= 0 and p.y >= 0 and p.x < w and p.y < h:
			m[p.y * w + p.x] = 1
	return m

## a lasso: the polygon's inside by the even-odd rule on pixel centres
static func polygon_mask(w: int, h: int, pts: Array) -> PackedByteArray:
	var m := empty_mask(w, h)
	if pts.size() < 3:
		return m
	var n := pts.size()
	for y in h:
		var cy := y + 0.5
		var xs := []
		for i in n:
			var p: Vector2 = Vector2(pts[i])
			var q: Vector2 = Vector2(pts[(i + 1) % n])
			if (p.y <= cy and q.y > cy) or (q.y <= cy and p.y > cy):
				xs.append(p.x + (cy - p.y) * (q.x - p.x) / (q.y - p.y))
		xs.sort()
		var k := 0
		while k + 1 < xs.size():
			var xa := int(ceil(xs[k] - 0.5))
			var xb := int(floor(xs[k + 1] - 0.5))
			for x in range(maxi(xa, 0), mini(xb, w - 1) + 1):
				m[y * w + x] = 1
			k += 2
	return m

## the magic wand / the fill's region: pixels like the seed within `tol` (OKLab; alpha decides for see-through),
## connected to it (contiguous) or anywhere (global)
static func flood_mask(img: Image, seed: Vector2i, tol: float, contiguous: bool) -> PackedByteArray:
	var w := img.get_width()
	var h := img.get_height()
	var m := empty_mask(w, h)
	if seed.x < 0 or seed.y < 0 or seed.x >= w or seed.y >= h:
		return m
	var sc := img.get_pixel(seed.x, seed.y)
	var clear := sc.a < 0.5
	var slab := Pal.to_oklab(sc)
	var like := func(c: Color) -> bool:
		if clear:
			return c.a < 0.5
		if c.a < 0.5:
			return false
		if tol <= 0.0:
			return Pal.same_rgb(c, sc)
		return Pal.to_oklab(c).distance_to(slab) <= tol
	if not contiguous:
		for y in h:
			for x in w:
				if like.call(img.get_pixel(x, y)):
					m[y * w + x] = 1
		return m
	var stack: Array = [seed]
	m[seed.y * w + seed.x] = 1
	while not stack.is_empty():
		var p: Vector2i = stack.pop_back()
		for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
			var q: Vector2i = p + d
			if q.x < 0 or q.y < 0 or q.x >= w or q.y >= h:
				continue
			var i := q.y * w + q.x
			if m[i] != 0:
				continue
			if like.call(img.get_pixel(q.x, q.y)):
				m[i] = 1
				stack.append(q)
	return m

## replace | add | subtract | intersect
static func mask_combine(a: PackedByteArray, b: PackedByteArray, mode: String) -> PackedByteArray:
	if mode == "replace" or a.is_empty():
		return b if mode != "subtract" else a
	var out := a.duplicate()
	for i in mini(a.size(), b.size()):
		match mode:
			"add":
				out[i] = 1 if (a[i] != 0 or b[i] != 0) else 0
			"subtract":
				out[i] = 1 if (a[i] != 0 and b[i] == 0) else 0
			"intersect":
				out[i] = 1 if (a[i] != 0 and b[i] != 0) else 0
	return out

static func mask_invert(m: PackedByteArray, w: int, h: int) -> PackedByteArray:
	if m.is_empty():
		return empty_mask(w, h)
	var out := m.duplicate()
	for i in out.size():
		out[i] = 0 if m[i] != 0 else 1
	return out

static func mask_bounds(m: PackedByteArray, w: int, h: int) -> Rect2i:
	if m.is_empty():
		return Rect2i(0, 0, w, h)
	var x0 := w
	var y0 := h
	var x1 := -1
	var y1 := -1
	for y in h:
		for x in w:
			if m[y * w + x] != 0:
				x0 = mini(x0, x); x1 = maxi(x1, x); y0 = mini(y0, y); y1 = maxi(y1, y)
	if x1 < 0:
		return Rect2i()
	return Rect2i(x0, y0, x1 - x0 + 1, y1 - y0 + 1)

static func mask_shift(m: PackedByteArray, w: int, h: int, d: Vector2i) -> PackedByteArray:
	if m.is_empty():
		return m
	var out := empty_mask(w, h)
	for y in h:
		for x in w:
			if m[y * w + x] != 0:
				var q: Vector2i = Vector2i(x, y) + d
				if q.x >= 0 and q.y >= 0 and q.x < w and q.y < h:
					out[q.y * w + q.x] = 1
	return out

## the mask's outline, as the pixels inside it with an outside neighbour (what the canvas draws as the marching line)
static func mask_edge(m: PackedByteArray, w: int, h: int) -> Array:
	var out := []
	if m.is_empty():
		return out
	for y in h:
		for x in w:
			if m[y * w + x] == 0:
				continue
			for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
				var q: Vector2i = Vector2i(x, y) + d
				if q.x < 0 or q.y < 0 or q.x >= w or q.y >= h or m[q.y * w + q.x] == 0:
					out.append(Vector2i(x, y))
					break
	return out

# ------------------------------------------------------------------ painting
## set the points to one colour, inside the image and the mask; returns how many changed
static func apply(img: Image, points: Array, c: Color, mask: PackedByteArray) -> int:
	var w := img.get_width()
	var h := img.get_height()
	var n := 0
	for pp in points:
		var p: Vector2i = pp
		if p.x < 0 or p.y < 0 or p.x >= w or p.y >= h:
			continue
		if not mask_allows(mask, w, p):
			continue
		if img.get_pixel(p.x, p.y) != c:
			img.set_pixel(p.x, p.y, c)
			n += 1
	return n

## the fill: the region like the seed, painted (contiguous or global), inside the mask
static func fill(img: Image, seed: Vector2i, c: Color, contiguous: bool, tol: float, mask: PackedByteArray) -> int:
	var region := flood_mask(img, seed, tol, contiguous)
	var w := img.get_width()
	var h := img.get_height()
	var n := 0
	for y in h:
		for x in w:
			var i := y * w + x
			if region[i] != 0 and (mask.is_empty() or mask[i] != 0):
				if img.get_pixel(x, y) != c:
					img.set_pixel(x, y, c)
					n += 1
	return n

## the clone stamp: the source image sampled at p - offset for every brush point, painted at p (see-through is
## skipped: the stamp never copies bare background); colours go through `snap` (the palette lock)
static func clone(img: Image, src: Image, points: Array, offset: Vector2i, mask: PackedByteArray, snap: Callable) -> int:
	var w := img.get_width()
	var h := img.get_height()
	var n := 0
	for pp in points:
		var p: Vector2i = pp
		if p.x < 0 or p.y < 0 or p.x >= w or p.y >= h or not mask_allows(mask, w, p):
			continue
		var q: Vector2i = Vector2i(p) - offset
		if q.x < 0 or q.y < 0 or q.x >= src.get_width() or q.y >= src.get_height():
			continue
		var c := src.get_pixel(q.x, q.y)
		if c.a < 0.5:
			continue
		if snap.is_valid():
			c = snap.call(c)
		if img.get_pixel(p.x, p.y) != c:
			img.set_pixel(p.x, p.y, c)
			n += 1
	return n

## clear the selection (or everything)
static func clear(img: Image, mask: PackedByteArray) -> int:
	return apply(img, rect_points(Vector2i.ZERO, Vector2i(img.get_width() - 1, img.get_height() - 1), true), Color(0, 0, 0, 0), mask)

## the selected pixels (or the whole image) flipped left-right (mirror) or top-bottom (flip) within their box
static func flip(img: Image, mask: PackedByteArray, horizontal: bool) -> void:
	var w := img.get_width()
	var h := img.get_height()
	var box := mask_bounds(mask, w, h)
	if box.size.x <= 0 or box.size.y <= 0:
		return
	var copy := img.duplicate()
	for y in range(box.position.y, box.end.y):
		for x in range(box.position.x, box.end.x):
			var i := y * w + x
			if not mask.is_empty() and mask[i] == 0:
				continue
			var sx := (box.position.x + box.end.x - 1 - x) if horizontal else x
			var sy := y if horizontal else (box.position.y + box.end.y - 1 - y)
			var src_in := mask.is_empty() or mask[sy * w + sx] != 0
			img.set_pixel(x, y, copy.get_pixel(sx, sy) if src_in else Color(0, 0, 0, 0))

## lift the selection's pixels out: returns {image (the floating piece, image-sized), mask}; the source is cleared
static func lift(img: Image, mask: PackedByteArray) -> Image:
	var w := img.get_width()
	var h := img.get_height()
	var out := Image.create_empty(w, h, false, Image.FORMAT_RGBA8)
	out.fill(Color(0, 0, 0, 0))
	for y in h:
		for x in w:
			if mask.is_empty() or mask[y * w + x] != 0:
				out.set_pixel(x, y, img.get_pixel(x, y))
				img.set_pixel(x, y, Color(0, 0, 0, 0))
	return out

## lay a floating piece down shifted by d (see-through pixels of the piece leave what is under them)
static func stamp(img: Image, piece: Image, d: Vector2i) -> int:
	var w := img.get_width()
	var h := img.get_height()
	var n := 0
	for y in piece.get_height():
		for x in piece.get_width():
			var c := piece.get_pixel(x, y)
			if c.a < 0.5:
				continue
			var q: Vector2i = Vector2i(x, y) + d
			if q.x >= 0 and q.y >= 0 and q.x < w and q.y < h:
				img.set_pixel(q.x, q.y, c)
				n += 1
	return n

## move the selection's pixels by d (copy = leave the original); returns the mask moved with them
static func nudge(img: Image, mask: PackedByteArray, d: Vector2i, copy: bool) -> PackedByteArray:
	var w := img.get_width()
	var h := img.get_height()
	var piece: Image
	if copy:
		piece = img.duplicate()
		if not mask.is_empty():
			for y in h:
				for x in w:
					if mask[y * w + x] == 0:
						piece.set_pixel(x, y, Color(0, 0, 0, 0))
	else:
		piece = lift(img, mask)
	stamp(img, piece, d)
	return mask_shift(mask, w, h, d)

# ------------------------------------------------------------------ differences (what a change touched)
## the pixels that differ between two images: [[x, y, rgba32_after], ...]
static func diff(before: Image, after: Image) -> Array:
	var out := []
	var w := mini(before.get_width(), after.get_width())
	var h := mini(before.get_height(), after.get_height())
	for y in h:
		for x in w:
			var a := before.get_pixel(x, y)
			var b := after.get_pixel(x, y)
			if a != b:
				out.append([x, y, b.to_rgba32()])
	return out

static func copy_of(img: Image) -> Image:
	return img.duplicate() if img else null

static func blank(w: int, h: int) -> Image:
	var img := Image.create_empty(maxi(w, 1), maxi(h, 1), false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	return img

## layers composed top to bottom with their opacity ("normal" only): the frame as the person sees it
static func composite(layers: Array, w: int, h: int) -> Image:
	var out := blank(w, h)
	for L in layers:
		if not L.visible or L.image == null:
			continue
		var op: float = L.opacity
		for y in mini(h, L.image.get_height()):
			for x in mini(w, L.image.get_width()):
				var c: Color = L.image.get_pixel(x, y)
				if c.a <= 0.0:
					continue
				var a := c.a * op
				if a >= 0.999:
					out.set_pixel(x, y, Color(c.r, c.g, c.b, 1.0))
				else:
					var u := out.get_pixel(x, y)
					var na := a + u.a * (1.0 - a)
					if na <= 0.0:
						continue
					var r := (c.r * a + u.r * u.a * (1.0 - a)) / na
					var g := (c.g * a + u.g * u.a * (1.0 - a)) / na
					var b := (c.b * a + u.b * u.a * (1.0 - a)) / na
					out.set_pixel(x, y, Color(r, g, b, na))
	return out
