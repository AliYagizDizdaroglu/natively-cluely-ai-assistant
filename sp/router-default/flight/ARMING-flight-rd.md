# Arming record: router-default-r1 (A4(b) fields)

T: 2026-10-07 03:00

Registration seal (sha256 of electron/test/golden/passes/PREREGISTER-router-default.md at HEAD): 4a9acfdef836d63e4d7dbe9992ab5cf0713530deff6092616a9642cb31fe172b
Registered HEAD (MAIN, fix/coding-style-suffix-all-gemini): fade67f8a1d223a3faa59a2aea02e77c0f19e024 (code = 19937ab; registration commit adds passes/ only)

Fresh ledger read (02:27:13 TST):
LEDGER-SUMMARY reset=2026-10-06T07:00:00.000Z now=2026-10-06T23:27:13.565Z cap=500 used35=100 used31=10 extra=0 headroom35=400 headroom31=490 complete=yes oldest=2026-05-25T09:44:28.249Z

Hand check (A4 / Task 18 N3): the body's extra=0 equals the launcher's NATIVELY_RD_EXTRA_REQUESTS=0.
Quota-day app sessions in MAIN (ledger-fix5 review carry): the 21:55Z read was used35=0 used31=0 complete=yes; since then exactly two
app sessions, smoke 2 (22:04:28Z-22:25:43Z, in natively_debug.log.1 and its run copy) and smoke 3 (22:40:46Z-23:01:59Z, in
natively_debug.log and its run copy); no other MAIN app start before T.

Launchers (generated 02:25 with --commit fade67f, --t 2026-10-07 03:00, --deadline-min 35, --ctx-sha12 b2a43a2159a2, --extra-requests 0;
--check --armed PASS, no placeholder): launch-rd.cmd sha256/12 e85d89dcd169, launch-rd-dry.cmd sha256/12 ee29d06530ef.

Pre-arming dry twin (one-shot task Natively-rd-predry, deleted after): started 02:26:34, log written by 02:26:37, so G is about 3 s (well under
the 3-min allowance behind D = 35). It passed every check, the night gates and 10a included, and ended:
  GUARD FAILED: (g4-clock) now (2026-10-07 02:26) is outside [T - 6 min, T + 30 min] for NATIVELY_RD_T 2026-10-07 03:00: every other check passed, 10a included; only the start time is wrong
  === LAUNCHER rd-dry GUARD WINDOW ONLY exit 10 - only g4-clock failed - no error log written ===
No %TEMP%\natively-rd-launcher-error.log exists. Both ending lines read together (K1).

Task read-backs (register-rd.ps1):
  Natively-flight-rd-dry: Ready, StartWhenAvailable False, no trigger
  Natively-flight-rd-precheck: Ready, StartWhenAvailable False, next run 2026-10-07 02:54
  Natively-flight-rd: Ready, next run 2026-10-07 03:00 (NEXT RUNS flight=2026-10-07 03:00 precheck=2026-10-07 02:54)

A9 evidence: consent: the user, 2026-10-06, "approved, yes pc will be free, go ahead"; 2026-10-07 00:48, "keep going until flight
and grades", flight "as early as possible". Quiet machine: smoke 3 had 49 dispatches = 47 items + 2 probe (no stray audio, 01:40-02:02);
the T-6 precheck's audio-state lines are read into the result. Logged on: the dry twins are interactive-logon tasks and ran (02:26),
and the night gates read OK at 02:26.

ARMING COMPLETE 2026-10-07T02:27:29+03
