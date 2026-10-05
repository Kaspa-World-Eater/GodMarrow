"""Getting files out of the game's archives with a free tool (never our own MPQ code: the format has a free reader).

Classic Diablo II keeps its files in MPQ archives (``d2data.mpq``, ``d2exp.mpq``, ``d2char.mpq``, ``patch_d2.mpq``):
Ladik's MPQ Editor (free, Windows, ``MPQEditor.exe e <mpq> <path> <folder> /fp``) or ``smpq`` (StormLib's command
line, Linux and macOS) extract them. Diablo II Resurrected keeps everything in a CASC store: Ladik's CascView (free,
Windows, a window and no command line) extracts ``data:data/global/...`` into a folder once; this module then reads
that folder. ``fetch_tools`` downloads MPQ Editor and installs ``d2animdata``.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path

from .paths import D2Error, guard_destination, load_settings, mpq_files

MPQ_EDITOR_PAGE = "http://www.zezula.net/en/mpq/download.html"
MPQ_EDITOR_ZIP = "http://www.zezula.net/download/mpqediten64.zip"
CASCVIEW_PAGE = "http://www.zezula.net/en/casc/main.html"


def tools_dir(reference: Path) -> Path:
    return reference.parent / "tools"


def find_mpq_editor(reference: Path | None = None, project=None) -> str | None:
    env = os.environ.get("PIXELFORGE_MPQ_EDITOR")
    cands = [env, load_settings(project).get("mpq_editor")]
    for c in cands:
        if c and Path(c).exists():
            return str(c)
    w = shutil.which("MPQEditor.exe") or shutil.which("MPQEditor")
    if w:
        return w
    roots = [Path(r"C:\Program Files\MPQEditor"), Path(r"C:\Program Files (x86)\MPQEditor"), Path.home() / "Downloads", Path.home() / "Desktop"]
    if reference is not None:
        roots.insert(0, tools_dir(reference))
    for r in roots:
        if r.is_dir():
            for p in sorted(r.glob("**/MPQEditor.exe"))[:1]:
                return str(p)
    return None


def find_smpq() -> str | None:
    return shutil.which("smpq")


def extractor(reference: Path | None = None, project=None) -> dict | None:
    """The extractor on this computer: ``{"tool": "mpqeditor" | "smpq", "exe"}`` or None."""
    e = find_mpq_editor(reference, project)
    if e:
        return {"tool": "mpqeditor", "exe": e}
    s = find_smpq()
    if s:
        return {"tool": "smpq", "exe": s}
    return None


def missing_tool_sentence(kind: str) -> str:
    if kind == "resurrected":
        return (f"Diablo II Resurrected keeps its files in a CASC store. Install Ladik's CascView ({CASCVIEW_PAGE}), open the game folder in it, "
                "and extract `data:data/global` (chars, monsters, palette, animdata.d2, excel) into the reference folder, keeping the folders; "
                "then run this again.")
    return (f"No MPQ extractor was found. Install Ladik's MPQ Editor ({MPQ_EDITOR_PAGE}; `pixelforge d2 fetch-tools` downloads it) "
            "or `smpq` (Linux: apt install smpq), or extract `data\\global` from d2data.mpq, d2exp.mpq and d2char.mpq by hand into the reference folder.")


def extract(install: str | Path, paths: list[str], reference: Path, project=None, log=None) -> dict:
    """Extract ``paths`` (``data/global/...``, forward slashes) from the install's archives into ``reference`` with the
    found tool. Returns what landed and what did not."""
    reference = guard_destination(Path(reference), "files extracted from the game")
    reference.mkdir(parents=True, exist_ok=True)
    tool = extractor(reference, project)
    if tool is None:
        raise D2Error(missing_tool_sentence("classic"))
    archives = mpq_files(install)
    if not archives:
        raise D2Error(f"no .mpq archives in {install}; is that the Diablo II folder?")
    got, missed = [], []
    for rel in paths:
        rel_win = rel.replace("/", "\\")
        done = False
        for mpq in archives:
            if tool["tool"] == "mpqeditor":
                cmd = [tool["exe"], "e", str(mpq), rel_win, str(reference), "/fp"]
            else:
                cmd = [tool["exe"], "-x", "-C", str(reference), str(mpq), rel]
            if log:
                log(" ".join(cmd))
            try:
                subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            except (OSError, subprocess.TimeoutExpired):
                continue
            if _landed(reference, rel):
                got.append(rel); done = True
                break
        if not done:
            missed.append(rel)
    return {"ok": not missed, "tool": tool, "extracted": got, "missing": missed}


def _landed(reference: Path, rel: str) -> bool:
    from .source import find_case_insensitive
    return find_case_insensitive(reference, rel) is not None


def fetch_tools(reference: Path, log=None) -> dict:
    """Download MPQ Editor (Windows) into ``<reference>/../tools/`` and install ``d2animdata`` with pip. Each step
    reports in plain words; nothing here is needed for our own files, only for reading the game's."""
    out = {"ok": True, "steps": []}
    tools = tools_dir(reference)
    guard_destination(tools, "downloaded tools")
    tools.mkdir(parents=True, exist_ok=True)
    if sys.platform.startswith("win") or os.environ.get("PIXELFORGE_D2_FETCH_MPQEDITOR"):
        if find_mpq_editor(reference):
            out["steps"].append({"tool": "MPQ Editor", "ok": True, "note": "already here"})
        else:
            zp = tools / "mpqediten64.zip"
            try:
                if log:
                    log(f"downloading {MPQ_EDITOR_ZIP}")
                urllib.request.urlretrieve(MPQ_EDITOR_ZIP, zp)
                with zipfile.ZipFile(zp) as z:
                    z.extractall(tools / "MPQEditor")
                exe = find_mpq_editor(reference)
                out["steps"].append({"tool": "MPQ Editor", "ok": bool(exe), "path": exe})
                if not exe:
                    out["ok"] = False
            except Exception as e:  # noqa: BLE001 - a download can fail many ways; the person needs the page
                out["ok"] = False
                out["steps"].append({"tool": "MPQ Editor", "ok": False, "note": f"the download did not finish ({e}); get it from {MPQ_EDITOR_PAGE} and unzip it into {tools}"})
    else:
        out["steps"].append({"tool": "MPQ Editor", "ok": bool(find_smpq()), "note": "Windows only; on this system install smpq (apt install smpq)" if not find_smpq() else "smpq is here"})
        if not find_smpq():
            out["ok"] = False
    try:
        import d2animdata  # type: ignore  # noqa: F401
        out["steps"].append({"tool": "d2animdata", "ok": True, "note": "already installed"})
    except ImportError:
        r = subprocess.run([sys.executable, "-m", "pip", "install", "--quiet", "d2animdata"], capture_output=True, text=True)
        ok = r.returncode == 0
        out["steps"].append({"tool": "d2animdata", "ok": ok, "note": "installed" if ok else "pip could not install it (the built-in AnimData reader stands in): " + (r.stderr or r.stdout).strip()[-200:]})
    return out
