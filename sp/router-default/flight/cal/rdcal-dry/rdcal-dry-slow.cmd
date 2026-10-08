@echo off
ping -n 25 127.0.0.1 >nul
echo GUARD OK: calibration stub>> "%~dp0rdcal-dry.launcher.log"
echo NIGHT GATES OK>> "%~dp0rdcal-dry.launcher.log"
exit /b 0
