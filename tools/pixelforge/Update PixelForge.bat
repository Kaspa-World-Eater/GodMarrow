@echo off
setlocal
cd /d "%~dp0"
echo Updating PixelForge...
where git >nul 2>nul || (echo git was not found; install Git for Windows from https://git-scm.com/download/win and run this again. & pause & exit /b 1)
git -C ..\.. pull --ff-only || (echo The update did not apply. & pause & exit /b 1)
if exist .venv\Scripts\python.exe (
  echo Installing anything new (a moment)...
  .venv\Scripts\python.exe -m pip install -q -e . >nul 2>nul
)
echo Done. Starting PixelForge Studio...
start "" ".venv\Scripts\pythonw.exe" -m pixelforge.cli studio
