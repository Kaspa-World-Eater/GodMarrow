@echo off
setlocal
cd /d "%~dp0"
echo PixelForge Studio - install
echo.
if exist ..\..\.git (
  where git >nul 2>nul && (
    echo Getting the latest PixelForge...
    git -C ..\.. pull --ff-only
  )
)
where py >nul 2>nul && (set PY=py -3) || (set PY=python)
%PY% --version >nul 2>nul || (
  echo Python was not found. Install Python 3.11+ from https://www.python.org/downloads/
  echo and tick "Add Python to PATH" in the installer, then run this again.
  pause & exit /b 1
)
if not exist .venv (
  echo Creating a private Python environment...
  %PY% -m venv .venv || (echo venv failed & pause & exit /b 1)
)
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul
echo Installing PixelForge (a minute or two)...
pip install -e . || (echo install failed & pause & exit /b 1)
pip install mcp >nul 2>nul
echo Creating the desktop shortcuts...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; $d = [Environment]::GetFolderPath('Desktop');" ^
  "$s = $ws.CreateShortcut((Join-Path $d 'PixelForge.lnk'));" ^
  "$s.TargetPath = (Join-Path '%CD%' 'PixelForge.bat');" ^
  "$s.Arguments = ''; $s.WorkingDirectory = '%CD%'; $s.WindowStyle = 7;" ^
  "$s.IconLocation = (Join-Path '%CD%' 'assets\pixelforge.ico') + ',0';" ^
  "$s.Description = 'PixelForge - updates itself, then opens the Forge'; $s.Save();" ^
  "$s = $ws.CreateShortcut((Join-Path $d 'PixelForge Studio (classic).lnk'));" ^
  "$s.TargetPath = (Join-Path '%CD%' 'PixelForge Studio.bat');" ^
  "$s.Arguments = ''; $s.WorkingDirectory = '%CD%'; $s.WindowStyle = 7;" ^
  "$s.IconLocation = (Join-Path '%CD%' 'assets\pixelforge.ico') + ',0';" ^
  "$s.Description = 'PixelForge Studio (classic) - the older window with every form'; $s.Save()" ^
  && echo   Desktop shortcuts created. || echo   (could not create the shortcuts; use "PixelForge.bat" and "PixelForge Studio.bat")
if exist "..\..\Play Godmarrow.bat" (
  echo Creating the game shortcut...
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ws = New-Object -ComObject WScript.Shell; $d = [Environment]::GetFolderPath('Desktop');" ^
    "$s = $ws.CreateShortcut((Join-Path $d 'Godmarrow.lnk'));" ^
    "$s.TargetPath = (Resolve-Path '..\..\Play Godmarrow.bat').Path; $s.WorkingDirectory = (Resolve-Path '..\..').Path;" ^
    "$s.IconLocation = (Join-Path '%CD%' 'assets\pixelforge.ico') + ',0';" ^
    "$s.Description = 'Godmarrow - updates itself, then plays'; $s.Save()" ^
    && echo   Game shortcut created. || echo   (could not create the game shortcut; double-click "Play Godmarrow.bat" in the Godmarrow folder)
)
echo.
echo.
echo Checking this computer...
python -m pixelforge.cli doctor
echo.
echo Done. Double-click the "PixelForge" icon on your desktop to start (full screen, guided).
echo "PixelForge Studio (classic)" is the older window with every form.
echo Blender (free) is only for the painting road: Settings in the app can download it.
pause
