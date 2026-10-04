# Review of PREREGISTER-turn-followup.md (Opus, 2026-10-03, read-only, no model call, no subagent)

Reviewed text: `followup-turn/PREREGISTER-turn-followup.md` sha256 `1cec308c7b0b9d14d5ef3f62e9c15bf668d7bdb9f80529ac6651ad6ee7cac28f`,
mtime 2026-10-03T15:04:37Z (18:04 local). Spec: MAIN 0536581, byte-identical to `followup-turn/2026-10-03-turn-based-followup-context-design.md`
(sha256 `781cffa2…5e90` both). No file changed except this one; no captured prompt or question text printed (ids, counts,
hashes, booleans only). `.env` not read.

**VERDICT: APPROVE WITH FIXES.** 0 Critical, 6 Important, 10 Minor.

The registration is faithful to spec §6 and to all five §11 decisions, and its arithmetic is right. Six things must be fixed
before the user is asked for the OK:
- The grader-memory clause relaxes a requirement of the approved spec, and its check cannot yet be run (I1).
- "Today" breaks its own day rule (I2).
- The s50k re-run material can be frozen now instead of after data (I3).
- The harness has no review before the OK (I4).
- VOID is a second way to reach a run (I5).
- The build gate does not cover the seam the replay relies on (I6).

None of these changes a bar, a pair set or the design.

## What I verified myself

