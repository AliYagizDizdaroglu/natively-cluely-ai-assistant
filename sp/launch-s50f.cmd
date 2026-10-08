@echo off
rem scenario50 S1+S2 REPLICATION flight (scheduled task Natively-flight-s50f). Deliberately no
rem app change since s50e: the bench measured control-vs-control at +/-4 acceptable on 38
rem questions (2026-09-14), so this hour exists to measure flight-to-flight noise on IDENTICAL
rem software, to refresh the captured prompts the bench replays, and to run the hour end to
rem end with both ears alive. Grading afterwards is on instrument 8564ba96369a (length alone
rem is never delivery 0), from the worktree's judge.
rem Same launcher shape as the others: -WorkingDirectory is set by the task, ASCII only, and it
rem never cd's into the accented repo path itself.
if not exist "electron\test\golden\interview60.flight.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-s50f-launcher-error.log"
  exit /b 9
)
if not exist "electron\test\golden\scenario50.wav" (
  echo scenario50.wav missing - build audio first >> "%TEMP%\natively-s50f-launcher-error.log"
  exit /b 8
)
rem Guard: the shipped build must still carry the word guard the last three flights measured.
findstr /C:"SPOKEN_WORD_GUARD" "electron\llm\verbalStreamFilter.ts" >nul 2>&1
if errorlevel 1 (
  echo word-guard change missing from this checkout >> "%TEMP%\natively-s50f-launcher-error.log"
  exit /b 7
)
rem Guard: prompt capture must be on, or the hour refreshes nothing for the bench.
findstr /C:"NATIVELY_CAPTURE_PROMPTS" "electron\test\golden\interview60.run.mjs" >nul 2>&1
if errorlevel 1 (
  echo prompt capture missing from run.mjs in this checkout >> "%TEMP%\natively-s50f-launcher-error.log"
  exit /b 6
)
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
"C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.flight.mjs s50f >> electron\test\golden\interview60.runs\flight-s50f.launcher.log 2>&1
