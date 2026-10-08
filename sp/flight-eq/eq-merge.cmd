@echo off
rem Merge the flight eq Opus verdicts into MAIN's run dir. Run with cwd = MAIN, AFTER the flight task and the grading ended.
rem   eq-merge.cmd grader-model-id run-dir     the exact grader model id read from the grading transcripts, then the run dir relative to MAIN
rem Derived from h40d-merge.cmd with the arms of PREREGISTER-flight-eq section 2 and A2.7: fourteen rows (the in-app arm, thirteen others). captured-minimal is not graded this hour and is not merged.
rem Verdicts are read from the folder THIS FILE LIVES IN, files eq-verdicts-TAG.json (no non-ASCII byte in this file). The in-app verdicts file is required.
rem Every other arm is optional: a missing verdicts file prints SKIPPED-MISSING with its tag and merges nothing, never another file.
rem Every merge passes --model: judge.mjs refuses a merge without the exact id. Every merged arm prints MERGED tag.
rem GOTCHA: the bare 3.1 default arm reads the PLAIN interview60.answers.json. The G blind files are not merged here: eq-twins.mjs reads them.
rem NOTE: no parentheses in any echo inside an if-block. See the s50k launcher defect.
setlocal
if "%~2"=="" echo USAGE: eq-merge.cmd grader-model-id run-dir
if "%~2"=="" exit /b 12
set M=%~1
set R=%~2
set "S=%~dp0"
set N="C:\Program Files\nodejs\node.exe"
set J=electron\test\golden\interview60.judge.mjs

if not exist "%R%\interview60.flight.done.json" echo WRONG CWD OR RUN DIR: run this from MAIN with the eq run dir
if not exist "%R%\interview60.flight.done.json" exit /b 13
rem An absolute run dir passed from the wrong folder passes the check above and would receive a verdicts file before the judge script failed to start.
if not exist "%J%" echo WRONG CWD: the judge script is not here, run this from MAIN
if not exist "%J%" exit /b 13

if not exist "%S%eq-verdicts-inapp.json" echo MISSING eq-verdicts-inapp.json
if not exist "%S%eq-verdicts-inapp.json" exit /b 10
copy /y "%S%eq-verdicts-inapp.json" "%R%\interview60.judge.verdicts.json" >nul
if errorlevel 1 echo COPY-FAILED inapp
if errorlevel 1 exit /b 1
%N% %J% "%R%" --verdicts "%R%\interview60.judge.verdicts.json" --model %M%
if errorlevel 1 exit /b 1
echo MERGED inapp

call :arm captured-low               gemini-3.1-flash-lite_captured-low
call :arm captured-low-r2            gemini-3.1-flash-lite_captured-low-r2
call :arm captured-low-r3            gemini-3.1-flash-lite_captured-low-r3
call :arm low                        gemini-3.1-flash-lite_low
call :arm captured-high              gemini-3.5-flash-lite_captured-high
call :arm captured-high-r2           gemini-3.5-flash-lite_captured-high-r2
call :arm captured-high-r3           gemini-3.5-flash-lite_captured-high-r3
call :arm captured-no-cues-high      gemini-3.5-flash-lite_captured-no-cues-high
call :arm captured-no-cues-high-r2   gemini-3.5-flash-lite_captured-no-cues-high-r2
call :arm captured-no-cues-high-r3   gemini-3.5-flash-lite_captured-no-cues-high-r3
call :arm high                       gemini-3.5-flash-lite_high
call :arm bare35                     gemini-3.5-flash-lite

rem The bare 3.1 default arm: plain answers file, suffixed judge output. Optional like the others.
if not exist "%S%eq-verdicts-bare31.json" echo SKIPPED-MISSING bare31
if not exist "%S%eq-verdicts-bare31.json" goto done
copy /y "%S%eq-verdicts-bare31.json" "%R%\interview60.judge.verdicts.gemini-3.1-flash-lite.json" >nul
if errorlevel 1 goto bare31copyfail
%N% %J% "%R%" --answers "%R%\interview60.answers.json" --verdicts "%R%\interview60.judge.verdicts.gemini-3.1-flash-lite.json" --model %M%
if errorlevel 1 goto bare31mergefail
echo MERGED bare31
goto done
:bare31copyfail
echo COPY-FAILED bare31
set FAILS=1
goto done
:bare31mergefail
echo MERGE-FAILED bare31
set FAILS=1

:done
echo ALL MERGES RAN
if defined FAILS echo SOME MERGES FAILED: see COPY-FAILED and MERGE-FAILED above
if defined FAILS exit /b 1
exit /b 0

rem A SET resets ERRORLEVEL, so every failure branch is a goto label that tests the level first and only then sets FAILS.
:arm
if not exist "%S%eq-verdicts-%1.json" echo SKIPPED-MISSING %1
if not exist "%S%eq-verdicts-%1.json" exit /b 0
copy /y "%S%eq-verdicts-%1.json" "%R%\interview60.judge.verdicts.%2.json" >nul
if errorlevel 1 goto armcopyfail
%N% %J% "%R%" --answers "%R%\interview60.answers.%2.json" --verdicts "%R%\interview60.judge.verdicts.%2.json" --model %M%
if errorlevel 1 goto armmergefail
echo MERGED %1
exit /b 0
:armcopyfail
echo COPY-FAILED %1
set FAILS=1
exit /b 0
:armmergefail
echo MERGE-FAILED %1
set FAILS=1
exit /b 0
