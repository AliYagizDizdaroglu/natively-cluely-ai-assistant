# D2: a late Deepgram final joins the NEXT turn (fix spec, rev 2)

Rev 1 written 2026-10-12 (Opus, read-only). Rev 2 2026-10-12 per D2-SPEC-REVIEW.md (CHANGES). No code, no model call, no .env. MAIN = fix/coding-style-suffix-all-gemini @ e9881c8e (has D1 3737daf); main.ts and DeepgramStreamingSTT.ts line numbers are from MAIN's working tree (not confirmed byte-identical to e9881c8e).
Run: `interview60.runs/2026-10-11T18-43-32-b1-final`. Evidence scripts and output: `fixes/d2-evidence/` (ids, counts, timings only).

## Changelog rev 1 → rev 2

| finding | fix in rev 2 |
|---|---|
| R1 dispatched ≠ answered | `lastClosed.answered`, set only by main's **answer branch** of `dispatchDetection` (l.2201–2205, the `dispatch: answer` log line) via a new `turn.answered(turnId, at)`; G9 added (§2 B.2, §3) |
| R2 a real follow-up can be eaten | absorb also requires **no voice-on in (dispatchAt, closedAt]** (VAD `speech(true)` or Deepgram `speech-started`) and **the final's text unchanged since before the close**; G8 (fails on rev-1 B) and G10 added |
| R3 replay bar blind to R1/R2 classes | §4 states the census holds no organic G8/G9 case; those rest on synthetic guards only; replay "answered" comes from the D1-modelled deduper's answer decisions, not the machine's `dispatch` |
| R4 onset in main.ts | onset (and last-change time) computed per socket inside `DeepgramStreamingSTT`, `stale()`-gated like the socket-flap fix; field optional; absent → never absorbs |
| M1 calibration mis-aimed | §3 calibration rewritten per rule clause |
| M2 empty final resets onset | named in §5 |
| M3 audio-clock onset | named in §5 as follow-up |
| M4 chip tagging | kept the 5 s window; tagging named in §5 |
| M5 liveHold on absorbed final | named in §5 |
| M6 GoogleSTT | named in §2 B.1 and §5 |

## 1. Root cause

**Timeline (UTC, word counts only):**
- RH02 plays ~18:38:24. Live hears it (6 w) at 28.469; the turn dispatches Live-only at 29.004 (`gate=3700 finals=0 live=1`), and the pre-D1 build dropped that dispatch (`dispatch: drop … duplicateOf=live`), so **RH02's turn was never answered in this run**.
- Deepgram's first non-empty interim (3 w) is at **30.461**; it repeats unchanged at 35.921, 41.349, 46.415 and does not finalize. 37.010: `close reason=continuation-expired`. 46.435: RE15's speech-started opens a new turn.
- **47.449**: the 3-word final arrives, 17.0 s after its own interim onset and 1.0 s into RE15; its chip (48.073) marks the new turn. RE15's 12-word final at 49.656. Dispatch at 50.212, `finals=2`: 15 w = 3 + 12.

**Where it happens in the code:**
- `interviewerTurn.ts` `final()` (l.188) does `reopenIfStale` then `open(at)` and pushes the text onto whatever turn is open now; `textOf()` (l.155) joins that turn's finals verbatim into the dispatch text, which `turnDispatchInput` uses as `question` and `anchor`.
- The whisper chip on the late text goes through main.ts's mark block (l.2137–2147). `turn.detected()` marks the new turn, and `pickTurnDetection` keeps that chip as the turn's base detection, so its intent rides along too.

**Why nothing recognises it:**
- The machine keeps no record of a closed turn (`turn = null` at l.226/230/249/259; `reopenIfStale` l.150). This is the same forgetting the 2026-10-01 DIAGNOSIS names.
- A final carries only its arrival time. main.ts's transcript handler (l.1254) calls `turn.final(text, Date.now())`; the client discards when Deepgram first showed those words.
- The machine does not know whether its dispatch was answered: `dispatchDetection` can still drop or hold it (`isFragment` l.2128, `liveHold` l.2150, `looksFragmentary` l.2165, chipDeduper l.2180).

**Upstream trigger (not fixed here):** Deepgram held the interim 16 s without endpointing (`endpointing: 300`, `utterance_end_ms: 1000` set). `DeepgramStreamingSTT.finalize()` exists but is only called for the user mic (main.ts:1935).

