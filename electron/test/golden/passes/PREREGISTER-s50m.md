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

---

## Amendment — 2026-09-22 01:09 local, before the flight ran

Recorded here rather than applied silently. No s50m data exists yet: the runs folder holds
no 2026-09-22 entry, checked by the script that wrote this.

### 1. Condition 4 is scoped to the candidate

As written, condition 4 demanded zero `wrong` verdicts and zero stall-budget overruns in
*every* arm, its own 3.1 twins included. A 3.1 twin producing a wrong answer would therefore
have failed the rule, and failing the rule keeps 3.1. A condition a model can fail in its own
favour decides nothing.

Condition 4 now reads: **zero `wrong` verdicts in the live hour and in the three 3.5 HIGH
captured arms, and zero answers past the 10 s stall budget in those same arms.** Wrong answers
and overruns in the 3.1 arms are reported and decide nothing.

Conditions 1 to 3 are untouched. The swap still requires all four.

### 2. Declared in advance, still outside the rule: a latency drift control

The paired arms run back to back in one batch in a fixed order, all five 3.1 arms before all
four 3.5 arms. Batch position is therefore confounded with model, and no cross-model latency
figure from this flight stands on its own.

At grading time, compare TTFT across the three reps *within* each model separately. A flat
trend inside both models means batch drift is small and the cross-model figures are worth
reporting as context. A trend inside either means every cross-model latency comparison from
this hour is discounted to nothing.

This is a diagnostic, not a criterion. Latency stays outside the rule for the same reason
length does: a speed result must not rescue a failed quality claim. The clean measurement
remains a same-window probe alternating the two models request by request, which costs no
flight and has never been run.

---

## Result of that probe — 2026-09-22 21:34 UTC, after the flight was graded

The last paragraph above called for a same-window probe alternating the two models request
by request, and noted it had never been run. This is that probe.

**Method.** s50m's own 39 captured prompts. For each id, both models issued back to back,
strictly sequential so they never contend, with the order alternating by id to balance any
first-in-pair advantage. Each model's own first token is measured, with **no fallback**, so a
stall is recorded as the long number it really is instead of being capped at the budget. Same
call shape as the harness: `v1alpha ... :streamGenerateContent`, temperature 0.4, the same
thinking level each model runs at. Script lives in the session scratchpad, not the repo.

| model | n | p50 | p90 | max | over 10 s | errors |
| --- | --- | --- | --- | --- | --- | --- |
| 3.1-lite LOW | 39 | 6484 ms | 8047 ms | 11658 ms | **1** | 1 (HTTP 503) |
| 3.5-lite HIGH | 39 | 3944 ms | 4549 ms | 5638 ms | **0** | 0 |

Paired over the 38 ids where both returned a token: 3.5-lite faster on **34**, median
difference **−2426 ms**, sign test p = 3e-7. Order control: median first-in-pair 4549 ms
against second-in-pair 4160 ms, so the alternation did not manufacture the gap.

**What this changes.** Condition 4 failed on four stall fallbacks in the live hour, and the
inference drawn from them was that 3.5-lite stalls. Under identical conditions it is 3.1-lite
that breached the budget, once, and 3.1-lite whose p90 of 8.0 s sits near the 10 s budget
while 3.5-lite's sits at 4.5 s. The s50m stall evidence is a property of that hour, not of the
candidate model.

**What this does not change.** The verdict. The rule was fixed before the data existed and is
not renegotiated after it. This probe is also one window of about ten minutes, so it cannot
show that 3.5-lite never stalls, and it says nothing about answer quality.

What it licenses is re-opening the question in a new flight with its own pre-registration,
whose condition 4 measures the **primary's** first token or exempts answers the fallback
served — since with a 10 s stall budget any fallback firing guarantees a TTFT over 10 s, and a
condition worded the way this one was is failed by the safety mechanism working correctly.
