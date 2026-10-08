# Task 4 review — the capped Flash sidecar (flight h40b)

Reviewer: Opus (read-only). Scope: Task 4's surface only — `gemma-answers.mjs` (the MAX_TRIES hunk), `flash-h40b-sidecar.mjs`, `flash-h40b-blind-pairs.mjs`, `flash-h40b-score-blind.mjs`, `flash-h40b-score-cal.mjs`, and the two throwaway helpers. All paths are under `<SP>` (the session scratchpad) unless named otherwise.

## Verdicts

| | Verdict |
|---|---|
| (1) SPEC COMPLIANCE | **Needs fixes**: 1 Important. Every exact value, name, path, gate and interface in the brief is met. The exception is the brief's stated intent for the runner's stream-cut retry: the brief's own Step 1 code defeats it, and the implementer resolved that conflict silently. They rewrote the BUDGET comment and did not report the deviation. |
| (2) TASK QUALITY | **Needs fixes**: 3 Important, 9 Minor, 0 Critical. The budget arithmetic is sound: it cannot overspend inside one invocation. The gates, the tiers.json shape, the arm collection and the scorer keys are correct on complete data. The problems sit on the incomplete-data paths, which the plan itself expects on flight day, and at one unguarded boundary. |

No Critical findings.

---

## What I ran (and did not run)

Everything below exited without an API call and without writing anywhere except this file.

