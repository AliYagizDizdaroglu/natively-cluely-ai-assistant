# Pre-registration — s50m, 2026-09-21

Written and committed BEFORE the flight runs. The rule below decides whether
`gemini-3.5-flash-lite` at HIGH replaces `gemini-3.1-flash-lite` at LOW as the shipped
answer model. It is fixed at commit time; if the outcome is uncomfortable, the outcome
stands and this file does not move.

## Why this flight exists

s50l tested a rule pre-registered on all 38 shared ids and FAILED it: mean +1.33, bands
touching at 34, exact permutation p = 0.15. Splitting that set afterwards showed why —
the 20 shared follow-ups are saturated, scoring 18/18/18 for 3.1 and 18/17/18 for 3.5,
so they separate nothing and dilute the 18 mains that do:

| slice | 3.1 LOW reps | 3.5 HIGH reps | mean gain | bands | exact p |
|---|---|---|---|---|---|
| all shared (38) | 33 / 34 / 34 | 36 / 34 / 35 | +1.33 | touch | 0.150 |
| **mains (18)** | **15 / 16 / 16** | **17 / 17 / 18** | **+1.67** | **no overlap** | **0.050** |
| follow-ups (20) | 18 / 18 / 18 | 18 / 17 / 18 | −0.33 | overlap | 1.000 |

That mains split was found AFTER seeing the data. It is a hypothesis, not a result, and
p = 0.05 is the floor three reps can produce rather than a comfortable margin. s50m exists
to test it honestly, on mains, declared in advance.

Mains are also the unit the quality gate already uses — the bar is "18 of 20 mains" — so
this is not a convenient slice invented for the model question.

## Configuration (one variable, unchanged from s50l)

Identical to s50l in every respect: `NATIVELY_VERBAL_PRIMARY_MODEL=gemini-3.5-flash-lite`
for the live hour, the shipped default untouched, three reps of each twin on the captured
bytes. Flying 3.5 live again is deliberate — a swap should rest on two full clean live
hours on the candidate, not one.

## THE RULE — all four required to swap the default

Scored on the mains among the ids shared by the live hour and all six captured arms.

1. **Direction and magnitude replicate.** 3.5 HIGH mean exceeds 3.1 LOW mean by **>= 1.0**
   acceptable answers.
2. **Per-question agreement.** Counting ids where one side is acceptable in more reps than
   the other, 3.5 up : 3.5 down is **>= 2:1**.
3. **No regression at the bottom.** 3.5's worst rep is **>=** 3.1's worst rep.
4. **No safety cost.** Zero `wrong` verdicts in every arm and in the live hour, and zero
   answers past the 10 s stall budget.

Clear all four -> ship `gemini-3.5-flash-lite` as `GEMINI_FLASH_MODEL` in LLMHelper, citing
s50l and s50m, then rebuild and re-verify.

Fail any one -> **3.1-lite LOW stays, permanently.** The model question closes and no
further flight is spent on it. Remaining flights go to the length lever via the prompt,
which is where both models lose most of their points.

This is a replication rule: same direction, similar magnitude, no bottom-end regression.
It is deliberately NOT "beat s50l's separation again" — demanding a rarer result than the
one being replicated is a bar designed to fail.

## Declared in advance, and NOT part of the rule

- **Length.** 3.5 put 0 of 117 answers past 150 words against 3.1's 6, max 146 vs 224,
  p50 74 vs 89. This is the largest real gap between the two and the frozen grader cannot
  score it — its rubric holds that length alone is never below 1. Recorded as context. It
  does not enter the rule, and a length result cannot rescue a failed quality rule.
- **Ceiling.** Both twins score 33–36 of 38 combined. Any future rule on the combined set
  is unreachable by saturation, not by model equivalence. Mains-only is the fix; a harder
  roster is the better one.
- **Cue mode is NOT in this flight.** Its locked design emits cues first in the same call,
  which would change the answer shape and therefore the captured prompts — moving the
  instrument under the one comparison this flight exists to make.
