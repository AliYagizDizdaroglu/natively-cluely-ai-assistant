# Scoped Opus recheck: small-cues spec + plan, revision 2 (deltas only)

Reviewed 2026-09-30, 10:45 to 11:17 local. The spec (10:43:56) and the plan (10:44:20) did not change while I read.

**The tree moved under the review.** HEAD went `4c07ae9` (Task 1) → `949ebc2` (the merge-fix round, committed 10:45)
→ `38da4ac` (Task 2, 10:58) → `b649011` (spike 6's pass records, 10:59). Every anchor below was re-checked at
`b649011`. Line numbers in this file are those of the spec and plan as the Read tool numbers them.

**Read:**
- The spec and plan (revision 2), `fable-revision-2.md`, `spec-rereview.md`, `spike6-result.md`, `progress.md`,
  `AGENDA.md` (the user's decisions of 30 Sep).
- Code at HEAD: `IntelligenceEngine.ts` (1–30, 380–485) and its cues test; `verbalStreamFilter.ts` (315–596);
  `WhatToAnswerLLM.ts` (30–125, 286–450); `LLMHelper.ts` (355–361, 3455–3542); `SessionTracker.ts` (236–250);
  `ipcHandlers.ts` (536–601); `KnowledgeOrchestrator.ts` (295–389); `ContextAssembler.ts` (222–271);
  `interview60.chains.mjs` (whole); `interview60.answers.mjs` (the cue lines); `interview60.flight.mjs` (255–284,
  315–365); `interview60.metrics.mjs` (105–123, 500) and the test's anchors; `scripts/build-electron.js`;
  `electron/tsconfig.json`.
- The controller's tools: `check-smoke-cues.mjs` (v3), `calib-cue-smoke.mjs`, `wait-for-gemini.mjs`,
  `launch-smoke-cues.cmd`, `register-cue-smoke.ps1`, `probe-shipped.mjs`, `cal-probe-shipped.mjs`,
  `PREREGISTER-cueprobe.md`, `PREREGISTER-cuebench.md`, `SPIKE6-RULE.md`.
- The current (v1, 05:00) `dist-electron`: `ipcHandlers.js`, `llm/prompts.js`, `llm/verbalStreamFilter.js`,
  `IntelligenceEngine.js`.

**Ran (read-only):** `git log/show/diff/status`, greps, line counts, `Test-Path`. **Not run:** vitest, tsc, a build,
any network call, any controller script (their calibrations read MAIN's `.env` in a child). `.env` was not read; its
existence was checked with `Test-Path` only (worktree: absent; MAIN: present).

## 1. The rulings

| # | Status | Where |
|---|---|---|
| 1 spike 6, no swap | LANDED | Spec 98–107 (result), 562–569 (§9.5), 586–590 (§9.10, both lines). Plan 162 (swap note resolved), 1000 and 1006 (4th marker). §9.5's numbers recomputed as 1 − 0.05^(22/n): 84.0 %, 60.0 %, 45.7 %. |
| 2 merge-fix refresh | LANDED | Spec 498–504 (81 lines, the first-case anchors), 572–580 (§9.7, all four method points). Plan 397, 408–424. |
| 3 N1 → v3 check | LANDED | Spec 246–260, 303–312 (PASS = `CHECK EXIT 0` from v3; parenthetical corrected at 309–311). Plan 1010, 1022. Tool: `check-smoke-cues.mjs` 28–34, 47, 50, 55; calibration cases `superseded` (CLEAN) and `extra-cues-unmatched` (NOT CLEAN) at `calib-cue-smoke.mjs` 30–31, the full print at 38. One clause is not true of the tool: R1. |
| 4 N2 typed check timing | LANDED | Plan 1040–1042 (now Task 6 Step 6). Spec 344–349, 581–583. The step can still pass with nothing tested: R2. |
| 5 N3 fix chains | LANDED | Plan 865–980 (Task 5; after Task 4, before the build: 36, 865); off the do-not-touch list at 29. Spec 60–66, 380, 393–394, 591–593. No test existed, so a source-text pin with the reason (plan 876): the ruling's third option. |
| 6 N4 anchors | LANDED | Plan 408–424; `WhatToAnswerLLM.hedgeCues.test.ts` in Step 4 (548) and Step 8 (657). |
| 7 N5 split cases | LANDED | Plan 427–440 (dropped only, the real S1Q09 block), 442–454 (cut only). Spec 166–168, 287–289. |
| 8 N6 tools + result note | LANDED | `launch-smoke-cues.cmd` 37–38 (hedge default), 63 (`--models`, both lites); `wait-for-gemini.mjs` 12, 24–36; v3 line 50. Plan 1024. Spec 311–315, 554–555. |
| 9 N7 fast-forward | LANDED | Spec 350–356. Plan 1046. |
| 10 N8 both guards | LANDED | Plan 737 (the pin), 1002 and 1006 (negative marker, expected `False`). Spec 386–392. |
| 11 nits | PARTLY (4 of 5) | In: 3435/3438 (plan 26, 843; spec 517–518); Step 4(b)'s comment in the Global Constraints (plan 29); INDEX = 28 rows (spec 337, 535; plan 1024 — counted: 28 data rows at `721c6fa` and at HEAD, so the re-review's 27 was the miscount); 09:21 / 09:28 (spec 127, 266; plan 1010; both controller files corrected). **Not in:** "trimCues caps; the engine logs". It sits in Task 1's frozen text, now committed: `prompts.ts:221–222` still says "caps and logs it (trimCues)". Plan 1055 reports it. See nit a. |
| 12 order of work | LANDED | Plan 31–38. |
| Addendum (the exact v3 rule) | LANDED in the text | Spec 246–260, 303–308, 436–439; plan 1010, 1022. The tool computes exactly that interval (`real + aborted` to `+ failed`, `real > 0`). Its clause on failed answers does not hold for one log shape: R1. |

## 2. Task 5, chains (brief item 2)

- **Placement and source: as `answers.mjs:188`.** `stripCueBlock` wraps `gen()` directly, and it comes from the same
  built file through the same `require(path.join(PROJ, 'dist-electron/electron/llm/verbalStreamFilter.js'))`
  (`answers.mjs:34–35`, `chains.mjs:28–29`). One difference is not the wrap's: `answers.mjs:188` and
  `WhatToAnswerLLM.ts:389` have `filterCodeFences` between `filterVerbalLines` and `stripCueBlock`; chains never had
  it. Rightly left alone (nit e).
- **"No test can import chains.mjs": TRUE at HEAD.** Line 31 reads `<checkout>/.env` at the top level; the worktree
  has no `.env`, so an import throws there before anything else. In MAIN it would read the key, call the API
  (96–123) and write `interview60.chains.json` (113). Nothing imports the module today; `flight.mjs:361` spawns it.
  An exported composition would not help: any import runs the top level.
- **The pin fails on each mutant I tried on paper:**
  - wrap missing: the exact-composition `toContain` fails, and `not.toContain('filterVerbalLines(gen())')` fails;
  - wrap outside or in the middle: both of those fail again (the old inner text is still there);
  - wrap right, import missing: the destructuring `toContain` fails.
  The two comment lines Step 3(b) adds contain neither string, so the pin passes on the planned edit.
- **No other fresh path stores or re-feeds answer text.** `answer()` is the only producer. Its return value is what
  is stored (108, 110, 113), pushed into the history (117), counted by the anchor proxy (118–119, 132) and by
  `asksBack`. `CHAINS` (38) is the only export: questions only.
- **One bypass, harmless today: the resume store.** Turns already in `interview60.chains.json` are re-used and
  re-fed as stored (96, 104, 114–117). The flight moves the store aside first (`flight.mjs:319`), so a flight's
  answers are all fresh. The worktree's tracked store is from 2026-09-09: 15 turns, no `__CUES__`.
- **A pre-cue hour is unchanged.** With no sentinel, `stripCueBlock` yields the text as it arrived
  (`verbalStreamFilter.ts:391–404, 426–430`); it only holds back a partial sentinel, so at most the first chunk is
  regrouped. On a pre-cue DIST the call would throw (`stripCueBlock` undefined): the dependency `answers.mjs:34`
  already has. The v1 dist exports it (built filter lines 36, 264).
- Not exercised by anything before Friday: R5.

## 3. Task 3, the engine cases (brief item 3)

| Mutant | Killed by |
|---|---|
| drop `t.dropped.length` | "dropped only": `trimmedAt` is −1. `cut` and `cleaned` are empty there: the 8 lines have 3–4 words and nothing `cleanNotation` (525–566) touches. |
| drop `t.cut.length` | "cut only": one 7-word line, nothing dropped, nothing cleaned (`/` and `:` match no rule). |
| drop `t.cleaned.length` | "cleaned only": `$O(\log n)$ time complexity` cleans to 4 words, nothing dropped or cut. |
| log after the cues line | all four: each asserts the cues line's index is greater than the trimmed line's. |
| always log (not named) | the first case's added assertion. |
| trimmed line logged twice (not named) | "both" only (`toHaveLength(2)`). |
| raw block sent or logged (not named) | all four (`emits[0].cues`, the exact cues line). |

"Both" names no single-condition mutant: it survives each of the three alone. That is why the split was needed.

**Anchors: unique at `b649011`.**
- `IntelligenceEngine.cues.test.ts`, 81 lines: the first case's title once (42); line 51 once; the `[Answer] full:`
  assertion twice (52, 79), so the 51–52 pair is the anchor, as the plan says; one column-0 `});` (81). An Edit on
  that closer must take the third case's last lines with it, because `    });` contains the same characters; the
  plan's "the line after the third case's closing" covers it.
- **No anchor depends on the two comment lines.** `949ebc2` replaced lines 66–67 with two lines; the file is still
  81 lines.
- `IntelligenceEngine.ts`: line 16 once; the quoted block 406–413 once, text exact.
- `interview60.metrics.mjs` 113–123 (as Task 1 left 122) and the template at 500: exact, once.
- `interview60.metrics.test.ts` 283, 284, 641–646, 650, 657, 836, 1012: exact. `cueBlocks` is read nowhere else, so
  the new field and the new row text break no other test.

## 4. Task 4, the two guards (brief item 4)

- **The N8 pin holds on the edited file.** `ipcHandlers.ts` has no match for "cue" in any case today; its only three
  lines naming the hands-free constant are 16, 544, 557. Step 4(b)'s comment says "cue block" and "cue rule" in
  lower case with a space; the regex is case-sensitive.
- **The negative marker is sound.** `build-electron.js:60` is `bundle: false`: one output per file. In the current
  dist the name appears exactly at the two use sites (`ipcHandlers.js` 444, 456, as `import_prompts.…`); the import
  line is `var import_prompts = require("./llm/prompts")`, and the source map is a separate `.map`. esbuild drops
  statement-level comments (those at source 541–543 and 554–556 are absent from the output) but keeps a few that sit
  inside expressions (7 in this file), so a comment is not safe by itself: what makes the marker sound is that the
  pin forbids the name anywhere in the source. After Task 4 the source has no such identifier, so the output cannot.
- **Calibrated on the dist that exists:** today `VERBAL_WHAT_TO_ANSWER_PROMPT` reads `True` and
  `VERBAL_TYPED_PROMPT` reads `False`, so the pair answers differently before and after. The other markers read
  `CUE_MAX_LINES = 5`, no `function trimCues`, no `[Answer] cues trimmed:` today.
- `prompts.ts` line numbers in Task 4 are 13 higher after Task 1 (2384, 2428; `CUE_RULE` at 228). Both quoted texts
  are unique; the plan's grep rule covers it (nit d).

## 5. New findings

0 Critical, 0 Important, 5 Minor. None blocks the dispatch of Tasks 3, 4 or 5.

### R1 (Minor, before arming). A failed answer with no text reads as an absent block, in the check and in the row.

**What is wrong:**
- Spec 255–258 (also 305–307, 438–439; plan 1010, 1022): a failed answer "may come with or without a block and is
  never taken for a cue failure". The spec's own word for `[]` is "an absent block" (250).
- A stream that ends without text still logs a cues line. `stripCueBlock` reports at stream end
  (`verbalStreamFilter.ts:426–430`), so the engine logs `[Answer] cues: []`; then it substitutes "Could you repeat
  that? …" (`IntelligenceEngine.ts:460–462`) and logs the full line. The hedge does exactly this when both legs end
  empty (`LLMHelper.ts:3531`).
- v3 reads that `[]` as malformed (`check-smoke-cues.mjs:42`, `arr.length > 0`) and prints `malformed: []` with no
  link to the failed answer. The metrics row fails too: `present === n` (`metrics.mjs:500`).
- So a failed answer whose cues line is `[]` fails the re-smoke as "an absent block", which the text says cannot
  happen. The calibration has a failed answer with no cues line and one with a non-empty block
  (`calib-cue-smoke.mjs` 32–35), not this one.
- SPIKE6-RULE item 5 already makes the distinction the check does not: a response with no text is a transport
  failure, not an empty block.

**Fix, one of, before arming:**
- (a) Make the statement exact, in the spec, the plan and the pre-registration of R3: a failed answer with no cues
  line, or with a non-empty block, is not a cue failure; a failed answer whose stream ended without text logs
  `[Answer] cues: []` and fails both the check and the row; the note names it as a transport failure and the
  re-smoke is re-run, not re-worded. Add the case `[cues(['a']), FULL, cues([]), FAIL_REPEAT]` → exit 1.
- (b) Exempt it: v3 skips an `[]` line whose next `[Answer]` line is a failed full line (same case → exit 0, and
  `[cues([]), FULL]` stays exit 1), and the PASS rule reads the row without those answers.

Plan 1022's "Not clean → the fix goes back through this plan's tasks" needs the same exception: these are re-runs.

**Three more shapes read NOT CLEAN without being cue failures (not counted; one sentence in §9.2 is enough):**
- a coding route: a full line with no cues line by design (`WhatToAnswerLLM.ts:291–293`). Named in N1, not ruled.
  05:00 had none.
- a superseded stream whose next token is a redirect sentinel or the failure text (`WhatToAnswerLLM.ts:82`,
  446–448): an abort line with no cues line before it.
- the count is aggregate: a failed answer that logged a block can offset a real answer that logged none.

### R2 (Minor, before the typed check). Task 6 Step 6 can pass with nothing tested.

**What is wrong.** "The user starts the merged build … types two non-coding questions" (plan 1042, spec 346–349)
names no checkout, no command, no precondition and no consequence. Four ways to read "no `__CUES__`" without
exercising 544 or 557:
- MAIN's own app is started. Before Thursday it has no cue mode, so no block appears whatever Task 4 did.
- A non-Gemini model is selected: the question goes to `streamChat` (`ipcHandlers.ts:536`, 595), which carries no
  verbal prompt.
- The classifier says coding (540): same branch.
- Context ON without a loaded résumé, or on a greeting, an intro question or a live salary negotiation:
  `processQuestion` returns null or an empty injection (`KnowledgeOrchestrator.ts:305`, 363–386;
  `ContextAssembler.ts:237–257`), so line 557 is never reached and the ON question repeats the OFF one.

**Fix.** Step 6 and §3.5.6 state:
- where: the worktree, `npm start` there (what `run.mjs:313` runs), MAIN's app closed first (one instance lock);
- preconditions: a Gemini model selected, no screenshot, a plain technical question, a résumé loaded for the ON one;
- the proof each branch ran, read from that session's log: `[IPC] gemini-chat-stream intent: <not coding> …,
  model=gemini-…` for both, `[KnowledgeOrchestrator] Intent classified:` for the ON one;
- the consequence: a `__CUES__` or a `1|` line in either bubble stops Thursday's merge and goes back to Task 4.

The readings go into the result note before it is committed, or in a second commit (Step 3 commits the note; Step 6
writes into it).

### R3 (Minor, before arming). The re-smoke is the one gating run without a pre-registration in `passes/`.

**What is wrong:**
- h40c's layout (the user's decision 3, AGENDA 30 Sep) is PREREGISTER + the tool's record + a result note + an INDEX
  row. The probe and the bench have their PREREGISTER (plan 1034, 1038); spike 6 got one today (`b649011`).
- The re-smoke's rule is "stated before arming" only in the spec, which is gitignored. Step 3 (plan 1024) commits
  the tool's record and a hand-written note, nothing written before the run.
- "Every pass, good or bad": Step 7 copies the re-smoke's run folder into MAIN only on the merge path, and the 05:00
  run (NOT CLEAN, the run this delta answers) has no `passes/` record at all.

**Fix:**
- Before the task is registered, commit `passes/PREREGISTER-cuesmoke.md`: §3.5.2's PASS verbatim (v3's three
  conditions with R1's exact wording, app health, the cue row), what the note records, the HEAD and the dist mtime
  that fly. The result note applies it, as h40c's does.
- Step 3 also writes the 05:00 run's record, so the delta has its "before".
- Step 7 copies every `*-cuesmoke` run folder that has a record, failed ones included, before `--index`.

### R4 (Minor, before the probe and the bench; the text predates revision 2). The bench's fallback day contradicts the merge rule.

**What is wrong:**
- Plan 1038, spec 268–270, `PREREGISTER-cuebench.md` 70–74: with less than 150 requests of headroom the bench waits
  for "Friday after the validation hour's calls are known, never Thursday".
- The validation hour is the first holdout flight AFTER the merge (spec 356–357, plan 1046), and the merge needs the
  bench to pass (spec 79). So the fallback orders the bench after an hour that cannot fly until the bench has
  passed.
- The probe (reported, not gating) runs before the bench's check and spends 52 calls on 3.5-lite. Its
  pre-registration says "after the day rule's quota-ledger check" and names no threshold. A ledger at 150–201 lets
  the probe push the gate under 150.

Reach today: low. Spike 6 spent 108 after the reset; br1 runs `interview60.run.mjs auto`, not the flight, so it has
no replay arms (`boundary-repair\launch-br1.cmd:62`); the re-smoke and the probe add about 75.

**Fix:**
- Amend the pre-registration before any bench call, and Step 5 with it: bench not run today → no Thursday merge →
  the bench on the next free quota day → then the merge → then the validation hour.
- The probe runs only when the ledger shows at least 202 on 3.5-lite (150 plus its own 52), or after the bench.

### R5 (Minor, in §9 now; the run on Thursday or Friday). Task 5's wrap is never executed before the validation flight.

**What is wrong:**
- Task 5 Step 4 proves the change by text and by `node --check` (plan 953–964). That is all the worktree allows:
  `chains.mjs:31` reads `<checkout>/.env` itself, so the module cannot run there.
- Its first execution is in MAIN. As planned, that is Friday's flight, inside the hour the feature is validated on.
- §9.11 (spec 591–593) and the plan's known limits (1056) do not list it.
- If it fails there, nothing stops: `flight.mjs`'s `run` resolves the exit code and never throws (255–270), so the
  only signs are an `EXIT` line in the flight log and a missing chains section.
- A plain manual run proves nothing either: the stored `interview60.chains.json` is complete in both checkouts
  (5 chains, 15 turns; MAIN's is h40c's), so the module resumes from it and calls nothing.

**Fix:**
- Name it in §9.11 and in the known limits: proven by the pin and a parse; first executed in MAIN.
- Either add to Step 7, after MAIN's rebuild: one run with `interview60.chains.json` moved aside (25 calls on
  3.1-lite, if Thursday's day rule allows), reading the stored answers for no `__CUES__`; or accept Friday as the
  first execution and have the post-flight read check the chains `EXIT 0` line and the section.

### Nits (not counted)

- a. Ruling 11's comment nit has no vehicle. Task 4 already edits `prompts.ts` and could carry the one-line change
  at 221–222 ("caps it (trimCues); the engine logs it"); or the controller drops it on record.
- b. Plan 29 and spec 413 say "one comment line" for `ipcHandlers.ts`, and plan 29 says it for `chains.mjs`. Task 4
  Step 4(b) and Task 5 Step 3(b) each add a two-line comment, and plan 26 and 843 say "two comment lines". Say "one
  comment (two lines)", so a task reviewer does not read the second line as out of scope.
- c. After the renumbering, `PREREGISTER-cueprobe.md:4` and `probe-shipped.mjs:1` still say "Task 5 Step 4" (now
  Task 6 Step 4); the pre-registration goes into `passes/`. `launch-smoke-cues.cmd:2` says "plan Task 9 step 1".
  The probe prints one `trimmed` count per set, not the dropped / cut / cleaned split plan 1033 names; the rows hold it.
- d. Stale since the files were written: "HEAD is `721c6fa`" (spec 20; now `b649011`, Tasks 1–2 in); the hedgeCues
  lines at spec 505–506 are one higher after `949ebc2` (74, 75, 87, 96, 111, 126, 136; 146 lines); Task 4's
  `prompts.ts` numbers (above); the deadline rollover is `wait-for-gemini.mjs:20`, not `:16` (spec 542).
- e. "Exactly as WhatToAnswerLLM composes it" (plan 874, 904, 948; spec 380) is true of the innermost placement
  only (§2 above). "Innermost, as WhatToAnswerLLM places it" says it.
- f. The check reads the newest `*-cuesmoke` folder by name, and the 05:00 folder is still there. If `auto` dies
  before it creates its folder, the check prints the 05:00 run. It fails safe (that run is NOT CLEAN at 3×5), but
  Step 3 should confirm the folder name on the check's first line.
- g. Step 7 does not name the review the user asked for before the merge (AGENDA decision 2: "separate branch, Opus
  review first"). The SDD final review of `279103b..tip` is that review; name it beside the two gates.
- h. Both "Times-only correction, 10:36" notes (`SPIKE6-RULE.md:6`, `PREREGISTER-cuebench.md:3`, and the committed
  `passes/PREREGISTER-spike6.md`) state a time later than their files' mtimes (10:33:54, 10:33:57): the slip they
  correct. `SPIKE6-RULE.md:10` ("this file's mtime predates every spike-6 call that counts") stopped being true with
  that edit. `spike6-result.md:11` and `progress.md:12` still say 09:22.

## 6. Task 6 and self-contradictions (brief items 5 and 6)

**Consistent, checked:**
- the v3 rule is the same in spec §3.4, §3.5.2, §6, plan Steps 2–3 and the tool; 22 calibration cases = 20 fixture
  folders + h40b + the env case (read, not run);
- the gate waits for both lites in one attempt, and a past deadline rolls to tomorrow (`wait-for-gemini.mjs:20`);
  `StartAt` after 14:50 and before 18:30 in spec and plan, against the launcher's `--deadline 18:30` (63);
- the typed check comes after `CHECK EXIT`; the launcher stops the app before the check (72–76);
- the INDEX restore (28 rows) and "never commit a regenerated INDEX";
- the fast-forward rule with N7's condition;
- the user's decisions: 3×5 as a ceiling, one line for a simple question (asked, measured by the probe, not
  enforced), the full answer as today (the typed path returns to MAIN's bytes), the merge only after both gates,
  Friday's hour keeps its arms and nothing else in Task 6 runs any.

**Contradictions:**
- with a user decision: R3 (h40c's layout), R4 (the merge rule, in the fallback branch only);
- introduced by revision 2, inside itself: R1 (the failed-answer clause against the tool and the row), nit b (one
  against two comment lines), nit c (the renumbered task).

## Verdict

**READY.** 0 Critical, 0 Important, 5 Minor (R1–R5), plus nits.
- Tasks 3, 4 and 5 can go to Sonnet as written.
- All thirteen rulings landed as ruled, except one comment nit of ruling 11 that Task 1's freeze kept out.

| Deadline | Findings |
|---|---|
| Before the re-smoke is armed | R1, R3 |
| Before the probe and the bench | R4 |
| Before the typed check | R2 |
| In §9 now; the run on Thursday or Friday | R5 |
