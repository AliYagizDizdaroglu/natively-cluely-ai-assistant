# Task 18 report: quota ledger + flight tools (LAB\flight, Steps 1-5; Step 6 is the controller's)

Status: DONE_WITH_CONCERNS. Nothing committed (LAB files). No real task registered or started; only dummy `Natively-flight-rdcal*` tasks, all deleted (0 left), `%TEMP%\natively-rd-launcher-error.log` absent, `ARMING-flight-rd.md` absent.

## Files (LAB\flight unless noted; sha256/12 in brackets)
- SP\quota-ledger-today.mjs (edited): live-router log + golden dirs added as sources; `--main <dir>` (calibration only); prints `LEDGER-SUMMARY reset= cap=500 used35 used31 headroom35 headroom31` (upper bound = all log lines naming the model) and an informational `usage:`-line count.
- quota-ledger-cal.mjs/.txt; gen-launchers-rd.mjs [fb7e0713516d] + launch-rd-src.txt [8eeffc49de84] -> launch-rd.cmd / launch-rd-dry.cmd (NOT generated here: the controller does it with --commit --t --deadline-min --ctx-sha12); rd-sha-lines.mjs; rd-proofs.mjs (new, not in the plan list: router dist markers + sha256 of the 3 router dist files before/after, plus dist-proof cue build); launchers-rd-cal.mjs/.txt.
- guard-rd.mjs [1a9c2af90c77], guard-rd-git.mjs (verbatim copy of guard-eq-git), guard-rd-cal.mjs/.txt.
- rd-precheck.ps1 [e08d100108a0], register-rd.ps1 [d2068e3a89de] (UTF-8 BOM), rd-cal-tasks.ps1, rd-precheck-cal.mjs/.txt, rd-precheck-mutants.mjs/.txt, rd-precheck-task-cal.mjs/.txt, register-rd-cal.mjs/.txt, register-rd-window-cal.mjs/.txt.
- write-arming-rd.mjs [5ebc71c90e4e], write-arming-rd-cal.mjs/.txt.
- night-gates.ps1: by reference, SP\flight-eq\night-gates.ps1 (sha 5e6cd2acaed4...), unchanged; real read-only run for T 2026-10-07 23:00: NIGHT GATES OK.

## Calibrations (all saved beside the tools)
- Step 1 ledger: the "stale" premise is false: DAY_START was already derived from now. Known answers 06:59:59Z -> 2026-10-06T07:00Z, 07:00:00Z -> 2026-10-07T07:00Z (+4 more incl. fallback evening); 2 mutants (stale constant, exclusive boundary) turn them BAD; stub-tree count check incl. the live-router log (its removal turns it BAD). 13/13.
- Step 3 guard: 160 stub cases + 3 informational, 54 mutants all caught, A1 stays ok: 216/216. Windows 07:30/08:30/22:30/03:00 inclusive and the minute outside each; r7 at 223/224 and 89/90; stale ledger refused; r6 prefix-of-longer-hex refused.
- Step 2 launchers: 106/106 (generator args, tamper detection, lint mutants, helpers, cmd.exe exit codes 9,8,7,6,12,14,5,3,4 on a stub; the launcher reaches the guard through the real env and stops at r6).
- Step 4: precheck 33/33 (+12/12 mutants, +scheduled-task run OK), register 37/37, T-window mutants 11/11 (-Plan only).
- Step 5 write-arming: 70/70 (30-row control against the real script, 22/22 mutants).

