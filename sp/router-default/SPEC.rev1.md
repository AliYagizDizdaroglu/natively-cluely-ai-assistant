# SPEC: the 3.8 Live router as the app's default extension (router-default)

Written 2026-10-06 19:13 TST (`date`) by the Opus spec author. It records the design the user approved section by
section in chat on 2026-10-06. Where the approved text left a choice open, this spec makes it and says so, marked
**[choice]**. Questions that are still undecided are in §12.

## 1. Purpose and scope

- **Goal of tonight's flight (user's option A):** validate the "3.8 Live router" path as the app's new default
  extension, in one late, unattended, registered hour (~23:00–03:00), registered like flight-eq.
- **In scope:** the router session module, the route reader, the arbiter in main, the ear failover, the monitoring
  lines and the hour reader, two ride-along fixes (§7), a read-only diagnosis (§8), the tests (§9), and the hour with its
  bars and verdict (§10–§11).
- **Next target, out of scope:** the flight-eq re-fly. It is on the agenda, is not part of this spec, and never shares an
  hour with this flight.
- **Not in scope:** the cue-less follow-up parent fix and the mishearing fix (S1Q05F, S2Q06F). Both belong to the
  flight-eq re-fly track.
- **Hands-free only:** the router acts only on turns that the interviewer-turn machine dispatches in `auto` live mode
  (`main.ts` `dispatchDetection`, 2088–2198). Typed questions, manual chips and every other path are unchanged.

## 2. Global constraints (binding project rules)

1. **Never start the app from a Claude session.** It reads a shadow `credentials.enc` there. The app runs only from a
   scheduled task or the user's terminal.
2. **Flights only via scheduled tasks**, armed and prechecked as flight-eq was.
3. **Opus reviews** every spec, plan, code change and result. The author and the reviewer are separate Opus subagents.
4. **TDD:** each test is written first and seen to fail before the code that makes it pass.
5. **MAIN commits only via `natively-lab\sp\commit-main-paths.ps1`**, because the index is shared. Check the branch of
   both checkouts before editing (MAIN is on `fix/coding-style-suffix-all-gemini` as of this writing).
6. **Never print keys or captured prompts.** Keys are read in-process and only their names are printed. Hashes and
   character counts may be printed; prompt text may not.
7. **Pass records:** every pass is saved to `passes/<run>.md` + `INDEX.md` and committed with the change it measures.

## 3. Architecture: two Live sessions side by side (Approach 1)

```
interviewer audio (16 kHz mono PCM, the ear's existing feed)
   ├── EAR    GeminiLiveRouter (gemini-3.1-flash-live-preview, tool calls)  → turn machine → pipeline (unchanged)
   │            └─ on state 'failed' → failover to gemini-2.5-flash-native-audio-latest (§4.4)
   └── ROUTER LiveRouterSession (gemini-3.8-live, router40 setup, text from output transcription)
                └─ router-turn events → ARBITER in main ← turn machine (open / just-closed turn, question end)
                                              └─ shows Live (easy-answer, on time) or the pipeline answer
```

- **The ear stays today's `GeminiLiveRouter`.** It is a tool-call listener feeding the turn machine
  (`interviewerTurn.ts`) and the pipeline unchanged. The only new behaviour is the failover in §4.4.
- **The router is a new, separate session.** It never feeds the turn machine and never dispatches.
- **The pipeline always dispatches.** For every dispatched turn the pipeline answer is generated exactly as today, with
  cues. The arbiter decides only which answer is shown.
- **Flag:** `NATIVELY_LIVE_ROUTER=1` enables the router session, the arbiter and the ear failover. It stays default OFF
  until the hour PASSES (§11). Flag off means no router session, no failover, and today's display bytes.
  **[choice]** The ear failover sits behind the same flag, so the default app does not change before the hour.
  The marker filter in §7.1 is not behind the flag (§7.1).

## 4. Components

### 4.1 Router session module (`electron/audio/LiveRouterSession.ts`, beside `GeminiLiveRouter.ts`)

