# Task 10 report: the flight drops its two Groq comparison answer arms

Status: DONE

## Files changed (all in MAIN = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`)

- `electron/test/golden/interview60.flight.mjs` — `ANSWER_MODELS` now `['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']`; its comment rewritten; header step 3 (lines 22-23) no longer names "the Groq arms".
- `electron/test/golden/interview60.flight.test.ts` — new `describe('ANSWER_MODELS', …)` block with one test.
- `electron/test/golden/README.md` — line 161's parenthetical rewritten to list what the file now schedules.
- Not touched (confirmed by `git status --porcelain` after the change): `interview60.pass-record.test.ts`, `answers.mjs`, anything else under `electron/`.

Mechanism: this session is isolated to a worktree, so the `Edit` tool refused direct writes to the MAIN paths ("Edit the worktree copy of this file instead of the shared-checkout path"). Per the implementer contract's fallback, every MAIN edit was made by writing a Node `.mjs` script to the scratchpad that does an exact-substring `String.replace` (with a not-found guard that exits non-zero) against the MAIN file, run with plain `node <path>`, writing back with `fs.writeFileSync(path, text, 'utf8')` (no BOM) after normalizing any `\r\n` to `\n`. Scripts used: `task10-patch-flight-mjs.mjs`, `task10-calibration-break.mjs` / `task10-calibration-restore.mjs`, `task10-patch-readme.mjs`, `task10-fix-emdash.mjs` (all in `<SP>`). `interview60.flight.test.ts` was staged in full under `<SP>\stage\electron\test\golden\interview60.flight.test.ts` and copied to MAIN with the PowerShell `WriteAllText` one-liner from the contract. All three edited files verified after the fact: BOM=False, CR=False (LF-only) for all three.

## TDD

### RED (step 1)

Added to `interview60.flight.test.ts`:
```ts
describe('ANSWER_MODELS', () => {
    it('the flight answers with the two Flash Lites only: no Groq comparison arms (user, 2026-09-26)', () => {
        expect(ANSWER_MODELS).toEqual(['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']);
        for (const m of ANSWER_MODELS) expect(m, m).not.toContain('/');
    });
});
```
Run (`interview60.flight.test.ts` alone) against the untouched `ANSWER_MODELS` (still 4 entries) — failure text:
```
 ❯ electron/test/golden/interview60.flight.test.ts (17 tests | 1 failed) 47ms
   × ANSWER_MODELS > the flight answers with the two Flash Lites only: no Groq comparison arms (user, 2026-09-26) 20ms
     → expected [ 'gemini-3.1-flash-lite', …(3) ] to deeply equal [ 'gemini-3.1-flash-lite', …(1) ]
AssertionError: expected [ 'gemini-3.1-flash-lite', …(3) ] to deeply equal [ 'gemini-3.1-flash-lite', …(1) ]
- Expected
+ Received
  Array [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
+   "qwen/qwen3.8-27b",
+   "openai/gpt-oss-120b",
  ]
 Test Files  1 failed (1)
      Tests  1 failed | 16 passed (17)
```

### GREEN (step 2)

Set `ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']` and rewrote the comment above it (first = app's answer model, second = stall-fallback model; names the two dropped Groq arms and the 2026-09-26 user request; notes `answers.mjs` still runs a Groq id by hand; kept the Gemma paragraph's facts verbatim). Adjusted header step 3 to drop "and the Groq arms". Run:
```
 ✓ electron/test/golden/interview60.flight.test.ts (17 tests) 16ms
 Test Files  1 passed (1)
      Tests  17 passed (17)
```

### Rule-8 calibration (step 3)

Break: temporarily replaced `ANSWER_MODELS = [...]` (2 entries) with a 3-entry array with `'qwen/qwen3.8-27b'` appended back in, via `task10-calibration-break.mjs`. Run:
```
 ❯ electron/test/golden/interview60.flight.test.ts (17 tests | 1 failed) 26ms
   × ANSWER_MODELS > the flight answers with the two Flash Lites only: no Groq comparison arms (user, 2026-09-26) 10ms
     → expected [ 'gemini-3.1-flash-lite', …(2) ] to deeply equal [ 'gemini-3.1-flash-lite', …(1) ]
  Array [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
+   "qwen/qwen3.8-27b",
  ]
 Test Files  1 failed (1)
      Tests  1 failed | 16 passed (17)
```
Only the new test failed; the other 16 stayed green, confirming the test is isolated to the field it checks. Restored via `task10-calibration-restore.mjs`. Run:
```
 ✓ electron/test/golden/interview60.flight.test.ts (17 tests) 19ms
 Test Files  1 passed (1)
      Tests  17 passed (17)
```

### interview60.pass-record.test.ts, unchanged (step 4)

