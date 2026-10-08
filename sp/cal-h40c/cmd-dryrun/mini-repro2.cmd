@echo off
if not exist "electron\test\golden\interview60.run.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\mini-repro2-error.log"
  exit /b 9
)
echo guard1 ok
findstr /C:"streamGeminiWithHedge" "electron\LLMHelper.ts" >nul 2>&1
if errorlevel 1 (
  echo verbal-hedge change not in this checkout - fast-forward main first >> "%TEMP%\mini-repro2-error.log"
  exit /b 7
)
echo guard2 ok
