"""The game's tab-separated tables (``data/global/excel/*.txt``): a header row of column names, one row a line.
Read into column order plus rows as dicts; written back the same way (CRLF, as the game's own files)."""
from __future__ import annotations

from pathlib import Path


def read(path: str | Path) -> dict:
    text = Path(path).read_text(encoding="utf-8", errors="replace")
    lines = [l for l in text.splitlines() if l.strip("\r\n")]
    if not lines:
        return {"columns": [], "rows": []}
    cols = lines[0].rstrip("\r").split("\t")
    rows = []
    for line in lines[1:]:
        vals = line.rstrip("\r").split("\t")
        vals += [""] * (len(cols) - len(vals))
        rows.append(dict(zip(cols, vals[:len(cols)])))
    return {"columns": cols, "rows": rows}


def write(table: dict, path: str | Path) -> None:
    cols = table["columns"]
    out = ["\t".join(cols)]
    for r in table["rows"]:
        out.append("\t".join(str(r.get(c, "")) for c in cols))
    Path(path).write_text("\r\n".join(out) + "\r\n", encoding="utf-8")


def find_row(table: dict, column: str, value: str) -> dict | None:
    for r in table["rows"]:
        if r.get(column, "") == value:
            return r
    return None


def upsert_row(table: dict, column: str, row: dict) -> dict:
    """Replace the row whose ``column`` equals the new row's, or append; columns the table lacks are added."""
    for c in row:
        if c not in table["columns"]:
            table["columns"].append(c)
    full = {c: row.get(c, "") for c in table["columns"]}
    for i, r in enumerate(table["rows"]):
        if r.get(column, "") == full[column]:
            table["rows"][i] = full
            return full
    table["rows"].append(full)
    return full


def expansion_marker(table: dict) -> int | None:
    """The index of the ``Expansion`` row many tables carry (rows after it are the expansion's); None when absent."""
    first = table["columns"][0] if table["columns"] else None
    for i, r in enumerate(table["rows"]):
        if first and r.get(first, "") == "Expansion":
            return i
    return None