Run alone: `✓ interview60.pass-record.test.ts (21 tests | 4 skipped)` — `Tests 17 passed | 4 skipped (21)`. Also ran combined with `interview60.flight.test.ts` as a final check: both green together, `Tests 34 passed | 4 skipped (38)`.

**Correction (fix round 1, M2): the sentence that was here was wrong.** It said the 4 skips were because the s50a run folder "is git-ignored and absent in this checkout" — false. `electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a/` **exists in MAIN** (38 files, 3,496,881 bytes, confirmed by `Get-ChildItem -Recurse` on the real path). `interview60.pass-record.test.ts:13` resolves `S50A` with `path.resolve(process.cwd(), 'electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a')`, and I ran vitest from `<SP>\vitest-cwd-task10` per the implementer contract's prescribed cwd — `--root MAIN` points vitest's config/module resolution at MAIN, but it does not change the running process's actual `process.cwd()`, which stayed the scratch directory. So the relative path resolved against the scratch cwd, found nothing there, and the block's `describe.skipIf` correctly (from its own perspective) skipped. The static claim — that this file's import graph never touches `interview60.flight.mjs` or `ANSWER_MODELS`, so the change couldn't have broken it — was and is correct; only the *reason given for the skip* was wrong. See "Fix round 1" below for the corrected run (s50a copied into the scratch cwd, 0 skipped).

### Dry run (step 5)