**Setup.** It uses router40's setup (`run-r.mjs`, registration §3.2):
- model `gemini-3.8-live`, as router40's `run-r.mjs:21` uses it. The id is asserted before connect; any other id
  refuses with a logged error.
- `responseModalities ['AUDIO']`, `inputAudioTranscription {}`, `outputAudioTranscription {}`,
  `contextWindowCompression` sliding window.
- **System instruction = router40's composition** (`r40-common.mjs` `buildRSystem`):
  `INSTRUCTION + "\n\n" + CONTEXT + "\n\n" + BLOCK_B`.
  - `INSTRUCTION` is the L20d instruction (`natively-lab\sp\l20d\instruction.txt`, sha256 `e29bf381…`), embedded
    as a constant.
  - `CONTEXT` is the app's knowledge context: the CONTEXT block the app's answer prompt carries, read at each
    connect. In router40 it was the captured S1Q02 slice.
  - `BLOCK_B` is `r40-common.mjs` lines 48–51, byte for byte.
  - **[choice]** The approval names "block B text, the app's knowledge context"; router40's setup also includes the
    L20d instruction, so this spec keeps it.
- **Checked at module load:** `sha256(INSTRUCTION) = e29bf3810128854c115214a50205ac7aa992e84bfcf35dd13147340a8cd41f3f`
  and `sha256(BLOCK_B) = e11c240063eae0f258a1424fe49224aff5e6ffda0aafd2d6be6b553379379ad8`. On a mismatch the
  module refuses to start the session and logs the failure. The flag then has no effect, and the connect line says so.
- **Audio in:** the same 16 kHz mono PCM the ear receives, written from the same callback.
  - There is no gap buffer and no replay. Speech heard while the session is down is lost to the router, and those
    turns read `router-down`.
- **Audio out:** counted and discarded. No audio is written to disk and no playback device is opened.

**Lifecycle.**
- The session starts and stops with the ear (meeting start and stop) when the flag is on.
- On `goAway` or a close, it reconnects using the ear's existing policy constants: 3 quick attempts at 300 ms × n, then
  a slow retry every 15 s, and quota closes back off 5 s doubling to 60 s.
- **[choice]** It never uses session resumption. Every connect is fresh.
  - Block B routes every back-reference to "hard", so the router needs no history.
  - This also avoids the dead-handle resume loop recorded on the agenda for the ear (`GeminiLiveRouter.ts:516–527`).
- **The router is `up`** from `setupComplete` until the next close, and `down` at every other time.

**`router-turn` events.**
- **A router turn** is the output transcription from its first text to the first of `generationComplete`,
  `turnComplete`, `interrupted`, a session close, or the 10 s cap (§4.3).
- **The event is emitted twice for each turn, with the same `seq`:**
  - at first text: `{ seq, text, firstTextAt, completed: false }`;
  - at the end: `{ seq, text, firstTextAt, completed, endKind, endedAt }`.
- **`completed`** is true only if `generationComplete` or `turnComplete` arrived. `endKind` is one of
  `generationComplete | turnComplete | interrupted | closed | cap`.
- **Any output text that arrives after a completed end** is emitted once more as
  `{ seq, text: <the whole text>, afterComplete: true }`.
- **Times are epoch ms** (`Date.now()`) in the main process. "first-text ms" in the log is computed from them (§5).
- **The module emits only text and times.** It never displays anything and never decides a route.

### 4.2 Route reader (pure function, `electron/services/routeReader.ts`)

`readRoute(text: string, completed: boolean): { route: 'easy-answer' | 'hard' | 'invalid'; reason; words }`.

**Definitions:**
- **Tokens:** `text.trim()` split on whitespace.
- **Letters-only form:** lowercase, every non-`a–z` character removed.
- **Hard token:** a token whose letters-only form matches `^(hard)+$`. This covers `hard`, `Hard.`, `"hard"`,
  `hard.hard`, `hard".hard".hard` and other repeats.
- **Clean hard:** exactly one token, whose letters-only form is `hard`.
- **Marker:** any of `<`, `>`, `[`, `]`, or a `__…__` sequence (`/__\S+?__/`).
- **Words:** the number of tokens.

