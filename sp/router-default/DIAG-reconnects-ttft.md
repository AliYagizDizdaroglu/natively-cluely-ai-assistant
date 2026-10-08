# DIAG: Live reconnects + TTFT p90, run eq (2026-10-06T01-12-56-eq)

Read-only diagnosis, 2026-10-06. No model calls, no app, no repo edits. Sources: the run's natively_debug.log, verbal-diag.log, interview60.timeline.json, interview60.flight.done.json, the pass-record Summary, MAIN `electron/audio/GeminiLiveRouter.ts` (connect/handleMessage/handleClose/scheduleReconnect), MAIN `electron/LLMHelper.ts` (streamGeminiWithHedge, 3471-3542; the brief's `electron/llm/` path does not exist), and `interview60.metrics.mjs` (how TTFT is computed). Throwaway scripts: session scratchpad `recon.mjs`, `decomp.mjs`, `thoughts.mjs`, `cmp.mjs`, `gaps.mjs` (they print ids, times and tags only). Item times use the timeline plus OFFSET_MS=1150.

## Verdicts

| | Root cause | Confidence | Small isolated fix? |
|---|---|---|---|
| Q1 | An app bug in GeminiLiveRouter. The goAway handler closes the old session itself, its `onclose` schedules a second reconnect, and **two sessions open**. Callbacks are not tied to their session, so whenever the orphan dies, `handleClose` drops the healthy session and opens a new one. On 3.1 Live an orphan dies about 152 s after it stops getting audio ("The operation was aborted."), so the cycle repeats every ~152 s for the rest of the hour. 24 of the 26 reconnects come from this cycle. | High for the mechanism (code path, log shape, the same signature in 29 earlier runs). Medium for why 3.1 aborts an orphan at ~152 s (inferred, not probed). | Yes. Generation-gate the session callbacks, about 15 lines in GeminiLiveRouter.ts. |
| Q2 | A provider-side transient at the start of the hour, not the hedge and not the app. The first 5 roster dispatches (00:04:27 to 00:08:27) all took ≥10.3 s. **Both** models were slow at the same thought counts. 3.1-lite also returned 503 "high demand" and had 2 back legs fail. From 00:09:42 on, TTFT matches the daytime hours. | Medium-high. Provider queue time and decode rate cannot be separated from these logs. | No app fix for the latency. Two small observability/metric fixes are listed below. |

---

## Q1: Live reconnects (26 `Live Mode status: reconnecting` lines)

### Classification

| Cause | Count | Path |
|---|---|---|
| goAway (connection time limit) | 1 | 00:11:06.270, attempt 1/3, quick retry 300 ms |
| Error close "connection closed" (our own `session.close()` in the goAway handler) | 1 | 00:11:06.364, attempt 2/3, quick retry 600 ms, **94 ms after the goAway** |
| Error close "The operation was aborted." | 24 | all attempt 1/3, quick retry 300 ms |
| Quota close | 0 | — |
| Expired handle | 0 | — |
| Slow retry (15 s) / visible-failed | 0 | — |

- Close codes are not logged. `handleClose` logs only `e.reason`, which is an observability gap. "The operation was aborted." matches the canonical description of gRPC status ABORTED. That means a server-side close, not a local AbortController. No AbortController exists in the router's path.
- Every reconnect recovered within 505 to 1182 ms (median ~580 ms). The gap buffer replayed 4 to 29 chunks each time.

### Periodicity

- Session 1: connected 00:02:05.8, goAway 00:11:06.3, which is **9 min 0.5 s**. h40d's goAways also come every 9:01.
- After that: an abort every **151 to 153 s** (median 152 s), 24 times, until the end of the run. No further goAway arrives, because no session lives 9 min any more.

### Mechanism (code + log)

