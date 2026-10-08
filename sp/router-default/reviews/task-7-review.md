# Task 7 review: engine events, answer end, history sink, speechEnd() (lane C)

Reviewer: Opus. Commit c4812f5 on feat/live-router-c (base 3719078). Brief: PLAN.md Task 7 (1241-1306), Global Constraints, Review Focus 2.

**SPEC: PASS  QUALITY: APPROVE** (no BLOCKING or IMPORTANT findings; 5 MINOR)

## Evidence I ran
- Targeted tests (temp cwd, `--root` WT): `electron/IntelligenceEngine*` + `electron/services/interviewerTurn*`: 9 files, **108 passed**, 0 failed.
- tsc root: clean (rc 0). tsc electron: **6 errors**, the same files as `baseline-tsc-electron.txt` (GeminiLiveRouter 1, ipcHandlers 3, KnowledgeOrchestrator 2); none new.

## Spec compliance (brief checklist)
| Requirement | Met | Where |
|--|--|--|
| turnId as LAST arg on the 5 emits (answerLLM final, source, 2 tokens, final) | yes | IntelligenceEngine.ts 317, 498, 505, 513, 542 |
| `suggested_answer_end` from an outer finally covering every exit, only with turnId | yes | 277-282 (try), 553-557 (finally) |
| endKind default `failed`; completed at normal end + answerLLM success; aborted at streamAborted, cooldown, no-key | yes | diff lines 122, 137, 147, 215, 242 |
| log line `[IntelligenceEngine] answer end turn=<id> kind=<k>`, once | yes | 555 |
| history sink replaces line 504 exactly as written | yes | diff 227-228 |
| manager: forward list, `setTurnHistorySink` delegate, `addAssistantMessage(text, questionContext?)` | yes | IntelligenceManager.ts 226, 270-277 |
| `speechEnd()` on interface + object; null rules; src vad iff vadSeen | yes | interviewerTurn.ts 81, 316-319 |
| every Step-1 test (turnId last arg; undefined + positions; completed/aborted/failed logged once; I2 cooldown/answerLLM/classifyIntent with and without turnId; sink vs session; speechEnd 3 cases) | yes, plus no-key and null-sink extras | turnEvents.test.ts, interviewerTurn.test.ts |

Extras beyond the brief: the optional 3rd arg `generationId` (Q1 below) and typing `suggested_answer`'s pre-existing `replace?` arg. Both additive.

## Controller questions

### Q1. The `generationId` third argument: keep it, unused
- **Not consistent with a consumer today, but harmless.** Task 5's `PipelineIn` is `{ ch:'end'; turnId; kind }` (PLAN 996), and Task 10's listener is `(turnId, kind) =>` (PLAN 1533); both ignore a third arg. Nothing breaks.
- **Recommendation: keep it, unused, and do not thread it into Task 5 now.** Changing Task 5's tested contract mid-build costs more than it buys.
- **But it surfaces a real gap in rule 20 that the controller should send to Task 5's reviewer.** The implementer's own I1 test (turnEvents.test.ts 378-406) shows the stale old-stream `aborted` arriving AFTER the replacing stream's `completed`. This is the realistic order: the old stream only notices the generation change on its NEXT token (IntelligenceEngine.ts 485-493), so a stalled old stream reports late. Rule 20 drops a stale end only "after a replace:true token and **before any end of the replacing stream**" (PLAN 1126-1127). A stale end after the replacing end is NOT dropped. The arbiter then sees a second end for the turn. Task 5 must handle that as idempotent: no second capture or decision line, and `pipeEndKind` not overwritten to `aborted`. A pin test should cover it. If Task 5 cannot make this idempotent cleanly, the generation id is the precise fix, and keeping the argument now keeps that option open.
- Related, pre-existing and out of scope: a superseded stream whose generator finishes without yielding again never hits the generation check (it exits the `for await` normally). It would then emit a stale `suggested_answer` final with the turnId, sink history, and `completed`. The window is small and the bug predates this task. Do not fix it here. Note it for the whole-branch review.

