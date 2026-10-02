@echo off
setlocal
cd /d "%~dp0"
if not exist .venv\Scripts\pythonw.exe (
  echo Run install.bat first.
  pause & exit /b 1
)
rem Update first: pull the latest PixelForge quietly, then refresh the install if anything changed.
if exist ..\..\.git (
  where git >nul 2>nul && (
    for /f %%h in ('git -C ..\.. rev-parse HEAD') do set BEFORE=%%h
    git -C ..\.. pull --ff-only --quiet >nul 2>nul
    for /f %%h in ('git -C ..\.. rev-parse HEAD') do set AFTER=%%h
    if not "%BEFORE%"=="%AFTER%" (
      .venv\Scripts\python.exe -m pip install -q -e . >nul 2>nul
    )
  )
)
start "" ".venv\Scripts\pythonw.exe" -m pixelforge.cli studio %*
