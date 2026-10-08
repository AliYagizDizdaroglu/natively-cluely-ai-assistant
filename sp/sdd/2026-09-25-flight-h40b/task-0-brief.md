### Task 0: Deterministic policy tests (fake timers)

**Files:**
- Modify: `electron/test/golden/hedge-live.policy.test.ts` — stage the new content at `<SP>\stage\electron\test\golden\hedge-live.policy.test.ts`, then copy it into MAIN with PowerShell, LF line endings, UTF-8 without BOM.
- Reads (unchanged): `electron/test/golden/hedge-live.policy.mjs`

**Interfaces:**
- Consumes: `runToday({ ask, primary, fallback, stallMs })` and `runHedge({ ask, front, back, triggerMs })` from `hedge-live.policy.mjs`; both resolve `{ wait, by, extra, legs }` with `legs[i] = { model, startedAt, ttft, at, error?, aborted? }`.
- Produces: the same 10 tests, now exact under vitest fake timers, green alone and inside the full suite.

**Problem.** Committed as `af5e279`, the file passes alone (10/10) but 2 of its `near(..., 40 ms)` timing assertions fail when the whole suite runs in parallel: real timers fire late under load. A check that flakes under load cannot be believed.

- [ ] **Step 1: Stage the new test file** — the complete content:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// @ts-ignore — untyped ESM harness module
import { runToday, runHedge } from './hedge-live.policy.mjs';

// Fake timers: every setTimeout in the policies and in the fake ask runs on vitest's clock, and
// Date.now() follows it, so each wait is exact and the full suite's load cannot drift a timing.
type Plan = Record<string, { tokenAt?: number; errorAt?: number }>;
/** A fake ask: a token at tokenAt, or a failure at errorAt; an abort resolves at once as aborted. */
const fakeAsk = (plan: Plan) => (model: string, signal: AbortSignal) => new Promise<any>((resolve) => {
    const p = plan[model];
    const timer = setTimeout(() => resolve(p.tokenAt != null ? { ttft: p.tokenAt } : { ttft: null, error: 'HTTP 503' }), p.tokenAt ?? p.errorAt);
    signal.addEventListener('abort', () => { clearTimeout(timer); resolve({ ttft: null, aborted: true }); });
});
const leg = (r: any, model: string) => r.legs.find((l: any) => l.model === model);
const P = 'primary-model', F = 'fallback-model';   // the policies treat model names as opaque
/** Starts a policy, runs every timer to completion on the fake clock, returns its result. */
const settle = async (p: Promise<any>) => { await vi.runAllTimersAsync(); return p; };
const today = (plan: Plan) => settle(runToday({ ask: fakeAsk(plan), primary: P, fallback: F, stallMs: 200 }));
const hedge = (plan: Plan) => settle(runHedge({ ask: fakeAsk(plan), front: F, back: P, triggerMs: 100 }));
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('today: primary first, fallback on error or at the stall', () => {
    it('answers from the primary when it speaks before the stall', async () => {
        const r = await today({ [P]: { tokenAt: 60 }, [F]: { tokenAt: 10 } });
        expect(r.by).toBe(P); expect(r.wait).toBe(60); expect(r.extra).toBe(false); expect(r.legs).toHaveLength(1);
    });
    it('starts the fallback at once when the primary fails', async () => {
        const r = await today({ [P]: { errorAt: 30 }, [F]: { tokenAt: 50 } });
        expect(r.by).toBe(F); expect(r.wait).toBe(80); expect(r.extra).toBe(true);
        expect(leg(r, P).error).toBe('HTTP 503'); expect(leg(r, F).startedAt).toBe(30);
    });
    it('aborts a silent primary at the stall and takes the fallback', async () => {
        const r = await today({ [P]: { tokenAt: 600 }, [F]: { tokenAt: 50 } });
        expect(r.by).toBe(F); expect(r.wait).toBe(250); expect(leg(r, P).aborted).toBe(true);
    });
    it('has no answer when both fail', async () => {
        const r = await today({ [P]: { errorAt: 30 }, [F]: { errorAt: 30 } });
        expect(r.wait).toBeNull(); expect(r.by).toBe('none'); expect(r.extra).toBe(true);
    });
});

