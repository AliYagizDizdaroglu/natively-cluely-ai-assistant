@echo off
set NODE="C:\Program Files\nodejs\node.exe"
echo step1
start "hedge-refuse" /B %NODE% "electron\test\golden\interview60.run.mjs" app:start >> mini3-out.log 2>&1
echo step2 exit=%ERRORLEVEL%
ping -n 3 127.0.0.1 >nul
echo step3
%NODE% "electron\test\golden\interview60.run.mjs" app:stop >> mini3-out.log 2>&1
echo step4 exit=%ERRORLEVEL%
