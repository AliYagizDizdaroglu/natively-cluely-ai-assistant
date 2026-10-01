# Result: the cue re-smoke on the v2 build (small cues), by its pre-registered rule

Written 2026-09-30, 19:15 local. The rule is `PREREGISTER-cuesmoke.md` (11:19, amended 15:26, both before the build
existed). The run is `2026-09-30T13-46-52-cuesmoke` (record beside this file): scheduled task `Natively-smoke-cues`,
build `e3fae5f`, scenario50 S1 hands-free, the shipped defaults (hedge on: 3.5-lite HIGH first). Playback ran 16:12
to 16:47 local after four failed readiness attempts (3.1-lite returned 503; attempt 5 passed).

## Verdict: NOT CLEAN, a cue failure. Cue mode does not merge on this build.

| condition | result |
|---|---|
| 1. `CHECK EXIT 0` | **FAIL.** `answers 23 (real 22, failed 1), superseded 1, cue lines 24 (expected 23-24), malformed 0, block-only 1, trimmed 5`, `CHECK EXIT 1` |
| 2. The app is healthy | met. `Answered hands-free: 20/20 dispatched` (100% of S1), `Long questions answered whole: 8 of 8`. The report row itself reads FAIL for "1 to nobody": a second answer to S1Q08, below. |
| 3. The cue row | met. `22/22 present, 22 well-formed, 4 trimmed` |

The failing answer is a block-only answer with no transport error in the log. By the rule that is a cue failure:
"The fix goes back through the plan's tasks. Nothing else is armed on that build, and cue mode does not merge." The
bench and the simple-question probe have not run and do not run on this build.

## The block-only answer

It is the readiness probe clip's second question ("How would you handle autoscaling for a model inference service on
Kubernetes?"), answered at 13:12:08Z, ten seconds before the hour's playback began. It is an answer by the app on this
build, and the check reads the whole log, so it counts.

