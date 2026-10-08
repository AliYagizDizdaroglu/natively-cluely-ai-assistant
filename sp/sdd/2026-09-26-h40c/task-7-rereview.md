NOT ALL ADDRESSED

# Task 7 re-review, fix round 1

Scope: the rewritten `SP\launch-smoke-hedge.cmd`, `SP\check-smoke-hedge.mjs` and
`SP\register-smoke-hedge.ps1`, the new `SP\refuse-probe.mjs`, `SP\cal-h40c\run-calibration.mjs`,
and the "Fix round 1" section of task-7-report.md, all checked against the controller's rulings.

What I ran:
- The 29-case calibration. It reproduced: 29/29, exit 0.
- 5 new known-case checker fixtures (`SP\rv8\`).
- `refuse-probe.mjs` twice, from a stub cwd (`SP\rv8\p`), where `app:stop` is a stub that only
  records the call, with stub children.
- One cmd file with the launcher's build-identity lines (`SP\rv8\forf.cmd`).

Nothing started the app, registered a task, called a model API, or ran the real `app:stop`.

## Status of each original finding

- **C1 - ADDRESSED.** Each segment copies `natively_debug.log` right after its smoke-turn
  (launcher:71, 84, 97, 118); segments 1-3 also copy `app-start.log` (72, 85, 98).
  `--debug-log` is required: omitting it exits 2 (checker:146, calibration case 24).
- **C2 - ADDRESSED.** `HEDGE_ANY` is anchored to `^\[LLMHelper\] verbal hedge:` (checker:203),
  and a global check runs over the whole segment (460-461). Calibrated both ways (cases 1-2).
  Edge: the global check is skipped when a segment has no dispatch windows (NEW-M5).
- **C3 - ADDRESSED.** Nothing runs in the background any more. The probe runs in the foreground,
  and `SMOKE4 EXIT` is appended after it returns (launcher:113-117). The probe writes to LOG4
  only through open/append/close calls, and it spawns its child before its first write, so the
  child cannot inherit a LOG4 handle.
- **C4 - ADDRESSED.** The probe watches the child's real exit (refuse-probe.mjs:79-95). Refuse
  mode requires three things: the refusal line at or after since, `REFUSE exited code=1`, and no
  debug line after the refusal (checker:318-342). Cases 25-29 cover these. Side defects in the
  probe are listed under NEW-M1..M3.
- **C5 - ADDRESSED.** `DEBUG_LINE` now accepts `CRITICAL`, `UNHANDLED` is broadened, and
  `--extra-log` scans a second file (checker:158, 210, 356-373). Cases 4, 21 and 22 cover it.
  The broader match now also hits answer text (NEW-M4), and the app-start scan is opt-in (NEW-I1).
- **I1 - ADDRESSED.** `yes` exists only in the probe child's env (refuse-probe.mjs:73). The
  launcher's own env never carries it, and nothing outlives the launcher on the normal paths.
- **I2 - NOT ADDRESSED in substance.** The window split on `answer|supersede` is right. But the
  finding asked that no answer go unchecked. Under the new ambiguity rule, an answer that never
  raced, or a race that never produced a winner, reads AMBIGUOUS, and the segment still PASSes
  if any other window passes. The original checker failed both cases. See NEW-C1.
- **I4 - PARTIALLY ADDRESSED.** Most rules are now shown failing. Two gaps remain:
  - One case encodes a wrong expectation: `default-one-wonby-missing-still-PASSes-other-answer-clean`
    expects PASS where a race never resolved (NEW-C1).
  - Five rules are still never shown failing (NEW-M8).
- **I3 - ADDRESSED.** StartAt is mandatory, `-Hours` defaults to 1, StartWhenAvailable is gone,
  and the settings are read back and printed (register:31-32, 56, 66-70). The M6 guard is weak
  (NEW-M7).
- **M1 - ADDRESSED.** Only loser usage lines after the won-by line count (checker:279-289).
  Calibrated both ways (cases 7-8).
- **M2 - ADDRESSED.** The `other=empty` message now says "rare; investigate" (checker:273).
- **M3 - ADDRESSED.** Off mode checks the model and the `(hedge)` label (checker:304-313). The
  label half is not calibrated (NEW-M8).
- **M4 - ADDRESSED.** Added `--until`, the per-window route, the back-leg reason, and request
  counts.
- **M5 - ADDRESSED, with defects.**
  - Done: env vars cleared (launcher:51-54), second guard (38-42), WORST exit code (125-130),
    build-identity lines, header fixed.
  - Defects: `SMOKE4` is always 0 (NEW-M2), and the identity lines have caveats (NEW-M6).
- **M6 - ADDRESSED in effect.** The launcher's guard (launcher:38) checks `electron\main.ts` and
  exits 7 before any app start. The register script's own guard is ineffective (NEW-M7).
- **M7 - ADDRESSED for `--debug-log`.** `--diag-log` still defaults to a cwd-relative path
  (NEW-I1).

## The implementer's two deviations and one concern

1. **`rv7\supersede` now PASSes: the reasoning holds.** I built that fixture as two correct races,
   and my review expected PASS for it. Race 1 resolves at 13.241, before the supersede at 20.000.
   Splitting on supersede gives two clean windows, and PASS is the correct verdict. The AMBIGUOUS
   expectation was never mine.
2. **The h40b copy reads INCONCLUSIVE, not FAIL: the outcome holds, but not for the reason given.**
   Exit 3 is not 0, so a log with no hedge in it still cannot pass the gate. But the stated
   premise is "no hedge evidence is not evidence of a wrong outcome". In forced or default mode,
   once the startup line shows the flag reached the process, a verbal-route answer with no race
   **is** a wrong outcome. That same premise is what produces NEW-C1.
3. **The concern that cleanup relies on "electron" in the command line: confirmed, and the
   production path is safe.** The child is `cmd.exe /c "npm run electron:dev"`, which appStop's
   `/electron(\.exe)?/i` matches (interview60.run.mjs:187). What the concern misses is what happens
   when the kill does not happen: the probe waits on the child indefinitely and logs nothing
   (NEW-M3).

---

## NEW findings

### Critical

**NEW-C1 - AMBIGUOUS hides definite failures, so a segment can PASS with answers that never
raced or never resolved.**
Where: check-smoke-hedge.mjs:233-245, 431-435, 467; run-calibration.mjs:147-153.

`classifyWindow` marks anything other than exactly one front line plus one won-by line as
AMBIGUOUS. Line 467 then scores the segment PASS as long as one window was clean. Two definite
failures land in that bucket:
- **An answer that never raced:** 0 front lines on a VERBAL route.
- **A race that never produced a winner:** 1 front line, 0 won-by lines, and usually the
  `verbal hedge: no answer - front X, back Y` WARN from LLMHelper.ts:3527.

The original checker failed both ("no front= line" and "no won by line"). This is a regression
against the brief's "every answer has ...", and the calibration now blesses it
(`default-one-wonby-missing-still-PASSes-other-answer-clean`, expecting PASS).

Reproduced:

| Fixture | What it contains | Checker result |
|---|---|---|
| `SP\rv8\unraced` (debug + diag logs) | 3 answers, all `route: VERBAL-TECHNICAL`. Only the first raced. Run with `--clips 3`. | `windows found: 3 (clips played: 3)`, two windows `AMBIGUOUS - 0 "front=" line(s), 0 "won by" line(s)`, `PASS overall`, exit 0 |
| `SP\rv8\bothfail` | q1: both legs fail (`no answer - front error, back error`). withVerbalFallback's redirect runs the hedge again (streamGeminiWithStallFallback sends any lite primary back into the hedge), which fails the same way; the user sees `[No answer - ...]`. q2 is clean. | q1 `AMBIGUOUS - 2 "front=" line(s), 0 "won by" line(s)`, `PASS overall`, exit 0 |

**Fix.** Reserve AMBIGUOUS for evidence of overlap, and fail the definite cases:
- **AMBIGUOUS:** 2 or more front or won-by lines in a window, or a 0/1 shortfall that the
  neighbouring window's surplus explains.
- **FAIL when:**
  - (a) any `verbal hedge: no answer` line appears in a window;
  - (b) a window has exactly 1 front line and 0 won-by lines, and no later window holds a
    surplus won-by;
  - (c) a window has 0 front lines (off mode: 0 stall-race lines), its route is not CODING or is
    unknown, and no earlier window holds a surplus front line.
- **Scoring rules:**
  - Make `--clips` required.
  - PASS only when the scored windows plus the CODING windows (not applicable) equal the clip count.
  - Otherwise the segment is INCONCLUSIVE.
- **Recalibrate:**
  - `rv8\unraced` must FAIL.
  - `rv8\bothfail` must FAIL.
  - `default-one-wonby-missing` must FAIL.
  - The overlapping fixture stays INCONCLUSIVE.
  - Add a CODING-route window, which must not fail.

### Important

**NEW-I1 - Parts of the fixed checks only run if the controller remembers opt-in flags, and
nothing gives the real-run invocation.**
Where: checker:94-97, 155; report "Calibration".

Three flags control whether the fixes actually apply:
- **`--extra-log`**: the app-start and child-log scan the C5 ruling asked for. It is optional
  with no default, so leaving it out skips the scan silently.
- **`--diag-log`**: defaults to `./verbal-diag.log`, which reads as empty when the checker runs
  from SP. Routes and first-token times then disappear, and NEW-C1's route-based rule needs them.
- **`--clips`**: optional.

The calibration always passed these flags explicitly. The real run has no such script: the
report never states the four commands, and each segment's since must be copied by hand from
line 2 of its segment log.

**Fix.** Add a small runner (for example `SP\run-smoke-hedge-checks.mjs`) that:
- reads each segment's since from line 2 of its segment log;
- passes `--until` as the next segment's since, for the shared diag log;
- passes the per-segment copies, `MAIN\verbal-diag.log`, the app-start and child logs as
  `--extra-log`, `--segment-log` for refuse, and `--clips 3/3/1`;
- writes everything to `SP\smoke-hedge-checks.txt`.

Alternatively, make `--diag-log` and `--clips` required.

### Minor

- **NEW-M1 - The probe always waits out the full deadline** (refuse-probe.mjs:83-86). The
  deadline `setTimeout` is never cleared, so the process lives until it fires even after the child
  has exited. Measured: the stub child exited 1 after 110 ms, and the probe's wall time was
  12.2 s with a 12 s deadline. In production, segment 4 always takes 180 s. Fix: `clearTimeout`
  (or `unref`) after the race.
- **NEW-M2 - The probe always exits 0** (refuse-probe.mjs:61-104). `main()` resolves the same
  way for `exited code=0`, `STILL RUNNING` and a spawn error, so `SMOKE4 EXIT` is always 0 and
  WORST never reflects segment 4 (M5's intent). Fix: set `process.exitCode = 1` unless the
  outcome was `exited code=1`.
- **NEW-M3 - If the STILL RUNNING cleanup fails to kill the child, the probe blocks on it with
  no log line** (refuse-probe.mjs:94-103). Measured: a hanging stub, with app:stop unable to kill
  it, held the probe for 60.3 s, until the stub's own safety exit. The probe exited 0 and wrote
  no cleanup-failure line. With a real hung electron and a CIM failure in appStop's
  `commandLineOf`, the launcher would stall until the task's 1 h limit. Fix: after app:stop, wait
  up to 10 s for `exit`. If the child is still alive, log `REFUSE cleanup FAILED: pid N still
  alive` and call `child.unref()`.
- **NEW-M4 - The unhandled check now fires on answer and transcript text** (checker:210, 358,
  368).
  - `UNHANDLED` is case-insensitive and runs on every debug line. It also runs on
    `app-start.log`, which carries all console output (the current file has 46 `[Answer] full:`
    lines).
  - An answer that mentions "uncaught exception" fails the smoke, and that is plausible for
    S2Q10, "make ingestion recoverable under duplicate delivery".
  - Reproduced: `SP\rv8\answertext` (a clean forced race plus that answer text) gives FAIL, exit 1.
  - Fix: on the debug log, match only `level === 'CRITICAL'` lines starting
    `Unhandled Rejection|Uncaught Exception`. On the extra log, anchor on crash shapes at the
    start of a line (`UnhandledPromiseRejectionWarning`, `Uncaught Exception:`,
    `A JavaScript error occurred in the main process`).
- **NEW-M5 - Off mode with no dispatch window skips the global hedge-line check** (checker:419-420
  vs 453-462). Reproduced: `SP\rv8\off-nowin` (flag off, one `[LLMHelper] verbal hedge: front=`
  line, no dispatch) gives INCONCLUSIVE, exit 3, where FAIL is correct. Fix: run the global check
  before the window-count branch.
- **NEW-M6 - The build-identity lines** (launcher:73-75 and repeats):
  - `git status` without `--no-optional-locks` can briefly take MAIN's shared `index.lock` while
    other sessions work in the checkout.
  - When git fails, the count reads `dirty-lines=0`. Reproduced in `SP\rv8\forf.cmd`: `fatal:
    not a git repository`, then `dirty-lines=0`.
  - `%%~tF` has only minute resolution (`09/26/2026 08:16 PM`).
  - Fix: use `git --no-optional-locks status --porcelain --untracked-files=no`, drop the count
    when `rev-parse` failed, and take the mtime from `%NODE% -e` in ISO form.

  Verified sound: FOR variables expand after redirections are parsed, so a single-digit count
  does not turn into `N>>`; `find` resolves to `C:\Windows\System32\find.exe`; git, node and npm
  are on PATH; `interview60.runs/` and `*.log` are gitignored, so the smoke's own logs do not
  change the count.
- **NEW-M7 - The register guard's `-or` cannot catch the case M6 is for**
  (register-smoke-hedge.ps1:47). `verbalHedge.ts` always defines `describeVerbalHedgeAtStartup`,
  so the guard passes even when `main.ts` never calls it. The launcher's guard catches this at run
  time, so the effect is small. Fix: test `main.ts` only.
- **NEW-M8 - Rules still never shown failing:**
  - forced: `no "back started" line`;
  - forced and default: `no "answer source:" line`;
  - off: the `(hedge)` label with the flag unset;
  - off: startup line absent or mismatched;
  - refuse: a segment log with neither `REFUSE` line.

  Fix: one mutation each.

## Launcher cmd flow (asked)

- **Handles.** No background writer is left. Segments 1-3 rely on smoke-turn's own `app:stop` to
  release the keeper tree before the next `>>`, the same shape as launch-smoke-stall.cmd, which
  worked. Segment 4's child can inherit only the probe's stderr handle (`wrapper-err.log`), which
  the launcher never writes again.
- **Exit codes.** SMOKE1-3 are correct. SMOKE4 is always 0 (NEW-M2). `exit /b %WORST%` is correct.
- **`for /f` git lines under Task Scheduler.** Sound, apart from NEW-M6.
- **Env.** Correct:
  - HEDGE=1 in segments 1-2 and unset from segment 3 on;
  - TRIGGER=1 only in segment 1;
  - FOLLOWUP, PRIMARY_MODEL, THINKING_LEVEL and FIRST_TOKEN_TIMEOUT cleared at the top;
  - `yes` only in the probe child.
- **File hygiene.** ASCII-only and LF-only (0 CR, 0 non-ASCII), as are the `.ps1` and the probe.

## Quota delta

Segment 4 still spends 0 requests. One addition to the worst case: a race where both legs fail
triggers withVerbalFallback, which runs the hedge again (2 more requests per occurrence). The
total still fits today's ledger.

## Evidence (throwaway, `SP\rv8\`)

- **`run-calibration.mjs`:** 29/29, exit 0 (reproduced).
- **Checker runs:**

  | Fixture | Result | Correct verdict |
  |---|---|---|
  | `unraced` | PASS, exit 0 | FAIL |
  | `bothfail` | PASS, exit 0 | FAIL |
  | `off-nowin` | INCONCLUSIVE, exit 3 | FAIL |
  | `answertext` | FAIL, exit 1 | PASS |

- **Probe, stub cwd `rv8\p`** (its `interview60.run.mjs` only records calls):
  - `stubexit1` with a 12 s deadline: `REFUSE exited code=1 after 110ms`, probe exit 0, wall 12.2 s.
  - `stubhangrv8` with a 5 s deadline: `REFUSE STILL RUNNING after 5019ms`, probe exit 0, wall
    60.3 s. No leftover process: the stub exits itself at 60 s.
- **`forf.cmd`:** outside a repo, `fatal: not a git repository` and then `dirty-lines=0`; the
  mtime prints at minute resolution.
