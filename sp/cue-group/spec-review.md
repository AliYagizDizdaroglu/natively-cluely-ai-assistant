# Opus review: cue mode v2 "small cues" (spec delta + plan)

Reviewed 2026-09-30, 09:00 to 09:25 local, before spike 6 (10:03).

**Read:** the spec delta, the plan, the 09-20 design, the 09-21 plan (Tasks 8–9), `fable-brief.md`,
`SPIKE6-RULE.md`, the logs of spikes 1–5 (the discarded partial spike-6 log for risk only),
`spike3.mjs`, `make-spike6.mjs`, and every worktree file the plan edits (at fd57512). Also the scratchpad
smoke and bench tooling, `PREREGISTER-cuebench.md`, `AGENDA.md`, `wait-for-gemini.mjs`, and the typed-chat
IPC path.

**Ran (read-only):**
- `tsc -p electron/tsconfig.json --noEmit`: 6 errors, so the plan's baseline holds.
- vitest on prompts, verbalStreamFilter, IntelligenceEngine.cues, interview60.metrics, problems.verbal.cues,
  cueArm and interview60.flight: 7 files, 166 passed, 2 skipped (the 2026-09-02 fixture). The baseline is green.
- git merge-base, rev-list and diff --name-only between `feat/whole-turn-answers` and MAIN's branch.

## Findings

### Important

**1. The merge step cannot run as written. The program that merges is never run live before the validation hour.**

*Where:* plan Task 4 Step 6 (line 658) and spec §3.5.6. Both hand off to the 09-21 plan's Task 9:
`git -C <MAIN> merge --ff-only feat/whole-turn-answers`.

*What is wrong:* MAIN's branch `fix/coding-style-suffix-all-gemini` (0ef42a0) is not an ancestor of this
branch, so `--ff-only` will refuse.
- The merge base is f3c7c8e.
- MAIN has 42 commits the branch lacks: the hedge da28f25 and its default f745d7e, ce4e730, 0ef42a0 and more.
- The branch has 24 commits MAIN lacks.
- 25 files changed on both sides. They include every code file this plan edits (IntelligenceEngine.ts,
  verbalStreamFilter.ts and its test, interview60.metrics.mjs and its test) and WhatToAnswerLLM.ts.

The controller's `AGENDA.md` already says "not a fast-forward … 8 conflicted files (20 hunks, 4 in
WhatToAnswerLLM.ts)". Those counts were 38/23 commits; they are now 42/24, before this delta adds three
more. So the plan contradicts the controller's own procedure.

The bigger gap: the re-smoke and the bench both exercise the pre-merge branch. The merged program is cue
mode plus the hedge plus 42 commits, with conflicts resolved by hand where the cue chain and the hedge meet.
Its first live run would be Friday's pre-registered validation hour. User rule 7 says a first integration
earns one live exercise before anything depends on it.

*Fix:*
- Replace the command in Task 4 Step 6, and name the procedure in spec §3.5.6, with the AGENDA's procedure:
  - merge in a separate branch;
  - Opus review of the resolution;
  - full suites and both tsc gates;
  - a build with markers.
- Add one scheduled smoke of the MERGED build before the validation hour is armed: same launcher shape,
  check at 3/5, hedge default on.
- Better, because it also fixes finding 2: resolve that merge branch BEFORE the re-smoke and re-smoke the
  merged build. The user's gate ("merge only if the re-smoke passes") then tests what merges, and the
  final step can be a fast-forward.

**2. The re-smoke answers on a model that gives about 2% of shipped answers, so the new paths may get no live exercise.**

*Where:* spec §3.5.2, §9.2 and §9.4, and `launch-smoke-cues.cmd` lines 31–38. The launcher clears the model,
thinking-level and hedge variables, so the smoke answers on 3.1-lite LOW.

*What is wrong:* after the merge the front leg is 3.5-lite HIGH, which won 44 of 45 windows in h40c (MAIN
`passes/2026-09-29-h40c-result.md`). On 3.1-lite the evidence predicts:
- No one-line scaling (spike 3: 0/18 and 1/18).
- Almost no overruns under a 3×5 wording (spike 2 cap3: over-3 0/24, lines over 5 words 0/71). The
  re-smoke may therefore log zero `[Answer] cues trimmed:` lines. The new line's real path (console, then
  `natively_debug.log`, then the metrics regex, then the row value) would stay unexercised live.
