### Spec Compliance

**Spec compliant.** Nothing missing, extra or misunderstood in `a7e9a79..efda6cf`.

I reviewed committed blobs only (`git show efda6cf:…`). HEAD moved to `e3fae5f` during the review; the two later commits (`4b051a9`, `e3fae5f`) touch none of these four files.

Worktree root: `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\.claude\worktrees\whole-turn`

**The four files**
- `&lt;root&gt;\electron\llm\prompts.ts`: Step 3 is verbatim. `VERBAL_TYPED_PROMPT` is at 2386–2392, the tail `${SPOKEN_LENGTH_AND_DEPTH}` at 2436, and the derived `VERBAL_WHAT_TO_ANSWER_PROMPT` at 2438–2444. The template body has no hunk.
- `&lt;root&gt;\electron\llm\prompts.test.ts`: the import (16) and the new `describe` (277–284) are verbatim.
- `&lt;root&gt;\electron\ipcHandlers.ts`: only the import (16), the two comment lines plus the plain site (544–546) and the knowledge site (559) changed, which is what the global constraint allows.
- `&lt;root&gt;\electron\ipcHandlers.typedPrompt.test.ts`: new, 28 lines, verbatim.

**F1 to F6**
- **F1** (`prompts.ts:208`): verbatim, and true of the code; the engine passes `CUE_MAX_WORDS`.
- **F2** (`prompts.ts:214–216`): citation swapped and reflowed, wording otherwise unchanged. The cited file exists at `efda6cf`, and no `SPIKE6-RULE` remains in either prompt file.
- **F3** (`prompts.ts:223–228`): verbatim. It matches `IntelligenceEngine.ts:418–423`, where `trimCues` caps and the engine does the logging.
- **F4** (`prompts.test.ts:259`): title updated.
- **F5** (`prompts.test.ts:253–254`): verbatim, directly after the exactly-once assertion (252).
- **F6** (`prompts.ts:194–197`): verbatim, comment only.
- **Commit**: the message is the brief's text plus the additions paragraph and the trailer, verbatim. The commit holds exactly the four named files.

**The three named risks**

1. **Another route to the cue rule or a raw block: none found.**
   - Outside tests and the golden harness, only `WhatToAnswerLLM.ts` imports the hands-free prompt. Its four uses (321, 332, 343, 414) all pass through `stripCueBlock` at 389.
   - `streamVerbalWithGeminiFlash` has three callers: `ipcHandlers.ts:576` (passes `verbalSystemPrompt`) and `WhatToAnswerLLM.ts:330, 412`. Its `systemPrompt` parameter is required and it appends only notes and language.
   - `LLMHelper.ts`, `knowledgePromptBudget.ts` (one comment mention), both `KnowledgeOrchestrator.ts` files and `src/` reference no cue token. `[CUES FIRST]` exists only at `prompts.ts:232`.
   - Every typed input in `src/` goes through `streamGeminiChat`, which is `gemini-chat-stream`. The only `generateWhatToSay` caller passes `undefined` as the question.
   - The manual engine routes (`ipcHandlers.ts:2376, 2400, 2428`) get the rule by design and strip it.

2. **Byte for byte the pre-cue prompt: yes.**
   - `prompts.ts` at `0ef42a0` and at MAIN's tip (`fix/coding-style-suffix-all-gemini`, `e3db5cb`) are the same blob, `2f2b303`, with no cue token in it.
   - `git diff -U0` from that blob to `efda6cf` has three hunks: the 50-line cue block inserted, the first template line renamed to `VERBAL_TYPED_PROMPT` with its comment, and 8 lines inserted after the template.
   - The template interpolates four constants, all declared in the same file with no hunk. The file's only import is a type. No CR bytes in any blob.

3. **The source-text pin can fail: yes, all five assertions.** I ran the committed test file once (vitest 2.1.9, from `%TEMP%`, rooted in my scratchpad) against copies of `ipcHandlers.ts`. The worktree was not touched. Every outcome was predicted before the run.

| Variant of `ipcHandlers.ts` | Passed | Fails at |
|---|---|---|
| `efda6cf` | 2/2 | none |
| `a7e9a79` (base) | 0/2 | :19, :25 |
| knowledge site back to the hands-free prompt | 0/2 | :20, :26 |
| plain site back to the hands-free prompt | 0/2 | :20, :25 |
| sites intact, plus `+= CUE_RULE` | 1/2 | :22 |
| sites intact, plus `+= CUES_SENTINEL` | 1/2 | :22 |
| sites intact, plus `+= '__CUES__'` | 1/2 | :22 |
| hands-free prompt imported `as VERBAL_TYPED_PROMPT` | 1/2 | :19 |

   Totals: 7 of 8 files failed, 10 of 16 tests failed, 6 passed. The implementer's mutants (RED, M1, M2) do cover each assertion, and my line numbers match theirs. The report says "six assertions"; there are five.

