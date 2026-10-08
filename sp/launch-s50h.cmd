@echo off
rem scenario50 S1+S2 flight with gemini-3.1-flash-lite at thinking level MEDIUM (task
rem Natively-flight-s50h). Identical hour to s50g, one variable: MEDIUM instead of LOW.
rem Each answer's "usage: thinking=MEDIUM thoughts=N" line in natively_debug.log proves
rem whether the model honoured the level (the 2026-09-15 probe saw no thought tokens once).
if not exist "electron\test\golden\interview60.flight.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-s50h-launcher-error.log"
  exit /b 9
)
if not exist "electron\test\golden\scenario50.wav" (
  echo scenario50.wav missing - build audio first >> "%TEMP%\natively-s50h-launcher-error.log"
  exit /b 8
)
findstr /C:"geminiThinkingLevelFromEnv" "electron\LLMHelper.ts" >nul 2>&1
if errorlevel 1 (
  echo thinking-level change missing from this checkout - fast-forward main first >> "%TEMP%\natively-s50h-launcher-error.log"
  exit /b 7
)
findstr /C:"SPOKEN_WORD_GUARD" "electron\llm\verbalStreamFilter.ts" >nul 2>&1
if errorlevel 1 (
  echo word-guard change missing from this checkout >> "%TEMP%\natively-s50h-launcher-error.log"
  exit /b 6
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
set NATIVELY_GEMINI_THINKING_LEVEL=MEDIUM
"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.flight.mjs s50h >> electron\test\golden\interview60.runs\flight-s50h.launcher.log 2>&1
