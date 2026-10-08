@echo off
rem throwaway: the launcher's gate line as cmd parses it, with --once and a late deadline
set NODE="C:\Program Files\nodejs\node.exe"
%NODE% "%~dp0wait-for-gemini.mjs" --models "gemini-3.1-flash-lite,gemini-3.5-flash-lite" --deadline 23:59 --every 15 --once
echo GATE EXIT %ERRORLEVEL%