**Rules.** The first matching rule wins:

| # | condition | route | reason |
|--|--|--|--|
| 1 | any hard token anywhere, however garbled | `hard` | `-` if clean hard, else `garbled-hard` |
| 2 | contains a marker | `invalid` | `marker` |
| 3 | words > 80 | `invalid` | `too-long` |
| 4 | `completed` is false (empty text included) | `invalid` | `incomplete` |
| 5 | words < 8 | `invalid` | `too-short` |
| 6 | otherwise (complete, 8–80 words, no marker) | `easy-answer` | `-` |

- **[choice] Rule 1 reads "any hard token" literally: anywhere in the text, not only first.**
  - On router40's 47 real outputs, this makes RE18 (an EASY item, a 42-word answer that uses the word "hard" as its
    36th token) read `hard`. RE18 then falls back to the pipeline.
  - The narrower reading (hard token first, or the whole output made of hard tokens) would keep RE18. The literal
    reading was chosen because the safety bar is decisive.
- **Monotone on partial text.** Rules 1–3 can only become true as text grows. The arbiter may therefore apply them to
  partial text, counting the last token only once whitespace follows it.
- **Empty text** with `completed: true` falls to rule 5 (`too-short`).

### 4.3 Arbiter (in main)

**Inputs:**
- the turn machine's turns: id, open/closed, close time, close kind, dispatch;
- each turn's **question end** `Q`: the turn's `lastSpeechAt` (the moment the voice last stopped, as
  `interviewerTurn.ts` records it) at the moment of its dispatch. The turn machine exposes this read-only.
- the `router-turn` events;
- the router state (`up` / `down`);
- the ear model (`3.1` / `2.5`).

**Pairing a router turn with a turn,** by its `firstTextAt` = F:
- It pairs with the turn open at F.
- If no turn is open, it pairs with the most recently closed turn, provided that turn closed at most 2000 ms before F.
- Otherwise it is **`unpaired`**, as is a router turn whose paired turn closes without a dispatch (candidate,
  not-a-question, nothing-heard).
- An unpaired router turn is never shown.

**Holding the pipeline answer.**
- For each dispatched turn, the pipeline answer's display events (tokens and cues) are held while the decision is
  pending, then either released or kept as a hidden shadow.
- The pipeline request itself is sent at dispatch, exactly as today.

**Decision.** The first matching rule decides:

| # | condition | shown | reason |
|--|--|--|--|
| 1 | the router is `down` at Q, or the ear is on 2.5 | pipeline (released at once) | `router-down` |
| 2 | a paired router turn reads `hard` (on partial or final text) | pipeline + cues | `-` or `garbled-hard` |
| 3 | no paired router turn has first text by Q + 2000 ms | pipeline | `late` if one pairs later, else `no-router-turn` |
| 4 | a paired, on-time router turn ends and reads `easy-answer` | **Live** | `-` |
| 5 | a paired, on-time router turn reads `invalid` (marker, too-long, incomplete, too-short) | pipeline | the reader's reason |
| 6 | no on-time router turn has ended by Q + 10 000 ms | pipeline | `incomplete` |

- **Duplicates: the first valid one wins.**
  - Among the router turns paired with one turn whose first text is ≤ Q + 2000 ms, the first to read `easy-answer` is
    shown, unless an earlier one already decided `hard`.
  - An `invalid` router turn does not end the wait while another on-time router turn is still open.
  - Every router turn other than the deciding one is logged with reason `dup` and never shown.
- **No early display.** Live is never shown before the turn's dispatch. A decision reached earlier waits for the
  dispatch.
- **[choice] The 10 s cap (rule 6)** comes from router40: `generationComplete` arrived at most 7583 ms after clip end
  on the 22 answered items (RH05, 71 words). The cap bounds how long the pipeline answer can be held.
- **Live shown:**
  - The Live text is displayed as the turn's answer, trimmed and otherwise unchanged.
  - The answer's existing model label names `gemini-3.8-live`.
  - The pipeline answer for that turn is kept as a hidden **shadow**. It is generated to the end and recorded for the
    log, the hour reader and grading (§5, §10), and never displayed.
