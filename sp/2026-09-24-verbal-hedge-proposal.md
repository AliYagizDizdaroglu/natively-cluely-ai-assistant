# Verbal answer hedge: 3.5-lite first, 3.1-lite raced in on a slow start

**Status:** proposal, 2026-09-24. Nothing is built. The only evidence is an offline simulation over the 2026-09-23 latency-probe windows. No work starts until h40a (flown 2026-09-24 10:10) is graded, and nothing lands in MAIN's tree before or during a flight.

**Question** (the user, 2026-09-24): "3.5 lite main and when it stalls fallback to 3.1 lite or maybe a second call on 3.5 lite? cuz making 3.1 lite default kinda sacrifices the quality and speed of 3.5 lite"

**Short answer:** swapping the order alone makes things worse, and a second 3.5 call is undermined by how 3.5 fails. A hedge fixes the swap: 3.5 starts first; if it has not spoken by about 5 s, 3.1 starts alongside it; 3.5 keeps running; whichever speaks first answers. In simulation this beats today on the slow tail, on no-answers and on how many answers come from the better model. The one assumption it rests on has never been tested: the two models behave the same when both are running at once.

## Where things stand

- **Shipped:**
  - gemini-3.1-flash-lite at LOW answers.
  - gemini-3.5-flash-lite at HIGH takes over on a pre-token error, or on a first-token stall. The stall budget is 10 s under a thinking level: `firstTokenTimeoutMs`, `electron/llm/geminiThinking.ts`.
- **Quality favours 3.5:**
  - Blind grading on 2026-09-24 (Opus 5.5 graders, the s50m 39 items): 3.5-lite HIGH had 29/39 acceptable, 3.1-lite LOW 22/39.
  - The s50l/s50m thinking flights pointed the same way.
- **The plain swap failed its pre-registered latency rule** on 2026-09-23 (`passes/PREREGISTER-latency-probe.md`, `paired-latency.decide.mjs`). That rule compared "3.5 in front" against today over 117 paired prompts:

  | measure | 3.5 in front | today |
  |---|---|---|
  | p90 wait | 45000 ms | 19180 ms |
  | forced fallback | 41 | 32 |
  | no answer | 16 | 4 |

  The model question was then closed: 3.1-lite LOW stays. This proposal reopens it through the fallback mechanism, not through the model order.

## Hypotheses

| id | claim | status |
|---|---|---|
| H1 | Under load, 3.5 is mostly slow, not dead. The plain swap loses because the 10 s race abandons a live 3.5 and starts 3.1, and 3.1 is failing at those same times. | Supported by the probe data (census below). |
| H2 | Keeping 3.5 running and racing 3.1 in from ~5 s gets 3.5's answer on ~3/4 of questions, with fewer no-answers and a shorter slow tail than today. | Supported by the simulation only. |
| H3 | A model's first-token outcome is about the same whether it runs alone or while the other model's request is in flight. | **Untested, and the hedge rests on it.** The probe ran the two models back to back, seconds apart, never together. |
| H4 | A second 3.5 call rescues a stalled first one. | Evidence against: 3.5's failures cluster in time. |

## Evidence

### Data

`electron/test/golden/interview60.runs/latency-probe/2026-09-23-W1.json`, `-W2.json` and `-W3.json` hold 39 s50m prompts per window. Both models were measured on each prompt, back to back, alternating which went first. The runs folder is gitignored, so these files are local only.

Each row records one call:
- `ttft`: the first text token after the request started;
- `total`;
- `error`: `HTTP 503`, or `aborted at cap` after the probe's 45 s hard cap.

### What each window contained

| window | model | ok ≤ 10 s | slow > 10 s | HTTP 503 | stalled to cap | first token p50 / p90 |
|---|---|---|---|---|---|---|
| W1 07:15–07:23 UTC (healthy) | 3.5 HIGH | 36 | 3 | 0 | 0 | 3.9 / 6.2 s |
| | 3.1 LOW | 39 | 0 | 0 | 0 | 5.6 / 7.4 s |
| W2 12:00–12:10 UTC | 3.5 HIGH | 24 | 10 | 4 | 1 | 7.4 / 26.5 s |
| | 3.1 LOW | 29 | 3 | 7 | 0 | 4.9 / 7.1 s |
| W3 18:00–18:15 UTC | 3.5 HIGH | 16 | 19 | 0 | 4 | 12.1 / 38.5 s |
| | 3.1 LOW | 17 | 2 | 20 | 0 | 5.6 / 14.2 s |

