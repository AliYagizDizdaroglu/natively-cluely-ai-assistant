# Task 1 re-review 3 (fix round 3)

Reviewer: Opus 5.5. Read-only. 2026-09-25, 19:40–19:52 local.

Scope:
- MAIN `electron/knowledge/IntentClassifier.ts` and `IntentClassifier.test.ts` (uncommitted, against HEAD 08dcb8f)
- The report's "Fix round 3" section and the corrected sentence in "Fix round 2"

**Verdict: all findings addressed.**
- M1 is **ADDRESSED**. Round 3 did exactly what was ruled and changed nothing else.
- No new Critical or Important findings.
- 2 new Minor findings (N1, N2). Both concern what gets written down, not how the code behaves.

## Evidence base

**The working tree matches the package.**
- MAIN's HEAD, read from its `.git` files, is branch `fix/coding-style-suffix-all-gemini` at `08dcb8f83250814afd6f12b064d12d7eb30238ec`.
- I extracted 08dcb8f's copies of both files with `git show` from this worktree, which shares MAIN's object database.
- I applied the hunks of `review-task1-fix3.diff` to them in memory. The results equal MAIN's files byte for byte (4461 and 5664 bytes).
- Calibration: a one-character change in the working copy reads `false`.

**File hygiene.**
- All four files (HEAD's and MAIN's) are LF only, with no CR, no BOM, no trailing whitespace and no tabs. Round 3 introduced no mixed line endings.

**Timeline.**
- The file mtimes are 19:37:26 (.ts) and 19:37:05 (test).
- The report's RED at 19:37:10 falls between the two writes: test file written, source not yet.
- GREEN at 19:37:31 and tsc at 19:37:51 both come after both writes.
- Neither file changed during this review. I checked the mtimes and sizes at 19:40:04 and again at 19:50:15.

**Round 3's delta, isolated.**
- I rebuilt the state re-review 2 approved: HEAD plus `review-task1-fix2.diff`. Re-review 2 had verified that this state equalled the tree at its time.
- I ran `diff -u` from that state to MAIN. The delta is exactly two hunks:
  - `.ts`: one comment line added after `// idioms.`, and the 3 list lines rewrapped with the 4 new terms after `'sql'`.
  - Test file: one 6-line `it(...)` inserted between the plural-marker test and "still recognises real negotiation questions".
- Nothing else changed:
  - The `classifyIntent` veto line (ts:71) is unchanged.
  - `STRONG_NEGOTIATION` is unchanged.
  - The other 11 tests are unchanged.

**Test run.**
- At 19:48:46 I ran the single file against MAIN: `node <MAIN>/node_modules/vitest/vitest.mjs run electron/knowledge/IntentClassifier.test.ts --root <MAIN>`.
- I ran it from a scratch cwd with `--root`, because this session is worktree-isolated. `--root` loads MAIN's config and files.
- Result: `Test Files 1 passed (1)`, `Tests 12 passed (12)`.
- I did not run tsc or the full suite. The H1 probe is running until 19:56, and the implementer's tsc run came after both writes.

**Probe** (`sdd/2026-09-25-flight-h40b/rr3/probe.mjs`, throwaway):
- It loads MAIN's real source through `esbuild.transformSync`, reusing re-review 2's loader.
- It replicates all 12 tests. Every string is checked verbatim against the test file, and the count of `it(` blocks (12) is checked too.
- Calibration against known answers:
  - Current source: 0 failing, which matches vitest.
  - Round-2 source: only the new test fails, which matches the implementer's reported RED (1 failed / 11 passed).
  - HEAD: 5 failing.

## The seven checks

### (1) The list is exactly the ruled 25, in order: YES

- A programmatic compare against `sql, sequel, postgresql, postgres, mysql, query, queries, tables, database, databases, schema, schemas, column, columns, function, functions, algorithm, algorithms, regression, pipeline, pipelines, dataset, datasets, implement, code` returns `true`. Calibration: swapping two terms reads `false`.
- Removing the 4 new terms leaves round 2's 21 terms in the same order. The new terms sit at positions 2–5.
- There are no duplicates.
- Every term is lowercase `[a-z]+`. This matters because `hasWord` lower-cases only the question, so a capitalised term would never match.
- The list lines are 97, 96 and 100 characters wide, as reported. That fits the file: STRONG_NEGOTIATION's lines are 98, 97, 103 and 65 (measured with awk).

### (2) The comment sentence is verbatim and last: YES

