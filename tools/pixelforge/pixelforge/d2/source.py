"""The game's files as a folder: the reference folder (extracted files, any letter case) backed by the install's
archives through the extractor when a file is missing."""
from __future__ import annotations

from pathlib import Path

from . import cof as COF
from .paths import D2Error, find_install, reference_dir

KIND_DIRS = {"character": "chars", "monster": "monsters", "object": "objects"}


def find_case_insensitive(root: Path, rel: str) -> Path | None:
    """``root/rel`` with each part matched regardless of case (MPQ paths are case-insensitive; extractors keep
    whatever case the listfile had)."""
    p = Path(root)
    for part in rel.replace("\\", "/").split("/"):
        if not part:
            continue
        if (p / part).exists():
            p = p / part
            continue
        if not p.is_dir():
            return None
        low = part.lower()
        match = next((e for e in p.iterdir() if e.name.lower() == low), None)
        if match is None:
            return None
        p = match
    return p if p.exists() else None


class D2Source:
    def __init__(self, reference: str | Path | None = None, install: str | Path | None = None, project: str | Path | None = None, extract: bool = True, log=None):
        self.project = project
        self.reference = reference_dir(project, reference)
        inst = find_install(project, install)
        self.install = Path(inst["path"]) if inst["ok"] else None
        self.install_kind = inst.get("kind")
        self.extract_allowed = extract
        self.log = log
        self.extracted: list[str] = []

    def find(self, rel: str) -> Path | None:
        return find_case_insensitive(self.reference, rel)

    def get(self, rel: str, what: str | None = None) -> Path:
        """The file, extracted into the reference folder first when it is not there yet."""
        p = self.find(rel)
        if p is not None:
            return p
        if self.extract_allowed and self.install is not None and self.install_kind == "classic":
            from .extract import extract
            r = extract(self.install, [rel], self.reference, self.project, self.log)
            if r["extracted"]:
                self.extracted += r["extracted"]
            p = self.find(rel)
            if p is not None:
                return p
        where = f" ({what})" if what else ""
        if self.install is None:
            raise D2Error(f"{rel}{where} is not in the reference folder {self.reference} and Diablo 2 was not found to extract it from. "
                          "Install the game or point PixelForge at it: `pixelforge d2 set --game <folder>`.")
        if self.install_kind == "resurrected":
            from .extract import missing_tool_sentence
            raise D2Error(f"{rel}{where} is not in the reference folder {self.reference}. " + missing_tool_sentence("resurrected"))
        from .extract import extractor, missing_tool_sentence
        if extractor(self.reference, self.project) is None:
            raise D2Error(f"{rel}{where} is not in the reference folder {self.reference}. " + missing_tool_sentence("classic"))
        raise D2Error(f"{rel}{where} could not be extracted from {self.install}: it is in none of its archives.")

    def list_dir(self, rel: str) -> list[Path]:
        p = self.find(rel)
        return sorted(p.iterdir()) if p is not None and p.is_dir() else []

    def tokens(self, kind: str) -> list[str]:
        return sorted({e.name.upper() for e in self.list_dir(f"data/global/{KIND_DIRS[kind]}") if e.is_dir()})

    def token_kind(self, token: str) -> str | None:
        for kind, d in KIND_DIRS.items():
            if self.find(f"data/global/{d}/{token}") is not None:
                return kind
        return None

    def cofs(self, token: str, kind: str) -> list[Path]:
        return [p for p in self.list_dir(f"data/global/{KIND_DIRS[kind]}/{token}/COF") if p.suffix.lower() == ".cof"]

    def palette(self, act: int = 1):
        from .pal import ActPalette
        p = self.find(f"data/global/palette/ACT{act}/pal.dat") or self.find(f"data/global/palette/ACT{act}/pal.pl2")
        if p is None:
            p = self.get(f"data/global/palette/ACT{act}/pal.dat", f"the act {act} palette")
        return ActPalette.load(p)

    def animdata(self):
        from . import animdata
        p = self.find("data/global/animdata.d2") or self.get("data/global/animdata.d2", "the animation speeds")
        return animdata.read(p)

    def describe(self) -> dict:
        return {"reference": str(self.reference), "install": str(self.install) if self.install else None, "kind": self.install_kind,
                "characters": self.tokens("character"), "monsters": self.tokens("monster"), "objects": self.tokens("object"),
                "palettes": [e.name for e in self.list_dir("data/global/palette") if e.is_dir()],
                "animdata": self.find("data/global/animdata.d2") is not None,
                "excel": [e.name for e in self.list_dir("data/global/excel") if e.suffix.lower() == ".txt"]}
