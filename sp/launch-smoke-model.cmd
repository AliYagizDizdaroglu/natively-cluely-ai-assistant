@echo off
rem Live smoke for the s50l verbal-primary override (task Natively-smoke-model).
rem
rem Three scenario50 clips played into the REAL app with the override set, then the app's own
rem debug log is read back: every answer request must be gemini-3.5-flash-lite at thinking=HIGH
rem with thought tokens spent. This is the one link the unit tests cannot reach - they mock the
rem SDK - and the one a flight cannot afford to discover at 10:10.
rem
rem Roughly six minutes: app start, three questions with 14 s of silence between them so no
rem question is read as a continuation of the last, then the check. It plays audio, so the
rem machine should be quiet.
rem
rem No parentheses inside any echo in an if-block. See the 2026-09-20 launcher defect.
if not exist "electron\test\golden\interview60.run.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-smoke-model-launcher-error.log"
  exit /b 9
)
if not exist "dist-electron\electron\llm\verbalPrimaryModel.js" (
  echo dist-electron does not carry the verbal primary override - run npm run build:electron >> "%TEMP%\natively-smoke-model-launcher-error.log"
  exit /b 4
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
set NATIVELY_GEMINI_THINKING_LEVEL=
rem The variable under test, exactly as launch-s50l.cmd sets it.
set NATIVELY_VERBAL_PRIMARY_MODEL=gemini-3.5-flash-lite
set LOG=electron\test\golden\interview60.runs\smoke-model.log
echo === MODEL OVERRIDE SMOKE === > %LOG%
"C:\Program Files\nodejs\node.exe" "%~dp0smoke-turn.mjs" S1Q06 S2Q10 S2Q07 >> %LOG% 2>&1
echo SMOKE-TURN EXIT %ERRORLEVEL% >> %LOG%
echo === MODEL CHECK === >> %LOG%
"C:\Program Files\nodejs\node.exe" "%~dp0check-smoke-model.mjs" gemini-3.5-flash-lite HIGH gemini-3.1-flash-lite 25 >> %LOG% 2>&1
set CHECK=%ERRORLEVEL%
echo MODEL-CHECK EXIT %CHECK% >> %LOG%
exit /b %CHECK%