The first-token columns cover only the calls that produced a token.

- **Healthy:** 3.5 HIGH is the faster model.
- **Under load, the models fail differently:**
  - 3.5 mostly slows down: 19 slow calls in W3, and only 4 stalls to the cap.
  - 3.1 mostly fails fast: 20 503s in W3.

### Policies simulated

Every row uses the app's own mechanics. 117 prompts; the wait is to the first word; "cap" means at least that share of prompts got no answer (45 s charged).

| policy | median | p90 | waits > 10 s | no answer | answered by 3.5 | extra calls | est. acceptable / 100 |
|---|---|---|---|---|---|---|---|
| A. today: 3.1 first, 3.5 at 10 s | 5.9 s | 18.6 s | 26 | 4 | 24% | 27% | ~59 |
| B. swap: 3.5 first, 3.1 at 10 s | 6.4 s | cap | 38 | 13 | 65% | 35% | ~62 |
| C. swap, budget 4 s (3.5 dropped) | 9.3 s | cap | 48 | 26 | 23% | 77% | ~48 |
| C. swap, budget 5 s (3.5 dropped) | 8.6 s | cap | 44 | 23 | 42% | 58% | ~53 |
| C. swap, budget 6 s (3.5 dropped) | 8.3 s | cap | 48 | 21 | 47% | 53% | ~55 |
| D. hedge: 3.5 first, +3.1 at 3 s, 3.5 kept | 5.5 s | 12.5 s | 20 | 2 | 72% | 99% | ~68 |
| D. hedge at 4 s | 6.2 s | 12.9 s | 20 | 2 | 73% | 77% | ~68 |
| **D. hedge at 5 s** | **6.4 s** | **12.9 s** | **25** | **2** | **74%** | **58%** | **~69** |
| D. hedge at 6 s | 6.4 s | 13.3 s | 30 | 2 | 75% | 53% | ~69 |
| D. hedge at 8 s | 6.4 s | 15.0 s | 38 | 2 | 78% | 48% | ~69 |
| 3.5 alone, no fallback | 6.6 s | 42.4 s | 41 | 9 | 92% | 0% | ~69 |
| 3.1 alone, no fallback | 5.9 s | cap | 32 | 27 | 0% | 0% | ~43 |
| E. 3.5 retry at 4 s, if independent | 6.6 s | 16.9 s | 29.2 | 1.3 | 99% | 77% | ~74 |
| E. 3.5 retry at 6 s, if independent | 6.5 s | 18.4 s | 35.7 | 1.4 | 99% | 53% | ~73 |

- **Est. acceptable:** each model's share of answers times its blind-graded acceptable rate (29/39 for 3.5, 22/39 for 3.1). A no-answer scores 0. It is rough.
- **E rows:** a second 3.5 call whose outcome is drawn from the same window's 3.5 calls, averaged over 4000 draws. That is an upper bound; see clustering below.

**Per window, median / p90 / no answer:**

| policy | W1 (healthy) | W2 | W3 |
|---|---|---|---|
| A. today | 5.6 / 7.4 / 0 | 5.4 / 17.7 / 0 | 9.0 / cap / 4 |
| B. swap at 10 s | 3.9 / 6.2 / 0 | 7.7 / 15.9 / 2 | 14.4 / cap / 11 |
| C. swap, budget 5 s | 3.9 / 10.1 / 0 | 8.7 / cap / 6 | 14.2 / cap / 17 |
| D. hedge at 5 s | 3.9 / 6.2 / 0 | 7.3 / 10.9 / 0 | 9.7 / 43.6 / 2 |
| D. hedge at 6 s | 3.9 / 6.2 / 0 | 7.7 / 11.9 / 0 | 10.4 / 43.6 / 2 |

