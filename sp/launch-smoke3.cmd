@echo off
rem Wiring smoke for the 200-word guard (scheduled task Natively-smoke3). Four clips into the
rem real app, one answer each. Three of the four (S2Q01, S2Q07, S2Q08) had their last asked
rem part removed by the old question-scaled cut on flight s50c; S1Q02 is a short question whose
rem 80-word limit fired. If the guard works, all four stream whole: cut=no in the budget lines.
rem Same shape as the other launchers: registered with -WorkingDirectory set to the repo,
rem ASCII-only, never cd's into the accented repo path itself.
if not exist "electron\test\golden\interview60.run.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-smoke3-launcher-error.log"
  exit /b 9
)
findstr /C:"SPOKEN_WORD_GUARD" "electron\llm\verbalStreamFilter.ts" >nul 2>&1
if errorlevel 1 (
  echo word-guard change not in this checkout - merge first >> "%TEMP%\natively-smoke3-launcher-error.log"
  exit /b 7
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
set LOG=electron\test\golden\interview60.runs\smoke-turn3.log
echo === WIRING SMOKE (200-word guard) === > %LOG%
"C:\Program Files\nodejs\node.exe" "%~dp0smoke-turn.mjs" S1Q02 S2Q01 S2Q07 S2Q08 >> %LOG% 2>&1
set SMOKE=%ERRORLEVEL%
echo SMOKE EXIT %SMOKE% >> %LOG%
exit /b %SMOKE%
