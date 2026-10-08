@echo off
rem BEFORE smoke (task Natively-smoke-noise-before): the 2026-09-13 supersede defect, reproduced
rem on purpose. Same four clips, 14 s gaps, but each gap carries two 1 s tones (+4 s, +7 s) —
rem wordless loopback energy. Runs against the MAIN checkout as it stands (no turn fix), so the
rem expected result is the defect: 1 answer, 3 supersedes. This launcher must NOT have the fix.
if not exist "electron\test\golden\interview60.run.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-smoke-noise-launcher-error.log"
  exit /b 9
)
findstr /C:"wordless-final" "electron\audio\DeepgramStreamingSTT.ts" >nul 2>&1
if not errorlevel 1 (
  echo main already carries the turn fix - this is the BEFORE launcher >> "%TEMP%\natively-smoke-noise-launcher-error.log"
  exit /b 7
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
set LOG=electron\test\golden\interview60.runs\smoke-turn4-noise-before.log
echo === NOISE SMOKE, BEFORE the turn fix (expect the defect) === > %LOG%
"C:\Program Files\nodejs\node.exe" "%~dp0smoke-turn-noise.mjs" S1Q02 S2Q01 S2Q07 S2Q08 >> %LOG% 2>&1
set SMOKE=%ERRORLEVEL%
echo SMOKE EXIT %SMOKE% >> %LOG%
exit /b %SMOKE%
