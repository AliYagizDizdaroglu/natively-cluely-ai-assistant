@echo off
rem Calibration only: the PRE-fix lines (unconditional dirty-lines, minute-resolution mtime),
rem run against the same two dirs, to show what NEW-M6 actually changed rather than assert it.
cd /d %1
set LOG=%2
echo OLD PRE-M6 TEST > %LOG%
git rev-parse HEAD >> %LOG% 2>&1
for /f %%i in ('git status --porcelain ^| find /c /v ""') do echo dirty-lines=%%i>>%LOG%
for %%F in (dist-electron\electron\main.js) do echo dist-electron main.js mtime=%%~tF>>%LOG%
echo DONE>>%LOG%
