@echo off
rem scenario50 S1+S2 flight s50k (task Natively-flight-s50k, 2026-09-20 10:10 local, after the
rem 07:00 UTC Gemini reset). Same live config as s50i/s50j: the launcher sets NO thinking level,
rem so the shipped default (LOW) flies on the primary. Three things are new since s50j:
rem   - the stall fallback now thinks: 3.5-flash-lite gets HIGH, not the LOW it ignores (78b0671)
rem   - Deepgram carries the seven measured keyterms on English sockets (3624367)
rem   - the 3.5 HIGH offline twin runs THREE times, so the model decision is band vs band
rem   - the gate has a length row (words p90, over 85, over 150)
rem Same launcher shape as the others: -WorkingDirectory is set by the task, ASCII only, and it
rem never cd's into the accented repo path itself.
if not exist "electron\test\golden\interview60.flight.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-s50k-launcher-error.log"
  exit /b 9
)
if not exist "electron\test\golden\scenario50.wav" (
  echo scenario50.wav missing - build audio first >> "%TEMP%\natively-s50k-launcher-error.log"
  exit /b 8
)
rem Guard: this checkout AND its build must carry the shipped LOW default.
findstr /C:"DEFAULT_GEMINI_THINKING_LEVEL" "electron\llm\geminiThinking.ts" >nul 2>&1
if errorlevel 1 (
  echo shipped LOW default missing from this checkout - fast-forward main first >> "%TEMP%\natively-s50k-launcher-error.log"
  exit /b 7
)
findstr /C:"DEFAULT_GEMINI_THINKING_LEVEL" "dist-electron\electron\llm\geminiThinking.js" >nul 2>&1
if errorlevel 1 (
  echo dist-electron not rebuilt with the shipped LOW default - run npm run build:electron >> "%TEMP%\natively-s50k-launcher-error.log"
  exit /b 6
)
rem Guard: the sentence-boundary word guard must be in the BUILD.
findstr /C:"floor: 120" "dist-electron\electron\llm\verbalStreamFilter.js" >nul 2>&1
if errorlevel 1 (
  echo dist-electron does not carry the sentence-boundary word guard >> "%TEMP%\natively-s50k-launcher-error.log"
  exit /b 5
)
rem Guard: the per-model thinking level (the fallback fix) must be in the BUILD, or the hour
rem re-measures the unthought-fallback defect it is meant to prove fixed.
findstr /C:"thinkingLevelForModel" "dist-electron\electron\LLMHelper.js" >nul 2>&1
if errorlevel 1 (
  echo dist-electron does not carry the per-model thinking level 78b0671 >> "%TEMP%\natively-s50k-launcher-error.log"
  exit /b 4
)
rem Guard: the keyterm list must be in the BUILD and wired into the Deepgram socket.
if not exist "dist-electron\electron\audio\deepgramKeyterms.js" (
  echo dist-electron does not carry deepgramKeyterms.js 3624367 >> "%TEMP%\natively-s50k-launcher-error.log"
  exit /b 3
)
findstr /C:"keyterm" "dist-electron\electron\audio\DeepgramStreamingSTT.js" >nul 2>&1
if errorlevel 1 (
  echo dist-electron DeepgramStreamingSTT is not wired for keyterm >> "%TEMP%\natively-s50k-launcher-error.log"
  exit /b 3
)
rem Guard: both three-rep twins and the length row must be in the harness (run from source).
findstr /C:"captured-high-r3" "electron\test\golden\interview60.flight.mjs" >nul 2>&1
if errorlevel 1 (
  echo three-rep 3.5 HIGH twin missing from this checkout >> "%TEMP%\natively-s50k-launcher-error.log"
  exit /b 2
)
findstr /C:"key: 'length'" "electron\test\golden\interview60.metrics.mjs" >nul 2>&1
if errorlevel 1 (
  echo length gate row missing from this checkout >> "%TEMP%\natively-s50k-launcher-error.log"
  exit /b 2
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
set NATIVELY_GEMINI_THINKING_LEVEL=
echo GUARDS_ALL_PASSED
exit /b 0
