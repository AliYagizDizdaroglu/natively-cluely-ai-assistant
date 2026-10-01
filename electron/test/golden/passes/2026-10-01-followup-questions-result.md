# Result: the earlier-question context replay on s50m, by its pre-registered rule

Decided 2026-10-01, 14:44 local. This note is copied into MAIN's `passes/` after the cue merge (MAIN was frozen
until the fast-forward), with its evidence folder `passes/2026-10-01-followup-questions/`.
- **The rule:** `PREREGISTER-followup-questions.md` (MAIN 94adb6f; mtime 2026-09-28 21:36:02; the scratchpad copy
  byte-identical). Its design: `2026-09-28-followup-question-context-design.md`.
- **What ran:** 16 items (7 roster follow-ups and mains, 6 callbacks, 3 dropped-parent cases) × 3 reps × 2 arms = 96
  calls on `gemini-3.5-flash-lite`, thinkingLevel HIGH (§4's h40c PASS row). Arm A = s50m's captured prompt bytes;
  arm B = A plus the gated `EARLIER QUESTIONS` block (parity fixture, 48 entries). Interleaved per §4: A first in
  24 pairs, B first in 24.
- **The dist:** MAIN at 73d7f01, pre-cue; filter `verbalStreamFilter.js` sha256/12 `d8fee6ca0170`, as the dry run
  recorded. A byte copy of that dist is kept for the pooled re-run (`SP\dist-snapshots\main-precue-73d7f01`).
- **When:** 14:12–14:28 local, on the 2026-10-01 quota day (10:00 Thu to 10:00 Fri): 0 lite calls before it, no
  flight, no cue bench (the bench ran 09:04–09:16 on the 09-30 quota day).

## Preconditions (§6), as `run.log` records them

1. Model row written before any call.
2. `followup-replay-build.mjs --calibrate` on s50m: `CALIBRATION OK 39/39`; with `REPLAY_BREAK=1`:
   `CALIBRATION MISMATCH 39/39` (the check can fail).
3. `stamp.mjs`: `ARMS OK`, `PARITY FIXTURE OK: 48 entries`, the corrupted-input check OK, the four sha256 values
   each present in the pre-registration.
4. `followup-questions-decide-calibrate.mjs`: `CALIBRATION OK: every §7 branch and edge reads as pre-registered`.
5. Quota ledger for `2026-10-01T07:00:00.000Z`: 0 of 500 used on 3.5-lite.
6. `--dry-run`: 96 calls, the order and byte counts recorded.

## Grading

- Four blind files (24, 24, 23 and 24 answers), the six answers of each item shuffled under anonymous keys; the key
  files moved out of the graders' folder before the first dispatch and back after the eighth verdict.
- Instrument stamp `8564ba96369a` (pre-registered `8564ba96369a`).
- Eight graders, two per file, every one `claude-opus-5-5` by its own transcript (`blind/graders.json`,
  `grader-models.out.txt`).
- One incomplete pair: C5 rep 1, arm B, HTTP 503 after the runner's four retries. Per §4 it leaves the decision,
  named. It was not resumed: a later resume would not be interleaved with its A call. n = 47 pairs.

## Verdict: INCONCLUSIVE

`RESULT.txt` (the `decide()` output), verbatim:

```
incomplete pairs (excluded): C5#1 (B missing)
answers empty after the filters (scored 0/0/0): none
n = 47 complete (item, rep) pairs; roster pairs R = 21
1. no new wrong answers        consensus-wrong B 0 <= A 0: holds
2. no rise in off-topic        consensus-off-topic B 3 <= A 9: holds
3a. not later (median)         median paired TTFT B-A 97 ms (holds <= +500, FAIL > +1000): holds
3b. not later (p90)            p90 B 10663 ms vs p90 A 10966 ms + 2000: holds
3c. stalls                     TTFT > 10 s: B 7 <= A 6 + 3: holds
4. not longer                  median paired words B-A 3 (holds <= +5, FAIL > +10): holds
5. gain, roster pairs          consensus-acceptable B 13 - A 10 = +3 (PASS >= +4, FAIL <= +1): INCONCLUSIVE
DECISION: INCONCLUSIVE
```

Clauses 1 to 4 hold. Clause 5 reads +3 of 21 roster pairs, between the FAIL bar (≤ +1) and the PASS bar (≥ +4).

## Per item (Y = both graders acceptable, X = both correctness 0, o = both on_topic ≤ 1, w = otherwise, - = missing)

### Roster (the 21 pairs clause 5 reads)

| item | cue | A, reps 1–3 | B, reps 1–3 |
|---|---|---|---|
| S1Q04F | constraint | www | **YYY** |
| S1Q06F | pronoun | www | **YYY** |
| S1Q08 | reference (main) | Ywo | YYw |
| S2Q05F | pronoun | Yoo | ooo |
| S2Q08 | reference (main) | YYY | YwY |
| S2Q08F | pronoun | YoY | YYw |
| S2Q09F | reference | YYY | wwY |

### Callbacks (descriptive; their wrong answers count in clause 1)

| item | A | B |
|---|---|---|
| C1 | ooo | **YYY** |
| C2 | www | **YYY** |
| C3 | YYY | YYY |
| C4 | www | wYY |
| C5 | -YY | -wY |
| C6 | YYY | YYY |

### Dropped-parent cases (descriptive; wrong and off-topic count in clauses 1 and 2)

| item | A | B |
|---|---|---|
| D1 | www | www |
| D2 | wYw | YwY |
| D3 | owo | wwY |

## Reported, never deciding

- Either-grader counts: wrong A 0, B 0; off-topic A 9, B 4. Mean-of-graders acceptable over all 47 pairs: A 19.0,
  B 35.5.
- The two roster follow-ups that lose their parent in the app (S1Q04F, S1Q06F) moved from weak in every rep to
  acceptable in every rep. The callbacks C1, C2 and C4 moved the same way. One roster item got worse (S2Q05F,
  off-topic under B in all three reps) and one lost two reps (S2Q09F).
- TTFT: arm A p50 3997 ms, p90 11159 ms; arm B p50 4080 ms, p90 10663 ms. Words p50: A 66, B 69.

## What this replay does not show (§11)

In-app latency (the gate's own time), the Live-ear paraphrase pinned as the current question, gate misses, the
holdout follow-ups, and cue mode (these are pre-cue prompts).

## Next, by §7 and §10

- **The one pooled re-run on s50l** (`interview60.runs/2026-09-21T08-22-34-s50l`), after the quota resets, on a day
  with no flight and no cue bench: Saturday 3 Oct after 10:00 at the earliest (Friday 2 Oct is h40d's quota day).
- Before its calls: the gate list recomputed on s50l's captured prompts and recorded (same reference files, same
  hashes; the six callbacks at the same slot ids); §6.2's calibration against the pre-cue dist snapshot (the merged
  MAIN dist carries the cue rule and no longer reproduces pre-cue prompts).
- The pooled result over both runs, by the same rule: PASS at Δ ≥ +8, FAIL at Δ ≤ +2 of 42 roster pairs; a second
  INCONCLUSIVE is a FAIL.
- Nothing is built before it.
