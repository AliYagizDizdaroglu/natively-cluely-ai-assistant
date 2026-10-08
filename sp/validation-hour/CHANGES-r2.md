# CHANGES-r2: what revision 2 of PREREGISTER-h40d changed, finding by finding

Written 2026-10-01, about 02:30 local, by Fable (the draft's author), applying `REVIEW.md` (Opus, NOT READY) and the
controller's rulings. Read-only work: no test, build, npm, tsc, API or model call; no repo touched. Files: `PREREGISTER-h40d.md`
(revision 2; the DRAFT file is unchanged), `h40d-clocks.mjs` (revision 2), `h40d-thoughts-noise.mjs` (new),
`run-calibrations.mjs` (new; runs the two scripts' calibrations), `CALIBRATION-NOTES.md` (rewritten), `clocks.cal-r2.out.txt`
and `thoughts-noise.out.txt` (outputs). "§" refers to revision 2's sections.

## Critical

- **C1 (one definition of "wrong"; the known case contradicted it).** Changed. Rule 3 now opens with one definition,
  the judge's `verdictOf` "wrong" (correctness 0 or on_topic 0, `judge.mjs:171–175`), used by 3b and 3c alike, with
  the review's evidence that the two definitions diverge (h40b's R11F; h40c's `captured-low` 2/1/2 against 1/0/1).
  The known case is restated after C2's exclusion: on the 40 gated ids the control (`captured-low`) reads 1/0/0 (R08 in
  r1) and the cue side (`captured-high`) 0/0/0 → PASS; the all-ids counts (2/1/2 and 1/0/2) are printed beside. I re-ran
  `review-scratch/twin-wrongs.mjs` on h40a–c and got the reviewer's numbers (CALIBRATION-NOTES §5). The "cue check
  n/a → PASS" reading is gone: `h40d-twins.mjs` gets a `--pre-cue` flag that marks the cue check not applicable and
  says so, and the cue check itself is calibrated on cases with cues (M9).
- **C2 (3c's wrong clause decided by the five parentless follow-ups).** Changed. The wrong clause is computed on the
  40 gated ids, as 3b is; the all-ids counts are printed beside it, never gated; the band stays on all ids. The
  review's null probabilities (30.1% / 21.0% / about 0, `wrong-clause-null.mjs`, re-run) are quoted as the reason. A
  second known case (h40b: gated wrong control 0/0/1 on R08, cue 0/0/0; band cue [36, 39] vs control [38, 40] → PASS)
  is added.

## Important

- **I1 (the decomposition and the provider reading).** Changed. §3 now reads screen = G + model + C exactly, with G =
  the knowledge step (hedge t0 − screen-clock t0), h40c 0.504 / 0.635 / 0.786 s, br1 0.501 / 0.555 / 1.219 s, the
  16:12 run 0.674 / 1.165 / 6.879 s (n 20), from `h40d-clocks.mjs` revision 2, which prints G, dispatch → screen t0 (4–11
  ms) and the identity's residual (0 ms). A 2a breach is a FAIL only when 2b or 2c fails; with both passing it is NO
  LATENCY VERDICT (re-fly); with 2c INCOMPLETE it is INCOMPLETE (I5d). The model clock against 4.499 s and G against
  0.504 s, and the review's equivalent key (dispatch → won-by against 4.751 s), are reported as the explanation. The
  16:12 calibration line now says that run reads NO LATENCY VERDICT on 2a and that 2e alone catches the hold.
- **I2 (2c compared arms run at different times; the threshold's known case).** Changed as the ruling says (Q4): 2c
  gates the cue twins' pooled median `thoughts` ≤ the no-cue twins' + 150 tokens. The threshold is re-derived with its
  provenance from the scenario50 twins (`h40d-thoughts-noise.mjs` on s50k/l/m: per-rep medians 874/897/905,
  849/890/887, 911/892/899; the largest one-rep-versus-two difference 38 tokens; pooled medians within 18 tokens across
  three days while TTFT moved by up to 0.99 s between adjacent reps on h40b); the holdout hours' figures (30/67/25) are
  cited as measurement noise only. 150 ≈ 4 × 38, > 2 × 67, ≈ 0.44 s at the pooled Theil–Sen slope of about 2.9 ms per
  token (stalls excluded; the review's 2.4–4.3 range re-derived as 2.75–3.77 per hour). TTFT at +1.0 s is the fallback
  when `thoughts` coverage is under 90% on a side; the TTFT p50/p90 differences and the 0.5 s line are reported with the
  run order named. The bench's TTFT is dropped as the first known case; the bench's thinking-token difference (cue reps
  on s50m's bytes against s50m's `captured-high` of 2026-09-22) is the first known case, computed by the same script
  with `--control-dir`. The script is calibrated (0 → PASS, +150 → PASS, +151 and +200 → FAIL, exclusion, absent
  control); its first version reused the cue object as the control and read +200 as 0 — caught by the calibration and
  fixed before any reading.
- **I3 (empty prose counted as a hole; holes in the cue check).** Changed per the ruling (Q8): a true hole =
  `transientError`, counted not acceptable and not wrong on either side and excluded from the cue check's n; more
  than 3 per rep → INCOMPLETE; empty prose (no `transientError`, empty `spoken`) counts wrong on either side and is
  named as a block-only twin on the cue side; 2c's "ids answered" is defined the same way. The adapter reads the
  answers files, not only the verdicts. Two real empty-prose cases on no-cue answers (s50l `captured-high-r3` S1Q06,
  s50m `captured-high-r2` S2Q06) and one real hole (h40c `captured-low-r3` R10) are named as known cases. Where the
  review's I3 fix text and its Q8 answer differ (whether a hole leaves the acceptable/wrong n), the ruling's Q8 wording
  is applied and the difference is noted in §13.
- **I4 (a log line the flight never prints).** Changed. The proof that the captured prompts carry the rule is the
  review's three lines (no `paired arm captured-no-cues-high … skipped` line; `flight.done.json`'s `pairedArms` lists the
  three tags; the three `--no-cues` runs log `EXIT 0`), in §2, rule 1(e) and §9.1. I confirmed at
  `flight.mjs:341–347` that `ruleSummary` is logged only inside the skip line, and at `:376` that `pairedArms` is
  written.
- **I5 (outcomes without a consequence; VOID masking).** Changed. §5 now has a precedence list (cue-attributable
  FAIL > VOID > other FAIL > INCOMPLETE > NO LATENCY VERDICT > PASS, GRADER DRIFT as a modifier); 2e FAIL is in the
  cue-attributable branch; rule 5 has a branch; the grader outcome is named GRADER DRIFT with the user's choice (B);
  a 2a breach with 2c INCOMPLETE is INCOMPLETE; a cue failure (rule 4) or a 2b/2c/2e/3c FAIL is read in any hour whose
  1(d) and 1(e) hold, VOID or not, and stops cue mode with no re-fly until fixed (C).
- **I6 (the Thursday the draft assumed).** Changed per ruling 4: the replay is dropped from §6's preconditions; the
  bench's day follows the runbook's 01:28 refinement (preferably the 2026-09-30 quota day before 09:00 with ≥ 150
  headroom on 3.5-lite by a precise ledger; otherwise after 10:00 Thursday with the replay on Saturday); h40d = Friday
  2 Oct 13:30 if the merge lands Thursday, else the fallback day; "day" = the quota day (10:00 → 10:00) is defined at the
  top and used throughout; the replay yields if its day would be the flight's quota day.

## Minor

- **M1.** Changed: `h40d-grader-models.mjs` added to §7.4 with `--session` or a search over every session's
  `subagents/` and temp `tasks/`, and four known cases (a known Opus, a known Sonnet, a missing id, the same Opus found
  from a different session).
- **M2.** Changed: 3e's reason corrected — on mains h40c passes at the edge (28 against 28/29/30), h40b fails by one
  (27 against 29/28/30), h40a sits inside (29 against 27/31/28); the draft's "one below" was the all-items reading. I
  re-ran `mains-band.mjs` on the three hours. 5a no longer says R05 was lost "on every hour": h40a answered it.
- **M3.** Changed: `h40d-clocks.mjs --list` rows carry each window's dispatch and won-by ISO timestamps and its 2d
  status; 3d's join is made from the pairs' `dispatchedAt` and those rows.
- **M4.** Changed: 2d is the union of the two terms, both computed per window by the clocks script and joined by
  dispatch time; "2d FAILS when the union is 1 or more"; a window with a won-by line, no full line and no supersede after
  it is UNRESOLVED → INCOMPLETE unless something is charged; the real block-only case (the 16:12 run, whole log, window
  #2 dispatched 13:12:04.732Z, a won-by line, 0 failure lines) is a calibration case via `--whole-log`, beside the three
  synthetic fixtures (charged 1/0/0, UNRESOLVED 0/0/1). The review's text said 13:12:04Z; the script comment said
  13:12:08Z; the script prints 13:12:04.732Z.
- **M5.** Changed: §8 says the ledger compares lite-model MENTIONS (an upper bound, about 9 lines per answer) and that a
  count above the bound is resolved only by the precise ledger; the 3.5-lite bound before the flight is 30 (was 60); the
  control's exposure is stated concretely (the no-cue twins run last; four retries per item on a 429; a quota-short
  afternoon burns the control first → 3c INCOMPLETE with no same-day re-run); the 8-arm budget line of the merge
  review's item 6 is carried.
- **M6.** Changed: rule 1(d) reads "a rebuild with an unchanged filter sha is not void; a changed sha is VOID".
- **M7.** Changed: rule 4's heading says it FAILS only on a cue failure and that a failed check or row explained
  entirely by pipeline events reads CLEAN NET OF PIPELINE EVENTS = PASS; 4a's `CHECK EXIT 0` is "the expected reading",
  not a requirement; "answered late" is reported, not sent to rule 5.
- **M8.** Changed: rule 5 decides per item, before or after dispatch; an answer to nobody is resolved by hand from
  the dispatch's `question=`; losses before dispatch beyond R05 count as not acceptable, more than 2 VOID (D); any
  loss after dispatch that 2d does not charge is a rule-5 FAIL.
- **M9.** Changed: `h40d-twins.mjs`'s known cases now include the bench's cue answer files (present and shaped
  counts cross-checked against `cuebench-score.mjs`), a synthetic five-4-line-blocks rep → STOP and a four-block rep →
  PASS, the hole case (3 transient + 1 empty prose → not INCOMPLETE, wrong +1, cue-check n 41), a 4-hole rep →
  INCOMPLETE, and the two real empty-prose cases.
- **M10.** Changed: br1 is described as another roster on a loaded day (words p50 85 against 57); §3 says the screen
  clock is every first-token line in the run window (h40c's method) and the other clocks are per dispatch window; the
  four words (dispatch window, run window, flight window, quota day) are defined once at the top.
- **M11.** Changed: §7.3 names the commands (`app:start` → `probe` → `app:stop` through `launch-h40d-prestart.cmd` as a
  scheduled task), requires `PROBE READY` quoted and no process left, and adds `check-smoke-cues` and `--whole-log` on
  the copied log; the request count is corrected to about 10 (the probe pings 3.1-lite five times and runs the
  preflight, `run.mjs:350–361`).
- **M12.** Changed: one consistent statement — an INCOMPLETE 3c makes the hour INCOMPLETE (it cannot PASS); the arm is
  re-run the same quota day if the ledger allows, filling only its holes; the filled ids are graded by the pinned grader,
  named, and excluded from 2c; if the ledger does not allow it, the hour is re-flown (E).
- **M13.** Changed: a 3a miss with 3c PASS and the in-app count not below the smallest of its own three cue twins'
  counts on the shared ids reads as noise → re-fly, not revert; stated in rule 3a and §5.

## The questions the draft missed

- **A.** One definition of "wrong" (rule 3's opening); 3c's wrong clause on the 40 gated ids; the adapter calibrated on
  the known cases, M9's included.
- **B.** GRADER DRIFT in §6: graded by the new model, named; 3b and 3c still gate; 3a reported, not gated; the verdict
  carries the modifier; the user chooses between a dated re-pin amendment (h40c's in-app pairs re-graded by the new
  model before h40d's, that count as the floor) and "not validated" — chosen before h40d's 3a number is known.
- **C.** §5's precedence item 1: a cue-attributable FAIL is read in any hour whose 1(d) and 1(e) hold, VOID or not; no
  re-fly until it is fixed.
- **D.** Rule 5: each pre-dispatch loss beyond R05 counts as not acceptable and the hour continues ("PASS net of
  pre-dispatch losses" only if 3a still holds); more than 2 → VOID, the bound being the baseline hours' worst (1) plus
  one, from the pass records' `Answered hands-free` rows (h40a 45/45, h40b 43/43 + 1 to nobody with R05 lost, h40c
  44/44 with R05 lost) and the result notes.
- **E.** Re-run twin ids excluded from 2c (`--exclude`, calibrated), graded by the pinned grader, named (§4's counting
  rulings, rule 2c, M12).

## The merge review's item 6 (all carried)

- The two knowledge short-circuits: classified in rule 4 (a fixed text before any model call; `cues: []` expected;
  named by id as short-circuit answers on a reported row; removed from 4b's n and 4a's shape check; graded like any
  in-app answer so the consequence lives in rule 3 — a card or intro on a gated item would fail 3b; never VOID).
- `first token` = the first prose chunk after the block: §3, with the merge review named.
- The 3.5-lite budget: §8 (8 arms, 375 + probe and warm-ups ≈ 385–395 against 500; the ledger bound 30; the no-cue
  twins now run on every MAIN flight; `flight.mjs:155`'s "~155" is stale).
- The `hasCueRule()` check: §7.6, `h40d-hascuerule-check.mjs`, calibrated on the 05:00 re-smoke's
  `interview60.prompts.json` (named, never read by a person; built by `interview60.prompts.mjs`) under the scenario50 S1
  environment, with three known-false cases (h40c's pre-cue file; one id's mark stripped in memory; the wrong roster
  environment).
- A launcher guard on the cue build's markers in MAIN's dist: `guard-h40d.mjs` check 12 (dist-proof as a child, exit 0;
  `function trimCues`; `CUE_RULE` and `VERBAL_TYPED_PROMPT` in the source), with MAIN's pre-merge dist as the known-bad
  case.

## The ten open questions (the review's answers, adopted by the controller)

1. One pinned grader per arm, all ten in one session (§2, §12).
2. 3a gated, 3e reported with M2's reason; M13's reading decided (rule 3a, §5).
3. Screen p90 reported (rule 2a).
4. 2c on thinking tokens at +150 with the re-derived provenance; TTFT +1.0 s fallback; the bench's TTFT dropped (I2).
5. 2e conditional with the three changes (cue-attributable FAIL; hold-read reads the whole log; h40c as the no-hold
   known case: B under 15 ms in 3 of 47, T median 156 ms; br1 0 of 42, 197.5 ms — from my hold-read runs).
6. The pre-hour MAIN start done, with M11's commands (§7.3).
7. `captured-low` always graded; never pooled (§2, 3d).
8. Holes per the ruling (I3).
9. The fallback day = the first qualifying quota day at 13:30; the earlier-questions flight yields (§6).
10. The full replay-arm list runs; the two costs named (§2: the TTFT confound; §8: the control lost first).

## Rulings I think are wrong

None. One wording conflict is noted rather than argued: the review's I3 fix text and its Q8 answer differ on whether a
true hole leaves a rep's n for acceptable and wrong; the ruling's Q8 wording is applied (symmetric: not acceptable, not
wrong; out of the cue check's n only), and §13 says so. The effect is at most 3 counts per rep, on either side alike.

## What still needs the user

- The veto window on §12's decisions before the hour is armed (the controller took the review's answers).
- Under GRADER DRIFT, the choice between the dated re-pin amendment and "not validated" (§6), made before h40d's 3a
  number is known.
- If Thursday's bench shows a thinking-token difference above 150 tokens, 2c's threshold is raised with the user
  before arming (rule 2c), never loosened quietly.
- The user's one live look at the overlay and typed chat on the worktree build (merge review I1; `MORNING-2026-10-01.md`)
  is now a precondition of the hour (§6).
