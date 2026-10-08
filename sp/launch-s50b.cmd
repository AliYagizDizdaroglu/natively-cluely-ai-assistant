@echo off
rem scenario50 S1+S2 whole-turn proof flight launcher (scheduled task Natively-flight-s50b).
rem Same shape as the s50a launcher: the task is registered with -WorkingDirectory set
rem to the repo, this file stays ASCII-only, and it never cd's to the repo path itself
rem (the accented folder name breaks under the OEM code page).
rem
rem Guard: refuse to run from the wrong directory rather than start an hour somewhere else.
if not exist "electron\test\golden\interview60.flight.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-s50b-launcher-error.log"
  exit /b 9
)
rem Second guard: the roster's audio must already be built for THIS selection, or the hour
rem would play whatever scenario50.wav happens to hold.
if not exist "electron\test\golden\scenario50.wav" (
  echo scenario50.wav missing - build audio first >> "%TEMP%\natively-s50b-launcher-error.log"
  exit /b 8
)
rem Third guard: the whole-turn branch must actually be merged into this checkout, or the
rem hour would measure the OLD answering path. The flight's own `auto` step runs
rem `npm run build:electron` before starting the app, so the source file is what to check,
rem not the build output.
if not exist "electron\services\interviewerTurn.ts" (
  echo whole-turn code not in this checkout - merge feat/whole-turn-answers first >> "%TEMP%\natively-s50b-launcher-error.log"
  exit /b 7
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.flight.mjs s50b >> electron\test\golden\interview60.runs\flight-s50b.launcher.log 2>&1
