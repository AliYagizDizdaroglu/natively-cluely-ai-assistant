# Task 1 report: The cue rule at the tail of the verbal prompt

## What was implemented

In `electron/llm/prompts.ts`, directly after the `SPOKEN_WORD_CEILING` declaration (was line 191), added four new exports verbatim from the brief:

- `CUES_SENTINEL = '__CUES__'` — same `__NAME__` sentinel convention as `SUGGESTIONS_SENTINEL` (`__MORE__`).
- `CUE_MAX_LINES = 5` — cue lines per answer.
- `CUE_MAX_WORDS = 8` — words per cue line.
- `CUE_RULE` — a template string starting with `\n\n[CUES FIRST]` that instructs the model to emit a `__CUES__` block (numbered `N|` lines, one per part the question names) before the spoken answer.

Then changed the tail of `VERBAL_WHAT_TO_ANSWER_PROMPT` (was line 2380) from:
```
${SPOKEN_LENGTH_AND_DEPTH}`;
```
to:
```
${SPOKEN_LENGTH_AND_DEPTH}${CUE_RULE}`;
```
so the cue rule is appended directly after the existing structured-answer rule, at the tail of the whole prompt — the position the brief says the bench measures rather than assumes.

`UNIVERSAL_WHAT_TO_ANSWER_PROMPT` (the coding path) was untouched, so it has no cue block.

## What was tested and the results

In `electron/llm/prompts.test.ts`:
1. Extended the import list with `CUE_RULE, CUES_SENTINEL, CUE_MAX_LINES, CUE_MAX_WORDS,`.
2. Changed the existing tail assertion (was line 236) to require the prompt end with the structured-rule sentence **plus** `CUE_RULE`, instead of just the structured-rule sentence.
3. Appended a new `describe('CUE_RULE — cue mode (spec 2026-09-20)', ...)` block with two tests:
   - the sentinel/limit values and that `CUE_RULE` contains `[CUES FIRST]`, the sentinel, the word limit, the line limit, and starts with `\n\n`.
   - that `VERBAL_WHAT_TO_ANSWER_PROMPT` ends with the structured rule's last line + `CUE_RULE` exactly once (via `.split(CUE_RULE).length - 1 === 1`), and that `UNIVERSAL_WHAT_TO_ANSWER_PROMPT` does not contain `CUES_SENTINEL`.

All test/constant text matches the brief verbatim.

## TDD evidence

### RED

Command:
```
node node_modules/vitest/vitest.mjs run electron/llm/prompts.test.ts
```
(run after Step 1's test edits, before touching `prompts.ts`)

Result: 3 failed, 26 passed — exactly the cases the brief predicted (the changed tail assertion, and both new `CUE_RULE` tests):
```
 ❯ electron/llm/prompts.test.ts (29 tests | 3 failed) 73ms
   × spoken word budget > carries the structured multi-part rule (...) 35ms
     → expected false to be true
   × CUE_RULE — cue mode (spec 2026-09-20) > names the sentinel and the limits the checks enforce 4ms
     → expected undefined to be '__CUES__'
   × CUE_RULE — cue mode (spec 2026-09-20) > sits at the tail of the verbal prompt, directly after the structured rule, and nowhere else 4ms
     → expected false to be true

 Test Files  1 failed (1)
      Tests  3 failed | 26 passed (29)
```
This is the expected reason: `CUE_RULE` (and the other three names) were not yet exported from `prompts.ts`, so they imported as `undefined`; `undefined` compared to `'__CUES__'` fails directly, and string concatenation with `undefined` (`'...' + undefined` → `'...undefined'`) makes both `endsWith` checks false.

### GREEN

Command (Step 4, run after implementing the source changes):
```
node node_modules/vitest/vitest.mjs run electron/llm/prompts.test.ts electron/llm/knowledgePromptBudget.test.ts electron/llm/promptCapture.test.ts
```
Result:
```
 ✓ electron/llm/knowledgePromptBudget.test.ts (8 tests) 11ms
 ✓ electron/llm/prompts.test.ts (29 tests) 27ms
 ✓ electron/llm/promptCapture.test.ts (8 tests) 46ms

 Test Files  3 passed (3)
      Tests  45 passed (45)
```
`knowledgePromptBudget.test.ts` passed unchanged — no pinned prompt-size assertion needed updating, so that file was not touched (and is not in the commit).

Also ran the whole `electron/llm` folder once before committing, per the task instructions:
```
node node_modules/vitest/vitest.mjs run electron/llm
```
Result: `Test Files  29 passed (29)` / `Tests  242 passed (242)`. (Some stderr output appears from `verbalFallback.test.ts` and `LLMHelper.groqSystemMessage.test.ts` — this is expected console logging from tests that intentionally exercise fallback/error paths, not failures.)

## tsc error count

```
node node_modules/typescript/bin/tsc -p electron/tsconfig.json --noEmit 2>&1 | grep -c "error TS"
```
Result: `6` (matches the required pre-existing count). Confirmed none of the 6 errors touch `prompts.ts` or `prompts.test.ts`:
```
electron/audio/GeminiLiveRouter.ts(125,44): error TS2339: ...
electron/ipcHandlers.ts(3433,18): error TS2339: ...
electron/ipcHandlers.ts(3433,38): error TS2339: ...
electron/ipcHandlers.ts(3436,31): error TS2339: ...
electron/knowledge/KnowledgeOrchestrator.ts(349,35): error TS2322: ...
electron/knowledge/KnowledgeOrchestrator.ts(351,25): error TS2322: ...
```

## Files changed

- `electron/llm/prompts.ts` (+37/-1)
- `electron/llm/prompts.test.ts` (+25/-1... net +24 lines, 2 deletions in diff stat)

Committed as `8682b32` — "feat(cues): the cue rule at the tail of the verbal prompt", containing only these two files (verified via `git show --stat HEAD` and a clean `git status --porcelain` afterward).

## Self-review findings

- Completeness: all four required interfaces (`CUES_SENTINEL`, `CUE_MAX_LINES`, `CUE_MAX_WORDS`, `CUE_RULE`) exist with the exact values/wording the brief specifies; `VERBAL_WHAT_TO_ANSWER_PROMPT` ends with `${SPOKEN_LENGTH_AND_DEPTH}${CUE_RULE}` as required.
- Quality: doc comments match the brief's rationale verbatim (sentinel convention, why the position is at the tail, why the wording is a "benched input" not settled). Names match exactly what later tasks are told to import verbatim.
- Discipline: no files touched beyond the two named. No restructuring, no drive-by edits to surrounding code. `knowledgePromptBudget.test.ts` was left alone since it needed no change.
- Testing: RED was observed for the expected reason before any implementation code was written; GREEN confirmed after. Test output is pristine (no unexpected warnings beyond the pre-existing Vite CJS deprecation notice that appears on every run in this repo, unrelated to this change).

## Issues or concerns

None. The brief's code blocks were used verbatim; both TDD checkpoints and the type-check count landed exactly as predicted.
