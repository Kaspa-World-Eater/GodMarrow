@echo off
setlocal
cd /d "%~dp0"
title Godmarrow
rem 1. the latest game and Forge, when this folder came from git and git is installed
where git >nul 2>nul && if exist .git (
  echo Checking for updates...
  git pull --ff-only
)
rem 2. find Godot 4: PIXELFORGE_GODOT, the folder tools\godot, PATH, the usual places
set GODOT=
if defined PIXELFORGE_GODOT if exist "%PIXELFORGE_GODOT%" set "GODOT=%PIXELFORGE_GODOT%"
if not defined GODOT for %%F in ("tools\godot\Godot_v4*_win64.exe" "tools\godot\Godot*.exe") do if exist "%%~F" set "GODOT=%%~fF"
if not defined GODOT for %%F in (godot.exe godot4.exe Godot.exe) do if not defined GODOT for %%G in ("%%~$PATH:F") do if exist "%%~G" set "GODOT=%%~G"
if not defined GODOT for %%F in ("%USERPROFILE%\Desktop\Godot\Godot*.exe" "%USERPROFILE%\OneDrive\Desktop\Godot\Godot*.exe" "%USERPROFILE%\Desktop\Godot*.exe" "%USERPROFILE%\OneDrive\Desktop\Godot*.exe" "%ProgramFiles%\Godot\Godot*.exe" "%LocalAppData%\Programs\Godot\Godot*.exe" "%USERPROFILE%\Downloads\Godot*win64.exe" "%USERPROFILE%\Downloads\Godot*\Godot*win64.exe") do if not defined GODOT if exist "%%~F" set "GODOT=%%~fF"
if not defined GODOT (
  echo Godot 4 was not found. Downloading it ^(free, about 85 MB^) into tools\godot ...
  if not exist tools\godot mkdir tools\godot
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$u='https://github.com/godotengine/godot/releases/download/4.7.2-stable/Godot_v4.7.2-stable_win64.exe.zip';" ^
    "$z='tools\godot\godot.zip'; Invoke-WebRequest -Uri $u -OutFile $z; Expand-Archive -Path $z -DestinationPath 'tools\godot' -Force; Remove-Item $z" ^
    || (echo The download failed. Get Godot 4 from https://godotengine.org/download and put it in tools\godot. & pause & exit /b 1)
  for %%F in ("tools\godot\Godot_v4*_win64.exe") do set "GODOT=%%~fF"
)
if not defined GODOT (echo Godot still not found. & pause & exit /b 1)
echo Starting Godmarrow with "%GODOT%"
start "" "%GODOT%" --path "%CD%"
