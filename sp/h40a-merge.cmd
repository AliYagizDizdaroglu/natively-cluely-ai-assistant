@echo off
rem Merge the h40a Opus verdicts into MAIN's run dir. Run with cwd = MAIN.
rem   h40a-merge.cmd <exact grader model id, read from the grading agents' transcripts>
rem Same shape as s50m-merge.cmd, repointed; the focused arms are gone - holdout40 has no focused
rem five yet - and every merge passes --model: judge.mjs refuses a merge without the exact id.
rem GOTCHA 1: the bare 3.1 default arm reads the PLAIN interview60.answers.json.
rem GOTCHA 2: every :arm checks its verdicts file exists first; the caller counts judge files after.
rem NOTE: no parentheses in any echo inside an if-block. See the s50k launcher defect.
setlocal
if "%~1"=="" echo USAGE: h40a-merge.cmd grader-model-id
if "%~1"=="" exit /b 12
set M=%~1
set R=electron\test\golden\interview60.runs\2026-09-24T08-20-12-h40a
set S=C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp
set N="C:\Program Files\nodejs\node.exe"
set J=electron\test\golden\interview60.judge.mjs

if not exist "%R%\interview60.flight.done.json" echo WRONG CWD: run this from MAIN
if not exist "%R%\interview60.flight.done.json" exit /b 13

if not exist "%S%\h40a-verdicts-inapp.json" echo MISSING h40a-verdicts-inapp.json
if not exist "%S%\h40a-verdicts-inapp.json" exit /b 10
copy /y "%S%\h40a-verdicts-inapp.json" "%R%\interview60.judge.verdicts.json" >nul
%N% %J% %R% --verdicts %R%\interview60.judge.verdicts.json --model %M%
if errorlevel 1 exit /b 1

call :arm captured-low            gemini-3.1-flash-lite_captured-low
call :arm captured-low-r2         gemini-3.1-flash-lite_captured-low-r2
call :arm captured-low-r3         gemini-3.1-flash-lite_captured-low-r3
call :arm captured-minimal        gemini-3.1-flash-lite_captured-minimal
call :arm low                     gemini-3.1-flash-lite_low
call :arm captured-high           gemini-3.5-flash-lite_captured-high
call :arm captured-high-r2        gemini-3.5-flash-lite_captured-high-r2
call :arm captured-high-r3        gemini-3.5-flash-lite_captured-high-r3
call :arm high                    gemini-3.5-flash-lite_high
call :arm bare35                  gemini-3.5-flash-lite
call :arm qwen                    qwen_qwen3.8-27b
call :arm gptoss                  openai_gpt-oss-120b

rem The bare 3.1 default arm: plain answers file, suffixed judge output.
if not exist "%S%\h40a-verdicts-bare31.json" echo MISSING h40a-verdicts-bare31.json
if not exist "%S%\h40a-verdicts-bare31.json" exit /b 11
copy /y "%S%\h40a-verdicts-bare31.json" "%R%\interview60.judge.verdicts.gemini-3.1-flash-lite.json" >nul
%N% %J% %R% --answers %R%\interview60.answers.json --verdicts %R%\interview60.judge.verdicts.gemini-3.1-flash-lite.json --model %M%
if errorlevel 1 exit /b 2

echo ALL MERGES OK
exit /b 0

:arm
if not exist "%S%\h40a-verdicts-%1.json" echo SKIPPED-MISSING %1
if not exist "%S%\h40a-verdicts-%1.json" exit /b 0
copy /y "%S%\h40a-verdicts-%1.json" "%R%\interview60.judge.verdicts.%2.json" >nul
%N% %J% %R% --answers %R%\interview60.answers.%2.json --verdicts %R%\interview60.judge.verdicts.%2.json --model %M%
if errorlevel 1 echo MERGE-FAILED %1
exit /b 0
