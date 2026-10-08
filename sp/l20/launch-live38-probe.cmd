@echo off
rem Scheduled 3.8 Live health probe (task Natively-probe-live38): the 5-question gate from
rem health-probe.mjs, one fresh session per question, appended to health\probe-schedule.log.
rem Gate for picking 3.8 Live back up: 5 of 5 answered with no 1011, on 3 different days.
rem ASCII only; the task sets -WorkingDirectory to this folder.
if not exist "health-probe.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-probe-live38-error.log"
  exit /b 9
)
if not exist "health" mkdir "health"
echo === PROBE %DATE% %TIME% === >> health\probe-schedule.log
"C:\Program Files\nodejs\node.exe" health-probe.mjs >> health\probe-schedule.log 2>&1
echo EXIT %ERRORLEVEL% >> health\probe-schedule.log
