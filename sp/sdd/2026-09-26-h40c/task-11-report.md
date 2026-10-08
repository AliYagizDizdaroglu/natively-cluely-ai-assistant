# Task 11 report: four gaps the final whole-change review found (07a0e5e..e94305a)

Status: DONE

## Files changed (all in MAIN = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`)

- `electron/LLMHelper.verbalHedge.test.ts` — two new tests (M1: front-empty, both-empty).
- `electron/LLMHelper.geminiThinking.test.ts` — `NATIVELY_VERBAL_HEDGE`/`_TRIGGER_MS` hygiene (M2).
- `electron/LLMHelper.verbalPrimary.test.ts` — same hygiene (M2).
- `electron/llm/followUpParent.ts` — new export `describeFollowUpParentAtStartup` (M4).
- `electron/llm/followUpParent.test.ts` — test for the new export (M4).
- `electron/main.ts` — early startup block now also validates and logs the follow-up flag (M4).
- `electron/test/golden/interview60.pass-record.mjs` — reads the hedge startup line into
  `meta.verbalHedge`; renders one extra summary line and relabels the answers row under the hedge (M6).
- `electron/test/golden/interview60.pass-record.test.ts` — three new tests for M6.
- Not touched: `electron/LLMHelper.ts` (git status/diff confirms clean — the two rule-8 mutations
  for M1 were applied and fully reverted; no permanent change was needed there).

`git status --porcelain` on MAIN after all work: exactly these 8 files as `M`, nothing else from
this task (**correction, fix round 1:** the original report said "9 files" here — the count is 8,
since `LLMHelper.ts` is listed above as untouched, not as one of the changed files). (The listing
also shows `interview60.chains.json`, `interview60.report.md` and
`natively_debug.log.1` as pre-existing `M`, and several untracked files — all on the "never touch"
list given in the task context; none of it was touched by this task.) All 9 files verified
BOM=False, CR=False (LF-only, UTF-8 no BOM).

## Mechanism

This session runs in a worktree (`...\.claude\worktrees\whole-turn`), so `Edit` refused every MAIN
path with "Edit the worktree copy of this file instead of the shared-checkout path" (confirmed on
the first attempt, on `LLMHelper.verbalHedge.test.ts`). Per the implementer contract:
- The full new `LLMHelper.verbalHedge.test.ts` was staged at `<SP>\stage\electron\...` and copied
  to MAIN with the PowerShell `[IO.File]::WriteAllText(..., .Replace("`r`n","`n"), UTF8Encoding($false))`
  one-liner from the contract.
- Every other MAIN edit (including the two rule-8 mutations and their restores) was applied with a
  small Node `.mjs` script in the scratchpad doing an exact-substring `String.replace`, guarded by
  a not-found/not-unique check that exits non-zero before writing, run via plain `node <path>`,
  writing back with `fs.writeFileSync(path, text, 'utf8')`. Scripts (all in `<SP>`, prefixed
  `task11-`): `m1-mutation{1,2}-break/restore.mjs`, `b-patch-geminiThinking.mjs`,
  `b-patch-verbalPrimary.mjs`, `c-patch-followUpParent-test.mjs`, `c-patch-followUpParent-src.mjs`,
  `c-patch-maints.mjs`, `c-mutation-break/restore.mjs`, `d-patch-passrecord-test.mjs`,
  `d-patch-passrecord-mjs.mjs`, `d-mutation-break/restore.mjs`, `copy-s50a.mjs`.
- Tests ran via `& node "<MAIN>\node_modules\vitest\vitest.mjs" run --root "<MAIN>" --config
  "<MAIN>\vitest.config.ts" <file>` from `<SP>\vitest-cwd-task11` (one cwd for the whole task).
