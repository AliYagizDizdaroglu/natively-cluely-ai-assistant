import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuestionDetector, DetectedQuestionChip } from './QuestionDetector';
import { DetectionResponse } from '../llm/prompts/questionDetection';

const makeClientWith = (responses: (DetectionResponse | null)[]) => {
    let i = 0;
    return {
        detect: vi.fn(async () => {
            const r = responses[i++];
            return r ?? null;
        }),
    } as any;
};

const stubSnapshotProvider = (interviewerText: string, contextText: string) => ({
    getRecentInterviewerTranscript: () => interviewerText,
    getContextSnapshot: () => contextText,
});

describe('QuestionDetector', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('fires detection after 1.5s of silence following a final interviewer segment', async () => {
        const client = makeClientWith([
            { detected: true, question: 'What is X?', intent: 'verbal', confidence: 0.9 },
        ]);
        const chips: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('[interviewer]: what is X?', 'ctx'),
            onChip: c => chips.push(c),
        });

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'what is X?', timestamp: 0, final: true });

        // before 1.5s — no detection
        await vi.advanceTimersByTimeAsync(1499);
        expect(client.detect).not.toHaveBeenCalled();

        // at 1.5s — fires
        await vi.advanceTimersByTimeAsync(1);
        await vi.runAllTimersAsync();
        expect(client.detect).toHaveBeenCalledTimes(1);
        expect(chips).toHaveLength(1);
        expect(chips[0].question).toBe('What is X?');
        expect(chips[0].intent).toBe('verbal');
        expect(chips[0].contextSnapshot).toBe('ctx');
    });

    it('resets silence timer on each new interviewer segment', async () => {
        const client = makeClientWith([
            { detected: true, question: 'Q', intent: 'verbal', confidence: 0.9 },
        ]);
        const chips: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => chips.push(c),
        });

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'tell me', timestamp: 0, final: true });
        await vi.advanceTimersByTimeAsync(1000);
        // new segment resets timer
        det.onTranscriptFinal({ speaker: 'interviewer', text: 'about a time', timestamp: 1000, final: true });
        await vi.advanceTimersByTimeAsync(1000);
        // still under 1.5s after the second segment
        expect(client.detect).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(500);
        await vi.runAllTimersAsync();
        expect(client.detect).toHaveBeenCalledTimes(1);
    });

    it('fires immediately on speaker change (interviewer -> user)', async () => {
        const client = makeClientWith([
            { detected: true, question: 'Q', intent: 'verbal', confidence: 0.9 },
        ]);
        const chips: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => chips.push(c),
        });

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'q?', timestamp: 0, final: true });
        det.onSpeakerChange('interviewer', 'user');
        // no need to wait for debounce
        await vi.runAllTimersAsync();
        expect(client.detect).toHaveBeenCalledTimes(1);
        expect(chips).toHaveLength(1);
    });

    it('drops detections below confidence threshold (default 0.6)', async () => {
        const client = makeClientWith([
            { detected: true, question: 'Q', intent: 'verbal', confidence: 0.4 },
        ]);
        const chips: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => chips.push(c),
        });

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'x', timestamp: 0, final: true });
        await vi.advanceTimersByTimeAsync(1500);
        await vi.runAllTimersAsync();
        expect(client.detect).toHaveBeenCalledTimes(1);
        expect(chips).toHaveLength(0);
    });

    it('drops detections where detected=false', async () => {
        const client = makeClientWith([
            { detected: false, question: '', intent: 'verbal', confidence: 0.9 },
        ]);
        const chips: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => chips.push(c),
        });

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'x', timestamp: 0, final: true });
        await vi.advanceTimersByTimeAsync(1500);
        await vi.runAllTimersAsync();
        expect(chips).toHaveLength(0);
    });

    it('dedups: 70%+ similarity emits update with existing id', async () => {
        const client = makeClientWith([
            { detected: true, question: 'what is quicksort time complexity', intent: 'verbal', confidence: 0.9 },
            { detected: true, question: 'what is the time complexity of quicksort', intent: 'verbal', confidence: 0.9 },
        ]);
        const events: { type: 'new' | 'update'; chip: DetectedQuestionChip }[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => events.push({ type: 'new', chip: c }),
            onChipUpdate: c => events.push({ type: 'update', chip: c }),
        });

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'q1', timestamp: 0, final: true });
        await vi.advanceTimersByTimeAsync(1500);
        await vi.runAllTimersAsync();

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'q2', timestamp: 5000, final: true });
        await vi.advanceTimersByTimeAsync(1500);
        await vi.runAllTimersAsync();

        expect(events).toHaveLength(2);
        expect(events[0].type).toBe('new');
        expect(events[1].type).toBe('update');
        expect(events[1].chip.id).toBe(events[0].chip.id);
    });

    it('single-flight: queues at most 1 pending detection', async () => {
        let resolve1: (v: DetectionResponse) => void = () => {};
        const inflight = new Promise<DetectionResponse>(r => { resolve1 = r; });
        const client = {
            detect: vi.fn()
                .mockImplementationOnce(() => inflight)
                .mockResolvedValueOnce({ detected: true, question: 'second', intent: 'verbal', confidence: 0.9 })
                .mockResolvedValueOnce({ detected: true, question: 'third', intent: 'verbal', confidence: 0.9 }),
        } as any;
        const chips: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => chips.push(c),
        });

        // trigger first (in-flight)
        det.onSpeakerChange('interviewer', 'user');
        // trigger second (queued)
        det.onSpeakerChange('interviewer', 'user');
        // trigger third (should be dropped — queue full)
        det.onSpeakerChange('interviewer', 'user');

        expect(client.detect).toHaveBeenCalledTimes(1);

        // resolve first — second should now run, third dropped
        resolve1({ detected: true, question: 'first', intent: 'verbal', confidence: 0.9 });
        await vi.runAllTimersAsync();
        // give microtask queue time
        await Promise.resolve();
        await Promise.resolve();
        expect(client.detect).toHaveBeenCalledTimes(2);
    });

    it('clear() resets dedup cache and timers', async () => {
        const client = makeClientWith([
            { detected: true, question: 'Q same words', intent: 'verbal', confidence: 0.9 },
            { detected: true, question: 'Q same words', intent: 'verbal', confidence: 0.9 },
        ]);
        const events: { type: 'new' | 'update' }[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: () => events.push({ type: 'new' }),
            onChipUpdate: () => events.push({ type: 'update' }),
        });

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'x', timestamp: 0, final: true });
        await vi.advanceTimersByTimeAsync(1500);
        await vi.runAllTimersAsync();

        det.clear();

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'x', timestamp: 5000, final: true });
        await vi.advanceTimersByTimeAsync(1500);
        await vi.runAllTimersAsync();

        // After clear, same question becomes a new chip (not update)
        expect(events).toEqual([{ type: 'new' }, { type: 'new' }]);
    });

    it('does not detect on user segments', async () => {
        const client = makeClientWith([
            { detected: true, question: 'Q', intent: 'verbal', confidence: 0.9 },
        ]);
        const chips: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => chips.push(c),
        });

        det.onTranscriptFinal({ speaker: 'user', text: 'I think...', timestamp: 0, final: true });
        await vi.advanceTimersByTimeAsync(2000);
        await vi.runAllTimersAsync();
        expect(client.detect).not.toHaveBeenCalled();
    });
});
