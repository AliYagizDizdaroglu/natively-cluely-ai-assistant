# Round 2: re-check of the early close (revision 1) and first review of the offers-before-answer spec and plan

Opus reviewer, 2026-09-30 evening. I was read-only: I ran no test, build or type check, and I did not open a key, `.env`,
a captured prompt, a `*.json` row file or a run-log body. Every behavioural claim below comes from my own copies,
which I ran under node from `SP\cue-group\review-scratch\`. The copies are the BUILT dist's parser and chain
(`model.cjs`, `04-seam.cjs`), plus the offers plan's Edits A, C and D copied line for line (`offers-model.cjs`).

**Task 1 (early close): ready with fixes (one stale line); Task 1b: ready; the offers task: ready with fixes (test
messages and test hygiene only; the plan's code is right as written).**

**Counts: Critical 0, Important 1, Minor 8.**

**Before the implementer is dispatched:**
1. **(Important I1, all three tasks.)** The `Natively-*` guard cannot see ET38 or any other live test started from a
   shell. The day ledger (19:48) starts ET38 as a background `node SP/et38/go-et38.mjs`, not as a scheduled task. Either
   finish the three tasks' test and tsc runs before ET38 starts, or hold the implementers while it runs.
2. **(m1, Task 1.)** The plan's starting state is stale. HEAD is now `e49886c`, the 19:17 docs-only commit, not
   `416d4de`. `git status --short` shows two files, not three, because `PREREGISTER-cueprobe.md` is committed. Fix
   plan line 15 and line 28, and Step 6's "`416d4de` changed no test". Telling the implementer in the dispatch message
   is enough.
3. **(m2, offers.)** Step 2 names the wrong first failing assertion for the 12 rows. It is `shownAfter` received
   `-1`, not "received `out ''`". Mutant (a)'s Task 1 row fails on `reportedAfter`, not `shownAfter`.
4. **(m3, offers.)** The log-line test does not restore its spy when it fails. In RED it fails, so `console.warn`
   stays mocked for the rest of the file. That changes no count today, but it is a trap. Separately, GREEN prints the
   warn line to stderr 26 times (27 with D4). Either put `mockRestore` in a `finally` (or add a describe-level
   `beforeEach` spy and `afterEach(() => vi.restoreAllMocks())`), or tell the implementer that the stderr lines are
   expected.

---

## Part A: the early close, scoped re-check

| # | Status | What is left |
|---|---|---|
| I1 predicate hole | ADDRESSED | Spec §2.1, plan Edit A: `/^\d+\s*(\|\s*.*)?$/` on `trim()`. Row 10 (`2|\rb`) is in the table. Step 5's two mutants each fail exactly one row (my model: `trimStart` fails only `2| Spa\r`, the draft regex fails only `2|\rb`). The only other CR among the new cases is the lone-CR row, which both mutants still hold, and no pre-existing case holds a CR. So the counts are `1 failed \| 104 passed (105)` twice. |
| I2 timing expectation | ADDRESSED | Spec §8.2 has the band. `holdVerdict` implements it exactly (see below). |
| I3 "same bytes" | ADDRESSED | §2.2, §2.4, the commit message ("joined prose"), the `CUE_RULE` hash check in the closing section, item 3. |
| I4 the run rebuilds dist | ADDRESSED | Closing section item 1. The launcher guards are the controller's (`dist-proof.mjs`, `edit-launcher-resmoke3.mjs`); I did not review them. |
| I5 Task 2 | ADDRESSED | Task 2 is gone. The offers spec and plan exist, and the marker counts are 3 and 1. |
| I6 median | ADDRESSED | "9.5" now appears only in the spec's two history sentences (lines 8, 37). |
| I7 Running check | ADDRESSED for scheduled tasks | The guard is the first line of every vitest and tsc block in both plans and in Task 1b, and Step 6 prints the next run time first. It is blind to non-scheduled live tests (Important I1). |
| M1 D3 | ADDRESSED | My chain copy passes D3 (see below). |
| M2 printed lines / three files | PARTLY | The printed lines are right. "Three modified files" and "HEAD `416d4de`" went stale at 19:17 (m1). |
| M3 bar numbers | ADDRESSED | Spec §5, closing section item 5. |
| M4 launcher deadline | Not visible here | The ledger says the dry run's deadline is 09:00. The runbook and launcher were not in my reading list. |
| M5 smoke read | ADDRESSED | Spec §8.2's two notes, closing section item 7. |
| M6 spec sentences | ADDRESSED | §3.1, §5, §7, §1 (the self-review lists them; I spot-read §7 and §9). |
| M7 pointer lines | ADDRESSED | `2026-09-20-cue-mode-design.md:71` and `2026-09-30-cue-mode-small-cues.md:648` each carry one. Friday's pre-registration is closing section item 6. |
| M8 hold-read weak spots | ADDRESSED | `holdVerdict`, B per row, empty block, negative R1 named. The calibration prints 47 OK lines plus `HOLD-READ CALIBRATION OK`. |
| M9 Task 1b | ADDRESSED | No literal line separators remain. See Task 1b below. |

**New errors from the revision.** I found none in the code or the numbers. I re-derived the following:
- 17 rows (10 held, 7 closing); 7 fail today and 0 after.
- 27 new cases (1 + 5 + 17 + 1 + 1, plus D2 and D3).
- RED `15 failed | 98 passed (113)`, GREEN 113, the three untouched seam files 18.
- Suite `1031 passed | 8 skipped (1039)`; the test-file count stays 102, since no file is added.
- Marker 2 after Task 1 alone, 3 combined.

The anchors of Edits A, B and C match the source at `e3fae5f` exactly: lines 328-329, 375-378 and 419-427. The only
stale text is m1. The TypeScript note after Edit C holds: after the complete-line loop, `phase` is
`'block' | 'prose'`.

**Task 2 has left the plan.** The closing section hands the runbook seven items, and nothing in it is an implementer
step. The implementer needs nothing beyond the task.

**Spec §8.2's band against `holdVerdict`.** They agree on every clause:
- counted = a won-by line, a non-empty block reported after it (`r1 >= 0`), words above 0, and T ≥ 50;
- the 15 ms limit is strict;
- NO VERDICT under 12;
- NO VERDICT when a counted answer has no first-token line, tested before GONE/NOT GONE;
- GONE = `hR2*4 <= n && hB*4 <= n`;
- NOT GONE = `hR2*2 >= n || hB*2 >= n`.

The calibration pins every boundary: 11 gives no verdict, 3 of 12 is GONE, 4 of 12 is no verdict, 6 of 12 is NOT
GONE, B-only NOT GONE, 15 ms, 49 and 50 ms, and no first-token line. The 16:12 read is n 21, h_R2 15, h_B 16, NOT
GONE, with the block-only answer and the one 17 ms stream left out. This is the band I proposed, and I would defend
it as written.

The added "no first-token line" clause can mask a NOT GONE that R2 alone would show. That does not matter, because
§8.2 gives NO VERDICT and NOT GONE the same consequence. One number to compare with care is m7.

**State 19 (a second `__CUES__` line).** Leaving it is right: it is 1 of 624 saved replies, 0 of 54 on the shipped
wording and 0 of 45 live answers. The early close does not make it worse. In my chain copy, all three builds show
the same text, `__CUES__\n<prose>`, with the same cues and the same offers. Only the report moves earlier (to the
`_` of the second sentinel). The follow-up is bigger than the spec says (m8).

**Task 1b: ready.**
- `ipcHandlers.ts` holds exactly the three pinned lines: line 16 (no trailing semicolon, as the brief expects), 546
  and 559.
- It holds exactly one `streamVerbalWithGeminiFlash(` call, line 576, which matches the brief's string.
- The blank-line anchor sits on lines 543-544.
- The old text of the `chains.test.ts` edits matches lines 3-4 and 14-16.
- The guard is in every test block.
- The expected state (HEAD = Task 1's commit, two user files) is already right for today's tree.

---

## Part B: the offers block before the answer

### B1. The rule: the plan's code against the built filter (`offers-model.cjs`, `21-offers-fuzz.cjs`)

**Exhaustive run.** Every sequence of 1-5 tokens from `__MORE__`, `\n`, `1| a`, `2| b`, `x`, space, `_`, `1`, `|`
and `\r`, cut six ways: 111,110 texts (15,821 of them with a leading block), 666,660 runs.

**Random run.** 60,000 texts from 33 tokens, including `\r\n`, U+2028, `__CUES__`, `__init__`, `2|\rc d` and
digit-led prose, cut six ways: 360,000 runs (39,489 texts with a leading block).

Both runs found 0 violations of each property:
- **(a) Answer first:** the streaming output and the offers are identical to the BUILT `stripSuggestionBlock`, and
  the whole-string answer is identical to the BUILT `extractSuggestions`.
- **(b)** The sentinel never reaches the output.
- **(c) Offers only:** nothing but whitespace is shown.
- **(d)** The callback fires exactly once.
- **(e)** Streaming equals whole-string (answer and offers), and no text's output depends on its chunking.

The 12 pre-existing `extractSuggestions` and `stripSuggestionBlock` cases pass after the change and under both
mutants. `offersIn` in place of `extractSuggestions(SENTINEL + tail)` is right: the old call would take the new
leading branch. It is equivalent to the old tail parse.

### B2. The predicate does not inherit I1's hole

Lead phase row 3 (`2|\rc d`) pins a CR after the bar for an offer line. Under mutant (a), the draft regex on the
shared constant, exactly this row fails among the 38 new cases (`shownAfter` 2, expected 3), plus Task 1's `2|\rb`
row: `2 failed | 141 passed (143)`, as the plan says. Mutant (b) (`if (false)`) fails exactly two cases: the stray-line
pin (received `'Answer first.\nHere is more:\n1| a b\n'`, offers `[]`) and the log-line case (it fails on its second
expect).

### B3. The tests

**RED today** (after Task 1 and 1b, which do not touch these paths): 24 of 38 parser cases fail and 14 pass, plus
the chain case fails and D4 passes. That gives `Test Files  2 failed | 1 passed (3)` and `Tests  25 failed | 131
passed (156)`. The failing names, and the passing 15 (2 + 5 + 1 + 1 + 5 + D4), match Step 2's list.

The release matrix's `shownAfter` is 54, 18, 8 and 2 of 147, 49, 21 and 4 chunks, which I computed from the text.

**GREEN:** 38 of 38, the chain case, and D4. That gives `156 passed (156)`; the two untouched seam files are
`15 passed (15)` and the suite is `1071 passed | 8 skipped (1079)`.

**Anchors, after Task 1's edits:**
- 1a: the `cutAtWordBudget` describe, line 286, occurs once.
- 1b: the end of `WhatToAnswerLLM.cues.test.ts`, verbatim.
- 1c: case E, line 136, verbatim. D3 is inserted before it by Task 1, so "after D3" holds.
- Edit A: the `cuePhrase` line, 329, occurs once; Task 1 inserts its constant between `CUE_LINE` and this line.
- Edit B: its two comment lines are Task 1's Edit A text verbatim.
- Edits C and D: the old text is lines 241-271 and 273-312 verbatim.

`vi`, `extractSuggestions`, `stripSuggestionBlock` and `type Suggestion` are already imported on lines 1-2. The chain
case's argument slots match `generateStream`: `onSuggestions` sixth (line 193), `onCues` eighth (line 201).

By reading, the forward references (`CUE_LINE`, `CUE_LINE_PREFIX`, `suggestionOf`, `offersIn` used inside function
bodies) and Edit D's `phase` narrowing compile. The `phase` union survives the loop's back-edges, so no comparison is
of disjoint types. The Step 6 type check is the proof, and I ran none.

### B4. The seam (`22-offers-seam.cjs`: the chain of `generateStream` with the built filters and four parser/guard combinations)

| The plan's chain case (cue block, offers, blank line, one paragraph) at chunk sizes 1, 3, 5, 7, 40, whole | shown | cues reported | warn line | first token |
|---|---|---|---|---|
| `e3fae5f` | `''`, so the substitute | when the complete `__MORE__` line arrives | none | none |
| Task 1 alone (RED state) | `''`: fails on `out.trim()` only, as the plan says | on the `_` (size 5: raw chunk 9) | none | none |
| Task 1 + offers | the prose, 19 words; all five assertions hold | on the `_` (chunk 9) | once (chunk 11) | chunk 23 (the prose starts in chunk 22; one chunk of the fence carry and line-filter hold) |
| offers alone | the same: the fix does not depend on the early close | on the complete `__MORE__` line | once | chunk 23 |

**The redirect window (I5.3)** is stated in spec §3.3, §5 and §7.7. D4 passes on all three builds, as the plan says.
It pins at chain level that the lead phase shows nothing: if it yielded anything, `started` would turn true and the
redirect would not run. The neighbouring cases:
- **Dies right after the `_`:** `e3fae5f` shows the redirect's cues. Task 1 and Task 1 + offers show the dead stream's
  cue. This is D3's shape, and D3 pins it.
- **Dies two characters into the answer:** redirected on all builds.
- **Dies after the answer's first words were shown:** `e3fae5f` and Task 1 redirect, because nothing had been shown.
  Task 1 + offers shows `Ten million vecto[No answer — …]`, D2's contract. This is the one seam behaviour this fix
  changes. §5 states it, and D2 pins it for the ordinary shape.

**What the candidate sees on the combined build.** Chunk sizes 1, 4, 9, 40 and whole give the same result in every
state, and answer-first output is identical to `e3fae5f`.
- Offers first: the answer, with or without a blank line before it, including a digit-led answer and a two-paragraph
  answer.
- Offers only: `''` and the substitute, with the warn line.
- Answer first: unchanged, no warn line.
- A leading block, then the answer, then a trailing block: the answer and both sets of offers.
- The accepted edge (row 16): `…\n2| offer two` is shown, and one offer is lost.
- A second `__CUES__` line: the same leak as today.
- No cue block, offers first: the answer.
- An answer opening with a preamble or a list marker: the line filter rewrites or strips it exactly as it does for
  an answer-first reply.

### B5. Logs and harness

- `console.warn` goes to `natively_debug.log` as `[WARN] …` (`main.ts:132-134`), and `filterCodeFences:206` sets the
  precedent.
- The smoke check's sequence filter (cues, full and abort lines) and `hold-read.mjs`'s parser ignore the new line.
- Nothing under `electron/` or `src/` reads `[WARN]` or `[verbalStreamFilter]` lines.
- `answers.mjs:188,261`, `chains.mjs:89` and `run.mjs:207` use the built guard. After the build their arms show
  offers-first answers, and they print the line on stderr (§4 says so).
- The chains source-text pin is untouched.
- The probe's `spokenWords` goes through the built `extractSuggestions`, so it follows the build. The controller's
  `cal-probe-shipped.mjs` already carries the `FIXED ? 5 : 0` case.
- The engine passes no `onSuggestions` (the chips are not wired), and nothing in `src/` uses the offers.
- The markers are right by reading, because esbuild strips comments:
  - `offers block before the spoken answer`: 1 line, the warn call.
  - `CUE_LINE_PREFIX`: 3 lines in the combined build.

### B6. What an implementer would have to guess

Nothing in the code. Every edit carries its full old and new text, and I checked every anchor. The guesses are the
messages and hygiene items m2 and m3. The guard sits in every vitest and tsc block, and Step 6 prints the next run
times. The scheduled `Natively-*` tasks are covered. ET38 and any hand-started flight are not (I1).

### B7. What the spec does not cover and should say

m5, m6, and the evidence precision in m4.

---

## Findings

### Important

**I1. The guard gives an assurance it cannot keep for a live test that is not a scheduled task.**
- **Where:** all three documents' constraints ("A live audio test may be running on this machine … Every block …
  refuses BY ITSELF"), and the day ledger (`2026-09-30-cue-mode-small-cues/progress.md`) at 19:32 and 19:48
  ("`node SP/et38/go-et38.mjs` in the background", "not before 20:25").
- **What is wrong:** `Get-ScheduledTask -TaskName 'Natively-*'` sees only Task Scheduler entries. ET38, as the ledger
  plans it, is a background node process. So would any flight started from a terminal be.
- **Why it matters:** ET38 has pre-registered speed criteria (first word p50 ≤ 6.6 s, p90 ≤ 14.6 s). A full vitest
  suite plus two `tsc` runs, several minutes of CPU per task and three tasks, running beside it is exactly what the
  "run no test" rule forbids me. The implementers would run it believing the guard protects the test.
- **Fix:** sequence it. The ledger's 19:17 line already says ET38 runs "only if the cue build is armed by about 00:30",
  which implies after the tasks. Make that explicit before 20:25. Alternatively, let `go-et38.mjs` write a lock file
  and add one `Test-Path` to the guard line. No plan text needs to change if the controller sequences it.

### Minor

**m1. Task 1's starting state is stale.**
- **Where:** plan line 15 (HEAD `416d4de`), line 28 ("the three modified files"), Step 6 ("`416d4de` changed no test").
- **Evidence:** `git log -3` gives `e49886c` at 19:17, a docs(passes) commit of 4 `.md` files. `git status --short`
  shows only `interview60.report.md` and `natively_debug.log.1`.
- **Why it matters:** an implementer told "anything that did not match an expectation" may stop at Step 1.
- **Fix:** HEAD `e49886c` (two docs-only commits on `e3fae5f`; code as at `e3fae5f`), two modified files, and
  "`416d4de` and `e49886c` changed no test".

**m2. Offers Step 2 and Step 5 wording.**
- **Where:** plan line 259 (the 12 rows), line 569 (mutant (a)).
- **What is wrong:** each row's first expect is `expect(r.shownAfter).toBe(...)`. Today it fails with received `-1`,
  not "received `out ''`" (`20-offers-plan-cases.cjs`: all 12 rows fail on `shownAfter`). For mutant (a), Task 1's
  row reads `reportedAfter` (received 2, expected 3), and only this task's row reads `shownAfter`.
- **Why it matters:** the implementer is told that any other failure is a test-writing mistake.
- **Fix:** reword those two sentences.

**m3. The log-line test's spy.**
- **Where:** plan lines 173-181.
- **What is wrong:** `warn.mockRestore()` runs only if both expects pass. In RED the first expect fails, so the mock
  leaks into every later describe in the file. Nothing there reads `console.warn` (grep: no `console.` in the file),
  and vitest has no `restoreMocks`, so counts are unaffected. Separately, 26 unmocked leading-block streams in the
  describe, plus D4, print the warn line to stderr in GREEN.
- **Fix:** wrap the two runs in `try { … } finally { warn.mockRestore(); }`, or put a describe-level `beforeEach` spy
  with `afterEach(() => vi.restoreAllMocks())` (the log-line case then reads the shared spy). Otherwise add one sentence
  to Step 4: "stderr shows the offers-first line once per leading-block case; by design."

**m4. Evidence precision.**
- **Where:** Edit C's doc comment and the commit message ("9 of 366 saved 3.5-lite replies … threw that answer
  away").
- **Evidence** (`scan-rows-shown.all.out.txt`):
  - 9 of 366 3.5-lite replies lead with the block. 8 of them have an answer after it; S1Q07#3 has none.
  - The ninth answer that the fix recovers is 3.1-lite LOW (spike2 cap3 S1Q04F#3, 1 of 247). So "9 of 624 replies
    changed" and "9 of 366 on 3.5-lite" are different nines.
  - The per-model denominators sum to 625 with the no-cue arm (366 + 247 + 12). 624 counts replies with text. The
    spike4 strict-ex 3.5-lite HIGH arm shows "smallest shown 0 words" with "NOTHING shown 0", which is presumably the
    one row without text.
- **Fix:** "9 of 366 saved 3.5-lite replies lead with the block, 8 of them with an answer after it (and 1 of 247 on
  3.1-lite)". §1 of the spec is already right by model.

**m5. How to read the log line.**
- **Where:** spec §4, §6.2; plan runbook item 3.
- **What is wrong:**
  - The line fires for a true block-only reply whose offers lead (S1Q07#3's shape). The replay calibration counts 10
    lines, not 9. For that reply its text "(shown after it)" is false.
  - It fires once per stream, so an answer redirected after a death inside the block can write two lines.
  - §6.2's "confirmed … by the absence of a shown answer that the log line would have named" reads backwards for that
    shape.
- **Fix:** one reader rule in §6.2 and in the runbook: warn line + `budget: words=0` + substitute = a true block-only
  reply with leading offers; count answers, not lines, when a redirect follows. The literal can stay; the marker is the
  prefix.

**m6. A malformed leading block.**
- **Where:** spec §2.3 and §5.
- **Evidence** (`23-offers-leading-stray.cjs`, streaming equal to whole-string at 7 sizes):
  - Take `__MORE__`, then "Here is what I left out:", two offer lines, and the answer. After the fix the candidate
    sees the intro line, `1| a b`, `2| c d` and the answer, and no offer is reported. Today: nothing (the substitute).
  - The same happens with text on the sentinel's line, and with `- ` or `1.` offers.
  - Such a line in a trailing block is a known shape (the pre-existing test's "Here are some things I left out:").
    It appears in 0 of the 10 saved leading blocks.
- **Why it matters:** it is always better than today, but it is the leak the doc comment calls worse than a lost
  chip.
- **Fix:** one sentence in §5, the same class as row 16 and accepted. Optionally, one `extractSuggestions` case
  pinning it.

**m7. The "before" line of early-close spec §8.2 mixes populations.**
- **What is wrong:** "median R2 8 ms, median T 347 ms" are over the 21 counted answers. "median C 218.5 ms" is the
  script's C over 22 pairs; over the 21 counted it is 220. The script prints T median 312 (n 23) and R2 median 8
  (n 23) or 7 (n 22) (`hold-read.resmoke.v3.out.txt`).
- **Why it matters:** after the run, the operator compares the printout with these numbers. No verdict depends on
  them, but T 347 against 312 compares unlike populations.
- **Fix:** label each number's population, or quote the printed lines.

**m8. State 19's follow-up is not "a one-line rule".**
- **Where:** early-close spec §7 (line ~380), offers spec §7.4.
- **What is wrong:** with the early close, the partial `_` of a second `__CUES__` line already closes the block (`_`
  fails `CUE_LINE_PREFIX`). A rule in the complete-line loop would never see the line. The follow-up needs a
  sentinel-prefix hold in the block phase, the `extractCues` twin, and the rows.
- **Fix:** one sentence, so the later task is scoped right.

---

## What I did not check

- **Nothing was executed against the project.** No vitest, tsc or build. The type-check claims (forward references,
  `phase` narrowing, the tests' tuple types) are by reading. The real vitest failure messages were not observed.
- **The real `LLMHelper` and hedge were not run.** The D-series results come from my chain copy (the `04-seam.cjs`
  lineage), which is calibrated against D, D2 and D3's expectations in round 1.
- **The controller's operational files were not reviewed.** These are `RUNBOOK-resmoke2.md`, `dist-proof.mjs`,
  `edit-launcher-resmoke3.mjs`, `old-vs-new-replay.mjs` (I read only its calibration output) and
  `prereg-cuesmoke-amendment-resmoke2.md`. That includes the launcher deadline (M4) and the dist guards (I4).
- **The saved replies themselves were not opened** (the row files are off limits). The evidence is the scan, spike and
  replay outputs.
- **Several details were not checked:**
  - Task 1b's mutant failure blocks and their line counts.
  - The line endings of the source files against the Edit tool's multi-line anchors.
  - The wording of every revised spec section; I spot-read the ones my findings touch.

## Scripts (round 2, `SP\cue-group\review-scratch\`)

- `offers-model.cjs`: the offers plan's Edits A, C and D, line for line (with switches for mutants (a) and (b)).
- `20-offers-plan-cases.cjs`: the plan's 38 cases and the 12 pre-existing ones, run against today, after, and both
  mutants.
- `21-offers-fuzz.cjs`: properties (a)-(e), exhaustive and random, 1,026,660 runs.
- `22-offers-seam.cjs`: the chain case, D4 and its neighbours, and 11 states across four builds.
- `23-offers-leading-stray.cjs`: malformed leading blocks.
