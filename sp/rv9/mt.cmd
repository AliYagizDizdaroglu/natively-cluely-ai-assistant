@echo off
rem Throwaway (task-7 re-review 2): the launcher's exact ISO-mtime line, file present then absent.
pushd "%~dp0"
set NODE="C:\Program Files\nodejs\node.exe"
set L=mt-out.txt
echo --- present > %L%
if not exist dist-electron\electron mkdir dist-electron\electron
echo x> dist-electron\electron\main.js
for %%F in (dist-electron\electron\main.js) do %NODE% -e "console.log('dist-electron main.js mtime=' + require('fs').statSync(process.argv[1]).mtime.toISOString())" %%F>>%L%
echo --- absent >> %L%
del dist-electron\electron\main.js
for %%F in (dist-electron\electron\main.js) do %NODE% -e "console.log('dist-electron main.js mtime=' + require('fs').statSync(process.argv[1]).mtime.toISOString())" %%F>>%L% 2>nul
echo --- end >> %L%
type %L%
popd
