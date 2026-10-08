# SPEC: the 3.8 Live router as the app's default extension (router-default), rev 3

- **First version:** written 2026-10-06 19:13 TST (`date`) by the Opus spec author, recording the design the user
  approved section by section in chat on 2026-10-06. That version is kept unchanged as `SPEC.rev1.md`.
- **Rev 2:** written 19:28 TST, kept as `SPEC.rev2.md`. It applied the user's answers to rev 1's §12, relayed by the
  coordinator:
  - the reconnect fix rides along;
  - the roster is live40;
  - Live streams to screen, routed on its first word;
  - a second INCONCLUSIVE gets no automatic outcome.
- **Rev 3 (this file):** applies the user's answers to rev 2's §12:
  - the live40 harness is built today (§7.4);
  - the no-regression baseline is the in-hour shadow plus an absolute gate, with router40's L arm reported beside it;
  - the speed bar is first visible text p50 ≤ 2.5 s after the question ends.
- **Conventions:**
  - Where the approved text leaves a choice open, this spec makes it and marks it **[choice]**.
  - §12 lists undecided questions; it has none in rev 3.

## 1. Purpose and scope

- **Purpose of tonight's flight (user's option A):** validate the "3.8 Live router" path as the app's new default
  extension. It is one late, unattended, registered hour (~23:00–03:00), registered like flight-eq.
- **In scope:**
  - the router session module, the route reader, the arbiter in main, and the ear failover;
  - the monitoring lines and the hour reader;
  - three ride-along fixes and the live40 harness (§7);
  - the tests (§9);
  - the hour, its bars and its verdict (§10–§11).
- **Next target, not in scope:** the flight-eq re-fly. It is on the agenda, it is not part of this spec, and it never
  shares an hour with this flight.
- **Not in scope:** the cue-less follow-up parent fix and the mishearing fix (S1Q05F, S2Q06F). Both belong to the
  flight-eq re-fly track.
- **Hands-free only:** the router acts only on turns the interviewer-turn machine dispatches in `auto` live mode
  (`main.ts` `dispatchDetection`, 2088–2198). Typed questions, manual chips and every other path are unchanged.

## 2. Global constraints (binding project rules)

1. **Never start the app from a Claude session.** A Claude session reads a shadow `credentials.enc`. The app runs only
   from a scheduled task or the user's terminal.
2. **Flights run only via scheduled tasks**, armed and prechecked as flight-eq was.
3. **Opus reviews** every spec, plan, code change and result. The author and the reviewer are separate Opus subagents.
4. **TDD:** every test is written first and seen to fail before the code that makes it pass.
5. **MAIN commits go only through `natively-lab\sp\commit-main-paths.ps1`**, because the index is shared.
   - Check the branch of both checkouts before editing.
   - MAIN is on `fix/coding-style-suffix-all-gemini` as of this writing.
6. **Never print keys or captured prompts.**
   - Keys are read in-process; only their names are printed.
   - Hashes and character counts may be printed; prompt text may not.
7. **Pass records:** every pass is saved to `passes/<run>.md` + `INDEX.md` and committed with the change it measures.

## 3. Architecture: two Live sessions side by side (Approach 1)

```
interviewer audio (16 kHz mono PCM, the ear's existing feed)
   ├── EAR    GeminiLiveRouter (gemini-3.1-flash-live-preview, tool calls, generation-gated §7.3)
   │            → turn machine → pipeline (unchanged)
   │            └─ on state 'failed' → failover to gemini-2.5-flash-native-audio-latest (§4.4)
   └── ROUTER LiveRouterSession (gemini-3.8-live, router40 setup, generation-gated, text from output transcription)
                └─ router-turn events → ARBITER in main ← turn machine (open / just-closed turn, question end)
                                              └─ streams Live (first word not "hard", on time) or shows the pipeline
```

- **The ear stays today's `GeminiLiveRouter`.**
  - It is a tool-call listener that feeds the turn machine (`interviewerTurn.ts`) and the pipeline unchanged.
  - Its only new behaviours are the reconnect fix (§7.3), which applies flag or no flag, and the failover (§4.4).
- **The router is a new, separate session.** It never feeds the turn machine and never dispatches.
- **The pipeline always dispatches.**
  - For every dispatched turn, the pipeline answer is generated exactly as today, cues included.
  - The arbiter decides only what is shown.
- **The flag `NATIVELY_LIVE_ROUTER=1`** enables the router session, the arbiter and the ear failover.
  - It is default OFF until the hour PASSES (§11).
  - With the flag off, there is no router session and no failover, and the display bytes are today's.
- **[choice] What the flag covers:**
  - The ear failover sits behind the same flag, so the default app does not change before the hour.
  - The marker filter (§7.1) and the reconnect fix (§7.3) are fixes to today's app and are NOT behind the flag.

## 4. Components

### 4.1 Router session module (`electron/audio/LiveRouterSession.ts`, beside `GeminiLiveRouter.ts`)

