SPEC: FAIL / QUALITY: NEEDS FIXES

# Task 7 review - h40c live hedge smoke

Files under review: `SP\launch-smoke-hedge.cmd`, `SP\check-smoke-hedge.mjs`, `SP\register-smoke-hedge.ps1`.
Read against: task-7-brief.md, global.md, task-7-report.md, `SP\smoke-turn.mjs`,
`MAIN\electron\test\golden\interview60.run.mjs` (appStop/appStart), `MAIN\electron\main.ts`,
`LLMHelper.ts`, `llm\verbalHedge.ts`, `llm\WhatToAnswerLLM.ts`, `IntelligenceEngine.ts`, `package.json`
scripts, `SP\register-natively-task.ps1`, `SP\register-h40c.ps1`, the existing smoke logs in
`MAIN\electron\test\golden\interview60.runs\`, and the implementer's fixtures in `SP\cal-h40c\`.
Nothing here started the app, registered a task, or called a model API. The reproductions I ran
are throwaway files in `SP\rv7\` (see Evidence at the end).

Summary. As written, the smoke cannot return a PASS on a correct app:
- The app deletes the forced and default debug-log evidence before anyone can check it (C1).
- The control segment fails on every correct run of this build (C2).
- Segment 4 never runs app:stop and never writes its exit line (C3). Its PASS signal would not
  tell a clean exit from a hang even if it did (C4).
- The unhandled-rejection check can never fail (C5).
- The register script brings back the StartWhenAvailable setting that the flight review removed (I3).

These parts are right: the env lifecycle across segments, the guards, the regexes (they match the
real template strings), the last-label rule, and the loser-usage rule.

---

## Critical

### C1 - Segments 1-2's debug-log evidence is deleted before the checks can run
`launch-smoke-hedge.cmd:39-59`, `check-smoke-hedge.mjs:95`

**Mechanism.** `main.ts:3421-3433` resets `natively_debug.log` at every app start. It deletes
`.log.1`, renames `.log` to `.log.1`, and writes a fresh file. `interview60.run.mjs:256-261`
documents the same behaviour.

The launcher starts the app four times: smoke-turn three times, then the segment-4 electron. A
fifth start comes later from app:start's attempt 2 (I1). So when the launcher ends:
- `natively_debug.log` holds segment 4's refused session (two lines).
- `.log.1` holds segment 3.
- Segments 1 and 2 are deleted.

About 3 minutes later, attempt 2 rotates the file again and segment 3 is deleted too.
`verbal-diag.log` is append-only (`WhatToAnswerLLM.ts:23`), so it survives. But every rule except
the first-token column reads `natively_debug.log`. The since-instant window cannot help, because
the lines are no longer in the file.

**Failure scenario.** The controller follows the brief ("after it ends ... run the three checks
with the launcher's start instant"):
- `forced <since1>` and `default <since2>` read segment 4's two-line session and report
  `no "dispatch: answer" lines found` -> FAIL.
- `off <since3>` gives the same result once attempt 2 has run.

The smoke fails for an instrument reason, and the only way to recover the evidence is to fly it again.

**Fix.** After each smoke-turn line, copy the session. The app is already stopped at that point
(`smoke-turn.mjs:94`).

```
copy /Y natively_debug.log %RUNS%\smoke-hedge-forced.natively_debug.log >nul
copy /Y %RUNS%\app-start.log %RUNS%\smoke-hedge-forced.app-start.log >nul
```

Do the same for default, off and refuse. `app-start.log` is truncated by every app:start
(`interview60.run.mjs:242`), and it is the only place electron's stderr lands. Then make
`--debug-log` required, and point each check at its own copy.

### C2 - `off` mode fails on every correct run of this build
`check-smoke-hedge.mjs:142, 252, 317`

`checkStartupLine` requires the line `[Main] verbal hedge: off` (line 252; this is the real text,
`verbalHedge.ts:54`). The off-mode rule then fails on any line that matches
`HEDGE_ANY = /verbal hedge/` (lines 142, 317), and the required startup line matches it. The h40b
calibration passed only because the h40b log predates the startup line and was run with
`--no-startup-line`.

**Reproduced.** `SP\rv7\off-real\natively_debug.log` is a correct control: startup line `off`, one
answer dispatch, one `verbal stall race: trying gemini-3.1-flash-lite` line. The checker printed
`[PASS] startup line`, then `[FAIL] off-mode (control) rules - found a "verbal hedge" line with the
flag unset`, and exited 1.

**Fix.** `const HEDGE_ANY = /^\[LLMHelper\] verbal hedge:/;` - these are the per-answer lines,
`LLMHelper.ts:3479-3539`. Then recalibrate:
- `rv7\off-real` must PASS.
- The same log plus one `[LLMHelper] verbal hedge: front=...` line must FAIL.

### C3 - Segment 4 never runs app:stop and never writes SMOKE4 EXIT
`launch-smoke-hedge.cmd:71-76`

**Mechanism.** `start "hedge-refuse" /B ... app:start >> %LOG4% 2>&1` gives LOG4's write handle to
the background app:start. That process lives at least 180 s. `appStartOnce` waits 180 s for
`Starting Meeting`, which a refusal never prints, and then makes a second attempt
(`interview60.run.mjs:243-251, 266, 291`).

While it holds the handle, cmd cannot open LOG4 again:
- Line 74 (`app:stop >> %LOG4% 2>&1`) fails with "The process cannot access the file because it
  is being used by another process." cmd then **skips the command**.
- Line 76 (`echo SMOKE4 EXIT ... >> %LOG4%`) fails and is skipped the same way.
- The error message goes to the task's invisible console.

**Reproduced (no app).**
- `SP\rv7\ovw.cmd`: both foreground appends were lost with that message.
- `SP\rv7\ovw2.cmd`: the foreground node command's side-effect marker was never written
  (`MARKER ABSENT - cmd skipped the foreground command`). Appends worked again only after the
  background process exited.

The implementer's cmd dry run (report lines 111-179) could not see this: its stub
`interview60.run.mjs` exited at once and released the handle.

**Consequences.**
- `refuse` mode always FAILs with `segment log has no "APP STOP killed N ..." line`.
- There is no `SMOKE4 EXIT` line for the brief's tail check.
- A regressed (hanging) app is not stopped by the launcher. app:start's own failure path kills it
  at about 180 s, then starts it again (I1).

Line 72 has a second problem: `%ERRORLEVEL%` after `start /B` is `start`'s own launch status (0
once node started), not app:start's exit code. So `SMOKE4 EXIT 0` would mean nothing even if it
were written.

**Fix.** See C4: a foreground probe replaces the background app:start.

### C4 - Even when it is written, "killed 0" does not show the app exited on its own
`check-smoke-hedge.mjs:239-245`, `launch-smoke-hedge.cmd:61-67`

**Mechanism.** `appStop` (`interview60.run.mjs:179-209`) runs in two steps:
1. It tree-kills the keeper named in `app.pid` and prints `APP STOP  taskkill tree pid=N`.
2. Only after that does it count leftover `electron.exe` processes for the `killed N` line.

An app launched through app:start is always under that keeper, so it dies in step 1 and the count
is 0.

**Evidence.**
- `MAIN\electron\test\golden\interview60.runs\smoke-stall-forced.log` stops an app that had just
  answered: `APP STOP  taskkill tree pid=1712`, then `APP STOP  killed 0 process(es) of this checkout`.
- The implementer's own PASS fixture, `SP\cal-h40c\synthetic-refuse-pass\smoke-hedge-refuse.log`,
  contains `APP STOP  taskkill tree pid=1234`, meaning the keeper was still alive. The checker
  scores it PASS.

**Concrete false PASS (once C3 is fixed naively).** The N1 regression logs the refusal line, then
hangs holding the lock. At 40 s app:stop tree-kills it and prints "killed 0". Refusal line plus
"killed 0" gives PASS.

Answers to the brief's questions:

- **What if the build takes more than 40 s?**
  - `npm start` runs `concurrently --kill-others` vite plus `build:electron && electron .`
    (`package.json:15, 17, 20`).
  - Measured time to "listening in Auto": 68 s and 17 s (smoke-stall, 09-16), 8 s (smoke-model,
    09-20). Other runs: 55 s on s50k, and more than 90 s on 2026-09-20 19:50
    (`interview60.run.mjs:263-265`).
  - At 40 s, app:stop would kill the keeper mid-build: again "taskkill tree" plus "killed 0". With
    no refusal line yet, the check FAILs at that moment.
  - But app:start's attempt 2 starts the app again about 140-170 s later with the bad value, and
    logs a refusal line that is later than the segment start. A check run after that PASSES on a
    mix of two attempts.
- **What else prints killed 0?** Every stop where `app.pid` names a live keeper (hung or healthy),
  an electron that never launched, and an electron that already exited. Only an orphaned or
  hand-started `electron.exe` of this checkout gives N>0. The FAIL fixture's "killed 1" is a shape
  this path does not produce.
- **Is there a positive signal?**
  - The checker requires the refusal line (lines 229-232). That is good: it proves validation ran
    and an exit was requested, but not that the process ended.
  - In app:stop's output, the line that does discriminate is `skipped pid-file ... (process gone)`
    versus `taskkill tree pid=`. The first means the keeper tree ended by itself (`--kill-others`
    takes vite down when electron exits 1). The second means something was still alive.
  - Better still is to observe the exit directly.

**Fix.** Replace lines 61-76 with a foreground probe, for example `SP\refuse-probe.mjs`, run as
`%NODE% "%~dp0refuse-probe.mjs" >> %LOG4% 2>&1`. The probe should:
1. Run app:stop first, so no leftover instance holds the single-instance lock. A second instance
   exits 0 with "Another instance is already running" (`main.ts:3394-3403`), and that must not
   count as a refusal.
2. Spawn `cmd.exe /c npm run electron:dev`. This is an incremental build plus electron, with no
   vite; the refusal happens before any window. Give `NATIVELY_VERBAL_HEDGE=yes` to the child's
   env only, and send the child's stdio to its own file.
3. Wait for the child to exit, with a deadline long enough for a build (180 s). Then print one of:
   - `REFUSE exited code=<c> after <ms>ms`, or
   - `REFUSE STILL RUNNING after <ms>ms`, then write the child pid to `app.pid` and run app:stop.
     Its command-line test matches `electron` in `electron:dev`.
4. Write its outcome with `fs.appendFileSync`, not through an inherited stdout. Otherwise, make sure
   nothing it spawned outlives it before the launcher's next `>> %LOG4%`: the child inherits the
   handle, which is C3's trap.

Then the checker's refuse mode requires three things:
- the refusal line, timestamped at or after since;
- `REFUSE exited code=1`;
- no `natively_debug.log` line after the refusal line (a process that exited did nothing else).

Calibrate with a stub child that exits 1 (must PASS) and one that sleeps (must FAIL). The
launcher's own environment never holds `yes`.

### C5 - The unhandled-rejection check can never fail
`check-smoke-hedge.mjs:99, 146, 261-264`

**Mechanism.** The app's only record of an unhandled rejection is `main.ts:18-19`:
`logToFile('[CRITICAL] Unhandled Rejection at: ' + ...)`. It writes
`<ISO> [CRITICAL] Unhandled Rejection at: [object Promise] reason: ...`. Uncaught exceptions write
`[CRITICAL] Uncaught Exception:` (`main.ts:14-15`). The checker misses it twice:
- `DEBUG_LINE` (line 99) accepts only LOG, WARN and ERROR, so the line is dropped before the check.
- Even if it got through, `UNHANDLED` (line 146), `/unhandledRejection|UnhandledPromiseRejection/i`,
  does not match "Unhandled Rejection", which has a space.

Because the app installs a listener, Node prints no `UnhandledPromiseRejectionWarning`. The
strings the brief names therefore cannot occur.

**Reproduced.** `SP\rv7\unhandled\natively_debug.log` is the synthetic-forced-pass log plus one
`[CRITICAL] Unhandled Rejection ... AbortError` line. The checker printed
`[PASS] no unhandled rejection` and `PASS overall`, and exited 0. This is exactly the path that the
comment at `LLMHelper.ts:3538` claims is safe ("its pending next() rejects into `first` ... no
unhandled rejection"). That is the one claim about the abort path that this smoke should test live.

**Fix.**
- `DEBUG_LINE`: accept `(LOG|WARN|ERROR|CRITICAL)`.
- `UNHANDLED`: `/Unhandled Rejection|Uncaught Exception|unhandledRejection|UnhandledPromiseRejection/i`.
- Also scan the segment's `app-start.log` copy (C1).
- Calibrate: `rv7\unhandled` must FAIL, `synthetic-forced-pass` must PASS.

---

## Important

### I1 - The background app:start outlives the launcher and starts the app again with NATIVELY_VERBAL_HEDGE=yes
`launch-smoke-hedge.cmd:70-75`

Line 75 clears the variable only for the launcher itself. The background app:start already
inherited `yes`, and nothing stops it: appStop kills the keeper tree and `electron.exe`, never a
node app:start.

At about 180 s, its attempt 1 fails ("never saw Starting Meeting"). It waits for port 5180, and
attempt 2 spawns a new keeper -> npm start -> build -> electron, still with `yes`
(`interview60.run.mjs:243-251`). That happens about 2.5 minutes after the launcher exited with
code 0. Attempt 2 then:
- rewrites `app.pid`;
- holds LOG4 until about the 6-minute mark;
- rotates `natively_debug.log` twice more, which deletes segment 3's `.log.1` (C1).

Anything started in that window collides with it on port 5180 and the single-instance lock: a
re-run, the controller's next step, or the user opening the app. If the refusal has regressed, it
runs a hung app twice, for 3 minutes each, unattended.

**Fix.** Use C4's foreground probe, so there is no background process. If `start /B` is kept for
any reason:
- kill that process by command line before the segment ends;
- never redirect a foreground command into a file it holds.

### I2 - Supersede answers are merged into the previous answer's window, or never checked
`check-smoke-hedge.mjs:135, 152-159, 170-198`

Answer windows split only on `dispatch: answer`. But `main.ts:1026-1029` shows that
`dispatch: supersede` calls `answerDetection(..., {replace: true})`: a new generation, and so a
new hedge race. smoke-turn allows supersedes (it only requires one `answer` dispatch per question).
The 09-16 stall smokes had supersedes on all three of these clips; the 09-20 run had none.

Inside one 60 s window, the rules then read two races at once:
- `find` takes race 1's front, back and won lines.
- `lastAnswerSourceLabel` takes race 2's label.
- The loser-usage rule sees race 2's winner's usage lines.

**Reproduced.** `SP\rv7\supersede\natively_debug.log` holds two correct forced races (3.1 wins,
then 3.5 wins, each loser silent). The checker FAILs with two problems:
- `last answer-source label "gemini-3.5-flash-lite (hedge)" != "gemini-3.1-flash-lite (hedge)"`
- `loser gemini-3.5-flash-lite logged a usage line`

At a 1 ms trigger the winner is close to a coin flip: both lites reach their first token in about
3-6 s (h40b dispatch-to-first-usage 3.9-6.5 s; probe hedge median 4.2 s). So a supersede fails the
smoke about half the time.

The converse also happens. A supersede more than 60 s after the last `answer` dispatch is not
checked at all, so "every answer" quietly becomes "every answer dispatch".

**Fix.**
- Split on `/^\[Main\] dispatch: (answer|supersede) /`.
- Require exactly one `verbal hedge: front=` line (forced/default) or `verbal stall race: trying`
  line (off) per window.
- Report a window with anything other than one front line and one won-by line as AMBIGUOUS, not
  PASS. The lines carry no race id, and a superseded race can log its won-by after the next race
  has begun.
- Print the window count and compare it with the clips played (3/3/1).

### I3 - register-smoke-hedge.ps1 does not match the reviewed flight registration
`register-smoke-hedge.ps1:21, 36, 39-42`

- **Line 36 sets `-StartWhenAvailable`.** h40a and h40b ran with StartWhenAvailable=False
  (`register-h40c.ps1:9-17` records the read-back and h40b's final review). The harm here: if the
  start is missed (lid closed, user away at StartAt), the smoke runs at the next opportunity. That
  could be while the user is using the app. smoke-turn's first action is app:stop, which kills this
  checkout's electron; it then plays clips out loud and spends quota. (The brief's own line 73 lists
  `-StartWhenAvailable`; the later flight review overrides it.)
- **Line 21:** `-StartAt` defaults to now+2 min. The flight review made it mandatory.
- **Lines 39-42** echo the parameters (`start=$StartAt`, `limit=$Hours`), not the task as
  registered. Nothing shows StartWhenAvailable, WakeToRun, the battery flags, or
  ExecutionTimeLimit.

**Fix.** Take from `register-h40c.ps1`: line 31 (mandatory StartAt), line 50 (settings without
StartWhenAvailable), and lines 57-65 (read the settings back and print them). Default `-Hours` to 1
to match the brief, and fix the header's "5h execution limit" (line 5; the code defaults to 4).

### I4 - Calibration never showed most rules can fail, and three fixtures hid Critical defects
Report lines 64-109.

Rules never observed failing:
- forced: label mismatch, back started later than 100 ms, reason other than trigger;
- default: label mismatch;
- the startup line absent or mismatched (without `--no-startup-line`);
- unhandled rejection.

Fixtures that hid Critical defects:
- The off-PASS calibration used a log without the startup line, which hid C2.
- The refuse-PASS fixture treats a killed live keeper as PASS, which hid C4.
- The cmd dry-run stub exited at once, which hid C3.

**Fix (rule 8).** Make one mutation per rule on the synthetic PASS logs, and watch each one fail.
Also do one refuse run whose child really hangs.

---

## Minor

**M1 - The loser-usage rule gets the right answer for the wrong reason, and has one wrong FAIL.**
`check-smoke-hedge.mjs:29-31, 192-198`.
- Usage is logged on every streamed chunk, not only the last (`LLMHelper.ts:3303-3306`; the comment
  at 3301 is stale too). The h40b copy has 261 usage lines for 46 answers, with `out=` climbing
  21, 45, 69, 76, 76 within one answer.
- The rule still discriminates. A loser that was not aborted still has its first `next()` pending;
  when its first text chunk arrives, that chunk logs a usage line. Reproduced: `SP\rv7\noabort`
  gives FAIL, exit 1.
- But in the same-tick case (`LLMHelper.ts:3533-3538`), the loser delivered in the same tick and is
  labelled aborted. It logs a loser usage line *before* the won-by line, which fails the smoke
  wrongly.
- Fix: fail only on loser usage lines timestamped after the won-by line, and correct both comments.

**M2 - `other=empty` in forced mode** (line 187). Failing on it matches the brief, but the report's
reason ("an outcome the real code cannot produce") is false. `LLMHelper.ts:3537` labels a loser
that ended empty before the winner's first token. Keep the FAIL, but word it as "rare; investigate".

**M3 - `off` mode ignores the model in the stall-race line.** The brief says
`trying gemini-3.1-flash-lite`; `STALL_RACE` captures the model (line 143) but never compares it.
Off mode also does not check that no `(hedge)` label appears.

**M4 - The checker's output lacks what would make a FAIL diagnosable.**
- There is no `--until` bound, and `verbal-diag.log` is shared by every segment.
- It does not print each answer's route (the diag `route:` line). The CODING route skips the stall
  race and the hedge by design (`LLMHelper.ts:2721-2736`), so a clip classified as coding fails
  forced and off for a routing reason.
- It does not print why the back leg started in default mode (front-error versus trigger).
- It prints no per-model request count. Count the `Warming up`, `front=`, `back started`,
  `stall race` and `stalled after` lines; usage lines overcount by about 5x.

**M5 - Launcher.**
- It always ends with `exit /b 0` (line 78), whatever the smokes did. The stall launcher returned
  the last smoke's code.
- The header says the ISO timestamp is the "first line" (line 14); it is the second.
- There is no guard for segment 4's code: add `findstr /C:"describeVerbalHedgeAtStartup" electron\main.ts`
  with exit 7.
- Other env vars that change the smoke are not cleared: NATIVELY_VERBAL_PRIMARY_MODEL,
  NATIVELY_GEMINI_THINKING_LEVEL, NATIVELY_FIRST_TOKEN_TIMEOUT_MS.
- Nothing records which build each segment ran, although every `npm start` rebuilds from the shared
  working tree. Write `git rev-parse HEAD`, a `git status --porcelain` count, and the timestamp of
  `dist-electron\electron\main.js` into each segment log.

**M6 - Register guard.** It only checks that `verbalHedge.ts` exists (line 31). Checking for
`describeVerbalHedgeAtStartup` would catch a checkout without the startup validation before any
quota is spent.

**M7 - Default `--debug-log`.** It defaults to a cwd-relative path (line 95), so running the
checker from SP exits 2. Make the flag required; after C1 it points at a per-segment copy anyway.

---

## Verified correct (no change needed)

- **Env lifecycle.** `set X=` removes X. The values per segment are:
  - segment 1: HEDGE=1, TRIGGER=1;
  - segment 2: HEDGE=1, TRIGGER unset;
  - segment 3: both unset;
  - segment 4: sets `yes`, then clears it.

  NATIVELY_FOLLOWUP_PARENT is cleared at line 32. The dry run shows the values per segment. The only
  leak is I1's background process.
- **Guards and cmd syntax.** Wrong cwd exits 9; a missing `streamGeminiWithHedge` exits 7. No echo
  text inside an if-block contains parentheses. The files are ASCII-only.
- **LF-only line endings are acceptable here.** The launcher has no labels, GOTO or CALL.
  `launch-smoke-stall.cmd` is also LF-only, has not been modified since 09-16 21:54, and ran under
  Task Scheduler at 22:01-22:04.
- **Paths.** Every redirect is relative to MAIN (about 122-150 characters). The dry run's MAX_PATH
  failure only happened in the scratchpad. `%~dp0smoke-turn.mjs` (about 213 characters) is a node
  argument, not a redirect.
- **Regexes match the real template strings:** `LLMHelper.ts:3479, 3512, 3518, 3539`,
  `main.ts:2435, 3443-3445`, `verbalHedge.ts:54-56`, and `WhatToAnswerLLM.ts:412`
  (`first token Nms`). The em dash in `REFUSE_LINE` is stored as UTF-8.
- **The last-label rule is right.** The head label comes from `WhatToAnswerLLM.ts:300`, the hedge
  re-announce from `:111-123`, and `IntelligenceEngine.ts:425-427` emits both. The last
  `answer source:` line is the winner.
- **The startup-line requirement** in forced and default mode really does show the env reached the
  process.
- **smoke-turn stops the app** at its end and on failure (`smoke-turn.mjs:94, 147`). Segments 1-3
  need no extra app:stop.

## The per-segment window question

The checker filters lines by timestamp (at or after since); it does not use byte offsets.

- **The lower bound is right, even when the build takes minutes.** Since is written before
  smoke-turn's stop and start, and the app logs on the same UTC clock.
- **Segments 1-3 cannot overlap.** Each smoke-turn stops its app before the next segment's header
  is written.
- **For `natively_debug.log` the window does not matter.** Each file holds a single session (C1),
  and segment 4's background process keeps writing to it after the launcher ends (I1).
- **There is no upper bound (M4).** That is harmless for per-segment copies. It only matters for
  the shared `verbal-diag.log`, through the 60 s first-token lookup.

## Quota

**Per app start (segments 1-3):**
- One warm-up pair when the meeting starts: `main.ts:1972` -> `startWarmthHeartbeat` ->
  `ping(true)` -> `warmupGeminiFlash([3.1, 3.5])` (`LLMHelper.ts:3659-3679`).
- The constructor warm-up (`main.ts:543`) logged nothing in h40b's session; its first
  `Warming up` line appears at meeting start. So count it as 0, and as at most +1 per model per
  start if it ever finds a client.
- Heartbeat re-pings come every 300 s, and only for idle models. Each segment ends before 300 s, so 0.
- One gemma-4-31b-it vision ping per start, which counts against the Gemma quota, not the lites.

| Requests | 3.1-lite | 3.5-lite |
|---|---|---|
| Warm-ups (3 starts) | 3 | 3 |
| Seg 1 forced: 3 answers, both legs always start | 3 | 3 |
| Seg 2 default: 3 answers | 0-3 back legs (probe: 3-4 of 39 healthy, 32 of 39 when stalling) | 3 |
| Seg 3 off: 1 answer | 1 | 0-1 (stall fallback) |
| Seg 4 refuse | 0 | 0 |
| **Expected** | **7-8** | **9-10** |
| Worst case (every back leg, a stall, one supersede per forced question, constructor warm-ups, one pre-token redirect) | about 17 | about 17 |

The expected total of about 16-18 matches the brief's "~16". Today's ledger leaves room: 3.1-lite
has about 125 left (about 375/500 used), 3.5-lite about 290 (about 210/500 used). A second run
after the C1-C5 fixes also fits.

Count requests from the warm-up and race lines, not from usage lines, which appear once per chunk.

## What the smoke does NOT prove (residual risks, after the fixes)

1. **A stalling 3.5-lite at the real 5 s trigger (the H2 case).** On a healthy evening the default
   segment will probably exercise only `other=not-started`.
2. **Server-side cancellation and billing of the aborted loser.** The checks show only that the
   loser processed no chunk after the abort branch ran.
3. **The rarer race paths:** the same-tick case (M1), the front-error and front-empty reasons, and
   both legs failing (`no answer - ...` -> throw -> withVerbalFallback redirect).
4. **A supersede mid-race** (the brief lists this), and attributing one when it happens (I2).
5. **The coding route.** It never hedges by design (`LLMHelper.ts:2721`), so flight answers that
   take that route (screenshot questions) run without the hedge.
6. **The brief's own list:** the renderer's bar text, an hour of quota and load, and the Live-ear
   dispatch timing.
7. **The flight's own launcher.** This smoke proves the env reaches the process only through its
   own launcher, not through `launch-h40c.cmd`.
8. **Other bad values.** Refusal is not tested for whitespace or `true`, nor for a bad trigger with
   the flag on (`=1` with `TRIGGER_MS=abc`), which should also refuse.
9. **Which build ran.** `npm start` rebuilds from MAIN's working tree at every segment. Concurrent
   edits by other sessions would be picked up unless M5's build-identity lines are added.
10. **The winner failing mid-stream after the loser was aborted.** There is no second chance, by
    design.
11. **Unhandled rejections that reach only stderr.** These are covered only if `app-start.log` is
    copied and scanned (C1, C5).

## Evidence produced by this review (`SP\rv7\`, throwaway)

- **`ovw.cmd` and `ovw2.cmd`:** a background `start /B ... >> F` plus a foreground `... >> F`.
  - "The process cannot access the file because it is being used by another process" appeared twice.
  - `MARKER ABSENT - cmd skipped the foreground command`.
  - Appends worked again after the background process exited.
- **Checker runs:** `node check-smoke-hedge.mjs <mode> 2026-09-26T19:59:00.000Z --debug-log <file> --diag-log <empty>`

  | Fixture | Mode | Result | Finding |
  |---|---|---|---|
  | `off-real` (a correct control) | off | FAIL, exit 1 | C2 |
  | `unhandled` (a `[CRITICAL] Unhandled Rejection` line in the window) | forced | PASS, exit 0 | C5 |
  | `supersede` (two correct races) | forced | FAIL, exit 1 | I2 |
  | `noabort` (loser usage after won-by) | forced | FAIL, exit 1 | the rule works (M1) |
