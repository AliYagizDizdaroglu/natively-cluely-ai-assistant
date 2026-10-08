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
echo GUARDS_ALL_PASSED
