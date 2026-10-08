@echo off
cd /d C:\Users\sotka\cal-m6\repo
echo variant1 old-plain:
for /f %%i in ('git status --porcelain ^| find /c /v ""') do echo v1=%%i
echo variant2 untracked-no-only:
for /f %%i in ('git status --porcelain --untracked-files=no ^| find /c /v ""') do echo v2=%%i
echo variant3 no-optional-locks-only:
for /f %%i in ('git --no-optional-locks status --porcelain ^| find /c /v ""') do echo v3=%%i
echo variant4 both-new-flags:
for /f %%i in ('git --no-optional-locks status --porcelain --untracked-files=no ^| find /c /v ""') do echo v4=%%i
echo direct-no-forf-both-flags:
git --no-optional-locks status --porcelain --untracked-files=no
echo REPRO3 DONE
