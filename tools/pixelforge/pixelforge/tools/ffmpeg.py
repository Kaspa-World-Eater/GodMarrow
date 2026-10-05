"""ffmpeg: GIFs and videos of frame folders (whole pixels, a palette per clip, transparency kept), audio conversions
(WAV to OGG for the game) and `ffprobe` facts about a file."""

from __future__ import annotations

import json
from pathlib import Path

from . import _base as B

NAME = "ffmpeg"
TITLE = "ffmpeg"
WHAT = "GIFs and MP4s of frame folders at whole-pixel zoom, WAV to OGG for the game, facts about a media file (ffprobe)"
HOME = "https://ffmpeg.org/download.html"
LICENCE = "LGPL-2.1-or-later (GPL builds exist)"
INSTALL = "Install ffmpeg from ffmpeg.org/download.html (Windows: a zip from gyan.dev or BtbN; add its bin folder to PATH, or set PIXELFORGE_FFMPEG)."
EXE_NAMES = ["ffmpeg", "ffmpeg.exe"]
CANDIDATES = [r"%ProgramFiles%\ffmpeg\bin\ffmpeg.exe", r"C:\ffmpeg\bin\ffmpeg.exe", "/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"]


def find() -> str | None:
    return B.env_override(NAME) or B.which(EXE_NAMES, CANDIDATES)


def find_probe() -> str | None:
    exe = find()
    if exe:
        p = Path(exe).with_name("ffprobe" + Path(exe).suffix)
        if p.exists():
            return str(p)
    return B.which(["ffprobe", "ffprobe.exe"])


def version(exe: str) -> str:
    v = B.version_of(exe, "-version")
    return v.split(" Copyright")[0] if v else ""


def explain_missing() -> str:
    return INSTALL


def _pattern(frames_dir: str) -> tuple[str, int]:
    fr = B.frames_in(frames_dir)
    if not fr:
        raise ValueError(f"no frames in {frames_dir}")
    stem = Path(fr[0]).stem
    digits = len(stem.rsplit("_", 1)[-1])
    return str(Path(fr[0]).parent / (stem.rsplit("_", 1)[0] + "_%0" + str(digits) + "d.png")), len(fr)


def gif_command(exe: str, pattern: str, out: str, fps: float = 12.0, zoom: int = 1) -> list[str]:
    scale = f"scale=iw*{int(zoom)}:ih*{int(zoom)}:flags=neighbor," if int(zoom) > 1 else ""
    vf = f"{scale}split[a][b];[a]palettegen=reserve_transparent=1[p];[b][p]paletteuse=dither=none"
    return [exe, "-y", "-loglevel", "error", "-framerate", f"{fps:g}", "-i", pattern, "-vf", vf, "-loop", "0", str(out)]


def video_command(exe: str, pattern: str, out: str, fps: float = 12.0, zoom: int = 1) -> list[str]:
    vf = f"scale=iw*{int(zoom)}:ih*{int(zoom)}:flags=neighbor," if int(zoom) > 1 else ""
    return [exe, "-y", "-loglevel", "error", "-framerate", f"{fps:g}", "-i", pattern, "-vf", vf + "format=yuv420p,pad=ceil(iw/2)*2:ceil(ih/2)*2",
            "-c:v", "libx264", "-crf", "18", str(out)]


def audio_command(exe: str, src: str, out: str, quality: int = 5) -> list[str]:
    cmd = [exe, "-y", "-loglevel", "error", "-i", str(src)]
    if str(out).lower().endswith(".ogg"):
        cmd += ["-c:a", "libvorbis", "-q:a", str(int(quality))]
    return cmd + [str(out)]


def gif(frames_dir: str, out: str = "", fps: float = 12.0, zoom: int = 1) -> dict:
    """A looping GIF of a clip folder (frame_000.png ...) at a whole-pixel zoom."""
    exe = find()
    pattern, n = _pattern(frames_dir)
    out = out or str(Path(frames_dir).with_suffix(".gif"))
    cmd = gif_command(exe, pattern, out, fps, zoom)
    r = B.call(cmd, B.DEFAULT_TIMEOUT)
    ok = r.returncode == 0 and Path(out).exists()
    return {"ok": ok, "gif": out if ok else "", "frames": n, "command": cmd, **({} if ok else {"error": B.first_line(r.stderr) or "ffmpeg wrote no GIF."})}


def video(frames_dir: str, out: str = "", fps: float = 12.0, zoom: int = 1) -> dict:
    """An MP4 of a clip folder."""
    exe = find()
    pattern, n = _pattern(frames_dir)
    out = out or str(Path(frames_dir).with_suffix(".mp4"))
    cmd = video_command(exe, pattern, out, fps, zoom)
    r = B.call(cmd, B.DEFAULT_TIMEOUT)
    ok = r.returncode == 0 and Path(out).exists()
    return {"ok": ok, "mp4": out if ok else "", "frames": n, "command": cmd, **({} if ok else {"error": B.first_line(r.stderr) or "ffmpeg wrote no video."})}


def convert_audio(src: str, out: str = "", quality: int = 5) -> dict:
    """WAV to OGG (or any conversion ffmpeg knows); quality 0..10 for Vorbis."""
    exe = find()
    out = out or str(Path(src).with_suffix(".ogg"))
    cmd = audio_command(exe, src, out, quality)
    r = B.call(cmd, B.DEFAULT_TIMEOUT)
    ok = r.returncode == 0 and Path(out).exists()
    return {"ok": ok, "file": out if ok else "", "command": cmd, **({} if ok else {"error": B.first_line(r.stderr) or "ffmpeg wrote nothing."})}


def info(file: str) -> dict:
    """Streams, duration, size: `ffprobe -show_format -show_streams` as JSON."""
    probe = find_probe()
    if not probe:
        return {"ok": False, "error": "ffprobe was not found beside ffmpeg."}
    cmd = [probe, "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(file)]
    r = B.call(cmd, 60)
    try:
        d = json.loads(r.stdout or "{}")
    except json.JSONDecodeError:
        d = {}
    return {"ok": r.returncode == 0, "info": d, "command": cmd}


def status() -> dict:
    exe = find()
    return {"ok": True, "found": exe is not None, "exe": exe or "", "version": version(exe) if exe else "", "install": INSTALL}


ACTIONS = {"status": status, "gif": gif, "video": video, "convert_audio": convert_audio, "info": info}
OFFLINE_ACTIONS = ("status",)


def run(action: str, **params) -> dict:
    import sys
    return B.dispatch(sys.modules[__name__], action, params)
