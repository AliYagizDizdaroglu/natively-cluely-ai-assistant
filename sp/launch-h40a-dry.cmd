@echo off
rem holdout40 BASELINE flight h40a (task Natively-flight-h40a, 2026-09-24 10:10 local, after the
rem 07:00 UTC Gemini reset). The first hour on the technical-breadth roster the app was never
rem tuned on. A baseline has NO pass rule: it sets the bands that later validation hours on this
rem roster are read against.
rem
rem The app flies its shipped default: gemini-3.1-flash-lite at LOW answers, and
rem gemini-3.5-flash-lite at HIGH takes over on a first-token stall. No model override - the
rem 2026-09-23 latency test failed, so 3.1-lite LOW stays and the model question is closed.
rem After the hour the flight replays the same questions on both models, three reps each.
rem
rem Audio: SAPI David, 45 clips, 65.8 min, renders byte-identical. The calibration gate failed
rem on its faithfulness row only, the same way on two voices: the listener drops the lead-in and
rem paraphrases R13 and R31 while every number survives. Flown as the scenario50 precedent says:
rem do not trim questions until the gate passes, that hides the defect instead of measuring it.
rem
rem NOTE ON STYLE: no parentheses inside any echo in an if-block. On 2026-09-20 a guard message
rem citing a commit in parentheses closed its own if-block early, so the exit after it ran
rem unconditionally and the 10:10 flight died before takeoff with no log of any kind.
if not exist "electron\test\golden\interview60.flight.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-h40a-dryrun-error.log"
  exit /b 9
)
if not exist "electron\test\golden\holdout40.wav" (
  echo holdout40.wav missing - build the audio first >> "%TEMP%\natively-h40a-dryrun-error.log"
  exit /b 8
)
if not exist "electron\test\golden\holdout40.questions.mjs" (
  echo holdout40 roster missing from this checkout - merge it first >> "%TEMP%\natively-h40a-dryrun-error.log"
  exit /b 7
)
rem Guard: the harness must stop the app when the flight ends - 5952b23.
findstr /C:"process.on('exit', appStop)" "electron\test\golden\interview60.run.mjs" >nul 2>&1
if errorlevel 1 (
  echo the harness does not stop the app when a run ends - pick 5952b23 into this checkout >> "%TEMP%\natively-h40a-dryrun-error.log"
  exit /b 6
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=holdout40
set NATIVELY_SCENARIOS=
set NATIVELY_GEMINI_THINKING_LEVEL=
set NATIVELY_VERBAL_PRIMARY_MODEL=
rem Guard: the audio must hold exactly the roster's clips and gaps.
"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.run.mjs wav:check >> "%TEMP%\natively-h40a-dryrun.log" 2>&1
if errorlevel 1 (
  echo holdout40.wav does not match the holdout40 roster - see flight-h40a.launcher.log >> "%TEMP%\natively-h40a-dryrun-error.log"
  exit /b 5
)
rem BEHAVIOURAL guard: the roster this environment loads, no model or thinking override, the
rem built default and fallback models, and the level each honours. Calibrated by running it
rem with each premise broken before arming.
"C:\Program Files\nodejs\node.exe" "%~dp0guard-h40a.mjs" >> "%TEMP%\natively-h40a-dryrun.log" 2>&1
if errorlevel 1 (
  echo behavioural guard failed - see flight-h40a.launcher.log >> "%TEMP%\natively-h40a-dryrun-error.log"
  exit /b 4
)
"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.flight.mjs h40a --dry-run >> "%TEMP%\natively-h40a-dryrun.log" 2>&1
