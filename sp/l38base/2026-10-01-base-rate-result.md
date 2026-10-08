# Result: the easy-question base rate on the non-holdout rosters (router agenda item 1; descriptive)

Written 2026-10-01 20:17 local. Rule: `PREREGISTER-base-rate.md` (20:1x, before any classification). No Gemini
call; holdout40 never read. Files: `items.json`, `blind/blind.json`, `keyhold/key.json`, `blind/verdicts.g1.json`,
`blind/verdicts.g2.json` (saved verbatim), `read.txt`; calibration `cal-extract.mjs`, `blind/cal-blind.json`,
`blind/cal-verdicts.json`, `cal-read.txt`.

## The count

| set | items | EASY by grader 1 | by grader 2 | by BOTH | per hour (BOTH) |
|---|---|---|---|---|---|
| scenario50 mains | 50 | 0 | 0 | 0 | 0 |
| scenario50 follow-ups | 50 | 0 | 0 | 0 | 0 |
| interview60 mains | 58 | 0 | 0 | 0 | 0 |
| interview60 follow-ups | 18 | 1 | 1 | 1 | 1 |
| **all** | **176** | **1** | **1** | **1 (0.6%)** | **0 of 40 (scenario50 hour); 1 of 76 (interview60)** |

Graders: two Opus agents, `claude-opus-5-5` verified in both transcripts; agreement 176/176. The one EASY item is
interview60 L04F2, "And where would you store the features so that serving can read them fast?" (one term: an
online feature store).

## Calibration of the definition (rule 8, run after the count, read before writing this)

The same definition, a third Opus agent (`claude-opus-5-5`), on the 22 L38R items whose class is known from the
router runs: the 12 self-written simple items that Live answered right (33 of 36 tries) were called EASY 12 of 12;
the 10 hard scenario50 items were called HARD 10 of 10. So the definition is exactly the class the router was tested
on, not a stricter one.

## My expectation, for the record

I wrote 10–20% overall and 4–8 items per scenario50 hour. The measured value is 0 per scenario50 hour and 1 per
interview60 run. I was wrong by an order of magnitude: the router's easy class is what I wrote for the probes, not
what the rosters ask.

## What it means for the router (the decision is the user's)

- On the two authored rosters the Live router would answer nothing in a scenario50 hour and one question in
  interview60's 92 minutes. Everything measured today on the easy path (33 of 36 right at 0.85 s) applies to a
  question shape these interviews do not contain.
- The hard path gains nothing from the router (L38H). So on these rosters the design's benefit is ≈ 0 and its costs
  stay: a combined ear + router prompt (untested), the answer-based follow-up hole, Live's failure shapes, paid-tier
  cost.
- The real question becomes whether the user's actual interviews ask one-fact questions the rosters do not. The
  rosters are the user's own expectation of the interview (scenario50 is "the next interview" set), which is the
  best evidence available short of a recording of a real one.
- The text-call competitor (3.1-lite LOW cue-only, given the question text and the on-screen answer) is unaffected:
  it does not depend on an easy class.

## Not covered

Real interviewers; holdout40 (by rule); whether a looser class ("answerable in one sentence") would be both common
and safe for Live — that would be a different design than the one probed today, and L20c says bare Live loses on
correctness once answers get longer.
