import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuestionDetector } from './QuestionDetector';

function detector(detect: (req: any) => Promise<any>) {
    const chips: any[] = [];
    const d = new QuestionDetector({
        client: { detect } as any,
        snapshotProvider: { getRecentInterviewerTranscript: () => 'UNUSED', getContextSnapshot: () => '' },
        onChip: (c) => chips.push(c),
        onChipUpdate: (c) => chips.push(c),
    });
    return { d, chips };
}

describe('QuestionDetector.detectNow — classify caller-supplied text with no debounce', () => {
    it('sends exactly the given text, emits a chip, resolves question', async () => {
        const detect = vi.fn(async (req: any) => ({ detected: true, confidence: 0.95, question: req.recentInterviewerTranscript, intent: 'verbal' }));
        const { d, chips } = detector(detect);
        await expect(d.detectNow('How would you shard a Postgres table by tenant?')).resolves.toBe('question');
        expect(detect).toHaveBeenCalledTimes(1);
        expect(detect.mock.calls[0][0].recentInterviewerTranscript).toBe('How would you shard a Postgres table by tenant?');
        expect(chips).toHaveLength(1);
        expect(chips[0].question).toBe('How would you shard a Postgres table by tenant?');
    });
    it('resolves not-a-question when the model says so, with no chip', async () => {
        const { d, chips } = detector(async () => ({ detected: false, confidence: 0.9, question: '', intent: 'verbal' }));
        await expect(d.detectNow('Great, thanks for walking me through that.')).resolves.toBe('not-a-question');
        expect(chips).toHaveLength(0);
    });
    it('falls back to the text-shape heuristic when the client is rate-limited (null)', async () => {
        const { d, chips } = detector(async () => null);
        await expect(d.detectNow('What is the difference between a process and a thread?')).resolves.toBe('question');
        expect(chips).toHaveLength(1);
    });
    it('is not-a-question while disabled, without calling the client', async () => {
        const detect = vi.fn(async () => ({ detected: true, confidence: 0.9, question: 'x y z', intent: 'verbal' }));
        const { d } = detector(detect);
        d.setEnabled(false);
        await expect(d.detectNow('What is a DAG?')).resolves.toBe('not-a-question');
        expect(detect).not.toHaveBeenCalled();
    });
    it('a throwing client resolves not-a-question rather than rejecting', async () => {
        const { d } = detector(async () => { throw new Error('boom'); });
        await expect(d.detectNow('What is a DAG?')).resolves.toBe('not-a-question');
    });
});

// R19 fix: detectNow must share the debounce path's single-flight slot rather
// than starting a second detection alongside one the drain (triggerDetection's
// queuedTrigger replay) already started. Each test drives the client with a
// queue of deferred promises so a detection settles only when the test says,
// and tracks `outstanding` (calls started minus calls settled) so a moment
// where two detections ran at once shows up as maxOutstanding() > 1.
function makeDeferredClient() {
    const resolvers: Array<(v: any) => void> = [];
    let outstanding = 0;
    let maxOutstanding = 0;
    const detect = vi.fn(() => {
        outstanding++;
        maxOutstanding = Math.max(maxOutstanding, outstanding);
        return new Promise((resolve) => {
            resolvers.push((v: any) => {
                outstanding--;
                resolve(v);
            });
        });
    });
    return { detect, resolvers, maxOutstanding: () => maxOutstanding };
}

// Drains the promise-chain microtasks a settle triggers (runDetection's await
// → its .finally → triggerDetection's drain → detectNow's own while-loop
// re-check). Not tied to any fake timer — plain microtask flushing.
async function flush() {
    for (let i = 0; i < 10; i++) await Promise.resolve();
}

describe('QuestionDetector.detectNow — single-flight shared with the debounce path (R19)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('T-F1: detectNow never runs beside a detection the drain started: detections stay one at a time', async () => {
        const { detect, resolvers, maxOutstanding } = makeDeferredClient();
        const { d } = detector(detect);

        // Debounce path starts call 1.
        d.onTranscriptFinal({ speaker: 'interviewer', text: 'let us talk about pods', timestamp: 0, final: true });
        await vi.advanceTimersByTimeAsync(1500);
        await vi.runAllTimersAsync();
        expect(resolvers).toHaveLength(1);

        // detectNow must wait for it rather than starting its own alongside it.
        const p = d.detectNow('What is a pod in Kubernetes and how does it differ from a container?');

        // Another final arrives while call 1 is in flight: coalesces, no new call.
        d.onTranscriptFinal({ speaker: 'interviewer', text: 'actually let us discuss containers', timestamp: 1000, final: true });
        await vi.advanceTimersByTimeAsync(1500);
        await vi.runAllTimersAsync();
        expect((d as any).queuedTrigger).toBe(true);
        expect(resolvers).toHaveLength(1);

        // Settle call 1 (not detected) — the drain starts call 2.
        resolvers[0]({ detected: false, confidence: 0.9, question: '', intent: 'verbal' });
        await vi.runAllTimersAsync();
        await flush();
        expect(resolvers).toHaveLength(2);
        // RED on the pre-fix code: detectNow started its own call (a 3rd)
        // while call 2 (the drain's) was still pending, so this hit 2.
        expect(maxOutstanding()).toBe(1);

        // Settle call 2 — only now does detectNow start its own (call 3).
        resolvers[1]({ detected: false, confidence: 0.9, question: '', intent: 'verbal' });
        await vi.runAllTimersAsync();
        await flush();
        expect(resolvers).toHaveLength(3);

        // Settle call 3 (detectNow's own) as detected, with the override text.
        resolvers[2]({ detected: true, confidence: 0.9, question: 'What is a pod in Kubernetes and how does it differ from a container?', intent: 'verbal' });
        await expect(p).resolves.toBe('question');

        expect((d as any).inflightDetection).toBeNull();
        expect((d as any).queuedTrigger).toBe(false);
        expect(detect).toHaveBeenCalledTimes(3);
    });

    it('T-F2: a trigger queued while detectNow runs is drained once when it settles', async () => {
        const { detect, resolvers } = makeDeferredClient();
        const { d } = detector(detect);

        // Nothing in flight; detectNow starts call 1 itself.
        const p = d.detectNow('What is a DAG in Airflow?');
        expect(resolvers).toHaveLength(1);

        // A final arrives while detectNow's own call is in flight: coalesces.
        d.onTranscriptFinal({ speaker: 'interviewer', text: 'tell me about scheduling', timestamp: 0, final: true });
        await vi.advanceTimersByTimeAsync(1500);
        await vi.runAllTimersAsync();
        expect((d as any).queuedTrigger).toBe(true);
        expect(resolvers).toHaveLength(1);

        // Settle call 1 as detected — the drain must fire through the SAME
        // helper detectNow used, not detectNow's own unconditional finally.
        resolvers[0]({ detected: true, confidence: 0.9, question: 'What is a DAG in Airflow?', intent: 'verbal' });
        await vi.runAllTimersAsync();
        await flush();
        expect(detect).toHaveBeenCalledTimes(2);
        expect((d as any).queuedTrigger).toBe(false);

        await expect(p).resolves.toBe('question');

        // Settle call 2 (the drain) — the slot clears.
        resolvers[1]({ detected: false, confidence: 0.9, question: '', intent: 'verbal' });
        await vi.runAllTimersAsync();
        await flush();
        expect((d as any).inflightDetection).toBeNull();
    });
});
