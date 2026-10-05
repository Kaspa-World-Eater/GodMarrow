"""ImageMagick: strips and contact sheets of frames, format conversions, whole-pixel scaling, `identify` facts.
Version 7 is one `magick` executable; version 6 is `convert` / `montage` / `identify`; both are found."""

from __future__ import annotations

from pathlib import Path

from . import _base as B

NAME = "imagemagick"
TITLE = "ImageMagick"
WHAT = "strips and contact sheets from frames (append, montage), format conversions, whole-pixel scaling, identify"
HOME = "https://imagemagick.org/script/download.php"
LICENCE = "ImageMagick License (Apache-2.0 compatible)"
INSTALL = "Install ImageMagick from imagemagick.org/script/download.php (Windows: the Q16 installer; tick 'Add to PATH'), or set PIXELFORGE_IMAGEMAGICK to magick.exe."
EXE_NAMES = ["magick", "magick.exe"]
CANDIDATES = [r"%ProgramFiles%\ImageMagick-*\magick.exe", "/opt/homebrew/bin/magick", "/usr/local/bin/magick"]


def find() -> str | None:
    return B.env_override(NAME) or B.which(EXE_NAMES, CANDIDATES) or B.which(["convert", "convert.exe"])


def is_v7(exe: str) -> bool:
    return Path(exe).stem.lower() == "magick"


def version(exe: str) -> str:
    v = B.version_of(exe, "-version")
    return v.replace("Version: ", "").split(" http")[0] if v else ""


def explain_missing() -> str:
    return INSTALL


def _tool(exe: str, name: str) -> list[str]:
    """`magick montage` on version 7, `montage` beside `convert` on version 6."""
    if is_v7(exe):
        return [exe] if name == "convert" else [exe, name]
    return [str(Path(exe).with_name(name + Path(exe).suffix))] if name != "convert" else [exe]


def strip_command(exe: str, files: list[str], out: str) -> list[str]:
    return [*_tool(exe, "convert"), *[str(f) for f in files], "-background", "none", "+append", str(out)]


def montage_command(exe: str, files: list[str], out: str, columns: int = 8) -> list[str]:
    return [*_tool(exe, "montage"), "-background", "none", "-tile", f"{int(columns)}x", "-geometry", "+0+0", *[str(f) for f in files], str(out)]


def convert_command(exe: str, src: str, out: str) -> list[str]:
    return [*_tool(exe, "convert"), str(src), str(out)]


def scale_command(exe: str, src: str, out: str, factor: int) -> list[str]:
    return [*_tool(exe, "convert"), str(src), "-filter", "point", "-resize", f"{int(factor) * 100}%", str(out)]


def _run(cmd: list[str], out: str, key: str) -> dict:
    r = B.call(cmd, B.DEFAULT_TIMEOUT)
    ok = r.returncode == 0 and Path(out).exists()
    return {"ok": ok, key: out if ok else "", "command": cmd, **({} if ok else {"error": B.first_line(r.stderr) or "ImageMagick wrote nothing."})}


def strip(frames_dir: str = "", files: list[str] | None = None, out: str = "") -> dict:
    """The frames side by side in one PNG."""
    fr = [str(f) for f in (files or [])] or B.frames_in(frames_dir)
    if not fr:
        raise ValueError("no frames")
    out = out or str(Path(fr[0]).parent / "strip.png")
    return _run(strip_command(find(), fr, out), out, "png")


def montage(frames_dir: str = "", files: list[str] | None = None, out: str = "", columns: int = 8) -> dict:
    """A contact sheet in `columns` columns."""
    fr = [str(f) for f in (files or [])] or B.frames_in(frames_dir)
    if not fr:
        raise ValueError("no frames")
    out = out or str(Path(fr[0]).parent / "sheet.png")
    return _run(montage_command(find(), fr, out, columns), out, "png")


def convert(src: str, out: str) -> dict:
    """Any format to any (the extension decides)."""
    return _run(convert_command(find(), src, out), out, "file")


def scale(src: str, out: str = "", factor: int = 4) -> dict:
    """Whole-pixel scaling (point filter), for a look at small sprites."""
    out = out or str(Path(src).with_name(Path(src).stem + f"_x{int(factor)}" + Path(src).suffix))
    return _run(scale_command(find(), src, out, factor), out, "file")


def identify(file: str) -> dict:
    exe = find()
    cmd = [*_tool(exe, "identify"), "-format", "%w %h %m %[channels]", str(file)]
    r = B.call(cmd, 60)
    parts = (r.stdout or "").split()
    return {"ok": r.returncode == 0 and len(parts) >= 3, "width": int(parts[0]) if parts else 0, "height": int(parts[1]) if len(parts) > 1 else 0,
            "format": parts[2] if len(parts) > 2 else "", "channels": parts[3] if len(parts) > 3 else "", "command": cmd}


def status() -> dict:
    exe = find()
    return {"ok": True, "found": exe is not None, "exe": exe or "", "version": version(exe) if exe else "", "install": INSTALL}


ACTIONS = {"status": status, "strip": strip, "montage": montage, "convert": convert, "scale": scale, "identify": identify}
OFFLINE_ACTIONS = ("status",)


def run(action: str, **params) -> dict:
    import sys
    return B.dispatch(sys.modules[__name__], action, params)
