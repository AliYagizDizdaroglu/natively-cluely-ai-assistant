# Task 4 review: the verbal hedge behind NATIVELY_VERBAL_HEDGE

Reviewer: Opus, read-only. Scope: the MAIN working tree against 07a0e5e for LLMHelper.ts, WhatToAnswerLLM.ts, main.ts, verbalHedge.ts, and the three test files. The concurrent edits to IntelligenceEngine, SessionTracker and the golden harness were ignored.

SPEC: PASS
QUALITY: APPROVED

Counts: Critical 0, Important 0, Minor 7.

## What I checked

- **Code against the brief.** `streamGeminiWithHedge`, the branch at the top of `streamGeminiWithStallFallback` (LLMHelper.ts:3392-3398, 3457-3537), `HEDGE_WINNER` and `nameStallSwitch` (WhatToAnswerLLM.ts:34-35, 103-125), and main.ts:2431 all match the brief character for character. The log formats also match: `front=… back=… trigger=…ms`, `back started at <ms>ms reason=<trigger|front-error|front-empty>`, `won by <model> at <ms>ms; other=<not-started|aborted|failed|empty>`, and the `no answer - front X, back Y` warn.
- **Policy parity with runHedge** (hedge-live.policy.mjs:39-53):
  - the front starts first;
  - a front error starts the back at once, and the back alone decides;
  - at the trigger the back starts and the front is not stopped;
  - the first token wins and the loser is aborted;
  - a failed leg leaves the other to finish.
  - One addition goes beyond the policy: `front-empty` also starts the back. The probe never modelled this case. Today, an empty primary simply ends empty.
- **Tests run** (SD\vitest-cwd-rev4, the six files): `Test Files 6 passed (6) / Tests 57 passed (57)`, exit 0.
- **Live-shaped repro:** SD\rev4\hedge-repro.mjs.
  - It is the hedge body transcribed verbatim, plus `streamWithGeminiModel`'s stop, abort and finally shape.
  - It runs on real timers, with a fake SDK whose pending request and body read reject on abort, as the real fetch does. The vitest fake's `'silent'` never settles, so no unit test ever exercises an aborted loser's rejection.
  - It records `unhandledRejection` and `rejectionHandled` events for each scenario. Results are cited below.

### Default-off

With the flag unset, `verbalHedgeEnabled()` returns false at the first `next()` of `streamGeminiWithStallFallback`, and control falls into the unchanged race. The call order, the 10 s timer, the `(fallback)` sentinel and the `verbal stall race` / `stalled after` lines are all unchanged.

`nameStallSwitch` produces an identical announce string for a stall switch (`__model_source:${m[1]} (fallback)__`) and for a Gemma handover (`Gemini Flash (fallback)`). The `HEDGE_WINNER` regex cannot match either of them.

Only two things differ in the default path:
- one read of the environment per answer;
- the new `[Main] answer source:` line, which the brief asks for and which is unconditional.

The pin test (flag unset: 3.1 at 9999 ms, 3.1 then 3.5 at 10000 ms, the `(fallback)` sentinel, no hedge line) passes. So do stallFallback, abortOnClose and emptyStream.

### Winner label in every branch, traced through WhatToAnswerLLM

