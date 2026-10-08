
## Result — 2026-09-23 (recorded after W3)

**VERDICT: FAIL. 3.1-lite LOW stays, and the model question is closed.** This follows
"Fail any one" above. No further probe or flight is spent on the question unless a model
version or Google's service tier changes.

All three windows ran as registered, as scheduled tasks, with the app closed: the app's
`natively_debug.log` was not written between 2026-09-22 22:11 and the end of W3. No window
was void.

| window | ran (local) |
|---|---|
| W1 | 10:15:10–10:23:01 |
| W2 | 15:00:06–15:10:48 |
| W3 | 21:00:04–21:15:59 |

The decision, verbatim. It was run from the main checkout as
`node electron/test/golden/paired-latency.decide.mjs <W1> <W2> <W3>` and exited 1:

```
2026-09-23-W1.json: 39 pairs
2026-09-23-W2.json: 39 pairs
2026-09-23-W3.json: 39 pairs

117 pairs pooled. Candidate 3.5-lite HIGH vs incumbent 3.1-lite LOW:
  PASS  typical wait (median, ms)    candidate 6417  incumbent 5863  margin 750
  FAIL  slow tail (p90 wait, ms)     candidate 45000  incumbent 19180  margin 1000
  FAIL  fallback forced (prompts)    candidate 41  incumbent 32  margin 6

VERDICT: FAIL — the incumbent stays
```

### Declared diagnostics (not part of the rule)

**Raw first token per model.** This counts only prompts that produced a token, with the
nearest-rank percentile the decision script uses. "Forced" means an error, no token, or a
first token past 10 s.

| window | model | median | p90 | max | forced | errors | thoughts > 0 | order: first / second |
|---|---|---|---|---|---|---|---|---|
| W1 | 3.1-lite LOW | 5579 ms | 7427 ms | 8302 ms | 0 | none | 39/39 | 5863 / 5334 ms |
| W1 | 3.5-lite HIGH | 3945 ms | 6240 ms | 42390 ms | 3 | none | 39/39 | 4143 / 3640 ms |
| W2 | 3.1-lite LOW | 4945 ms | 7106 ms | 15637 ms | 10 | 503 ×7 | 32/39 | 4458 / 5464 ms |
| W2 | 3.5-lite HIGH | 7380 ms | 26460 ms | 34703 ms | 15 | 503 ×4, cap ×1 | 34/39 | 8634 / 6184 ms |
| W3 | 3.1-lite LOW | 5594 ms | 14209 ms | 15663 ms | 22 | 503 ×20 | 19/39 | 7340 / 5594 ms |
| W3 | 3.5-lite HIGH | 12099 ms | 38531 ms | 43960 ms | 23 | cap ×4 | 35/39 | 12414 / 12099 ms |

- Every answered row reported thoughts > 0. The shortfalls are exactly the errored requests,
  which return no usage.
- No 429 appeared, so quota was not a factor.

**Waits under the rule, per window.** These use the rule's own `effectiveWait`. The table
also counts prompts that end with no answer at all: the model in front failed or stalled AND
its backup failed, which is charged the 45 s cap.

| window | median wait 3.5 / 3.1 | p90 wait 3.5 / 3.1 | forced 3.5 / 3.1 | both forced | no answer, 3.5 in front / 3.1 in front |
|---|---|---|---|---|---|
| W1 | 3945 / 5579 ms | 6240 / 7427 ms | 3 / 0 | 0 | 0 / 0 |
| W2 | 7703 / 5382 ms | 25637 / 17732 ms | 15 / 10 | 3 | 3 / 0 |
| W3 | 14379 / 9038 ms | 45000 / 45000 ms | 23 / 22 | 11 | 13 / 4 |
| pooled | 6417 / 5863 ms | 45000 / 19180 ms | 41 / 32 | 14 | 16 / 4 |

**Reading, in plain terms.**
- **Morning (W1), Google calm:** 3.5-lite was the faster model, as on 2026-09-22.
- **Afternoon and evening, Google overloaded:** the two models failed differently.
  - 3.1-lite was refused outright with 503s: 7 in W2 and 20 in W3. A refusal is fast, and the backup, 3.5-lite, then answered.
  - 3.5-lite was never refused in W3, but it answered slowly or not within the 45 s cap. Its backup, 3.1-lite, was often being refused at that same moment.
- **The result:** with 3.5-lite in front, 16 of the 117 prompts would have ended with no answer; with 3.1-lite in front, 4 would have. That asymmetry, not the typical wait, is what failed conditions 2 and 3.

**Erratum.** It was found before W1 and is recorded here so the rule text above stays as
registered.
- The windows' description gives the reason for "app closed" as "its warm-ups send each model a request a minute". That rate predates commit 20a369a (2026-09-03).
- On 2026-09-22, an idle app in a meeting was measured at about 6 pings per hour per model, and about 11 while pings fail. Outside a meeting it pings once, at startup.
- The requirement itself is unchanged, and it held in all three windows.
