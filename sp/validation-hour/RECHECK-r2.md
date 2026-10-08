# Re-check: PREREGISTER-h40d.md, revision 2 (scoped)

Re-checker: Opus (`claude-opus-5-5`), 2026-10-01, from about 02:00 local.

**Scope:**
- the 21 findings of `REVIEW.md`;
- the controller's rulings on the ten open questions and on A–E, as `CHANGES-r2.md` states them;
- defects the revision itself introduced.

It is not a second full review.

**How it was done:**
- Read-only. I wrote only this file and throwaway scripts in `VH\recheck-scratch\`. The scripts read files and print numbers, ids and timestamps.
- No test, build, npm, tsc, API or model call. No git call in MAIN.
- I read no `.env`, key, `credentials.enc`, captured prompt or `verbal-prompts.log`, and no `spike*`, `probe-shipped*` or `repro*` file.
- No model answer text is quoted. The replay scripts print word counts only.

## VERDICT: READY WITH FIXES

**Earlier findings: ADDRESSED 19 · PARTIAL 2 · NOT ADDRESSED 0.**
**New findings: Important 4 · Minor 5.**

**What is fixed.** Both Critical findings are fixed as the review asked. Every calibration the fixes rely on reproduces byte for byte or number for number.

**What is left** is text, one instrument line, and a few questions for the user; no new data or model call is needed.

- **I5 (PARTIAL).** §5's precedence list has gaps, and two outcomes can each be read two ways.
- **M13 (PARTIAL).** The noise condition cannot fire on the baseline's own noise.

Four new findings matter more than the Minors:

- **N1.** Nothing pins knowledge mode. Thursday's live look, now a precondition, toggles it, and the app persists it.
- **N2.** The gated wrong clause now also counts empty prose. Its stated null of "about 0" is the plug-in of nine zero reps, not a measured rate.
- **N3.** 5a still says "at least 44 of 45". That contradicts ruling D when two items are lost before dispatch.
- **N4.** A same-day re-run re-draws empty-prose twins, so it can resample a block-only twin away.

Apply the edits in the "Edits" section and settle the user list at the end. A check of the edited clauses is then enough; no full review is needed.

## What I re-ran, and what reproduced

- **`run-calibrations.mjs` is not read-only.** It overwrites `clocks.cal-r2.out.txt` and `thoughts-noise.out.txt` in VH. I ran a copy, `recheck-scratch\rerun-calibrations.mjs`, with the same cases, writing into `recheck-scratch\`. `diff` against the author's two outputs is **empty for both**.
  - The clocks reproduce: h40c 4.100 / 6.498 s, G 0.504 / 0.635 / 0.786 s; br1 G 0.501 / 0.555 / 1.219 s; the 16:12 run's C 0.217 / 0.717 / 1.170 s and G 0.674 / 1.165 / 6.879 s.
  - The 2d fixtures charge 1 / 0 / 0 with UNRESOLVED 0 / 0 / 1. The whole-log readings are 16:12 = 1 (window #2, 13:12:04.732Z, term 2 only) and h40c = 0.
  - The thinking-token calibrations reproduce: 0 → PASS, +150 → PASS, +151 → FAIL, +200 → FAIL, the exclusion case, the absent-control case and `--control-dir` (−14).
- **`hold-read.mjs`** (`recheck-scratch\rerun-holdread.mjs`, summary lines only):
  - h40c: T median 156 ms, B under 15 ms in 3 of 47, HOLD NO VERDICT (no blocks).
  - br1: T median 197.5 ms, B 0 of 42.
  - The 16:12 run: NOT GONE.
  - These are 2e's cited numbers.
- **The reviewer's scripts:**
  - `twin-wrongs.mjs` on h40a–c reproduces every count in CALIBRATION-NOTES §5.
  - `mains-band.mjs` gives h40a 29 against 27 / 31 / 28, h40b 27 against 29 / 28 / 30, and h40c 28 against 28 / 29 / 30.
  - `wrong-clause-null.mjs` gives 30.1 / 21.0 / 0.0%. The 0.0% comes from an input of nine zeros, which cannot produce a STOP (see N2).
- **Code citations verified** in the code that flies (the cue branch at `d83fdfe`):

  | file | lines | what |
  |---|---|---|
  | `interview60.flight.mjs` | 341–347 | `ruleSummary`, logged only in the skip line |
  | `interview60.flight.mjs` | 376 | `pairedArms` |
  | `interview60.flight.mjs` | 388 | the entry guard |
  | `launch-h40c.cmd` | 58 | the flight's stdout goes into the launcher log, so proofs (i) and (iii) are readable there |
  | `interview60.answers.mjs` | 175, 192 | `thoughts` |
  | `interview60.answers.mjs` | 301–305 | the `--no-cues` refusal, exit 2 |
  | `interview60.answers.mjs` | 314 | the resume rule (N4) |
  | `interview60.judge.mjs` | 163–168, 171–175 | `pairsFromAnswers`, `verdictOf` |
  | `WhatToAnswerLLM.ts` | 310 | screen t0 |
  | `LLMHelper.ts` | 3478 | hedge t0 |
  | `LLMHelper.ts` | 2441 | the knowledge intercept |
  | `LLMHelper.ts` | 2728 | prompt capture, verbal path only (so coding routes and short-circuits can never make a "mixed hour") |
  | `interview60.run.mjs` | 350–361, 385–420 | the probe and preflight |
  | `main.ts` | 687; `ipcHandlers.ts` 3030 | knowledge mode persisted (N1) |

- **Pass records.** `Answered hands-free` reads h40a 45/45, h40b 43/43 + 1 to nobody, and h40c 44/44, as rule 5's D bound says.
- **The edit list itself.** `recheck-scratch\check-anchors.mjs` finds every OLD string below exactly once, on the stated line (49 of 49). Its two deliberately wrong anchors fail, as they should. `test-n6-edit.mjs` runs edit N6 on a copy against a real case (N6).

## The earlier findings

| # | Finding | Status | Evidence, and what is left |
|---|---|---|---|
| C1 | One definition of "wrong"; the known case | **ADDRESSED** | Rule 3 opens with `verdictOf` "wrong" for 3b and 3c. Re-run on h40c, the known case reads PASS: band cue [36, 38] against control [36, 37], 38 ≥ 36; gated wrong control 1 / 0 / 0 (R08), cue 0 / 0 / 0. The h40b case also reads PASS (band 39 ≥ 38; gated 0 / 0 / 1 against 0 / 0 / 0). "n/a → PASS" is replaced by `--pre-cue` plus cue-check cases that have cues. Left: the one-definition paragraph does not mention that 3c extends "wrong" to empty prose (edit N2-a). |
| C2 | The wrong clause decided by the five follow-ups | **ADDRESSED** | The clause is on the 40 gated ids, the all-ids counts are printed beside it and the band stays on all ids, as asked. Its stated reason ("on the 40 about 0") and the empty prose added by I3's fix are **N2**. |
| I1 | The decomposition and the provider reading | **ADDRESSED** | screen = G + model + C per window. A 2a breach FAILs only when 2b or 2c fails, and is NO LATENCY VERDICT with both passing. The 16:12 line now reads NO LATENCY VERDICT, with 2e catching the hold. The printed "0 ms residual" is algebraic (N8). |
| I2 | 2c: arms at different times; the threshold | **ADDRESSED** | See "The 2c threshold's provenance" below the table. Left: the script never prints 2c INCOMPLETE (N6), and "first known case" is the wrong word (N8). |
| I3 | Empty answers counted as holes | **ADDRESSED** | A `transientError` record is a hole: not acceptable, not wrong, out of the cue check's n, and more than 3 in a rep gives INCOMPLETE. Empty prose counts as wrong and is named as a block-only twin. 2c's "ids answered" match (`h40d-thoughts-noise.mjs:59–61`). The known cases exist in the files. Two interactions are new: N2 (the gated clause) and N4 (the re-run). |
| I4 | A log line never printed | **ADDRESSED** | The proof is now three lines, all verified in code (above). |
| I5 | Outcomes without consequence; VOID masking | **PARTIAL** | Done: 2e in the cue-attributable branch, a rule-5 branch, GRADER DRIFT named, "2a breach + 2c INCOMPLETE = INCOMPLETE", the precedence stated, cue failures read through VOID. Left: (a)–(g) below the table. Edits: I5 and GRADER DRIFT. |
| I6 | The day | **ADDRESSED** | "Day = quota day" is defined once and used throughout, and it reads consistently with the other two pre-registrations (details below the table). The replay precondition is gone. Residuals: N9. |
| M1 | Grader-model check tied to one session | **ADDRESSED** | Specified with `--session` or a search, and four known cases. Not built, not checked. |
| M2 | 3e's reason; R05 | **ADDRESSED** | `mains-band.mjs` re-run matches rule 3e. R05's "every hour" is corrected. |
| M3 | The 3d join | **ADDRESSED** | The `--list` rows carry dispatch and won-by ISO times (re-run). |
| M4 | 2d bookkeeping | **ADDRESSED** | Union, UNRESOLVED, and the real block-only case, all re-run (above). |
| M5 | Quota wording; the control's exposure | **ADDRESSED** | Mentions are named as an upper bound; the bound is 30; the control-first exposure is stated. |
| M6 | 1(d) self-contradiction | **ADDRESSED** | |
| M7 | Rule 4's wording | **ADDRESSED** | |
| M8 | 5a's cause rule | **ADDRESSED** | Decided per item; an answer to nobody is resolved by hand. The new collision with 5a's threshold is N3. |
| M9 | The 3c adapter's calibration | **ADDRESSED** | Cases 3–7 are specified, and their arithmetic matches `benchDecide`: 0.9 × 44 = 39.6, so 39 → STOP and 40 → PASS; n = 44 − 3 = 41. Not built. |
| M10 | Wording; three "windows" | **ADDRESSED** | The four words are defined once; br1's roster is named. |
| M11 | The pre-hour start's commands | **ADDRESSED** | Commands, `PROBE READY` quoted, and no process left. The added success lines raise a timing problem: N5. |
| M12 | Re-runs | **ADDRESSED** | One statement; re-run ids are excluded from 2c, graded by the pinned grader and named. Its "fills only its holes" is false: N4. |
| M13 | 3a's noise reading | **PARTIAL** | Decided in 3a and §5, but the condition ("in-app not below its own cue twins' lowest count") fails on the baseline's own noise. In-app sat exactly one below its twins' lowest rep on h40c (35 against 36) and on h40b (35 against 36); h40a sat above (39 against 37). So a noise-driven 3a miss on an h40c-shaped hour never reads as noise, and the escape M13 asked for almost never opens. Edit M13 (for the user's veto). |

**I5, what is left.**
- (a) Precedence item 2 lists only 1(a)–(c) and 1(f). A 1(d) or 1(e) VOID has no entry, and walking the list with nothing else failed reaches PASS, which §4's opening forbids.
- (b) A 3a miss read as noise has no entry at all.
- (c) A 3a miss while 3c is INCOMPLETE becomes an "other FAIL" at once, although 3c may still pass after the same-day re-run. By analogy with 2a/2c it should be INCOMPLETE.
- (d) **Two-way:** §6 says "Outside the window, rule 2 is reported, not gated". §5 item 1 reads a 2b, 2c or 2e FAIL even in a NO LATENCY VERDICT hour, and an out-of-window start is one.
- (e) These are not listed: 2a or 2b INCOMPLETE on first-token coverage under 90%, a 2a breach with 2b INCOMPLETE, and a missing verdicts file for 3a or 3b.
- (f) The §5 bullet "Other FAIL on 2a (2b or 2c failing…)" contradicts item 1, which makes that case cue-attributable. A 2a breach can in fact never be an "other FAIL".
- (g) GRADER DRIFT (review I5c and B):
  - drift is detected "from the transcripts of the first agents dispatched", which are already grading h40d;
  - the (i)/(ii) choice is deferred to grading time, although B asked for it now;
  - §11's "grader alias at dispatch time" cannot be filled at arming;
  - it is not said whether a PASS under (i) validates.

**The 2c threshold's provenance (I2).**
- **From scenario50, as claimed.** The largest one-rep-versus-two difference is 38 (s50l). The largest rep-to-rep spread is 41. The pooled medians are 895, 882 and 900.
- **Holdout used only as measurement noise.** The holdout figures (30 / 67 / 25) choose no app behaviour. They do enter the threshold's justification ("more than 2 × 67"), and the text says so.
- **2.9 ms per token is sourced.** It is the median of the six printed pooled Theil–Sen slopes, stalls excluded (2.75, 2.81, 2.90, 2.94, 3.29, 3.77 → 2.92). 150 tokens is then about 0.44 s.

**The day rule (I6).**
- The bench's first amendment starts its day at 07:00Z and counts br1 on the 2026-09-30 quota day. Its second amendment (3a) asks for "the next quota day that has neither a flight nor another pre-registered replay on 3.5-lite". The replay's §8 allows only "after 10:00 … a day with NO flight and NO cue bench".
- In the preferred branch, the bench is on the 2026-09-30 quota day, the replay on the 2026-10-01 quota day and h40d on the 2026-10-02 quota day. No quota day carries two of them.

## The controller's rulings, applied through the text

| Ruling | Where | Consistent? |
|---|---|---|
| Q1: one pinned grader per arm, all ten in one session | §2, §7.4, §9.5, §12 | Yes |
| Q2: 3a gated, 3e reported, M13 decided | 3a, 3e, §5 | Yes. M13's condition is PARTIAL (above). |
| Q3: screen p90 reported | 2a | Yes |
| Q4: 2c on thinking tokens at +150; TTFT +1.0 s fallback; the bench's TTFT dropped | 2c, §10, §11, §12 | Yes. The script lacks 2c's INCOMPLETE (N6); "first known case" (N8). |
| Q5: 2e conditional, cue-attributable, whole log, h40c as the no-hold case | 2e, §5 item 1 | Yes. `hold-read` reads NO VERDICT on h40c because it has no blocks, so h40c shows B's shape on this roster rather than exercising GONE. Wording only. |
| Q6: pre-hour MAIN start with its commands | §7.3, §8 | Yes; timing N5 |
| Q7: `captured-low` always graded, never pooled | §2, 3d, §9.5 | Yes |
| Q8: true holes symmetric and out of the cue check's n; empty prose wrong; more than 3 holes INCOMPLETE | 3c, 2c, counting rulings, §13 | Yes; interactions N2 and N4 |
| Q9: fallback = the first qualifying quota day at 13:30; the earlier-questions flight yields | §6 | Yes |
| Q10: the full arm list; the two costs named | §2, §8 | Yes |
| A: one definition; gated clause; adapter calibrated with cues | rule 3, 3c, §7.4 | Yes, except that the one-definition paragraph omits the twin empty-prose extension (edit N2-a) |
| B: GRADER DRIFT | §6, §9.5, §11 | **No.** The choice is deferred; drift is detected too late; §11's line cannot be filled at arming (I5 (g)). |
| C: a cue failure read through VOID | §5 item 1 | **Contradicted** by §6's out-of-window sentence (I5 (d)) |
| D: pre-dispatch losses | rule 5 reading, 1(f) | **Contradicted** by 5a's threshold (N3) |
| E: re-run ids excluded from 2c, graded, named | 2c, counting rulings | Yes. The re-run as described re-draws empty prose (N4). |

## New findings

### N1 (Important). Nothing pins knowledge mode, and the live look that revision 2 makes a precondition toggles it

- **Where:** rule 1; the guard; §7.3's required lines; §6's precondition "the user's one live look … typed chat on the worktree build (merge review I1)", which is new in revision 2.
- **What:**
  - **The baseline ran with knowledge mode on.** h40c and br1 each log one `[AppState] Knowledge mode restored from settings`, one `[KnowledgeOrchestrator] Knowledge mode ENABLED` and no `DISABLED`. They also log an `[KnowledgeOrchestrator] Intent classified` line on every answer (h40c 47, br1 42).
  - **The state persists.** The Context toggle writes `knowledgeMode` to SettingsManager (`ipcHandlers.ts:3030`), and the app restores it at start (`main.ts:687`).
  - **The live look can leave it off.** It asks for "the two typed questions, Context ON and OFF" (RUNBOOK-resmoke2 §10.1). Tested in that order, it ends OFF, and the prestart and Friday's task inherit OFF.
  - **Nothing notices:** not rule 1, not the guard (env and dist only), not the prestart's required lines, not the precheck.
- **Why it matters:** with knowledge mode off, the knowledge intercept (`LLMHelper.ts:2441`) never runs.
  - G (h40c 0.504 s) leaves the screen clock, so 2a becomes about half a second easier and hides that much cue cost.
  - The answer path and prompt change, so 3a and 3b compare another configuration with h40c's floor.
  - The short-circuits disappear.
  - 3c still compares like with like, but on a path the baseline never flew.
- **Fix:** edit N1 adds rule 1(g) (VOID), requires `Knowledge mode ENABLED` in the prestart, and ends the live look with Context ON.

### N2 (Important). The gated wrong clause stops on any single gated wrong or empty-prose record, and its stated null is a plug-in of nine zeros

- **Where:** 3c "wrong, on the 40 gated ids"; the counting paragraph ("empty prose … counts as wrong on either side").
- **Why a single record decides:**
  - The control is now 3.5-lite HIGH, whose gated wrong count was 0 in all nine reps of h40a–c. So the worst control rep will very likely be 0, and any gated wrong in any cue rep STOPs.
  - `wrong-clause-null.mjs`'s 0.0% is computed from nine zeros, an input that cannot produce a STOP. That is a check that cannot answer differently (rule 8).
  - Nine zero reps still allow a per-rep chance up to 28% (95% bound). At 5% the clause's null STOP is 12.3%, at 10% it is 20.2%. The expectation under the usual priors is 9.0% (Jeffreys) or 14.4% (uniform).
  - Source for these figures: `recheck-scratch\gated-null.mjs`. It agrees with the Bernoulli closed form, 12.2% at 5%.
- **What revision 2 adds:**
  - It counts empty prose as wrong in the same clause.
  - The only empty-prose records on file are 2 of 825 3.5-lite HIGH captured twin answers, in 2 of 20 reps: s50l `captured-high-r3` S1Q06 and s50m `captured-high-r2` S2Q06 (`empty-prose-rate.mjs`).
  - Both are fenced answers that `filterCodeFences` empties by design, cues or not. Word counts per stage: 43 → 0 and 54 → 0 at that filter (`replay-stages.mjs`).
  - The combined build's chain still empties both (`replay-empties.mjs`, with the Oct 1 00:03 worktree dist).
  - The replay is calibrated: 76 of 76 non-empty records from the same files reproduce their stored word count, and none become empty (`replay-calibrate.mjs`).
  - Holdout40's own rate before cue mode was 0 of 396.
- **Why it matters:**
  - A 3c STOP is a cue-attributable FAIL, which leads to a revert or to disabling cue mode.
  - The clause now turns on single events, one of which (a fenced answer) the pipeline produces with no cue involvement.
  - The known case cannot show this, because its control (`captured-low`) had a gated wrong in r1.
- **Fix, minimal (edit N2):**
  - Keep a block-only twin in the gated clause, since it cannot exist without cue mode.
  - Treat a record emptied by `filterCodeFences` as a pipeline event on either side: counted wrong in the all-ids line, named, and kept out of the clause.
  - The adapter prints the stage that emptied each record.
  - State the null honestly.
- **Fix, robust (for the user):** compare the three reps' sums with a margin of one ("cue total gated wrong ≤ control total + 1"). Its null STOP is 0.9% at a 5% per-rep chance and 3.1% at 10%. It still stops two or more extra gated wrong answers, and a single one is named and read item by item. This replaces `benchDecide`'s wrong clause for this hour, so it is the user's call.

### N3 (Important). 5a's "at least 44 of 45" contradicts ruling D at two pre-dispatch losses

- **Where:** 5a (line 435) against the per-item reading (lines 442–450) and §5 item 3 ("rule 5").
- **What:**
  - With R05 and one more item lost before dispatch, 5a reads 43 < 44, a rule-5 FAIL (an other FAIL).
  - The reading says the second loss "counts as not acceptable in 3a and the hour continues … 'PASS net of pre-dispatch losses'".
  - The draft tied 5a to the reading ("5a at 43 or fewer … before dispatch, is VOID, not FAIL"); revision 2 dropped that tie.
  - This is plausible: h40a–c lost 0 / 1 / 1 items before dispatch with 2 / 3 / 1 not-a-question closes.
- **Fix:** edit N3.

### N4 (Important). The same-day re-run re-draws every empty-prose record, so a block-only twin can be resampled away

- **Where:**
  - 3c counting, line 351: "`answers.mjs` resumes from the file and fills only its holes";
  - counting rulings, line 465;
  - rulings M12 and E.
- **What:**
  - `answers.mjs:314` skips a record on resume only when `spoken` is non-empty (`if (store[item.id]?.spoken) continue`). An empty-prose record is answered again, exactly like a hole.
  - So a bare re-run of an arm with more than 3 holes also re-draws its block-only twins. Those are the cue failures I3's fix now counts, and this is the resampling review I3(a) warned about.
  - The re-run's copy-back and re-export are not stated. The flight copies each arm's file into the run folder and exports it; a manual re-run does neither.
- **Fix:** edit N4 (`--only <that rep's transientError ids>`, the command, copy back, re-export).