**Setup.** It uses router40's setup (`run-r.mjs`, registration §3.2):
- **Model:** `gemini-3.8-live`, as router40 used it (`run-r.mjs:21`).
  - The id is asserted before connect.
  - Any other id is refused, with a logged error.
- **Config:**
  - `responseModalities ['AUDIO']`;
  - `inputAudioTranscription {}` and `outputAudioTranscription {}`;
  - `contextWindowCompression` with a sliding window.
- **System instruction:** router40's composition (`r40-common.mjs` `buildRSystem`), that is
  `INSTRUCTION + "\n\n" + CONTEXT + "\n\n" + BLOCK_B`.
  - `INSTRUCTION` is the L20d instruction (`natively-lab\sp\l20d\instruction.txt`, sha256 `e29bf381…`), embedded as a
    constant.
  - `CONTEXT` is the app's knowledge context: the CONTEXT block the app's answer prompt carries, read at each connect.
    In router40 it was the captured S1Q02 slice.
  - `BLOCK_B` is `r40-common.mjs` lines 48–51, byte for byte.
  - **[choice]** The approval names "block B text, the app's knowledge context". Router40's setup also includes the
    L20d instruction, so this spec keeps it.
- **Checked at module load:**
  - `sha256(INSTRUCTION) = e29bf3810128854c115214a50205ac7aa992e84bfcf35dd13147340a8cd41f3f`;
  - `sha256(BLOCK_B) = e11c240063eae0f258a1424fe49224aff5e6ffda0aafd2d6be6b553379379ad8`.
  - On a mismatch the module refuses to start the session and logs the refusal. The flag then has no effect.
- **Audio in:** the same 16 kHz mono PCM the ear receives, written from the same callback.
  - There is no gap buffer and no replay.
  - Speech heard while the session is down is lost to the router, and its turns read `router-down`.
- **Audio out:** counted and discarded. No audio is written to disk, and no playback device is opened.

