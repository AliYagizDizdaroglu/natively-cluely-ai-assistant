# Task 0 report: Deterministic policy tests (fake timers)

## What I implemented

Replaced `electron/test/golden/hedge-live.policy.test.ts` in MAIN with the brief's fake-timer
version, verbatim (Step 1 content). Summary of the change (see full diff below):

- Added `beforeEach(() => vi.useFakeTimers())` / `afterEach(() => vi.useRealTimers())`.
- Added a `settle()` helper that runs the policy under test, awaits `vi.runAllTimersAsync()`,
  and returns the policy's result — every `setTimeout` in `hedge-live.policy.mjs` and in the
  test's `fakeAsk` now resolves on vitest's fake clock instead of the wall clock.
- Removed the `near(x, want, tolerance)` ±40ms helper and switched every timing assertion
  (`r.wait`, `leg(...).startedAt`) to an exact `toBe()`, since the fake clock makes the values
  exact rather than approximate.
- The 10 tests, their descriptions, and their `today`/`hedge` plan inputs are unchanged from the
  committed `af5e279` version — only the timer mechanism and the assertion exactness changed.
- `electron/test/golden/hedge-live.policy.mjs` (the module under test) was not changed in the
  final state — see the hash check below. It was edited transiently for the Step 3 calibration
  and restored before any further steps.

`vi.useFakeTimers()` faked `Date` by default in this vitest (2.1.9) — the fallback
`{ toFake: ['setTimeout', 'clearTimeout', 'Date'] }` option named in the brief as a contingency
was not needed. Confirmed empirically: the `startedAt` assertions (which depend on `Date.now()`
tracking the fake clock) passed exactly on the first run.

## What I tested

**1. The file alone (Step 2), before any calibration:**
```
 ✓ electron/test/golden/hedge-live.policy.test.ts (10 tests) 21ms

 Test Files  1 passed (1)
      Tests  10 passed (10)
```

**2. Calibration — broken module (Step 3a):** in MAIN's `hedge-live.policy.mjs`, replaced the
one occurrence of `if (winner) winner.other.abort();` with `if (winner) {}` (verified exactly 1
match before replacing), then ran the file:
```
 ❯ electron/test/golden/hedge-live.policy.test.ts (10 tests | 2 failed) 43ms
   × hedge: front first, back alongside at the trigger, first token wins > the back wins when the front is slow, and the front is aborted 13ms
     → expected undefined to be true // Object.is equality
   × hedge: front first, back alongside at the trigger, first token wins > the front still wins after the trigger when it speaks first, and the back is aborted 3ms
     → expected undefined to be true // Object.is equality

 Test Files  1 failed (1)
      Tests  2 failed | 8 passed (10)
```
Exactly the two tests whose only unmet assertion is `leg(r, ...).aborted).toBe(true)` failed
(both `expected undefined to be true` — the never-aborted loser leg has no `aborted` field). No
other test's assertions were affected, since `r.by`/`r.wait`/`r.extra`/`startedAt` in those two
tests don't depend on the abort call, and the un-aborted leg's own timer still fires on the fake
clock (via `vi.runAllTimersAsync()`), so nothing hung.

**3. Calibration — restored module (Step 3b):** copied the pristine `.mjs` back from
`<SP>\stage\electron\test\golden\hedge-live.policy.mjs` (CRLF→LF, UTF-8 no BOM), then ran again:
```
 ✓ electron/test/golden/hedge-live.policy.test.ts (10 tests) 34ms

 Test Files  1 passed (1)
      Tests  10 passed (10)
```
Module hash after restore: `DDB169BE74893AFEF0C5E71703F98A8FF8C74114F6DE6AD3EF240E54808D3913`
(SHA256), identical to the pristine staged copy's hash (same value) both before my edit and
after the restore.

**4. Full suite from MAIN's root (Step 4)**, run at 18:40 local (outside both forbidden windows):
```
 Test Files  87 passed (87)
      Tests  792 passed (792)
   Start at  18:40:52
   Duration  66.80s (transform 30.44s, setup 0ms, collect 235.01s, tests 28.47s, environment 560.08s, prepare 46.47s)
```
0 failed, 0 skipped (the brief allowed up to 5 skipped; there happened to be none). No `FAIL`,
`✕`/`×`, or "Failed Tests" markers anywhere in the run output. My file's line inside the full,
parallel run: `✓ electron/test/golden/hedge-live.policy.test.ts (10 tests) 86ms` — passing at
86ms even under full-suite load, versus the 2/10 real-timer failures the brief reports for the
committed `af5e279` version under the same conditions.

## Files changed

- Staged: `<SP>\stage\electron\test\golden\hedge-live.policy.test.ts` (overwritten with the
  brief's new content — it held a stale, real-timer copy before this task; see Issues below).
- MAIN: `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\electron\test\golden\hedge-live.policy.test.ts`
  (4542 bytes, LF-only, no BOM — verified by byte inspection).
- MAIN's `hedge-live.policy.mjs`: edited transiently for calibration, restored; final SHA256
  `DDB169BE74893AFEF0C5E71703F98A8FF8C74114F6DE6AD3EF240E54808D3913` matches the pristine staged
  copy at `<SP>\stage\electron\test\golden\hedge-live.policy.mjs` exactly. `git status` in MAIN
  shows no diff for this file (only the `.test.ts` file is modified).

## Self-review findings

- Traced all 10 tests by hand against `hedge-live.policy.mjs`'s actual control flow (both
  `runToday` and `runHedge`) before running anything, to confirm every exact-value assertion
  (`wait`, `by`, `extra`, `legs.length`, `startedAt`, `aborted`, `error`) is the value the module
  actually produces under the fake clock, not just a plausible-looking number. All matched.
- Confirmed the two tests that fail under the Step 3 calibration are exactly the two whose only
  behavior-under-test is "the loser leg gets aborted" — i.e., the tests exercise the abort call
  specifically, not just incidentally. This is real coverage of `winner.other.abort()`, not a
  coincidental assertion.
- Test output is pristine: neither the solo run nor the full-suite run produced any
  stdout/stderr from this file (many other files in the suite log expected console output by
  design; this one logs nothing, which is correct for a pure-function policy test).
- Diff is minimal and surgical: only timer/assertion mechanics changed; no test descriptions,
  plan inputs, or structure changed beyond what fake timers require.
- Found (not fixed, out of scope): the scratchpad's `stage/.../hedge-live.policy.test.ts` held a
  stale copy of the OLD real-timer/`near()`-tolerance test file (matching committed `af5e279`)
  before I overwrote it in Step 1 — apparently left over from earlier exploration, not the
  brief's new content. I overwrote it with the brief's exact content per Step 1; flagging in
  case the discrepancy matters to the controller's provenance tracking.

## Issues or concerns

None. All four verification stages match the brief's expected output exactly (Step 4 even beats
the brief's tolerance: 0 skipped instead of up to 5). No prohibited files were read or copied,
no commit was made, and the module is confirmed byte-identical to the pristine copy.