### N5 (Minor). The pre-hour start stops the app seconds after `PROBE READY`

- **The wording is wrong.** `run.mjs:385–420` checks that the probe clip was *heard*, then prints READY. §7.3 says it waits until the log shows the question "heard and answered".
- **The required lines can fail for a timing reason.** `app:stop` runs a few seconds after `PROBE READY`. If it cuts the last probe answer between its cues line and its full line, `check-smoke-cues` counts one cues line too many and reads NOT CLEAN. If it cuts earlier, the required won-by and cues lines can be missing.
- **Fix:** edit N5 (a 60 s wait; correct the wording).

### N6 (Minor). `h40d-thoughts-noise.mjs` never prints 2c INCOMPLETE

- Rule 2c: "INCOMPLETE when either side has a rep with more than 3 true holes". The script's verdict line is PASS or FAIL whatever the holes.
- Its own holes line says "(… makes 3c INCOMPLETE; 2c is read on the ids answered)", which contradicts the rule.
- **A real case shows it.** s50e's `interview60.answers.gemini-3.7-flash.json` has 4 holes of 5 ids. With that arm as both sides, the script prints `rule 2c reading: PASS (fallback)`.
- **The edit is tested.** A copy with edits N6-a and N6-b applied literally prints `INCOMPLETE (more than 3 true holes: cue -r1 (4), control -r1 (4))` on that case, and still PASS on h40c (`recheck-scratch\test-n6-edit.mjs`; the original is untouched, same sha256).
- **Fix:** edit N6 (two lines plus that calibration case).

