"""The mock Claude's "authoring": copy a shipped shape model under the character's name and words, as a hand-written
model would arrive (the draft road is retired). ``python write_model.py SRC DST NAME ABOUT``."""
import json
import sys
from pathlib import Path

src, dst, name, about = sys.argv[1:5]
doc = json.loads(Path(src).read_text(encoding="utf-8"))
doc["name"] = name
doc["about"] = about
Path(dst).parent.mkdir(parents=True, exist_ok=True)
Path(dst).write_text(json.dumps(doc, indent=1), encoding="utf-8")
