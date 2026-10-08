@echo off
rem Live spike for the stall fallback on the TECHNICAL verbal route (task Natively-smoke-stall).
rem Two smoke runs of three technical questions each, in the real app, real network:
rem   1) NATIVELY_FIRST_TOKEN_TIMEOUT_MS=300 — below any real first-token time, so every
rem      technical answer must log "stalled after 300ms — falling back to gemini-3.5-flash-lite"
rem      and still be delivered (source sentinel "(fallback)").
rem   2) unset — the default 4 s budget: every answer must log the race line
rem      "verbal stall race: trying gemini-3.1-flash-lite (fallback=... after 4000ms)" and
rem      NO stall (answers from the primary), proving the race does not fire on normal latency.
rem Both read the app's own debug log back through smoke-turn.mjs. Same launcher shape as the
rem others: -WorkingDirectory set by the task, ASCII only, never cd's into the accented path.
if not exist "electron\test\golden\interview60.run.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-smoke-stall-launcher-error.log"
  exit /b 9
)
findstr /C:"streamGeminiWithStallFallback" "electron\LLMHelper.ts" >nul 2>&1
if errorlevel 1 (
  echo stall-fallback change not in this checkout - fast-forward main first >> "%TEMP%\natively-smoke-stall-launcher-error.log"
  exit /b 7
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
set LOG1=electron\test\golden\interview60.runs\smoke-stall-forced.log
set LOG2=electron\test\golden\interview60.runs\smoke-stall-default.log
echo === STALL SMOKE 1: forced race (300 ms) === > %LOG1%
set NATIVELY_FIRST_TOKEN_TIMEOUT_MS=300
"C:\Program Files\nodejs\node.exe" "%~dp0smoke-turn.mjs" S1Q06 S2Q10 S2Q07 >> %LOG1% 2>&1
echo SMOKE1 EXIT %ERRORLEVEL% >> %LOG1%
set NATIVELY_FIRST_TOKEN_TIMEOUT_MS=
echo === STALL SMOKE 2: default budget === > %LOG2%
"C:\Program Files\nodejs\node.exe" "%~dp0smoke-turn.mjs" S1Q06 S2Q10 S2Q07 >> %LOG2% 2>&1
set SMOKE=%ERRORLEVEL%
echo SMOKE2 EXIT %SMOKE% >> %LOG2%
exit /b %SMOKE%
