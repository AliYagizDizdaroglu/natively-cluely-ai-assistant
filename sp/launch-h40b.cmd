@echo off
rem holdout40 with the R09 fix, flight h40b (task Natively-flight-h40b, 2026-09-26 17:00 local).
rem h40b = holdout40 again with ONE change under test: IntentClassifier no longer routes the bare
rem word "salary" to negotiation coaching. Everything else flies the shipped default - same
rem roster, same audio, same models, same levels - so the hour isolates that one change.
if not exist "electron\test\golden\interview60.flight.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-h40b-launcher-error.log"
  exit /b 9
)
if not exist "electron\test\golden\holdout40.wav" (
  echo holdout40.wav missing - build the audio first >> "%TEMP%\natively-h40b-launcher-error.log"
  exit /b 8
)
if not exist "electron\test\golden\holdout40.questions.mjs" (
  echo holdout40 roster missing from this checkout - merge it first >> "%TEMP%\natively-h40b-launcher-error.log"
  exit /b 7
)
rem Guard: the harness must stop the app when the flight ends - 5952b23.
findstr /C:"process.on('exit', appStop)" "electron\test\golden\interview60.run.mjs" >nul 2>&1
if errorlevel 1 (
  echo the harness does not stop the app when a run ends - pick 5952b23 into this checkout >> "%TEMP%\natively-h40b-launcher-error.log"
  exit /b 6
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=holdout40
set NATIVELY_SCENARIOS=
set NATIVELY_GEMINI_THINKING_LEVEL=
set NATIVELY_VERBAL_PRIMARY_MODEL=
rem Guard: the audio must hold exactly the roster's clips and gaps.
"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.run.mjs wav:check >> electron\test\golden\interview60.runs\flight-h40b.launcher.log 2>&1
if errorlevel 1 (
  echo holdout40.wav does not match the holdout40 roster - see flight-h40b.launcher.log >> "%TEMP%\natively-h40b-launcher-error.log"
  exit /b 5
)
rem BEHAVIOURAL guard: the roster this environment loads, no model or thinking override, the
rem built default and fallback models, and the level each honours. Calibrated by running it
rem with each premise broken before arming.
"C:\Program Files\nodejs\node.exe" "%~dp0guard-h40b.mjs" >> electron\test\golden\interview60.runs\flight-h40b.launcher.log 2>&1
if errorlevel 1 (
  echo behavioural guard failed - see flight-h40b.launcher.log >> "%TEMP%\natively-h40b-launcher-error.log"
  exit /b 4
)
"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.flight.mjs h40b >> electron\test\golden\interview60.runs\flight-h40b.launcher.log 2>&1
