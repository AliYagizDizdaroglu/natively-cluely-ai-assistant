# Task 1 report — the R09 fix, test first

Implemented by the controller session INLINE on 2026-09-25 18:20–18:26, before the user's rule
(Sonnet implements, Opus reviews) arrived at 18:30. Not committed: MAIN's index is shared, the
controller commits with a private-index script after this review and after Task 0 greens the suite.

## What was implemented
- electron/knowledge/IntentClassifier.test.ts: a new import of `SPOKEN as HOLDOUT_SPOKEN` from
  `../test/golden/holdout40.questions.mjs` and two tests inside the existing describe: (1) none of
  holdout40's 45 spoken questions classifies as NEGOTIATION; (2) "Give me the SQL for the second
  highest salary in each department." classifies as TECHNICAL.
- electron/knowledge/IntentClassifier.ts: STRONG_NEGOTIATION no longer holds the bare word 'salary';
  it holds the phrases 'salary expectation', 'salary expectations', 'expected salary', 'salary range',
  'your salary', 'salary requirement', 'salary requirements', 'desired salary', 'base salary',
  'salary offer', 'what salary'; every other term is unchanged; a comment records the h40a R09 cause.
  Nothing else in either file changed (git diff: 6 insertions, 1 deletion in the .ts; 10 insertions in the test).

## TDD evidence
- RED (18:24): `node node_modules/vitest/vitest.mjs run electron/knowledge/IntentClassifier.test.ts`
  → `Tests  2 failed | 5 passed (7)`; failures: `expected [ 'R09' ] to deeply equal []` and
  `expected 'negotiation' to be 'technical'`. Expected: the bare 'salary' term routes R09.
- GREEN (18:25): same command → `Tests  7 passed (7)`.

## Other checks
- `node node_modules/typescript/bin/tsc -p electron/tsconfig.json --noEmit`: 6 errors, the pre-existing
  set (GeminiLiveRouter TS2339; ipcHandlers TS2339 ×3; KnowledgeOrchestrator TS2322 ×2); root
  `tsc --noEmit`: 0 errors.
- Full suite from MAIN's root (18:25–18:27): `Test Files 1 failed | 86 passed (87)`,
  `Tests 2 failed | 790 passed (792)`; the 2 failures are in electron/test/golden/hedge-live.policy.test.ts
  (real-timer assertions drifting under parallel load — Task 0 fixes that file); IntentClassifier.test.ts
  passed inside the suite.

## Files changed
- MAIN electron/knowledge/IntentClassifier.ts (staged copy: scratchpad stage/electron/knowledge/IntentClassifier.ts)
- MAIN electron/knowledge/IntentClassifier.test.ts (staged copy likewise)

## Self-review
- The phrase list is a judgement call: it keeps 'compensation', 'negotiate', 'negotiable', 'equity',
  'rsu', 'rsus', 'signing bonus', 'total comp', 'market rate', 'counteroffer' as bare strong terms and
  only narrows 'salary'. A question like "what salary are you expecting" matches 'what salary';
  "how much do you make" matches nothing (as before the change).
- Risk not covered by tests: a real negotiation question phrased with "salary" but none of the eleven
  phrases (e.g. "Let's talk salary.") now falls through to COMPANY/PROFILE/TECHNICAL/GENERAL instead
  of NEGOTIATION. The existing four real-negotiation questions still pass.

## Fix round 1

Fixing the review finding: the phrase list alone still routed technical questions like "write a query
that returns the salary range" to the negotiation coaching card, because the phrase check ran before
the technical keyword check. Kept STRONG_NEGOTIATION exactly as fix round 0 left it; added a
technical-context veto per the controller's ruling.

### What changed
- `electron/knowledge/IntentClassifier.ts`: added `TECHNICAL_CONTEXT` (13 terms: sql, query, table,
  database, schema, join, function, algorithm, regression, pipeline, dataset, column, implement, code)
  right after `STRONG_NEGOTIATION`, with the verbatim comment specified in the ruling. Changed the
  negotiation line in `classifyIntent` from
  `const strong = STRONG_NEGOTIATION.some(kw => hasWord(lower, kw));` to
  `const strong = STRONG_NEGOTIATION.some(kw => hasWord(lower, kw)) && !TECHNICAL_CONTEXT.some(kw => hasWord(lower, kw));`.
  Nothing else in the function changed.