1. goAway arrives. `handleMessage` sets `this.session = null`, calls `session.close()`, and calls `scheduleReconnect` (timer 1, 300 ms).
2. That `close()` fires the old session's `onclose`, which runs `handleClose`, which calls `scheduleReconnect` again (attempt 2, timer 2, 600 ms). `this.reconnectTimer` is overwritten, timer 1 is never cleared, and nothing guards against a second connect already pending.
3. Both timers run `connect()`. The log shows **two `reconnecting` and two `connected` lines** (00:11:07.005 and 00:11:07.198). `this.session` holds whichever resolved last. The other session stays open with live callbacks but gets no audio, because `write()` feeds only `this.session`.
4. About 152 s later the orphan is closed by the server (3.1 Live). Its `onclose` runs the shared `handleClose`, which sets `this.session = null` even though the closed session was not `this.session`. It then reconnects. The healthy session, still open, is abandoned and becomes the next orphan. One more cycle: abort, then swap.

Supporting evidence:
- **h40d (gemini-2.5-flash-native-audio-latest):** the same double connect after every goAway, but no aborts. Instead, at 11:17:14 **two goAways arrive 108 ms apart** (attempts 1/3 and 3/3). That is direct proof the orphan session survives and still delivers callbacks. 2.5 does not kill an idle orphan, so the cycle never starts there. It hit quota closes instead (42).
- **2026-09-02-before:** a second extra session appeared (a stray "connection closed" at 16:43:23). From then on, aborts come in **pairs about 1 s apart**, and later as two interleaved chains (43 s / 111 s gaps). With one session, a fixed session lifetime cannot produce that. Two orphans each dying about 152 s after losing audio can.
- The first 3.1 session, which **was** fed audio, lived 9 min with no abort. Every 3.1 hour shows the same 9-min-then-152-s shape. So the active session is not what dies at 152 s.
- What I infer but did not probe: 3.1 Live aborts a session that gets no realtime input for about 150 s. A standalone 3.1 probe (open a session, send nothing, time the close) would confirm it. That needs a model call, so it was out of scope.

### Same pattern in earlier hours: yes, in every 3.1 Live hour since 2026-09-02

| Run | Live model | Reconnecting lines | goAway | Aborts | Abort gaps |
|---|---|---|---|---|---|
| s50l (09-21, 07:13Z) | 3.1-flash-live-preview | 26 | 1 (+1 double) | 24 | 151 to 153 s |
| s50m (09-22, 07:14Z) | 3.1-flash-live-preview | 25 | 1 (+1 double) | 24 | 151 to 153 s |
| h40a / h40b / h40c | 3.1-flash-live-preview (flight.done.json) | 24 / 25 / 22 | 1 each | 23 / 23 / 21 | ~152 s |
| h40d (10-02) | **2.5-native-audio** | 55 | 9 (+5 doubles, 1 triple) | 0 | — (42 quota closes) |
| eq (10-06, 00:04Z) | 3.1-flash-live-preview | 26 | 1 (+1 double) | 24 | 151 to 153 s |

Of the 34 runs that have a debug log, 30 (eq included) show the identical signature (1 goAway, then aborts every ~152 s). The exceptions are h40d (2.5 Live), liveonly, liveonly2 and after6. Those had quota closes, and I did not check their Live model. So the "26 reconnects" in eq is the long-standing baseline, not a 3 am effect.

### On the play timeline, and impact on questions

All 26 reconnects with the item playing, in seconds relative to that item's clip end (negative = during the clip):

S1Q03F +0.8 (goAway), S1Q03F +0.9 (double), S1Q04 +64.7, **S1Q05 −24.2**, S1Q05 +127.3, S1Q06 +3.8, **S1Q06F −1.1**, S1Q07 +66.0, **S1Q08 −18.0**, S1Q08 +133.2, S1Q09 +48.4, S1Q10 +22.2, **S2Q01 −1.4**, **S2Q02 −1.1**, **S2Q03 −11.6**, S2Q03F +57.3, S2Q04 +127.3, S2Q05 +37.2, S2Q05F +30.1, S2Q06 +103.0, **S2Q07 −16.6**, S2Q07 +134.4, S2Q08 +49.3, S2Q08F +45.3, S2Q09F +23.5, S2Q10F +2.8.

