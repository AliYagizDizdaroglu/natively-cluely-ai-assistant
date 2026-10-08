# Re-check: PREREGISTER-router-default.md (pass 2), Task 19 step 2

Reviewer: a separate fresh Opus agent (claude-opus-5-5), not the author. Read: the registration (765 lines), SPEC §1, §2,
§10–§14, PLAN Task 19 (1953–1998), RESULT-smoke.md, SMOKE-READ.txt, build/progress.md (ledger, 90 lines). Checked
directly: `grade/score-rd.mjs` (wrong rule), `grade/launch-grader-rd.mjs` (pin, flags), `flight/rd-precheck.ps1` and
`register-rd.ps1` (logon, audio state), the MAIN branch head (`git log fix/coding-style-suffix-all-gemini`). No captured
prompt or answer text was read.

## Verdict: APPROVE WITH CHANGES

One blocking text fix (finding 1) and three IMPORTANT items to close before the step 3 commit and arming. The bars,
the verdict, the amendments and the clarifications otherwise hold.

## What holds (checked)

- **Required content (PLAN Task 19):** every item is present: run/roster/settings/arms; bars and verdict; router-down
  limit; `I60_PROBE_DEADLINE_MIN`; gap with measurement; `context_sha12`/`context_chars`; instruments (including 14A and
  its cal); §7.3 named as an ear change under the pipeline; Task 3 deviation; Task 13 split; plan choices; grading setup;
  quota table; I6, I7, I9, M2, the judge note. The "fallback quota" and the "23:00–03:00" probe window are superseded by
  the user's 00:48 timing ruling, which §9.1 states.
- **Bars and verdict:** §5's table equals SPEC §10.2 word for word; §6.1 equals SPEC §11 word for word.
- **Clarifications all predate the flight's data:** I-1 (ledger 63, 00:4x), marker sets (ledger 6/8), 31 bare mains
  (ledger 18), median (ledger 46), EASY-caught first decision (ledger 29), router-down 2.0 min and `context_chars>0`
  (pass 1, ledger 72, before smoke attempt 1 at 00:58), grading rulings 1/4/5/6 (ledger 81/87). None loosens a gate in
  a way the smokes could have informed. Both smokes read 0.00 down minutes and 266 chars, so neither threshold was fitted.
- **A1 is justified and is not a routing tune.** It came from root cause (suppressor keepalives thinned the router's
  silence), it restores the real-time feed the probe and router40 had, has no parameter and no per-item logic, was
  Opus-reviewed twice, and changes no bar or threshold. It is the only change made after a smoke on the flight's roster.
- **Nothing after smoke 3 is a routing or threshold tune.** MAIN's branch head is still `19937ab` (the padding fix); the
  instruction/block shas are unchanged. Post-smoke-3 work is the ledger (fix5), grading tools, the Task 18 guard
  fixes and this file. Ruling 4's narrowing (ledger 87) changes grading readability only, and smoke 3 had 0 supersedes,
  so no outcome informed it. RH04/RH08/RH09 are explicitly left untuned.
- **`I60_PROBE_DEADLINE_MIN = 35`:** 75 − 10 − 3 − 2 − 4 − 19.31 − 1 = 35.69 → floor 35. Latest end = T + S + G + B + D
  + P + L + 1 = T + 74.31 min ≤ T + 75. Terms match their sources (B 52 s worst measured → 2 min; P 111.5 s measured +
  2-min cap; L 19 min 18.5 s).
- **Quota:** the gate stays at the SPEC constants 149/60 → ≥ 224 / ≥ 90, which is stricter than the recomputed
  ≈ 135 / ≈ 44. Headroom at 23:03Z was 400 / 490. Adding smoke 3's ≈ 50 still leaves ≈ 350 on 3.5-lite. Met.
- **One-quota-day rule:** smokes (22:0x–23:02Z, Oct 6) and the target T 03:15–03:45 TST (00:15–00:45Z, Oct 7) both fall
  in the 2026-10-06T07:00Z day. First branch holds.
- **Grading:** pinned `claude-opus-5-5`. The launcher's `PIN` constant refuses any other model. Flags include
  `--setting-sources project,local` and `--strict-mcp-config`. Memory ABSENT is checked on every transcript. The scorer
  applies wrong = EITHER, which matches SPEC §10.

## Findings

1. **BLOCKING: §5 contradicts the registered wrong rule on the decisive bar.** Line 211 reads the Safety
   wrong-answer half as "every L answer … is **not consensus-wrong**". SPEC §10, §7.1 of this file, ruling 1 and
   `score-rd.mjs:10` all say wrong = **EITHER** grader gives correctness 0. "Consensus" means both graders, which is
   looser, and the result note must apply this text verbatim. Fix: dated amendment A2 before the commit: "not wrong
   (wrong = either grader gives correctness 0, §7.1)".

