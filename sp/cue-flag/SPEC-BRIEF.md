# Brief: spec for "cue mode off by default behind an env flag"

You write the SPEC (design + test plan + implementation plan in one document, bounded change). You do not edit code.
Save it to `<SP>/cue-flag/2026-10-02-cue-flag-spec.md` where
SP = `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad`.
MAIN (the repo to change, read-only for you) = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`
(branch fix/coding-style-suffix-all-gemini, HEAD 2178890).

## The decision (made by the user; do not reopen it)

Cue mode shipped ON in MAIN (2b0906f). Its validation hour (h40d, `electron/test/golden/passes/2026-10-02-h40d-result.md`)
FAILED a pre-registered speed rule: the cue rule makes the answer model think +161 tokens per answer (~0.5 s later first
word). The cues' content was never graded and their benefit is unmeasured. The user chose: **an env flag, cue mode OFF
by default** (not a revert). With the flag unset the app must behave exactly as before cue mode; with the flag on, exactly
as shipped in h40d. Nothing else changes.

## Evidence already gathered (verified 2026-10-02 20:00)

- `electron/llm/prompts.ts:2444`: `VERBAL_WHAT_TO_ANSWER_PROMPT = \`${VERBAL_TYPED_PROMPT}${CUE_RULE}\``. `CUE_RULE` at :230,
  `CUES_SENTINEL` at :199. Typed chat (ipcHandlers.ts:547/560) already sends `VERBAL_TYPED_PROMPT`.
- The CURRENT built `VERBAL_TYPED_PROMPT` is byte-identical to the PRE-cue hands-free `VERBAL_WHAT_TO_ANSWER_PROMPT`
  (dist snapshot `<SP>/dist-snapshots/main-precue-73d7f01/dist-electron/electron/llm/prompts.js`): 12784 bytes, sha256/12
  `4495445db0c2` both; calibration: the current cue prompt differs from the pre-cue one first at byte 12784. Script:
  `<SP>/cue-flag/precue-identity.mjs` (reuse it as the byte-identity check).
- App callers of the cue prompt: only `electron/llm/WhatToAnswerLLM.ts` (import :2; call sites :322, :333, :344, :415).
  The stream filter (`electron/llm/verbalStreamFilter.ts`, stripCueBlock ~:423) and WhatToAnswerLLM's `onCues` callback
  (:196–:201, :355–:384) handle a reply's cue block; with no block in the reply they must pass the answer through whole.
- Env flags are read PER CALL in this code base (pattern: `verbalHedgeEnabled()` for `NATIVELY_VERBAL_HEDGE`, used in
  electron/LLMHelper.ts:3396; find its definition). `dotenv` is loaded at `electron/main.ts:6`; a module-load-time read in
  prompts.ts could run before it — check the import order and say why your choice is safe.
- `electron/LLMHelper.ts:2721` recognises the verbal prompt by `carriesSpokenBudget(...)`; the typed prompt carries the
  spoken budget too, so check that the flag-off prompt takes the same LLMHelper path the pre-cue prompt took.
- Golden harness users of the cue prompt / rule (they must keep working and must say which prompt they used):
  `electron/test/golden/interview60.answers.mjs` (:97–:123 `--cues`/strip modes, :303/:337 `expectCues`),
  `interview60.chains.mjs:73`, `interview60.flight.mjs:159` (reads the shipped CUE_RULE header from the hour), `run.mjs:193`,
  `problems.verbal.mjs`, and the smoke check `<SP>/check-smoke-cues.mjs` (scratchpad, cue-shape rows). Probe files
  `openrouter.probe.mjs`, `zai.probe.mjs` are the USER'S untracked files: never touched, but say what they will send.
- Tests that pin the current composition (they will need deliberate updates, not deletion): prompts.test.ts,
  problems.verbal.cues.test.ts, WhatToAnswerLLM.cues.test.ts, WhatToAnswerLLM.hedgeCues.test.ts,
  ipcHandlers.typedPrompt.test.ts, verbalStreamFilter.test.ts, cueArm.test.ts, interview60.flight.test.ts,
  interview60.chains.test.ts, LLMHelper.customNotes.test.ts, LLMHelper.geminiSystemInstruction.test.ts.
  Find every test that imports VERBAL_WHAT_TO_ANSWER_PROMPT or CUE_RULE (83 test-file matches in total) and classify.

## What the spec must decide and state

1. Flag name and semantics (suggest `NATIVELY_CUES`; on only for exactly `'1'`? say what other values do — fail loudly at
   the boundary for an unrecognised value rather than guessing, consistent with how the hedge flag treats values).
2. Where the choice is made (per call vs module load), and what `VERBAL_WHAT_TO_ANSWER_PROMPT` means afterwards
   (keep the name meaning "with cues" and add a selector, or rename) — pick the option with the smallest diff that keeps
   the harness honest: the golden harness's bare arms must send what the APP sends by default.
3. What the app logs at startup or per answer so a flight/smoke log shows which mode ran (one line, no prompt text).
4. The harness: how `interview60.flight.mjs`, the flight's cue rows and `check-smoke-cues.mjs` behave when the hour ran
   with cues off (a "cues off" verdict, not a failure), and how a future cue-on flight sets the flag.
5. TDD test list, each with the production change that would make it fail: flag unset → typed prompt bytes (sha
   `4495445db0c2` pinned against the snapshot or by equality with VERBAL_TYPED_PROMPT); flag `1` → typed + CUE_RULE;
   a reply without a cue block reaches the overlay whole and `onCues` is never called; bad flag value refused.
6. Gates: full vitest from a temp cwd with `--root MAIN` (see memory tooling_vitest_temp_cwd), electron tsc
   (`tsc -p electron/tsconfig.json`: 6 pre-existing errors, must stay 6), renderer tsc 0; rebuild dist; `precue-identity.mjs`
   against the NEW dist; a live smoke via a scheduled task (never started from a Claude session) with the flag unset:
   answers whole, no `__CUES__` in the log, the mode line says off.
7. What is NOT in scope (cue grading, the +161 vs +55 question, any prompt wording change, the side fixes).
8. Residual risks the tests cannot reach.

Constraints for the plan: implementers cannot Write/Edit MAIN paths — they stage files under `<SP>/cue-flag/stage/`
mirroring repo paths, LF only, and the controller copies them in (`node <SP>/copy-to-main.mjs src=rel`) and commits
(`commit-main-paths.ps1`). No new dependencies. Smallest diff. Match the surrounding comment style (long explanatory
comments citing specs/dates are the house style in these files). Keep the spec under ~250 lines.
Return: the spec path and a 5-line summary of your decisions.
