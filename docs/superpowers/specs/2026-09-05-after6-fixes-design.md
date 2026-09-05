# After6 fixes: Deepgram socket flap, budget floor, dropped first character — Design

Parent specs: `docs/superpowers/specs/2026-09-04-answer-what-was-asked-design.md`,
`docs/superpowers/specs/2026-09-05-after5-fixes-design.md`.
Approved by the user on 2026-09-05: "go ahead with the budget floor change and the flap and
other enhancements on weak and wrong answers".

## Goal

Remove the three measured causes of weak and wrong answers left after the after6 proof hour
(46 acceptable, 5 weak, 1 wrong of 52; gate needs ≥ 47 and 0 wrong), without touching the
question pipeline the last two specs proved, and re-fly the same hour on Deepgram.

## 1. Evidence (run `interview60.runs/2026-09-05T13-50-01-after6`, Deepgram STT)

| Cause | Measured | Answers it cost |
|---|---|---|
| Deepgram socket flap | 308 server closes (code 1011) in the hour, one every 12.1 s, 14 empty finals, 3 fragment chips; the `stt` gate row red on every Deepgram hour since 2026-09-02 | H04 wrong (the sentence head was dropped with an orphaned socket; the tail "How do you approach that?" was answered) |
| 80-word budget with a 40-word floor | 40 of 57 spoken answers were cut; a sentence that starts after the floor and would cross 80 is dropped whole. 37 of the 40 dropped sentences started before 80 words | all six non-acceptable answers were cut at 40–72 words (H02 at 40, H01 at 50); five of the six were acceptable uncut in the answer-only arm; cut=yes graded acceptable 31/37 against cut=no 15/15 |
| First character of the answer lost | 14 of 57 delivered answers begin "’d start by…", "o, my initial thought…", "o manage…" (17 of 83 answers on 2026-09-05; 29 of 215 on 2026-09-03) | judge reasons "Leading word dropped" on H01 and H03 (delivery 1); every affected answer opens ungrammatically when read aloud |

Root causes, each reproduced outside the flight (scratchpad, read-only or throwaway):

- **Flap.** `DeepgramStreamingSTT.connect()` attaches Open/Close/Error handlers that act on
  instance state (`isOpen`, timers, counters, reconnect) without checking that the event
  belongs to the current socket. `main.ts` locks the sample rate from the first capture chunk
  (16000 → 48000, ~2.5 s after `start()`), which calls `restartStream()` → `stop()` →
  `connect()`; the first socket's handlers stay live. Its close — code 1000 from
  `requestClose()`, or 1011 twelve seconds later when it was still connecting at the restart
  and opened idle — marks the new socket closed, clears its keepalive and reconnects; the new
  socket, now orphaned and receiving no audio, is closed by the server 12 s later with 1011,
  whose handler orphans the next one. Every "socket #N lived 10.4 s — 274 chunks … last send
  0.0 s before close" line in the after6 log is the *previous* socket's close reading the
  current socket's counters. Reproduced with the built class driven as `main.ts` drives it
  (`repro-flap.cjs`): 3 closes with 1011 in 45 s, one per 12 s, starting 12 s after the first
  socket's 1000. The 2026-09-02 standalone runs never restarted, so they never saw it.
- **Budget.** Parent spec §4: a sentence starting at or past `floor` (40) is buffered and
  dropped if it would cross `limit` (80). The floor was chosen against a 97-word in-app median
  on 2026-09-04; on after6 it is the mechanism that removed the "fix" half of otherwise
  correct answers.
- **First character.** `WhatToAnswerLLM.filterCodeFences` keeps a 3-character carry across
  chunks with `carry = combined.slice(combined.length - CARRY_LEN)`. When the first chunk is
  shorter than the carry, the negative index drops its leading characters: Gemini's opening
  chunk is regularly two characters ("I’", "So", "To", "An" — measured on the raw stream,
  `probe-first-chunk.cjs`), so "I’" becomes "’". One-character and three-character openings
  survive, which is why "I structure…" answers are intact. Reproduced through the real
  `generateStream` chain: `['I’', 'd start…']` → "’d start…"; `['So', ', my…']` → "o, my…".

## 2. Fix E — Deepgram socket generation gating (`electron/audio/DeepgramStreamingSTT.ts`)

`connect()` captures the socket it creates (`const live = deepgram.listen.live(...)`,
`this.live = live`) and every handler it attaches first checks `this.live !== live`
(a stale socket — one that `stop()` or `restartStream()` has replaced):

- Open on a stale socket: log `[DeepgramStreaming] Stale socket opened after a restart —
  closing it`, call `live.requestClose()`, return. Nothing else runs — no counter reset, no
  Transcript registration, no keepalive interval.
- Close on a stale socket: log `[DeepgramStreaming] Stale socket closed (code=<code>) —
  ignored`, return. The current socket's `isOpen`, timers and reconnect state are untouched.