- `electron/knowledge/IntentClassifier.test.ts`: renamed the existing R09 test title to
  `'a technical question that mentions salary is technical, not negotiation (bare word or phrase, with
  a technical marker)'` (assertion unchanged). Added two tests: `'a technical marker beats any pay term
  (the h40a R09 class: a coaching card is unspeakable on a technical question)'` (6 questions, all
  `.not.toBe(NEGOTIATION)`) and `'a pay question without a technical marker is still a negotiation'`
  (3 questions, all `.toBe(NEGOTIATION)`).

### TDD evidence
Tests were copied to MAIN alone first (source file untouched) to get a true RED against the
pre-veto code, then the source fix was copied in for GREEN.

RED — `node node_modules/vitest/vitest.mjs run electron/knowledge/IntentClassifier.test.ts` (18:55:30,
source file still without the veto):
```
 ❯ electron/knowledge/IntentClassifier.test.ts (9 tests | 1 failed) 40ms
   × classifyIntent — negotiation must need a negotiation word > a technical marker beats any pay term (the h40a R09 class: a coaching card is unspeakable on a technical question) 8ms
     → expected 'negotiation' not to be 'negotiation' // Object.is equality
 ...
 Test Files  1 failed (1)
      Tests  1 failed | 8 passed (9)
```
(The loop's first case — "write a query that returns the salary range" — throws and stops the loop,
so only the first mismatch is reported; the salary-range, base-salary, expected-salary,
total-compensation and equity cases were all separately confirmed to match STRONG_NEGOTIATION with no
veto applied before the fix, by inspection of the phrase list. The second new test, no technical
marker, passed already — 8/9 pre-fix.)

GREEN — same command, after copying the fixed `IntentClassifier.ts` into MAIN (18:56:21):
```
 ✓ electron/knowledge/IntentClassifier.test.ts (9 tests) 30ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
```

### tsc
`node node_modules/typescript/bin/tsc -p electron/tsconfig.json --noEmit` → exactly 6 errors, all
pre-existing, none in IntentClassifier:
```
electron/audio/GeminiLiveRouter.ts(125,44): error TS2339: Property 'length' does not exist on type 'never'.
electron/ipcHandlers.ts(3433,18): error TS2339: Property 'canceled' does not exist on type 'string[]'.
electron/ipcHandlers.ts(3433,38): error TS2339: Property 'filePaths' does not exist on type 'string[]'.
electron/ipcHandlers.ts(3436,31): error TS2339: Property 'filePaths' does not exist on type 'string[]'.
electron/knowledge/KnowledgeOrchestrator.ts(349,35): error TS2322: Type 'CompanyDossier' is not assignable to type 'null'.
electron/knowledge/KnowledgeOrchestrator.ts(351,25): error TS2322: Type 'CompanyDossier' is not assignable to type 'null'.
```

### Full suite
Local clock was 18:56–18:57, clear of the 19:28–19:56 blackout window. From MAIN's root:
`node node_modules/vitest/vitest.mjs run` →
```
 Test Files  87 passed (87)
      Tests  794 passed (794)
```
0 failed. (This run shows the hedge-live.policy.test.ts flake from the earlier fix-round-0 report is
not present now — 794/794 clean, IntentClassifier.test.ts included at 9/9.)

### Diff stat
`git -C $m diff --stat -- electron/knowledge/IntentClassifier.ts electron/knowledge/IntentClassifier.test.ts`:
```
 electron/knowledge/IntentClassifier.test.ts | 27 +++++++++++++++++++++++++++
 electron/knowledge/IntentClassifier.ts      | 18 ++++++++++++++++--
 2 files changed, 43 insertions(+), 2 deletions(-)
```
(This is cumulative against HEAD — fix round 0's STRONG_NEGOTIATION narrowing plus fix round 1's veto
and tests together; neither round is committed.)

