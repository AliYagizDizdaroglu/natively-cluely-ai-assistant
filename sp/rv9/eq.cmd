@echo off
rem Throwaway (task-7 re-review 2): what a for /f command substitution does to an argument
rem containing "=" (the reason the launcher uses git's -uno, not --untracked-files=no).
rem Prints the argv node receives. No git, no app, no network.
for /f "delims=" %%i in ('node "%~dp0argv.mjs" --untracked-files=no -uno ^| find /v ""') do echo inside for /f: %%i
node "%~dp0argv.mjs" --untracked-files=no -uno