- No trigger for the notation cleanup in S1. Even when the cleanup fires, it leaves no trace: a cleaned,
  uncut cue is logged only in its cleaned form.

The spec's §9 has neither "zero trims" nor "cleanup cannot be seen". Nor does it say that shipped answers
are 98% 3.5-lite.

*Fix:* choose one of these:
- Re-smoke the merged build (finding 1).
- Or set `NATIVELY_VERBAL_PRIMARY_MODEL=gemini-3.5-flash-lite` and `NATIVELY_GEMINI_THINKING_LEVEL=HIGH` in
  the launcher. Both variables exist on this branch, and `VERBAL_PRIMARY_MODELS` allows the model. The live
  blocks then come from the shipped front model: trims occur (spike 2: 3.5-lite cap3, 8/67 lines over 5
  words) and the one-line behaviour is visible.

Either way, name in spec §9 each path the chosen re-smoke does not reach:
- trims, if k = 0;
- the cleanup;
- one-line scaling on 3.1-lite;
- the overlay (the smoke reads logs; the user should look once, as the 09-20 spec intended).

Optional: make a cleanup visible, for example a diag line when `cleanNotation` changes a cue. If not, §9.4
should say that a live cleanup cannot be seen in the log.

**3. The bench's amended gate has no instrument: `cuebench-score.mjs` gates the combined check.**

*Where:* spec §3.4(c)(d) and §9.3; plan Task 4 Step 3, which amends only the pre-registration.

*What is wrong:* `SP\cuebench\cuebench-score.mjs:28,70` stops the bench when `checks.cues_wellformed` holds
on fewer than 90% of ids in any rep. That check covers lines AND words AND `?`/"you"/empty, as answers.mjs
records it at the dist's limits. `cuebench-calibrate.mjs` and `e2e-cuebench.mjs` test exactly that rule.

If only the PREREGISTER is amended to "gate lines, report words", the tool still applies the old rule. It
can STOP on words alone: in spike 2, 3.5-lite cap3 had 8/67 long lines spread over up to 7 of 24 blocks.
The controller would then have to override the tool after the fact, or the note and the tool disagree.

*On consistency (brief item 5):* gating lines and reporting words is consistent with the user's decisions.
The code enforces both limits. A dropped line loses a named part, which goes against "every named part is
still covered". A cut word is the outcome the user chose.

But the gated check needs an exact definition: per id, the RAW block has 1–3 lines, no `?`, no "you" and no
empty line, plus `cues_present`, on at least 90% of ids in every rep. Only the word count moves to
"reported". No code enforces `?` or "you", and the bench is their only offline gate.

*Fix, before the run:*
- (i) The scorer computes the line count itself from the recorded `cues` arrays, gates it together with
  `cues_present`, and prints "words over 5: blocks k/n, lines k/m" per rep.
- (ii) The calibration gains a words-only overrun (must PASS, reported) and a lines-only overrun at 35/39
  (must STOP).
- (iii) Re-run the e2e.
- (iv) The amendment is dated and says three things:
  - It is a third change to a note that claimed to change "two things … and nothing else".
  - It also replaces the cue-check row of the 09-21 plan's Task 8 Step 5.
  - Spike 2's per-line counts were seen before it was written.
- (v) The result note records which rule was benched: the wording name and a hash of the dist's `P.CUE_RULE`,
  read at run time.

Nothing else in `PREREGISTER-cuebench.md` is invalidated. §1 still holds: h40c passed, so the bench runs
3.5-lite HIGH against captured-high, and `cuebench-pairs.mjs` matches. §2 still holds: blind pairs, two
Opus graders, the grader stamp.

**4. The re-smoke's pass check gains branches that the planned calibration does not exercise.**

*Where:* spec §3.4 (the scratchpad bullets), plan Task 4 Step 3 and `SP\calib-cue-smoke.mjs`.

*What is wrong:* the planned fixtures are a good block with cues of at most 5 words, a bad block of 4 short
lines, and a good block with a trimmed line. Under rule 8 these cases are missing:
- (a) A 6-word cue, which must read bad. The only word-limit bad case today has 9 words, which is also
  malformed at the old limit of 8, so nothing proves the check reads 5.
