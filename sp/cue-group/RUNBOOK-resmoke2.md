# RUNBOOK: the combined build and its re-smoke (the operator's steps; the controller runs them)

Replaces Task 2 of the early-close plan (Opus spec review, I2, I4, I5, M3, M4, M5). ONE build carries three commits:
Task 1 (the early close), Task 1b (the two source-text pins), and the offers task (the offers block before the
answer). `WT` = the whole-turn worktree, `SP` = the session scratchpad, `CG` = `SP\cue-group`.

Hard rules for every step:
- No test, build or type check while a `Natively-*` task is Running, and none started within 15 minutes of a task's
  next run time. Scheduled Live probes: 20:00, 04:30, 10:00.
- After step 3 (the build) NOTHING under `WT\electron\` is touched until the scheduled run has ended: no edit, no
  `git checkout`, no mutant. The run's `auto` step rebuilds the dist when any `electron\**\*.ts` is newer than the
  oldest output, and would then fly whatever the working tree holds.
- Keys stay in MAIN's `.env`; scripts read them in-process.

## 0. Preconditions (all must hold; print each)

1. `git -C WT log --oneline -4`: the three task commits on top of the docs head, each with its Opus task review
   recorded as approved in the early-close ledger.
2. `git -C WT status --short`: only ` M electron/test/golden/interview60.report.md` and ` M natively_debug.log.1`.
3. No `Natively-*` task Running; print every task's next run time.
4. `CG\old-dist\verbalStreamFilter.e3fae5f.cjs` exists, sha256/16 `ecf0a42c2df10007` (the v2 filter, saved 19:20).

## 1. The gates at the final head (one PowerShell call each, the guard line first)

- Full suite from a temp cwd: expect `Test Files  1 failed | 101 passed (102)` (the replay file, ENOENT from a temp
  cwd) and `Tests  <n> passed | 8 skipped`, 0 failed. `<n>` = 1004 + Task 1's new cases + the offers task's.
- `interviewerTurn.replay.test.ts` from the worktree root: 12 passed.
- Type checks: electron 6 (the same six), root 0.

## 2. (reserved)

## 3. The build

```powershell
if (Get-ScheduledTask -TaskName 'Natively-*' | Where-Object State -eq 'Running') { throw 'a Natively task is Running' }
Set-Location '<WT>'; cmd /c "npm run build:electron"
```

Exit 0, a `Done in` line. Then the same command AGAIN: it must print `Up to date, skipping build`. If it builds a
second time, a source is newer than an output: find out why before going on.

## 4. What the dist is

```
node SP\dist-proof.mjs --root <WT> --expect combined --prefix-count 3 --offers-marker "offers block before the spoken answer"
```

Expect `DIST PROOF: THE COMBINED BUILD, every marker as expected`: the six v2 markers, `CUE_LINE_PREFIX` three times
(the declaration, the cue parser, the offers guard), the offers fix's log text once, the `CUE_RULE` hash
`8e15e4e7dd41`, limits 3 x 5. (Calibrated on the v2 dist: it reads as v2 and NOT as combined.) Record the filter's
new sha256/16 and `main.js`'s write time.

## 5. The same observation, before and after: the saved replies through the old and the new filter

```
node CG\old-vs-new-replay.mjs --new <WT>\dist-electron\electron\llm\verbalStreamFilter.js
```

Expect `REPLAY AS PREDICTED (9 changed, ...)`: exactly the 9 offers-first replies change, each from 0 shown words to
its answer (153, 53, 59, 59, 79, 104, 63, 55, 58); the one reply with offers and no spoken answer stays empty; no cue
report, no offers report and no other reply's text moves at chunk sizes 1, 7, 90 and whole; the new chain writes its
offers-first line for exactly those 10; one reply shows a second `__CUES__` line with both filters (known).
(Calibrated on four known answers: `old-vs-new-replay.cal.out.txt`.)

## 6. The calibrations that read the dist, again

`calib-cue-smoke.mjs` (26), `cal-probe-shipped.mjs` (22; its "a block plus offers, no spoken answer" case must still
read 0, and its offers-first case must print `this dist CARRIES the offers fix -> the answer only` with
`[["Boosting"],5,10]`; on the v2 dist it printed `LACKS ... 0 words, the defect` with `[["Boosting"],0,10]` at 19:53,
the same observation before the fix), `cuebench-calibrate`, `cal-hold-read.mjs` (47). Save each output beside the old
one.

## 7. The launcher, the guard check, the registration

```
node SP\edit-launcher-resmoke3.mjs
SP\guardcheck-smoke-cues.cmd            (working directory WT)  -> GUARDS_ALL_PASSED
```

The edit: the gate deadline 09:00 (the task is killed at 10:00); two more dist guards; the dist proof printed BEFORE
the run and AGAIN after it. Run the guard check from `WT` and see `GUARDS_ALL_PASSED`; then once from MAIN's folder
and see it refuse (a guard that cannot fail proves nothing).

## 8. Pre-register, then arm

1. Amend `WT\electron\test\golden\passes\PREREGISTER-cuesmoke.md` with a dated section for this run, BEFORE arming:
   the PASS rule unchanged; "What flies" (the three commits, the build time, the dist proof's lines); the early close's
   timing expectation (below) with its consequence; how a block-only answer is confirmed (its own `budget: words=0`
   line between its cues line and the substitute); the report's `hard failures` line is read beside the check (an
   answer that starts with words and ends with `[No answer ...]` counts as real in the check); the offers-first line
   count is reported, and 0 is likely in 22 answers; Friday's `first token` = the first prose chunk after the block.
2. Commit that file (docs only; it is not under a `.ts` path, so the dist stays up to date). Then run the build
   command once more and see `Up to date, skipping build`.
3. `powershell -NoProfile -ExecutionPolicy Bypass -File SP\register-cue-smoke.ps1 -StartAt '2026-10-01T05:00:00' -Hours 5`
   -> state Ready, next run 05:00.
4. A background sleeper wakes the session at 05:55.
5. **Only now start ET38** (Opus round 2, I1: the `Natively-*` guard cannot see a background node test, so no
   vitest, tsc or build may run beside it). Steps 1-8.3 held the night's last heavy runs. First `ListAgents`: a peer
   session still busy is asked by message not to run tests or builds until ET38 has ended. Then, as a background Bash
   command, `node SP/et38/go-et38.mjs` (pre-flight health probe, LOW r1-r3, MEDIUM with its early stop; its window
   guard refuses any run that could reach 04:25, and the rest waits for the window after 06:30). From here to the
   end of the night: node scripts that read files, and nothing else.

**The timing expectation (spec 8.2, `hold-read.mjs` `holdVerdict`).** Counted answers: a won-by line, a non-empty cue
block, words, a stream of 50 ms or more. n under 12: NO VERDICT. GONE: R2 under 15 ms in at most a quarter AND B
under 15 ms in at most a quarter. NOT GONE: either in at least half. Otherwise NO VERDICT. Before (v2, 16:12):
n 21, R2 15, B 16: NOT GONE. It is not part of the smoke's PASS. NOT GONE or NO VERDICT: read the dist proof first;
a wrong dist = rebuild and re-smoke once; a proven dist = report the counts and rows, the user decides. An answer
with the offers-first line has a small R1 and a late first token: read its B and its cues-to-first-token column.

## 9. After the run (05:00 to about 05:50)

1. `WT\electron\test\golden\interview60.runs\smoke-cues.launcher.log`: the first dist proof; `Up to date, skipping
   build` from `auto` (a `Done in` line there means the task built: say so, and name the tree it built from);
   `AUTO EXIT`; the second dist proof (same filter sha); `CHECK EXIT`.
2. The three PASS conditions by the pre-registered text. A block-only answer is confirmed by its own `words=0` line.
3. `node CG\smoke-facts.mjs <run dir>`, `node CG\hold-read.mjs <run dir> --list`, the count of
   `offers block before the spoken answer` lines in the run's debug log. Read each warn line WITH its answer (Opus
   round 2, m5): warn + `budget: words=0` + the substitute = a TRUE block-only reply whose offers led (a cue failure);
   warn + words = an offers-first answer the fix recovered. Count answers, not lines: a redirect after a stream died
   inside a leading block can write a second line for the same question. Compare hold-read's PRINTED lines with
   `CG\hold-read.resmoke.v3.out.txt` (the 16:12 run through the same script, same populations), never with the spec's
   prose medians (m7).
4. The pass record (`interview60.pass-record.mjs`, then restore INDEX.md), the result note, one docs commit.
5. What the user looks for on the overlay during a run: the cues and the first words appear together and the rest
   streams; the bar under the answer shows a first-token time a few tenths of a second under the total and a rate in
   the hundreds, not the tens of thousands.

## 10. Only if the re-smoke passes all three conditions

Quota ledger, then the bench (`PREREGISTER-cuebench.md`, 117 calls on 3.5-lite HIGH) and the simple-question probe
(`PREREGISTER-cueprobe.md`, 52 calls), both on this build; 12 Opus graders; the score. The merge to MAIN needs the
re-smoke AND the bench, a merge review by Opus, and the follow-up replay first (`SP\followup-questions\RUNBOOK.md`).

**Ruling, 2026-10-01 01:18 (controller, under the user's "proceed on your initiative"; merge review M4).** The
follow-up replay is NOT run today and is no longer a precondition of the merge. The bench's second amendment (3a)
needs a day with "neither a flight nor another pre-registered replay on 3.5-lite", and the replay's §8 allows only "a
day with NO flight and NO cue bench". So they cannot share Thursday without amending two registered rules. The bench
stays today because the merge and Friday's hour depend on it. The replay moves to the first day with no flight and
no cue bench: Saturday 3 Oct, if that still holds. Its §6.2 calibration is re-passed after the merge, which its own
text allows. The filter sha change (d8fee6ca0170 → 42d9bc42dbd1, the cue merge) is the reason it states before
calling. The follow-up flag-off build and its flight shift after it.

**Refinement, 01:28 (the h40d review's I6 names it): both can stay on calendar Thursday, on different QUOTA days.**
Both rules define a day by the 10:00 local quota reset. The bench's ledger call starts the day at
`2026-09-30T07:00:00.000Z`, and the replay's §8 says "after 10:00 local … a day with NO flight and NO cue bench".
- **Preferred.** The bench runs on the 2026-09-30 quota day, which ends Thursday 10:00 local, right after the
  re-smoke, if all of these hold:
  - the re-smoke passed;
  - a precise ledger shows at least 150 requests of headroom on gemini-3.5-flash-lite. Count `usage:` and
    `trying` lines per request as `quota-ledger.mjs` does, plus the script calls since the reset: spike 6 at 10:03.
    The coarse `quota-ledger-today.mjs` mention count (598 at 01:27, an upper bound: about 9 lines per answer)
    cannot prove it;
  - the bench's first call is before 09:00, so its 117 calls end before the reset.

  Then:
  - the probe runs only if its own 52 still fit before 10:00; otherwise after 10:00, never overlapping the replay;
  - the follow-up replay runs after 10:00 on the 2026-10-01 quota day, which has no bench and no flight (h40d is on
    Friday's quota day), before the merge, so its instrument is still d8fee6ca0170;
  - its run log states the quota-day reading before the first call.
- **Otherwise:** the bench runs after 10:00 and the replay moves to Saturday, as ruled above.

**The merge, when the bench passes** (merge review `SP\merge-review\MERGE-REVIEW.md`, "Before" and "Right after"):
1. **I1, the user's one live look** on the worktree build, before the fast-forward, after the re-smoke has ended.
   The user starts it with `npm start`, never from Claude.
   - One answer: the numbered cues sit above it, and the first words appear with them.
   - The two typed questions, Context ON and OFF: no `__CUES__` or `1|` line in either bubble.
   - It goes into the result note.
2. **Refresh the prep merge.** The cue head moved with today's docs commits, and MAIN may have moved: merge again,
   and check that `git diff --stat <cue head> <new merge> -- . ':!electron/test/golden/passes'` is empty and that
   MAIN's tip is a parent.
3. **Freeze MAIN** (ListAgents; no peer editing MAIN), then `git -C MAIN merge --ff-only <merge>` (a real checkout).
4. **Rebuild MAIN's dist at once** (M1), then `node SP\dist-proof.mjs --root <MAIN> --expect combined --prefix-count 3
   --offers-marker "offers block before the spoken answer"`; the filter should hash to 42d9bc42dbd1.
5. **Gates in MAIN:** the full suite from %TEMP%, then tsc electron 6 (by file and message) and root 0.
6. **INDEX rows:** copy the cue run folders into MAIN's runs, then `--index` in MAIN.
7. **Memory:** the cue line, `project_typecheck_gate` (+3 lines), `project_ipc_routing`.
8. **Rollback:** while nothing else has landed, move MAIN's branch back to fed4b07 and rebuild. After that,
   `git revert -m 1 <merge>`.
