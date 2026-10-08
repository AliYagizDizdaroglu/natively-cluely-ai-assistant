@echo off
rem Throwaway (task-7 re-review): the launcher's build-identity lines, run where git FAILS
rem (this folder is not a repository), to see what they record. No app, no network.
pushd "%~dp0"
set L=o.txt
echo --- identity lines outside a repo > %L%
git rev-parse HEAD >> %L% 2>&1
for /f %%i in ('git status --porcelain ^| find /c /v ""') do echo dirty-lines=%%i>>%L%
for %%F in (dist-electron\electron\main.js) do echo dist-electron main.js mtime=%%~tF>>%L%
for %%F in (stubexit1.mjs) do echo existing-file mtime=%%~tF>>%L%
type %L%
popd
