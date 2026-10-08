@echo off
rem Throwaway (task-7 review): when the >> target is held by a start /B background process,
rem does cmd still RUN the foreground command (side effect = a marker file), or skip it?
set F=%~dp0l2.txt
set M=%~dp0marker.txt
if exist "%M%" del "%M%"
echo HEADER> "%F%"
start "bg" /B "C:\Program Files\nodejs\node.exe" -e "console.log('BG-1');setTimeout(()=>console.log('BG-2 late'),5000)" >> "%F%" 2>&1
ping -n 2 127.0.0.1 >nul
"C:\Program Files\nodejs\node.exe" -e "require('fs').writeFileSync(process.argv[1],'FOREGROUND RAN')" "%M%" >> "%F%" 2>&1
echo foreground errorlevel=%ERRORLEVEL%
if exist "%M%" (echo MARKER PRESENT - the foreground command ran) else (echo MARKER ABSENT - cmd skipped the foreground command)
ping -n 6 127.0.0.1 >nul
echo after the background exited:
"C:\Program Files\nodejs\node.exe" -e "console.log('FG-3 after bg exit')" >> "%F%" 2>&1
type "%F%"
