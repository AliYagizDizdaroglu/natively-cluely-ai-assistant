# Task 8 report: renderer contract (lane C, live-router-c)

Status: DONE_WITH_CONCERNS. Commit: 95ed5a6 (on top of c4812f5, Task 7).

## Files
- `src/lib/answerMessages.ts`: `AnswerMessage` + `BubbleMeta`; `usesKeyedPath(prev, meta)`, `usesKeyedSource(prev, label, turnId)`; keyed branches of `applyAnswerToken` / `applyFinalAnswer` (new optional last arg `meta`).
- `src/lib/bubbleMetrics.ts` (new): `bubbleKey`, `createBubbleMetrics(nowFn)` -> `{start, first, done}`.
- `electron/preload.ts`, `src/types/electron.d.ts`: token data gains `turnId?, origin?, append?, label?`; final gains `turnId?, origin?, append?`; source callback `(label, turnId?)` with subscription `(_, label, turnId) => cb(label, turnId)`.
- `src/components/NativelyInterface.tsx`: handlers pass `meta`; gate chooses `sm` vs `bubbleMetrics`; `pendingSourceByTurn`; "(full answer)" header line rendered right before the cue block (`overlay-text-muted`).
- Tests: `answerMessages.test.ts` (+30, 42 total), `bubbleMetrics.test.ts` (5).

## Tests
- Run: answerMessages + bubbleMetrics + src/hooks: 5 files, 67 passed. (answerMessages+bubbleMetrics alone: 47 passed.)
- RED seen first (stubs returning false / throwing): 17 failed, all on assertion (gate false, bubble lengths, missing stored fields), none on "module not found". The pre-existing 25 and the "no turnId" tests passed at RED, as expected.
- Calibration (rule 8): mutated the gate to `return true` for any turnId: 3 tests failed (usesKeyedPath false-cases, same-turn pipeline bubble, "false for every event of the sequence"). Restored from stage (sha cc069433f3f9).
- Binding flag-off test: hands-free sequence (head 3 tokens, supersede 3 tokens, replace final, turn 5 two tokens + final) folded with and without meta; equal after stripping turnId/origin; `usesKeyedPath` false at every step.
- tsc: root clean; electron config 6 errors, the same 6 pre-existing (GeminiLiveRouter, ipcHandlers x3, KnowledgeOrchestrator x2); none in preload.

## Not exercised
- NativelyInterface handler wiring (no component test exists; React not run). Only tsc covers it. The sm/bubbleMetrics routing, `liveTurnsRef` mirror and the label render are unexercised.
- No IPC end-to-end with main/arbiter.