- **Live shown, then incomplete** (`incomplete-after-show`): output text arrives after the completed end
  (`afterComplete`).
  - The shown Live text stays.
  - The pipeline answer is appended below it, marked **"(full answer)"**, and displayed as a pipeline answer is
    displayed, cues included.
- **Supersede:** a turn supersede (`replace: true`) replaces whatever is shown for the turn with the pipeline's new
  answer, as today. The router turn is not re-read.
- **Cues** are displayed only when the pipeline answer is shown. That is the routed medium/hard path, plus every
  fallback.

### 4.4 Ear failover

- **Trigger:** when the ear's state reaches `failed` on `gemini-3.1-flash-live-preview`, main stops that
  `GeminiLiveRouter` and starts a new one on `gemini-2.5-flash-native-audio-latest`. The model becomes a constructor
  parameter, and its default is today's `LIVE_ROUTER_MODEL`.
- **Logged** as an `ear failover` session line (§5).
- **[choice] No fail-back.** The ear stays on 2.5 until the meeting ends. If 2.5 also fails, it behaves as today (red
  chip, slow retry) and the Deepgram detector still answers.
- **If the ear starts on 2.5** (for example through `NATIVELY_LIVE_MODEL`), there is no failover. `ear=2.5` applies
  from the start.
- **Backup ears only listen (option A):** while the ear is on 2.5, or while the router is down, the pipeline answers
  everything (arbiter rule 1).
  - **[choice]** While the ear is on 2.5, the router session keeps running, but its turns are not shown. The line
    reads `reason=router-down ear=2.5 router=up`.

## 5. Monitoring

**One decision line per decision**, written to `verbal-diag.log` through the main process's diag writer and mirrored to
the debug log:

```
[Router] turn=<n> route=easy-answer|hard|invalid reason=<…> live_first_ms=<n> live_words=<n> shown=live|pipeline shadow=<pipeline first-token ms> ear=<3.1|2.5> router=<up|down>
```

**Fields:**
- **`turn`:** the turn machine's turn id, or `-` for `unpaired`.
- **`route`:** the reader's verdict on the deciding router turn's final text. Empty text reads `invalid`.
- **`live_first_ms`:** F − Q. It is negative if Live began before the question end, and `-` with no router turn.
- **`live_words`:** the reader's word count.
- **`shadow`:** the pipeline answer's first-token ms for the turn, as the existing diag measures it, whether shown or
  hidden. It is `-` if no first token arrived.
- **`ear` and `router`:** their state at Q.

**Reasons:** `-`, `garbled-hard`, `too-short`, `too-long`, `incomplete`, `marker`, `late`, `router-down`,
`no-router-turn`, `unpaired`, `dup`, `incomplete-after-show`.

**When lines are written:**
- **The main line for a dispatched turn** is written once all three have happened: the decision is made, every
  paired router turn has ended (or the turn closed), and the pipeline answer has ended (completed, aborted or failed).
  At that point `shadow` and `incomplete-after-show` are known.
- **Separate lines:** each `dup` router turn and each `unpaired` router turn gets its own line.

**Session lines:**

```
[Router] session connect model=gemini-3.8-live block_sha12=e11c240063ea instruction_sha12=e29bf3810128 context_chars=<n>
[Router] session up setup_ms=<n>
[Router] session reconnect attempt=<n> reason=<…>
[Router] session close code=<n> reason=<…>
[Router] session refused reason=<sha-mismatch|model-mismatch>
[Router] ear failover from=3.1 to=2.5 reason=<the ear's failed reason>
```

**The text record:**
- For every paired turn, both texts are written to the run's existing answer capture: the Live text and the pipeline
  answer, each tagged `shown` or `shadow`, with the turn id.
- The flight snapshots that capture, so the hour reader and the grading export can read it.
- Text never goes into the `[Router]` lines.

