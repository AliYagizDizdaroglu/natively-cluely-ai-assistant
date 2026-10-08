@echo off
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
set NATIVELY_GEMINI_THINKING_LEVEL=
set NATIVELY_VERBAL_PRIMARY_MODEL=
set NATIVELY_VERBAL_HEDGE=
set NATIVELY_VERBAL_HEDGE_TRIGGER_MS=
set NATIVELY_FOLLOWUP_PARENT=
set NATIVELY_EARLIER_QUESTION=1
set NATIVELY_FLIGHT_FOCUSED=off
set NATIVELY_EQ_T=@@T@@
set NATIVELY_FLIGHT_COMMIT=9db4f54cb12899354a4d576c69ebbbd1b7090399
set APPDATA=%~dp0..\..\guard-eq-cal-stubs\appdata\on
"C:\Program Files\nodejs\node.exe" "%~dp0..\..\guard-eq.mjs" --smoke-result "%~dp0..\..\guard-eq-cal-stubs\result-ok.md"
