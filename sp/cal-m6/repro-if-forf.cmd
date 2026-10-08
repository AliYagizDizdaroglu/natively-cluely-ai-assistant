@echo off
cd /d %1
set LOG=%2
echo REPRO > %LOG%
echo bare for/f, no if: >> %LOG%
for /f %%i in ('git --no-optional-locks status --porcelain --untracked-files=no ^| find /c /v ""') do echo bare-result=%%i>>%LOG%
echo. >> %LOG%
echo errorlevel-gated for/f: >> %LOG%
ver>nul
if not errorlevel 1 for /f %%i in ('git --no-optional-locks status --porcelain --untracked-files=no ^| find /c /v ""') do echo gated-result=%%i>>%LOG%
echo DONE >> %LOG%