**The hour reader** (`natively-lab\sp\router-default\router-hour-read.mjs`):
- **What it reads:** one run folder.
- **What it prints, as counts and ms only, no text:**
  - decisions by route × reason × shown;
  - `live_first_ms` p50/p90 on shown=live;
  - `live_words` p50/max on shown=live;
  - shadow first-token p50/p90;
  - counts of `unpaired`, `dup` and `incomplete-after-show`;
  - ear failovers;
  - router connects, reconnects and closes, by reason and code;
  - router down time;
  - dispatched turns with no decision line (must be 0);
  - dispatched turns with nothing shown (must be 0).
- **Item mapping:** it maps turns to roster ids by play window, as the interview60 harness attributes them
  (timeline `OFFSET_MS` 1150).
- **Checks it reads mechanically:**
  - **Safety, text half:** shown Live texts with a hard token or a marker, and shown texts of either kind with a
    `__…__` marker.
  - **Fallback:** turns with shown=live whose route ≠ `easy-answer` or whose `live_first_ms` > 2000;
    `incomplete-after-show` turns without the appended full answer.
- **Calibrated before the hour** on synthetic logs with known counts, including at least one case of each reason
  (rule 8).

## 6. Failure table

| failure | behaviour |
|--|--|
| silent or late (no first text by Q + 2 s) | pipeline |
| "hard" in any form | pipeline + cues |
| malformed, cut, too long or marker | pipeline |
| Live shown, then incomplete | Live stays; the pipeline answer is appended below, marked "(full answer)" |
| router down | pipeline for everything |
| ear 3.1 failed | 2.5 (listen only: pipeline for everything) |
| duplicate router turns | the first valid one wins; the others are logged `dup` |

## 7. Ride-along fixes (option A)

### 7.1 Unknown-marker filter

- **Evidence:** 5 of 120 cue answers leaked a marker (S1Q05).
- **What it does:** any unknown `__WORD__` marker is stripped from the displayed answer stream.
  - `WORD` is `[A-Za-z][A-Za-z0-9_]*`.
  - Known markers are unchanged and still handled where they are today: `__MORE__` (`stripSuggestionBlock`),
    `__CUES__` (`stripCueBlock`) and `__model_source:<id>__` (`stripModelSentinel`).
- **Where:** it runs as the outermost stage of the filter chain (`WhatToAnswerLLM.ts` 398–404), so every known marker
  has already been consumed when it runs.
  - It must not be placed where it could see the model-source sentinel, or the hedge label's `__`, before those are
    consumed.
- **Streaming:** a trailing partial `__…` is held until it closes with `__` (stripped if unknown) or until whitespace,
  a non-word character or the end of the stream arrives (released unchanged).
- **[choice]** Not behind the flag: it is a display fix for today's pipeline.

### 7.2 Harness: the probe's answers finish before the hour

- **Where:** `interview60.run.mjs` `auto()` (536–582).
- **What changes:** between `probe()` reporting ready and `appPass()`, `auto` waits until two things hold:
  - every probe turn's answer has ended (completed, aborted or failed, as the logs record);
  - no interviewer turn is open.
- **Evidence:** flight-eq D5. The probe's second turn was answered 4.2 s into the run window.
- **[choice] Cap: 120 s.** If the wait times out, `auto` prints why and exits 1 without starting the hour ("The hour
  was NOT spent"), as the probe deadline already does.

## 8. Diagnosis today (read-only)

- **Subjects:** last night's hour `2026-10-06T01-12-56-eq`:
  - (a) the 26 Live reconnects;
  - (b) the TTFT p90 of 10.3 s.
- **Method:** superpowers:systematic-debugging, reading that run folder's logs only: no app run, no code change.
- **Output:** `natively-lab\sp\router-default\DIAG-eq-reconnects-ttft.md`, counts and ms only.
- **A fix lands only if its cause is proven and isolated.** It then follows the code path (a failing test first, a
  Sonnet implementer, an Opus review) and is named in the hour's registration as a change to the hour. Otherwise the
  diagnosis is reported and nothing lands.

## 9. Testing (before the hour)

1. **TDD unit tests**, each seen failing first:
   - **The reader on router40's 47 real outputs** (`router40\runs\router40-R.answers.json`; the failed attempt
     `RH05~a1` excluded), plus invented garbles: `hard.hard`, `"hard"`, `Hard.`, `hard hard`, `hard".hard".hard`,
     `hardware` (not hard), markers, 7/8/80/81 words, and incomplete text.
     - Expected on the 47 under §4.2: `hard` 28 (25 clean single-token, 3 `garbled-hard`: RH08, RH10, RE18) and
       `easy-answer` 19 (18 EASY + RH05).
     - This tally was counted at spec time from token counts only; the test makes it binding.
   - **The arbiter:** every decision row and reason, pairing (open, just-closed ≤ 2000 ms, unpaired, a turn closed
     without dispatch), dup, the 10 s cap, no display before dispatch, `incomplete-after-show` with the
     "(full answer)" append, supersede, router-down, and ear=2.5.
   - **The marker filter:** unknown markers stripped, known ones intact, the hedge label intact, and markers split
     across chunks.
   - **Failover:** `failed` on 3.1 starts 2.5 once and logs once, with no fail-back. A 2.5 start never fails over.
   - **The harness wait:** it waits, passes, and times out to exit 1.
