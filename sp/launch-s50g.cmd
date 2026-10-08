@echo off
rem scenario50 S1+S2 flight with gemini-3.1-flash-lite at thinking level LOW (task
rem Natively-flight-s50g). Identical hour to s50e/s50f, one variable: the launcher sets
rem NATIVELY_GEMINI_THINKING_LEVEL, the app puts it on every verbal Gemini request, and each
rem answer's "usage: thinking=LOW thoughts=N" line in natively_debug.log proves compliance.
rem Same launcher shape as the others: -WorkingDirectory is set by the task, ASCII only, and it
rem never cd's into the accented repo path itself.
if not exist "electron\test\golden\interview60.flight.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-s50g-launcher-error.log"
  exit /b 9
)
if not exist "electron\test\golden\scenario50.wav" (
  echo scenario50.wav missing - build audio first >> "%TEMP%\natively-s50g-launcher-error.log"
  exit /b 8
)
rem Guard: this checkout must carry the thinking-level change, or the hour would silently
rem run at the default like every flight before it.
findstr /C:"geminiThinkingLevelFromEnv" "electron\LLMHelper.ts" >nul 2>&1
if errorlevel 1 (
  echo thinking-level change missing from this checkout - fast-forward main first >> "%TEMP%\natively-s50g-launcher-error.log"
  exit /b 7
)
findstr /C:"SPOKEN_WORD_GUARD" "electron\llm\verbalStreamFilter.ts" >nul 2>&1
if errorlevel 1 (
  echo word-guard change missing from this checkout >> "%TEMP%\natively-s50g-launcher-error.log"
  exit /b 6
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
set NATIVELY_GEMINI_THINKING_LEVEL=LOW
"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.flight.mjs s50g >> electron\test\golden\interview60.runs\flight-s50g.launcher.log 2>&1
