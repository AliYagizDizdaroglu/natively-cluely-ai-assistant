# Live-only feasibility — report body (v2 numbers to be filled)

## Verdict
Gemini Live alone cannot be relied on for an interview on the free tier today. The reasons are two quota behaviours and one model gap, all measured, none of them fixable from the app:
1. The 3.x Flash Live model, the only Live model whose captions and detection are good enough, spends its free allowance after roughly two hours of sessions per day and then fails silently: it still connects and transcribes, and never detects. Seen 12:35, 13:55 (explicit 1011), 14:04 (silent again).
2. The 2.5 native-audio model has 15× the per-minute budget and honest errors, but it misses 3–4 questions an hour on its own, takes 10–20 s on a quarter of them, and its captions mishear the terms the answers depend on (pod, DAG, dataset, structure).
3. Both models drop every question that lands in a reconnect gap unless something else is listening; today that something is the STT plus Groq detector.

What Live IS good for, measured: as the primary ear in the dual setup. On 3.x it heard 52/52 (run 2) and 48/52 (run 3) by itself, with zero inventions, and detects 1.1 s after the caption. The STT plus Groq path is what covers its gaps, its silent-quota days and its paraphrase drift.

## What was built and what remains of it
Throwaway (not committed): `NATIVELY_LIVE_ONLY=1` dev switch (both STT channels off, Live captions → shared transcript intake, Groq detector not fed), `liveCaptionSegmenter.ts` + 7 tests, router observability logs. Revert = copy scratchpad `pre-spike/` back, delete the two new files.
Kept, committed, verified alone:
- f8b0348 fix(live): a fragment final never replaces a substantive Live question (reconcile guard; applies to the dual setup too — a Deepgram "Um." could do the same).
- b94382f fix(live): back off on quota closes and reconnect fresh instead of quick-retrying (the 311-close storm).
Both commits were built as HEAD + my hunks because the router files carry the user's uncommitted work; the working tree keeps that work untouched.

## Two hours, one model, before and after the wiring fixes
| | v1 (12:53–13:54 UTC) | v2 (14:04–15:05 UTC) |
|---|---|---|
| Heard by Live | 43/52 (gate) · 44/52 incl. the dropped W04 | __ |
| Answered hands-free | 43 | __ |
| Live detect latency p50 / p90 | 4.2 s / 12.9 s | __ |
| Caption WER median | 19 % (inflated by 700 ms cuts) | __ |
| Reconnects | 6 goAway + 311 quota closes | __ |
| Vendor calls (Groq/Deepgram) | 0 | 0 |
| Gate | FAILED: answered, heard | __ |

## Quota facts (from the AI Studio table you sent + today's runs)
- 2.5 Flash Native Audio Dialog: unlimited RPD, 1M TPM. 3 Flash Live: unlimited RPD, 65K TPM. 3.5 Live Translate / 3.5 Transcribe Live: 20K TPM.
- The 3.x exhaustion is not RPD and not a per-minute window (13:55→14:04 with zero use stayed exhausted); most likely a daily token allowance the table does not show. The close reason is truncated to 123 bytes by the WebSocket protocol, so the metric name is invisible.
- A session's per-turn prompt grows to ~10K tokens after 50 min (context re-read each turn); 6–7 questions in one minute would exceed 65K on 3.x, not 1M on 2.5.
- Answer model (gemini-3.1-flash-lite): ~500/day; after v2 roughly 165 left today.

## Design if you still want fewer vendors
- Keep Live 3.x as the primary ear (it is today). Replace the Groq detector's role with a second Live session on 2.5 (uncorrelated bucket, 1M TPM) only if two concurrent sessions are allowed on the free tier — untested. Captions from 2.5 are not good enough to be the transcript; the transcript still needs Groq STT or `gemini-3.5-transcribe-live` (20K TPM, untested).
- Proactive handover on goAway (open the next session during the 50 s timeLeft, then swap) removes the reconnect-gap misses on both models. Not built.
- Nothing removes the silent 3.x exhaustion except a second ear that does not depend on it.

## Open items for you
1. Deepgram vs Groq for STT (Groq REST has been flawless all week; Deepgram's 12 s socket flap is unfixed).
2. Whether to re-run the dual configuration tomorrow after the 07:00 UTC reset as the Phase B after-run of record (run 5 was lost to the 11:17 restart; run 3 at 50/52 is the best complete one).
3. Whether to keep the Live-only switch as a dev feature (revert otherwise).
4. Rotate the Gemini key in ce9ff83/479375a; decide the uncommitted work; consider paid tiers if hands-free hours/day matter (3.x live ≈ 2 h/day free).
