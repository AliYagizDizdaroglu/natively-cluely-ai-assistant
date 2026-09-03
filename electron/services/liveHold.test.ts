import { describe, it, expect, vi, afterEach } from 'vitest';
import { createLiveHold } from './liveHold';

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
});
