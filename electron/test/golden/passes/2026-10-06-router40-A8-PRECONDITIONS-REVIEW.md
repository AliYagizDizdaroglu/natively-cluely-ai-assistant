# A8.4 step 7: Opus re-review of the A8 preconditions (router40)

Reviewer: Opus, a fresh session separate from the implementer. Written 2026-10-06, begun 01:14 TST (`date`).
Read-only except this file. What I ran: `node run-all-cals.mjs`, `node mutate-check.mjs`, and three throwaway scripts in my
own scratchpad (event kinds per item on `router40-R`; the reader variants against `cal-read-r.mjs` on a scratch copy).
No build-blind, grader, classifier or model call. No scheduled task touched. No answer text printed.

## Verdict

**APPROVE WITH FIXES: 0 BLOCKING, 1 IMPORTANT, 6 MINOR.**
- I1, the freeze and the 04:15 gate are correct and calibrated.
- One I2 bypass remains, and a calibration case enshrines it (I-A). A8.4 step 7 needs APPROVE, so `build-blind` waits for
  I-A. I-A touches only scoring (P8), so the fix may land after `build-blind`, if the controller rules so.
- The MINORs need no action before `build-blind`.

## Integrity

| item | expected | read | ok |
|---|---|---|---|
| A8 seal (bytes above the seal line) | `0b1dadec…74a3` | `0b1dadecbc634c48b554b5aee46931bfbf1fee316015036c54885c09e8c274a3` | yes |
| `A8-PRECONDITIONS.diff` | `2589fa145af0` | `2589fa145af071dc…eb21` | yes |
| `HARNESS-REVIEW.md` / `USER-RULINGS.txt` / `A8-RECHECK.md` | A8's read-as values | `48fabcaa…` / `6db50027…` / `506d78c8…` | yes |
| every changed file and record in the report's table (read-r, pre-A8 reader, audit, score, build-blind, the cal-* files, r40-common, pre-run, mutate-check, reader-diff-R.txt, prefix-fail record) | as the report lists | same 12-char prefixes | yes |

- My re-run of `run-all-cals.mjs` rewrote `cal-out\ALL.txt` and the `*.cal.txt` files at 01:15–01:16. Only the timings
  changed: same counts, all PASS. `ALL.txt` no longer hashes to the report's `0dafa48d78d4`.
- My mutation run rewrote `cal-out\mutation-check.txt`.
- Copies of the implementer's originals are in my session scratchpad (`calout-before\`).

## (1) L1–L4: they fail before the fix and pass after, for the right reason. PASS

**Reproduced, not just read.** On a scratch copy, `cal-read-r.mjs` gave:

| reader | result | failing |
|---|---|---|
| `read-r.pre-A8.mjs` (`01a4fbe3…`) | 30/34 | L1, L2, L3, L4 |
| fixed `read-r.mjs` (`297f8765…`) | 34/34 | none |
| itemDone bound only (`===` kept) | 33/34 | L4 |
| `>=` only (no bound) | 30/34 | L1–L4 |

- **Each part of the fix is tested by its own case.** The bound is tested by L1–L3, and `>=` by L4.
- **The failures happen for the right reasons:**
  - L1: the late turn adds 8 words, 76 → 84, so `too-long`.
  - L2: the close in the gap reads as `missing`.
  - L3: the gap's turnComplete makes `lastTurnTerminated` true, so `answer`.
  - L4: 2 turns = 2 segments, so both are joined.
- **The order holds.** The record was written at 00:40:23, the same second as `cal-read-r.mjs`, and before the reader
  changed at 00:40:36.
- **Case 21 was moved, not flipped, and correctly so.** Real runs write `close` BEFORE `itemDone` when a session dies
  mid-item: `run-r.mjs:245` writes `close` in `onclose`, then the wait loop exits and writes `itemDone` (`:301`).
  `router40-R` shows this: in RH05~a1, the 1006 close is at index 88 and `itemDone` at 89. So a mid-item abnormal close
  is still `missing`, and only a close in the gap becomes `silent`.
- P3a-flip reports exactly case 5. P3b gives 46 answer + RH14 silent, max 79 words, T byte-equal 46/46.

## (2) I1 is fixed without changing any other classification. 0/47 is plausible. PASS

- **The code matches HARNESS-REVIEW I1:**
  - `after` stops at the item's first `itemDone` after `clipEnd`.
  - Text comes from the first `segs.length` turns of `ans.turns` when there are at least that many.
  - The same `after` feeds the abnormal-close test and `lastTurnTerminated`.
