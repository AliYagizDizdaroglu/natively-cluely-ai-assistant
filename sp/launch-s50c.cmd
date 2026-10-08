@echo off
rem scenario50 S1+S2 proof flight for the answer-quality fixes (scheduled task Natively-flight-s50c).
rem Same shape as the s50b launcher: registered with -WorkingDirectory set to the repo,
rem ASCII-only, never cd's to the accented repo path itself.
if not exist "electron\test\golden\interview60.flight.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-s50c-launcher-error.log"
  exit /b 9
)
if not exist "electron\test\golden\scenario50.wav" (
  echo scenario50.wav missing - build audio first >> "%TEMP%\natively-s50c-launcher-error.log"
  exit /b 8
)
rem Guard: the fix under test must be in this checkout (the flight's auto step rebuilds from source).
findstr /C:"keepVerbalPrompt" "electron\llm\knowledgePromptBudget.ts" >nul 2>&1
if errorlevel 1 (
  echo answer-quality fix not in this checkout - merge first >> "%TEMP%\natively-s50c-launcher-error.log"
  exit /b 7
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.flight.mjs s50c >> electron\test\golden\interview60.runs\flight-s50c.launcher.log 2>&1