### N7 (Minor). Rule 4's short-circuit numbers and names

- **h40a had one card answer, not two.** `__negotiationCoaching` sits on two log lines of the same answer, both at 07:30:21.438Z in one dispatch window.
- **The row name is wrong.** The report's row is `Technical questions answered via the coaching path`, which counts occurrences (h40a: 2). There is no `Coaching-path answers` row.
- **"Never VOID" is not quite true.** Rule 4 says a short-circuit "never makes the hour VOID", but a short-circuit window has no `verbal hedge: front=` line. Three of them would trip 1(b) (42/45 = 93% < 95%).
- **Fix:** edit N7.

### N8 (Minor). Wording

- **The 0 ms residual.** G is computed as the remainder, so the "identity's residual, 0 ms" can never be anything else. It checks the script's arithmetic only; what G contains rests on the code trace.
- **"First known case".** The bench's thinking-token difference is a first real reading, not a known case: its answer is not known beforehand.
- **`--pre-cue`.** The flag should be barred from the h40d reading.
- **"Decides rule 2 outright"** (line 298) reads against the provider reading.
- **The header time.** Revision 2's header says "written … about 02:30 local", but the file was saved at 01:50 and it was 02:28 when this re-check began writing. Correct it before the commit that registers it.
- **Fix:** edit N8.