- `node --check`: all 7 scripts OK (gemma-answers, sidecar, blind-pairs, score-blind, score-cal, fixture-build, cal-demo).
- `node flash-h40b-sidecar.mjs --plan`: tiers `R02F(4/7) R08(6/7)` / `R03(2/7) R09F(3/7) R16(3/7)` / 11 single-miss ids; `skipped (h40a evidence): R09 (1/7, no captured prompt)`; `6 / 9 / 11 / 11 requests (budget 18)`; **EXIT 0**. The tier lines are identical to h40a's own `flash-h40a/run.log`.
- `node flash-h40b-sidecar.mjs --dry`: same lines, then `NOT READY: no *-h40b run folder yet`, **EXIT 2**. `<SP>/flash-h40b/` still does not exist afterwards.
- MAIN `interview60.runs/` holds exactly one h40b-named entry, `flight-h40b-dry.launcher.log` (Task 2's file). `/-h40b$/` does not match it.
- Read-only `node -e` inspections:
  - The h40a Flash answer records: no cuts on 09-25; 503/429 pattern below.
  - h40a `interview60.prompts.json`: an object keyed by id, 44 entries, all carrying `system` and `user`, R09 absent.
  - Fixture key counts: 133 keys = 37 Flash + 96 lite. Tier 1/2 ids carry 9 answers; each tier 3/3b id carries 8, with both `gemini-3.6-flash default r1` and `gemini-3.5-flash default r1`.
  - Fixture pairs header (`model`, `rubric`, 32 items).
- In-memory regex tests of both calibrations against the scorers' exact line templates (results below).
- `diff MAIN/interview60.answers.mjs <SP>/gemma-answers.mjs`: the only hunk outside the generator's changes 1–8 is `286c314,315`, the Task 4 hunk.
- MAIN (read-only): `git log` shows the last commit is 08dcb8f at 18:52, before Task 4 was dispatched at 18:59. `find -newermt 18:58..19:21` finds only `electron/knowledge/IntentClassifier{,.test}.ts`, which are Task 1's concurrent edits. No Task 4 writes, no commits.
- **Not run:** blind-pairs, score-blind, score-cal, fixture-build and cal-demo (each writes into the scratchpad); the runner; the sidecar without a flag.

---

## (1) SPEC COMPLIANCE

### Requirement checklist

| # | Requirement (brief / global constraints) | Status | Evidence |
|---|---|---|---|
| 1 | Step 1: line 314 replaced by the brief's two lines, verbatim | Met | gemma-answers.mjs:314-315 match character for character, comment included |
| 2 | Default 4 tries for every other caller | Met | `Number(undefined ?? 4)` = 4. gemma-h40a-sidecar and flash-h40a-tiers do not set the env |
| 3 | Tier derivation = flash-h40a-tiers.mjs verbatim (h40a blind verdicts + h40a-verdicts-inapp.json; R09 skipped when uncaptured) | Met | sidecar:30-59 are the h40a lines apart from renames (P→P0, captured→capturedH40a, skipped→skipped0, no export). The output is identical to h40a's run.log |
| 4 | Tier values: 1 = R02F, R08; 2 = R03, R09F, R16; 3 = the eleven single-miss ids | Met | `--plan` output above. R09 is excluded, so tier 3 has eleven ids, as the constraint's "eleven" requires |
| 5 | PLAN: 3.8 / 3.7 with reps def, def-r2, def-r3; 3.6 and 3.5 with `def` on tier 3's ids | Met | sidecar:62-67 |
| 6 | `BUDGET = 18` | Met (value) | sidecar:68 |
| 6b | The BUDGET comment ("leaving 2 of the 20 for the runner's own stream-cut retry") | **Partially met** | The implementer rewrote it to "for slack". This deviation is unreported. See **S-I1** |
| 7 | env: GEMMA_ARMS_DIR, NATIVELY_ROSTER holdout40, GEMMA_CALL_TIMEOUT_MS 180000, GEMMA_MIN_GAP_MS, **GEMMA_MAX_TRIES '1'** | Met | sidecar:98. The spread order makes '1' win over any inherited value |
| 8 | `tier()` exactly as the brief | Met | sidecar:113-129 are the brief's code verbatim |
| 9 | Newest `*-h40b`; NOT READY when none | Met, exercised | sidecar:81-82. The explicit check replaces the brief's `${RUNS}/undefined` path, with the same exit 2 and a clearer message (reported deviation #3) |
| 10 | NOT READY exit 2 when prompts.json or timeline.json is missing | Met, by reading only | sidecar:84. Not exercised: no folder exists |
| 11 | Tiers 1/2/3 in parallel, 3b after 3 | Met | sidecar:150-152. 3b starts after all three finish, which is one reading of "after 3". It only costs wall-clock |
| 12 | tiers.json = `{model, ids, skipped, requests}` per string key '1','2','3','3b' | Met, by reading | sidecar:128, 151-153. The brief's *Interfaces* line (`{ model, ids, ok }`) is stale against its own Step 2 code and the plan's self-review; the implementation follows Step 2. Only a hand-built copy has been read downstream |
| 13 | All other lines (run spawn, answered, stamp, sleep, log files) are the 09-25 runner's | Met | Diff against flash-h40a-tiers.mjs: only promptsPath and GEMMA_MAX_TRIES change |
| 14 | `--plan` prints the tiers and 6/9/11/11 without a run folder | Met, exercised | EXIT 0 |
| 15 | `--dry` prints NOT READY today | Met, exercised | EXIT 2 |
| 16 | Answers at `flash-h40b/interview60.answers.<model>_<tag>.json` | Met, by reading | Runner naming at gemma-answers.mjs:108-111 plus `GEMMA_ARMS_DIR = OUT` |
| 17 | Blind pairs: RUN = h40b folder, F = SP/flash-h40b, tiers from tiers.json, every Flash arm per id, lite once | Met, exercised on the fixture | blind-pairs:15-26, 53-74. Fixture keys: 9 per tier-1/2 id, 8 per tier-3/3b id (3.6 and 3.5 both present) |
| 18 | Score-blind = h40a's with paths swapped; totals keyed by tier | Met | score-blind:12-16, 55-70. The repsOf/REPCOUNT and unique-id lite totals are *required* to reach the brief's own 11/11 and 48/48; a pure path swap would print 11/33 and 81/81 |
| 19 | Calibration expectations: 6/6, 9/9, 11/11, 11/11, lite 48/48, 0/… for wrong/weak; prints CALIBRATION OK | Met | score-cal:21-23 carry the brief's exact values. The implementer's fixture run printed CALIBRATION OK |
| 20 | Blind files under flash-h40b/blind | Met | blind-pairs:16 |
| 21 | The fixture is neither mistaken for nor written into the real location | Met | Fixture at `SP/flash-h40b-fixture/`, reached only through RUN_DIR/FLASH_DIR/BLIND_DIR. fixture-build:20 deletes only the fixture folder |
| 22 | Throwaway scripts in the scratchpad; MAIN unchanged; no commits | Met | git log/status and find -newermt, above |
| 23 | Budget never exceeded, even when later passes re-ask | Met within one invocation (trace in (2)) | Not across invocations: see Q-m3 |
| 24 | A 429 or 503 is recorded, never retried | Met | It *also* disables the stream-cut retry the plan intended: **S-I1** |

### Findings

**S-I1 (Important): the stream-cut retry the plan budgets for no longer happens, and a truncated answer is graded silently.**
Anchors: gemma-answers.mjs:314-315, 321-322, 338; flash-h40b-sidecar.mjs:68, 123-124.

- **The mechanism.** With `MAX_TRIES = 1`, a cut stream (`finish === null`) sets `dropRetried`. It then `continue`s into the loop test, and `a = 1 < 1` is false. There is no second `pacedAnswer`. The partial answer is stored as `spoken`, with `cutRetried: true` (:338).
- **What the sidecar does with it.** It drops the id from `todo` because `spoken` is truthy (:124). It never re-asks. It charges a phantom second request for it (:123).
- **What the plan intended.**
  - The brief's BUDGET comment reserved the 2 spare requests "for the runner's own stream-cut retry".
  - The SDD ledger's pre-flight scan reads "GEMMA_MAX_TRIES=1 plus the runner's one stream-cut retry counted".
  - The generator documents change 6 as "a cut stream is retried once" (gemma-answers-gen.mjs:8, 71).
- **What the implementer did.** Their self-review describes the mechanics correctly ("exits without a second pacedAnswer call"). They changed the comment to "for slack" (sidecar:68), did not list that change among their deviations, and did not surface the grading consequence.
- **Scenario.** On 2026-09-11, gemini-3.8-flash cut 3 of 8 answers on this free tier (09-25: 0 of 10). Say one of R08's reps is cut after half its words. It goes into `pairs.blind-1.json` as 3.8-flash's answer. The grader marks it weak for omitted parts, and tier 1's total drops a point. Nothing in the pairs, the key or the scorer output marks the answer: no `finish` or `cutRetried` column, and the scorer prints ttft, thinking tokens and total, which all look normal.
- **Fix: the controller rules on one of these.**
  - (a) Let the cut retry bypass MAX_TRIES in the runner. The sidecar already pays for it at :123.
  - (b) Have the sidecar delete `cutRetried`/`finish === null` records from the answers file before the next pass, so they are re-asked.
  - (c) At minimum, mark such answers in score-blind's row and in the reasons list.

  Whichever is chosen, the BUDGET comment and :123 must say what actually happens.

No Minor spec findings beyond the notes in the table (rows 11, 12).

---

## (2) TASK QUALITY

### Budget accounting: the trace

Under `GEMMA_MAX_TRIES=1`, every path through the runner's per-item loop (gemma-answers.mjs:311-350) makes **at most one** HTTP request:

| Path | Requests |
|---|---|
| Answered: `break` | 1 |
| Transient 429/5xx: sleep, loop ends | 1 |
| Cut: `continue`, loop ends | 1 |
| TimeoutError: `break` | 1 |
| Thrown non-timeout error: sleep, loop ends | 1 |
| Item already spoken (:312) | 0 |
| Pre-loop refusals (:35, :288, :298, :306) | 0 |

Holdout40 has no duplicate ids: 44 `R..` ids, and all 16 tier ids are present. So one `--only` id means at most one request.

- **Per pass:** real requests ≤ `todo.length` ≤ the amount charged at :121. The phantom cut charge at :123 only adds.
- **Invariant:** `used` ≥ real requests at every pass boundary. The gate at :118 (`used + todo.length <= 18`) therefore guarantees real requests ≤ 18 per model per invocation.
- **Scope of `used`:** it is per tier, across that tier's reps (:114), and the four tiers use four distinct models. **Sound and conservative.**

Worked cases:

| Case | Result |
|---|---|
| Nominal | 6 / 9 / 11 / 11 |
| One cut in tier 1 `def` | `used` = 3, real = 2 |
| Tier 3 pass 1 all 503 | `used` = 11; pass 2 needs 22 > 18, so the tier stops at 0/11 (Q-m4) |
| Tier 1 failing for about 16 min | `def` consumes 2+2+…+2 = 18; `def-r2` and `def-r3` never run, so their files are never written (**Q-I1**) |

**503s count against the daily 20.** On 09-25, 3.6-flash's first `def` call returned 429 at 17:18:01 after only smoke attempts, most of them 503s. So charging 503s is correct, not only conservative.

### Other surfaces

| Surface | Result |
|---|---|
| NOT READY gates | Correct: exercised for the no-folder branch; the file branch correct by reading. In h40a, timeline.json (11:20:12) preceded prompts.json (11:20:15, written by `interview60.prompts.mjs` after the hour; interview60.flight.mjs:282-283), and the gate requires both. |
| tiers.json shape | Correct (sidecar:128, 151-153). |
| Blind-pair collection | Correct on complete data: one item per id; a shared id gets both 3.6 and 3.5 (fixture keys). |
| Scorer keys | Correct: grade, cell and acc are keyed by arm; totals by tier; lite once per unique id. |
| Calibration can FAIL | Yes (see below). |

### Findings

**Q-I1 (Important): a Flash rep file that was never written blocks blind grading for every tier.**
Anchors: flash-h40b-blind-pairs.mjs:44, 55; flash-h40b-sidecar.mjs:118.

- **The mechanism.** `const flash = FLASH_FILES[arm].map(load)` loads every planned rep file of a tier, and `load` calls `process.exit(2)` on a missing file. The budget gate can skip a whole rep: `run()` is never called, so the runner never creates `…_def-r2.json`. A tier whose captured list is empty never writes any file.
- **The contradiction.** The builder's own header (:6-7) promises "A missing or empty answer gets no item; the scorer counts it as NO ANSWER". The scorer is tolerant (score-blind:23); the builder is not.
- **Scenario, grounded in the 09-25 logs.** 3.7-flash returned 503 for about 11 minutes (17:01:56 to 17:13:28). In h40b, tier 2 would charge 3 per pass. After 6 failed `def` passes (about 13 min) `used` = 18, so `def-r2` and `def-r3` never run. Then `node flash-h40b-blind-pairs.mjs` prints `missing …/interview60.answers.gemini-3.7-flash_def-r2.json` and exits 2. No blind files are built for any tier, including the 3.6/3.5 answers that did succeed.
- **Precedent.** The 09-25 h40a Flash run ended the same way: 3.6 and 3.7 have only `def` files, and `flash-h40a/blind/` is empty.
- **Fix.** Treat a missing *Flash* rep file as `{}` (every id counts as NO ANSWER), keeping the strict load for the lite files the flight must produce. Or have the sidecar write an empty store for every planned rep it skips.

**Q-I2 (Important, brief-level): on real data, the calibration fails on any legitimate hole, and the plan both expects holes and blocks verdicts until OK.**
Anchors: flash-h40b-score-cal.mjs:17, 21-23; plan Task 5 Steps 3-4.

- **The mechanism.** The expectations are the complete-data numbers (the brief's exact values), but they are checked against the **real** key files on flight day.
- **In-memory test against score-blind's exact line template:**
  - One Flash hole (tier 1 at 5/6) fails case A's tier-1 regex.
  - One uncaptured tier-2 id (tier 2 at 6/6, lite at 45/45) fails two regexes.
  - Cases B and C fail too, because the reason count becomes 36 ≠ 37.
- **The plan conflict.** Task 5 Step 3 expects "holes noted where a model 503'd twice". Step 4, and the brief ("it must print CALIBRATION OK before any verdict is read"), then block every verdict. The operator either stops or edits expectations under pressure (rule 8).
- **What it catches correctly.** It does separate real scorer bugs: lite double-counting (81/81) and the wrong rep count (11/33) both FAIL.
- **Fix: a ruling for the controller.**
  - (a) Derive each case's expectations from the key files and tiers.json: acc = the count of that arm's keys; n = ids × reps; reasons = the count of Flash keys. The brief's numbers are the complete-data special case of this.
  - (b) Or calibrate the scorer on the complete fixture (which proves the code) and accept holes in the real data.

**Q-I3 (Important): the one-try guarantee lives only in a generated file, and nothing checks it.**
Anchors: gemma-answers.mjs:27-29, 314; gemma-answers-gen.mjs:1-9, 123; flash-h40b-sidecar.mjs:98, 105.

- **The dependency.** The sidecar's entire budget rests on the runner honoring `GEMMA_MAX_TRIES`. That change exists only in the generated copy.
- **The generator.** `gemma-answers-gen.mjs` rebuilds the copy from MAIN's `interview60.answers.mjs` with "exactly these changes" (1–8) and ends with `fs.writeFileSync(OUT, t)` (:123). It has no MAX_TRIES change, and MAIN's source still matches (my diff), so regeneration would succeed.
- **The invitation.** The copy's own header still says "Nothing else differs" (:27-29).
- **Scenario.** Anyone regenerates the runner before the sidecar runs. The copy returns to `a < 4`. The sidecar still sets `GEMMA_MAX_TRIES=1` and still charges 1 per id. Each 503/429 id then costs up to 4 real requests, which is the exact 09-25 failure ("spent all three caps in ~25 min because every question attempt is up to 4 HTTP tries"). The sidecar's console and tiers.json would show ≤ 18.
- **Likelihood.** Low, but the failure is silent and defeats this task's headline constraint.
- **Fix.** Add the change to the generator (a change 9) and fix the "Nothing else differs" line. In the sidecar, refuse to start unless the runner source contains `process.env.GEMMA_MAX_TRIES` (a rule-11 boundary check, one line).

(S-I1's silent grading of truncated answers is also a quality defect. It is counted once, under (1).)

**Q-m1 (Minor): the calibration cannot tell apart the two Flash arms that share the tier-3 ids.**
score-cal:20-24. In cases A, B and C, 3.6 and 3.5 always receive the same synthetic verdict (both match `/flash default/`), so a 3.6↔3.5 cross-wiring in the pairs builder or scorer would pass. This two-Flash-arms-per-item structure is new in h40b. The current code is correct by reading (arm = `${model} default` from each tier's own entry; the fixture keys show both arms). A case D (3.6 acceptable, 3.5 wrong: expect `…on tier 3: 11/11` and `…on tier 3b: 0/11`) closes it in one line. Also, the script's FAIL branch was never run end to end: all three cases passed. By reading and by the in-memory test, it rejects 5/6, 11/33 and 81/81.

**Q-m2 (Minor): the runner's exit code is ignored, so tiers.json's `requests` is an upper bound recorded as a count.**
sidecar:101-108, 120, 128. `run()` resolves with the exit code, and `tier()` discards it.
- A deterministic refusal, such as `--captured has no prompt for …` (gemma-answers.mjs:306) or `--only names questions not in roster` (:298), makes zero requests but is charged `todo.length`. It is then re-run every 60 s until the counter is spent.
- The console ("N/18 requests used") and `tiers.json.requests` then report requests that never happened, plus one phantom per cut. Task 5 Step 5 and `project_gemini_quota.md` will quote that figure.
- The gemma h40a sidecar stopped on "wrote NO answers file" (gemma-h40a-sidecar.mjs:71).
- The risk is low for h40b (h40a's 44 prompts all carry system and user), but the refusal would be silent apart from the per-model log.

**Q-m3 (Minor): the budget is per invocation, not per quota day.**
sidecar:114. A same-day re-run (to fill holes, or after an interruption before tiers.json is written at :153) starts `used` at 0 and can spend up to 18 more per model. tiers.json is overwritten with the second run's count only. The damage is bounded by the server's 20 (the excess becomes 429s), but the self-imposed 18 and the recorded count are both wrong. A next-day re-run is correct as is.

**Q-m4 (Minor, brief-level): an 11-id tier cannot afford a second full pass.**
sidecar:118. 11 + 11 > 18, so a first pass that falls entirely inside a 503 window ends tier 3 or 3b at 0/11 for the day, with no probe-first.
- A pass takes about 4 min at h40a's 23.5 s gap.
- The 09-25 windows on these models: 3.6-flash 503'd from 17:01:56 to about 17:16; 3.7-flash to 17:13:28; 3.8-flash again at 17:11:13.
- It is recoverable the next quota day (the reset is 10:00 local; the runner resumes answered ids).
- A 1-request probe per model, repeated with backoff before the pass and counted in `used`, would usually save that day.

**Q-m5 (Minor): the scorer prints neither a tier's `skipped` ids nor its `requests`.**
score-blind:59. An uncaptured id silently shrinks that tier's denominator in the table the user reads (tier 2 would read "…/6" with no note). Task 5 Step 5's "requests used" column has no source in the scorer's output.

**Q-m6 (Minor): reps per tier are hard-coded by tier key in both grading scripts.**
blind-pairs:34 (`repTagsFor`) and score-blind:31 (`REPCOUNT`) duplicate the sidecar's PLAN (:62-67). tiers.json does not carry `reps`, so a PLAN change would desynchronize them silently ("derive what is derivable").

**Q-m7 (Minor): two small `--dry` issues.**
sidecar:97, 142. `--dry` (with a folder present) runs after `fs.mkdirSync(OUT)`, so it creates `flash-h40b/`. It also prints a hand-typed env line instead of the `env` object built at :98, so a later edit to `env` would not show in the dry output.

**Q-m8 (Minor): the resolved paths are never printed.**
blind-pairs:15-23, score-blind:12-16. With RUN_DIR/FLASH_DIR/BLIND_DIR overrides in play, a leftover override would build or score the fixture (whose pairs files carry the same header and item shape as real ones) with no visible sign. One line per script (`RUN=… F=… BLIND=…`) removes the ambiguity.

**Q-m9 (Minor, latent, MAIN-side coupling): the flight could spend the sidecar's quota before it runs.**
interview60.flight.mjs:90, 101.
- The flight's post-hour focused arms run exactly the sidecar's four models (`FOCUSED_MODELS = 3.8/3.7/3.6/3.5-flash`), through MAIN's 4-try runner, on the same quota day and before the sidecar.
- Today they are skipped because holdout40 has no `FOCUSED_ONLY_BY_ROSTER` entry. The h40a record proposes a five (R08, R30, R16, R03, R31), "not committed".
- If that lands before 17:00, the sidecar starts against spent quotas.
- The sidecar could read `focusedOnly` from the run's `interview60.flight.done.json` and refuse unless it is null.

### Error paths checked and found sound

- A missing h40a evidence file throws ENOENT (exit 1) before the gate: loud.
- A missing `tiers.json` makes blind-pairs and score-blind exit 2 with a message.
- A half-graded verdicts file makes the scorer exit 3.
- If the scorer throws inside the calibration, the calibration crashes and never prints OK (fail-closed).
- `blind-cal` is a sibling of `blind/`, so the builder's "already holds verdicts" guard is unaffected.
- The calibration's temporary directory never mixes with the real scorer's `BLIND`.
- An empty prompts.json gives `gapMs = NaN`, but then nothing is captured and nothing is spawned.

---

## The implementer's two concerns

**(1) The h40a calibration's regexes.**

The defect is confirmed. Against a *perfect* h40a scorer output (flash-h40a-score-blind.mjs:63 prints `${model} on tier ${t}: …`), all three of h40a's case-A regexes (`/gemini-3\.8-flash: 6\/6 acceptable/` etc., flash-h40a-score-cal.mjs:16-18) return `[false, false, false]`.

- **Fail-closed.** It would print CALIBRATION FAILED on a correct scorer; it can never print a false OK.
- **Cause.** The calibration's mtime is 17:03 and the scorer's 17:09, which fits the scorer's line changing afterwards for the tier-keyed stand-in label.
- **Never used.** h40a's Flash pipeline never reached calibration: `flash-h40a/blind/` is empty, there is no `tiers.json`, and reps are missing.

**The h40b calibration does not share the defect.** Its regexes carry `on tier N`. The in-memory test passes a perfect h40b output and rejects 5/6, 11/33, 81/81 and a skipped id, and the implementer's fixture run printed CALIBRATION OK. This is not a Task 4 finding, but the h40a calibration should not be copied as a template again unfixed.

**(2) The unexercised ready branch.**

A real gap remains, and it is wider than the ready branch.

- **What the fixture covers.** It runs only the grading scripts. Its `tiers.json` is hand-written by fixture-build:37-43.
- **What has never executed:**
  - sidecar:86-153: capturedIds and gapMs on real prompts, `run()` with `GEMMA_MAX_TRIES=1`, `tier()`'s pass/budget loop, the `--dry` block, the 3b sequencing, the tiers.json write;
  - the runner under `GEMMA_MAX_TRIES=1`.
- **The larger gap.** The fixture is complete by construction: 37/37 Flash answers, 96/96 lite answers, 16/16 ids. So it never reached the incomplete-data paths, and that is where Q-I1 and Q-I2 live.
- **The low-risk part.** The ready branch's happy path is mostly copied from proven code: gemma-h40a-sidecar's capture and gap maths (proven 09-24), and flash-h40a-tiers' spawn (proven 09-25).

Cheapest pre-flight checks, in cost order (none calls the API):

1. **Today, no code change.** Copy the fixture and delete `flash/interview60.answers.gemini-3.7-flash_def-r3.json`.
   - Run `flash-h40b-blind-pairs.mjs` with RUN_DIR/FLASH_DIR pointed at the copy. Expected: exit 2 "missing" (Q-I1).
   - Restore the file, delete one R08 record from `…3.8-flash_def-r2.json`, rebuild the pairs, then run `flash-h40b-score-cal.mjs`. Expected: CALIBRATION FAILED (Q-I2).

   This is the cheapest check that reaches the actual defects. It also calibrates this review's two main claims against the real code: I established them by reading and by in-memory regex tests, not by running the pipeline on a holed fixture.
2. **Today and again on flight day, zero requests.** Run the runner's own validation with `--limit 0`: todo becomes `[]`, so the loop and its fetch never run, and nothing is written. It checks roster membership and capture completeness for all 16 ids, which are exactly the refusals the sidecar would silently charge as spent budget (Q-m2):
   `GEMMA_ARMS_DIR=<scratch dir> NATIVELY_ROSTER=holdout40 GEMMA_MAX_TRIES=1 node gemma-answers.mjs --model gemini-3.8-flash --tag probe --captured <prompts.json> --only R02F,R08,R03,R09F,R16,R01,R11F,R12,R17F,R23,R26F,R27,R28,R30,R31F,R32 --limit 0`
   Use h40a's prompts today and h40b's the moment the folder lands.
3. **Flight day, before the real run:** `node flash-h40b-sidecar.mjs --dry` (the implementer's suggestion). It covers the gate's ready direction, the captured count, per-tier skipped ids, the gap and the spawn args. It is the cheapest single check (no code, no API), but it only proves the happy path, at the worst time to find a bug.
4. **To exercise `tier()` itself without the API** (rule 7's one live exercise before the flight depends on it): add `RUNS_DIR`, `RUNNER` and `PASS_WAIT_MS` env overrides (defaults unchanged, about 6 lines). Point them at a fixture `<stamp>-h40b` folder holding copies of h40a's prompts.json and timeline.json, and at a stub runner that writes spoken, transientError or cutRetried records by script. Expected:
   - an all-503 stub stops tier 3 at `0/11, 11/18` after one pass;
   - tier 1 reaches `18/18` with def-r2/def-r3 never run;
   - a one-cut stub charges n + 1.

---

## Notes outside Task 4's surface (not counted)

- **Task 5 Step 3** redirects the detached sidecar's stdout to `flash-h40b\run.log`. `flash-h40b/` does not exist until the sidecar passes its gate (sidecar:97), and PowerShell's `Start-Process -RedirectStandardOutput` does not create parent folders. Create the folder first.
- **Process.** The implementer also ran the bare sidecar (no flag) "to prove the gate". It proves nothing that `--dry` does not, since both share the gate, and it is the only invocation that can spawn real calls. It was safe only because no `*-h40b` folder existed at that moment.
- The Task 5 pre-flight probes are quota-safe for the sidecar: `key-status.mjs` makes metadata GETs on the lite models only, and `flash-probe.mjs` is called with the two lite ids. A bare `flash-probe.mjs` would spend 1 request on each full-Flash model, which the 2 spare cover.

## Residual risks (not verified by anyone)

- `tier()`, the tiers.json write, and the runner under `GEMMA_MAX_TRIES=1` have never executed (see concern 2).
- Whether 503s count against the daily 20 is inferred from 09-25 logs, not proven; the sidecar charges them either way.
- The cut rate on flight day is unknown: 0/10 on 09-25, 3/8 on 09-11.
- A holed fixture has not been run through the real blind-pairs and score-cal; check 1 above does that.
