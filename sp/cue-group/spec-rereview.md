# Scoped Opus re-review: small-cues spec + plan, revision 1

Reviewed 2026-09-30, 10:05 to 10:30 local. The baseline is HEAD `279103b`, unchanged since the merge. The working tree was
read as found at 10:13: the merge review's fix was being applied there, uncommitted (see N4).

**Read:**
- The spec and plan (revision 1), `spec-review.md`, `fable-revision-1.md`, `progress.md`, and `merge-review.md`. The merge
  review is from 10:08, after this revision was written.
- At HEAD:
  - `prompts.ts` and its test;
  - `verbalStreamFilter.ts` and its test;
  - `IntelligenceEngine.ts` and `IntelligenceEngine.cues.test.ts`;
  - `interview60.metrics.mjs` and its test;
  - `ipcHandlers.ts` (lines 1–80 and 440–642);
  - `LLMHelper.ts` (3335–3542) and `WhatToAnswerLLM.ts` (286–435);
  - `SessionTracker.ts` (236–250) and `knowledgePromptBudget.ts`;
  - `interview60.chains.mjs` and `interview60.pass-record.mjs` (255–298);
  - `passes/INDEX.md` at HEAD.
- The controller's tools:
  - `check-smoke-cues.mjs` and `calib-cue-smoke.mjs`;
  - `cuebench-score.mjs`, `cuebench-calibrate.mjs` and `e2e-cuebench.mjs`;
  - `PREREGISTER-cuebench.md`;
  - `launch-smoke-cues.cmd`, `register-cue-smoke.ps1` and `wait-for-gemini.mjs`;
  - `SPIKE6-RULE.md` and `make-spike6.mjs`.
- The 05:00 run folder's log and report.

**Ran (all read-only):**
- `git diff 0ef42a0 279103b -- electron/llm/prompts.ts`.
- Greps for every consumer of `VERBAL_WHAT_TO_ANSWER_PROMPT`, every caller of `streamVerbalWithGeminiFlash(`, and every
  reader of `[Answer] cues` / `[Answer] full`.
- vitest from `%TEMP%` on 6 files: prompts, verbalStreamFilter, IntelligenceEngine.cues (the working-tree version),
  interview60.metrics, knowledgePromptBudget and cueArm. Result: 156 passed, 2 skipped (the 2026-09-02 fixture).
- Line counts in the 05:00 log.

Not done: no tsc, no build, no network call. `.env` and keys were not read.

## 1. Findings 1–18