**How often (rev 1, 36 run logs, 4215 non-empty finals; `d2-straddle.mjs`):** onset→final lag p50 2835 ms, p90 4036, p99 7054; 138 over 5 s. 10 finals on 9 items straddle a `turn: close`: 1 behind `continuation-expired` (RH02 → RE15 = D2), 9 behind `not-a-question` (s50i S2Q09, s50j S1Q10F, cuesmoke S1Q08F, h40d R19/R23/R31×2/R32/R33).

**Rev-2 rule census (`d2-rev2-count.mjs`, 33 logs under `interview60.runs`, 3961 finals; the 3 logs outside that root were not re-read):**
- As logged (pre-D1 answers): 10 straddles, **0 absorbed**. RH02's turn has no `dispatch: answer`, so rev 2 leaves RE15 as today: correct, the question is not lost (a G9 shape, created by the D1 bug).
- With D1 approximated (a turn dispatch the log shows dropped counts as answered): 2 straddles behind an answered turn; h40d R23 is rejected by the voice clause; **1 absorbed: b1-final RE15** (3 w, onset 6549 ms before the close).
- Voice in the census is Deepgram `speech-started` only (VAD transitions are not logged); the replay (§4) checks VAD from WAV spans.

## 2. Candidate fixes

| | fix | for | against |
|---|---|---|---|
| A | Send Deepgram `Finalize` on our VAD's interviewer voice-off | Attacks the 16 s stall at its source. The method already exists | Unproven: we do not know if Finalize flushes a lagging server, or whether it splits a mid-question pause (boundary repair). It shrinks lateness but cannot guarantee it. Needs a spike against the real socket |
| B | **Onset provenance.** A final carries its interim onset. Absorbed only if its words were already showing before the close of a turn that was answered and heard no new voice | Keyed on event order and ear events, no cross-turn text match, no tuned window. In the census it changes exactly 1 final (with D1) | Only covers answered predecessors with a quiet tail. A late final whose own first interim lags past the close is not caught (no worse than today). Plumbing through client → main → machine and the fixture |
| C | **Text match** against recently dispatched/heard items | No STT plumbing | No clean window (RH02 19 s after Live, 38 s after the last answer); Live paraphrases; **eats real short re-asks and follow-ups**, the class D1 just stopped dropping |
| D | DIAGNOSIS §7 in full | Covers D2, the 9 not-a-question straddles and the Live late echo | Larger, unmeasured statement risk; its own spec queue |

**Recommended: B.** Its memory (`lastClosed`) and the onset field are the plumbing D's part 1 needs anyway.

**B in detail:**