- **7 reconnects overlapped a question clip.** Live claimed the 3 that hit 11 to 24 s before the end (S1Q05, S1Q08, S2Q03, S2Q07 at +0.9 to +1.9 s, which is normal).
- **Live made no claim at all for 4 items: S1Q03F, S1Q06F, S2Q01, S2Q02.** All 4 had a reconnect within **−1.4 to +0.8 s of the clip end**. The other 36 items had no such reconnect and all got a Live claim (+0.1 to +3.0 s after clip end, plus 2 early claims at −5.3 and −13.5 s). No Live claim was late.
- Across s50l, s50m and eq, a reconnect landed within −3 to +1 s of the clip end 10 times. Live missed 5 of those 10, and those are **all 5 Live misses** in the three hours. A reconnect earlier in the clip is harmless: the gap buffer replays it.
- **No question was lost.** The detector/turn gate answered all 4 at clip end +0.0 s (source=whisper). In this hour the detector dispatched 37 of 40 answers at about clip end +0.0 s, and Live was the dispatch source for only 3 (S1Q07, S2Q01F, S2Q10). The cost is Live's redundancy (lost 4 times out of 40), not answers.

### Alternatives ruled out

- **Quota close:** 0 quota lines. The reason text is ABORTED, not RESOURCE_EXHAUSTED.
- **Expired resumption handle:** 0 "handle expired" lines. An expiry loop reconnects about once a second; this cycle is 152 s.
- **Network blips / goAway cap:** the period is too regular (151 to 153 s across 30 hours, day and night). It is absent on 2.5 Live and absent before the first goAway.
- **Server limit on resumed 3.1 sessions:** with a single session it cannot produce the 1 s abort pairs in the 09-02 run. h40d proves orphan sessions survive.

### Fix candidate (not implemented)

Generation-gate GeminiLiveRouter, the same pattern as the Deepgram fix (`connect()` generation gating):
- `connect()` increments `this.generation` and captures `gen`. `onopen`, `onmessage` and `onclose` return early when `gen !== this.generation`. A stale session's close then never touches `this.session` and never reconnects. Also `close()` any late stale session.
- The goAway handler increments the generation **before** `session.close()`, so its own `onclose` is ignored.
- `scheduleReconnect` returns or clears when `this.reconnectTimer` is already pending.
- Log `e.code` next to `e.reason` in `handleClose`.
- Tests with a fake `connectFn`, written first: goAway gives exactly 1 connect; a stale session's `onclose` gives 0 reconnects and leaves `this.session` unchanged.
- Expected live effect: about 6 reconnects per hour (one per ~9-min goAway) instead of 26, and no orphan sessions. This assumes the fed 3.1 session is not itself aborted, which every 3.1 hour's first 9 minutes supports. Verify with one smoke: reconnect count, and no `a2 … connection closed` after a goAway.
- Residual: each goAway still opens a gap of about 0.5 to 1 s. A goAway in the last ~2 s of a question can still cost Live that claim (the detector covers it). Gap-buffered audio replayed at end-of-turn is why Live misses; that is unproven.

---

## Q2: TTFT p90 10.3 s

How the metric works: `interview60.metrics.mjs` takes verbal-diag `first token Nms`, measured from `generateStream invoked`, over the timeline window, and uses `pct = a[floor(n·p)]`. The window includes 41 values: the 40 roster answers plus one pre-roster probe answer (invoked 00:04:00, first token 17467 ms at 00:04:17). p90 is the 37th of 41, which is **10286 ms**. With the probe answer removed, p90 is still 10286 ms (36th of 40), so the artifact does not change the number.

### Decomposition per dispatch (40 roster answers)

