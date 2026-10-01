# Result: the second cue re-smoke, on the combined build, by its pre-registered rule

Written 2026-10-01, 09:10 local.
- **The rule:** `PREREGISTER-cuesmoke.md`. Its PASS is unchanged since 15:26 on 30 Sep. The amendment for this run is
  8a13abb, committed before the task was armed.
- **The run:** `2026-10-01T02-37-41-cuesmoke` (its record is beside this file).
  - scheduled task `Natively-smoke-cues`;
  - build `d83fdfe` (`main.js` 00:03:29), the early close, the pins and the offers fix together;
  - scenario50 S1, hands-free, on the shipped defaults (hedge on: 3.5-lite HIGH first).
- **Timing:** the start gate opened at 05:00 (both lites answered). Playback ran 05:03 to 05:37 local.

## Verdict: PASS, all three conditions. Cue mode goes on to the bench and the probe.

| condition | result |
|---|---|
| 1. `CHECK EXIT 0` | met. `answers 22 (real 22, failed 0), superseded 0, cue lines 22 (expected 22), malformed 0, block-only 0, trimmed 7`, then `CUE SMOKE CLEAN`, `CHECK EXIT 0` |
| 2. The app is healthy | met. `Answered hands-free: 20/20 dispatched, 0 to nobody` (100% of S1); `Long questions answered whole: 8 of 8` |
| 3. The cue row | met. `20/20 present, 20 well-formed, 7 trimmed`; n = 20 ≥ floor(0.9 × 20) = 18 |

The check's 22 answers include the two answers to the readiness probe clip, before playback; the check reads the whole
log.

## The dist that flew (proven twice in the launcher log)

- **Before the run:** `THE COMBINED BUILD, every marker as expected`.
  - `CUE_LINE_PREFIX` ×3 and the offers line ×1;
  - `CUE_RULE` sha256/12 `8e15e4e7dd41`, limits 3 × 5;
  - filter sha256/16 `42d9bc42dbd17870`.
- **`auto`:** `[build-electron] Up to date, skipping build`. Nothing was rebuilt.
- **After the run:** the same proof, the same filter sha.

## The reading rules decided before the data

- **Block-only answers: 0.** The run's log has no `[Answer] budget: … words=0` line.
- **Hard failures: 0** (the report's `hard failures` line).
- **The offers-first line: 2 lines, on 2 answers, and the fix recovered both.**
  - S1Q04: `won by gemini-3.5-flash-lite` at 02:11:34.437Z, the cues line, the warn line at 02:11:34.446Z, then
    `budget: words=101`.
  - S1Q04F: won at 02:14:11.210Z, the warn line at 02:14:11.248Z, then `budget: words=72`.
  - On the v2 build, both replies would have been block-only answers: the 16:12 failure's shape. This is the first
    live evidence of the offers fix.
- **`first token`** fires on the first prose chunk after the block. Over 22 answers (smoke-facts, the diag log): median
  4722.5 ms, p90 5744 ms, max 5999 ms.

## The early close's timing expectation (reported, never part of PASS)

`hold-read.mjs`, the same script as the 16:12 printout, over the same populations. Output: `SP\cue-group\hold-read.resmoke2.out.txt`.

| | counted | R2 < 15 ms | B < 15 ms | verdict | C (cues → first token), median by winner |
|---|---|---|---|---|---|
| this run | 21 | 0 | 0 | **GONE** | 50 ms |
| 16:12, the v2 build | 21 | 15 | 16 | NOT GONE | 218.5 ms |

The cues and the first words now appear together, and the rest streams. One answer was left out of the count: a stream
under 50 ms.

## Reported, never gating

- **Trims.** 7 lines: 6 cut to 5 words and 1 dropped (a fourth raw line). Quoted from the run folder's `natively_debug.log`:
  - 02:08:40.756Z `{"rawLines":2,"dropped":[],"cut":["Controlling for cohort mix and seasonality"],"cleaned":[]}`
  - 02:18:44.509Z `{"rawLines":2,"dropped":[],"cut":["Required when customer features cause leakage"],"cleaned":[]}`
  - 02:20:12.038Z `{"rawLines":3,"dropped":[],"cut":["Thirty day window and ingestion filter"],"cleaned":[]}`
  - 02:22:48.318Z `{"rawLines":2,"dropped":[],"cut":["Composite index on snapshot date and user ID","Append-only event sourcing for historical corrections"],"cleaned":[]}`
  - 02:28:08.956Z `{"rawLines":4,"dropped":["Inverse propensity weighting for retraining"],"cut":[],"cleaned":[]}`
  - 02:33:45.300Z `{"rawLines":3,"dropped":[],"cut":["Azure ML Managed Endpoints for inference","Azure App Service for lightweight APIs"],"cleaned":[]}`
  - 02:36:47.396Z `{"rawLines":3,"dropped":[],"cut":["Check token and Entra ID logs","Verify Azure RBAC and database grants","Inspect VNet rules and Private Link"],"cleaned":[]}`

  Several cut lines now end on a connective or mid-phrase ("… cohort mix and", "… Endpoints for"). Whether a cut
  should also drop a trailing "and", "for" or comma is the user's open question. It is not part of this rule.
- **Shapes.** One line 1, two lines 7, three lines 14, more than three 0. Words per cue line: max 5.
- **The hedge.** `won by gemini-3.5-flash-lite` 22 of 22 (median 3912 ms, max 5379 ms).
- **Knowledge short-circuits:** 0 (intro 0, negotiation card 0).
- **The report's generic gate reads FAIL on two rows.** Neither is part of this rule.
  - *Lost utterances 1.* An empty Deepgram final at 02:07:10.578Z came after the worded partial "What can you". Those
    words were finalized 7.2 s later ("What can you conclude from a PRAUC of 0.38 and an ROC AUC of 0.88? …",
    S1Q02F), past the metric's 5 s window. S1Q02F was answered on time, its cues at 02:07:24Z. This is a metric
    artifact, the same shape as the 30 Sep 05:00 smoke's (`SP\cue-group\lost-utterance.mjs`).
  - *Interview-acceptable answers:* not run. A smoke is not graded.
- **`turn: close reason=not-a-question`: 2. Neither cost an answer.**
  - 02:26:47.752Z, after "A nightly job fails halfway through." This is S1Q07F's scenario sentence, a statement
    correctly declined. Its question was answered at 02:26:57Z.
  - 02:30:41.589Z, after the fragment "How could repeatedly". S1Q08F was answered at 02:30:48Z.
  - The first is a real non-holdout statement turn, useful evidence for the dispatcher fix's spec.
- **Other:** boundary repair `restored` 1; Live reconnects 12 (the record).

## What this run did not show

- **The overlay itself and typed chat.** The merge review (I1) makes the user's one live look a gate of the merge.
- A true block-only reply: a reply with no spoken answer at all.
- The rare failure states the tests pin: a stream that dies after its first words, inside the filters' holds, or
  inside a leading offers block.

## Next, by the rules

- **The bench** (`PREREGISTER-cuebench.md`: 117 calls on 3.5-lite HIGH) started at 09:04. That is on the 2026-09-30
  quota day, which ends at 10:00. The ledger counted 202 requests used on 3.5-lite and 298 headroom (br1 43, the v2
  re-smoke 26, this run 23, spike 6 108, gate probes 2).
- **Then the simple-question probe.**
- **The merge needs:** the bench's PASS, the user's live look, and the merge review's steps.
