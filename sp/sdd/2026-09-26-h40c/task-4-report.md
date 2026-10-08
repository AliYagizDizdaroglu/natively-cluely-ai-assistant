# Task 4 report — the verbal hedge behind `NATIVELY_VERBAL_HEDGE`

## Environment note (deviation from the brief's file-writing instructions)

This implementer's session is a git worktree (`.claude\worktrees\whole-turn`, branch
`feat/whole-turn-answers`) with its own Edit/Write-tool sandboxing, separate from the "MAIN
checkout, git read-only" model the implementer-contract describes. The Edit/Write tools refused
every direct path under MAIN (`C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`),
same failure mode the contract already documents ("If a tool refuses a MAIN path…"). I used
exactly the contract's prescribed workaround for every file: write/edit the full file under
`<SP>\stage\<repo-relative path>`, then copy it into MAIN with the PowerShell
`[IO.File]::WriteAllText(..., text.Replace("\r\n","\n"), UTF8Encoding($false))` pattern (LF-only,
no BOM). All vitest and tsc runs were executed against the real MAIN checkout, from a private
temp cwd (`<SP>\vitest-cwd-t4`), exactly as the standard commands specify. Git was touched
read-only (`git -C <MAIN> status/diff`, via the PowerShell tool as required — the Bash tool's `-C`
form is blocked by this same worktree sandboxing, so I used PowerShell for all git reads).

## Files changed (all under MAIN)

- **New** `electron/llm/verbalHedge.ts` — `VERBAL_HEDGE_ENV`, `VERBAL_HEDGE_TRIGGER_ENV`,
  `DEFAULT_HEDGE_TRIGGER_MS`, `verbalHedgeEnabled()`, `verbalHedgeTriggerMs()`.
- **New** `electron/llm/verbalHedge.test.ts` — 6 tests for the two env functions.
- **New** `electron/LLMHelper.verbalHedge.test.ts` — 13 tests for `streamGeminiWithHedge`
  (adapted fake-stream machinery, see below).
- `electron/LLMHelper.ts` — import of `verbalHedgeEnabled`/`verbalHedgeTriggerMs`; the hedge
  branch at the top of `streamGeminiWithStallFallback` (~line 3391); the new private
  `streamGeminiWithHedge` method placed right after it — code exactly as the brief specified,
  byte-for-byte (I initially rewrote the leg's `.first` construction as an async IIFE with
  try/catch while chasing a spurious test-only warning, then reverted it once the real cause was
  found — see "Deviations" below).
- `electron/llm/WhatToAnswerLLM.ts` — `HEDGE_WINNER` regex beside `STALL_SWITCH`/`GEMMA_HANDOVER`;
  `nameStallSwitch` rewritten exactly as the brief specified (`announce` replacing `switchedTo`,
  the hedge sentinel re-announced verbatim); one added sentence in the doc comment.
- `electron/llm/WhatToAnswerLLM.answeringModel.test.ts` — 3 new tests in a new
  `describe('the hedge winner is named through generateStream, not just LLMHelper', …)` block.
- `electron/main.ts` (~line 2431) — one `console.log(\`[Main] answer source: ${label}\`)` inside
  the `suggested_answer_source` handler.

Confirmed via `git -C <repo> diff --stat` that only these files changed relative to the plan's
task, alongside other implementers' concurrent, disjoint work (`IntelligenceEngine.ts`,
`SessionTracker.*`, `followUpParent.*`, `interview60.*`) which I did not touch.

## TDD sequence and failing-test evidence

