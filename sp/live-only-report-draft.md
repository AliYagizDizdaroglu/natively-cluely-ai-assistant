# Live-only feasibility — report draft (fill from score-live-only.mjs + gate)

## Verdict (lead)
- Can Live alone carry the ear + transcript? <yes/no/conditional> — hour on gemini-2.5-flash-native-audio-latest (3.1 silent, see findings).
- Gate rows on the liveonly hour: heard __/52, delivered __/__, doubles __, unclaimed __, detect p50 __ s, TTFT p90 __ s.
- Caption accuracy: WER median __%, p90 __%; items > 20% WER: __.

## v1 hour (2026-09-03T13-54-10-liveonly, 12:53:36 → 13:54:10 UTC, gemini-2.5-flash-native-audio-latest)
- Gate: FAILED on Answered hands-free (43/43 dispatched, 0 to nobody; needs ≥50) and Heard (43/52); PASS: 0 doubles / 0 caught / 0 unclaimed; 0/0/0 sockets; coaching 0; CODING 0 (3 cue answers); expiry 0; TTFT p90 4.8 s · detect p50 4.2 s.
- Scorer: Live heard 44/52 (W04 heard then dropped); answered 43/52; verdicts match 41 / paraphrase 2; Live latency p50 4.3 s p90 12.9 s max 20.5 s; caption lag p50 2.3 s; captions on 49/52; WER median 19 % p90 53 %; drift none; inventions 0 (2 unclaimed = preflight probe); Groq 1 (self-test), STT 0.
- Misses (9): W04 wiring (700 ms cuts + reconcile replaced by "?") → fixed (segmenter 1.5 s; reconcile guard f8b0348); W06, M09, M17 model non-fires (captions present, no tool call); M20 reconnect gap (goAway); H07, H09, H10, H11 lost in the quota storm 13:45–13:54 (311 × 1011 "exceeded your current quota", 65–78/min at the peak; the goAway reconnect at 13:45 was quota-closed and the 300 ms retry re-resumed the ~10.7K-token session — self-amplifying) → router quota backoff (5 s doubling to 60 s, fresh session) implemented + 3 tests.
- Reconnects otherwise: goAway every 9 min (timeLeft=50s ignored: closes immediately; then a harmless second attempt), ~1 s gap, 4+2 chunks replayed.
- 3.1-flash-live-preview at 13:55 UTC: immediate 1011 quota close (was silent at 12:35) — today's allowance spent after ≈2 h 15 min of sessions (07:36–10:53 + preflights); 2.5 works again standalone at 13:56 (fresh session).
- AI Studio screenshot (user): 2.5 native audio 1M TPM / unlimited RPD; 3 Flash Live 65K TPM; 3.5 Live Translate 20K; 3.5 Transcribe Live 20K.

## v2 hour (liveonly2, launched ≈14:05 UTC, same model, segmenter 1.5 s + reconcile guard + quota backoff)
- <fill>

## Findings that change the picture
1. 3.1-flash-live-preview went silent for this key at ~12:35 UTC after ~3 h of Live use today (standalone repro; captions kept flowing; plain assistant also silent; TEXT rejected 1007). 2.5-native-audio-latest worked. Free-tier Live limits are only visible in AI Studio; "free of charge" ≠ unlimited. Re-test 3.1 after 07:00 UTC.
2. Existing logs: Live alone 47/52 (Sep 2), 52/52 (run 2), 48/52 (run 3). Misses: 2/9 on reconnects, rest model non-fires. No inventions. Paraphrase drift 1–2/h.
3. Reconnects on 3.1: server closes "The operation was aborted." every ~2.5 min (17–19/h; 121/h on Sep 2), goAway 1–2/h. 2.5 behaviour: __ (from the hour).
4. Captions: 3.1 = one fragment per utterance; 2.5 = word pieces. Segmenter (700 ms silence / 250 ms after ?.!) → finals __ ms after speech end (p50). Tool call ≈ 1.1–1.5 s after the final.
5. Run 5 lost: machine restarted 11:17:30 UTC (event 1074); app log had frozen at 10:45:55 while the app still answered at 10:52 (logger swallows write errors; cause unknown).

## What the spike built (throwaway, not committed)
- NATIVELY_LIVE_ONLY=1 (dev-only): both STT channels off; router captions → shared `ingestTranscript()` → transcript/reconcile/Context; Groq detector not fed. New `liveCaptionSegmenter.ts` (+6 tests). Router: observability logs only. Full suite 338 passed; electron tsc = six pre-existing errors.
- Revert: copy scratchpad/pre-spike/* back; delete the two new files.

## Design if adopted
- Live-only ear = Live detection + Live captions as transcript; keep reconcile/hold; add proactive reconnect (open the next session on goAway timeLeft / keep 2 staggered sessions) to close the gap misses; consider gemini-3.5-transcribe-live for captions.
- Residual: single point of failure (3.1 silence shows it); paraphrase drift when captions lag; daily allowance unknown.

## Recommendation
- <keep dual for interviews now | Live-only viable on 2.5 with proactive reconnect | …>
