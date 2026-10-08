# STATES — turn-based EARLIER QUESTION block (branch build/earlier-question, HEAD 7fb3d04, base 89c8f53)

Written by the Task 8 implementer, 2026-10-05. Every state of the change, which test exercises it, and what only a
live step can. "Unit" = a vitest file in the branch. "Live" = the controller's Task 9 / Task 10 steps (not run here).
Counts of the whole-branch gates are in `build\task-8-report.md`.

## Read this first (audit rules)

1. **`chars` is BUILT, never "inserted".** The diag line is written by `IntelligenceEngine.runWhatShouldISay` before
   `WhatToAnswerLLM.generateStream` decides the framing. On a coding call (`intentResult?.intent === 'coding'`,
   which includes every screenshot-referenced call: `main.ts:2191` sets `intent = 'coding'`) `WhatToAnswerLLM` drops
   the block, yet the line reads `gate=block ... chars=N`. In every audit of a log, `gate=block` means "a block was
   built", not "the model saw it". Exercised: `WhatToAnswerLLM.earlierQuestion.test.ts` "coding framing drops the
   block: on === off" (the drop side); the engine test cannot see the drop (it mocks the LLM). The coding-intent /
   `gate=block` pairing is not exercised end to end by any test and is for the flight reader to know.
2. **Two `gate=error` shapes.** (a) `buildEarlierQuestion`'s own catch: `gate=error cue=none chars=0 turn=<id|none>
   ms=<n>` (ms measured, no suffix). (b) the engine's catch (a throw from `earlierQuestionEnabled()` on a junk
   flag, from `getAskedQuestions`, `interviewerLinesBefore` or `recordAskedQuestion`): the same prefix with `ms=0`
   and a trailing ` error="<message>"`. A reader matches `gate=error` and ignores the suffix; the message text is an
   exception message, never the question or parent (but see the not-shown line).
3. **Reader pattern:** match the prefix `[IntelligenceEngine] earlier question:`, never the bare substring
   "earlier question" (the startup line is `[Main] earlier question: on|off`).
4. **Paths with no diag line by design:** the cooldown return and the keyless fallback return in
   `runWhatShouldISay` (they return before the step), and the whole flag-off path. A flight with a call and no line is
   one of these, not a loss.
5. **Manual / chip / answer-now carry no turn id by design.** Only `turnDispatchInput` (the machine turn's dispatch
   and supersede) sets `turnId`; every other `dispatchDetection` / `runWhatShouldISay` caller gets `gate=no-turn` and
   still writes the ledger with `turnId: null`.

## State table

### Flag (`NATIVELY_EARLIER_QUESTION`)

| State | Exercised by | Live only |
|---|---|---|
| unset / `''` / `'0'`: off; no read, no build, no log, no ledger write; prompt = today's | `earlierQuestion.test.ts` "is off unless the flag is exactly 1"; `IntelligenceEngine.earlierQuestion.test.ts` "flag unset (shipped)..." and "flag unset: the ledger is never read" | the real process env reaching the call (Task 10 prints `earlier question: off`/`on`) |
| `'1'`: on | same files, every "flag on" test | Task 10: the env var reaching the built app |
| junk value at startup: throws, app refuses to start | `earlierQuestion.test.ts` "describeEarlierQuestionAtStartup names on/off, throws on junk, and refuses both flags on" | the `main.ts` try/catch that logs `refusing to start` and `app.exit(1)` (`main.ts` ~3449-3455): never run, needs the built app (Task 9/10) |
| `'1'` with `NATIVELY_FOLLOWUP_PARENT=1`: refuses at startup | same test | same main.ts lines |
| junk value at call time (startup bypassed): `gate=error` (engine catch shape b), block `''`, answer still delivered | `IntelligenceEngine.earlierQuestion.test.ts` "junk flag at call time (belt and braces...)" | none (unreachable in the app: startup refuses first) |

### Turn id

| State | Exercised by | Live only |
|---|---|---|
| id present on the auto turn path (dispatch) | `turnDispatch.test.ts` "carries the turn id when the machine has one"; engine "parent evicted (156 s)" (diag `turn=<id>`) | `main.ts` forwards: `this.turn.snapshot().id` at dispatch and supersede (three `turnDispatchInput` call sites: dispatch, and two in supersede; `main.ts` ~1008, 1020, 1023) and `d.turnId != null ? { turnId } : {}` at the `runWhatShouldISay` call (`main.ts` ~2197): unit-untested, proven only by the smoke's `turn=<id>` |
| id null: key absent from the input; chip / answer-now / manual: `gate=no-turn`, ledger written with `turnId: null` | `turnDispatch.test.ts` "carries no turnId key at all when the id is null"; engine "chip click (contextOverride, no turnId)..."; `earlierQuestion.test.ts` row "chip click / answer-now / manual in auto mode" | none |
| id `0` is a real turn (block built, `turn=0`, not `no-turn`) | `earlierQuestion.test.ts` row "turnId 0 is a valid turn"; engine "turn id 0 (falsy but a real id)..." (`??` not `||`; mutant caught in 7fb3d04) | none (ids start at 1 today) |

### Gate outcomes (`why`, in `earlierQuestion.ts` check order)

| `gate=` | Exercised by | Live only |
|---|---|---|
| `block` (why `''`) | `earlierQuestion.test.ts` row "evicted parent + cue: the block"; engine "parent evicted (156 s)"; parity (21 blocks over 3 hours) | a real follow-up in the smoke (Task 10) |
| `off` | `earlierQuestion.test.ts` row "flag off" (the pure function; the engine never logs it, flag off returns first) | none |
| `no-question` (settled null / blank; no ledger write) | rows "settled null", "settled blank"; engine "no pinned question (settled null)..." | none |
| `no-turn` | row "chip click / answer-now / manual..."; engine "chip click..." | none |
| `supersede` (`replaceAnswer === true` returns `''`) | rows "supersede, continuation...", "two questions in one turn...", R21 rows; engine "supersede (replaceAnswer, same turn id...)" | the real 8 s supersede in a flight |
| `no-cue` | row "no cue: a standalone question gets nothing"; gate tests (19 fire / 10 silent) | none |
| `no-parent` (empty or blank-text ledger) | rows "ledger empty", "blank parent text" | none |
| `parent-in-pinned` (case / whitespace / 3-char boundary / Live merge / re-ask) | rows "parent contained in the pinned line..." (Live merge, other CASE, other WHITESPACE, both), "a 3-char parent...", "a 2-char parent does NOT count", "re-ask of the parent" | none |
| `parent-in-prompt` (sameAnchor overlap with a prompt line) | rows "parent in the prompt (short gap)", "tail fragment after the sparsify cut", "parent with a line break... present by overlap", "quick follow-up < 60 s..."; engine "short gap (60 s)" | none |
| `error` shape (a): `buildEarlierQuestion` catch | rows "exception in select (a null prompt line)", "exception: ledger missing" | none |
| `error` shape (b): engine catch, ` error="..."` suffix | engine "the ledger write throws..." (ONE line, no `gate=block` before it, answer delivered, history untouched); "junk flag at call time" | none |

### Ledger (`SessionTracker`, `recordAsked`)

| State | Exercised by |
|---|---|
| push, newest last, increasing `seq` | `SessionTracker.askedQuestions.test.ts` "starts empty, records newest last..."; `earlierQuestion.test.ts` recordAsked table |
| held turn id: remove-and-push (the 8 s supersede) | `SessionTracker.askedQuestions.test.ts` "a held turn id is removed..."; recordAsked "the 8 s supersede"; row "supersede after an answer-now re-ran the head" |
| depth 3, oldest dropped | both files, "keeps at most three" / "depth is 3" |
| `turnId` null never removes | recordAsked "turnId null never removes" |
| no text dedup | recordAsked "no text dedup..."; row "double dispatch past the deduper" |
| blank / null text writes nothing, same array | recordAsked "settled null / blank text writes nothing..." |
| flag-off write: nothing | recordAsked "flag off writes nothing..." (pure fn); engine "flag unset: the ledger is never read" |
| input never mutated; snapshot keeps its length | recordAsked "does not mutate its input"; tracker "a snapshot taken before a write keeps its length" |
| `reset()` clears the ledger, `seq` restarts | tracker "reset() (new meeting) clears the ledger..." |
| write at dispatch, before any answer (an aborted parent is recorded) | recordAsked "an aborted or stalled parent is recorded..." (pure); live abort not driven |
| overlapping calls: ledger order = call order, second build sees the first write | engine "two calls started without awaiting (Review Focus 3)" |
| a coding main is recorded | engine "a coding main is recorded..." |
| blank-text write leaves `seq` unchanged | NOT unit-tested (Task 4 review minor, accepted) |

### Message assembly (`WhatToAnswerLLM.generateStream`, 9th argument)

| State | Exercised by | Live only |
|---|---|---|
| block is the last context part, empty extraContext | `WhatToAnswerLLM.earlierQuestion.test.ts` "extraContext empty..." | |
| block last, with intent + previous responses | "extraContext non-empty..." | |
| with Live texts: Live block and trailer untouched | "with Live texts..." | |
| coding framing: block dropped, `on === off` | "coding framing drops the block..." | |
| `''` / `undefined`: today's bytes | "an empty or undefined block is byte-identical..."; characterization test (green before and after Task 5) | |
| transcript passed in unchanged (classifier / knowledge lookup read the same last line) | "the transcript passed in is not changed by the block" | |
| every hedge leg and the redirect receive the same contents, block included | `WhatToAnswerLLM.hedgeCues.test.ts` F. | the hedge legs under a real race: a mock proves the contents, not the timing |
| screenshot framing: dropped as coding | same code path as coding; no screenshot-specific test | a screenshot-referenced question in a flight |

### Harness `--no-block` (`interview60.answers.mjs`, `earlierQuestionArm.mjs`)

| State | Exercised by | Live only |
|---|---|---|
| strip then insert round-trips both shapes | `earlierQuestionArm.test.ts` round-trip test | |
| refusal: turn without a block, block not the last context part, two labels, two-line block, label after the marker / inside the line | `earlierQuestionArm.test.ts` "refuses..." (mutant on the two-labels clause caught after 7b added two cases) | |
| real captured gated turns: userB strips to userA, re-inserts to userB, userA refused (21 entries) | `earlierQuestionArm.test.ts` fixture describe (local, `NATIVELY_EQ_PARITY_DIR`) | |
| CLI refusals, exit 2: no `--captured`; no `--tag`; with `--cues` / `--no-cues`; Groq arm; a captured prompt with no block (message names the id only) | 7b's probes on the built dist in WT, with a dummy key and a synthetic file (`task-7b-report.md`); no model call | Task 9 Step 5b on a REAL captured file (needs `NATIVELY_ROSTER=scenario50 NATIVELY_SCENARIOS=S1,S2`, ruling N2) |
| **ACCEPT path: a real block is stripped, then the model is called (`answerStreamed` with `blockVariant(...)`)** | **UNEXERCISED in unit tests.** The strip function is unit-tested; the harness wiring from the stripped string to the model call is not (a unit test would need the model) | **Ruling n5: covered ONLY by one live `--no-block --limit 1` call on the smoke capture, run by the controller before arming (Task 10 Step 6).** Until that call is read, the accept path is unproven. |
| `dist-electron/.../earlierQuestion.js` lazy `require` (an older dist still runs other arms) | 7b probe ran with a fresh dist; the old-dist fallback was not run | |

### Startup and logging lines

| State | Exercised by | Live only |
|---|---|---|
| `[Main] earlier question: on|off` startup line | `describeEarlierQuestionAtStartup` unit test (the string) | the `console.log` in `main.ts` (Task 10 reads it from the built app) |
| diag line has counts only, never text | engine "the diag line carries counts, never text (Review Focus 4)" (asserts a line exists and holds no question/parent text) | |
| one diag line per call, logged AFTER the ledger write (no `gate=block` before a `gate=error`) | engine "the ledger write throws..." | |
| cooldown / keyless fallback: no diag line | not tested (outside the step; Task 6 review m4, accepted) | |

## Branches not reached by any test, and what could change a decision

- The three `main.ts` forwards and the startup `try/catch` (see above): proven only by Task 9 (dist markers) and Task 10 (`turn=<id>`, the startup line, one follow-up getting the block).
- `--no-block` accept path (ruling n5).
- Coding/screenshot call with `gate=block` in the log: the drop is tested in `WhatToAnswerLLM`, the pairing with the engine's log line is not.
- The hedge legs under a real race (mock proves contents only).
- Timing: the diag line's `ms` is measured in tests only as present, not bounded.
- Not shown anywhere: whether the model USES the block (that is the flight's measure, not a build gate).
