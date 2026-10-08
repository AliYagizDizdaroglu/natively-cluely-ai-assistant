# Task 1 report (lane A, WT live-router-a)
Commit: 7a84d20. Files: electron/audio/GeminiLiveRouter.ts, GeminiLiveRouter.test.ts.
Tests: GeminiLiveRouter.test.ts 36/36 (30 old + 6 new). 
RED seen before impl (4 fail): goAway 3 connects vs 2; stale-onclose 4 connects vs 2; close-code no matching line; model test failed on calls[0].model (3.1 default vs requested 2.5; getModel did exist? no - first expect failed before getModel was reached).
Regression pins (labelled in test): 'late session from stale connect' and 'stop makes late callbacks stale' passed on old code as predicted.
 - Pin 1 break: removing only the 'gen !== generation' term leaves it green (the stopping flag covers it); removing both terms -> RED. 
 - Pin 2 break: removing generation++ from stop alone stays green (stopping checks cover it); removing generation++ plus every stopping check in handleClose/scheduleReconnect/timer -> RED (also the old 'stop() ... never reconnects' test). Both restored; sha of ts after restore beac48ff6d38.
tsc: root clean; electron exactly the 6 baseline errors (incl. GeminiLiveRouter.ts(125)); none new.
Deviations: none from plan code. Note: with the new generation guard the pins are redundant with 'stopping' on today's code, as plan predicted.
Concerns: none.

Fix round 1: S1-S4 added, 40/40. Each guard removed alone goes red: M1 connect gen check->S1; M2 stop gen++->S2; M3 goAway gen++->S4; M4 pending-reconnect guard->S3a; M5 handleClose stale return->stale-onclose test; M6 onmessage gate->S2; M7 onopen gate->S2. Only the test file changed; trailing newline added.
