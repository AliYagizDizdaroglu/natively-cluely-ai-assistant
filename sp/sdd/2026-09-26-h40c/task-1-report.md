# Task 1 report — attribute a paraphrase-anchored answer by its dispatched `question=`

## Files changed (MAIN)

- `electron/test/golden/interview60.judge.mjs` — `questionForGrader` exported; `pairAnswers`'s
  dispatch regex widened to the metrics one (captures `question=`); claim score now
  `Math.max(overlap(d.anchor, it.q), d.question ? overlap(d.question, it.q) : 0)`.
- `electron/test/golden/interview60.metrics.mjs` — `claimOf`'s candidate score now also checks
  `overlap(d.question, it.q)` / `overlap(it.q, d.question)` when `d.question` is present.
- `electron/test/golden/interview60.judge.test.ts` — two new tests in the `pairAnswers` describe
  block (the R07F paraphrase case + its `question=`-stripped control; `questionForGrader` export
  test).
- `electron/test/golden/interview60.metrics.test.ts` — new describe block
  `claimOf: a paraphrase-anchored answer is claimed by its dispatched question (h40b R07F)` with
  the fix case and its control.

Scratchpad-only (throwaway, not part of the repo):
`SP\attrib-check.mjs`, `SP\attrib-diff.mjs`, `SP\peek-before.mjs`,
`SP\attrib-h40a\` / `SP\attrib-h40b\` (run-folder copies),
`SP\attrib-before-h40a.json` / `-h40b.json`, `SP\attrib-after-h40a.json` / `-h40b.json`,
`SP\attrib-diff.txt`, `SP\stage\...` (edit staging copies).

## Deviation from the brief's stated process (tooling only, not scope)

The Edit tool refused direct writes to MAIN paths in this session (it is bound to the
`whole-turn` worktree and requires edits go through its own worktree copy). Per the implementer
contract's explicit fallback ("If a tool refuses a MAIN path, write the full file under
`<SP>\stage\<repo-relative path>` and copy it with PowerShell"), every MAIN edit in this task went:
Read MAIN file → copy to `SP\stage\...` → Edit the staged copy → PowerShell
`[IO.File]::WriteAllText($dst, $text.Replace("` + "`r`n" + `","` + "`n" + `"), UTF8Encoding($false))`
to land it back in MAIN. Verified after each copy: no CRLF, no BOM, in all four changed files.

Also: `Copy-Item -Recurse` failed on the h40a/h40b run-folder copies with
`DirectoryNotFoundException` — the destination path (scratchpad root + `attrib-h40a\<long
filename>.json`) exceeds Windows' 260-char `MAX_PATH` (measured at 266 chars for the longest
entry). Used `robocopy /E` instead (which does not hit the same limit), and verified file counts
matched the source (64/64 for both h40a and h40b) before proceeding.

## TDD — failing tests first

### judge.test.ts (run 1, before implementation)

```
✓ 15 passed
× pairAnswers > claims an answer anchored on a Live paraphrase by the question= it dispatched (h40b R07F...)
  → expected [ '?' ] to deeply equal [ 'R07F' ]
× pairAnswers > exports questionForGrader for the blind-pairs builders: a chained follow-up carries its parent
  → TypeError: questionForGrader is not a function
Test Files  1 failed (1)
     Tests  2 failed | 15 passed (17)
```

### metrics.test.ts (run 1, before implementation)

```
✓ 37 passed
× claimOf: a paraphrase-anchored answer is claimed by its dispatched question (h40b R07F) > claims the paraphrase-anchored answer by its dispatched question=, not the anchor alone
  → AssertionError: expected 1 to be +0 // Object.is equality  (m.answersToNobody)
Test Files  1 failed (1)
     Tests  1 failed | 37 passed (38)
```

Both failures match the brief's predicted shape exactly (`['?']` vs `['R07F']`;
`questionForGrader is not a function`; `answersToNobody` staying at 1 instead of dropping to 0).
The control case in the new metrics describe block (question= stripped) passed on the first
run, as expected — it reproduces the pre-fix behaviour by construction.

## Implementation

Applied exactly the code blocks given in the brief (see diff below). Command run for both files
after implementing:

```
node "<repo>\node_modules\vitest\vitest.mjs" run --root "<repo>" --config "<repo>\vitest.config.ts" \
  electron/test/golden/interview60.judge.test.ts electron/test/golden/interview60.metrics.test.ts
```

Result (run 2, green):

