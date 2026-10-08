# Task 7 Report — Flight: the `captured-no-cues` twins, gated on the hour's bytes

## Fix round 1

**Finding (plan-mandated, not my error):** `hasCueRule` used `Object.values(captured ?? {}).some(...)` over every entry in the captured-prompts object. Two consequences: (1) on a MIXED hour — some captured prompts carrying the cue rule, some not — a single rule-carrying entry made `.some()` true, gating the three `captured-no-cues*` arms open; `answers.mjs --no-cues` then refuses (exit 2) the first id whose captured prompt lacks the rule, killing that arm mid-flight instead of the flight skipping it cleanly. (2) `.some()` scanned every key in the captured object, including ids `capturedOnly` would never actually hand to the arm (e.g. a screenshot-cue id, `kind: 'screenshot'`) — so a rule-carrying capture of an id the arm never replays could also gate the arms open. The controller's ruling superseded the brief's Step 3 code on this one point: `hasCueRule` must fail closed, scoped to exactly what `capturedOnly` would replay, with `ids.every(...)` in place of `.some()`.

**What changed:**

1. **`hasCueRule`** in `electron/test/golden/interview60.flight.mjs`, per the controller's exact ruling:
   ```js
   export const hasCueRule = (captured) => {
       const ids = capturedOnly(captured);
       return ids.length > 0 && ids.every((id) => String(captured[id].system ?? '').includes(CUE_RULE_MARK));
   };
   ```
   `CUE_RULE_MARK` itself is untouched. Extended the function's JSDoc with a paragraph naming the fail-closed/mixed-hour invariant, since the previous doc didn't describe it.

2. **The skip-path log line** in `main()`'s paired-arms builder: added `ruleCount` (how many of `capturedIds` — the ids the arm would actually replay — carry the mark) and `ruleSummary`, both computed once before the `for` loop (not per arm), then used in the `!wanted(a)` branch:
   ```js
   const ruleCount = capturedIds.filter((id) => String(capturedJson[id].system ?? '').includes(CUE_RULE_MARK)).length;
   const ruleSummary = ruleCount === 0
       ? `0 of ${capturedIds.length} carry the cue rule`
       : `${capturedIds.length - ruleCount} of ${capturedIds.length} lack it`;
   ...
   else if (!wanted(a)) log(`paired arm ${a.tag} skipped — ${ruleSummary}, so --no-cues would refuse an id mid-flight instead`);
   ```
   Matches the two example phrasings the controller gave verbatim: `0 of N carry the cue rule` when nothing carries it (a pre-cue hour — the whole reachable range inside the `!wanted` branch is `0 <= ruleCount < capturedIds.length`, since `wanted` is only false when not every replayable id carries the rule), and `M of N lack it` when some but not all do (a mixed hour). `wanted`'s short-circuit order (`!a.when || dry || a.when(capturedJson)`) is untouched — dry mode still never calls `a.when`.

