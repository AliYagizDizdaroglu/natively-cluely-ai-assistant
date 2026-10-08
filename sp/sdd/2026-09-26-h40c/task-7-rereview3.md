ALL ADDRESSED

# Task 7 re-review 3 (fix round 3)

**Result: no findings.** Nothing I tested makes a correct app fail, lets a broken app pass, or
makes the runner or launcher misbehave.

Nothing run here started the app, registered a task, called a model API, or ran the real
`app:stop`. The runner ran as byte-identical copies in `SP\rv9\`, so the real
`SP\smoke-hedge-checks.txt` was not touched.

## Rulings

**NEW2-I1 is met: the roll-up now fails closed.** Anything other than PASS or INCONCLUSIVE counts
as bad (run-smoke-hedge-checks.mjs:153). On the `SP\rv9\mk.mjs` trees:

| Tree | Result |
|---|---|
| clean | `OVERALL: PASS`, exit 0 |
| forced answer 2 never raced | `OVERALL: FAIL`, exit 1 |
| forced debug copy unreadable (my round-2 reproduction) | `forced=ERROR(exit 2)`, `OVERALL: FAIL`, exit 1 (was PASS with exit 0) |

**NEW2-M1 is met.**
- A segment with `scoredCount === 0` is INCONCLUSIVE; that check runs after FAIL and before the
  clip comparison (checker:614-620).
- `routeFor` is now bounded by `win.end` (checker:274-275).

**NEW2-M2 is met.**
- **(a) Clips count only `answer` windows** (checker:608). `rv7\supersede` (1 clip, answer plus
  supersede, both clean) now PASSes.
- **(b) A pre-token redirect counts as one answer**, but only when the redirect line sits between
  the two stall-race or front lines (checker:333, 350). `rv9\off-redirect` (h40b's real 503 shape)
  now PASSes, and a genuine overlap stays INCONCLUSIVE (calibration case
  `off-overlap-no-redirect-INCONCLUSIVE`).

**My earlier fixtures still give the right verdicts:**
- FAIL: `rv8\unraced`, `rv8\bothfail`, `rv8\off-nowin`, `rv7\noabort`, `rv7\unhandled`.
- PASS: `rv8\answertext`.

**Calibration: 48/48**, reproduced.

## About the synthetic hedge-mode redirect fixture (not a finding)

In the real app, the redirect this fixture models is always preceded by a failure line, which
fails the window first. Here is why:
- The hedge throws, which is what triggers withVerbalFallback's redirect, only after it logs
  `verbal hedge: no answer - front X, back Y` (LLMHelper.ts:3525-3529).
- A failure after the first token is re-thrown rather than redirected (WhatToAnswerLLM.ts:76).
- `classifySegment` checks rule (a), a `no answer` line, before the redirect exemption
  (checker:343 before 350).

So every real hedge-mode redirect still FAILs, as the NEW-C1 ruling requires. The exemption at
checker:350 cannot be reached by real logs. It is harmless, because it can only score a shape the
app never produces. That also means its being synthetic does not weaken any verdict.