### Self-review
- `TECHNICAL_CONTEXT` constant and its comment are verbatim against the ruling, byte for byte.
- The negotiation line is exactly the minimal change specified; nothing else in `classifyIntent`
  reordered or touched.
- The four real negotiation questions in `'still recognises real negotiation questions'` still pass
  (confirmed in the GREEN run: 9/9, that test included).
- Diff touches only the two target files; no commit made; no other files read or written except the
  scratchpad stage copies and this report.
- Not covered: a technical question using pay vocabulary but none of the 14 `TECHNICAL_CONTEXT` terms
  and a strong phrase (e.g. "What's a fair total comp band to benchmark against for this role, using
  spreadsheet formulas?" — no listed technical marker) would still misroute to NEGOTIATION. This is
  the same class of residual risk fix round 0 already named for the phrase list, one level down; no
  test added for it since the ruling scoped the fix to the 14-term list.

## Fix round 2

Fixing the re-review's Important finding: `'table'` and `'join'` in `TECHNICAL_CONTEXT` are everyday
negotiation idioms ("on the table", "join us"), so the round-1 veto turned real negotiation questions
into ordinary answers (losing the coaching path's salary block). Minor findings folded into the same
ruling: whole-word matching missed plurals (queries/tables/functions/etc.), and the comment read
backwards.

### What changed
- `electron/knowledge/IntentClassifier.ts`: replaced the `TECHNICAL_CONTEXT` comment with the ruling's
  verbatim text ("A marker vetoes NEGOTIATION. ... 'table' and 'join' are not markers: 'on the table'
  and 'join us' are negotiation idioms."). Replaced the 14-term list with the ruling's exact 21 terms
  in order (`sql, query, queries, tables, database, databases, schema, schemas, column, columns,
  function, functions, algorithm, algorithms, regression, pipeline, pipelines, dataset, datasets,
  implement, code`) — `table` and `join` dropped, `tables` kept, plural forms added for query, table,
  database, schema, column, function, algorithm, dataset. Wrapped across 3 lines (not 2) to stay at the
  file's existing ~100-char line width now that the list is 21 items instead of 14 — 21 items in a
  literal 2-line wrap would run well past that width, so I read "keep the wrapping style" as the
  comma-packed multi-line format, not a literal 2-line count. The `classifyIntent` negotiation line
  from fix round 1 is untouched (it already read `TECHNICAL_CONTEXT`, which now just holds a different
  list). Nothing else in the file changed.
- `electron/knowledge/IntentClassifier.test.ts`: added two tests, verbatim from the ruling, immediately
  after `'a pay question without a technical marker is still a negotiation'` and before `'still
  recognises real negotiation questions'`: `'a negotiation idiom is not a technical marker ("on the
  table", "join us")'` (3 questions, all `.toBe(NEGOTIATION)`) and `'a plural technical marker vetoes
  too (queries, tables, functions)'` (3 questions, all `.not.toBe(NEGOTIATION)`). Nothing else in the
  test file changed.

### TDD evidence
Test file copied to MAIN alone first (source still fix-round-1's 14-term list) for a true RED, then
the source fix copied in for GREEN.

RED — `node node_modules/vitest/vitest.mjs run electron/knowledge/IntentClassifier.test.ts` (19:17:45,
source still round-1):
```
 ❯ electron/knowledge/IntentClassifier.test.ts (11 tests | 2 failed) 40ms
   × classifyIntent — negotiation must need a negotiation word > a negotiation idiom is not a technical marker ("on the table", "join us") 10ms
     → expected 'general' to be 'negotiation' // Object.is equality
   × classifyIntent — negotiation must need a negotiation word > a plural technical marker vetoes too (queries, tables, functions) 2ms
     → expected 'negotiation' not to be 'negotiation' // Object.is equality

 Test Files  1 failed (1)
      Tests  2 failed | 9 passed (11)
```
Both failures land on each test's first array item, then the loop's thrown assertion stops it (the
other two items per test were confirmed to fail the same way by the manual trace below, not by
separate reported lines): "A signing bonus is also on the table..." classified `general` pre-fix
because `'table'` matched `TECHNICAL_CONTEXT` and vetoed the `'signing bonus'` strong term, falling
through every later category; "Write queries that return each department's salary range." classified
`negotiation` pre-fix because `'query'` (singular, whole-word) does not match the substring "queries",
so no veto fired and `'salary range'` won. Both are exactly the failure modes the ruling named.

GREEN — same command, after copying the fixed `IntentClassifier.ts` into MAIN (19:18:16):
```
 ✓ electron/knowledge/IntentClassifier.test.ts (11 tests) 46ms

 Test Files  1 passed (1)
      Tests  11 passed (11)
```
11/11: the 9 from fix round 1 (unaffected — none of the six "beats any pay term" cases or the three
"no marker" cases used `'table'` or `'join'` as their only technical signal) plus the 2 new ones.

### tsc
`node node_modules/typescript/bin/tsc -p electron/tsconfig.json --noEmit` (19:18:37) → exactly the same
6 pre-existing errors as fix round 1, none in IntentClassifier:
```
electron/audio/GeminiLiveRouter.ts(125,44): error TS2339: Property 'length' does not exist on type 'never'.
electron/ipcHandlers.ts(3433,18): error TS2339: Property 'canceled' does not exist on type 'string[]'.
electron/ipcHandlers.ts(3433,38): error TS2339: Property 'filePaths' does not exist on type 'string[]'.
electron/ipcHandlers.ts(3436,31): error TS2339: Property 'filePaths' does not exist on type 'string[]'.
electron/knowledge/KnowledgeOrchestrator.ts(349,35): error TS2322: Type 'CompanyDossier' is not assignable to type 'null'.
electron/knowledge/KnowledgeOrchestrator.ts(351,25): error TS2322: Type 'CompanyDossier' is not assignable to type 'null'.
```

### Full suite
Local clock was 19:18:46–19:19:55 (checked before starting: 19:18:37, well inside the "before 19:26"
window; finished 19:19:55, before the hedge probe's 19:28 start). From MAIN's root:
`node node_modules/vitest/vitest.mjs run` →
```
 Test Files  87 passed (87)
      Tests  796 passed (796)
```
0 failed. IntentClassifier.test.ts ran at 11/11 inside the full suite too (up from 794 total in the
fix-round-1 report because these 2 tests are new).

### Diff stat
HEAD confirmed at `08dcb8f83250814afd6f12b064d12d7eb30238ec`, matching the ruling.
`git -C $m diff --stat -- electron/knowledge/IntentClassifier.ts electron/knowledge/IntentClassifier.test.ts`:
```
 electron/knowledge/IntentClassifier.test.ts | 41 +++++++++++++++++++++++++++++
 electron/knowledge/IntentClassifier.ts      | 21 +++++++++++++--
 2 files changed, 60 insertions(+), 2 deletions(-)
```
(Cumulative against HEAD — fix rounds 0, 1 and 2 together; still nothing committed.)

### Self-review
- `TECHNICAL_CONTEXT`'s 21 terms match the ruling's list and order exactly (verified by reading the
  diff term-by-term); the comment is verbatim, confirmed by direct comparison against the ruling text.
- The `classifyIntent` negotiation line is untouched from fix round 1 — this round only needed to
  change what `TECHNICAL_CONTEXT` contains, not how it's used.
- The six round-1 "beats any pay term" cases and the three "no marker" cases all still pass (11/11
  GREEN includes them); I traced each of the six by hand first to confirm none depended on `'table'`
  or `'join'` specifically (they use `sql`/`query`/`regression`/`pipeline`), so dropping those two
  terms was safe for round 1's own tests.
- Diff touches only the two target files; no commit made; no subagent dispatched; no `.env` or
  credential file read.
- Formatting judgment call: the new `TECHNICAL_CONTEXT` array wraps across 3 lines, not 2, to hold the
  line width near the file's existing ~96–103 char convention (measured from `STRONG_NEGOTIATION` and
  the original `TECHNICAL_CONTEXT`). Flagging this in case "two-lines-per-row" meant something more
  literal than "keep it comma-packed and wrapped, not one-per-line."
- **Correction (made in place, flagged by the round-3 re-review):** the line below originally read
  "Residual, unchanged from fix round 1" — that was wrong. Dropping `'table'` and `'join'` does change
  behaviour from fix round 1: a technical question that relied on `'table'` alone, e.g. "Given the
  employee table, return each department's salary range.", was correctly vetoed to non-negotiation in
  fix round 1 (which still had `'table'` in the list) and is no longer vetoed now, falling back to
  NEGOTIATION. That is a regression against my own fix-round-1 state, not against HEAD: HEAD (before
  any of these three rounds) already sent this class of question to NEGOTIATION, because HEAD's
  `STRONG_NEGOTIATION` still held the bare word `'salary'`. So nothing regresses against HEAD, only
  against the intermediate state fix round 1 left behind — the corrected residual note follows.
- Residual: a technical question using pay vocabulary but none of the 21 `TECHNICAL_CONTEXT` terms and
  a strong phrase would still misroute to NEGOTIATION — true at HEAD, true in fix round 1, still true
  here (`'table'`/`'join'` questions are now back in this bucket, per the correction above). Newly
  possible after this round: a real negotiation question that happens to use one of the 21 markers as
  an ordinary word (e.g. a question combining "code" or "implement" with a strong pay phrase) would now
  be vetoed into a non-negotiation category — not tested, symmetric with the idiom risk the ruling just
  fixed for "table"/"join", but for the remaining 21 terms.

## Fix round 3

Fixing the re-review's accepted minor: speech-to-text never writes "SQL" — h40a's live R09 clip was
heard as "sequel", s50a heard "PostgreSQL" — so `'sql'` alone never fires on the spoken form of the
question this whole fix exists for. Round 2 was otherwise accepted with nothing new above Minor.

### What changed
- `electron/knowledge/IntentClassifier.ts`: added four terms immediately after `'sql'` in
  `TECHNICAL_CONTEXT` — `'sequel'`, `'postgresql'`, `'postgres'`, `'mysql'` — so the list now reads
  `sql, sequel, postgresql, postgres, mysql, query, queries, tables, database, databases, schema,
  schemas, column, columns, function, functions, algorithm, algorithms, regression, pipeline,
  pipelines, dataset, datasets, implement, code` (25 terms; both `postgresql` and `postgres` kept per
  the instruction, since whole-word matching means `postgres` alone would not match "postgresql").
  Rewrapped across the same 3-line style used in fix round 2 (97/96/100 chars, within the file's
  ~100-char convention). Appended one new comment line, verbatim, after "...are negotiation idioms.":
  `// "sequel", "postgres" and "mysql" are how the transcript spells SQL.` — kept as its own line
  rather than appended onto the "idioms." sentence, per "on its own // line(s)". Nothing else in the
  file changed.
- `electron/knowledge/IntentClassifier.test.ts`: added one test, verbatim from the instruction, right
  after `'a plural technical marker vetoes too (queries, tables, functions)'` and before `'still
  recognises real negotiation questions'`: `'the transcript\'s spellings of SQL are markers too
  ("sequel", "Postgres")'` (2 questions, both `.not.toBe(NEGOTIATION)`). Nothing else in the test file
  changed.

### TDD evidence
Test file copied to MAIN alone first (source still fix-round-2's 21-term list) for RED, then the
source fix copied in for GREEN.

RED — `node node_modules/vitest/vitest.mjs run electron/knowledge/IntentClassifier.test.ts` (19:37:10,
source still round-2):
```
 ❯ electron/knowledge/IntentClassifier.test.ts (12 tests | 1 failed) 51ms
   × classifyIntent — negotiation must need a negotiation word > the transcript's spellings of SQL are markers too ("sequel", "Postgres") 9ms
     → expected 'negotiation' not to be 'negotiation' // Object.is equality

 Test Files  1 failed (1)
      Tests  1 failed | 11 passed (12)
```
Failed on the first case ("Give me the sequel for each department's salary range.") — `'salary range'`
matched `STRONG_NEGOTIATION` and nothing in the round-2 `TECHNICAL_CONTEXT` list matched "sequel", so
no veto fired and it classified `negotiation`, exactly the failure the finding named. (The second case,
"Using Postgres, ...", was confirmed by the same trace: `'postgres'` was absent from the round-2 list
too, so it would fail the same way; the loop's thrown assertion stops after the first mismatch.)

GREEN — same command, after copying the fixed `IntentClassifier.ts` into MAIN (19:37:31):
```
 ✓ electron/knowledge/IntentClassifier.test.ts (12 tests) 31ms

 Test Files  1 passed (1)
      Tests  12 passed (12)
```
12/12: the 11 from fix round 2 (unaffected — adding four terms after `'sql'` cannot remove a match any
existing test relied on) plus the 1 new one.

### tsc
`node node_modules/typescript/bin/tsc -p electron/tsconfig.json --noEmit` (19:37:51) → exactly the same
6 pre-existing errors as fix rounds 1 and 2, none in IntentClassifier:
```
electron/audio/GeminiLiveRouter.ts(125,44): error TS2339: Property 'length' does not exist on type 'never'.
electron/ipcHandlers.ts(3433,18): error TS2339: Property 'canceled' does not exist on type 'string[]'.
electron/ipcHandlers.ts(3433,38): error TS2339: Property 'filePaths' does not exist on type 'string[]'.
electron/ipcHandlers.ts(3436,31): error TS2339: Property 'filePaths' does not exist on type 'string[]'.
electron/knowledge/KnowledgeOrchestrator.ts(349,35): error TS2322: Type 'CompanyDossier' is not assignable to type 'null'.
electron/knowledge/KnowledgeOrchestrator.ts(351,25): error TS2322: Type 'CompanyDossier' is not assignable to type 'null'.
```

### Full suite
Skipped. Local clock read 19:35:52 before starting and 19:37:51 at the tsc check — inside the
19:28–19:56 H1 probe window the whole time, never past 19:56. Per instruction, not run; the controller
runs it before the commit.

### Diff stat
HEAD confirmed at `08dcb8f83250814afd6f12b064d12d7eb30238ec`, matching.
`git -C $m diff --stat -- electron/knowledge/IntentClassifier.ts electron/knowledge/IntentClassifier.test.ts`:
```
 electron/knowledge/IntentClassifier.test.ts | 47 +++++++++++++++++++++++++++++
 electron/knowledge/IntentClassifier.ts      | 22 ++++++++++++--
 2 files changed, 67 insertions(+), 2 deletions(-)
```
(Cumulative against HEAD — fix rounds 0, 1, 2 and 3 together; still nothing committed.)

### Self-review
The four new terms sit immediately after `'sql'` in the correct order (`sequel, postgresql, postgres,
mysql`), both `postgresql` and `postgres` are present as the instruction requires, the comment addition
is verbatim and on its own line, the new test is verbatim and correctly placed, the diff touches only
the two target files, no commit was made, and the flawed "unchanged from fix round 1" residual claim in
the fix-round-2 section above is corrected in place (dropping `'table'`/`'join'` does change behaviour
from round 1's intermediate state for `'table'`-only technical questions, though not from HEAD).

## Fix round 4

Diff hunk (comment sentence only, `electron/knowledge/IntentClassifier.ts`):
```
-// "sequel", "postgres" and "mysql" are how the transcript spells SQL.
+// "sequel" is how the transcript writes SQL; "postgresql", "postgres" and "mysql" are the engine
+// names an interviewer says instead of it.
```
`node node_modules/vitest/vitest.mjs run electron/knowledge/IntentClassifier.test.ts` → `Tests  12 passed (12)`.
`node node_modules/typescript/bin/tsc -p electron/tsconfig.json --noEmit` → the same 6 pre-existing errors (GeminiLiveRouter, ipcHandlers ×3, KnowledgeOrchestrator ×2), none in IntentClassifier.
