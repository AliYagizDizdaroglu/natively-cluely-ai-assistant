# Task 7 review: turn id threaded through main.ts and turnDispatch; startup line

Reviewer: Opus, 2026-10-05. Package: BASE c94cdb5 .. HEAD a338e65 (WT eq-build). `git diff --stat c94cdb5 a338e65` = 3 files, +24/-9, the same as the package.

SPEC: PASS
QUALITY: APPROVE

## What was checked

### 1. Every `runWhatShouldISay` / `answerDetection` call site, and whether it carries `turnId`

| Site | Path | turnId | Per spec §3.1 |
|---|---|---|---|
| main.ts:1008 `actOnTurn` dispatch → `dispatchDetection(turnDispatchInput(base, d, snapshot().id))` → :2168 `answerDetection(d)` | auto turn dispatch | yes | yes |
| main.ts:1020 R21 supersede (no `turnDedupId`) → `dispatchDetection` → :2168 | auto, re-entry as a fresh dispatch | yes (no `replaceAnswer`, so a block can be built; ledger PUSH, n4) | yes |
| main.ts:1023/:1033 supersede → `answerDetection(input, {replace:true})` | auto 8 s supersede | yes, plus `replaceAnswer` → `gate=supersede`, ledger remove-and-push | yes |
| main.ts:2197 `answerDetection` → `runWhatShouldISay(..., turnId)` | the one forward | forwards `d.turnId` when `!= null` | yes |
| main.ts:941 `fragmentHold` / :927 `liveHold` resolve, :2241, :2536, :2555, :2570 `dispatchDetection({...})` | Live / STT detections | none | In auto mode every one of these returns at the mark block (main.ts:2100-2111) before it can answer. Only `turnDispatch` inputs reach `answerDetection`, so no auto-mode verbal answer goes out without an id. In suggest/off mode `decideDispatch` never answers (`chip` or `drop`, detectionDispatch.ts:12-17). |
| ipcHandlers.ts:2377 manual, :2401 chip click, :2429 answer-now | typed/manual/chip | none | null by design: the ledger is written, no block (spec §3.1 table, :211-212) |
| IntelligenceEngine.ts:184 `handleSuggestionTrigger` | legacy native trigger | none | no non-test caller in electron/ (dead); null is the safe direction |
| typed chat `gemini-chat-stream` | n/a | never reaches `runWhatShouldISay` (spec :47) | n/a |

There is no silent gap. Every auto-path answer goes through `turnDispatchInput`, which now takes a REQUIRED third parameter, so a future fourth call site cannot drop the id without a compile error. The forward at :2197 is the only spot that could drop it silently (Minor 1).

### 2. When `snapshot().id` is read

- All three reads are synchronous, inside `actOnTurn`, right after `this.turn.tick()` returned the `dispatch`/`supersede` decision (main.ts:981-983). Nothing between the decision and the read calls into the machine: `turnDetectionOr` and `console.log` only.
- `tick` returns `dispatch` (interviewerTurn.ts:280-281) and `supersede` (:240-242) with `turn` still set. Only the `close` branches null it. The id read is therefore the id of the turn whose text `d.text` is. It is never null at these sites, and never a later turn's id.
- The id is captured on the `DetectionInput` before `answerDetection`'s screenshot `await` (main.ts:2190), as spec §3.1 :61-62 requires. A turn that opens during that await cannot change it.
- Supersede: same turn object, same id, `replaceAnswer` set → engine `gate=supersede`, remove-and-push. R21 supersede: same id without `replaceAnswer` → PUSH (spec n4). Both match the spec table.
- Held fragments and the Live hold carry no id (`...held` from a non-turn input). In auto mode they are never offered (the mark block returns first).
- Hedge: the block is built once per `runWhatShouldISay` call in the engine (Task 6). Task 7 does not touch the hedge.
- The typed path has no id, by design.

### 3. Startup line

- The code (main.ts:3452) logs `[Main] ${describeEarlierQuestionAtStartup()}`, and earlierQuestion.ts:40 returns `earlier question: on|off`. The line is `[Main] earlier question: on` / `[Main] earlier question: off`.
- That is exactly what the plan wants (`[Main] earlier question: on|off`) and exactly what PREREGISTER-flight-eq.md rule 1(a) (:154-155) greps.
- It sits inside the existing `try`. A bad value, or `=1` together with `NATIVELY_FOLLOWUP_PARENT=1`, throws into the existing catch, which logs `… — refusing to start` and calls `app.exit(1)`.

### 4. Byte-identity with the flag off

- The engine reads `options.turnId` only inside `if (earlierQuestionEnabled())` and the error catch (IntelligenceEngine.ts:372-386).
- `options` is never serialized or forwarded to `WhatToAnswerLLM`.
- The extra `turnId` key on `DetectionInput` and on `options` therefore changes no prompt bytes with the flag off.
- The `DetectionInput` spread keeps the key absent when the id is null.

### 5. Tests fail when the effect is absent

Re-run from SP\eq-tmp with MAIN's vitest, `--root <WT>`, `electron/services/turnDispatch.test.ts`:

| Run | Result |
|---|---|
| clean | 9/9 pass |
| M1 spread dropped | 1 failed (`carries the turn id`) |
| M2 `turnId ?` (truthy) | 1 failed (`carries the turn id`: the id-0 assertion) |
| M3 unconditional `...{ turnId }` | 1 failed (`carries no turnId key at all when the id is null`) |

- After the run the file was restored byte-identical (sha 9f7043f5ba2d before and after).
- `git -C <WT> status --short` shows no tracked change. It shows two UNTRACKED files, `electron/test/golden/earlierQuestionArm.mjs` and `.test.ts`, written 16:47:43-48. They postdate this commit (16:46) and belong to Task 7b in progress, not to Task 7 or this review.
- Type-check gates re-run at HEAD: root tsc exit 0, no output. The electron list equals the six-error baseline (`Compare-Object` printed nothing).

## Findings

Critical: none.

Important: none.

Minor:
1. **main.ts:2197, 1008, 1020, 1023: no unit test covers the main.ts lines (by plan design, m8).** A mutant that drops `...(d.turnId != null ? { turnId: d.turnId } : {})` at :2197 still compiles (the option is optional) and passes every suite. Only Task 10's smoke (`turn=<id>` vs `gate=no-turn … turn=none`) and flight rule 1(b) would catch it. This is residual risk until Task 10; the plan already names it.
2. **The task-7 report's caveat "snapshot().id is null if the turn has already closed" does not apply at any of the three sites.** `tick` returns `dispatch`/`supersede` only with the turn open (interviewerTurn.ts:232-281), and the read precedes any other machine call. The `null` branch is unreachable there; it exists only because of the `number | null` signature. This is informational, not a defect.
3. **Flight-side note, outside this task: rule 1(b)'s reader must anchor on the `[IntelligenceEngine] earlier question:` prefix or on `turn=`.** The startup line `[Main] earlier question: on` also contains `earlier question:`. It falls before the run window, so it should not count, but `eq-flight-read.mjs` should not match on the bare substring.

## Not shown

- The main.ts wiring was not exercised live; that is Task 10.
- The startup refusal path (a junk value, or both flags at 1) was not run in the built app here. `describeEarlierQuestionAtStartup` itself is covered by Task 2's tests.
- A mode switch auto→suggest in the middle of an open turn was not traced. It is pre-existing behaviour, and a turn dispatch in suggest mode becomes a `chip`, which is never answered.
