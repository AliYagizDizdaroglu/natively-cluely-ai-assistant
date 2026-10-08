# ARMING RECORD — flight-eq (§11 "Filled at arming", written outside MAIN per A3 I2; step 14 of A4/A5/A6/A7)

T: 2026-10-06 03:00
Superseded: 2026-10-06 00:00 (record ARMING-flight-eq.superseded-2356.md; the 23:54 precheck FAILED arming-record only: the controller wrote the ARMING COMPLETE stamp as 2026-10-05T23:08:17.455+03:00, a format the gate (eq-precheck.ps1:118, yyyy-MM-ddTHH:mm:ss+03) does not accept; it disabled the flight task as designed; superseded 23:56 via register-eq.ps1 -Which supersede, both tasks read back Disabled; every other precheck gate read OK incl. the dry twin 0x0 in 8 s)
Superseded: 2026-10-06 00:45 (launchers regenerated, dry twin 0x0 and tasks registered 23:57; superseded 23:58 before any arming record existed, on the user's ruling in chat: "run the flight at 3 am, when done do the grading and provide the full report; I will be sleeping then"; AMENDMENT-A7 moves T to 03:00)
Precheck: Natively-flight-eq-precheck at 2026-10-06 02:54 (-At), flight task Natively-flight-eq next run 2026-10-06 03:00 (registered 00:15:50, register-eq.ps1 -Which armed exit 0 and -Which verify exit 0, NEXT RUNS flight=2026-10-06 03:00 precheck=2026-10-06 02:54, StartWhenAvailable False on all three). Launchers regenerated 00:14 for T 03:00 (gen-launchers --check --armed BOTH FILES PASS, PLACEHOLDERS none; launch-eq-check 20/20 real and 18/18 dry).

## Registered HEAD and texts
- Registered HEAD: 56bda9eb64b65a190c73788b5f86a550f6809f6a (= e0056c4 + 56bda9e (flight-eq-AMENDMENT-A7.md in passes/); e0056c4 = 89c8f53 + LANDED 355ad0a (earlier-question feature + `--no-block`) + b42ca32 (ruling-3 focused-off harness edit) + e0056c4 (registration, A1–A6 and the three notes)). Commit POST lines all True (commit-main-paths.ps1, index eq-a7).
- Committed texts (sha256, as printed by the dry twin's PASSES lines 00:15): PREREGISTER-flight-eq.md 9ca3149bfb5ed44bff9f7d7c81e6203c15d9fe1b6442b47210ccfb59e2d14f44; A1 3e3f0ddd2ace1586bc4137394ee5c27868bf7ae121b73f1605519b8cd1d863c8; A2 0bd449be9b3bc68c80b3711308b1b4916f21e479fa36adac57a27eea0089f68e; A3 36aa80002a6b36d41a5c0ac613e4e7f705f81faa46b559566e9edaad79e31d6e; A4 1e0ac7735fce2f857a74588521d43d0b73e721e5c95f1bab0a7e13cee4cd26e0; A5 a1f9a2e0a185bbb7a93eef07e866325981b8ddc4cabe87b7ac0b4d1abbe876b6; A6 92929cd322dd52e8cd4aa10d3da97f3ac42b37cdcd8c6d40d256a80f0af2e303; A7 91f252b376967119fb1f4c0344a33186395fe31cbc7875e366adfc67a67349a4 (rev1 35d0b374… kept outside MAIN; A7-RECHECK.md: OK WITH FIXES, revision scoped re-check OK WITH FIXES, R1 = this refreshed body); NOTE-controller-tools 93b5c1b90ed9a9c0448e7b4b7a477d750f0dadb55218d8832b078ab284621a4c; NOTE-b10-rev7-A1 2b6550a5d32a3bd88f1c63dd95d6d852648090777865a40d1a03af3b8be7e47b; USER-RULING-4c 174f094b22e82eede1a1850049c16978c050859737de062373a1098fcfa441dc.
- Cue shape: unchanged since 23:07 (A7 commit touches passes/ only); dist earlierQuestion.js sha256/16 56bfb8b11c522dd4 (dry twin 00:15: EQ PROOFS: ALL PASSED, PARITY DIST mismatches 0, DIST PROOF ok).

## U1 — the user's rule-4c ruling, verbatim (USER-RULING-4c)
USER RULING 2026-10-05 16:58 TST (in chat, before any flight data): rule 4c gets a +1 margin: FAIL only if with-block consensus off-topic exceeds no-block by >= 2 (front leg, G sitting). Price to be recomputed and written in a dated amendment by the Opus author together with the A2 re-check fixes, before arming.

## Ledger (quota-ledger-today.mjs, reset 2026-10-05T07:00:00.000Z, read fresh 2026-10-06 00:15:54 TST per A7 I4)
- App-log lite mentions since the 10:00 reset (MAIN natively_debug.log, last line 2026-10-05T14:49:14.901Z): gemini-3.1-flash-lite 12, gemini-3.5-flash-lite 22 (unchanged since 21:41/22:30; the whole-turn worktree log's last line is 2026-10-01, before the reset, so it holds no call of this quota day; files listed by section 2 carry mtimes before the reset).
- Calls outside the app today: router40 arm L sent **48** gemini-3.1-flash-lite requests (counter lite-quota.answers.jsonl, sha12 560b9c77a820), 0 on 3.5-lite; router40 arm R used gemini-3.8-live only; the n5 accept-path probe sent 1 gemini-3.1-flash-lite request; nothing since.
- Headroom: 3.1-lite >= 500 - 12 - 48 - 1 = 439 >= 372 PASS; 3.5-lite >= 500 - 22 = 478 >= 475 PASS.
- The user's go-ahead for router40 on this quota day (router40/USER-RULINGS.txt): "2026-10-05 21:41 TST USER RULING: run router40 TONIGHT with 3.1-lite LOW"; final model ruling 21:47: 3.1-lite thinking LOW. A2.2's "no other lite run today" is superseded for this run by that ruling (recorded here, not edited).
- G sitting timing (A7 I3): starts only if projected to finish before 10:00 local (latest start ~09:12), else after 10:00 on a fresh ledger read. Controller ruling (A7 re-check R4): a sitting projected to finish that runs past 10:00 completes; calls after 10:00 count on the new day.

## Smoke and the pre-arming b4 gate
- Smoke Natively-smoke-eq 17:37–17:49, result 0 (followup-turn/smoke/RESULT-smoke-eq.md): segment 1 CHECK CLEAN 5/5 (S1Q04F gate=block cue=constraint chars=418; S1Q06F gate=block cue=pronoun chars=516; WHY gate=parent-in-prompt cue=short chars=0; turns 1-5; ms <= 8); segment 2 CHECK CLEAN 2/2 (flag off, no diag); Step 6 VERIFY 2 block / 3 no-block / 0 FAIL (swap calibration 5 FAIL).
- n5 accept path: `--no-block --only S1Q04F --limit 1` -> block=stripped from the captured prompt, answered 1/1; refusal `--only S1Q04` exit 2.
- b4 gate (eq-b4-cal.mjs aa8dad977672 on E\smoke-run-tmp --g S1Q04F,S1Q06F): TRANSCRIPT OK 5/5, BLOCK OK 2/2, LABEL OUTSIDE --g NONE, exit 0 (caveat: both G ids single-line transcripts, TRANSCRIPT blind spot c''; evidence = BLOCK + LABEL OUTSIDE + Step 6). Cal (f) PASS on the real smoke dir.

## falsefail
- falsefail-eq.out.txt DONE (last line: p=0.01: front20 15.2%  back12 10.1%  either(20,12) 23.8%  pooled32 20.9%); 4c price at the +1 margin per A3: 12.6 / 20.8 / 27.5 %.

## Night gates (night-gates.ps1 5e6cd2acaed4, run by the dry twin 00:15 for -At 03:00, window 02:30..08:00)
NIGHT standby-ac: OK AC sleep timeout 0x00000000 (0 s)
NIGHT hibernate-ac: OK AC hibernate timeout 0x00000000 (0 s)
NIGHT power: OK AC line online, battery status 2, BatteryFlag 0
NIGHT reboot: OK CBS RebootPending absent, WU RebootRequired absent (PendingFileRenameOperations present, not gated)
NIGHT updates: OK [2026-10-06 02:30 .. 2026-10-06 08:00] active hours 15->6 do NOT cover; pause to 2026-10-14T13:41:25Z > At+5h (2026-10-06T05:00:00Z); policy override values: none
NIGHT GATES OK

## Dry twin and tools
- Natively-flight-eq-dry run 00:15:22, result 0, about 8 s (limit 240 s): PASSES x11 incl. A7, SHA LINES HEAD 56bda9e, ARMING absent, scenario50.wav matches 40 items, EQ PROOFS: ALL PASSED, NIGHT GATES OK, GUARD OK.
- A7 window tools (Sonnet, 00:0x): guard-eq.mjs 78907488180e (guard-eq-cal 3ce0086f0516: GUARD CALIBRATION OK 210/210, 39/39 mutants); gen-launchers-eq.mjs 871327fbe0d4 (launchers-eq-cal fa8e6c05b446: 74/74); register-eq.ps1 f4d8f825d16f (register-eq-cal a11c4447c326: 28/28, F8 fixture now time-relative); window-eq.mjs 3e6d307be61e (window-eq.cal 95719423b1d2: PASSED 28 cases x 2 TZ, 6 mutants). Opus review of these diffs dispatched 00:13 (window-tools-review.md).
- launchers: launch-eq.cmd 0bac4ce77423 / launch-eq-dry.cmd 6c659d2fdcc0; eq-precheck.ps1 e2bcc31c13a5; write-arming.mjs reads the gate pattern from eq-precheck.ps1 (known answers: the 23:08 stamp refused, 2026-10-06T02:41:07+03 accepted) and reads the written record back.
- Controller notes in force: NOTE-controller-tools-2026-10-05.md; NOTE-b10-rev7-A1.md; A6-RECHECK F1/F2 applied in the precheck calibration.

## Machine state at arming (00:16)
Nothing Natively-* Running; the user is asleep from ~00:30 (no one uses the PC during the hour, per the user's ruling in A7).

## The user's confirmation
2026-10-05 16:2x (chat): quiet window "Tonight, any time"; reviews "Per task"; fallback "Fly unattended late"; "yes pc will be on". 2026-10-05 23:58 (chat): "run the flight at 3 am, when done do the grading and provide the full report; I will be sleeping then" (A7: T 03:00, quiet period ~03:00–04:10).

ARMING COMPLETE 2026-10-06T00:16:54+03
