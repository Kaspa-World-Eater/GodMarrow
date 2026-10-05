"""A made-up token in the game's own layout, for tests, the Forge's sweep and anyone without the game at hand:
``data/global/chars/<TOKEN>/COF/*.cof``, ``.../TR/*.dcc``, the act palette, ``animdata.d2`` and small ``excel``
tables. Nothing here is Blizzard's; it is a stick figure in our own colours."""
from __future__ import annotations

from pathlib import Path

import numpy as np

from . import animdata, cof as COF, dcc, tables
from .pal import synthetic_palette
from .paths import guard_destination

SKILL_COLUMNS = ["skill", "Id", "charclass", "skilldesc", "srvstfunc", "srvdofunc", "srvmissile", "cltstfunc", "cltdofunc", "cltmissile", "anim", "seqtrans",
                 "reqlevel", "maxlvl", "reqskill1", "mana", "lvlmana", "manashift", "passive", "aura", "aurastate", "aurarangecalc", "aurastat1", "aurastatcalc1",
                 "periodic", "perdelay", "range", "itypea1", "EType", "EMin", "EMinLev1", "EMinLev2", "EMinLev3", "EMinLev4", "EMinLev5", "EMax", "EMaxLev1",
                 "EMaxLev2", "EMaxLev3", "EMaxLev4", "EMaxLev5", "ELen", "ELevLen1", "ELevLen2", "ELevLen3", "Param1", "Param2", "Param3", "calc1", "skpoints",
                 "InGame", "*eol"]
SKILLDESC_COLUMNS = ["skilldesc", "SkillPage", "SkillRow", "SkillColumn", "ListRow", "IconCel", "str name", "str short", "str long", "str alt", "str mana",
                     "descdam", "descline1", "desctexta1", "desctextb1", "desccalca1", "desccalcb1", "descline2", "desctexta2", "desctextb2", "desccalca2",
                     "desccalcb2", "descline3", "desctexta3", "desctextb3", "desccalca3", "desccalcb3", "dsc2line1", "dsc2texta1", "dsc2textb1", "dsc2calca1",
                     "dsc2calcb1", "*eol"]
MONSTATS2_COLUMNS = ["Id", "Height", "OverlayHeight", "pixHeight", "SizeX", "SizeY", "spawnCol", "MeleeRng", "BaseW", "HitClass", "HDv", "TRv", "LGv", "RAv", "LAv",
                     "RHv", "LHv", "SHv", "S1v", "S2v", "S3v", "S4v", "S5v", "S6v", "S7v", "S8v", "HD", "TR", "LG", "RA", "LA", "RH", "LH", "SH", "S1", "S2", "S3",
                     "S4", "S5", "S6", "S7", "S8", "TotalPieces", "mDT", "mNU", "mWL", "mGH", "mA1", "mA2", "mBL", "mSC", "mS1", "mS2", "mS3", "mS4", "mDD", "mKB",
                     "mSQ", "mRN", "dDT", "dNU", "dWL", "dGH", "dA1", "dA2", "dBL", "dSC", "dS1", "dS2", "dS3", "dS4", "dDD", "dKB", "dSQ", "dRN", "A1mv", "A2mv",
                     "SCmv", "S1mv", "S2mv", "S3mv", "S4mv", "noGfxHitTest", "htTop", "htLeft", "htWidth", "htHeight", "restore", "automapCel", "noMap", "noOvly",
                     "isSel", "alSel", "noSel", "shiftSel", "corpseSel", "revive", "critter", "small", "large", "soft", "inert", "objCol", "deadCol", "unflatDead",
                     "Shadow", "noUniqueShift", "compositeDeath", "localBlood", "Bleed", "Light", "light-r", "light-g", "light-b", "Utrans", "Utrans(N)", "Utrans(H)",
                     "InfernoLen", "InfernoAnim", "InfernoRollback", "ResurrectMode", "ResurrectSkill", "*eol"]