| Stage | p50 | p90 | max |
|---|---|---|---|
| dispatch → generateStream invoked | 5 ms | 7 ms | 8 ms |
| invoked → hedge start (prompt/RAG/embed) | 492 ms | 758 ms | 1090 ms |
| hedge start → winning first token | 4.17 s | 6.42 s | 13.5 s |
| **invoked → first token (the metric)** | **4.85 s** | **7.35 s** (n=40, roster only) | 14.3 s |

### The hedge

- **Front (3.5-lite HIGH) won 38 of 40, back (3.1-lite LOW) won 2.** The back leg started 9 times on roster items, all `reason=trigger`. Adding the 2 pre-roster answers (00:03:43, 00:04:00) gives the 11 back starts in the log.
- Front first-token times when it won (ms from hedge start), sorted: 3153, 3247, 3281, 3292, 3386, 3558, 3599, 3632, 3657, 3662, 3737, 3862, 3914, 3924, 3950, 3957, 4138, 4149, 4168, 4246, 4271, 4364, 4367, 4414, 4467, 4486, 4561, 4567, 4754, 4827, 4885, 5050, 5076, 5166, 5478, 6424, 10568, 12441.
- The 9 triggered roster dispatches:

| Item | Time | Winner @ ms from hedge start | Winner's thoughts | ms per thought token | Other leg |
|---|---|---|---|---|---|
| S1Q01 | 00:04:27 | 3.5 @ 10568 | 1025 | 10.3 | back aborted |
| S1Q01F | 00:05:34 | 3.5 @ 12441 | 846 | 14.7 | **back failed** |
| S1Q02 | 00:07:01 | 3.1 @ 13547 (leg 8538) | 1094 | 7.8 | front aborted |
| S1Q02F | 00:08:27 | 3.1 @ 9476 (leg 4467) | **118** | 37.9 | front aborted |
| S1Q03 | 00:09:42 | 3.5 @ 5478 | 1364 | 4.0 | back aborted |
| S1Q03F | 00:11:06 | 3.5 @ 5076 | 1211 | 4.2 | back aborted |
| S1Q04 | 00:12:36 | 3.5 @ 6424 | 1833 | 3.5 | back aborted |
| S2Q04F | 00:49:39 | 3.5 @ 5050 | 1314 | 3.8 | back aborted |
| S2Q08 | 01:03:32 | 3.5 @ 5166 | 1082 | 4.8 | back aborted |

Pre-roster answers: 00:03:43, 3.5 won @ 10749 (651 thoughts, 16.5 ms/thought), back failed. 00:04:00, 3.1 won @ 16910 (leg 11907, 770 thoughts, 15.5 ms/thought).

### What drives the p90

- The 5 values ≥10 s (11269, 13082, 14337, 10286, plus the 17467 probe) all fall in **00:04:00 to 00:08:27**, the first ~4.5 min of answering. With 5 of 40 above 10 s, p90 lands on them.
- In that window **both legs were slow**. 3.5 ran at 10 to 16.5 ms per thought token against a steady 3.5 to 5.0 ms (median 4.3 over 33 later wins), and its thought counts (651 to 1025) were *at or below* the hour's median of 956. 3.1 took 4.5 s to its first token with only 118 thoughts, failed outright twice (the reason is not logged), and its startup warmup at 00:02:07 got **503 "This model is currently experiencing high demand"**. Another 3.1 keep-warm 503 came at 00:42:03.
- So it is **not** "the hedge waits 5 s, then 3.1 is slow" alone. The front stalled past 5 s because the provider was slow, and the back leg was just as slow. The hedge rescued 2 dispatches (to 9.5 s and 13.5 s) and could not do better.
- The remaining >5 s values after 00:09 (5478, 5076, 6424, 5050, 5166) are long HIGH thinking (1082 to 1833 thoughts) at normal speed. That is content-driven, about 1 s over the trigger, and none is near 10 s.
- **Steady state (after the first 10 min of the roster, n=33): p50 4.66 s, p90 5.52 s.**