| Check | Result |
|---|---|
| §11 decisions → registration | 188 calls (140 front on 3.5-lite HIGH, 48 back on 3.1-lite LOW). Clause 1 is read per leg, and either leg failing fails. Clauses 3–5 are on the 40 roster pairs with the 70 printed beside them. The thinking clause is ≤ +150 or FAIL. The label is 125 chars and 125 bytes (counted). The block is on the auto path only (§10 says the replay never exercises `turnId` null). s50k is the one re-run. holdout40 is untouched. The smoke and flight order in §9 matches §11.5. |
| Pairs and calls | Front: 4 ids × 2 hours × 5 = 40, plus D 3 × 2 × 5 = 30, gives 70 pairs = 140 calls. Back: 4 × 2 × 3 = 24 pairs = 48 calls. Total 188. Interleaving is balanced: 35/35 A-first on the front leg, 12/12 on the back, and 20/20 on the roster subset if the roster items come first in the walk. |
| Bars | 3c: ceil(2·40/39) = 3; ceil(2·70/39) = 4; pooled ceil(2·60/39) = 4. Gain: ceil(4·40/21) = 8 and ceil(40/21) = 2; pooled ceil(240/21) = 12 and ceil(60/21) = 3. All as written. |
| False-FAIL table | `falsefail.mjs` re-run (calibrated: n = 1, p = .5 gives .25): 15.7/22.1/10.1/**29.9**/25.9, 20.7/27.4/14.0/**37.5**/30.9 and 24.5/30.9/17.3/**42.8**/34.0. All equal §7. |
| Gated set | The spec reviewer's `numbers.mjs`, re-run: both hours have the same 8 cue fires. A block goes to S1Q04F, S1Q06F, S2Q05F and S2Q08F (parent ages 156/157–158/159–162/157 s; parents 409/389/333/304 chars, none over 450). S1Q08, S2Q01F, S2Q08 and S2Q09F get '' (parent in the window). §3 is correct. Expected block sizes: 537/517/461/432 chars. |
| Quota | 140 + 48 calls fit under 416 / 500 free (if the 84 used today is right). |
| Instrument | `graderPromptVersion()` = `8564ba96369a`. Filter is `d8fee6ca0170`, 16,100 bytes. Reference is `0459f578e477`, and it exports `gate` (`earlierQuestions.ref.mjs:54`), so "imported" applies. |
| Calibration 6.3 | Run by me against the pre-cue snapshot (`--calibrate` writes nothing). s50m: OK 39/39, BREAK MISMATCH 39/39. **s50k: OK 39/39, BREAK MISMATCH 39/39.** s50j: OK 39/39, BREAK 39/39. |
| `replaces=` mapping | Dispatch lines: s50m 42 answer / 0 supersede; s50l 42 / 1; s50k 42 / 0; s50j 42 / 1. Each supersede's `replaces=` matches exactly 1 earlier `question=`, and that is the immediately preceding line. There are 0 duplicate texts in any hour. The mapping is feasible and unambiguous on this material. |
| Memory in grader transcripts | The s50l alias probe `a9d35e8deacac3eff` (dispatched from this project's session) records the memory load: "Memory Index" 1 hit and the `followup` note 1 hit in its own jsonl. So a transcript check can see a load, and a known positive control exists. |
| Parity (c) feasibility | I ran MAIN's own `passes/2026-09-26-followup-replay/scripts/followup-replay-build.mjs --calibrate` against MAIN's current dist (built 10-01 16:37) on s50m: `CALIBRATION OK 39/39`. See I6 for what this does not cover. |

## Important

**I1. The grader-memory clause relaxes an approved requirement, and its check is unnamed, uncalibrated and has no consequence.**
- **Evidence:**
  - The approved spec §6 says "Eight Opus graders from a cwd with NO project memory". It offers no fallback.
  - The registration §1 adds one: "If the controller cannot run such a session, the graders run as design 2's did and the result note names the exposure". That choice is made on the run day, after the answers exist. By then MEMORY.md names this experiment, its +8 bar and the +18 prior, so the exposure is larger than design 2's was.
  - "each grader transcript is checked for the absence of a memory load" names no command, has no calibration and says nothing about what a detected load does.
  - Two more channels are not covered:
    - claude-mem is enabled (`settings.json`: `"claude-mem@thedotmack": true`). Its SessionStart `context` hook injects past observations, and graders are offered its `mcp__plugin_claude-mem_mcp-search__*` tools.
    - `audit-graders.mjs:33` records only `file_path/path/pattern/command/glob`, so a claude-mem `query` call would pass "clean".
  - Feasibility:
    - `audit-graders.mjs:9` hard-codes this session's id. It cannot find a grader that runs in another session.
    - `h40d-grader-models.mjs` searches `<slug>/<session>/subagents/` and `tasks/` only. A top-level `claude -p` grader writes `<slug>/<session>.jsonl` and would read NOT VERIFIED.
    - A `claude` CLI exists (`~/.local/bin/claude`). Memory note `project_claude_sandbox_appdata.md` warns that processes launched from a Claude session can read a shadow AppData. Where a nested session's transcript lands is unproven.
- **Fix:**
  1. Make the outside session a precondition proven BEFORE the OK: one throwaway alias probe launched the intended way, with cwd `SP/.../grading`.
  2. Locate its transcript with the adapted model reader.
  3. Run a named, hashed `check-grader-memory.mjs` on it. That script searches the jsonl for the memory markers and the claude-mem context markers. It is calibrated on the positive control `a9d35e8deacac3eff` (it must read LOADED) and on the probe (it must read ABSENT).
  4. Give `audit-graders.mjs` a `--session/--projects` parameter, and have it flag any `mcp__*` call and any tool other than Read/Write.
  5. Register the consequence: a grader whose transcript shows a memory load, or a claude-mem call, makes its file reported, not decided (see m6 for the one re-grade).
  6. Either delete the fallback, or put it to the user as an explicit departure from spec §6 before any call. Never choose it on the day.

**I2. "Earliest day: today" contradicts the registration's own day rule.**
- **Evidence:**
  - §6.7 says "no other pre-registered lite replay on the same quota day". The design-2 s50l re-run is exactly such a replay. It ran on today's quota day (reset 10:00 local): its answer files have mtime 10:13 and `run-pass.out.txt` 10:14.
  - §6.7 itself counts it ("3.5-lite used 84").
- **Fix:** do one of these:
  - strike "today" (earliest Sunday 4 Oct after 10:00); or
  - reword the rule to what it protects: "no other lite pass runs DURING the passes, and the quota ledger shows the headroom".

  Decide before the OK. Otherwise the run's validity can be argued either way afterwards.

**I3. Freeze the s50k re-run material now. The s50j branch is moot, and the pooled bars assume a gated set nobody has computed.**
- **Evidence:**
  - s50k calibrates today (OK 39/39 and BREAK 39/39, above), so "if the pre-cue snapshot cannot reproduce s50k's prompts, s50j" can no longer trigger.
  - §7 hard-codes "60 roster pairs", +12/+3 and allowance 4, assuming s50k gates the same 4 ids. Nobody has computed s50k's gated set, its D-case guards (stand-in > 180 s; `withoutPreview` requiring exactly one response) or its window overlap with s50m/s50l.
  - Design 2 shows the cost of leaving this until later. Its re-run material was recorded after Thursday's verdicts, and it needed a post-data amendment (A1: two callbacks refused by the builder) plus a user OK on it.
  - "clauses 1–2 as pooled counts per leg" can be read as making clause 2 decide on the back leg in the re-run. In the first run, clause 2 is front-only.
- **Fix:**
  1. In §12 step 2, run `gate-report-turn` and `stamp-turn` on s50k too. Freeze its blocks and fixture in §2, and name any refused D-case now.
  2. Record s50k's userA overlap with s50m/s50l (ids and booleans, as AMENDMENT-REVIEW I1 did).
  3. Replace s50j with "s50k recorded at <time>".
  4. State the pooled bars as formulas on the pooled complete roster pairs R: PASS ceil(4R/21), FAIL ceil(R/21), 3c ceil(2R/39). The 60/12/3/4 figures become the expected case.
  5. Say "clause 2: pooled front-leg counts; back leg reported".

**I4. There is no review of the harness before the OK. "Exact-anchor swaps" understates what gate-report-turn needs.**
- **Evidence:**
  - §12 has an Opus review only for the reference and its test (step 1).
  - `gate-report.mjs` builds `answeredBefore` and calls the old `selectEarlier(current, cue, answered, windowLines, now)` (`:107-135`). The new report needs new code in that section:
    - the turn ledger, with remove-and-push via `replaces=`;
    - no age cap;
    - parent-only selection;
    - the head + tail clip;
    - the new label;
    - D-cases built through the same reference.
  - The copied harness also keys everything by id, and two hours share ids:
    - the runner's `stores[...][c.id]`;
    - the blind keys `${id}#n` and the seed `blind:followup-questions-s50l:${id}` (`followup-questions-blind.mjs:67,77`);
    - `MODEL` is a single constant (`common.mjs:21`);
    - `decide()` has no `thoughts` and no VOID.
  - The s50l prep review found 6 Important defects in a smaller adaptation (`PREP-REVIEW.md:3`).
- **Fix:**
  - Add step 3b: an Opus prep review of gate-report-turn, stamp-turn, `R/scripts/*`, legs-decide (+ calibrate, mutate, e2e) and the filled §2, against this registration, BEFORE step 4.
  - Write into §1 the concrete requirements:
    - keys are `<hour>:<id>` everywhere;
    - the blind seed includes `turn` and the hour;
    - records carry `hour, leg, model, thinking`;
    - legs-decide refuses a record whose model or thinking does not match its leg.

**I5. VOID can follow a FAIL and opens a second run.**
- **Evidence:**
  - §7 says "Outcome: FAIL on any FAIL clause; VOID on clause 6". Clause 6 is "re-asserted in the decision output", i.e. after the verdicts are read.
  - The rule does not say which wins when both apply.
  - §9 says "VOID: fix the instrument, re-register", which is a fresh draw at every clause.
- **Fix:**
  - `legs-decide.mjs` verifies every §2 hash and the parity set FIRST, before it opens any verdict file. On failure it prints `VOID` and no clause line.
  - Once any clause line has been printed, VOID is unavailable, and a FAIL stays FAIL.
  - Add this ordering to the calibration set (a parity failure must yield VOID with zero clause lines).

**I6. The build gate (c) does not exercise the seam the replay rests on.**
- **Evidence:**
  - The replay measures `insertBlock(userA, block)`. It transfers to the build only if, in the build, `fullMessage_on = insertBlock(fullMessage_off, block)` (spec §3.4 byte rule).
  - The (c) half "the flag-off dist builder reproduces the captured bytes" runs `followup-replay-build`. That script splits `user` at `INTERVIEWER JUST SAID:` / the AFTER markers and rebuilds only the transcript block (`prepareTranscript` + `pinSettledQuestion`). It never runs `WhatToAnswerLLM`'s `contextParts` assembly, where the block is pushed.
  - It passes on MAIN's current dist today (s50m 39/39), so it is feasible. But it cannot see the insertion.
- **Fix:** in §9 PASS, name these as build tests that gate the build beside the fixture:
  - `fullMessage_on === insertBlock(fullMessage_off, block)`, with `extraContext` empty and with it non-empty;
  - the coding-intent branch drops the block;
  - flag off is byte-identical.

  Also store the fixture inputs in the spec §3.5 `buildEarlierQuestion` shape (`question, turnId, supersede, ledger[{text,turnId,seq}], promptLines`), so the app test feeds them without an untested translation layer.

## Minor

- **m1. Answer files.** §8 says "16 answer files (10 front + 6 back)", but §1's name `…_fturn-<hour>-<arm>-r<rep>.json` gives 2 × 2 × 5 + 2 × 2 × 3 = 32. Pick one: drop `<hour>` from the name (and key records by hour), or say 32.
- **m2. Bars with incomplete pairs.**
  - The text fixes "+8 / +2 / +3" on "the 40", while `decide()` scales them by the complete R (`followup-questions-decide.mjs:52,62`). They diverge at R ≤ 36 (PASS 7). State the formulas on complete R.
  - Mark "(+4 on the 70)" in 3c as reported only, so it does not read as a second condition.
- **m3. The self-hash row, and pinning the reviewed text.**
  - §2's last row asks the file to hold its own hash, which is impossible. Record that hash in `run.log` only.
  - Record this reviewed version (`1cec308c…cac28f`) in `run.log`.
  - Limit the controller's pre-OK edits to the §2 cells and a dated §3 note. Check that limit with a diff before the OK; any other edit goes back to review.
- **m4. The §1 test list omits §3.6 rows.**
  - Not listed:
    - ledger empty / `settled` null;
    - parent in the prompt;
    - parent contained in the pinned line (Live merge, R07F);
    - a double dispatch past the deduper (a duplicate entry);
    - chip, answer-now or manual in auto mode → '';
    - an aborted parent.
  - Name the rows a pure reference cannot hold as build tests: junk flag, coding framing, ledger-write exception, hedge.
- **m5. The `replaces=` rebuild must refuse loudly (rule 11).**
  - The rebuild refuses when `replaces=` matches 0 or more than 1 entries. Its calibration includes a corrupted `replaces=` that must refuse.
  - Define "the id's own dispatch" as the capture's `at` (design 2's `answeredBefore`).
  - Derive the reference's `supersede` input from the kind of the dispatch line that matches that capture.
