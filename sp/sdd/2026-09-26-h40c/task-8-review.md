# Task 8 review: h40c flight preparation

Reviewer: Opus, read-only. MAIN HEAD da28f25; the dist was built at 18:53:01 (LLMHelper.js and main.js), and its `main.js` carries `describeVerbalHedgeAtStartup` and `[Main] answer source:`. Nothing was run except read-only greps, `git show`, and `Get-ScheduledTask` reads. For `.env` I listed NATIVELY_* variable names only; no values were read.

SPEC: FAIL
QUALITY: NEEDS FIXES

Counts: Critical 1, Important 10, Minor 10.

Why the spec fails: the brief's checkbox "Quota note for the flight day" has no deliverable. The draft PREREGISTER-h40c.md has no quota text; its only mention of quota is "whether redirects cost quota". The report (task-8-report.md:185-186) says the brief's estimate was "carried into the draft's 'What the hour tests' section unchanged". That is not true. Everything else the brief lists exists. The stub-tree calibration and the synthetic stats calibration are deviations the controller allowed, and the controller has since run the real-dist guard calibration (5/5).

---

## Critical

### C1. The rule-1 VOID clause can excuse a real latency failure
**Where:** PREREGISTER-h40c.md:41-45 and :60-61.

**The problem.** The hour is VOID ("re-fly another day") whenever fewer than 50% of answers are won by 3.5-lite. "(1) VOID: re-fly" also overrides the (2) and (3) outcomes.

A low 3.5-lite share is not only an outage. It is also what the hedge does, as designed, when 3.5-lite HIGH is slow. Every front leg that has no first token by 5 s lets 3.1-lite start, and 3.1-lite often wins. That is the daytime-load case this pre-registration itself lists as never probed (:66-67). The probe's own pre-registration (PREREGISTER-hedge-probe.md:18-19) says "a daytime window is owed before any decision to ship the hedge".

**Failure scenario.** The hour flies at midday. 3.5-lite HIGH first tokens run 6-9 s. 3.1-lite wins 25 of 44 answers (3.5 share 43%). The median is 6.8 s and p90 is 15 s, so rule 2 fails. The verdict reads VOID rather than FAIL. The one hour that measured the hedge under load is thrown away and re-flown until an evening hour passes. That is a post-hoc exit, fixed in advance.

The 50% threshold also has no stated source. The probe measured 95/117 (81%).

**Fix (before commit).**
- VOID only on mechanical absence:
  - (a) the app's startup line is not exactly `[Main] verbal hedge: on trigger=5000ms` (read as in I2);
  - (b) fewer than 95% of answer-dispatch windows contain a `front=` line;
  - (c) an objectively defined 3.5-lite outage: at least 50% of hedge runs log `back started ... reason=front-error`, the `failed before its first token` warning.
- A low 3.5-lite share caused by `reason=trigger` is a result. Report it, and let rules 2 and 3 decide.
- Say explicitly that rules 2 and 3 are computed and reported on every hour, including a VOID one.
- Either drop the 50% share condition or move it to "reported".

---

## Important

### I1. The pre-registration says the guard proves the flag reaches the app. It cannot.
**Where:** PREREGISTER-h40c.md:16-17 ("The launcher's guard proves ... that the flag reaches the app"). This contradicts :23-25 in the same draft and guard-h40c.mjs:10-15. The wording came from the brief, but it is still false.

**The gap.** The guard is a node child of the launcher's cmd session. It resolves `verbalHedgeEnabled()` against its own `process.env`. The app is a different process: flight.mjs → run.mjs `auto` → detached `app:keep` → `cmd /c npm start` → electron.

Every hop does inherit `process.env` (flight.mjs:220, run.mjs:275, :310). Two things can still differ:
- (a) The hop code can change later.
- (b) `electron/main.ts:6` runs `require('dotenv').config()`, and the launcher's `set X=` *unsets* X. So a `NATIVELY_FOLLOWUP_PARENT`, `NATIVELY_VERBAL_HEDGE_TRIGGER_MS`, `NATIVELY_VERBAL_PRIMARY_MODEL` or `NATIVELY_GEMINI_THINKING_LEVEL` line added to `.env` would reach the app and never reach the guard. Today `.env` declares no NATIVELY_* name, so this gap is latent.

