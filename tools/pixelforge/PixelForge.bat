@echo off
setlocal
cd /d "%~dp0"
rem PixelForge: the Forge app (full screen, the dungeon framing). Uses the private Python install.bat made; else the system one.
if exist .venv\Scripts\python.exe (
  set "PY=.venv\Scripts\python.exe"
) else (
  where py >nul 2>nul && (set "PY=py -3") || (set "PY=python")
)
rem Update first: pull the latest PixelForge quietly, then refresh the install if anything changed.
if exist ..\..\.git (
  where git >nul 2>nul && (
    for /f %%h in ('git -C ..\.. rev-parse HEAD') do set BEFORE=%%h
    git -C ..\.. pull --ff-only --quiet >nul 2>nul
    for /f %%h in ('git -C ..\.. rev-parse HEAD') do set AFTER=%%h
    if not "%BEFORE%"=="%AFTER%" (
      if exist .venv\Scripts\python.exe .venv\Scripts\python.exe -m pip install -q -e . >nul 2>nul
    )
  )
)
%PY% -m pixelforge.cli forge %*
if errorlevel 1 (
  echo.
  echo The Forge could not start. If this is the first time, run install.bat once.
  echo "PixelForge Studio.bat" opens the classic window instead.
  pause
)
