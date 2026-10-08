@echo off
rem Merge the s50j Opus verdicts into MAIN's run dir. In-app first, then each --answers arm.
setlocal
set R=electron\test\golden\interview60.runs\2026-09-19T08-22-41-s50j
set S=C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp
set N="C:\Program Files\nodejs\node.exe"
set J=electron\test\golden\interview60.judge.mjs

copy /y "%S%\s50j-verdicts-inapp.json"            "%R%\interview60.judge.verdicts.json" >nul
%N% %J% %R% --verdicts %R%\interview60.judge.verdicts.json || exit /b 1

call :arm captured-low            gemini-3.1-flash-lite_captured-low
call :arm captured-low-r2         gemini-3.1-flash-lite_captured-low-r2
call :arm captured-low-r3         gemini-3.1-flash-lite_captured-low-r3
call :arm captured-minimal        gemini-3.1-flash-lite_captured-minimal
call :arm low                     gemini-3.1-flash-lite_low
call :arm captured-high           gemini-3.5-flash-lite_captured-high
call :arm high                    gemini-3.5-flash-lite_high
call :arm bare31                  gemini-3.1-flash-lite
call :arm bare35                  gemini-3.5-flash-lite
call :arm qwen                    qwen_qwen3.8-27b
call :arm gptoss                  openai_gpt-oss-120b
call :arm flash38                 gemini-3.8-flash
call :arm flash37                 gemini-3.7-flash
call :arm flash36                 gemini-3.6-flash
call :arm flash35                 gemini-3.5-flash
echo ALL MERGES OK
exit /b 0

:arm
copy /y "%S%\s50j-verdicts-%1.json" "%R%\interview60.judge.verdicts.%2.json" >nul
%N% %J% %R% --answers %R%\interview60.answers.%2.json --verdicts %R%\interview60.judge.verdicts.%2.json
exit /b 0
