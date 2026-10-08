# Pre-registration: the h40d 3.8 Flash sidecar (descriptive; outside the h40d rule)

Written 2026-10-02 12:40 local, before h40d (13:30) produced any data. The user (12:3x): "make sure to use flash 3.8
on the most failed questions to compare with our app's models, pipeline etc".

## Standing

- **Outside `PREREGISTER-h40d.md`.** r4 §8 says full Flash models are used by no rule and no reported row of h40d;
  this sidecar does not change that. It runs only after h40d's verdict is read and its result note is drafted, and
  nothing in it can move any h40d clause, verdict or license.
- **holdout40 is never used to tune.** This is a comparison on the holdout's failures, reported. It licenses no
  change by itself: any model change it suggests needs its own pre-registered bench on non-holdout data (scenario50
  captured prompts) and its own flight.

## Selection: "the most failed questions"

From h40d's merged judge files (the 10 Opus graders): for each of the 45 items, count the arms that are NOT
acceptable (correctness 2 and on-topic 2) among the ten graded tags (in-app; `captured-high`, `-r2`, `-r3`;
`captured-no-cues-high`, `-r2`, `-r3`; `captured-low`, `-r2`, `-r3`). Rank: (1) the in-app answer not acceptable
first, (2) then more failing arms, (3) then the in-app correctness score (0 before 1), (4) then roster order. Take the
top items, at most **17** (3.8 Flash's 20 a day, minus the 3 L38M re-asks pending: H11, H19, H20F). Items with zero
failing arms are never taken; if fewer than 17 qualify, fewer run. The list is printed before any call.

## The call

`node electron/test/golden/interview60.answers.mjs --model gemini-3.8-flash --captured <h40d run>/interview60.prompts.json
--only <ids> --tag flash38` from MAIN after the hour: the hour's captured bytes (cue rule included), default
thinking, the app's filter chain with `stripCueBlock` innermost, exactly as the captured arms. One pass; the harness's
own retry policy applies; a hole stays a hole. If more than half are 503/429 holes, one second window at least 30
minutes later for the holes only, within the 17-call budget. Not before the h40d flight process has exited.

## The comparison

Per selected item, graded blind by two new Opus agents with the frozen grader prompt and h40d's rubric, anonymous and
shuffled: the 3.8 Flash answer, the in-app answer, `captured-high` rep 1 (3.5-lite HIGH) and `captured-low` rep 1
(3.1-lite LOW). Reported: acceptable and wrong per model over the selected items; per item better / same / worse
than in-app; first token per model (3.8 Flash's offline TTFT against the twins' offline TTFT, never against the
in-app screen clock). Named in the note: the selection is the hour's failures, so any model looks better on it by
regression to the mean; the twins' own scores on these same items are the control for that.

## Not covered

One hour's failures; one 3.8 Flash pass; offline calls (no gate, no hedge); free-tier availability at midday.
