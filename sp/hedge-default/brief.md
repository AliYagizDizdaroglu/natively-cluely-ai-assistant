# Task: make the verbal hedge the shipped default (bounded change; the user approved it 2026-09-29 ~18:15)

## Why
The verbal hedge (`electron/llm/verbalHedge.ts`, `LLMHelper.streamGeminiWithHedge`) is built and flew on
2026-09-29 as flight h40c (holdout40, `NATIVELY_VERBAL_HEDGE=1`): first token median 4.1 s, p90 6.5 s,
0 failures, 35/45 acceptable — PASS on all three rules of `electron/test/golden/passes/PREREGISTER-h40c.md`,
result `passes/2026-09-29-h40c-result.md` (commit e78f7c7). That pass licenses exactly ONE change: a
separate reviewed commit that makes the hedge the default. Today it runs only when a launcher sets the
env var; a normal launch still gets the previous policy (3.1-flash-lite LOW first, 3.5-flash-lite raced in
at 10 s — the stall race).

## The change (nothing else)
1. `electron/llm/verbalHedge.ts`, `verbalHedgeEnabled`:
   - unset or empty -> **true** (was false); `'1'` -> true; `'0'` -> false (the explicit opt-out back to the
     stall race); anything else -> throw, naming the variable and the value (same shape as today; reword
     the message so it lists the accepted values correctly: "1" or unset for on, "0" for off).
   - Update the header comment: the hedge is the shipped default since h40c (2026-09-29, the numbers above,
     licensed by PREREGISTER-h40c.md); `NATIVELY_VERBAL_HEDGE=0` restores the previous stall race.
   - Update every comment in this file that the flip makes wrong. In particular the one above
     `describeVerbalHedgeAtStartup` says a junk `NATIVELY_VERBAL_HEDGE_TRIGGER_MS` "changed nothing while
     the flag was unset ... and must still change nothing — an unset flag is exactly today's behaviour".
     After the flip the trigger IS read when the flag is unset (the hedge is on), so a junk trigger now
     refuses at startup unless `NATIVELY_VERBAL_HEDGE=0`. That is intended (a typo must not fly silently);
     say so in the comment. `DEFAULT_HEDGE_TRIGGER_MS` stays 5000.
2. Tests, test-first (write/adjust the expectations, watch them FAIL on today's code, then flip):
   - `electron/llm/verbalHedge.test.ts`: `verbalHedgeEnabled({})` -> true; `({ NATIVELY_VERBAL_HEDGE: '' })`
     -> true; `'0'` -> false; `'1'` -> true; `'yes'`/`'true'` -> throws naming the variable.
     `describeVerbalHedgeAtStartup({})` -> `'[Main] verbal hedge: on trigger=5000ms'`;
     `({ NATIVELY_VERBAL_HEDGE: '0' })` -> `'[Main] verbal hedge: off'`;
     `({ NATIVELY_VERBAL_HEDGE_TRIGGER_MS: 'not-a-number' })` (flag unset) -> throws naming the trigger
     variable; `({ NATIVELY_VERBAL_HEDGE: '0', NATIVELY_VERBAL_HEDGE_TRIGGER_MS: 'not-a-number' })` -> the
     `off` line (the trigger is not read when off). Update the file's header comment ("default-off flag").
   - `electron/LLMHelper.verbalHedge.test.ts`: the two "default-off pin" tests (around lines 393 and 413)
     become the default-ON pin: with the variable UNSET, the technical answer path takes the hedge (front
     gemini-3.5-flash-lite, the same observable the file's other hedge tests use); and `'0'` behaves exactly
     like the previous stall-race policy and logs no hedge line. Keep the invalid-value test.
   - These test files delete `NATIVELY_VERBAL_HEDGE` in their setup to pin the NON-hedge policy; after the
     flip "deleted" means the hedge, so each must set it to `'0'` instead (keep the save/restore; update the
     comment that explains why): `electron/LLMHelper.emptyStream.test.ts` (~56-67),
     `electron/LLMHelper.geminiThinking.test.ts` (~52-66), `electron/LLMHelper.abortOnClose.test.ts`
     (~120-133 and ~295-307), `electron/LLMHelper.stallFallback.test.ts` (~62-77),
     `electron/llm/WhatToAnswerLLM.answeringModel.test.ts` (~110-126; the block at ~261-285 already sets
     '1' — leave it), `electron/LLMHelper.verbalPrimary.test.ts` (~51-71). Find any other test that relies on
     "unset = off" with a grep for `NATIVELY_VERBAL_HEDGE` under `electron/` (not `electron/test/golden/`);
     treat it the same way and list it in the report.
3. Not in scope, do not touch: `electron/test/golden/*` (the flight harness reads the app's startup log
   line, `interview60.pass-record.mjs:56`, so it stays correct); `electron/main.ts` (it only logs the
   describe line); anything in `electron/audio/` (another task's uncommitted work is there — do not read
   it into your change, and do not revert it); any model, prompt or trigger value.

## TDD evidence required
- RED 1: the new/changed expectations in `verbalHedge.test.ts` and `LLMHelper.verbalHedge.test.ts` fail on
  today's code (quote the failing test names).
- GREEN 1: after the flip they pass.
- RED 2: the non-hedge test files above FAIL after the flip while they still delete the variable (quote
  which), then pass once they set `'0'`. (If one does not fail, say so: it did not depend on the default,
  and it still gets `'0'` only if its comment says it pins the non-hedge path.)
- Final: every changed test file passes; then the `electron/llm/` folder and every `electron/LLMHelper`
  test file (vitest substring `electron/LLMHelper`) pass; both tsc gates.

## Commands
Tests (from a temp cwd, never from the repo; never the full suite). PowerShell form (the Bash compound
form was refused in this environment):
`Set-Location $env:TEMP; cmd /c "npx --prefix ""C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant"" vitest run --root ""C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant"" <file-or-substring>"`
tsc (same cmd /c wrapping):
`npx --prefix "<MAIN>" tsc --noEmit -p "<MAIN>/tsconfig.json"` -> no output, exit 0;
`npx --prefix "<MAIN>" tsc --noEmit -p "<MAIN>/electron/tsconfig.json"` -> exactly the 6 baseline errors
(GeminiLiveRouter.ts TS2339 'length' on 'never'; ipcHandlers.ts x3 TS2339 canceled/filePaths;
KnowledgeOrchestrator.ts x2 TS2322). An error in `electron/audio/*` is the other task's — report it, do not fix.

## How to write into MAIN (the session's Write/Edit tools refuse MAIN paths)
MAIN = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`, branch fix/coding-style-suffix-all-gemini,
HEAD e78f7c7. For each file: copy MAIN's file to the stage folder
`<SP>\hedge-default\stage\<same relative path>` (Read it, Write the copy, or a small node copy script), edit
the staged copy, then copy it back byte-exact:
`node "<SP>/copy-into-main.mjs" "<staged file>" "<MAIN-relative path>" --overwrite`
(SP = C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad;
the helper refuses CR bytes and prints both sha256s.) LF only. No git at all (no commit/add/stash): the
controller commits. Never read `.env` or any key. No `node -e`, no `bash <script>` (the guard refuses them).
Style: 4-space indent, single quotes, semicolons, comments that state the measured reason, as in the files.
