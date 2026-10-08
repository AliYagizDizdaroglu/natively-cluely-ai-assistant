# Task 1 review: paraphrase-anchored answer attribution by `question=`

Reviewer: Opus 5.5, read-only. Package `review-task1.diff` is byte-identical to MAIN's current
`git diff 07a0e5e` for the four Task 1 files (checked with Compare-Object: 0 differing lines).

SPEC: PASS
QUALITY: NEEDS FIXES

Counts: Critical 0 / Important 1 / Minor 3

## Spec compliance: what I checked

- judge.mjs: `questionForGrader` is exported. The dispatch regex is the metrics one (non-capturing
  except anchor, verdict and question). Scoring is `Math.max(overlap(anchor), question ? overlap(question) : 0)`,
  the comment is the brief's wording, and `heard: d.anchor` is kept. All of it matches the brief
  verbatim.
- metrics.mjs `claimOf`: the brief's four-way `Math.max` with the same comment. The metrics dispatch
  regex already captured `question=` at 07a0e5e, so no parse change was needed.
- Tests: both judge tests (R07F case + control, `questionForGrader` export) and the metrics describe
  block (fix case + stripped control) are the brief's, at judge.test.ts:118 and :135 and
  metrics.test.ts:771.
- The proof on copies was done in the right order. Before-snapshots were written at 18:03:10. Both
  `.mjs` files have mtime 18:06:05. After-snapshots were written at 18:06:18. `attrib-check.mjs`
  imports MAIN's modules by absolute path, so the after run did use the edited code. My own
  independent before/after run (below) reproduces the h40b movement exactly.
- LF only and no BOM in all four files.
- Reported deviations:
  - `robocopy` was used instead of `Copy-Item` because of MAX_PATH.
  - Edits were staged through the scratchpad.
  - `heardBy` for R07F stayed `'live'` before and after. This is explained by an existing `mark`
    line, and my run confirms `heardBy` does not move.
  None of these are scope changes.

## Tests fail without the change (rule 8)

- **MAIN (with the change):** `interview60.judge.test.ts` 17/17 and `interview60.metrics.test.ts`
  38/38, 55 passed. Run from `SD\vitest-cwd-rev1` with `--root MAIN`.
- **Original modules (07a0e5e via `git show`) + the new test files, in scratchpad `SP\r1orig`:** all
  three new positive tests fail, and both controls pass:
  - `expected [ '?' ] to deeply equal [ 'R07F' ]`
  - `questionForGrader is not a function`
  - `expected 1 to be +0`
  One unrelated failure (`graderPromptVersion`, the grader-prompt `.md` is absent from the copy) and
  2 skips (missing run fixtures) are artefacts of the copy. They appear identically in the `SP\r1gated`
  run too.

## Cross-run check: does `question=` steal or mask claims on other runs?

