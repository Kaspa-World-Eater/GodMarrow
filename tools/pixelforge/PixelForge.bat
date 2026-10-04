@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title PixelForge
rem PixelForge: the Forge app (full screen, the dungeon framing). Uses the private Python install.bat made; else the system one.
if exist .venv\Scripts\python.exe (
  set "PY=.venv\Scripts\python.exe"
) else (
  where py >nul 2>nul && (set "PY=py -3") || (set "PY=python")
)
rem Update first. Godot rewrites its .import files with other line endings, and a pull refuses to overwrite them,
rem so on a refusal the generated .import churn is discarded and the pull tried once more. Delayed expansion (!VAR!)
rem because %VAR% inside a bracketed block is read before the block runs.
if exist ..\..\.git (
  where git >nul 2>nul && (
    echo Checking for PixelForge updates...
    for /f %%h in ('git -C ..\.. rev-parse HEAD') do set "BEFORE=%%h"
    git -C ..\.. pull --ff-only --quiet >nul 2>nul
    if errorlevel 1 (
      git -C ..\.. checkout -- "*.import" >nul 2>nul
      git -C ..\.. pull --ff-only --quiet
      if errorlevel 1 echo Could not update ^(see the message above^); opening the version you have.
    )
    for /f %%h in ('git -C ..\.. rev-parse HEAD') do set "AFTER=%%h"
    if not "!BEFORE!"=="!AFTER!" (
      echo Updated to !AFTER:~0,7!.
      if exist .venv\Scripts\python.exe .venv\Scripts\python.exe -m pip install -q -e . >nul 2>nul
    ) else (
      echo Up to date ^(!AFTER:~0,7!^).
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
