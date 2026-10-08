# Task 10 report: routerWiring.ts + main.ts glue

Status: DONE_WITH_CONCERNS. Commit: f03862d on feat/live-router (on top of bfca1fe). Files: `electron/services/routerWiring.ts` (new), `electron/services/routerWiring.test.ts` (new), `electron/main.ts` (+80/-15).

## What was built
- `routerWiring.ts`: `createRouterWiring(deps)` with the exact surface of PLAN 1450-1471. `turnIdentity(prev,next)` closes prev then opens next; `answered(turnId)` has its own per-id guard and uses `speechEnd()` or `(now, now, 'final')`; `onToken/onFinal/onSource/onEnd` build today's payloads plus `turnId`+`origin:'pipeline'` only when a turnId is given; `onEnd(null, ...)` forwards nothing.
- `main.ts`: fields `routerEnabled`, `routerSession`, `routerArbiter`, `routerWiring`; arbiter + wiring built in `setupIntelligenceEvents` (constructor time); `[Router] flag` line; `setTurnHistorySink` only when the flag is on (the `routerArbiter.forward({ch:'history'...})` text stays in main.ts, which the guard greps for); the three engine listeners now go through the wiring plus a new `suggested_answer_end` listener; turn feed in `syncTurnIdentity`, the `close` case and `resetTurn`; `answered(d.turnId)` in dispatchDetection's answer branch just before `answerDetection`; `startRouterSession`/`stopRouterSession` beside `startLiveRouter`/`stopLiveRouter` at meeting start, off to suggest/auto, setLiveMode off and endMeeting; the router audio tee at all three `liveRouter?.write` sites; `onEarModel(router.getModel())` in `startLiveRouter`.

## Log lines emitted (exact format strings)
- main.ts: `` `[Router] flag NATIVELY_LIVE_ROUTER=${this.routerEnabled ? 'on' : 'off'}` `` (console.log; the literal `[Router] flag NATIVELY_LIVE_ROUTER=` is in built main.js for guard-rd r2).
- wiring `onRouterFailed`: `` `[Router] session failed reason=${reason} dispatches_before=${arbiter.dispatchCount()}` `` (via routerDiag, as PLAN 1559 / SPEC 5).
- wiring `onEarModel`: `` `[Router] ear model=${model}` `` (always written, after `setEar`). Extra, only for an id with neither "3.1" nor "2.5": `[Router] ear model id not recognised (neither 3.1 nor 2.5): the arbiter keeps its previous ear` (no setEar call).
- Not mine, passed through: the session's own lines (`[Router] session connect/up/close/reconnect/refused`) go to `routerDiag` via the session's `log` option.

## Tests
- `routerWiring.test.ts`: 23 tests, all pass. Adjacent suites run with it: routerArbiter 57, routerArbiter.replay 3, LiveRouterSession 20 (103 total pass).
- RED seen first: with a stub module (all no-ops) 20 of 23 failed on the asserted behaviour (3 passed because they assert "nothing happens"). Quote: `expected [] to deeply equal [ [ 'setEar', '2.5' ] ]`.
- Mutants (10, each killed): no idempotency guard; open before close; speechEnd ignored; answered(undefined) dispatching (`=== null`); replace passthrough; end forwarded with null turnId; failed line count hard-wired; ear 2.5 mapped to 3.1; origin dropped; source turnId dropped.
- Flag-off identity is tested against a real `RouterArbiter({enabled:false})` with a recording `send`, against a table of today's payloads (token without/with cues, final, source) and the key order of the token payload.
- tsc: root `tsc --noEmit -p` exit 0. `electron/tsconfig.json`: the same 6 baseline errors (GeminiLiveRouter 125, ipcHandlers 3436x2/3439, KnowledgeOrchestrator 349/351), none added.
- No build, no full suite, no app, no model call (as ordered). The plan's step 6 build + grep of dist-electron/main.js is NOT done (controller owns builds). Source check instead: main.ts line 2486 `[Router] flag NATIVELY_LIVE_ROUTER=` and 2488 `routerArbiter.forward` are literal in the source.

## Deviations from the plan text (the code overrides)
1. Source IPC: the plan's `send` always passes `o.turnId`. I send `(label)` alone when turnId is undefined, so the flag-off call is today's byte for byte; with a turnId it sends `(label, turnId)`.
2. `onEarModel` for an unknown id: the plan is silent. I log the exact `ear model=` line plus a loud second line and do not guess an ear (rule 11). `setEar` takes the model only as `'3.1' | '2.5'`.
3. `answered` also holds a per-id `Set` (the plan's idempotence test requires a wiring guard). Safe across meetings because interviewerTurn's `nextTurnId` is never reset (checked, `interviewerTurn.ts` 110/116, `reset()` only nulls the turn).
4. Router connect: not wired separately. `LiveRouterSession`'s default connect already builds `GoogleGenAI({apiKey, apiVersion:'v1beta'}).live.connect` the way the ear does; main passes no `connectFn`.
5. The engine's `suggested_answer_end` third argument (generationId) is ignored in main's listener, as ordered.
6. `turnIdentity` is the one entry for both sites; the plan's separate "close" and `resetTurn` calls become `turnIdentity(this.turnSeenId, null)` before `turnSeenId = null`.

## States exercised vs not (rule 9)
Exercised in unit tests: open, close, stale replace, null->null, same id; dispatch with and without speechEnd, repeat, undefined; token with/without turnId and cues; final; source; end with null; flag-off pass-through for token, final, source and for the whole turn feed (nothing sent, `dispatchCount()` 0); failed line with count; ear 2.5, 3.1, unknown.
NOT exercised (no test can, per rule: no app, no model): main.ts call sites themselves (turn feed ordering inside a real turn machine, the audio tee, session start/stop timing, listener registration with the real IntelligenceManager), the real `@google/genai` connect of the router session (first exercised at the smoke, Task 17), and `setTurnHistorySink` against a live engine.

## Concerns
- The router session starts only when `liveMode !== 'off'` (same sites as the ear, per plan). In `suggest` mode the router connects and bills quota but the turn machine never dispatches, so every router turn is unpaired. The run uses auto; flagged only for the quota line.
- `routerWiring.turnIdentity` stamps `now()` at sync time, not the turn's true open time; pairing uses it. syncTurnIdentity runs in the same tick as the VAD change that opens a turn, but a turn opened by a transcript final waits for the next `turnTick`/`dispatchDetection`. Smoke should watch for router turns paired `unpaired` just before a turn opens.
- `stopRouterSession` calls `onRouterState(false)` after `s.stop()` already emitted a down state when the session was up, so the arbiter can get two consecutive down entries (harmless to `routerUpAt`, but a hour-reader that counts `state` transitions from the arbiter would see two; it reads log lines, not these).
- Lanes B's fix3/fix4 on routerArbiter are said to be still landing; I changed no interface they touch (`forward`, `setRouterUp`, `turnDispatched`, `setEar`, `dispatchCount`).
- Task 11 (failover) not implemented. `startLiveRouter` currently has no model parameter in main; Task 11 must add it and call `onEarModel` for the restarted ear.
