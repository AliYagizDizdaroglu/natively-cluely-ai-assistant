# Task 3 Report: Compose the guard in `WhatToAnswerLLM` with a once-only `onCues`

## What I implemented

In `electron/llm/WhatToAnswerLLM.ts`, four edits, all verbatim from the brief:

- **Import (line 5)**: added `stripCueBlock` to the named imports from `./verbalStreamFilter`.
- **`generateStream` signature**: added `onCues?: (cues: string[]) => void` as the eighth positional parameter, directly after `liveTexts?: string[]`, with the four-line comment from the brief explaining the once-per-verbal-stream contract and that the coding path never calls it.
- **Coding branch** (~line 226): left `onSuggestions?.([]);` untouched; added the three-line comment immediately below it explaining why `onCues` is deliberately NOT invoked there (no cue rule on the coding prompt, and unlike the offers, nothing waits on the callback).
- **Composition** (~line 295–325): added one line to the existing filter-chain comment block (`// stripCueBlock (innermost after it) removes the __CUES__ block and reports the cues once.`, placed right after the `stripModelSentinel` paragraph and before the `filterCodeFences` line); then, after the existing `onSuggestionsOnce` once-guard, added the identical once-guard pattern for cues (`cuesSent` / `onCuesOnce`) with a four-line comment, and wired `stripCueBlock` innermost in `filtered`: `filterVerbalLines(filterCodeFences(stripCueBlock(this.stripModelSentinel(raw), onCuesOnce)))`. Because `onCuesOnce` is declared outside `filtered` and closed over by both the primary invocation (`filtered(rawStream)`) and the lazy fallback invocation (`() => filtered(this.llmHelper.streamVerbalWithGeminiFlash(...))`), the fallback's second stream shares the same guard and cannot report a second time — same mechanism as the pre-existing `onSuggestionsOnce`.

No other lines in the file were touched.

## What I tested and the results

Created `electron/llm/WhatToAnswerLLM.cues.test.ts` (new, verbatim from the brief) with three cases: verbal stream with a cue block (block stripped from output, `onCues` called once with the two parsed phrases, and the `[Answer] budget:` log line counts prose words only), verbal stream with no block (output unchanged, `onCues` still called once with `[]`), and coding (no cue callback at all — the engine never waits on it).

Appended one case to `electron/llm/verbalFallback.test.ts` inside the existing `describe('verbal fallback redirect', ...)` (verbatim from the brief): primary dies pre-token, fallback stream carries its own `__CUES__` block split across chunk boundaries, output contains the fallback prose and not the sentinel, `onCues` fires exactly once with the fallback's cue.

Ran the full `electron/llm` folder once before committing: **30 files, 263 tests, all passed.**

Ran the electron tsc check: **error count 6**, all in files this task did not touch (`GeminiLiveRouter.ts`, `ipcHandlers.ts` ×3, `KnowledgeOrchestrator.ts` ×2) — same set task-2's report recorded as baseline.

## TDD evidence

**RED** — command: `node node_modules/vitest/vitest.mjs run electron/llm/WhatToAnswerLLM.cues.test.ts electron/llm/verbalFallback.test.ts` (run immediately after writing both test files, before touching `WhatToAnswerLLM.ts`):

```
 ❯ electron/llm/WhatToAnswerLLM.cues.test.ts (3 tests | 2 failed) 38ms
   × WhatToAnswerLLM cue block > verbal: the block never reaches the output, the cues arrive once, the budget line counts prose only
     → expected '__CUES__\n1| thirty gigabytes in floa…' not to contain '__CUES__'
   × WhatToAnswerLLM cue block > verbal, no block: the answer is unchanged and the callback still fires once, empty
     → expected "spy" to be called 1 times, but got 0 times

 ❯ electron/llm/verbalFallback.test.ts (7 tests | 1 failed) 61ms
   × verbal fallback redirect > cue mode: when the primary dies before its first token, the fallback stream supplies the cues, once
     → expected '__model_source:gemini-3.1-flash-lite_…' not to contain '__CUES__'

 Test Files  2 failed (2)
      Tests  3 failed | 7 passed (10)
```

