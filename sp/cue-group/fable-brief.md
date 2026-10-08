# Cue mode v2, "small cues": spec delta + implementation plan (Fable)

You write a SPEC DELTA and an IMPLEMENTATION PLAN for a revision of cue mode in the Natively Electron app. Cue mode is built, reviewed and unmerged, on branch `feat/whole-turn-answers`, in the worktree below. Write both files; do not implement anything. Opus reviews your spec before any code is written, and Sonnet implements your plan task by task.

## Where things are
- **Worktree (read-only for you except the two output files):** `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\.claude\worktrees\whole-turn`, branch feat/whole-turn-answers, HEAD fd57512.
- **The cue-mode spec you revise:** `docs/superpowers/specs/2026-09-20-cue-mode-design.md`. **Its plan:** `docs/superpowers/plans/2026-09-21-cue-mode.md` (both gitignored, local only).
- **Evidence folder:** SP\cue-group\, where SP = `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad`. It holds spike.mjs, spike2-5.mjs, their `*.run.log` summaries and `spike*-*.json` raw answers, and smoke-shape.mjs.
- **The failing smoke:** worktree `electron/test/golden/interview60.runs/2026-09-30T02-38-22-cuesmoke/`, plus `interview60.runs/smoke-cues.launcher.log`. The smoke's check is SP\check-smoke-cues.mjs.