| # | Status | Where it is fixed |
|---|---|---|
| 1 merge | RESOLVED as ruled | Spec 11–17 (the tree) and §3.5.6 292–297. Plan 15 and Task 5 Step 7 (876). Every anchor re-checked at 279103b (§4). A wording problem and one gap: N7. |
| 2 re-smoke model | RESOLVED | Spec 15–16, §3.5.2 249–252 and §9.2 448–454. The cleanup is now visible through `cleaned`: spec §3.2 128–144, plan Task 2 (338–350) and Task 3 (489, engine case 428–439). Which model actually answered is not recorded: N6. |
| 3 bench instrument | RESOLVED (done by the controller, and described) | Spec §3.4 223–233, §3.5.4 277–281 and §9.3 455–457. Plan Task 5 Step 5 (868). `cuebench-score.mjs:23–45` gates "present and shaped" and reports words; `:60` prints the rule hash and `CUE_SHAPE_RULE`. `cuebench-calibrate.mjs:12,15` has the 35/39 lines-only STOP and the words-only PASS. |
| 4 smoke-check calibration | RESOLVED (done, and described) | Spec §3.4 216–222. Plan Task 5 Step 2 (840). `calib-cue-smoke.mjs:11–23` has 11 fixture cases (6 words, the 3×5 boundary, backtick, `\log`, money, and `trimmed 1` read from the full stdout), plus h40b and the env case: 13. A superseded answer is not among the cases: N1. |
| 5 pass records | RESOLVED | Spec §3.5.5 282–291. Plan Task 5 Step 3 (854), Step 4 (864) and Step 5 (868). |
| 6 absent blocks | RESOLVED as ruled; the counts are pending by design | SPIKE6-RULE addendum, items 5–7. Spec §3.5.2 255–256 states the rule before arming. §9.5 461–466 is the one declared placeholder. |
| 7 typed path | RESOLVED | Spec §1.4 44–49, §3.6 299–325 and §4 343–344. Plan Task 4 (638–811). See §2 below, N3 and N8. |
| 8 deadline | RESOLVED | Spec §3.5.2 252–255 and §8 439. Plan Task 5 Step 3 (844). `launch-smoke-cues.cmd:63` has `--deadline 18:30`. |
| 9 line numbers | RESOLVED at 279103b | Every quoted anchor is present (§4). One anchor is drifting in the working tree now: N4. |
| 10 precise wording | RESOLVED | Spec §3.2 124–127. |
| 11 empty cue | RESOLVED | Spec §3.4 198–200. Plan Task 3 Step 5(a) (523) and Step 7 (588). |
| 12 launcher v1 guard | RESOLVED (done) | Spec §3.4 234–235. `launch-smoke-cues.cmd:25–30` and `register-cue-smoke.ps1:21`. |
| 13 swap in process | RESOLVED | Spec §3.1 91–99. Plan: 44; the markers at 69 and 121; the neutral comment 127–137; the swap note 153; the commit message 196–199; the 4th marker in Task 5 Step 1 (831). Each arm's marker fragment is unique to that arm and absent from v1's rule (checked). |
| 14 probe | RESOLVED (all five points) | Spec §3.5.3 264–276. Plan Task 5 Step 4 (856–864). |
| 15 PASS criterion | RESOLVED as ruled | Spec §3.5.2 257–261. Plan Task 5 Step 3 (852). The cause it gives is wrong, and the check it adopts has its own counting trap: N1. |
| 16 cleanup scope | RESOLVED | Spec §2 64–65, §3.3 171 and 181–186, and §9.9. Plan's `trimCues` comment (328–329). |
| 17 trailers | RESOLVED | Plan 16, 208, 379, 633 and 810. |
| 18 all-disqualified | RESOLVED | SPIKE6-RULE addendum item 7. Spec §3.1 103–116, with the time corrected to 08:29. |

Rulings 19 (spec §9.7) and 20 (plan 17 and 817) are in.

## 2. The typed chat path (brief item 2)

**Is everything before `CUE_RULE` exactly the typed prompt today? Yes, byte for byte.**
- At 279103b the template is `${CORE_IDENTITY}…Output ONLY the spoken answer. Nothing else.\n${SPOKEN_LENGTH_AND_DEPTH}${CUE_RULE}`
  (prompts.ts:2371–2415).
- Task 4 cuts the template at `${CUE_RULE}`. `VERBAL_TYPED_PROMPT` is everything before that point, and
  `VERBAL_WHAT_TO_ANSWER_PROMPT = typed + CUE_RULE` keeps its old value exactly.
- `git diff 0ef42a0 279103b -- prompts.ts` shows only the cue additions. So the typed prompt equals MAIN's shipped
  `VERBAL_WHAT_TO_ANSWER_PROMPT` byte for byte, on both branches, including the `${kr.systemPromptInjection}\n\n${…}` form.
  The typed path goes back to exactly what MAIN sends today.
- The existing tail assertions stay true:
  - prompts.test.ts:238 and :257: `endsWith('- Still first person, …' + CUE_RULE)`;
  - prompts.test.ts:258: the rule occurs once.
- The new assertion `VERBAL_TYPED_PROMPT.endsWith('- Still first person, still open with substance, still no questions back.')`
  is true: that sentence ends `SPOKEN_LENGTH_AND_DEPTH`, at prompts.ts:285.
- There is no temporal dead zone: `CUE_RULE` (215) and `SPOKEN_LENGTH_AND_DEPTH` (265) are both declared above.

**Are all `gemini-chat-stream` sites covered? Yes.**
- The handler (ipcHandlers.ts:454–642) has exactly two sites that set the verbal prompt: 544 and 557.
- Its other branch (595) passes `undefined` or `""` to `streamChat`, and `LLMHelper.ts` never references the verbal
  constant.
- Outside WhatToAnswerLLM, the only production caller of `streamVerbalWithGeminiFlash(` is ipcHandlers.ts:574.