- For `interview60.pass-record.test.ts`'s real-s50a block: copied
  `electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a/` (38 files) into
  `<SP>\vitest-cwd-task11\electron\test\golden\interview60.runs\2026-09-09T15-00-55-s50a\` with
  `readdirSync` + `copyFileSync` (recursive, not `fs.cpSync`, which is known on this project to
  fail silently on the repo's non-ASCII `Masaüstü` path) — source left untouched (38 files after).

## A. M1 — the hedge's empty-leg branches (RED not applicable; proven by mutation)

Per the brief, these are tests of existing, correct behaviour, so they pass at once. Added two
tests to `LLMHelper.verbalHedge.test.ts`, in the file's existing style/fakes (using a `[]` step,
already covered by the file's `string[]` plan type):
- front `[]`, back tokens → back wins, `back started ... reason=front-empty`, `won by ... other=empty`.
- both `[]` → generator drains to `[]` with no throw; warn line `no answer - front empty, back empty`.

Run (18 tests, the 16 existing + 2 new), immediately green:
```
 ✓ electron/LLMHelper.verbalHedge.test.ts (18 tests) 117ms
 Test Files  1 passed (1)
      Tests  18 passed (18)
```

### Rule-8 calibration

**Mutation 1** (`LLMHelper.ts`): `return; // both empty: nothing to say, as today` → `throw new
Error('h40c task11 calibration: both empty')`. Run:
```
 ❯ electron/LLMHelper.verbalHedge.test.ts (18 tests | 1 failed) 144ms
   × ... h40c review M1: both legs yield nothing — the generator ends without throwing ...
Error: h40c task11 calibration: both empty
 Test Files  1 failed (1)
      Tests  1 failed | 17 passed (18)
```
Only the both-empty test failed (front-empty and all 16 pre-existing tests stayed green — isolated
to the branch it guards). Restored; re-run green (18/18).

**Mutation 2** (`LLMHelper.ts`): inserted `if (reason === 'front-empty') return;` immediately before
`const back = start(BACK);`, so an empty front no longer starts the back leg. Run:
```
 ❯ electron/LLMHelper.verbalHedge.test.ts (18 tests | 2 failed) 158ms
   × ... front yields nothing ... — the back is started with reason=front-empty and wins ...
     → expected "spy" to be called 2 times, but got 1 times
   × ... both legs yield nothing ...
     → expected [ 'gemini-3.5-flash-lite' ] to deeply equal [ 'gemini-3.5-flash-lite', …(1) ]
 Test Files  1 failed (1)
      Tests  2 failed | 16 passed (18)
```
The required front-empty test failed, as the brief asked. The both-empty test failed too — both
scenarios share the identical branch point (`reason === 'front-empty'`), so there is no mutation
that starves only one of them; noting this as an observation, not a deviation, since the brief
only required the front-empty test to fail. Restored; re-run green (18/18); `git diff --stat` on
`LLMHelper.ts` afterward shows no diff (fully clean).

## B. M2 — environment hygiene in two more test files

RED: with `NATIVELY_VERBAL_HEDGE=1` set in the PowerShell process, ran both files before the fix:
```
 ❯ electron/LLMHelper.geminiThinking.test.ts (4 tests | 3 failed) 30ms
   × ... unset → thinkingConfig.thinkingLevel LOW ...        expected { thinkingLevel: 'HIGH' } to deeply equal { thinkingLevel: 'LOW' }
   × ... LOW → thinkingConfig.thinkingLevel LOW ...            expected { thinkingLevel: 'HIGH' } to deeply equal { thinkingLevel: 'LOW' }
   × ... logs the usage line ...                               expected '[LLMHelper] gemini-3.5-flash-lite usa…' to match /gemini-3\.1-flash-lite …/
 ❯ electron/LLMHelper.verbalPrimary.test.ts (6 tests | 2 failed) 37ms
   × ... unset: the technical route answers on the selected model ...   expected 'gemini-3.5-flash-lite' to be 'gemini-3.1-flash-lite'
   × ... a caller that names its model gets that model ...               expected 'gemini-3.5-flash-lite' to be 'gemini-3.1-flash-lite'
 Test Files  2 failed (2)
      Tests  5 failed | 5 passed (10)