### Daytime comparison, same roster (scenario50, S1Q01..S2Q10F, 40 items)

| Run | Start (UTC) | Path | First 10 min first-token ms | Rest p50 / p90 | Whole-hour p90 | 503s |
|---|---|---|---|---|---|---|
| s50l | 09-21 07:13 | 3.1-lite LOW stall race, no hedge | 3656 … 5537 (max) | 4.42 / 5.25 s | 5.26 s | 0 |
| s50m | 09-22 07:14 | same | …, **12827, 17310** | 4.51 / 5.17 s | **12.83 s** | 6 |
| **eq** | 10-06 00:04 | hedge 3.5 HIGH front | **17467, 11269, 13082, 14337, 10286**, 5982, 5882, 7350 | 4.66 / 5.52 s | **10.29 s** | 2 |

The holdout hours show the same early-session outliers in daytime: h40a (13741, 14122; 26 × 503) and h40b (15368, 13608, 10076). h40c and h40d show none.

### Provider at 3 am, or the app?

The evidence is consistent with a **provider-side transient**, and it is not specific to 3 am:
- Steady-state eq equals the daytime hours (p50 4.66 s vs 4.42/4.51 s).
- The slowness hit two different models at once, at normal thought counts, alongside 503 "high demand".
- The same early-hour outliers with 503s occur in daytime runs (s50m, h40a).
- App-side stages stayed flat through the slow window: dispatch→invoke ≤8 ms, invoke→hedge 449 to 945 ms.
- The bare arms were replayed after the flight (answer files 01:15 to 01:55 UTC), so nothing competed for quota during it. App activity in 00:02 to 00:09 was ordinary by log-tag counts, and the main-process log has the same gap profile in the early window as later.

### Alternatives ruled out

- **The hedge mechanics** (waiting 5 s, then a slow 3.1): the front keeps running after the trigger, so the trigger never delays a front win. 7 of 9 triggered dispatches were won by the front anyway.
- **Long thinking:** the slow early answers had normal or low thought counts. Per-token time tripled.
- **App latency before the request:** flat, as shown above.
- **The Live reconnect cycle:** a separate socket. It ran every 152 s across the whole hour, including the fast 55 minutes.
- **The probe answer inflating the metric:** p90 is 10286 ms with or without it.

### Fix candidates (no fix for the latency itself)

- No small app fix moves this p90. A lower trigger would not have helped: 3.1 was equally slow in the window. Warming is not the lever either: 3.5 was warmed at 00:02:08 in 587 ms and was still slow for the next 6 minutes.
- **Observability (small, isolated):** in `streamGeminiWithHedge`, log the loser's error when `other=failed`. The two 3.1 back-leg failures here have no recorded reason. The 503 is inferred from the warmup.
- **Metric hygiene (small, isolated):** start the TTFT window at the first roster item, not at `startDiag`, so pre-roster probe answers stay out. It does not change this run's p90. Separately, consider reporting TTFT p90 for minute 0 to 10 next to minutes 10 to 60, so a startup provider transient is distinguishable from a regression. That is a gate change and the user's call.
- Noted, not a cause: the periodic keep-warm pings warm only 3.1-lite (00:22, 00:32, 00:42 …) and never the hedge's front model 3.5-lite. The steady state shows 3.5 does not need them.

## Not shown / residual risk

- I did not test why 3.1 Live aborts an orphan at ~152 s, or the end-of-turn replay miss. Both need a standalone 3.1 Live probe (model call).
- Close codes are not in the logs. The ABORTED reading rests on the reason text.
- Provider queue time vs decode rate cannot be separated. ms-per-thought mixes TTFB and generation.
- I mapped reconnects to items using OFFSET_MS=1150. A ±1 s mapping error could move the borderline cases (−1.1, −1.4 s) across the clip end. It does not change "near the end of the question".
- The other 3.1 hours were classified by counts and gaps only. I did not read their item timelines, except s50l and s50m.