**Is every consumer of the hands-free constant decided? Yes, for code.** The decisions are right for:
- WhatToAnswerLLM: all four sites (321, 332, 343, 414) sit inside `filtered`'s `stripCueBlock` at line 389, the error
  fallback included;
- answers.mjs and run.mjs: both run `stripCueBlock`;
- the tests: the 8 LLMHelper files, and the knowledgePromptBudget, cueArm and prompts tests.

The reason given for keeping `chains.mjs` is wrong (N3). Two comment mentions are missing from the table:
`test/golden/problems.verbal.mjs:11` and `test/golden/interview60.answers.mjs:8` (nit).

**Would the source-text pin fail if a site kept the hands-free prompt? Yes.**
- `not.toContain('VERBAL_WHAT_TO_ANSWER_PROMPT')` fails on any use or import left anywhere in the file.
- Each `toContain` names one site's exact line, so a partial edit (only one site changed) also fails.
- Step 2 watches both `it` blocks fail before the edit.
- The second `toContain` is a single-quoted literal: `${…}` is not interpolated, and `\\n\\n` is the two-character `\n` the
  source file holds. It therefore matches the edited line exactly.
- `import.meta` under `@ts-ignore` is the same pattern as `interview60.metrics.test.ts:10–12`. The electron tsconfig
  includes test files and uses `module: CommonJS`, and the ignore keeps the tsc count at 6.
- What the pin does not catch: the cue rule reaching the typed prompt some other way, for example
  `verbalSystemPrompt += CUE_RULE` or a third composition.

**A sturdier test within the repo's patterns: possible, but heavier.**
- 18 test files already use `vi.mock('electron')`. A behavioural test would:
  - capture the `gemini-chat-stream` listener from a mocked `ipcMain.handle`;
  - stub `appState`, including an llmHelper whose `streamVerbalWithGeminiFlash` records its `systemPrompt`, with the
    knowledge orchestrator both on and off;
  - `vi.mock` `./llm/IntentClassifier` to return non-coding;
  - assert that neither branch's prompt contains `CUES_SENTINEL`.
- It would prove the value actually sent. But it must also mock `./db/DatabaseManager`, `./audio/AudioDevices`,
  `./services/PhoneMirrorService` and `./IntelligenceManager`, and it runs the whole registration of a file of about
  3,400 lines. I have not shown that it loads.
- For a change of two identifiers: keep the pin, and add the two cheap guards in N8.

## 3. `cleaned` and the trimmed line (brief item 3)

**What the tests pin:**
- The `trimCues` cases pin `cleaned`:
  - the LaTeX line and the marks line are reported;
  - `\frac` appears in both `cut` and `cleaned`;
  - `**` becomes `''`;
  - a clean block reports nothing.
- The engine's LaTeX case pins that a block changed only by the cleanup still logs the trimmed line. Without
  `t.cleaned.length` in the condition, that case fails.
- The first engine case pins that nothing is logged when nothing changed.
- Not pinned: the dropped-only and cut-only parts of the condition (N5).

**The existing readers stay unaffected.**
- The metrics regex `^… \[Answer\] cues: (\[.*\])$` needs `cues: [` directly after `[Answer] `.
- The smoke check matches with `includes('[Answer] cues:')` (check-smoke-cues.mjs:21).
- `'[Answer] cues trimmed:'` matches neither.
- `smoke-shape.mjs:9` uses the metrics regex, and the judge reads only `[Answer] full:`.
- I computed every `trimCues` and engine fixture by hand through `cleanNotation` as written (verbalStreamFilter.ts:524–565).
  Each lands where the plan expects:
  - `$O(\log n)$` becomes `O(log n) time complexity`;
  - `$\frac{3,000}{9,500}$ true positive rate` first matches the matched-pair rule, then `\frac` becomes "over", which
    gives 6 words, cut to 5;
  - `60% …` and `Batch/Online …` are untouched.

**`trimmed` now means something wider, and that is stated.** It counts any display edit, including a block that was only
cleaned. The spec says so in §3.2 (141–144, where the name is kept on purpose) and §3.4 (201–202), and so does the new
metrics comment (plan 578–581). The row text itself (`…, 1 trimmed`) does not, so a report reader may take a removed `$`
for a cut. Nit: the result note names each line's field anyway.