**Fix.**
- Reword :16-17 to say what the guard proves: the launcher's environment as a node child resolves it, and the build and source carry the hedge.
- Name the actual app-process proofs:
  - before the hour, Task 7's smoke through the same app:start chain;
  - after the hour, the startup line (made readable per I2) and the won-by lines. Won-by lines can only exist if `verbalHedgeEnabled()` was true inside the app.
- Optional guard check 10: fail if `.env` declares any of those NATIVELY_* names (test names only, never values).

### I2. `h40c-hedge-stats.mjs` can never see the startup line on a real flight
**Where:** h40c-hedge-stats.mjs:49 and :69.

**The problem.** `startupFlag` is matched in `dbg`, which is the log sliced to `[timeline.startDebug, endDebug)`. `startDebug` is taken in `appPass` (run.mjs:422), after `app:start` has already brought the app up. The startup line is logged in `initializeApp` before credentials, so it sits at the top of the file.

Measured on the h40b copy (SP\h40c-stats-cal-h40b): `startDebug=36194`. `Using … for interviewer` is at byte 2748, `Live Mode` at 9384, `Starting Meeting` at 9602, `Default Model set to` at 16343. None of these occur inside the window. On h40c the field will always print "not observed in this window", and the report (:139-142) has already told the operator to read that as honest.

The calibration could not catch this. The synthetic fixture uses `startDebug: 0` with the startup line at byte 0 (SP\h40c-stats-cal-synth\interview60.timeline.json and natively_debug.log:1). That is a fixture whose shape does not match the thing it calibrates (rule 8).

**Fix.**
- Read the startup line from `logSince(debugLog, 0, timeline.startDebug)`, taking the last match before the window. If `.log.1` rotation is a concern, also accept the whole file.
- Calibrate on a fixture where `startDebug` is greater than 0 and the line sits before it. Also run a negative case with no line.

### I3. Rule 1's "3.5-lite share" has an unfixed denominator, and the script computes the numerator globally
**Where:** PREREGISTER-h40c.md:41-43; h40c-hedge-stats.mjs:115 and :135-136.

**The problem.** "≥ 50 % of in-app answers" does not say which denominator: the 45 graded items, dispatches, delivered answers, or dispatches with a won-by line. The script divides *all* 3.5 won-by lines in the log by *all* `dispatch: answer` lines.

Per M2, a superseded dispatch's legs keep running, and its won-by line lands in the next dispatch's window. That won-by counts in the numerator even though no answer was shown. Meanwhile the per-window `sourceLabels` that the M7 fix built (:87-104) is printed but not used by the rule. The rule-1 won-by share (:135) has the same global-count shape.

**Failure scenario.** The reader picks a denominator after the fact.

**Fix.**
- Pre-register one definition: numerator = dispatch windows whose last won-by names gemini-3.5-flash-lite; denominator = dispatch windows containing a won-by line.
- Compute both rule-1 numbers per window from the loop at :90-104.
- Print VOID, not FAIL, for rule 1 (:169-173).

### I4. Rule 2's "answer failures" definition does not match what the script counts
**Where:** PREREGISTER-h40c.md:47-48 ("no answer delivered for a dispatched answer") vs h40c-hedge-stats.mjs:67 (counts only `[WhatToAnswerLLM] Stream failed`).

**The problem.** When both hedge legs end empty, `streamGeminiWithHedge` logs `verbal hedge: no answer - front empty, back empty` and returns without throwing (LLMHelper.ts, da28f25 hunk). No redirect happens, no `Stream failed` line is written, and the user sees nothing. The script counts `noAnswer` but leaves it out of `answerFailures`.

A superseded dispatch also delivers nothing, by design. The prose definition would count it; the script would not.