### N9 (Minor). Day-rule residuals (I6)

- **The bench's stale sentence.** In the "Otherwise" branch, the bench's second amendment (3a) says "cue mode does not merge on Thursday". That sentence rests on its next one ("That day is not Thursday: the follow-up replay's day rule excludes a cue bench"), whose premise the 01:18 ruling removed. Revision 2 plans a Thursday merge in that branch without saying so.
- **The hard-coded quota day.** §7.3, §7.5 and §8 name "the 2026-10-01 quota day" for the prestart and the chains run, which is wrong on a fallback day.
- **Fix:** edit N9.

## Edits (mechanical; line numbers are revision 2's, from `grep -n`; each OLD string is unique in the file)

### Edits for N1 (knowledge mode)

N1-a. After line 203 (`- (f) the reliability void of rule 5 (more than 2 losses before dispatch).`), insert:
```text
- (g) knowledge mode not on, as it was on h40c: the last `[KnowledgeOrchestrator] Knowledge mode ENABLED` /
  `DISABLED` line before the run window is not `ENABLED`, or a `DISABLED` line falls inside it, or fewer than 95% of
  dispatch windows carry an `[KnowledgeOrchestrator] Intent classified` line (h40c and br1: one `ENABLED` after
  `[AppState] Knowledge mode restored from settings`, no `DISABLED`, `Intent classified` 47 for 47 and 42 for 42
  windows in the whole log). The Context toggle persists (`ipcHandlers.ts:3030`, restored at start by `main.ts:687`)
  and the live look of §6 turns it on and off; with it off the knowledge step (G) and the knowledge prompt are gone,
  and 2a and rule 3 would compare another configuration with h40c's.
```
N1-b. Line 534, replace `typed chat on the worktree build (merge review I1);` with
`typed chat on the worktree build (merge review I1), ending with Context ON (the toggle persists into the hour; rule 1(g));`

