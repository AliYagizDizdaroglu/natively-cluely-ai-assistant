# smoke-fix-pad report

Status: DONE_WITH_CONCERNS. Commit bf26b08 on feat/live-router (parent 9fbdf5b). Staging id smoke-fix-pad.

## Files
- electron/audio/LiveRouterSession.ts (only source file changed; ear and main.ts untouched)
- electron/audio/LiveRouterSession.test.ts (+6 tests, P1-P6)

## Design
- State: `sentEndAt` (wall instant the audio sent so far reaches), `lastWriteAt`, `padTimer`.
- write(): deficit = now - chunkMs - sentEndAt. If deficit >= 20 ms, zeros for min(deficit, 1000 ms) are concatenated before the chunk and sent as ONE message; the capped remainder is forgiven (sentEndAt resyncs). sentEndAt never runs ahead of now.
- Timer: setInterval 100 ms, started at setUp(true) (anchors sentEndAt at "up"), stopped in setUp(false) and stop(). Pads when now - lastWriteAt > 150 ms and the deficit >= 20 ms; also checks generation, up and session before sending. Send errors go to the existing "[Router] write failed" log.
- Constants carry provenance in a comment (cap 1000, floor 20, tick 100, idle 150).
- Clock: the existing injected `now`; timers are the global ones (tests use vitest fake timers, as the file already does).

## Tests
- RED before the change: 5 failed / 21 passed (P1, P3, P4, P5, P6 failed on missing padding; P2 passed, it is the no-padding control).
- GREEN: LiveRouterSession 26/26, routerWiring 24/24 (50 total).
- P1 suppressed stream (1 s speech then 60 ms per 100 ms for 2 s): total within 100 ms of 3000 ms wall. P2 continuous exact and +-10 ms jitter: no pad, 30 sends, exactly 3000 ms. P3 timer fills zeros after writes stop (1900-2100 ms of 2100). P4 cap: after a 10 s gap no send exceeds 1100 ms. P5 nothing before up, none from the old generation after goAway, none after stop(), timer count 0. P6 timer send failure is logged.
- Mutants (script stage\mutants-smoke-fix-pad.mjs): no-pad -> P1,P4 fail; no-timer -> P1,P2,P3,P5,P6 fail; no-cap -> P4 fails. All killed.
- tsc: root exit 0; electron 6 errors, the same 6 baseline (GeminiLiveRouter.ts 125, ipcHandlers.ts x3, KnowledgeOrchestrator.ts x2).

## Concerns
- Two extra mutants SURVIVE: dropping the generation check inside the timer callback, and dropping stopPadTimer() in stop(). Both are redundant by construction (setUp(false) also stops the timer on every down/stop path), so they are belt-and-braces, not untested behaviour.
- Not exercised: a live Gemini session. Whether padding brings the router's first word back to 0.6-1.3 s is unproven; that needs the controller's smoke or probe.
- At up, the stream is anchored at the "up" instant, so the first write may carry up to 1000 ms of leading silence if capture was quiet. Harmless to the model, but the sent audio no longer begins at a speech edge.
- Padding only fixes the router input; main.ts still writes the thinned stream to the same session, and the ear is unaffected (by scope).
- No build, no full suite, no app start, no model call.

## fix1 (review round 1) - commit 7408aac
- I-1: pad only in silence. write() pads only before an all-zero chunk; a non-zero chunk resyncs sentEndAt to its own time (a stall's debt is never paid in zeros). The timer pads only when the last received chunk was all-zero (true at up, so a silent start is still filled).
- M-1: comments and P1 now use the zero-filled 20 ms keepalive (P1 chunk(20)). P3/P4 now feed zero chunks as their "silence".
- New test I1: loud stream then a 600 ms stall (a) with no timer ticks and (b) with ticks, then loud chunks: no zero byte is sent, send count unchanged during the stall; control: the same stall after a zero chunk IS padded. RED before the fix (1 failed / 26 passed), for the right reason.
- Results: LiveRouterSession 27/27 + routerWiring 24/24 = 51; tsc root 0, electron 6 (baseline).
- Mutants killed: no-pad (P1,P4), no-timer (P3,P5,P6,I1), no-cap (P4), pad-on-loud (I1), timer-pads-loud (I1). The two redundant-guard mutants (timer generation check, stop() stopPadTimer) still survive, as the review accepts.
- Not shown: no live session; stall frequency unmeasured; a speech burst after a stall is sent as-is (late, not padded).