Its log trail (times and counts; the model's raw text is not logged):

- `verbal hedge: won by gemini-3.5-flash-lite at 2967ms`;
- the usage lines count 13, 37, 61, 85, 101 output tokens;
- after the 37-token chunk, 7 ms after the won-by line:
  `cues trimmed: {"rawLines":2,"dropped":[],"cut":["Scaling from zero and min replicas"],"cleaned":[]}` and
  `cues: ["KEDA with custom metrics","Scaling from zero and min"]`;
- 43 ms later: `budget: words=0`, then the substitute line ("Could you repeat that? ...");
- no `first token` line, no hard failure, no fence warning.

So the model wrote 101 tokens, the block was closed by a short complete line right after the two cue lines (a
paragraph of prose cannot be complete by the 37th token), and nothing after that line reached the screen.

### Cause: the offers block written before the spoken answer

Found in saved replies, not seen for this one answer. `scan-rows-shown.mjs` ran every saved spike and repro reply
(624 with text) through the built filter chain, as the app runs it:

| replies | show nothing | of which: offers before the answer | of which: no spoken answer at all |
|---|---|---|---|
| 3.5-lite HIGH with a cue rule, 366 | 9 | 8 | 1 |
| of those, the shipped wording (one-first), 54 | 1 | 1 | 0 |
| of those, the old v1 rule, 16 | 5 | 4 | 1 |
| 3.1-lite LOW with a cue rule, 247 | 1 | 1 | 0 |
| no cue rule (the same prompt with the rule removed), 12 | 0 | 0 | 0 |

- The nine replies have one shape: the cue block, then `__MORE__` and two offer lines, a blank line, then the spoken
  answer (53 to 153 words). The prompt says to list the offers after the answer; with a cue block in front,
  3.5-lite HIGH breaks that order in 8 of 366 replies, about one in 45.
- `stripSuggestionBlock` suppresses everything from `__MORE__` on, so the spoken answer is thrown away. The engine
  then shows the substitute line, and the cues, which ride the first token, never reach the screen.
- Code fences: 0 of 624. The line filter removed a whole answer in 0.
- Hours without cue mode: 0 of 308 answers have `words=0` (s50k, s50l, s50m, h40a, h40b, h40c, br1). The 05:00 cue
  smoke: 0 of 22 (3.1-lite LOW answered it).
- Re-asking the model with this answer's captured prompt, 12 times per arm (`repro-blockonly.mjs`): 0 of 12 empty
  with the cue rule, 0 of 12 without it. The offers came after the answer in 7 of 12 and were absent in 5.

What is not known: the raw text of the 13:12:08Z answer. A cue block followed only by a code fence would give the
same log trail; no saved reply has one.

### What follows

- The fix is in code, not in the prompt, so the cue rule (hash `8e15e4e7dd41`) and the bench's inputs do not change:
  when the offers come before any spoken text, the block is only its offer lines and what follows is the answer.
  A throwaway sketch of that rule changes exactly the 9 offers-first replies of the 624 (0 words to their answer),
  changes no reply that shows text today, and leaves the one reply with no spoken answer empty
  (`offers-first-spike.mjs`). It goes through its own spec, review and failing test first.
- It shares one build with the early close (the cue display's hold, below). The re-smoke, the bench and the probe run
  on that build. A true block-only reply stays a cue failure.

## Reported, never gating

- **Trims: 5 lines, all cap overruns, no cleanup** (`cleaned` is empty in every one, so no currency sign was lost).
  - 13:12:08Z (the probe clip): cut "Scaling from zero and min replicas".
  - S1Q02F: cut "4x baseline PR-AUC lift and strong ranking" and "Intervention cost, customer lifetime value, and
    net ROI".
  - S1Q08: 4 raw lines; dropped "Retrain with control groups or uplift weighting"; cut "Log predictions with snapshots
    and variant" and "Thirty-day delayed joins with treatment flags".
  - S1Q09F: cut "App Service for lightweight web apps".
  - S1Q10: cut "Azure RBAC and Key Vault for secrets".
  - A cut line can end mid-phrase: "Log predictions with snapshots and", "4x baseline PR-AUC lift and".
- **Shape of the 24 blocks:** one line 2, two lines 9, three lines 13, none over three; 59 cue lines, median 4 words,
  none over 5.
- **The hedge split:** 3.5-lite HIGH won all 24 (median 4479 ms, max 5649 ms). 3.1-lite's back leg never won.
- **Failed:** the block-only answer above. **Superseded:** one stream, on S1Q01F at 13:13:45Z. That item logged two
  blocks, the superseded stream's and its replacement's.
- **First token (diag log, this run):** n 22, median 5295 ms, p90 6411 ms, max 13084 ms. The report row:
  `Answer TTFT p90 · detect p50: 6.4 s · 0.5 s`. In this build the line fires when the first prose line ends.
- **The hold, measured** (`hold-read.mjs`, 47 calibration cases; the whole log, so the probe clip's two answers are
  in it):
  - cues line to budget line: 23 pairs, 16 under 15 ms; without the block-only pair 22, 16 under 15 ms, median 7 ms;
  - won-by line to first token: 22 pairs, median 218.5 ms, p90 551 ms (in hours with no cue block: 2 ms);
  - first token to word budget (the screen side): 22 pairs, 17 under 15 ms;
  - over the 21 answers with a block, a spoken answer and a stream of 50 ms or more: the cues and the end of the
    stream came together in 15, the first token and the end in 16. No answer's stream lasted under 15 ms.
  - So on 15 of 21 answers the candidate saw nothing for a median 0.2 s (up to 1.2 s) after the first text arrived,
    then the cues and the whole answer at once. The early close is the fix for this; this table is its "before".
- **S1Q08 was answered twice.** On time at 13:37:21Z (`dispatch: answer source=whisper`, 98 words), and again at
  13:38:37Z when the Live ear's text for the same question arrived 76 s late:
  `dispatch: mark source=live ... verdict=unverifiable`, `turn: gate=77675 finals=0 live=1 finished=true`,
  `dispatch: answer source=live`. The Live ear logged no mark between 13:17:48Z and 13:38:28Z (about 20 minutes).
  This is the dispatcher, not cue mode, and the same family as br1's S1Q08 event; it has its own debugging pass.
- **The ears:** Live reconnects 25, lost utterances 4 (2 resolved within 5 s). One `boundary repair: restored` line.
  No knowledge short-circuit and no `not-a-question` close.

## What this run did not show

- A cleanup of cue notation (no `cleaned` line), and 3.1-lite's cues (its leg never won).
- The overlay itself, and typed chat.
- Answer quality: no grading; the bench has not run.
- Whether the offers-first shape was what the model wrote at 13:12:08Z (see above).

## Calibrations and tools (session scratchpad, `cue-group/`; row files are not committed)

- `check-smoke-cues.mjs` v4: 26 cases (`calib-cue-smoke.out.txt`).
- `hold-read.mjs`: 47 cases (`cal-hold-read.out.txt`), among them three hours counted by hand by the final reviewer
  and this run's counts as the Opus spec reviewer made them without the script (21, 15, 16).
- `repro-blockonly.mjs` (shape and stage readers): 6 cases. `scan-rows-shown.mjs` uses the same readers.
- `smoke-facts.mjs` printed the block list, the trims and the report rows quoted here.
