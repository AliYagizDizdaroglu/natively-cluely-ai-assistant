# Revision 1 of the small-cues spec + plan (controller → Fable, 2026-09-30 ~09:55)

The Opus review of your spec + plan is in `SP\cue-group\spec-review.md` (READY after fixes: 0 Critical, 7 Important,
11 Minor). Read it in full. Below: the controller's RULINGS on each finding (binding), and what is already done outside
your two files. Revise BOTH files; then reply briefly (what changed, anything you could not do). The wording itself
stays `one-first` for now: spike 6 runs at 10:03 and I will send the winner in a second message.

## Rulings
1. **Finding 1 (merge) — RULED: merge first.** MAIN's line is ALREADY merged into `feat/whole-turn-answers`: merge
   commit `279103b` (parents `fd57512` + `0ef42a0`; 8 conflicted files resolved; suite 979 passed / 8 skipped /
   0 failed; tsc root 0, electron the same 6; report `SP\cue-group\merge-report.md`; an Opus review of the merge is
   running and may add small fix commits). v2 is built ON THIS MERGED TREE. The re-smoke, the probe and the bench run
   on the merged build, so the user's gate tests what merges. Thursday: the post-br1 docs commit (MAIN, docs only) is
   merged into the cue branch, then MAIN's branch fast-forwards to the cue branch. Rewrite spec §3.5.6 and plan Task 4
   Step 6 to that procedure. **Refresh every file:line in the plan against HEAD `279103b`** (several files changed:
   IntelligenceEngine.ts, verbalStreamFilter.ts, metrics.mjs/.test.ts, …); every task's exact code must apply to the
   merged files.
2. **Finding 2 (model of the re-smoke):** resolved by ruling 1. The merged build's default is the hedge (unset
   `NATIVELY_VERBAL_HEDGE` = on): 3.5-lite HIGH answers first, 3.1-lite LOW races after ~5 s. The launcher clears the
   hedge/model/thinking variables, i.e. the shipped default. In §9, name what the re-smoke still does not reach: trims
   if none occur; one-line scaling on 3.1-lite (hedge wins only); the overlay itself (the user looks once); the notation
   cleanup unless it is logged. **Make the cleanup visible:** `trimCues` also reports the raw text of kept lines whose
   cleaned text differs (`cleaned`), and the engine logs the `[Answer] cues trimmed:` line when anything was dropped,
   cut OR cleaned (rename it if you think a clearer name is worth it — the existing readers must stay unaffected, and
   the controller's `SP\check-smoke-cues.mjs` counts lines containing `[Answer] cues trimmed:`; if you rename, say so).
3. **Finding 3 (bench gate): DONE by the controller.** `SP\cuebench\cuebench-score.mjs` now gates, per rep, RAW blocks
   present and SHAPED (1-3 lines, none empty, none with `?`, none with "you") on ≥ 90% of ids, and REPORTS words over 5
   (blocks and lines); calibrated (`cuebench-calibrate.mjs`, incl. a lines-only overrun at 35/39 = STOP and a words-only
   overrun = PASS) and exercised end to end (`e2e-cuebench.mjs`). `SP\PREREGISTER-cuebench.md` is amended (09:35,
   before any bench call): the three changes, the replaced cue row, the day rule (br1 flies today, so a quota check),
   and the benched rule named by the dist's `CUE_RULE` hash. Update spec §3.4(d), §9.3 and the plan to say this is
   decided and where.
4. **Finding 4 (smoke check): DONE by the controller.** `SP\check-smoke-cues.mjs` v2: 3x5, non-empty, no notation
   (a backtick, or a backslash before a letter, a bracket or `%`; money `$` allowed), an absent block is NOT CLEAN,
   `[Answer] cues trimmed:` lines counted and printed, never failed. `SP\calib-cue-smoke.mjs` asserts 13 known cases
   (good, the 3x5 boundary, money, trimmed-then-cues with "trimmed 1" read from the FULL output, four lines, six words,
   backtick, `\log`, absent block, empty cue, missing cues line, h40b, the env key name): all OK. Describe it as done.
5. **Finding 5 (pass records):** adopt the review's fix. Re-smoke: commit only the tool's `passes/<run>.md` after
   restoring `passes/INDEX.md` from HEAD (never commit an INDEX the worktree regenerated), plus
   `passes/<date>-cuesmoke-result.md` (wording, trims verbatim, check output, calibration output). Probe and bench:
   `PREREGISTER-<name>.md` + `<date>-<name>-result.md`, no INDEX row. MAIN's INDEX lists the re-smoke only after
   Thursday, if its run folder is copied into MAIN's runs folder and `--index` runs there. Reword §3.5.5.
6. **Finding 6 (absent blocks):** `SPIKE6-RULE.md` got an addendum at 09:25, before any counted call (read it): an arm
   is disqualified when 3.5-lite HIGH has more than 1 empty block of 36; fewest empties is the first tie key; the
   all-disqualified branch is exact. The re-smoke's rule is stated NOW, before arming: an absent block fails it (the
   2026-09-20 design). When spike 6 reports I will send the winner's empty counts; §9 then gets them and the predicted
   chance of at least one absent block in 20 answers.