- Error on a stale socket: return.
- Inside the Open handler the captured `live` (not `this.live`) receives the Transcript
  registration and the buffered-audio flush, so the handler can never touch another socket.

Unchanged: the per-socket summary line (now correct by construction — only the current
socket's close prints it), reconnect backoff, the keepalive interval, `stop()`'s graceful
`requestClose()`, and `main.ts` (a restart on any config change stays safe).

## 3. Fix F — budget floor (`electron/llm/WhatToAnswerLLM.ts`, `electron/llm/verbalStreamFilter.ts`)

`SPOKEN_WORD_FLOOR` becomes 80 (equal to `SPOKEN_WORD_LIMIT`): every sentence that starts
under 80 words streams whole; the sentence in progress at 80 finishes and the answer ends at
the next sentence boundary. The hard ceiling (2 × limit = 160, no-terminator answers) is the
backstop. `cutAtWordBudget` and its `floor` option are unchanged; its doc comment gains the
floor-equals-limit reading.

Expected effect, from after6: 37 of the 40 cut answers would have finished their sentence;
delivered length rises from p50 65 toward the raw distribution's next sentence end (about
80–100 words; a 30-word sentence in progress at 80 ends at ~110). This is the trade the user
chose over dropped second halves. It is measured, not assumed: the flight's budget row and
the arm comparison report the new lengths.

Harness row `budget` (`interview60.metrics.mjs`) states the new policy:
- new metric `cutShort` = budget lines with `cut=yes` and `words < 80` — under floor 80 a cut
  answer always has ≥ 80 words, so this is 0 by construction and non-zero if the old floor
  is somehow back;
- pass = `n > 0 && n ≥ ⌊0.9·delivered⌋ && cutShort === 0 && p50 ≤ 100 && max ≤ 130`
  (100 ≈ the pre-budget raw median: the cut must still exist; 130 = a 50-word sentence
  in progress at 80, pathological);
- label "Spoken answers: the sentence in progress at 80 words finishes (ceiling 160)";
  `before` "40 of 57 cut at 40–79 words (after6)"; show adds `${cutShort} cut under 80`.

## 4. Fix G — first character (`electron/llm/WhatToAnswerLLM.ts` `filterCodeFences`)

`carry = combined.slice(Math.max(0, combined.length - CARRY_LEN))` — a chunk shorter than
the carry is carried whole. Fence suppression and stray-backtick stripping are unchanged.

## 5. Proof

Unit (`npx vitest run electron`): the tests in the plan plus the existing suite (423 green
before this spec). Type gates unchanged (`npx tsc --noEmit -p tsconfig.json` and
`npx tsc --noEmit -p electron/tsconfig.json`: the six pre-existing electron errors, none added).

Standalone, before the flight: `repro-flap.cjs` against the rebuilt `dist-electron` class —
before this spec 3 closes with code 1011 in 45 s (connects 6); after: 0 closes with 1011,
connects 2 (the 16 kHz socket and its 48 kHz replacement), the replacement alive at 45 s.

Live: `NATIVELY_STT_PROVIDER=deepgram node electron/test/golden/interview60.flight.mjs after7`,
launched outside the Claude sandbox (README "Unattended flight" scheduled-task recipe) after
the Gemini quota reset (07:00 UTC 2026-09-06). Pass: the harness gate — quality ≥ 47
acceptable and 0 wrong, `stt` row PASS (closes ≤ 5, lost utterances 0, fragment chips 0),
`budget` row PASS under the new policy, `pinned` PASS, `heard` ≥ 51/52 — and 0 delivered
answers whose first character is a lowercase letter or an apostrophe. Graded by Opus
subagents exactly as after5 and after6 were; the report of record and the flight artifact are
republished and committed.

## 6. Not in this spec

- **A supersede rule** (a short answered question followed within seconds by the other ear's
  whole sentence, dropped today as duplicate-answered). Measured on after6: 6 such pairs;
  the short answer graded acceptable in 5 (W04, W05, M15 c2 t2 d2; M20 and H03 d1) and wrong
  in 1 (H04, caused by the flap). After5's four weak short heads (W09, M11, H03, H10) are the
  head-fragment class the after5 spec's Fix B now holds. A supersede would answer those five
  acceptable questions twice for one rescue that Fix E removes — re-measure after this flight.
- The deduper's 4-shared-word threshold (M21 class): 0 doubles on after6.
- Prompt-assembly length inflation (in-app raw answers ~55 % longer than the bare prompt's):
  the floor change makes the delivered length depend on it; measured by the flight's budget
  row against the arm, decided afterwards.
- `run.mjs auto` retrying a permanently failing STT preflight for 45 min (cost two after6
  launches): harness robustness, separate.
- Parked from earlier reviews: `IntentClassifier` duplicate intro list; comma-joined
  scenario + intro; apostrophe in the head rule's last-word normalisation.