1. **`verbalHedge.test.ts` (env module).** Ran first against the not-yet-created module:
   `Error: Failed to resolve import "./verbalHedge" … Does the file exist?` (1 failed suite, 0
   tests run). Implemented `verbalHedge.ts` (copying `firstTokenTimeoutMs`'s parsing shape) →
   green: `Tests 6 passed (6)`.

2. **`LLMHelper.verbalHedge.test.ts` (13 cases, brief's numbering 1–12 plus the default-off
   pin split into two `it`s).** Adapted the fake-stream machinery from
   `WhatToAnswerLLM.answeringModel.test.ts` (`'silent' | 'error' | string[]` plan vocabulary,
   `signals[]`, `asked()`), extended with a `{ after: number; chunks: string[] }` step for a leg
   whose first token is due only after a delay past the trigger (brief cases 3 and 5 need this;
   the existing `'silent'`/`'error'`/array vocabulary can't express "answers, but only after the
   back has already started"). Ran before implementing `streamGeminiWithHedge`:
   `Tests 9 failed | 4 passed (13)` — the 4 that happened to pass were the ones whose old-code
   behaviour coincidentally satisfied the new assertions (e.g. call counts before the sentinel
   check). Implemented the hedge branch + `streamGeminiWithHedge` in `LLMHelper.ts` exactly per
   the brief → `Tests 13 passed (13)`, but the run's exit code was 1 due to a transient
   "PromiseRejectionHandledWarning" (see Deviations). Re-ran `LLMHelper.stallFallback.test.ts`,
   `LLMHelper.abortOnClose.test.ts`, `LLMHelper.emptyStream.test.ts` → all green throughout
   (`Tests 35 passed (35)`, exit 0), confirming the flag-unset path is untouched.

3. **3 new tests in `WhatToAnswerLLM.answeringModel.test.ts`.** Ran before touching
   `WhatToAnswerLLM.ts`: `Tests 3 failed | 12 passed (15)` —
   - `back wins`: `expected 'gemini-3.1-flash-lite' to be 'gemini-3.1-flash-lite (hedge)'`
   - `front wins`: `expected 'gemini-3.1-flash-lite' to be 'gemini-3.5-flash-lite (hedge)'`
   - `both legs 503, then the redirect`: `expected 'gemini-3.5-flash-lite (fallback)' to be
     'gemini-3.5-flash-lite (hedge)'`
   — exactly the "head label names the wrong model" bug class the brief names. Implemented
   `HEDGE_WINNER` + the `nameStallSwitch` rewrite → `Tests 15 passed (15)` (one assertion needed
   adjusting: chunk boundaries don't line up with sentence text after the filter chain re-splits
   tokens, see Deviations).

## Green summary lines (final)

```
electron/llm/verbalHedge.test.ts                    — 6 tests passed
electron/LLMHelper.verbalHedge.test.ts               — 13 tests passed
electron/llm/WhatToAnswerLLM.answeringModel.test.ts  — 15 tests passed (12 pre-existing + 3 new)
electron/LLMHelper.stallFallback.test.ts             — 7 tests passed
electron/LLMHelper.abortOnClose.test.ts              — 12 tests passed
electron/LLMHelper.emptyStream.test.ts               — 4 tests passed
Combined: Test Files 6 passed (6) / Tests 57 passed (57), exit 0
```

## tsc gates

- Root `tsc -p tsconfig.json --noEmit`: exit 0, no errors.
- `tsc -p electron/tsconfig.json --noEmit`: exit 2, exactly the 6 pre-registered pre-existing
  errors (`GeminiLiveRouter.ts(125,44) TS2339`, `ipcHandlers.ts(3433,18/38) TS2339`,
  `ipcHandlers.ts(3436,31) TS2339`, `KnowledgeOrchestrator.ts(349,35)/(351,25) TS2322`) —
  compared by file+code+message, no new errors introduced by this task's files.

## Calibration (rule 8)

1. **`HEDGE_WINNER` branch.** Temporarily changed `nameStallSwitch`'s
   `const m = h ?? STALL_SWITCH.exec(chunk) ?? GEMMA_HANDOVER.exec(chunk);` to drop the `h ??`
   (so the hedge sentinel is no longer recognised — it falls through to
   `stripModelSentinel`, which eats head sentinels). Ran
   `WhatToAnswerLLM.answeringModel.test.ts`: `Tests 3 failed | 12 passed (15)` — exactly the 3
   hedge-label tests (`back wins`, `front wins`, `both legs 503, then the redirect`) failed;
   the 12 pre-existing tests stayed green. Restored the line → `Tests 15 passed (15)`.

2. **`loser.stop.abort()`.** Temporarily commented out
   `if (!loser.settled) loser.stop.abort();` in `streamGeminiWithHedge`. Ran
   `LLMHelper.verbalHedge.test.ts`: `Tests 2 failed | 11 passed (13)` — exactly cases 2
   ("front silent past the trigger: the back starts beside it and wins", asserting
   `signals[0]?.aborted === true`) and 3 ("front answers slowly … back is aborted", asserting
   `signals[1]?.aborted === true`) failed; the other 11 (including the ones that never reach an
   abort, e.g. "front fails … front's signal not aborted") stayed green. Restored the line →
   `Tests 13 passed (13)`.

Both breaks isolated exactly the cases the brief names and nothing else; both restores returned
to the fully green baseline.

## Deviations from the brief, with reasons

1. **One test structural fix, not a code fix — "no unhandled rejection" chase.** The brief
   warns: "Be careful that no promise rejection is left unhandled (an aborted loser's pending
   next() must be caught)." After implementing `streamGeminiWithHedge` exactly per the brief,
   the `LLMHelper.verbalHedge.test.ts` run passed all 13 tests but exited 1, with Node printing
   `PromiseRejectionHandledWarning: Promise rejection was handled asynchronously` during the
   "both legs fail" test. I first suspected the code (`.then(onFulfilled, onRejected)` on
   `gen.next()`) and rewrote it as an async IIFE with try/catch — the warning persisted
   identically (same line, same test). I then isolated the true cause with a series of throwaway
   repro files (`<SP>\repro-unhandled.mjs`, then `electron/zzrepro.test.ts`, copied into MAIN,
   run, and deleted — never committed, never left behind): a single-leg async function that
   races a fake-timer promise and rethrows a captured error reproduces the warning on its own,
   with **no** generator, **no** second leg, and **no** hedge code involved. The actual cause is
   in my TEST, not the implementation: `const out = drain(technical(helper)); await
   vi.advanceTimersByTimeAsync(1); await expect(out).rejects.toThrow(/503/);` creates a promise
   (`out`) and only attaches a rejection handler on the *third* line — and both legs fail fast
   enough (no timer needed) that `out` rejects during the `advanceTimersByTimeAsync(1)` call,
   before any handler is attached. Fix: attach `expect(out).rejects.toThrow(/503/)` immediately
   after creating `out`, before advancing timers (`const rejected = expect(out).rejects.toThrow(/503/); await
   vi.advanceTimersByTimeAsync(1); await rejected;`). With that one-line test change, the
   warning disappeared completely and the run exits 0. I then **reverted `LLMHelper.ts` back to
   the brief's exact `.then(onFulfilled, onRejected)` form** (no functional difference — the
   try/catch version behaved identically once the test was fixed) to stay maximally faithful to
   the given contract. Net effect: the code is exactly as specified; a genuine (if narrow)
   test-authoring lesson is now documented on the one test that hit it.