describe('hedge: front first, back alongside at the trigger, first token wins', () => {
    it('answers from the front alone when it speaks before the trigger', async () => {
        const r = await hedge({ [F]: { tokenAt: 60 }, [P]: { tokenAt: 10 } });
        expect(r.by).toBe(F); expect(r.wait).toBe(60); expect(r.extra).toBe(false); expect(r.legs).toHaveLength(1);
    });
    it('the back wins when the front is slow, and the front is aborted', async () => {
        const r = await hedge({ [F]: { tokenAt: 300 }, [P]: { tokenAt: 50 } });
        expect(r.by).toBe(P); expect(r.wait).toBe(150); expect(r.extra).toBe(true);
        expect(leg(r, P).startedAt).toBe(100); expect(leg(r, F).aborted).toBe(true);
    });
    it('the front still wins after the trigger when it speaks first, and the back is aborted', async () => {
        const r = await hedge({ [F]: { tokenAt: 130 }, [P]: { tokenAt: 100 } });
        expect(r.by).toBe(F); expect(r.wait).toBe(130); expect(r.extra).toBe(true); expect(leg(r, P).aborted).toBe(true);
    });
    it('starts the back at once when the front fails', async () => {
        const r = await hedge({ [F]: { errorAt: 30 }, [P]: { tokenAt: 50 } });
        expect(r.by).toBe(P); expect(r.wait).toBe(80); expect(leg(r, P).startedAt).toBe(30);
    });
    it('a failed back leaves the front to finish', async () => {
        const r = await hedge({ [F]: { tokenAt: 400 }, [P]: { errorAt: 50 } });
        expect(r.by).toBe(F); expect(r.wait).toBe(400); expect(leg(r, P).error).toBe('HTTP 503');
    });
    it('has no answer when both fail', async () => {
        const r = await hedge({ [F]: { errorAt: 30 }, [P]: { errorAt: 30 } });
        expect(r.wait).toBeNull(); expect(r.by).toBe('none');
    });
});
```

Copy into MAIN (PowerShell):

```powershell
$sp = "C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad"; $m = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path; $rel = 'electron\test\golden\hedge-live.policy.test.ts'; [IO.File]::WriteAllText((Join-Path $m $rel), [IO.File]::ReadAllText("$sp\stage\$rel").Replace("`r`n", "`n"), (New-Object System.Text.UTF8Encoding($false)))
```

- [ ] **Step 2: Run the file alone** — `Push-Location $m; node node_modules/vitest/vitest.mjs run electron/test/golden/hedge-live.policy.test.ts; Pop-Location` → `Tests  10 passed (10)`. If `vi.useFakeTimers()` leaves `Date` real in this vitest (2.1.9), pass `vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })`; the `startedAt` assertions are what would fail.

- [ ] **Step 3: Calibrate** — in MAIN's `hedge-live.policy.mjs` replace `if (winner) winner.other.abort();` with `if (winner) {}` (PowerShell string replace on the file), run the file: exactly the two "aborted" tests fail; restore the original line (the staged copy at `<SP>\stage\electron\test\golden\hedge-live.policy.mjs` is the pristine source; copy it back, LF), run again: 10 passed. The module's hash must equal the staged copy afterwards.

- [ ] **Step 4: The full suite from MAIN's root** — `node node_modules/vitest/vitest.mjs run` → `Test Files  87 passed (87)` and `Tests  792 passed` (5 skipped are fine) with 0 failed. Quote the `Tests` line in the report. Do not run it between 19:30–19:55 or 21:30–21:55 local (the hedge probe's windows).

- [ ] **Step 5: No commit** — the controller commits with the private-index script (MAIN's index is shared with other sessions). Report the staged path, the MAIN path, and the test output.

