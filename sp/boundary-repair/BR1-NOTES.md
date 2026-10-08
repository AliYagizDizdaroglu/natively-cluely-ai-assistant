# br1 notes (working record; the committed result note is written from this)

Run: task `Natively-probe-br1`, MAIN at `0ef42a0`, scenario50 S1+S2, 40 items.
Playback 2026-09-30 13:36:47 to 14:45:30 local. Run folder `2026-09-30T11-45-30-br1`. The app was stopped by the
harness (0 processes at 15:15). Read at 15:21 to 15:31 local; the 14:47 session timer did not fire.

## The boundary repair (DESIGN-v4 section 10.6), `br1-read.mjs`, exit 0

- App repair lines: 1. Reference repairs on the same raw events (rule-v4 replayed): 1. They match.
- The repair: "require" restored before "a customer level holdout?", 13:52:19 local, item S1Q05F.
- The first answer dispatch after it (+1168 ms, source whisper) holds the restored word in place.
- App-only repairs 0. Reference-only repairs 0. Repairs the reference makes only without `clear()`: 0.
- The committed extractor parsed 163 finals with no refusal and replayed the repair (1 of 1).
- The hedge default, live: startup line `on trigger=5000ms`; answers won by 3.5-lite 40, by 3.1-lite 2.

So the repair ran live, once, and did what the rule says. One repair in an hour is thin evidence of benefit; it is
what this roster's audio produced.

## The hour's gate rows (from the launcher log): 5 FAIL, 8 PASS

| row | value | read |
|---|---|---|
| Answered hands-free | 39/39 dispatched, 1 to nobody | S1Q08, below |
| Surfaced detections per question | 1 unclaimed | S1Q08, below |
| Long questions answered whole | 14 of 15 | S1Q08, below |
| Answer TTFT p90 · detect p50 | 11.1 s · 1.4 s (limit 10 s) | four slow answers, below |
| Interview-acceptable answers | not run | expected: the probe has no grading |

### S1Q08 was answered 61 s late

Log lines (UTC in the log; local = +3 h):
- 11:01:29.972 to 11:01:45.049: five Deepgram finals, the whole question. It is an instruction ("Design the
  prediction logging, ..."), with no question mark.
- 11:01:31, :36, :38, :43: four detector calls on the partial text. None emitted a chip.
- 11:01:45.586 `turn: classify finals=5`, then 11:01:45.978 `turn: close reason=not-a-question` (the classify call
  took 391 ms).
- 11:01:46.563 the detector's own call on the full text is issued; 11:01:47.373 `chip emitted: intent=coding
  confidence=0.95`; 11:01:47.374 `dispatch: mark source=whisper verdict=match`. The turn was already closed 1.4 s
  earlier, so the mark answered nothing.
- 11:01:55.383 `turn: close reason=nothing-heard`.
- 11:02:46.018 the Live ear's text arrives: `dispatch: mark source=live verdict=unverifiable`, then
  `turn: gate=8397 finals=0 live=1 finished=true`, then `dispatch: answer source=live`. The answer started 4.1 s
  later.

Reading: the same detection model gave two verdicts 1.4 s apart. The turn machine's classify call said "not a
question" and closed the turn; the detector's call on the same text said "question, 0.95" just after. The mark that
arrived after the close was only logged. The Live ear rescued the question a minute later.

At 05:00 (worktree build, without the repair) the same question was marked on its FIRST final and answered at the end
of the turn, with no classify call.

Not caused by the boundary repair, as far as the log shows: no repair touched this item, and `not-a-question` closes
are in earlier hours too:

| hour | not-a-question closes | classify calls |
|---|---|---|
| s50b, s50c, s50f, s50i | 1 each | 7, 7, 8, 12 |
| s50d | 10 | 12 |
| s50j | 3 | 11 |
| s50e, s50g, s50h, s50k, s50l, s50m | 0 | 3 to 9 |
| h40a / h40b / h40c | 2 / 3 / 1 | 13 / 28 / 20 |
| br1 | 1 | 11 |

NOT yet checked: which of those earlier closes cost an answer, and whether the classify prompt or the race is the
cause. Two candidate causes, neither proven:
1. a race: the turn is classified and closed while the detector's own call on the full text is still pending;
2. the classify prompt is weaker than the detector's on an instruction-form question.
This needs its own debugging pass (reproduce from the recorded finals, test first). It is not part of cue mode.

### Four answers started after 10 s

From the `verbal hedge: won by` lines: S1Q07 (3.1-lite at 12.8 s), S1Q09F (3.5-lite at 20.0 s), S1Q10F (3.1-lite at
10.7 s), S2Q02F (3.5-lite at 13.5 s). The other 38 started between 3.2 s and 7.5 s. h40c's p90 was 6.5 s.
Twice the back leg won, which means the front leg had not produced a token 5.7 s and 7.8 s after the back leg
started. Both models were slow at those moments. That points at the provider, not at the app, but it is one hour and
it is not verified.
