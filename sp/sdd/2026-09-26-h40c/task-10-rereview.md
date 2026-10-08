ALL ADDRESSED

- M1 addressed. `interview60.flight.test.ts` now imports `FOCUSED_MODELS` (line 2). The `toEqual` pin is its own test (lines 105–107). A second test (lines 109–111) asserts that nothing in `[...ANSWER_MODELS, ...FOCUSED_MODELS, ...PAIRED_ARMS.map((a) => a.model)]` contains "/", which is exactly the set `main()` passes to answers.mjs (flight.mjs:297). I calibrated it myself without touching MAIN (`<SP>\review10r1-calibrate.mjs`): the test file ran under MAIN's vitest and config against six variants of a scratch copy of the flight module.
  - Baseline: 18/18 pass.
  - FOCUSED_MODELS plus a qwen id: only the new test fails.
  - PAIRED_ARMS with a Groq arm appended: the new test fails, and so does the existing Flash-Lites membership test.
  - PAIRED_ARMS with the `low` arm switched to a Groq id: the new test fails, plus 2 existing tests.
  - ANSWER_MODELS plus a qwen id: the `toEqual` test and the new test fail.
  - Known negative, FOCUSED_MODELS plus `gemini-3.9-flash`: 18/18 pass.
- M2 addressed. The report now carries a correction at task-10-report.md:80 that gives the true cause of the skip: `process.cwd()` from the scratch cwd. The controller also recorded the correction at progress.md:44. From my scratch cwd with the s50a copy, `interview60.flight.test.ts` plus `interview60.pass-record.test.ts` gave 39 passed and 0 skipped against the current working tree.
- M3 addressed (controller ops). Neither `interview60.answers.qwen_qwen3.8-27b.json` nor `interview60.answers.openai_gpt-oss-120b.json` is left in the golden folder. Both now exist as `*.stale-2026-09-26T16-39-05.json` with the original sizes (47612 and 41009 bytes) and mtimes (15:04 and 15:18). The h40b run folder keeps its own copies at the same sizes.
- M4 addressed; see N1 for a residual in the same sentence. The counts are gone and the replacement text is true:
  - flight.mjs:3–4 now reads "then the answer passes".
  - flight.mjs:22–24 now reads "the roster's questions" and "the paired arms (PAIRED_ARMS)".
  - README.md:166 now reads "the answer arms".
  - README.md:247–250 now describes `toGrade`. This matches flight.mjs:323: the hour's pairs file, plus every `ANSWER_MODELS` arm, plus every paired arm not skipped for lack of a capture. Focused arms are correctly not claimed.
- M5 addressed. flight.mjs:46–47 now reads "the second is the stall-fallback model (the hedge's front leg when NATIVELY_VERBAL_HEDGE=1)". This is true:
  - LLMHelper.ts:47 names 3.5 Flash Lite as the fallback.
  - LLMHelper.ts:3395 and :3475 run the hedge with `FRONT = GEMINI_FLASH_FALLBACK_MODEL`.
  - verbalHedge.ts:15–19 enables the hedge only on "1" and throws on any other value, so "=1" is exact.
- Nit addressed. README.md:161 now writes `` `answers.mjs` `` in backticks. The text before and after the parenthetical is byte-identical to HEAD.
- Scope held.
  - The diff is `git diff --unified=6` of the working tree. My regenerated diff matches `review-task10-r1.diff` exactly.
  - The only hunks are flight.mjs 4, 22–24 and 46–57, README 161, 166 and 247–250, and test 2 and 104–113.
  - The Gemma paragraph is identical to HEAD after whitespace normalisation (466 chars).
  - All three files are LF-only, have no BOM and contain no U+FFFD.
  - HEAD is still 18242df. The pass-record test and answers.mjs are untouched.
  - The rest of the dirty working tree is unchanged since the first review: chains.json, report.md, natively_debug.log.1 and the untracked probes. It is still not Task 10's to commit.

## New findings

Counts: Critical 0, Important 0, Minor 1.

**N1 (Minor): header step 3 still lists only two kinds of paired arm.**
Location: `electron/test/golden/interview60.flight.mjs:24-25`.

The round-1 sentence reads: "the paired arms (PAIRED_ARMS) (the hour's captured prompts at the pre-bench level, the bare prompt at the shipped LOW level)". That covers `captured-minimal` and `low` only. `PAIRED_ARMS` (flight.mjs:141–153) holds 9 arms in 5 kinds. The sentence leaves out:
- `captured-low` ×3 at LOW, the offline twin;
- 3.5 Flash Lite at HIGH on captured bytes (`captured-high` ×3) and on the bare prompt (`high`).

Before this round, the stale "the two" at least matched the two-item list. With the count gone, the list reads as the complete set.

Failure scenario: someone planning free-tier quota from the header believes the flight runs 3.5 Flash Lite once. It actually runs it five times: the full pass plus 4 paired arms.

Suggested wording: "…and the paired arms (PAIRED_ARMS: the hour's captured prompts and the bare prompt, on 3.1 Flash Lite at the pre-bench and shipped LOW levels and on 3.5 Flash Lite at HIGH)". Or point to the PAIRED_ARMS comment without listing kinds.

Nit in the same sentence: "the roster's questions, prompt and filters" makes the prompt and filters read as the roster's. They are the app's shipped prompt and filter chain. "the roster's questions with the app's prompt and filters" fixes it.
