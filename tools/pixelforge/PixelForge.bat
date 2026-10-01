@echo off
setlocal
cd /d "%~dp0"
rem PixelForge: the Forge app (full screen, guided). Uses the private Python install.bat made; else the system one.
if exist .venv\Scripts\python.exe (
  set "PY=.venv\Scripts\python.exe"
) else (
  where py >nul 2>nul && (set "PY=py -3") || (set "PY=python")
)
%PY% -m pixelforge.cli forge %*
if errorlevel 1 (
  echo.
  echo The Forge could not start. If this is the first time, run install.bat once.
  pause
)