MONSTATS_COLUMNS = ["Id", "*hcIdx", "BaseId", "NextInClass", "TransLvl", "NameStr", "MonStatsEx", "MonProp", "MonType", "AI", "DescStr", "Code", "enabled", "rangedtype",
                    "placespawn", "spawn", "spawnx", "spawny", "spawnmode", "minion1", "minion2", "SetBoss", "BossXfer", "PartyMin", "PartyMax", "MinGrp", "MaxGrp",
                    "sparsePopulate", "Velocity", "Run", "Rarity", "Level", "Level(N)", "Level(H)", "MonSound", "UMonSound", "threat", "aidel", "aidel(N)", "aidel(H)",
                    "aidist", "aidist(N)", "aidist(H)", "aip1", "aip2", "aip3", "aip4", "aip5", "aip6", "aip7", "aip8", "MissA1", "MissA2", "MissS1", "MissS2", "MissS3",
                    "MissS4", "MissC", "MissSQ", "Align", "isSpawn", "isMelee", "npc", "interact", "inventory", "inTown", "lUndead", "hUndead", "demon", "flying",
                    "opendoors", "boss", "primeevil", "killable", "switchai", "noAura", "nomultishot", "neverCount", "petIgnore", "deathDmg", "genericSpawn", "zoo",
                    "SendSkills", "Skill1", "Sk1mode", "Sk1lvl", "Drain", "Drain(N)", "Drain(H)", "coldeffect", "coldeffect(N)", "coldeffect(H)", "ResDm", "ResMa",
                    "ResFi", "ResLi", "ResCo", "ResPo", "DamageRegen", "SkillDamage", "noRatio", "NoShldBlock", "ToBlock", "Crit", "minHP", "maxHP", "AC", "Exp",
                    "A1MinD", "A1MaxD", "A1TH", "A2MinD", "A2MaxD", "A2TH", "S1MinD", "S1MaxD", "S1TH", "TreasureClass1", "*eol"]