7. **Finding 7 (typed chat path) — a NEW task.** Typed answers carry NO cue block (the user's "the full answer stays as
   today" covers typed chat; cues are for the hands-free interview answer). Derive, don't duplicate: export a verbal
   prompt WITHOUT the cue rule for the typed path, built so the two cannot drift (e.g. the hands-free prompt is the
   typed prompt + `CUE_RULE`), and use it at every `gemini-chat-stream` site in `ipcHandlers.ts` (the plain and the
   knowledge-injection branch). Tests: the typed prompt contains no `CUES_SENTINEL`; the hands-free prompt still ends
   with the structured tail + `CUE_RULE`. First grep EVERY consumer of `VERBAL_WHAT_TO_ANSWER_PROMPT` in `electron/`
   and decide each one explicitly in the spec (hands-free keeps the rule; typed does not; anything else: say why).
   Name the typed path in §3.6 as a decision.
8. Minor 8: the launcher's deadline is 18:30 (a start must be earlier or the gate rolls into Thursday, bounded by the
   task's 5 h limit). Fix both texts.
9. Minor 9 + all line numbers: refresh against 279103b (ruling 1).
10. Minor 10: the precise wording ("its line/word part counts the blocks the app would trim, up to notation cleanup").
11. Minor 11: adopt: `wellformedCues` rejects an empty displayed cue (`x.trim() !== ''`) + one fixture.
12. Minor 12: DONE by the controller: the launcher and `register-cue-smoke.ps1` refuse a dist without
    `function trimCues` (today's v1 dist has 0 occurrences: the negative case is proven).
13. Minor 13: Task 1 implements spike 6's WINNER directly (it reports before Task 1 starts); keep the swap note for the
    record; make the `CUE_RULE` doc comment neutral to the wording; add a 4th build marker = a fragment unique to the
    winner (and have the probe/bench print the dist's `CUE_SHAPE_RULE` — the bench scorer already prints it when exported).
14. Minor 14: adopt all five (28 calls per model; 6 FRESH invented simple questions, checked against
    `electron/test/golden/holdout40.questions.mjs`, reported beside X1-X6; one-line-answer and answer-first on the
    DISPLAYED and the RAW block; limits from the dist; the refusal calibrated on the 05:00 run's prompts). The probe is a
    controller scratchpad script: specify it in Task 4; I write it.
15. Minor 15: re-smoke PASS = `CHECK EXIT 0` from the v2 smoke check (one displayed block per answer line, all within
    3x5, no notation, no absent block) + the app healthy (S1 answered hands-free ≥ 90%, long questions whole) + the
    metrics row present = well-formed = n with n ≥ floor(0.9 × delivered). Write that, not "20/20".
16. Minor 16: say the notation cleanup is the author's addition (the user may veto it) and add the star-rule caveat
    ("3*4 shards" displays "34 shards") to §3.3.
17. Minor 17: commits are made by the controller with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
18. Minor 18: done (the addendum); update §3.1's summary of the rule and correct its time: `SPIKE6-RULE.md` was
    written at 08:29 (its header said "~08:50"; a times-only correction was made at 08:52).
19. The merge's concern 1 (for §9, not a task): the flight's `captured-no-cues` twins run on 3.1-lite LOW while the
    merged hour answers on 3.5-lite HIGH first; Friday's validation-hour pre-registration must pair like with like.
20. **A Global Constraint for the plan:** a live app hour (br1) runs 13:30-14:45 on this machine. No test runs, builds or
    type checks between 13:25 and 14:50; an implementer who reaches that window stops and reports.

Same rules as before: write only the two files; no git writes; never read `.env` or keys; no subagents; no `node -e`.
