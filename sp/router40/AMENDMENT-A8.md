# Amendment A8 to PREREGISTER-router40.md: grading moves to tonight, after the flight-eq hour (pre-grading)

Written **2026-10-06, begun 00:26 TST by `date`; revision 2 begun 00:30, revision 3 begun 00:32, revision 4 begun
00:36 TST by `date`** (Opus, the registration's author). Earlier revisions are kept unedited:

| rev | file | whole file sha256 | seal |
|---|---|---|---|
| 1 | `AMENDMENT-A8.rev1.md` | `5fead935f6d198704d33d5351e09127f1d33dae250b9cfaf406a7c96a502b7c2` | `65013331…37c5` |
| 2 | `AMENDMENT-A8.rev2.md` | `68f3597aae7366c0733d9efea7abce29d5d21774ef90e89fa08cd65f645459a2` | `e38a1d31…6741` |
| 3 | `AMENDMENT-A8.rev3.md` | `1bbb146ebd855e121a249221018bf1c98b0c0a628fd16d6d5fe6d77fa4e1e821` | `9ade4c1f…2dd3` |

- Rev2 removed rev1's interleaving override.
- Rev3 removed rev2's overlap with the G sitting.
- **Rev4 answers `A8-RECHECK.md`** (APPROVE WITH CHANGES,
  `506d78c8bebb30f242fa98cdc4bd7a2c32de1312e3d0ff979cc7a54a9d2c286e`):
  - I-1: registration §8 is kept as written; the order changes to put flight-eq's graders before the router40 block.
  - I-2: four late-event cases are added.
  - M-1 to M-5: adopted as written.
- Rev4 supersedes rev1–rev3 wholly.

**Status:** both arms have run (A8.3), but **no router40 answer has been blinded or graded.**
- `grade\` holds only the harness scripts: no pairs, key, verdicts or grading cwd.
- `R40\blind\verdicts.c1/c2.json` and `R40\keyhold\key.json` date from 2026-10-04, before the registration (§0
  inputs). They are not router40 grades.
- Earlier files are unedited. Precedence: **A8 > A7 > A6 > … > the registration**; every rule A8 does not name stands.

**Read as (sha256, whole file):**
- registration `5b7daaee1ed6ce6661f1b2be4b00b581e8862d72ece6a463dc6d4f919b446057`
- `AMENDMENT-A7.md` `12312418f2a4bac6c398023de5f626001c4294e54fea0cd0df64fc5ac3966e9b` (seal `d4b55a66…e13c`)
- `USER-RULINGS.txt` `6db500275cb9a8e1cbafc5c40b30ce840dc66bcffddcb247cdb581aa279be2c5`
- `HARNESS-REVIEW.md` `48fabcaa94f05da2c084e33a92f4716712c6a5ca97253c5b259c39ae1356fe92`

**U5, the user's ruling, verbatim (chat, 2026-10-06 00:2x TST, relayed by the controller; recorded as the last line of
`USER-RULINGS.txt`):** "ok good night, grade router40 too in the report"

**K5, the controller's ruling (relayed 2026-10-06 ~00:30 TST; revised ~00:32 and ~00:36, after A8-RECHECK I-1):**
keep registration §8 as written. Router40 grading runs after the flight's hour has ended and after the flight's own
graders have finished, never interleaved with them. **Nothing in §8 or A1.2 is overridden.**
- **Tonight's order:**
  1. the flight hour;
  2. flight-eq's G sitting;
  3. flight-eq's graders;
  4. the router40 block: 10 launches, uninterrupted, never interleaved.
- **If the G sitting is deferred past 10:00** (flight-eq A7 I3), the controller may run flight-eq's graders on the
  main-hour material first.
- **Router40 still starts only after every flight-eq grader session has ended.** Otherwise it waits for a later day
  under A7 m5's split rule (A8.1).
- Rev2's overlap with the G sitting stays withdrawn: its load would fall on flight-eq's TTFT and latency bars (2c).
  No edit to `pre-run-r40.mjs`'s G-sitting checks.

## 0. Resolutions

| item | ruling | where |
|---|---|---|
| When grading runs (A7 m5: "all 10 launches run tomorrow from 2026-10-06 10:00") | **Tonight, after the flight-eq hour and after flight-eq's graders**; no launch before **2026-10-06 04:15:00 local** | A8.1 |
| Sessions across registrations | **One grader/classifier session at a time across router40 and flight-eq**; no session of either runs **02:45–04:15** | A8.1 |
| Registration §8 and A1.2 (after the flight's graders, never interleaved) | **Kept as written (K5, A8-RECHECK I-1)**; nothing overridden | A8.1 |
| The G sitting (A2.4 guard 3, `T_G` in guard 4) for `grade` | **Unchanged**; no code change | A8.2 |
| The F line (A7 m5 → A2.3/A3.3) | **Kept as is**; only the 10:00 date gate behind it is replaced | A8.2 |
| Run order (A7 m4: R smoke → R full → L) | **Deviation recorded:** L → R smoke → R full was run (the 22:30 controller ruling); no bar changes | A8.3 |
| HARNESS-REVIEW I1, I2; A8-RECHECK I-2, M-2, M-3, M-4 | **Preconditions**, with known-answer cases, re-calibration and a fresh Opus re-review | A8.4 |
| Bars, readings, graders, arms, c3/c4 | **Unchanged** | A8.5 |

## A8.1 When grading runs (U5, K5)

- **Order (K5):** flight hour → flight-eq's G sitting → flight-eq's graders → **the router40 block**.
  - **The block** is 10 launches (8 graders + c3, c4) plus any §6.1 re-grade, run back to back.
  - It starts only after **every** flight-eq grader session has ended.
  - No flight-eq session starts between the block's first launch and its last session's end. A gap inside the block
    (a guard refusal, a wait) does not open it to anything else.
  - **Exception:** if the G sitting is deferred past 10:00 (flight-eq A7 I3), the controller may run flight-eq's
    graders on the main-hour material before the sitting. The router40 block still waits until every flight-eq grader
    session has ended, and it must also pass the G-sitting guard (A8.2).
- **Earliest start:** no launch before **2026-10-06 04:15:00 local**. In practice the block starts later, after the G
  sitting and flight-eq's graders.
- **A7 m5's split rule, restated:**
  - Grading is all-or-nothing per day. The blind batch is built once and never split across days.
  - All 10 launches (re-grades included) start on 2026-10-06.
  - If the block cannot start on 2026-10-06, or cannot finish starting its launches that day, it does not run or
    continue. All of router40's grading waits for a later day under a dated amendment.
  - A7 m5's "tomorrow from 2026-10-06 10:00" now reads "**2026-10-06 from 04:15, after flight-eq's graders**".
- **One at a time, across both registrations:** a router40 session starts only when no grader or classifier session
  of router40 **or** of flight-eq is running.
  - P6 refuses while an FR grader slot holds a live pid (`launch-grader-r40.mjs:110`; A3.6 P6 case).
  - P9 refuses while any other router40 harness process runs (A3.4 m6, A7 m4).
  - §6.1's "≤ 2 at a time" therefore reads "1 at a time".
  - Neither guard sees a flight-eq grader that has not started yet. "After every flight-eq grader session has ended"
    is the controller's written check (A8.4 step 8).
- **02:45–04:15:** no session of either registration runs in this block. For router40, the 04:15 date gate (A8.2)
  enforces it. For flight-eq, its own registration governs; A8 only records the rule.
- **Every other §6.1 / A2.4 / A5.2 rule stands per launch, unchanged:**
  - no `Natively-*` task Running, no electron.exe/tail.exe, the G-sitting checks (guard 3);
  - `now + 25 min < min(T_any, T_G) − 30 min`;
  - drift at grading's start, including the judge instrument `8564ba96369a`;
  - the stub refusal in real runs.

## A8.2 The F line and the G sitting (A7 m5)

- **What the F line is** (A7 m5 points to "A2/A3's `grade` rules"): exactly one line in `USER-RULINGS.txt` matching
  `^F 2026-10-06: (\d+) — G sitting: (done|none today|pending from ([01]\d|2[0-3]):[0-5]\d) — (.+)$`.
  - The dashes are U+2014; the line is written with node or `-Encoding utf8`.
  - `F` is in 0..500, and any malformed `F ` line FAILs (A2.3, A3.3 I3/m7).
  - For grading, the line supplies the G-sitting state (A2.4 guard 3) and `T_G` for the deadline (guard 4). Both
    stay in force, unchanged.
  - `F` itself (the flight's 3.1-lite need on the 2026-10-06 quota day) only fed L's CAP'. L is complete, and graders
    make no Gemini call, so for grading `F` is only range-checked and gates nothing.
- **What guard 3 can and cannot see (A8-RECHECK M-1).** Guard 3 checks that the G sitting is **not running now**:
  no open STEP in `gsitting.log`, no `interview60.answers.mjs`/`eq-gsitting` process, and the F line's state.
  - It cannot tell "finished" from "not yet started".
  - "Finished" rests on the controller. **The controller writes the F line only after the sitting's last STEP
    `end`**, with state `done`.
  - If the sitting is deferred past 10:00, the controller writes `pending from HH:MM` (≥ 10:00) instead, and guard 4
    then refuses any launch with `now + 25 min ≥ T_G − 30 min`.
  - This is fail-closed only because no F line exists before the controller writes it: no F line → no launch (A2.3).
- **Tie to "tomorrow":** none in the line itself.
  - Its date is the calendar date `2026-10-06`, which is tonight's date after midnight.
  - Its states read the same at 04:15 as at 10:00.
  - It does not depend on the 10:00 quota reset. **Nothing in it needs replacing.**
- **What did depend on 10:00 and is replaced:** only A2.2's `grade` date gate (`GATE_START = 2026-10-06 10:00`, P9's
  "now ≥ 2026-10-06 10:00"). It becomes **now ≥ 2026-10-06 04:15:00 local**.
  - A5's tonight-grading branch ([21:45, 23:15) on 2026-10-05, the TONIGHT line) is past and is not used.
  - Grading runs in P9's non-tonight mode, unchanged: the F line, the G-sitting checks, `min(T_any, T_G) − 30 min`,
    25 min per launch.
- **Added to that mode:** the A5.5 check "both arms complete (`router40-R` and `router40-L`)", so §6.1's "only after
  L and R are complete" is enforced in this mode too.

## A8.3 The order actually run: a dated deviation from A7 m4

- **A7 m4 registered:** R smoke (C02) → R full → L, sequential.
- **What ran:** the 22:30 TST controller ruling in `USER-RULINGS.txt`, written before any router40 call, reversed
  that order so both arms fit before 23:15. Times are from the run files' `t0Iso` and the write-ahead counter:
  - **L** 22:31:03 → 22:39:41 (last request), COMPLETE, 47 answers, 0 holes, 48 requests, cap 60.
  - **R smoke** (`router40-R-smoke`, C02) t0 22:40:10, COMPLETE.
  - **R full** (`router40-R`) t0 22:41:14 → 23:02, COMPLETE, 31 of 31 chains. It started before HARNESS-REVIEW's
    22:45:47 latest start.
  - Still strictly sequential: no two arms overlapped.
- **The deviation:** the order change existed only as a `USER-RULINGS` line, not as an amendment, against the
  registration's "a change before data is a dated amendment" (HARNESS-REVIEW, schedule risk). A8 records it, dated,
  before any grading.
- **Why it changes no bar:**
  - **The arms are independent.** L's answers depend only on its prompts; R's route depends only on R's own Live
    events. R reuses L's answer text on non-`answer` items, and that text does not depend on which arm ran first.
  - **The sequential property A7 m4 protected is kept.** Neither arm's latency (L's TTFT, R's Live first text: the
    two terms of `lead`) was measured during the other's traffic.
  - **Inputs and caps were identical to the registered ones:**
    - Each runner refuses unless P9 passes at its start, including the §0 drift hashes (A2.4 guard 6, A3.4 m5), and
      all three started and completed. HARNESS-REVIEW confirms L's request and guards.
    - L: `gemini-3.1-flash-lite`, `thinking: 'LOW'`, temperature 0.4, maxOutputTokens 65536, cap 60.
    - R: variant B, `rSystemSha256 4571f563…`, `blockSha256 e11c2400…`, gap 10 000 ms, quietAfterTurn 6 000 ms,
      noOutput 30 000 ms, cap 90 000 ms.
  - **No reading row depends on the order.** Both arms ran inside 22:31–23:02, as close in time as A7 m4's plan
    (≈ 22:04–22:45).

## A8.4 Preconditions (HARNESS-REVIEW I1, I2; A8-RECHECK I-2, M-2, M-3, M-4)

`build-blind-r40.mjs` (P5) does not run until steps 1–7 hold, in this order. Step 8 gates the first launch, and step 9
gates scoring.

1. **I-2 cases written and watched to fail, BEFORE the I1 fix.** Add four known-answer cases to `cal-read-r.mjs`,
   each with its expected class:
   - (L1) a finished `answer` turn, then a late turn (e.g. "Is there anything else…") arriving after `itemDone` →
     **`answer`**, T = the first turn's text only;
   - (L2) a played item with no output, then an abnormal close (code ≠ 1000) after `itemDone` → **`silent`**, not
     `missing`;
   - (L3) a turn still open at `itemDone` (capped) whose turnComplete arrives in the post-`itemDone` gap → **`cut`**;
   - (L4) `ans.turns` longer than `segs` (an extra turn after `itemDone`) → text from the first `segs.length` turns
     only.

   Run all four on the **unfixed** `read-r.mjs` and record that each one FAILs (gives a different class or text).
   A case that passes on the unfixed reader does not test I1. It is rewritten until it fails, before step 2.
2. **I1 fixed** in `read-r.mjs` as HARNESS-REVIEW words it:
   - `after` is bounded by the item's `itemDone`.
   - Text comes from `ans.turns.slice(0, segs.length)` when the turns are present.
   - The same bound applies to T, `cut` and the abnormal-close test.
3. **I1 re-calibrated:** `cal-read-r.mjs` must give all of:
   - L1–L4 4/4 (each now PASS);
   - P3a 20/20 (A2.5 with A3.2's rows 8 and 9), with the flipped expectation reported;
   - P3b live40-r1 46 `answer` + RH14 `silent`, T byte-equal 46/46.

   **M-2:** run the old reader (the pre-fix copy, sha recorded) and the fixed reader on `router40-R`, and write the
   per-item class difference (id, old class, new class; and the T change for `answer` items, as word counts only) to
   `R40\reader-diff-R.txt`.
   - The result note quotes it. It is **read, not acted on**: no reading or bar depends on it.
   - It shows classes and counts only, never answer text or grades.
4. **I2 fixed:** `audit-r40.mjs --record grade\audits.jsonl` appends `{tag, session, clean, memory, pinned}`.
   `score-r40.mjs` sets `gradingOk = false` unless, for every `blind-N.gX`:
   - the last audit record is `clean && memory === 'ABSENT' && pinned`;
   - its session matches the last `grade\blind\launches.jsonl` line for that slot.

   **M-2 freeze, by code:**
   - `build-blind-r40.mjs` records the sha256 of `read-r.mjs` in its build record (beside the key, outside the blind
     folder).
   - `score-r40.mjs` recomputes the sha and refuses (exit 2, naming both shas) when it differs.
5. **I2 and the freeze re-calibrated:** `cal-score-r40.mjs` passes its existing row cases, plus:
   - 8 valid verdict files and 1 NOT CLEAN audit → READING 1;
   - a `read-r.mjs` sha different from the build record's → refused.
6. **The A8.2 gate change built and calibrated in P9 (`pre-run-r40.mjs`, `r40-common.mjs`) and P6 (M-3):**
   - **P9 gate cases:**
     - `--arm grade --now 2026-10-06T04:14` → FAIL (date gate);
     - `--now 2026-10-06T04:15:00` → PASS (the boundary is ≥);
     - `--now 2026-10-06T04:16`, with a valid F line and stub guards → PASS.
   - **`cal-pre-run-r40.mjs` GR5** (A5.6's kept case, `--arm grade now 2026-10-06T09:59`): its expectation changes
     from FAIL to **PASS**.
   - **X3** (real mode, arm grade, no stubs): the re-calibration runs before 04:15, so X3 expects **exit 1 with the
     date gate named**. If it is ever run at or after 04:15, its expectation must be re-stated first; it is not read
     as written.
   - **P6 (`cal-launch-grader-r40.mjs`):**
     - P6-5 (stub 2026-10-06T09:59) expects the dry run **allowed** (exit 0), no longer REFUSED;
     - P6-5b (2026-10-05T21:44) stays REFUSED;
     - new: `--classify c3 --dry-run` at 04:14 → REFUSED (date gate), and at 04:16 → allowed.
   - **Arms-complete case:** grade with `router40-R` incomplete → FAIL.
   - **F-line case:** grade with no F line → FAIL.
   - **No change to the G-sitting checks.** Their existing `grade` cases are re-run and must still hold:
     - at a 04:16 stub clock, an open STEP → FAIL;
     - at a 04:16 stub clock, an `eq-gsitting` process → FAIL;
     - `pending from 11:00` at now 10:40 → FAIL.
   - Every other P9/P6 case is re-run and passes.
7. **An Opus re-review:** a fresh Opus session, separate from the implementer, reviews:
   - the diffs of steps 2, 4 and 6;
   - the step-1 fail record;
   - the calibration outputs of steps 3, 5 and 6, and `reader-diff-R.txt`;

   against HARNESS-REVIEW, A8-RECHECK and A8. It must return APPROVE; a finding sends the work back to the step it
   names.
8. **A written check before the block's first launch (K5):** the controller confirms in a dated `USER-RULINGS.txt`
   line that:
   - every flight-eq grader session has ended, read from flight-eq's launch log `endedAt` values;
   - the G sitting's last STEP has its `end` (or the sitting is deferred past 10:00 and the F line says so).
9. **A written check before `score-r40.mjs` (P8) runs (M-4):** the controller reads the launch logs and confirms in a
   dated `USER-RULINGS.txt` line that every launch, re-grades included, started on 2026-10-06 at or after 04:15
   local.
   - The logs are `R40\grade\blind\launches.jsonl` (graders) and `R40\grade\classify\launches.jsonl` (c3/c4), as
     written by `launch-grader-r40.mjs:62,87,129`.
   - Each record carries `startedAt` and `endedAt` as ISO UTC strings (FR `launch-grader.mjs:161,174`, read
     2026-10-06 00:3x). 04:15 local is **01:15:00Z**.
   - The same line confirms that no flight-eq grader session's `startedAt` falls between the block's first `startedAt`
     and its last `endedAt`.
   - If any check fails, P8 does not run without a dated amendment.

Minors m1–m15 stay as HARNESS-REVIEW lists them. A8 adopts none of them; each may be fixed only if the re-review covers
it.

## A8.5 What does not change

- **Bars and readings:** §7 rows 1–5 and every threshold, verbatim.
- **Graders:** 8 sessions, `--model claude-opus-5-5` pinned as registered, the flight's recipe (§6.1), one re-grade
  per failed file.
- **Arms:** A (live40-r1), L (`router40-L`), R (`router40-R`). No arm is re-run.
- **Classifiers c3/c4:** §6.2 and Appendix B, the 22/22 calibration and its UNCALIBRATED rule.
- **The rest:** blinding (4 whole-item files, seed `blind:router40:r1`), the key outside the blind folder, the
  expectations.
- **Scheduling:** registration §8 and A1.2 stand as written.

**Not covered:**
- **Unknown timing:** the flight's real end time, the G sitting's end and whether it is deferred, and flight-eq's
  grader count and duration are all unknown now.
  - Router40's block (≥ 250 min serial) follows all of them, so it may start late in the day.
  - If it cannot start its 10 launches on 2026-10-06, all of its grading moves to a later day (A8.1).
- **Deadline residual:** the guard checks 25 min per launch, not the whole block. A `T_any` or `T_G` that arrives
  mid-block refuses a launch, and the block stops (it never overlaps). "Uninterrupted" would then fail, and the
  split rule applies.
- **Code limits:**
  - P9 has no upper date bound for `grade`; "all on 2026-10-06" is the step-9 written check.
  - "After every flight-eq grader" and "never interleaved" are the step-8/9 written checks. No code sees a flight-eq
    grader that has not started.
- **Cross-registration dependencies (A8-RECHECK M-5, not verified):**
  - **The FR slot:** whether flight-eq's grader sessions occupy the FR slot that P6 checks. If flight-eq's launcher
    uses another slot or lock, nothing in router40's code sees a running flight-eq grader, and only the controller's
    checks keep sessions apart.
  - **Scheduled tasks:** whether any flight-eq grader or G-sitting step runs as a scheduled `Natively-*` task. Its
    NextRunTime would enter `T_any` and could refuse launches mid-block.
- **The reader:** the I1 fix changes the reader after `router40-R`'s data exist. `reader-diff-R.txt` shows its
  effect, and no reading may be changed because of it.
- **Timing of the arms:** L and R ran within 31 min of each other on 2026-10-05; A is from 2026-10-03.
sha256 (of every byte above this line): 0b1dadecbc634c48b554b5aee46931bfbf1fee316015036c54885c09e8c274a3
