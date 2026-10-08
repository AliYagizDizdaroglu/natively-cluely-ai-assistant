SPEC: PASS / QUALITY: APPROVED

# Task 10 review: the flight drops its two Groq comparison answer arms

Reviewer: Opus 5.5, 2026-09-26 ~19:35 local. Read-only review. I edited nothing in MAIN, committed
nothing, started nothing and called no model API. Scratch artefacts: `<SP>\review10-*.mjs`,
`<SP>\review10-mydiff*.diff` and `<SP>\vitest-cwd-review10\`.

Counts: Critical 0, Important 0, Minor 5.

## Verdict in one paragraph

The change does exactly what the brief asks, in exactly the three files. `ANSWER_MODELS` is
`['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']`. The comment above it and header step 3 were
rewritten as instructed, and the Gemma facts are word-for-word the same as at HEAD. The new test is
the brief's test verbatim. Only the parenthetical on README line 161 changed. The pass-record test
is untouched. The user's request, "remove qwen and gpt oss from the flight", is met: every `--model`
id the flight can now schedule is one of six Gemini ids, and none contains "/". Two arms break nothing
downstream (pass record, INDEX, judge exports, report, gate). The one-time dry run shows 11
answers.mjs RUN lines and none of them is qwen or openai. None of the findings below blocks the
commit. Three of them should be corrected in the record or handled as an ops step: M2, M3 and M4.

## What I verified, and how

- **The diff is the working tree.** I ran `git diff -U10` on the three files in MAIN and compared it
  with `git diff --no-index` against `review-task10.diff`. They are identical. HEAD is still 18242df
  and nothing was committed.
- **Encoding** (`<SP>\review10-bytes.mjs`): all three files have no BOM, no CR, no U+FFFD and end
  with LF. The em dash at flight.mjs:48 and README.md:161 is a real U+2014.
- **Tests, run by me from a scratch cwd** (`<SP>\vitest-cwd-review10`, `--root MAIN`):
  `interview60.flight.test.ts` plus `interview60.pass-record.test.ts` gave `Test Files 2 passed (2) /
  Tests 38 passed (38)`, with **0 skipped**. That includes the four s50a tests (see M2).
- **Calibration of the new test's assertions, without editing MAIN**
  (`<SP>\review10-calibrate-assertions.mjs`). vitest's own `expect` will not load outside its runner,
  so I built it the way vitest does: chai 5.3.3 plus @vitest/expect 2.1.9 from MAIN's node_modules.
  I then ran the test's exact expressions:
  - MAIN's `ANSWER_MODELS` as built now, and the two lites: PASS.
  - The HEAD four: FAIL with `expected [ 'gemini-3.1-flash-lite', …(3) ] to deeply equal [ 'gemini-3.1-flash-lite', …(1) ]`.
    This is the same text as the report's RED run.
  - The two lites plus `qwen/qwen3.8-27b`: FAIL with `…(2) … to deeply equal …(1)`, the same text as
    the report's break run.
  - 3.5 replaced by `openai/gpt-oss-120b`: FAIL.
  - The two lites reordered: FAIL.

  The implementer's calibration claim holds.
- **Dry-run evidence, checked against the log itself.** `interview60.run.flight.log` holds exactly
  one `arms-dry` run (lines 13848–13882).
  - The answers.mjs RUN lines are 13857–13867: 11 of them, none carrying `qwen/` or `openai/`.
  - There are 12 `judge --export` lines.
  - No `*-arms-dry` run folder exists on disk.
  - `ROSTER interview60  79 items` printed because NATIVELY_ROSTER was unset. The real launcher sets
    `NATIVELY_ROSTER=holdout40` (launch-h40c.cmd:27). `focusedOnlyFor` is null for both rosters
    (flight.test.ts:86–87), so the count of 11 carries over to h40c.
  - h40b's `interview60.flight.done.json` lists 13 `answersFiles`, which corroborates the "before"
    count of 13.
- **The rewritten comments are true.**
  - LLMHelper.ts:39 `GEMINI_FLASH_MODEL = "gemini-3.1-flash-lite"` makes the first entry the app's
    answer model.
  - LLMHelper.ts:47 `GEMINI_FLASH_FALLBACK_MODEL = "gemini-3.5-flash-lite"` makes the second the
    stall-fallback model. See M5 for the h40c nuance.
  - answers.mjs:46 `IS_GROQ = MODEL.includes('/')` confirms that an id containing "/" runs on Groq.
  - answers.mjs:205–209 exits 3 on HTTP 401/403, which confirms that the placeholder key exits 3.
  - The Gemma paragraph is unchanged.

## Does anything else in the harness still expect four arms or a Groq arm? No.

- `ANSWER_MODELS` is imported only by `interview60.flight.test.ts`. Nothing in `electron/` imports
  `interview60.flight.mjs` except that test.
- Nothing indexes `ANSWER_MODELS[2]` or `[3]`. The only indexes are `[0]` (flight.mjs:141–145, 197)
  and `[1]` (flight.mjs:146–152), plus the tests.
- **Pass record and INDEX.** pass-record.mjs:111 takes the arms from the answers files that are
  actually in the run folder, not from `ANSWER_MODELS`. The INDEX renders them as a free-form list
  (pass-record.mjs:231). With two arms, the record simply lists 2 + up to 9 paired arms.
- **Judge.** judge.mjs:321–323 names each export after the answers file's own `model` field.
- **Metrics, run and report.**
  - metrics.mjs:25 and run.mjs:46 read only the plain `interview60.answers.json`.
  - auto's snapshot copies only named files and stale-checks the plain answers file
    (run.mjs:566–572).
  - report-html.mjs:67 keeps its own, already stale `ARMS = [3.1, 3.5, gemma-4-31b-it]`. It renders
    only the files that exist, so it is unaffected.
- **`toGrade` (flight.mjs:322) gets better, not worse.** h40b's done.json listed
  `interview60.judge.pairs.qwen/qwen3.8-27b.json` and `…openai/gpt-oss-120b.json`. Those files never
  exist: judge.mjs:323 writes `qwen_qwen3.8-27b`, because line 322 never replaced "/" with "_". The
  bug is now unreachable, because the new test pins `ANSWER_MODELS` and `PAIRED_ARMS` draws its
  models from it. `toGrade` now lists 12 names, and all of them match the judge's exports.
- **h40c launcher and guard scripts** (`<SP>\launch-h40c*.cmd`, `guard-h40c*.mjs`,
  `register-h40c.ps1`, `h40c-*.mjs`). None of them references qwen, gpt-oss, `GROQ_API_KEY`,
  `ANSWER_MODELS` or an arm count.

## Findings

### Critical

None.

### Important

None.

### Minor

**M1. The "/" assertion can never fail, and the guard covers `ANSWER_MODELS` only.**
Location: `electron/test/golden/interview60.flight.test.ts:105-107`.

- `toEqual` on the two exact Gemini ids already implies that no entry contains "/". The loop runs
  only after `toEqual` passes, so it can never be the assertion that fails. The calibration confirms
  this: the "/" clause alone FAILs on the array with qwen added, but inside the whole test it is
  shadowed.
- The title says "the flight answers with the two Flash Lites only". The flight also schedules
  `FOCUSED_MODELS` (flight.mjs:103) with `--model` on scenario50, and no test guards that list
  against a "/" id. `PAIRED_ARMS` is covered transitively by the existing test at
  flight.test.ts:122.
- **Failure scenario:** someone adds `'qwen/qwen3.8-27b'` to `FOCUSED_MODELS` for a focused
  comparison. All 17 flight tests stay green, and the next scenario50 flight schedules
  `--model qwen/qwen3.8-27b --only …`. The user's removal is undone and nothing flags it.
- **Optional, not required by the brief** (the brief dictated this exact test): apply the "/" check
  to every id the flight can schedule,
  `[...ANSWER_MODELS, ...FOCUSED_MODELS, ...PAIRED_ARMS.map((a) => a.model)]`.
  Today that list is six Gemini ids and none contains "/".

**M2. The report's explanation of the pass-record skips is false, and the brief's s50a check never
ran.** Location: `task-10-report.md`, step 4 ("that run folder is git-ignored and absent in this
checkout"), repeated in `progress.md:41` ("pass-record test 17 pass/4 skip unchanged").

- `electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a/` **exists in MAIN**, with its
  `interview60.judge.json`.
- The block skipped for a different reason. `interview60.pass-record.test.ts:13` resolves `S50A`
  against `process.cwd()`, and the implementer ran vitest from `<SP>\vitest-cwd-task10`, where that
  path does not exist.
- So the four skipped tests are exactly the ones the brief singled out ("must keep passing
  unchanged"). They are the only ones that read the real qwen/gpt-oss arms (pass-record.test.ts:221,
  233), and they never ran.
- **I closed the gap.** I copied the s50a folder read-only into `<SP>\vitest-cwd-review10\…` (38
  files, 3.3 MB) and ran from there: 38 passed, 0 skipped.
- The implementer's static argument was right: pass-record's import graph never touches
  flight.mjs. No code change is needed.
- **Failure scenario:** "4 skipped, folder absent" is copied into the pass record or into memory as
  settled fact. A later task then relies on the s50a block having guarded this change, when it never
  ran. Correct progress.md:41.

**M3. The flight no longer moves the h40b Groq answers aside, and a manual Groq pass will resume
from them.** Location: `electron/test/golden/interview60.flight.mjs:276`, where the move-aside list
is built from `ANSWER_MODELS`.

- Two git-ignored files from h40b sit in the golden folder:
  - `interview60.answers.qwen_qwen3.8-27b.json` (2026-09-26 15:04)
  - `interview60.answers.openai_gpt-oss-120b.json` (15:18)

  After this change nothing moves them aside again.
- **The flight itself is unaffected.**
  - It copies only the arms it ran.
  - auto's snapshot copies only the plain answers file (run.mjs:566–572).
  - The pass record reads only the run folder (pass-record.mjs:111).
- **The manual path is affected.** The new comment (flight.mjs:48) and README.md:161 both advertise
  a manual Groq pass, and that pass resumes from these files:
  - answers.mjs:248 loads the existing file.
  - The roster check at answers.mjs:255–261 passes on holdout40.
  - answers.mjs:284 skips every item that already has `spoken`.
- **Failure scenario:** a manual `--model qwen/qwen3.8-27b` pass on holdout40 re-reports the
  2026-09-26 answers and TTFTs as new. That is the "resuming from yesterday's answers" failure the
  header describes (flight.mjs:26–28).
- **Fix, an ops step rather than code:** rename those two files aside once, following the flight's
  own `.stale-<stamp>.json` convention.

**M4. Stale arm counts remain next to the edited text.** All of them already existed at HEAD, and the
brief confined the edit.

- `interview60.flight.mjs:3-4` says "then the three-arm answer passes". The flight now runs two full
  arms plus up to 9 paired arms.
- `interview60.flight.mjs:23-24` says "the same 52 questions … the two PAIRED_ARMS". h40c flies
  holdout40 (45 items), and `PAIRED_ARMS` has 9 entries.
- `README.md:166` says "the three answer arms". The implementer flagged this one.
- `README.md:247-249` says "lists the four pairs files to grade (the hour's own answers and the
  three arms) … the three `interview60.judge.<model>.json` files". The implementer did not flag this
  one.
- **Failure scenario:** an operator grading h40c by the README expects 4 pairs files, but done.json's
  `toGrade` will list 12.
- **Recommendation:** a follow-up doc-only task. It cannot go in this one, because the brief forbade
  other README lines.

**M5. "The second the stall-fallback model" is right for the default build but incomplete for h40c.**
Location: `electron/test/golden/interview60.flight.mjs:46`.

- The statement is true of the default build (LLMHelper.ts:47).
- h40c flies with `NATIVELY_VERBAL_HEDGE=1` (launch-h40c.cmd:31). Under that flag 3.5 Flash Lite is
  the hedge's **front** leg: LLMHelper.ts:3475 sets `FRONT = GEMINI_FLASH_FALLBACK_MODEL`.
- The brief dictated this wording, the `PAIRED_ARMS` comment (flight.mjs:129) says the same, and no
  behaviour depends on it.
- **Failure scenario:** a reader of h40c's arms treats the 3.5 arm as a rarely used fallback, when in
  that flight it is the model that answers first.
- **Optional wording:** "the stall-fallback model (the hedge's front leg under
  NATIVELY_VERBAL_HEDGE=1)".
- **Nit, with no failure scenario:** README.md:161 introduces the README's only file name without
  backticks, a bare `answers.mjs`.

## Notes for the controller (not findings)

- **Commit hygiene.** MAIN's working tree also carries changes that are **not** Task 10 and all
  predate it:
  - `electron/test/golden/interview60.chains.json` (16:24)
  - `electron/test/golden/interview60.report.md` (14:39)
  - `natively_debug.log.1` (09-24)
  - untracked `openrouter*`/`zai*` probes, `resume_prompt.txt` and `retry_claude_print.bat`

  The Task 10 commit must stage exactly `README.md`, `interview60.flight.mjs` and
  `interview60.flight.test.ts`, using a temp `GIT_INDEX_FILE` per the shared-index practice.
- **Tell the user plainly.** During the hour the flight still runs the app's own question detector,
  `openai/gpt-oss-20b` (IntelligenceManager.ts:83, GroqDetectionClient.ts:66), under ruling R-arms.
  The user said "gpt oss", so they should get the chance to object if they meant that too.
