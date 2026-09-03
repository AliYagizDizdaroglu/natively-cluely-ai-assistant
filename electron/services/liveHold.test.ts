import { describe, it, expect, vi, afterEach } from 'vitest';
import { createLiveHold } from './liveHold';
import { isFragment } from './questionShape';

afterEach(() => {
    vi.useRealTimers();
});

describe('createLiveHold', () => {
    it('does not resolve immediately on offer', () => {
        vi.useFakeTimers();
        const onResolve = vi.fn();
        const hold = createLiveHold<{ id: string }>({ holdMs: 2500, onResolve });
        hold.offer({ id: 'a' });
        expect(onResolve).not.toHaveBeenCalled();
    });

    it('held then released by the timer once holdMs elapses', () => {
        vi.useFakeTimers();
        const onResolve = vi.fn();
        const hold = createLiveHold<{ id: string }>({ holdMs: 2500, onResolve });
        hold.offer({ id: 'a' });

        vi.advanceTimersByTime(2499);
        expect(onResolve).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(onResolve).toHaveBeenCalledTimes(1);
        expect(onResolve).toHaveBeenCalledWith({ id: 'a' });
    });

    it('released early by an interviewer final, which also cancels the timer (no double-resolve)', () => {
        vi.useFakeTimers();
        const onResolve = vi.fn();
        const hold = createLiveHold<{ id: string }>({ holdMs: 2500, onResolve });
        hold.offer({ id: 'a' });

        vi.advanceTimersByTime(500);
        hold.onInterviewerFinal();
        expect(onResolve).toHaveBeenCalledTimes(1);
        expect(onResolve).toHaveBeenCalledWith({ id: 'a' });

        // The original 2500ms timer must not also fire later.
        vi.advanceTimersByTime(5000);
        expect(onResolve).toHaveBeenCalledTimes(1);
    });

    it('onInterviewerFinal() with nothing pending is a no-op', () => {
        vi.useFakeTimers();
        const onResolve = vi.fn();
        const hold = createLiveHold<{ id: string }>({ holdMs: 2500, onResolve });
        hold.onInterviewerFinal();
        expect(onResolve).not.toHaveBeenCalled();
    });

    it('superseded by a second Live detection: offer() returns the first and restarts the timer from zero', () => {
        vi.useFakeTimers();
        const onResolve = vi.fn();
        const hold = createLiveHold<{ id: string }>({ holdMs: 2500, onResolve });

        const supersededByFirst = hold.offer({ id: 'a' });
        expect(supersededByFirst).toBeNull();

        vi.advanceTimersByTime(1000);
        const supersededBySecond = hold.offer({ id: 'b' });
        expect(supersededBySecond).toEqual({ id: 'a' });

        // 'a' is gone for good — only 'b' resolves, and only after a FRESH
        // 2500ms from the second offer (not the first's remaining ~1500ms):
        // total elapsed since 'b' was offered must reach 2500, not 2500 since 'a'.
        vi.advanceTimersByTime(2499);
        expect(onResolve).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(onResolve).toHaveBeenCalledTimes(1);
        expect(onResolve).toHaveBeenCalledWith({ id: 'b' });
    });

    it('cancelled: cancel() drops the pending hold without ever resolving it', () => {
        vi.useFakeTimers();
        const onResolve = vi.fn();
        const hold = createLiveHold<{ id: string }>({ holdMs: 2500, onResolve });
        hold.offer({ id: 'a' });
        hold.cancel();

        vi.advanceTimersByTime(10_000);
        expect(onResolve).not.toHaveBeenCalled();
    });

    it('cancel() then a later interviewer final is also a no-op', () => {
        vi.useFakeTimers();
        const onResolve = vi.fn();
        const hold = createLiveHold<{ id: string }>({ holdMs: 2500, onResolve });
        hold.offer({ id: 'a' });
        hold.cancel();
        hold.onInterviewerFinal();
        expect(onResolve).not.toHaveBeenCalled();
    });

    // Regression: electron/main.ts's dispatchDetection() holds a Live detection
    // whenever verdict === 'unverifiable', and its onResolve callback
    // (reconcileAndDispatchLive) re-enters dispatchDetection with a freshly
    // reconciled verdict. Because resolveNow() nulls `pending` *before* calling
    // onResolve, a re-offer made from inside onResolve always sees
    // previous === null — so if the STT window is still empty and the fresh
    // verdict is unverifiable again, the old dispatchDetection guard held it
    // AGAIN: no dispatch line, a brand new timer, forever. main.ts itself has
    // no test harness (Electron entry point), so this mirrors the fixed
    // dispatchDetection contract — a `resolving` flag that must skip the hold
    // branch exactly once — using createLiveHold directly, the same way the
    // bug was originally verified against the compiled module.
    it('a detection that resolves to unverifiable again is dispatched exactly once, never re-held', () => {
        vi.useFakeTimers();
        const dispatched: string[] = [];
        let hold: ReturnType<typeof createLiveHold<{ id: string; verdict: string }>>;

        function dispatchDetection(d: { id: string; verdict: string }, resolving = false): void {
            if (d.verdict === 'unverifiable' && !resolving) {
                hold.offer(d);
                return;
            }
            dispatched.push(d.id);
        }

        hold = createLiveHold<{ id: string; verdict: string }>({
            holdMs: 2500,
            // The STT window stays empty forever: every re-reconcile is unverifiable again.
            onResolve: (held) => dispatchDetection({ id: held.id, verdict: 'unverifiable' }, true),
        });

        dispatchDetection({ id: 'a', verdict: 'unverifiable' });
        expect(dispatched).toEqual([]);

        vi.advanceTimersByTime(2500);
        expect(dispatched).toEqual(['a']);

        // No re-hold means no fresh timer: well past 2×holdMs, nothing more fires.
        vi.advanceTimersByTime(6000);
        expect(dispatched).toEqual(['a']);
    });

    // Round 6: mirrors dispatchDetection's actual committed order — the
    // fragment guard checked FIRST and unconditionally, the unverifiable
    // hold second and only for a non-fragment (git show HEAD:electron/
    // main.ts lines ~1890-1913). Uses the real isFragment and the real
    // createLiveHold; only the chipDeduper/decideDispatch admit path beyond
    // both branches is mocked, same limitation as every main.ts mirror in
    // this fix wave.
    it('a detection that is BOTH a fragment and unverifiable is dropped by the fragment guard — never reaches the hold', () => {
        vi.useFakeTimers();
        const log: string[] = [];
        const onResolve = vi.fn();
        const hold = createLiveHold<{ id: string; text: string; verdict: string }>({ holdMs: 2500, onResolve });
        const offerSpy = vi.spyOn(hold, 'offer');

        function dispatchDetection(d: { id: string; text: string; verdict: string }, resolving = false): void {
            // main.ts ~1890-1897: unconditional, checked before the verdict.
            if (isFragment(d.text)) { log.push(`drop:fragment:${d.id}`); return; }
            // main.ts ~1898-1911: only for a fresh (non-resolving) detection.
            if (d.verdict === 'unverifiable' && !resolving) { hold.offer(d); return; }
            log.push(`admit:${d.id}`);
        }

        dispatchDetection({ id: 'live2', text: 'training jobs are', verdict: 'unverifiable' }); // H06, 3 words
        expect(log).toEqual(['drop:fragment:live2']);
        expect(offerSpy).not.toHaveBeenCalled();

        // No timer was ever armed for this detection — confirm nothing
        // fires later either.
        vi.advanceTimersByTime(10_000);
        expect(log).toEqual(['drop:fragment:live2']);
        expect(onResolve).not.toHaveBeenCalled();
    });

    it('a non-fragment unverifiable detection IS held, not dropped — the contrast case for the guard above', () => {
        vi.useFakeTimers();
        const log: string[] = [];
        const hold = createLiveHold<{ id: string; text: string; verdict: string }>({
            holdMs: 2500,
            onResolve: (held) => log.push(`resolved:${held.id}`),
        });

        function dispatchDetection(d: { id: string; text: string; verdict: string }, resolving = false): void {
            if (isFragment(d.text)) { log.push(`drop:fragment:${d.id}`); return; }
            if (d.verdict === 'unverifiable' && !resolving) { hold.offer(d); return; }
            log.push(`admit:${d.id}`);
        }

        dispatchDetection({ id: 'live3', text: 'A question long enough not to be a fragment', verdict: 'unverifiable' });
        expect(log).toEqual([]); // held, not dispatched yet

        vi.advanceTimersByTime(2500);
        expect(log).toEqual(['resolved:live3']);
    });
});