def figure_frames(frames: int, dirs: int, height: int, body: int, trim: int, swing: bool) -> list[list[dcc.Frame]]:
    """A stick figure of flat colours: a body, a head, two legs and an arm that swings through the frames, facing
    each direction a shade apart. ``body`` and ``trim`` are palette indices."""
    out = []
    w = max(10, height // 2)
    for d in range(dirs):
        fs = []
        for f in range(frames):
            px = np.zeros((height, w), np.uint8)
            cx = w // 2
            px[height // 4:height - 2, cx - w // 6:cx + w // 6] = body + d
            px[0:height // 4, cx - w // 8:cx + w // 8] = trim
            sw = int(round((w // 3) * np.sin(2 * np.pi * f / max(frames, 1)))) if swing else 0
            px[height // 3:height // 2, max(0, cx + sw - 1):min(w, cx + sw + 2)] = trim + 1
            px[height - 2:height, cx - w // 6:cx] = trim + 2
            px[height - 2:height, cx:cx + w // 6] = trim + 2
            fs.append(dcc.Frame(px, -cx, -(height - 1)))
        out.append(fs)
    return out


def make_token(reference: str | Path, token: str = "ZZ", kind: str = "character", modes=("NU", "WL", "A1", "GH", "DT"), frames: int = 6, dirs: int = 8, height: int = 40,
               weapon_class: str = "HTH", speeds: dict | None = None, with_tables: bool = True) -> dict:
    """Write the token into ``reference`` (outside the repository) and return the files."""
    reference = guard_destination(Path(reference), "a synthetic token (it stands in for the game's files)")
    pal = synthetic_palette()
    paldir = reference / "data/global/palette/ACT1"
    paldir.mkdir(parents=True, exist_ok=True)
    pal.save_dat(paldir / "pal.dat")
    kind_dir = {"character": "chars", "monster": "monsters", "object": "objects"}[kind]
    base = reference / "data/global" / kind_dir / token
    (base / "COF").mkdir(parents=True, exist_ok=True)
    (base / "TR").mkdir(parents=True, exist_ok=True)
    speeds = speeds or {}
    records = []
    files = {}
    for i, mode in enumerate(modes):
        fr = figure_frames(frames, dirs, height, body=40 + i * 2, trim=100 + i, swing=mode in ("WL", "A1", "RN"))
        data, _ = dcc.encode(dcc.DCC(fr), pal.lab)
        name = f"{token}TR{'LIT'}{mode}{weapon_class}.dcc"
        (base / "TR" / name).write_bytes(data)
        speed = int(speeds.get(mode, 256 if mode != "WL" else 192))
        trig = (frames * 3) // 5 if mode in ("A1", "A2", "SC") else None
        c = COF.make([COF.Layer("TR", 1, 1, 0, 0, weapon_class)], frames, dirs, speed, (-height // 4, height // 4, -(height - 1), 0), trig)
        cname = f"{token}{mode}{weapon_class}.cof"
        (base / "COF" / cname).write_bytes(COF.encode(c))
        records.append({"name": f"{token}{mode}{weapon_class}", "frames": frames, "speed": speed, "triggers": {trig: 1} if trig is not None else {}})
        files[mode] = {"dcc": str(base / "TR" / name), "cof": str(base / "COF" / cname)}
    # a few records of other names, as the real file has thousands
    records += [{"name": "ZXNUHTH", "frames": 10, "speed": 256, "triggers": {}}, {"name": "ZXWLHTH", "frames": 8, "speed": 192, "triggers": {}}]
    animdata.write(records, reference / "data/global/animdata.d2")
    if with_tables:
        ex = reference / "data/global/excel"
        ex.mkdir(parents=True, exist_ok=True)
        tables.write({"columns": SKILL_COLUMNS, "rows": [
            _skill_row("Poison Dagger", 74, "nec", "poisondagger", srvstfunc="", srvdofunc="24", anim="A1", mana="24", lvlmana="2", manashift="5", EType="pois",
                       EMin="2", EMax="4", ELen="50", reqlevel="6"),
            _skill_row("Holy Fire", 102, "pal", "holyfire", srvstfunc="", srvdofunc="", aura="1", aurastate="holyfire", aurarangecalc="43", periodic="1", perdelay="50",
                       EType="fire", EMin="1", EMax="3", mana="0", manashift="8", reqlevel="6"),
            _skill_row("Plague Javelin", 25, "ama", "plaguejavelin", srvstfunc="", srvdofunc="33", srvmissile="plaguejavelin", anim="TH", itypea1="jave",
                       mana="7", lvlmana="0", manashift="5", EType="pois", EMin="23", EMax="36", ELen="75", reqlevel="18"),
            _skill_row("Expansion", 155, "", "", srvstfunc="", srvdofunc=""),
            _skill_row("Blade Fury", 268, "ass", "bladefury", srvstfunc="", srvdofunc="", anim="SC", mana="2", manashift="5", reqlevel="18"),
        ]}, ex / "Skills.txt")
        tables.write({"columns": SKILLDESC_COLUMNS, "rows": [
            _desc_row("poisondagger", "1", "2", "1", "Poison Dagger"), _desc_row("holyfire", "2", "2", "2", "Holy Fire"),
            _desc_row("plaguejavelin", "1", "4", "3", "Plague Javelin"), _desc_row("bladefury", "3", "4", "2", "Blade Fury")]}, ex / "SkillDesc.txt")
        tables.write({"columns": MONSTATS2_COLUMNS, "rows": [_monstats2_row("skeleton1"), _monstats2_row("Expansion"), _monstats2_row("zombie1")]}, ex / "MonStats2.txt")
        tables.write({"columns": MONSTATS_COLUMNS, "rows": [_monstats_row("skeleton1", "0", "SK", "skeleton1"), _monstats_row("Expansion", "", "", ""),
                                                            _monstats_row("zombie1", "1", "ZM", "zombie1")]}, ex / "MonStats.txt")
    return {"reference": str(reference), "token": token, "kind": kind, "files": files, "palette": str(paldir / "pal.dat"), "animdata": str(reference / "data/global/animdata.d2")}


def _skill_row(skill, sid, cls, desc, **kw):
    r = {c: "" for c in SKILL_COLUMNS}
    r.update({"skill": skill, "Id": str(sid), "charclass": cls, "skilldesc": desc, "maxlvl": "20", "skpoints": "1", "InGame": "1", "*eol": "0"})
    r.update({k: str(v) for k, v in kw.items()})
    return r


def _desc_row(desc, page, row, col, name):
    r = {c: "" for c in SKILLDESC_COLUMNS}
    r.update({"skilldesc": desc, "SkillPage": page, "SkillRow": row, "SkillColumn": col, "ListRow": "1", "IconCel": "0", "str name": name, "str short": name,
              "str long": name, "str alt": name, "str mana": "manacost", "descline1": "1", "desctexta1": "StrSkill5", "*eol": "0"})
    return r


def _monstats2_row(mid):
    r = {c: "" for c in MONSTATS2_COLUMNS}
    r.update({"Id": mid, "Height": "3", "SizeX": "2", "SizeY": "2", "spawnCol": "0", "MeleeRng": "1", "BaseW": "hth", "HitClass": "3", "TRv": "LIT", "TR": "1",
              "TotalPieces": "1", "mDT": "1", "mNU": "1", "mWL": "1", "mGH": "1", "mA1": "1", "mDD": "1", "dDT": "8", "dNU": "8", "dWL": "8", "dGH": "8", "dA1": "8",
              "dDD": "8", "isSel": "1", "Shadow": "1", "Light": "0", "*eol": "0"})
    return r


def _monstats_row(mid, hc, code, ex):
    r = {c: "" for c in MONSTATS_COLUMNS}
    r.update({"Id": mid, "*hcIdx": hc, "BaseId": mid, "NextInClass": "", "NameStr": mid, "MonStatsEx": ex, "Code": code, "enabled": "1" if code else "", "Velocity": "4",
              "Run": "0", "Level": "2", "minHP": "5", "maxHP": "10", "AC": "10", "Exp": "20", "A1MinD": "1", "A1MaxD": "3", "A1TH": "20", "isSpawn": "1",
              "isMelee": "1", "killable": "1", "TreasureClass1": "Act 1 H2H A", "*eol": "0"})
    return r
