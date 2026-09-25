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
