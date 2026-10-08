@echo off
rem scenario50 S1+S2 reliability flight (scheduled task Natively-flight-s50e). No code change
rem since s50d — this one is about a clean hour: s50d ran with Groq detection returning 403 all
rem through (164 failures, 0 successes), which cost one question and both Groq arms. The key
rem answers 200 again as of 2026-09-13 17:29 local, so this run shows what the app does with
rem both ears alive.
rem Same launcher shape as the others: -WorkingDirectory is set by the task, ASCII only, and it
rem never cd's into the accented repo path itself.
if not exist "electron\test\golden\interview60.flight.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-s50e-launcher-error.log"
  exit /b 9
)
if not exist "electron\test\golden\scenario50.wav" (
  echo scenario50.wav missing - build audio first >> "%TEMP%\natively-s50e-launcher-error.log"
  exit /b 8
)
rem Guard: the shipped build must still carry the word guard the last two flights measured.
findstr /C:"SPOKEN_WORD_GUARD" "electron\llm\verbalStreamFilter.ts" >nul 2>&1
if errorlevel 1 (
  echo word-guard change missing from this checkout >> "%TEMP%\natively-s50e-launcher-error.log"
  exit /b 7
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.flight.mjs s50e >> electron\test\golden\interview60.runs\flight-s50e.launcher.log 2>&1
