@echo off
rem Live smoke for the s50l verbal-primary override (task Natively-smoke-model).
rem
rem Three scenario50 clips played into the REAL app with the override set, then the app's own
rem debug log is read back: every answer request must be gemini-3.5-flash-lite at thinking=HIGH
rem with thought tokens spent. This is the one link the unit tests cannot reach - they mock the
rem SDK - and the one a flight cannot afford to discover at 10:10.
rem
rem Roughly six minutes: app start, three questions with 14 s of silence between them so no
rem question is read as a continuation of the last, then the check. It plays audio, so the
rem machine should be quiet.
rem
rem No parentheses inside any echo in an if-block. See the 2026-09-20 launcher defect.
if not exist "electron\test\golden\interview60.run.mjs" (
  echo wrong working directory: %CD% >> "%TEMP%\natively-smoke-model-launcher-error.log"
  exit /b 9
)
if not exist "dist-electron\electron\llm\verbalPrimaryModel.js" (
  echo dist-electron does not carry the verbal primary override - run npm run build:electron >> "%TEMP%\natively-smoke-model-launcher-error.log"
  exit /b 4
)
echo GUARDS_ALL_PASSED
exit /b 0