3. **Tests** in `electron/test/golden/interview60.flight.test.ts`: the brief's original `hasCueRule` test used single-key fixture objects keyed by a fabricated id (`S1Q01`, which is not an interview60 roster id), so `.some()` and `.every()` agreed on every one of its assertions — it could not have caught this bug. Rewrote it, scoped to the real default (`interview60`) roster that `capturedOnly`'s default `items = INTERVIEW` resolves against at test time (confirmed no `NATIVELY_ROSTER` override in `vitest.config.ts` or elsewhere): `W01`/`W02` are real interview60 ids (`kind` unset → spoken), `C01` is real too but `kind: 'screenshot'`. New/adapted assertions, all inside the existing `it('hasCueRule reads the shipped rule\'s header...')`:
   - (a) one real spoken id, rule present → `true`
   - (b) one real spoken id, rule absent → `false`
   - (c) **MIXED** — `W01` carries the rule, `W02` does not → `false` (the assertion that tells `.every()` apart from `.some()`; confirmed below it's the one that failed first against the old code)
   - (d) empty object → `false` (unchanged from the brief)
   - (e) only `C01` (screenshot, not replayed by `capturedOnly`) carrying the rule → `false` (tells the new scoped implementation apart from a `.some()` that scans every entry regardless of kind)

**TDD evidence for the fix:**

RED — command:
```
node node_modules/vitest/vitest.mjs run electron/test/golden/interview60.flight.test.ts
```
Run immediately after updating only the test file (fixtures rewritten to real roster ids, cases (a)-(e) added), before touching `hasCueRule`'s implementation. Output:
```
 ❯ electron/test/golden/interview60.flight.test.ts (18 tests | 1 failed) 25ms
   × PAIRED_ARMS > hasCueRule reads the shipped rule's header out of the captured system prompts 9ms
     → expected true to be false // Object.is equality

 AssertionError: expected true to be false // Object.is equality
 ❯ electron/test/golden/interview60.flight.test.ts:208:136
     206|         // MIXED: one replayable prompt carries the rule, the other does not — this is the case
     207|         // that tells .every() apart from .some(); a .some() reading would wrongly say true here.
     208|         expect(hasCueRule({ W01: { system: `prompt ${CUE_RULE_MARK} more`, user: 'u' }, W02: ...

 Test Files  1 failed (1)
      Tests  1 failed | 17 passed (18)
```
The MIXED case (c) is the one that failed, and it failed first — exactly as the controller predicted: the old `.some()` code found `W01`'s rule-carrying system prompt and returned `true` for the whole call, when the correct answer (since `W02` doesn't carry it) is `false`. Vitest's `expect` throws on the first failed assertion within an `it`, so the later screenshot-only case (e), which would also fail against the old code (single-entry object, `.some()` finds the mark on `C01` → `true`, expected `false`), was never reached in this run — the report doesn't claim it independently, but its failure mode against the pre-fix code is the same reasoning as (c)'s, and it passed cleanly post-fix (see GREEN below). 17 of the pre-existing 18 tests were unaffected.

GREEN — command:
```
node node_modules/vitest/vitest.mjs run electron/test/golden/interview60.flight.test.ts
```
Run after implementing the `hasCueRule` fix and the log-line numeric summary. Output:
```
 ✓ electron/test/golden/interview60.flight.test.ts (18 tests) 25ms

 Test Files  1 passed (1)
      Tests  18 passed (18)
```
All 18 tests pass, including every one of the five `hasCueRule` cases (a)-(e) in the same `it` block (vitest only reports the block as one pass/fail unit, but since it completed without throwing, every `expect` in it — including (e), the last line — necessarily passed).

**Electron tsc:** re-ran `node node_modules/typescript/bin/tsc -p electron/tsconfig.json --noEmit` after the fix — still exits 2 with exactly the same 6 pre-existing errors (`GeminiLiveRouter.ts:125`, `ipcHandlers.ts:3433` x2, `ipcHandlers.ts:3436`, `KnowledgeOrchestrator.ts:349`, `KnowledgeOrchestrator.ts:351`), none in the two files touched. Count unchanged.

