@echo off
rem Cue-mode smoke, plan Task 9 step 1 (task Natively-smoke-cues). Runs the WHOLE-TURN WORKTREE build
rem hands-free on scenario50 S1 through the flight harness, then checks that every verbal answer logged
rem one non-empty cues line. Shape of launch-smoke-hedge.cmd: the task sets -WorkingDirectory to the
rem worktree, this file never cd's, ASCII only, no parentheses inside echoed text. The worktree has no
rem .env: run-with-main-env.mjs hands MAIN's .env to node through --env-file, nothing is copied.
rem A health gate first: Google was returning 503 all evening on 2026-09-28, so the smoke waits for
rem BOTH lites to answer, retrying every 15 min until the deadline below, and gives up after that.
rem The deadline is a clock time: one already past today rolls over to TOMORROW, so it must sit after the
rem task's start. 2026-10-01: 09:00 for the 05:00 re-smoke. The task is killed at 10:00, so a gate that opened
rem later would start an hour it cannot finish, and a killed task does not stop the app.
if not exist "electron\test\golden\interview60.run.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-smoke-cues-launcher-error.log"
  exit /b 9
)
findstr /C:"extractCues" "electron\llm\verbalStreamFilter.ts" >nul 2>&1
if errorlevel 1 (
  echo cue mode source not in this checkout >> "%TEMP%\natively-smoke-cues-launcher-error.log"
  exit /b 7
)
findstr /C:"__CUES__" "dist-electron\electron\llm\verbalStreamFilter.js" >nul 2>&1
if errorlevel 1 (
  echo dist-electron does not carry cue mode - rebuild the worktree >> "%TEMP%\natively-smoke-cues-launcher-error.log"
  exit /b 7
)
rem v2 small cues: the display cap must be in the build, or a v1 dist would be checked at 3 by 5 and fail for the wrong reason
findstr /C:"function trimCues" "dist-electron\electron\llm\verbalStreamFilter.js" >nul 2>&1
if errorlevel 1 (
  echo dist-electron carries cue mode v1 without the trimCues cap - rebuild the worktree >> "%TEMP%\natively-smoke-cues-launcher-error.log"
  exit /b 7
)
rem combined build 2026-10-01: the early close and the offers fix must both be in the dist
findstr /C:"CUE_LINE_PREFIX" "dist-electron\electron\llm\verbalStreamFilter.js" >nul 2>&1
if errorlevel 1 (
  echo dist-electron lacks the early close - rebuild the worktree >> "%TEMP%\natively-smoke-cues-launcher-error.log"
  exit /b 7
)
findstr /C:"offers block before the spoken answer" "dist-electron\electron\llm\verbalStreamFilter.js" >nul 2>&1
if errorlevel 1 (
  echo dist-electron lacks the offers fix - rebuild the worktree >> "%TEMP%\natively-smoke-cues-launcher-error.log"
  exit /b 7
)
set NODE="C:\Program Files\nodejs\node.exe"
set RUNS=electron\test\golden\interview60.runs
if not exist "%RUNS%" mkdir "%RUNS%"
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1
rem every env var that changes a verbal answer's model or timing is cleared: this smoke is the shipped
rem default of this checkout: the verbal hedge, 3.5-lite HIGH first and 3.1-lite LOW after about 5 s, no follow-up parent
set NATIVELY_FOLLOWUP_PARENT=
set NATIVELY_VERBAL_PRIMARY_MODEL=
set NATIVELY_GEMINI_THINKING_LEVEL=
set NATIVELY_FIRST_TOKEN_TIMEOUT_MS=
set NATIVELY_VERBAL_HEDGE=
set NATIVELY_VERBAL_HEDGE_TRIGGER_MS=
set LOG=%RUNS%\smoke-cues.launcher.log
echo === CUE SMOKE === > %LOG%
%NODE% -e "console.log(new Date().toISOString())" >> %LOG%
git rev-parse HEAD >> %LOG% 2>&1
for %%F in (dist-electron\electron\main.js) do %NODE% -e "console.log('dist-electron main.js mtime=' + require('fs').statSync(process.argv[1]).mtime.toISOString())" %%F>>%LOG%
rem the dist proof, before the run: every marker of the combined build, the cue rule hash, each file write time
%NODE% "%~dp0dist-proof.mjs" --expect combined --prefix-count 3 --offers-marker "offers block before the spoken answer" >> %LOG% 2>&1
if errorlevel 1 (
  echo the dist is not the combined build - smoke not run >> %LOG%
  exit /b 7
)

rem Build the S1 stimulus on every run and refuse unless it matches the roster. The last step below
rem restores S1,S2 for later flights, so a stimulus built once by hand before arming survives only
rem one run: the 2026-09-29 re-arm would have stopped at the play step on exactly that.
rem Every interview60.run.mjs call goes through run-with-main-env.mjs: the harness resolves its key
rem at load, for every subcommand, and this checkout has no .env.
%NODE% electron\test\golden\interview60.build-audio-local.mjs >> %LOG% 2>&1
%NODE% "%~dp0run-with-main-env.mjs" electron\test\golden\interview60.run.mjs wav:check >> %LOG% 2>&1
if errorlevel 1 (
  echo the S1 stimulus check failed - smoke not run >> %LOG%
  exit /b 6
)

%NODE% "%~dp0wait-for-gemini.mjs" --models "gemini-3.1-flash-lite,gemini-3.5-flash-lite" --deadline 09:00 --every 15 >> %LOG% 2>&1
if errorlevel 1 (
  echo gemini never answered before the deadline - smoke not run >> %LOG%
  exit /b 5
)

%NODE% "%~dp0run-with-main-env.mjs" electron\test\golden\interview60.run.mjs auto cuesmoke >> %LOG% 2>&1
set RUNCODE=%ERRORLEVEL%
echo AUTO EXIT %RUNCODE% >> %LOG%
%NODE% "%~dp0run-with-main-env.mjs" electron\test\golden\interview60.run.mjs app:stop >> %LOG% 2>&1
rem the dist proof again, after the run: auto builds the dist itself when a source is newer, so THIS is the dist that flew
echo === DIST AFTER THE RUN === >> %LOG%
%NODE% "%~dp0dist-proof.mjs" --expect combined --prefix-count 3 --offers-marker "offers block before the spoken answer" >> %LOG% 2>&1

%NODE% "%~dp0check-smoke-cues.mjs" cuesmoke >> %LOG% 2>&1
set CHECK=%ERRORLEVEL%
echo CHECK EXIT %CHECK% >> %LOG%

rem restore the S1,S2 stimulus so a later scenario50 flight's wav:check passes on this checkout
set NATIVELY_SCENARIOS=S1,S2
%NODE% electron\test\golden\interview60.build-audio-local.mjs >> %LOG% 2>&1
echo DONE >> %LOG%
exit /b %CHECK%
