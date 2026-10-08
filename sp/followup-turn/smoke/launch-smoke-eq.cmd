@echo off
rem Live smoke for NATIVELY_EARLIER_QUESTION on the built app: segment 1 flag on, segment 2 control off.
if not exist "electron\test\golden\interview60.run.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-smoke-eq-launcher-error.log"
  exit /b 9
)
findstr /C:"describeEarlierQuestionAtStartup" "electron\main.ts" >nul 2>&1
if errorlevel 1 (
  echo earlier-question startup check not in this checkout >> "%TEMP%\natively-smoke-eq-launcher-error.log"
  exit /b 7
)
findstr /C:"asked earlier; context only" "dist-electron\electron\llm\earlierQuestion.js" >nul 2>&1
if errorlevel 1 (
  echo dist-electron does not carry the earlier-question module - rebuild MAIN >> "%TEMP%\natively-smoke-eq-launcher-error.log"
  exit /b 7
)
set NODE="C:\Program Files\nodejs\node.exe"
set RUNS=electron\test\golden\interview60.runs
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
set NATIVELY_FOLLOWUP_PARENT=
set NATIVELY_VERBAL_PRIMARY_MODEL=
set NATIVELY_GEMINI_THINKING_LEVEL=
set NATIVELY_FIRST_TOKEN_TIMEOUT_MS=
set NATIVELY_VERBAL_HEDGE_TRIGGER_MS=
set NATIVELY_CAPTURE_PROMPTS=

set LOG1=%RUNS%\smoke-eq-on.log
set LOG2=%RUNS%\smoke-eq-off.log

echo === EQ SMOKE 1: flag on === > %LOG1%
%NODE% -e "console.log(new Date().toISOString())" >> %LOG1%
set NATIVELY_EARLIER_QUESTION=1
%NODE% "%~dp0smoke-eq.mjs" S1Q04:+150 S1Q04F S1Q06:+150 S1Q06F:+30 WHY >> %LOG1% 2>&1
set SMOKE1=%ERRORLEVEL%
echo SMOKE1 EXIT %SMOKE1% >> %LOG1%
copy /Y natively_debug.log %RUNS%\smoke-eq-on.natively_debug.log >nul
copy /Y verbal-prompts.log %RUNS%\smoke-eq-on.verbal-prompts.log >nul
copy /Y %RUNS%\smoke-eq.json %RUNS%\smoke-eq-on.played.json >nul
git rev-parse HEAD >> %LOG1% 2>&1
if not errorlevel 1 for /f %%i in ('git --no-optional-locks status --porcelain -uno ^| find /c /v ""') do echo dirty-lines=%%i>>%LOG1%
for %%F in (dist-electron\electron\main.js) do %NODE% -e "console.log('dist-electron main.js mtime=' + require('fs').statSync(process.argv[1]).mtime.toISOString())" %%F>>%LOG1%

echo === EQ SMOKE 2: control, flag unset === > %LOG2%
%NODE% -e "console.log(new Date().toISOString())" >> %LOG2%
set NATIVELY_EARLIER_QUESTION=
%NODE% "%~dp0smoke-eq.mjs" S1Q04:+150 S1Q04F >> %LOG2% 2>&1
set SMOKE2=%ERRORLEVEL%
echo SMOKE2 EXIT %SMOKE2% >> %LOG2%
copy /Y natively_debug.log %RUNS%\smoke-eq-off.natively_debug.log >nul
copy /Y %RUNS%\smoke-eq.json %RUNS%\smoke-eq-off.played.json >nul
git rev-parse HEAD >> %LOG2% 2>&1
if not errorlevel 1 for /f %%i in ('git --no-optional-locks status --porcelain -uno ^| find /c /v ""') do echo dirty-lines=%%i>>%LOG2%

if not "%SMOKE1%"=="0" exit /b %SMOKE1%
exit /b %SMOKE2%
