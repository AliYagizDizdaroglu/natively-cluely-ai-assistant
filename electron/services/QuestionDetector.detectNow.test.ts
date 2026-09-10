import { describe, it, expect, vi } from 'vitest';
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
