@echo off
rem Re-runs the answer arm after the structure rule was moved back to the position the
rem 13/20 measurement used. Same model, same 20 questions, same filters — one prompt
rem variable changed, which is the whole point of an arm.
rem
rem The arm loads the prompt from dist-electron, so the checkout must be built first
rem (the caller does that). ASCII-only, never cd's into the accented repo path.
if not exist "electron\test\golden\interview60.answers.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-arm2-launcher-error.log"
  exit /b 9
)
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.answers.mjs --model gemini-3.1-flash-lite > electron\test\golden\interview60.runs\arm2.log 2>&1
echo ARM EXIT %ERRORLEVEL% >> electron\test\golden\interview60.runs\arm2.log
