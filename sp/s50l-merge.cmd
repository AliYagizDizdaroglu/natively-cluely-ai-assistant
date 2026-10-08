@echo off
rem Merge the s50l Opus verdicts into MAIN's run dir. In-app first, then each --answers arm.
rem Same shape as s50k-merge.cmd with the run dir repointed.
rem GOTCHA 1: the bare 3.1 default arm reads the PLAIN interview60.answers.json - the
rem suffixed name does not exist and passing it makes the merge fail silently.
rem GOTCHA 2: in s50k the :arm routine silently skipped flash38. Every :arm now checks the
rem verdicts file exists first and the caller counts judge files afterwards.
rem NOTE: no parentheses in any echo inside an if-block. See the s50k launcher defect.
setlocal
set R=electron\test\golden\interview60.runs\2026-09-21T08-22-34-s50l
set S=C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp
set N="C:\Program Files\nodejs\node.exe"
set J=electron\test\golden\interview60.judge.mjs

if not exist "%S%\s50l-verdicts-inapp.json" echo MISSING s50l-verdicts-inapp.json
if not exist "%S%\s50l-verdicts-inapp.json" exit /b 10
copy /y "%S%\s50l-verdicts-inapp.json" "%R%\interview60.judge.verdicts.json" >nul
%N% %J% %R% --verdicts %R%\interview60.judge.verdicts.json
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
call :arm flash38                 gemini-3.8-flash
call :arm flash37                 gemini-3.7-flash
call :arm flash36                 gemini-3.6-flash
call :arm flash35                 gemini-3.5-flash

rem The bare 3.1 default arm: plain answers file, suffixed judge output.
if not exist "%S%\s50l-verdicts-bare31.json" echo MISSING s50l-verdicts-bare31.json
if not exist "%S%\s50l-verdicts-bare31.json" exit /b 11
copy /y "%S%\s50l-verdicts-bare31.json" "%R%\interview60.judge.verdicts.gemini-3.1-flash-lite.json" >nul
%N% %J% %R% --answers %R%\interview60.answers.json --verdicts %R%\interview60.judge.verdicts.gemini-3.1-flash-lite.json
if errorlevel 1 exit /b 2

echo ALL MERGES OK
exit /b 0

:arm
if not exist "%S%\s50l-verdicts-%1.json" echo SKIPPED-MISSING %1
if not exist "%S%\s50l-verdicts-%1.json" exit /b 0
copy /y "%S%\s50l-verdicts-%1.json" "%R%\interview60.judge.verdicts.%2.json" >nul
%N% %J% %R% --answers %R%\interview60.answers.%2.json --verdicts %R%\interview60.judge.verdicts.%2.json
if errorlevel 1 echo MERGE-FAILED %1
exit /b 0
