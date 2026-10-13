# D2-SPEC review

Reviewer: Opus, 2026-10-12. Read-only: no model call, no .env, no code edit. Read: D2-SPEC.md; MAIN `electron/services/interviewerTurn.ts` (e9881c8e via the shared object store), MAIN working tree `electron/main.ts` (transcript handler l.1214–1257, turn decisions l.1015–1050, `dispatchDetection` l.2125–2185), `electron/audio/DeepgramStreamingSTT.ts` (l.88–130, 195–265); b1-final log 18:38:22–18:38:51Z (event types and timings only, text redacted).

**Verdict: CHANGES.** The mechanism is right, and it is the right size. Two of its inputs are wrong: "dispatched" is not "answered", and "onset before close" does not show that the words belong to the closed turn. Each one can lose a real question. Neither failure mode is in the 36-log census, so the replay bar cannot catch them.

## Required

**R1. Key on "answered", not on the machine's `t.dispatched`.** A machine `dispatch` is not an answer. `dispatchDetection` can still drop it or hold it:
- `isFragment` drop for a Live text under 4 words (l.2128). It runs before the `turnDispatch` branch, so a Live-only turn dispatch like RH02's goes through it.
- the unverifiable `liveHold` (l.2150);
- the `looksFragmentary` hold (l.2165), which can end in a drop;
- a chipDeduper drop (l.2180).

The evidence run shows this exact gap. At 29.005, RH02's turn dispatch logged `dispatch: drop … verdict=unverifiable duplicateOf=live answered=true`, while the machine went on to treat the turn as dispatched. D1 fixes that one path; the others remain. If a dispatch is dropped or held and the late final carries the question, B absorbs it and the question is lost. Today it would at least be answered as a prefix.

Fix: main.ts already knows when an answer went out (`turnDedupId` is set, see R21 at l.1030–1037). Main tells the machine, e.g. `turn.answered(id)`, and `lastClosed` records `answered`, not `dispatched`. The flag has to live in the machine because `reopenIfStale` closes the turn inside `final()`, before main can sync.

Add guard **G9**: the turn dispatches, the dispatch is dropped as a fragment or held, and the late final has onset before the close. It must join.

**R2. A real new question can be eaten (hunt item 2), so add a voice discriminator and a guard for it.** The interim onset is the arrival time of the first interim, which already lags the speech. It does not show that the words came from the closed turn's speech. A concrete path exists in today's machine:
1. The answer goes out at T.
2. The interviewer starts a short follow-up at T+5 and stops at T+6.5 (VAD). The first interim arrives at ~T+6.
3. Deepgram stalls: no final within the 3 s `wordlessGraceMs`. `effectiveStopAt` then returns −∞, and `continuation-expired` closes the turn at ~T+9.5 (l.145, l.248).
4. The final arrives at T+10 with onset T+6, which is before the close, so B absorbs the follow-up and drops its chip. Today it opens a new turn and is answered.

This needs a final lag over 3 s past voice-off. That is rare normally (voice-off → final p99 1.0 s), but it is exactly the stall regime D2 exists for. Onset→final lag is p90 4.0 s.

Fix (smallest): also record on `lastClosed` whether the closed turn saw any voice-on after its dispatch, from our VAD `speech(true)` or Deepgram `speech-started`. Absorb only if `answered && !voiceAfterDispatch && onsetAt < closedAt`. In b1-final no speech-started fell between 29.0 and 46.4, so D2 is still caught. A loopback blip only makes B decline, which is the safe direction.

Add guard **G8** for the path above. It must join, and it must fail on the spec's B as written. That proves the guard can fail.

**R3. The replay bar is not calibrated for R1/R2's failure modes (hunt item 4); say so in the bar.** "Exactly 1 absorbed; only RE15 changes" is meaningful against the census: it would show B wrongly absorbing the 9 not-a-question straddles. Per §1, though, the logs hold no dispatched-but-unanswered straddle and no barge-in straddle. So a B that eats real questions in those cases still passes the bar. State that the replay covers only the census classes, and that G8/G9 are the only evidence for the dangerous ones. Also, the replay's "answered" must come from the log's `dispatch: answer` lines (or a deduper and holds modelled to match), not the machine's `dispatch`. Otherwise R1 is invisible to it.

**R4. Compute the onset inside `DeepgramStreamingSTT`, per socket, not in main.ts.** main.ts never sees a socket restart, and the client emits no restart event. The client already keeps per-socket state the same way (`boundaryRepair`, the `stale()` guard). Track "first non-empty interim since last final" there, with `stale()` respected, and emit `onsetAt` on the `transcript` event. Make the field optional: GoogleSTT and any other STT omit it, and main falls back to `onsetAt = at`, which joins (G4). This also makes "no interim → never absorbs" true by construction.

## Minor