N1-c. Line 580, replace ``[Main] follow-up parent: off`, at least one`` with
``[Main] follow-up parent: off`, `[KnowledgeOrchestrator] Knowledge mode ENABLED` and no `DISABLED`, at least one``

N1-d. Line 712, replace `first, then rule 1 (a)–(c),` with `first, then rule 1 (a)–(c) and (g),`

The precedence lines that name 1(g) are in the I5 edits below.

### Edits for N2 (the gated clause and empty prose)

N2-a. Line 306, replace ``correctness-0 counts 1 / 0 / 1 (`review-scratch/twin-wrongs.mjs`).`` with
```text
correctness-0 counts 1 / 0 / 1 (`review-scratch/twin-wrongs.mjs`). For twin records only, empty prose (3c's counting,
below) also counts wrong; which empty-prose records enter 3c's gated clause is said there.
```
N2-b. Line 332, replace `on the 40 about 0` with
`on the 40 about 0 by the plug-in (nine reps all 0, an input that cannot produce a STOP — not a proof: nine zero reps allow a per-rep chance up to 28%, and at 5% this clause stops 12% of hours with no cue effect, recheck-scratch/gated-null.mjs)`

N2-c. Line 334, replace `be drawn from how R09F and R02F happen to fall.` with
```text
be drawn from how R09F and R02F happen to fall. **Empty prose in this clause (re-check N2):** a block-only twin —
cues present, prose emptied by any stage other than `filterCodeFences` — counts, since it cannot exist without cue
mode; a record whose prose `filterCodeFences` removed (a fenced answer, which the verbal path drops by design, cues or
not) is a pipeline event on either side: counted wrong in the all-ids line and named, never in this clause. Both
empty-prose records on file (s50l `captured-high-r3` S1Q06, s50m `captured-high-r2` S2Q06; 2 of 825 3.5-lite HIGH twin
answers) are fenced answers, and the combined build's chain still empties them (`recheck-scratch/replay-stages.mjs`).
```
N2-d. Line 347, replace `and on the cue side it is named as a block-only twin.` with
`and on the cue side, with its cues present, it is named as a block-only twin (which empty-prose records enter the gated clause: "wrong" above).`

