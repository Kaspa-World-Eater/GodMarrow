extends RefCounted
## Cursemark's data tables (cursemark_raw/data.cdb, a CastleDB file) read once, by sheet and by row id (the fork).

static var _sheets := {}

static func sheet(name: String) -> Dictionary:
	if _sheets.is_empty():
		var j = JSON.parse_string(text("res://cursemark/raw/data.cdb"))
		if j is Dictionary:
			for s in j["sheets"]:
				var by := {}
				for l in s["lines"]:
					if l.has("id"):
						by[str(l["id"])] = l
				_sheets[str(s["name"])] = by
	return _sheets.get(name, {})

static func row(sheet_name: String, id: String) -> Dictionary:
	return sheet(sheet_name).get(id, {})

## a Cursemark text file without the NUL its packing left at the end (reading it as text warned on every load)
static func text(path: String) -> String:
	var b := FileAccess.get_file_as_bytes(path)
	var n := b.size()
	while n > 0 and b[n - 1] == 0:
		n -= 1
	return b.slice(0, n).get_string_from_utf8()