## 4. Line refresh (brief item 4)

Checked against 279103b, both the quoted text and the line number:
- prompts.ts: 200–204, 206–214, 215–226 (bullet 223), 2371 and 2415.
- prompts.test.ts: 16, 238, 242–252 and 254–260.
- verbalStreamFilter.ts: 12–13, 327, 344–345 (quoted text exact), 347, 377, 524–565, 567 and 572.
- verbalStreamFilter.test.ts: 2, 180–181, 543 (exact) and 602.
- IntelligenceEngine.ts: 16, 406–413 (exact), 414, 437 and 438–451.
- IntelligenceEngine.cues.test.ts: 52 and 64.
- metrics.mjs: 113–123 (122 exact), 411 and 500 (template exact).
- metrics.test.ts: 283–284, 606–607, 641–646, 650, 657, 694, 799–838 (836) and 1012.
- ipcHandlers.ts: 16, 544 and 557 (all exact, indentation included).
- WhatToAnswerLLM.ts: 321, 332, 343, 414 and 380–385.
- LLMHelper.ts: 3344–3371 and 3471–3542.

**No quoted anchor text is missing at 279103b.** In the working tree, the merge review's fix is landing and changes
IntelligenceEngine.cues.test.ts (N4).

## 5. New findings

0 Critical, 0 Important, 8 Minor.

### N1 (Minor, before arming). A superseded answer fails the smoke check, and the spec gives the wrong reason why n moves.

**The counting trap.**
- check-smoke-cues.mjs:38 requires `cueLines.length === full.length`.
- A superseded answer logs `[Answer] cues:` but never `[Answer] full:`. The merge review's Preconditions section says so,
  and the code confirms it:
  - the old stream runs until its first prose token;
  - `stripCueBlock` reports the block before that token;
  - IntelligenceEngine.ts:423–430 then aborts, before SessionTracker.ts:244 writes `[Answer] full:`.
- So one supersede in the re-smoke reads `CUE SMOKE NOT CLEAN`. The pre-registered PASS (§3.5.2) then fails on a pipeline
  event that has nothing to do with the cue shape. The metrics row (n ≥ 0.9 × delivered, present = well-formed = n)
  passes the same run.
- The calibration covers the opposite shape (1 cues line, 2 full lines) but not this one (2 cues lines, 1 full line).
- A coding route (a full line with no cues line) sets the same trap.
- The likelihood is low: the 05:00 S1 run had 0 supersedes and 0 CODING routes, and h40c had 0 supersedes. But the
  re-smoke is the first live run of supersede, hedge and cues together.

**The wrong reason.**
- §3.5.2 says "supersedes change n: the 05:00 check saw 22 cue lines while the row read 20/20". That run had 0 supersedes.
- Its first two answers were dispatched at 02:03:18 and 02:03:35, before the timeline starts at 02:03:48.949Z. The row
  leaves them out of its window; the check counts the whole log.
- So the check reads about 22 answers, not 20. §9.5's pending probability should use 22: 1 − (35/36)^22 ≈ 46 %, not 43 %.

**Fix:**
- Before arming, do one of these:
  - (a) Make a v3 of the check. It accepts cue lines = full lines + the `_what_to_say stream aborted by new generation`
    lines that follow a cues line. Calibrate it with a case of 2 cues lines, 1 aborted line and 1 full line (= CLEAN),
    kept beside the existing missing-cues-line case.
  - (b) Add one sentence to §3.5.2: a count mismatch fully accounted for by aborted generations is not a cue failure,
    and every logged block must still be present and well-formed.
- Correct the parenthetical in §3.5.2.

### N2 (Minor, before the typed check). The live typed check must not happen during the re-smoke.

**What is wrong:**
- Plan Task 5 Step 6 says to type into "the running merged build". The only scheduled run of that build is the re-smoke.
- A typed answer there logs `[Answer] full:` with no cues line (ipcHandlers.ts:622 leads to SessionTracker.ts:244). The
  check then reads NOT CLEAN.
- The typed question and answer also enter the interview transcript that the next hands-free answers read
  (ipcHandlers.ts:464–469).

