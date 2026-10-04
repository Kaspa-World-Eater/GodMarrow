#!/usr/bin/env python3
"""Build data/codex.json: the gatherer's book (docs/codex/base_codex.json) followed by the expansion chapters
(docs/codex/chapters/*.json, in the order listed in CHAPTER_ORDER). Each chapter file:
{"id", "name", "sub", "epi", "preface" (bb), "pages": [{"title", "by", "epi", "bb"}]}.
The chapter's first page is made from name/sub/epi/preface, as the base book does."""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / "docs/codex/base_codex.json"
CHAPTERS = ROOT / "docs/codex/chapters"
OUT = ROOT / "data/codex.json"
CHAPTER_ORDER = ["edgeless", "held", "chronicle", "tablets", "peoples", "halfgods", "heroes", "bestiary", "ends"]
BANNED = [r"\brot\b", r"\brots\b", r"\brotting\b", r"\brotten\b", r"\bcells?\b", r"\bvirus\b", r"\bDNA\b", r"\borganisms?\b", r"\bbiology\b",
          r"\bcooldown\b", r"\bdps\b", r"\bproc\b", r"\baggro\b", r"\bloot\b", r"\bbuff\b", r"\bnerf\b", r"\bstun\b", r"\blightning\b", r"\bmana\b",
          r"Weeping Maiden"]

def check(text, where):
    bad = [b for b in BANNED if re.search(b, text, re.I)]
    if bad:
        print(f"  banned words in {where}: {bad}")
    return not bad

def main():
    book = json.load(open(BASE))
    ok = True
    for cid in CHAPTER_ORDER:
        f = CHAPTERS / f"{cid}.json"
        if not f.exists():
            print(f"  missing chapter {cid}")
            continue
        c = json.load(open(f))
        pages = [{"title": c["name"], "by": c.get("sub", ""), "epi": c.get("epi", ""), "bb": c.get("preface", "")}]
        for p in c["pages"]:
            pages.append({"title": p["title"], "by": p.get("by", ""), "epi": p.get("epi", ""), "bb": p["bb"]})
        for p in pages:
            ok &= check(p["bb"] + " " + p["by"], f"{cid}/{p['title']}")
            n = len(re.sub(r"\[[^\]]+\]", "", p["bb"]).split())
            if p is not pages[0] and not (350 <= n <= 1800):
                print(f"  length {n} words: {cid}/{p['title']}")
        book.append({"id": c["id"], "name": c["name"], "sub": c.get("sub", ""), "pages": pages})
        print(f"chapter {cid}: {len(pages)} pages")
    json.dump(book, open(OUT, "w"), ensure_ascii=False)
    print("chapters", len(book), "pages", sum(len(c["pages"]) for c in book), "ok" if ok else "BANNED WORDS FOUND")
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main())