All three new tests failed for the expected reason: `stripCueBlock` was not yet composed into the filter chain, so the raw `__CUES__` block leaked straight through to the output, and `onCues` (not yet a parameter the function read) was never invoked. The third new test ("coding: no filter chain and no cue callback") passed trivially at this stage, which is correct — with `onCues` not wired anywhere yet, it is by construction never called on any path, including coding. All 7 pre-existing `verbalFallback.test.ts` cases were untouched and still passed. This is exactly the RED the brief predicted ("the verbal output still contains `__CUES__`, and `onCues` is never called") — no other failure mode.

**GREEN** — same command, after implementing:

```
 ✓ electron/llm/WhatToAnswerLLM.cues.test.ts (3 tests) 26ms
 ✓ electron/llm/verbalFallback.test.ts (7 tests) 47ms

 Test Files  2 passed (2)
      Tests  10 passed (10)
```

Then the full-folder run before committing:

```
 Test Files  30 passed (30)
      Tests  263 passed (263)
```

Output is pristine apart from pre-existing `stderr`/`stdout` lines unrelated to this change (the `[Answer] budget:` diagnostic lines the tests assert on, the primary-failed warning the fallback tests intentionally trigger, and an unrelated `ModesManager` non-fatal warning that appears in several `LLMHelper.*` test files both before and after this change).

## tsc error count

`node node_modules/typescript/bin/tsc -p electron/tsconfig.json --noEmit`: **6 errors**, all pre-existing and outside this task's files:
- `electron/audio/GeminiLiveRouter.ts(125,44)`
- `electron/ipcHandlers.ts(3433,18)`, `(3433,38)`, `(3436,31)`
- `electron/knowledge/KnowledgeOrchestrator.ts(349,35)`, `(351,25)`

Same list task 2's report recorded as baseline — count unchanged.

## Files changed

- `electron/llm/WhatToAnswerLLM.ts` (+23/-2: import, signature parameter + comment, coding-branch comment, composition comment line, cues once-guard, `stripCueBlock` wired innermost)
- `electron/llm/WhatToAnswerLLM.cues.test.ts` (new, +57 lines)
- `electron/llm/verbalFallback.test.ts` (+13 lines: one new `it` case)

Commit: `6b7817f` — "feat(cues): strip the block innermost and report the cues once per stream" (`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer present). `git show --stat` confirms only these three files are in the commit; `git status` is clean afterward.

## Self-review findings

- **Completeness**: all four brief sub-steps (a/b/c/d) present exactly as specified — import, signature parameter in the eighth position (verified Task 4 can pass it positionally as the brief requires), coding-branch comment with no callback added, and the composition wiring `stripCueBlock` innermost right after `stripModelSentinel`.
- **Quality**: `cuesSent`/`onCuesOnce` names and structure exactly mirror the pre-existing `suggestionsSent`/`onSuggestionsOnce` pattern immediately above them, so a reader who already understands the offers guard reads the cues guard for free. Comments explain *why* (innermost placement so only prose reaches the fence/line filters and the word counter; why the coding path stays silent — "nothing waits on it" vs. the offers' "always gets exactly one callback").
- **Discipline**: touched only the four sites the brief named (import line, signature, coding-branch comment, composition block + its comment) — no reformatting or restructuring of the surrounding router logic, model-selection comments, or `withVerbalFallback`/`stripModelSentinel` methods, all of which were read but left untouched. Did not add an `onCues` call to the coding branch despite the offers precedent doing so for `onSuggestions` — the brief's Step 3(d) and the resolved ambiguity note explicitly call for divergence there, and I followed it.
- **Testing**: the three new `WhatToAnswerLLM.cues.test.ts` cases exercise the real composed generator end-to-end (no mocking of the filter functions), including a byte-level chunk split (`size = 5`) that forces the sentinel and cue lines to straddle chunk boundaries — the same risk class Task 2's chunk-size sweep targeted. The fallback test forces a genuine pre-token failure and a chunked `__CUES__` block on the *second* stream, which is the one case that actually exercises the cross-stream once-guard (`cuesSent` shared via closure) rather than just the single-stream `reported` guard already covered inside `stripCueBlock` itself. RED was observed for the correct reason (leak + never-called) before GREEN, and GREEN output is pristine.
- No pre-existing test broke; no files outside the three named ones were touched; nothing was added beyond what the brief specifies (no extra helpers, no speculative options).

## Issues or concerns

None. The brief's code applied cleanly on the first pass with no deviation needed; all commands matched their expected output exactly.
