"""Check every voice in docs/codex/voices against the writer brief's hard rules. Run from the repo root."""
import pathlib, re, sys

BANNED = r"\b(rot|rots|rotting|rotten|cell|cells|virus|dna|organism|biology|chemical|species|evolution|cooldown|dps|proc|aggro|loot|buff|nerf|stun|stunned|lightning|mana|quest|level|levels|player|boss)\b"
PHRASES = [r"weeping maiden", r"\bhouse of\b", r"brotherhood", r"the five (faiths|orders|houses)", r"polished heart",
           r"precious wound", r"wet nurse", r"laden board", r"\b(bird|crow|raven|dog|horse|rat|wolf|fox|feather|fur)s?\b"]
NOT_X = r"\b(it|this|that|they|she|he)\s+(is|was|are|were)\s+not\s+\w+[,;]\s*(it|this|that|they|she|he)\s+(is|was|are|were)\b"

bad = 0
for p in sorted(pathlib.Path("docs/codex/voices").glob("*.md")):
    t = p.read_text(encoding="utf-8")
    body = t.split("\n", 3)[-1]
    words = len(re.findall(r"[A-Za-z']+", body))
    issues = []
    if not t.startswith("# "):
        issues.append("no title line")
    if not re.search(r"^\*[^*].*\*\s*$", t, re.M):
        issues.append("no gatherer note")
    if words < 450 or words > 1450:
        issues.append(f"{words} words")
    for m in re.finditer(BANNED, t, re.I):
        issues.append(f"banned word '{m.group(0)}'")
    for ph in PHRASES:
        for m in re.finditer(ph, t, re.I):
            issues.append(f"phrase '{m.group(0)}'")
    for m in re.finditer(NOT_X, t, re.I):
        issues.append(f"not-X-but-Y: '{m.group(0)}'")
    lines = [l for l in body.splitlines() if l.strip()]
    short = sum(1 for l in lines if len(l) < 60 and not l.startswith(("#", "*", "-", "|", ">")))
    if lines and short / len(lines) > 0.5:
        issues.append("many short lines (verse?)")
    print(f"{p.name}: {words} words" + ("" if not issues else "  <<  " + "; ".join(issues)))
    bad += bool(issues)
print(f"{bad} file(s) with issues")