- (b) A block of exactly 3 lines of 5 words, which must read good. This is the boundary.
- (c) The new notation rule: a cue with a backtick and a cue with `\log` must read bad, and a cue with money
  `$5M` must read good (this tests the `$` exclusion).
- (d) The "must print `trimmed 1`" check cannot work as written. `run()` returns only the last two output
  lines (calib line 12), so the check must read the full stdout.

*Fix:* add these five fixtures and the full-stdout read. Record the calibration output in the re-smoke's
result note.

**5. Pass records (brief 4a, confirmed and worse): the INDEX claim is wrong for the probe and the bench, and destructive for the re-smoke if run in the worktree.**

*Where:* spec §3.5.5 (lines 203–204) and plan Task 4 Steps 4 and 6 (lines 650 and 658).

*What is wrong:* `interview60.pass-record.mjs` (lines 238–258) rewrites the whole `passes/INDEX.md` from the
run folders that contain an `interview60.timeline.json`.
- **Probe and bench:** they have no run folder, so they get `PREREGISTER-<name>.md` plus
  `<date>-<name>-result.md` and no INDEX row. MAIN already works this way: hedge-probe, latency-probe and
  followup-replay have no rows.
- **Re-smoke:** running the tool in the worktree rebuilds the tracked INDEX.md from the worktree's runs
  folder. That index has 24 rows, last committed in 0df3a4c. The runs folder holds a single timeline folder,
  `2026-09-30T02-38-22-cuesmoke`, so the 24 rows would be replaced by 1–2. Committing that also creates a new
  conflict with MAIN's INDEX.md, which changed on MAIN since the merge base.
- **Hand edits:** the plan asks the record to "name the wording, the grader (none), and the trim count".
  INDEX has no such columns, and the user's rule is "never hand-edit a record; regenerate it".

*Fix:*
- **Re-smoke:** commit only the tool's `passes/<run>.md`, after restoring INDEX.md from HEAD before staging.
  Add `passes/<date>-cuesmoke-result.md` carrying the wording, the trims (every dropped or cut line), the
  check output and the calibration. MAIN's INDEX picks the run up after the merge, but only if its run folder
  is copied into MAIN's runs folder and `--index` is run there.
- **Probe and bench:** PREREGISTER plus a result note, no INDEX row.
- Reword spec §3.5.5 to match.

**6. An absent block fails the re-smoke, but the selection rule admits a wording that produces absent blocks.**

*Where:* spec §3.1 (the SPIKE6-RULE summary, lines 73–80) and §3.5.2; `SPIKE6-RULE.md` item 1.

*What is wrong:* the rule disqualifies a wording only above 2 empty simple blocks of 24 per model. The winner
may therefore omit the block on up to 8% of simple questions on 3.1-lite, the re-smoke's model.

The re-smoke has zero tolerance: every cues line must be a non-empty array, and the row needs present = n.
S1 holds ten short follow-ups. If they behave like the spike's simple questions, the chance of at least one
absent block is about 58% at 2/24 and about 35% at 1/24.

Empties are real in this material: spike 3 cap3 on 3.1-lite had 3/18, spike 2 themes3 on 3.1-lite had 1,
and spike 4 strict-ex on 3.5-lite had 1/18. A NOT CLEAN on absence would block Thursday for a behaviour
the selection rule accepted.

*Fix:*
- When spike 6 reports, write into spec §9 the winner's empty counts per model and the predicted chance of
  at least one absent block in the re-smoke.
- State before arming that an absent block fails the re-smoke, as the 09-20 design says, so a failure is not
  argued away afterwards.
- Optional: tighten SPIKE6-RULE before 10:03 with a timestamped note (for example 0 empties on 3.1-lite).
  This is still legitimate because no counted data exists yet.

