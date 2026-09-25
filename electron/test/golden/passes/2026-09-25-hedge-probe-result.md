# Hedge probe result — 2026-09-25, three evening windows

The pre-registration is `PREREGISTER-hedge-probe.md` (commit af5e279, written before H1 ran; not
edited). This file records what the windows measured and applies the rule as registered.

## VERDICT: PROCEED to the env-flagged build

Pooled over H1–H3 (39 s50m captured prompts × 2 policies per window, alternating order, both
policies running their legs concurrently as the app would; a no-answer counts as the 45 s cap):

```
2026-09-25-hedge-H1.json
  today    n= 39  median 6.3 s   p90 9.3 s   none  0  extra  18  by 3.5-lite 18, 3.1-lite 21
  hedge    n= 39  median 4.2 s   p90 5.0 s   none  0  extra   3  by 3.5-lite 39
2026-09-25-hedge-H2.json
  today    n= 39  median 6.1 s   p90 20.3 s  none  0  extra  12  by 3.5-lite 12, 3.1-lite 27
  hedge    n= 39  median 10.2 s  p90 18.9 s  none  0  extra  32  by 3.5-lite 17, 3.1-lite 22
2026-09-25-hedge-H3.json
  today    n= 39  median 6.1 s   p90 10.0 s  none  0  extra   5  by 3.1-lite 34, 3.5-lite 5
  hedge    n= 39  median 4.1 s   p90 5.1 s   none  0  extra   4  by 3.5-lite 39
pooled (3 windows)
  today    n=117  median 6.1 s   p90 13.3 s  none  0  extra  35  by 3.5-lite 35, 3.1-lite 82
  hedge    n=117  median 4.4 s   p90 11.5 s  none  0  extra  39  by 3.5-lite 95, 3.1-lite 22
independence (failures over non-aborted requests):
  3.1-lite as today's first request 30/110 failed   vs as the hedge's second 6/28 failed
  3.5-lite as the hedge's first request 0/95 failed   vs as today's second 0/35 failed
RULE: hedge none <= today none (0 <= 0: true); hedge p90 <= today p90 (11.5 s <= 13.3 s: true); hedge median <= today median + 1 s (4.4 s <= 7.1 s: true)
VERDICT: PROCEED to the env-flagged build
```

(`hedge-live.decide.mjs` output, verbatim. Windows: H1 19:30–19:47, H2 21:30–21:53, H3
23:30–23:47 local. The per-window JSON files live under `interview60.runs/latency-probe/`, which is
gitignored; this file carries the numbers.)

## What the windows say

- **The hedge wins when 3.1-lite is failing** (H1, H3): 3.1-lite returned errors on 30 of its
  110 first requests tonight, and every one of those cost today's policy a second request and the
  wait for it. 3.5-lite, started first by the hedge, returned no error in 95 requests; it answered
  39 of 39 in H1 and H3 with the back leg started only 3 and 4 times.
- **The hedge loses on median when 3.5-lite stalls** (H2): the 5 s trigger fired on 32 of 39
  questions and 3.1-lite won 22 of them — but only after the 5 s wait plus its own latency, so the
  hedge's median was 10.2 s against today's 6.1 s. H2 alone fails the median condition; the rule
  pools three windows, as registered, and pooled it passes.
- **Tails:** waits over 10 s — today 13 of 117 (max 28.9 s), hedge 22 of 117 (max 29.1 s), all 22
  of the hedge's in H2; over 20 s — today 4, hedge 3. No policy left a question unanswered.
- **Answer mix:** under the hedge 95 of 117 answers come from 3.5-lite HIGH; today 35 of 117.
  Quality is not measured here. On s50l/s50m 3.5 HIGH led on mains; on h40a its misses repeat on
  the same questions (R02F, R03, R08, R16). The flight after the build decides whether the mix helps.
- **Extra requests** are about equal (35 vs 39 of 117), so the hedge does not cost quota on
  average; it moves the load from 3.1-lite to 3.5-lite.

## Instrument notes (recorded, not fixed — the instrument stays as registered)

- `decide.mjs` drops a first leg whose `startedAt` is 1 ms rather than 0 from the independence
  line (one such row in H1), so that line is off by one; the rule's three numbers are unaffected.
- An answered wait of 45 s or more would count as a cap; it happened 0 times.
- The pre-registration did not say what to do if H3 never ran; it did, so the question is moot.

## What this does not show

- Whether the hedge is better on QUALITY, and how the app behaves with two live streams and an
  abort — the env-flagged build and its own pre-registered flight measure that.
- Whether the 5 s trigger is the right value: H2 says a stalling 3.5 pays it on nearly every
  question; H1/H3 say a healthy 3.5 rarely needs the back leg. A lower trigger or a parallel start
  trades quota for latency — a separate, pre-registered probe if it is wanted.
- Anything about daytime load: all three windows were evening ones, as the pre-registration noted.

## Next step

Build the hedge behind an env flag on a branch, after h40b has flown (2026-09-26 17:00); a
pre-registered rule and one holdout hour decide whether it ships.
