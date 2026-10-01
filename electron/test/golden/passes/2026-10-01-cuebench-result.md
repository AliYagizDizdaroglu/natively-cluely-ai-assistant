# Result: the cue bench, by its pre-registered rule

Written 2026-10-01, 09:36 local.
- **The rule:** `PREREGISTER-cuebench.md`, with its two amendments of 30 Sep (09:35 and 11:19), all written before
  any bench call.
- **What ran:** the cue arm (`interview60.answers.mjs --cues`) on `gemini-3.5-flash-lite`, thinking HIGH, over
  s50m's 39 captured prompts, 3 reps.
  - The dist was the combined build (`d83fdfe`): `CUE_MAX_LINES` 3, `CUE_MAX_WORDS` 5, `CUE_RULE` sha256/12
    `8e15e4e7dd41`.
  - The control is s50m's own `captured-high`, `-r2` and `-r3`: the same prompt bytes, without cues, written
    2026-09-22 12:39–12:47 in the s50m run folder.
- **When:** 09:04–09:16 local, so on the 2026-09-30 quota day, which ends at 10:00.
  - The ledger showed 202 requests used on 3.5-lite before the first call, so 298 of headroom (br1 43, the v2
    re-smoke 26, the 05:00 re-smoke 23, spike 6 108, gate probes 2).
  - The bench made 117 calls, with 0 transient errors.

## Verdict: PASS. It licenses the merge steps, not the merge itself.

`cuebench-score.mjs` printed this, verbatim:

```
rep 1: n=39  acceptable control 29.5 / cue 27.5  consensus-wrong control 0 / cue 1  blocks present 38/39  shaped 38/39 (over 3 lines: 0)  words over 5, reported: blocks 7/39, lines 10/102  ttft p90 control 4712 / cue 5217 ms
rep 2: n=39  acceptable control 27.5 / cue 24.5  consensus-wrong control 1 / cue 1  blocks present 39/39  shaped 38/39 (over 3 lines: 1)  words over 5, reported: blocks 8/39, lines 11/108  ttft p90 control 4524 / cue 4571 ms
rep 3: n=39  acceptable control 31.5 / cue 28.5  consensus-wrong control 0 / cue 0  blocks present 39/39  shaped 39/39 (over 3 lines: 0)  words over 5, reported: blocks 7/39, lines 12/105  ttft p90 control 4475 / cue 5133 ms
band: control [27.5, 31.5]  cue [24.5, 28.5]
DECISION: PASS
```

| row | rule | result |
|---|---|---|
| prose band | the cue max must be at least the control min | 28.5 ≥ 27.5: holds |
| wrong | no cue rep above the worst control rep (1) | cue 1, 1, 0: holds |
| cue checks | blocks present AND shaped on at least 90% of ids, every rep | 38/39, 38/39, 39/39 (97–100%): holds |
| time to first token | reported, not gating | p90 cue above control by 505, 47 and 658 ms |

- **What the bench's TTFT measures.** It is the first raw piece of text from the model, so for the cue arm it is
  the start of the cue block.
- **Words over 5** are reported, not gated: 7 to 8 blocks per rep, 10 to 12 lines. The app cuts each to its first 5
  words.

## Grading

- **Pairs.** Six blind pairs files, `pairs.r<rep>.h<half>.json`, with 40, 37, 40, 37, 40 and 38 answers. The
  control answer and the cue answer sit side by side by a seeded coin. The cue block is stripped, so graders saw
  prose only.
- **Instrument.** The frozen grader prompt, stamp `8564ba96369a`.
- **The key** was moved out of the graders' folder before the first dispatch and back after the twelfth verdict
  (`move-keys.mjs`, byte-verified).
- **Twelve graders, two per file, every one `claude-opus-5-5`** by its own transcript (`h40c-grader-models.mjs`:
  12 to 16 assistant messages each, no other model). All twelve verdict files are complete.
- **Scorer calibration.** `cuebench-calibrate.mjs` was re-run before scoring. Its output is byte-identical to the
  known output saved before the bench (`cuebench-calibrate.combined.out.txt`).

## Reported, never gating: the cue arm scored lower in every rep

- **By rep:** cue minus control is −2, −3 and −3 acceptable of 39. Net −8.0 over 117 pairs, about −2.7 per rep.
- **By question** (`per-id.mjs`, the same tally): 15 ids lower, 6 higher, 18 equal. A two-sided sign test on 15
  against 6 gives p ≈ 0.08.
- **The losses are spread, not one question.**
  - Largest losses: S2Q10F −2.0, S1Q09 −1.5, S2Q08F −1.5, then eight ids at −1.0.
  - Largest gains: S1Q10F +2.0, S2Q01F +1.5.
- **Consensus-wrong:**
  - S1Q02, cue rep 2: graded wrong by both graders.
  - S2Q06F, cue rep 1: empty. The model returned no text at all, finish `MALFORMED_RESPONSE`.
  - S2Q06, control rep 2: empty. All 649 raw characters were inside a code fence, which the verbal filter removes.
  - Empty answers count as wrong for both graders, as pre-registered.
- **What this means.** The rule passes, and it is the decision. But the same blind pairs show cue answers rated
  acceptable a little less often, by about 7%, in all three reps. Friday's validation hour measures the in-app
  effect on holdout40 against its own bands. If the cost is real, it shows there.

## What this bench does not show

- **The app's live path.** It does not show the hedge, the early close, the overlay, or the moment cues appear.
  The re-smoke covers those, and the user's live look (merge review I1) covers the overlay.
- **Whether a malformed or empty reply would reach the screen in the app.** The hedge's second leg may cover it;
  that is unproven here.
- **Simple questions.** The roster is mostly long questions; the simple-question probe reports those
  (`2026-10-01-cueprobe-result.md`).
- **holdout40.** It is never read here.

## Next

The merge needs the user's live look (I1) and the follow-up replay's calls to finish on MAIN's pre-cue dist
(`d8fee6ca0170`). Then the steps in the merge review: refresh the prep merge, freeze MAIN, fast-forward, rebuild
and dist-proof, gates, INDEX rows, memory.