2. **Offline replay:** router40's saved turns (`router40-R.json` events and answers), with Q = clipEnd, run through
   the reader and the arbiter.
   - Expected: shown=live 19, all with `live_first_ms` ≤ 1259; pipeline 28.
   - Any difference is explained before the build is called done.
3. **Live probe, ~2 min:** a standalone script drives the built `LiveRouterSession` on a few router40 clips (at least
   2 EASY, 2 HARD). This is not the app.
   - It checks the model assert, the sha checks, `setupComplete`, the router-turn events (first text, completed,
     endKind) and the reader verdicts.
   - It prints ids, classes and ms only.
4. **Smoke, ~15 min:** the app from a scheduled task, flag ON. The user is warned first, because the machine must be
   quiet.
   - It checks every `[Router]` line kind it can reach, the shown/shadow capture, and the hour reader on the smoke's
     folder.
   - Branches it did not reach are listed as residual risk.

## 10. Tonight's registered hour

- **Registration:** registered like flight-eq, in a separate pre-registration written and Opus-reviewed before any
  data. It fixes the arming, the instruments with their sha lines, the launchers and the precheck.
- **The hour:** scenario50 S1+S2 hands-free (40 items: 20 mains, 20 follow-ups).
  - The flag `NATIVELY_LIVE_ROUTER=1` is ON.
  - The earlier-question block is OFF: `NATIVELY_EARLIER_QUESTION` unset.
  - Cues are on the pipeline path. Cues have no flag; the pipeline always carries them.
- **Precheck at T−6 min,** as flight-eq. It includes the `[Router] session connect` line with the registered shas and
  `ear=3.1`.
- **Grading:**
  - **Grader:** pinned `claude-opus-5-5`, memory-clean (`--setting-sources project,local`), with flight-eq's grader
    command form.
  - **Live and shadow side by side:** the Live-shown answers and their shadow pipeline answers are graded blind, side
    by side.
  - **Also graded:** the in-app pipeline-shown answers, and the bare arms (bare 3.5-lite HIGH, bare 3.1-lite LOW).
  - **Re-graded tonight with the same grader command:** s50m (`2026-09-22T08-22-50-s50m`) and last night's hour
    (`2026-10-06T01-12-56-eq`).
  - **Grade definitions, as router40's score:** acceptable = both graders correctness 2 and on-topic 2; wrong = any
    grader correctness 0.

### 10.1 Bars (user option A)

| bar | rule | read by |
|--|--|--|
| **Safety (decisive)** | 0 garbled or routing-token text shown, AND 0 wrong Live answers shown | hour reader (text) + grades |
| Fallback | every Live failure caught: 0 shown=live turns with route ≠ easy-answer or `live_first_ms` > 2000; every `incomplete-after-show` has its "(full answer)"; 0 dispatched turns with nothing shown | hour reader |
| Quality | acceptable(Live shown) ≥ acceptable(shadow, same items) − 1 | grades |
| Speed | `live_first_ms` p50 ≤ 1500 on shown=live | hour reader |
| Routing | easy caught ≥ 13/20; hard misrouted ≤ 1 (see §12 Q2) | hour reader + labels |
| No regression | on the medium/hard items and the follow-ups: 0 new wrong, and acceptable ≥ band low − 2 | grades |

