@echo off
rem scenario50 S1+S2 flight s50j (task Natively-flight-s50j, 2026-09-19 10:10 local, after the
rem 07:00 UTC Gemini reset). Same hour as s50i: the launcher sets NO thinking level, so the app's
rem shipped default (LOW) flies, and each answer's "usage: thinking=LOW thoughts=N" line in
rem natively_debug.log proves it. Two things are new since s50i:
rem   - the 200-word guard ends on a finished sentence (01d3810) instead of slicing one
rem   - the offline twin runs THREE times (captured-low, -r2, -r3) so the hour carries its own
rem     noise floor, which is what decides whether the in-app vs twin gap is a real defect
rem Same launcher shape as the others: -WorkingDirectory is set by the task, ASCII only, and it
rem never cd's into the accented repo path itself.
if not exist "electron\test\golden\interview60.flight.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-s50j-launcher-error.log"
  exit /b 9
)
if not exist "electron\test\golden\scenario50.wav" (
  echo scenario50.wav missing - build audio first >> "%TEMP%\natively-s50j-launcher-error.log"
  exit /b 8
)
rem Guard: this checkout AND its build must carry the shipped LOW default, or the hour would
rem silently fly at MINIMAL like every flight through s50f.
findstr /C:"DEFAULT_GEMINI_THINKING_LEVEL" "electron\llm\geminiThinking.ts" >nul 2>&1
if errorlevel 1 (
  echo shipped LOW default missing from this checkout - fast-forward main first >> "%TEMP%\natively-s50j-launcher-error.log"
  exit /b 7
)
findstr /C:"DEFAULT_GEMINI_THINKING_LEVEL" "dist-electron\electron\llm\geminiThinking.js" >nul 2>&1
if errorlevel 1 (
  echo dist-electron not rebuilt with the shipped LOW default - run npm run build:electron >> "%TEMP%\natively-s50j-launcher-error.log"
  exit /b 6
)
rem Guard: the sentence-boundary word guard must be in the BUILD the hour runs, or the flight
rem re-measures the truncation defect it is meant to prove fixed (floor 120, not 200).
findstr /C:"floor: 120" "dist-electron\electron\llm\verbalStreamFilter.js" >nul 2>&1
if errorlevel 1 (
  echo dist-electron does not carry the sentence-boundary word guard >> "%TEMP%\natively-s50j-launcher-error.log"
  exit /b 5
)
rem Guard: the three offline-twin reps must be in the harness, or the hour has no noise floor.
findstr /C:"captured-low-r3" "electron\test\golden\interview60.flight.mjs" >nul 2>&1
if errorlevel 1 (
  echo three-rep offline twin missing from this checkout >> "%TEMP%\natively-s50j-launcher-error.log"
  exit /b 4
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
set NATIVELY_GEMINI_THINKING_LEVEL=
"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.flight.mjs s50j >> electron\test\golden\interview60.runs\flight-s50j.launcher.log 2>&1
