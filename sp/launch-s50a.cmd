@echo off
rem scenario50 S1+S2 baseline flight launcher (scheduled task Natively-flight-s50a).
rem Same shape as the after9 launcher: the task is registered with -WorkingDirectory set
rem to the repo, this file stays ASCII-only, and it never cd's to the repo path itself
rem (the accented folder name breaks under the OEM code page).
rem
rem Guard: refuse to run from the wrong directory rather than start an hour somewhere else.
if not exist "electron\test\golden\interview60.flight.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-s50a-launcher-error.log"
  exit /b 9
)
rem Second guard: the roster's audio must already be built for THIS selection, or the hour
rem would play whatever scenario50.wav happens to hold.
if not exist "electron\test\golden\scenario50.wav" (
  echo scenario50.wav missing - build audio first >> "%TEMP%\natively-s50a-launcher-error.log"
  exit /b 8
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.flight.mjs s50a >> electron\test\golden\interview60.runs\flight-s50a.launcher.log 2>&1
