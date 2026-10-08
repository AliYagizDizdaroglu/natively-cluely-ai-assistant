@echo off
rem Throwaway launcher for the answers-not-visible reproduction. Runs from a scheduled task so the
rem app sees the real AppData (keys, profile), not the sandbox's shadow copy. Deleted after use.
cd /d "C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant"
set NATIVELY_STT_PROVIDER=deepgram
node electron\test\golden\interview60.run.mjs app:start > "C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\repro-app-start.log" 2>&1