## Deviations / decisions
1. Extra exports `usesKeyedPathFor(set, meta)` and `usesKeyedSourceFor(set, label, turnId)`: same gate over a synchronous `liveTurnsRef` Set, because the `sm`-vs-`bubbleMetrics` decision is made before React applies the event, and a state read would be stale. `usesKeyedPath(prev, meta)` stays the single gate for the pure functions.
2. `bubbleMetrics.start` is idempotent per turn (first call wins, keyed by the key's turnId prefix), so every bubble of a turn measures from the turn's first event (M1). Append bubble TTFT is therefore from the turn start, not from its own start.
3. Non-keyed events with a `turnId` store only `turnId` and `origin` on the bubble (never label/sourceLabel), so flag-off differs from today's only in those two ignorable fields.
4. `bubbleSourceRef` (key -> label taken at creation) feeds both `meta.sourceLabel` and `done(... source)`, instead of reading the bubble out of state (stale before render).
5. Arbiter payload shapes (live-router-b `routerArbiter.ts`, TokenPayload/FinalPayload/source) match PLAN Interfaces exactly: no disagreement. The arbiter sends `append: true` only (never false) and `label` only on the first append token.

## Concerns
- Case E metrics mix: after a keyed supersede token (origin pipeline, replace) I delete the turn from `liveTurnsRef` (the Live bubble becomes a pipeline bubble, so the gate's third condition no longer holds). The replace token uses `bubbleMetrics`; the following tokens and the replace final go through today's path and `sm`. TTFT/total on that bubble then come from `sm` (started at `live-question`), not the turn start. Follows the spec gate literally; flagging it.
- Source label on a superseded bubble: the rewritten first bubble takes `sourceLabel` = the pending label for the turn at the replace token. If the pipeline sends no source event (it only does so on a fallback), that is still `gemini-3.8-live`, so the bar would name Live for a pipeline answer. Needs either a pipeline source event before the replacing stream or a spec rule (e.g. clear pending on a replace). Not changed, spec silent.
- `bubbleSourceRef` entries leak for a keyed bubble that never gets a final (aborted turn); a few bytes per turn, cleared on nothing. Fine for a session.
- The `liveTurnsRef` mirror clears only when `messages` becomes empty; turn ids reused without a chat clear would mis-route metrics (not text).

## fix1 (review: SPEC PASS, QUALITY CHANGES)

Commit: see the sha in the final message (on 95ed5a6). Files: answerMessages.ts/.test.ts, NativelyInterface.tsx, new `src/components/NativelyInterface.router.test.tsx`.

- **I1:** today's token/final path now joins or finalizes only an UNKEYED streaming bubble (`unkeyedStreamingTarget`). When the last message is a keyed bubble (append or origin live) it falls back to the last streaming unkeyed bubble of the same turn (so k+1's tokens still reach k+1's own bubble), else opens a new bubble / `finalize(null)`. Flag-off has no keyed bubbles, so the target is exactly the old last message. Evidence: the diff of `answerMessages.test.ts` against 95ed5a6 removes only one line, which is the keyed replace-final expectation (changed on purpose by I2); every flag-off/no-turnId test, the binding fold and its gate test pass unmodified. Mutant (guard removed): 3 pure tests + the component interleave test fail.
- **I2 renderer:** the keyed final's replace branch overwrites origin, label and sourceLabel from the replacing stream (explicitly, so an absent source clears the Live label). In NativelyInterface, `sourceForBubble` drops a pending `gemini-3.8-live` on a supersede and consumes the pending label; with no source event the bubble has no sourceLabel and the bar's source is the neutral "…" (the label today's `sm` shows before a source arrives). Mutants: pure replace-fields removed: 1 test fails; `LIVE_SOURCE_LABEL` drop removed: the component case-E test fails. Stale label caveat: if a pipeline label from an earlier append of the same turn is still pending and the replacing stream sends no source, that older label is used (the arbiter fix re-sending the source removes this).
- **M2:** an `origin: 'live'` final adds its turn to the Set; a replace final removes it only when the bubble is rewritten into a pipeline one (true after I2, so the mirror and `prev` agree). Mutant (add removed): the new component test fails.
- **M3:** a keyed final with `append` and no label opens its bubble under "(full answer)". Mutant: the new pure test fails.
- **Component test:** the real `NativelyInterface` renders in jsdom with a Proxy `window.electronAPI` (every `on*` captured, every other call resolves undefined); no wrapper needed. Six tests: mount, flag-off sequence (head, supersede, final, turn 5, bars from `sm`), case C (two bubbles, header before the cue block, bars Live then Flash), final-only case E (one bubble, no header, bar not Live), M2, and the I1 interleave. Mutant "gate always true" fails the flag-off test.
- **Tests:** answerMessages 49 + bubbleMetrics 5 + hooks + component 6 = 80 passed over 6 files. Root tsc exit 0; electron tsc still 6 pre-existing errors. M1 and M4 untouched.
- Not exercised: real Electron/IPC and the arbiter fix in lane B.

## fix2 (re-review of c88dd40)

Files: answerMessages.ts/.test.ts, NativelyInterface.tsx, NativelyInterface.router.test.tsx. All tests written first; RED seen (7 failures: 3 R1, 2 N3, N1, N2), then green.

- **R1:** today's replace token and replace final skip Live and append bubbles (`!isKeyedBubble`). Pins: turn k+1's replace token rewrites k+1's own bubble, never k's "(full answer)"/Live; the replace final likewise; with only keyed bubbles a replace opens a new one. Mutants: token branch (2 fail), final branch (1 fail).
- **N1:** the keyed replace token calls `sm.setSource(meta.sourceLabel ?? '…')` and `sm.markFirstToken`, so later tokens and the final (which run through `sm`) show the forwarded label and a TTFT. Component tests: forwarded source X appears on the bar with TTFT; no source gives "…", not Live. Mutant (setSource removed): the X test fails.
- **N2:** `sourceForBubble` consumes the pending label at every keyed bubble creation (the Live-label drop on a supersede stays). Component test: case C then a final-only replace with no source shows "…", not the append stream's label. Mutant (delete removed): fails.
- **N3:** with a keyed last message and no `turnId` the unkeyed fallback returns -1 (new bubble / `finalize(null)`). Pure tests for token and final. Mutant: 2 fail.
- **R2:** not touched (arbiter), no renderer guard, so flag-off identity holds.
- Flag-off: only additions to the test files; every earlier flag-off/no-turnId test, the binding fold and its gate test pass unmodified.
- Tests: answerMessages 54 + bubbleMetrics 5 + component 9 = 68 passed. Root tsc exit 0; electron tsc 6 pre-existing errors.
- Not exercised: Electron IPC and the lane-B arbiter.
