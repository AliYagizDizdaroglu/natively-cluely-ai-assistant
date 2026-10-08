# A8 pre-grading preconditions: implementation report

Implementer: Sonnet 5.5, 2026-10-06 00:39 to 01:14 TST (`date`). R = `natively-lab\sp\router40`.
No build-blind, grader, classifier or model call was run. No scheduled task, MAIN or app was touched, no key was read, no commit was made.
Nothing exists yet under `R\grade\blind`, `keyhold` or `audits.jsonl` (checked after the calibrations).
No process of mine is running (all background jobs finished).

**Seal:** the bytes of `AMENDMENT-A8.md` above its seal line hash to `0b1dadecbc634c48b554b5aee46931bfbf1fee316015036c54885c09e8c274a3`, matching the sealed value (rev4).
The whole-file sha is `b6c482cf...959b`; it is not the seal.

## Step results

| step | result | sha256 (first 12 unless noted) |
|---|---|---|
| 1. four late-event cases, unfixed reader | P3c-L1..L4 all FAIL on the unfixed reader (30/34 pass; the 4 failures are exactly L1-L4) | record `cal-out\read-r.A8-prefix-fail.txt` `30ec1abcc67c`; pre-fix reader `read-r.pre-A8.mjs` `01a4fbe39388cda0d45366c8b112f3e3bdcf8044e14e5a7fa7715cd206c210b5` |
| 2. I1 fix | `read-r.mjs`: after-bound at the item's `itemDone`, text from `ans.turns` when it has at least `segs.length` turns. `cal-read-r.mjs` 34/34 PASS: L1-L4 4/4, P3a 20/20 + extras, P3a-flip reports exactly case 5, P3b live40-r1 46 answer + RH14 silent, T byte-equal 46/46 | fixed `read-r.mjs` `297f87656b0d3ac5872cfbb9e5db3840591a04e39bcfdfcf532e3b4214870db7`; `cal-read-r.mjs` `bdb0e89a4981` |
| 3. reader diff on router40-R | 47 items: 0 change class, 0 change word count, 0 change T. Transitions: answer to answer x22, hard to hard x25 | `reader-diff-R.txt` `0c8f1b9e6ecf` (script `reader-diff-R.mjs`) |
| 4. I2 | `audit-r40.mjs --record <file>` appends `{tag, session, clean, memory, pinned}`. `score-r40` sets `gradingOk=false` unless, per `blind-N.gX`, the LAST audit line is clean + ABSENT + pinned and its session equals the last `blind\launches.jsonl` line for the slot. A8 case (8 valid verdict files + 1 NOT CLEAN audit) gives READING 1 | `audit-r40.mjs` `217653bb7760`; `score-r40.mjs` `a15e6170edd0` |
| 5. freeze | `build-blind` writes `keyhold\build-record.json` with `readRSha256` (beside the key, outside `blind\`). `score-r40` refuses (exit 2, naming both shas) on a mismatch or a missing record. Calibrated | `build-blind-r40.mjs` `523c32b6f465`; `cal-score-r40.mjs` `49b6a84bfe09`; `cal-build-blind-r40.mjs` `52d0ad915d90`; `cal-audit-r40.mjs` `0374936bb9ad` |
| 6. gate to 2026-10-06 04:15:00 | `GATE_START` in `r40-common.mjs` is now 04:15:00 local. P9 and P6 cases added and re-run (see below) | `r40-common.mjs` `3f90531833eb`; `pre-run-r40.mjs` `b8af881bf57f`; `cal-pre-run-r40.mjs` `0632a6d1ff4b`; `cal-launch-grader-r40.mjs` `dfde655a5803` |
| 7. re-run of every calibration | `run-all-cals.mjs`: ALL PIECES PASS: P9 105/105, P2 33/33, P3 34/34, P4 45/45, P5 19/19, P6 32/32, P7 22/22, P8 52/52, P1 13/13. Mutation check 90/90 caught | `cal-out\ALL.txt` `0dafa48d78d4`; `cal-out\mutation-check.txt` `ead38998d99b`; `mutate-check.mjs` `d6301b6f2895` |

The diffs of steps 2, 4 and 6 are in `A8-PRECONDITIONS.diff` (`2589fa145af0`).
Pre-change copies sit beside each changed file as `*.pre-A8.mjs`, except `cal-build-blind-r40.mjs`, whose pre-copy I forgot to take (the change is one appended case, P5-17).

## Step 1: what each late-event case does

All four failed on the unfixed reader:
- L1: a 76-word finished turn, then an 8-word late turn after `itemDone`. Unfixed: `too-long` (84 words). Fixed: `answer`, T = the 76 words.
- L2: no output, abnormal close (1011) after `itemDone`. Unfixed: `missing`. Fixed: `silent`.
- L3: a turn open at the cap whose `turnComplete` arrives after `itemDone`. Unfixed: `answer`. Fixed: `cut`.
- L4: `ans.turns` has 2 turns, events have one before `itemDone` and one after. Unfixed: `too-long`, T of 84 words. Fixed: `answer`, T = the first turn only.

## Step 2: calibration edits that changed an existing expectation (the "flipped" one)

- P3a case 21 ("played, abnormal close, no output, `missing`") had its close placed AFTER `itemDone`, which I1 now reads as `silent`.
  - The synthetic builder gained `closeBefore`, and case 21 now closes before `itemDone`, so it still tests the `missing` branch. L2 covers the after-`itemDone` close.
  - This is the one pre-existing expectation moved by I1.
- Case 19 (open turn plus a close after `itemDone`) is `cut` either way, and unchanged.

## Step 6: gate and P9/P6 cases

Changes to existing expectations (all named in A8.4):
- GR5 (grade, 2026-10-06 09:59, valid F line): FAIL becomes PASS.
- P6-5 (stub 09:59): REFUSED becomes dry run allowed (exit 0).
- GR9 (grade at 10:01, both arms incomplete): PASS becomes FAIL. A8.2 adds the arms-complete check outside the tonight window, so `pre-run-r40.mjs` now checks it for every `grade` run, not only tonight's.
- X3 (real mode, arm grade): now asserts exit 1 with the `date gate (grade` row failing, while the real clock is before 04:15 (it was 01:00 at the final run).
  - At or after 04:15 it is SKIPPED, not run, because A8 says its expectation must be re-stated first.
- P6-10 (real-clock dry run on a temp folder) is SKIPPED at or after 04:15, for the same reason: it asserts a date-gate refusal.

**Both skips mean a calibration re-run after 04:15 will show 2 SKIPs.** Run any calibration before 04:15, or re-state X3 and P6-10 first.

New P9 cases: GR10 (04:14 FAIL), GR10b (04:14:59 FAIL), GR11 (04:15:00 PASS, boundary is >=), GR12 (04:16 with a valid F line PASS), GR13/GR13b (R or L incomplete FAIL), GR14/GR14b (no F line or a malformed one FAIL).
New P6 cases: P6-20 (`--classify c3 --dry-run` at 04:14 REFUSED, date gate named), P6-20b (at 04:16 allowed), P6-20c/d/e (grader slot at 04:14 refused, 04:15:00 allowed, 04:16 allowed).
P6-5b (21:44) stays REFUSED.
G-sitting checks are unchanged and their cases pass: G1-G9 as before, plus the new ones at a 04:16 stub clock:
- G10: open STEP FAIL; G10b: negative control PASS.
- G11/G11b: `eq-gsitting` and `interview60.answers.mjs` processes FAIL.
- G12: F says done with the log missing FAIL.
- G1-R/G2-R/G3-R: the same stubs for the R arm FAIL.
- G5 (`pending from 11:00` at now 10:40) FAILs as before.

## Step 4/5: new cases

- `cal-score-r40.mjs`:
  - S-A1: A8's case, 8 valid verdict files + 1 NOT CLEAN audit gives READING 1.
  - S-A2..A7: memory LOADED, not pinned, session mismatch, missing audit for a slot, no `audits.jsonl`, no `launches.jsonl` each give READING 1.
  - S-A8: an earlier NOT CLEAN then a later clean line gives CANDIDATE (the last line decides).
  - S-A9: the reverse gives READING 1.
  - S-A10/A11: an older launch line first, then the audited session as the last launch gives CANDIDATE; `auditProblems` returns 0 problems.
  - S-F1..F4: the build record holds the real sha; a wrong sha is refused (exit 2, both shas named); a missing record is refused; `readerFreeze()` on an altered copy of the reader is not ok.
  - The E2E tree now writes audits and launches, so S-E2E-1..3 read as before.
- `cal-audit-r40.mjs`: P7-18 (`--record` after a clean, a Grep-flagged and a memory-LOADED session: exits 0, 1, 1; three lines with the right fields and the transcript uuid as session), P7-19 (a transcript not found is recorded clean=false, memory UNKNOWN).
- `cal-build-blind-r40.mjs`: P5-17 (the build record holds the real `read-r.mjs` sha and is not in `blind\`).

## Calibration of the calibrations (rule 8)

`mutate-check.mjs` gained 17 mutations for steps 2, 4, 5, 6 (gate 04:15 to 10:00 / 03:00 / `>`, arms-complete scoped back to tonight, itemDone bound removed, turns `===`, build record sha1, `--record` off, audit fields faked, P7 problems ignored, first-record instead of last, session check off, freeze always ok, no-record ok, memory and pin checks off).
Two existing entries were stale and corrected (P9 b2 now expects GR10/GR10b; P6 b no longer lists P6-5).
A first run missed one because `cal-audit-r40.mjs` crashed instead of failing cleanly when `--record` wrote nothing; that was made robust and the final full run caught 90/90.

## Not covered / unresolved

- **Step 7 (A8.4):** the fresh Opus re-review has NOT been done. It is not mine to do and gates `build-blind`.
- **Steps 8 and 9 (A8.4):** these are the controller's `USER-RULINGS.txt` lines, and nothing was written there.
- **Tonight-window branch of P9 `grade`:** kept as written (A5.5, unused, past) so existing grade cases stay valid. The gate is `inTonight || now >= GATE_START`, so a stub clock inside 2026-10-05 21:45 to 23:15 still passes the date gate. This is harmless for real runs, since that window is past.
- **P3 limits:**
  - `reader-diff-R.txt` shows no difference because R's real post-`itemDone` events are only `gapStart`, `close(1000)` and `chainStart`. The fix is proven by the synthetic L1-L4, not by R's data.
  - `run-r.mjs`'s own `answerFor`/`turnsFor` (HARNESS-REVIEW notes the same unbounded scope there) were not touched; only the reader was in scope.
  - m9 (`close` with an undefined code) was not touched.
- **Freeze scope:** the freeze covers `read-r.mjs` only (as A8 words it). `r40-common.mjs`, which the reader imports, is not frozen.
- **Comment drift:** the header of `launch-grader-r40.mjs` still says "after 10:00"; its code is correct (it reads `GATE_START`). I left the comment alone.
- **`cal-util.mjs` `realClockRefuses`:** it still contains "before 10:00 on 2026-10-06" for R and L real-clock cases. Those gates are the tonight window, unaffected, so I left it.