```
✓ electron/test/golden/interview60.judge.test.ts (17 tests) 33ms
✓ electron/test/golden/interview60.metrics.test.ts (38 tests) 178ms
Test Files  2 passed (2)
     Tests  55 passed (55)
```

Diff of the two implementation files (`git -C <repo> diff`):

```diff
--- a/electron/test/golden/interview60.judge.mjs
+++ b/electron/test/golden/interview60.judge.mjs
-function questionForGrader(item, items) {
+export function questionForGrader(item, items) {
...
-    const all = [...debugLog.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|extend|supersede) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)/gm)]
-        .map((m) => ({ at: Date.parse(m[1]), action: m[2], source: m[3], anchor: JSON.parse(`"${m[4]}"`), verdict: m[5] }));
+    const all = [...debugLog.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|extend|supersede) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?: duplicateOf=\w+ answered=(?:true|false))?(?: extends="(?:[^"\\]|\\.)*")?(?: replaces="(?:[^"\\]|\\.)*")?(?: reason=\w+)?(?: question="((?:[^"\\]|\\.)*)")?/gm)]
+        .map((m) => ({ at: Date.parse(m[1]), action: m[2], source: m[3], anchor: JSON.parse(`"${m[4]}"`), verdict: m[5], question: m[6] == null ? null : JSON.parse(`"${m[6]}"`) }));
...
-            const ov = overlap(d.anchor, it.q);
+            const ov = Math.max(overlap(d.anchor, it.q), d.question ? overlap(d.question, it.q) : 0);

--- a/electron/test/golden/interview60.metrics.mjs
+++ b/electron/test/golden/interview60.metrics.mjs
-                .map((it) => ({ it, score: Math.max(overlap(d.anchor, it.q), overlap(it.q, d.anchor)) }))
+                .map((it) => ({ it, score: Math.max(overlap(d.anchor, it.q), overlap(it.q, d.anchor), d.question ? overlap(d.question, it.q) : 0, d.question ? overlap(it.q, d.question) : 0) }))
```

(`interview60.metrics.mjs`'s dispatch regex already captured `question=` before this task — that
parsing was added by an earlier task; only the `claimOf` scoring line needed the change here.)

## Rule-8 calibration — proof on copies of real runs

Per the controller's note, the before-snapshot was taken **before** any edit to the two `.mjs`
files:

1. Copied `2026-09-24T08-20-12-h40a` → `SP\attrib-h40a` and `2026-09-26T11-39-51-h40b` →
   `SP\attrib-h40b` via `robocopy /E` (64/64 files each, verified against source counts).
2. Ran `SP\attrib-check.mjs <copy> <out.json>` on both copies **before** editing
   `interview60.judge.mjs` / `interview60.metrics.mjs` → `attrib-before-h40a.json`,
   `attrib-before-h40b.json`.
3. Implemented the fix (TDD steps above).
4. Ran the same script on the same copies again → `attrib-after-h40a.json`,
   `attrib-after-h40b.json`.
5. Diffed with `SP\attrib-diff.mjs`, output saved to `SP\attrib-diff.txt`:

```
== h40a ==
identical (byte-for-byte JSON.stringify equal)

== h40b ==
answersToNobody: 1 -> 0
pair changed: dispatchedAt=2026-09-26T10:47:31.603Z id ? -> R07F
item R07F: answered false -> true, answeredAt null -> 1790419651603, dispatches 0 -> 1
```

This matches the brief's prediction: h40a untouched; h40b's R07F paraphrase-anchored answer
dispatch (`2026-09-26T10:47:31.603Z`) reattributed from `?` to `R07F`, `answersToNobody` 1→0,
R07F `answered` false→true, `dispatches` 0→1 — and nothing else in either run moved (confirmed
by the diff script comparing every pair's id and every item's `answered`/`answeredAt`/
`dispatches`/`heardBy`).

**One deviation from the brief's exact predicted diff, understood and not a concern:** the brief
predicted `heardBy null → 'live'` for R07F; the actual value was `'live'` both before and after
(no movement on that field). Root cause, confirmed by inspecting the real h40b log
(`natively_debug.log` line 1594): a separate `mark source=live anchor="And if the worker that
claimed it crashes halfway," ...` line — whose *anchor itself* (not its `question=`) already
overlaps R07F's scripted text directly — was already correctly claimed by R07F before this fix.
`heardBy` is computed from every dispatch line claimed by the item (`mine`), not only the
`answer` line, so it was already `'live'` from that `mark` line alone. The fix's effect is
specific to the *answer* dispatch (the one that actually reached `answersToNobody` / `answered`
/ `dispatches`), which is exactly what moved. No other field or item moved in either run.

