# ARMING RECORD — flight-eq (§11 "Filled at arming", written outside MAIN per A3 I2; step 14 of A4/A5/A6)

T: 2026-10-06 00:00
Superseded: none
Precheck: Natively-flight-eq-precheck at 2026-10-05 23:54 (-At), flight task Natively-flight-eq next run 2026-10-06 00:00 (read back 23:07:13, register-eq.ps1 -Which verify exit 0, StartWhenAvailable False on both).

## Registered HEAD and texts
- Registered HEAD: e0056c4b4571d92822bcbca3175db5e95386cf63 (= 89c8f53 + LANDED 355ad0a (earlier-question feature + `--no-block`) + b42ca32 (ruling-3 focused-off harness edit) + e0056c4 (this registration, A1–A6 and the three notes in passes/)).
- Committed texts (sha256, as printed by the dry twin's PASSES lines 23:07): PREREGISTER-flight-eq.md 9ca3149bfb5ed44bff9f7d7c81e6203c15d9fe1b6442b47210ccfb59e2d14f44; A1 3e3f0ddd2ace1586bc4137394ee5c27868bf7ae121b73f1605519b8cd1d863c8; A2 0bd449be9b3bc68c80b3711308b1b4916f21e479fa36adac57a27eea0089f68e; A3 36aa80002a6b36d41a5c0ac613e4e7f705f81faa46b559566e9edaad79e31d6e; A4 1e0ac7735fce2f857a74588521d43d0b73e721e5c95f1bab0a7e13cee4cd26e0; A5 a1f9a2e0a185bbb7a93eef07e866325981b8ddc4cabe87b7ac0b4d1abbe876b6; A6 92929cd322dd52e8cd4aa10d3da97f3ac42b37cdcd8c6d40d256a80f0af2e303; NOTE-controller-tools 93b5c1b90ed9a9c0448e7b4b7a477d750f0dadb55218d8832b078ab284621a4c; NOTE-b10-rev7-A1 2b6550a5d32a3bd88f1c63dd95d6d852648090777865a40d1a03af3b8be7e47b; USER-RULING-4c 174f094b22e82eede1a1850049c16978c050859737de062373a1098fcfa441dc.
- Cue shape: CUE_RULE present at the registered HEAD (git grep: electron/llm/prompts.ts 3 hits) and in the built dist (dist-electron/electron/llm/prompts.js: True), confirmed 23:07.
- Dist: earlierQuestion.js sha256/16 56bfb8b11c522dd4 (EQ PROOFS: ALL PASSED in the dry twin).

## U1 — the user's rule-4c ruling, verbatim (USER-RULING-4c)
USER RULING 2026-10-05 16:58 TST (in chat, before any flight data): rule 4c gets a +1 margin: FAIL only if with-block consensus off-topic exceeds no-block by >= 2 (front leg, G sitting). Price to be recomputed and written in a dated amendment by the Opus author together with the A2 re-check fixes, before arming.

## Ledger (quota-ledger-today.mjs 2026-10-05T07:00:00.000Z, read 21:41 and 22:30)
- App-log lite mentions since the 10:00 reset (an upper bound on app requests): gemini-3.1-flash-lite 12, gemini-3.5-flash-lite 22 -> headroom >= 488 / >= 478 against the bars >= 372 (3.1-lite) / >= 475 (3.5-lite): PASS.
- Calls outside the app today (not in the app log): router40 arm L sent **48** gemini-3.1-flash-lite requests (counter lite-quota.answers.jsonl, sha12 560b9c77a820), 0 on 3.5-lite; router40 arm R used gemini-3.8-live only; the n5 accept-path probe sent 1 gemini-3.1-flash-lite request. Request-count headroom on 3.1-lite >= 500 - 12 - 48 - 1 = 439 >= 372.
- The user's go-ahead for router40 on this quota day (router40/USER-RULINGS.txt): "2026-10-05 21:41 TST USER RULING: run router40 TONIGHT with 3.1-lite LOW (user: 'backup 3.1s wont spend that many calls ... we can do the 3.8 router now using 3.1 lite low')"; final model ruling 21:47: 3.1-lite thinking LOW. A2.2's "no other lite run today" is superseded for this run by that ruling (recorded here, not edited).

## Smoke and the pre-arming b4 gate
- Smoke Natively-smoke-eq 17:37–17:49, result 0 (followup-turn/smoke/RESULT-smoke-eq.md): segment 1 CHECK CLEAN 5/5 (S1Q04F gate=block cue=constraint chars=418; S1Q06F gate=block cue=pronoun chars=516; WHY gate=parent-in-prompt cue=short chars=0; turns 1-5; ms <= 8); segment 2 CHECK CLEAN 2/2 (flag off, no diag); Step 6 VERIFY 2 block / 3 no-block / 0 FAIL (swap calibration 5 FAIL).
- n5 accept path: `--no-block --only S1Q04F --limit 1` -> block=stripped from the captured prompt, answered 1/1; refusal `--only S1Q04` exit 2.
- b4 gate (eq-b4-cal.mjs aa8dad977672 on E\smoke-run-tmp --g S1Q04F,S1Q06F): TRANSCRIPT OK 5/5, BLOCK OK 2/2, LABEL OUTSIDE --g NONE, exit 0 (caveat: both G ids single-line transcripts, TRANSCRIPT blind spot c''; evidence = BLOCK + LABEL OUTSIDE + Step 6). Cal (f) PASS on the real smoke dir.

## falsefail
- falsefail-eq.out.txt DONE (last line: p=0.01: front20 15.2%  back12 10.1%  either(20,12) 23.8%  pooled32 20.9%); 4c price at the +1 margin per A3: 12.6 / 20.8 / 27.5 %.

## Night gates (night-gates.ps1 5e6cd2acaed4, -At 2026-10-06 00:00, read 23:07)
NIGHT standby-ac: OK AC sleep timeout 0x00000000 (0 s)
NIGHT hibernate-ac: OK AC hibernate timeout 0x00000000 (0 s)
NIGHT power: OK AC line online, battery status 2, BatteryFlag 0
NIGHT reboot: OK CBS RebootPending absent, WU RebootRequired absent (PendingFileRenameOperations present, not gated)
NIGHT updates: OK active hours 15->6 cover; pause to 2026-10-14T13:41:25Z > At+5h; policy override values: none
NIGHT GATES OK

## Dry twin and tools
- Natively-flight-eq-dry run 23:07, result 0, 6 s (limit 240 s): PASSES x10, ARMING absent, scenario50.wav matches 40 items, EQ PROOFS: ALL PASSED, NIGHT GATES OK, GUARD OK.
- guard-eq-cal 208/208 (21:3x); guard-eq-head-check: HEAD GUARD OK, parent (10b) refused; launch-eq-check 20/20 (real) and 18/18 (dry); launchers 77fe8da6609f (real) / c370d6dbe3fb (dry); eq-precheck.ps1 e2bcc31c13a5 (cal 33/33, task-cal OK 23:06); register-eq.ps1 (cal 26/27: F8's fixture T 2026-10-05 23:00 is now in the past, so the past-T refusal fires before the placeholder refusal — both refuse, nothing registered; F8 passed 27/27 at 18:42); window-eq.mjs ca664e741ad0.
- Controller notes in force: NOTE-controller-tools-2026-10-05.md; NOTE-b10-rev7-A1.md; A6-RECHECK F1/F2 applied in the precheck calibration (clean stub + one change per failing case).

## Machine state at arming (23:07)
Nothing Natively-* Running; electron 0; tail.exe 0; %TEMP%\natively-eq-launcher-error.log absent.

## The user's confirmation
2026-10-05 16:2x (chat): quiet window "Tonight, any time"; reviews "Per task"; fallback "Fly unattended late" (up to ~01:00); "yes pc will be on". The user is told the start time (00:00) and the quiet period (~00:00–01:10) in chat at arming.

ARMING COMPLETE 2026-10-05T23:08:17.455+03:00
