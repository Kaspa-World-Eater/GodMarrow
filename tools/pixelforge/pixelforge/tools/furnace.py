"""Furnace: the free chiptune tracker (GPL). Our songs are JSON; `export_mod` writes one as a ProTracker .mod (a format Furnace
opens: pixelforge/music/mod_export.py), `open` does that and opens Furnace on it, `render` uses Furnace's own command line
(`furnace -output out.wav song`) to render a .mod or .fur to audio through its chips."""

from __future__ import annotations

from pathlib import Path

from . import _base as B

NAME = "furnace"
TITLE = "Furnace"
WHAT = "a chiptune tracker: our songs exported as .mod open in it for hand work; its command line renders a tracker file to WAV through real chip emulation"
HOME = "https://github.com/tildearrow/furnace/releases"
LICENCE = "GPL-2.0"
INSTALL = "Download Furnace from github.com/tildearrow/furnace/releases (a zip, no installer) and put it on PATH or in PIXELFORGE_FURNACE."
EXE_NAMES = ["furnace", "Furnace", "furnace.exe"]
CANDIDATES = [r"%ProgramFiles%\Furnace\furnace.exe", r"%LOCALAPPDATA%\Programs\Furnace\furnace.exe", "/Applications/Furnace.app/Contents/MacOS/furnace",
              "~/Applications/furnace*", "/opt/furnace/furnace"]


def find() -> str | None:
    return B.env_override(NAME) or B.which(EXE_NAMES, CANDIDATES)


def version(exe: str) -> str:
    return B.version_of(exe, "-version")


def explain_missing() -> str:
    return INSTALL


def render_command(exe: str, song_file: str, out_wav: str, loops: int = 1) -> list[str]:
    return [exe, "-output", str(out_wav), "-loops", str(int(loops)), str(song_file)]


def export_mod(song: str, out: str = "") -> dict:
    """Our song (.song.json) as a ProTracker .mod (no Furnace needed)."""
    from ..music import mod_export
    out = out or str(Path(song).with_name(Path(song).name.replace(".song.json", "").replace(".json", "") + ".mod"))
    return mod_export.export_mod(song, out)


def open_song(song: str, timeout: float | None = None) -> dict:
    """Export the song as .mod and open Furnace on it; wait until it closes. A .fur saved beside it is named (Furnace's
    own format; the Forge cannot read it back, so keep the .mod or render it)."""
    exe = find()
    m = export_mod(song)
    if not m.get("ok"):
        return m
    folder = Path(m["mod"]).parent
    before = B.file_state(folder)
    waited = B.wait_for([exe, m["mod"]], timeout=timeout)
    if not waited["ok"] and "error" in waited:
        return waited
    return {"ok": True, "mod": m["mod"], "changed": B.changed_files(folder, before), "seconds": waited.get("seconds", 0), "command": [exe, m["mod"]]}


def render(song_file: str, out_wav: str = "", loops: int = 1) -> dict:
    """Render a .mod / .fur (or one of our songs, exported first) to WAV through Furnace's command line."""
    exe = find()
    src = str(song_file)
    if src.endswith(".json"):
        m = export_mod(src)
        if not m.get("ok"):
            return m
        src = m["mod"]
    out_wav = out_wav or str(Path(src).with_suffix(".wav"))
    cmd = render_command(exe, src, out_wav, loops)
    r = B.call(cmd, B.DEFAULT_TIMEOUT)
    ok = r.returncode == 0 and Path(out_wav).exists()
    return {"ok": ok, "wav": out_wav if ok else "", "source": src, "command": cmd, **({} if ok else {"error": B.first_line(r.stderr) or B.first_line(r.stdout) or "Furnace wrote no audio."})}


def status() -> dict:
    exe = find()
    return {"ok": True, "found": exe is not None, "exe": exe or "", "version": version(exe) if exe else "", "install": INSTALL}


ACTIONS = {"status": status, "export_mod": export_mod, "open": open_song, "render": render}
OFFLINE_ACTIONS = ("status", "export_mod")


def run(action: str, **params) -> dict:
    import sys
    return B.dispatch(sys.modules[__name__], action, params)
