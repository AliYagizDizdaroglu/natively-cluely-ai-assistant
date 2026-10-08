@echo off
rem Thinking-level bench arms (task Natively-bench-thinking, 2026-09-17 10:05 local, after the
rem 07:00 UTC Gemini reset). Five arms of bench-replay.mjs on gemini-3.1-flash-lite, the s50e
rem captured prompts, 3 reps each, one stream at a time; every arm resumes from disk per id.
rem   think-low   app bytes + thinkingLevel LOW    (39 ids, ~70 calls left)
rem   think-high  app bytes + thinkingLevel HIGH   (39 ids, 117 calls)
rem   bare        bare verbal prompt, default      (19 mains, 57 calls)
rem   bare-low    bare verbal prompt + LOW         (19 mains, 57 calls)
rem   bare-high   bare verbal prompt + HIGH        (19 mains, 57 calls)
rem ~360 of the day's 500 lite calls. A 429 stops the sequence (exit 3); rerun resumes.
rem The app must not be up (it warms three models once a minute against the same quota):
rem stop it first through the harness's own app:stop, which checks the pid's command line.
if not exist "electron\test\golden\interview60.run.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-bench-thinking-error.log"
  exit /b 9
)
set NODE="C:\Program Files\nodejs\node.exe"
set LOG=%~dp0bench-thinking.log
echo ==== %DATE% %TIME% bench-thinking start >> "%LOG%"
%NODE% electron\test\golden\interview60.run.mjs app:stop >> "%LOG%" 2>&1
cd /d "%~dp0"
%NODE% bench-replay.mjs --arm think-low --reps 3 >> "%LOG%" 2>&1
if errorlevel 3 goto quota
%NODE% bench-replay.mjs --arm think-high --reps 3 >> "%LOG%" 2>&1
if errorlevel 3 goto quota
%NODE% bench-replay.mjs --arm bare --reps 3 >> "%LOG%" 2>&1
if errorlevel 3 goto quota
%NODE% bench-replay.mjs --arm bare-low --reps 3 >> "%LOG%" 2>&1
if errorlevel 3 goto quota
%NODE% bench-replay.mjs --arm bare-high --reps 3 >> "%LOG%" 2>&1
if errorlevel 3 goto quota
rem Last on purpose: a different model (gemma-4-26b-a4b-it at the app's MINIMAL settings, app
rem bytes, 39 ids, 117 calls on Gemma's own quota); a Gemma 429 must not block the lite arms.
%NODE% bench-replay.mjs --arm gemma26-min --reps 3 >> "%LOG%" 2>&1
if errorlevel 3 goto quota
%NODE% bench-replay.mjs --arm gemma26-min-bare --reps 3 >> "%LOG%" 2>&1
if errorlevel 3 goto quota
echo BENCH THINKING ALL DONE >> "%LOG%"
exit /b 0
:quota
echo BENCH THINKING QUOTA STOP >> "%LOG%"
exit /b 3
