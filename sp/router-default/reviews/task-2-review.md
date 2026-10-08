# Task 2 review: LiveRouterSession, instruction constants, profile summary

Reviewer: Opus (read-only). Inputs: PLAN.md Task 2 (449-753), Global Constraints, Review Focus; SPEC.md 4.1, 4.1a, 5, 6;
reports/task-2-report.md; reviews/task-2.diff (base 7a84d20); worktree live-router-a at cdfb0dd.

**SPEC: PASS  QUALITY: CHANGES** (two IMPORTANT test gaps; the code itself has no defect found)

## What I checked and ran

- **Implementation is the plan's step-4 code verbatim** (`electron/audio/LiveRouterSession.ts`, 202 lines). Profile
  method = step-6 code verbatim (`KnowledgeOrchestrator.ts:536-548`).
- **Session setup = router40.** `LiveRouterSession.ts:110-118` against `router40/run-r.mjs:20,252-261`: the model, `['AUDIO']`,
  `inputAudioTranscription {}`, `outputAudioTranscription {}` and `contextWindowCompression { slidingWindow: {} }` are
  identical. There are no tools and no `sessionResumption`, and the SDK is constructed with `apiVersion 'v1beta'`
  (run-r.mjs:118). The model is asserted before connect (`:61`).
- **Composition proof (run, hashes only).** The embedded `ROUTER_INSTRUCTION` (sha12 e29bf3810128) and `ROUTER_BLOCK_B`
  (e11c240063ea) were composed with router40's own captured S1Q02 context (dd74bbdeaec1) using `buildRouterSystem`'s
  formula. The result is sha `4571f563321f…`, which equals `REGISTERED.B.system` in r40-common.mjs:56 (MATCH).
  Calibration: the same with one trailing space gives DIFF. So the composition and both constants are byte-identical
  to router40 variant B.
- **Tests:** both files from a temp cwd: 21/21 pass. tsc root: 0 errors. tsc electron: 6, the baseline set (none in new
  lines).
- **Mutants (scratch copy, harness calibrated).** The harness is calibrated: a known mutant (interrupted to closed)
  turns test 6 red. Four mutants SURVIVE, all 15 tests green:
  - `firstTextAt: this.now()` on every emit;
  - drop `this.generation++` in `stop()`;
  - drop the in-flight turn's `endTurn('closed')` in `stop()`;
  - drop `if (this.stopping) return;` in the context wait.
  The report's mutants (a)-(d) were not re-run; they rest on the report.

## Findings

**IMPORTANT-1: `firstTextAt` is asserted nowhere.**
- Where: `LiveRouterSession.test.ts:114-135`. Grep finds zero `firstTextAt` assertions in the test file.
- Why it matters: the field is load-bearing downstream. It is Task 5's pairing key (PLAN 1033-1042: `F = ev.firstTextAt`,
  open-turn and 2000 ms windows, and `firstTextAt <= dispatchedAt` picks the decider). Task 3's probe also records
  first-text ms.
- Evidence: a mutant that restamps it on every emit passes all 15 tests.
- Fix: in case 5, assert `firstTextAt: 1000` on the generationComplete event (clock 2000) and on the `afterComplete`
  event. Also assert `completed: true, endKind: 'generationComplete'` on the `afterComplete` event, which the arbiter
  receives as an ended update.
- Rests on: brief Interfaces (`RouterTurnEvent.firstTextAt`); spec 4.1 "the same `seq` for the whole turn", with
  `firstTextAt`.

**IMPORTANT-2: the router's `stop()` behaviour is unpinned.**
- Where: `LiveRouterSession.ts:77-85`; tests 7, 9, 10 and 11 call `stop()` but assert nothing after it except
  `contextInfo()` null.
- Survivors:
  - Without `generation++` in stop, a late `onmessage` from the stopped session is processed: it emits `turn` events,
    and a late `setupComplete` sets `up=true` after the meeting stopped. No test fails.
  - Without the `endTurn('closed')`, an in-flight router turn never gets its end event. Task 5's line rule waits for
    "every paired router turn has ended" (spec 5). No test fails.
- Fix (about 10 lines): after `up` plus text, call `stop()`. Expect one `endKind:'closed'` event and `state {up:false}`.
  Then the old session's `onmessage({setupComplete:{}})`, its text and its `onclose` must give no events, `isUp()`
  false, and 0 new connects after advancing 20 s.
