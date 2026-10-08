@echo off
rem Throwaway: the three bench arms, 3 reps each, sequentially (one Gemini stream at a time
rem keeps clear of the free tier's per-minute limit). Each arm resumes from disk.
cd /d "%~dp0"
set NODE="C:\Program Files\nodejs\node.exe"
%NODE% bench-replay.mjs --arm control --reps 3
if errorlevel 3 goto quota
%NODE% bench-replay.mjs --arm coverage --reps 3
if errorlevel 3 goto quota
%NODE% bench-replay.mjs --arm scaffold --reps 3
if errorlevel 3 goto quota
echo BENCH ALL DONE
exit /b 0
:quota
echo BENCH QUOTA STOP
exit /b 3
