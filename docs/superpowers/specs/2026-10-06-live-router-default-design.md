# SPEC: the 3.8 Live router as the app's default extension (router-default), rev 4

## Revision history

| rev | written (TST) | kept as | what it applied |
|--|--|--|--|
| 1 | 2026-10-06 19:13 (`date`) | `SPEC.rev1.md` | the design the user approved section by section in chat on 2026-10-06 |
| 2 | 19:28 | `SPEC.rev2.md` | the user's answers to rev 1 §12: the reconnect fix rides along; the roster is live40; Live streams, routed on its first word; a second INCONCLUSIVE gets no automatic outcome |
| 3 | ~19:35 | `SPEC.rev3.md` | the user's answers to rev 2 §12: the live40 harness; the in-run shadow plus an absolute no-regression gate; speed p50 ≤ 2.5 s |
| 4 | 19:40 | (superseded in place) | `SPEC-REVIEW.md` (APPROVE WITH CHANGES), adopted as the coordinator directed: B1 to B3, I1 to I7, M1 to M7 |
| 4b | 19:45 | `SPEC.rev4b.md` | two user rulings relayed by the coordinator: **I5 = B** (the router keeps showing valid easy answers while the ear is on 2.5; VOID moves to router-session failure); **schedule**: T = 2026-10-07 08:00 TST, go/no-go 05:30, quota, quiet machine, SDD |
| **4c** | **~19:55** | this file | two corrections relayed by the coordinator: the **quota premise** was wrong (the current quota day started 2026-10-06 10:00 TST and is unused by Gemini, so headroom is ~500 per lite model); the user's ruling **context = A** (a fixed profile summary from the knowledge base). §12 is empty |

Where a text this spec records leaves a choice open, the spec makes it and marks it **[choice]**. §12 lists the questions
that are still undecided.

## 1. Purpose, scope and schedule