N2-e. Line 631, replace `empty prose counted wrong` with
`empty prose counted wrong with the stage that emptied it (filterCodeFences = a pipeline event, all-ids line only; any other stage with cues present = a block-only twin, gated clause)`

N2-f. Line 641, replace `→ each counted wrong and named.` with
```text
→ each counted wrong in the all-ids line, named as emptied by `filterCodeFences`, and kept out of the gated clause;
     (8) synthetic, in memory: one gated id in one cue rep given a raw that holds a cue block alone (`stripCueBlock`
     empties it) against a 0 / 0 / 0 control → a block-only twin in the gated clause → STOP. Case (5)'s empty-prose
     record is built the same way.
```
N2-g (optional, for the user): the robust sum-with-margin clause of N2. If chosen, 3c's wrong bullet reads "the cue reps' total gated wrong ≤ the no-cue reps' total gated wrong + 1", the adapter feeds `benchDecide` the band and cue check only, and the known cases are re-stated (h40c: control total 1, cue 0 → PASS; h40b: control 1, cue 0 → PASS).

### Edits for N3 (5a)

N3-a. Line 435, replace `**5a. Answered: at least 44 of the 45 roster items have an attributed in-app answer**` with
```text
**5a. Answered: every roster item has an attributed in-app answer, except items lost before dispatch, which the
  reading below decides (the baseline's one expected, a second counted not acceptable, a third VOID); 5a FAILS only on
  an item lost after dispatch that 2d does not charge**
```
N3-b. Line 447, replace `pre-dispatch losses" only if 3a still holds that way.` with
`pre-dispatch losses" only if 3a still holds that way, and it validates as a PASS does.`

### Edits for N4 (the re-run)

N4-a. Line 351, replace ``(`answers.mjs` resumes from the file and fills only its holes)`` with
```text
(with `--only <that rep's transientError ids>`, never a bare resume: `answers.mjs:314` skips only records whose
  `spoken` is non-empty, so a bare resume also re-draws every empty-prose record and could resample a block-only twin
  away; from MAIN, `node electron\test\golden\interview60.answers.mjs --model <the arm's model> --tag <the arm's tag>
  <the arm's PAIRED_ARMS args> --captured <run-dir>\interview60.prompts.json --only <ids>`, then the arm's file is
  copied into the run folder and re-exported with `interview60.judge.mjs <run-dir> --answers <that file> --export`
  before grading)
```
N4-b. Line 465, replace `- A same-day re-run of a twin arm fills only its holes;` with
``- A same-day re-run of a twin arm passes `--only` with that rep's `transientError` ids (never a bare resume, which re-draws empty prose too);``

### Edits for I5 (precedence and two-way outcomes)

I5-a. Line 477, replace `or 1(f) or NO LATENCY VERDICT` with `or 1(f) or 1(g) or NO LATENCY VERDICT (an out-of-window start included)`

I5-b. Line 479, replace `2. **VOID** (rule 1(a)–(c), 1(f)):` with
`2. **VOID** (rule 1(a)–(g); under 1(d) or 1(e) item 1 does not apply — the build or the captured rule is unproven — and cue failures are reported only):`

I5-c. Line 482, replace `3. **other FAIL** — 2a (with 2b and 2c PASS the reading is NO LATENCY VERDICT, not FAIL), 2d, 3a (not read as noise),` with
`3. **other FAIL** — 2d, 3a (not read as noise, with 3c decided),`
and line 483, replace `   3b, rule 5.` with
`   3b, rule 5 (a 2a breach is never here: item 1 with 2b or 2c failing, item 4 with either INCOMPLETE, item 5 otherwise).`

I5-d. Line 484, replace `4. **INCOMPLETE** — 2c, 2d, 2e or 3c undecided with nothing already failed; a 2a breach with 2c INCOMPLETE.` with
```text
4. **INCOMPLETE** — 2a or 2b on first-token lines covering under 90% of the won-by windows, 2c, 2d, 2e or 3c
   undecided, or a verdicts file missing for 3a or 3b, with nothing already failed; a 2a breach with 2b or 2c
   INCOMPLETE; a 3a miss while 3c is INCOMPLETE.
```
I5-e. Line 485, replace `5. **NO LATENCY VERDICT** — 2a's provider reading, or an out-of-window start.` with
`5. **NO LATENCY VERDICT** — 2a's provider reading, or an out-of-window start; and, with the same consequence (cannot PASS; re-fly inside the window), **3a NOISE** — a 3a miss read as noise (rule 3a).`

I5-f. Line 503, replace `**Other FAIL on 2a (2b or 2c failing: see above; otherwise NO LATENCY VERDICT), 2d, 3b, or rule 5**` with `**Other FAIL on 2d, 3b, or rule 5**`