Ran once, from PowerShell, cwd = MAIN:
```
node "electron\test\golden\interview60.flight.mjs" arms-dry --dry-run
```
`ROSTER` line printed: `ROSTER interview60  79 items` — env had `NATIVELY_ROSTER` unset (confirmed empty before running), so `roster.mjs` defaulted to `interview60`. (Side note, out of scope for this task: the README describes interview60 as "55 items (52 spoken, 3 screenshot cues)", but the live `ROSTER` line says 79 — that mismatch pre-dates this change and isn't touched by it; flagging it as an observation below, not fixing it.)

`FOCUSED` line: `FOCUSED  roster interview60 has no focused five — skipping the 4 focused arms` — `focusedOnlyFor('interview60')` is `null` (matches the existing, already-passing `focusedOnlyFor` test), so 0 focused-arm `answers.mjs` calls, same as it would be on `holdout40`.

`answers.mjs` RUN-line count:
- **Before** (reasoning from the file's dry-run semantics, not re-run against the old code): 4 `ANSWER_MODELS` + 0 focused (roster `interview60` has no focused five) + 9 `PAIRED_ARMS` (all 9 tags run in dry mode, since `dry` short-circuits both `focusedCaptured` and the `capturedIds.length` gate to `true` regardless of roster) = **13**.
- **After** (observed in this dry run's log): 2 `ANSWER_MODELS` + 0 focused + 9 `PAIRED_ARMS` = **11**.

All 11 `interview60.answers.mjs` RUN lines from this dry run, in order:
```
RUN   node electron\test\golden\interview60.answers.mjs --model gemini-3.1-flash-lite
RUN   node electron\test\golden\interview60.answers.mjs --model gemini-3.5-flash-lite
RUN   node electron\test\golden\interview60.answers.mjs --model gemini-3.1-flash-lite --tag low --thinking LOW
RUN   node electron\test\golden\interview60.answers.mjs --model gemini-3.1-flash-lite --tag captured-minimal --captured electron\test\golden\interview60.runs\2026-09-26T16-19-31-arms-dry\interview60.prompts.json
RUN   node electron\test\golden\interview60.answers.mjs --model gemini-3.1-flash-lite --tag captured-low --thinking LOW --captured electron\test\golden\interview60.runs\2026-09-26T16-19-31-arms-dry\interview60.prompts.json
RUN   node electron\test\golden\interview60.answers.mjs --model gemini-3.1-flash-lite --tag captured-low-r2 --thinking LOW --captured electron\test\golden\interview60.runs\2026-09-26T16-19-31-arms-dry\interview60.prompts.json
RUN   node electron\test\golden\interview60.answers.mjs --model gemini-3.1-flash-lite --tag captured-low-r3 --thinking LOW --captured electron\test\golden\interview60.runs\2026-09-26T16-19-31-arms-dry\interview60.prompts.json
RUN   node electron\test\golden\interview60.answers.mjs --model gemini-3.5-flash-lite --tag captured-high --thinking HIGH --captured electron\test\golden\interview60.runs\2026-09-26T16-19-31-arms-dry\interview60.prompts.json
RUN   node electron\test\golden\interview60.answers.mjs --model gemini-3.5-flash-lite --tag captured-high-r2 --thinking HIGH --captured electron\test\golden\interview60.runs\2026-09-26T16-19-31-arms-dry\interview60.prompts.json
RUN   node electron\test\golden\interview60.answers.mjs --model gemini-3.5-flash-lite --tag captured-high-r3 --thinking HIGH --captured electron\test\golden\interview60.runs\2026-09-26T16-19-31-arms-dry\interview60.prompts.json
RUN   node electron\test\golden\interview60.answers.mjs --model gemini-3.5-flash-lite --tag high --thinking HIGH
```
None carries `--model qwen/…` or `--model openai/…` — confirmed by inspection of every line above (also grepped: zero occurrences of `qwen` or `openai` anywhere in the full dry-run output). The dry run only appended to the git-ignored `interview60.run.flight.log` (pattern `electron/test/golden/interview60.run*.log` in `.gitignore`) and executed nothing else — verified via `git status --porcelain` before/after, which shows no new tracked diffs from the dry run itself.

### README (step 6)

Line 161's parenthetical changed from naming `Gemma 4 31B`, `qwen/qwen3.8-27b` and `openai/gpt-oss-120b` (stale on two counts — Gemma was already absent before this task) to: `(3.1 Flash Lite and 3.5 Flash Lite — an id with a \`/\` runs on Groq and needs a real \`GROQ_API_KEY\` in \`.env\`, the placeholder exits 3; answers.mjs still supports a Groq id for a manual pass, though the flight itself no longer schedules one)`. Line 166 and all other README lines untouched (`git diff --stat` shows README at `2 +-`, i.e. exactly one line changed).

## Deviations from the brief

- The brief's comment rewrite draft used a plain "--" in one place in my first pass through the `.mjs` script (to sidestep a possible non-ASCII-in-PowerShell risk); once I confirmed the Node-script approach round-trips UTF-8 cleanly (proven by the README edit's em dash landing correctly), I replaced it with a real em dash (`—`) to match this file's own style, which already uses em dashes 26 times elsewhere. Purely cosmetic, done before reporting DONE.
- Everything else matches the brief's exact values and wording intent.

## Open concerns

- `interview60.flight.mjs` line 166 in the README (explicitly out of scope — "Do NOT touch") still says "the three answer arms", which was already stale before this task (it's actually 2 arms + focused + paired) and is now further off since the count named in this task's own line 161 changed too. Not fixed, per the brief's explicit constraint.
- The dry run's `ROSTER interview60  79 items` line doesn't match the README's description of interview60 as 55 items (52 spoken + 3 screenshot). Pre-existing, unrelated to `ANSWER_MODELS`, out of this task's file list — flagged for the controller, not fixed here.
- The dry run created no new files besides appending to the git-ignored flight log (confirmed via `git status --porcelain`); the logged run-dir path `interview60.runs\2026-09-26T16-19-31-arms-dry\` was never actually created on disk (dry mode skips every real fs write except the log append and the file-move-aside/log calls, which are all gated on `!dry`).

## Fix round 1

Controller ruling on the Opus review (`task-10-review.md`: SPEC PASS / QUALITY APPROVED, 0 Critical, 0 Important, 5 Minor). M3 (renaming the two h40b Groq answers files aside) is an ops step the controller handles directly — not touched here.

### M1 — split the assertion, cover every schedulable arm

`interview60.flight.test.ts`: kept the exact `toEqual` test as its own test; added a second test, importing `FOCUSED_MODELS` too (now also pulled from `interview60.flight.mjs`), asserting no `/` in `[...ANSWER_MODELS, ...FOCUSED_MODELS, ...PAIRED_ARMS.map((a) => a.model)]`. This closes what the review found: the old single test's `/` loop only ran after `toEqual` had already passed, so it could never be the assertion that failed, and it never covered `FOCUSED_MODELS` at all.

Calibration (RED-first isn't possible for a guard of current behaviour, per the ruling — calibrated by breaking it instead): temporarily appended `'qwen/qwen3.8-27b'` to `FOCUSED_MODELS` in `interview60.flight.mjs` (`task10r2-calibration-break.mjs`). Run:
```
 ❯ electron/test/golden/interview60.flight.test.ts (18 tests | 1 failed) 40ms
   × ANSWER_MODELS > no id the flight can schedule runs on Groq: answer, focused and paired arms (user, 2026-09-26) 16ms
     → qwen/qwen3.8-27b: expected 'qwen/qwen3.8-27b' not to contain '/'
 Test Files  1 failed (1)
      Tests  1 failed | 17 passed (18)
```
Only the new test failed; the `toEqual` test and all 16 pre-existing tests stayed green, confirming the split isolates the check to the field it guards. Restored (`task10r2-calibration-restore.mjs`). Run:
```
 ✓ electron/test/golden/interview60.flight.test.ts (18 tests) 24ms
 Test Files  1 passed (1)
      Tests  18 passed (18)
```

### M2 — corrected in place above

See the correction inserted into "interview60.pass-record.test.ts, unchanged (step 4)" above. No code change — pass-record's import graph never touches `interview60.flight.mjs`, confirmed again this round. The skip's real cause (a scratch-cwd artifact, not a missing fixture) is now closed for real: see "Final runs" below — s50a copied into the scratch cwd, 0 skipped.

### M4 — arm counts next to the edited text, without hard-coding numbers that drift

- `interview60.flight.mjs:3-4`: "the three-arm answer passes" → "the answer passes" (no count).
- `interview60.flight.mjs:22-27` (header step 3): "the same 52 questions" → "the roster's questions" (h40c flies holdout40, 45 items, not interview60's count); "the two PAIRED_ARMS" → "the paired arms (PAIRED_ARMS)" (the array has 9 entries today; naming the constant instead of a number is what stops this going stale the same way again).
- `README.md:166`: "the three answer arms" → "the answer arms" (no count).
- `README.md:247-249`: "the four pairs files … the three arms … the three `interview60.judge.<model>.json` files" → now describes what `interview60.flight.done.json`'s `toGrade` array actually lists (the hour's own answers, plus one per answer and paired arm that ran). `FOCUSED_MODELS` arms are deliberately left out of that description, matching `flight.mjs`'s own `toGrade:` construction, which spreads only `ANSWER_MODELS` and `paired`, never `FOCUSED_MODELS`.

### M5 — the hedge's front leg

`interview60.flight.mjs:46`, controller's exact wording: "the second is the stall-fallback model (the hedge's front leg when NATIVELY_VERBAL_HEDGE=1)". The rest of that sentence and the whole Gemma paragraph after it are untouched — the patch was scoped to end exactly at "Both Gemma arms are" so the following line attaches identically to before.

### Nit — backtick `answers.mjs`

`README.md:161`: the bare `answers.mjs` mid-sentence is now `` `answers.mjs` ``, matching the file's own backtick convention for file names.

### Mechanism

Same as the original round: this session is isolated to a worktree, so `Edit`/`Write` refuse MAIN paths directly. Every change above was applied with a Node `.mjs` script in the scratchpad doing an exact-substring `String.replace`, guarded by a not-found check (`text.split(old).length - 1 !== 1` aborts before writing), run via plain `node <path>` from PowerShell, written back with `fs.writeFileSync(path, text, 'utf8')` (no BOM) after normalizing `\r\n`→`\n`. Scripts: `task10r2-patch-flight-mjs.mjs`, `task10r2-patch-test-ts.mjs`, `task10r2-patch-readme.mjs`, `task10r2-calibration-break.mjs` / `-restore.mjs`, `task10r2-copy-s50a.mjs` (all in `<SP>`).

### Final runs

Scope and encoding re-verified: `git status --porcelain` on the three files shows only `M` for `README.md`, `interview60.flight.mjs`, `interview60.flight.test.ts` (`git diff --stat`: README +6/-5, flight.mjs +16/-13, flight.test.ts +11/-1) — nothing else touched. All three still BOM=False, CR=False (LF-only).

Copied `electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a/` (38 files, 3,496,881 bytes, confirmed present in MAIN) into `<SP>\vitest-cwd-task10\electron\test\golden\interview60.runs\2026-09-09T15-00-55-s50a\` by hand (`readdirSync` + `copyFileSync`, recursive — not `fs.cpSync`, which is known on this project to exit silently on the repo's non-ASCII `Masaüstü` path). Source left untouched (still 38 files after the copy). Then, from that same scratch cwd:
```
 ✓ electron/test/golden/interview60.flight.test.ts (18 tests) 23ms
 ✓ electron/test/golden/interview60.pass-record.test.ts (21 tests) 176ms
 Test Files  2 passed (2)
      Tests  39 passed (39)
```
Both files green, **0 skipped** — 39 = 18 (flight, one test more than round 1 from the M1 split) + 21 (pass-record, all running now that s50a resolves).

### Status after fix round 1: DONE

All 5 Minor findings and the Nit addressed (M1, M2, M4, M5, Nit). M3 is the controller's ops step, left untouched here as ruled.

## Fix round 2 (N1, one line): `interview60.flight.mjs:24-26`'s "(PAIRED_ARMS) (the hour's captured prompts at the pre-bench level, the bare prompt at the shipped LOW level)" — which read as PAIRED_ARMS's complete set when it actually holds five kinds — now reads "(PAIRED_ARMS below: the hour's captured prompts and the bare prompt, on both Flash Lites, at the levels and repetitions listed there)", pointing at the list instead of enumerating it; nothing else changed; `interview60.flight.test.ts` green, 18/18.
