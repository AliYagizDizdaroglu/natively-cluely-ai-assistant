@echo off
rem DRY-RUN COPY for cmd-syntax verification only (SP\cal-h40c\cmd-dryrun). Identical to
rem SP\launch-smoke-hedge.cmd except: ping -n 3 instead of -n 41 (so this finishes in
rem seconds instead of ~40s) and the guard/app files are stubs under this same directory.
rem The shipped file (SP\launch-smoke-hedge.cmd) uses ping -n 41.
if not exist "electron\test\golden\interview60.run.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-smoke-hedge-launcher-error.log"
  exit /b 9
)
findstr /C:"streamGeminiWithHedge" "electron\LLMHelper.ts" >nul 2>&1
if errorlevel 1 (
  echo verbal-hedge change not in this checkout - fast-forward main first >> "%TEMP%\natively-smoke-hedge-launcher-error.log"
  exit /b 7
)
set NODE="C:\Program Files\nodejs\node.exe"
set RUNS=electron\test\golden\interview60.runs
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
set NATIVELY_FOLLOWUP_PARENT=

set LOG1=%RUNS%\smoke-hedge-forced.log
set LOG2=%RUNS%\smoke-hedge-default.log
set LOG3=%RUNS%\smoke-hedge-off.log
set LOG4=%RUNS%\smoke-hedge-refuse.log

rem SEGMENT 1: forced race - the back leg starts beside the front on every answer
echo === HEDGE SMOKE 1: forced race, trigger=1ms === > %LOG1%
%NODE% -e "console.log(new Date().toISOString())" >> %LOG1%
set NATIVELY_VERBAL_HEDGE=1
set NATIVELY_VERBAL_HEDGE_TRIGGER_MS=1
%NODE% "%~dp0smoke-turn.mjs" S1Q06 S2Q10 S2Q07 >> %LOG1% 2>&1
echo SMOKE1 EXIT %ERRORLEVEL% >> %LOG1%

rem SEGMENT 2: default trigger (5000ms) - the front answers alone unless it stalls
echo === HEDGE SMOKE 2: default trigger, 5000ms === > %LOG2%
%NODE% -e "console.log(new Date().toISOString())" >> %LOG2%
set NATIVELY_VERBAL_HEDGE_TRIGGER_MS=
%NODE% "%~dp0smoke-turn.mjs" S1Q06 S2Q10 S2Q07 >> %LOG2% 2>&1
echo SMOKE2 EXIT %ERRORLEVEL% >> %LOG2%

rem SEGMENT 3 (control): flag unset - today's race, no hedge line
echo === HEDGE SMOKE 3: control, flag unset === > %LOG3%
%NODE% -e "console.log(new Date().toISOString())" >> %LOG3%
set NATIVELY_VERBAL_HEDGE=
%NODE% "%~dp0smoke-turn.mjs" S1Q06 >> %LOG3% 2>&1
echo SMOKE3 EXIT %ERRORLEVEL% >> %LOG3%

rem SEGMENT 4: startup refusal - a bad value must refuse to start and exit on its own.
rem app:start's own wait/retry logic (up to two attempts of 180s each) is built for a real
rem successful start, not a refusal, so it is launched in the background here; this script
rem does its own ~40s wait and then calls app:stop, whose command-line filtering (already
rem exercised by segments 1-3) finds only THIS checkout's electron.exe. "killed 0
rem process(es)" means it was already gone - refused cleanly; "killed N>0" means it had to
rem be force-killed - the refusal did not exit on its own.
echo === HEDGE SMOKE 4: startup refusal, bad value === > %LOG4%
%NODE% -e "console.log(new Date().toISOString())" >> %LOG4%
set NATIVELY_VERBAL_HEDGE=yes
start "hedge-refuse" /B %NODE% "electron\test\golden\interview60.run.mjs" app:start >> %LOG4% 2>&1
set SMOKE=%ERRORLEVEL%
ping -n 3 127.0.0.1 >nul
%NODE% "electron\test\golden\interview60.run.mjs" app:stop >> %LOG4% 2>&1
set NATIVELY_VERBAL_HEDGE=
echo SMOKE4 EXIT %SMOKE% >> %LOG4%

exit /b 0