- The comment has 7 lines. The first 6 are byte-identical to round 2.
- The 7th line is exactly `// "sequel", "postgres" and "mysql" are how the transcript spells SQL.` (ts:45), directly above `const TECHNICAL_CONTEXT`.
- The joined comment equals the round-2 ruling text + `" "` + the new sentence: `true`. Calibration: dropping the final period reads `false`.

### (3) The new test is as ruled and pins 'sequel' and 'postgres': YES

The test matches the ruling:
- The title line is verbatim: `it('the transcript\'s spellings of SQL are markers too ("sequel", "Postgres")', () => {`.
- Both strings are verbatim, and both assert `.not.toBe(IntentType.NEGOTIATION)`.
- It sits between "a plural technical marker vetoes too…" and "still recognises real negotiation questions".

Mutation results, run in memory on the real source:

| Mutation | Tests that fail |
|---|---|
| `-sequel` | the new test |
| `-postgres` | the new test |
| all 4 new terms removed | the new test |
| `-postgresql` | none (12/12 green) |
| `-mysql` | none (12/12 green) |
| `-sql` (control) | marker-beats-pay |

**Why, from `hasWord`.** `hasWord` builds `(^|[^a-z0-9])TERM(?![a-z0-9])` over the lower-cased question. Both test strings carry the strong phrase 'salary range' and no other marker.
- "Using Postgres," lower-cases to "using postgres,". There 'postgres' is bounded by a space and a comma, so it matches. 'postgresql' would need "ql" after "postgres", so it does not.
- Remove 'postgres' and nothing vetoes the question, so 'salary range' returns NEGOTIATION.
- "sequel" does not contain the substring "sql" at all (s-e-q-u-e-l), so only 'sequel' can veto the first string.
- The ruling's reason for keeping both Postgres forms holds: `hasWord("postgresql", "postgres")` is `false`, because the lookahead rejects the "q".

**Two new terms are unpinned: 'postgresql' and 'mysql'.** They stand where re-review 2 left the untested plurals: recorded here, not a finding. Of the two, 'postgresql' is more likely to matter: the scenario50 roster uses it in five SQL questions ("Write PostgreSQL that…").

### (4) Nothing else changed versus the approved round-2 state: CONFIRMED

See "Round 3's delta, isolated" above. The report's diff stat (test +47; source +20/−2, total 67 insertions and 2 deletions) matches the package.

### (5) The single file passes 12/12: YES (my run, 19:48:46)

### (6) New false vetoes in negotiation speech: agreed, with one nuance (N1)

**As ordinary words, none of the four occurs in negotiation speech.**
- "sequel" as an English noun in a pay question is not a plausible utterance. The only one I could construct, "As a sequel to our last call, here is our salary offer.", is contrived.
- `hasWord` does not match inside other words: sequels, prequel, sequelize and mysqldump all read `n`.

**On real speech, round 3 changes nothing.**
- I classified all 579 `heard:` lines from every pass record. None of them carries a strong phrase, and none changes class between round 2 and round 3.
- The 221 roster questions: 0 changes. Six contain one of the new terms, but none of those has a strong phrase.

**One plausible route exists: a pay question that names the role's stack.** All three examples below were `negotiation` in round 2 and are `general` now:
- "What are your salary expectations for this senior Postgres role?"
- "This is a MySQL DBA position, so what salary range are you targeting?"
- "For a sequel developer role, what's your expected salary?" (this is how the STT would write "SQL developer")

**This is not a new class of error.**
- 'sql' has vetoed "For a SQL developer role, what's your expected salary?" since round 1. It is `technical` in rounds 1, 2 and 3.
- 'database' and 'pipeline' veto the same way.
- Round 3 extends that accepted trade-off to the spoken spelling and to two dialect names. The error falls in the milder direction.

### (7) The corrected round-2 sentence is now accurate: YES

The probe confirms the behaviour the correction states:

| Question | HEAD | Round 1 | Round 2 | Round 3 |
|---|---|---|---|---|
| "Given the employee table, return each department's salary range." | negotiation | general | negotiation | negotiation |
| M3's other three examples | negotiation | general | negotiation | negotiation |

- Across the 831-question corpus (221 roster questions, 31 test strings, 579 heard lines), 0 questions classify non-monotonically against HEAD. So "nothing regresses against HEAD" still holds after round 3.
- The residual line says "true in fix round 1". Its own parenthetical reconciles that: the table/join questions are back in the bucket.

