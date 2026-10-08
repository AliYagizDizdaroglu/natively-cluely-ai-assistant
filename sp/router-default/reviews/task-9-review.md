# Task 9 review: unknown-marker filter (WT-C, d15eef5)

Reviewer: Opus. Read-only. Inputs: PLAN.md Task 9 (1376-1431), Global Constraints, Review Focus, Task 5 interface (971-1203), SPEC §7.1, report, task-9.diff.

**SPEC: PASS  QUALITY: APPROVE** (no BLOCKING; one IMPORTANT is spec-level, for a controller/user ruling, not a defect in this commit)

## Evidence run by the reviewer
- Worktree HEAD d15eef5 on 17d199d; tree clean; commit touches exactly the 3 files the brief names; message matches Step 5 verbatim.
- Targeted tests (temp cwd, `--root` WT): unknownMarkerFilter + 9 `WhatToAnswerLLM.*.test.ts` + 2 `verbalStreamFilter*.test.ts` = 12 files, **221 passed / 0 failed** (matches the report).
- tsc root: 0 errors. tsc electron: 6 errors, all pre-existing files (GeminiLiveRouter 125, ipcHandlers 3436/3436/3439, KnowledgeOrchestrator 349/351); none in task files.
- `unknownMarkerFilter.ts` is the plan's code verbatim.
- Placement: `WhatToAnswerLLM.ts:401-409` wraps `stripSpokenNotation(...)` as the outermost stage INSIDE `filtered`; `nameStallSwitch` (416), `withVerbalFallback` and `cutAtWordBudget` (419-420) stay outside (spec §7.1 M5).
- Probe (scratch copy of the stripper): a sentinel chunk `__model_source:…(hedge)__` pushed through the stripper is split (`"…(hedge)"` + held `"__"`). So a misplacement outside `nameStallSwitch` would break the per-chunk regex in `WhatToAnswerLLM.answeringModel.test.ts:92` (`named`) and fail the hedge tests at 296/309. The hedge tests therefore do pin M5, as the brief relies on.

## Task 5 interface check (merge M-C9→B)
- Task 5 expects (PLAN 981) `createUnknownMarkerStripper(): { push(s: string): string; flush(): string }` from `../llm/unknownMarkerFilter`, importing from `electron/services/routerArbiter.ts`. The export name, its signature, and the path `electron/llm/unknownMarkerFilter.ts` all match. `stripUnknownMarkers` (PLAN 1385) matches as well.
- Notes for Task 5 (not defects here):
  - `push` returns `''` while it holds a partial `__…`/`_`. The token sender should skip empty strings.
  - The Live `shownText` and `addHistory` (PLAN 1072) must include the `flush()` output. Otherwise a trailing held `_` or `__ab` goes missing from the final and the history.

## Findings
1. **IMPORTANT (spec-level, not a commit defect)** `unknownMarkerFilter.ts:3` (spec §7.1 "WORD = [A-Za-z][A-Za-z0-9_]*", "not behind the flag"). Probe outputs:
   - Python dunders are deleted from verbal answers: `"The __init__ method runs after __new__."` → `"The  method runs after ."`.
   - `if __name__ == "__main__"` → `if  == ""`.
   - Underscore emphasis is deleted: `"It is __very__ important."` → `"It is  important."`. `stripSpokenNotation` deliberately leaves underscores alone, so it does not catch this upstream.
   - This ships default-on in the app, not only on the router path. Whether a conceptual Python question reaches the verbal `filtered` path was not measured.
   - Recommend the controller get a ruling. One option is to also KEEP dunder-shaped words (lowercase, e.g. `/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/` with known Python names) or emphasis. Another is to accept the risk and record it.
2. **MINOR** `WhatToAnswerLLM.ts:375-376`: the pre-existing comment "stripSpokenNotation is OUTERMOST" is now stale. The new comment at 399 says stripUnknownMarkers is outermost. One line would fix it; the brief's "nothing outside `filtered` changes" does not forbid a comment.
3. **MINOR** `unknownMarkerFilter.test.ts:131-142`: the M5 placement tests only show the marker is gone. They would also pass with the filter wrapping `cutAtWordBudget`'s output (the misplacement M5 forbids). Placement is pinned only indirectly, through the hedge tests' per-chunk `named` regex (verified above). Acceptable as the brief wrote it. A direct pin would be a hedge-winner chunk asserted as an intact single chunk in this file.
4. **MINOR** coverage gaps, no defect found by probe:
   - No test for a known marker split across chunks. Probe: `["a __MO","RE__ b"]` → `"a "`, `"__MORE__ b"` (kept).
   - No test for a trailing single `_` split. Probe: `["snake_","case"]` → `"snake"`, `"_case"`.
   - No test that the `{"__negotiationCoaching":…}` JSON payload, which `stripSpokenNotation` passes through, crosses the new stage unchanged. Probe: unchanged.
