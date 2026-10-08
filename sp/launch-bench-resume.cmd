@echo off
rem Resumes the quality bench after the flight's arms are done (task Natively-bench-resume):
rem scaffold x3, coverage rep3, and the 503 holes in the control reps, ~165 Gemini calls on
rem 3.1-flash-lite. Everything resumes from disk per id.
rem The flight's auto step stops the app only at its START (stop -> build -> start -> hour ->
rem snapshot), so the hour's app is still up when this fires, warming three models once a
rem minute against the same daily quota. Stop it first, through the harness's own app:stop,
rem which checks the pid's command line before killing anything.
if not exist "electron\test\golden\interview60.run.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-bench-launcher-error.log"
  exit /b 9
)
"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.run.mjs app:stop >> "%~dp0bench-resume.log" 2>&1
call "%~dp0bench-run-all.cmd" >> "%~dp0bench-resume.log" 2>&1
