# Review: A7 window-tool changes (AMENDMENT-A7.md sha 91f252b3…, §A7.3)

Reviewer: Opus, read-only, 2026-10-06. No cal driver was run; no task, app or key was touched.

**Verdict: PASS with 2 IMPORTANT findings, both in register-eq-cal.mjs's new snapshot check, not in the four tools.
The four tools are correct as they stand: every bound is right and nothing else changed.**

Baseline: `sp\flight-eq-revcopy\` (pre-A7 copies, 2026-10-05 17:46–21:57). `guard-eq-cal-layout\faithful\flight-eq\guard-eq.mjs`
is byte-identical to the current guard. `launchers-cal\*\gen-launchers-eq.mjs` are copies of the current file, not backups.

## (1) Bounds: correct

| Tool | Before → after | Inclusive | Machine TZ |
|---|---|---|---|
| guard-eq.mjs `T_MAX` (l. 106; text l. 25, 205, 209) | `instantOf(2026,10,6,1,0,0)` → `(…,3,0,0)` | `tMs > T_MAX` fails, unchanged | fixed +03 via `Date.UTC(h-3)`: independent |
| gen-launchers-eq.mjs `T_HI` (l. 8, 48, 52) | `'2026-10-06 01:00'` → `'03:00'` | `ms > T_HI` refuses, unchanged | fixed +03: independent |
| register-eq.ps1 `$hi` (l. 17, 143, 158–159) | `01:00` → `03:00`; supersede text `<= 03:00` | `-gt $hi` refuses, unchanged | both sides are ParseExact wall-clock times (Unspecified), so it is the same comparison as before on any zone |
| window-eq.mjs `HI`, `WINDOW_TEXT` (l. 3, 16–17) | `Date.UTC(2026,9,5,22,30)` → `Date.UTC(2026,9,6,0,30)` = 2026-10-06T00:30:00.000Z = 03:30:00 +03 | `<= HI`, unchanged | absolute UTC: independent |

The lower bound of 19:30 is unchanged everywhere.

## (2) Logic: nothing else changed

The diff against revcopy is limited to the constants, comments and message texts in the table above, in all four tools.
- **guard-eq-cal.mjs:** G4b's message text changed. G4e/G4f moved to 03:00/03:01. G4m (01:01, now OK) and the mutant `g4-upper-bound-still-0100` are new. There is one whitespace-only edit, on the `g3-variable-not-checked` line.
- **window-eq.cal.mjs:** c5–c8 and c12/c13 moved to 00:30Z. c27/c28 and the mutant W-A7-old are new. The mutant count in the log is now derived.
- **launchers-eq-cal.mjs:** L10 and L19 moved to the new bound. The diff also contains REL_E (path.relative, review m7) and M11/M12 (review m1). Those come from the earlier review round (22:xx), not from A7. I cannot prove which agent wrote them because there is no history.

## (3) register-eq-cal.mjs snapshot

The design is sound for F6–F8b. Each check calls `real()` before `realAbsent()` (JS argument order), and it compares name|State|StartBoundary|Execute+Arguments|StartWhenAvailable for the 3 real names:
- **Register:** a new task changes the snapshot.
- **Enable:** Disabled → Ready changes State.
- **Re-register with placeholder launchers:** the action path is PHDIR, so the snapshot changes.
- **Retime:** StartBoundary changes.

The cleanup now requires the same real count as at start (3 in this run), instead of 0.

- **IMPORTANT (I1): the snapshot covers only F6–F8b.** REAL0 is taken just before F6, after R1–R8b and F1–F5 have run. Cleanup only compares counts. A bug that altered an EXISTING real task during R*/F1–F5/F9/S1–S5 would pass: for example, the supersede path disabling or retiming `Natively-flight-eq` while the Label/name handling is broken. The old count==0 check could not see alterations either, but it never ran with real tasks present. This run did: "real eq tasks present: 3". Fix: take the snapshot at the top, next to REAL_COUNT0, and compare it again at cleanup.
- **IMPORTANT (I2): a failed snapshot command passes silently.** `realSnap()` ignores the spawn status and stderr. If `Get-ScheduledTask` or powershell fails, it returns '' both times, '' === '', and the check passes. The new check also has no known-answer case: no case shows `realAbsent()` returning false (rule 8). Fix: fail when status ≠ 0 or stderr is non-empty, and require the snapshot to hold exactly REAL_COUNT0 lines.
- **MINOR (m1): REAL_COUNT0 runs before `tasks('teardown')`.** Eqcal tasks left over from an aborted earlier run make it `undefined`, and cleanup then FAILS spuriously. That is fail-safe, but the reason is misleading.
- **MINOR (m2): the snapshot omits some fields.** It leaves out the principal/RunLevel, WakeToRun, the execution limit and the working directory. If a re-registration kept the same action, trigger and state but changed only these, it would go unseen. That is implausible here, because every real call uses refusal or -Plan, and F8/F8b point at PHDIR.
- **MINOR (m3): F8/F8b depend on the time of day.** F8T = now+60 min, clamped to 03:00, using a lexical compare (valid for this format). After about 02:54 both refuse on "not in the future" and report BAD. The driver comment says this, and it is acceptable.

## (4) Outputs show the new boundary cases

| Output | Cases | Result |
|---|---|---|
| guard-eq-cal.txt (00:08, after the guard's 23:59 edit) | G4c 19:29 FAILED, G4d 19:30 OK, G4e 03:00 OK, G4f 03:01 FAILED, G4m 01:01 OK. Mutant `g4-upper-bound-still-0100` flips [G4e, G4m]; `upper-bound-exclusive` flips [G4e] | GUARD CALIBRATION OK 210/210, 39/39 mutants |
| window-eq.cal.txt (00:01), machine zone (−180) and TZ=UTC identical | c5 00:30:00.000Z IN, c6 .001Z OUT, c12/c13 the same via +03:00 input, c27 22:30:00.001Z IN, c28 22:31Z IN, c1 16:29:59.999Z OUT. W-A7-old flips c5, c12, c27, c28 | CALIBRATION PASSED, 28 cases × 2 zones, 6 mutants |
| launchers-eq-cal.txt (00:08) | L10 03:01 refused with the 03:00 text; L19 19:30, 03:00 and 01:01 accepted | LAUNCHER CALIBRATION OK 74/74 |
| register-eq-cal.txt (00:14; script sha/12 f4d8f825d16f = current file) | F6 03:01 REFUSED with the 03:00 text; F7 19:29 REFUSED; F8 at 01:11 (out before A7) passes the window; F8b 03:00 refused only for the placeholder (`noLines /is outside/`) | REGISTER CALIBRATION OK 28/28; cleanup "real eq tasks present: 3" |

## Not shown

- No driver was re-run, so these results come from the existing .txt files and from reading the code.
- register-eq.ps1 has no mutant for the bound. F8b (03:00 accepted) and F6 (03:01 refused) would catch both a `-ge` and a stale 01:00.
- The behaviour on a machine whose zone is not +03:00 rests on reading the code, except for window-eq, which was run under TZ=UTC. Under another zone the Task Scheduler and register-eq.ps1 read T as machine-local, while the guard reads it as +03. That gap existed before A7 and A7 does not change it.
