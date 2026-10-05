"""The first concrete mechanics port: a class's first skills from ``data/skills.json`` onto the nearest Diablo 2 skill
templates, as ``Skills.txt`` and ``SkillDesc.txt`` rows. Each of our skills names a template row (a skill the game
already has whose server and client functions do the nearest thing); the row is copied and our numbers written over
it: the class, the tree page and position, the level, the cost (``manashift`` 5: the mana column is eighths), the
element and the damage ramp, the duration. What a row cannot say is listed, not hidden."""
from __future__ import annotations

import json
from pathlib import Path

from . import tables
from .paths import D2Error, guard_destination, repo_root

# Godmarrow's orders -> the Diablo 2 class whose trees and animations are nearest
CLASS_MAP = {"miasmancer": ("ass", "Assassin", "Shrine Keeper"), "keeper": ("ass", "Assassin", "Shrine Keeper"), "shrine keeper": ("ass", "Assassin", "Shrine Keeper"),
             "animancer": ("nec", "Necromancer", "Hollow Mystic"), "ossumancer": ("nec", "Necromancer", "Ossuarch"), "hemomancer": ("dru", "Druid", "Hemomancer"),
             "monk": ("pal", "Paladin", "The Empty Hand")}
# our skill id -> (template skill, what the template does, what it cannot do)
TEMPLATES = {
    "vblade": ("Poison Dagger", "a melee strike that leaves poison on the target for a time (EType pois, EMin/EMax, ELen)",
               ["the slow (a second element would need a state or code)", "claws only: itypea1 could name the claw class 'h2h'"]),
    "mcloud": ("Holy Fire", "an aura that hurts every enemy in a radius each period (aurarangecalc, periodic, perdelay, EType pois)",
               ["it is an aura you switch on, not a passive (a passive cloud needs code or a passive state trick)", "'blows miss' needs an aurastat on the enemies' to-hit"]),
    "shuriken": ("Plague Javelin", "a thrown missile that trails poison clouds (srvmissile, EType pois, ELen)",
                 ["the spiral path (a missile with pSrvDoFunc that curves; Missiles.txt work)", "'per cut' repeated hits along the path (Pierce on the missile)"]),
}
DEFAULT_TEMPLATE = ("Blade Fury", "a ranged attack the class animates with SC", ["most of it: pick a better template by hand"])


def load_skills(repo: Path | None = None) -> dict:
    root = repo or repo_root() or Path(".")
    f = Path(root) / "data" / "skills.json"
    if not f.exists():
        raise D2Error(f"no {f}: run from the game repository, or pass --skills")
    return json.loads(f.read_text())


def class_skills(data: dict, class_name: str, n: int = 3) -> list[dict]:
    key = class_name.strip().lower()
    cid = None
    for k, (_, _, title) in CLASS_MAP.items():
        if key in (k, title.lower()):
            cid = {"keeper": "miasmancer", "shrine keeper": "miasmancer"}.get(k, k)
            break
    if cid is None:
        raise D2Error(f"unknown class {class_name!r}; one of {sorted(set(CLASS_MAP))}")
    mine = [s for s in data["skills"] if s["class"] == cid]
    mine.sort(key=lambda s: (s["required_level"], s["tab"], s["row"], s["col"]))
    return mine[:n]


def _vals(skill: dict, level: int) -> list[float]:
    lv = skill.get("levels", {}).get(str(level), {}).get("values", [])
    return [v[0] if isinstance(v, list) and v else (v if isinstance(v, (int, float)) else 0) for v in lv]


def _ramp(skill: dict, index: int) -> tuple[float, list[float]]:
    """A value at level 1 and its steps over levels 2..6 (what MinLevDam1..5 hold)."""
    v1 = _vals(skill, 1)
    base = v1[index] if index < len(v1) else 0
    steps = []
    for lv in range(2, 7):
        v = _vals(skill, lv)
        prev = _vals(skill, lv - 1)
        steps.append((v[index] if index < len(v) else 0) - (prev[index] if index < len(prev) else 0))
    return base, steps


def _damage_index(skill: dict) -> int | None:
    for i, t in enumerate(skill.get("info_template", [])):
        tl = t.lower()
        if "damage" in tl or "/s" in tl or "per cut" in tl or "each" in tl:
            return i
    return None


def _seconds_index(skill: dict) -> int | None:
    for i, t in enumerate(skill.get("info_template", [])):
        if t.lower().strip().endswith("s") and "#" in t and "yd" not in t and "%" not in t:
            return i
    return None


def _radius_index(skill: dict) -> int | None:
    for i, t in enumerate(skill.get("info_template", [])):
        if "yd" in t.lower():
            return i
    return None


