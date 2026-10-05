@echo off
rem The Ossuarch's Bone Blade, for a playtest: a level-12 Ossuarch in the Drowned Fen with the Bone Blade (10) and
rem Tally (5) learned and the Blade on the right mouse button. Hold right-click to charge it through its three tiers;
rem release to strike. Tier 1 a thrust, tier 2 a wide cleave, tier 3 a split down the ground.
rem The pause menu (Esc) has "Charge melee techniques" to switch charging off: then holding strikes, and the string
rem climbs the tiers.
cd /d "%~dp0"
set GODOT=
for %%F in ("%USERPROFILE%\OneDrive\Desktop\Godot\Godot_v4.7.2-stable_win64.exe" "%USERPROFILE%\OneDrive\Desktop\Godot\Godot*.exe" "%USERPROFILE%\Desktop\Godot\Godot*.exe" "tools\godot\Godot*.exe") do if not defined GODOT if exist "%%~F" set "GODOT=%%~fF"
if not defined GODOT (echo Godot not found; use Play Godmarrow.bat once first. & pause & exit /b 1)
start "" "%GODOT%" --path "%CD%" -- --zone=fen --cls=ossumancer --new --seed=7 --lvl=12 --learn=blade:10,tally:5 --right=blade