Script `SP\rev1\cross-runs.mjs`:
- **Before:** `SP\rev1\orig\` (07a0e5e copies). **After:** MAIN.
- **Runs covered:** all 21 run folders under `interview60.runs\` that carry `question=` answer lines
  (after5 … s50m, h40a, h40b). Run folders are only read; computeRun and pairAnswers do not write.
- **Compared:** every judge pair id, `answersToNobody`, and per item `answered`, `answeredAt`,
  `dispatches`, `heardBy`, `extended`, `supersedes`, `coverage`, `raceLoss` and `verdict`.
- **Cross-site agreement:** judge pair id vs the metrics item whose `answeredAt` is that dispatch.

Result: 18 runs identical. 3 runs changed:

| run | dispatch | before → after | what it is |
|---|---|---|---|
| h40b | 10:47:31.603 `verdict=paraphrase` | `?` → R07F; toNobody 1→0; R07F answered false→true, dispatches 0→1, coverage 0→1 | the intended fix |
| after5 | 22:18:25.572 `verdict=unverifiable` "How do you apply infrastructure as code across different environments like development, staging, and production?" | `?` → M21; toNobody 3→2; M21 dispatches 1→2, heardBy whisper→both | a real Live paraphrase of M21, answered a second time (a double that used to be counted as "to nobody") |
| after8 | 07:36:26.044 `verdict=unverifiable` "How would you approach deploying multiple versions of the same model in one cluster?" | `?` → M11; toNobody 1→0; M11 dispatches 1→2, heardBy whisper→both | **the known Live FABRICATION** (memory `project_after8_readiness.md` item 3: "Live invented …", the 1-in-52 case) |

Judge and metrics never disagreed, before or after, in any of the 21 runs.

## Findings

### Important

**I1. `question=` scoring lets a Live fabrication claim a real item, hiding it from `answersToNobody`.**

Where: interview60.judge.mjs:111 and interview60.metrics.mjs:208.

- **Scenario, measured on after8:** Live invents a question 13 s after M11 plays.
  - The anchor is cut at 80 chars ("…in one clus"). It overlaps M11 in only one word ("multiple"),
    which is below both thresholds, so before the change the dispatch was correctly "to nobody".
  - The full `question=` adds "cluster". That gives 2/7 = 0.29, which is at or above judge's 0.25
    and metrics' 0.15, so both sites now claim the fabrication for M11.
- **Effect on an h40c-style gate:**
  - The "answered" row's `answersToNobody === 0` now passes.
  - The fabrication shows up only as a double on M11.
  - The judge adds a second M11 pair whose answer is about a different question, which puts a
    phantom weak/wrong verdict on M11.
- **Why it happens:** the brief's own comment scopes the fix to `verdict=paraphrase`. On a
  paraphrase, the reconciler has checked Live's text against the interviewer STT. On
  `verdict=unverifiable`, `question=` is unchecked Live text, which is exactly where fabrications
  live. So the code scores more than the comment says.
- **Fix:**
  - Gate the question term on the verdict at both sites:
    - judge: `d.question && d.verdict === 'paraphrase' ? overlap(d.question, it.q) : 0`
    - metrics: the same guard on both `question` terms.
  - Verified in scratchpad `SP\rev1\gated\` (MAIN's current files with only that guard added):
    - Across all 21 runs, ONLY h40b R07F moves (identical to the intended movement above).
    - after5 and after8 stay as they were.
    - Both test files pass against the gated modules (`SP\r1gated`: 52 passed; only the same copy
      artefacts fail or skip).
  - Add a regression test with the after8 shape: `verdict=unverifiable` with `question=` sharing 2
    content words with the item in the window. Expect `['?']` and `answersToNobody === 1`.
  - Put the reason in the comment: an unverifiable question is unchecked Live text.
- **Accepted cost:** the after5 M21 double (a real paraphrase whose verdict was unverifiable) stays
  "to nobody", as it was before this task.

### Minor

**M1. The proof's field list misses `coverage`.**

Where: `SP\attrib-diff.mjs` / `attrib-check.mjs` (the brief's own field list).

The proof compares `answered`, `answeredAt`, `dispatches` and `heardBy` only. R07F's `coverage` also
moves (0 → 1), and that feeds the "long questions answered whole" row. The movement is expected and
harmless here, but a change whose effect lands on an uncompared field would pass the "nothing else
moved" check silently.

Fix: when the proof is re-run after I1, compare every numeric and boolean item field.
`SP\rev1\cross-runs.mjs` does this.

**M2. An unknown field before `question=` silently drops it.**

Where: interview60.judge.mjs:87 (same shape as metrics.mjs:67).

Every optional group is positional and there is no end anchor. If main.ts ever logs a new field
between `verdict=` and `question=` (for example a hedge tag), `question` parses as `null` and
attribution quietly falls back to the anchor. Measured: `verdict=paraphrase hedge=on question="…"`
gives `['?']`. Escaped quotes (`\"`) inside `question=` parse correctly, and a line without
`question=` gives `null`, both as intended. This pattern already existed in metrics; the only part of
it that metrics surfaces is the `pinned.legacy` counter.

Fix (optional; not required for this task): parse `question=` with its own
`/ question="((?:[^"\\]|\\.)*)"$/` match on the line, independent of the fields in between.

**M3. The two attribution sites still differ in structure.**

Where: interview60.judge.mjs:111 and :119 vs interview60.metrics.mjs:208–209.

These differences already existed at 07a0e5e; the change does not add a new one:
- judge uses a stop list, a 0.25 threshold and a byTime fallback for stop-word-only anchors;
- metrics has no stop list and uses a 0.15 threshold.

"Both directions in metrics vs one in judge" is not a real difference: judge's `overlap` is already
symmetric (`max(n/|A|, n/|B|)`), and metrics' two directed calls add up to the same thing.

With a long `question=` text, metrics' missing stop list makes a 0.15 claim through "would", "your"
or "what" more reachable than a judge claim. But 0 of the 21 runs show judge and metrics claiming
differently, before or after the change.

Fix: none now. I1's verdict gate also narrows this exposure. Recorded so a future divergence is not
a surprise.

## Artefacts (scratchpad, throwaway)

- `SP\rev1\orig\*.mjs`: the 07a0e5e originals.
- `SP\rev1\gated\*.mjs`: MAIN plus the I1 guard.
- `SP\rev1\cross-runs.mjs`: the before/after script; set `AFTER_DIR` to compare against a variant.
- `SP\rev1\rx.mjs`: the regex edge cases.
- `SP\r1orig`, `SP\r1gated`: vitest roots with a `node_modules` junction to MAIN.