- **M1. The calibration step is mis-aimed.** Changing `<` to `<=` cannot change R1 (onset +1.5 vs close +8.0). It changes only G5. Say "break `<` → G5 flips; drop the answered check → G3/G9 flip; drop the voice check → G8 flips".
- **M2. The onset is lost on an empty final.** The onset resets on every final, empty ones included (median 187 per log). If Deepgram sends an empty final mid-stall and then repeats the same interim, the onset moves past the close and D2 is missed. b1-final had none between 30.461 and 47.449, so D2 is still caught; it is a coverage gap only. Note it in §5.
- **M3. A more trustworthy onset exists.** Every Deepgram result carries `start`/`duration` in audio-stream seconds, and the client discards them. Mapping them to wall time needs socket-open time plus bytes sent (the client already counts `sockBytes`). That clock gives when the words were spoken, not when the interim arrived. It would make R2's check direct ("spoken before the closed turn's last voice-off + gate"). It needs a spike against keepalive gaps and buffer flushes, so treat it as a follow-up, not part of B.
- **M4. Tag the chip, not a 5 s window.** The late chip came from the absorbed final's own fast-path detect (47.453 detect, 48.073 mark). If the detection carried the id of the final that issued it, the drop would need no window and would also cover the 8016 ms max. That is optional; the 5 s window is acceptable.
- **M5. `liveHold.onInterviewerFinal()` (l.1252) still runs on an absorbed final.** That is probably fine: it resolves a held Live claim early. Say so in §5 next to the SessionTracker note.
- **M6. Name the GoogleSTT path.** Interviewer STT may not be Deepgram. Under R4 it never absorbs; state it.

## Hunt answers in one line each

1. **Onset:** it is available (every interim reaches the handler on the same `Date.now()` clock), but it is interim arrival time, not speech time. Restart handling belongs in the client (R4). The no-interim fallback is safe.
2. **Barge-in:** yes, B can eat it via the wordless-grace close (R2).
3. **Unanswered predecessor:** an undispatched one joins (G3, fine). A dispatched-but-dropped or held one is lost (R1).
4. **Tests:** R1 fails for the right reason (15 vs 12 words, `finals=2`). The guards miss the two risky cases (G8, G9). The replay bar cannot see them (R3). The calibration is mis-aimed (M1).
5. **Simpler:** nothing safer and smaller. Fix A still needs its spike. M3 is the cleaner long-run onset.

Not shown: nothing was run. The R2 path is reasoned from the code, not observed in a log. MAIN's working tree was read for main.ts and the STT client; it was not confirmed byte-identical to e9881c8e (interviewerTurn.ts was read at e9881c8e).

## Re-check 1 (rev 2)

Opus, 2026-10-12, read-only (spec rev 2, this review, d2-rev2-count.mjs; greps of MAIN working tree main.ts, interviewerTurn.ts, DeepgramStreamingSTT.ts; census re-run with --d1). Budget: 9 tool calls (3 refused by the worktree guard).

**Verdict: APPROVE**, with two minor text fixes below (no re-review needed).

- **R1 fixed and feasible.** main.ts l.2202-2205 is the answer branch (turnDedupId = verdict.id, then routerWiring.answered(d.turnId)); d.turnId is in scope there, so turn.answered(d.turnId, now) is a one-line addition. G9 covers drop, held-never-answered and held-answered-after-close.
- **R2 fixed and feasible.** The machine already receives speech(active, at) (l.67/180) and main has the Deepgram speech-started handler (l.1269), so lastVoiceOnAt is recordable from signals the machine actually gets. G10 (textSince) is an added safe-direction clause.
- **G8 genuinely fails on rev-1 B.** Walked against the code: voice off T+6.5 sets lastSpeechAt; effectiveStopAt (l.145) returns -inf once 3 s grace passes (T+9.5), and l.248 closes continuation-expired at T+9.5 (now - T >= 8 s). Onset T+6 < close, dispatched -> rev-1 B absorbs (red); rev 2 sees voice-on T+5 > dispatch T -> joins (green).
- **R3 fixed** (§4 "What the bar cannot see"; replay answered from modelled dispatch decisions).
- **R4 fixed and feasible.** DeepgramStreamingSTT keeps per-socket closure state (boundaryRepair l.205, stale() l.199, emit transcript l.247); onsetAt/changedAt fit beside them. Absent fields -> never absorbs.
- **Census reproduced:** --d1 over 33 logs: straddle 10, answered 2, noVoice 1, absorbed 1 (b1-final 18:38:47.449, 3 w, onset 6549 ms before close); h40d 11:20:40.939 rejectedBy voice.
- **h40d R23 voice reject:** NOT verified whether the speech-started was new speech (redacted timeline read was blocked by the guard). Rejecting is correct either way for safety: a reject keeps today's join, so nothing can be lost; at worst a D2-class merge stays unfixed there. The bar's "0 other differences" is unaffected.

**Minor (text only):**
- **N1. Ordering of voice record vs close snapshot.** If reopenIfStale runs inside speech(true, at) and lastVoiceOnAt is recorded first, the (dispatchAt, closedAt] interval includes the new turn's own voice-on at closedAt, so a speech-triggered stale close never absorbs. Safe direction; say which order (snapshot before recording) or make the interval open at closedAt, and note it in G6.
- **N2. boundaryRepair rewrites text.** The emitted final is the repaired text (l.242); textSinceAt compares against the last interim. Specify that both sides are compared after the same normalization (raw interim vs raw final), or a repair forces join (safe, but G10's meaning shifts).

Not shown: no tests run; main.ts/STT read from MAIN working tree, not confirmed byte-identical to e9881c8e; R23's voice event content not inspected.
