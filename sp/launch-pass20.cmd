@echo off
rem Graded in-app pass over the 20 scenario50 mains with the 200-word guard (task Natively-pass20).
rem Answers "did the word budget make the weak answers?" with a score, paired against s50c.
rem Same launcher shape as the others: -WorkingDirectory is set by the task, ASCII only.
if not exist "electron\test\golden\interview60.run.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-pass20-launcher-error.log"
  exit /b 9
)
findstr /C:"SPOKEN_WORD_GUARD" "electron\llm\verbalStreamFilter.ts" >nul 2>&1
if errorlevel 1 (
  echo word-guard change not in this checkout - merge first >> "%TEMP%\natively-pass20-launcher-error.log"
  exit /b 7
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
set LOG=electron\test\golden\interview60.runs\pass20.log
echo === IN-APP PASS, 20 MAINS, 200-WORD GUARD === > %LOG%
"C:\Program Files\nodejs\node.exe" "%~dp0pass20.mjs" >> %LOG% 2>&1
echo PASS20 EXIT %ERRORLEVEL% >> %LOG%
