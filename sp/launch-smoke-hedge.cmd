@echo off
rem Live spike for the verbal hedge (NATIVELY_VERBAL_HEDGE) on the real app, real network,
rem the real Gemini SDK (task Natively-smoke-hedge). Four segments, same cwd/roster/error-log
rem shape as launch-smoke-stall.cmd:
rem   1) forced  - NATIVELY_VERBAL_HEDGE_TRIGGER_MS=1: the back leg is started beside the
rem      front on every answer (the front never responds inside 1ms), first token wins, the
rem      loser is aborted.
rem   2) default - the flight's trigger (5000ms, unset falls back to it): the front answers
rem      alone unless it genuinely stalls.
rem   3) off (control) - flag unset: today's stall race, no hedge line at all.
rem   4) refuse - a bad flag value (NATIVELY_VERBAL_HEDGE=yes) must make the app refuse to
rem      start and exit on its own, not hang windowless holding the single-instance lock
rem      (h40c re-review N1 / rule 11).
rem Each segment writes its own start instant (ISO, via node) as the SECOND line of its own
rem log (the first line is the "=== HEDGE SMOKE n ===" header), so check-smoke-hedge.mjs reads
rem only that segment's window. Fix round 1 (review task-7-review.md):
rem   C1 - main.ts resets natively_debug.log on every app start, so segments 1-2's evidence was
rem        deleted by the time the controller could check it. Each segment now copies
rem        natively_debug.log and app-start.log to its OWN files right after its app is
rem        stopped (smoke-turn.mjs stops the app before returning - C1 fix).
rem   C3/C4/I1 - segment 4 no longer backgrounds app:start (which held LOG4's write handle for
rem        180s+ and silently dropped every later append - SP\rv7\ovw.cmd, ovw2.cmd). It runs
rem        refuse-probe.mjs in the FOREGROUND instead, which observes the real exit code.
rem   M5 - clears the other env vars that change a verbal answer, exits with the worst
rem        segment's code (not always 0), and records which build ran (git HEAD, dirty-file
rem        count, dist-electron timestamp) into each segment log.
rem ASCII only, no parentheses inside any echoed text, never cd's into the accented repo path
rem (-WorkingDirectory is set by the task).
if not exist "electron\test\golden\interview60.run.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-smoke-hedge-launcher-error.log"
  exit /b 9
)
findstr /C:"streamGeminiWithHedge" "electron\LLMHelper.ts" >nul 2>&1
if errorlevel 1 (
  echo verbal-hedge change not in this checkout - fast-forward main first >> "%TEMP%\natively-smoke-hedge-launcher-error.log"
  exit /b 7
)
findstr /C:"describeVerbalHedgeAtStartup" "electron\main.ts" >nul 2>&1
if errorlevel 1 (
  echo startup validation not in this checkout - fast-forward main first >> "%TEMP%\natively-smoke-hedge-launcher-error.log"
  exit /b 7
)
set NODE="C:\Program Files\nodejs\node.exe"
set RUNS=electron\test\golden\interview60.runs
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
rem M5: every env var that could change a verbal answer's model or timing is cleared, not
rem only the follow-up flag - a value left over from another session's launcher would make
rem this segment's evidence unattributable.
set NATIVELY_FOLLOWUP_PARENT=
set NATIVELY_VERBAL_PRIMARY_MODEL=
set NATIVELY_GEMINI_THINKING_LEVEL=
set NATIVELY_FIRST_TOKEN_TIMEOUT_MS=

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
set SMOKE1=%ERRORLEVEL%
echo SMOKE1 EXIT %SMOKE1% >> %LOG1%
rem C1: copy the app's session evidence NOW - the app is stopped (smoke-turn's own last
rem step) and the NEXT segment's app start will reset/rotate both files again.
copy /Y natively_debug.log %RUNS%\smoke-hedge-forced.natively_debug.log >nul
copy /Y %RUNS%\app-start.log %RUNS%\smoke-hedge-forced.app-start.log >nul
git rev-parse HEAD >> %LOG1% 2>&1
rem NEW-M6: --no-optional-locks so a concurrent git command elsewhere cannot make this read
rem fail or block; -uno (git's short form of untracked-files=no) because an untracked scratch
rem file must not read as a dirty checkout. The LONG flag form measured 0 dirty-lines on a
rem real 1-line diff when run through this exact for /f ^| find substitution (calibration,
rem SP\cal-m6\repro3.cmd v2/v4), even though the identical string ran directly gives the
rem right answer; cmd.exe's re-parse of the for /f command string mishandles the "=" in
rem "--untracked-files=no" - -uno (no "=") gives the correct count in both forms, same repro.
rem Skip the dirty-lines line entirely (not dirty-lines=0) when rev-parse itself failed - 0
rem would misreport "clean" for a HEAD that could not even be resolved.
if not errorlevel 1 for /f %%i in ('git --no-optional-locks status --porcelain -uno ^| find /c /v ""') do echo dirty-lines=%%i>>%LOG1%
for %%F in (dist-electron\electron\main.js) do %NODE% -e "console.log('dist-electron main.js mtime=' + require('fs').statSync(process.argv[1]).mtime.toISOString())" %%F>>%LOG1%

rem SEGMENT 2: default trigger (5000ms) - the front answers alone unless it stalls
echo === HEDGE SMOKE 2: default trigger, 5000ms === > %LOG2%
%NODE% -e "console.log(new Date().toISOString())" >> %LOG2%
set NATIVELY_VERBAL_HEDGE_TRIGGER_MS=
%NODE% "%~dp0smoke-turn.mjs" S1Q06 S2Q10 S2Q07 >> %LOG2% 2>&1
set SMOKE2=%ERRORLEVEL%
echo SMOKE2 EXIT %SMOKE2% >> %LOG2%
copy /Y natively_debug.log %RUNS%\smoke-hedge-default.natively_debug.log >nul
copy /Y %RUNS%\app-start.log %RUNS%\smoke-hedge-default.app-start.log >nul
git rev-parse HEAD >> %LOG2% 2>&1
if not errorlevel 1 for /f %%i in ('git --no-optional-locks status --porcelain -uno ^| find /c /v ""') do echo dirty-lines=%%i>>%LOG2%
for %%F in (dist-electron\electron\main.js) do %NODE% -e "console.log('dist-electron main.js mtime=' + require('fs').statSync(process.argv[1]).mtime.toISOString())" %%F>>%LOG2%

rem SEGMENT 3 (control): flag unset - today's race, no hedge line
echo === HEDGE SMOKE 3: control, flag unset === > %LOG3%
%NODE% -e "console.log(new Date().toISOString())" >> %LOG3%
set NATIVELY_VERBAL_HEDGE=
%NODE% "%~dp0smoke-turn.mjs" S1Q06 >> %LOG3% 2>&1
set SMOKE3=%ERRORLEVEL%
echo SMOKE3 EXIT %SMOKE3% >> %LOG3%
copy /Y natively_debug.log %RUNS%\smoke-hedge-off.natively_debug.log >nul
copy /Y %RUNS%\app-start.log %RUNS%\smoke-hedge-off.app-start.log >nul
git rev-parse HEAD >> %LOG3% 2>&1
if not errorlevel 1 for /f %%i in ('git --no-optional-locks status --porcelain -uno ^| find /c /v ""') do echo dirty-lines=%%i>>%LOG3%
for %%F in (dist-electron\electron\main.js) do %NODE% -e "console.log('dist-electron main.js mtime=' + require('fs').statSync(process.argv[1]).mtime.toISOString())" %%F>>%LOG3%

rem SEGMENT 4: startup refusal - a bad value must refuse to start and exit on its own.
rem C3/C4/I1 fix: a backgrounded app:start held LOG4 open for 180s+ (two attempts) and every
rem later append to it was silently dropped by cmd (reproduced in SP\rv7\ovw.cmd, ovw2.cmd);
rem even a successful "killed 0" only meant app:stop's tree-kill found nothing, which a clean
rem exit and a force-killed hang both produce. refuse-probe.mjs runs in the FOREGROUND, spawns
rem the build+app itself, observes the real exit code directly, and writes its own outcome
rem line with fs.appendFileSync (never through a shared redirect handle) - see the file for
rem the full design. It takes the segment log path as its one argument; this line's own
rem >>/2>> only catches a wrapper crash, in a SEPARATE file so it never contends with the
rem probe's own appends to %LOG4%.
echo === HEDGE SMOKE 4: startup refusal, bad value === > %LOG4%
%NODE% -e "console.log(new Date().toISOString())" >> %LOG4%
%NODE% "%~dp0refuse-probe.mjs" %LOG4% 2>>%RUNS%\smoke-hedge-refuse.wrapper-err.log
set SMOKE4=%ERRORLEVEL%
echo SMOKE4 EXIT %SMOKE4% >> %LOG4%
copy /Y natively_debug.log %RUNS%\smoke-hedge-refuse.natively_debug.log >nul
git rev-parse HEAD >> %LOG4% 2>&1
if not errorlevel 1 for /f %%i in ('git --no-optional-locks status --porcelain -uno ^| find /c /v ""') do echo dirty-lines=%%i>>%LOG4%
for %%F in (dist-electron\electron\main.js) do %NODE% -e "console.log('dist-electron main.js mtime=' + require('fs').statSync(process.argv[1]).mtime.toISOString())" %%F>>%LOG4%

rem M5: exit with the WORST (highest) of the four segment codes, not always 0 - the stall
rem launcher this was modelled on returns its last smoke's code; four segments need a max.
set WORST=0
if %SMOKE1% gtr %WORST% set WORST=%SMOKE1%
if %SMOKE2% gtr %WORST% set WORST=%SMOKE2%
if %SMOKE3% gtr %WORST% set WORST=%SMOKE3%
if %SMOKE4% gtr %WORST% set WORST=%SMOKE4%
exit /b %WORST%