- **m6. Grader layout and failures.**
  - "≤ 24 answers per file" gives 7 front files (2 items, 20 answers) + 2 back files (4 items, 24) = 9 files and 18 graders. The spec said "Eight"; state 9/18.
  - Register that a grader which dies or writes an incomplete file is replaced once, by a fresh grader on the same file, and named in `graders.json`.
  - Register what follows "reported, not decided": one re-grade of that file only, then decide; no second.
- **m7. Dry-run and resume checks.**
  - Precondition 8 checks only counts. A model or thinking swap between legs would pass it. Make the dry run print model + thinkingLevel per leg and require them.
  - The runner re-calls a `transientError` record on a second invocation (`followup-questions-run.mjs:92`). "Never re-called" should be enforced in code (an explicit `--crash-resume` flag, logged), not only by the runbook.
- **m8. `thoughts` silently defaults.** `followup-questions-run.mjs:74` sets `thoughtsTokenCount ?? 0`. Clause 5 should refuse a missing count. It is cheap: 0 of 84 s50l 3.5-lite records and 0 of 44 h40d 3.1-lite LOW records lack it.
- **m9. Provenance and hashes.**
  - Give provenance for the "150 + 140" and "48 + 50" headroom figures.
  - Write "imported" for the gate (it is exported).
  - Add to §2: `followup-replay-build.precue.mjs` (the 6.3 instrument) and `h40d-grader-models.mjs`.
  - Record the filter's full sha256, not only /12.