### Q2. answerLLM branch with a falsy answer ends `failed`: consistent
- It falls out of the plan's own default (`let endKind = 'failed'`; only "answerLLM **success**" sets completed, PLAN 1289). The branch emits no final, so `failed` + no final matches arbiter rule 14 ("end with kind aborted|failed and no final: mark the pipe ended", PLAN 1093). The spec counts a failed end as an ended pipeline for the decision line (SPEC §4.3 "completed, aborted or failed").
- `completed` with no final would be the inconsistent choice: the arbiter's capture code would expect a final/historyText that never comes.
- No interaction with rule 20: this branch emits no tokens, so no `replace:true` token exists to arm the drop.
- Practical reach: nil in production. `initializeLLMs` always constructs both `answerLLM` and `whatToAnswerLLM` (IntelligenceEngine.ts 138, 144). The branch runs only when a test nulls `whatToAnswerLLM`.

### Q3. Flag-off path: renderer-identical; one intended non-renderer difference
- **Renderer and preload cannot see the trailing arg.** IntelligenceManager forwards `...args` (IntelligenceManager.ts 233-235). main's three listeners take fixed named params and build explicit payloads (main.ts 2419-2443): `{answer, question, confidence, replace}`, `{token, question, confidence, replace, ...cues}`, and `label`. The trailing `undefined` is dropped before `webContents.send`. The preload subscriptions (preload.ts 780-800) receive the same `data`/`label` as today. Nothing reads `arguments.length` or `listener.length`. Every existing `IntelligenceEngine.*.test.ts` that captures these events passes (108/108).
- **History is unchanged flag-off.** The sink is set only when the router is enabled (PLAN 1528), so `session.addAssistantMessage(fullAnswer, settled)` runs as before.
- **One intended difference that is not argument-related.** main already passes `turnId` on the hands-free path whatever the flag (main.ts 2197), and the end event is deliberately NOT flag-gated (Global Constraints "turnId plumbing NOT behind the flag"; Task 13 reads it flag-off, PLAN 1666). So flag-off hands-free runs now log one `[IntelligenceEngine] answer end turn=<n> kind=<k>` line per dispatch and emit an end event with no listener (a no-op). No harness parser in `electron/test` matches that line. The typed and manual paths (ipcHandlers 2401, no turnId) log nothing.

## Findings
1. **MINOR: rule-20 window vs the observed end order** (PLAN 1126-1127; turnEvents.test.ts 378-406; IntelligenceEngine.ts 485-493). See Q1. Not a Task 7 defect. Hand it to Task 5: a stale `aborted` after the replacing `completed` must be idempotent and pinned by a test.
2. **MINOR: the answerLLM branch writes history to the session even with turnId + sink** (IntelligenceEngine.ts ~316 `this.session.addAssistantMessage(answer)`). This goes around I3 (SPEC §4.6). It is unreachable in production (both LLMs always constructed), and the brief named only line 504. No change needed; mention it in the whole-branch review.
3. **MINOR: the plan's log format says `turn=<id|none>`** (PLAN 1261), but Step 3 says no turnId does nothing (PLAN 1292-1293). The implementation follows Step 3 and never logs `none`. The `turnId: number | null` in the event type is likewise never null in practice. This is a plan inconsistency, resolved correctly.
4. **MINOR: `speechEnd().src` is `'vad'` iff `vadSeen`, as the plan says** (PLAN 1266). The spec reads "vad when it is a VAD off-transition" (SPEC §4.3). They differ in one edge: a final sets `lastSpeechAt`, then a VAD-on with no off yet makes `vadSeen` true, so `{at: <final time>, src: 'vad'}` comes back. Dispatch happens after a stop in practice, so this is moot. The plan text binds.
5. **MINOR: the manager forward list and the `setTurnHistorySink` delegate have no direct test** (IntelligenceManager.ts 226, 275-277). The report says so too, and the brief asks for none. Task 10's wiring test will exercise them.

## Test quality
- The tests would fail without the behaviour. The implementer's mutation run (report lines 13-14) covers the generation assignment, the sink branch, the cooldown `aborted` and the finally emit. I checked the assertions read the exact arg positions (`a[5]`, `fin[0][4]`, `src` equality), the exact log lines (`endLines` toEqual), and `not.toHaveBeenCalled` on the session.
- The I1 test pins the order (new end before old) and the distinct generations. It proves the engine side of Q1's gap.

## Not checked
- The real app wiring (main.ts listener, Task 10). The end event's effect on the arbiter (Task 5 does not exist yet in WT-B).
- No live run, by the rules.
