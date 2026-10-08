@echo off
rem Throwaway launcher for the answers-not-visible reproduction (second attempt): dev app with a
rem CDP debugging port and the built-in detector chain test (synthetic interviewer questions, no audio).
rem Runs from a scheduled task so the app sees the real AppData. Deleted after use.
cd /d "C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant"
set NATIVELY_AUTOSTART_MEETING=1
set NATIVELY_LIVE_MODE=auto
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_DETECTOR_CHAIN_TEST=1
set NODE_ENV=development
start "natively-vite" /min cmd /c "npx vite --port 5180 --strictPort > "C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\repro-vite.log" 2>&1"
call npx wait-on http://localhost:5180 -t 90000
call npx electron . --remote-debugging-port=9222 > "C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\repro-electron.log" 2>&1