**Extra calls (second model started):**

| policy | W1 | W2 | W3 |
|---|---|---|---|
| today | 0/39 | 10/39 | 22/39 |
| hedge at 4 s | 18/39 | 35/39 | 37/39 |
| hedge at 5 s | 5/39 | 28/39 | 35/39 |
| hedge at 6 s | 4/39 | 25/39 | 33/39 |

**What the hedge costs:**
- The typical wait at W2 load is ~2 s slower than today: 7.3 against 5.4 s.
- Waits over 10 s do not improve: 25 against 26.
- It gains on the slow tail, on no-answers, and on who answers.

**What the hedge cannot rescue:** its 2 remaining no-answers, W3:S1Q04F and W3:S1Q06. On both, 3.5 stalled to the cap and 3.1 returned a 503 at 4.1 s.

### Why a second 3.5 call is weaker than it looks

3.5's failures (no first token by 10 s), with the prompts in time order:

| window | failures | failure followed by failure | expected in random order | p (20,000 shuffles) |
|---|---|---|---|---|
| W1 | 3/39 | 0 | 0.2 | 1.000 |
| W2 | 15/39 | 11 | 5.4 | < 0.001 |
| W3 | 23/39 | 15 | 13.0 | 0.157 |

W2's sequence was `..XXXXXXXXXXXX.......X.......X.....X...`, a run of 12 failures in a row. A retry seconds later lands in the same episode.

3.1's failures are only loosely tied to 3.5's on the same prompt:
- Both failed on 14 prompts, against 11.2 expected if independent.
- P(3.1 fails | 3.5 failed) = 0.34, against 0.27 overall.

That makes 3.1 the better partner for the race than a second 3.5 call.

### The latency rule over-charged six cases (its verdict stands)

`effectiveWait` checks `primary.error` before anything else. So:
- The probe's `aborted at cap` is charged as a 45 s failure, although the app's 10 s race would already have switched models.
- A 503 arriving after 10 s is charged at its arrival, although the app would have switched at 10 s.

| pair | front | what the front did | rule charge | app mechanics |
|---|---|---|---|---|
| W2:S1Q04F | 3.5 | 503 at 15.06 s | 18.50 s | 13.44 s |
| W2:S1Q05F | 3.5 | stalled to the cap | 45.00 s | 13.56 s |
| W2:S1Q10F | 3.1 | 503 at 10.63 s | 17.05 s | 16.42 s |
| W3:S1Q03 | 3.5 | stalled to the cap | 45.00 s | 17.02 s |
| W3:S2Q02F | 3.5 | stalled to the cap | 45.00 s | 19.16 s |
| W3:S2Q03F | 3.1 | 503 at 26.21 s | 30.69 s | 14.49 s |

Correcting these moves the swap from 16 to 13 no-answers. The FAIL verdict stands (13 against 4, and the p90 is still at the cap). The pre-registered file is unchanged. A hedge rule should charge a cap abort as a stall.

### How the simulation was checked

- Its sequential policy, in the rule's own charging mode, reproduces `effectiveWait` on all 117 pairs in both orders.
- `decide()` reproduces the published p90 (45000 against 19180) and forced counts (41 against 32).
- 11 hand-worked cases pass. Each would give a different answer if the behaviour it names were missing: for example, a hedge that dropped 3.5 gives 10600 ms instead of 6200 ms in the "front kept" case.
- All six rule/app differences were traced to the rows listed above.

## What this does not cover

1. **H3, concurrency.** No measurement ever had both models in flight at once. If the load that slows 3.5 also hits a 3.1 started beside it, the hedge helps less.
2. **Sample.** One day, three windows, 117 prompts. The 5 s trigger was picked on the same data it is scored on.
3. **Quality estimate.** One blind grading (29 against 22 of 39), applied as if quality did not depend on which path answered.
4. **Only the first word.**
   - A stream that stalls after its first token is not modelled.
   - The probe's cap abort also discards a first token that arrived before a mid-stream stall. The data cannot show how often that happened.
