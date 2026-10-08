# Proposal: freeze the grading instrument (not yet applied — for discussion)

## Why

Three flights were graded by three differently-worded ad-hoc subagent prompts written in
three different sessions. Re-grading after8's identical 3.1 answers with today's wording
gives 46, not the 50 recorded on the day. Two independent graders using today's wording
agree with each other 51/52. So the instrument is *reproducible when specified*, and the
flight-to-flight series is *not comparable* because the specification changed.

Until this is fixed, no quality trend across flights means anything.

## What changes

1. **`electron/test/golden/interview60.grader-prompt.md`** — the exact grader instructions,
   in the repo, versioned. `interview60.judge.mjs --export` already writes the rubric into
   the pairs file; this adds the *instructions around it* (strictness calibration, the
   independence rule for repeated items, the output contract), which is where the drift was.

2. **`--export` prints the dispatch text**, so grading is copy-paste rather than re-written
   from memory each time. One line in the flight's `done.json`: "grade each pairs file with
   interview60.grader-prompt.md".

3. **The judge file records the instrument version.** Add `graderPrompt: "<sha of the md>"`
   beside `model` in the merged output. A judge file without it is pre-freeze and must not
   be compared against a post-freeze one.

4. **Report the interval, not the bare count.** At n=52 and p≈0.88 one sigma is 2.3 answers.
   `evaluateGate` should show `46 ± 5 of 52 (95%)` so nobody reads a 1-2 answer move as real.

## The gate row needs rethinking too

At the current bar the gate is close to a coin flip:

| true quality | chance of passing "≥ 47 of 52" |
|---|---|
| 85.0% | 19% |
| 88.5% | 44% |
| 92.0% | 77% |

Options, cheapest first:
- **Gate on `wrong == 0` only** (which every non-Gemma arm already achieves) and report
  acceptable as a tracked number, not a pass/fail. Wrong answers are the safety property;
  weak ones are a quality trend.
- **Gate on a two-flight moving average**, which halves the variance without new questions.
- **Raise n**: 3 repeats of the 52 gives n=156 and shrinks one sigma to ~1.3 answers, at the
  cost of ~3x the answer-pass quota and grading time.

## What this does NOT fix

Grader drift was worth ~4 answers. The *model's own* run-to-run variance is larger: the same
model on the same question produces answers with a median content overlap of 0.36, and the
set of failing questions rotates almost completely between flights. Freezing the instrument
makes that variance visible and measurable; it does not reduce it.
