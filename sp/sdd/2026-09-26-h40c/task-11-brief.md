# Task 11: four gaps the final whole-change review found (07a0e5e..e94305a)

Source: `SP\sdd\2026-09-26-h40c\final-review.md` (Opus; NOT READY only because the hedge has not run
live — that is the smoke's job, not yours). The controller accepted these four Minor findings for
fixing now, before the live smoke runs, so the smoke exercises the final build. Read each finding's
text in final-review.md first; the values below are binding.

## A. M1 — the hedge's empty-leg branches have no test (`electron/LLMHelper.verbalHedge.test.ts`)

`LLMHelper.streamGeminiWithHedge` (electron/LLMHelper.ts ~3470-3541) maps a leg whose stream ends with
no token to `empty`. Two behaviours have no test (the reviewer's two mutations survived all 31 tests):
- front yields NOTHING (a `[]` step), back yields tokens: the back is started with
  `reason=front-empty`, the back wins, the winner's log line reads `other=empty`;
- BOTH legs yield nothing: the generator ends WITHOUT throwing (draining it resolves to no tokens),
  and the warn line reads `no answer - front empty, back empty`.
Add one test per behaviour, in the file's existing style and fakes. These are tests of existing,
correct behaviour, so they pass at once; prove them instead by mutation (rule 8), on the real source,
restoring after each: (1) change the both-empty `return;` into a `throw` → the both-empty test must
fail; (2) make an empty front NOT start the back leg → the front-empty test must fail. Record both
failing runs and the restored green run.

## B. M2 — environment hygiene in two more test files

With `NATIVELY_VERBAL_HEDGE=1` in the shell, 5 tests fail: `electron/LLMHelper.geminiThinking.test.ts`
(tests near lines 60, 76, 88) and `electron/LLMHelper.verbalPrimary.test.ts` (near 66, 107). Add the
same save / delete-in-beforeEach / restore-in-afterEach the other hedge-adjacent test files already
use (look at `electron/LLMHelper.stallFallback.test.ts` for the pattern) for `NATIVELY_VERBAL_HEDGE`
and `NATIVELY_VERBAL_HEDGE_TRIGGER_MS`. Prove it: run both files with `$env:NATIVELY_VERBAL_HEDGE='1'`
set in the PowerShell process BEFORE the change (record the 5 failures) and AFTER (green), then clear
the variable (`Remove-Item Env:NATIVELY_VERBAL_HEDGE`).

## C. M4 — NATIVELY_FOLLOWUP_PARENT is validated only at answer time

Today a junk value (anything but unset, '', '0', '1') throws inside every hands-free answer,
mid-interview. The hedge flag is validated at startup (`describeVerbalHedgeAtStartup` in
`electron/llm/verbalHedge.ts`, called in `electron/main.ts`'s early try/catch after the log reset,
which on a throw does `console.error` + `app.exit(1)` and logs `[Main] <message> — refusing to start`).
Do the same for the follow-up flag:
1. RED: in the follow-up flag's existing test file (find it next to `electron/llm/followUpParent.ts`),
   test a new export `describeFollowUpParentAtStartup(env)`: returns `'follow-up parent: on'` for '1',
   `'follow-up parent: off'` for unset / '' / '0', throws the same message `followUpParentEnabled`
   throws for a junk value (e.g. 'yes'). Run, record the failure.
2. GREEN: implement it in `followUpParent.ts` on top of `followUpParentEnabled`.
3. `main.ts`: in the SAME early try block that calls `describeVerbalHedgeAtStartup`, call
   `describeFollowUpParentAtStartup(process.env)` and log `[Main] ` + its result with the same logger
   the hedge line uses, so a startup shows both lines; a throw takes the existing refusal path
   unchanged. Read the block first; keep its style. main.ts has no unit tests — say so in the report;
   the controller proves the line live in the smoke.
4. Rule-8: break the helper (e.g. treat 'yes' as off) → the junk-value test fails; restore.

## D. M6 — the pass record misnames the in-app model under the hedge

`electron/test/golden/interview60.pass-record.mjs` (~line 78 reads `answerModel` from "Default Model
set to"; ~171 renders it). Under `NATIVELY_VERBAL_HEDGE=1` most answers come from 3.5-lite, and the
record says nothing about the flag. Change, minimally:
- read the app's startup line `[Main] verbal hedge: on trigger=<n>ms` or `[Main] verbal hedge: off`
  (exact text: `electron/llm/verbalHedge.ts` describe function) from the run folder's debug log the
  record already reads;
- store it in the record's meta (`verbalHedge: 'on trigger=5000ms' | 'off' | null` — null when the line
  is absent, i.e. every run before da28f25);
- render ONE extra meta line ONLY when it is not null, e.g. `- Verbal hedge: on trigger=5000ms
  (3.5-flash-lite front, 3.1-flash-lite back; answers name their model in the won-by lines)`; and when
  it is `on…`, the in-app answer-model text must not claim 3.1-flash-lite alone (render
  `hedge (gemini-3.5-flash-lite front, gemini-3.1-flash-lite back)`).
- HARD CONSTRAINT: every existing run folder (no startup line) must render byte-identically, and the
  INDEX row format must not change for them. Test: a fixture WITHOUT the line renders exactly as
  before (no new line), a fixture with `off` renders the off line, a fixture with `on trigger=5000ms`
  renders the hedge label. Put the tests in `interview60.pass-record.test.ts` beside the existing
  synthetic-pass tests (the s50a block reads a real folder — leave it unchanged; it must still pass,
  so run it from MAIN's cwd as the full suite does, or with the s50a folder copied into your scratch
  cwd as the Task 10 implementer did).
- Rule-8: remove the null guard (render the line always) → the no-line fixture test fails; restore.

## Files (touch only these)
`electron/LLMHelper.verbalHedge.test.ts`, `electron/LLMHelper.geminiThinking.test.ts`,
`electron/LLMHelper.verbalPrimary.test.ts`, `electron/llm/followUpParent.ts` and its test file,
`electron/main.ts` (the early startup block only), `electron/test/golden/interview60.pass-record.mjs`,
`electron/test/golden/interview60.pass-record.test.ts`.

## Global constraints
- Implementer contract: `SP\sdd\2026-09-26-h40c\implementer-contract.md` (binding).
- MAIN HEAD 391f1fc; nobody else edits MAIN during this task. No commits, no build, no full suite, no
  app start, no model/API calls. LF-only, UTF-8 without BOM.
- Run every test file you touch green at the end, plus `electron/llm/verbalHedge.test.ts` (or
  whichever file tests describeVerbalHedgeAtStartup) and `tsc -p electron/tsconfig.json --noEmit`
  (must still show exactly the 6 pre-existing errors: GeminiLiveRouter.ts:125; ipcHandlers.ts:3433 x2,
  3436; KnowledgeOrchestrator.ts:349, 351) and root `tsc --noEmit` (0).
- Report to `SP\sdd\2026-09-26-h40c\task-11-report.md`.
