@echo off
cd /d C:\Users\sotka\cal-m6\repo
echo variant5 -uno short flag:
for /f %%i in ('git --no-optional-locks status --porcelain -uno ^| find /c /v ""') do echo v5=%%i
echo variant6 quoted equals form:
for /f %%i in ('git --no-optional-locks status --porcelain "--untracked-files=no" ^| find /c /v ""') do echo v6=%%i
echo REPRO4 DONE
