# PREREGISTER — ET38: 3.8 Live Extended Thinking, low and medium, against the app's 3.5-flash-lite HIGH

Written 2026-09-30, 19:28 local. At that point:
- no ET38 audio had been played;
- no ET38 answer existed, so none had been graded;
- the harness below had been built and calibrated on earlier runs only.

The rule below is not changed after the data exists. (The early-stop paragraph took its final form at 19:31, still
before any audio: the stop applies to medium only, and the runs a stopped arm did play are graded.)

## Why

- **The user's request, 2026-09-30:** "How about we try 3.8 extended thinking with low and medium?", then: "low and
  medium to compare latest flight's 3.5 lite high's performance".
- **What is known.** L20c (graded today) closed bare 3.8 Live as an answerer: acceptable 62% against the app's 75%.
  It lost on correctness. Extended Thinking was tried once on the 10 hardest items (ET10 and ET10b, 27 and 28
  September, one run per level): low was acceptable on 8 of 10 (7 when graded again), against the app's 4 to 5; medium
  on 3 of 10, with 5 spoken system errors. Both were slower to finish than the app. Ten items and one run cannot
  carry a decision. This is the same comparison at L20c's size.
- **holdout40 is not used.**

## Items: L20c's 38

The 19 scenario50 S1+S2 pairs of L20c (all 20 minus the S1Q01 pair, which has no captured s50k prompt): 38 items.
Reporting groups as in L20c: hard = 5 pairs (10 items), normal = 14 pairs (28 items). `et38/items.json`, built by
`make-et38.mjs` from L20b's and L20c's item lists.

## Arms

- **ET-low and ET-medium:** `gemini-3.8-live-extended-thinking` with `thinkingConfig.thinkingLevel` low and medium.
  Three runs each (r1, r2, r3), one Live session per pair.
- **Harness:** `et38/run.mjs` is `l20c/run.mjs` with only the folder, the model, the `--level` argument passed as the
  thinking level, and the run file's name changed. `make-et38.mjs` builds it and proves it: 5 lines replaced, 3 added,
  every other line identical and in order. So the system instruction (the app's captured s50k system prompt, the
  pair's CONTEXT, the LIVE MODE block), the real-time audio feed, the waits (6 s of quiet after a turn of 25 words or
  more or a system-error message, 30 s after a shorter turn, 60 s with no output, cap 150 s) and the one transport
  retry per pair are L20c's.
- **Extraction:** `et10/et-extract.mjs`, unchanged. The answer is the first post-question turn of 25 words or more, or
  a system-error message; holding turns and premature output are dropped; the app's filter chain is applied.
- **Pre-flight:** an ad-hoc health probe of bare 3.8 Live (`l20/health-probe.mjs` defaults) must answer 5/5 with no
  abnormal close, or nothing runs in that window. `go-et38.mjs` applies it.
- **Windows.** A run is never started when it could still be running during a scheduled Live probe (20:00, 04:30,
  10:00) or the 05:00 cue re-smoke; `go-et38.mjs` refuses by the clock. The six runs may therefore fall in more than
  one window; each run's start time is reported.

## The comparator

- **The user's comparator is br1:** today's flight (2026-09-30), the current build with the hedge on by default, so
  3.5-flash-lite HIGH answered first. Its in-app answers to 37 of the 38 items (S1Q08 is a hole) were graded in L20c:
  rate 0.770, no consensus-wrong answer. Its first token after the question ends: p50 6.6 s, p90 14.6 s (37 items).
- **One flight is one sample.** L20c graded four more samples of the same app setup on the same items, with the same
  rubric and the same grader model: rates 0.658, 0.763, 0.784, 0.803 (mean 0.752, worst 0.658, no consensus-wrong
  answer). They are the yardstick for the app's own spread. They are NOT graded again here.
- **The anchor.** br1's 37 answers are graded again, blind, inside this batch. If the new graders read them as
  L20c's did, L20c's numbers can stand beside this batch. The anchor HOLDS when br1's new rate is within 0.05 of
  0.770 (0.720 to 0.820).

## Grading

- **One blind batch:** every ET answer of every run that was played (the runs of an arm that was stopped early
  included), plus br1's 37 answers, in a seeded random order under keys `id#k`. The key goes to a folder no grader is
  pointed at.
- **Packets:** a seeded shuffle splits the 19 pairs into 4 packets of 5, 5, 5 and 4 pairs, so all of a question's
  answers go to the same graders. Each packet is graded by two fresh `claude-opus-5-5` graders (8 agents); the grader
  model is verified from each transcript's model field.
- **Rubric:** the frozen s50k rubric, verbatim, as in L20c. acceptable = correctness 2 and on_topic 2 and delivery at
  least 1. consensus-wrong = both graders scored correctness 0.