**Lifecycle.**
- **Start and stop:** the session starts and stops with the ear (meeting start and stop) when the flag is on.
- **Generation guard from day one (§7.3's pattern):**
  - Each `connect()` increments a generation counter and captures it.
  - `onopen`, `onmessage` and `onclose` return early when their generation is stale.
  - A late stale session is closed.
  - On `goAway`, the session is marked stale (the generation is incremented) before it is closed.
  - A reconnect is skipped when one is already pending.
  - Close lines carry the close code.
- **Reconnect policy:** it reconnects on `goAway` or a close, using the ear's existing constants:
  - 3 quick attempts, at 300 ms × n;
  - then a slow retry every 15 s;
  - quota closes back off from 5 s, doubling to 60 s.
- **[choice] No session resumption.** Every connect is fresh, because block B routes every back-reference to "hard",
  so the router needs no history.
- **`up` and `down`:** the router is `up` from `setupComplete` until the next close, and `down` otherwise.

**`router-turn` events.**
- **What a router turn is:** the output transcription from its first text up to the first of `generationComplete`,
  `turnComplete`, `interrupted`, a session close, or the 10 s cap (§4.3).
- **The event fires for every text increment**, with the same `seq` throughout:
  `{ seq, text (the whole text so far), firstTextAt, completed: false }`.
- **It fires once more at the end:** `{ seq, text, firstTextAt, completed, endKind, endedAt }`.
  - `completed` is true only if `generationComplete` or `turnComplete` arrived.
  - `endKind` is one of `generationComplete | turnComplete | interrupted | closed | cap`.
- **Text after a completed end** is emitted again, with `afterComplete: true`.
- **Times** are epoch ms (`Date.now()`) in the main process.
- **The module emits only text and times.** It never displays anything and never decides a route.

### 4.2 Route reader (pure functions, `electron/services/routeReader.ts`)

Definitions:
- **Tokens:** `text.trim()` split on whitespace.
- **Letters-only form:** lowercase, with every non-`a–z` character removed.
- **First word:** the first token. It is **complete** once whitespace follows it, or once the turn has ended.
- **Hard word:** a token whose letters-only form matches `^(hard)+$`. That covers `hard`, `Hard.`, `"hard"`,
  `hard.hard`, `hardhard` and `hard".hard".hard`. `hardware` is not a hard word.
- **Clean hard:** a hard word whose letters-only form is exactly `hard`.
- **Marker:** any of `<`, `>`, `[`, `]`, or a `__…__` sequence (`/__\S+?__/`).
- **Words:** the number of tokens.

**`routeFirstWord(firstWord) → 'hard' | 'live'`** (user's answer 3):
- **The route is decided on the FIRST word only.**
  - A first word that is a hard word reads `hard`. Its reason is `-` if it is clean, and `garbled-hard` otherwise.
  - Any other first word reads `live`.
- **The word "hard" later inside an answer does not change the route.** RE18 is shown.

**`checkCompleted(text, completed) → { ok, reason, words }`** runs on a Live turn that is streaming or shown. The first
failing row wins:

| # | condition | reason |
|--|--|--|
| 1 | contains a marker | `marker` |
| 2 | words > 80 | `too-long` |
| 3 | `completed` is false (cut: interrupted, closed, or the cap) | `incomplete-after-show` |
| 4 | words < 8 | `too-short` |
| 5 | otherwise | `ok`, reason `-` |

- **Rows 1 and 2 can be read on partial text.** They can only become true as the text grows.
- **[choice] Row 4 (`too-short`) triggers the same append as the user's list** (cut, too long, markers). That list does
  not name too-short, but the approved 8–80-word answer and the `too-short` reason stay in force, and a shown answer
  can only be completed by appending.

**The decision line's `route`:**
- `hard`: the first word is a hard word.
- `easy-answer`: the first word is not hard, and `checkCompleted` is `ok`.
- `invalid`: everything else, including an empty text.

### 4.3 Arbiter (in main)

**Inputs:**
- **The turns from the turn machine:** id, open or closed, close time, close kind, and dispatch.
- **Each turn's question end `Q`:** the turn's `lastSpeechAt` at the moment of its dispatch, which is the moment the
  voice last stopped, as `interviewerTurn.ts` records it. The turn machine exposes it read-only.
- **The `router-turn` events.**
- **The router state:** `up` or `down`.
- **The ear model:** `3.1` or `2.5`.

**Pairing.** A router turn pairs by its first-text time F:
- It pairs with the turn that is open at F.
- If no turn is open, it pairs with the most recently closed turn, provided that turn closed at most 2000 ms before F.
- Otherwise it is **`unpaired`**. So is a router turn whose paired turn closes without a dispatch (candidate,
  not-a-question, nothing-heard).
- An unpaired router turn is never shown.

**Two times:**
- **The first word's time W** is when the deciding router turn's first word became complete. The 2 s on-time gate
  (row 2) reads W.
- **The visible time V** is when Live text first appears on screen: the later of W and the turn's dispatch.
- **`live_first_ms` = V − Q** on shown=live turns, which is first visible text, so the speed bar reads it.
- On other turns it is W − Q, or `-` when there is no router turn.

**Decision** (the first matching row decides):

| # | condition | shown | reason |
|--|--|--|--|
| 1 | the router is `down` at Q, or the ear is on 2.5 | pipeline | `router-down` |
| 2 | no paired router turn has a complete first word by Q + 2000 ms | pipeline | `late` if one pairs later, else `no-router-turn` |
| 3 | the first word is a hard word | pipeline + cues | `-` or `garbled-hard` |
| 4 | otherwise | **Live streams**; the pipeline answer is a hidden shadow | `-`, or §4.2's failing check |

**Holding and display.**
- **The pipeline request** is sent at dispatch, as today.
- **While rows 1–3 are pending** (at most Q + 2000 ms), the pipeline answer's display events (tokens and cues) are
  held, then released (rows 1–3) or kept as a hidden shadow (row 4).
- **Live streams** from its first word onward, as text arrives. Its text passes through the §7.1 filter.
  - The answer's existing model label names `gemini-3.8-live`.
  - **The dispatch gate (kept by the user in rev 3):** Live is never displayed before the turn's dispatch. A first word
    that is ready earlier is held until the dispatch, so V is the dispatch time, and the hold counts against the speed
    bar.
- **When `checkCompleted` fails** (marker, too-long, incomplete-after-show, too-short):
  - The Live text already shown stays.
  - The pipeline answer for the turn is appended below it, marked **"(full answer)"**, and displayed as a pipeline
    answer is displayed, cues included.
  - **[choice]** On `marker` or `too-long`, Live streaming stops at the point the check fails: the token carrying the
    marker, or the 81st word. Nothing past that point is displayed. This keeps a marker off screen and bounds the
    Live text.
- **[choice] The 10 s cap:** a Live turn that has not ended by Q + 10 000 ms is cut (`endKind: cap`), its display
  stops, and the full answer is appended.
  - Provenance: in router40, `generationComplete` came at most 7583 ms after clip end, across the 20 answers (RH05, 71
    words).
- **Supersede:** a turn supersede (`replace: true`) replaces whatever is shown for the turn with the pipeline's new
  answer, as today. The router turn is not re-read.
- **Duplicates: the first valid one wins.**
  - The first paired router turn with a complete first word by Q + 2000 ms decides the turn.
  - Every other router turn paired to the same turn is logged `dup` and never shown.
  - **[choice]** This is how "first valid" reads now that a first word decides at once.
- **Cues** are displayed only when the pipeline answer is shown. That happens on the routed-hard path, on every
  fallback, and in a "(full answer)" append.

### 4.4 Ear failover

- **Trigger:** when the ear's state reaches `failed` on `gemini-3.1-flash-live-preview`, main stops that
  `GeminiLiveRouter` and starts a new one on `gemini-2.5-flash-native-audio-latest`.
  - To allow this, the model becomes a constructor parameter. Its default is today's `LIVE_ROUTER_MODEL`.
- **Logging:** the failover is logged as a session line (§5).
- **[choice] No fail-back.** The ear stays on 2.5 until the meeting ends.
  - If 2.5 also fails, it behaves as today: red chip and slow retry.
  - The Deepgram detector still answers.
- **An ear that starts on 2.5** (for example through `NATIVELY_LIVE_MODEL`) does not fail over. `ear=2.5` holds from
  the start.
- **Backup ears only listen (option A):** while the ear is on 2.5, or the router is down, the pipeline answers
  everything (arbiter row 1).
  - **[choice]** While the ear is on 2.5, the router session keeps running, but its turns are not shown. The line then
    reads `reason=router-down ear=2.5 router=up`.

## 5. Monitoring

**One decision line per decision**, written to `verbal-diag.log` through the main process's diag writer and mirrored to
the debug log:

```
[Router] turn=<n> route=easy-answer|hard|invalid reason=<…> live_first_ms=<n> live_words=<n> shown=live|pipeline shadow=<pipeline first-token ms> ear=<3.1|2.5> router=<up|down>
```

**Fields:**
- **`turn`:** the turn machine's turn id, or `-` for an unpaired router turn.
- **`route`:** as defined in §4.2.
- **`live_first_ms`:** V − Q on shown=live turns, and W − Q otherwise (§4.3). It is `-` when there is no router turn.
  W − Q can be negative if Live began before the question end.
- **`live_words`:** the word count of the final router text.
- **`shadow`:** the pipeline answer's first-token ms for the turn, as the existing diag measures it, whether the answer
  was shown or hidden. It is `-` if no first token arrived.
- **`ear` and `router`:** their state at Q.
- **A shown=live line with a reason other than `-`** means the "(full answer)" was appended.

**Reasons:** `-`, `garbled-hard`, `too-short`, `too-long`, `incomplete-after-show`, `marker`, `late`, `router-down`,
`no-router-turn`, `unpaired`, `dup`. The `incomplete` reason of rev 1 is folded into `incomplete-after-show`, because a
Live turn is now on screen before it can be cut.

**When the lines are written:**
- **For a dispatched turn,** the main line is written once all three have happened:
  - the decision is made;
  - every paired router turn has ended, or the turn has closed;
  - the pipeline answer has ended (completed, aborted or failed).
- **Each `dup` and each `unpaired` router turn** gets its own line.

**Session lines,** for both the router and the ear (the ear's lines are new with §7.3):

```
[Router] session connect model=gemini-3.8-live block_sha12=e11c240063ea instruction_sha12=e29bf3810128 context_chars=<n>
[Router] session up setup_ms=<n>
[Router] session reconnect attempt=<n> reason=<…>
[Router] session close gen=<n> code=<n> reason=<…> stale=<yes|no>
[Router] session refused reason=<sha-mismatch|model-mismatch>
[Router] ear failover from=3.1 to=2.5 reason=<the ear's failed reason>
[LiveRouter] close gen=<n> code=<n> reason=<…> stale=<yes|no>
```

**The text record:**
- For every paired turn, both texts are written to the run's existing answer capture: the Live text and the pipeline
  answer, each tagged `shown`, `shadow` or `appended`, with the turn id.
- The flight snapshots that capture.
- Text never goes into a `[Router]` line.

**The hour reader** (`natively-lab\sp\router-default\router-hour-read.mjs`). It reads one run folder and prints counts
and ms only, never text:
- decisions by route × reason × shown;
- `live_first_ms` p50 and p90 on shown=live;
- `live_words` p50 and max on shown=live;
- the shadow first-token p50 and p90;
- appends by reason;
- `unpaired` and `dup` counts;
- ear failovers;
- connects, reconnects and closes for the router and the ear, by reason and code, with the stale closes;
- router down time;
- dispatched turns with no decision line (must be 0);
- dispatched turns with nothing shown (must be 0).

**How the hour reader maps and checks:**
- **Item mapping:** turns are mapped to roster ids by play window, as the interview60 harness attributes them
  (timeline `OFFSET_MS` 1150).
- **Safety, text half:** it checks that no shown Live text has a hard first word, and that no shown text of any kind
  carries a marker.
- **Fallback:** it checks two things:
  - every failing `checkCompleted` has its appended full answer;
  - no shown=live turn has a hard first word.
- **The 2 s gate on W is not checked here.** The decision line logs V, not W, for shown turns. The gate is proven by
  the unit tests and the offline replay (§9).
- **Calibration (rule 8):** before the hour, it is calibrated on synthetic logs with known counts, including at least
  one case of each reason.

## 6. Failure table

| failure | behaviour |
|--|--|
| silent or late (no first word by Q + 2 s) | pipeline |
| first word "hard" in any form (`hard.hard`, `"hard"`, `hardhard`, repeats) | pipeline + cues |
| shown Live turn is cut, too long, too short or carries a marker | Live stays (stopped at a marker or the 81st word); the pipeline answer is appended below, marked "(full answer)" |
| router down | pipeline for everything |
| ear 3.1 failed | 2.5 (listen only: the pipeline answers everything) |
| duplicate router turns | the first valid one wins; the others are logged `dup` |
| stale session callback (ear or router) | ignored; no reconnect, and the live session is untouched (§7.3) |

## 7. Ride-along fixes

### 7.1 Unknown-marker filter (option A)

- **Evidence:** 5 of 120 cue answers leaked a marker (S1Q05).
- **What it does:** any unknown `__WORD__` marker (`WORD` = `[A-Za-z][A-Za-z0-9_]*`) is stripped from the displayed
  answer stream.
- **Known markers are unchanged** and still handled where they are today:
  - `__MORE__` by `stripSuggestionBlock`;
  - `__CUES__` by `stripCueBlock`;
  - `__model_source:<id>__` by `stripModelSentinel`.
- **Where it runs:** as the outermost stage of the filter chain (`WhatToAnswerLLM.ts` 398–404), so every known marker
  has already been consumed. It must never see the model-source sentinel, or the hedge label's `__`, before those are
  consumed.
- **Streaming:** a trailing partial `__…` is held until one of two things happens:
  - it closes with `__`, and is stripped if it is unknown;
  - whitespace, a non-word character or the end of the stream arrives, and it is released unchanged.
- **Live text** passes through the same filter (§4.3).
- **[choice]** It is not behind the flag.

### 7.2 Harness: the probe's answers finish before the hour (option A)

- **What changes:** in `interview60.run.mjs` `auto()` (536–582), between `probe()` reporting ready and `appPass()`,
  `auto` waits until both hold:
  - every probe turn's answer has ended (completed, aborted or failed, as the logs record);
  - no interviewer turn is open.
- **Evidence:** flight-eq D5. The probe's second turn was answered 4.2 s into the run window.
- **[choice] A 120 s cap.** If the wait times out, `auto` prints why and exits 1 without starting the hour ("The hour
  was NOT spent").

### 7.3 Ear reconnect fix (user's answer 1; rides along tonight)

- **Diagnosis:** `natively-lab\sp\router-default\DIAG-reconnects-ttft.md`, Q1.
  - On `goAway`, the ear double-reconnects. The handler closes the old session itself, and that session's `onclose`
    schedules a second reconnect, so two sessions open.
  - Callbacks are not tied to their session. When the orphan dies (~152 s on 3.1), `handleClose` tears down the live
    session.
  - The result was 26 reconnects in the eq hour.
- **The fix** (about 15 lines in `GeminiLiveRouter.ts`):
  - a connection generation counter: `connect()` increments it and captures it, and `onopen`, `onmessage` and
    `onclose` from a stale generation are ignored (a late stale session is closed);
  - the old session is marked stale (the generation is incremented) before the goAway close;
  - `scheduleReconnect` skips when a reconnect is already pending;
  - the close code is logged next to the reason.
- **Tests first** (fake `connectFn`):
  - a goAway gives exactly 1 connect;
  - a stale session's `onclose` gives 0 reconnects and leaves the live session unchanged.
- **Expected live effect:** about 6 reconnects per hour (one per ~9-min goAway), with no orphan sessions. The smoke
  checks the reconnect count and that no stale close reconnects.
- **Not behind the flag:** it changes the ear under the pipeline, so the hour's registration names it as a change to
  the hour.
- **Not fixed:**
  - DIAG's Q2 (TTFT p90 10.3 s), a provider-side transient at the start of the hour, gets no app fix.
  - Each goAway still leaves a gap of about 0.5–1 s (DIAG residual).

### 7.4 The live40 harness (user's answer to rev 2 §12 Q1; built today)

Today `interview60.run.mjs` cannot play live40:
- `roster.mjs` `ROSTERS` knows only `interview60`, `scenario50` and `holdout40`.
- live40 has 47 separate clips but no questions module and no continuous wav.

The build adds the following.

1. **A questions module, `electron/test/golden/live40.questions.mjs`.**
   - It is generated from `natively-lab\sp\live40\items.json` (sha256 `e531772bdc6e9c23…`).
   - It carries the 47 items in live40's chain order (31 chains, SET-draft §5). Each item has `id`, `q` (the item's
     `text`), `gapMs`, its `chain`/parent where it has one, and its router40 `route` (EASY/HARD) and `class`.
   - The generator refuses to run if the item file's sha differs.
2. **A `roster.mjs` entry:** `live40: { items: LIVE40, ttsLocal: 'live40-tts-local', ttsGemini: 'live40-tts', wav: 'live40.wav' }`.
   - It is selected with `NATIVELY_ROSTER=live40`.
   - The roster has no scenarios, so `NATIVELY_SCENARIOS` stays unset.
3. **One continuous `live40.wav`,** stitched from the 47 clips.
   - The clips are copied into `live40-tts-local\<id>.wav`, each with an `<id>.txt` stamp equal to the item's `q`.
     `interview60.build-audio-local.mjs` then reuses them as they are and renders nothing; a clip it would re-render is
     an error.
   - Each clip is checked before stitching: 24 kHz, mono, 16-bit, PCM `sha12` equal to `live40\clips\manifest.json`'s.
     Any mismatch refuses the build.
   - The clips are read from `live40\clips\<id>.wav`. The manifest's `path` fields point into an old Temp scratchpad and
     are not used.
   - The manifest's `suspectRate` entries (RE11 1.57 w/s, EF06 1.58 w/s) will also appear on the builder's SUSPECT line,
     which is a warning, not a refusal. This is expected and recorded.
   - The output is 24 kHz mono 16-bit, like the other rosters.
4. **A wav check,** like scenario50's: `interview60.run.mjs wav:check` with `NATIVELY_ROSTER=live40`.
   - It passes only when `live40.wav`'s length matches the clips plus the gaps (`wavMismatch`, within 1 s).
   - It is calibrated once on a deliberately wrong wav (rule 8).
5. **Attribution:** play windows come from the timeline, as for the other rosters (`OFFSET_MS` 1150). The hour reader's
   item mapping uses them.

**The gap, derived from the turn-machine constants.** The constants are `DEFAULT_TURN_CONSTANTS`,
`interviewerTurn.ts:25`: gate 1200, settle 400, unfinished hold 2500, continuation 8000, max hold 8000, wordless grace
3000 ms.

| step | ms | why |
|--|--|--|
| dispatch, a normal turn | stop + 1200 (gate), or + 3700 with the unfinished hold | earliest and latest dispatch on the quiet path |
| dispatch, fail-safe | the latest of detection, last final and last stop, + 8000 (max hold) | a late final or a stuck transcript |
| close after dispatch | dispatch + 8000 (continuation), with no new words | speech inside this window would join the SAME turn |
| worst close after the voice stops | 8000 + 8000 = **16 000** | fail-safe dispatch, then continuation |
| the arbiter's just-closed pairing window (§4.3) | + 2000 | so that question k+1's router turn cannot pair with turn k |
| **minimum gap** | **18 000** | |
| **[choice] chosen gap** | **20 000** for every item | 2 s of margin for the settle (400 ms) and a late Deepgram final; the router's 10 s cap (Q + 10 000) also ends well inside it |

- **The hour's length:** 218 s of clips + 47 × 20 s ≈ 19.6 min of audio.
- **[choice] The pipeline answer for turn k should end before turn k+1 dispatches,** so each answer is captured whole
  and a follow-up's parent is on screen.
  - In the eq hour the first token came at p50 4.9 s and p90 11.25 s, but no answer duration has been measured.
  - The smoke measures, for every turn, whether its pipeline answer ended before the next dispatch.
  - If any did not, the gap is raised above the measured maximum before the registration is sealed. The new value is
    recorded there, with its measurement.

**Schedule:** if the whole build is not reviewed and smoked by ~20:00 (this harness, §4, §7.1–§7.3), the hour moves to
tomorrow night. Reviews are not cut.

## 8. Diagnosis (done)

- **Done:** the read-only diagnosis of the eq hour's 26 reconnects and its TTFT p90 of 10.3 s is in
  `DIAG-reconnects-ttft.md`.
- **Q1 (the reconnects):** proven and isolated; it lands as §7.3.
- **Q2 (the TTFT p90):** a provider transient; no fix lands.

## 9. Testing (before the hour)

1. **TDD unit tests**, each seen failing first.
   - **The reader on router40's 47 real outputs** (`router40\runs\router40-R.answers.json`, excluding the failed
     attempt `RH05~a1`).
     - Expected: first word `hard` 27, all of them 1-token outputs (25 clean; 2 `garbled-hard`: RH08, RH10); `live`
       20 (the 19 EASY answers, RE18 included, plus RH05).
     - `checkCompleted` reads `ok` on all 20 (30–71 words, no markers).
     - This tally was counted at spec time from token counts only. The test makes it binding.
   - **The reader on invented garbles and edges:**
     - `hard.hard`, `"hard"`, `Hard.`, `hardhard`, `hard".hard".hard`;
     - `hardware` (live);
     - `hard` as the 36th word (live);
     - a first word split across chunks;
     - markers;
     - 7, 8, 80 and 81 words;
     - cut text.
   - **The arbiter:**
     - every row and reason;
     - pairing: open, just-closed within 2000 ms, unpaired, and a turn closed without a dispatch;
     - `dup`;
     - no display before dispatch;
     - streaming;
     - each append path, with the stop at a marker and at the 81st word;
     - the 10 s cap;
     - supersede;
     - router-down;
     - ear=2.5.
   - **The marker filter:** unknown markers are stripped; known markers and the hedge label stay intact; a marker split
     across chunks is handled.
   - **The reconnect fix:** §7.3's two tests, plus the generation guard in `LiveRouterSession` (the same two cases).
   - **Failover:** `failed` on 3.1 starts 2.5 once and logs it once, with no fail-back. A 2.5 start never fails over.
   - **The harness wait:** it waits, passes, and times out to exit 1.
   - **The live40 harness (§7.4):**
     - the generator refuses a wrong item-file sha;
     - the roster loads 47 items in chain order with their parents;
     - the builder refuses a clip with the wrong format or hash, and refuses a clip it would re-render;
     - `wav:check` passes on the built wav and fails on a wrong one.
2. **Offline replay.** Router40's saved turns (`router40-R.json` events and answers) are run through the reader and the
   arbiter, with Q = clipEnd and the dispatch at Q.
   - Expected: shown=live 20, all on time; pipeline 27; appends 0.
   - Any difference is explained before the build is called done.
3. **A ~2-minute live probe.** A standalone script (not the app) drives the built `LiveRouterSession` on a few router40
   clips: at least 2 EASY and 2 HARD.
   - It checks the model assert, the sha checks, `setupComplete`, the streaming and end events, and the reader
     verdicts.
   - It prints ids, classes and ms only.
4. **A ~15-minute smoke.** The app runs from a scheduled task with the flag ON and plays `live40.wav` from the start
   for ~15 minutes. The first chains (C01 RE01→RH01, C02 RE02→EF01, C03 RH03, and so on) cover EASY items, HARD items and
   follow-ups. The user is warned first, because the machine must be quiet.
   - It checks every `[Router]` and `[LiveRouter] close` line kind it can reach, the ear's reconnect count, the
     shown/shadow/appended capture, and the hour reader on the smoke's folder.
   - It also checks the play-window attribution, and whether each pipeline answer ended before the next dispatch
     (§7.4).
   - Branches it did not reach are listed as residual risk.

## 10. Tonight's registered hour

- **The registration:** the hour is registered like flight-eq, in a separate pre-registration that is written and
  Opus-reviewed before any data.
  - It fixes the arming, the instruments with their sha lines, the launchers and the precheck.
  - It names §7.3 as a change to the ear under the pipeline.
- **The roster: live40, router40's set** (user's answer 2).
  - It has 47 turns in 31 chains: 20 EASY and 27 HARD, follow-ups included (classes E 20, H 11, QF 9, AF 7).
  - Item file: `natively-lab\sp\live40\items.json` (sha256 `e531772bdc6e9c23…`).
  - Audio: `live40.wav`, built by §7.4 from the 47 clips in `natively-lab\sp\live40\clips\` (218 s of speech), with a
    20 s gap after each item.
  - It is played hands-free with `NATIVELY_ROSTER=live40`, which takes about 20 minutes.
  - The registration records the `live40.wav` sha and its `wav:check` line.
- **Labels and denominators:** from router40's registered labels.
  - The key is `natively-lab\sp\router40\keyhold\key.json` (sha16 `42e1b04f1f60283f`, registration file table). It is
    carried into `live40\items.json` `route`.
  - Two blind Opus classifiers agreed with it on route 47/47 (`router40\blind\verdicts.c1.json`, `.c2.json`).
- **Settings for the hour:**
  - the flag `NATIVELY_LIVE_ROUTER=1` is ON;
  - the earlier-question block is OFF (`NATIVELY_EARLIER_QUESTION` unset);
  - cues stay on the pipeline path (cues have no flag; the pipeline always carries them).
- **Precheck at T−6 min,** as for flight-eq. It requires the `[Router] session connect` line with the registered shas
  and `ear=3.1`.
- **Grading:**
  - **Grader:** pinned `claude-opus-5-5`, memory-clean (`--setting-sources project,local`), using flight-eq's grader
    command form.
  - **Graded blind, side by side:** the Live-shown answers and their shadow pipeline answers.
  - **Also graded:** the in-app pipeline-shown answers and the bare arms (bare 3.5-lite HIGH, bare 3.1-lite LOW).
  - **No past hour is re-graded.** Rev 1's s50m and last-night band is removed.
  - **Reported beside the hour, not gated:** router40's L arm (bare 3.1-lite LOW, 43/47 acceptable, 0 wrong;
    `RESULT-router40.md`) on the same 47 ids, using its existing router40 grades.
  - **Grade definitions,** as router40's score defines them:
    - acceptable = both graders give correctness 2 and on-topic 2;
    - wrong = any grader gives correctness 0.

### 10.1 Bars (user's option A)

| bar | rule | read by |
|--|--|--|
| **Safety (decisive)** | 0 garbled or routing-token text shown (no hard first word shown, no marker shown), AND 0 wrong Live answers shown | hour reader (text) + grades |
| Fallback | every Live failure caught: every failing `checkCompleted` has its "(full answer)"; 0 shown=live turns with a hard first word; 0 dispatched turns with nothing shown | hour reader |
| Quality (the in-hour shadow) | acceptable(Live shown) ≥ acceptable(shadow, same items) − 1 | grades |
| Speed | first visible text (`live_first_ms` = V − Q) p50 ≤ 2500 ms after question end, on shown=live | hour reader |
| Routing | EASY caught ≥ 13/20; HARD misrouted ≤ 1 of 27 | hour reader + router40 labels |
| No regression (absolute gate) | 0 wrong pipeline answers shown on the 27 HARD items (follow-ups included) | grades |

**Definitions for the bars:**
- **EASY caught:** an EASY-labelled item with shown=live.
- **HARD misrouted:** a HARD-labelled item whose first word was not a hard word, whether it was shown or not.
  **[choice]** This is stricter than counting shown items only.
- **Speed, for comparison (reported):** the pipeline's first-token p50 is about 4.5 s. Router40's L arm had a TTFT p50
  of 4.43 s, and the eq hour's diag had a first-token median of 4899 ms.
  - Those figures are measured from request send, not from the question end, so the pipeline's p50 from the question
    end is later still.
  - The hour reader reports the in-hour shadow's first-token p50 beside Live's.
- **No regression:**
  - **Why the gate is absolute:** the pipeline answers every question in the same hour, and the router does not change
    the pipeline.
  - **What it counts:** a "pipeline answer shown" is shown=pipeline, or a "(full answer)" append.
  - **Reported beside it, never gated:** router40's L arm on the same ids.

## 11. Verdict

- **PASS** (every bar met): the flag defaults ON, landed as its own reviewed commit. After that,
  `NATIVELY_LIVE_ROUTER=0` turns it off.
- **Safety FAIL:** the router stays behind the flag, default OFF.
- **Anything else:** INCONCLUSIVE, with one re-fly.
- **A second INCONCLUSIVE gets no automatic outcome.** The controller reports, and the user rules.
- **Schedule:** if the whole build (§4, §7.1–§7.4) is not reviewed and smoked by ~20:00, the hour moves to tomorrow
  night. Reviews are not cut.

## 12. Open questions

None. Rev 1's three questions and rev 2's two questions were all answered by the user on 2026-10-06 (see the header).

## 13. Suggestions recorded, not part of the build

- The 3.8 Flash ceiling spike: S1Q02, S2Q02 and S2Q05F, ~9 requests, reported only.
- Cues on or off by default, as its own test.
- The flight-eq re-fly prep.
- `power-events.ps1`, and running the clocks instrument.
- Later: merging the ear into the router session, once a test shows one session can do both, which halves the Live
  cost.

## 14. Residual risks (not proven by anything run so far)

- **Session length:** router40 ran one session per chain (31 short sessions). One router session lasting a whole hour,
  with reconnects and no resumption, has not run.
- **Context:** router40's CONTEXT was the captured S1Q02 slice (sha `dd74bbde…`). The in-app context differs, and its
  effect on routing is unmeasured.
- **Pairing:** pairing by time against the turn machine is new.
  - A router turn that starts in a mid-question pause (negative `live_first_ms`) is a candidate under the 2 s gate.
  - Whether such answers are right is measured only by the Safety bar.
- **Streaming shows text before any check.**
  - A word the reader would reject later, such as a trailing "hard" or a marker before the stop, can reach the screen
    first. The Safety bar counts it.
  - In router40, every hard output was a single token and no answer carried a marker.
- **The no-display-before-dispatch hold:**
  - The turn machine dispatches 1.2 s after the voice stops (gate), or 3.7 s when the question reads unfinished.
  - So V ≥ Q + 1.2 s on every shown turn. Against the 2.5 s bar that leaves about 1.3 s of room on a normal turn.
  - Turns held by the unfinished rule (V ≥ Q + 3.7 s) count against the p50.
  - Router40's first-text p50 of 0.72 s will not be what the user sees.
- **The live40 hour is synthetic and short:** 47 SAPI or reused clips, about 20 minutes of audio, with 20 s gaps.
  - Its follow-ups come 20 s after their parent, much closer than a real interview.
  - Its EASY items were written for router40. They are not a measured share of real interviews.
- **The 20 s gap was derived from the turn machine, not from answer length.** Whether every pipeline answer ends
  before the next dispatch is measured only by the smoke (§7.4).
- **Two concurrent Live sessions** double the Live session cost. Their quota behaviour on 3.8 Live over an hour is
  unmeasured.
- **Router40's latencies** are measured from clip end on synthetic audio with about 0.69 s of trailing silence. In-app,
  Q is a VAD stop.
- **The ~6 reconnects per hour from §7.3** assume a 3.1 session that is being fed is not itself aborted (DIAG). The
  smoke and the hour measure it.