- **0/47 checked on my own.** I counted the event kinds after `itemDone` for each item of `router40-R` (kinds only):
  - The only kinds are `gapStart` ×16, `close(1000)` ×31 and `chainStart` ×30.
  - There is no `outputTx`, no turnComplete and no abnormal close after any `itemDone` on a graded item.
  - The `ans.turns` count equals the segment count on all 47 graded items. The one mismatch is RH05~a1, which is never
    read.
  - So neither the bound nor `>=` can change a graded item. 0 class, 0 word-count and 0 T changes is the expected result.
- `reader-diff-R.mjs` imports both readers side by side and prints classes and counts only. Its rows read `answer` ×22
  and `hard` ×25.

## (3) I2: can the audit requirement be bypassed?

| path | result | case |
|---|---|---|
| missing audit for a slot | INCOMPLETE | S-A5 |
| no `audits.jsonl` | INCOMPLETE | S-A6 |
| no `launches.jsonl` | INCOMPLETE | S-A7 |
| wrong session (audit ≠ the slot's last launch) | INCOMPLETE | S-A4 |
| stale audit of attempt a1 after a re-grade a2 | INCOMPLETE (session mismatch) | by construction |
| memory LOADED / not pinned | INCOMPLETE | S-A2 / S-A3 |
| transcript not found | clean=false, memory UNKNOWN | P7-19 |
| **the same session: NOT CLEAN, then a later clean line** | **CANDIDATE** | **S-A8: bypass (I-A)** |

- A stale verdict file cannot ride on a clean re-grade: `launch-grader-r40.mjs:78` refuses while the earlier attempt's
  verdict file exists.
- A tag/session swap fails closed. The audit's session is the transcript's own uuid, and it must equal that slot's last
  `session_id`.

### IMPORTANT

**I-A. A re-audit of the same session clears a NOT CLEAN, and S-A8 calibrates this as correct.**
- **Where:** `auditProblems` in `score-r40.mjs`. It takes the slot's last audit line, wherever it comes from.
- **The calibration enshrines it:** `cal-score-r40.mjs:151–152` (S-A8, "a re-grade") writes `{…okAudit(SLOTS[3]),
  clean: false}` and then `okAudit(SLOTS[3])` with the **same** session, and expects CANDIDATE. A real re-grade has a
  new session.
- **Effect:** suppose a session fails its audit and is then re-audited without a re-grade, for example with a different
  `--blind-dir` or `--projects`, or after its transcript is touched. Its verdicts then count. Registration §6.1 says a
  failed session is re-graded, not re-audited.
- **Fix (P8 only):**
  - Per slot, take the last launch's `session_id` first.
  - Require at least one audit line with that tag and session.
  - Require **every** audit line for that session to be clean, ABSENT and pinned.
  - Re-state S-A8 as a true re-grade: the a1 session NOT CLEAN, an a2 launch line, the a2 session clean → CANDIDATE.
  - Add S-A8b: the same session NOT CLEAN, then clean → READING 1.
  - Add a mutation that keeps only the last line for that session; S-A8b must catch it.
- **Timing:** P5 does not read audits, so this can land after `build-blind` and before any `score-r40` run, if the
  controller rules so.

## (4) The sha freeze works, within its stated scope. PASS

- **Build side:** `build-blind` writes `keyhold\build-record.json` with the sha256 of `read-r.mjs`. It refuses to
  overwrite the record. The record sits beside `key.json`, outside `blind\` (P5-17).
- **Score side:** `score-r40` checks the freeze before `loadReal`.
  - It exits 2 when the sha differs (S-F2, both shas named) or when there is no record (S-F3).
  - `readerFreeze` hashes the same file that `score-r40` imports (`grade\..\read-r.mjs`).
- **Mutations caught:** sha1, always-ok, and ok-with-no-record (P5e, P8k, P8l).
- Scope limit: see M-1.

## (5) The 04:15 gate and the builder's four flags

- **The gate is correct.**
  - `GATE_START = new Date(2026, 9, 6, 4, 15, 0)` is local time, and the test is `>=`.
  - GR10 (04:14 FAIL), GR10b (04:14:59 FAIL), GR11 (04:15:00 PASS), GR12 (04:16 PASS), GR13/13b, GR14/14b, P6-20/20b and
    P6-20c/d/e all PASS. X3 PASSes at 01:15 real time.
  - Mutations P9o, P9p, P6h, P6i and P9q target exactly these cases.
  - The R and L arms are gated only by the tonight window, so moving `GATE_START` does not reopen a run arm.
- **The leftover tonight branch: MINOR (M-2).** No action needed.
- **X3 and P6-10 SKIP after 04:15: correct.**
  - A8.4 step 6 says X3 "is not read as written" at or after 04:15. A SKIP is printed by name and never counted as a
    PASS (`cal-util.mjs` `skip`).
  - Both real invocations still run but cannot launch anything: X3 is the P9 checks, and P6-10 is `--dry-run` on a temp
    folder.
  - Residual: after 04:15, no real-clock case exercises the gate. The stub-clock cases GR10/GR11/P6-20* carry it.
  - Any re-calibration after 04:15 (for example for I-A) must quote the 2 SKIP lines in its record.
- **GR9 flipped to FAIL: correct.**
  - A8.2 requires it: "Added to that mode: … both arms complete". A8.4 step 6 requires the same in its "Arms-complete
    case".
  - A8.4 does not name GR9 by id, so the report's "all named in A8.4" is slightly loose. The requirement itself is
    explicit.
- **The freeze covers `read-r.mjs` only: MINOR (M-1).** This is what A8 requires, with a gap.

## (6) Anything missing

### MINOR

**M-1. The freeze does not cover what the reader imports or reads.**
- The reader's classes also depend on things outside `read-r.mjs`:
  - `r40-common.mjs`: `words`, `normWords`, `BLOCKS`, `REGISTERED.tooLong`, `loadInstruction`, `loadItems`;
  - the run and answers files.
- A whole-file sha of `r40-common.mjs` would also refuse after a legitimate gate edit under A8.1's split rule.
- Better: at build time, record a sha of `readRun`'s per-item output (id, rc, w, T). `score-r40` recomputes and compares
  it. This covers every input. It is cheap to add with I-A.

**M-2. The leftover tonight branch accepts a clock inside 2026-10-05 21:45–23:15 for `grade`.**
- It cannot be reached in a real run:
  - real runs refuse stub clocks (X1, P6-7/7b);
  - the window is in the past.
- Only a host clock set back by a day would reach it.
- Removing it now would disturb GR1–GR4 and the mutation list just before the build. Keep it, as the report says.

**M-3. No pre-change copy of `cal-build-blind-r40.mjs`, and it is not in the diff.**
- I read its one new case, P5-17, directly: it checks that the sha is equal and that the record is not in `blind\`.
- Nothing else in the file was diffed.

**M-4. Comment drift.**
- The header of `launch-grader-r40.mjs` still says "after 10:00".
- The comment on `realClockRefuses` in `cal-util.mjs` still says 10:00. That is harmless: R and L real invocations are
  refused by the tonight window regardless.

**M-5. c3/c4 audits are not read by any code.**
- I2 and `auditProblems` cover the 8 grader slots only. `score-r40` and `check-classify-r40` never read
  CLEAN/ABSENT/PINNED for the classifiers.
- That is outside I2's wording. It stays a controller check, and should be named in step 8/9's written lines.

**M-6. run-r's `answerFor`/`turnsFor` are still unbounded.**
- The reader's `>=` slice depends on the late turns coming last in `ans.turns`.
- That holds by construction: turns are appended in time order. On `router40-R` it never applies.
- Recorded only.

## Not shown
- I re-ran the calibrations at 01:15 (before 04:15), so the SKIP branches of X3/P6-10 were not exercised.
- Not verified (A8 M-5): flight-eq's FR-slot use, and `Natively-*` scheduled tasks entering `T_any`.
- The real `claude` launch record's `session_id` = transcript uuid identity is taken from FR's launcher and the
  calibrations, not observed on a real launch.
- My runs: `run-all-cals.mjs` at 01:15–01:16 gave ALL PIECES PASS (P9 105/105, P2 33/33, P3 34/34, P4 45/45, P5 19/19,
  P6 32/32, P7 22/22, P8 52/52, P1 13/13). `mutate-check.mjs` at 01:16–01:29 gave "MUTATION CHECK: 90/90 mutations
  caught". After both runs, no `grade\blind`, `grade\audits.jsonl` or `grade\keyhold` exists.
- No mutation covers I-A's same-session path, because S-A8 asserts the bypass as correct.

## Re-review

Scoped re-review of the I-A, M-1 and M-4 fixes. Same reviewer and rules, with a 25-minute time-box: begun 05:25, ended
05:40 TST (`date`). I ran `run-all-cals.mjs` (05:25:43) and `mutate-check.mjs` (05:26–05:38) and read the changed code.
Nothing else was run. After both runs, `grade\blind`, `grade\keyhold`, `grade\audits.jsonl` and `grade\grading` do not
exist.

### Verdict: APPROVE (0 BLOCKING, 0 IMPORTANT, 3 MINOR). A8.4 step 7 is met.

**Shas match the coordinator's:** score-r40 `ca45b2d63967`, build-blind `0bab422e1da5`, r40-common `e59546014cca`,
launch-grader-r40 `52453003fa2e`, diff `497e91b39ffa`. `read-r.mjs` is unchanged (`297f87656b0d`).

**Calibrations, run after 04:15:**
- ALL PIECES PASS: P9 104/104 (1 SKIPPED), P2 33/33, P3 34/34, P4 45/45, P5 20/20, P6 31/31 (1 SKIPPED), P7 22/22,
  P8 56/56, P1 13/13.
- The two SKIPs, as A8.4 step 6 requires, quoted verbatim:
  - `SKIP  X3 | real mode, arm grade, no stubs | not run: the real clock is at or after 2026-10-06 04:15: A8 says its expectation must be re-stated before it is read`
  - `SKIP  P6-10 | a real-clock dry run on a temp blind folder | not run: the real clock is at or after 2026-10-06 04:15: the date gate no longer refuses, so there is nothing to assert`

**Mutation check:** `92/93 mutations caught -- 1 NOT CAUGHT`. The coordinator's 93/93 came from the builder's run at
01:57, before 04:15. The one miss is a bookkeeping artifact, not a gap (Re-M1).

**I-A: CLOSED.**
- `auditProblems` now works per slot:
  - it takes the slot's last launch;
  - it keeps that slot's audit lines whose session is that launch's `session_id`;
  - it requires at least one of them, and that **every** one is clean, ABSENT and pinned.
- S-A8 is now a real re-grade: an `old-attempt` session that is NOT CLEAN, then a new last-launch session that is clean.
  It reads CANDIDATE.
- S-A8b (the same session, NOT CLEAN then clean) reads INCOMPLETE.
- S-A4, S-A5, S-A6, S-A7 and S-A9 still read INCOMPLETE.
- Mutation P8o (`.slice(-1).every`, which brings back "the last line decides") is CAUGHT by S-A8b.

**M-1: works.**
- `readerOutputSha(rows)` is the sha256 of `JSON.stringify([id, rc, w, T] per item)`.
  - build-blind writes it from the same `readRun` rows it builds the pairs from.
  - score-r40 recomputes it from `loadReal`'s `readRun` and refuses with exit 2, naming both shas (S-F6), or with no
    field (S-F7).
  - S-F1 shows the build-time and score-time values agree on the synthetic tree (READING 5).
- Mutations P8p, P8q and P5f are CAUGHT.
- It covers `r40-common.mjs`, the run and answers files, and any `--runs-dir`. A legitimate gate-only edit to
  `r40-common` passes, because the output does not change.
- `score-r40` uses no other reader field (`hardTail`, `earlyWords` and `why` are unused), so `[id, rc, w, T]` is complete.

**M-4:** the header of `launch-grader-r40.mjs` now says "from 04:15 local (A8.2)". The comment on `cal-util.mjs`
`realClockRefuses` still says 10:00. That is harmless, as before.

### MINOR
- **Re-M1:** mutation P6b lists P6-10 among its expected failures. P6-10 is SKIPPED after 04:15, so the check reports
  MISSED. The mutation is still caught by P6-5b, P6-6, P6-15, P6-16, P6-16b, P6-17, P6-18, P6-20 and P6-20c.
  - Fix, optional: drop P6-10 from P6b's list, or count a skipped case as n/a.
  - My run overwrote `cal-out\mutation-check.txt` (it now reads 92/93) and `cal-out\ALL.txt`. The builder's 01:57
    records are gone from `cal-out`.
- **Re-M2:** the `launch-grader-r40.mjs` change (`ef8b2851…` → `52453003…`) is not in `A8-PRECONDITIONS.diff`, and
  there is no pre-change copy.
  - I read the new header line and the guard section; they match what I reviewed at 01:2x.
  - That this change is a comment only was not verified byte for byte.
- **Re-M3:** `outputFreeze` runs after `loadReal`. If the reader's output has drifted so that an item reads `answer`
  with no RL grade, `loadReal` throws before the named refusal is printed. This fails closed (non-zero exit, no
  READING); only the message differs.
- Also noted: after 04:15, P6-9's real invocation (no `--dry-run`) is kept safe only by `pairs.blind-1.json` not
  existing. It is skipped once `build-blind` creates the file. Safe as written.

### Not shown
- No end-to-end case changes `r40-common` (for example `tooLong`) and watches score refuse. S-F6 tampers the record
  instead. By construction any change to rc, w or T changes the sha.
- It is unconfirmed that the launch record's `session_id` equals the transcript uuid on a real launch.

## setting-sources review

A scoped review with a 10-minute time-box, 06:16–06:19 TST (`date`).
- No claude call was made.
- I ran `run-all-cals.mjs`, `mutate-check.mjs P6` and `mutate-check.mjs P7`.
- I ran `audit-r40.mjs` (no `--record`, so it wrote nothing) on 3 existing probe transcripts.

### Verdict: APPROVE (0 BLOCKING, 0 IMPORTANT, 1 MINOR)

**Scope: the change is limited to the flag.**
- `launch-grader-r40.mjs` is now `77b50cbd897e`. Against `launch-grader-r40.pre-A8b.mjs` it has three changes:
  - `pinModel` returns `[...args, '--setting-sources', 'project,local']`, with the model pin unchanged;
  - `argvFacts` gains `settingSources`;
  - the facts line prints it, or `MISSING`.
  pinModel serves both the grader and the classifier argv.
- `cal-fake-claude.mjs` changed in one way: `allowedTools` now stops at the next `--` option, and the stand-in records
  `settingSources`.
  - Without that stop, the appended flag would have been counted as allow rules.
  - P6-11b asserts the count is still 3.
- `cal-launch-grader-r40.mjs` only adds P6-1d, P6-4c, P6-11b and P6-14b.
- `mutate-check.mjs` adds P6j/P6k and drops P6-10 from P6b's list, which fixes Re-M1.
- Unchanged since my 05:40 re-review: `audit-r40` (`217653bb7760`), `cal-audit-r40`, `score-r40` (`ca45b2d63967`),
  `build-blind` (`0bab422e1da5`), `r40-common` (`e59546014cca`), `read-r` (`297f87656b0d`) and `pre-run-r40`.
- No other `.mjs` file in R changed after 05:40.

**Calibrations, at 06:16:**
- ALL PIECES PASS: P9 104/104 (1 SKIPPED), P2 33/33, P3 34/34, P4 45/45, P5 20/20, P6 35/35 (1 SKIPPED), P7 22/22,
  P8 56/56, P1 13/13.
- The SKIPs are X3 and P6-10, as before.
- P6-1d, P6-4c, P6-11b and P6-14b PASS.

**Mutations:** P6 gives 11/11 caught, including P6j (flag removed) and P6k (`user,project,local`), and P6b is now
CAUGHT. P7 gives 5/5 caught. I did not re-run the full 95.

**P7 still detects LOADED, checked on real transcripts.**
- With `audit-r40.mjs`, the live probe without the flag (`flight-eq\grading\failed-cwdprobe-1-a1-0547-claudemem\projects-slug\a88cf8cc….jsonl`)
  reads **memory LOADED (projectMemory=0 claudeMem=5)**, model PINNED.
- The probes with the flag, `fc0cd71d` and `96adb44c`, read **memory ABSENT (projectMemory=0 claudeMem=0)**, PINNED.
- The probes read NOT CLEAN only because their probe files are not a grader's allowed files. That is expected.
- The synthetic P7-10 ("Memory Index" → LOADED) and P7-18 (a LOADED session recorded with exit 1) still PASS.
- In the with-flag probes, Read ×1 and Write ×1 ran under `dontAsk`. So the allow rules placed before the appended flag
  were still honoured by the real CLI.

### MINOR
- **SR-M1:** no synthetic P7 case and no mutation covers the claude-mem branch (`claudeMem > 0`) of the memory scan.
  - Only the project-memory marker (P7-10) is calibrated. The real a88cf8cc read above is the only known answer for
    this branch.
  - Optional fix: add a P7 case from a claudeMem-marked transcript, plus a mutation on that branch.

### Not shown
- `b9dd308a` was not re-audited, for the time-box.
- The full 95/95 mutation run was not repeated; only P6 and P7 were.
- No real grader launch with the flag has been made yet in router40's own grading folder.
