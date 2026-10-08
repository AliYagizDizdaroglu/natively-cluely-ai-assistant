# Review: the early-close spec delta and its plan, before any code is written

Reviewed at docs head `416d4de` (code `e3fae5f`), 2026-09-30, 16:25 to 17:45 local. Read-only: no test, build or type
check was run, and nothing in the project was edited. The ledgers were read up to their 17:07 entries.

## Verdict

**Ready for the implementer? With fixes.**

- **Task 1 (the parser, its tests, D2) is sound once one regular expression is corrected.** I tried to break the rule
  on about 1.9 million parser runs. It differs from today's parser in exactly one class of input: a line terminator
  (CR, U+2028, U+2029) in the whitespace right after a cue line's bar. The controller found the same class (ledger,
  17:07) and its fix (`/^\d+\s*(\|\s*.*)?$/`) is right: I checked it independently, 0 differences.
- **Every number in Task 1's expected outputs is right** (list below), except the median 9.5, which is 6.5.
- **Task 2 (the operator's task) must be rewritten before anything is armed.** Its timing rule can fail a correct
  build, its proof of "which dist flew" is printed before the scheduled run's own build step, and since 17:07 it is no
  longer the plan for the run that will happen (one build with the offers fix).
- **One claim the spec leans on is not true as written:** "the same bytes, so the scored text is unchanged". The
  parser's bytes are the same; the pieces are not, and one filter behind the parser gives a different spoken text for
  different pieces (one construct: a typeset fraction).

Counts: **Critical 0, Important 7, Minor 9.**

What must be fixed when:

- **Before the implementer is dispatched:** I1 (the regular expression, its rows, its comment), I7 (the check that
  stops a test run), M2 (the expected output lines). M1 if the extra case is wanted.
- **Before the build and before anything is armed:** I2, I3, I4, I5, I6.

How I checked: I read the spec, the plan, the code and tests they name, and the chain behind the parser. For
behaviour I used a model: a line-for-line copy of the BUILT `stripCueBlock` plus the plan's Edit C, compared with the
built parser and the built `extractCues`. For the seam I copied `WhatToAnswerLLM`'s verbal chain and fed it through the
built filters. Sixteen small scripts and one shared model are in `SP\cue-group\review-scratch\` (list at the end);
each finding names the one it rests on. Before writing this file I ran them again and re-read every cited line.

---

## Critical (must fix)

None.

## Important (should fix before the step that depends on it)

### I1. The predicate releases a real cue line as prose (confirmed; the controller's fix is right)

- **Where:** spec section 2.1, lines 53-57 (the proof sentence) and section 2.2, lines 105-110 ("No wrong release");
  plan line 28 (spec values), Edit A (lines 203-210, the constant and its comment), Edit C's comment (lines 259-265),
  the commit message (line 335, "the same bytes for every input").
- **What is wrong.** `CUE_LINE` is `^(\d+)\s*\|\s*(.+)$`. After the bar it takes `\s*`, and `\s` matches CR, U+2028 and
  U+2029. `CUE_LINE_PREFIX` is `^\d+\s*(\|.*)?$`. After the bar it takes `.*`, and `.` does not match those three. So
  `1|<CR>abc` is a cue line (the cue `abc`) and fails the prefix test.
  - The sentence "every prefix of a string that matches `CUE_LINE` matches `CUE_LINE_PREFIX`" is false.
  - The sentence in section 2.2 about U+2028 ("the completed line fails `CUE_LINE`'s `(.+)$` the same way") is false
    when the separator sits in the whitespace after the bar.
- **Evidence (mine, independent of the controller's fuzz).**
  - `01-regex.cjs`: over 1,111,110 lines from 10 characters, 31,392 are cue lines; 5,464 of them have a partial that
    the spec's predicate releases. Every one has a CR or U+2028 after the bar.
  - `02-fuzz.cjs`: 967,053 exhaustive runs (3 heads, every tail up to 6 characters over `1 | a space LF CR`, every
    chunking up to length 5) and 360,000 random runs. The plan's parser differs from today's in 6,651 and 344 runs.
    All of them are this class. Nothing else: no prose taken as a cue, no byte twice, no byte lost, the report
    exactly once in every run, no empty yield. Today's streaming parser equals `extractCues` in every run.
  - One case: chunks `['__CUES__\n1| a\n', '1|\r1']`. Today: cues `a`, `1`, no prose. The plan: cue `a`, prose
    `1|\r1`.
- **Why it matters.** The candidate would see a cue line inside the answer text and one cue fewer. No measured answer
  has carried a bare CR after a bar, so the exposure is near zero. It matters because the spec's safety claim is a
  claim about every input, and the early close must be true by construction.
- **Fix.** Use the controller's `/^\d+\s*(\|\s*.*)?$/` (fable-revision-1.md, A2). I checked it on its own
  (`12-wide-predicate.cjs`):
  - 579,196 exhaustive runs, this time with U+2028 in the alphabet: 0 differences from today's parser (the spec's
    predicate: 3,648).
  - It is exact. Of 31,392 cue lines (up to 6 characters) none has a partial it releases, and of 1,495 partials it
    holds (up to 4 characters) none is one that no suffix can complete. Both also follow from the two expressions: a
    line terminator after the bar can only sit in `CUE_LINE`'s `\s*`, and the wide predicate has the same `\s*` there.
  - The revised rows behave as A2 says. 17 rows: 7 fail today (the closing rows), 0 fail after. With `trimStart()`
    exactly the CR row fails. With the spec's first regex exactly the new row (`'2|\rb'`) fails. So Step 5 can show
    both rows failing once.
  - A2's counts are right: 17 rows (10 held, 7 closing), 26 new cases, RED still 14, suite total 1030.
  - Also correct Edit A's comment. "A prefix that fails it cannot be completed into a match by any suffix" is true only
    with the corrected constant.
  - A simpler predicate, `/^\d+\s*(\||$)/`, is also correct (0 differences). I do not recommend it: with it `trim()` and
    `trimStart()` behave alike, and Step 5's `trimStart` calibration would have nothing to catch.

### I2. The timing expectation can fail a correct build and pass a broken one (answer to the controller's question)

- **Where:** spec section 8.2, lines 350-364; plan Task 2 Step 3, lines 460-470; `SP\cue-group\hold-read.mjs`
  `holdGone` (lines 84-91); ledger ruling 2; fable-revision-1.md section D (empty).
- **What R2 measures after the change.** From the raw chunk that carries the first prose character to the end of the
  stream. It is the engine's log line, not the screen: the cues are SENT with the first token, not at the report.
- **A correct early close can read "not gone".** If the first prose character arrives in the stream's last chunk, the
  cues line and the budget line are written together, with or without the hold. That covers a one-burst answer and an
  answer whose earlier chunks end inside the block. Nothing in the logs says which chunk carried the first prose
  character, so the rate (call it q) is unknown until the run.
- **A broken one can read "gone".**
  - A build that reports early and releases the prose late passes on R2. B (`first token` to `word budget`) catches
    it; R2 cannot.
  - An hour whose answers mostly have a line break in the prose has R2 above 15 ms with the hold too (8 of 22 at
    05:00, 6 of 21 this afternoon).
  - An empty block (`[]`) reports on the first chunk by the prefix branch. `hold-read.mjs` counts it as "a block".
- **The v2 "before", by my read of the finished folder with the controller's parser (`08-afternoon-read.mjs`,
  `11-hour-only.mjs`; times and counts only).** It agrees with `hold-read.resmoke.out.txt`.

  | read, answers with a non-empty block, prose and a won-by line | whole log (23 finished, 2 are the readiness probe's) | the hour only |
  |---|---|---|
  | stream T under 15 ms (one burst) | 0 | 0 |
  | T of 50 ms or more | 21 | 20 |
  | of those, R2 under 15 ms | 15 (71%) | 14 (70%) |
  | of those, B under 15 ms | 16 (76%) | 15 (75%) |
  | median R2 / median T | 8 ms / 347 ms | 7 ms / 349 ms |
  | median C (won-by to first token) | 220 ms | 218.5 ms |

  - No answer's stream lasted under 15 ms. The three small gaps the controller saw (7, 13, 32 ms) are R1, not T. Those
    answers' streams lasted 50, 17 and 50 ms.
  - The whole stream is short: median about 0.35 s, maximum 1.2 s. The model thinks for seconds and then writes the
    answer in a burst of a few chunks. That is why q matters.
- **Is the controller's replacement sounder?** Yes. Reading only T of 50 ms or more removes answers that cannot tell.
  This afternoon it removes one answer (17 ms), so it costs nothing. Three more changes are needed.
  1. **A share, not a count of 3, and a middle band.** Exact binomial tails (`13-binomial-d.cjs`), n = 20 or 21:

     | rule | a correct build fails it, q = 5% / 10% / 15% | a build with the hold passes it, h = 0.7 |
     |---|---|---|
     | at most 3 under 15 ms | 2% / 13-15% / 35-39% | under 0.05% |
     | at most 5 (a quarter) | under 0.05% / 1% / 7-8% | under 0.05% |

     The number I would defend: **GONE = at most a quarter of them (5 of 20-21); NOT GONE = at least half; in
     between = no verdict, read the rows.** With fewer than 12 such answers: no verdict.
     - A correct build then reads NOT GONE in 0.3% of runs or fewer, even at q = 20%.
     - A build with the hold reads NOT GONE in 97-98% of runs at the measured 70%, and GONE in under 0.05%.
  2. **The same share on B.** B is the screen-side read and the one with three no-cue baselines (1 of 47, 3 of 47, 0 of
     42). Require both R2 and B for GONE. Without B, a "report early, release late" build passes.
     `rows` needs B per answer for that: today it carries R1, R2, T and the words only.
  3. **Count only non-empty blocks,** and say that the log includes the readiness probe's two answers.
  - The cut at 50 ms is fine. At 100 ms it costs one more answer (the one at exactly 50 ms) and removes the most
    borderline case. The band matters more than the cut.
  - Keep "median R2 of 50 ms or more" if wanted: the hold's median is 8 ms. It adds little.
  - Report C beside them (before: median 218.5 ms; no-cue hours: 2 ms). It is the read closest to the screen. It gets
    no threshold: after the change it is the block's own streaming time, which nobody has measured.
- **Calibrate the rule on the one run that can.** The 05:00 run has no won-by lines, so a T-based rule says "no pair to
  read" there. The afternoon run is the rule's only known NOT GONE case (15 of 21, 16 of 21). Put it into
  `cal-hold-read.mjs` as a check, with boundary cases (T exactly 50, R2 exactly 15, an empty block, words=0). The
  line that prints "stream of 50 ms or more ..., of which R2 under 15 ms" is inside the CLI block today and has no
  case.
- **Could a broken early close still pass the replacement?** Yes, in two ways: the "report early, release late" build
  (closed by adding B), and an hour of mostly multi-paragraph answers (guard: the dist proof of I4 is read in every
  case, not only after a bad read).
- **The consequence in ruling 2 does not follow from the read.** The early close can only move a report earlier. The
  controller's fuzz has "later: 0 of 200,000", and my argument agrees: the new check is one more trigger in front of
  the two that exist. So:
  - NOT GONE with a wrong dist: the build is not done. Rebuild, re-smoke once.
  - NOT GONE or no verdict with a proven dist: the early close is in effect, and on those answers the stream gave it
    nothing to release (the first prose character came in the last chunk). There is nothing to repair in the parser,
    and a revert cannot improve the timing. The note reports the count, and the user decides whether that residual is
    acceptable.
  - R2 passes and B fails: the prose is waiting behind a later filter. That is a finding about the chain.
- **If a single number is wanted instead of a band: measure q first.** An offline probe that timestamps each piece of
  20-30 replies to the shipped prompt gives q directly: the share of replies whose first prose character is in the
  last piece. No app run is needed.

### I3. "The same bytes, so the scored text is unchanged" does not follow: the pieces change

- **Where:** spec section 2.3 (lines 126-130), section 4 (line 236, "prose only, the same bytes - unchanged"),
  section 8.2 (lines 366-368, "Why the bench and the probe are not re-run"); plan commit message (line 335); final
  review condition 1.
- **What is wrong.** Today a one-paragraph answer leaves `stripCueBlock` as ONE piece (the end flush). After the
  change it leaves in the pieces the source sent. The filters behind the parser then see different piece boundaries,
  and `stripSpokenNotation` is not piece-invariant.
- **Evidence (`06-chunk-invariance.cjs`, `07-which-notation.cjs`, `15-frac-only.cjs`; synthetic texts only).**
  - Prose `The ratio is $\frac{3,000}{9,500}$ overall and more.` under a cue block, fed one character at a time (the
    harness's feed, `interview60.answers.mjs:185-188`):
    - today's parser: `The ratio is 3,000 over 9,500 overall and more.`
    - the plan's parser: `The ratio is $3,000 over 9,500 overall and more.`
  - The cause is pre-existing and exists on MAIN without cues: the hold in `stripSpokenNotation` splits a
    `$\frac{a}{b}$` pair when the space or the full stop after it arrives in a later piece.
  - It is the only construct I found. Of 25 constructs, 2 are sensitive, both this fraction.
  - 20,000 synthetic answers heavy in notation, preambles, list markers, offers and fences:
    - fed character by character, 1,273 differ between the two parsers; every one holds a fraction;
    - under random cuts of 1-40 characters (the app's kind of chunk), 179 of 60,000 runs differ; every one holds a
      fraction, and in each printed case the raw chunk ends four characters after the closing `$` (the fence filter
      holds three);
    - the same 20,000 with the fraction taken out of the generator: 0 differences under both feeds.
  - The last stage, `cutAtWordBudget`, is piece-invariant (`16-word-budget.cjs`): 6,000 synthetic answers, 2,618 of
    them over 200 words, fed whole, character by character and in random cuts: the same text and the same
    `words` / `cut` / `allowance` in all 24,000 runs. So the `[Answer] budget:` line and the 200-word cut do not move.
- **Why it matters.**
  - In the app: a one-paragraph answer with such a fraction can now show `$3,000 over 9,500` where v2 showed
    `3,000 over 9,500`, when a chunk boundary falls just after the closing `$`. Rare, and the same as MAIN without cues.
  - In the harness: on every such fraction. On v2 the hold hid this in the cue arm's first paragraph only (the control
    arm has no block, so its prose is fed character by character). On the new build both arms show it, as MAIN's
    harness always did.
  - The spec's sentence is the reason given for not running the bench and the probe again. That paragraph is
    overtaken in any case: by the day ledger (17:07) neither has run on v2, and both will run on the combined build.
- **Fix.**
  1. Reword the three places: the parser's joined output is unchanged; the pieces are not; one later filter is
     piece-sensitive for a typeset fraction. Correct the commit message's "same bytes for every input" to "the parser's
     output". Drop or rewrite the paragraph at spec lines 366-368.
  2. Know the exposure, with no model call: over the stored replies that have `raw` (the saved bench and spike rows),
     count the ones that hold `\frac`. Counts only. If it is 0, say so in the spec. If not, run those replies through
     the new dist's chain character by character and name each id whose `spoken` changes.
  3. Record the `stripSpokenNotation` hold as its own small task (test first: character-by-character equals whole).
     Do not fold it into Task 1.
  4. Condition 1's own check is missing from both documents: print the `CUE_RULE` hash from the new dist
     (`cuebench-score.mjs:60` or `smoke-facts.mjs:88` print it) and compare it with `8e15e4e7dd41`. One line in the
     build step.

### I4. The scheduled run builds the dist itself when any source is newer; the plan's proof is printed before that

- **Where:** plan Task 2 Step 1 (lines 351-369), Step 3 "What flies" (lines 472-476), Step 5 (line 506);
  `interview60.run.mjs:544-545`; `scripts/build-electron.js:39-53`; `launch-smoke-cues.cmd:49, 69`.
- **What happens.** `auto` runs `npm run build:electron` before it starts the app. The build script skips only when no
  `.ts` under `electron/` (tests included) is newer than the oldest output. This afternoon it skipped
  (`[build-electron] Up to date, skipping build`, launcher log line 44). The launcher prints
  `dist-electron main.js mtime=` on line 4, BEFORE that step.
- **Why it matters.**
  - Task 1b edits `electron/ipcHandlers.ts` and two test files, and its mutants touch `ipcHandlers.ts` twice more.
    A reviewer's fix to any test does the same. If any of that lands after Step 1's build, the 05:00 task rebuilds
    the dist from whatever the working tree holds then.
  - The plan's check, "the launcher log's mtime equals Step 1's build", still passes. It was printed before the
    rebuild.
  - "What flies" and the seven markers would then describe a dist that was overwritten before the app started.
- **Fix.**
  1. Order: Task 1, its review, Task 1b, its review, both commits, THEN the build. (Revision E already changes the
     precondition to "Task 1 and Task 1b are reviewed and committed".) The precondition `git log -1` and "What flies:
     built from Task 1's commit" must then name the head at build time.
  2. After the markers, run the build once more and require the line `Up to date, skipping build`. Say that nothing
     under `electron/` may be touched until the run has ended (no edit, no `git checkout`, no mutant).
  3. In Step 5, the proof is the launcher log's `Up to date, skipping build` line and the marker count on the dist
     AFTER the run. A `[build-electron] Done in <N>ms` line means the task built at its start: say so in the note,
     re-read the markers, and name the working tree it built from.
  4. Add the new marker to the launcher's and the registration script's guards. Today they refuse a dist without
     `__CUES__` or `function trimCues`, not one without `CUE_LINE_PREFIX`.

### I5. Task 2 is no longer the plan for the run that will happen

- **Where:** plan Task 2 (lines 347-518) and its preconditions (line 349); the day ledger's 17:07 entry.
- **What changed while I worked.** The v2 re-smoke finished NOT CLEAN (block-only 1, on the readiness probe's second
  question at 13:12:08Z). The controller ruled it a cue failure, found "offers before the answer" as the cause, and
  wrote: one build together with the early close, the re-smoke on that build, bench and probe only on that build.
  Nothing is armed. So the plan's order (execution notes, line 35: "today's re-smoke, bench, probe on the v2 build,
  then Task 1") is overtaken too: the bench and the probe have not run.
- **What this delta does to the failing state: nothing.** The spec already names it (section 4, the `__MORE__`
  sentinel in the list of things that swallow the prose). With the early close the block closes on the `_` of
  `__MORE__` instead of at that line's newline. The candidate sees the same substitute line and no cues. So the early
  close alone cannot make the re-smoke pass.
- **What the spec and plan lack for the new order.**
  1. A precondition on the v2 re-smoke's result. Task 2's four preconditions could all have been met tonight with the
     re-smoke failed.
  2. The date. "05:00 tomorrow", "2026-10-01" and the 18:30 gate deadline are written into Steps 3-5.
  3. The offers task as a precondition of the build, beside Task 1b.
- **What the offers spec must check against this one** (I did not review it; it does not exist yet).
  1. **One predicate.** "Released on the first character that cannot start an offer line" is the same question as the
     early close, on the same line shape (`extractSuggestions` uses the same regular expression). It inherits I1's
     hole unless it uses the corrected constant.
  2. **The build marker.** If the offers fix reuses `CUE_LINE_PREFIX`, its count in the dist is no longer 2.
  3. **The redirect window.** With both changes, an offers-first stream reports its cues at `_` and shows nothing
     until the offers block has passed. A death in that stretch is a pre-token failure: the dead stream's cues over
     the redirect's prose. That is D3's state (M1) with a window as long as the offers block.
  4. **The timing read.** Such an answer has a small R1 and a late first token. Read B and "first token minus cues"
     for it, not R2.
  5. **Anchors and totals.** Both tasks insert into `verbalStreamFilter.test.ts`. "Before line 604", 1029 and 1030
     hold only for the task that lands first.

### I6. The median is 6.5, not 9.5: every place (confirming A1, which misses one)

- The list sorted: 3 3 3 3 4 4 5 5 5 5 6 7 12 13 46 92 127 129 157 283 369 1231. The 11th and 12th values are 6 and 7.
  9.5 is the mean of the 12th and 13th (7 and 12): an off-by-one (`05-binomial.cjs`).
- **Spec:**
  - line 29 (section 1): "(median 9.5 ms)";
  - line 246 (section 5, the gap row): "median 9.5 ms";
  - line 338 (section 8.2, R2): "median 9.5 ms";
  - line 347 (section 8.2, calibration): "median 9.5";
  - lines 355-356 (section 8.2, the threshold's reasoning): "more than five times above today's 9.5 ms". With 6.5 it
    is 7.7 times.
  - line 384 (section 9.7), "by more than a factor of two", is built on the same reasoning and stays true.
- **Plan:**
  - line 385 (Step 2, the script's header comment): "median 9.5";
  - line 428 (Step 2, expected output): "median 9.5". The plan's own script computes 6.5 here, so the step as written
    stops the operator;
  - line 456 (Step 3, calibration sentence): "median 9.5";
  - line 458 (Step 3, "Before"): "median 9.5 ms";
  - line 464 (Step 3, the expectation's reasoning): "more than five times above today's 9.5 ms".
- A1 says "Step 3, two places". There are three (456, 458, 464).
- The other derived numbers hold: "3 of about 22 is more than twice the worse rate" (13.6% against 6.4%), "more than
  three times under the lower median" (156 / 50 = 3.1), p90 283.
- Steps 2 and 3 still carry the plan's own script and its wording. With `hold-read.mjs` in its place they also need
  the second file it reads (`verbal-diag.log`; the spec says "the debug log alone") and the five reads' names.

### I7. The "is a task Running?" check stops nothing

- **Where:** plan Steps 2, 4 and 6 (lines 174-179, 284-290, 308-317), Step 5 (lines 298-302);
  `task-1b-brief.md` Step 4.
- **What is wrong.**
  - In Steps 2, 4 and 6 the `Get-ScheduledTask` line and the vitest line are one block. Pasted as one call, the tests
    run whatever the first line printed.
  - Step 5 runs vitest twice with no check. Task 1b's two mutant runs have none either.
  - Step 6 checks once and then runs the full suite and two type checks, several minutes of work.
  - A task that is `Ready` with a start time minutes away passes the check. `Natively-probe-live38` is due at 20:00
    tonight.
- **Why it matters.** It is the hard limit of this whole session: a test run during a live audio task spoils that
  task's timings.
- **Fix.** Make every block refuse by itself, as its first line:
  `if (Get-ScheduledTask -TaskName 'Natively-*' | Where-Object State -eq 'Running') { throw 'a Natively task is Running' }`.
  Add it to Step 5 and to Task 1b's mutant runs. Before the full suite, also print each task's next run time
  (`Get-ScheduledTaskInfo`) and do not start within 15 minutes of one.

## Minor

### M1. Case D's narrowed window is stated, not pinned, and no test runs the once-guard on an early-close report

- **Where:** spec section 3.2 (lines 166-172), section 7 (lines 281-283); plan D2 (lines 148-166).
- D passes "identical" because its one chunk ends in a complete line: the new code never runs in it. D2 pins the
  neighbouring state (died after the words were shown).
- The state between them is real (`04-seam.cjs`, case D3): the dead stream reports at its first prose character, the
  3-character carry holds `Te`, the stream dies, the redirect answers, the once-guard drops the redirect's block. The
  candidate reads the DEAD stream's cue over the redirect's prose. Today the same death shows the redirect's cues.
- Condition 3 allows "state it", so this is met. A pin is cheap and fails today for the right reason:

  ```ts
  const DIES_INSIDE_THE_HOLDS = { thenFail: ['__CUES__\n1| first stream cue a\n', 'Te'] };

  it("D3. a stream that dies after the early close but before its first words clear the filters is redirected: its cue over the redirect's prose", async () => {
      plan.push(DIES_INSIDE_THE_HOLDS, CHUNKED);
      const onCues = vi.fn();
      const chunks = await run(onCues);
      expect(asked()).toEqual(['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite']);
      expect(onCues).toHaveBeenCalledTimes(1);
      expect(onCues).toHaveBeenCalledWith(['first stream cue a']);   // today CUES: the dead stream had not reported
      expect(spoken(chunks)).toContain('Ten million vectors take about thirty gigabytes.');   // the redirect's prose, as case D reads it
  });
  ```

  By my chain copy (not by vitest): today it fails on the third expect; after the change all four hold. It adds one
  to RED and to the totals. It is also the only case that would run the once-guard on a report made by the early
  close.

### M2. Expected outputs that do not match what the tools print

- **The full suite (plan Step 6, line 319):** "102 files, 1029 passed, 8 skipped, 0 failed". From a temp cwd vitest
  prints `Test Files  1 failed | 101 passed (102)` and a `Failed Suites 1` banner for
  `interviewerTurn.replay.test.ts` (ENOENT; `SP\cue-group\fullsuite-e3fae5f.txt`, last lines). Write the two lines as
  they will print: `Test Files  1 failed | 101 passed (102)` and `Tests  1030 passed | 8 skipped (1038)` (1029 and 1037
  without the new row).
- **Steps 2 and 4:** add the totals. The two files hold 80 + 6 tests today. RED: `14 failed | 98 passed (112)`. GREEN:
  112 passed (111 and 97 without the new row).
- **`git status --short`:** the spec (line 12), the plan (lines 27, 349) and Task 1b's Step 1 expect one or two
  modified files. There are three now: `interview60.report.md`, `passes/PREREGISTER-cueprobe.md` (uncommitted), and
  `natively_debug.log.1` (a tracked log the running app rewrites). Name all three, and add the log to "never staged".

### M3. What the user is told to look for on the overlay is wrong for this model

- **Where:** plan Task 2 Step 4 (line 495): "a TTFT well under the total and a plausible rate, not a rate in the
  thousands"; spec section 5, the bar's row.
- The bar's rate is characters / 4 divided by the time from the first token to the end
  (`src/hooks/useStreamMetrics.ts:64-66`).
- This afternoon's streams lasted 0.05 to 1.2 s (median 0.35 s) after seconds of thinking (the run's TTFT p90 was
  6.4 s). An answer is about 100 tokens.
  - With a working early close the bar shows a TTFT 0.05-1.2 s under the total, and a rate of a few hundred tokens a
    second, up to about 2,000 on the fastest answers.
  - With the hold the rate is in the tens of thousands (about 100 tokens in 4 ms).
- As written, the user could see a correct build and call it broken: a correct build can show "a rate in the
  thousands" on a fast answer. Write: "TTFT a few tenths of a second under the total; a rate in the hundreds, not the
  tens of thousands". The spec's row (line 244) says "in the thousands" for the hold; it is tens of thousands.

### M4. The launcher's gate deadline and the task's time limit do not fit a 05:00 start

- **Where:** plan Task 2 Step 4 (line 495: "18:30 is the same day for a 05:00 start"); `launch-smoke-cues.cmd:63`;
  `register-cue-smoke.ps1` (`-Hours 5`).
- The gate may wait until 18:30. The task is killed at 10:00 (5 h). This afternoon the run took about 50 minutes
  from the open gate to the end of playback (15:56 to 16:47, after five failed readiness attempts); a clean one takes
  about 40. So a
  gate that opens after about 09:00 to 09:20 starts an hour that is killed in flight, and a killed task does not stop
  the app (the open-mic case in memory). The first 05:00 run used 09:00 (`launch-smoke-cues.cmd:10`).
- Set the deadline to 09:00 for a 05:00 start (edit the `.cmd` with a node script: it is CRLF), and run
  `guardcheck-smoke-cues.cmd` before arming.

### M5. The smoke check reads adjacency, and adjacency is now a window

- **Where:** `SP\check-smoke-cues.mjs:58-64` (block-only), `:41-43` (failed).
- With the hold, an answer's cues line and full line were about 5 ms apart. Now they are the stream's length apart
  (0.05 to 1.2 s this afternoon).
- A superseded stream that never shows a token is not stopped by the engine (the generation check runs only when a
  token arrives, `IntelligenceEngine.ts:432-440`). It ends, and logs the substitute full line. If that line falls
  inside the newer answer's window, the check names the NEWER answer's cues as the block-only one.
- The verdict is not affected: a substitute line always means some stream showed nothing, so the run is NOT CLEAN
  either way. Only the cue text the check prints can be the neighbour's.
- So when the check prints a block-only answer, confirm it by that answer's own `budget: words=0` line between its
  cues line and the substitute. Today's has it (13:12:08Z).
- A D2-shaped answer is a full line that starts with words and ends with `[No answer ...]`. The check's `FAILURE`
  pattern is anchored at the start, so it counts that answer as real. Read the report's `hard failures` line beside
  the check (it counts the diag log's `generateStream FAILED` lines).

### M6. Spec and plan sentences to correct

- **Spec line 368:** "Any later bench on the rebuilt dist reports a smaller offline `ttft`". It will not: the harness
  takes `ttft` at the first raw piece, before the chain (`interview60.answers.mjs:172`).
- **Spec section 3.1:** four moments move together, not three. The winner's re-announce also moves: the
  `[Main] answer source: ... (hedge)` log line and the model label under the answer change at the first words, not at
  the end.
- **Spec section 7, "Supersede at any point ... Unchanged" (lines 287-288):** one state is new for a one-paragraph
  answer. A stream that is superseded in the middle of its prose has now already shown its cues and first words. They
  stay on screen, cut short, until the replacement's first words arrive (seconds). With the hold nothing of that
  stream was ever shown. It is MAIN's behaviour without cues, and the window is the stream's 0.05 to 1.2 s. Name it.
- **Spec line 41-42:** the file's log since v1 also has `578190f`, the merge `279103b` and three of MAIN's commits
  that came with it. The claim that matters holds: the nine hunks of `git diff 577d13a e3fae5f` on the file sit at
  lines 17, 334-347 and 546-671; none touches `stripCueBlock` or its comment (369-440).
- **Plan Edit B and Edit C comments:** after I1, "trim(), not trimStart()" is still true and should stay; add that a
  line terminator after the bar is whitespace to `CUE_LINE`.

### M7. Records the conditions ask for and the documents do not carry

- **Friday's pre-registration** (condition 7; final-review.md line 702) is not mentioned in either document. The file
  is not written yet. Add a carry-forward line where the controller will find it (the plan's result-note step, or the
  agenda): in Friday's pre-registration, `first token` is the first prose chunk after the block.
- **The two older specs** keep the old sentences (`2026-09-20-cue-mode-design.md:67` and `:102`,
  `2026-09-30-cue-mode-small-cues.md:645-646`). The delta's section 6 is the correction. One pointer line in each
  older file would stop a reader who opens only that file.

### M8. `hold-read.mjs` as it is now

- It implements section 8.2's R1 and R2 and adds T, C, B and per-answer rows. My numbers from its parser match its
  saved output.
- The calibration is honest for parsing, pairing and the statistics (fixtures with hand-made answers; three hours
  counted by the final reviewer). Weak spots:
  - "rows: R1 + R2 = T on every row" is true by construction; it cannot fail.
  - The one-burst summary line is computed in the CLI block and has no case.
  - No fixture has a cues line before the last won-by (a redirect after a dead stream's report). That row gets a
    negative R1. Say so in the header.
  - `rows` does not carry whether the block was empty, nor B for that answer. The rule of I2 needs both.
  - `holdGone` and its six cases still implement the old rule (at most 3 over all pairs with prose).
- What it cannot see: which chunk carried the first prose character; the renderer; answers with no won-by line (hedge
  off, other providers); whether the prose had one paragraph.
- It reads the whole log, so two of the 23 finished answers are the readiness probe's. Keep that, and say it.

### M9. Task 1b: checked, with three notes

- **Every quoted line exists as quoted.** `ipcHandlers.ts:543-544` (the two comments), `:16`, `:546`, `:559`, `:576`
  (the only four lines the two regular expressions match); `interview60.chains.test.ts:3-4` and `:14-16`. Each mutant's
  old text is unique in the file.
- **The mutants fail as stated.** Mutant A changes line 546: the three-line test fails, the call test passes. Mutant B
  changes line 576: the call test fails, and the mutated line matches none of the first test's patterns, so that one
  passes.
- **The new pin is at least as strict.** I found nothing the old pin catches that the new one misses. Any line that
  names `VERBAL_WHAT_TO_ANSWER_PROMPT`, `CUE_RULE`, `CUES_SENTINEL` or `__CUES__` changes the compared list. The new
  one is stricter: it also fails on a second use of `VERBAL_TYPED_PROMPT`, on a changed quote style in the import, and
  on a reformatted assignment. Both are blind to the same things: `CUE_SHAPE_RULE` or an alias under another name, and
  a reassignment of `verbalSystemPrompt` between line 559 and the call.
- Notes:
  1. It must land before the build (I4).
  2. The three files are CRLF in the working tree (`core.autocrlf=true`). The pin trims each line, so it is safe. A
     whole-file Write may store LF; git normalises it.
  3. `fable-revision-1.md` lines 22 and 36 hold literal U+2028 and U+2029 characters where the escapes were meant.
     They render as blanks. Write them as words before the author reads it.

---

## Item 3: every number in the plan's expected outputs

By `03-plan-numbers.cjs` and `12-wide-predicate.cjs` (the plan's cases as data, against the built parser and the
model), and `04-seam.cjs` for D2.

- First-prose chunk at sizes 1, 3, 4, 7, 500: **61, 21, 16, 9, 1. Confirmed** (`NO_NL.length` 143, `indexOf('Ten')` 60).
- Today's report chunk: **143, 48, 36, 21, 1. Confirmed.** Size 500 passes today. Confirmed.
- RED "14 failed": **confirmed.** 13 in the parser file (Appendix B; the matrix at 1, 3, 4, 7; the seven closing rows;
  the sentinel-line case on its second expect) and D2. Each fails on the assertion the plan names.
- "The nine held rows pass today", "the end-flush case passes today", "the sentinel-line case's first expect passes
  today": **confirmed.**
- "25 new cases" (1 + 5 + 16 + 1 + 1, and D2): **confirmed.** 0 of the 24 parser cases fail after the change.
- The CR row's calibration, "exactly one failure with `trimStart()`", `reportedAfter` 2 for 3: **confirmed.** No
  pre-existing `stripCueBlock` case feeds a CR.
- "3 + 7 + 8 = 18 passed" for the three untouched seam files: **confirmed** by the file counts (3, 7, 8).
- Suite total **1029: the arithmetic is right** (1004 + 25). With A2's row: 1030. See M2 for the line vitest prints.
- Marker count 2 after the build, 0 before: **0 confirmed** in today's dist. **2 is right by reading**: esbuild strips
  comments (today's dist has none of the source's), and the name is on the declaration line and one use line.
- p90 283: **confirmed.** Median 9.5: **wrong, 6.5** (I6).
- Type-check counts 6 and 0: **not checked** (no type check allowed). Edit C compiles by reading: `phase` is
  `'block' | 'prose'` after the loop, as the plan says.

## Item 2: the seam, case by case

The spec's table is right in every row. By my copy of the chain (`04-seam.cjs`):

| case | today | after | assertions |
|---|---|---|---|
| A | report, re-announce and first token all during raw chunk 5 (the end); 4 pieces | all three during raw chunk 3; 6 pieces | hold |
| A0 | report on chunk 1 by the prefix branch | the same | hold |
| B, E | as A on the other leg / the stall race | as A | hold (by reading; my copy models the hedge's front) |
| C | redirect, then as A | redirect, then as A | hold; asked 3.5, 3.1, 3.5 |
| D | reports 2 cues on chunk 1, dies, redirect, second report dropped | identical up to the redirect | hold |
| D2 | redirect; one report, the REDIRECT's cues; asked twice | no redirect; one report `first stream cue a`; spoken `Ten million vecto[No answer ...socket hang up]` | today fails on `asked()`; after, all five hold |

- The claims D2 leans on are true: `thenFail` throws `socket hang up` after its chunks (test file lines 23-26);
  `plan.push`, `asked()` and `spoken()` behave as used; `filterCodeFences` loses its 3-character carry on a throw
  (hence `vecto`); the message reaches the text unwrapped (`LLMHelper.ts:3291-3332`, the hedge's `deliver`, no `try`
  in `streamChat`'s Gemini branch at 2713-2738, `fallbackModel` unset); `withVerbalFallback` re-throws once a chunk
  has left (`started` flips on the re-announce chunk).
- **Is D2 MAIN's contract?** Yes. `verbalFallback.test.ts:83-94` has pinned it since 2026-09-01, and cue mode has
  never been on MAIN, so nothing a user has seen relied on the wider window. Both cue runs today had 0 redirects and
  0 hard failures.

## Item 4: the final reviewer's eight conditions

| # | condition | status |
|---|---|---|
| 1 | one behaviour changes; bench and probe stand; the `CUE_RULE` hash is unchanged | Scope: **met** (spec 2.3, the plan's out-of-scope list), once I1 is fixed. The hash check: **missing** from both documents. "Bench and probe stand": **overtaken** (neither ran on v2; both will run on the combined build), and the spec's argument for it is wrong as written (I3). |
| 2 | test first; the hold and release partials pinned | **Met** by the plan (Steps 1, 2, 4, 5). `1`, `1 `, `1|`, `1| x` and `Ten`, `10 m`, `1.` all have rows. |
| 3 | the seam holds; D's new shape pinned or stated | **Met.** A-E, the fallback case and the engine cases are unchanged. D's new shape is **stated** (spec 3.2, 7), not pinned (M1). |
| 4 | full suite, both type checks, a build with its own marker | **Met** by the plan (Step 6, Task 2 Step 1). See M2 and I4. |
| 5 | the symptom before and after by the same read, pre-registered before arming; won-by to first token | Under-15 count: **met** by the spec and plan, with the wrong median. Won-by to first token: not in the spec or plan (they define won-by to cues); **met by the controller's addition** (C in `hold-read.mjs`). The "before" now exists (I2's table). |
| 6 | the 05:00 re-smoke passes its pre-registered rule | **Met as a step.** The rule failed this afternoon on v2 for a cause this delta does not touch (I5). |
| 7 | the records say what is then true | The comment: **met** (Edit B). The 09-20 sentence and 9.7: corrected in the delta only (M7). `PREREGISTER-cuesmoke.md`: **met** as a step. Friday's pre-registration: **missing** (M7). |
| 8 | its own Opus review | **Met** (execution notes; the ledger's chain). |

## Item 6: the rulings

1. **D2 accepted: agree.** The exposure is small: the whole stream lasts about 0.35 s after seconds of thinking, and
   provider failures fall in the thinking. Add the state D2 does not cover (M1).
2. **A pre-registered expectation with a consequence: agree that it must be able to fail; change its form and its
   consequence** (I2).
3. **D2 in the hedge file: agree.** It is the only file that runs the hedge, the fallback and the parser together.
4. **The trailer: no objection.**
5. **Counts as they come: agree,** with the lines written as vitest prints them (M2).
6. **`hold-read.mjs` replaces the plan's script: agree.** The plan's text must follow (I6), and the rule that will be
   pre-registered needs its own calibration case (I2, M8).
7. **Task 1b: agree** (M9). It must land before the build (I4).

## Item 7: what moves, and what the candidate sees

Four moments move together: the report (the `[Answer] cues:` line), the winner's re-announce (the label under the
answer), `started`, and the first token. I looked at everything that reads when or in what order they happen.

| state | before (v2, the hold) | after |
|---|---|---|
| a one-paragraph answer (15 of 21 this afternoon) | nothing, then the cues and the whole answer at once, 0.2 s (median) to 1.2 s after the first text arrived | the cues and the first words at the first prose chunk; the rest streams |
| an answer with a line break | the cues and the first paragraph together, then the rest | the cues and the first words, then the rest |
| the prose swallowed after the block (offers first, a `Time:` line) | the substitute line, no cues | the same |
| a replacing answer (supersede) | the old answer stays until the new one's first line ends | replaced at the new one's first words |
| a stream superseded before its first prose character (the one case this afternoon, 13:13:45Z) | nothing of it is shown; its cues line is logged, then the abort line | the same, a little earlier |
| a stream superseded in the middle of its prose (a window of 0.05 to 1.2 s) | nothing of it was ever shown: it was still held | its cues and first words are on screen, cut short, until the replacement's first words arrive, seconds later. MAIN's behaviour without cues; the spec does not name it |
| a stream that dies before its first prose character | a clean redirect, the redirect's cues | the same |
| dies after the early close, before its words clear the filters (up to 3 characters, up to 48 for an opener such as "I'm going to") | a clean redirect, the redirect's cues | the redirect's prose under the DEAD stream's cues (M1) |
| dies after its first words were shown | a clean redirect | the cues, the words, then `[No answer ...]` (D2) |
| the bar under the answer | TTFT about equal to the total; a rate in the tens of thousands | TTFT 0.05-1.2 s under the total; a rate in the hundreds (M3) |
| the model label under the answer, and the `[Main] answer source: ... (hedge)` log line | set when the first paragraph ends | set at the first words |
| a typeset fraction in a one-paragraph answer | `3,000 over 9,500` | the same, unless a chunk boundary falls just after the closing `$`: then `$3,000 over 9,500`; in the harness, always (I3) |
| a cue line with a CR after its bar | a cue | prose in the answer, one cue fewer, as specified; a cue with I1's fix |

What does not depend on the moved moments (checked by reading):

- `interview60.metrics.mjs`: the cue row counts lines (`:124-131`); the TTFT row reads the `first token` numbers
  (`:70`, `:388-391`) and can only move down.
- `interview60.judge.mjs` and `interview60.pass-record.mjs` never read an `[Answer] cues:` line (in both, "cues" means
  the screenshot cues).
- `main.ts:2416-2442` forwards tokens and keeps no state about a first token.
- The engine's `pendingCues` is a local of one call, so a superseded stream cannot hand its cues to the next one.
- The check's count rule counts lines, in any order.
- `answers.mjs`, `chains.mjs` and `run.mjs` read only the joined text and the cues from the built parser (see I3 for
  the one thing that does change there).

## Item 8: the plan as a document

- **Every anchor in Task 1 is right** at `416d4de`:
  - `verbalStreamFilter.ts`: `CUE_LINE` on 328, `cuePhrase` on 329; the doc comment's paragraph on 375-377 (its closing
    `*/` on 378 is inside Edit B's text); the state on 383-387; the prefix branch 392-406; the loop 408-424; the
    `for await` closes on 425; the end flush 427-439. Each of the three "replace" texts occurs exactly once in the
    file, and `CUE_LINE_PREFIX` occurs nowhere under `electron/` today.
  - `verbalStreamFilter.test.ts`: line 2 imports `extractCues` and `stripCueBlock`; the `stripCueBlock` describe
    closes on 602; the `trimCues` describe opens on 604; the existing matrix is on 560-568. The new names
    (`runCuesTimed`, `NO_NL`, `HEAD`, `ROWS`) clash with nothing in the file.
  - `WhatToAnswerLLM.hedgeCues.test.ts`: case D ends on 134, case E opens on 136, the describe closes on 146;
    `thenFail` is on 23-26; `plan`, `run`, `asked`, `spoken` and `CHUNKED` exist as D2 uses them.
- **The code in the plan matches the file.** `stripCueBlock` as quoted is the source at 379-440, line for line.
- **What an implementer would have to guess:**
  - the totals of Steps 2 and 4 (M2);
  - after I1's fix, that Step 5 has two mutants, each with exactly one expected failure;
  - what to do when a `Natively-*` task is `Ready` with a start a few minutes away (I7).
- **Commands that would run while a task is Running:** every vitest and tsc block of Task 1 and of Task 1b (I7).
- **Task 2** cannot be followed as written: see I2, I4, I5 and I6.

## What I did not check, and why

- **No test, build or type check** (forbidden). "Fails today, passes after" rests on my copy of the built parser plus
  Edit C and on my copy of the chain, not on vitest. That Edit C and the new tests compile rests on reading. Not
  checked at all: the type-check counts 6 and 0, Step 6's "12 passed" for the replay file, Task 1b's "4 tests".
- **No captured prompt, probe or spike row file, no answer text.** The block-only answer's cause is the controller's
  finding; I saw only its times (R1 7 ms, R2 43 ms, words=0, ten seconds before playback started). I did not open
  `scan-rows-shown.all.out.txt` or `smoke-facts.resmoke.out.txt`.
- **The offers-first fix:** no spec exists; I5 lists only what it must check against this delta.
- **Other providers:** Gemma's line buffering (`LLMHelper.ts:3070-3085`) and the Ollama, custom, OpenAI, Claude and
  Groq branches are cited from the final review, not re-read.
- **The renderer beyond the token handler and the metrics hook;** what is painted is the user's one look.
- **Cases B and E of the hedge file** by reading only (my chain copy models the hedge's front leg and the redirect).
- **The real chunk boundaries of the SDK:** unknown to everyone until a run; I2 says how to measure them first.

## My scripts (`SP\cue-group\review-scratch\`, all read-only; run with `node <file>`)

- `model.cjs`: the built parser, and a copy of it plus Edit C (the predicate and `trim` are options).
- `01-regex.cjs`: the predicate on the named partials; the prefix property by brute force.
- `02-fuzz.cjs`: today's parser, the plan's and `extractCues`, exhaustive and random.
- `03-plan-numbers.cjs`: the plan's 24 parser cases against today, after, and the `trimStart` mutant.
- `04-seam.cjs`: the verbal chain for A, A0, C, D, D2 and three shapes the plan does not have.
- `05-binomial.cjs`, `13-binomial-d.cjs`: error rates of the timing rules; the median.
- `06-chunk-invariance.cjs`, `07-which-notation.cjs`: the chain behind the parser under different pieces.
- `08-afternoon-read.mjs`, `10-when.mjs`, `11-hour-only.mjs`: the two cue runs, times and counts only.
- `09-proposed-rows.cjs`: the simpler predicate on the CR rows (why I do not recommend it).
- `12-wide-predicate.cjs`: the controller's corrected predicate, exhaustively, and the 17 revised rows with both mutants.
- `14-verify-examples.cjs`: the one quoted parser example; the odd characters in `fable-revision-1.md`.
- `15-frac-only.cjs`: every piece-sensitive difference classified by construct (run with stderr discarded).
- `16-word-budget.cjs`: the word-budget stage under different pieces.
