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
echo Done. Starting PixelForge...
if exist .venv\Scripts\python.exe (
  set "PY=.venv\Scripts\python.exe"
) else (
  where py >nul 2>nul && (set "PY=py -3") || (set "PY=python")
)
%PY% -m pixelforge.cli forge
if errorlevel 1 (
  echo.
  echo The Forge could not start. "PixelForge Studio.bat" opens the classic window instead.
  pause
)
