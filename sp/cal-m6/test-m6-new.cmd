@echo off
rem Calibration only: exact copy of launch-smoke-hedge.cmd's NEW-M6 lines, parameterised by a
rem working dir (%1) and a log path (%2), so both the git-succeeds and git-fails branches can
rem be exercised without touching the real repo.
cd /d %1
set NODE="C:\Program Files\nodejs\node.exe"
set LOG=%2
echo NEW-M6 TEST > %LOG%
git rev-parse HEAD >> %LOG% 2>&1
if not errorlevel 1 for /f %%i in ('git --no-optional-locks status --porcelain -uno ^| find /c /v ""') do echo dirty-lines=%%i>>%LOG%
for %%F in (dist-electron\electron\main.js) do %NODE% -e "console.log('dist-electron main.js mtime=' + require('fs').statSync(process.argv[1]).mtime.toISOString())" %%F>>%LOG%
echo DONE>>%LOG%
