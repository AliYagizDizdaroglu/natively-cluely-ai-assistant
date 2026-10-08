# Pre-registration: cue bench (cue-mode plan Task 8), amendment to the plan's Step 1 and Step 4

Times-only correction, 2026-09-30 10:33 (no bench call has run; no rule text touched): the Amendment header below
says 09:35, but this file's mtime before this edit was 09:28:16, so the amendment was written by 09:28. (This note
itself first said "10:36"; the edit was saved at 10:33:57. Corrected 11:19.)

Written 2026-09-28 evening, before any cue rep is run. The plan's decision table (Task 8 Step 5,
spec §8) is unchanged and binding. This note changes two things the plan could not know when it was
written on 2026-09-21, and nothing else. Committed to the worktree's `passes/` with the result.

## 1. Which model the bench runs on (replaces Step 1)

The plan keyed the model to s50m's outcome. The shipped default can now change again with h40c
(flight 2026-09-29 13:30). The bench runs on the model that answers FIRST in the shipped
configuration once h40c is decided:

| h40c verdict | arm | control (s50m, same bytes) |
|---|---|---|
| PASS (the hedge becomes the default; 3.5-lite HIGH is the front leg) | `--model gemini-3.5-flash-lite --thinking HIGH` | `captured-high`, `-r2`, `-r3` |
| FAIL, VOID or INCOMPLETE (3.1-lite LOW stays) | `--model gemini-3.1-flash-lite --thinking LOW` | `captured-low`, `-r2`, `-r3` |

Captured prompts: `<MAIN>/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/interview60.prompts.json`
(all six control files exist, checked 2026-09-28). The bench runs on a day with no flight.

## 2. How it is graded (replaces Step 4)

The plan's Step 4 compared new cue reps against the control reps' EXISTING verdicts. Those were
graded by a different grader point release (the graders drifted from Opus 5 to 5.5, stricter by
4–7 of 39 on correctness; see the grader-drift pass records). So:

- The three control reps and the three cue reps are graded TOGETHER, blind: for each question and
  rep index, the control answer and the cue answer sit side by side in random order (seeded coin),
  key file outside every grader's reach. The cue block is stripped before grading; graders see
  prose only (spec §8: the frozen grader grades the PROSE).
- Two independent graders per pairs file, `claude-opus-5-5`, the frozen rubric (stamp
  `8564ba96369a`); `--verdicts` merges carry `--model claude-opus-5-5`; the result note names it.
- Counts per rep are the mean of the two graders. acceptable = correctness 2 && on_topic 2 &&
  delivery >= 1; wrong = correctness 0 from both graders (consensus-wrong).

## 3. Decision

Exactly the plan's Step 5 table, read on the counts above:
- prose band: ship if the cue reps' [min, max] acceptable overlaps or exceeds the control reps'
  [min, max]; entirely below = stop and fix the wording;
- wrong: any cue rep with more consensus-wrong than the worst control rep = stop;
- cue checks: `cues_present` and `cues_wellformed` on at least 90% of the ids in every rep;
- time to first token: reported (cue p90 vs control p90), not gating.

A PASS licenses the merge steps in Task 9 (review, merge, the validation hour on holdout40), not
the merge itself. The 3.8 Flash bench waits until cue mode has passed its validation hour (user
decision 2026-09-28).

## Amendment, 2026-09-30 09:35 (before any bench call; no bench data exists)

This note first said it changed "two things … and nothing else". The 2026-09-30 revision of cue mode ("small
cues": at most 3 lines of at most 5 words, a code cap at the display, spec
`docs/superpowers/specs/2026-09-30-cue-mode-small-cues.md` in the worktree) changes three more, stated here before
any bench call. Seen before writing this: spikes 1-5 in `SP\cue-group\`, including spike 2's per-line counts
(3.5-lite HIGH 8 of 67 and 3 of 71 lines over 5 words under two 3x5 wordings; 3.1-lite 0 of 137).

1. **What is benched.** The treatment inserts the REBUILT dist's `P.CUE_RULE`: the 3/5 limits and the wording spike 6
   chooses under `SP\cue-group\SPIKE6-RULE.md`. The result note names the wording and the sha256/12 of the dist's
   `CUE_RULE`, which `cuebench-score.mjs` prints at run time.
2. **The cue-check row** (it replaces the cue row of the 09-21 plan's Task 8 Step 5 and of §3 above): per id, the RAW
   block (what the model wrote, before the app's cap) must be present and SHAPED — 1 to 3 lines, none empty, none with
   "?", none with "you" — on at least 90% of the ids in every rep. The word count is REPORTED, not gated: blocks with a
   line over 5 words and lines over 5 words, per rep. Why: the app cuts a long line to its first 5 words (the user's
   decision), which keeps every part; a line beyond the third is dropped, which loses a named part. `?` and "you" stay
   gated because no code enforces them. `cuebench-score.mjs` computes this from the recorded `cues` arrays
   (`blockShape`), calibrated in `cuebench-calibrate.mjs` (lines-only overrun at 35/39 = STOP; words-only = PASS).
3. **The day.** §1's "a day with no flight" existed for the quota. The bench runs today, 2026-09-30, which also has
   br1 (13:30, a scenario50 S1+S2 app hour on MAIN) and spike 6: before the first bench call the quota ledger
   (`SP\quota-ledger-today.mjs 2026-09-30T07:00:00.000Z`) must show at least 150 requests of headroom on
   gemini-3.5-flash-lite, counting br1; otherwise the bench waits for Friday after the validation hour's own calls
   are known, never Thursday (the follow-up replay's day rule excludes a cue bench).

Unchanged: the model row of §1 (h40c PASSED: 3.5-lite HIGH vs `captured-high` r1-r3), the grading of §2 (blind pairs,
two claude-opus-5-5 graders, stamp 8564ba96369a), and the prose band, wrong and time rows of §3.

## Second amendment, 2026-09-30 11:19 (before any bench call; no bench data exists)

The Opus check of the plan's revision 2 (finding R4) found that item 3's fallback cannot happen as written. "Friday
after the validation hour's calls are known" puts the bench after an hour that cannot fly until cue mode has merged,
and the merge needs this bench to pass. Item 3's fallback is replaced, and the order with the probe is fixed:

3a. **If today's ledger shows less than 150 requests of headroom on gemini-3.5-flash-lite,** the bench does not run
    today and cue mode does not merge on Thursday. The bench then runs on the next quota day that has neither a
    flight nor another pre-registered replay on 3.5-lite. That day is not Thursday: the follow-up replay's day rule
    excludes a cue bench. The merge comes after the bench, and the validation hour after the merge.
3b. **Order on the bench's day:** the re-smoke, then the quota-ledger check, then the bench, then the simple-question
    probe (`PREREGISTER-cueprobe.md`: reported, not gating, 52 calls per model). The probe may run before the bench
    only if the ledger then shows at least 202 requests of headroom on 3.5-lite (150 plus its own 52).

Nothing else changes.