**Fix.** Define failures in the pre-registration as: `Stream failed` lines plus `no answer - front empty, back empty` lines, excluding superseded dispatches (identified by a `dispatch: supersede` line). Make the script count exactly that. The h40b baseline of 0 still holds under this definition; its log has neither line.

### I5. "One change against h40b" is false for the tree that flies, and the harness change moves the rule-3 comparison
**Where:** PREREGISTER-h40c.md:7-8 ("`07a0e5e` + this branch's hedge commit").

**The problem.** The tree that flies is da28f25 = 07a0e5e + e311019 + 6c50ec3 + da28f25.
- 6c50ec3 is inert with the flag off. It only changes the stored `questionContext`, and `TemporalContextBuilder` never renders it.
- e311019 changes attribution in `judge.mjs pairAnswers` and `metrics.mjs claimOf`. Answers dispatched on a Live paraphrase are now credited. Its own proof: h40b R07F moves from unclaimed to R07F.

So h40c's in-app count comes from a more generous attribution than h40b's committed 35 (where R07F was "not graded"). Any paraphrase-dispatched answer on h40c counts toward the ≥ 35 floor where it would not have counted on h40b.

**Fix.**
- Name all three commits in the pre-registration.
- State that e311019 credits paraphrase dispatches.
- Fix the floor explicitly before the hour. Either keep 35 and name the bias ("h40b re-attributed on a copy: R07F becomes graded; all seven captured arms had it acceptable"), or register 36 as h40b under the current harness. One of the two, in advance.

### I6. The flight time, the grader and the meaning of PASS are not pre-registered
**Where:** PREREGISTER-h40c.md:3-5, :19-21, :58-61.

**The problems.**
- Rule 2 compares latency across hours against h40b, which flew at 13:30 local. The pre-registration fixes no date or time. `register-h40c.ps1` leaves `-StartAt` open.
- The probe owes a daytime window before any ship decision (PREREGISTER-hedge-probe.md:18-19), and the draft does not say whether h40c is that window or what a PASS licenses.
- The grader is "recorded", not pinned. Memory (grader drift) says 5 → 5.5 cost 4-7 of 39. The rule-3 floor is h40b's claude-opus-5-5 count.

**Fix.**
- Register the intended date and local start time. Match h40b's 13:30 if the latency comparison is to mean anything. If the hour slips, state the allowed slip.
- Say whether a PASS satisfies the probe's owed daytime window (define daytime) or only licenses a further window.
- Pin the grader to claude-opus-5-5, and say what happens if the agent alias resolves to another model: the comparison is reported, not gated.
- Fix the result filename now (`passes/<date>-h40c-result.md`), not "the committed filename the controller assigns it" (:4-5).

### I7. `register-h40c.ps1` adds StartWhenAvailable, which h40b did not fly with and h40b's review flagged
**Where:** register-h40c.ps1:40 and :9-10.

**What h40b actually had.** Read-only `Get-ScheduledTask`: Natively-flight-h40a and -h40b both have `StartWhenAvailable=False`, WakeToRun=True, 5 h, battery-tolerant. h40b's final review (sdd\2026-09-25-flight-h40b\final-review.md:119-133 and :225-227) named `StartWhenAvailable=True` as a regression: "a closed lid at 17:00 causes a late start at an arbitrary time". It was corrected to h40a's False.

**What this script does.** The script's comment (:9-10) claims h40b's task was corrected to include StartWhenAvailable. It was the reverse. The brief's own Task 8 line asks for `-StartWhenAvailable`, but the global constraint's list of h40b settings does not include it.