```
Exactly the 5 failures the review named (the 4th `geminiThinking` test, an explicit `MINIMAL`
opt-out, stayed green — matches the review's own count).

GREEN: added the same save / delete-in-beforeEach / restore-in-afterEach pattern
`LLMHelper.stallFallback.test.ts` already uses, for both `NATIVELY_VERBAL_HEDGE` and
`NATIVELY_VERBAL_HEDGE_TRIGGER_MS`, to both describe blocks. Re-run with the flag still set:
```
 ✓ electron/LLMHelper.geminiThinking.test.ts (4 tests) 12ms
 ✓ electron/LLMHelper.verbalPrimary.test.ts (6 tests) 21ms
 Test Files  2 passed (2)
      Tests  10 passed (10)
```
Cleared the variable afterward (`Remove-Item Env:NATIVELY_VERBAL_HEDGE`; confirmed absent). Also
ran both files unset, plus `stallFallback.test.ts` for reference: all 17 green, no regressions.

## C. M4 — NATIVELY_FOLLOWUP_PARENT startup validation

RED: added the test importing the not-yet-existing `describeFollowUpParentAtStartup` to
`followUpParent.test.ts`. Run:
```
 ❯ electron/llm/followUpParent.test.ts (7 tests | 1 failed) 14ms
   × describeFollowUpParentAtStartup (...) > names on/off for a valid value, and throws ...
TypeError: describeFollowUpParentAtStartup is not a function
 Test Files  1 failed (1)
      Tests  1 failed | 6 passed (7)
```

GREEN: implemented `describeFollowUpParentAtStartup(env)` in `followUpParent.ts`, on top of
`followUpParentEnabled` — returns `'follow-up parent: on'` / `'follow-up parent: off'` (no `[Main]`
prefix; the caller adds it, matching the brief's step 3), throws `followUpParentEnabled`'s own
message on a junk value. Run:
```
 ✓ electron/llm/followUpParent.test.ts (7 tests) 7ms