2. **IMPORTANT: self-referential `<<ARMING>>` fields cannot live in the committed file.**
   - P10 (the registered HEAD, which is this file's own commit) and §13's "this file's sha256 as committed" cannot be
     written into the file that the commit and `--seal` hash.
   - The same applies to anything filled after the commit: the instrument shas in §10, the §11.3 gates and the §13
     items.
   - Editing the file after the commit changes the seal and the HEAD.
   - The fix is a dated amendment that states the procedure:
     - (a) the instrument sha256s, the final ledger read and the gate counts are filled into this file **before** the
       step 3 commit;
     - (b) the HEAD, the file's own sha256, T, the dry-twin lines and the task read-back go into the arming record
       (`write-arming-rd.mjs` body), never into this file.
   - Without (a), the "instruments with their sha256 lines" that Task 19 requires are not registered at all.

3. **IMPORTANT: the arming gate rests on ledger-fix5, which is not yet calibrated or reviewed.**
   - §8.1 and §8.6 make `complete=yes` from fix5 an arming precondition. The registration names no check for fix5
     itself.
   - Rule 8 requires fix5 to pass a known-answer calibration before its read is trusted:
     - one line present in both `.log.1` and a run-folder copy counts once (dedupe);
     - smoke 3's share now counts, so used35 should read ≈ 150, not 100;
     - `complete=yes` appears only when a copy covers the day's first line;
     - a dropped copy is a caught mutant.
   - fix5 also needs an Opus review before arming.
   - The same holds for the post-review fixes to `score-rd.mjs` (§7.7 already requires its review before grading) and
     to `launch-grader-rd.mjs`. State the launcher's re-review too.

4. **IMPORTANT: record the SPEC deviations as dated amendments, not only as text in the body.**
   - The Task 13 precheck split moves SPEC §10's T−6 session gates into `auto()`'s preflight, re-read before
     `appPass()`. I **accept it on the merits**: the sessions cannot exist at T−6 under "no Electron running", and
     re-reading just before playback is stronger.
   - Still, it contradicts SPEC §10's text, and the ledger records it as a plan choice, not a user or controller ruling.
   - The whole-wav smoke (SPEC §9.4's ~15 min) has the same status.
   - Fold both into amendment A2 (or A3), dated before data, so that every SPEC deviation sits in the Amendments
     section beside A1.

5. **MINOR: §8.2a's projection omits smoke 3.** "≈ 235 / ≈ 54 of 500" starts from the 23:03Z read (used35 = 100).
   That read was taken before smoke 3's share landed, as the same paragraph says. Projected use is ≈ 285 / ≈ 57–61.
   The gate is unaffected. Correct the projection when the arming read fills P5.

6. **MINOR: P is a measured value, not a cap.** The 4-min P uses smoke 3's 1.5-min probe-to-preflight time plus the
   2-min wait cap. A slow probe attempt started just before D could overrun it. At T ≈ 03:30 the 09:45 line is about
   6 h away, so the quota day is not at risk. Only the self-imposed T + 75 rule could be exceeded, and that is harmless.
   Say so in one line, so a late end is not later read as a registration breach.

7. **MINOR: the one-quota-day reading (§9.1, flagged for the re-check).**
   - The literal reading is the stricter one: a run after 10:00 needs a new-day smoke. It is safe, and it is moot at
     the targeted T.
   - The ledger's "move fully past it" does not clearly require a new smoke. A new quota day restores the headroom
     anyway.
   - Recommendation: keep the literal reading. If T would fall after ~08:30, the controller stops and the user rules,
     rather than either reading applying automatically.

8. **MINOR: grade definitions for single-grader arms.** The bare `high`/`low` arms and `captured-high` get one grader,
   but "acceptable = both graders" assumes two. State it: with one grader, acceptable = that grader's correctness 2 and
   on-topic 2, and wrong = its correctness 0. These arms are reported only.

9. **MINOR: §2 "told to the user before arming" cannot happen; the user is asleep.** Replace it with the basis in
   finding 10, and write it into the arming record.

10. **MINOR (judgement on author's open item 4): the confirmation suffices, with the evidence stated.**
    - **Consent:** the 2026-10-06 "pc will be free" was given for the original window (ledger line 3: PC free
      07:45–08:40), not for 03:15–03:45. The 00:48 ruling ("as early as possible … keep going through flight and
      grading", then going to bed) extends it to the earlier slot. Taken together, that is sufficient consent.
    - **Quiet machine:**
      - Smoke 3 is direct evidence for the same night window. It had 49 dispatches = 47 items + 2 probe, with no extra
        turns, so no foreign audio reached the app from 01:40 to 02:02.
      - At T−6, read the precheck's `audio-state INFO` lines and name them in the result. They are printed but never
        gated.
    - **Logged on:**
      - The 01:40 interactive task proves a logged-on session then.
      - The dry twin's night-gates (which read logged-on, sleep and pending restart) re-prove it at arming, closer to
        T. Cite that line, not the 01:40 one.
    - Fill §13's field with these three citations instead of a "confirmation time".

11. **MINOR (information, no change): the likely outcome is INCONCLUSIVE.**
    - Smoke 3 already misrouted 3/27 HARD items on the same wav and roster, and no tuning is allowed. So the Routing
      bar is likely to fail, which gives INCONCLUSIVE with one re-fly (`router-default-r2`, a new seed).
    - The registration handles this correctly. Flying is still informative for the Safety, Quality and No regression
      bars, which only grades can read.
    - The controller should tell the user this expectation in the morning report, so an INCONCLUSIVE is not read as a
      surprise.

## Not shown

- I did not re-run any calibration. The cal counts and shas are quoted from the ledger and the registration.
- I did not read `router-hour-read.mjs`, `build-blind-rd.mjs` or `guard-rd.mjs` code. Their behaviour is taken from
  their reviews.
- fix5 and the post-review scorer and launcher do not exist in final form yet (findings 2–3).
