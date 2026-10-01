# Result: the simple-question probe on the shipped cue rule (reported, never gating)

Written 2026-10-01, 09:40 local.
- **The rule:** `PREREGISTER-cueprobe.md`, with its notes of 30 Sep and its amendment of 1 Oct 09:30. The
  amendment was written before the re-run's first call; no measure changed.
- **Scripts:** `SP\cue-group\probe-shipped.mjs`, calibrated by `cal-probe-shipped.mjs`: PROBE CALIBRATION OK,
  29 cases.

## The first counted run is VOID; the re-run is the record

- **The void run (09:16–09:27):** its swap left S1Q08F's own question in every prompt.
  - That base carries its question in two `[INTERVIEWER]` lines and in the live listener's block. Only the first
    line was swapped.
  - Most cue blocks answered the base question ("Feedback loop bias") instead of the probe question.
  - Kept as evidence: `probe-shipped.resmoke2.out.txt` and `probe-shipped-both-2026-10-01T06-16-41-208Z.json`.
    Its block-only count was 0 on both models.
- **The re-run (09:31–09:39)** uses the same input, items, models, reps and measures.
  - **The swap:** the probe question became the interviewer's only question, in the transcript and in the live
    block. A check refuses any leftover of the old question; on the real base the old swap fails it.
  - **Prompts:** the combined build's re-smoke prompts (`2026-10-01T02-37-41-cuesmoke`). Every captured system
    prompt carries the dist's `CUE_SHAPE_RULE`; the script refuses otherwise.
  - **Display:** through the built `trimCues`, at 3 lines × 5 words read from the dist.

## The re-run's counts (printed by the script, verbatim)

```
set    model          n  noText trimmed(drop/cut/clean) | shown: empty 1-line-ans ans-first over3 long words | raw: empty 1-line-ans ans-first over3 long words
spike  3.1-lite LOW   26      0                2(0/0/2) |     0            7        23     0    0     5 |     0            7        23     0    0     5   (simple n 23)
       block-only answers (a block, no spoken answer under it): 0
spike  3.5-lite HIGH  28      0                0(0/0/0) |     0           17        24     0    0     4 |     0           17        24     0    0     4   (simple n 24)
       block-only answers (a block, no spoken answer under it): 0
fresh  3.1-lite LOW   24      0                1(0/0/1) |     0            4        24     0    0     5 |     0            4        24     0    0     5   (simple n 24)
       block-only answers (a block, no spoken answer under it): 0
fresh  3.5-lite HIGH  24      0                0(0/0/0) |     0           18        24     0    0     3 |     0           18        24     0    0     3   (simple n 24)
       block-only answers (a block, no spoken answer under it): 0
```

- **No answer after 3 attempts:** 2 calls, both on 3.1-lite LOW: X3 rep 2 and M1 rep 2. They are not rows, so that
  set's n is 26 and its simple n is 23.
- **The 3 trimmed blocks** are all on 3.1-lite, and all are "cleaned": spoken notation removed from a line, never a
  line dropped or cut. X5 reps 2 and 4: raw `$O(\log n)$`, shown `O(log n)`. F3 rep 2: `$O(1)$` and `$O(n)$`
  cleaned the same way.

## Read in advance (descriptive, never a gate)

| line | reading | signal? |
|---|---|---|
| winner's curse: fresh one-line-answer below half the spike rate | 3.5-lite: spike 17/24 (71%), fresh 18/24 (75%). 3.1-lite: spike 7/23 (30%), fresh 4/24 (17%), half of 30% is 15% | no, on either model (3.1-lite is close) |
| absent-block risk: more than 1 empty of 52 on 3.5-lite HIGH | 0 empties of 52 | no |
| the display cap doing the work: trims on more than 10% of blocks | 3.1-lite 3 of 50 (6%); 3.5-lite 0 of 52 | no |
| block-only answers (reported to the user before the merge) | 0 on both models, both sets | none to report |

## What it says about simple questions

- **3.5-lite HIGH, the model that answers first in the shipped hedge:**
  - The first line carries the answer on every simple item: 24/24 spike and 24/24 fresh.
  - The whole block is a single line on 71–75% of them. Median block 3–4 words.
  - Examples of the shape: "Parquet", "O(log n)", "UDP", "404 Not Found".
- **3.1-lite LOW** also leads with the answer every time (23/23, 24/24). It adds a second line far more often: one
  line on 17–30% of items, median block 5 words.
- **Nothing on screen would be empty.** No block was empty, and no reply was a block with nothing to say under it.

## What it does not show

- **Questions inside a real conversation.** The base turn is a swap into S1Q08F's captured turn, so its other
  context (previous responses about another topic) stays.
- **The live app:** the hedge, the early close, the overlay. The re-smoke and the user's live look cover those.
- **The medium item M1** is reported in the counts but has no answer term.
- **The probe gates nothing.** The merge is decided by the re-smoke, the bench and the user's live look.