## Deviations / additions
- Flight label router-default-r1 (controller ruling), not the plan's `router-default`.
- Guard: r2 also refuses a main.js older than main.ts; r4 refuses ANY value (even 0/empty); r5 also requires FOCUSED=off (replaces g3); 10a list swaps NATIVELY_EQ_T for RD_T and adds EARLIER_QUESTION; checks 5 (R09) and g1 dropped as the plan says.
- Lint: added "if-block opens while previous still open" (eq's lint missed a mid-file missing paren).
- register-rd: the router-build-in-MAIN repo check applies to label `rd` only (so the dummy calibration could run). Consequence: the REAL registration is refused until electron\services\routerArbiter.ts exists in MAIN.
- write-arming-rd: required `--seal <sha256 of PREREGISTER-router-default.md>` (body must quote it) and, from spec 10.1, a fresh `LEDGER-SUMMARY` line in the body (reset = now's quota day, headroom >= 224/90). Not in the plan step list.

## Concerns / not exercised
- Router build not in MAIN: r1,r2,r3,r5 pass only on a stub with SYNTHETIC router dist/source files (selectArms/live40 from live-router-d). On MAIN today the guard fails at r1 (informational case). Real proof = Step 6.
- r7 counts log lines (upper bound, can false-refuse); it reads logs of MAIN, whole-turn WT and live-router WT only: a smoke run from another worktree would be missed, as would unlogged probe calls. cap=500 and need 149/60 are constants in guard (edit + recalibrate if the registration recomputes them with smoke spend).
- RESULT-smoke.md must contain `context_sha12=<12 hex>` literally (guard r6); path LAB\RESULT-smoke.md.
- Guard end to end through the launcher (r6 onward, real night gates via the guard, real ledger on the day) not run; launcher exit 0 not reached.
- Registration must state: the precheck split (session gates live in auto()), PASSES default `PREREGISTER-router-default.md` committed under passes/.

## fix1 (review: SPEC PASS, QUALITY CHANGES)

Status: DONE_WITH_CONCERNS. Every calibration I touched was re-run to green (below).

### Request markers counted (exact, from LLMHelper.ts)
- `[LLMHelper] verbal hedge: front=<M> back=<B> trigger=` : 1 request on M (3.5-lite or 3.1-lite front leg).
- `[LLMHelper] verbal hedge: back started at ` : 1 request on the back model (taken from the preceding front line's `back=`).
- `[LLMHelper] <M> warmed up in ` or `<M> warmup failed` : 1 request on M.
- NOT counted: `usage:`, `won by`, `answer source` and any other line naming a model (informational `mentions` / `usage lines` are printed, labelled not-requests).

### B1 (blocking)
The old rule counted lines naming a model (394 / 131 on the eq hour, ~9 lines per request). Now one per marker. Calibration on the real eq logs (counts only, no lines printed): 42 front legs, 11 back legs on the hedge; with warm-ups 3.5-lite 43 / 3.1-lite 18 from the main log alone, 46 / 19 with `.log.1`. Mutant X4 (the old line-counting rule) reads 394 / 131 and is BAD against the known 42 / 11.

### I1
- Ledger reads `natively_debug.log` and `.log.1` for the MAIN, whole-turn and live-router locations, restricted to the quota day (reset 07:00Z). Per-location coverage: in-day lines whose oldest stamp is after the reset give `complete=no`; r7 and the arming step refuse it (and `oldest=none`).
- The wrong "false pass impossible" comment is replaced. Stated plainly in the ledger output and here: calls made by scripts (smokes, probes) are in NO app log.
- `--extra-requests <n>` added (charged to both models); the arming step fills it from the smoke and probe records. Missing = `extra=unset`; r7 and write-arming refuse it. The launcher carries it as `NATIVELY_RD_EXTRA_REQUESTS` (gen-launchers `--extra-requests`).

### M1-M4 (M5 carried)
- M1: `rd-proofs.mjs` stops the before-search at `=== DIST AFTER THE RUN ===`; cases H11b (before section lacks a line: refused), H11c (real appended shape: passes), H11d (mutant without the bound passes H11b's input, so H11b discriminates).
- M2: write-arming compares `--seal` with sha256 of `PREREGISTER-router-default.md` as committed at HEAD of `--root` (default MAIN); refuses on mismatch or when not committed (Y17-Y19).
- M3: the body's ledger read must be at most 30 minutes old (inclusive) and not in the future (Y20-Y22).
- M4: the `usage:` comment fixed.
- M5: no code change; the build must come after the final HEAD.

### Calibrations re-run
| calibration | result |
|---|---|
| quota-ledger-cal | OK 29/29 |
| guard-rd-cal | OK 229/229 (169 cases, 58/58 mutants caught; new L-m..L-u, 4 new r7 mutants) |
| launchers-rd-cal | OK 113/113 (a bug in my H11d bookkeeping fixed; the mutant check was inverted) |
| write-arming-rd-cal | OK 86/86 (29/29 mutants) |
| register-rd-cal | OK 37/37 |
Outputs saved beside each script in `flight\`. Precheck cals untouched (ps1 files unchanged).

### Remaining concerns
- Non-hedge Gemini streams (typed chat, hedge-off stall race) have no marker and are not counted; script calls only via `--extra-requests` (the number is as good as the smoke/probe records).
- `complete=no` detects a lost start of day only; it cannot prove completeness.
- Not exercised: a real arming run with a live ledger read (controller's dry run); no model call, no app start, no real task registered.

## fix2 (user ruling 2026-10-07 00:48: fly as early as possible once arming is green)

Status: DONE. The fixed windows (07:30-08:30, 22:30-03:00) are gone; T is derived from the clock. No real task registered.

### Rules now in the tools
- Allowed T (gen-launchers `--t`, register-rd `-T` for label rd, write-arming `--t`): T + 75 min must stay inside ONE quota day (resets 07:00Z = 10:00 local; T 08:44 ok, 08:45 refused, 09:59 refused, 10:00 ok); T at most now + 24 h (inclusive).
- Lead: gen-launchers and register-rd (not for `-Which verify`): T at least now + 15 min (inclusive). write-arming keeps its own T - 10 min refusal (arming must be done by T - 10, which also refuses a T in the past); the ruling's "keep T-10 for arming" is read as this, so it does not also demand now + 15 min.
- Guard g4: T is still `yyyy-MM-dd HH:mm`; at run time now must be within [T - 6 min, T + 30 min], both ends inclusive to the second. The guard does NOT check the quota day (that would make its calibration depend on the hour it is run).
- T - 10 (arming) and T - 6 (precheck task) unchanged. rd-precheck.ps1 had no window; untouched.
- A T kept in an existing launcher (generator `--check`, incremental runs) is checked for the quota day only, since the lead rule would fail after T passes.
- Calibration clocks added: gen-launchers `--now <iso>`, register-rd `-Now 'yyyy-MM-dd HH:mm'` (the real registration never passes them).

### Calibrations re-run (all green)
| calibration | result |
|---|---|
| guard-rd-cal | OK 231/231 (60/60 mutants; new G4b-G4n: now = T-6 min -1 s / exactly / T / T+30 exactly / +1 s / +31 min / -7 min, old window edges now meaningless, T a day early / late; 8 g4 mutants incl. edge 6->7, 6->5, 30->31, 30->29, exclusive bounds, one side only) |
| launchers-rd-cal | OK 116/116 (G5d-jc refusals: quota 08:45 / 09:00 / 09:59 / next day, lead 00:14 / past / equal to now, horizon +1 min / 2 days; G6a-f accepts: now + 15 min, +24 h, 08:44, 10:00; the exec section uses a T 5 min after the real clock) |
| gen-t-mutants (new, `gen-t-mutants.mjs/.txt`) | OK 12/12 (control clean; lead, horizon, run length, reset hour, quota removed all flip an edge case) |
| register-rd-window-cal | OK 36/36 (15/15 mutants; 20 edge cases with -Now) |
| register-rd-cal | OK 36/36 (real-label refusals F6-F6e, accepts F8a-f; 37 -> 36 as one old window case collapsed) |
| write-arming-rd-cal | OK 88/88 (31/31 mutants; B1-B4 inclusive edges, O1-O7 refusals, quota 08:44/08:45/09:59/10:00, horizon +24 h / +1 min, past T) |
quota-ledger-cal and the precheck cals do not touch these rules and were not re-run.

### Not covered
- The launchers-rd-cal exec section cannot run between 08:45 and 10:00 local (its generated T's run would cross the reset).
- register-rd `-Which verify` is exercised only through register-rd-cal's existing cases, not the new bounds (they are skipped there by design).
- register-rd reads T as +03:00 for the quota math but registers with the machine's local clock; they agree on this machine (UTC+3).
- The rule does not stop a T whose lead after arming is shorter than the arming/precheck chain needs (T - 10, T - 6): that stays the controller's call.

## fix3 (from the "fix2 review")

Status: DONE. F3 is for the registration (no code change).

### F1: g4's clock check is the last check before 10a
- `guard-rd.mjs`: g4 is split. The FORMAT check of NATIVELY_RD_T stays where it was (g2 and g5 need a parsed T). The CLOCK check (now within [T - 6 min, T + 30 min], inclusive) moved to just before 10a. Run order: r1, 2-4, 6-8, r2, r4, g4 (format), 6b, 9, 10b, 11, r5, 12, r3, r6, r7, 13, g2, g5, g4 (clock), 10a.
- A dry run outside the window therefore reaches every other check; any other violated check is named in place of g4; 10a (the .env names) is not run when g4 fails.
- **The dry log's ending line in that case** (the launcher appends the guard's stdout and stderr to the log and exits 4 without writing its `done` line, so this is the last line of the log):
  `GUARD FAILED: (g4) now (<yyyy-MM-dd HH:mm>) is outside [T - 6 min, T + 30 min] for NATIVELY_RD_T <T>: every check before this one passed; only the start time is wrong (10a, the .env names, is not run)`
  The lines above it are the night gates' (`night gates script: <path>`, the `NIGHT ...` lines, `NIGHT GATES OK`). Any other `GUARD FAILED: (<tag>)` as the last line is a real failure. A pre-arming dry twin reads as "everything green except the window" exactly when the last line is the g4 one above. Note a dry twin never runs g5 (no precheck stamp), and 10a has not run, so the .env scan is unproven in that reading.
- guard-rd-cal 237/237, 61/61 mutants: new G4t (everything else right: night gates stdout present, stderr last line is the g4 line with the sentence above), G4u (outside + commit unset -> 10b reported), G4v (outside + failing night gates -> g2 reported), G4w (outside + guarded name in .env -> g4, value not opened or leaked), G4x (unparseable T still fails early at g4 format); new mutant: the clock check also run right after the format check (caught by G4u, G4v, G4w).

### F2: calibrations re-run on the current files
| file | sha256/12 | modified | calibration |
|---|---|---|---|
| gen-launchers-rd.mjs | 562a16c5c199 | 2026-10-07 01:16 | launchers-rd-cal OK 116/116; gen-t-mutants OK 12/12 |
| write-arming-rd.mjs | 04296d43cc5b | 2026-10-07 01:16 | write-arming-rd-cal OK 88/88 (31/31 mutants) |
| guard-rd.mjs | 6ef1d49dba90 | 2026-10-07 01:21 | guard-rd-cal OK 237/237 |
| register-rd.ps1 | f99b3e5c3816 | 2026-10-07 01:21 | register-rd-window-cal OK 46/46 (18/18 mutants); register-rd-cal OK 36/36 |
| launch-rd-src.txt | 7bbf6809727b | 2026-10-07 00:21 | unchanged |

### F4: register-rd refuses a machine whose UTC offset is not +03:00
- `register-rd.ps1` reads `[TimeZoneInfo]::Local.GetUtcOffset` at the start and refuses `this machine's UTC offset is X, not +03:00 ...` otherwise (every T is a +03:00 reading; a task trigger is local time). `-MachineOffset 'hh:mm:ss'` is the calibration stand-in; the real registration never passes it.
- register-rd-window-cal: offsets 02:00:00, 04:00:00, 00:00:00, 03:30:00, 03:00:01 refused, 03:00:00 passes the check, junk refused as a usage error; 3 new mutants (check removed, compared with +02, stand-in ignored) all caught.
- Not covered: a negative offset (PowerShell reads `-03:00:00` as a parameter name); this machine's real offset was exercised only as the passing case.

## fix4 (from the "fix3 review")

Status: DONE.

- **H1:** the guard exits **10** when ONLY the clock check fails (every other failure still exits 1). The DRY launcher reads exit 10, appends `=== LAUNCHER rd-dry GUARD WINDOW ONLY exit 10 - only g4-clock failed - no error log written ===` to its log, writes NO `%TEMP%\natively-rd-launcher-error.log` and exits 10. Any other guard failure writes the error log and exits 4, as before. The REAL (flight) launcher treats exit 10 as any failure (error log, exit 4: a flight outside its window must not fly). Backstop: write-arming refuses while the error log exists (`--error-log <path>` is the calibration stand-in; the default is `%TEMP%\natively-rd-launcher-error.log`).
- **H2:** the clock check has its own tag `(g4-clock)`; the format check keeps `(g4)`.
- **H3:** g4-clock moved AFTER 10a (last check, right before the `GUARD OK` line). Run order: r1, 2-4, 6-8, r2, r4, g4 (format), 6b, 9, 10b, 11, r5, 12, r3, r6, r7, 13, g2, g5, 10a, g4-clock.

**Dry-log ending lines.** Window-only failure (everything else green, `.env` scan included):
```
GUARD FAILED: (g4-clock) now (<yyyy-MM-dd HH:mm>) is outside [T - 6 min, T + 30 min] for NATIVELY_RD_T <T>: every other check passed, 10a included; only the start time is wrong
=== LAUNCHER rd-dry GUARD WINDOW ONLY exit 10 - only g4-clock failed - no error log written ===
```
The LAST line is the second one, process exit code 10, and no error log. Any other ending (a `GUARD FAILED: (<other tag>)` last line, exit 4, error log present) is a real failure. A normal pass ends `=== LAUNCHER rd-dry done ... ===`.

### Calibrations
| calibration | result |
|---|---|
| guard-rd-cal | OK 240/240, 64/64 mutants (clock cases now expect exit 10 and tag g4-clock; G4w: out-of-window + guarded .env name -> 10a reported, so 10a RAN; G4t: out-of-window with everything else right -> exit 10; new mutants: exit code lost, tag reverted, clock before 10a) |
| launchers-rd-cal | OK 122/122 (X5a window-only dry: exit 10, no error log; X5b2 the log ends with the WINDOW ONLY line, guard line just above; X5c real failure: exit 4 + error log; X5d; X5e the flight launcher with exit 10: exit 4 + error log, no flight; X5f mutant without the exit-10 branch reads the window-only case as a real failure) |
| write-arming-rd-cal | OK 91/91, 32/32 mutants (Y26 error log present -> refused, Y27 absent -> written, mutant without the check caught) |
Files: guard-rd.mjs 869652c723fb, write-arming-rd.mjs 5259379f5c24, launch-rd-src.txt 7155790525e1 (gen-launchers-rd.mjs unchanged, 562a16c5c199; gen-t-mutants and register cals not touched).

### Not covered
- The launcher cases swap the real guard for a stub that exits 10 (the real guard cannot pass r6 in the stub layout): the real guard's exit 10 and the launcher's reading of it are each proved, not their join in one process.
- rd-precheck.ps1 was not changed or re-run; a dry twin ending in exit 10 is, to it, a dry failure like any other.

## ledger-fix5 (urgent: complete=no after two smoke app starts rotated MAIN's log)

Status: DONE. SP\quota-ledger-today.mjs (sha256/12 bd1c5b500b82) also reads the run copies <loc>\electron\test\golden\interview60.runs\*\natively_debug.log for MAIN, whole-turn and live-router.
- Merge: per location, a MULTISET UNION by line identity (the full line, timestamp included): a line counts max(its occurrences in any ONE source), so a line in a live log and a run copy counts once, while two identical lines inside one file both stay.
- complete: computed over the union (the oldest stamp of any source, run copies included, against the reset). LEDGER-SUMMARY format unchanged (r7 parsing untouched).
- Real ledger now (counts only): `used35=100 used31=10 extra=0 headroom35=400 headroom31=490 complete=yes oldest=2026-05-25T09:44:28.249Z` (MAIN: 36 run copies read, 269115 stamped lines in all sources, 260845 after merging; the same 100/10 as before the fix).
- quota-ledger-cal OK 37/37: R0 control (live alone: complete=no), R1 a line in both counts once, R2 a run copy restores complete=yes, R3 a copy alone is read, R4 identical lines inside one file both stay; mutants X10 (sum, no de-duplication: double-counts), X11 (set: collapses R4), X12 (copies not read); the real logs are an INFO line (the live logs change at every app start). guard-rd-cal re-run OK 240/240.
- CAVEAT: "complete" means SOME source holds a line older than the reset. Here it is satisfied by a run copy that ends BEFORE the reset (the eq run), so it does not prove the app logged nothing between that copy and the oldest live line (22:04Z on 10-06). It proves less than coverage of the day.
