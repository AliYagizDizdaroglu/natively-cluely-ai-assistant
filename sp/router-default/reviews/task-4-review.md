# Task 4 review: route reader + router40 fixtures (f8cf482, feat/live-router-b)

Reviewer: Opus. Brief: PLAN.md Task 4 (800-970), spec 4.2 and 9.1, controller ruling I6 (PLAN.md 1750-1757).

SPEC: PASS  QUALITY: APPROVE

## What was checked, and how
- Code: `electron/services/routeReader.ts` is the plan's Step 4 code verbatim. The test file is the plan's Step 2 code
  verbatim, plus `import { describe, it, expect } from 'vitest'`. All 13 exports in the brief's Interfaces list exist
  with the exact signatures.
- Tests rerun from a temp cwd: 17 passed out of 17, including the binding counts (27 hard: 25 clean plus 2 garbled,
  RH08 and RH10; 20 live: 19 EASY plus RH05; 30-71 words).
- tsc on the electron config: 6 errors, the same files as `baseline-tsc-electron.txt`, none of them in the reader. The
  electron config includes `**/*.ts` and sets `resolveJsonModule`, so the test file and its JSON import are
  type-checked.
- Fixtures were checked independently against `SP\router40\runs\router40-R*.json` by a scratch script that prints no
  text:
  - 47 items in each file, ids unique, `RH05~a1` absent. Every `text`, `route` and `class` equals the source.
  - `classes`: E 20, QF 9, H 11, AF 7. `route`: EASY 20, HARD 27.
  - Replay: for every item, joining the chunks gives back `text`. `atMs` never decreases, no item has zero chunks,
    `generationCompleteMs` and `turnCompleteMs` are numbers, and no chunk comes after `generationCompleteMs`.
  - No `outputTx` with `sinceClipEnd < 0` was dropped. RH05's events and RH05~a1's events are tagged separately, so the
    excluded attempt does not leak into RH05.
- Task 6 cross-check: on the replay fixture, the first word completes after 2000 ms only on RH07 (2173 ms) and RH17
  (2258 ms). That is exactly Task 6's `lateIds`.
- Commit contents: the 4 repo files only. The LAB generator is outside the repo.

## Consumers
- Task 5 imports `completeFirstWord`, `routeFirstWord`, `isHardWord`, `checkCompleted`, `decisionRoute`,
  `showablePrefix` and `tokensOf`. All are present, with the shapes Task 5's pseudo-code uses: `.reason` on the
  routeFirstWord result, the 4-argument `checkCompleted`, and `{prefix, stop}`.
- Route classes `hard | easy-answer | invalid` and the reasons `- | garbled-hard | marker | too-long | incomplete |
  incomplete-after-show | too-short` match the Task 5 decision line and Task 14's calibration list.
- Task 6 needs `{ id, route, text, chunks[{atMs,text}], generationCompleteMs, turnCompleteMs }`. All present.
- Task 3 needs a built `routeReader.js`. `build-electron.js` transpiles every `electron/**/*.ts` with `bundle:false`, so
  `dist-electron/electron/services/routeReader.js` will exist after the M-B4→A merge.

## I6 (the router marker set applies to Live-shown text only)
- The reader applies its marker set (`[<>\[\]]|__\S+?__`) only inside `hasMarker`, `checkCompleted` and
  `showablePrefix`. It contains no pipeline-side logic, and Task 4 has no caller of its own.
- In Task 5 as planned, those functions are called only on the decider's router text (`d.text`). Pipeline Outbounds are
  released, forwarded or appended without passing through them. Only `tokensOf` touches pipeline text, for a word
  count. **No I6 violation exists in this task.**
- Forward risk (flagged for Task 14 and for Task 5's reviewer, not a defect here): on a scratch copy, `hasMarker` is true
  for `List[int] here`, `a < b`, `x[i]`, `__MORE__`, `__model_source:gemini-3.1__` and `__init__ method`.
  - Any reuse of `hasMarker`, `checkCompleted` or `showablePrefix` on `[Answer] full:` or appended text would break
    I6.
  - The pipeline set (unknown `__WORD__`, with `WORD = [A-Za-z][A-Za-z0-9_]*` and the three known markers excluded)
    belongs to Task 9's filter, not to this reader.
  - The bare-routing-token check can safely reuse `isHardWord(wholeText)`, because `lettersOnly` drops whitespace:
    "Hard. Hard." reads as `hardhard`.

## Findings
- MINOR, routeReader.test.ts:25-29 ("hardware", "36th word"). These two tests passed against the stub and were never
  seen failing. The global constraint says a test counts only once it has been broken and seen to fail.
  - They do discriminate. `isHardWord` as a substring test (`/hard/`) would fail "hardware", and a first-word reader
    that scans every token would fail "36th word".
  - Still, the evidence for this is reasoning, not an observed failure. The report should say so, or break each once.
- MINOR, report "RED seen with a stub". Brief Step 3 says "Quote the list". The report gives 3 example messages, not
  the 15 failing test names.
- MINOR, report "Deviations". It describes the marker set as "< > [ ] and __WORD__". The code and spec 4.2 use
  `/__\S+?__/`, which is wider: it also matches `__model_source:x__` and `__init__`. That wider set is the Live-only one
  (per I6). The wording should not be carried into Task 14 as if the two sets were the same.
- MINOR (note, spec behaviour rather than a defect), routeReader.ts:55. The streaming cut uses only `' '`, `'\n'` and
  `'\t'`, but tokens split on `\s`.
  - Text whose only separator is `\r` or NBSP shows nothing until ASCII whitespace or the end arrives (probe:
    `'alpha\rbeta'` streaming → prefix `''`).
  - This is safe: it shows less, the prefix stays monotonic, and the ended path shows all of it. No change is needed.
- MINOR (note, spec 4.2 by design). A Live answer that mentions `__init__`, `x[i]` or `a < b` reads `marker` and is
  appended. All 20 router40 live answers are marker-free. This is worth stating in the registration's I6 text, so it
  is not read as a reader bug.

## Not shown
- The reader was not exercised through the arbiter (that is Task 5 and Task 6).
- The build was not run, so `routeReader.js` in dist is inferred from `build-electron.js`, not observed.
- The stub-RED run was not re-run by the reviewer.