```

Wired into `main.ts`'s existing early try block (same one that calls
`describeVerbalHedgeAtStartup`, right after `app.whenReady()` and the log-file reset): added the
import, one comment line naming the h40c review finding, and
`console.log(\`[Main] ${describeFollowUpParentAtStartup()}\`)` right after the hedge's
`console.log`. A throw still takes the existing `catch` → `console.error` + `app.exit(1)` +
`return` path, unchanged. `main.ts` has no unit tests (confirmed: no `main.test.ts` in the repo) —
this is not exercised by any automated test; the controller proves the line live in the smoke.

### Rule-8 calibration

Mutated `describeFollowUpParentAtStartup` to swallow the throw (`try { ... } catch { return
'follow-up parent: off'; }`). Run:
```
 ❯ electron/llm/followUpParent.test.ts (7 tests | 1 failed) 18ms
   × ... names on/off for a valid value, and throws the flag's own message for a junk one ...
AssertionError: expected [Function] to throw an error
 Test Files  1 failed (1)
      Tests  1 failed | 6 passed (7)
```
Restored; re-run green (7/7); `git diff --stat` afterward on `followUpParent.ts` shows the
one intended function only (no residual mutation).

## D. M6 — the pass record misnames the in-app model under the hedge

RED: added three tests to `interview60.pass-record.test.ts` (no-line, off, on), plus copied s50a
into the scratch cwd so the real-folder block runs (0 skipped). Run before the fix:
```
 ❯ electron/test/golden/interview60.pass-record.test.ts (24 tests | 2 failed) 190ms
   × ... verbal hedge off — one extra summary line names it ...   expected '...' to contain '- Verbal hedge: off'
   × ... verbal hedge on — the summary line names the trigger ... expected '...' to contain '- Verbal hedge: on trigger=5000ms (3.…'
 Test Files  1 failed (1)
      Tests  2 failed | 22 passed (24)
```
The no-line test and the real-s50a block (which predates the hedge) passed already, as expected —
only the off/on cases needed the new code.

GREEN, minimal changes to `interview60.pass-record.mjs`:
- `collectPass`: `meta.verbalHedge = lastMatch(dbg, /\[Main\] verbal hedge: (on trigger=\d+ms|off)/g)?.[1] ?? null`
  — the exact text `describeVerbalHedgeAtStartup` logs, read from the same `dbg` string the file
  already reads for `stt`/`answerModel`; `null` when the line is absent (every run before da28f25).
- `renderPassRecord`: the answers-row label is `hedge (gemini-3.5-flash-lite front,
  gemini-3.1-flash-lite back)` when `t.verbalHedge` starts with `'on'`, else the untouched
  `t.answerModel ?? 'unknown'`.
- `renderPassRecord`: one extra Summary bullet, only when `t.verbalHedge != null` —
  `- Verbal hedge: off` or `- Verbal hedge: on trigger=<n>ms (3.5-flash-lite front, 3.1-flash-lite
  back; answers name their model in the won-by lines)`.
- `passRow`/`renderPassIndex`/`indexRows` untouched — the INDEX table has no answers/model column
  at all, so the hard constraint ("INDEX row format must not change") holds by construction, not by
  a guard that needed writing.

Run after the fix:
```
 ✓ electron/test/golden/interview60.pass-record.test.ts (24 tests) 125ms
 Test Files  1 passed (1)
      Tests  24 passed (24)
```

### Rule-8 calibration

Removed the `if (t.verbalHedge != null)` guard (line always renders). Run:
```
 ❯ electron/test/golden/interview60.pass-record.test.ts (24 tests | 2 failed) 126ms
   × ... says plainly when a pass has not been graded yet, and still shows the answers ...
     → expected '...' not to contain 'undefined'
   × ... no verbal-hedge startup line (every run before da28f25) — renders exactly as before ...
     → expected '...' not to contain 'Verbal hedge'
 Test Files  1 failed (1)
      Tests  2 failed | 22 passed (24)
```
The required no-line test failed, plus one pre-existing test (`says plainly when a pass has not
been graded yet ... not.toContain('undefined')`) caught the same mutation independently — a nice
extra confirmation, not a deviation. Restored; re-run green (24/24); `git diff --stat` shows only
the two intended additions (meta field + render logic), 8 lines.

## Final combined run (all touched + adjacent files)

```
 ✓ electron/llm/verbalHedge.test.ts (11 tests) 14ms
 ✓ electron/llm/followUpParent.test.ts (7 tests) 13ms
 ✓ electron/test/golden/interview60.pass-record.test.ts (24 tests) 173ms
 ✓ electron/LLMHelper.geminiThinking.test.ts (4 tests) 12ms
 ✓ electron/LLMHelper.verbalPrimary.test.ts (6 tests) 22ms
 ✓ electron/LLMHelper.stallFallback.test.ts (7 tests) 49ms
 ✓ electron/LLMHelper.verbalHedge.test.ts (18 tests) 96ms
 Test Files  7 passed (7)
      Tests  77 passed (77)
```

`tsc -p electron/tsconfig.json --noEmit` — exactly the 6 pre-existing errors named in the brief,
nothing new:
```
electron/audio/GeminiLiveRouter.ts(125,44): error TS2339: Property 'length' does not exist on type 'never'.
electron/ipcHandlers.ts(3433,18): error TS2339: Property 'canceled' does not exist on type 'string[]'.
electron/ipcHandlers.ts(3433,38): error TS2339: Property 'filePaths' does not exist on type 'string[]'.
electron/ipcHandlers.ts(3436,31): error TS2339: Property 'filePaths' does not exist on type 'string[]'.
electron/knowledge/KnowledgeOrchestrator.ts(349,35): error TS2322: Type 'CompanyDossier' is not assignable to type 'null'.
electron/knowledge/KnowledgeOrchestrator.ts(351,25): error TS2322: Type 'CompanyDossier' is not assignable to type 'null'.
```
Root `tsc --noEmit`: 0 errors.

## Deviations from the brief

- Mutation 2 for M1 (empty front skips starting the back leg) fails both the front-empty and the
  both-empty tests, not only the front-empty one the brief names — both scenarios share the exact
  same branch point in `streamGeminiWithHedge`, so there is no way to starve one without the other
  at that mutation point. The brief's required assertion (front-empty test fails) holds; recorded
  as an observation above, not treated as a problem.
- `describeFollowUpParentAtStartup`'s return value carries no `[Main]` prefix (unlike
  `describeVerbalHedgeAtStartup`, which embeds it); `main.ts` prepends `[Main] ` at the call site.
  This matches the brief's step 3 wording ("log `[Main] ` + its result") rather than
  `describeVerbalHedgeAtStartup`'s own shape — a deliberate reading, not an oversight.