**Fix:** state in Step 6 and §9.8:
- run the typed check after the re-smoke's check has finished;
- use a merged build the user starts from their own terminal, never from a Claude session (shadow AppData);
- name which branch the question exercises: the Context toggle on is the knowledge branch (557), off is 544.

### N3 (Minor). `chains.mjs` does not emulate the hands-free path, so "keep" needs a different reason or a one-line fix.

**What is wrong:**
- §3.6 keeps `interview60.chains.mjs:73` because "it emulates the hands-free prompt". It does send that prompt, but it
  filters with `stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(gen())))` (:87). There is no `stripCueBlock`;
  :28 does not import it.
- On a cue build this has three effects:
  - each stored answer opens with the raw `__CUES__` block;
  - the anchor-hit proxy counts the cue words too;
  - the block is pushed back into the next turn as `ASSISTANT (PREVIOUS SUGGESTION)` (:117, :67). That is history the
    app never builds: the app's history is the prose `fullAnswer`.
- flight.mjs:354 runs chains.mjs in every flight. report-html.mjs:578 tells the reader the transcript is "formatted
  exactly as the app hands it". Friday's validation hour will be the first cue hour through this path.

**Fix, one of:**
- Add `stripCueBlock` as the innermost filter, as answers.mjs:188 does: one import and one wrap. This takes chains.mjs off
  the plan's do-not-touch list.
- Keep it as it is, and say in §3.6 and §9 that chains numbers from a cue hour carry the raw block in both the answer and
  the history, and are not comparable with pre-cue hours.

### N4 (Minor, before Task 3 is dispatched). The merge review's fix is changing Task 3's test anchors.

**What is wrong:**
- Finding 2 of merge-review.md (10:08, after this revision) asks for an engine case with a `(hedge)` sentinel chunk.
- At 10:13 the working tree held that fix, uncommitted:
  - IntelligenceEngine.cues.test.ts is now 81 lines;
  - its new third case ends with the same `expect(logs).toContain(\`[Answer] full: ${JSON.stringify(PROSE)}\`);` (line
    79) that Task 3 Step 1 quotes as its insertion anchor (line 52), so that anchor is no longer unique;
  - the describe's final `});` is at line 81, not 64;
  - `electron/llm/WhatToAnswerLLM.hedgeCues.test.ts` is new and untracked.
- Spec §8's "64 lines, unchanged by the merge" goes stale once that fix is committed.

**Fix:**
- Anchor Step 1 on the first case's lines 51 and 52 together (or on its title), and on "the describe's final `});`".
- Add `electron/llm/WhatToAnswerLLM.hedgeCues.test.ts` to Task 3 Steps 4 and 8. v2 edits exactly the seam that this test
  and the new engine case pin.

### N5 (Minor, Task 3). Only half of the engine's log condition is tested.

**What is wrong:**
- The condition is `if (t.dropped.length || t.cut.length || t.cleaned.length)` (plan 489).
- The 8-line case has both drops and a cut: its second line was lengthened "so both cuts show". So removing either
  `t.dropped.length` or `t.cut.length` still passes every planned test.
- Only `cleaned` is tested on its own (the LaTeX case).
- A mutant without `t.cut.length` would display a cut line and log nothing. That goes against "every cut is logged".

**Fix:** split the case in two, or add both of these beside it, each asserting its own trimmed line and the log order:
- the smoke's real S1Q09 block: 8 lines, each of at most 5 words, so dropped only and `cut: []`;
- one 7-word line on its own: cut only, `dropped: []`.

### N6 (Minor, before arming and in the result note). What the re-smoke answered on is asserted, not recorded.

**What is wrong:**
- The Gemini gate probes only `gemini-3.1-flash-lite` (`wait-for-gemini.mjs`).
- The launcher's comment still says the smoke is "gemini-3.1-flash-lite LOW, no hedge" (launch-smoke-cues.cmd:37–38).
- If 3.5-lite is failing (a 503 or quota), the hedge's back leg answers everything (LLMHelper.ts:3517–3521). The
  re-smoke then silently becomes a 3.1-lite run, which is the case review finding 2 was about.