5. **Deviation accepted**: end-of-stream asserted per call as `['tail ', '__ab']`. This is stricter than the brief's concatenated `"tail __ab"` and consistent with it.

## Not shown
- No live model stream and no real hedge race were run; the hedge path is covered only by mocks.
- The dunder/emphasis frequency in real verbal answers is unmeasured.
- Whether Python-dunder questions route to the verbal path is unmeasured.

## Re-review (fix round 1: 3719078 on d15eef5, package task-9-fix1.diff)

**SPEC: PASS  QUALITY: APPROVE**

Evidence:
- The commit touches the same 3 files. The tree is clean.
- Targeted run, same 12 files: **230 passed / 0 failed**. That is 221 plus 9 new.
- tsc: root 0 errors; electron 6, the same pre-existing list, none in task files.

- **Ruling implemented.**
  - The strip regex is `UNKNOWN = /__([A-Z][A-Z0-9_]*)__/g` and the hold regex is `PARTIAL_TAIL = /(?:__[A-Z][A-Z0-9_]*_?|__|_)$/` (unknownMarkerFilter.ts:7-8).
  - `__init__`, `__name__ == "__main__"` and `__very__` pass unchanged; the new `it.each` pins them.
  - `__S1Q05__`, `__ANS__` and `__PROMPT_RESPONSE__` are stripped.
  - A lowercase partial (`"The __in"`) does not match the hold pattern. It is released at once, unchanged, so it is never held.
- **Minors closed.**
  - (2) The stale "stripSpokenNotation is OUTERMOST" comment is corrected (WhatToAnswerLLM.ts:375-376).
  - (3) A direct placement pin is added: the hedge-winner sentinel must appear as one intact output chunk. Calibrated by probe: wrapped anywhere outside `nameStallSwitch`, the stripper holds the sentinel's trailing `__`, so `toContain(sentinel)` would fail.
  - (4) Tests are added for a known marker split across chunks (MORE and CUES), a trailing single `_`, and the coaching JSON whole and split.
- **The two changed tests are justified.**
  - Under the ruling, `__abc` and `__ab` are no longer held, so the old expectations would now read `['x __abc', ' y']` and `['tail __ab']`.
  - The hold-then-release behaviour can only be exercised with an uppercase partial, so moving those cases to `__ABC` / `__AB` keeps their intent.
  - The lowercase case is covered separately by the new `__in`/`it__` test. The same change was made in the generator test (`__AB`).
- **Nothing new broken** in the 12 targeted files.

New findings:
- **IMPORTANT (cross-task, not this commit):** the ruling narrows the display filter only. Two other definitions still read the broad `__WORD__`:
  - **Task 14 hour reader (PLAN 1753, I6, pipeline-shown "unknown `__WORD__`") and the registration text (PLAN 1978).** If either keeps `[A-Za-z]`, a pipeline answer that now correctly shows `__init__` would count as a **Safety** marker. Both must adopt `__[A-Z][A-Z0-9_]*__` minus MORE/CUES.
  - **SPEC §7.1 line 503 (`WORD = [A-Za-z]…`).** It needs the amendment recorded.
  - The Live-shown set (PLAN 1752, Task 4 `MARKER_RE = /__\S+?__/`) stays broader. That is the safe direction: a dunder in Live text stops Live and appends the pipeline answer. It is consistent, but worth stating in the registration.
- **MINOR:** the test name "a held partial that turns out lowercase is released unchanged" (test.ts:72) is slightly inaccurate, because a lowercase partial is never held. The assertion is correct.
- **Note (consequence of the ruling):** mixed-case markers such as `__S1q05__` and `__Foo__` are no longer stripped. Every leak observed so far was uppercase.

Not shown: no live stream was run, and mixed-case leak frequency is unmeasured.