- Nothing else deviates from the brief's exact values (regex text, log line text, function names,
  file list).

## Open concerns

- `main.ts`'s new line has no unit test (none exist for `main.ts` in this repo) — per the brief,
  this is expected; the controller's live smoke is the only thing that exercises it. Until that
  smoke runs, the startup line's exact wording and placement are read-verified only (the code was
  read alongside the hedge's own call site and follows it line for line), not executed live.
- Per finding I1 in `final-review.md`, the hedge itself has still not run live — out of scope for
  this task (four Minor findings only), but it means this task's own new startup line also has not
  been observed in a real Electron process yet.

## Fix round 1

Controller ruling on the Opus review (`task-11-review.md`: SPEC PASS / QUALITY APPROVED, 0
Critical, 0 Important, Minor 3, plus 1 report nit). All 3 Minor findings and the report nit
accepted and fixed.

### Report nit — file count

Fixed above, in "Files changed": "9 files" → "8 files", with a note that `LLMHelper.ts` was always
listed as untouched, not as a changed file. The reviewer's own count (8) matches `git status`.

### Minor 1 — the log parse that M6 exists for had no test

The three original M6 tests inject `meta.verbalHedge` straight into `renderPassRecord`, and the
real-folder s50a block predates the hedge, so a regex that never matches would still pass 24/24
(the reviewer proved this with their own mutation, `verbal hedge:` → `verbal-hedge:`, surviving
24/24).

Exported the regex as its own function, `verbalHedgeFromLog(dbg)`, from
`interview60.pass-record.mjs` (placed right after `graderOf`, the file's other small
judge/log-derived helper), and had `collectPass` call it instead of inlining the regex. Added a
new `describe('verbalHedgeFromLog ...')` block to `interview60.pass-record.test.ts`, importing
both `verbalHedgeFromLog` (from `./interview60.pass-record.mjs`) and `describeVerbalHedgeAtStartup`
(from `../../llm/verbalHedge`, the real function, not a hand-typed fixture), and feeding its output
through the regex prefixed like a real debug-log line (`<ISO> [LOG] <line>`):