**Command run to verify, as the coordinator asked (repeated here for the record):**
```
node node_modules/vitest/vitest.mjs run electron/test/golden/interview60.flight.test.ts
```
→ 18/18 passing, pristine output (only vitest's pre-existing, unrelated "CJS build of Vite's Node API is deprecated" banner).

**What I did not re-run:** the brief's Step 4 dry run (`dry-runs.mjs`) — not requested by the coordinator's fix-round instructions, and this fix does not touch `.env` handling, the dry-mode short-circuit (`wanted`'s `dry` check is untouched and was re-verified by reading the diff), or anything the dry run exercises beyond what the 18 unit tests already re-confirm (the `PAIRED_ARMS` shape and `hasCueRule` identity tests are unchanged from round 1 and still pass).

**Commit:** `49183fc` — "fix(flight): hasCueRule fails closed — every replayable id, not any" (2 files changed, 31 insertions, 4 deletions), built directly on `3fd5ba4` (another task's fix commit that landed on the branch meanwhile, untouched by me — I did not pull, rebase, or merge). `git add` named only the two files explicitly; `git status --short` was empty after the commit.

**Self-review of the fix:** `CUE_RULE_MARK` is untouched, exactly as the controller required. `hasCueRule` matches the controller's exact prescribed code. The skip log line's numeric summary is computed once before the `for` loop, not per arm, and reuses `capturedIds`/`capturedJson` already in scope rather than recomputing them. The `!replayable(a)` branch (the pre-existing "no captured prompts at all" WARN case) is untouched. `wanted`'s short-circuit order is untouched — confirmed by re-reading the diff, `dry` is still checked before `a.when(capturedJson)`. Tests assert real behavior (the actual `hasCueRule` function against realistic fixtures scoped to the real roster), not a mock; RED was observed and matched the predicted failure (the MIXED case, first) before the implementation changed, GREEN confirmed after. Only the two named files were staged and committed.

**Concerns:** None. The fix matches the controller's ruling exactly; all 18 tests pass; tsc count unchanged; commit contains only the two intended files, built cleanly on the current HEAD without touching the other task's commit.

---

## What I implemented

Exactly the brief's Step 3, in the two named files:

1. **`electron/test/golden/interview60.flight.mjs`**
   - Added `CUE_RULE_MARK = '[CUES FIRST]'` and `hasCueRule = (captured) => Object.values(captured ?? {}).some((c) => typeof c?.system === 'string' && c.system.includes(CUE_RULE_MARK))`, with the brief's JSDoc, placed directly before `export const PAIRED_ARMS`.
   - Added three new `PAIRED_ARMS` entries after the `high` entry: `captured-no-cues`, `captured-no-cues-r2`, `captured-no-cues-r3` — each `{ model: ANSWER_MODELS[0], captured: true, args: ['--thinking', 'LOW', '--no-cues'], when: hasCueRule }`, with the brief's comment.
   - Replaced the `capturedIds` / WARN-line / `paired` builder block in `main()` with the brief's version: `capturedJson` is now parsed once and kept (rather than inlined only into `capturedIds`), a `replayable(a)` predicate factors out the existing captured-prompt gate, a new `wanted(a)` predicate (`!a.when || dry || a.when(capturedJson)`) gates arms carrying a `when` function, and the per-arm loop logs one WARN line for a non-replayable arm or one plain log line (`... skipped — the hour's captured prompts carry no cue rule ...`) for a replayable-but-unwanted arm. `paired` now filters on `replayable(a) && wanted(a)`.

2. **`electron/test/golden/interview60.flight.test.ts`**
   - Added `CUE_RULE_MARK` and `hasCueRule` to the existing import from `./interview60.flight.mjs` (placed alphabetically, matching the file's existing import-sort convention) and a new `import { CUE_RULE } from '../../llm/prompts';`.
   - Appended the brief's two `it(...)` blocks verbatim inside `describe('PAIRED_ARMS', ...)`.

No other files were touched. No new dependencies. No `.env` was created or edited by me.

## What I tested and the results

- `node node_modules/vitest/vitest.mjs run electron/test/golden/interview60.flight.test.ts` — 18/18 passing, pristine output (only vitest's pre-existing "CJS build of Vite's Node API is deprecated" banner, unrelated to this change and present on every run in this repo).
- `node node_modules/vitest/vitest.mjs run electron/test/golden/cueArm.test.ts` — 3/3 passing (sanity check that the Task 6 cue-arm helpers this task builds on are untouched and still green).
- `node node_modules/typescript/bin/tsc -p electron/tsconfig.json --noEmit` — exits 2, exactly the same 6 pre-existing errors as before (see below), none in the two files I touched. Count unchanged.
- The flight's own `--dry-run`, via the scratchpad helper `dry-runs.mjs` (see TDD/GREEN section below for full output) — both `dryskip` and `dryfocus` dry runs exit 0, and both plans list the three new `captured-no-cues*` arms with `--no-cues` in their args (dry mode plans every arm, `when`-gates included, since `wanted()` short-circuits true on `dry`).

## TDD evidence

**RED** — command:
```
node node_modules/vitest/vitest.mjs run electron/test/golden/interview60.flight.test.ts
```
Run immediately after adding only the two new imports and the two new `it(...)` blocks (before touching `interview60.flight.mjs`). Relevant output:
```
 ❯ electron/test/golden/interview60.flight.test.ts (18 tests | 2 failed) 26ms
   × PAIRED_ARMS > runs the same-bytes no-cue twin three times on the app answer model, only on an hour that flew with cues 10ms
     → expected [] to deeply equal [ 'captured-no-cues', …(2) ]
   × PAIRED_ARMS > hasCueRule reads the shipped rule's header out of the captured system prompts 2ms
     → expected '\n\n[CUES FIRST]\nBefore the spoken a…' to include undefined

 Test Files  1 failed (1)
      Tests  2 failed | 16 passed (18)
```
Why expected: `CUE_RULE_MARK` and `hasCueRule` did not exist yet in `interview60.flight.mjs`, so the destructured import resolved to `undefined` (test 2 fails on `CUE_RULE.toContain(undefined)`), and `PAIRED_ARMS` had no `captured-no-cues*` entries yet (test 1 fails on `[] `vs the expected three tags). The other 16 pre-existing tests were unaffected. This is exactly the failure the brief's Step 2 predicted ("FAIL — CUE_RULE_MARK/hasCueRule undefined, no captured-no-cues arms").

**GREEN** — command:
```
node node_modules/vitest/vitest.mjs run electron/test/golden/interview60.flight.test.ts
```
Run after implementing Step 3 in `interview60.flight.mjs`. Output:
```
 ✓ electron/test/golden/interview60.flight.test.ts (18 tests) 15ms

 Test Files  1 passed (1)
      Tests  18 passed (18)
```
Re-ran once more immediately before committing (Step 4 in my process, after the dry run) — same result, 18/18, 18ms.

**Dry run** (brief Step 4, run per the coordinator's mid-task correction that this step is allowed because the scratchpad helper manages its own temporary empty `.env`):
```
node "C:/Users/sotka/AppData/Local/Temp/claude/.../scratchpad/dry-runs.mjs"
```
Confirmed no `.env` existed in the worktree before running it. Relevant output:
```
== dryskip exit=0  (46 lines, full log in dryskip.out)
...
RUN   node electron\test\golden\interview60.answers.mjs --model gemini-3.1-flash-lite --tag captured-no-cues --thinking LOW --no-cues --captured electron\test\golden\interview60.runs\2026-09-21T19-54-27-dryskip\interview60.prompts.json
RUN   node electron\test\golden\interview60.answers.mjs --model gemini-3.1-flash-lite --tag captured-no-cues-r2 --thinking LOW --no-cues --captured electron\test\golden\interview60.runs\2026-09-21T19-54-27-dryskip\interview60.prompts.json
RUN   node electron\test\golden\interview60.answers.mjs --model gemini-3.1-flash-lite --tag captured-no-cues-r3 --thinking LOW --no-cues --captured electron\test\golden\interview60.runs\2026-09-21T19-54-27-dryskip\interview60.prompts.json
DONE  dryskip   dry run complete
== dryfocus exit=0  (53 lines, full log in dryfocus.out)
...
RUN   node electron\test\golden\interview60.answers.mjs --model gemini-3.1-flash-lite --tag captured-no-cues --thinking LOW --no-cues --captured electron\test\golden\interview60.runs\2026-09-21T19-54-27-dryfocus\interview60.prompts.json
RUN   node electron\test\golden\interview60.answers.mjs --model gemini-3.1-flash-lite --tag captured-no-cues-r2 --thinking LOW --no-cues --captured electron\test\golden\interview60.runs\2026-09-21T19-54-27-dryfocus\interview60.prompts.json
RUN   node electron\test\golden\interview60.answers.mjs --model gemini-3.1-flash-lite --tag captured-no-cues-r3 --thinking LOW --no-cues --captured electron\test\golden\interview60.runs\2026-09-21T19-54-27-dryfocus\interview60.prompts.json
DONE  dryfocus   dry run complete
.env removed: true
```
Both `dryskip` (default `interview60` roster) and `dryfocus` (`scenario50` roster, scenarios S1+S2) exit 0, both list the three `captured-no-cues*` arms with `--no-cues` in the args, no `Error` anywhere in either log. `.env removed: true` confirms the helper's temporary empty `.env` was cleaned up. After the run, `git status --short` still showed only the two files I intended to change — no run folders or other tracked files were created or modified by the dry run (dry mode's `run()` never spawns a child process; it only appends to the shared, gitignored `interview60.run.flight.log`).

## Electron tsc error count

6 errors, unchanged from the pre-existing baseline named in the task context, none in the files I touched:
```
electron/audio/GeminiLiveRouter.ts(125,44): error TS2339: Property 'length' does not exist on type 'never'.
electron/ipcHandlers.ts(3433,18): error TS2339: Property 'canceled' does not exist on type 'string[]'.
electron/ipcHandlers.ts(3433,38): error TS2339: Property 'filePaths' does not exist on type 'string[]'.
electron/ipcHandlers.ts(3436,31): error TS2339: Property 'filePaths' does not exist on type 'string[]'.
electron/knowledge/KnowledgeOrchestrator.ts(349,35): error TS2322: Type 'CompanyDossier' is not assignable to type 'null'.
electron/knowledge/KnowledgeOrchestrator.ts(351,25): error TS2322: Type 'CompanyDossier' is not assignable to type 'null'.
```

## Brief steps skipped

None. The coordinator initially flagged the dry-run step (Step 4) as one to skip because this worktree has no `.env`, but corrected that mid-task: the brief's Step 4 routes through a scratchpad helper (`dry-runs.mjs`) that creates its own temporary empty `.env` for the duration of the two dry runs and deletes it in a `finally` block (refusing to run at all if a real `.env` is already present). I ran it as the corrected instruction directed, without creating or editing any `.env` myself, and it is documented above.

## Files changed

- `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\.claude\worktrees\whole-turn\electron\test\golden\interview60.flight.mjs`
- `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\.claude\worktrees\whole-turn\electron\test\golden\interview60.flight.test.ts`

Commit: `feaf897` — "feat(flight): a same-bytes no-cue twin, three reps, only on a cue hour" (2 files changed, 47 insertions, 4 deletions). Working tree clean after commit (`git status --short` empty); only these two files were ever staged (`git add` named them explicitly, no `-A`/`-u`).

## Self-review findings

Checked against the brief's Interfaces line and the self-review checklist:

- **Completeness**: `CUE_RULE_MARK` present and equals `'[CUES FIRST]'`, matching the literal header text inside the real `CUE_RULE` export in `electron/llm/prompts.ts` (verified `CUE_RULE.toContain(CUE_RULE_MARK)` passes). `hasCueRule` present, matches the brief's exact implementation. All three `captured-no-cues*` arms present, each with `when: hasCueRule` (verified by object identity, `toBe`, in the test). The builder change logs one line per individual skipped arm (not one combined line for all three) — this matches the brief's literal loop (`for (const a of PAIRED_ARMS) { ... }`), and is the same one-line-per-arm style as the pre-existing "no captured prompts" WARN case. No done-file/log bookkeeping beyond this was named in the brief, and none was needed: `done.pairedArms` and `done.toGrade` already derive from `paired`, which now correctly excludes gated-out arms with no further change required. Both brief tests are present verbatim.
- **Quality**: Names (`CUE_RULE_MARK`, `hasCueRule`, `replayable`, `wanted`) are exactly the brief's; code is the minimum diff the brief specifies, no embellishment.
- **Discipline**: Only the two named files touched; nothing else in the working tree was staged or modified. I created one scratch file (`tsc-out.txt`, to capture tsc output for counting) inside the worktree during verification and deleted it immediately after use — confirmed via `git status --short` that it left no trace and was never staged.
- **Testing**: Both new tests assert real behavior — the shape and `when`-identity of the `PAIRED_ARMS` entries, and `hasCueRule`'s truth table against a fabricated captured-prompts object plus the real shipped `CUE_RULE` constant — not implementation mocks. RED was observed and matched the brief's predicted failure reason before any implementation code was written; GREEN was confirmed after, and again immediately before committing. Test output is pristine (no console noise beyond vitest's own unrelated deprecation banner, which also appears on the pre-existing suite).

No issues found. No concerns beyond the ordinary residual risk named in the brief itself (implicit, not something I need to flag further): `hasCueRule`'s check is a lightweight substring match on the header mark rather than a byte-for-byte match of the full `CUE_RULE` string (unlike `carriesCueRule` in `cueArm.mjs`, which answers.mjs itself uses) — the brief calls this out on purpose ("A string rather than an import of the built prompts, so the flight plans without a dist"), so this is an intentional, brief-specified design choice, not a gap I introduced.

## Concerns

None. Work matches the brief exactly; all tests green; tsc error count unchanged; dry run clean; commit contains only the two intended files.
