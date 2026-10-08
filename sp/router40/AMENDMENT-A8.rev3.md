# Amendment A8 to PREREGISTER-router40.md: grading moves to tonight, after the flight-eq hour (pre-grading)

Written **2026-10-06, begun 00:26 TST by `date`; revision 2 begun 00:30, revision 3 begun 00:32 TST by `date`**
(Opus, the registration's author). Earlier revisions are kept unedited: rev1 `AMENDMENT-A8.rev1.md`
(`5fead935f6d198704d33d5351e09127f1d33dae250b9cfaf406a7c96a502b7c2`, seal `65013331…37c5`) and rev2
`AMENDMENT-A8.rev2.md` (`68f3597aae7366c0733d9efea7abce29d5d21774ef90e89fa08cd65f645459a2`, seal `e38a1d31…6741`).
Rev2 removed rev1's interleaving override. **Rev3 removes rev2's overlap with the G sitting and its guard change**, and
records K5 as revised (below). Rev3 supersedes rev1 and rev2 wholly. Both arms have run (below), but
**no router40 answer has been blinded or graded.** `grade\` holds only the harness scripts: no pairs, key, verdicts or
grading cwd. `R40\blind\verdicts.c1/c2.json` and `R40\keyhold\key.json` date from 2026-10-04, before the registration
(§0 inputs), and are not router40 grades. Earlier files are unedited. Precedence: **A8 > A7 > A6 > … > the
registration**; every rule A8 does not name stands.

**Read as (sha256, whole file):** registration `5b7daaee1ed6ce6661f1b2be4b00b581e8862d72ece6a463dc6d4f919b446057`;
`AMENDMENT-A7.md` `12312418f2a4bac6c398023de5f626001c4294e54fea0cd0df64fc5ac3966e9b` (seal `d4b55a66…e13c`);
`USER-RULINGS.txt` `6db500275cb9a8e1cbafc5c40b30ce840dc66bcffddcb247cdb581aa279be2c5`; `HARNESS-REVIEW.md`
`48fabcaa94f05da2c084e33a92f4716712c6a5ca97253c5b259c39ae1356fe92`.

**U5, the user's ruling, verbatim (chat, 2026-10-06 00:2x TST, relayed by the controller; recorded as the last line of
`USER-RULINGS.txt`):** "ok good night, grade router40 too in the report"

**K5, the controller's ruling (relayed 2026-10-06 ~00:30 TST, after rev1; revised ~00:32, after rev2):** keep the
registered rule. Router40 grading is never interleaved with flight-eq's graders (§8, A1.2). Router40's 10 launches run
as one uninterrupted block starting ≥ 04:15.
- **The revision:** the block does **not** overlap flight-eq's G sitting, because that load would fall on flight-eq's
  TTFT and latency bars (2c). Rev2's overlap and its guard change are withdrawn. Nothing changes in
  `pre-run-r40.mjs`'s G-sitting checks for grading.
- **Tonight's order:**
  1. the flight hour;
  2. flight-eq's G sitting;
  3. the router40 block: 10 launches, uninterrupted, started only when the G sitting has finished (the existing
     guard enforces this);
  4. flight-eq's graders.
- **Exception:** if the G sitting is deferred past 10:00 under flight-eq A7 I3, the controller may run the router40
  block before it. The existing guard decides that from the F line.

## 0. Resolutions

| item | ruling | where |
|---|---|---|
| When grading runs (A7 m5: "all 10 launches run tomorrow from 2026-10-06 10:00") | **Tonight, after the flight-eq hour**: no launch before **2026-10-06 04:15:00 local** | A8.1 |
| Sessions across registrations | **Strictly one grader/classifier session at a time across router40 and flight-eq**; no session of either runs **02:45–04:15** | A8.1 |
| Interleaving with flight-eq's graders (registration §8, A1.2) | **Kept (K5):** router40's 10 launches are one uninterrupted block; order: flight hour → G sitting → router40 block → flight-eq's graders; never mixed | A8.1 |
| The G sitting (A2.4 guard 3, `T_G` in guard 4) for `grade` | **Unchanged (K5 revised):** the block never overlaps the G sitting; no code change | A8.2 |
| The F line (A7 m5 → A2.3/A3.3) | **Kept as is**; only the 10:00 date gate behind it is replaced | A8.2 |
| Run order (A7 m4: R smoke → R full → L) | **Deviation recorded:** L → R smoke → R full was run (the 22:30 controller ruling); no bar changes | A8.3 |
| HARNESS-REVIEW I1, I2 | **Preconditions of `build-blind-r40.mjs`**, with re-calibration and a fresh Opus re-review | A8.4 |
| Bars, readings, graders, arms, c3/c4 | **Unchanged** | A8.5 |

## A8.1 When grading runs (U5)

- **Start:** the first of the 10 launches (8 graders + c3, c4) does not start before **2026-10-06 04:15:00 local**.
  That is after the flight-eq hour (flight 03:00 → ~04:10) and after the 02:45–04:15 block. A7 m5's all-or-nothing
  rule stands with one change: "tomorrow from 2026-10-06 10:00" now reads "**2026-10-06 from 04:15**".
  - The blind batch is built once and never split across days.
  - All 10 launches start on 2026-10-06. If they cannot, the rest waits for a dated amendment.
- **One at a time, across both registrations:** a router40 session starts only when no grader or classifier session
  of router40 **or** of flight-eq is running. The guards that enforce this:
  - P6 refuses while the FR slot holds a live pid (A3.6 P6 case).
  - P9 refuses while any other router40 harness process runs (A3.4 m6, A7 m4).
  - The registration §6.1 "≤ 2 at a time" therefore reads "1 at a time".
- **02:45–04:15:** no session of either registration runs in this block. For router40, the 04:15 date gate (A8.2)
  enforces it, since no router40 session starts before 04:15. For flight-eq, its own registration governs; A8 only
  records the rule.
- **One uninterrupted block, never mixed (K5; registration §8 and A1.2 stand).** Router40's 10 launches (8 graders,
  c3, c4) and any §6.1 re-grade run back to back as one block, with no flight-eq grader session started between the
  block's first launch and its last session's end.
  - **Order tonight (K5 revised):** flight hour → flight-eq's G sitting → the router40 block → flight-eq's graders.
    Rev1's "after or between" and rev2's "wholly before, controller's choice" are withdrawn.
  - **The block starts only when the G sitting has finished.** The existing A2.4 guard 3 enforces this: no open STEP
    in `gsitting.log`, no `interview60.answers.mjs`/`eq-gsitting` process, and the F line's state.
  - **Exception (flight-eq A7 I3):** if the G sitting cannot finish before 10:00 and is deferred past 10:00, the
    controller may run the block before it. The F line then reads `pending from HH:MM`, and the existing guard 4
    refuses any launch with `now + 25 min ≥ T_G − 30 min`.
  - A gap inside the block (a guard refusal, a wait) does not open it to flight-eq's graders.
- **Every other §6.1 / A2.4 / A5.2 rule stands per launch, unchanged:**
  - no `Natively-*` task Running, no electron.exe/tail.exe, the G-sitting checks (guard 3);
  - `now + 25 min < min(T_any, T_G) − 30 min`;
  - drift at grading's start, including the judge instrument `8564ba96369a`;
  - the stub refusal in real runs.

## A8.2 The F line tonight (A7 m5)

- **What the F line is** (A7 m5 points to "A2/A3's `grade` rules"): exactly one line in `USER-RULINGS.txt` matching
  `^F 2026-10-06: (\d+) — G sitting: (done|none today|pending from ([01]\d|2[0-3]):[0-5]\d) — (.+)$`, with U+2014
  dashes, written with node or `-Encoding utf8`.
  - `F` is in 0..500. Any malformed `F ` line FAILs (A2.3, A3.3 I3/m7).
  - For grading it supplies the G-sitting state (A2.4 guard 3) and `T_G` for the deadline (guard 4). Both stay in
    force unchanged (K5 revised), and they decide whether the block may start.
  - `F`, the flight's 3.1-lite need on the 2026-10-06 quota day, only fed L's CAP'. L is complete, and graders make no
    Gemini call, so for grading `F` is only range-checked and gates nothing.
- **Tie to "tomorrow":** none in the line itself.
  - Its date is the calendar date `2026-10-06`, which is tonight's date after midnight.
  - Its states (`done`, `none today`, `pending from HH:MM`) read the same at 04:15 as at 10:00.
  - It does not depend on the 10:00 quota reset. **Nothing in it needs replacing.**
- **Who writes it:** the controller appends it after the flight-eq hour, before the first launch. It carries the
  flight's actual G-sitting state at that time: `done` once the sitting has finished, or `pending from HH:MM` (after
  10:00) if it was deferred under flight-eq A7 I3. No F line → no launch (fail-closed, as A2.3).
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
  that order so both arms fit before 23:15. Times are from the run files and the write-ahead counter:
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
    - Each runner refuses unless P9 passes at its start, including the §0 drift hashes (A2.4 guard 6, A3.4 m5), and all
      three started and completed. HARNESS-REVIEW confirms L's request and guards.
    - L: `gemini-3.1-flash-lite`, `thinking: 'LOW'`, temperature 0.4, maxOutputTokens 65536, cap 60.
    - R: variant B, `rSystemSha256 4571f563…`, `blockSha256 e11c2400…`, gap 10 000 ms, quietAfterTurn 6 000 ms,
      noOutput 30 000 ms, cap 90 000 ms.
  - **No reading row depends on the order.** Both arms ran inside 22:31–23:02, as close in time as A7 m4's plan
    (≈ 22:04–22:45).

## A8.4 Preconditions before `build-blind-r40.mjs` (HARNESS-REVIEW I1, I2)

`build-blind-r40.mjs` (P5) does not run until steps 1–6 hold, in this order; step 7 gates scoring:

1. **I1 fixed** in `read-r.mjs` as HARNESS-REVIEW words it:
   - `after` is bounded by the item's `itemDone`.
   - Text comes from `ans.turns.slice(0, segs.length)` when the turns are present.
   - The same bound applies to T, `cut` and the abnormal-close test.
2. **I1 re-calibrated:** `cal-read-r.mjs` gives P3a 20/20 (A2.5 with A3.2's rows 8 and 9) with the flipped expectation
   reported, and P3b live40-r1 46 `answer` + RH14 `silent`, T byte-equal 46/46. The reader is then frozen: P5 and P8
   must read with the same reader, so no reader change between them.
3. **I2 fixed:** `audit-r40.mjs --record grade\audits.jsonl` appends `{tag, session, clean, memory, pinned}`.
   `score-r40.mjs` sets `gradingOk = false` unless, for every `blind-N.gX`:
   - the last audit record is `clean && memory === 'ABSENT' && pinned`;
   - its session matches the last `grade\blind\launches.jsonl` line for that slot.
4. **I2 re-calibrated:** `cal-score-r40.mjs` passes its existing row cases, plus the new case: 8 valid verdict files
   and 1 NOT CLEAN audit → READING 1.
5. **The A8.2 gate change built and calibrated in P9 (`pre-run-r40.mjs`, `r40-common.mjs`):**
   - **Gate cases:** `--arm grade --now 2026-10-06T04:14` → FAIL; `--now 2026-10-06T04:16` with a valid F line and
     stub guards → PASS. A3.6's `--arm grade --now 2026-10-06T09:59 → FAIL` is replaced by `… → PASS`.
   - **Arms-complete cases:** grade with `router40-R` incomplete → FAIL.
   - **F-line case:** grade with no F line → FAIL.
   - **No change to the G-sitting checks** (K5 revised). Their existing `grade` cases are re-run and must still hold:
     at a 04:16 stub clock, an open STEP → FAIL and an `eq-gsitting` process → FAIL; `pending from 11:00` at now
     10:40 → FAIL.
   - P6's "stub clock before 2026-10-06 10:00 → REFUSED" reads "before 2026-10-06 04:15".
   - Every other P9/P6 case is re-run and passes.
6. **An Opus re-review:** a fresh Opus session, separate from the implementer, reviews the diffs of steps 1, 3 and 5
   and the calibration outputs of steps 2, 4 and 5 against HARNESS-REVIEW and A8, and returns APPROVE. A finding sends
   the work back to the step it names.
7. **A written check, before `score-r40.mjs` (P8) runs:** the controller reads the launch logs
   (`grade\blind\launches.jsonl` and the classifier launch records) and confirms in writing, as a dated line in
   `USER-RULINGS.txt`, that every launch, re-grades included, started on 2026-10-06 at or after 04:15. If any did not,
   P8 does not run without a dated amendment.

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

**Not covered:**
- The flight's real end time, the G sitting's end time and whether it is deferred past 10:00 are unknown now (the F
  line and the guard decide). At ≈ 48 min for the sitting (flight-eq A7 I3), the block likely starts ≈ 05:00 or later.
- Router40's block (≥ 250 min serial) may end after 10:00. The rule holds as long as every launch starts on
  2026-10-06. Flight-eq's graders wait for the block's end.
- P9 has no upper date bound for `grade`; "all on 2026-10-06" is checked by the controller from the launch logs
  (A8.4 step 7), not by code. "Never mixed" with flight-eq's graders is enforced by the controller's ordering only;
  no code checks it.
- **Exception residual:** the guard checks 25 min per launch, not the whole block. If the block runs before a G
  sitting deferred past 10:00, a close enough `T_G` could refuse a launch mid-block. The block would then stop, not
  overlap the sitting, and "uninterrupted" would fail. No code checks that the whole block (≥ 250 min) fits before
  `T_G − 30 min`; that rests on the controller's choice to start the block.
- L and R ran within 31 min of each other on 2026-10-05; A is from 2026-10-03.
sha256 (of every byte above this line): 9ade4c1ff201777f7ce908a3c2fa94eb5683daf06e1849f96e2ab45a96352dd3
