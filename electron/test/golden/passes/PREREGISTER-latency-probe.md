# Pre-registration — spoken-answer model latency, 2026-09-23

> **Approved by the owner on 2026-09-23 at 02:20 local** ("approved, run it today, spoken
> answers only"), and committed before the first counted window runs. From this commit on,
> an uncomfortable outcome stands and this file does not move.

This test decides one thing: whether `gemini-3.5-flash-lite` at HIGH makes the user wait
longer for an answer than `gemini-3.1-flash-lite` at LOW. Answer quality is not re-tested.

## Why this exists

s50m's rule needed four conditions to swap the spoken-answer model. Three passed on mains:
3.5 ahead by +2.00, per-question up:down 5:1, worst rep 15 against 13. The fourth, "zero
answers past the 10 s stall budget", failed on four stall fallbacks in the live hour and
one in an arm.

That fourth condition could not tell the model apart from the safety net. With a 10 s
budget, every fallback that fires puts that answer past 10 s by construction, so the
condition failed whenever the fallback did its job. It showed that stalls happened that
hour. It did not show that 3.5-lite stalls more than 3.1-lite would have.

The measurement that could tell them apart is a same-window probe, alternating the two
models request by request. s50m's own amendment named it, noting it had never been run. It
ran on 2026-09-22 at 21:34 UTC and found the opposite of the inference drawn from s50m:

| model | p50 first token | p90 | past 10 s | errors |
|---|---|---|---|---|
| 3.1-lite LOW | 6484 ms | 8047 ms | 1 | 1 (HTTP 503) |
| 3.5-lite HIGH | 3944 ms | 4549 ms | 0 | 0 |

3.5-lite was faster on 34 of 38 pairs, by a median of 2.4 s. **That run generated this
hypothesis, so it does not count toward the verdict.** It was used only to calibrate the
margins below, and only through a null that removes any real difference between the models.

**This re-opens a question the s50m rule called closed "permanently".** It does so for one
reason: condition 4's failure carried no information about the model. Everything else s50m
decided stands. If this test fails, the question closes and stays closed.

## Settled, and not re-tested here

- **Quality.** s50m conditions 1 to 3 above, on mains.
- **Length**, as context only. With 3.5-lite live, s50m put 0 of 40 answers past 150 words,
  and the length row passed for the first time.

Nothing in this test can rescue or overturn either one.

## The question

With each model answering as the primary and the other behind it, does 3.5-lite at HIGH
make the user wait longer for the first word than 3.1-lite at LOW? Stalls and errors count
at what they really cost the user.

## Method — fixed now

- **Instrument:** `electron/test/golden/paired-latency.probe.mjs`, committed with this file.
  It measures exactly as the 2026-09-22 run did. Only the output path and the window tag are
  new.
- **Prompts:** s50m's 39 captured prompts, the bytes the app actually sent.
- **Pairing:** both models run back to back on each prompt, strictly sequentially, with the
  order alternating by prompt. Each model is measured on its own first token, with no
  fallback. The cap is 45 s. Each model runs at the level it would ship at: 3.1 LOW, 3.5 HIGH.
- **Windows:** three windows on **2026-09-23**, a flight-free day, at local times
  **W1 10:15** (flight time, 15 minutes after the daily quota resets), **W2 15:00** and
  **W3 21:00**. Each runs as a scheduled task, like the flights, with the app closed, because
  its warm-ups send each model a request a minute. The cost is about 117 requests per model,
  against a daily quota of 500.
- **Only these three windows count.** A window that starts is never re-run and never
  dropped.
  - A window that cannot start (machine asleep, network down) runs at the same local time
    the next day.
  - A window that starts but does not finish all 39 prompts (machine asleep, process killed)
    runs again at the same time the next day. The probe writes its file only once every
    prompt has been measured, so an unfinished window leaves no data to count.
  - A window where **both** models fail on more than half the prompts measured an outage,
    not a model. It is void and runs again the next day at the same time. The decision
    script applies this rule, not a person.

### What the user waits, per prompt

This is computed from the app's own mechanics, as they stand after 783991a:

- A first token inside the 10 s budget: the wait is that first token.
- A stall past 10 s, or no token at all: 10 s, then the other model's first token.
- An error before any token: the time it took to fail, then the other model's first token.
- If the other model also fails, there is no answer. That prompt is charged the 45 s cap.

## THE RULE — all three required

These are pooled over the three windows, 117 paired prompts, and computed by
`electron/test/golden/paired-latency.decide.mjs`, committed with this file.

1. **Typical wait.** 3.5-lite's median wait is **no more than 750 ms** longer than
   3.1-lite's.
2. **Slow tail.** 3.5-lite's 90th-percentile wait is **no more than 1000 ms** longer than
   3.1-lite's.
3. **Forced fallbacks.** 3.5-lite forces the fallback (an error, or no first token inside
   10 s) on **at most 6 more** of the 117 prompts than 3.1-lite does.

**Pass all three:** the action below.
**Fail any one:** 3.1-lite LOW stays, and the model question is closed. No further probe or
flight is spent on it unless a model version or Google's service tier changes.

## What this rule can and cannot catch

This was calibrated before any window ran, with `electron/test/golden/paired-latency.calibrate.mjs`
(committed with this file; seed 20260923, 20 000 bootstraps). It reads the 2026-09-22 run from
the gitignored `interview60.runs/latency-probe/2026-09-22-hypothesis.json`. The margins are the smallest round values that fail an equally fast
model at most 2.5 % of the time each.

| if the truth is… | the rule |
|---|---|
| the two models equally fast | passes 97.6 % of the time |
| 3.5 as slow as 3.1 measured on 2026-09-22 (the reversed data) | fails 100 % |
| 3.5 stalls on 15 % of prompts, 3.1 on 2.5 %, otherwise as measured | fails 94.5 % |
| 3.5 stalls on 10 % (s50m's live hour), 3.1 on 2.5 % | fails 51.7 % |
| 3.5 stalls on 6.25 % (its flight record), 3.1 on 2.5 % | fails 6.9 % |
| both stall on 4 %, otherwise as measured | passes 99.7 % |

In plain terms, this rule asks whether 3.5-lite makes users wait longer. It does not ask
whether 3.5-lite ever stalls more. Take a 3.5-lite that stalls on 6 % of prompts but answers
2.4 s sooner on the rest. It is still the faster model for users at the median and at the
90th percentile, and the rule passes it on purpose. At s50m's 10 % stall rate the rule is a
coin flip. That is the honest limit of 117 pairs, stated here rather than discovered
afterwards.

## On PASS (scope confirmed by the owner on 2026-09-23)

Make `gemini-3.5-flash-lite` at HIGH the default for the **spoken answer only**, meaning
the behavioral and technical routes, which is exactly what s50l and s50m measured.
`gemini-3.1-flash-lite` at LOW sits behind it. Typed chat, coding, vision and the warm-ups
keep the user's selected model.

This must NOT be done by changing `GEMINI_FLASH_MODEL`. The technical route, which carries
40 of an hour's 41 answers, answers on the user's stored selection, so that change would
miss it while moving paths nobody measured. The swap is made test-first and ships with
783991a and 47def85, the error-fallback and label fixes. The holdout baseline is then flown
on it.

## Declared in advance, and NOT part of the rule

- Per-window medians and p90s, reported whatever the verdict.
- Order effect: first against second in pair, as on 2026-09-22.
- Thinking actually spent: 3.5 at HIGH and 3.1 at LOW should both report thoughts > 0. A
  window where either shows zero is reported. It is not voided.
- Errors by type (503, 429, cap).

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
