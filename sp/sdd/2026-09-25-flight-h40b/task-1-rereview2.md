# Task 1 re-review 2 (fix round 2)

Reviewer: Opus 5.5, read-only, 2026-09-25 19:22–19:35 local. Scope: MAIN
`electron/knowledge/IntentClassifier.ts` and `IntentClassifier.test.ts` (uncommitted, against HEAD 08dcb8f).

**Verdict: all three findings are addressed. No new Critical or Important findings. 3 new Minor findings (M1–M3).**

## Evidence base

- **The working tree matches the package.** I extracted `08dcb8f:` copies through the shared object
  database and ran `diff -U10` against MAIN's files. The hunk bodies are identical to
  `review-task1-fix2.diff`. File mtimes are 19:18:11 (.ts) and 19:17:41 (test). Neither file changed
  during this review.
- **Round 1 to round 2 delta.** I diffed the hunk bodies of `review-task1-fix1.diff` against
  `review-task1-fix2.diff`. Only three things changed: the comment, the list, and the two new tests,
  placed between "a pay question without a technical marker…" and "still recognises…". The
  `classifyIntent` veto line (ts:70) is byte-identical to round 1.
- **Test run.** At 19:23:20, before the 19:30 probe window, I ran
  `node node_modules/vitest/vitest.mjs run electron/knowledge/IntentClassifier.test.ts` from MAIN's
  root. Result: `Tests 11 passed (11)`. I did not run tsc or the full suite. The implementer's tsc and
  full-suite runs (19:18:37, 19:18:46–19:19:55) came after both files' last write, so they cover this
  content.
- **Probe** (`scratchpad/rr2/probe.mjs`, `probe2.mjs`, `probe3.mjs`, throwaway):
  - The probe loads MAIN's real `IntentClassifier.ts` through `esbuild.transformSync` and reads the
    `IntentType` values from `types.ts`.
  - It replicates the 11 tests. Every question string is checked verbatim against the test file, so
    the probe fails loudly if it drifts.
  - Calibration against known answers:
    - The current source gives 0 failing tests, which matches vitest.
    - The HEAD source fails 4 tests (holdout45, R09, marker-beats-pay, plural).
    - The round-1 14-term list fails exactly "idiom" and "plural", which matches the implementer's
      reported RED (2 failed / 9 passed).
- **The list matches the ruling.** It has 21 terms and a programmatic compare to the ruling's list
  and order returns `true`.
- **The comment is verbatim.** I joined the 6 `//` lines and compared them to the ruling text: `true`.
  I calibrated the compare with a one-character alteration, which gives `false`.

## Previous findings

| # | Finding | Status | Evidence |
|---|---|---|---|
| 1 | Important: 'table'/'join' vetoed real negotiation questions | **ADDRESSED** | Both terms are gone from TECHNICAL_CONTEXT (ts:45-49). The new test at test:44-50 holds both quoted questions plus a third ("Is equity on the table…"), and all three classify `negotiation` (probe). So they reach the NEGOTIATION branches again: KnowledgeOrchestrator.ts:363 (coaching card) and :391 (salary block). The test pins the behaviour: re-adding `'table'` fails it, and so does re-adding `'join'` (mutation, below). |
| 2 | Minor: whole-word match missed plurals | **ADDRESSED** (as the ruling scoped it) | All four named plurals (queries, tables, functions, columns) are markers now, plus databases, schemas, algorithms, pipelines and datasets. The new test at test:51-57 pins queries, tables and functions: removing any one of them fails it. `columns` and the other five added plurals are pinned by no test. The title names only its three, so this is acceptable. Other inflections remain uncovered (see (2) below). They sit outside the finding. |
| 3 | Minor: the comment read backwards | **ADDRESSED** | The comment (ts:39-44) now opens "A marker vetoes NEGOTIATION." It names both error directions and their costs, and why table/join are excluded. It is verbatim to the ruling. |

## The controller's questions

### (1) Does any marker newly veto a plausible real negotiation question?

Compared with the round-1 list, only the 9 plurals are new vetoes. Of those, only **'queries'** is
plausible in negotiation speech. British and Indian English use "queries" to mean "questions":

- "Do you have any queries about the compensation package?" becomes `general`. It was `negotiation`
  under round 1.
- "across functions" (from 'functions') is a weaker second case.

The implementer named 'code' and 'implement'. My judgement of their likelihood in interviewer speech:

- **'code': low.** The realistic case is US geo-pay, for example "Our salary range is adjusted by zip
  code…". That becomes `technical`.
- **'implement': very low.**

Three round-1 carry-overs are more plausible in recruiter speech than either of those:

- 'pipeline': "We have other candidates in the pipeline, so what salary would it take?" becomes `general`.
- 'function': "Our salary range for this function is 90 to 110k…" becomes `technical`.
- 'functions': "…the same across functions, so what salary would work for you?" becomes `general`.

None of these comes close to how often "on the table" and "join us" occur. All of them fall in the
direction the comment calls milder: an ordinary answer without the salary block.

**They need a recorded trade-off, not a test.** A test would pin a known-wrong outcome. Dropping any
of these markers would reopen the technical side it protects. For example, `-pipeline` fails the
round-1 test "Design a pipeline that ingests equity trades…". See M2.

### (2) Does hasWord treat each of the 21 terms correctly?

Yes, as whole words. All 21 are plain `[a-z]+`, so the escaping has no effect. A match needs a
non-alphanumeric character or a string edge on both sides. Hyphen, slash, apostrophe and underscore
count as boundaries, so `t-sql`, `pl/sql`, `sql's`, `source-code` and `sub-query` all match.

It does not match inside compounds or inflections:

- `mysql`, `nosql`, `postgresql`, `sqlite`, `sparksql`
- `coding`, `codes`
- `implementation`, `implemented`, `implementing`
- `subquery`, `querying`
- `regressions`, `functional`, "data set"

This follows hasWord's own contract ("base" must not match "database"), so it is intended. It
matters for the veto only when a strong phrase co-occurs with no other marker.

It matters more than the mysql/postgresql example suggests, because the STT produces these forms
live:

- The h40a R09 clip itself was transcribed as "Give me the **sequel** for the second highest salary…"
  (`electron/test/golden/passes/2026-09-24T08-20-12-h40a.md:808`).
- s50a transcribed "Write **PostgreSQL** that counts support calls…" (`…/2026-09-09T15-00-55-s50a.md:613`).

See M1.

### (3) Do the two new tests pin the behaviour?

Yes. Mutation results, run in memory on the real source:

| Mutation | Tests that fail |
|---|---|
| `+table` | idiom |
| `+join` | idiom |
| `-queries` | plural |
| `-tables` | plural |
| `-functions` | plural |
| `-all 9 plurals` | plural |
| `-sql`, `-query`, `-regression`, `-pipeline` | marker-beats-pay |
| empty list | marker-beats-pay, plural |

Removing any of the other 14 markers leaves all 11 tests green: database, databases, schema, schemas,
column, columns, function, algorithm, algorithms, pipelines, dataset, datasets, implement, code. That
is acceptable for a keyword list and is recorded here only.

### (4) Check order and where the six new questions land

INTRO runs first, then the vetoed NEGOTIATION, then COMPANY, PROFILE and TECHNICAL. None of the six
questions hits INTRO.

| Question | Lands on | Why |
|---|---|---|
| "A signing bonus is also on the table…" | `negotiation` | |
| "What salary would it take for you to join us?" | `negotiation` | |
| "Is equity on the table for you…" | `negotiation` | |
| "Write queries that return each department's salary range." | `technical` | TECHNICAL_KEYWORDS 'write' |
| "Given the employees and departments tables…" | `general` | |
| "Use window functions to rank employees by base salary…" | `general` | TECHNICAL_KEYWORDS has 'function' but not 'functions' |

`general` versus `technical` makes no difference to the only consumer. KnowledgeOrchestrator.processQuestion
(:311) branches only on PROFILE_DETAIL (:319, maxNodes 12) and NEGOTIATION (:363, :391).

An aside outside the six: the round-1 question "Train a regression model… years of experience" lands on
`profile_detail` ('experience'). That only raises the node cap. It follows from the existing check order
and is harmless.

### Three-line wrap

It does not matter. The line widths are 96, 92 and 60, in line with STRONG_NEGOTIATION's 98, 97, 103
and 65. A two-line wrap would need lines of about 123 characters, wider than any list line in the file.
It does not block.

## New findings

**Critical:** none. **Important:** none.

**Relative to committed HEAD, the change is monotone.** Every question classified `negotiation` now
was `negotiation` at HEAD. Every new strong phrase contains 'salary' as a whole word, the veto only
removes, and the rest of the flow is unchanged. Probe 3 checked this over 257 questions (3 rosters,
test strings, extras) and found 0 exceptions. So no technical question is newly sent to the card.
Every risk below is either a residual or the milder direction.

### M1 (Minor). The 'sql' marker misses the live transcript forms of "SQL" (ts:46, hasWord ts:59-61)

The comment motivates the veto with R09. That clip reached the app as "Give me the **sequel** for…"
(h40a.md:808), and s50a heard "Write **PostgreSQL** that…" (s50a.md:613). hasWord's whole-word match
fires on neither.

Probe results:

- "Give me the sequel for each department's salary range." gives `negotiation` (card).
- "Write PostgreSQL that returns each department's salary range." gives `negotiation` (card).
- The actual R09 transcript is safe: it gives `general`. That comes from the round-0 phrase narrowing,
  not the veto.
- The R09 unit test (test:24-26) uses the roster spelling "SQL", so it cannot see this.

The likelihood is low: 0 of 221 roster questions carry any strong phrase. The mitigation is cheap and
near-free of false vetoes, because none of these words occurs in negotiation speech:

- Add 'sequel' as a marker, and optionally 'postgresql', 'postgres' and 'mysql'.
- Optionally, add the heard R09 text as a `.not.toBe(NEGOTIATION)` case.

The list is ruled at exactly 21 terms, so this is the controller's call. Otherwise record it as a
residual.

### M2 (Minor). Record the negotiation-side trade-off with its likelier idioms (task report / pass record)

The report names only 'code' and 'implement'. The likelier false vetoes are these:

- 'queries': British/Indian "any queries about the compensation package". New in round 2.
- 'pipeline': "other candidates in the pipeline".
- 'function' and 'functions': "for this function", "across functions".

Each drops the coaching card and salary block for that utterance. No test is needed. Name them in the
report or pass record as the accepted cost.

### M3 (Minor). The report's residual is misstated as "unchanged from fix round 1" (task-1-report.md, Fix round 2 self-review)

Dropping 'table' and 'join' moved part of the R09 class back to the card compared with round 1. These
were vetoed under round 1 and are `negotiation` now:

- "Given the employee table, return each department's salary range."
- "From the employees table, compute each employee's base salary plus bonus."
- "Join employees to departments and return each department's salary range."
- "Design a table for equity trades."

Singular "the employees table" is the common spoken SQL phrasing. None of these regresses against
HEAD (see the monotonicity note above), and the trade-off is the ruling's choice. The report and pass
record should still state it as the cost of excluding table and join, not as unchanged.

## Not re-litigated

Round-0 phrase-list residuals are already named in the report ("Let's talk salary."). For example,
"How much salary do you expect?" is `negotiation` at HEAD and `general` now.
