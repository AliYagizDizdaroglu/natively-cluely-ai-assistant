# Task 10: the flight drops its two Groq comparison answer arms

User request (2026-09-26 19:05, verbatim): "remove qwen and gpt oss from the flight".

Reading (controller ruling): these are the two Groq COMPARISON ANSWER ARMS the unattended flight runs
after the hour — `qwen/qwen3.8-27b` and `openai/gpt-oss-120b` in `ANSWER_MODELS`. NOT the app's own
question detector (Groq `openai/gpt-oss-20b`, `NATIVELY_QUESTION_DETECTION_MODEL`): that is part of the
app under test and stays untouched. `interview60.answers.mjs` keeps its Groq support (a manual pass can
still run a `/` id); only the flight stops scheduling them.

## Files (touch only these)

- Modify: `electron/test/golden/interview60.flight.mjs` — line 54 `ANSWER_MODELS` and its comment
  (lines 46–53), plus the file header's step 3 wording that names "the Groq arms" (lines 22–23).
- Modify: `electron/test/golden/interview60.flight.test.ts` — one new test.
- Modify: `electron/test/golden/README.md` — line 161's parenthetical list of "the arms in
  `interview60.flight.mjs`" (it names qwen and gpt-oss, and Gemma 4 31B which was already removed).
  Change only that parenthetical so it lists what the file now schedules; keep the sentence's note that
  an id with a `/` runs on Groq and needs a real `GROQ_API_KEY` (answers.mjs still supports it for manual
  passes). Do NOT touch line 166 or any other README line.
- Do NOT touch: `interview60.pass-record.test.ts` (it reads a HISTORICAL run folder, s50a, whose arms
  really included qwen and gpt-oss — it must keep passing unchanged), any `passes/*.md`, `answers.mjs`,
  anything under `electron/` outside `electron/test/golden/`.

## Steps

1. RED: in `interview60.flight.test.ts`, inside `describe('answersFileFor', …)` or a new
   `describe('ANSWER_MODELS', …)`, add:
   `it('the flight answers with the two Flash Lites only: no Groq comparison arms (user, 2026-09-26)', …)`
   asserting `ANSWER_MODELS` toEqual `['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']` AND that no
   entry contains '/'. Run the file; record the failure text.
2. GREEN: set `export const ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];`
   Rewrite the comment above it to say: the first is the app's answer model, the second the
   stall-fallback model; the Groq comparison arms (qwen/qwen3.8-27b, openai/gpt-oss-120b) were dropped
   from the flight at the user's request on 2026-09-26 — answers.mjs still runs a Groq id by hand; both
   Gemma arms stay absent for the reasons already written there (keep that Gemma paragraph's facts).
   Adjust header step 3 (lines 22–23) so it no longer says "and the Groq arms". Keep the file's comment
   style. Run the file green.
3. Rule-8 calibration: temporarily put `'qwen/qwen3.8-27b'` back into the array, run the flight test
   file, watch the new test fail, restore, run green again. Record both runs.
4. Also run `interview60.pass-record.test.ts` unchanged and record it green (it must not depend on the
   flight's arm list).
5. Dry run: `node "<MAIN>\electron\test\golden\interview60.flight.mjs" arms-dry --dry-run` from the
   PowerShell tool with cwd = MAIN is harmless (it logs every command and executes none; it appends to
   `interview60.run.flight.log`). Run it ONCE and copy into your report the `RUN` lines that invoke
   `interview60.answers.mjs`; confirm none carries `--model qwen/` or `--model openai/`. Report the count
   of answers.mjs RUN lines before (from the file's current dry-run semantics, computed by reasoning: 4
   ANSWER_MODELS + focused arms (0 on holdout40, check the env) + paired arms) and after.
   NOTE: the dry run reads NATIVELY_ROSTER from the environment through roster.mjs; run it with the
   environment as you find it and state which roster the log line `ROSTER` printed.
6. README line 161 edit (Files above).

## Global constraints

- LF-only, UTF-8 without BOM for every repo file; stage under `<SP>\stage\…` if Write/Edit refuse MAIN.
- No commits, no builds, no full suite, no app start, no model/API calls.
- Report to `<SP>\sdd\2026-09-26-h40c\task-10-report.md` per the implementer contract.

## Standard commands

Per-file vitest from `<SP>\vitest-cwd-task10` (create it):
`& node "<MAIN>\node_modules\vitest\vitest.mjs" run --root "<MAIN>" --config "<MAIN>\vitest.config.ts" electron/test/golden/interview60.flight.test.ts`
