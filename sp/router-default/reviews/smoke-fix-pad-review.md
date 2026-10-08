# smoke-fix-pad review (Opus)

Package: `reviews/smoke-fix-pad.diff` (bf26b08 on 9fbdf5b, worktree live-router). Report: `reports/smoke-fix-pad-report.md`.
Root cause: `build/progress.md` smoke-2 entry (43/47 late; the router fed the suppressor's thinned stream).
Tests re-run from a temp cwd: LiveRouterSession.test.ts 26/26 pass. No build, no app, no model call.

**Verdict: SPEC PASS, QUALITY CHANGES** (one IMPORTANT, cheap to fix before the re-smoke).

## What holds

- **Padding math and format.** `write()` gets the capture rate and resamples to 16 kHz mono int16 first
  (`resampleTo16kMono`). `chunkMs = pcm.length/2/16` is measured on the output that is actually sent. The pad is
  `floor(ms*16)*2` bytes of zeros in that same format (`audio/pcm;rate=16000`). The 48 kHz and 44.1 kHz frames of 20 ms
  resample to exactly 320 samples, so there is no drift from the resampler. Sub-floor remainders stay owed.
- **No double padding of zeros.** The timer sets `sentEndAt = t`; the next write computes its deficit from that point,
  so the two never pad the same interval. The only overlap is real audio: a chunk that arrives just after a timer pad
  can overrun wall time by at most one chunk. `min(..., now)` re-anchors, so the error does not accumulate as debt.
  Running ahead of the clock does not delay the server VAD.
- **No burst at up.** `startPadTimer()` anchors `sentEndAt` at the up instant, and keepalives arrive every 100 ms, so
  the first pad after up is about 80 ms. The report's concern about 1 s of leading silence at up does not occur. It
  needs an event-loop stall of 1 s or more (see I-1).
- **Generation and stop.** Every down path calls `setUp(false)` → `stopPadTimer()`: stop (LiveRouterSession.ts:97),
  goAway (:196) and a non-stale close (:227). `setUp(true)` happens only at setupComplete of the current generation, so
  a timer never spans two generations. P5 checks this, including `getTimerCount()==0` after stop. The timer is
  `unref`'d and its send errors are logged (P6).
- **The two surviving mutants do not matter.** The timer runs only while `up` is true, and every generation change
  while up passes through `setUp(false)` first. So the in-callback generation check and the explicit
  `stopPadTimer()` in stop() are both unreachable as sole guards. Keeping them is fine.
- **Scope.** Only the router's input changes. The ear (`liveRouter.write`), STT, the arbiter and the display logic are
  untouched, and main.ts is unchanged.

## Findings

### I-1 IMPORTANT: a main-thread stall during speech now inserts synthetic silence into the question

Location: LiveRouterSession.ts:111-118 (write pad) and :129-136 (timer pad).

- **The mechanism.** Native frames reach JS through a NonBlocking tsfn (`native-module/src/lib.rs:192-206`). During
  a main-process stall of S ms, real speech frames queue up and arrive late in a burst.
  - The first delayed chunk sees `deficit ≈ S − 20`. It is sent as up to 1000 ms of zeros, then the speech.
  - Or the timer fires first after the stall (`t − lastWriteAt > 150`) and pads S of zeros. The queued speech follows
    either way.
  - The result: S ms of silence that never happened, inserted mid-question, with the real audio after it.
- **Before the fix,** a stall only delayed the stream; it never inserted silence.
- **Why it matters.** The smoke numbers put the server's end-of-turn silence at about 1 s of audio. The 500 ms
  hangover alone did not trigger it, while the thinned 20%-density stream took 2.9–6.3 s. The cap is 1000 ms, so a
  stall of about 0.5–1 s that coincides with a natural pause can make the router end the turn on half a question. That
  is a router decision on a fragment, the case SPEC §14 says "Only the Safety bar measures".
- **Frequency is unmeasured.** It needs Electron main-thread stalls (sqlite, sync I/O), which are rare but not
  impossible over an hour.
- **Fix (small, and it matches the root cause exactly).** Pad only where the suppressor itself produced silence:
  - the write path pads only before a chunk whose bytes are all zero (`SendSilence` frames are zero-filled,
    lib.rs:201-203);
  - the timer pads only if the last written chunk was all zero.
  - Speech and hangover frames are never all zero, so a stall during speech pads nothing. In suppressed silence the
    behaviour is unchanged.
- **Tests to add:**
  - a loud stream, then a 600 ms gap with no timer tick, then loud chunks: no zeros are sent;
  - the same with the timer ticking (fake timers advanced without writes, last chunk loud): no zeros are sent.

### M-1 MINOR: the frame size in the comment and tests is wrong

Location: LiveRouterSession.ts:143-146; LiveRouterSession.test.ts:36 and P1.

- The comment says "one ~60 ms frame per 100 ms". The keepalive is ONE 20 ms zero frame per 100 ms: `chunk_size` is
  20 ms (lib.rs:162), so the stream density is 20%, not 60%.
- The math is size-agnostic, so behaviour is unaffected. Fix the comment, and the P1 fixture to `chunk(20)`, so the
  test models the real stream.

### M-2 MINOR: cost (no effect on tonight's quota gate)

- **Router audio.** Router audio input becomes continuous for the whole session. Before the fix it was roughly speech
  + hangover + 20% of the silent time. On live40, with about 30% speech, router audio tokens rise about 2.2x. At about
  25–32 tokens/s that is still small per minute.
- **Context.** Because Live re-bills the session context every turn (project cost model), the context grows faster.
  `slidingWindow` compression will also trigger sooner, a new path in a long session.
- **Tonight's guard.** The flight's ledger counts requests, not tokens, so the guard is unaffected.
- **Paid tier.** The paid-tier cost model should assume continuous router audio. This matches what router40 and the
  probe actually fed, so the registered design already implied it.
- The ear still receives the thinned stream; its cost is unchanged.

## Safety

Nothing on the display, arbiter or pairing path changed. Two things move:

1. **Faster end-of-turn also means earlier decisions on mid-question pauses.** The thinned stream had been hiding
   these by delaying end-of-turn for seconds. The fixed state matches what router40 and the probe measured (real-time
   silence), so it is the registered behaviour, not a new risk. The re-smoke must still read the Safety half and the
   decisions on long or paused mains, not only the late count (43/47 before).
2. **I-1 above** is the only way the patch itself could produce a fragment decision that the probe conditions never
   could.

## Not shown

- No live session ran on this patch. Whether the router's first word returns to 0.6–1.3 s after Q is proven only by
  the re-smoke. Report the late count side by side: 43/47 before, N/47 after.
- No stall frequency was measured in the app. The impact of I-1 rests on arithmetic, not on an observed case.
- The compression trigger under continuous audio has never run for an hour.

## Re-review

**Scope.** fix1: `reviews/smoke-fix-pad-fix1.diff` (7408aac on bf26b08) and the fix1 section of the report. Tests
re-run from a temp cwd: LiveRouterSession.test.ts 27/27 pass. The tree at live-router contains `isAllZero` and
`lastChunkZero` (LiveRouterSession.ts:39, 56, 113, 133, 137).

**Verdict: SPEC PASS, QUALITY APPROVE.**

### I-1: RESOLVED

**write() (:113-118)**
- A non-zero chunk never carries a pad. It re-anchors `sentEndAt = now − chunkMs`, then `min(+chunkMs, now)`, so real
  audio fills its own time and a stall's debt is dropped, not paid in zeros.
- Only an all-zero chunk (the suppressor's `SendSilence`, zero-filled at lib.rs:201-203) is preceded by padding.
- In a burst of queued speech after a stall, each chunk re-anchors to `now`, so nothing accumulates.

**Timer (:137)**
- It returns early unless the last chunk was all zero. A stall during speech (last chunk loud) therefore sends
  nothing, even when ticks run through the stall.
- `lastChunkZero = true` at up keeps a silent start filled. This is harmless: the first loud write clears it.

**Test I1**
- (a) A stall with no ticks: 11 sends, every byte non-zero.
- (b) A stall with ticks: the send count is unchanged during the stall, and every byte is non-zero.
- (c) Control: the same stall after a zero chunk is padded.
- The report says it was RED before the fix, and the pad-on-loud and timer-pads-loud mutants are killed. Case (c)'s
  `> 6` bound is loose, but it is a control; P1 and P3 pin the amounts.

### M-1: RESOLVED

The comments say one zero-filled 20 ms keepalive per 100 ms. P1 uses `chunk(20)`. P3 and P4 feed zero chunks, which
now correctly model silence.

### Residual (MINOR, no change requested)

- **A stall inside digital silence.** If a stall falls inside a stretch of all-zero frames, such as a hangover over a
  clip's digital silence or keepalives, the first queued zero chunk carries a pad of up to S. The queued zeros then
  follow, so the router hears up to about 2S of silence where S elapsed.
- **Why it is accepted.** This needs a stall during a real pause. Only a pause that ends in speech can mis-fire, and
  the stall would have to last a large part of the roughly 1 s end-of-turn threshold. It is far narrower than I-1,
  which hit speech, and it cannot insert silence inside speech.
- **For the re-smoke:** read the Safety half on paused mains, as already noted.

### Not shown

- Unchanged from the first review: no live session ran, stall frequency is unmeasured, and the late count (43/47
  before) needs the re-smoke.

SPEC: PASS  QUALITY: APPROVE