- **m10. Text in outputs, and stating the priced odds.**
  - `gate-report.mjs:241` prints `${blockText}`, and `check-grader-questions.mjs:11` prints 80 chars of question text. §8 promises "ids, cues, chars, hashes", so the copies must drop both.
  - State clause 2's price too. With no effect, P(B > A) on 70 pairs is 42–46 % at off-topic rates of 5–20 %. Design 2's prior on these 7 items is A 11 / B 3 consensus off-topic over 42 pairs, the B ones all S2Q05F's Thursday re-answer, so clause 2 rests on the new label holding S2Q05F.

## On the five items Fable could not register as written

1. **Parity (c) as a build gate: sound.** The spec itself says "(c) at build time". It needs I6's byte-rule test to mean what it claims.
2. **Grader memory: not yet sound.** See I1. The check is feasible (a positive control exists), but it is unnamed and uncalibrated, it has no consequence, claude-mem is not covered, the audit scripts cannot see another session, and the fallback is a departure from the spec.
3. **Replay-blind states: sound.** §10 names them, and the tests, the smoke (with the pinned-line rule) and the flight carry them. Only m4's list is incomplete.
4. **Supersede via `replaces=`: sound and verified.** Every supersede in all four hours maps to exactly one prior entry. Add m5's refusal.
5. **s50k vs s50j: moot.** s50k calibrates today. Freeze s50k now (I3).

## Before the OK

1. Apply I1–I6 and m1–m10 as text edits.
2. Run the outside-session probe and calibrate the memory check (I1).
3. Compute and freeze s50k's material (I3).
4. Have the harness prep-reviewed (I4).
5. Fill §2. Record this file's final hash and the diff against `1cec308c…` in `run.log`.
6. Ask the user, with I1's departure (if kept) and I2's day choice in front of them.