| branch | raw sentinel | bar shows (last label) |
|---|---|---|
| front answers before the trigger | `3.5-lite (hedge)` | 3.5-lite (hedge). The head label 3.1-lite is shown until the first words. |
| back wins after the trigger | `3.1-lite (hedge)` | 3.1-lite (hedge) |
| front answers after the trigger | `3.5-lite (hedge)` | 3.5-lite (hedge) |
| front error, then the back answers | `3.1-lite (hedge)` | 3.1-lite (hedge) |
| both error | throw (the front's error) | The redirect label `3.5-lite (fallback)` appears, then the redirect hedge's winner. This is correct: `answering` is still the head's 3.1, so `pickFallback` returns 3.5. |
| both empty | none | The head label stays and the answer is empty, as today. |

All the hedge labels are underscore-free. Both the IntelligenceEngine regex and the IPC chat's exact startsWith/endsWith intercept read them.

### Thinking levels and system instruction

`thinkingLevelForModel` resolves per model inside `streamWithGeminiModel` (LLMHelper.ts:3261), so 3.5 gets HIGH and 3.1 gets LOW, exactly as today for each model. Both legs receive the same `systemInstruction` variable. Case 7 pins both.

### Pre-token errors and the request count

A front 503 starts the back at once. If both fail, the front's error is thrown, and `withVerbalFallback` redirects. The redirect re-enters the hedge, which ignores the model it is given, so the worst case is 4 requests: 3.5, 3.1, 3.5, 3.1. Today's worst case is 5: 3.1 stalls, 3.5 fails before its first token after the switch, the redirect goes to 3.1, 3.1 stalls, and 3.5 is tried again. So the hedge does not raise the ceiling.

### The "spurious unhandled-rejection" deviation

This is a test artifact and not a production defect.

- **Test-shaped consumer** (repro E: create `out = drain(...)`, wait a macrotask, then attach the handler): `UNHANDLED: got status: 503`, then `rejectionHandled`. This is the warning the implementer saw.
- **Production-shaped consumer** (a for-await with a catch, as in `withVerbalFallback`, IntelligenceEngine and ipcHandlers) on the same both-503 run (repro A): no events.
- **Aborted losers** (repros B and C): no events. Their rejections land in `leg.first`'s onRejected handler, as the code comment claims.
- **Other promises in the hedge:**
  - `leg.first` handles rejection when it is created;
  - `Promise.race` and the winner promise cannot reject;
  - the thrown `f.err` rejects the consumer's own pending `next()`.
- **The unawaited `leg.gen.return()` in `deliver`** follows the same pattern as today's `primaryStream.return()`. The SDK 1.44 stream's finally is a synchronous `reader.releaseLock()` (index.cjs:12520).

Moving `expect(out).rejects` ahead of the timer advance hides nothing.

## Findings

### Critical

None.

### Important

None.

### Minor

**M1. The loser is neither aborted nor labelled correctly when both first tokens land before the hedge resumes** (LLMHelper.ts:3532-3534)
- **Failure:** after the trigger, both legs' first `next()` resolve with a token within the same macrotask. Repro G shows this: it logs `won by gemini-3.5-flash-lite …; other=empty` with `3.1=false` aborted.
  - `loser.settled` is `{kind:'token'}`, so the code skips `stop.abort()`. It also labels the loser `empty`.
  - The loser's request then streams a whole answer nobody reads, costing a socket and tokens.
  - The h40c stats script parses `other=` and would count a spoken leg as empty.
- **Likelihood:** in production this is close to unreachable, because two separate sockets deliver in separate I/O callbacks and microtasks drain between them. The fix is one line all the same.
- **Fix:**
  ```ts
  const other = loser.settled?.kind === 'error' ? 'failed' : loser.settled?.kind === 'empty' ? 'empty' : 'aborted';
  if (loser.settled?.kind !== 'error' && loser.settled?.kind !== 'empty') loser.stop.abort();
  ```

**M2. A superseded answer keeps both legs running until one of them speaks** (LLMHelper.ts:3509 and 3521; the consumer check is at IntelligenceEngine.ts:414-421)
- **Failure:** `.return()` on an async generator that is awaiting is queued behind the in-flight `next()`. IntelligenceEngine only checks the generation when a token arrives, so the close cannot happen earlier. Repro F: a `return()` issued at 70 ms, with both legs pending, settled 342 ms later, when the back spoke. Neither request was aborted in between.
  - If both legs hang, the superseded generation and its two requests never end. No deadline exists after the trigger.
- **Compared with today:** the structure is the same. Today also has no deadline on the fallback, and its superseded answer also runs to the first token. The difference is two requests in flight after the trigger instead of one.
- **Fix:** none needed for h40c. Record it as a residual risk in the pre-registration. Any hard cap on both legs would be a policy change, to be probed first.

**M3. A junk flag value kills every verbal answer mid-interview, and only surfaces on the first question** (LLMHelper.ts:3395)
- **Failure:** with `NATIVELY_VERBAL_HEDGE=yes`, `verbalHedgeEnabled()` throws inside the generator, which counts as a pre-token failure.
  1. `withVerbalFallback` shows a spurious `gemini-3.5-flash-lite (fallback)` label and redirects.
  2. The redirect throws again.
  3. The bubble reads `[No answer — both the primary model and the gemini-3.5-flash-lite fallback failed: NATIVELY_VERBAL_HEDGE="yes" is not …]`.
  - This repeats on every verbal answer, with zero requests made.
  - Non-lite Gemini primaries fail too, because the environment check runs before the model check.
  - A junk `NATIVELY_VERBAL_HEDGE_TRIGGER_MS` with the hedge on behaves the same way.
- **Spec:** compliant ("throws at the call"), but the failure is loud in the wrong place.
- **Fix:** keep the per-call throw, and also call `verbalHedgeEnabled()` and `verbalHedgeTriggerMs()` once at app start in main.ts. Log `[Main] verbal hedge: on|off trigger=<ms>ms` there. A bad value then refuses at launch. The line also gives Task 7/8 a before-the-first-question proof that the flag reached the process (rule 7).

**M4. Test gaps: some cases do not discriminate** (electron/LLMHelper.verbalHedge.test.ts)
- **Tests that pass without the hedge:** 4 of the 13 cases passed before the implementation (the report says so). Cases 10a and 12 pass by design. Cases 6 and 9 are not red-first.
- **Case 6** ("the front's error propagates") only asserts `/503/`:
  - it has no `asked()` check;
  - both legs fail with the same text, so throwing `b.err` first would also pass;
  - it does not assert the `no answer - front error, back error` warn.
- **Case 9** has no `asked()` check.
- **Untested paths:**
  - closing on the sentinel after the trigger, with two legs in flight (repro D covers it: both aborted);
  - both legs failing on the trigger path;
  - an aborted loser whose request rejects. The fake `'silent'` ignores `abortSignal`.
- **Fix:**
  - give the fake per-step error text (for example `{ error: '503 front' }`);
  - assert `asked()` equals `[3.5, 3.1]`, the front's message, and the warn line in case 6;
  - add `asked()` to case 9, plus a trigger-path variant that asserts `signals[0]` and `signals[1]` are both aborted;
  - make `'silent'` reject with an AbortError when its signal fires.

**M5. Environment hygiene in the tests**
- **Failure:**
  - The existing today's-race test files (LLMHelper.stallFallback, abortOnClose, emptyStream, and the first describe in WhatToAnswerLLM.answeringModel) never clear `NATIVELY_VERBAL_HEDGE`. A shell that exports it (a flight or smoke shell) makes them fail spuriously, or throw if the value is junk.
  - The new answeringModel describe (lines 269-272) deletes the variable instead of restoring its saved value.
- **Fix:** delete the variable in those files' `beforeEach`, and save and restore it as LLMHelper.verbalHedge.test.ts does.

**M6. When both legs fail, the redirect re-runs the same pair** (WhatToAnswerLLM.ts:388-399; the hedge ignores its `model`)
- **What happens:** the redirect logs `redirecting to gemini-3.5-flash-lite` and runs both models again. The final message names a single "fallback" although up to four requests ran.
- **Spec vs brief:** the spec says "If both fail, today's no-answer path applies". The brief chose the redirect deliberately and pins it with a test.
- **Cost:** it is cheap (see the request count above). The spec's H4 evidence, that failures cluster in time, predicts the retry rarely helps.
- **Fix:** none needed for h40c; the controller should note it. Flight stats should count a redirect's hedge as a second hedge within the same answer.

**M7. The flight instruments misname the answering model under the hedge** (outside Task 4's files; for Tasks 7 and 8)
- **What happens:**
  - `capturePrompt({ model: verbalModel })` (LLMHelper.ts:2728) records 3.1-lite.
  - pass-record's `answerModel` comes from `Default Model set to` (interview60.pass-record.mjs:78), which also says 3.1-lite.
  - Each answer's first `[Main] answer source:` line is the head label, 3.1-lite, which is logged before the winner.
  - With the hedge on, 3.5-lite writes most answers, so all three are wrong.
- **Fix:** h40c readers should take the last `answer source` per answer, or the `won by` lines, and should not read the capture model or `answerModel` as the answering model.

## Not independently re-run

I did not re-run the implementer's two calibrations: removing `HEDGE_WINNER` should fail the 3 label tests, and removing `loser.stop.abort()` should fail cases 2 and 3. Doing so would mean editing MAIN.

Both are confirmed by reading:
- without `HEDGE_WINNER`, `stripModelSentinel` eats the raw head sentinel and `announce` stays null;
- without the abort, the fake `'silent'` signals stay un-aborted.

Repro D and repro B/C independently show that `deliver`'s finally and the loser abort both act.