RED (before exporting the helper):
```
 ❯ electron/test/golden/interview60.pass-record.test.ts (27 tests | 3 failed) 150ms
   × verbalHedgeFromLog (...) > reads off and on-trigger from the real describeVerbalHedgeAtStartup output
     → verbalHedgeFromLog is not a function
   × verbalHedgeFromLog (...) > is null when the log holds no hedge line at all (every run before da28f25)
     → verbalHedgeFromLog is not a function
```
(The third failure in this run was Minor 3's test, added in the same patch — see below.)

GREEN:
```
 ✓ electron/test/golden/interview60.pass-record.test.ts (27 tests) 149ms
      Tests  27 passed (27)
```

**Rule-8 calibration:** reproduced the reviewer's own mutation — `/\[Main\] verbal hedge: .../` →
`/\[Main\] verbal-hedge: .../` (a dash for the space). Run:
```
 ❯ electron/test/golden/interview60.pass-record.test.ts (27 tests | 1 failed) 126ms
   × verbalHedgeFromLog (...) > reads off and on-trigger from the real describeVerbalHedgeAtStartup output
AssertionError: expected null to be 'off'
 Test Files  1 failed (1)
      Tests  1 failed | 26 passed (27)
```
Only the new test failed — the original 24 M6 tests (and Minor 3's new one) stayed green even
under this mutation, exactly reproducing the reviewer's finding and confirming the new test closes
it. Restored; re-run green (27/27).

### Minor 2 — the followUpParent.ts docstring was wrong about the hedge's shape

The docstring said the caller adds `[Main] ` "the same way it does for the hedge line", implying
`describeFollowUpParentAtStartup` and `describeVerbalHedgeAtStartup` share a shape. They do not:
`describeVerbalHedgeAtStartup` embeds `[Main] ` itself and `main.ts` logs it raw; only
`describeFollowUpParentAtStartup`'s line gets the prefix added at the call site. Reworded the
docstring to say the two differ on purpose (quoted the corrected text in the diff; no behaviour
change, so no test — `followUpParent.test.ts` re-run green, 7/7, unaffected).

### Minor 3 — the hedge label ignored answerModel

The hedge only engages when the primary is one of the two lites (`LLMHelper.ts:3395`); the label
in the pass record did not check that, so a run with the hedge flag on but a different primary
(e.g. `NATIVELY_VERBAL_PRIMARY_MODEL=gemini-3.5-flash`, or Gemma) would claim the hedge answered
when the ordinary stall race did.

Changed `renderPassRecord`'s `answerLabel` to require both `t.verbalHedge?.startsWith('on')` AND
`t.answerModel` being `gemini-3.1-flash-lite` or `gemini-3.5-flash-lite`; otherwise it keeps
`t.answerModel` as before. The `- Verbal hedge: ...` summary bullet is untouched — it still renders
whenever the flag was on, regardless of which model actually answered.

Added one test (fixture: `verbalHedge: 'on trigger=5000ms'`, `answerModel: 'gemini-3.5-flash'`),
which failed before the change (`| answers | hedge (gemini-3.5-flash-lite front...` incorrectly
rendered instead of naming `gemini-3.5-flash`) and passed after — see the combined RED/GREEN runs
above (this test is one of the "3 failed" in the RED run and one of the "27 passed" in the GREEN
run). No separate rule-8 mutation was done for this one; the brief's fix-round-1 instructions asked
for a test, not a calibration, and the RED-then-GREEN transition already proves the test can fail.

### Mechanism (fix round 1)

Same as the original round: `Edit`/`Write` refuse MAIN paths from this worktree session, so every
change was applied with a Node `.mjs` script in the scratchpad doing an exact-substring
`String.replace`, guarded by a not-found/not-unique check, run via plain `node <path>`, written
back with `fs.writeFileSync(path, text, 'utf8')` (no BOM, LF preserved from the original file).
Scripts (all in `<SP>`, prefixed `task11r1-`): `patch-passrecord-test.mjs`,
`patch-passrecord-mjs.mjs`, `m1-mutation-break.mjs` / `-restore.mjs`,
`patch-followUpParent-docstring.mjs`. The report nit was fixed directly with `Edit` (the report
file lives in the scratchpad, not MAIN, so `Edit` is unrestricted there).

### Final verification (fix round 1)

```
 ✓ electron/llm/verbalHedge.test.ts (11 tests) 12ms
 ✓ electron/llm/followUpParent.test.ts (7 tests) 11ms
 ✓ electron/test/golden/interview60.pass-record.test.ts (27 tests) 159ms
 ✓ electron/LLMHelper.geminiThinking.test.ts (4 tests) 18ms
 ✓ electron/LLMHelper.verbalPrimary.test.ts (6 tests) 28ms
 ✓ electron/LLMHelper.stallFallback.test.ts (7 tests) 56ms
 ✓ electron/LLMHelper.verbalHedge.test.ts (18 tests) 116ms
 Test Files  7 passed (7)
      Tests  80 passed (80)
```
`tsc -p electron/tsconfig.json --noEmit`: exactly the same 6 pre-existing errors as before this
round (GeminiLiveRouter:125; ipcHandlers:3433 ×2, 3436; KnowledgeOrchestrator:349, 351). Root
`tsc --noEmit`: 0. `git status --porcelain -- electron` after this round: the same 8 files as `M`
(plus the same pre-existing, not-this-task files/untracked entries noted in the original report),
`LLMHelper.ts` still absent (untouched). All 3 edited files (`followUpParent.ts`,
`interview60.pass-record.mjs`, `interview60.pass-record.test.ts`) reverified BOM=False, CR=False.

### Status after fix round 1: DONE