**Second problem.** `-StartAt` defaults to now + 2 min (:19). Run without it (the report's invocation is easy to truncate), the script starts a one-hour flight and roughly 500 requests two minutes later, possibly before the pre-registration is committed.

**Fix.**
- Drop `-StartWhenAvailable`, or keep it only with the controller's explicit, recorded override of h40b's ruling.
- Correct the comment.
- Make `-StartAt` mandatory.
- Print the real `$t.Settings` values (see M8).

### I8. The guard does not pin the tree the flight builds
This repeats h40b's final-review I-1.

**Where:** guard-h40c.mjs, whole file. There is no HEAD or working-tree check.

**The problem.** `auto` runs `npm run build:electron` after the guard (run.mjs:539-540). Whatever sits in MAIN's working tree at flight time gets compiled. Peer sessions share MAIN (memory: build captures concurrent edits). `done.json` records HEAD only.

**Failure scenario.** A peer edits `electron/**` between registration and the hour. The hour measures hedge plus that edit, under da28f25's name. Check 9 does not help: it runs before the flight's own rebuild.

**Fix.** Guard check 10:
- `git rev-parse HEAD` must equal the registered commit.
- `git status --porcelain -- electron src premium package.json` must be empty. The user's known dirty files are `electron/test/golden/interview60.chains.json` and `interview60.report.md`, so either whitelist exactly those two or scope the check to non-golden paths.
- Calibrate: touch a tracked `.ts` and watch the check fail.

### I9. The quota note is missing, and the brief's 3.1-lite figure undercounts
**Where:** PREREGISTER-h40c.md (absent); task-8-report.md:182-186.

**The count** (flight.mjs:54 and :138-151):
- 3.1-lite:
  - bare 33 + low 33 + captured-minimal 44 + captured-low ×3 132 = 242 fixed;
  - plus back legs (~30% of about 45) and M6 redirects;
  - plus the auto probe's 5 × 3.1-lite pings per attempt, repeated every 2 min while 429;
  - plus app warm-ups (~6 per hour per model), preflight and chains.
  - That is about 270 + chains, not "≈ 210 + chains".
- 3.5-lite: about 45 fronts + 132 + 33 + 33 ≈ 243 + redirects + warm-ups.

Both fit under 500 on a fresh day. Task 6/7's replay (~60-120 on 3.1-lite) plus Task 7's smoke on the same quota day pushes 3.1-lite to about 400 + chains.

**Fix.** Put the corrected per-model budget and the rule "fly on a quota day with no replay or smoke on it, or check the ledger first" into the pre-registration (or the flight checklist). Correct the report's claim.

### I10. The stats script's positive calibration never met a real hedge log
**Where:** SP\h40c-stats-cal-synth.

**Where the fixture's shapes differ from real code:**
- the startup line sits inside the window (see I2);
- `no answer - front error, back error` appears with no preceding `back started ... reason=front-error` or `failed before its first token` line;
- `Stream failed` is tagged `[WARN]`, but real code uses `console.error`, which gives `[ERROR]`;
- no redirect's `[WhatToAnswerLLM] verbal primary failed before first token … redirecting` line and no `(fallback)` answer-source line.

The regexes happen to tolerate these differences. The brief's required smoke-folder calibration is still PENDING.

**Fix.** After Task 7's smoke, run the stats script on a copy of the smoke's log. The run window should be built so the startup line sits before `startDebug`. Record the output in the flight checklist as a blocking item before arming.

---

## Minor

- **M1.** guard-h40c.mjs:113-114: check 8's `(hedge)` substring matches only a JSDoc comment in dist `WhatToAnswerLLM.js` (line 107). The regex literal is `\(hedge\)` and does not contain the substring. A build that kept the comment but lost the code would pass. Match `HEDGE_WINNER` or the text `\\(hedge\\)__` instead.
- **M2.** guard-h40c.mjs:116-120: check 9 runs before the flight's own rebuild, so it proves only that the pre-flight dist is fresh. It can also fail-closed on a harmless `touch`. Keep it, but say in the comment that the source checks (5, 8) are the ones that bind, because the flight rebuilds after the guard.
- **M3.** launch-h40c.cmd has LF-only line endings. launch-h40a.cmd and launch-h40b.cmd were CRLF and proven. This file has no labels or GOTO, so the risk is low, but it is the flight's entry point and has never run, not even as a dry run. Convert it to CRLF and register a `--dry-run` twin (as `launch-h40b-dry.cmd` was) before arming. It is otherwise shape-correct: ASCII, no parentheses in if-block echoes, the working directory comes from the task, the error log is `%TEMP%\natively-h40c-launcher-error.log`, and the guard path is `%~dp0`.
- **M4.** h40c-hedge-stats.mjs:179: `new URL(import.meta.url).pathname` is percent-encoded. If the script is ever copied under `Masaüstü`, `isMain` is false and it prints nothing and exits 0. Use `fileURLToPath(import.meta.url)`.
- **M5.** h40c-hedge-stats.mjs:115: `m[1].includes('3.5')` would also match a future `gemini-3.5-flash`. Compare with `=== 'gemini-3.5-flash-lite'`.
- **M6.** PREREGISTER-h40c.md:52-56: say explicitly that the ≥ 35/45 count covers all 45 items, and that the five-follow-up exclusion applies only to the zero-wrong clause.
- **M7.** PREREGISTER-h40c.md:56: under the hedge, the in-app answers are a mix of 3.5-lite HIGH and 3.1-lite LOW, so h40b's per-model twin band is not the right reference. If the band stays "reported", say which band (per-item by winning model, or both) before the hour.
- **M8.** register-h40c.ps1:47 prints a hard-coded settings string rather than reading back `$t.Settings`. Print the actual values: DisallowStartIfOnBatteries, StopIfGoingOnBatteries, WakeToRun, StartWhenAvailable and ExecutionTimeLimit. The report's invocation (:173-174) uses a relative `-File register-h40c.ps1`; give the absolute SP path.
- **M9.** The draft's "DRAFT —" banner (:3-5) and the Task-8 "Verification" section (:83-103) must be settled before the commit. Either the banner goes, or the file is committed as written. After the hour neither can change.
- **M10.** No full-Flash sidecar is mentioned. The global constraints say full Flash is unused, but h40b ran one with a blind builder that dropped parents (fixed in Task 4). State "no full-Flash sidecar on h40c". If one is run anyway, it uses the Task-4 blind builder and is descriptive only.

---

## Checked and fine

- The h40b numbers match the committed result: TTFT 5.0/13.6 s, in-app 35/45, Live ear 17/44 and 4/44, bare arms moving by up to 5 of 33, stamp 8564ba96369a, the 10 s p90 row failing on the stall path alone. The probe's pooled numbers (4.4 vs 6.1 s, 11.5 vs 13.3 s, 0 vs 0, 95/117) match. The rule-2 shape (median + 1.0 s, p90 no worse, no-answers no worse) is the probe's own rule (PREREGISTER-hedge-probe.md:21-25).
- The model-attribution trap (M7) is handled correctly in the pre-registration text (:27-37). In the script, the per-window label prefers won-by and otherwise takes the last `answer source:` line. Its negative calibration shows the naive first-label rule gives `{3.1: 3}`.
- Redirects: a second `front=` inside one dispatch window is counted as a redirect. That matches the code path: both legs fail → throw → `withVerbalFallback` picks 3.5-lite (`answering` is still 3.1) → `streamVerbalWithGeminiFlash(3.5)` → the hedge again. The h40b log is 1:1 between dispatches and race lines (46/47), with no extend or supersede re-generations, so on this roster a second `front=` is a redirect.
- First-token lines come from `tapFirstToken(…, t0)` in WhatToAnswerLLM, measured from the start of generateStream. They include hedge and redirect time, as h40b's did. The script reproduces h40b's 5.026 s / 13.608 s.
- The answer arms (answers.mjs, chains.mjs) use only `prompts.js` and `verbalStreamFilter.js` from dist, not LLMHelper, so `NATIVELY_VERBAL_HEDGE=1` in the flight's environment does not change any comparison arm.
- The guard's checks 1-7 are correct against the real dist. The real-dist calibration (guard-h40c-realcal.txt) is 5/5; check 8 and 9 negatives were shown on the stub tree.
- The register script matches the brief: 5 h, AllowStartIfOnBatteries, DontStopIfGoingOnBatteries, WakeToRun, Interactive, working directory = the `.git`-filtered MAIN, ASCII. StartWhenAvailable is the exception, covered in I7.
