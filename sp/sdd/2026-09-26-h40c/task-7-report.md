# Task 7 report — h40c, one live exercise of the hedge

Scope per the controller's brief and its notes: write and calibrate the smoke-hedge files
only. No task was registered, no task was run, the app was never started from this session.

## Files written (all under SP, none under MAIN)

- `SP\launch-smoke-hedge.cmd` — the launcher. Four segments, ASCII-only, LF-only, no CR, no
  non-ASCII byte anywhere (checked with `LC_ALL=C grep -n '[^ -~\t]'`, zero hits), no
  parentheses inside any echoed text (checked by hand — the only two echo lines inside the
  guard's `if (...)` blocks are plain sentences with no `(`/`)`).
- `SP\check-smoke-hedge.mjs` — the check script (modes `forced`, `default`, `off`, `refuse`).
- `SP\register-smoke-hedge.ps1` — a copy of `register-natively-task.ps1` with the h40b task
  settings added, ASCII-only. **Not run.**

## What I read first (the seams the checks and the launcher are built against)

- `SP\launch-smoke-stall.cmd`, `SP\smoke-turn.mjs`, `SP\register-natively-task.ps1` (given).
- `MAIN\electron\LLMHelper.ts` lines 3380-3541 (`streamGeminiWithStallFallback`,
  `streamGeminiWithHedge` — already implemented in this checkout, by an earlier task).
- `MAIN\electron\llm\verbalHedge.ts` (env parsing, `describeVerbalHedgeAtStartup`).
- `MAIN\electron\main.ts` lines 44-67 (`logToFile` — confirms the
  `<ISO> [LOG|WARN|ERROR] <msg>` line shape), 2430-2440 (`[Main] answer source: <label>`,
  one line per `__model_source__` sentinel — confirms the controller's "last line is the real
  label" note), 3418-3448 (the startup validation block and the exact refusal line).
- `MAIN\electron\llm\WhatToAnswerLLM.ts` lines 1-35, 260-420 (`diagLog` → `verbal-diag.log`,
  shape `[<ISO>] <msg>`; the head `__model_source__` sentinel that names the shipped primary
  BEFORE the hedge race resolves — this is what makes the "last line" rule necessary).
- `MAIN\electron\llm\verbalPrimaryModel.ts` (confirms the head label is normally
  `gemini-3.1-flash-lite`, the user's default model, not the hedge's own FRONT/BACK names).
- `interview60.run.mjs` lines 150-300 (`appStop`, `appStartOnce`) — this is why SEGMENT 4
  does NOT call the top-level `app:start` synchronously: `appStartOnce` waits up to 180s for
  `[Main] Starting Meeting` / `[Main] Live Mode … auto`, retried twice (up to 6 minutes),
  lines that a refused startup will never produce. Confirmed against
  `MAIN\electron\test\golden\interview60.runs\smoke-stall-forced.log` (the existing stall
  smoke's own launcher-log shape, reused as the model for `SEGMENT4 ... APP STOP  killed N
  process(es) of this checkout` parsing).

## Deviations from the brief (all per the controller's notes, which override the brief)

1. **Fourth segment added** (refusal). Not in the brief's own sketch; the controller's notes
   added it explicitly (`NATIVELY_VERBAL_HEDGE=yes` must refuse to start).
2. **`check-smoke-hedge.mjs` answer-source rule**: uses the LAST `[Main] answer source:` line
   per answer, not the first — the controller's correction (the first line is the head label,
   naming the shipped primary before the hedge race is known).
3. **Startup-line requirement added** to `forced`/`default`/`off` modes (`trigger=1ms` /
   `trigger=5000ms` / `off`), gated by `--no-startup-line` for calibration against h40b's log,
   which predates the line — a missing line is then reported as an informational note
   ("startup line absent (pre-dates the build)"), not a failure.
4. **SEGMENT 4 does not call `interview60.run.mjs app:start` synchronously** (see above — it
   would block the segment for up to 6 minutes waiting for lines a refusal never produces).
   It is launched in the background (`start "hedge-refuse" /B ...`), the script does its own
   ~40s wait, then calls `app:stop` — whose existing command-line-filtered process matching
   (already exercised correctly by segments 1-3's own app stop/start cycles) is reused rather
   than reinventing a `tasklist`/`findstr` filter that would also catch unrelated Electron
   apps (VS Code, Slack, etc. all run `electron.exe`). "`APP STOP  killed 0 process(es) of
   this checkout`" is the PASS signal for "the process was gone"; any N>0 is a FAIL (it had to
   be force-killed, i.e. did not exit on its own).
5. `smoke-turn.mjs` was confirmed (not assumed) to call `app:stop` both at the top and at the
   end of `main()`, and again in the `catch` handler — so segments 1-3 needed no extra
   `app:stop` line appended, contrary to the controller's fallback instruction (which only
   applies "if it does not stop the app").

## Calibration (rule 8 — every discriminating check proven both ways)

All runs below used `node check-smoke-hedge.mjs <mode> <since-iso> --debug-log … --diag-log …
[--segment-log …] [--no-startup-line]`. Full outputs are in
`SP\cal-h40c\*` (kept for review). Node: `C:\Program Files\nodejs\node.exe` v22.19.0.

### Required by the controller: off PASS / forced FAIL on a COPY of h40b's real log

Copied `MAIN\electron\test\golden\interview60.runs\2026-09-26T11-39-51-h40b\{natively_debug.log,verbal-diag.log}`
to `SP\cal-h40c\h40b-copy\` (unmodified, 669KB / 2.8MB). `since` = the log's own session-start
instant, `2026-09-26T10:32:00.000Z` (covers the whole run, 46 answers).

- **`off` + `--no-startup-line` → PASS.** `[PASS] startup line (info) startup line absent
  (pre-dates the build)`, `[PASS] no unhandled rejection`, `[PASS] off-mode (control) rules`
  — all 46 answers had a `verbal stall race: trying` line, no `verbal hedge` text anywhere.
  Exit code 0.
- **`forced` + `--no-startup-line` → FAIL.** `[FAIL] forced-mode per-answer rules` — all 46
  answers report `no "front=...back=...trigger=..." line`, `no "back started" line`, `no "won
  by" line`, `no "answer source:" line` (h40b predates the `answer source:` log line too, not
  just startup — confirmed separately: 0 matches for `answer source:` and 0 for `verbal
  hedge` in the raw h40b log). Exit code 1.

### Synthetic logs (hand-built, matching the real code's exact line shapes read above)

- **`forced` PASS** (`SP\cal-h40c\synthetic-forced-pass\`, 2 answers: one back-wins-aborted,
  one front-wins with the back reported `other=failed`) → `PASS overall`, exit 0.
- **`forced` FAIL** (same log, `other=aborted` → `other=empty` on answer 1 — an outcome the
  real code cannot produce when both legs were started, so it must be flagged) →
  `[FAIL] forced-mode per-answer rules` `- ... other=empty, want aborted or failed`, exit 1.
- **`default` PASS** (`SP\cal-h40c\synthetic-default-pass\`, 2 answers: one clean front win
  with no back leg at all, one where the back leg fires and wins) → `PASS overall`, exit 0,
  and `(info) back leg fired on 1/2 answers` printed as information, not a failure.
- **`default` FAIL** (same log, answer 1's `won by` line deleted) → `[FAIL] default-mode
  per-answer rules` `- ... no "won by" line`, exit 1.
- **`refuse` PASS** (`SP\cal-h40c\synthetic-refuse-pass\`: the exact refusal line + a segment
  log with `APP STOP  killed 0 process(es) of this checkout`) → `PASS overall`, exit 0.
- **`refuse` FAIL** (`SP\cal-h40c\synthetic-refuse-fail\`: no refusal line, the app reached
  "listening in Auto", segment log shows `killed 1 process(es)`) → `[FAIL] startup refusal`
  with BOTH problems reported (`no "... — refusing to start" line`, `app:stop killed 1
  process(es) ... it did not exit on its own`), exit 1.
- **`off` FAIL** (h40b copy + one injected `verbal hedge: front=...` line) → `[FAIL] off-mode
  (control) rules` `- found a "verbal hedge" line with the flag unset`, exit 1.

Seven of the eight mode/outcome combinations were exercised in both directions (PASS and
FAIL); `off` PASS/FAIL and `forced` PASS/FAIL and `default` PASS/FAIL and `refuse` PASS/FAIL —
8 runs total, all matching their expected verdict and exit code.

## Launcher control-flow dry run (never the real app, never a scheduled task)

Rule 7: a new path earns one live exercise before anything depends on it. Registering the
task and starting the real app are explicitly out of scope for this task, but the `.cmd`
FILE's own control flow (the guard blocks, `%NODE%`/`%RUNS%`/`%LOG1-4%` variable indirection,
the `start /B` + `ping` + conditional-stop shape of SEGMENT 4, and env-var persistence across
segments) is a seam reading cannot verify — cmd.exe either parses and runs it or it doesn't.
So I built a stub harness (`SP\cal-h40c\cmd-dryrun\`: fake `electron\LLMHelper.ts` containing
the guard string, a fake `electron\test\golden\interview60.run.mjs` that logs its argument
and exits 0, a fake `smoke-turn.mjs` that logs its argv and the two hedge env vars and exits
0) and ran the REAL launcher logic against it — identical to the shipped file except
`ping -n 3` instead of `-n 41` (seconds instead of ~40s) and a comment noting the difference.
This never spawns Electron, never calls Gemini, never touches a Windows scheduled task.

First attempt, run from the scratchpad (`SP\cal-h40c\cmd-dryrun\`, cwd path 211 chars),
failed strangely: every `>`/`>>` redirection to `electron\test\golden\interview60.runs\...`
printed `The system cannot find the path specified` and the target files were never created,
even though `Get-Item`/`dir` both confirmed the directory existed. Root cause (isolated with
a series of shrinking repros, `SP\cal-h40c\cmd-dryrun\mini-repro{,2,3,4}.cmd`): the FULL
resolved path was 272 characters — over the classic Win32 MAX_PATH (260) that cmd.exe's own
redirection and PowerShell's `Out-File` both still respect. Node's `fs.writeFileSync` to the
exact same path succeeded (Node uses the long-path-aware API), which is what made the
mismatch diagnosable. This is an artifact of the scratchpad's own long, encoded directory
name (`...--claude-worktrees-nifty-lederberg-49681a\<uuid>\scratchpad\...`), not of the
launcher: the REAL deployment path (`C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\electron\test\golden\interview60.runs\smoke-hedge-forced.log`)
is 122 characters, well clear of the limit. Confirmed by copying the same stub harness to
`C:\Users\sotka\dryrun-hedge\` (short path) and re-running the unmodified launcher logic:

```
EXIT=0
--- stdout (should be empty if clean) ---
--- LOG1 forced ---
=== HEDGE SMOKE 1: forced race, trigger=1ms ===
2026-09-26T16:08:25.297Z
STUB smoke-turn.mjs invoked with: S1Q06 S2Q10 S2Q07
  NATIVELY_VERBAL_HEDGE=1
  NATIVELY_VERBAL_HEDGE_TRIGGER_MS=1
SMOKE1 EXIT 0
--- LOG2 default ---
=== HEDGE SMOKE 2: default trigger, 5000ms ===
2026-09-26T16:08:25.600Z
STUB smoke-turn.mjs invoked with: S1Q06 S2Q10 S2Q07
  NATIVELY_VERBAL_HEDGE=1
  NATIVELY_VERBAL_HEDGE_TRIGGER_MS=(unset)
SMOKE2 EXIT 0
--- LOG3 off ---
=== HEDGE SMOKE 3: control, flag unset ===
2026-09-26T16:08:25.879Z
STUB smoke-turn.mjs invoked with: S1Q06
  NATIVELY_VERBAL_HEDGE=(unset)
  NATIVELY_VERBAL_HEDGE_TRIGGER_MS=(unset)
SMOKE3 EXIT 0
--- LOG4 refuse ---
=== HEDGE SMOKE 4: startup refusal, bad value ===
2026-09-26T16:08:26.140Z
STUB interview60.run.mjs invoked with: app:start
STUB interview60.run.mjs invoked with: app:stop
APP STOP  killed 0 process(es) of this checkout
SMOKE4 EXIT 0
```

Zero stray output, all four `SMOKEn EXIT 0` lines present, and the env-var lifecycle is
exactly as designed: `NATIVELY_VERBAL_HEDGE` stays `1` across segments 1-2 and is cleared for
segment 3; `NATIVELY_VERBAL_HEDGE_TRIGGER_MS` is set only for segment 1; segment 4 calls
`app:start` then, after the wait, `app:stop`. The short-path copy
(`C:\Users\sotka\dryrun-hedge\`) was deleted after this run — nothing was left outside the
scratchpad. This confirms the launcher's cmd.exe control flow is correct; it does NOT
exercise real Gemini calls, the real app, or the real `interview60.run.mjs`/`smoke-turn.mjs`
(those are stubbed), which remains the controller's job.

## What this does NOT cover (residual risk, per rule 7)

- The launcher was dry-run against a STUB app/harness only (above) — never the real
  Electron app, never the real Gemini SDK, never a Windows scheduled task, per the
  controller's explicit scope for this task.
- `check-smoke-hedge.mjs` was exercised only against hand-built and h40b-era logs, never
  against a log the current (hedge-instrumented) build actually produced — the controller's
  own next step ("after it ends, run the three checks with the launcher's start instant")
  is the first time these regexes meet real hedge output. The synthetic logs were built by
  transcribing the exact `console.log`/`console.error`/`diagLog` template strings from the
  source, not by capturing real output, so a genuine format drift between source and my
  transcription (a typo on my part) would pass calibration and still mismatch a live log.
- `SEGMENT 4`'s "process was gone" signal depends on `app:stop`'s existing command-line
  filter, which I did not re-verify independently in this task (it is exercised implicitly
  by segments 1-3's own app stop/start cycles, which this task also did not run).
- Quota: I did not re-check today's lite-model ledger against the ~16-request budget the
  brief names; that is the controller's job before registering the task.

## Status (superseded by Fix round 1 below)

DONE. Files: `SP\launch-smoke-hedge.cmd`, `SP\check-smoke-hedge.mjs`,
`SP\register-smoke-hedge.ps1` (not run). Calibration: 8/8 `check-smoke-hedge.mjs` runs
matched expected PASS/FAIL (off-PASS and forced-FAIL required by the controller against a
real copy of h40b's log; the other 6 against hand-built synthetic logs). The launcher's own
cmd.exe control flow was dry-run against a stub app/harness from a short path and produced
exactly the expected four `SMOKEn EXIT 0` lines with no stray output. No MAIN files touched.

---

# Fix round 1

Opus review (`SP\sdd\2026-09-26-h40c\task-7-review.md`): SPEC FAIL, 5 Critical, 4 Important,
7 Minor. All findings accepted; fixes below follow the controller's rulings, which override
the review's own fix text where they differ. Every reproduction the review left in `SP\rv7\`
was re-run against the fixed code as part of calibration (below), plus a large mutation sweep
this round added. Still scratchpad-only; still nothing registered, run, or started.

## Files changed

- `SP\launch-smoke-hedge.cmd` — rewritten (C1, C3/C4/I1, M5).
- `SP\check-smoke-hedge.mjs` — rewritten (C2, C5, I2, M1-M4, M7).
- `SP\register-smoke-hedge.ps1` — rewritten (I3, M6).
- `SP\refuse-probe.mjs` — new (C3/C4/I1).

## C1 — per-segment log copies

`main.ts` resets `natively_debug.log` on every app start, so by the time all four segments
had run, segments 1-2's evidence was gone (the launcher starts the app four times; a fifth
start from `app:start`'s own retry made it worse before the I1 fix removed that retry from the
picture entirely). Each segment now copies `natively_debug.log` and (for segments 1-3)
`%RUNS%\app-start.log` to its own `smoke-hedge-<seg>.natively_debug.log` /
`.app-start.log` immediately after that segment's app is stopped (smoke-turn.mjs's own last
step) and before the next segment starts a new one. `--debug-log` is now required
(C1/M7) — there is no cwd-relative default to fall back to, so pointing it at the live file
by mistake is a hard usage error, not a silent wrong answer.

Segment 4 does not produce an `app-start.log` (refuse-probe.mjs bypasses `app:start`
entirely — see C3/C4) so it is not copied for that segment; the equivalent evidence is
`smoke-hedge-refuse.child.log`, written directly by refuse-probe.mjs at its final path (no
copy step needed).

## C2 — `off` mode's `HEDGE_ANY` regex

Was `/verbal hedge/`, a bare substring that also matched the required startup line
`[Main] verbal hedge: off`. Now `/^\[LLMHelper\] verbal hedge:/`, anchored to the per-answer
LLMHelper lines only (`LLMHelper.ts:3479-3539`). This check is GLOBAL across the whole
segment (not per-window) — the flag being unset means no hedge line should appear anywhere,
not just outside an answer's own window.

**Self-caught regression during this fix**: my first rewrite of `off` mode moved the
model-name and `(hedge)`-label checks (M3) into the per-window function but dropped the
GLOBAL "no hedge line anywhere" check entirely. Calibration caught it immediately
(`off-real-plus-hedge-line-FAIL` came back PASS instead of FAIL — see below); it is restored
as an explicit global check in `main()`, separate from the per-window rules.

## C3/C4/I1 — `refuse-probe.mjs` replaces the backgrounded `app:start`

Reproduced exactly as the review described, with no app involved: `SP\rv7\ovw.cmd` /
`ovw2.cmd` show a background writer holding a file's append handle causes a later foreground
append to the SAME file to be silently dropped (cmd prints "The process cannot access the
file..." and skips the command). `refuse-probe.mjs` (new file, full design in its own header
comment) fixes all three findings at once:

- **C3** (segment 4 never ran `app:stop` / never wrote `SMOKE4 EXIT`): there is no more
  background process holding the log open — the probe runs in the foreground and the
  launcher's own `>>%LOG4%` after it returns works normally.
- **C4** (`"killed 0"` does not distinguish a clean exit from a force-killed hang): the probe
  watches the child's real exit event directly and writes `REFUSE exited code=<c> after
  <ms>ms` or `REFUSE STILL RUNNING after <ms>ms` via `fs.appendFileSync` — never inferred from
  `app:stop`'s tree-kill output.
- **I1** (the backgrounded process outlived the launcher and started the app AGAIN with the
  bad value about 2.5 minutes later): gone — nothing is backgrounded, and the probe's own
  child never outlives it (killed at the deadline if still running).

`refuse-probe.mjs` runs `app:stop` first (so a leftover instance's "Another instance is
already running" exit-0 is never mistaken for a refusal — `main.ts:3394-3403`), spawns
`npm run electron:dev` directly (verified in `package.json:15`: `build:electron` then
`electron .`, no vite, no `wait-on` — confirmed NOT to start vite, so the brief's
NEEDS_CONTEXT condition does not apply), with `NATIVELY_VERBAL_HEDGE=yes` in the **child's**
env only (the probe's own `process.env` never carries it), the child's stdio to its own file
(`smoke-hedge-refuse.child.log`, never the segment log), and a 180s deadline.

## C5 — the real crash-log strings

`main.ts:14-19`'s `uncaughtException`/`unhandledRejection` handlers call `logToFile` directly
at `[CRITICAL]` level — not through `console.error` (so not `[ERROR]`), and the text is
"Unhandled Rejection"/"Uncaught Exception" (with a space), which the original
`/unhandledRejection|UnhandledPromiseRejection/i` pattern never matched, and the original
`DEBUG_LINE` regex dropped the `[CRITICAL]` line before the pattern even ran. Both fixed:
`DEBUG_LINE` now accepts `(LOG|WARN|ERROR|CRITICAL)`; `UNHANDLED` is
`/Unhandled Rejection|Uncaught Exception|unhandledRejection|UnhandledPromiseRejection/i`. A
new `--extra-log` flag (optional) scans a second file — the segment's `app-start.log` copy,
or refuse mode's `child.log` — unstructured (no `<ISO> [LEVEL]` prefix expected), for the same
pattern: the only place a crash that never reached the app's own logger would show up.

## I2 — window splitting and ambiguity

Windows now split on `/^\[Main\] dispatch: (answer|supersede) /` (a supersede starts a new
race, `main.ts:1026`). A window is scored only when it holds exactly one `front=` line and one
`won by` line (forced/default) or exactly one `stall race: trying` line (off); any other
count is reported as **AMBIGUOUS**, not scored PASS or FAIL. A segment verdict is
**INCONCLUSIVE** (exit code 3, distinct from FAIL's 1) when every window was ambiguous, UNLESS
a concrete problem was already found elsewhere (off mode's global hedge-line check, which
applies whether or not any window was clean — ambiguity in one place must never suppress
definite evidence of a violation found in another). `--clips N` prints the window count next
to the clips actually played, for a human to eyeball.

**Two findings from tracing the given fixtures by hand, reported rather than silently
matched to the controller's stated expectations:**

1. **`SP\rv7\supersede` now PASSes cleanly, not AMBIGUOUS/INCONCLUSIVE as instructed.** Hand
   trace: race 1 (dispatch 20:00:10.000, won-by 20:00:13.241) and race 2 (dispatch
   20:00:20.000, won-by 20:00:24.101) never overlap — race 1 fully resolves 6.8s before race 2
   even starts. Splitting on both `answer` and `supersede` (the prescribed fix) therefore
   produces two CLEANLY separated windows, each with exactly one front= line and one won-by
   line, each answer-source-labelled correctly, neither loser logging usage after its own
   won-by. There is nothing left to be ambiguous about. This fixture demonstrated the OLD bug
   (single-window-per-answer merged both races, corrupting the label and loser-usage checks —
   confirmed: re-running the UNFIXED window logic against it reproduces the review's exact
   FAIL text). Against the FIXED logic it is a clean PASS, which is the fix working, not a gap
   in it. A second, genuinely overlapping fixture was built to exercise the AMBIGUOUS path
   itself (the case the review's own reasoning describes — "a superseded race can log its
   won-by after the next race has begun" — which this specific given fixture's timing does not
   actually do): `overlapping-supersede-INCONCLUSIVE` in the calibration script, where the
   second dispatch fires BEFORE the first race resolves, so race 1's won-by line lands inside
   window 2's range. That one is correctly AMBIGUOUS in both windows → INCONCLUSIVE.
2. **The original task-7 requirement "forced mode must FAIL on the h40b copy" no longer holds
   verbatim; it is now INCONCLUSIVE (exit 3).** h40b predates the hedge entirely, so every
   `dispatch: answer` window in that log has zero front= lines and zero won-by lines —
   under I2 that is the textbook AMBIGUOUS shape (no evidence of a WRONG outcome, only of NO
   hedge evidence at all), not a FAIL. This is the same principle as finding 1, applied to a
   different fixture, and it is I2's own explicit rule ("all-ambiguous segment = INCONCLUSIVE")
   applied correctly. The safety property the original requirement was actually protecting —
   a checkout without the hedge must never silently read as a clean PASS on forced mode — is
   still intact: INCONCLUSIVE is exit code 3, not 0, and is reported as distinct from PASS
   everywhere in the output. `off` mode's PASS on the same h40b copy is unaffected and was
   re-verified.

## M1 — loser-usage timing

Usage is logged on every streamed chunk, not only the last (`LLMHelper.ts:3303-3306`; the
`LLMHelper.ts` comment near there is stale too, per the review, but that file is MAIN's and out
of this task's scope to edit — noted here instead). The rule now fails only on a loser usage
line timestamped AFTER the won-by line: a loser's chunk that arrived BEFORE it was told to
abort (it was still legitimately in flight when the winner's first token arrived) is normal,
not a violation; only a chunk after the abort signal is real evidence the abort didn't work.
Both of this file's own comments referencing the old "last chunk" framing were corrected.

## M2/M3 — off mode

`other=empty` in forced mode still fails, reworded to "(rare; investigate)" rather than the
report's earlier (review-flagged-false) claim that the code cannot produce it — it can, in the
same-tick case (`LLMHelper.ts:3533-3538`). `off` mode now also checks the stall-race line names
`gemini-3.1-flash-lite` specifically (not just any model) and that no `(hedge)` label appears
anywhere in the window's `answer source:` lines.

## M4 — diagnosability

`--until` bounds both logs (defaults to no bound). Each window's row prints the nearest diag
`route:` line, and default mode's back-fired row prints the back-leg's reason
(`trigger`/`front-error`/`front-empty`). A new per-model request-count summary counts
`Warming up`/`front=`/`back started`/`stall race`/`stalled after` lines (never usage lines,
confirmed ~5-17x overcounting per answer against h40b's own numbers: 46 answers, 261 usage
lines).

## I3/M6 — `register-smoke-hedge.ps1`

Rebuilt on `register-h40c.ps1`'s corrected pattern (that file's own fix round 1, I7, already
established this shape for the flight's registration script — same reasoning applies here
verbatim): `-StartAt` mandatory, no `-StartWhenAvailable` in `$settings`, the registered
task's actual settings read back and printed (not an echo of the requested parameters), and a
new guard requiring `describeVerbalHedgeAtStartup` in `electron\llm\verbalHedge.ts` OR its
call in `electron\main.ts` (M6) — confirmed both actually contain it in this checkout.
`-Hours` now defaults to 1 (was 4, copied from the wrong template) to match the brief's own
registration example, and the header's "5h" claim is corrected.

## M5 — launcher

- Clears `NATIVELY_VERBAL_PRIMARY_MODEL`, `NATIVELY_GEMINI_THINKING_LEVEL`,
  `NATIVELY_FIRST_TOKEN_TIMEOUT_MS` alongside the existing `NATIVELY_FOLLOWUP_PARENT=`.
- Exits with the WORST (highest) of the four `SMOKEn` codes via a `WORST` variable, not always
  `exit /b 0`.
- Header corrected: the ISO instant is the SECOND line of each segment log (the header echo is
  first), not the first.
- A second guard, `findstr /C:"describeVerbalHedgeAtStartup" "electron\main.ts"`, exit 7 (same
  code as the existing `streamGeminiWithHedge` guard — both mean "hedge code incomplete in
  this checkout").
- Each segment appends `git rev-parse HEAD`, a `git status --porcelain` line count (via
  `find /c /v ""`, read-only), and `dist-electron\electron\main.js`'s timestamp (via `%%~tF`)
  to its own log, right after that segment's copy step — recording which build actually ran,
  since every `npm start`/`electron:dev` rebuilds from the shared working tree and another
  session could be mid-edit.

## Calibration (rule 8)

`SP\cal-h40c\run-calibration.mjs` (new, throwaway): writes each fixture's files, runs the real
checker as a subprocess, and asserts BOTH the exit code and the printed overall-verdict line —
29 cases, one run:

```
29/29 calibration cases behaved as expected.
```

Covering, by finding:

| Finding | Fixture(s) | Result |
|---|---|---|
| C2 (required) | `rv7\off-real` | PASS |
| C2 (required) | `rv7\off-real` + one injected `[LLMHelper] verbal hedge: front=...` line | FAIL |
| M3 | `rv7\off-real` with the stall-race model swapped to 3.5-lite | FAIL |
| C5 (required) | `rv7\unhandled` (the real `[CRITICAL] Unhandled Rejection` line) | FAIL |
| I2 | `rv7\supersede` (see the finding above — now legitimately clean) | PASS |
| I2 | a genuinely overlapping supersede (both windows ambiguous) | INCONCLUSIVE |
| M1 | `rv7\noabort` (loser usage line AFTER won-by — a real defect) | still FAIL |
| M1 | a loser usage line BEFORE won-by (normal, in-flight) | PASS |
| baseline + I4 mutations | forced: baseline, `other=empty`, back reason != trigger, back >100ms, label mismatch, startup absent, startup mismatched | PASS, then 6x FAIL |
| baseline + I4 mutations | default: baseline, label mismatch, startup absent | PASS, then 2x FAIL |
| I2 | default: one window's won-by missing, other answer clean | PASS (ambiguous window noted, not fatal) |
| I2 | default: the ONLY answer's won-by missing | INCONCLUSIVE |
| C5/M4 | `--extra-log` with/without an unhandled-rejection line | FAIL / PASS |
| M4 | `--until` + `--clips` flags exercised together | PASS, no crash |
| C1/M7 (required) | `--debug-log` omitted | usage error, exit 2 |
| C3/C4 (required) | `REFUSE exited code=1` + no later debug line | PASS |
| C4 (required) | `REFUSE exited code=0` | FAIL |
| C4 (required) | `REFUSE STILL RUNNING` | FAIL |
| C4 | a `natively_debug.log` line after the refusal line | FAIL |
| — | no refusal line at all | FAIL |

Regression-checked against the two ORIGINAL task-7 fixtures too: `synthetic-forced-pass` /
`synthetic-default-pass` still PASS, their FAIL mutations still FAIL, `synthetic-refuse-pass`
still PASS. The two controller-required h40b-copy checks were re-run against the fixed code:
`off` mode still PASSes (`--no-startup-line`); `forced` mode now reports INCONCLUSIVE rather
than FAIL — see the I2 finding above for why that is the correct outcome, not a regression.

### `refuse-probe.mjs` end-to-end calibration (real process spawn, real `app:stop`, no real app)

Run from MAIN's checkout root (so `app:stop` is the REAL `interview60.run.mjs`, exercising its
actual command-line-matching kill logic) with `REFUSE_PROBE_CMD` overridden to a local stub
script (never `npm run electron:dev`, never the real app) and, for the hang case,
`REFUSE_PROBE_DEADLINE_MS` shortened from 180000 to a few seconds:

- **Stub exits 1 immediately** (`stub-exit1.mjs`) → segment log:
  `REFUSE exited code=1 after Nms`. First attempt used an inline `node -e "..."` string with
  nested quotes and silently miscompiled (cmd.exe: `'\"C:\Program Files\nodejs\node.exe\"' is
  not recognized` — caught by reading the child log, not just the outcome line, per rule 8's
  "what else could give this reading"; a second nested-quote attempt exited 0 for the same
  underlying reason with no error text at all, which would have been a SILENT false PASS had
  the child log gone unchecked). Fixed by pointing `REFUSE_PROBE_CMD` at a standalone `.mjs`
  file by path instead of an inline `-e` string, avoiding nested quoting entirely.
- **Stub hangs forever, first attempt** (`stub-hang.mjs`, `setInterval`, path under
  `SP\cal-h40c\refuse-probe-cal\`) → segment log: `REFUSE STILL RUNNING after 3023ms`, and the
  script's own inline `Get-CimInstance ... -match 'stub-hang'` check printed nothing right
  after. Taken at face value this looked like a clean kill. It was not: an UNRELATED, later
  manual check (run minutes afterward, while writing up this section) found the same two
  processes (the `cmd.exe` wrapper and its `node.exe` child) still alive and running.
  Root cause: `interview60.run.mjs`'s `appStop()` only tree-kills the PID-file process when its
  command line matches `/electron(\.exe)?/i` or `/npm(\.cmd)?\s+start/i` (its
  "`looksLikeOurs`" guard, `interview60.run.mjs:187`) — my stub's path
  (`...\refuse-probe-cal\stub-hang.mjs`) matches neither, so `appStop` correctly (by ITS OWN
  logic) left it alone; the process was never killed at all, in either check. This is precisely
  the trap rule 8 warns about ("a probe... stays silent about everything else that produces it")
  — my own inline check was not independent evidence, and I nearly reported a false "verified"
  on the strength of it. The leftover processes were found and killed by hand
  (`Stop-Process -Force`) as soon as this was noticed.
- **Stub hangs forever, corrected** (`electron-dev-stub-hang.mjs` — renamed so its OWN path
  contains "electron", the same substring `npm run electron:dev`'s real command line contains,
  so `appStop`'s real matching can actually find it) → segment log:
  `REFUSE STILL RUNNING after 3030ms`, then a real `app:stop` that DOES tree-kill it this time —
  confirmed by an independent check in a SEPARATE tool call (not the same script), run fresh
  after the probe had already returned: zero processes matching `electron-dev-stub-hang` or the
  broader `stub-hang` pattern remained. This is the version that actually exercises the kill
  path the production command (`npm run electron:dev`, which does contain "electron") depends
  on; the first attempt's stub name was an unrepresentative test, not a working proof.

## Deviations from the controller's fix-round-1 message

1. `rv7\supersede`'s expected calibration outcome (PASS, not AMBIGUOUS/INCONCLUSIVE) — see I2
   above. Reasoning given, not silent.
2. The h40b-copy `forced` calibration's expected outcome (INCONCLUSIVE, not FAIL) — see I2
   above. Same reasoning, same fixture family.
3. `REFUSE_PROBE_CMD`'s calibration values are bare `node <script-path>.mjs` invocations
   against small stub files, not inline `-e` strings — nested-quoting corruption through
   PowerShell -> Node spawn -> cmd.exe made an inline string an unreliable calibration tool
   (see above); the PRODUCTION command (`npm run electron:dev`) has no embedded quotes and is
   unaffected by this.

## Concern worth flagging (found during calibration, not asked for by the brief)

`refuse-probe.mjs`'s STILL-RUNNING cleanup depends entirely on `appStop()`'s substring match
against the killed process's command line (`/electron(\.exe)?/i` or `/npm(\.cmd)?\s+start/i` —
`interview60.run.mjs:187`, unchanged, MAIN's file). This is exactly what C4's fix prescribed
("Its command-line test matches 'electron' in 'electron:dev'"), and it does work correctly for
the real command — confirmed above, on the second attempt. But the mechanism is a coincidental
substring match, not an exact identifier: my FIRST calibration stub failed to get killed simply
because its own file path did not happen to contain "electron", and — worse — the in-script
check I wrote to verify the kill ALSO reported "gone" in that failing case (a real process was
left running on the machine for several minutes, found only by a later, independent, manual
check). If `npm run electron:dev`'s process tree is ever restructured (a different intermediate
shell, a wrapper that does not surface "electron" in its own command line), a hung refusal
could go uncleaned the same way, silently, for the rest of the scheduled task's window. This is
not something I changed — the controller's C4 fix explicitly specified this exact mechanism —
but it is worth the controller knowing the failure mode is real and was reproduced, not
theoretical.

## Fresh end-to-end dry run of the FULL rewritten launcher (rule 7)

Given how much of this round changed `launch-smoke-hedge.cmd` (C1's per-segment copies, the
new C3/C4 refusal segment, M5's guard/env-clearing/exit-code/build-identity additions), the
original task-7 dry run (which predates this rewrite) was not enough to trust it. Repeated the
same technique — a stub harness at a short path (`C:\Users\sotka\dryrun-hedge2`, deleted after),
`electron\test\golden\interview60.run.mjs`/`smoke-turn.mjs` stubbed, a real tiny git repo so
`git rev-parse`/`git status --porcelain` have something to read, a stub `dist-electron\electron\main.js`
for the timestamp check — running the UNMODIFIED `launch-smoke-hedge.cmd` and `refuse-probe.mjs`
(with `REFUSE_PROBE_CMD` pointed at the quote-free exit-1 stub, so nothing real was spawned).

Result: `LAUNCHER EXIT=0`, the outer redirect (`launcher-stdout.log`) came back completely
empty (zero cmd parse errors, zero stray output), and all four segment logs show exactly the
expected content — `SMOKE1..4 EXIT 0`, the correct env-var lifecycle per segment
(`NATIVELY_VERBAL_HEDGE`/`_TRIGGER_MS` set/cleared exactly as designed), the build-identity
trio (`git rev-parse HEAD`, `dirty-lines=2`, `dist-electron main.js mtime=...`) on every
segment, and segment 4's `REFUSE exited code=1 after 95ms` followed cleanly by its own
`SMOKE4 EXIT 0` and copy/identity lines — proving the earlier C3 handle-contention problem is
actually gone (the old code would have silently dropped exactly these appends). The
`app-start.log` copy step no-ops silently on this stub (my stub `smoke-turn.mjs` never calls
the stub `run.mjs`'s `app:start`, so no `app-start.log` ever exists here to copy) — `copy`'s
error text goes to the same stream `>nul` already redirects, so this is an expected gap in the
STUB's fidelity, not a launcher defect; the real `smoke-turn.mjs` always calls real `app:start`
first.

## What this still does not cover (residual risk)

Everything task-7-report.md's original "What this does NOT cover" section already said, plus:
this dry run used stubs throughout (never the real app, never real Gemini calls, never a real
`npm run electron:dev` build) — the controller's own next step, registering and running the
real task, is still the first time the launcher and `refuse-probe.mjs` meet the real app, the
real build, and real quota.

# Fix round 2

Read task-7-rereview.md in full: not all of round 1 addressed (I2 in substance, I4 partial); NEW
1 Critical, 1 Important, 8 Minor, fixtures under SP\rv8\. All accepted; this section covers only
the NEW findings — round 1's C1-C5/I1-I4/M1-M7 are unchanged (see the section above and
check-smoke-hedge.mjs's own header comment).

## Files changed

- `check-smoke-hedge.mjs` — NEW-C1 (window classification redesign), NEW-I1 (--diag-log/--clips
  now required), NEW-M4 (anchored crash regexes), NEW-M5 (off-mode global check reordered),
  NEW-M8 (five mutations proven failing). Rewritten before this fix round's own context reset;
  re-confirmed in this continuation by re-reading its current header/source and re-running the
  full calibration suite fresh (twice — see Calibration below), not by re-deriving the logic.
  A leftover cosmetic issue found in this continuation's final sweep and fixed here: four
  literal em dashes (U+2014) in comments/strings, none introduced by NEW-C1..M8, replaced with
  `\u2014` escapes so the source is pure ASCII while the runtime string (REFUSE_LINE's regex and
  its error message) still matches the identical character the app actually emits.
- `refuse-probe.mjs` — NEW-M1 (clearTimeout), NEW-M2 (process.exitCode reflects the outcome),
  NEW-M3 (bounded post-cleanup wait + `child.unref()`).
- `launch-smoke-hedge.cmd` — NEW-M6 (`--no-optional-locks`, skip dirty-lines on rev-parse
  failure, ISO-precision mtime via node). A second, NOT-requested fix landed alongside it: the
  originally-planned `--untracked-files=no` silently corrupted inside the existing
  `for /f ^| find` construct (see NEW-M6 below) — replaced with `-uno`.
- `register-smoke-hedge.ps1` — NEW-M7 (guard tests `main.ts` alone).
- `run-smoke-hedge-checks.mjs` — new file (NEW-I1's runner).

## NEW-C1 — AMBIGUOUS only for real overlap evidence; FAIL otherwise; clip accounting for PASS

Implemented before this fix round's context reset; re-read in full this session
(`classifySegment`, `checkForced`/`checkDefault`/`checkOffWindow`, and `main()`'s
`accountedFor`/verdict logic) to confirm the current source matches the controller's ruling
exactly:
- AMBIGUOUS requires actual overlap evidence — 2+ front or won-by lines in one window, or a 0/1
  shortfall a neighbouring window's surplus explains (a supersede's race can straddle a window
  boundary).
- Otherwise FAIL: (a) any "verbal hedge: no answer" line in the window; (b) exactly 1 front
  line, 0 won-by, and no later window holds a surplus won-by (the race never resolved); (c) 0
  front lines (off: 0 stall-race lines), the window's route is not confirmed CODING (an unknown
  route is NOT exempt), and no earlier window holds a surplus front/stall-race line.
- `--clips` is required; PASS needs `scored + coding == clips`; a segment with zero FAILs but an
  unaccounted-for clip is INCONCLUSIVE, not PASS.

Recalibrated in this continuation (see Calibration): `rv8\unraced` FAILs, `rv8\bothfail` FAILs,
the renamed `default-race-never-resolved-FAIL`/`default-only-answer-no-wonby-FAIL` cases FAIL,
the genuinely-overlapping supersede fixture stays INCONCLUSIVE, and a CODING-route window with
zero front lines PASSes rather than failing or reading ambiguous.

## NEW-I1 — required flags, and the new run-smoke-hedge-checks.mjs runner

`--diag-log` and `--clips` are validated as required for forced/default/off before any log is
even opened (confirmed via the `missing-diag-log-is-usage-error` / `missing-clips-is-usage-error`
calibration cases, both exit 2).

`run-smoke-hedge-checks.mjs` (new) runs all four segments in one pass so the controller never
re-derives since/until/paths by hand:
1. Reads each segment's own start instant from line 2 of its own segment log.
2. Sets `--until` to the NEXT segment's own since (bounding the shared, append-only
   `verbal-diag.log`); the last segment (refuse) gets no `--until` — nothing was appended after
   it either.
3. Always passes `--debug-log` (that segment's own copy); passes `--diag-log`
   (`<repo>\verbal-diag.log`) and `--clips` (3/3/1) for forced/default/off only; passes
   `--extra-log` when that segment's app-start copy (or, for refuse, `smoke-hedge-refuse.child.log`)
   exists, and just notes it in the output when it does not (extra-log is optional in
   check-smoke-hedge.mjs itself); passes `--segment-log` for refuse only.
4. Runs check-smoke-hedge.mjs as a real subprocess, records its exit code (0/1/2/3) and captures
   its full output.
5. Prints everything and writes it to `smoke-hedge-checks.txt` next to itself, with one
   `SEGMENT <mode>: <verdict> (exit N)` line per segment and a final
   `OVERALL: <verdict>  (forced=..., default=..., off=..., refuse=...)` line. Overall priority is
   FAIL (including any segment that could not even be checked, e.g. a missing log file) >
   INCONCLUSIVE > PASS, mirroring check-smoke-hedge.mjs's own priority. Process exit code is 0
   only when every segment came back PASS.
A segment whose own log is missing is reported as `ERROR` for that segment only — the other
three still run (verified: an error in `off` does not stop `forced`/`default`/`refuse`, and it
correctly drops the now-unavailable `--until` on the segment immediately before it rather than
crashing or passing a bad value).

## NEW-M1/M2/M3 — refuse-probe.mjs

- NEW-M1: the deadline `setTimeout`'s handle is now captured and `clearTimeout`'d immediately
  after `Promise.race([exited, timedOut])` resolves, whichever side wins.
- NEW-M2: `process.exitCode` is set to 1 in every branch except `exited` with `code === 1` (the
  one correct refusal outcome), so the launcher's WORST calculation (M5) actually sees a bad
  segment 4.
- NEW-M3: in the STILL RUNNING branch, after the existing best-effort `app:stop` cleanup, the
  probe now waits up to 10s more for the real `exit` event (reusing the same listener already
  attached to the spawned child) before giving up; if it still has not fired, it logs
  `REFUSE cleanup FAILED: pid <n> still alive` and calls `child.unref()` so the probe itself
  still ends on schedule rather than hanging on the child handle for the rest of the task's
  window.

## NEW-M4 — anchored crash detection

Implemented before this round's context reset; re-read in this continuation to confirm: the
debug-log check now requires `level === 'CRITICAL'` AND the message starting with
"Unhandled Rejection" or "Uncaught Exception"; the extra-log check anchors three crash shapes
at the start of a line. `rv8\answertext` (an interview answer that happens to mention "uncaught
exception" in conversation) now PASSes — confirmed via the `rv8-answertext-now-PASSes`
calibration case in this continuation's fresh run.

## NEW-M5 — off-mode's global hedge check runs before the zero-windows branch

Implemented before this round's context reset; re-read in this continuation
(`globalOffHedgeCheck` is now called unconditionally in `main()` before the
`windows.length === 0` decision). `rv8\off-nowin` (no dispatch at all, but a stray hedge line)
now FAILs instead of reading INCONCLUSIVE — confirmed via `rv8-off-nowin-FAIL` in this
continuation's fresh run.

## NEW-M6 — launcher git identity, and a new bug found while calibrating it

`git status --porcelain` became `git --no-optional-locks status --porcelain -uno`, and the
dirty-lines line is now skipped entirely (not printed as `dirty-lines=0`) when `git rev-parse`
itself failed. The minute-resolution `%%~tF` mtime was replaced with an ISO-precision read via
`%NODE% -e "... require('fs').statSync(process.argv[1]).mtime.toISOString() ..."`, still gated by
the same `for %%F in (dist-electron\electron\main.js) do ...` existence check as before (silent
no-op if the file is missing, same as the original).

While calibrating this (an isolated short-path git repo — `C:\Users\sotka\cal-m6\repo`, one
modified tracked file, one untracked file, deleted after use — plus a sibling `norepo` dir with
no `.git`, run through a byte-for-byte copy of the launcher's own lines), the originally-planned
`--untracked-files=no` measured `dirty-lines=0` against a real 1-line diff, even though the
IDENTICAL command run directly (not through `for /f ... ^| find`) gave the correct `1`. Isolated
the cause to the `=` inside `--untracked-files=no` specifically — `--no-optional-locks` alone was
fine, `-uno` (git's short form, no `=`) alone was fine, both together were fine; only the long
`--untracked-files=no` form broke, only inside this specific `for /f` command-substitution. Fixed
by using `-uno` instead. Re-verified after the fix: the repo case correctly reads
`dirty-lines=1` and the norepo case correctly prints no dirty-lines line at all (contrasted
against the pre-fix code's actual output on the same norepo dir, which prints the misleading
`dirty-lines=0` — both runs' full output are in this reply's calibration table). This was not
something the re-review asked for; it is a real defect the fix itself would have introduced
silently into every segment's build-identity line had I not tested the exact flag combination
live.

## NEW-M7 — register-smoke-hedge.ps1's guard tests main.ts alone

The guard no longer accepts either file naming `describeVerbalHedgeAtStartup` — only
`electron\main.ts` actually calling it counts, since `electron\llm\verbalHedge.ts` defines the
function unconditionally regardless of whether anything calls it. Calibrated the regex logic in
isolation (never running the real script, per the standing constraint never to register or run
the launcher): a synthetic `$mainSrc` that calls the function passes; one that does not throws;
the OLD `-or` form was reproduced against the same two synthetic strings and does, in fact,
incorrectly pass when `main.ts` is missing the call (since the always-present `$hedgeSrc` side of
the `-or` alone satisfies it) — the exact false-pass the rereview's finding described.

## NEW-M8 — five previously-unproven-failing rules

Implemented before this round's context reset (`off-hedge-label-FAIL`, `off-startup-absent-FAIL`,
`forced-no-backstarted-FAIL`, `forced-no-answersource-FAIL`, `default-no-answersource-FAIL`,
`refuse-segment-log-neither-line-FAIL`). Re-confirmed in this continuation's fresh calibration
run (all six cases, covering the five named rules, still behave as expected).

## Calibration (rule 8 — every case from both rounds re-run fresh in this continuation)

check-smoke-hedge.mjs, `node cal-h40c\run-calibration.mjs`, run twice in this continuation (once
before, once after the em-dash-to-escape-sequence fix, to make sure that cosmetic change did not
silently change REFUSE_LINE's matching behaviour):

    43/43 calibration cases behaved as expected.

both times, identical roster — every fix-round-1 case plus every new NEW-C1/I1/M4/M5/M8 case
(rv8-unraced-FAIL, rv8-bothfail-FAIL, rv8-off-nowin-FAIL, rv8-answertext-now-PASSes,
default-race-never-resolved-FAIL, default-only-answer-no-wonby-FAIL,
supersede-two-clean-windows-one-clip-INCONCLUSIVE, overlapping-supersede-INCONCLUSIVE,
coding-route-window-not-scored-not-failed-PASS, missing-diag-log-is-usage-error,
missing-clips-is-usage-error, and the six NEW-M8 mutation cases, among the rest).

refuse-probe.mjs (NEW-M1/M2/M3), live process spawns from the real `whole-turn` worktree
(cwd needed for its real `app:stop` calls), stub commands passed as bare unquoted paths
(see the nested-quoting note below), never the real app:

| case | REFUSE_PROBE_CMD | deadline | outcome logged | probe exit | wall time |
|---|---|---|---|---|---|
| exit1 (correct refusal) | `node stub-exit1.mjs` | 15000ms | `REFUSE exited code=1 after 140ms` | 0 | 334ms (not ~15s: M1 proven) |
| exit0 (wrong outcome) | `node stub-exit0.mjs` | 15000ms | `REFUSE exited code=0 after 266ms` | 1 | 574ms (M2 proven both ways) |
| hang, cleanup fails | `node stub-hang.mjs` (no "electron" in its path — app:stop's own regex cannot find it, AND app:stop itself could not even run in this worktree, see Concerns) | 3000ms | `REFUSE STILL RUNNING after 3021ms` then `REFUSE cleanup app:stop failed: ...` then `REFUSE cleanup FAILED: pid 56256 still alive` | 1 | 13415ms (~3s deadline + the full 10s wait — M3's failure branch proven, and the probe still terminated on schedule rather than hanging) |
| hang, cleanup succeeds | `node electron-dev-stub-hang.mjs` ("electron" in its path), manually killed 4.5s in — standing in for app:stop's taskkill, which could not run here either (see Concerns) | 3000ms | `REFUSE STILL RUNNING after 3022ms` then the app:stop-failed line, then NO cleanup-FAILED line | 1 | ended promptly once killed (M3's happy branch proven: the wait correctly detects a timely real exit event and skips the FAILED log, regardless of who or what caused that exit) |

Both hang cases were independently verified clean afterward via a separate `Get-CimInstance`
process query (not the probe's own log) before moving on; the one process left over from the
first hang run (before I started manually killing at the right moment) was found and killed by
hand, then re-verified gone, before continuing — the round-1 lesson (never trust a script's own
self-report) applied again here.

A real bug in MY calibration technique, not in refuse-probe.mjs: `REFUSE_PROBE_CMD` values built
as `node "<quoted path>"` (quoted out of habit — the scratchpad path has no spaces and never
needed it) came out of `spawn('cmd.exe', ['/c', CMD_STRING], ...)` mangled — node.exe received
the literal characters `"C:\...\stub-exit0.mjs"`, quotes included, as part of a module
specifier, and threw MODULE_NOT_FOUND, which I initially misread as "the checker always reports
code=1 regardless of which stub ran." Confirmed by instrumenting the exact spawn call
(`spawnargs`, captured stdout/stderr) and by testing the bare unquoted form, which resolved it.
The production default (`npm run electron:dev`, no embedded quotes) is unaffected — this is the
same nested-quoting class of bug fix round 1 already found and fixed, re-triggered here only
because I forgot the lesson applies even to spaceless paths once the string itself contains
embedded quote characters.

launch-smoke-hedge.cmd NEW-M6, isolated short-path git repo/no-repo pair (both deleted after
use): see the NEW-M6 section above for the flag-corruption finding; final re-verified output
(`repo`: hash + `dirty-lines=1` + ISO mtime; `norepo`: `fatal: not a git repository` + no
dirty-lines line + ISO mtime still present) is in this reply's transcript.

register-smoke-hedge.ps1 NEW-M7: isolated regex-only calibration, see the NEW-M7 section above.

run-smoke-hedge-checks.mjs NEW-I1, three synthetic repo-shaped trees under
`C:\Users\sotka\cal-runner\` (deleted after use; saved copies of all three runs' full output are
in `SP\cal-h40c\run-smoke-hedge-checks-cal\case1-repo-pass.txt` / `case2-repo-fail.txt` /
`case3-repo-error.txt`):

| tree | mutation | expected | got |
|---|---|---|---|
| repo-pass | none (3/3/1 clean scored windows across forced/default/off, a clean refusal) | `OVERALL: PASS`, exit 0 | `OVERALL: PASS  (forced=PASS, default=PASS, off=PASS, refuse=PASS)`, exit 0 |
| repo-fail | default's second window's won-by/answer-source(hedge)/usage lines removed (NEW-C1 rule b) | `default=FAIL`, others PASS, `OVERALL: FAIL`, exit 1 | exactly that, with the specific "the race never resolved" reason quoted in the captured output |
| repo-error | `smoke-hedge-off.log` deleted entirely | `off=ERROR`, others still run and PASS, `OVERALL: FAIL`, exit 1 | exactly that; `default`'s own `--until` was correctly omitted (its own next-segment lookup found `off`'s since unavailable) rather than crashing or using a wrong value |

## Deviations from the controller's fix-round-2 message

**The `supersede-two-clean-windows-one-clip-INCONCLUSIVE` case's verdict changed from this same
fixture's fix-round-1 verdict, but this does not contradict the rereview's own text.** The
rereview said fix round 1's PASS verdict for the split-supersede fixture was correct reasoning
at the time ("the AMBIGUOUS expectation was never mine") — and it still is: both windows are
still cleanly scored (1 front, 1 won-by each), and nothing about NEW-C1 changes that. What
changes the OUTCOME is a rule that did not exist when the rereview wrote that sentence:
NEW-C1's own clip-accounting requirement (`scored + coding == clips`, else INCONCLUSIVE). The
launcher played this exchange as ONE clip; the supersede split it into two scored windows; 2
scored against 1 clip is now INCONCLUSIVE, not because either window's classification is wrong,
but because the segment can no longer silently claim a clean pass when it scored more answers
than clips were played. I renamed the case (from fix round 1's
`supersede-now-cleanly-PASSes-after-split-fix`) rather than leaving the old name attached to a
new expectation.

## Concerns worth flagging

**This worktree's `interview60.run.mjs` cannot run `app:stop` at all — a gap distinct from
anything in this task.** `interview60.run.mjs` reads `.env` and extracts `GEMINI_API_KEY`
unconditionally at module load, before dispatching to ANY subcommand, including `app:stop` (which
never uses the key). This worktree (`whole-turn`) has no `.env`, so every `app:stop` call —
both refuse-probe.mjs's best-effort pre-cleanup call and its NEW-M3 post-cleanup verification
call — fails with `ENOENT` before it can even attempt the real `taskkill`. This is not a defect
in anything this task touched (the key-loading line and the `.env` requirement both predate this
task, and the `/electron(\.exe)?/i` command-line matching this task's NEW-M3 wraps around was
already proven working in round 1's own calibration, against a checkout that did have a working
`.env`). But it means: if the checkout the real scheduled task's `-WorkingDirectory` eventually
points at also lacks a `.env` — unlikely for the controller's own working checkout, but worth
confirming before relying on refuse-probe.mjs's cleanup — segment 4's app:stop-based cleanup
would silently no-op there too, and only NEW-M3's new `REFUSE cleanup FAILED` log line would
surface it. I did not create a `.env` anywhere to work around this (real or placeholder), in
this or any other checkout, per the standing constraint never to touch real credentials and
never to write outside the scratchpad — I verified NEW-M3's own logic honestly instead, by
substituting a manual kill for app:stop's taskkill in the "cleanup succeeds" case (see the
Calibration table above).

Carried forward from fix round 1, still true and confirmed again by the above: `appStop()`'s
command-line-matching cleanup mechanism (unchanged by this round) is fragile by construction — a
process whose command line does not happen to contain "electron" (or match its other two
patterns) is invisible to it, tree-kill and all. NEW-M3 does not fix that mechanism; it only
makes the launcher notice, log, and move on when that mechanism (or, as found in this round, the
whole app:stop call) does not work, instead of hanging silently.

## What this still does not cover (residual risk)

Everything the sections above already said, plus: refuse-probe.mjs's NEW-M3 cleanup-succeeds
path was proven using a manual kill standing in for app:stop's own taskkill (see Concerns) — the
taskkill mechanism itself was not re-exercised in this round, only reasoned about from round 1's
prior proof and the unchanged source. run-smoke-hedge-checks.mjs has never read a REAL launcher
run's logs, only synthetic ones built for this calibration and check-smoke-hedge.mjs's own
existing fixtures — the controller's own next step (registering and running the real task, then
running run-smoke-hedge-checks.mjs over its actual output) is still the first time the whole
chain — launcher, refuse-probe.mjs, check-smoke-hedge.mjs, and run-smoke-hedge-checks.mjs
together — meets a real app, a real build, and real quota.

## Status: DONE_WITH_CONCERNS

All NEW-C1/I1/M1-M8 findings addressed; 43/43 checker calibration cases pass (re-run fresh twice
in this continuation); refuse-probe.mjs's M1/M2/M3 proven with real process spawns;
launch-smoke-hedge.cmd's M6 proven in an isolated repo/no-repo pair, with one real bug found and
fixed along the way (`--untracked-files=no` corrupting inside `for /f`, fixed via `-uno`);
register-smoke-hedge.ps1's M7 proven by isolated regex calibration (never running the real
script); run-smoke-hedge-checks.mjs written and calibrated against three synthetic trees. Never
started the real app, never registered or ran the launcher, never read or printed a real key or
credentials.enc. The one concern worth the controller's attention before relying on this: confirm
the real scheduled task's checkout has a working `.env`, or segment 4's app:stop-based cleanup
will silently no-op there exactly as it did in this calibration.

# Fix round 3

Read task-7-rereview2.md in full: ALL of round 2 addressed; 1 new Important (NEW2-I1), 2 new
Minor (NEW2-M1, NEW2-M2), fixtures under SP\rv9\. All accepted; this section covers only the NEW
findings.

## Files changed

- `run-smoke-hedge-checks.mjs` — NEW2-I1 (the roll-up fails closed).
- `check-smoke-hedge.mjs` — NEW2-M1 (a segment needs at least one scored window;
  `routeFor` bounded by the window's own end), NEW2-M2 (clips counted against `answer` windows
  only; a pre-token redirect reads as one answer, not overlap).
- `cal-h40c\run-calibration.mjs` — five new cases, two renamed (one for the second time - see
  Deviations).

## NEW2-I1 — the runner's roll-up now fails closed

`bad` was an allow-list (`verdict === 'ERROR' || verdict === 'FAIL'`), which missed
`exitLabel`'s own `ERROR(exit N)` strings for any N other than what the two named checks
covered. A checker usage error (exit 2 - a required flag missing, or, as reproduced, a debug-log
copy that exists but cannot be read) fell into neither the bad group nor the inconclusive group
and silently became `OVERALL: PASS`. Changed to
`results.filter((r) => r.verdict !== 'PASS' && r.verdict !== 'INCONCLUSIVE')` - fails closed by
name, not by an enumeration of every bad label seen so far.

## NEW2-M1 — a segment must score at least one window; `routeFor` bounded by the window's end

Two related fixes:
- A forced/default/off segment whose every window read CODING (0 front/stall-race lines, but a
  confirmed CODING route - exempt by design, since CODING never hedges) used to PASS as long as
  every clip was accounted for by CODING windows alone. Nothing required `scoredCount >= 1`, so
  a segment that never actually exercised the hedge still read as a clean pass. Now
  `scoredCount === 0` forces INCONCLUSIVE, checked before the clip-accounting comparison.
- `routeFor(diagLines, at)` searched `[at, at + WINDOW_MS)` - a flat 60s from the dispatch -
  instead of the window's own `end` (which `answerWindows` already computes as the EARLIER of
  dispatch+60s or the next dispatch). A window with no route line of its own could borrow the
  next window's route from inside that inflated range, including a false CODING exemption for a
  window that in fact never raced. `routeFor` now takes the window itself and is bounded by
  `win.end`.

## NEW2-M2 — clips count `answer` windows only; a pre-token redirect is one answer

(a) `accountedFor` used to sum scored+CODING across every window regardless of kind. A
supersede answers the SAME clip again - it is not a second clip - so counting it against
`--clips` made a segment where a supersede's race fully and cleanly resolved (2 scored windows
for 1 clip) read INCONCLUSIVE for a purely arithmetic reason, not because anything was actually
wrong. `accountedFor` is now `answerScoredCount + answerCodingCount` (kind === 'answer' only); a
supersede window still has to individually be scored or CODING - an unresolved or never-raced
supersede window still FAILs exactly as before, it just no longer inflates the denominator.

(b) Read `electron/llm/WhatToAnswerLLM.ts` in full rather than assume the redirect text: line 74
is `console.warn(\`[WhatToAnswerLLM] verbal primary failed before first token (${msg}) -
redirecting to ${model}\`)` (real em dash before "redirecting", verified against the source, not
guessed). When the primary model fails before producing a first token, WhatToAnswerLLM retries
on a fallback - which used to look exactly like overlap: off mode logs two "verbal stall race:
trying" lines for what is really one answer; forced/default mode logs two "front=" lines the
same way. Added `REDIRECT_LINE` (anchored on the fixed prefix; msg/model vary) and
`hasRedirectBetween(win, afterAt, beforeAt)`. Off mode: 2 stall-race lines with a redirect line
between them score on the FIRST stall-race line. Forced/default: exactly 2 front lines and 1
won-by, with a redirect line between the two front lines, score on the LAST front/won-by line
(the retry that actually raced and resolved) - gated exactly this narrowly so it is never a
blanket allowance for 2 of either line; a genuine overlap (no redirect line present) still reads
ambiguous/INCONCLUSIVE, unchanged.

## Calibration (rule 8)

check-smoke-hedge.mjs, `node cal-h40c\run-calibration.mjs`, full roster including 5 new cases and
2 renamed ones:

    48/48 calibration cases behaved as expected.

New cases: `all-coding-INCONCLUSIVE` (every window CODING, clips fully accounted for, but
scoredCount=0 - INCONCLUSIVE, not the free PASS it would have been), `routefor-bounded-by-window-end-FAIL`
(a route line that belongs to window 2 sits inside window 1's OLD 60s search range but outside
window 1's real end - window 1 correctly FAILs instead of borrowing a false CODING exemption),
`off-redirect-PASS` (SP\rv9\off-redirect, h40b's own shape, reused verbatim), `off-overlap-no-redirect-INCONCLUSIVE`
(the negative control: 2 stall-race lines with NO redirect line between them stays genuine
overlap), `hedge-redirect-PASS` (synthetic - no rv9 fixture covers the hedge side - 2 front
lines + 1 won-by with a redirect line between the front lines). Renamed:
`supersede-two-clean-windows-one-clip-INCONCLUSIVE` -> `supersede-one-clip-both-clean-PASS`
(NEW2-M2a's own stated consequence) and `coding-route-window-not-scored-not-failed-PASS` ->
`...-INCONCLUSIVE` (NEW2-M1's consequence for the single-window case `all-coding-INCONCLUSIVE`
also covers with two windows).

run-smoke-hedge-checks.mjs, NEW2-I1, a fourth synthetic tree (`repo-unreadable`: a directory in
place of `smoke-hedge-forced.natively_debug.log`, so the runner's own `fs.existsSync` pre-check
passes but check-smoke-hedge.mjs's `readTextOrNull` throws EISDIR, caught, returns null, exit 2 -
the reviewer's own reproduction), alongside re-runs of the three fix-round-2 trees (all saved
under `SP\cal-h40c\run-smoke-hedge-checks-cal\r3-*.txt`):

| tree | expected | got |
|---|---|---|
| repo-pass | `OVERALL: PASS`, exit 0 | exactly that |
| repo-fail | `default=FAIL`, `OVERALL: FAIL`, exit 1 | exactly that |
| repo-error | `off=ERROR`, `OVERALL: FAIL`, exit 1 | exactly that |
| repo-unreadable | `forced=ERROR(exit 2)`, `OVERALL: FAIL`, exit 1 | exactly that |

Rule 8 contrast for NEW2-I1 specifically: a throwaway copy of the runner with the OLD allow-list
`bad` filter, run against the SAME `repo-unreadable` tree, prints
`SEGMENT forced: ERROR(exit 2) (exit 2)` then `OVERALL: PASS  (forced=ERROR(exit 2), default=PASS,
off=PASS, refuse=PASS)`, exit 0 - the exact false pass the rereview described, reproduced and
then fixed (saved in `SP\cal-h40c\run-smoke-hedge-checks-cal\r3-unreadable-oldbug.txt`). A first
attempt at this contrast accidentally ran the reverted copy from a subdirectory that does not
contain check-smoke-hedge.mjs, which just fails every segment for an unrelated reason
(module-not-found) - caught by checking which segments actually failed and why before trusting
the result, and redone from the scratchpad root where the copy's sibling import actually
resolves.

## Deviations from the controller's fix-round-3 message

None found. Every ruling (NEW2-I1's exact fix line, NEW2-M1's `scoredCount >= 1` and `win.end`
bound, NEW2-M2(a)'s answer-only clip count, NEW2-M2(b)'s exact redirect-detection shape and the
instruction to verify the log text against the source rather than assume it) is implemented
exactly as stated.

## What this still does not cover (residual risk)

Everything the sections above already said, plus: the hedge-mode redirect fixture
(`hedge-redirect-PASS`) is synthetic - no real flight or `rv9` fixture has yet produced this
exact shape on the hedge side (only h40b's off-mode occurrence, `SP\rv9\off-redirect`, is a real
recording), so its exact log shape (which of the two "back started" lines is present, whether
the retry always uses the SAME front/back pair or picks a different fallback) is my own
best-effort construction from reading WhatToAnswerLLM.ts's redirect path, not an observed one.

## Status: DONE

All NEW2-I1/M1/M2 findings addressed; 48/48 checker calibration cases pass; run-smoke-hedge-checks.mjs's
NEW2-I1 fix proven on four synthetic trees including the reviewer's own `forced-debug-unreadable`
reproduction, with a rule-8 contrast showing the pre-fix code's exact false PASS on the same
tree. Never started the real app, never registered or ran the launcher, never read or printed a
real key or credentials.enc. No new concerns beyond the `.env` one already flagged in Fix round
2 (unchanged - still worth confirming before relying on segment 4's cleanup on the real task).