5. **The app itself.** There is no hedge code. Two live streams, aborting the loser, and what the answer bar shows are all untested.
6. **Quota.** Estimated only. Gemini's free tier allows 500 requests per model per day. With 3.5 primary, the live hour draws ~50 calls of 3.5, plus up to ~30 of 3.1 under load. A flight's offline 3.5 arms add about 5 × the roster size: the bare arm, captured-high ×3, and high.

## Proposed design (a sketch, to settle in brainstorming → spec → plan)

- **Scope:** the verbal answer path only.
  - Today's stall race is `LLMHelper.streamGeminiWithStallFallback` (LLMHelper.ts:3385), shared by both verbal routes.
  - The error-before-first-token fallback is `WhatToAnswerLLM.withVerbalFallback`.
  - The hedge would replace the stall race when the flag is on.
- **The race:**
  - 3.5-lite HIGH starts.
  - With no first token by H (~5 s, fixed before any counted window), or on a pre-token error, 3.1-lite LOW starts, and 3.5 keeps running.
  - The first model to produce a token wins, and the other request is aborted. The abort machinery exists: 0cb9235, 3d97b4a, 0841e9d.
  - If both fail, today's no-answer path applies.
- **Switch:** behind an env flag. Unset means today's stall race, so a flight can compare the two.
- **Logging:** verbal-diag.log records whether the hedge fired, when, and which model won, so a flight can read the hedge rate and the winner split.
- **Open questions:**
  - The value of H.
  - Whether a 3.1 503 inside the hedge deserves one retry.
  - How the hedge meets the technical route's saved-model seam: `verbalPrimaryModel(activeModelId, …)` answers on the model saved in the app's settings.
  - A third leg (below).

## Steps and gates

1. **Build.** After h40a is graded: brainstorm → spec → plan, then implement behind the flag, test-first, on a branch off `fix/coding-style-suffix-all-gemini`.
2. **Live concurrent probe (tests H3).** Extend `paired-latency.probe.mjs`, or write a sibling probe, so each prompt runs today's policy and the real hedge with both requests truly in flight. Fly windows at the 09-23 times: 07:15, 12:00 and 18:00 UTC (10:15, 15:00 and 21:00 local). Gemma 4 26B MINIMAL can ride as a third arm (see the last section).
3. **Pre-register a hedge rule** in `passes/PREREGISTER-hedge.md` before any counted window:
   - the conditions and margins; the latency rule used median +750 ms and p90 +1000 ms, and here no-answers must not exceed today's;
   - H fixed in advance;
   - a cap abort charged as a stall.
4. **Fly it.** A flight with the flag on, read against the h40a baseline bands.

## A third leg, Gemma 4 26B? (the user's question, 2026-09-24)

- **LOW does not exist.** Gemma 4 on the Gemini API accepts only MINIMAL and HIGH; LOW and MEDIUM return HTTP 400. The fast setting is MINIMAL.
- **What we know about 26B MINIMAL:**
  - Quality: 23/39 acceptable, against 22 for 3.1-lite LOW in the same blind grading, so a wash.
  - First answer: p50 1.4 s and p90 1.8 s on the night of 09-23/24, but a p90 of 35 s on 09-17.
  - Rate limit: 16k input tokens per model per minute on the free tier, and a verbal prompt is ~5.6k tokens at p90. That allows about 2 calls a minute.
- **The most it could add** is rescuing the hedge's remaining no-answers: 2 of 117, both in the evening window, and none in the other two.
- **The unknown that decides it:** is Gemma up when both flash-lites are failing? This has never been measured in the same windows.
  - The earlier model-fitness read called Gemma's fit "an uncorrelated fallback leg"; that is exactly the assumption to test.
  - Today's 11:44 Gemma sidecar measures same-morning latency, not overload behaviour.
- **Only partly independent, even at best.** Gemma on the Gemini API uses the same key and endpoint as the flash-lites.
  - An auth or quota fault takes out all three legs, as the stall race's own comment notes for 3.5.
  - Only a capacity problem specific to the flash-lite models could leave Gemma answering.