- The check prints each trimmed line cut at 160 characters (check-smoke-cues.mjs:36). With `cleaned` added, a trimmed
  line for an S1Q09-type block is longer than that; the spec's own example is about 165 characters. Task 5 Step 3 reads
  the tail of the launcher log, where those shortened lines sit.

**Fix:**
- The result note records the split of `verbal hedge: won by <model>` lines (LLMHelper.ts:3513 and 3540).
- The result note quotes each `[Answer] cues trimmed:` line from the run folder's `natively_debug.log`, not from the
  check's printout.
- Fix the launcher comment.
- Optional: let the gate also probe 3.5-flash-lite.

### N7 (Minor, before Thursday). The fast-forward assumes MAIN moves only by a docs commit.

**What is wrong:**
- §3.5.6 and Task 5 Step 7 say: "MAIN's branch is an ancestor of 279103b; the fast-forward holds as long as MAIN's
  branch does not move first".
- But the procedure itself moves MAIN: the post-br1 docs commit lands there. What matters is that, after the docs merge,
  MAIN's tip is an ancestor of the cue branch.
- MAIN is shared with other sessions, and br1 may prompt a fix before Thursday. If the merge carries code, the
  fast-forward publishes a program that neither gate ran on.

**Fix:**
- Reword to: "after that merge, MAIN's tip is an ancestor of the cue branch; nothing may land on MAIN between the merge
  and the fast-forward".
- Add: if MAIN carries anything beyond docs since 0ef42a0, that merge first gets a review, the full suites and both tsc
  gates, and says whether a re-smoke is needed, before the fast-forward.

### N8 (Minor, Task 4 and Task 5 Step 1). Two cheap guards for the typed path.

**What is wrong:**
- The pin misses a cue rule added some other way (§2).
- Task 5 Step 1's build marker (`VERBAL_TYPED_PROMPT` in ipcHandlers.js) reads True even if one site kept the hands-free
  constant.

**Fix:**
- Add `expect(src).not.toMatch(/CUE_RULE|CUES_SENTINEL|__CUES__/)` to the pin.
- Add a negative build marker: `ipcHandlers.js` must NOT contain `VERBAL_WHAT_TO_ANSWER_PROMPT`.

### Nits (not counted)

- Plan Task 4 Step 5 says the three ipcHandlers tsc errors stay "at 3433/3436". Task 4 adds two comment lines at 544, so
  they move to 3435/3438. The count check is unaffected.
- The Global Constraints say only the import line and two prompt lines change in ipcHandlers.ts. Step 4(b) also adds a
  comment.
- The metrics fixture's trimmed line (`rawLines 4`, one line dropped) sits beside a 2-cue block. This is harmless:
  nothing cross-checks them.
- The neutral `CUE_RULE` comment says trimCues "caps and logs". trimCues caps; the engine logs.
- §3.5.5 says INDEX has "24 committed rows". It has 27 at HEAD.
- Two times in the record are later than the files' mtimes:
  - SPIKE6-RULE's addendum header says 09:25; the file's mtime is 09:21:40;
  - the PREREGISTER amendment says 09:35; its mtime is 09:28:16.

  Both are earlier than stated, so both are still before any data. A times-only correction would keep the record exact,
  as was done for 08:50 → 08:29.

## 6. Contradictions (brief item 5)

None with the user's decisions or the rulings. The typed path goes back to MAIN's exact bytes, so "the full answer stays
as today" holds for typed chat, as the controller reads that decision.

Inside the revision:
- the wrong cause given in §3.5.2 (N1);
- the ancestor wording in §3.5.6 (N7);
- the reason given for keeping chains.mjs (N3);
- the launcher comment, which contradicts §3.5.2 (N6).

## Verdict

**READY.** 0 Critical, 0 Important, 8 Minor.
- Tasks 1, 2 and 4 can go to Sonnet as written. Task 1 takes spike 6's winner through its swap note. N8 adds one assertion
  to Task 4 and one marker to Task 5.
- Task 3 goes after N4's anchor fix, with N5's split.

| Deadline | Findings |
|---|---|
| Before Task 3 is dispatched | N4, N5 |
| With Task 4 and the build | N8 |
| Before the re-smoke is armed | N1, N6, and N2's timing stated |
| Before Friday's pre-registration | N3 |
| Before Thursday | N7 |