**7. The typed chat path shows the raw cue block, and neither gate reaches it (pre-existing in cue mode v1, ships with Thursday's merge).**

*Where:* `electron/ipcHandlers.ts:544–574` and `598–613`; `electron/LLMHelper.ts:3343–3370`.

*What is wrong:*
- For a typed, non-coding question on a Gemini model, `gemini-chat-stream` sends
  `VERBAL_WHAT_TO_ANSWER_PROMPT`, which now ends with `CUE_RULE`, to `streamVerbalWithGeminiFlash`. It
  forwards the raw tokens to the renderer.
- Nothing on that path runs `stripCueBlock`, which lives only in WhatToAnswerLLM's chain. `src/` has no
  `__CUES__` handling.
- After the merge, every typed verbal answer would open with `__CUES__` and `1| …` lines in the chat bubble.
  That goes against "the full answer stays as today". MAIN does not have this today: ipcHandlers.ts is
  unchanged on both branches since the merge base.
- The 09-20 spec, the 09-21 plan and this delta never mention the path. §3.6 lists only the coding path as
  out of scope. The re-smoke is hands-free and the bench is offline, so neither sees it.

*Fix (before the merge, and small):*
- Either send the typed path the verbal prompt without the rule, and test that it contains no
  `CUES_SENTINEL`. For example, export
  `VERBAL_WHAT_TO_ANSWER_PROMPT.split(CUE_RULE).join('')` as its own constant and use it at ipcHandlers.ts
  lines 544 and 557.
- Or strip the block on that path.
- Either way, name the typed path in spec §3.6 as a decision, not an omission.

### Minor

**8. Deadline (brief 4b, confirmed).**
- *Where:* spec §8 (lines 297–298) says the launcher waits for Gemini "until 09:00". Plan Task 4 Step 4
  (line 642) says "until 09:00 … a start after 09:00 needs its --deadline adjusted".
- *What is wrong:* the launcher has carried `--deadline 18:30` since 08:36, and `wait-for-gemini.mjs:16`
  rolls a clock time that has already passed to TOMORROW.
- *Fix:* change both texts to: "18:30 (set 2026-09-30 for the afternoon re-smoke). StartAt must be earlier;
  otherwise the gate waits into Thursday, bounded only by the task's 5 h limit."

**9. Line numbers.**
- *What is wrong:* the "kept whole" test title is at `verbalStreamFilter.test.ts:543`, not 544. See plan Task
  2 Files and Step 1 (lines 213 and 224) and spec §8 line 284 (the range is 543–546).
- *Fix:* correct the numbers. The plan quotes the text, so an Edit by text still lands.

**10. The claim "counts exactly the blocks the app would trim" is not exact.**
- *Where:* spec §3.2 (lines 88–90) and §3.4(b) (line 163).
- *What is wrong:* `cues_wellformed` also fails on `?`, "you" and empty lines, which the app never trims.
  It also counts RAW words, while `trimCues` counts after `cleanNotation`: a `$\frac{…}{…}$` cue is 4 raw
  words and 6 displayed ones.
- *Fix:* say "its line/word part counts the blocks the app would trim, up to notation cleanup".

**11. The metrics row accepts an empty displayed cue, which is the one state §3.3 creates.**
- *Where:* `wellformedCues` (plan Task 3 Step 7, line 559).
- *What is wrong:* it passes `''` (0 words, no `?`, no "you"). The smoke check flags that cue, and §3.4 says
  the row "guards the seam". On a flight, where the smoke check does not run, a cue that cleaned to nothing
  passes the row.
- *Fix:* add `x.trim() !== ''` to `wellformedCues`, plus one fixture line (for example `["", "Parquet"]`
  must read not well-formed). Or state in §3.3 that only the smoke check catches it.

**12. The launcher accepts a v1 dist.**
- *Where:* `launch-smoke-cues.cmd:20` and `register-cue-smoke.ps1:20`.
- *What is wrong:* both guard on `__CUES__` only, which v1 also carries. A stale dist would be smoke-tested
  at 3/5 and fail on S1Q09-type blocks for the wrong reason. Task 4 Step 2's manual markers cover this once,
  but the launcher is what runs at 17:00.
- *Fix:* also require `function trimCues` in `dist-electron\electron\llm\verbalStreamFilter.js`.

**13. The wording swap is confined in code but not in process, and the build proof does not cover it (brief item 3).**

*In code, the swap is confined to `CUE_SHAPE_RULE` and its pin.* Nothing else reads the bullet:
- `CUE_RULE_MARK` is the `[CUES FIRST]` header.
- `carriesCueRule`, `withCueRule` and `withoutCueRule` compare the whole `P.CUE_RULE` of the same build.
- `withCueRule`'s anchor is `SPOKEN_LENGTH_AND_DEPTH`.

*In process, it is not:*
- Task 4 Step 1 edits prompts.ts and prompts.test.ts after "the three commits", while Step 2 requires a
  clean tree. The swap therefore needs its own reviewed commit. If spike 6 reports before Task 1 starts,
  which the timeline makes likely, Task 1 should implement the winner directly.
- The Task 1 commit message names "one-first".
- The new `CUE_RULE` doc comment (plan lines 126–127) calls the first line "the answer itself". That fits
  one-first and strict-ex, but not cap3-min.
- The PREREGISTER amendment and the pass records name the wording.
- None of the three build markers depends on the wording, and esbuild drops the `// ── benched wording ──`
  comment.

*Fix:*
- Say all this in the swap note.
- Make the doc comment neutral to the wording.
- Add a fourth marker: a fragment unique to the winner (for one-first:
  `A one-part question gets exactly one line. Add a line only`). Alternatively, have the probe and the bench
  print the dist's `CUE_SHAPE_RULE`.

**14. Probe details (spec §3.5.3; plan Task 4 Step 5, line 654).**
- (a) 7 items × 4 reps is 28 calls per model, not ~56.
- (b) X1–X6 and M1 are the items the wording was chosen on, so the probe's one-line rate carries a
  winner's-curse bias. Add 6 fresh, invented, holdout-checked simple questions and report both sets.
- (c) Say whether one-line-answer and answer-first are read on the DISPLAYED block, which is what the user
  sees. Report both the displayed and the raw result.
- (d) Take the limits from the dist (`P.CUE_MAX_LINES`, `P.CUE_MAX_WORDS`) rather than the literals `(3, 5)`.
- (e) Calibrate the refusal once: it must refuse on the 05:00 run's prompts, which carry the old rule.

**15. The re-smoke's PASS criterion is literal.**
- *Where:* plan Task 4 Step 4 (line 650) requires "20/20 present, 20 well-formed".
- *What is wrong:* supersedes change n. The 05:00 check saw 22 cue lines while the row read 20/20.
- *Fix:* require "present = well-formed = n, and n ≥ floor(0.9 × delivered)".

**16. Scope note on the cleanup.**
- *What is wrong:* §3.3 applies every `cleanNotation` rule to displayed cues. Those rules were written for
  speech. On screen, the single-star and backslash rules can change legitimate text: "3*4 shards" becomes
  "34 shards", and "O(n*m)" becomes "O(nm)".
- The cleanup is the author's addition, prompted by spike 4's raw-LaTeX cue. It is not one of the user's
  decisions. It is reasonable.
- *Fix:* say in §2 or §10 that it is the author's addition, so the user can veto it, and add one line to
  §3.3 about the star rule.

**17. Commit trailers.**
- *What is wrong:* the plan's Global Constraints (line 16) and the three commit messages hardcode
  `Co-Authored-By: Claude Fable 5.1`.
- *Fix:* use the committing session's attribution line. The branch's recent commits carry Opus 5.5 and
  Sonnet 5.

**18. SPIKE6-RULE's branch for "every arm disqualified" is undefined.**
- *Where:* `SPIKE6-RULE.md` item 4 and spec §3.1 (lines 78–80).
- *What is wrong:* both keep "the best-guarding arm" without saying which measure defines it.
- *Fix, before 10:03 with a timestamped note:* for example, fewest complex blocks over 3 lines summed over
  both models, then fewest empty simple blocks, then strict-ex.

## Checked and correct (brief item 2)

**prompts.ts and its test:**
- The line numbers match: prompts.ts 200–204, 206–214 and 223; prompts.test.ts 16 and 242–252 (the describe
  and its first `it`), with 254–260 kept.
- At 3/5, `CUE_SHAPE_RULE` equals `ONE_FIRST` in `make-spike6.mjs` byte for byte.
- In spec §7, the cap3-min text matches `spike3.mjs` and the strict-ex text matches `make-spike6.mjs`.
- Each candidate has exactly three "3"s and one "5", so the swap note's interpolation rule holds. No
  candidate contains an apostrophe, so the single-quoted pin is safe, and none contains "Never more than".
- The spikes made exactly the two edits the spec names (`OLD_LINE1` to `NEW_LINE1`, and `OLD_RULE` to the
  arm). The shipped template line interpolates `CUE_MAX_WORDS`.
- `CUE_SHAPE_RULE` is declared after the two constants and before `CUE_RULE`, so there is no temporal dead
  zone.

**verbalStreamFilter.ts:**
- Lines 342–343 match, `cleanNotation` closes at 563, and the comment of `stripSpokenNotation` starts at 565.
  `trimCues` keeps `cleanNotation` private.
- The test proves cleanup runs before the cut. `$\frac{3,000}{9,500}$ true positive rate` is 4 raw words and
  cleans to 6 ("3,000 over 9,500 …", as in spokenNotation.test.ts:106–108), so a cut-then-clean
  implementation fails the test.
- `$O(\log n)$ time complexity` cleans to `O(log n) time complexity`. The backtick/bold case, `**` → `''`,
  and the 7-word and 5-word cases all compute as the plan expects.

**IntelligenceEngine.ts:**
- The import anchor at line 15, `onCues` at 404–411, and the emit sites that read `pendingCues` all match.
  The type of `generateStream`'s eighth parameter fits.
- The two existing engine cases stay green: one is 2 lines of at most 4 words, the other is `[]`.
- The log order is asserted (the trimmed line's index is below the cues line's index). The logged cues line
  is the displayed block. "No trimmed line when nothing was cut" is asserted.

**The existing readers ignore the trimmed line:**
- The metrics regex needs `cues: (\[` directly after `[Answer] `.
- `'[Answer] cues trimmed: …'.includes('[Answer] cues:')` is false.
- The updated synthetic fixture proves the metrics side: n stays 2 while a trimmed line is present. The
  planned calibration fixture proves the check side.
- The judge's `[Answer] full:` regex is unaffected.

**Drift test:**
- After Task 1 Step 3 it receives `wellformed: 3` against an expected 1. The 4-line block of 2-word cues and
  the 6-word line both pass the 5/8 literal. This is exactly the plan's expectation, and the test passes
  after Step 5.
- The test does run. The 2 skips in that file are the 2026-09-02 fixture.

**Metrics test edits:**
- Edits (a)–(e) land on the lines named. The synthetic log's offsets run from 0 to 1e9, so the inserted line
  is safe.
- The `show` assertion fails before Step 7. The `pass(trimmed: 3)` assertion passes both before and after,
  by design: it pins "never gated".

**Build:** esbuild emits per-file CJS at node20 and keeps `const CUE_MAX_LINES = 3`, `function trimCues` and
the template literal, so the three markers can match. The baseline `tsc -p electron` count is 6.

## Answers to the brief

1. **Tests that fail without the change:** yes, for the limits, the cap, the log line and its order,
   cleanup before the cut, and the metrics field and row. No test mocks the unit under test: the engine test
   stubs WhatToAnswerLLM, and `trimCues` runs for real. Decisions with no test:
   - "A simple question gets one line of one or two words." It is prompt-only, reported by the probe and
     invisible on 3.1-lite (findings 2 and 14).
   - "Every named part is still covered." It is prompt-only, gated indirectly by SPIKE6-RULE's services p50
     and the bench's line gate (finding 3).
   - "The answer stays as today" on the typed path (finding 7).
2. **Plan code against the real files:** see "Checked and correct". There is one off-by-one (finding 9).
3. **The wording swap:** confined in code, not in process (finding 13).
4. **The controller's two points:** 4a is confirmed, and it is worse than reported (finding 5). 4b is
   confirmed (finding 8).
5. **The bench gate:** consistent with the user's decisions, provided the gated part is defined and the scorer
   implements it (finding 3).
6. **What the gates do not reach:** findings 1, 2 and 7. The engine→renderer seam is v1's seam, unchanged
   (the payload is still `string[]`) and covered by v1's tests. Nothing live looks at the overlay.
7. **Scope:** the one addition beyond the user's decisions is the cleanup (finding 16); it is justified but
   should be flagged. Missing: the scorer (finding 3), the post-merge smoke (finding 1) and the typed path
   (finding 7).

## Verdict

**READY after the listed fixes.** Tasks 1–3 can go to Sonnet as written, after fixing the line number
(finding 9) and the commit trailer (finding 17); finding 11 is optional.

What each fix gates:

| Deadline | Findings to fix |
|---|---|
| Before 10:03 | 18, plus the optional tightening in 6 |
| Before the re-smoke is armed | 1 or 2 (decide which build and model the re-smoke runs), 4, 5, 6, 8, 12 |
| Before the bench | 3 |
| Before the merge | 1, 7 |
