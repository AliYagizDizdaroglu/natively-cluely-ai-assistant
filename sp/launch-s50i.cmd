@echo off
rem scenario50 S1+S2 confirming flight for the SHIPPED thinking level (task Natively-flight-s50i,
rem 2026-09-18 10:10 local, after the 07:00 UTC Gemini reset). Identical hour to s50e/s50f/s50g,
rem and unlike s50g the launcher sets NO thinking level: the app's own default (LOW since the
rem 2026-09-17 bench, geminiThinking.ts DEFAULT_GEMINI_THINKING_LEVEL) is what flies, and each
rem answer's "usage: thinking=LOW thoughts=N" line in natively_debug.log proves it.
rem Same launcher shape as the others: -WorkingDirectory is set by the task, ASCII only, and it
rem never cd's into the accented repo path itself.
if not exist "electron\test\golden\interview60.flight.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-s50i-launcher-error.log"
  exit /b 9
)
if not exist "electron\test\golden\scenario50.wav" (
  echo scenario50.wav missing - build audio first >> "%TEMP%\natively-s50i-launcher-error.log"
  exit /b 8
)
rem Guard: this checkout AND its build must carry the shipped default, or the hour would
rem silently fly at MINIMAL like every flight through s50f.
findstr /C:"DEFAULT_GEMINI_THINKING_LEVEL" "electron\llm\geminiThinking.ts" >nul 2>&1
if errorlevel 1 (
  echo shipped LOW default missing from this checkout - fast-forward main first >> "%TEMP%\natively-s50i-launcher-error.log"
  exit /b 7
)
findstr /C:"DEFAULT_GEMINI_THINKING_LEVEL" "dist-electron\electron\llm\geminiThinking.js" >nul 2>&1
if errorlevel 1 (
  echo dist-electron not rebuilt with the shipped LOW default - run npm run build:electron >> "%TEMP%\natively-s50i-launcher-error.log"
  exit /b 6
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
set NATIVELY_GEMINI_THINKING_LEVEL=
"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.flight.mjs s50i >> electron\test\golden\interview60.runs\flight-s50i.launcher.log 2>&1
