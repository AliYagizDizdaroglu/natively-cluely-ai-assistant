@echo off
rem AFTER smoke (task Natively-smoke-noise-after): the same noisy smoke against a MAIN checkout
rem that carries the turn fix (a367ad8, the wordless grace, fast-forwarded). Expected: 4 answers,
rem 0 supersedes, a `turn: close reason=continuation-expired` in every gap. Refuses without it.
if not exist "electron\test\golden\interview60.run.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-smoke-noise-launcher-error.log"
  exit /b 9
)
findstr /C:"wordlessGraceMs" "electron\services\interviewerTurn.ts" >nul 2>&1
if errorlevel 1 (
  echo turn fix not in main - fast-forward feat/whole-turn-answers first >> "%TEMP%\natively-smoke-noise-launcher-error.log"
  exit /b 7
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
set LOG=electron\test\golden\interview60.runs\smoke-turn5-noise-after.log
echo === NOISE SMOKE, AFTER the turn fix (expect 4 answers) === > %LOG%
"C:\Program Files\nodejs\node.exe" "%~dp0smoke-turn-noise.mjs" S1Q02 S2Q01 S2Q07 S2Q08 >> %LOG% 2>&1
set SMOKE=%ERRORLEVEL%
echo SMOKE EXIT %SMOKE% >> %LOG%
exit /b %SMOKE%
