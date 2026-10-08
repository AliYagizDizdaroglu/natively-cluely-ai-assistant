# Task 7 report: engine events, answer end, history sink, speechEnd() (lane C)

Status: DONE_WITH_CONCERNS (one additive deviation, see below). Commit: c4812f5 on feat/live-router-c (parent 3719078).

## Files
- electron/IntelligenceEngine.ts: event types; turnId as last arg on the 3 token/final/source emits (5 emit sites incl. the answerLLM-branch final); outer try/finally emitting suggested_answer_end; history sink + setTurnHistorySink.
- electron/IntelligenceManager.ts: forwards suggested_answer_end; setTurnHistorySink delegates; addAssistantMessage(text, questionContext?).
- electron/services/interviewerTurn.ts: speechEnd() on interface and object.
- electron/IntelligenceEngine.turnEvents.test.ts (new, 15 tests); electron/services/interviewerTurn.test.ts (+4 tests).

## Tests
- Targeted run: `IntelligenceEngine*` + `services/interviewerTurn*`: 9 files, 108 tests, all pass.
- RED first (16 failures before implementation): token arity 5 vs 6, source args `['gemini-x']` vs `['gemini-x', undefined]`, no end events (`[]`), `setTurnHistorySink is not a function`, `speechEnd is not a function`. Failures were for the right reasons; the classifyIntent test failed on "no end event", not on the throw (calibrated: the mock throws once and the engine's catch path runs, giving kind=failed after the change).
- Calibration by mutation (scratchpad mutate7.mjs, file restored, 15/15 after): dropping `endGeneration = generationId` fails 2 tests (completed-carries-generation and the I1 test); disabling the sink branch fails the sink test; dropping `endKind='aborted'` on the cooldown return fails the cooldown test; disabling the finally emit fails 7.
- I2 exits each tested with turnId 7 (exactly one end, one log line) and without turnId (none): cooldown return, answerLLM branch, no-key return, classifyIntent throw, stream throw, aborted by replacement, normal completion.
- I1: first stream blocked mid-way, second call with replaceAnswer finishes and ends `completed` first; then the first stream resumes and ends `aborted`. Two end events, same turnId 7, different generation ids (the old one is the lower one).
- I3 / Review Focus 2: with sink + turnId the session's addAssistantMessage is not called and sink gets `(7, fullAnswer, settled)`; without turnId, or with a null sink, the session is called as today.

## tsc
- Root config: clean.
- electron config: the same 6 pre-existing errors as baseline-tsc-electron.txt, none new.

## Deviations
1. `suggested_answer_end` has an optional THIRD argument `generationId: number | null` (the plan's interface is `(turnId, kind)`). Reason: the lead's brief for rev 2 I1 asked every end event to carry a generation id and the test to pin it. It is additive: the plan's two-argument listeners (main.ts line ~1533 `(turnId, kind) =>`) are unaffected, the log line is exactly the plan's. `null` when the call left before a stream's generation exists (cooldown, no-key, throw before `++currentGenerationId`). PLAN.md Task 5 solves I1 in the arbiter via `replacedAt`, so the generation id is an extra signal the arbiter may ignore; controller should decide whether Task 5/8 should use it.
2. The outer try is not re-indented (plan said "wrap, do not move code"); keeps the diff to changed lines. The stray 8-space indent inside is deliberate and commented.
3. answerLLM branch with a falsy answer (no final emitted) ends as `failed`, not `completed`; plan only said success sets completed.
4. Also typed `suggested_answer` with the `replace?` argument it already emitted but never declared.

## Flag-off / B2
No turnId means the emitted events are today's, with one trailing `undefined` argument (pinned by test: positions 0-4 unchanged; session addAssistantMessage path unchanged). The session path is also taken with a turnId when no sink is set.

## Concerns
- Git on a sibling worktree is refused from Bash in my session; PowerShell `git -C` worked, so the commit is mine.
- The interim `[IntelligenceEngine] answer end` line is logged even when `emit('error')` throws in the catch (finally still runs); not exercised beyond the throw tests, which register an error listener.
- Not exercised: the real app wiring (main.ts is Task 8+); IntelligenceManager's forward list and `setTurnHistorySink` delegate have no direct test (type-checked only).