def port_skills(class_name: str, out_dir: str | Path, *, count: int = 3, source=None, skills_file: str | Path | None = None, prefix: str = "gm_") -> dict:
    """Write ``Skills.txt`` and ``SkillDesc.txt`` into ``out_dir``: whole tables when the game's are at hand (through
    ``source``, a :class:`D2Source`), else fragments with the columns set (``complete`` says which)."""
    out_dir = Path(out_dir)
    data = json.loads(Path(skills_file).read_text()) if skills_file else load_skills()
    picked = class_skills(data, class_name, count)
    code, d2class, title = CLASS_MAP[{"keeper": "miasmancer", "shrine keeper": "miasmancer"}.get(class_name.strip().lower(), class_name.strip().lower())] \
        if class_name.strip().lower() in CLASS_MAP else CLASS_MAP[picked[0]["class"]]
    base_skills = base_desc = None
    if source is not None:
        try:
            base_skills = tables.read(source.get("data/global/excel/Skills.txt", "the skill table"))
            base_desc = tables.read(source.get("data/global/excel/SkillDesc.txt", "the skill descriptions"))
            guard_destination(out_dir, "tables copied from the game")
        except D2Error:
            base_skills = base_desc = None
    out_dir.mkdir(parents=True, exist_ok=True)
    from .synthetic import SKILLDESC_COLUMNS, SKILL_COLUMNS
    skills_t = base_skills or {"columns": list(SKILL_COLUMNS), "rows": []}
    desc_t = base_desc or {"columns": list(SKILLDESC_COLUMNS), "rows": []}
    next_id = max([int(r["Id"]) for r in skills_t["rows"] if str(r.get("Id", "")).isdigit()] + [400]) + 1
    mapping = []
    for s in picked:
        tmpl_name, does, cannot = TEMPLATES.get(s["id"], DEFAULT_TEMPLATE)
        tmpl = tables.find_row(skills_t, "skill", tmpl_name) if base_skills else None
        row = dict(tmpl) if tmpl else {c: "" for c in skills_t["columns"]}
        sid = f"{prefix}{s['id']}"
        cost = float(s.get("cost", {}).get("base") or 0)
        per = float(s.get("cost", {}).get("per_level_pct") or 0) / 100.0
        dmg_i, sec_i, rad_i = _damage_index(s), _seconds_index(s), _radius_index(s)
        row.update({"skill": sid, "Id": str(next_id), "charclass": code, "skilldesc": sid, "reqlevel": str(s["required_level"]), "maxlvl": str(s.get("max_hard_level", 20)),
                    "skpoints": "1", "InGame": "1", "reqskill1": f"{prefix}{s['prerequisites'][0]}" if s.get("prerequisites") else "",
                    "mana": str(int(round(cost * 8))), "lvlmana": str(int(round(cost * per * 8))), "manashift": "5", "passive": "1" if s["kind"] == "passive" else "",
                    "*eol": "0"})
        if tmpl is None:
            row.update({"anim": "A1" if ("claw" in (s["description"] + s["name"]).lower() or s["cast_type"] == "self") else "SC"})
        if dmg_i is not None:
            base, steps = _ramp(s, dmg_i)
            row.update({"EType": "pois", "EMin": str(int(round(base))), "EMax": str(int(round(base * 1.2)))})
            for k, st in enumerate(steps, 1):
                row[f"EMinLev{k}"] = str(int(round(st))); row[f"EMaxLev{k}"] = str(int(round(st * 1.2)))
        if sec_i is not None:
            base, steps = _ramp(s, sec_i)
            row["ELen"] = str(int(round(base * 25)))
            for k, st in enumerate(steps[:3], 1):
                row[f"ELevLen{k}"] = str(int(round(st * 25)))
        if rad_i is not None:
            base, _ = _ramp(s, rad_i)
            row["aurarangecalc" if s["kind"] == "passive" else "Param1"] = str(int(round(base * 2)))      # yards -> the game's sub-tile pairs (1 yard = 1 tile = 2 sub... as a first cut)
        if s["kind"] == "passive":
            row.update({"aura": "1", "periodic": "1", "perdelay": row.get("perdelay") or "50", "InTown": "0"})
        tables.upsert_row(skills_t, "skill", row)
        drow = dict(tables.find_row(desc_t, "skilldesc", tmpl.get("skilldesc", "")) if tmpl and base_desc else None or {c: "" for c in desc_t["columns"]})
        drow.update({"skilldesc": sid, "SkillPage": str(int(s["tab"]) + 1), "SkillRow": str(s["row"]), "SkillColumn": str(s["col"]), "ListRow": "1", "IconCel": drow.get("IconCel") or "0",
                     "str name": s["name"], "str short": s["name"], "str long": s["description"][:120], "str alt": s["name"], "str mana": "manacost", "*eol": "0"})
        for i, t in enumerate(s.get("info_template", [])[:3], 1):
            drow[f"descline{i}"] = "1"
            drow[f"desctexta{i}"] = t.replace("#", "%d")
        tables.upsert_row(desc_t, "skilldesc", drow)
        mapping.append({"id": s["id"], "name": s["name"], "tree": s["tree"], "row": s["row"], "col": s["col"], "kind": s["kind"], "template": tmpl_name, "template_found": tmpl is not None,
                        "does": does, "cannot": cannot, "d2_skill": sid, "d2_id": next_id, "mana_eighths": row["mana"], "level": s["required_level"]})
        next_id += 1
    tables.write(skills_t, out_dir / "Skills.txt")
    tables.write(desc_t, out_dir / "SkillDesc.txt")
    return {"ok": True, "class": title, "d2_class": d2class, "charclass": code, "skills": mapping, "files": [str(out_dir / "Skills.txt"), str(out_dir / "SkillDesc.txt")],
            "complete": base_skills is not None, "note": "whole tables from the game with our rows added" if base_skills else
            "fragments: only the columns we set, to merge into the game's Skills.txt and SkillDesc.txt (extract them into the reference folder for whole tables)"}
