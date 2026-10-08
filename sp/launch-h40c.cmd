@echo off
rem holdout40's third flight, h40c (task Natively-flight-h40c). ONE change under test against
rem h40b: NATIVELY_VERBAL_HEDGE=1 - the spoken answer's model policy is the hedge (gemini-3.5-
rem flash-lite HIGH front, gemini-3.1-flash-lite LOW raced in beside it after 5000ms without a
rem first token, first token wins), replacing the plain stall race h40b flew. The follow-up
rem parent restore flies OFF this hour: its own offline replay (scenario50, s50m) FAILED the
rem pre-registered rule (wrong 0 to 1, acceptable 16 to 22; 51e349d) - the flag stays off, not a
rem validated-and-withheld fix. Everything else is h40b's: roster holdout40, audio, Deepgram +
rem Live ears, grader rubric.
if not exist "electron\test\golden\interview60.flight.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-h40c-launcher-error.log"
  exit /b 9
)
if not exist "electron\test\golden\holdout40.wav" (
  echo holdout40.wav missing - build the audio first >> "%TEMP%\natively-h40c-launcher-error.log"
  exit /b 8
)
if not exist "electron\test\golden\holdout40.questions.mjs" (
  echo holdout40 roster missing from this checkout - merge it first >> "%TEMP%\natively-h40c-launcher-error.log"
  exit /b 7
)
rem Guard: the harness must stop the app when the flight ends - 5952b23.
findstr /C:"process.on('exit', appStop)" "electron\test\golden\interview60.run.mjs" >nul 2>&1
if errorlevel 1 (
  echo the harness does not stop the app when a run ends - pick 5952b23 into this checkout >> "%TEMP%\natively-h40c-launcher-error.log"
  exit /b 6
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=holdout40
set NATIVELY_SCENARIOS=
set NATIVELY_GEMINI_THINKING_LEVEL=
set NATIVELY_VERBAL_PRIMARY_MODEL=
set NATIVELY_VERBAL_HEDGE=1
set NATIVELY_VERBAL_HEDGE_TRIGGER_MS=
set NATIVELY_FOLLOWUP_PARENT=
rem I8: pins the tree the flight's rebuild will compile - guard-h40c.mjs check 10b fails if
rem MAIN HEAD does not equal this value. PLACEHOLDER - filled in with this pre-registration's OWN
rem commit once it is written (the arm-removal commit, e94305a, has already landed; the
rem pre-registration commit is the one still pending, and becomes the registered HEAD); da28f25
rem is the hedge commit alone and is stale on its own.
set NATIVELY_FLIGHT_COMMIT=0e1e8b2bdfb33d22aad59f77b04a6982d5b059d5
rem Guard: the audio must hold exactly the roster's clips and gaps.
"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.run.mjs wav:check >> electron\test\golden\interview60.runs\flight-h40c.launcher.log 2>&1
if errorlevel 1 (
  echo holdout40.wav does not match the holdout40 roster - see flight-h40c.launcher.log >> "%TEMP%\natively-h40c-launcher-error.log"
  exit /b 5
)
rem BEHAVIOURAL guard: the roster this environment loads, no model or thinking override, the
rem built default and fallback models and the level each honours, the R09 fix, AND the two
rem plan flags (hedge ON at its probed 5000ms trigger, follow-up parent OFF) as the built
rem dist-electron and its source resolve them. Calibrated by running it with each premise
rem broken before arming - see guard-h40c-cal.txt.
"C:\Program Files\nodejs\node.exe" "%~dp0guard-h40c.mjs" >> electron\test\golden\interview60.runs\flight-h40c.launcher.log 2>&1
if errorlevel 1 (
  echo behavioural guard failed - see flight-h40c.launcher.log >> "%TEMP%\natively-h40c-launcher-error.log"
  exit /b 4
)
"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.flight.mjs h40c >> electron\test\golden\interview60.runs\flight-h40c.launcher.log 2>&1