2. **Chunk-boundary robustness in the WhatToAnswerLLM "back wins" ordering test.** The brief's
   case says "the sentinel chunk index < the index of the chunk containing 'back answered'" —
   my first draft used `chunks.indexOf(...)` / `chunks.findIndex((c) => c.includes(...))`
   directly on the array elements. That failed (`wordsIdx` was `-1`) because the verbal filter
   chain re-splits the underlying text into different chunk boundaries than the single string
   `plan.push` provided. Fixed by comparing positions in `chunks.join('')` instead — same
   ordering assertion, robust to re-chunking, matching how `named()` (an existing helper in the
   same file) already handles multi-chunk sentinels via `matchAll` over the joined-ish stream.

3. **Default-off pin (brief item 10) split into two separate `it` blocks** ("flag unset behaves
   like today" / "an invalid value throws") instead of one `it` with two sequential scenarios —
   easier to read and to attribute a failure to, no functional difference; both scenarios and
   exact expectations are unchanged from the brief.

No other deviations. Winner-sentinel wording, log line formats, call-order assertions, abort
assertions and the `(hedge)`/`(fallback)` label distinction all match the brief's exact text.

## Open concerns

- None outstanding. The task-4 brief's own note that `NATIVELY_VERBAL_HEDGE` is validated by
  `verbalHedgeEnabled()` (throwing on anything but `1`/unset/`''`/`'0'`) was exercised end to end
  through `LLMHelper.streamChat`, not just the unit-level env function — see LLMHelper test
  "default-off pin: an invalid flag value throws, naming the variable, instead of flying
  silently off" (`.rejects.toThrow(/NATIVELY_VERBAL_HEDGE/)`), so the throw is proven reachable
  from the real call path, not just in isolation.
- I did not touch `electron/IntelligenceEngine.ts`, per the controller's instruction that another
  implementer is editing it concurrently.
- Did not run the full suite or `build:electron`, per the implementer contract (that is the
  controller's job after all tasks land).

---

# Fix round 1 (h40c review: SPEC PASS, QUALITY APPROVED, 0 Critical, 0 Important, 7 Minor)

Review: `SD\sdd\2026-09-26-h40c\task-4-review.md`. Reviewer's repro:
`SD\sdd\2026-09-26-h40c\rev4\hedge-repro.mjs` (read, not run — read-only per the review; its
scenarios A-G are cited below by letter). Per the controller: fix M1, M3, M4, M5; leave M2, M6,
M7 for the controller to record. Same worktree-sandboxing note as above applies to every file
touched in this round too (stage → PowerShell copy into MAIN, LF-only, no BOM).

## M1 — the loser was neither aborted nor labelled correctly when both first tokens land in the same tick (LLMHelper.ts:3532-3534)

**Root cause.** `const other = loser.settled ? (loser.settled.kind === 'error' ? 'failed' :
'empty') : 'aborted';` treated any settled loser as either `'failed'` or `'empty'` — a settled
`{kind:'token'}` (the loser also answered, just a tick after the winner) fell into `'empty'`,
and `if (!loser.settled) loser.stop.abort();` then skipped the abort because the loser WAS
settled. The result: a spoken answer nobody reads, its socket and tokens never released, logged
as `other=empty` (repro G: `won by gemini-3.5-flash-lite …; other=empty` with `3.1=false`
aborted).

**Test first (TDD).** Added
`LLMHelper.verbalHedge.test.ts` › "M1 (h40c review): both legs first tokens land in the same
tick after the trigger — the loser is still aborted, and labelled aborted, not empty". The brief
for this round says "add a test that forces both first tokens in the same macrotask if the fake
stream can express it, else cite repro G" — it IS expressible: extended the fake with a
`{ gate: Promise<void>; chunks: string[] }` step (front and back both `await` the SAME externally
resolved promise), so resolving the gate lands both `leg.first` resolutions in the same
microtask turn, deterministically (front's `await gate` reaction was attached first, so it
resumes first, but both settle before either `.then` in the winner-race fires). Ran against the
UNFIXED code: **`expected false to be true`** (`signals[loserIdx]?.aborted`) — reproduced on the
first try, no flakiness observed across the runs in this session.

**Fix** (LLMHelper.ts:3532-3536), the reviewer's two lines verbatim:
```ts
const other = loser.settled?.kind === 'error' ? 'failed' : loser.settled?.kind === 'empty' ? 'empty' : 'aborted';
if (loser.settled?.kind !== 'error' && loser.settled?.kind !== 'empty') loser.stop.abort();
```
Re-ran the same test → green. Full file: `Tests 16 passed (16)`.

## M3 — a junk flag value only surfaced mid-interview, on every answer (LLMHelper.ts:3395)

**Fix.** Kept the per-call throw inside `streamGeminiWithHedge` unchanged (per-answer defence in
depth). Added, in `electron/main.ts`, right after `console.log("App is ready")` and before
`appState.createWindow()` — i.e. before the `NATIVELY_AUTOSTART_MEETING` block, the earliest
point a meeting can start, and the closest thing this file has to a "startup config" checkpoint
(main.ts logs individual pieces of runtime state as it initializes them, e.g. the STT provider
override at line ~1094, but has no single dedicated "config validation" section to slot into —
this is a judgment call, flagged as such rather than asserted as the one obviously-correct
spot):
```ts
{
  const hedgeOn = verbalHedgeEnabled()
  const hedgeTriggerMs = verbalHedgeTriggerMs()
  console.log(hedgeOn ? `[Main] verbal hedge: on trigger=${hedgeTriggerMs}ms` : '[Main] verbal hedge: off')
}
```
Both functions are called unconditionally (even when the flag is off), so a junk
`NATIVELY_VERBAL_HEDGE_TRIGGER_MS` is also caught at launch, not only once the hedge is later
turned on. A bad value now throws during `app.whenReady()` startup, before any window or
meeting — matching the fail-loud-at-the-boundary rule and giving Task 7/8 a
before-the-first-question log line proving the flag reached the process. No test: main.ts has
none (per the original brief and the implementer contract); the throw behaviour itself is
already covered by `verbalHedge.test.ts`'s `verbalHedgeEnabled`/`verbalHedgeTriggerMs` cases —
this call site is a thin, direct pass-through with no added logic to unit-test in isolation.

## M4 — test gaps in `LLMHelper.verbalHedge.test.ts` (M4 list, all four addressed)

- **Per-step error text.** Replaced the bare `'error'` plan step with `{ error: string }`
  everywhere it was used (cases "front fails…", "front is slow, back fails…", "both legs
  fail…"), each leg now given distinct text (`'503 front'` / `'503 back'`, or `'503 front
  late'` / `'503 back late'` for the new trigger-path case below).
- **Case 6 ("both legs fail")**: now asserts `asked()` equals `['gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite']`; asserts the rejection is specifically `/503 front/` (proving the
  FRONT's error propagated, not the back's — a shared error text would have let `throw b.err`
  pass the old assertion too); asserts the `no answer - front error, back error` warn line.
  Ran against the pre-fix-round code (both changes are test-only, so "before/after" here means
  before/after this round's test edit, not a code change): the old assertion (`/503/` only) was
  too weak to distinguish; the new one is exact.
- **Case 9 ("closing on the winner's sentinel")**: added `expect(asked()).toEqual(['gemini-3.5-flash-lite'])`.
- **New test — trigger-path variant of case 9**: "trigger path, closing on the winners sentinel:
  both legs end up aborted" — front `'silent'`, back speaks after the trigger; the test drives
  the generator by hand (`gen.next()` then `gen.return()`) to close right on the sentinel while
  BOTH legs are (or were) in flight, and asserts `signals[0]` (front, the loser — aborted by the
  ordinary winner-selection logic) AND `signals[1]` (back, the winner — aborted by `deliver`'s
  close-on-undelivered-sentinel finally) are both `true`. This is the "closing on the sentinel
  after the trigger, with two legs in flight" case the review names (repro D).
- **New test — "both legs fail on the trigger path"**: front `{ after: 6000, error: … }`, back
  `{ after: 2000, error: … }` (back's delay counted from ITS OWN start at the 5000 ms trigger, so
  it settles at ~7000 ms, after front's ~6000 ms) — this exercises the `legs = [front, back]`,
  `alive` countdown from 2 branch of the `!winner` path, distinct from case 6 (which never
  reaches the trigger: the front's own pre-token failure decides the race first, so only the
  back is raced in, `alive` counts down from 1). Asserts `asked()`, the rejection text, and the
  warn line.
- **`'silent'` now abort-aware.** The fake's `'silent'` branch listens for the request's abort
  signal and rejects with `Object.assign(new Error('aborted'), { name: 'AbortError' })`, instead
  of hanging forever unconditionally — matching the review's fake SDK (`hedge-repro.mjs`'s
  `fakeSdk`) and the real SDK's behaviour on a pending fetch/body read. Verified this doesn't
  regress the EXISTING cases that use `'silent'` as the loser (2 and 3): both still assert
  `signals[i].aborted === true`, which holds regardless of whether the leg's OWN promise ever
  settles, and no new unhandled-rejection warnings appeared (`.then(onFulfilled, onRejected)` on
  `gen.next()` was already attached synchronously in `start()` before any abort can happen).

All 16 tests in `LLMHelper.verbalHedge.test.ts` green (13 original + 3 net-new: M1's test, the
trigger-path close-on-sentinel test, the both-legs-fail-on-trigger-path test).

## M5 — environment hygiene: `NATIVELY_VERBAL_HEDGE` never cleared in today's-race test files

**Calibration first (rule 8), proving the bug before touching anything**: ran the four affected
files with `NATIVELY_VERBAL_HEDGE=yes` set in the shell (as a flight or smoke shell would leave
it) — `Test Files 3 failed | 1 passed (4)` / `Tests 21 failed | 17 passed (38)`. Exactly the
files and counts the review named: `LLMHelper.stallFallback.test.ts` 7/7 failed,
`LLMHelper.abortOnClose.test.ts` 6/12 failed (only the `'Gemini stream aborts on early close'`
describe — the Gemma describe never reaches the hedge branch), `WhatToAnswerLLM.answeringModel.test.ts`
8/15 failed (only the first, pre-existing describe — the new hedge describe already sets the
flag itself). `LLMHelper.emptyStream.test.ts` passed regardless (Gemma-only paths, never reaches
`streamGeminiWithStallFallback`'s hedge branch) — left it with the same hygiene fix anyway, for
consistency and because a future case in that file could reach the Flash fallback.

**Fix**, `delete process.env.NATIVELY_VERBAL_HEDGE` in each affected describe's `beforeEach`,
saved/restored in `afterEach` (the pattern `LLMHelper.verbalHedge.test.ts` already used):
- `LLMHelper.stallFallback.test.ts` — its one describe block.
- `LLMHelper.abortOnClose.test.ts` — both describe blocks (`'Gemini stream aborts on early
  close'` and `'Gemma guarded stream aborts on early close'`).
- `LLMHelper.emptyStream.test.ts` — its one describe block (had no `afterEach` at all before
  this; added one, and added `afterEach` to the vitest import).
- `WhatToAnswerLLM.answeringModel.test.ts` — the FIRST (pre-existing) describe block got the
  same save/delete/restore treatment; the SECOND (this task's own new hedge describe) was
  changed from an unconditional `delete process.env.NATIVELY_VERBAL_HEDGE` in `afterEach` to
  save-and-restore (M5's second finding: "deletes the variable instead of restoring its saved
  value" — a bare delete would clobber a value the shell had set for a reason).

**Re-ran the same "junk env var in the shell" repro after the fix**: `Test Files 4 passed (4)` /
`Tests 38 passed (38)`, exit 0 — the four files are now immune to whatever the shell has
`NATIVELY_VERBAL_HEDGE` set to.

## Full verification after all four fixes

- Combined run (`verbalHedge.test.ts`, `LLMHelper.verbalHedge.test.ts`,
  `WhatToAnswerLLM.answeringModel.test.ts`, `LLMHelper.stallFallback.test.ts`,
  `LLMHelper.abortOnClose.test.ts`, `LLMHelper.emptyStream.test.ts`), clean shell:
  `Test Files 6 passed (6)` / `Tests 60 passed (60)`, exit 0 (57 from the original report + 3
  net-new from M1/M4).
- Root `tsc -p tsconfig.json --noEmit`: exit 0.
- `tsc -p electron/tsconfig.json --noEmit`: exit 2, exactly the same 6 pre-registered
  pre-existing errors as before this round — one NEW error was introduced and fixed along the
  way (`LLMHelper.verbalHedge.test.ts(67,70) TS2769`, from the `DelayedStep` union's `.after`
  not narrowing through the `'after' in streamed` guard without an explicit cast); fixed by
  binding `const delayed = streamed as DelayedStep;` right after the guard so both branches
  (`{after,chunks}` and `{after,error}`) narrow correctly afterward. Re-ran tsc: back to exactly
  the 6 known errors.
- `git -C <repo> status --porcelain` / `diff --stat` reconfirmed only this task's files changed
  (plus other implementers' concurrent, disjoint work): `LLMHelper.ts` (+95/-9 net from both
  rounds), `LLMHelper.verbalHedge.test.ts` (new), `LLMHelper.stallFallback.test.ts` (+6),
  `LLMHelper.abortOnClose.test.ts` (+10), `LLMHelper.emptyStream.test.ts` (+11/-2),
  `llm/WhatToAnswerLLM.answeringModel.test.ts` (+62), `llm/WhatToAnswerLLM.ts` (unchanged this
  round), `main.ts` (+13 net from both rounds), `llm/verbalHedge.ts`/`llm/verbalHedge.test.ts`
  (unchanged this round).

## Deviations this round

None beyond the tsc narrowing fix noted above (test-only, no behavioural change) and the M3
placement judgment call (flagged in that section, not asserted as definitively "the" startup
config spot since main.ts has no single existing section by that name).

## Left for the controller (per instruction, not touched)

- **M2** — a superseded answer with both legs pending keeps both running until one speaks; the
  review already recommends recording this as a residual risk in the pre-registration rather
  than fixing it now (a hard cap would be a policy change needing its own probe).
- **M6** — a both-legs-failure redirect re-runs the same pair; review's fix is "none needed for
  h40c; the controller should note it" (flight stats should count a redirect's hedge as a second
  hedge within the same answer).
- **M7** — flight-instrument model misattribution under the hedge, outside Task 4's files
  (Tasks 7/8's concern).

## Status

DONE_WITH_CONCERNS is not needed — all four assigned fixes (M1, M3, M4, M5) are implemented,
tested where a test applies, calibrated (M1's new test shown failing before the fix; M5's fix
shown closing the exact 21-test failure the review measured), and green end to end.

---

# Fix round 2 (re-review: ALL FINDINGS ADDRESSED: NO — M1/M4/M5 accepted, M3 only partly
addressed, plus N1 Important and N2 Minor)

Re-review: `SD\task-4-rereview.md`. Fixed N1 and N2 (the two remaining/new findings the
controller assigned); M1/M4/M5 needed no further work (the re-review confirmed them addressed).
Same worktree-sandboxing workflow as both rounds above (stage → PowerShell copy into MAIN,
LF-only, no BOM).

## N1 (Important) — a bad startup value left a windowless zombie holding the single-instance lock

**Root cause.** Fix round 1's validation block ran inside `async initializeApp()`, called as
`initializeApp().catch(console.error)` — a throw there was swallowed by that `.catch`, skipping
everything after it in the function (`createWindow()`, the tray, global shortcuts, the
`NATIVELY_AUTOSTART_MEETING` block, and the quit-time handlers registered later in the same
function) while the process stayed alive holding `requestSingleInstanceLock()`. The re-review
also flagged that the block read `NATIVELY_VERBAL_HEDGE_TRIGGER_MS` even with the hedge flag
unset — a behaviour change from before round 1 existed (a junk trigger value used to be inert
when the flag was off).

**Fix**, per the coordinator's exact instructions:

1. **Moved** the block from just before `appState.createWindow()` to right after the log-file
   reset (`main.ts`, now ~3432, immediately after the log-file `try { … } catch { /* non-fatal
   */ }`), i.e. after `await app.whenReady()` (so the log file already exists to write into) and
   before credentials, IPC or any window are touched.
2. **Extracted the validate-and-describe logic** into `electron/llm/verbalHedge.ts` as
   `describeVerbalHedgeAtStartup(env): string` — the coordinator's suggested escape hatch, taken
   because main.ts has no test file and mocking the electron surface just to exercise one
   startup branch would be far more machinery than the logic warrants. TDD: wrote 5 new tests in
   `verbalHedge.test.ts` first (off + junk trigger never read; on + default trigger; on +
   overridden trigger; on + junk trigger throws; junk enabled value throws) — ran red (`5 failed
   | 6 passed (11)`, the function didn't exist), implemented the function, ran green (`Tests 11
   passed (11)`).
3. **The trigger is read ONLY when the hedge is on** — `describeVerbalHedgeAtStartup` calls
   `verbalHedgeTriggerMs()` inside the `if (verbalHedgeEnabled(env))` branch only, so an unset
   flag is exactly today's behaviour apart from the one `[Main] verbal hedge: off` log line
   (pinned by the "off (unset): the off line, and a junk trigger is never read" test, which sets
   a non-numeric `NATIVELY_VERBAL_HEDGE_TRIGGER_MS` and confirms no throw).
4. **main.ts's part is now exactly the try/catch + exit** the coordinator specified:
   ```ts
   try {
     console.log(describeVerbalHedgeAtStartup())
   } catch (e) {
     console.error(`[Main] ${(e as Error).message} — refusing to start`)
     app.exit(1)
     return
   }
   ```
   No modal dialog. `app.exit(1)` releases the single-instance lock; the `return` stops the rest
   of `initializeApp` (credentials, IPC, window, tray, autostart, quit handlers) from running.
5. **Calibration item 4** (launch with `NATIVELY_VERBAL_HEDGE=yes`, confirm the process exits,
   the refusing line lands in `natively_debug.log`, and a corrected relaunch opens normally) is
   explicitly a *live* Electron-app exercise — the implementer contract forbids starting the app
   from this session ("Never start the Electron app from a Claude session"), and the coordinator
   named it as happening "later in the scheduled smoke". **Noting it as pending**, per the
   coordinator's message — not run in this session.

## N2 (Minor) — the new answeringModel hedge describe never cleared `NATIVELY_VERBAL_HEDGE_TRIGGER_MS`

**Calibration first.** Set `NATIVELY_VERBAL_HEDGE_TRIGGER_MS=not-a-number` in the shell and ran
`WhatToAnswerLLM.answeringModel.test.ts`: `Tests 3 failed | 12 passed (15)` — exactly the 3 hedge
label tests (this describe sets `NATIVELY_VERBAL_HEDGE='1'`, so it reads the trigger and throws
on the junk value), matching the re-review's "makes its 3 label tests throw".

**Fix**, the same save/delete/restore pattern `LLMHelper.verbalHedge.test.ts` already uses for
this variable: added `const savedTrigger = process.env.NATIVELY_VERBAL_HEDGE_TRIGGER_MS;`,
`delete process.env.NATIVELY_VERBAL_HEDGE_TRIGGER_MS;` in `beforeEach`, and the matching
save/restore branch in `afterEach`, in the `'the hedge winner is named through generateStream,
not just LLMHelper'` describe.

**Re-ran the same junk-trigger repro after the fix**: `Test Files 1 passed (1)` /
`Tests 15 passed (15)`, exit 0.

## Full verification after N1 + N2

- The six hedge-related test files, clean shell: `Test Files 6 passed (6)` / `Tests 65 passed
  (65)`, exit 0 (60 from fix round 1 + 5 new `describeVerbalHedgeAtStartup` tests).
- Root `tsc -p tsconfig.json --noEmit`: exit 0.
- `tsc -p electron/tsconfig.json --noEmit`: exit 2, exactly the same 6 pre-registered
  pre-existing errors as every prior check this task — no new errors, including from the
  `main.ts` block move and the new `verbalHedge.ts` export.
- `git -C <repo> diff --stat` for this round's touched files: `main.ts` +19 (net, this round:
  removed the 10-line round-1 block, added the 15-line relocated try/catch block plus the import
  line), `llm/WhatToAnswerLLM.answeringModel.test.ts` +67 net (this round's 3-line
  save/delete/restore addition on top of round 1's block); `llm/verbalHedge.ts` and
  `llm/verbalHedge.test.ts` remain untracked new files (their diff doesn't show under `--stat`
  against a non-existent base, which is expected for new files — `git status --porcelain`
  confirms them as `??`, unchanged in kind from before this round, just larger).
- `git -C <repo> status --porcelain` reconfirmed no unintended files touched.

## Deviations this round

None. N1's placement, extraction, conditional trigger read, and exit behaviour, and N2's fix, all
match the coordinator's instructions exactly. The one item NOT done is explicitly out of scope
for a non-interactive session (N1's live calibration, item 4) and is called out above as
pending, per the coordinator's own framing ("The live check of the exit path happens later in
the scheduled smoke — note it as pending").

## Status

All items from this round (N1, N2) are implemented, tested (N1 via the new
`describeVerbalHedgeAtStartup` unit tests plus the moved main.ts wiring; N2 via the
save/delete/restore fix, calibrated against the exact failure the re-review measured), and green
end to end except for N1's live scheduled-smoke check, which is pending as instructed.