One clause is narrower than the truth; no action needed. "because HEAD's STRONG_NEGOTIATION still held the bare word 'salary'" explains the salary-phrased example. But the whole class went to NEGOTIATION at HEAD because HEAD had no veto at all. For example, "Design a table for equity trades." (M3's fourth example) reached the card through 'equity'.

## Previous findings

| # | Finding | Status | Evidence |
|---|---|---|---|
| M1 | 'sql' misses the transcript forms of SQL | **ADDRESSED** | See the notes below this table. |
| M2 | Record the likelier negotiation idioms | Outside this round by ruling | The ruling sends it to the commit message (controller). Not checked here. |
| M3 | The report's residual misstated as "unchanged from fix round 1" | **ADDRESSED** | See (7). |

**M1 in detail.**
- Both of re-review 2's probe sentences now leave NEGOTIATION:
  - "Give me the sequel for each department's salary range." is now `general` (it was `negotiation`).
  - "Write PostgreSQL that returns each department's salary range." is now `technical` (it was `negotiation`).
- The same holds for these, both `negotiation` in round 2:
  - "In MySQL, return each department's salary range." is now `general`.
  - "Write the sequel that returns each department's salary range." is now `technical`.
- The heard R09 text itself stays `general`. It has no strong phrase, and round 0 already fixed it.
- The new test pins the fix: it fails if 'sequel' or 'postgres' is removed.

## New findings

**Critical:** none. **Important:** none.

### N1 (Minor). Record the stack-naming false veto with M2 in the commit message (records only)

The ruling states the cost as "an interviewer saying 'sequel' in a pay question — not a plausible utterance". That understates it slightly.
- The plausible case is a pay question that names the role: "…for this senior Postgres role?", "This is a MySQL DBA position…", "For a sequel developer role…".
- All three flip from `negotiation` to `general` in round 3. Each loses the coaching card and the salary block.
- It is the same class 'sql' has carried since round 1, and it falls in the milder direction.
- No test is needed; one would pin a known-wrong outcome.
- **Fix:** one clause in the trade-off list the controller is already writing into the commit message.

### N2 (Minor). The new comment's stated provenance is right only for "sequel" (IntentClassifier.ts:45)

The sentence is ruled verbatim, so this is the controller's call.

The evidence behind each term:
- **"sequel"** is a genuine STT rendering of "SQL". holdout40 R09 says "Give me the SQL for…", and the pipeline heard "Give me the sequel for…" (h40a.md:808).
- **"Postgres" / "PostgreSQL"** are the interviewer's own words, and the transcript reproduced them faithfully:
  - holdout40.questions.mjs:111 "shard a Postgres table" was heard as-is (h40a.md:895).
  - scenario50.questions.mjs:120 "Write PostgreSQL that counts support calls…" was heard as-is (s50a.md:613).
  - scenario50.questions.mjs:152 was heard as-is (s50a.md:985).
  - scenario50.questions.mjs:432, :440 and :480 also use "PostgreSQL".
- **"mysql"** appears in no roster question and in none of the 579 heard lines.

**What this means:**
- The markers themselves are sound. "PostgreSQL" is how the rosters name the language in five SQL questions.
- But "how the transcript spells SQL" is true only for "sequel". A later reader could take the comment to mean the STT turns "SQL" into "mysql".
- If the controller wants the provenance exact, one option: `"sequel" is how the transcript spells SQL; "postgres", "postgresql" and "mysql" are dialect names interviewers say instead of "SQL".`
- Behaviour and tests are unaffected either way.
- The test title has the same looseness: it calls "Postgres" a transcript spelling of SQL.

## Recorded, not findings

**Spoken forms round 3 does not cover.** Each stays `negotiation` when a strong phrase appears with no other marker:
- "S Q L" spelled out
- "SQLite"
- "BigQuery"
- the plural "sequels"

None of these occurs in the 579 heard lines or the rosters. They sit outside the ruling.

**Task 2's guard is unaffected.** `r09Missing` from `guard-r09.mjs` gives:
- Round-3 source: `null`.
- Round-2 source: `null`.
- HEAD: `still lists bare "salary"…` (calibration).

So the new comment line, which has quoted words followed by commas, does not trip the guard's comment sensitivity (T2-M1).

**The consumer is unchanged.** The new test's strings land on `general`, not `technical`. That makes no difference: the knowledge `classifyIntent` has one consumer, KnowledgeOrchestrator.ts:311. It branches only on PROFILE_DETAIL (:319) and NEGOTIATION (:363, :391). The `classifyIntent` calls in ipcHandlers.ts:538 and IntelligenceEngine.ts:391 go to the separate async classifier in `electron/llm`.

**One loose sentence in the report's round-3 section.** It says adding four terms "cannot remove a match any existing test relied on". That is true for the `.not.toBe(NEGOTIATION)` tests. For the `.toBe(NEGOTIATION)` tests it holds only because none of their strings contains a new term. The GREEN run proves the outcome. No action needed.