**How the bars are counted:**
- **Easy caught:** an EASY-labelled item with shown=live.
- **Hard misrouted:** a non-EASY item whose router turn read `easy-answer`, shown or not. **[choice]** This is
  stricter than counting shown items only.
- **No-regression set S:** every item not labelled EASY, plus every follow-up.
- **New wrong:** wrong tonight, and not wrong in either s50m or the eq hour.
- **The band:** the low and high of s50m's and the eq hour's acceptable counts on S′. S′ is S without last night's 4
  block follow-ups (S1Q04F, S1Q06F, S2Q05F, S2Q08F; user option C).
  - **[choice]** Tonight's count is read on the same S′, so one item set serves all three.

## 11. Verdict

- **PASS** (every bar met): the flag defaults ON, landed as its own reviewed commit. `NATIVELY_LIVE_ROUTER=0` then turns
  it off.
- **Safety FAIL:** the router stays behind the flag (default OFF).
- **Anything else: INCONCLUSIVE,** with one re-fly.
- **Schedule risk:** if the build slips past ~20:00, the hour moves to tomorrow night. Reviews are not cut.

## 12. Open questions

1. **When Live text appears on screen.**
   - The approval says three things that pull against each other:
     - the reader judges a **complete** answer;
     - the arbiter shows Live only on the reader's `easy-answer`;
     - the speed bar reads **first text** ≤ 1.5 s.
   - This spec therefore shows Live at the router turn's completion. In router40 that came 2.9–7.6 s after clip end on
     the 20 answers, while first text arrived at 0.4–1.3 s.
   - The speed bar, as approved, measures first text, not the moment the answer appears. The decision line has no
     display-time field.
   - Showing Live as it streams would make "Live shown, then incomplete" an ordinary case. It would also need a
     streaming form of the reader (for example, hold until 8 words, then show), which the approval does not define.
   - The user decides before the build.
2. **Easy labels for scenario50 S1+S2.**
   - "Easy caught ≥ 13/20" presumes 20 EASY items. router40's 20 EASY items are live40's, not scenario50's.
   - scenario50 has no router40-style labels. Under the older L38 definition, l38base found EASY 1/176, 0 per
     scenario50 hour.
   - **The label source and the denominator must be fixed in the registration before the hour.** For example, two
     blind pinned Opus classifiers with router40's route key, as c1/c2 were.
   - If S1+S2 holds few EASY items, the Quality, Speed and Safety-graded bars rest on very few shown answers.
3. **A second INCONCLUSIVE.** The approval allows one re-fly but does not say what a second INCONCLUSIVE reads.

## 13. Recorded suggestions, not part of the build

- The 3.8 Flash ceiling spike: S1Q02, S2Q02 and S2Q05F, ~9 requests, reported only.
- Cues on or off by default, as its own test.
- The flight-eq re-fly prep.
- `power-events.ps1`, and running the clocks instrument.
- Later: merging the ear into the router session once a test shows one session can do both, which halves the Live cost.

## 14. Residual risks (not proven by anything run so far)

- **Session length:** router40 ran one session per chain (31 short sessions). One router session for a whole hour, with
  reconnects and no resumption, has not run.
- **Context:** router40's CONTEXT was the captured S1Q02 slice (sha `dd74bbde…`). The in-app context differs, and its
  effect on routing is unmeasured.
- **Pairing:** pairing by time against the turn machine is new. A router turn that begins during a mid-question pause
  (a negative `live_first_ms`) is a candidate under the approved 2 s gate. Whether such answers are right is measured
  only by the Safety bar.
- **Two concurrent Live sessions:** they double the Live session cost. Their quota behaviour on 3.8 Live over an hour
  is unmeasured.
- **Router40's latencies** are from clip end on synthetic audio with a ~0.69 s trailing silence. In-app, Q is a VAD
  stop.