- **Holes are not sent to graders.** A hole is an item that did not play, has an empty extracted answer, or whose
  answer is a spoken system-error apology (`/system error/i`). This differs from L20c in one point, stated here
  before the data: L20c also sent apologies to the graders; here an apology is a missing answer and nothing else, as
  told to the user.

## Scores

- A sample's rate = acceptable items, averaged over its two graders, divided by the items it answered.
- The holes-as-not-acceptable read, over all 38, is reported beside it.

## Decision rule, per arm (PROCEED needs all of 1 to 5)

1. **Quality.** The arm's mean rate over its three runs is at least:
   - br1's new rate minus 0.05; AND
   - 0.702 (L20c's app mean 0.752 minus 0.05), if the anchor holds.
2. **Band.** The arm's worst run is at least 0.658 (the app's worst sample in L20c), if the anchor holds.
3. **Safety.** The arm's consensus-wrong answers are at most 1 over its three runs. (L20c's formula, 1 + the app's
   count times 0.75 rounded down; the app's count was 0 in L20c. br1's new count is reported beside it.)
4. **Reliability.** The arm answers at least 110 of its 114 items, after at most one transport retry per pair. That is
   L20c's bar (52 of 54) at this size.
5. **Speed.** Over the arm's answered items with a normal feed, the first word of the real answer has a p50 of at
   most 6.6 s and a p90 of at most 14.6 s after the question ends: br1's own numbers. A holding line is not the real
   answer.

**If the anchor does not hold,** the two L20c bars (0.702 and 0.658) are not used, and no arm can PROCEED: the
verdict is then STOP (if a condition that needs no L20c bar fails) or NO VERDICT ON QUALITY (the app's samples must
be graded together with the ET answers before anything is decided).

**The early stop, for ET-medium only.** After a run, once medium's holes exceed 4 it has failed condition 4 by
arithmetic (it can no longer answer 110 of 114). Its remaining runs are not played. The runs it did play are graded
and reported, labelled as fewer than three, and its verdict is STOP on reliability whatever they score.
- Why medium only: low is the level with a quality claim to test (8 of 10 on the hardest items), so its three runs
  are wanted even if its reliability fails. Medium's one earlier run made no such claim (3 of 10, five system
  errors), so two more runs are not worth their time once its reliability has failed.
- ET-low always plays three runs. Its conditions are read after the third.

**A broken window.** If any run answers fewer than 19 of its 38 items, the chain stops there: a service failure is
likely. Every run that was played counts as played. The remaining runs wait for a later window.

**PROCEED (all five)** means what it meant for L20c: the arm is worth its own build path (throwaway spikes, a spec, a
review, a build with the flag off, a smoke, its own pre-registered hour, then a holdout40 validation flight). Nothing
ships on this result alone.

**STOP** if 1, 2 or 3 fails, or by medium's early stop: the arm's answers are not good enough, or not reliable
enough, to replace or race the app's. **WAIT** if 1 to 3 pass and 4 or 5 fails after three runs: quality holds, and
the arm is too unreliable or too slow as measured; nothing is built.

Each arm gets its own verdict.

## Reported outside the rule

- per-run rates in both reads, the hard/normal split, the per-question table, grader agreement;
- br1's new rate against its L20c rate (the anchor), and its new consensus-wrong count;
- the first word of the real answer per run; holding lines; the LAST word of the answer (p50 and p90), beside the
  time the app's answer is complete. Extended Thinking speaks its answer, so its text arrives at talking pace; the
  app's text arrives within about a second of its first token;
- words and thought tokens; abnormal closes and retries; each run's start time;
- slow-feed items: an item whose clip took more than 1.30 times its length to send (the slowest of the 113 items of
  the six L20b and L20c runs was 1.254). Its times are left out of the latency numbers; its answer is graded.

## Not covered (residual risks)

- **L20's list:** a TTS voice, one session per pair, no barge-in, no screenshots or coding-pad questions.
- **Load and window.** The runs share the machine with other work (tests of another change may run beside them); the
  slow-feed rule is the guard for the latency numbers. One day's service load.
- **Prompt drift.** The system instruction is the s50k capture of 2026-09-20; br1 answered with today's prompt.
- **The anchor is one sample of 37.** It can hold or fail by chance; the rule says what follows either way.
- **Sensitivity.** 38 items detect only large differences.
- **Cue mode.** The Live model answers in speech. The cue block the app shows above an answer rides the text
  stream's first lines; an audio answerer has no such block. A PROCEED would still have to solve that.
- **An answer of a few words** counts as answered for condition 4 (L20c's definition); its quality is the graders'.
