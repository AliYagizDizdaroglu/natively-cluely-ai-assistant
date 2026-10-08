# Task 2 Report: `extractCues` and the streaming guard `stripCueBlock`

## What I implemented

In `electron/llm/verbalStreamFilter.ts`, inserted directly after `longestSentinelPrefixSuffix` (before `filterVerbalLines`), verbatim from the brief:

- `CUES_SENTINEL = '__CUES__'` — module-local sentinel constant (mirrors the existing `SENTINEL = '__MORE__'` pattern used by `stripSuggestionBlock`).
- `CUE_LINE` regex and `cuePhrase()` helper — parses `N| key phrase` lines, trims, strips wrapping quotes.
- `extractCues(text: string): { cues: string[]; prose: string }` — pure splitter. Skips leading blank lines; if the first non-blank line starts with the sentinel, consumes consecutive cue lines (blank lines inside the block are skipped) until the first non-cue, non-blank line, which — together with everything after it — becomes `prose`. No sentinel at the start means the text is returned unchanged with `cues: []`.
- `stripCueBlock(source: AsyncGenerator<string>, onCues?): AsyncGenerator<string>` — streaming guard with a three-phase state machine (`prefix` → `block` → `prose`). Yields prose chunks only; calls `onCues` exactly once (guarded by a `reported` flag), either as soon as the stream is known not to start with the sentinel, at block close, or at stream end if the stream ends inside the block.

Both exports match the signatures given in the brief's Interfaces section exactly, for Task 3's composition.

## What I tested and the results

Added to `electron/llm/verbalStreamFilter.test.ts` (verbatim from the brief): the `runCues` helper, and two `describe` blocks — `extractCues` (6 cases: no sentinel, single/multiple cue lines with leading/interior blank lines, non-cue line closing the block, quote-stripping and no-truncation, block-only, and the `CUES_SENTINEL` import proving the guard recognises the prompt's own constant) and `stripCueBlock` (`it.each([1,3,4,7,500])` chunk-size sweep plus 6 more: no-block passthrough, leading-whitespace tolerance, non-cue-line closing mid-stream, block-only, a partial sentinel that never completes, and ordinary underscores/`__init__`/a mid-answer sentinel not being mistaken for the block).

Ran the full `electron/llm` folder once before committing: **29 files, 259 tests, all passed.**

Ran the electron tsc check: **error count 6, identical set to baseline** (diffed the full `tsc` output byte-for-byte before vs. after my change — empty diff on the error list itself; only my two files changed).

## TDD evidence

**RED** — command: `node node_modules/vitest/vitest.mjs run electron/llm/verbalStreamFilter.test.ts` (run after adding only the test block, before touching the implementation file):

```
electron/llm/verbalStreamFilter.test.ts (72 tests | 17 failed) 144ms
 × extractCues — ... > no sentinel at the start: no cues, text unchanged
   → extractCues is not a function
 × extractCues — ... > one line, several lines, leading blank lines and a blank line inside the block
   → extractCues is not a function
 [... 4 more extractCues cases, same TypeError ...]
 × stripCueBlock — ... > strips the block at chunk size 1 and matches extractCues
   → stripCueBlock(...) is not a function or its return value is not async iterable
 [... 10 more stripCueBlock cases, same TypeError ...]

 Test Files  1 failed (1)
      Tests  17 failed | 55 passed (72)
```

All 17 new tests failed for the expected reason (`extractCues`/`stripCueBlock` not exported yet); all 55 pre-existing tests in the file were untouched and still passed. This is exactly the expected RED — no other failure mode.

**GREEN** — same command, after implementing:

```
electron/llm/verbalStreamFilter.test.ts (72 tests) 114ms

 Test Files  1 passed (1)
      Tests  72 passed (72)
```

All 72 tests pass, including every one of the 5 chunk sizes (1, 3, 4, 7, 500) in the `it.each` sweep. Output is pristine apart from two `console.warn` lines from the pre-existing `filterCodeFences` tests (unrelated to this change, present before and after).

## tsc error count

Baseline (before any edit): 6 errors (`GeminiLiveRouter.ts`, 3× `ipcHandlers.ts`, 2× `KnowledgeOrchestrator.ts`).
After implementation: 6 errors, identical list (confirmed via `diff` of the full `tsc` output — no difference).

## Files changed

- `electron/llm/verbalStreamFilter.ts` (+117 lines: `CUES_SENTINEL`, `CUE_LINE`, `cuePhrase`, `extractCues`, `stripCueBlock`)
- `electron/llm/verbalStreamFilter.test.ts` (+86 lines: import additions, `runCues` helper, 2 `describe` blocks / 17 `it` cases)

Commit: `577d13a` — "feat(cues): strip the cue block from the stream, hand the cues out once" (`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer present). Only these two files are in the commit (`git show --stat` confirms); working tree is clean afterward.

## Self-review findings

- **Completeness**: both exports present with the exact signatures the brief specifies (`extractCues(text: string): { cues: string[]; prose: string }`; `stripCueBlock(source: AsyncGenerator<string>, onCues?: (cues: string[]) => void): AsyncGenerator<string>`), ready for Task 3 to compose innermost in the filter chain.
- **Quality**: names describe what they do (`phase`, `pending`, `reported`/`report()` mirror the guard-callback-once pattern already used implicitly by `stripSuggestionBlock`'s single `onSuggestions` call site); comments explain *why* (e.g. why a partial sentinel delays at most `"__CUES__"`.length, why an over-long cue is "a bench finding, not a runtime repair"), matching the surrounding file's comment density and tone.
- **Discipline**: implemented exactly the code given in the brief, nothing added or reshaped. I did not refactor `stripSuggestionBlock`/`extractSuggestions` to share code with the new cue functions even though `cuePhrase` and the `CUE_LINE` regex closely parallel the existing `SENTINEL`-block label-parsing logic inline in `extractSuggestions` — the brief gave verbatim code and named exactly two files to touch, so I left the existing offers guard untouched rather than "improving" it into a shared helper.
- **Testing**: tests exercise real behavior end-to-end through the async generator (not mocks), the chunk-size sweep specifically targets the sentinel-split-across-boundaries risk the brief calls out ("where a naive indexOf leaks `__CU`"), and RED was observed for the correct reason (missing export, not a typo or wrong assertion) before GREEN.
- No pre-existing test in the file broke; no files outside the two named ones were touched.

## Issues or concerns

None. No blockers encountered; the brief's code compiled and passed on the first implementation pass with no deviation needed.
