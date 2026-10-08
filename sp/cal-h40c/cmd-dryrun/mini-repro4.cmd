@echo off
set NODE="C:\Program Files\nodejs\node.exe"
set RUNS=electron\test\golden\interview60.runs
set LOG1=%RUNS%\smoke-hedge-forced.log
echo RUNS=[%RUNS%]
echo LOG1=[%LOG1%]
echo === HEDGE SMOKE 1: forced race, trigger=1ms === > %LOG1%
echo after-echo1 exit=%ERRORLEVEL%
%NODE% -e "console.log(new Date().toISOString())" >> %LOG1%
echo after-node exit=%ERRORLEVEL%