I5-g. Line 520, replace `Outside the window, rule 2 is reported, not gated,` with
`Outside the window, 2a and 2d are reported, not gated (a cue-attributable FAIL of §5 item 1 is still read),`

I5-h. Line 726, replace `LATENCY VERDICT → PASS, with GRADER DRIFT as a modifier.` with `LATENCY VERDICT or 3a NOISE → PASS, with GRADER DRIFT as a modifier.`

### Edits for GRADER DRIFT (I5 (g), review B)

GD-a. Line 524, replace `(verified from the transcripts of the first agents dispatched)` with
`(read from ONE probe agent — model "opus", a one-line task — dispatched before any h40d grader, its model read with h40d-grader-models.mjs; read at arming as well, §11)`

GD-b. Line 528, replace `The user then chooses between` with
`The user chooses NOW, in the veto window before arming (the choice is written into §11), between`

GD-c. Line 531, replace `Neither is chosen after h40d's 3a number is known.` with
`Under (i), 3a gates against the re-graded floor and a PASS validates, reported as "PASS (grader re-pinned to <id>)".`

GD-d. Line 721, replace `dispatch the ten grading agents` with `dispatch the probe agent of §6 and read its model; then the ten grading agents`

GD-e. Line 778, replace the line with:
```text
- The grader alias at arming (one probe agent, `h40d-grader-models.mjs`): `________`; the user's GRADER DRIFT choice,
  made now, (i) re-pin / (ii) not validated: `________` (read again from a probe agent before grading, §9.5).
```

### Edits for M13 (for the user's veto: it changes the controller's M13 condition)

M13-a. Line 313, replace `**not below the smallest of its own three cue twins' counts on the ids` with
`**at most 1 below the smallest of its own three cue twins' counts on the ids`

M13-b. Line 314, replace `they share** reads as noise:` with
`they share** (the baseline's own gap: h40c in-app 35 against its twins' lowest 36, h40b 35 against 36, h40a 39 against 37; under "not below", a 3a miss on an h40c-shaped hour could never read as noise) reads as noise:`

M13-c. Line 507, replace `the in-app count is not below the smallest of its own` with `the in-app count is at most 1 below the smallest of its own`

### Edits for N5 (the pre-hour start)

N5-a. Line 573, replace ``node … interview60.run.mjs probe` → `node …`` with
``node … interview60.run.mjs probe` → a 60 s wait (`timeout /t 60 /nobreak`) → `node …``

N5-b. Lines 575–576, replace `and plays the 34 s continuous probe until the app's own log shows it heard` (line 575) with `and plays the 34 s continuous probe, requiring the app's own log to show it heard`, and `and answered a question (` (line 576) with
`a question (it does not wait for the answers; the 60 s wait lets the last one finish, or a cues line with no full line reads NOT CLEAN in check-smoke-cues) (`

### Edits for N6 (`VH\h40d-thoughts-noise.mjs`)

N6-a. Line 105, replace
```js
    const verdict = covOk ? (dTh <= THRESHOLD ? 'PASS' : 'FAIL') : (dTt <= TTFT_FALLBACK_MS ? 'PASS (fallback)' : 'FAIL (fallback)');
```
with
```js
    // Rule 2c: a rep with more than 3 true holes on either side makes 2c INCOMPLETE, whatever the medians say.
    const holey = [...cue.reps.map((r) => ['cue', r]), ...control.reps.map((r) => ['control', r])].filter(([, r]) => r.holes.length > 3).map(([side, r]) => `${side} ${r.rep} (${r.holes.length})`);
    const verdict = holey.length ? `INCOMPLETE (more than 3 true holes: ${holey.join(', ')})` : covOk ? (dTh <= THRESHOLD ? 'PASS' : 'FAIL') : (dTt <= TTFT_FALLBACK_MS ? 'PASS (fallback)' : 'FAIL (fallback)');
```
N6-b. Line 108, replace `(a rep with more than 3 true holes makes 3c INCOMPLETE; 2c is read on the ids answered)` with
`(a rep with more than 3 true holes makes 2c and 3c INCOMPLETE; otherwise 2c is read on the ids answered)`

N6-c. Add a calibration case: `node h40d-thoughts-noise.mjs <RUNS>\2026-09-14T08-22-28-s50e --cue gemini-3.7-flash --control gemini-3.7-flash` (4 holes of 5 ids) must read `INCOMPLETE (… cue -r1 (4), control -r1 (4))`; the unedited script reads `PASS (fallback)`. Add it to `run-calibrations.mjs`, `thoughts-noise.out.txt` and rule 2c's calibration list (§7.4).

### Edits for N7 (rule 4 numbers and 1(b))

N7-a. Line 416, replace `(h40c 0, h40a 2 — the salary` with `(h40c 0, h40a 1 — the salary`

N7-b. Line 420, replace ``The gate row `Coaching-path answers` is the cross-check.`` with
``The report's row `Technical questions answered via the coaching path` is the cross-check; it counts `__negotiationCoaching` occurrences, two log lines per card (h40a's one card reads 2).``

N7-c. Line 193, replace ``(b) fewer than 95% of dispatch windows contain a `verbal hedge: front=` line;`` with
``(b) fewer than 95% of dispatch windows, net of knowledge short-circuit windows (rule 4), contain a `verbal hedge: front=` line;``

### Edits for N8 (wording)

