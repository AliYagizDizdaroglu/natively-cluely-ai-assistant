SPEC: PASS / QUALITY: APPROVED

# Task 11 review (h40c: M1, M2, M4, M6), MAIN 391f1fc + uncommitted working tree

Counts: Critical 0 · Important 0 · Minor 3 (plus 1 report nit)

## How this was checked

The review was read-only on MAIN. Git on MAIN is blocked from this worktree session, so I compared the working tree against HEAD in two ways:
- 814 tracked blobs, by hashing each file against `git ls-tree -r 391f1fc`;
- the 10 relevant files, by extracting their HEAD copies with `git show` into `SP\t11rev\head`.

Mutations ran on a scratch mirror, `SP\t11rev\mirror`. It holds MAIN's `electron/`, the s50a run folder and a junction to MAIN's node_modules. Runners: `SP\t11rev\mut.mjs`, `render-cmp.mjs` and `e2e.mjs`. Each mutation was restored after its run, and the final baseline run was 59/59 green.

### Files

Exactly the 8 files in the brief changed. Each was modified between 19:41 and 19:50, and each is LF with no BOM:
- `electron/LLMHelper.verbalHedge.test.ts`
- `electron/LLMHelper.geminiThinking.test.ts`
- `electron/LLMHelper.verbalPrimary.test.ts`
- `electron/llm/followUpParent.ts` and its test
- `electron/main.ts`
- `electron/test/golden/interview60.pass-record.mjs` and its test

`electron/LLMHelper.ts` is byte-identical to HEAD, so the implementer's mutations were fully reverted.

The other tracked files that differ from HEAD have mtimes from 2026-07-28 to 2026-09-26 13:24, before this task started:
- `interview60.chains.json`, `interview60.report.md`, `natively_debug.log.1`;
- `GeminiLiveRouter.ts`, `questionShape*`, `liveHold.test`, `questionReconcile.test`, `build-audio-local`, `TopPill.tsx`.

None of them belongs to this task.

## SPEC

**A. M1: PASS.** There are two new tests, at verbalHedge.test.ts:228 (front `[]`) and :250 (both `[]`). They use the file's existing `plan`, `asked()`, `signals` and `drain` fakes.

The front-empty test asserts:
- the back leg is started with `reason=front-empty`;
- the first chunk is the `(hedge)` sentinel naming 3.1-lite;
- the `won by gemini-3.1-flash-lite ... other=empty` line;
- the front's signal is not aborted.

The both-empty test asserts:
- the generator drains to `[]` with no throw;
- both models were requested;
- the `no answer - front empty, back empty` warn line.

Both implementer mutations were re-run on the mirror:

| Mutation | Result |
|---|---|
| both-empty `return` → `throw` | 1 failed (the both-empty test) |
| front-empty returns before `start(BACK)` | 2 failed (front-empty, and both-empty, which shares the same branch) |

**B. M2: PASS.** Both describe blocks gained save, delete-in-beforeEach and restore-in-afterEach for `NATIVELY_VERBAL_HEDGE` and `NATIVELY_VERBAL_HEDGE_TRIGGER_MS`, in the stallFallback pattern.

- **Calibration:** the HEAD copies of both files, run with `NATIVELY_VERBAL_HEDGE=1`, failed exactly the 5 tests (geminiThinking 3, verbalPrimary 2).
- **New files, HEDGE=1 and TRIGGER_MS=1 set in the process:** 10/10 green.
- **New files, same env, from MAIN via PowerShell with `$env:` set:** 35/35 green, together with verbalHedge and stallFallback. The variables were cleared afterwards and confirmed empty.

**C. M4: PASS.**
- `describeFollowUpParentAtStartup` sits at followUpParent.ts:23 and is built on `followUpParentEnabled`. It returns `follow-up parent: on` or `follow-up parent: off`, and throws the flag's own message.
- The test at followUpParent.test.ts:19-27 covers `'1'`, unset, `'0'`, `''` and `'yes'`.
- In main.ts, lines 3445-3452 hold the try block; the new call is at :3447. It is in the same early try block as the hedge line, after `whenReady` and the log reset, and before the dock-hide, credentials and window code.
- The log line is `console.log(\`[Main] ${describeFollowUpParentAtStartup()}\`)`.
- On a throw, the unchanged catch runs `console.error(... — refusing to start)`, then `app.exit(1)`, then `return`. A junk value therefore exits before any window, tray or IPC exists, so there is no windowless process holding the lock.
- With the flag unset, the only change is one extra `[LOG] [Main] follow-up parent: off` line.
- The only import is `import type`, so there are no side effects at startup.
- No golden log parser keys on the new line. I grepped every `\[Main\]` regex in `test/golden/*.mjs`.
- No launcher or script sets the flag to a value that would now refuse to start.
- main.ts has no unit test, which the report states.

**D. M6: PASS on the hard constraint.**

`render-cmp.mjs` rendered all 27 run folders under `interview60.runs` with two modules: HEAD's `pass-record.mjs` and the working tree's, with the same metrics and judge modules. Results:
- records: 27 byte-identical, 0 differing, 0 errors;
- `passRow` JSON: identical for all 27;
- `renderPassIndex(indexRows())`: identical (34 lines);
- no existing log contains a `[Main] verbal hedge` line, so `meta.verbalHedge` is null everywhere.

