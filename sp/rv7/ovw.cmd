@echo off
rem Throwaway (task-7 review): does a start /B background writer that inherited a >> handle
rem overwrite lines a later foreground >> appends to the same file? No app, no network.
set F=%~dp0l.txt
echo HEADER> "%F%"
start "bg" /B "C:\Program Files\nodejs\node.exe" -e "console.log('BG-1 first line from background');setTimeout(()=>console.log('BG-2 LATE LINE FROM BACKGROUND XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'),4000)" >> "%F%" 2>&1
set BGERR=%ERRORLEVEL%
ping -n 2 127.0.0.1 >nul
"C:\Program Files\nodejs\node.exe" -e "console.log('FG-1 foreground line from app:stop stand-in')" >> "%F%" 2>&1
echo FG-2 SMOKE4 EXIT %BGERR% >> "%F%"
ping -n 7 127.0.0.1 >nul
echo ---- final file:
type "%F%"