- **History:** the stall fallback was gemma-4-31b-it until Flash Lite 3.5 replaced it. (31B was the model that collapsed to a 19 s first token in the after9 flight.)
- **Recommendation:** measure first, don't build yet.
  - Add 26B MINIMAL as a third arm in step 2's live probe.
  - Build it as a last-resort leg only if it answers on the prompts where both flash-lites failed. It would start when both have failed, or when nobody has spoken by ~10 s.

**Update, 2026-09-24 afternoon: 26B MINIMAL measured on the holdout.** It ran on h40a's 44 captured prompts, 3 reps (13:07–13:58). It was graded blind in the same files as the flight's own 3.1-lite LOW ×3 and 3.5-lite HIGH ×3, by claude-opus-5-5.

| arm | acceptable/44 by rep | mean | first answer p50/p90 |
|---|---|---|---|
| 3.1-lite LOW | 41/40/39 | 40.0 | 5.6 / 8.2 s |
| 3.5-lite HIGH | 41/41/38 | 40.0 | 3.5 / 24.9 s |
| 26B MINIMAL | 35/37/33 | 35.0 | 1.5 / 1.7 s |

- **Paired over 132 pairs:**
  - Gemma vs 3.1: −15, sign p=0.017.
  - Gemma vs 3.5: −15, p=0.006.
  - 3.5 vs 3.1: exactly 0. That is a second, blind confirmation that the two flash-lites tie on the holdout.
- **Consistent failures, all 3 reps:**
  - On R25 and R28 Gemma answered an EARLIER question in the app's context (R24's topic, and SageMaker instead of MLflow).
  - On R31 it got the arithmetic wrong without thinking.
- **What this means for the third leg:** fast and up today, but clearly weaker, and able to answer the wrong question. It still beats no answer, so it fits only as a last resort after both flash-lites have failed, never as a race partner. Whether it stays up while they are failing is still unmeasured.

## Appendix: the simulation's definitions

The simulation script is `hedge-sim.mjs` in session 9c5886c7's scratchpad (temporary). These are its exact definitions, enough to rebuild it over the three window files with `pairsOf`, `effectiveWait` and `pct` from `paired-latency.decide.mjs`, where `BUDGET_MS = 10000` and `CAP_MS = 45000`.

```js
const isCapAbort = (r) => !!r.error && /aborted at cap/.test(r.error);
// a first token at tok ms after the call starts, a failure at fail ms, or a stall.
// mode 'rule' charges a cap abort as a failure at 45 s (as effectiveWait does); 'app' as a stall.
const outcome = (r, mode) => {
    if (r.error) return mode === 'app' && isCapAbort(r) ? { stall: true } : { fail: r.total };
    return typeof r.ttft === 'number' ? { tok: r.ttft } : { stall: true };
};
const done = (t, by, extra) => (t < CAP_MS ? { wait: t, by, extra } : { wait: CAP_MS, by: 'none', extra });

// today's stall race: the front alone until `budget` or its failure, then only the other
function seq(front, other, mode, budget = BUDGET_MS) {
    const a = outcome(front, mode), b = outcome(other, mode);
    if (a.tok !== undefined && a.tok <= budget) return { wait: a.tok, by: 'front', extra: false };
    const start = a.fail !== undefined ? (mode === 'rule' ? a.fail : Math.min(a.fail, budget)) : budget;
    return done(b.tok !== undefined ? start + b.tok : Infinity, 'other', true);
}

// the hedge: the front keeps running; the other starts at H or at the front's failure; first word wins
function hedge(front, other, H) {
    const a = outcome(front, 'app'), b = outcome(other, 'app');
    if (a.tok !== undefined && a.tok <= H) return { wait: a.tok, by: 'front', extra: false };
    const start = a.fail !== undefined ? Math.min(a.fail, H) : H;
    const tf = a.tok ?? Infinity, to = b.tok !== undefined ? start + b.tok : Infinity;
    return done(Math.min(tf, to), tf <= to ? 'front' : 'other', true);
}
```
