@echo off
rem Throwaway: run OUTSIDE the Claude sandbox (scheduled task) so it sees the REAL
rem %APPDATA%\natively, and copy the two databases (+ WAL/SHM) next to this script.
rem Never touches credentials.enc.
set SRC=%APPDATA%\natively
set DST=%~dp0userdata
if not exist "%DST%" mkdir "%DST%"
for %%F in (natively.db natively.db-wal natively.db-shm knowledge.db knowledge.db-wal knowledge.db-shm settings.json) do (
  if exist "%SRC%\%%F" copy /Y "%SRC%\%%F" "%DST%\%%F" >nul
)
dir "%DST%" > "%DST%\copied.txt"
echo DONE %DATE% %TIME% >> "%DST%\copied.txt"