- Rests on: Review Focus 5 ("stop() makes every late callback stale, no reconnect fires after stop", ear AND router);
  spec 6 row "stale session callback (ear or router)"; spec 4.1 lifecycle.

**MINOR-3 (report concern 2): the `stop()`-during-context-wait branch has no test. It is low risk.**
- `LiveRouterSession.ts:72`: dropping it survives, because `connect()` re-checks `stopping` at `:101`. Without the line
  there is no extra connect, only an extra `getContext` read.
- The real uncovered hazard is different: `stop()` then `start()` inside the 1 s wait. The first loop sees
  `stopping=false` again and both loops connect. The generation guard (`:126`) closes the older session, so the result
  is one live session plus a duplicate connect line and possibly the old loop's context read.
- Task 10 creates a new `LiveRouterSession` per meeting (PLAN 1549-1561), so in the app this needs a same-instance
  restart within 2 s. Optional: a test for stop-during-wait gives 0 connects.

**MINOR-4 (report concern 1): `onerror` without `onclose` is not an issue. No action.**
- @google/genai 1.44.0 assigns the callbacks straight to the `ws` socket (`dist/node/index.cjs:18655-18656`). `ws`
  always emits `close` after `error`.
- Connect-phase failures reject `live.connect` and are caught at `:128-130`.
- This is the same as the ear (GeminiLiveRouter.ts:411-413).

**MINOR-5: the quota backoff may not double in practice. Plan code, so it is not a spec fail.**
- Where: `LiveRouterSession.ts:135` resets `quotaCloses` on `setupComplete`. The ear (Task 1, GeminiLiveRouter.ts:433)
  deliberately resets only on `serverContent` or `toolCall`.
- Risk: if a 3.8 Live quota close arrives after `setupComplete`, the backoff stays at 5 s forever, about 720 connects an
  hour into an exhausted quota. Test 10b never sends `setupComplete`, so it does not cover this. The surviving mutant
  confirms that.
- Whether 3.8 sends `setupComplete` before a quota close is unverified. Suggest matching the ear (`sc` only), or record
  it as a residual risk.