End to end (`e2e.mjs`), I copied s50a, inserted the real `[LOG] [Main] verbal hedge: on trigger=5000ms` or `off` line after the session header, and ran `collectPass`, then `renderPassRecord`:

| Inserted line | `verbalHedge` | What changed in the record |
|---|---|---|
| on | `"on trigger=5000ms"` | the answers row reads `hedge (gemini-3.5-flash-lite front, gemini-3.1-flash-lite back) (in-app)`, plus one summary bullet |
| off | `"off"` | only the `- Verbal hedge: off` bullet |
| none | null | nothing |

In all three cases the run-folder path row also changed, but that is only the scratch path.

The label is true to the code: FRONT = `GEMINI_FLASH_FALLBACK_MODEL` = gemini-3.5-flash-lite, BACK = `GEMINI_FLASH_MODEL` = gemini-3.1-flash-lite (LLMHelper.ts:3475, 39, 47). The `won by <model>` lines exist, as :3539 shows.

The implementer's null-guard mutation is caught by the test file: removing the guard crashes it at load with `startsWith` of undefined, from the describe-level `renderPassRecord(pass())`. The s50a real-folder block still runs (24 tests, 0 skipped, with s50a copied into the scratch cwd).

**Gates.**
- The 7 files from MAIN, clean env: 77/77.
- `tsc -p electron/tsconfig.json --noEmit` on the mirror: exactly the 6 pre-existing errors (GeminiLiveRouter:125; ipcHandlers:3433 ×2 and 3436; KnowledgeOrchestrator:349 and 351).
- Root tsc: not re-run, because every change is under `electron/`, which root tsc skips. I accepted the implementer's 0.

## My own mutations (one or more per area)

| Mutation | Result |
|---|---|
| M1: an empty front is labelled `reason=trigger` | caught (front-empty test) |
| M1: an empty loser is labelled `aborted` | caught (front-empty test, `other=empty`) |
| M1: the both-empty/both-fail warn line is dropped | caught (3 tests) |
| M4: `'0'` reported as on | caught |
| M6: the answers row ignores the hedge | caught (on test) |
| **M6: the `collectPass` parse never matches** (`verbal hedge:` → `verbal-hedge:` in the regex) | **SURVIVES 24/24.** See Minor 1. |

## Critical

None.

## Important

None.

## Minor

1. **interview60.pass-record.mjs:82 — the log parse that M6 exists for has no test.**
   - The three new tests inject `meta.verbalHedge` straight into `renderPassRecord`. The real-folder s50a block has no hedge line, so its result is the same whether the regex works or not.
   - A regex that never matches passes 24/24.
   - **Failure scenario:** someone rewords `describeVerbalHedgeAtStartup` (verbalHedge.ts:54,56), for example to `on (trigger 5000 ms)`. The h40c-and-later records then silently revert to `gemini-3.1-flash-lite (in-app)` with no hedge bullet. That is exactly M6's defect, and the suite stays green.
   - The parse works today; I proved it end to end above. This is a regression-protection gap of the same class as M1.
   - **Fix:** a test that feeds `describeVerbalHedgeAtStartup({})` and `describeVerbalHedgeAtStartup({NATIVELY_VERBAL_HEDGE:'1'})`, each prefixed `<ts> [LOG] `, through the same regex. That needs a small exported parse helper, or a tmp run-folder fixture.

2. **followUpParent.ts:15-22 — the docstring is false about the hedge.**
   - It says the caller adds `[Main] ` "the same way it does for the hedge line", in "describeVerbalHedgeAtStartup's shape".
   - In fact `describeVerbalHedgeAtStartup` embeds `[Main] ` itself (verbalHedge.ts:54,56), and main.ts:3446 logs it raw. Only the new line gets the prefix at the call site (:3447).
   - **Scenario:** a later editor who "harmonises" main.ts from this comment produces `[Main] [Main] verbal hedge: …`, or drops the prefix. The pass-record regex still matches the double prefix, so nothing flags it.
   - **Fix:** reword the comment to say the two differ.

3. **interview60.pass-record.mjs:175 — the hedge label ignores `answerModel`.**
   - The label reads `hedge (3.5 front, 3.1 back)` whenever `verbalHedge` starts with `on`.
   - The hedge only engages when the primary is one of the two lites (LLMHelper.ts:3395).
   - **Scenario:** a run with the hedge on and a different default or primary model, such as `NATIVELY_VERBAL_PRIMARY_MODEL=gemini-3.5-flash` or Gemma selected. Its record claims the hedge answered, although the stall race did.
   - The brief prescribes this text and h40c flies on 3.1-lite, so this is a note only. Conditioning on `answerModel` being one of the two lites would close it.

**Report nit.** task-11-report.md says `git status` shows "exactly these 9 files" but lists 8. The count is 8, because `LLMHelper.ts` is unchanged.

## Pre-existing, not this task

For 13 of the 15 committed `passes/*.md`, HEAD's own render already differs from the committed file:
- grader-label backfill (s50a–s50l);
- h40b 43 → 44 answered (final-review M3).

Because HEAD and working-tree renders are identical for every folder, this change does not alter that drift.