N8-a. Line 159, replace `construction (the clocks script prints the identity's residual, 0 ms):` with
`construction (G is computed as the remainder, so the script's printed 0 ms residual checks its arithmetic only; what G contains rests on the code trace above):`

N8-b. Line 247, replace `**The first known case is Thursday's bench's thinking-token difference**` with
`**The first real reading (a preview, not a calibration: its answer is not known beforehand) is Thursday's bench's thinking-token difference**`

N8-c. Line 634, replace `not applicable and says so (never a silent pass).` with
`not applicable and says so (never a silent pass); it is for known cases (1) and (2) only — the h40d reading runs without it, and a 3c line carrying the not-applicable mark is not a verdict.`

N8-d. Line 298, replace `decides rule 2 outright.` with `decides that clause outright (a 2a breach then goes through the provider reading).`

N8-e. Line 3, replace `written 2026-10-01 about 02:30 local` with the real time (the file was saved at 01:50).

### Edits for N9 (day-rule residuals)

N9-a. Line 543, replace `the replay moves to Saturday (the 2026-10-03 quota day).` with
```text
the replay moves to Saturday (the 2026-10-03 quota day). In this branch the bench's second amendment (3a) says "cue
    mode does not merge on Thursday"; that sentence rests on its next one ("That day is not Thursday: the follow-up
    replay's day rule excludes a cue bench"), whose premise the 01:18 ruling removed, so a Thursday merge after an
    afternoon bench follows 3a's operative rule (the next quota day with neither a flight nor a pre-registered replay
    on 3.5-lite); the user is told before the merge.
```
N9-b. Line 571, replace `Thursday after the rebuild, on the 2026-10-01 quota day,` with
`after the rebuild, on the quota day before the flight's (the 2026-10-01 quota day for a Friday hour),`

N9-c. Line 658, replace `the 2026-10-01 quota day, only if the ledger` with `the quota day before the flight's, only if the ledger`

N9-d. Line 701, replace `happen on the 2026-10-01 quota day, before Friday's 10:00, never on the flight's.` with
`happen on the quota day before the flight's (the 2026-10-01 quota day for a Friday hour), never on the flight's.`

### §12, for the veto

After line 806 (`grader, named (§4).`), add:
```text
And from the scoped Opus re-check (`RECHECK-r2.md`), each for the user's veto: rule 1(g) (knowledge mode on, as on
h40c); fenced-answer empty prose kept out of 3c's gated clause (or the sum-with-margin clause, N2); 5a restated
against the pre-dispatch reading; M13's gap of 1; the GRADER DRIFT choice made now.
```

## The "still needs the user" list: incomplete

`CHANGES-r2.md` lists four items. Three are right as they stand: the veto window, the bench's thinking-token difference above 150, and the live look. One is wrong in timing: the GRADER DRIFT choice. The complete list:

1. **The veto on §12.** Name **C** and **D** explicitly: the review put them to the user, and the controller took them.
2. **The GRADER DRIFT choice, now.** Choose (i) re-pin or (ii) not validated, and write it into §11. Review B asked for it now; revision 2 defers it to grading time, when a probe agent may already be grading. (GD edits.)
3. **Context ON at the end of the live look** (N1). The user operates the toggle, and it persists into the hour.
4. **2e's branch.** If the 05:00 re-smoke's `hold-read` reads NOT GONE or NO VERDICT on a proven dist, 2e is reported only if the user accepted that residual. The text relies on the acceptance, but the list does not name it.
5. **The bench's thinking-token difference above 150** is raised with the user before arming (already listed).
6. **The live look** itself (already listed).
7. **The "Otherwise" branch.**
   - A Thursday merge after an afternoon bench goes against the letter of the bench's 3a sentence (N9).
   - The follow-up replay, a registered run, moves to Saturday by a controller ruling (01:18).
   - The user should know both before the merge.
8. **This re-check's rule changes:** 1(g), N2's split (or the sum-with-margin clause), 5a, M13's gap of 1, and the precedence edits. The first four change registered clauses.

**Decided in the text that was the user's:** C and D, acceptable only if the veto actually happens before arming.
**The reverse:** B's choice is left for later, when it should be made now.

## Residual risks, and what I did not check

- **G's cue-independence rests on the code trace**, since only string work lies between the two t0s. One data point leans the other way. On the same afternoon and roster, the 16:12 cue run's G read median 0.674 s and p90 1.165 s, against br1's 0.501 s and 0.555 s. That is more likely the embedding service's load than cue mode, and it is free to test before arming. Run `h40d-clocks.mjs` on the 05:00 re-smoke (the combined build, scenario50 S1, hedge on) and write its G beside br1's into "What flies". If its median exceeds br1's by more than 0.1 s, say so, because the provider reading would then book a cue cost as provider load.
- **The empty-prose rate under cue mode on holdout40 is unknown:** 0 of 396 before cue mode. N2's figures treat reps as iid and use pre-cue rates.
- **Not built, so not checked:** `h40d-twins.mjs`, `h40d-rule3.mjs`, `h40d-grader-models.mjs`, `guard-h40d.mjs`, both launchers, the register and precheck scripts, the merge script, the dispatch text and `h40d-hascuerule-check.mjs`. I checked their specifications against `benchDecide` and the code they import, not their behaviour.
- **Scripts I did not re-run:** `check-smoke-cues.mjs` (I read its code for N5), `smoke-facts.mjs`, `dist-proof.mjs`, `quota-ledger*.mjs` and `h40c-hedge-stats.mjs`.
- **The bench has not run,** so I could not check its cue-file tag naming or its `thoughts` field.
- **MAIN's working tree:** not inspected, since this session makes no git call there.