## What happened (facts, with sources)
1. **The 2026-09-30 05:00 scheduled cue smoke (scenario50 S1, 3.1-flash-lite LOW, no hedge on this branch) was NOT CLEAN.** 1 of 22 cue blocks had 8 lines. S1Q09 names 8 Azure components, and the rule says both "One line per part the question names" and "Never more than 5". Nothing caps in code: `stripCueBlock` deliberately never truncates. The app was otherwise healthy (20/20 answered hands-free, 8/8 long questions whole).
2. **The shape of what the candidate saw** (`smoke-shape.mjs`): cue lines p50 3 (max 8); words per line p50 4; cue words per block p50 13 (max 30). Questions of ≥30 words averaged 3.9 lines, shorter ones 2.6. The spoken answer below the cues had p50 87 words (max 173); cue mode did not change it.
3. **Spikes** replay the smoke's EXACT captured calls with one sentence changed (`interview60.prompts.json` in the run folder). Simple questions are invented, checked against holdout40, and ride inside a real captured call.
   - **Spike 1** (limit 5, "group related parts"): S1Q09 went over 5 lines on 3.1-lite 2/4 (current) → 2/4 (grouped); on 3.5-lite HIGH 4/4 → 3/4. A prompt sentence cannot hold a line limit; only code can.
   - **Spike 2** (limit 3×5): over-3 was 0/24 on 3.1-lite and 1/24 on 3.5-lite. But every answer FILLED 3 lines, short follow-ups included. The "themes3" wording produced generic labels that restate the question ("Storage, training, and artifacts"). "cap3" kept specific services ("Azure Blob, AML, ACR").
   - **Spike 3** (simple questions): 3.1-lite never scaled down (one-line blocks 0/18 with "cap3", 1/18 with an explicit "one or two words when enough" sentence). 3.5-lite HIGH: 8/18 → 11/18.
   - **Spike 4** ("the first line is the answer itself in the fewest words; add a line only for another part the QUESTION names, never for a point you add"; plus/minus the example `asked "Tabs or spaces?", the whole block is 1| Spaces`), 3.5-lite:
     - Simple: the first line was the direct answer in 1-3 words in every answer ("Boosting", "CPU utilization", "Parquet", "O(log n)", "Batch scoring"). One-line blocks 7/18 with the example.
     - Medium ("Why do Docker layers matter for build times?"): "Layer caching / Instruction ordering".
     - Complex: the cap came LAST in that wording and held worse (over-3 in 5 of 12).
     - A cue came out as raw LaTeX, `"$O(\\log n)$ time complexity"`. Cue lines skip the spoken-notation cleanup; `cleanNotation` in `electron/llm/verbalStreamFilter.ts:522` already handles this for prose.
     - 3.1-lite's free-tier quota was spent that morning, so its spike-4 cells are nearly empty.
   - **Spike 5** (3.5-lite only; the spike-2 cap sentence FIRST, then spike 4's answer-first + example + "only the parts the QUESTION names" + grouping):
     - Complex held: over-3 1/8, S1Q09 services p50 6.
     - Simple questions scaled down LESS than before: one-line 4/24, non-empty blocks of ≤2 words 2/24, lines p50 2, words p50 6. Compare spike 3's cap3-min (one-line 11/18) and spike 4's strict-ex (7/18).
     - The first line was still the direct answer every time ("Boosting", "Not strictly necessary", "CPU utilization", "Parquet", "O(log n) time complexity", "Batch scoring"). The extra lines were points the question did not ask for.
     - Measurement note: spikes 3-4's "<=2 words" column counted EMPTY blocks as short answers. strict-ex's 6/18 includes one empty block, so the real count is 5/18. Spike 6 fixes this.
     - cap3-min's one-liners sometimes bury or omit the direct answer ("Tree models are invariant / … / No normalization needed"; "Scale invariance of tree splits").
   - **Spike 6** (runs at 10:03 when the quota resets; both models; same n; 4 reps): cap3-min vs strict-ex vs one-first. one-first is new: the cap first; answer-first + the example; "A one-part question gets exactly one line"; only the question's parts; grouping.
     - Its selection rule was written BEFORE its calls: `SP\cue-group\SPIKE6-RULE.md`. Read it.
     - It adds an `answer-first` measure: does the first line carry the direct answer? Checked by `check-terms.mjs`.
     - The controller will send you the result and the winner.

## The user's decisions (binding; asked 2026-09-30)
- **Intent:** "cue mode = small and fast responses during the interview".
- **The cue block is at most 3 lines of at most 5 words.** This is a CEILING, not a target: a simple question should get ONE line of one or two words, and only a complex question uses up to 3×5. The user's words: "Sometimes one word is enough … but also we may have complex questions".
- **Many-part questions are GROUPED into themes** so every named part is still covered.
- **Both limits are ENFORCED IN CODE.** A line over 5 words is CUT to its first 5 words, and every cut is logged. More than 3 lines keeps the first 3, also logged.
- **The full spoken answer under the cues stays as today.** No change to its prompt, budget or display.
- **If the re-smoke AND the cue bench both pass, cue mode merges into MAIN on Thursday.** Both run after this change.

## What the delta must decide (and justify from the evidence)
1. **The CUE_RULE wording.** It is a benched input, so it comes from what the spikes measured, not a new untested sentence.
   - The choice is spike 6's winner under `SPIKE6-RULE.md`: a rule stated before the data, not a judgment made after it.
   - Write the spec and the plan NOW with `one-first` as the working wording.
   - Put the wording in ONE delimited bullet, so that a swap touches only that bullet in `prompts.ts` and its test pin.
   - When the controller sends spike 6's winner (about 10:30), set the final text in both files.
   - The three candidates, verbatim (also in `SP\cue-group\make-spike6.mjs`):
     - cap3-min: `- At most 3 lines, each at most 5 words, and only as many words as the answer needs: when one or two words carry the answer, the block is one line of one or two words. One line per part the question names; when it names more than 3 parts, group related parts into themes so every part is still covered in 3 lines. A one-part question gets exactly one line.`
     - strict-ex: `- The first line is the answer itself in the fewest words that carry it: one or two words when that is enough (asked "Tabs or spaces?", the whole block is 1| Spaces). Add a line only for another part the QUESTION names, never for a point you add on your own. At most 3 lines, each at most 5 words; when the question names more than 3 parts, group related parts into themes so every part is still covered in 3 lines.`
     - one-first: `- At most 3 lines, each at most 5 words. The first line is the answer itself in the fewest words that carry it: one or two words when that is enough (asked "Tabs or spaces?", the whole block is 1| Spaces). A one-part question gets exactly one line. Add a line only for another part the QUESTION names, never for a point you add on your own; when it names more than 3 parts, group related parts into themes so every part is still covered in 3 lines.`
   - Each spike replaced ONE rule line inside the captured prompt: `- One line per part the question names. A one-part question gets exactly one line. Never more than 5.`. It also changed the template line `1| <key phrase …, at most 8 words>` to `at most 5 words` (see spike3.mjs OLD_LINE1/NEW_LINE1). The spec must name both edits.
   - The rule must keep the existing lines about specificity and "never address the listener".
   - Constants: `CUE_MAX_LINES` 5 → 3, `CUE_MAX_WORDS` 8 → 5 (`electron/llm/prompts.ts:200-226`; pins in `prompts.test.ts:240-260`).
2. **Where the code cap lives, and what gets logged.**
   - Recommended: the display boundary, `IntelligenceEngine.ts:404-411` `onCues`. The parser (`extractCues` / `stripCueBlock`) stays RAW, so the harness and the bench keep measuring what the MODEL produced.
   - The engine logs the DISPLAYED cues on the existing `[Answer] cues: <json>` line, which the metrics row and the smoke check read, plus ONE new line whenever it trims, naming the raw line count and the cut lines.
   - Decide the exact log format. Decide whether the parser's comment ("never truncated … a bench finding, not a runtime repair") changes.
3. **Notation cleanup on cue lines.** Apply `cleanNotation` (currently module-private) to each displayed cue. Say where, and whether it runs before or after the word cut: it can change the word count.
4. **Harness and metrics.**
   - `electron/test/golden/interview60.metrics.mjs:113-123` holds literal 5/8 with a drift test (`interview60.metrics.test.ts:792-835`) → 3/5.
   - Should the GATE row count trims (e.g. "cue blocks trimmed: n/N")?
   - `answers.mjs` / `run.mjs` read the constants from the build.
   - `SP\check-smoke-cues.mjs` and SP `PREREGISTER-cuebench.md` are scratchpad files the controller updates; list what must change in them. No bench data exists yet, so the bench pre-registration may still change.
5. **Verification.**
   - Tests first: the cap (8 lines → 3; a 7-word line → 5 words; a trim log line; no trim → no line); notation cleanup; the new constants and wording pins.
   - A live exercise: the re-smoke on this branch via the scheduled task, with the smoke check at 3/5.
   - A small simple-question probe (spike-style, invented non-holdout questions) that reports one-line blocks. It is REPORTED, not gating: it measures the user's "one or two words" concern.
   - The cue bench (pre-registered; 3.5-lite HIGH vs s50m captured-high ×3).
6. **What stays out:** the prose answer, the renderer (CueBlock renders whatever strings it gets), the transport grammar (`__CUES__`, `N| phrase`), the coding path (no cue block).

## Deliverables
- `docs/superpowers/specs/2026-09-30-cue-mode-small-cues.md` in the worktree: the delta, in the style of the 09-20 spec. It is short: this is a revision, not a new design.
- `docs/superpowers/plans/2026-09-30-cue-mode-small-cues.md` in the worktree: tasks in the superpowers:writing-plans format, with the header, Global Constraints, exact file:line and exact code per task, TDD steps, and commands.
  - Tests run from a temp cwd: `Set-Location $env:TEMP; cmd /c "npx --prefix ""<WT>"" vitest run --root ""<WT>"" <file>"`.
  - Type-checks: root `npx tsc --noEmit` and `npx tsc -p electron/tsconfig.json --noEmit` (the electron project has 6 pre-existing errors).
  - Commits on feat/whole-turn-answers only: the controller commits after review.
  - Keep it to about 2-3 tasks. Every changed line must trace to the decisions above.

## Rules
- Write only the two output files. Read anything.
- No git writes. Never read `.env` or keys. No subagents. No `node -e`.
- Reply briefly: both file paths, the chosen wording (verbatim), the log format, and anything you could not decide from the evidence.