**Cannot verify from diff**
- **Test and type-check counts** (49 passed; tsc 6 and 0): not re-run. I see no mechanism for a new type error: the `import.meta` plus `@ts-ignore` idiom has a committed precedent at `electron/test/golden/interview60.metrics.test.ts:10–12` under the same tsconfig.
- **F5's mutant run**: this is the implementer's claim. The restore is verified, since the committed `prompts.ts` hashes to the `D549C29A…4364` the report gives. By inspection the assertion fails when the bullet moves and the exactly-once one still passes.
- **The new `describe` in `prompts.test.ts`**: it was seen red only on a missing export, never on a wrong value. By inspection it would fail if `${CUE_RULE}` were left in the typed template.
- **Process constraints** (Edit tool, temp cwd, no key, app not started): nothing in the commit contradicts them. There is no BOM, `§` and `—` are valid UTF-8, and `git diff --check` is clean.
- **Live**: the typed path has not run in a built app. The controller's check after the build is one typed non-coding question on a Gemini-family model, with knowledge mode off and on, showing no `__CUES__` or `1|` lines. Confirm the `[IPC] gemini-chat-stream intent:` log line appears, because coding intent, images, `skipSystemPrompt` and non-Gemini models bypass the changed lines.
- **"What MAIN ships today"**: verified against MAIN's committed branch tip, not its working tree or built dist.

### Strengths
- The diff is exactly the mandated lines (75 insertions, 18 deletions), with no out-of-scope file touched.
- The hands-free prompt keeps its value by construction, and the typed one is provably MAIN's text.
- The implementer noticed that vitest hides later assertions behind the first failure and closed the gap with two mutants, unprompted.
- All seven SHA-256 values in the report match the committed blobs, so no mutant residue was committed.
- The new and edited comments are true of the code; the token loop at `ipcHandlers.ts:600–615` does forward raw tokens.
- The report's residual-risk list is honest.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)
1. **`electron/ipcHandlers.typedPrompt.test.ts:19–26` (plan-mandated): a failing pin dumps the whole source.**
   - What is wrong: every `expect` takes the whole 3,600-line source, so each failed assertion prints the entire file as "Received". My run produced about 36,000 lines for ten failures, with the expected strings truncated in the summary.
   - Why it matters: the cause is buried when the pin trips.
   - Fix: collect the trimmed lines matching `/VERBAL_\w+_PROMPT|CUE_RULE|CUES_SENTINEL|__CUES__/` and `toEqual` the three expected lines. That is also a tighter pin (exactly three mentions) with a three-line diff.

2. **Same file: the pin does not tie the assignment to the call.**
   - What is wrong: it pins what `verbalSystemPrompt` is assigned, not that it is what gets sent at `ipcHandlers.ts:576`.
   - Why it matters: a wrapper from another module at the call site would pass unnoticed (the report's concern 2).
   - Fix: also pin `streamVerbalWithGeminiFlash(userContent, verbalSystemPrompt,`.

3. **`electron/ipcHandlers.ts:541–546` (plan-mandated placement): two comments read as one.**
   - What is wrong: the two new comment lines sit directly under the older three-line knowledge-mode comment. Five comment lines now sit on one `let`, and the first three describe the `if` two lines below.
   - Fix: a blank line between the two comments.

**Outside this task, for the controller**
- `electron/test/golden/interview60.metrics.mjs:505` still says "every verbal answer opens with a cue block", the wording F6 corrected in `prompts.ts`. It is unchanged at `e3fae5f`. It is true in a flight, so this is optional.
- Pre-existing on MAIN, from source reading only, not observed in a running app: the typed prompt still ends with the rule that asks for a `__MORE__` block (`prompts.ts:280–293`). `stripSuggestionBlock` is used only at `WhatToAnswerLLM.ts:388`, and `src/` has no `__MORE__` handling. A typed verbal answer can therefore show that block raw, the same defect class this task fixes for cues.

Scratch evidence is in `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad\` (`pin-run.txt`, `make-variants.mjs`).

### Assessment
**Task quality:** Approved

**Reasoning:** The commit is the brief and F1–F6 verbatim, the typed prompt is provably MAIN's text, no other route to the cue rule exists in committed code, and the pin fails on every variant that should trip it. What remains is polish on a plan-mandated test and the live typed question the controller already owns.