**MINOR-6: some session lines are missing or differ from spec 5's shapes. The plan code has the same gaps.**
- The quota reconnect line is `attempt=quota-<n> reason=quota backoff <ms>ms` (`:180`), not `attempt=<n>`.
- Slow retries log no reconnect line (`:191-195`).
- The goAway path logs no `stale=no` close (`:141-146`). So Task 14's down-time inference ("`session up` … `session close
  stale=no`", PLAN 1746) misses goAway gaps, and its tallies must accept `quota-<n>`.
- `ws error` and `write failed` go to `console.warn`, not to `log`, so they are absent from verbal-diag.
- Flag for Task 14, not for this task.

**MINOR-7: `audioChunksOut` is counted and never surfaced (`:41,150`).** Spec 4.1 says "counted and discarded", so it is
compliant, but the counter is unread. No action needed.

**MINOR-8: Task 3 will not exercise the module's `defaultConnect` either.**
- `defaultConnect` (`:22-26`) is not exported.
- Task 3 passes `connectFn: wrap(realConnect)` with its own GoogleGenAI connect, so the module's real SDK seam is first
  crossed by the smoke (Task 17).
- Fix: export it and have the probe wrap it, or record the gap.

## Checks the dispatch named

- **Profile summary.**
  - Deterministic: it is built only from cached `structured_data` and makes no model call.
  - Format: it emits exactly spec 4.1a's three lines, each only when its data exists: `Candidate: name, role.`;
    `Skills: <first 15 non-empty>.`; `Target role: <getCompactJDHeader()>`.
  - Empty cases: `''` when knowledge mode is off or there is no resume.
  - Logging: nothing personal is logged. The session logs only `context_sha12` and `context_chars`. The
    `context empty` lines carry no text. The method itself does not log. The test fixtures are synthetic (Ada Lovelace).
  - Tests: 6 cover Off, No resume, Full (exact lines), Name only, Missing data, and determinism.
- **Generation guard vs Task 1.** The pattern matches:
  - `++generation` per connect;
  - `onmessage` gated;
  - `onclose`, then `handleClose(e, gen)`, which logs `stale=` and returns;
  - goAway bumps the generation before the close;
  - a late session is closed (`:126`);
  - a pending reconnect is skipped (`:190`);
  - close lines carry the code.
  `onopen` is a no-op, so it needs no gate. "Up" is reset on `setupComplete` rather than on the ear's `onopen`, as the
  spec requires.
- **Event shape downstream.**
  - `RouterTurnEvent` is a structural subset of Task 5's `RouterTurnIn` (`'cap'` exists only in the arbiter, PLAN 2049).
  - Emits: increments `{seq,text,firstTextAt,completed:false}`; one end `{…,completed,endKind,endedAt}`; late text
    `{…,afterComplete:true}` with the end fields; times are epoch ms in main.
  - Task 10 (PLAN 1552-1561) consumes `'state' {up,at}`, `'turn'` and `'failed' {reason}`. It logs `[Router] session
    failed … dispatches_before`, the spec 5 line this module deliberately does not write.
  - Its `stopRouterSession` calls `stop()` before `removeAllListeners()`, so the closing end and state events reach the
    arbiter.
  - Task 3 needs `state up`, `endKind` and the per-event timing. All are present.

## Not shown

- No live model call: the real `defaultConnect`, real `setupComplete` timing and quota-close shape are unexercised (see
  MINOR-5, MINOR-8).
- The report's mutants (a)-(d) were not re-run.
- The RED-phase evidence was not re-checked. The report says 8 cases failed with a harness TypeError rather than an
  assertion; that is acceptable under I4 only loosely.

## Re-review

Scoped re-review of fix round 1: `reviews/task-2-fix1.diff` (c03702d on 2873a76) and `reports/task-2-fix1-report.md`.

**Verdict: all four findings are resolved and the fix adds no defect.** MINOR-3, -7 and -8 are unchanged, as agreed.

### What I ran
- **Tests, from a temp cwd at --root WT:** LiveRouterSession 20/20 and routerProfile 6/6, so 26/26.
- **tsc:** root 0 errors; electron 6, the baseline count.
- **Mutants, on a scratch copy of the c03702d files:** the unmutated copy passes 20/20, so the harness is calibrated. Each
  mutant turns exactly one case red:

| Mutant | Fails |
|--|--|
| no `generation++` in `stop()` | case 14 |
| no `endTurn('closed')` in `stop()` | case 14 |
| `firstTextAt` restamped on every emit | case 5 |
| `setupComplete` resets `quotaCloses` again | case 15 |
| slow-retry reconnect line removed | case 16b |

  The first two and the `quotaCloses` one are the implementer's own mutants, reproduced.

### Findings checked
- **IMPORTANT-1: resolved.**
  - Case 5 now pins `firstTextAt: 1000` on the end event (clock at 2000) and on the late-text event.
  - It also pins the late event's `completed`, `endKind` and `endedAt`.
- **IMPORTANT-2: resolved.**
  - Case 14 checks that `stop()` gives one closed end event, `up:false`, and a single close of the old session.
  - The old session's late `setupComplete`, text and close then give no event and keep `isUp()` false.
  - No connect follows in the next 20 s.
- **MINOR-5: resolved.**
  - `quotaCloses` is now reset only on `serverContent` (`LiveRouterSession.ts:135`). That matches the ear, except for
    `toolCall`, which the router never receives.
  - Case 15 checks that a `setupComplete` between two quota closes still lets the backoff double.
- **MINOR-6: resolved.**
  - The quota reconnect line now reads `attempt=<n>`.
  - Slow retries now log a reconnect line, and the attempt count keeps growing (4, 5, …); `failed` still fires once
    (case 10a passes).
  - goAway now logs `session close gen=<live gen> code=- reason=goAway stale=no quota=no`, before the generation bump.
    That is the correct generation, because `onmessage` is gen-gated.
  - `ws error` and `write failed` now go through `log`, which is verbal-diag.

### New notes (MINOR, nothing blocking)
- **For Task 14, the reader.**
  - A goAway now produces two close lines for one session: the `stale=no reason=goAway` line, and later that session's
    own `stale=yes` close. Count closes by `stale=no`.
  - A quota reconnect and a quick reconnect share the `attempt=` key. Tell them apart by `reason=quota`.
  - The `attempt=` number keeps growing during a long outage.
- **`ws error` lines now reach verbal-diag.**
  - The text is `${e?.message ?? e}`. An ErrorEvent without a message prints `[object Object]`, which is cosmetic.
  - `ws` errors such as "Unexpected server response: <code>" do not carry the connection URL. So I see no key exposure,
    but that is not exercised against the real SDK.

### Not shown
- No real-SDK error, write or goAway path was exercised, because there was no model call.

SPEC: PASS  QUALITY: APPROVE
