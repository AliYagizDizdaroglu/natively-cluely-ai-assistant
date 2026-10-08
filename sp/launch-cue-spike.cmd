@echo off
rem Throwaway launcher for the screenshot-cue spike: show the PY4 problem page, start the dev app
rem with a CDP port and the chain test injecting ONE synthetic cue sentence, so the log shows whether
rem the app captures the screen and answers on the coding path. Runs from a scheduled task so the app
rem sees the real AppData. Deleted after use.
cd /d "C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant"
set SCR=C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp
set NATIVELY_AUTOSTART_MEETING=1
set NATIVELY_LIVE_MODE=auto
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_DETECTOR_CHAIN_TEST=1
set NATIVELY_DETECTOR_CHAIN_TEST_QUESTIONS=["Now take a look at this problem on screen and walk me through how you would solve it."]
set NODE_ENV=development
node electron\test\golden\interview60.cues.mjs show PY4 240000 > "%SCR%\cue-spike-display.log" 2>&1
start "natively-vite" /min cmd /c "npx vite --port 5180 --strictPort > "%SCR%\cue-spike-vite.log" 2>&1"
call npx wait-on http://localhost:5180 -t 90000
call npx electron . --remote-debugging-port=9222 > "%SCR%\cue-spike-electron.log" 2>&1
