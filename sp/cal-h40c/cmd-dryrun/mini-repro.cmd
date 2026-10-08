@echo off
set NODE="C:\Program Files\nodejs\node.exe"
echo before
%NODE% -e "console.log(1)" >> mini-out.log
echo after