**Purpose (user's option A).** Validate the "3.8 Live router" path as the app's new default extension. This is done in
one registered, unattended **run** (~20 min of audio), registered like flight-eq. M3: it is called a "run", not an
"hour", so the registration does not inherit a 60-min expectation.

**Schedule (B1, then the user's ruling at 19:45).**
- **T = 2026-10-07 08:00 TST**, before the 10:00 TST quota reset.
- **Overnight, 2026-10-06 to 2026-10-07:** in order, the build (§2 rule 8), its Opus reviews, the live probe (§9.3),
  the smoke (§9.4, from a scheduled task, user warned), the registration with its Opus review, then the arming.
- **Go/no-go at 05:30 TST.** The build, every review, the live probe, the smoke and the registration must all be
  complete, and the arming record must be stamped by T−10 (07:50).
  - If any of these is missing, the run moves to 2026-10-07 ~23:00 (window ~23:00–03:00), and every quota statement in
    §10.1 is recomputed for that night.
  - No review is ever cut to make the deadline.
- **Quiet machine:** from ~07:45 until the end of the live run. The user confirms this separately.
- **The run must end before 10:00 TST**, so that it fits inside the current quota day. The registration sets the
  probe's deadline (`I60_PROBE_DEADLINE_MIN`) so that the latest start, plus ~20 min of audio, plus the §7.2 wait,
  falls before 09:45.
- The earlier 20:00 rule (rev 3) and the 2026-10-07 23:00 plan (rev 4) are superseded. The 23:00 window survives only
  as the no-go fallback.

**In scope:**
- the router session module, the route reader, the arbiter in main, and the ear failover;
- **the main→renderer answer contract, with `turnId` on every `suggested_answer*` event (B2, B3).** This brings into
  scope:
  - `electron/IntelligenceEngine.ts`;
  - `main.ts` 2419–2445;
  - `electron/preload.ts` and the renderer's types;
  - `src/lib/answerMessages.ts`;
  - `src/components/NativelyInterface.tsx`;
- the conversation-history rule (I3) and the answer capture (I4);
- the monitoring lines and the run reader;
- three ride-along fixes and the live40 harness (§7);
- the tests (§9);
- the run, its bars and its verdict (§10–§11).

**Next target, not in scope:** the flight-eq re-fly. It is on the agenda, it is not part of this spec, and it never
shares a night's run window with this flight.

**Also not in scope:** the cue-less follow-up parent fix and the mishearing fix (S1Q05F, S2Q06F). Both belong to the
flight-eq re-fly track.

**Hands-free only.** The router acts only on turns the interviewer-turn machine dispatches in `auto` live mode
(`main.ts` `dispatchDetection`, 2088–2198). Typed questions, manual chips and every other path are unchanged; their
events carry no `turnId` and pass through untouched.

## 2. Global constraints (binding project rules)

1. **Never start the app from a Claude session.** A Claude session reads a shadow `credentials.enc`, so the app runs
   only from a scheduled task or from the user's terminal.
2. **Flights run only from scheduled tasks**, armed and prechecked as flight-eq was.
3. **Opus reviews** every spec, plan, code change and result. The author and the reviewer are separate Opus subagents.
4. **TDD:** every test is written first and seen to fail before the code that makes it pass.
5. **MAIN commits go only through `natively-lab\sp\commit-main-paths.ps1`**, because the index is shared.
   - Check the branch of both checkouts before editing.
   - MAIN is on `fix/coding-style-suffix-all-gemini` at the time of writing.
6. **Never print keys or captured prompts.**
   - Keys are read in-process; only their names are printed.
   - Hashes and character counts may be printed.
7. **Pass records:** every pass is saved to `passes/<run>.md` and `INDEX.md`, and committed with the change it measures.
8. **Implementation goes through subagent-driven development (SDD).** Fresh Sonnet implementers use the newest Sonnet
   (the `sonnet` alias), one task at a time, test first. An Opus review follows each task, and an Opus review of the
   whole branch comes before any MAIN commit.

## 3. Architecture: two Live sessions side by side (Approach 1)

```
interviewer audio (16 kHz mono PCM, the ear's existing feed)
   ├── EAR    GeminiLiveRouter (gemini-3.1-flash-live-preview, tool calls, generation-gated §7.3)
   │            → turn machine → pipeline (IntelligenceEngine; events now carry turnId)
   │            └─ on state 'failed' → failover to gemini-2.5-flash-native-audio-latest (§4.4)
   └── ROUTER LiveRouterSession (gemini-3.8-live, router40 setup, generation-gated, text from output transcription)
                └─ router-turn events → ARBITER in main ← turn machine (open / just-closed turn, Q, dispatch)
                                              ├─ gates pipeline events by turnId (forward / hold / hide / append)
                                              └─ synthesizes Live answer events → renderer (§4.5)
```

**The ear stays today's `GeminiLiveRouter`.**
- It is a tool-call listener that feeds the turn machine (`interviewerTurn.ts`) and the pipeline as today.
- It gains two behaviours: the reconnect fix (§7.3), which applies whether the flag is on or off, and the failover
  (§4.4).

**The router is a new, separate session.** It never feeds the turn machine and never dispatches.

**The pipeline always dispatches.**
- For every dispatched turn, the pipeline answer is generated as today, cues included.
- The arbiter decides only what is shown and what enters the history.

**The flag.** `NATIVELY_LIVE_ROUTER=1` turns on the router session, the arbiter's Live path and the ear failover. It is
OFF by default until the run PASSES (§11).
- With the flag off there is no router session and no failover, and the renderer receives today's events in today's
  order.
- The `turnId` field still rides those events; the renderer ignores it when no Live bubble exists.

**[choice] Flag coverage.**
- The ear failover sits behind the flag, so the default app does not change before the run.
- The marker filter (§7.1), the reconnect fix (§7.3) and the `turnId` plumbing (§4.5) are not behind the flag.

## 4. Components

### 4.1 Router session module (`electron/audio/LiveRouterSession.ts`, beside `GeminiLiveRouter.ts`)

**Setup.** It uses router40's setup (`run-r.mjs`, registration §3.2):
- **Model:** `gemini-3.8-live`, as router40 used it (`run-r.mjs:21`). The id is asserted before connect; any other id
  is refused, with a logged error.
- **Session options:** `responseModalities ['AUDIO']`, `inputAudioTranscription {}`, `outputAudioTranscription {}`, and
  `contextWindowCompression` with a sliding window.
- **System instruction:** router40's composition (`r40-common.mjs` `buildRSystem`), that is
  `INSTRUCTION + "\n\n" + CONTEXT + "\n\n" + BLOCK_B`.
  - **`INSTRUCTION`** is the L20d instruction (`natively-lab\sp\l20d\instruction.txt`), embedded as a constant.
  - **`BLOCK_B`** (M1) is the joined value of `r40-common.mjs` `BLOCK_B`, that is
    `[...FRAME_1_3, its two routing lines, ...FRAME_6_7].join('\n')`. It is embedded as a constant, and its sha256
    is `e11c240063eae0f258a1424fe49224aff5e6ffda0aafd2d6be6b553379379ad8`.
  - **[choice]** The approval names "block B text, the app's knowledge context". Router40's setup also includes the
    L20d instruction, so this spec keeps it.
  - **`CONTEXT` (I6)** is defined in §4.1a.
- **Checked at module load:**
  - `sha256(INSTRUCTION) = e29bf3810128854c115214a50205ac7aa992e84bfcf35dd13147340a8cd41f3f`;
  - `sha256(BLOCK_B)` equals the value above.
  - On a mismatch the module refuses to start the session and logs the refusal. The flag then has no effect.
- **Audio in:** the same 16 kHz mono PCM the ear receives, from the same callback. There is no gap buffer and no replay.
  Speech heard while the router is down is lost to the router, and those turns read `router-down`.
- **Audio out:** counted and discarded. No audio is written to disk, and no playback device is opened.

**Lifecycle.**
- The session starts and stops with the ear (meeting start and stop) when the flag is on.
- **Generation guard from the start (§7.3's pattern):**
  - each `connect()` increments a generation counter and captures it;
  - `onopen`, `onmessage` and `onclose` return early when they belong to a stale generation, and a late stale session
    is closed;
  - on `goAway` the generation is incremented before the close;
  - a reconnect is skipped when one is already pending;
  - close lines carry the close code.
- **Reconnects** happen on `goAway` or on a close, using the ear's constants: 3 quick attempts at 300 ms × n, then a
  slow retry every 15 s. Quota closes back off from 5 s, doubling up to 60 s.
- **Router-session failure** is defined the way the ear's `failed` is. The 3 quick attempts are exhausted and the
  session enters slow retry. It is logged once, on the transition, as `[Router] session failed` (§5), and the session
  keeps retrying.
  - Like the ear's, this definition never fires on quota closes, which back off without failing.
- **[choice] No session resumption.** Every connect is fresh, because block B routes every back-reference to "hard".
- **Router state:** `up` from `setupComplete` until the next close, and `down` otherwise.

**`router-turn` events.**
- **A router turn** is the output transcription from its first text to the first of: `generationComplete`,
  `turnComplete`, `interrupted`, a session close, or the 10 s cap (§4.3).
- **On every text increment** the module emits `{ seq, text (whole so far), firstTextAt, completed: false }`, with the
  same `seq` for the whole turn.
- **Once at the end** it emits `{ seq, text, firstTextAt, completed, endKind, endedAt }`.
  - `completed` is true only if `generationComplete` or `turnComplete` arrived.
  - `endKind` is one of `generationComplete`, `turnComplete`, `interrupted`, `closed` or `cap`.
- **Text that arrives after a completed end** is emitted again, with `afterComplete: true`.
- **Times** are epoch ms (`Date.now()`) in the main process.
- **The module emits only text and times.** It never displays anything and never decides a route.

### 4.1a The router's CONTEXT (I6; user ruling A)

**What the context is.** A fixed **profile summary**, built once at meeting start from the user's knowledge base. It
uses the same source as the app's knowledge mode: the `KnowledgeOrchestrator` cache that `refreshCache()` fills from
`KnowledgeDatabaseManager`, that is `activeResume` and `activeJD`. It is **not** the per-question `processQuestion()`
retrieval block, and it does not come from S1Q02.

**The function.** A new method, `KnowledgeOrchestrator.getRouterProfileSummary(): string`, in
`electron/knowledge/KnowledgeOrchestrator.ts`, beside `getCompactJDHeader()` and `getProfileData()`.
- **No model call:** it is deterministic, built only from the cached structured data.
- **Content and format, [choice].** One plain-text block with up to three lines, each present only when its data exists:
  - `Candidate: <identity.name>, <experience[0].role>.`
  - `Skills: <the first 15 entries of skills, comma-separated>.`
  - `Target role: <getCompactJDHeader()>` (the existing method).
- **The empty case:** it returns `''` when knowledge mode is off (`isKnowledgeMode()` false) or when there is no active
  resume. The router's instruction then carries an empty CONTEXT.

**How it is used.**
- `LiveRouterSession` calls it **once per meeting**, when the router session first starts, and caches the string for the
  whole meeting. Every reconnect reuses the cached string.
- No transcript and no turn-dependent text ever enters the router's instruction.
- **Logged on every router connect:** `context_sha12` and `context_chars` (§5). The run reader checks that the sha is
  the same on every connect of the run.
- **The registration records** the run's `context_sha12` and `context_chars` from the smoke, and the precheck requires
  the same sha.

**Not proven:** the summary differs from router40's `dd74bbde…` context, which was a per-question retrieval block for
S1Q02. Its effect on routing is unmeasured and is listed in §14.

### 4.2 Route reader (pure functions, `electron/services/routeReader.ts`)

**Definitions:**
- **Tokens:** `text.trim()` split on whitespace.
- **Letters-only form:** lowercase, with every character outside `a–z` removed.
- **First word:** the first token. It is complete once whitespace follows it, or once the turn has ended.
- **Hard word:** a token whose letters-only form matches `^(hard)+$`. This covers `hard`, `Hard.`, `"hard"`,
  `hard.hard`, `hardhard` and `hard".hard".hard`. `hardware` is not a hard word.
- **Clean hard:** a hard word whose letters-only form is exactly `hard`.
- **Marker:** `<`, `>`, `[`, `]`, or `/__\S+?__/`.
- **Words:** the number of tokens.

**`routeFirstWord(firstWord) → 'hard' | 'live'`**
- The route is decided on the first word only.
- A first word that is a hard word reads `hard`. Its reason is `-` when the word is clean, and `garbled-hard` otherwise.
- Any other first word reads `live`.
- The word "hard" later in an answer does not count, so RE18 is shown.

**`checkCompleted(text, completed, ended) → { ok, reason, words }`.** The first failing row wins:

| # | condition | reason | decidable while streaming |
|--|--|--|--|
| 1 | contains a marker | `marker` | yes |
| 2 | words > 80 | `too-long` | yes |
| 3 | `ended` and not `completed` (interrupted, closed, cap) | `incomplete` before the show, `incomplete-after-show` after it | only once ended |
| 4 | `ended` and words < 8 | `too-short` | only once ended |
| 5 | otherwise | `ok` (`-`) | — |

- Rows 1 and 2 can only become true as the text grows.
- **[choice]** Row 4 also triggers the append when it surfaces after the show (§4.3). The user's list names only cut,
  too long and markers, but the approved 8–80-word answer stays in force.

**The decision line's `route`:**
- `hard`: the first word is a hard word.
- `easy-answer`: the first word is not hard, and the final `checkCompleted` is `ok`.
- `invalid`: everything else, including empty text.

### 4.3 Arbiter (in main)

**Inputs.**
- **Turn-machine turns:** id, open or closed, close time and kind, dispatch time.
- **`Q`:** the turn's `lastSpeechAt` at its dispatch. The turn machine exposes it read-only, with its source:
  - `vad` when it is a VAD off-transition;
  - `final` when the turn had no VAD and `lastSpeechAt` is a transcript final or claim time (`interviewerTurn.ts:190`,
    `198`). M4.
- **`router-turn` events.**
- **Router state:** `up` or `down`.
- **Ear model:** `3.1` or `2.5`, for the log only. It never changes a decision (§4.4).
- **The pipeline's `suggested_answer*` events,** keyed by `turnId` (§4.5).

**Pairing.** A router turn is paired by its first-text time F:
- with the turn that is open at F;
- if none is open, with the most recently closed turn, provided it closed at most 2000 ms before F;
- otherwise it is `unpaired`. A router turn whose paired turn closes without a dispatch (candidate, not-a-question,
  nothing-heard) is also `unpaired`.

An unpaired router turn is never shown.

**Which paired router turn decides (I2) [choice]:**
- A router turn whose end is `interrupted` before the turn's dispatch is discarded (logged `dup`). Such a turn started
  in a mid-question pause, and the speaker went on.
- Among the remaining paired router turns, the last one that has completed, or is still streaming, at dispatch time
  decides.
- If none exists at dispatch, the first paired router turn whose first text arrives after the dispatch decides.
- Every other paired router turn is logged `dup` and is never shown.

**Times.**
- **W** is when the deciding turn's first word became complete.
- **V** is when Live text first appears on screen: the later of W and the dispatch. The dispatch gate is kept: Live is
  never displayed before the turn's dispatch.
- **`live_first_ms`** is V − Q on shown=live turns, so the speed bar reads first visible text. It is W − Q otherwise,
  and `-` when there is no router turn.

**Decision.** The first matching row decides:

| # | condition | shown | route / reason |
|--|--|--|--|
| 1 | the router is `down` at Q | pipeline | reader's / `router-down` |
| 2 | no deciding router turn has a complete first word by Q + 2000 ms | pipeline | `invalid` / `late` if one pairs later, else `no-router-turn` |
| 3 | the first word is a hard word | pipeline + cues | `hard` / `-` or `garbled-hard` |
| 4 | **(I1)** at V, `checkCompleted` already fails: a marker, > 80 words, or the turn has already ended cut or with < 8 words. This covers a misheard "hard" such as `Heart.` | pipeline + cues; Live is never shown | `invalid` / `marker`, `too-long`, `incomplete` or `too-short` |
| 5 | otherwise | **Live streams**; the pipeline answer is a hidden shadow | from the final check: `-`, or a failure after V (append) |

- **[choice] I1's "too short so far"** is read as "the router turn has already ended with fewer than 8 words by V".
  A turn that is still streaming at V is shown; if it ends short, it appends.

**Holding.**
- The pipeline request is sent at dispatch, as today.
- Its display events are held until the decision, then released (rows 1–4) or hidden (row 5).
- The decision is due at V, or at Q + 2000 if no deciding first word has come by then.

**Live display.**
- Live text streams from V as it arrives, through the §7.1 filter. It carries the model label `gemini-3.8-live`.

**A failure after V** (marker, too-long, `incomplete-after-show`, too-short) appends:
- the Live text already shown stays;
- the pipeline answer for the turn is appended below it, marked **"(full answer)"**, with cues, through §4.5 case C.

**[choice] Stopping a failed Live stream.** On `marker` or `too-long`, Live display stops at the token that carries the
marker, or at the 81st word.

**[choice] The 10 s cap.**
- A Live turn that has not ended by Q + 10 000 ms is cut (`endKind: cap`). Its display stops, and the pipeline answer is
  appended.
- Provenance: router40's maximum `generationComplete` was 7583 ms after clip end (RH05, 71 words), on synthetic audio.
- M6: Q is a VAD stop, with up to 3.7 s before dispatch. A cap on a 71-word answer would come after about 8.8 s of
  display.

**Supersede.** A turn supersede (`replace: true`) replaces everything shown for the turn with the pipeline's new answer
(§4.5 case E). The router turn is not re-read.

**Cues** appear only when a pipeline answer is shown. That happens on rows 1–4 and in a "(full answer)" append.

### 4.4 Ear failover

- **Trigger:** when the ear's state reaches `failed` on `gemini-3.1-flash-live-preview`, main stops that
  `GeminiLiveRouter` and starts a new one on `gemini-2.5-flash-native-audio-latest`.
  - The model becomes a constructor parameter; its default is today's `LIVE_ROUTER_MODEL`.
  - The failover is logged.
- **Limits of the trigger (I5):**
  - `failed` comes only after 3 failed quick reconnects (`GeminiLiveRouter.ts:532–541`).
  - It never fires on a silent 3.1: the known failure goes silent with no close.
  - It never fires on quota closes, which back off and never reach `failed`.
- **[choice] No fail-back.** The ear stays on 2.5 until the meeting ends. If 2.5 also fails, it behaves as today (red
  chip, slow retry), and the Deepgram detector still answers.
- **An ear that starts on 2.5** (for example through `NATIVELY_LIVE_MODEL`) never fails over. Its `ear=2.5` holds from
  the start.
- **The router does not depend on the ear (user ruling I5 = B, 19:45).**
  - The 3.8 router session is independent of the ear, so a 2.5 failover affects only listening.
  - While the ear is on 2.5, the router keeps working and keeps showing valid easy answers, through the same arbiter
    rows.
  - This replaces the "backup ears only listen" reading for the ear. Only a router that is down sends everything to the
    pipeline (arbiter row 1).
- **An ear failover is logged and reported only.** It never voids the run, and turns after it stay in every count.

### 4.5 Main→renderer answer contract (B2, B3, M7)

**Engine events carry `turnId` (B3).**
- `IntelligenceEngine` adds `turnId` (from `options.turnId`, already passed by `answerDetection`) as the last argument
  of three emits:
  - `suggested_answer_token` (IntelligenceEngine.ts:482, 490);
  - `suggested_answer` (515);
  - `suggested_answer_source` (475).
- Typed and manual answers carry `undefined`.

**IPC payloads (main.ts 2419–2445 and `preload.ts`).** Optional fields are added; nothing is removed.
- `intelligence-suggested-answer-token`:
  `{ token, question, confidence, replace, cues?, turnId?, origin?: 'live'|'pipeline', append?: true, label?: '(full answer)' }`.
- `intelligence-suggested-answer`: `{ answer, question, confidence, replace, turnId?, origin?, append?: true }`.
- `intelligence-suggested-answer-source`: `(label, turnId?)`.
- All three are forwarded through `arbiter.forward(event)`.
  - An event with no `turnId`, or with the flag off, passes straight through.
  - An event with a `turnId` is forwarded, held, hidden or re-tagged according to the turn's decision.

**Renderer (`answerMessages.ts`, `NativelyInterface.tsx`).**
- A `what_to_answer` bubble records three fields: `turnId`, `origin` (`live` or `pipeline`), and the source label in
  force when it was created. A later source event never relabels an earlier bubble.
- **`applyAnswerToken`:**
  - a token with `append: true` never joins a bubble without `append`. Its first token opens a new bubble headed
    "(full answer)".
  - a token with `replace: true` and a `turnId` rewrites the **first** bubble with that `turnId` and removes the later
    bubbles with that `turnId`.
  - with no `turnId`, today's behaviour holds.
- **`applyFinalAnswer`:**
  - it finalizes the streaming bubble with the same `turnId`, `origin` and `append`, and overwrites only that bubble's
    text;
  - with no `turnId`, today's last-streaming-bubble behaviour holds.
- The stream metrics (`sm.markFirstToken` / `markDone`) run once per bubble. Each final event closes its own bubble's
  metrics.

**Event sequences.** Each case lists, in order, what the renderer receives for one turn. The 🎙 `live-question` event is
unchanged.

| case | what reaches the renderer |
|--|--|
| **A. Pipeline shown** (rows 1–4) | the turn's held pipeline events, released in their original order (source, first token with its `replace`/`cues`, tokens), then live pass-through, then the pipeline final. All carry `origin: 'pipeline'` and `turnId`. With nothing held, this is today's sequence plus `turnId`. |
| **B. Live shown** (row 5, final check ok) | main synthesizes: source `gemini-3.8-live`; token events of the Live text deltas from V (`origin: 'live'`, `replace: false`, no cues); one final `{ answer: <Live text as shown>, origin: 'live' }` when the router turn ends. Every pipeline event for the turn is hidden (case D). |
| **C. Live shown, then "(full answer)"** (row 5, a failure after V) | case B up to the failure point. Then the synthesized Live final (closing the Live bubble with the text as shown). Then the pipeline's source event. Then its held tokens and its live tokens, each with `append: true`, `origin: 'pipeline'`, and `label: '(full answer)'` on the first. Then its final with `append: true`. |
| **D. Hidden shadow** (row 5) | nothing. The pipeline's tokens, cues, source and final for the turn are dropped in main. They are recorded only by the capture (§5) and the decision line's `shadow` field. |
| **E. Supersede after a Live show (M7)** | the pipeline's replacing stream for the same `turnId` is forwarded: first token `replace: true`, `origin: 'pipeline'`, then its final with `replace: true`. The renderer rewrites the first bubble of that `turnId` (the Live bubble) and removes the "(full answer)" bubble if there is one. |

### 4.6 Conversation history (I3)

- **The hidden shadow never enters the history.**
  - `IntelligenceEngine` calls `session.addAssistantMessage(fullAnswer)` (≈ line 504) only after the arbiter's decision
    for the `turnId` is known.
  - On shown=live turns without an append it does not call it.
- **The Live answer that was shown enters the history**, as the turn's assistant message, at its full shown text. Main
  adds it when the router turn ends. If the Live stream was stopped at a marker or at the 81st word, the shown text is
  the text up to that stop.
- **A "(full answer)" append** adds the pipeline text too, as a second assistant message after the Live one.
- The `[Answer] full:` debug line (`SessionTracker.ts:252`) therefore logs exactly what entered the history.
- `interview60.judge.mjs` keeps reading that line for the in-app arm.

## 5. Monitoring

**One decision line per decision**, written to `verbal-diag.log` through the main process's diag writer and mirrored to
the debug log. It has the approved fields, plus `q_src` (M4):

```
[Router] turn=<n> route=easy-answer|hard|invalid reason=<…> live_first_ms=<n> live_words=<n> shown=live|pipeline shadow=<pipeline first-token ms> ear=<3.1|2.5> router=<up|down> q_src=<vad|final>
```

**Fields:**
- `turn`: the turn id, or `-` for an unpaired router turn.
- `route`: as in §4.2.
- `live_first_ms`: as in §4.3.
- `live_words`: the words of the final router text.
- `shadow`: the pipeline answer's first-token ms for the turn, as the existing diag measures it, whether the answer was
  shown or hidden; `-` if none.
- `ear` and `router`: their state at Q.
- A shown=live line whose reason is not `-` means the answer was appended.

**Reasons:** `-`, `garbled-hard`, `too-short`, `too-long`, `incomplete`, `incomplete-after-show`, `marker`, `late`,
`router-down`, `no-router-turn`, `unpaired`, `dup`.

**When a turn's line is written.** It is written when three things are all done:
- the decision;
- every paired router turn has ended, or the turn has closed;
- the pipeline answer has ended (completed, aborted or failed).

Each `dup` and each `unpaired` router turn gets a line of its own.

**Session lines:**

```
[Router] session connect model=gemini-3.8-live block_sha12=e11c240063ea instruction_sha12=e29bf3810128 context_sha12=<…> context_chars=<n>
[Router] session up setup_ms=<n>
[Router] session reconnect attempt=<n> reason=<…>
[Router] session close gen=<n> code=<n> reason=<…> stale=<yes|no> quota=<yes|no>
[Router] session refused reason=<sha-mismatch|model-mismatch>
[Router] session failed reason=<…> dispatches_before=<n>
[Router] ear failover from=3.1 to=2.5 reason=<the ear's failed reason> dispatches_before=<n>
[LiveRouter] close gen=<n> code=<n> reason=<…> stale=<yes|no>
```

**The answer capture (I4).**
- **In the app:** one JSON debug-log line per answer text, for every paired dispatched turn:
  `[RouterAnswer] {"turn":<n>,"kind":"live"|"shadow"|"appended","text":<string>,"words":<n>,"firstMs":<ms from Q>,"endMs":<ms from Q>,"q_src":"vad"|"final"}`.
  - `live`: the Live text as shown.
  - `shadow`: the pipeline answer of a shown=live turn, kept whole and hidden.
  - `appended`: the pipeline answer shown as "(full answer)".
  - Pipeline-shown turns (rows 1–4) are captured by the existing `[Answer] full:` line.
- **In the harness:** `auto()`, at snapshot time, writes two files into the run folder, keyed by roster id through the
  play-window mapping:
  - `interview60.answers.router-live.json`: one entry per Live-shown turn;
  - `interview60.answers.router-shadow.json`: one entry per shadow or appended pipeline answer, with `appended: true|false`.
  - Each entry holds `{ id, turn, text, words, firstMs, endMs, q_src }`.
- **The grading export** for the side-by-side blind packets reads these two files. The smoke must show that a hidden
  shadow reaches `router-shadow.json` whole: its word count equals the `[Answer]`-free pipeline stream's final length,
  as the engine logs it.
- **What is graded:**
  - a shown Live answer is graded **as shown**, the Live text alone, for both Safety and Quality;
  - an appended pipeline answer is graded separately, as a pipeline answer shown (No regression);
  - on appended turns, the Quality pair is the Live text against that same pipeline text.

**The run reader** (`natively-lab\sp\router-default\router-hour-read.mjs`). It reads one run folder and prints counts and
ms only, never text. It prints:
- decisions by route × reason × shown;
- `live_first_ms` p50/p90 on shown=live, overall and split by `q_src`;
- `live_words` p50/max;
- the shadow first-token p50/p90;
- appends by reason;
- `unpaired` and `dup` counts;
- router-session failures and ear failovers, each with `dispatches_before` (the ear's are reported only);
- connects, reconnects and closes for the router and the ear, by reason and code, with stale closes and **router quota
  closes counted separately (I7)**;
- router down time in minutes;
- dispatched turns with no decision line (must be 0);
- dispatched turns with nothing shown (must be 0);
- capture entries per kind against decisions (must match).

It also performs these checks:
- **Item mapping:** by play window (`OFFSET_MS` 1150).
- **Safety, text half:** no shown Live text has a hard first word; no shown text of any kind carries a marker.
- **Fallback:** every failure after V has its appended full answer; no shown=live turn has a hard first word; no row-4
  turn shows Live.
- **The 2 s gate on W** is proven by the unit tests and the replay (§9), not by this reader.
- **VOID checks:** a `[Router] session failed` with `dispatches_before` < 10, and router down time over the
  registration's limit (§10).
- **Calibration (rule 8):** synthetic logs with known counts, at least one case per reason, and both VOID triggers.

## 6. Failure table

| failure | behaviour |
|--|--|
| silent or late (no first word by Q + 2 s) | pipeline |
| first word "hard" in any form (`hard.hard`, `"hard"`, `hardhard`, repeats) | pipeline + cues |
| invalid already at V (marker, > 80 words, ended cut, ended < 8 words, e.g. `Heart.`) | pipeline + cues; Live never shown (I1) |
| shown Live turn later cut, too long, too short or carrying a marker | Live stays (stopped at a marker or the 81st word); the pipeline answer is appended below, marked "(full answer)" |
| router turn interrupted before dispatch | discarded; the next paired turn may decide (I2) |
| duplicate router turns | the §4.3 deciding turn wins; the others are logged `dup` |
| router down | pipeline for everything |
| ear 3.1 failed | 2.5 for listening; the router is unaffected and keeps showing valid easy answers; logged and reported only |
| router session failed (quick attempts exhausted) | pipeline for everything while it is down; before the 10th dispatch the run is VOID |
| stale session callback (ear or router) | ignored; no reconnect; the live session untouched (§7.3) |

## 7. Ride-along fixes and the live40 harness

### 7.1 Unknown-marker filter (option A)

- **Evidence:** 5 of 120 cue answers leaked a marker (S1Q05).
- **What it does:** it strips any unknown `__WORD__` marker (`WORD` = `[A-Za-z][A-Za-z0-9_]*`) from the displayed
  answer stream.
- **Known markers are unchanged:**
  - `__MORE__`, handled by `stripSuggestionBlock`;
  - `__CUES__`, handled by `stripCueBlock`;
  - `__model_source:<id>__`, handled by `stripModelSentinel`.
- **Where it runs (M5):** as the outermost stage **inside** `filtered` (`WhatToAnswerLLM.ts` 398–404), wrapping
  `stripSpokenNotation(…)`.
  - That is **before** `nameStallSwitch` and `withVerbalFallback` re-insert the model sentinel (410–432).
  - It must never wrap `cutAtWordBudget`'s output or anything later, where the sentinel and the hedge label's `__` are
    live.
- **Streaming:** a trailing partial `__…` is held until one of two things happens:
  - it closes with `__`, and is stripped if it is unknown;
  - whitespace, a non-word character or the end of the stream arrives, and it is released unchanged.
- **Live text** passes through the same filter.
- **[choice]** The filter is not behind the flag.

### 7.2 Harness: the probe's answers finish before the run (option A)

- **The change:** in `interview60.run.mjs` `auto()` (536–582), between `probe()` reporting ready and `appPass()`, `auto`
  waits until two things hold:
  - every probe turn's answer has ended (completed, aborted or failed);
  - no interviewer turn is open.
- **Evidence:** flight-eq D5. The probe's second turn was answered 4.2 s into the run window.
- **[choice] A 120 s cap.** If the wait times out, `auto` exits 1 without starting the run ("The hour was NOT spent").

### 7.3 Ear reconnect fix (user's answer to rev 1; rides along)

**Diagnosis:** `natively-lab\sp\router-default\DIAG-reconnects-ttft.md`, Q1.
- On `goAway` the ear reconnects twice.
- The two sessions' callbacks are not tied to their session, so when the orphan dies (~152 s on 3.1), `handleClose`
  tears down the live session.
- The eq hour logged 26 reconnects.

**The fix** (about 15 lines in `GeminiLiveRouter.ts`):
- A connection generation counter: callbacks from a stale generation are ignored, and a late stale session is closed.
- The old session is marked stale before the `goAway` close.
- `scheduleReconnect` skips when a reconnect is already pending.
- The close code is logged.

**Tests first** (fake `connectFn`):
- a `goAway` gives exactly 1 connect;
- a stale session's `onclose` gives 0 reconnects and leaves the live session unchanged.

**Expected effect:** about 6 reconnects per hour, with no orphans. The smoke checks this.

**Not behind the flag.** The registration names it as a change to the ear under the pipeline.

**Not fixed:**
- DIAG Q2 (the TTFT p90 of 10.3 s) was a provider transient.
- Each `goAway` still leaves a gap of about 0.5–1 s.

### 7.4 The live40 harness (user's answer to rev 2; built today)

**Why it is needed.** `interview60.run.mjs` cannot play live40 today:
- `roster.mjs` knows only `interview60`, `scenario50` and `holdout40`;
- live40 has 47 clips but no questions module and no continuous wav.

**What the build adds:**
1. **`electron/test/golden/live40.questions.mjs`,** generated from `natively-lab\sp\live40\items.json` (sha256
   `e531772bdc6e9c23…`; the generator refuses any other).
   - It holds 47 items in live40's chain order (31 chains, SET-draft §5).
   - Each item has `id`, `q` (the item's `text`), `gapMs`, `chain`/parent where it has one, the router40 `route`
     (EASY/HARD) and its `class`.
2. **A `roster.mjs` entry:**
   `live40: { items: LIVE40, ttsLocal: 'live40-tts-local', ttsGemini: 'live40-tts', wav: 'live40.wav' }`.
   - It is selected with `NATIVELY_ROSTER=live40`.
   - It has no scenarios.
3. **One continuous `live40.wav`,** built by `interview60.build-audio-local.mjs`.
   - **Input:** the clips, copied from `live40\clips\<id>.wav` into `live40-tts-local\<id>.wav`, each with an `<id>.txt`
     stamp equal to `q`. The builder reuses them; a clip it would re-render is an error.
   - **Checks on each clip:** 24 kHz, mono, 16-bit, and a PCM `sha12` equal to `manifest.json`'s. The manifest's `path`
     fields point into an old Temp scratchpad and are not used.
   - **Expected warnings:** the builder's SUSPECT line will show RE11 1.57 w/s and EF06 1.58 w/s, as `suspectRate`
     already records. These are expected and recorded.
4. **A wav check:** `interview60.run.mjs wav:check` with `NATIVELY_ROSTER=live40` (`wavMismatch`, within 1 s). It is
   calibrated once on a deliberately wrong wav.
5. **Attribution:** play windows come from the timeline (`OFFSET_MS` 1150).

**The gap, derived from `DEFAULT_TURN_CONSTANTS`** (`interviewerTurn.ts:25`: gate 1200, settle 400, unfinished hold
2500, continuation 8000, max hold 8000, wordless grace 3000 ms):

| step | ms | why |
|--|--|--|
| dispatch, normal turn | stop + 1200, or + 3700 with the unfinished hold | the quiet path |
| dispatch, fail-safe | the latest of detection, last final and last stop, + 8000 | a late final or a stuck transcript |
| close after dispatch | dispatch + 8000 (continuation) with no new words | speech in this window joins the SAME turn |
| worst close after the voice stops | 8000 + 8000 = **16 000** | fail-safe dispatch, then continuation |
| the arbiter's just-closed pairing window | + 2000 | so question k+1's router turn cannot pair with turn k |
| **minimum gap** | **18 000** | |
| **[choice] chosen gap** | **20 000** for every item | 2 s of margin for the settle and a late final; the 10 s cap also ends inside it |

- **Length:** 218 s of clips + 47 × 20 s ≈ 19.6 min of audio.
- **[choice] Gap adjustment from the smoke.** The pipeline answer for turn k should end before turn k+1 dispatches.
  - The smoke measures this for every turn. In the eq hour, first token came at p50 4.9 s and p90 11.25 s; answer
    duration has not been measured.
  - If any answer did not end in time, the gap is raised above the measured maximum before the registration is sealed,
    and recorded there.

## 8. Diagnosis (done)

`DIAG-reconnects-ttft.md`:
- Q1, the 26 reconnects, is proven and isolated. Its fix lands as §7.3.
- Q2, the TTFT p90 of 10.3 s, is a provider transient. No fix lands.

## 9. Testing (before the run)

1. **TDD unit tests**, each seen failing first.
   - **The reader on router40's 47 real outputs** (`router40\runs\router40-R.answers.json`, without `RH05~a1`).
     - Expected first words: `hard` 27, all of them 1-token outputs (25 clean; 2 `garbled-hard`: RH08, RH10).
     - Expected `live` 20: the 19 EASY answers, RE18 included, plus RH05.
     - `checkCompleted` is `ok` on all 20 (30–71 words, no markers).
     - These counts were made at spec time from token counts and are binding through the test.
   - **The reader on garbles and edge cases:** `hard.hard`, `"hard"`, `Hard.`, `hardhard`, `hard".hard".hard`,
     `hardware`, "hard" as the 36th word, a first word split across chunks, markers, 7/8/80/81 words, cut text, and
     `Heart.` (row 4: `too-short`, never shown).
   - **The arbiter:**
     - every row and reason;
     - pairing: open, just-closed ≤ 2000 ms, unpaired, a turn closed without a dispatch;
     - **I2:** an interrupted early turn followed by a real turn, where the real turn decides; a completed early turn
       followed by a real turn, where the last one at dispatch decides;
     - `dup`;
     - no display before dispatch;
     - **I1:** row 4 for each cause;
     - each append path, with the stop at a marker and at the 81st word;
     - the 10 s cap;
     - supersede;
     - router-down;
     - ear=2.5 with the router up, where Live is still shown (I5 = B);
     - **B3:** two overlapping turns whose pipeline events interleave, each held, hidden or released only under its own
       `turnId`.
   - **The answer contract (§4.5):**
     - in main: the exact event sequence for each of cases A–E;
     - in `answerMessages.ts`: an append bubble opens under "(full answer)" and never joins the Live bubble; a final
       with `turnId` closes only its own bubble and overwrites only its text; a replace with `turnId` rewrites the
       turn's first bubble and removes its append; events without `turnId` behave exactly as today (the existing tests
       stay green);
     - per-bubble source labels and metrics.
   - **History (§4.6):**
     - on a shown=live turn, the history gets the Live text and not the shadow;
     - on an append, the history gets both;
     - on a pipeline-shown turn, it is as today.
   - **The capture (§5):** `[RouterAnswer]` lines for each kind, and the two harness files built from a synthetic log.
   - **The marker filter:** unknown markers are stripped; known markers and the hedge label are left intact; the filter
     is placed inside `filtered` (M5); a marker split across chunks is handled.
   - **The reconnect fix and the router's generation guard:** §7.3's two cases, for each class.
   - **Failover:** a `failed` on 3.1 starts 2.5 once and logs it once, including `dispatches_before`; there is no
     fail-back; a 2.5 start never fails over; the arbiter's decisions are unchanged by the ear model.
   - **Router-session failure:** exhausting the quick attempts logs `[Router] session failed` once, with
     `dispatches_before`; a quota close never logs it.
   - **The harness wait (§7.2)** and **the live40 harness (§7.4):**
     - the generator's sha refusal;
     - 47 items in chain order with their parents;
     - the builder's format, hash and re-render refusals;
     - `wav:check` passing and failing.
2. **Offline replay.** Router40's saved turns, with Q = clipEnd and the dispatch at Q, run through the reader and the
   arbiter.
   - Expected: shown=live 20, all on time; pipeline 27; appends 0; row 4: 0.
   - Any difference is explained before the build is called done.
3. **A ~2-minute live probe** (a standalone script, not the app). It drives the built `LiveRouterSession` on at least
   2 EASY and 2 HARD router40 clips and checks:
   - the model assert;
   - the shas, including `context_sha12` stability across a forced reconnect;
   - that the cached profile summary is non-empty with knowledge mode on (chars only, never the text);
   - `setupComplete`;
   - the streaming and end events;
   - the reader's verdicts.

   It prints ids, classes and ms only.
4. **A ~15-minute smoke, overnight before the 05:30 go/no-go,** from a scheduled task, with the flag ON, playing `live40.wav` from the start.
   The first chains (C01 RE01→RH01, C02 RE02→EF01, C03 RH03, …) cover EASY, HARD and follow-ups. The user is warned
   first, because the machine must be quiet. It checks:
   - every `[Router]` and `[LiveRouter] close` line kind it reaches;
   - the ear's reconnect count;
   - cases A–E as they occur on screen and in the debug log;
   - the capture files, including one whole hidden shadow;
   - the history rule;
   - the play-window attribution;
   - whether each pipeline answer ended before the next dispatch (§7.4);
   - the run reader on the smoke's folder.

   Branches it did not reach are listed as residual risk.

## 10. The registered run (T = 2026-10-07 08:00 TST; no-go fallback 2026-10-07 ~23:00)

**The registration.**
- It is registered like flight-eq, in a separate pre-registration written and Opus-reviewed before any data.
- It fixes the arming, the instruments with their sha lines, the launchers and the precheck.
- It names §7.3 as a change to the ear under the pipeline.
- It sets the router-down limit (I7): how many minutes of router down time make the run VOID.

**The roster: live40, router40's set.**
- 47 turns in 31 chains: 20 EASY, 27 HARD, follow-ups included (E 20, H 11, QF 9, AF 7).
- `natively-lab\sp\live40\items.json` (sha256 `e531772bdc6e9c23…`).
- `live40.wav` from §7.4, with 20 s gaps (or the smoke-raised value), played hands-free with `NATIVELY_ROSTER=live40`.
  The registration records the wav's sha and its `wav:check` line.

**Labels and denominators.**
- They come from router40's key, `natively-lab\sp\router40\keyhold\key.json` (sha16 `42e1b04f1f60283f`), carried into
  `live40\items.json` `route`.
- Two blind Opus classifiers agreed with the key 47/47 (`router40\blind\verdicts.c1.json`, `.c2.json`).

**Settings.**
- The flag `NATIVELY_LIVE_ROUTER=1` is ON.
- The earlier-question block is OFF (`NATIVELY_EARLIER_QUESTION` unset).
- Cues stay on the pipeline path. They have no flag.

**Precheck at T−6 min (I7).** It requires all of these together:
- `[Router] session up`, the registered `block_sha12` and `instruction_sha12`, and the `context_sha12` the smoke recorded;
- the ear connected on 3.1;
- both sessions up at the same moment.

**Grading.**
- The grader is pinned to `claude-opus-5-5`, memory-clean (`--setting-sources project,local`), in flight-eq's grader
  command form.
- **Blind, side by side:** each Live-shown answer as shown, against its shadow pipeline answer, from the two capture
  files (§5).
- **Also graded:** the pipeline-shown answers (in-app `[Answer] full:`), the appended answers, and the bare arms (bare
  3.5-lite HIGH, bare 3.1-lite LOW).
- **No past hour is re-graded.**
- **Reported beside the run, not gated:** router40's L arm (bare 3.1-lite LOW, 43/47 acceptable, 0 wrong;
  `RESULT-router40.md`), with its existing grades.
- **Grade definitions**, as in router40's score:
  - acceptable means both graders give correctness 2 and on-topic 2;
  - wrong means either grader gives correctness 0.

### 10.1 Quota (corrected in rev 4c)

**The quota day.**
- It runs from 10:00 TST to 10:00 TST (07:00Z).
- Last night's flight, the G sitting and the arms all ran before 2026-10-06 07:00Z, so they counted on the previous quota
  day.
- The current quota day started at 2026-10-06 10:00 TST and ends at 2026-10-07 10:00 TST. No Gemini call has been made
  in it; only Opus grading has run.
- Headroom for the 08:00 run is therefore about **500 per lite model** (3.5-lite, 3.1-lite). Full Flash (20/day) is used
  by nothing here.
- Rev 4b's "≥ 106" premise came from a stale ledger, and is withdrawn.

**The ledger.**
- `natively-lab\sp\quota-ledger-today.mjs` was stale: it still used the 2026-10-05 reset.
- Before any arming read, it is fixed to derive the reset from the current date (the latest 07:00Z at or before now).
- It is proven by a known-answer check: a fixed "now" on each side of 07:00Z gives the expected quota-day start.

**Expected use on this quota day.** Everything from the smoke to the arms falls before 10:00 TST.
- Hedge ratios come from the eq hour: 42 hedge runs for 40 items (≈ 1.05 3.5-lite fronts per item), and 11 3.1-lite
  back starts in 42 runs (≈ 0.27 per item).

| piece | 3.5-lite | 3.1-lite |
|--|--|--|
| live probe (§9.3) | 0 | 0 (3.8 Live only) |
| smoke (§9.4): ~33 items + probe 2 + warm-up/ping ~2 | ≈ 39 | ≈ 9 |
| the live run: 47 dispatches + readiness probe 2 + warm-up/ping ~3 | ≈ 55 | ≈ 13 |
| bare 3.5-lite HIGH | 47 | 0 |
| bare 3.1-lite LOW | 0 | 47 |
| captured `captured-high` | 47 | 0 |
| **total** | **≈ 188** | **≈ 69** |

**The arms run right after the live run, before 10:00 TST, in this order:**
1. bare 3.5-lite HIGH: 47 requests;
2. bare 3.1-lite LOW: 47 requests;
3. **[choice] the captured arm, `captured-high`:** the run's captured pipeline prompts (`interview60.prompts.json`)
   are re-sent once to 3.5-lite HIGH, as in flight-eq. It is reported only.

Grading starts after all three arms have finished. Any arm request that lands after 10:00 TST counts on the next quota
day. The run reader records that, and it is not an error.

**The arming gate.**
- The arming record carries a **fresh ledger read**, taken with the fixed script after its known-answer check passes.
- It compares the remaining headroom with the computed need from arming to the end of the arms: ≈ 149 on 3.5-lite (run
  55 + arms 94) and ≈ 60 on 3.1-lite (run 13 + arm 47).
- **[choice] Margin:** headroom must be ≥ 1.5 × need on each lite model, that is ≥ 224 on 3.5-lite and ≥ 90 on
  3.1-lite. Otherwise the run moves to the 23:00 fallback.

**On the 23:00 fallback,** the run and its arms fall on the 2026-10-07 quota day (from 10:00), and the same gate is
re-read.

### 10.2 Bars (user's option A)

| bar | rule | read by |
|--|--|--|
| **Safety (decisive)** | 0 garbled or routing-token text shown (no hard first word, no marker), AND 0 wrong Live answers shown (graded as shown) | run reader + grades |
| Fallback | every Live failure caught: no row-4 turn shows Live; every failure after V has its "(full answer)"; 0 dispatched turns with nothing shown | run reader |
| Quality (the in-run shadow) | acceptable(Live shown) ≥ acceptable(shadow, same items) − 1 | grades |
| Speed | first visible text (`live_first_ms` = V − Q) p50 ≤ 2500 ms on shown=live | run reader |
| Routing | EASY caught ≥ 13/20; HARD misrouted ≤ 1 of 27 | run reader + router40 labels |
| No regression (absolute gate) | 0 wrong pipeline answers shown on the 27 HARD items (follow-ups included; appends count) | grades |

**Definitions.**
- **EASY caught:** an EASY item with shown=live.
- **HARD misrouted** [choice]: a HARD item whose deciding router turn had a first word that was not a hard word, whether
  or not it was shown. This is stricter than counting shown items only.
  - M2: a HARD item with no deciding router turn (`late`, `no-router-turn`, `unpaired`, `router-down`) is not counted
    as misrouted, and is reported.
- **Speed comparison (reported):** the pipeline's first-token p50 is ~4.5 s. Router40's L TTFT p50 was 4.43 s, and the
  eq hour's diag median was 4899 ms.
  - Both are measured from request send, not from the question end, so the pipeline's time from question end is later.
  - The run reader reports the in-run shadow's p50 beside Live's, split by `q_src`.
- **No regression:** the gate is absolute because the pipeline answers every question in the same run and the router
  does not change it. Router40's L arm is reported beside it and never gated.

## 11. Verdict

- **VOID** (checked first; the re-fly is not spent) if either:
  - the router session failed (`[Router] session failed`) before the 10th dispatch;
  - router down time was over the registration's limit.
- **PASS** (every bar met): the flag defaults ON, in its own reviewed commit; `NATIVELY_LIVE_ROUTER=0` then turns it
  off.
- **Safety FAIL:** the router stays behind the flag, default OFF.
- **Anything else:** INCONCLUSIVE, with one re-fly.
- **A second INCONCLUSIVE has no automatic outcome.** The controller reports, and the user rules.

## 12. Open questions

None. The user ruled on the last question (the router's CONTEXT, option A, §4.1a) in rev 4c.

## 13. Suggestions recorded, not part of the build

- The 3.8 Flash ceiling spike (S1Q02, S2Q02, S2Q05F; ~9 requests; reported only).
- Cues on or off by default, tested on their own.
- The flight-eq re-fly prep.
- `power-events.ps1`, and running the clocks instrument.
- Later, merging the ear into the router session once a test shows one session can do both. That would halve the Live
  cost.
- Reviewer's fallback cuts, if time runs short. These need the user's ruling, because the failover is approved:
  - the ear failover;
  - the 2-minute probe;
  - the run reader's reconnect tallies.

## 14. Residual risks (not proven by anything run so far)

**Session and context.**
- **Session length:** router40 ran one session per chain. One router session for the whole run, with reconnects and no
  resumption, has never run.
- **Context:** the router's CONTEXT is now a fixed profile summary (§4.1a), not router40's per-question retrieval block
  `dd74bbde…`. Its effect on routing is unmeasured; only the smoke and the run exercise it.

**Pairing and display.**
- **Pairing by time is new.** I2 discards interrupted early turns. A completed early answer to half a question (a
  pause, then more speech, with no interruption) can still decide. Only the Safety bar measures it.
- **Streaming shows text before the final check.** A later trailing "hard" or a garble other than `Heart.`-like short
  turns can reach the screen. The Safety bar counts it. In router40, every hard output was a single token, and no
  answer carried a marker.
- **The dispatch gate:** V ≥ Q + 1.2 s on every shown turn. That leaves about 1.3 s of room under the 2.5 s bar on a
  normal turn. Turns that hit the unfinished hold (V ≥ Q + 3.7 s) count against the p50.

**The live40 run.**
- **Synthetic and short:** 47 SAPI or reused clips, ~20 min. Follow-ups come 20 s after their parent. Its EASY share
  is not a measured share of real interviews.
- **The 20 s gap is derived from the turn machine, not from answer length.** The smoke measures answer endings.

**Sessions, latency and reconnects.**
- **Two concurrent Live sessions on one key** double the Live cost. Their quota and concurrency limits are checked
  only by the precheck, the smoke and the VOID rule.
- **Router40's latencies** are measured from clip end, on synthetic audio with ~0.69 s of trailing silence. In-app, Q
  is a VAD stop, or a final (`q_src`).
- **~6 reconnects per hour (§7.3)** assumes a fed 3.1 session is not itself aborted (DIAG).
- **Ear failover** cannot fire on a silent 3.1 or on quota closes (§4.4). Such an ear failure leaves the run on Deepgram
  alone. The router still hears, because it has its own session.
- **A router quota wall never reaches `session failed`.** It shows up only as router down time, which the
  registration's down-time limit voids.
- **Arms after the run:** whether all three arms finish before 10:00 TST depends on their speed, which has not been
  measured for back-to-back arms. Spill-over counts on the next quota day (§10.1).
