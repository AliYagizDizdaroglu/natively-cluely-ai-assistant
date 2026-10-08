@echo off
rem after9 flight launcher (scheduled task Natively-flight-after9). The task is
rem registered with -WorkingDirectory set to the repo; this file stays ASCII-only
rem and never cd's to the repo path itself (the accented folder name breaks under
rem the OEM code page). Guard: refuse to run from the wrong directory.
if not exist "electron\test\golden\interview60.flight.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-after9-launcher-error.log"
  exit /b 9
)
set NATIVELY_STT_PROVIDER=deepgram
"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.flight.mjs after9 >> electron\test\golden\interview60.runs\flight-after9.launcher.log 2>&1
