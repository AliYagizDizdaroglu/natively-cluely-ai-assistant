@echo off
rem Wiring smoke for the answer-quality fixes (scheduled task Natively-smoke2): four clips into
rem the real app, one answer each, dispatched after the voice stops. No quality arm here (the
rem offline arms already ran today; the daily quota is saved for the flight).
rem Same shape as the other launchers: registered with -WorkingDirectory set to the repo,
rem ASCII-only, never cd's into the accented repo path itself.
if not exist "electron\test\golden\interview60.run.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-smoke2-launcher-error.log"
  exit /b 9
)
findstr /C:"carriesSpokenBudget" "electron\llm\knowledgePromptBudget.ts" >nul 2>&1
if errorlevel 1 (
  echo answer-quality fix not in this checkout - merge first >> "%TEMP%\natively-smoke2-launcher-error.log"
  exit /b 7
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
set LOG=electron\test\golden\interview60.runs\smoke-turn2.log
echo === WIRING SMOKE (answer-quality fixes) === > %LOG%
"C:\Program Files\nodejs\node.exe" "%~dp0smoke-turn.mjs" S1Q01 S1Q04 S2Q04 S2Q06 >> %LOG% 2>&1
set SMOKE=%ERRORLEVEL%
echo SMOKE EXIT %SMOKE% >> %LOG%
exit /b %SMOKE%
