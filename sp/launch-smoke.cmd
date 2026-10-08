@echo off
rem Pre-flight checks for whole-turn answering (scheduled task Natively-smoke-turn).
rem Two things, in this order, before three hours are spent on the flight:
rem   1. WIRING  smoke-turn.mjs plays four clips into the real app and reads its log back.
rem              This is the only live exercise of main.ts, which has no unit tests.
rem   2. QUALITY the answer arm re-runs the 20 main questions through the SHIPPED prompt.
rem              interview60.answers.mjs loads the prompt from dist-electron (which step 1
rem              just built), so this measures exactly what will fly, against the arms
rem              already recorded for the same questions: plain 8/20, structured 13/20.
rem
rem Same shape as the flight launchers: the task carries -WorkingDirectory, this file stays
rem ASCII-only and never cd's into the accented repo path itself. A scheduled task rather
rem than a direct run because an app started inside a Claude session reads a shadow
rem credentials store (MSIX virtualisation) and answers nothing.
if not exist "electron\test\golden\interview60.run.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-smoke-launcher-error.log"
  exit /b 9
)
if not exist "electron\services\interviewerTurn.ts" (
  echo whole-turn code not in this checkout - merge feat/whole-turn-answers first >> "%TEMP%\natively-smoke-launcher-error.log"
  exit /b 7
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
set LOG=electron\test\golden\interview60.runs\smoke-turn.log

echo === WIRING SMOKE === > %LOG%
"C:\Program Files\nodejs\node.exe" "%~dp0smoke-turn.mjs" >> %LOG% 2>&1
set SMOKE=%ERRORLEVEL%
echo SMOKE EXIT %SMOKE% >> %LOG%

rem The quality arm runs even when the smoke fails: it costs ~20 calls, needs no app, and
rem its answer is useful either way (a prompt regression and a wiring bug are independent).
echo. >> %LOG%
echo === QUALITY ARM (shipped prompt, plain, gemini-3.1-flash-lite) === >> %LOG%
"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.answers.mjs --model gemini-3.1-flash-lite >> %LOG% 2>&1
echo ARM EXIT %ERRORLEVEL% >> %LOG%
exit /b %SMOKE%
