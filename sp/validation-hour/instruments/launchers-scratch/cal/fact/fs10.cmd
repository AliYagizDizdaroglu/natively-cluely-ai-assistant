@echo off
echo 0123456789| findstr /R /X "[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]" >nul 2>&1
if errorlevel 1 (echo REFUSED) else (echo ACCEPTED)