1. **`DeepgramStreamingSTT` (per socket, R4).** Next to `boundaryRepair` (l.205), keep per-socket `onsetAt` = arrival time of the first non-empty interim since the last final, and `changedAt` = arrival time of the last interim whose normalized text differed from the previous interim. Both are socket-local, so a restart's new socket starts empty, and the `stale()` guard already stops an old socket's handlers. On a final: emit `onsetAt` and `textSinceAt` (= `changedAt` if the final's normalized text equals the last interim's, else the final's own arrival time) on the `transcript` event, then reset both (empty finals included, see §5 M2). Both fields optional: GoogleSTT and any other STT omit them.
2. **main.ts.**
   - Transcript handler (l.1254): `turn.final(text, at, { onsetAt, textSinceAt })`. Missing fields → pass nothing, and the machine never absorbs (G4, true by construction).
   - **The "answered" signal (R1):** the answer branch of `dispatchDetection` (l.2201–2205: `turnDedupId = verdict.id`, `chipDeduper.markAnswered`, the `live-question` broadcast, logged `dispatch: answer`) also calls `this.turn.answered(d.turnId, Date.now())`, next to `routerWiring.answered(d.turnId)`. That is the one place an answer is committed to the screen; drops (`isFragment`, chipDeduper) never reach it, and holds (`liveHold`, `looksFragmentary`) reach it only if and when they resolve to an answer. A supersede of an answered turn needs no call (already answered); R21's re-routed supersede reaches the answer branch itself.
   - Deepgram `speech-started` handler (l.1269): also `this.turn.voiceHeard(Date.now())` (records only; opens nothing).
3. **interviewerTurn.ts.**
   - `answered(turnId, at)`: sets `answeredAt` on the open turn if its id matches, else on `lastClosed` if its id matches (a held answer can land after a `reopenIfStale` close inside `final()`); otherwise ignored, which only ever makes B decline.
   - Voice: `speech(true, at)` and `voiceHeard(at)` record `lastVoiceOnAt` (machine-wide).
   - On every close, including `reopenIfStale`'s silent replacement: `lastClosed = { id, closedAt, dispatchAt, answeredAt, voiceAfterDispatch }`, where `voiceAfterDispatch = lastVoiceOnAt > dispatchAt` (any voice-on in (dispatchAt, closedAt]). Replaced at the next close, cleared by `reset()`. `answeredAt` can still be filled in after the close (above).
   - In `final()`, before `reopenIfStale` / `open`: return `'absorbed'` (push nothing, open nothing, leave `lastSpeechAt`) iff all hold:
     - `onsetAt < lastClosed.closedAt` (strict) — the words were showing before the close;
     - `lastClosed.answeredAt !== null` — **G9**: a dropped or held-and-never-answered turn never absorbs;
     - `!lastClosed.voiceAfterDispatch` — **G8**: any new speech after the dispatch means the words may be a new question;
     - `textSinceAt < lastClosed.closedAt` — **G10**: the final adds nothing beyond the stalled interim, so no new speech was merged into it after the close.
     Otherwise behave exactly as today and return `'joined'`.
4. **main.ts on `'absorbed'`:** log `turn: late-final absorbed words=N onsetBeforeCloseMs=M` (no text) and remember the absorbed final's `{text, at}`. In the mark block, a whisper detection whose normalized question is contained in an absorbed final no older than `CROSS_DETECTOR_MS` (5 s) is logged `dispatch: drop … verdict=late-final` and marks nothing (helper in `turnDispatch.ts`). Why 5 s: detect latency over 4826 calls p50 561 ms, p99 1926, p99.9 3274, max 8016; 1.5 s debounce + 3.3 s fits; a detection slower than ~3.5 s still marks.
5. **Precondition: D1 in the build.** Without D1, RH02's turn is dropped, never answered, and rev 2 correctly declines (G9); D2 stays unfixed but nothing is lost. MAIN e9881c8e has D1.

## 3. Tests (failing first; synthetic stand-ins, same word counts, timings relative to RH02's Live dispatch T = 0)

**New `interviewerTurn.lateFinal.test.ts`.** Every scenario drives `answered()` explicitly where the turn is answered.

**R1 (fails today): the b1-final sequence with D1.**

| time (s) | event |
|---|---|
| −4.2 → −3.7 | voice |
| −0.5 | Live claim, 6 w; then a mark |
| 0 | dispatch; `answered(id, 0)` |
| 8.0 | close |
| 17.4 | voice on |
| 18.4 | final, 3 w, onset +1.5, textSince +1.5 |
| 19.1 | whisper mark, 3 w |
| 20.7 | final, 12 w, onset +19.5 |
| 21.1 | mark |
| 21.2 | voice off; then the gate |

Assert one dispatch with exactly the 12-word stand-in, `finals=1`. Today: 15 w, `finals=2` (an extra argument is ignored on old code, so it runs red rather than failing to compile).

**Guards (pass before and after unless marked):**
- **G1.** Onset after the close (+17.5). Joins: 15 w. Only provenance absorbs.
- **G2.** A real repeat: word-identical to the answered turn, onset after the close. Joins and dispatches. No text matching.
- **G3.** Predecessor closed `not-a-question` / `nothing-heard` (never dispatched), onset before the close. Joins.
- **G4.** No onset fields (no interim, or GoogleSTT). Joins.
- **G5.** Boundary: `onsetAt == closedAt` joins; `closedAt − 1` absorbed.
- **G6.** A `reopenIfStale` replacement records `lastClosed` (answered). Absorbed. Fails today.
- **G7.** A statement turn: absorbed final plus its chip, no question of its own. Never `detected`, never dispatches. Fails today.
- **G8 (R2, must FAIL on rev-1 B).** Answered at T; voice on T+5, off T+6.5; interim onset T+6; no final within `wordlessGraceMs`, so `continuation-expired` closes at ~T+9.5; final at T+10 with onset T+6. Must join and dispatch as its own turn. Rev-1 B (`dispatched && onset < close`) absorbs it → red; rev 2 (voice-on after dispatch) → green.
- **G9 (R1).** Turn dispatches, the dispatch is dropped (no `answered()`), or held and `answered()` never comes; late final with onset before the close. Must join, so the question is answered. Also: held, then `answered()` lands after the close → absorbed (the id-matched late answer).
- **G10.** Answered, quiet tail, stalled interim onset before the close, but the final's text changed after the close (`textSince` > close: new speech merged in). Joins.
- **Helper unit tests.** Chip contained in the absorbed text at 4.9 s → drop; 5.1 s → mark; a different chip at 1 s → mark.
- **Client unit tests (`DeepgramStreamingSTT`).** onset/textSince per socket: reset on every final (empty included); a restarted socket's first final carries its own socket's onset only; a stale socket emits nothing.
- **Calibration (M1).** Break `<` → `<=`: G5 flips. Drop the answered clause: G9 flips. Drop the voice clause: G8 flips. Drop the textSince clause: G10 flips. Each must go red.

**Fixture builder (`interview60.turns-fixture.mjs`).** Add `onsetAt` and `textSinceAt` per final (same definitions as the client, from `Transcript event` lines), Deepgram `speech-started` times, and the logged `dispatch: answer` times; write a b1-final fixture with a measured offset (DIAGNOSIS §8 method); `interviewerTurn.replay.test.ts` passes them through. New row: b1-final RE15 (with D1) dispatched once without RH02's words. Red before the fix.

## 4. Regression: replay over all recorded runs

**Setup.** Fixtures (finals with onset fields, detections, WAV voice spans, speech-started) for every run log with Deepgram events (36 today; holdout logs read for ids and timings only). Replay through the old and new machine plus the real ChipDeduper with D1. **"Answered" comes from the replayed `dispatchDetection` decisions (deduper + holds modelled to match the log's `dispatch: answer` lines), never from the machine's `dispatch`** (R3). Attribute every decision by play window (`windowOf`); compare per item: dispatch count, words, time, close reasons, `absorbed` events.

**Calibration first.** The old machine reproduces b1-final's logged events within the offset error (close 37.0; RE15 dispatch 50.2, 15 w). A logged straddle the replay's closes do not reproduce is reported, never counted as "no change".

**Bar: PASS only if all hold:** exactly 1 absorbed final (b1-final RH02 → RE15); RE15 15 → 12 w, still once, time ±50 ms; 0 other differences on any item; the 9 not-a-question straddles unchanged. Any other difference = FAIL: report run, item and onset-before-close, and stop. Do not tune.

**What the bar cannot see (R3).** The census holds **no organic G8 case** (a follow-up barge-in behind a stalled final) and **no organic G9 case once D1 is modelled** (the only dispatched-but-unanswered straddle is b1-final itself, and only because of the pre-D1 drop). The replay therefore covers only the census classes; G8, G9 and G10 rest on the synthetic guards alone. That is a residual risk, not part of the PASS.

**Then a live exercise** at the next smoke or flight: grep `turn: late-final absorbed` and `verdict=late-final`, confirm one dispatch per follow-up window. If Deepgram does not stall that hour, the exercise did not reach the rule; say so, do not count it.

## 5. What this does NOT cover

- **Live late echo** (cue smoke S1Q08, 76 s; br1). A Live claim has no onset. Needs DIAGNOSIS part 2.
- **The 9 not-a-question straddles.** Declined, not answered, so they stay as today; rejoining them needs part 1 (reuses `lastClosed` + onset).
- **Cross-item finals with no close in between** (16 in the logs). They join the open turn as a supersede.
- **The Deepgram stall itself** (fix A), and any late final whose own first interim already lags past the close.
- **M2.** An empty final mid-stall resets the onset; if the same interim then repeats, its onset moves past the close and D2 is missed (none in b1-final between 30.461 and 47.449). Coverage gap only; safe direction.
- **M3.** Deepgram's `start`/`duration` (audio-stream seconds) would give when words were spoken, not when the interim arrived; mapping to wall time needs socket-open time + `sockBytes` and a spike on keepalive gaps. Follow-up.
- **M4.** Tagging the chip with the id of the final that issued it would replace the 5 s window and cover the 8016 ms max. Optional follow-up.
- **M5.** `liveHold.onInterviewerFinal()` (l.1252) still runs on an absorbed final; it only resolves a held Live claim early. Intended.
- **M6.** Interviewer STT other than Deepgram (GoogleSTT) emits no onset and never absorbs.
- **Voice clause cost.** Any voice-on after the dispatch (including a loopback blip or the interviewer's own "mm-hm") disables absorption for that turn; that keeps the bug, it never loses a question.
- **Answered ≠ answer delivered.** `answered` is set at the answer branch; if `answerDetection` later fails (auth, stall abort), the turn still counts answered and a late tail is absorbed. The question text is already on screen as the `live-question` bubble.
- **Not shown:** no replay has run; the census used `speech-started` as the only voice signal (VAD unlogged), approximated D1 from the log, and re-read 33 of the 36 logs; the 5 s mark-drop window misses a detection slower than ~3.5 s; absorbed words stay in SessionTracker's transcript context; in suggest mode the late chip is still shown.