## Note for the record

The h40b pass record and judge files were not touched or regenerated — per the plan, "committed
pass records are never hand-edited or regenerated for old runs." The proof lives entirely in the
scratchpad JSON/diff files listed above.

## Open concerns

None. Both test files are green (55/55), the calibration proof is clean and matches predictions
(with the one understood, explained deviation above), and only the four files named in the
brief were modified in MAIN.

---

## Fix round 1 (Opus review, I1)

Review: `SP\sdd\2026-09-26-h40c\task-1-review.md`. Counts: Critical 0 / Important 1 / Minor 3.
SPEC PASS, QUALITY NEEDS FIXES before this round.

### I1 — `question=` scoring let a Live fabrication claim a real item

**Finding.** Scoring `question=` unconditionally (as landed in the first pass) let a Live
fabrication claim a real scripted item: on after8, Live invented a question 13 s after M11
played. The 80-char anchor overlapped M11 in one word ("multiple") — correctly below both
thresholds. The full `question=` text added "cluster", clearing judge's 0.25 and metrics' 0.15
floors, so both sites claimed the fabrication for M11 — turning it into a phantom double instead
of leaving it correctly unclaimed. Root cause: a `verdict=paraphrase` dispatch has been checked
against the interviewer's own STT before dispatch; a `verdict=unverifiable` dispatch's
`question=` is unchecked Live text — exactly where a fabrication lives. The brief's original
comment already said "on a paraphrase"; the code did not enforce it.

**Ruling (accepted by the controller):** score `question=` only when `d.verdict === 'paraphrase'`,
at both sites. Accepted cost: the after5 M21 double (a real Live paraphrase whose *dispatch*
verdict was `unverifiable`, not `paraphrase`) stays "to nobody", same as before this task.

### TDD — failing test first (after8 shape)

Added one regression test per file, built from the real after8 log line
(`2026-09-07T07:36:26.044Z ... verdict=unverifiable ... anchor="How would you approach deploying
multiple versions of the same model in one clus" ... question="...in one cluster?"`) against the
real M11 item (`"How do you manage GPU resources across multiple teams sharing one cluster?"`,
played at `2026-09-07T07:36:12.968Z`, 13.076 s before the dispatch — matches the review's "13 s"
exactly).

Run 1 (before the gate — red, on the code from the first pass):

```
× judge.test.ts > ...after8 fabrication...
  → expected [ 'M11' ] to deeply equal [ '?' ]
× metrics.test.ts > ...after8 fabrication...
  → expected +0 to be 1  (m.answersToNobody)
Tests  2 failed | 55 passed (57)
```

Both fail exactly as the bug predicts: the fabrication gets claimed (`M11` instead of `?`) and
`answersToNobody` stays 0 instead of counting it.

### Implementation

Gated the `question=` term on `d.verdict === 'paraphrase'` at both sites, updated both comments
to state why (paraphrase is STT-checked before dispatch; unverifiable is not):

```diff
--- a/electron/test/golden/interview60.judge.mjs
-            const ov = Math.max(overlap(d.anchor, it.q), d.question ? overlap(d.question, it.q) : 0);
+            const ov = Math.max(overlap(d.anchor, it.q), d.question && d.verdict === 'paraphrase' ? overlap(d.question, it.q) : 0);

--- a/electron/test/golden/interview60.metrics.mjs
-                .map((it) => ({ it, score: Math.max(overlap(d.anchor, it.q), overlap(it.q, d.anchor), d.question ? overlap(d.question, it.q) : 0, d.question ? overlap(it.q, d.question) : 0) }))
+                .map((it) => ({ it, score: Math.max(overlap(d.anchor, it.q), overlap(it.q, d.anchor), d.question && d.verdict === 'paraphrase' ? overlap(d.question, it.q) : 0, d.question && d.verdict === 'paraphrase' ? overlap(it.q, d.question) : 0) }))
```

Run 2 (green):

```
✓ interview60.judge.test.ts (18 tests)
✓ interview60.metrics.test.ts (39 tests)
Tests  57 passed (57)
```

### Re-run the copies proof

`attrib-check.mjs` was widened per Minor M1 (see below) to compare every numeric/boolean item
field, not just the original four, and given a `MODULE_DIR` env override so it can load modules
from an arbitrary checkout (used to regenerate a true 07a0e5e "before" against the same
scratchpad copies). Regenerated wide-field before/after snapshots for `SP\attrib-h40a` and
`SP\attrib-h40b` (before = `SP\rev1\orig` (07a0e5e, from the reviewer's own artefacts), after =
MAIN post-fix-round-1), diffed with the widened `attrib-diff.mjs`
(`SP\attrib-diff-round1.txt`):

```
== h40a ==
identical (byte-for-byte JSON.stringify equal)

== h40b ==
answersToNobody: 1 -> 0
pair changed: dispatchedAt=2026-09-26T10:47:31.603Z id ? -> R07F
item R07F: answered false -> true, answeredAt null -> 1790419651603, dispatches 0 -> 1, coverage 0 -> 1
```

Only R07F moves (now also confirmed on `coverage`, which the first pass's narrower field list
did not compare — M1's exact point). h40a is untouched.

### Cross-run check (all 21 runs carrying `question=`)

Reused the reviewer's `SP\rev1\cross-runs.mjs` unmodified, run against 07a0e5e (`SP\rev1\orig`)
vs current MAIN (fix round 1 applied) — output saved to `SP\rev1\cross-runs-after-round1.txt`:

```
2026-09-04T22-43-34-after5: identical  (after: judge '?'=3, metrics toNobody=3, ...)
...
2026-09-07T08-14-12-after8: identical  (after: judge '?'=1, metrics toNobody=1, ...)
...
2026-09-24T08-20-12-h40a: identical  (...)
2026-09-26T11-39-51-h40b: CHANGED  (after: judge '?'=0, metrics toNobody=0, ...)
  judge pair 2026-09-26T10:47:31.603Z ? -> R07F  heard="In the scenario where two workers are picking up jobs from a queue, what happens"
  answersToNobody 1 -> 0
  item R07F: answered false->true, answeredAt null->1790419651603, dispatches 0->1, coverage 0->1
total changed lines: 3
```

18 of 18 non-h40b runs read `identical` (including after5 and after8, which the review flagged as
regressed by the un-gated version — confirmed fixed: after8's `judge '?'=1, metrics toNobody=1`
is unchanged from before, i.e. the fabrication is still correctly unclaimed). Only h40b changed,
by exactly the intended R07F movement. Judge/metrics cross-site agreement: 0 disagreements in
every run, before and after.

### Minors

- **M1 (applied).** Widened the proof's item-field comparison from
  `answered, answeredAt, dispatches, heardBy` to also include
  `extended, supersedes, coverage, raceLoss, verdict`, in both `attrib-check.mjs` and
  `attrib-diff.mjs` (scratchpad-only files — not part of the brief's four MAIN files). Re-ran the
  copies proof with the widened list (above); it surfaces R07F's `coverage: 0 -> 1`, which the
  original four-field list would have passed silently, exactly the gap M1 named.
- **M2 (left, with reason).** The reviewer marked this fix "optional; not required for this
  task" and it is not a one-line change: it replaces the positional-group parse with an
  independent `question=` match anchored to end-of-line, at two sites, which needs its own
  test coverage to land safely. Left for a future task; noted here so it is not lost.
- **M3 (left, with reason).** The review's own fix for this is "none now" — it is a recorded
  observation (the two attribution sites differ in threshold/stop-list, pre-existing at 07a0e5e,
  0 of 21 runs show a cross-site disagreement) with no action requested. I1's verdict gate also
  narrows the exposure the reviewer flagged. Nothing to change.

### Files changed in this round (same four as the first pass; no new files)

- `electron/test/golden/interview60.judge.mjs` — verdict guard added to the `question=` term.
- `electron/test/golden/interview60.metrics.mjs` — same guard, both directions.
- `electron/test/golden/interview60.judge.test.ts` — after8 regression test added.
- `electron/test/golden/interview60.metrics.test.ts` — after8 regression test added.

Scratchpad-only additions this round: `SP\round1-wide\*.json` (widened before/after snapshots),
`SP\attrib-diff-round1.txt`, `SP\rev1\cross-runs-after-round1.txt`, `SP\peek-m11.mjs`,
`SP\peek-m11-iso.mjs` (throwaway lookups). `attrib-check.mjs` and `attrib-diff.mjs` were edited
in place (M1); they are scratchpad tooling, not repo files.

### Open concerns after fix round 1

None. Both test files green (57/57), the I1 gate verified on the copies proof and independently
on all 21 real runs that carry `question=` (only h40b R07F moves; after5 and after8 confirmed
back to their pre-task behaviour), and the accepted-cost tradeoff (after5's M21 double) is
unchanged from what the review recorded.
