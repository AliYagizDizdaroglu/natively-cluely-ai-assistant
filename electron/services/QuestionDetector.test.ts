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

        // No trailing '?' — the fast path is exercised by its own tests below;
        // this fixture must go through the silence debounce.
        det.onTranscriptFinal({ speaker: 'interviewer', text: 'explain the architecture of X', timestamp: 0, final: true });

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

    it('setEnabled(false) mutes the pipeline: no fast-path fire, no debounce fire', async () => {
        const client = makeClientWith([
            { detected: true, question: 'What is X?', intent: 'verbal', confidence: 0.9 },
        ]);
        const chips: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => chips.push(c),
        });
        det.setEnabled(false);
        expect(det.isEnabled()).toBe(false);

        // Fast path (ends with '?') — must NOT fire while disabled
        det.onTranscriptFinal({ speaker: 'interviewer', text: 'what is X exactly?', timestamp: 0, final: true });
        // Debounce path — must NOT fire while disabled
        det.onTranscriptFinal({ speaker: 'interviewer', text: 'explain the architecture', timestamp: 0, final: true });
        await vi.runAllTimersAsync();
        expect(client.detect).not.toHaveBeenCalled();
        expect(chips).toHaveLength(0);

        // Re-enable → detection works again (fast path)
        det.setEnabled(true);
        det.onTranscriptFinal({ speaker: 'interviewer', text: 'what is X exactly?', timestamp: 0, final: true });
        await vi.runAllTimersAsync();
        expect(client.detect).toHaveBeenCalledTimes(1);
        expect(chips).toHaveLength(1);
    });

    it('setEnabled(false) cancels a pending debounce so it never fires late', async () => {
        const client = makeClientWith([
            { detected: true, question: 'What is X?', intent: 'verbal', confidence: 0.9 },
        ]);
        const chips: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => chips.push(c),
        });
        det.onTranscriptFinal({ speaker: 'interviewer', text: 'explain the architecture', timestamp: 0, final: true });
        await vi.advanceTimersByTimeAsync(1000); // partway through the 1.5s debounce
        det.setEnabled(false);
        await vi.runAllTimersAsync();
        expect(client.detect).not.toHaveBeenCalled();
        expect(chips).toHaveLength(0);
    });

    it('resets silence timer on each new interviewer segment', async () => {
        const client = makeClientWith([
            { detected: true, question: 'Tell me about Q', intent: 'verbal', confidence: 0.9 },
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
            { detected: true, question: 'Tell me about Q', intent: 'verbal', confidence: 0.9 },
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
            { detected: true, question: 'Tell me about Q', intent: 'verbal', confidence: 0.4 },
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
                .mockResolvedValueOnce({ detected: true, question: 'Tell me about second', intent: 'verbal', confidence: 0.9 })
                .mockResolvedValueOnce({ detected: true, question: 'Tell me about third', intent: 'verbal', confidence: 0.9 }),
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
        resolve1({ detected: true, question: 'Tell me about first', intent: 'verbal', confidence: 0.9 });
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
            { detected: true, question: 'Tell me about Q', intent: 'verbal', confidence: 0.9 },
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

    it('credits elapsed time since speechEndedAt against the silence debounce', async () => {
        const client = makeClientWith([
            { detected: true, question: 'What is X about?', intent: 'verbal', confidence: 0.9 },
        ]);
        const chips: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => chips.push(c),
        });

        // Speech actually ended 1000ms ago (VAD hangover + STT upload already elapsed)
        det.onTranscriptFinal({
            speaker: 'interviewer', text: 'tell me about X', timestamp: Date.now(),
            final: true, speechEndedAt: Date.now() - 1000,
        });

        // 1500 - 1000 already elapsed = 500ms remaining. At 499ms: nothing yet.
        await vi.advanceTimersByTimeAsync(499);
        expect(client.detect).not.toHaveBeenCalled();

        // At exactly 500ms the credited timer must have fired — do NOT run
        // remaining timers here, or an uncredited 1500ms timer would pass too.
        await vi.advanceTimersByTimeAsync(1);
        await Promise.resolve();
        await Promise.resolve();
        expect(client.detect).toHaveBeenCalledTimes(1);
        expect(chips).toHaveLength(1);
    });

    it('fires immediately when speechEndedAt is older than the full debounce window', async () => {
        const client = makeClientWith([
            { detected: true, question: 'What is X about?', intent: 'verbal', confidence: 0.9 },
        ]);
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: () => {},
        });

        // Slow upload: 2s of real silence already elapsed — no additional wait needed
        det.onTranscriptFinal({
            speaker: 'interviewer', text: 'tell me about X', timestamp: Date.now(),
            final: true, speechEndedAt: Date.now() - 2000,
        });

        // Only 0-delay timers may run — an uncredited 1500ms timer must not fire.
        await vi.advanceTimersByTimeAsync(0);
        await Promise.resolve();
        await Promise.resolve();
        expect(client.detect).toHaveBeenCalledTimes(1);
    });

    it('uses the full debounce when speechEndedAt is absent (streaming/other providers)', async () => {
        const client = makeClientWith([
            { detected: true, question: 'What is X about?', intent: 'verbal', confidence: 0.9 },
        ]);
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: () => {},
        });

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'tell me about X', timestamp: Date.now(), final: true });

        await vi.advanceTimersByTimeAsync(1499);
        expect(client.detect).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        await vi.runAllTimersAsync();
        expect(client.detect).toHaveBeenCalledTimes(1);
    });

    it('fires detection immediately when a final segment ends with a question mark', async () => {
        const client = makeClientWith([
            { detected: true, question: 'How do Transformers work?', intent: 'verbal', confidence: 0.95 },
        ]);
        const chips: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => chips.push(c),
        });

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'How do Transformers work?', timestamp: Date.now(), final: true });

        // No timer advance at all — the '?' ending is a strong end-of-question signal
        await Promise.resolve();
        await Promise.resolve();
        expect(client.detect).toHaveBeenCalledTimes(1);
    });

    it('question-mark fast path cancels a pending debounce timer (no duplicate detect)', async () => {
        const client = makeClientWith([
            { detected: true, question: 'What about edge cases?', intent: 'verbal', confidence: 0.95 },
            { detected: true, question: 'What about edge cases?', intent: 'verbal', confidence: 0.95 },
        ]);
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: () => {},
            onChipUpdate: () => {},
        });

        // Plain final starts a debounce...
        det.onTranscriptFinal({ speaker: 'interviewer', text: 'so tell me', timestamp: Date.now(), final: true });
        await vi.advanceTimersByTimeAsync(500);
        // ...then the question tail arrives with '?': fires now, old timer cancelled
        det.onTranscriptFinal({ speaker: 'interviewer', text: 'what about edge cases?', timestamp: Date.now(), final: true });
        await Promise.resolve();
        await Promise.resolve();
        expect(client.detect).toHaveBeenCalledTimes(1);

        // Advancing past the original debounce window must not fire a second detect
        await vi.advanceTimersByTimeAsync(3000);
        await Promise.resolve();
        await Promise.resolve();
        expect(client.detect).toHaveBeenCalledTimes(1);
    });

    it('does not fast-path short question-mark fragments (< 3 words)', async () => {
        const client = makeClientWith([
            { detected: true, question: 'ok?', intent: 'verbal', confidence: 0.95 },
        ]);
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: () => {},
        });

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'ok?', timestamp: Date.now(), final: true });
        await Promise.resolve();
        await Promise.resolve();
        // fragment: falls back to the normal silence debounce
        expect(client.detect).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1500);
        await Promise.resolve();
        expect(client.detect).toHaveBeenCalledTimes(1);
    });

    it('clear() during in-flight detection drops the result (no chip emitted)', async () => {
        let resolveDetect: (v: DetectionResponse) => void = () => {};
        const inflight = new Promise<DetectionResponse>(r => { resolveDetect = r; });
        const client = {
            detect: vi.fn(() => inflight),
        } as any;
        const chips: DetectedQuestionChip[] = [];
        const updates: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => chips.push(c),
            onChipUpdate: c => updates.push(c),
        });

        // Trigger detection (in-flight starts)
        det.onSpeakerChange('interviewer', 'user');
        await Promise.resolve();  // let runDetection enter the await
        expect(client.detect).toHaveBeenCalledTimes(1);

        // Clear during in-flight (session ended)
        det.clear();

        // Now detect resolves — should be dropped by generation guard
        resolveDetect({ detected: true, question: 'Q from old session', intent: 'verbal', confidence: 0.9 });
        await vi.runAllTimersAsync();
        await Promise.resolve();
        await Promise.resolve();

        expect(chips).toHaveLength(0);
        expect(updates).toHaveLength(0);
    });

    it('merges the scenario sentence deterministically when the model returns only the bare question (H02 shape)', async () => {
        const client = makeClientWith([
            { detected: true, question: 'How do you diagnose and fix it?', intent: 'verbal', confidence: 0.9 },
        ]);
        const chips: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => chips.push(c),
        });

        const t0 = 10_000;
        // Statement alone doesn't end with '?' — it starts the silence debounce.
        det.onTranscriptFinal({ speaker: 'interviewer', text: 'A SageMaker endpoint has p99 latency creeping up.', timestamp: t0 - 3000, final: true });
        // The '?' final that follows takes the fast path: clears that debounce and
        // fires detection immediately — exactly one detect() call, not two.
        det.onTranscriptFinal({ speaker: 'interviewer', text: 'How do you diagnose and fix it?', timestamp: t0, final: true });

        await Promise.resolve();
        await Promise.resolve();
        expect(client.detect).toHaveBeenCalledTimes(1);
        expect(chips).toHaveLength(1);
        expect(chips[0].question).toBe('A SageMaker endpoint has p99 latency creeping up. How do you diagnose and fix it?');

        // Advancing past the original (now-cancelled) debounce window must not
        // trigger a second, duplicate detect call.
        await vi.advanceTimersByTimeAsync(3000);
        expect(client.detect).toHaveBeenCalledTimes(1);
    });

    it('a short interviewer fragment ("Um.") between the statement and the question does not evict the statement from recentFinals (R36 fix wave)', async () => {
        // Before-run bug: recentFinals holds only the last TWO finals. A filler
        // fragment like "Um." used to occupy one of those two slots and evict
        // the real scenario statement, so mergeScenarioSentence saw prev="Um."
        // (< 4 words) and refused to merge — the question surfaced bare.
        const client = makeClientWith([
            { detected: true, question: 'How do you diagnose and fix it?', intent: 'verbal', confidence: 0.9 },
        ]);
        const chips: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => chips.push(c),
        });

        const t0 = 10_000;
        det.onTranscriptFinal({ speaker: 'interviewer', text: 'A SageMaker endpoint has p99 latency creeping up.', timestamp: t0 - 5000, final: true });
        det.onTranscriptFinal({ speaker: 'interviewer', text: 'Um.', timestamp: t0 - 2000, final: true });
        det.onTranscriptFinal({ speaker: 'interviewer', text: 'How do you diagnose and fix it?', timestamp: t0, final: true });

        await Promise.resolve();
        await Promise.resolve();
        expect(client.detect).toHaveBeenCalledTimes(1);
        expect(chips).toHaveLength(1);
        expect(chips[0].question).toBe('A SageMaker endpoint has p99 latency creeping up. How do you diagnose and fix it?');
    });

    // Round 7 — the Groq detection model hit its free-tier daily token
    // limit mid-interview (run 3: 64 of 85 detect() calls returned null,
    // never threw). client.detect() returning null is the signal ("null =
    // rate-limited/unavailable/timeout" per runDetection's own comment) —
    // these tests use makeClientWith([null, ...]) to force that path.
    describe('degraded detection when client.detect() returns null (run 3, Ruling: heuristic chip when the detector is unavailable)', () => {
        it('W09: two STT finals ("...actually..." then " solve....") join and normalize into one heuristic chip', async () => {
            const client = makeClientWith([null]);
            const chips: DetectedQuestionChip[] = [];
            const det = new QuestionDetector({
                client,
                snapshotProvider: stubSnapshotProvider('i', 'c'),
                onChip: c => chips.push(c),
            });

            const t0 = 10_000;
            det.onTranscriptFinal({ speaker: 'interviewer', text: 'What problem does infrastructure as code actually...', timestamp: t0, final: true });
            // 1s apart (run 3's actual gap was 810ms) — well inside the 1.5s
            // debounce, so this final's arrival resets it; well inside the 6s
            // cross-final join window too.
            await vi.advanceTimersByTimeAsync(1000);
            det.onTranscriptFinal({ speaker: 'interviewer', text: ' solve....', timestamp: t0 + 1000, final: true });
            await vi.advanceTimersByTimeAsync(1500);
            await vi.runAllTimersAsync();

            expect(client.detect).toHaveBeenCalledTimes(1);
            expect(chips).toHaveLength(1);
            // Exact normalized string: joined with a space, "."/"…" runs each
            // collapsed to one space, whitespace collapsed, trimmed.
            expect(chips[0].question).toBe('What problem does infrastructure as code actually solve');
            expect(chips[0].intent).toBe('verbal');
            expect(chips[0].confidence).toBe(0.6); // default confidenceThreshold
        });

        it('M10: "...for a production..." then " model...." joins into one heuristic chip', async () => {
            const client = makeClientWith([null]);
            const chips: DetectedQuestionChip[] = [];
            const det = new QuestionDetector({
                client,
                snapshotProvider: stubSnapshotProvider('i', 'c'),
                onChip: c => chips.push(c),
            });

            const t0 = 10_000;
            det.onTranscriptFinal({ speaker: 'interviewer', text: 'Which metrics would you put on a dashboard for a production...', timestamp: t0, final: true });
            await vi.advanceTimersByTimeAsync(1000);
            det.onTranscriptFinal({ speaker: 'interviewer', text: ' model....', timestamp: t0 + 1000, final: true });
            await vi.advanceTimersByTimeAsync(1500);
            await vi.runAllTimersAsync();

            expect(chips).toHaveLength(1);
            expect(chips[0].question).toBe('Which metrics would you put on a dashboard for a production model');
        });

        it('a statement final produces no chip, and logs the no-chip line', async () => {
            const client = makeClientWith([null]);
            const chips: DetectedQuestionChip[] = [];
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const det = new QuestionDetector({
                client,
                snapshotProvider: stubSnapshotProvider('i', 'c'),
                onChip: c => chips.push(c),
            });

            det.onTranscriptFinal({ speaker: 'interviewer', text: 'We use Airflow for orchestration.', timestamp: 0, final: true });
            await vi.advanceTimersByTimeAsync(1500);
            await vi.runAllTimersAsync();

            expect(chips).toHaveLength(0);
            const logged = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
            expect(logged).toContain('[QuestionDetector] degraded: no chip (not question-shaped): "We use Airflow for orchestration"');
            logSpy.mockRestore();
        });

        it('a fragment final produces no chip', async () => {
            const client = makeClientWith([null]);
            const chips: DetectedQuestionChip[] = [];
            const det = new QuestionDetector({
                client,
                snapshotProvider: stubSnapshotProvider('i', 'c'),
                onChip: c => chips.push(c),
            });

            // "yeah okay" is 2 words — under isFragment's 4-word floor, and
            // must reach the debounce (not the '?' fast path) to exercise this.
            det.onTranscriptFinal({ speaker: 'interviewer', text: 'yeah okay', timestamp: 0, final: true });
            await vi.advanceTimersByTimeAsync(1500);
            await vi.runAllTimersAsync();

            expect(chips).toHaveLength(0);
        });

        it('a degraded chip deduplicates against an existing similar chip (update, not a new chip)', async () => {
            const client = makeClientWith([
                { detected: true, question: 'What is the time complexity of quicksort?', intent: 'verbal', confidence: 0.9 },
                null,
            ]);
            const events: { type: 'new' | 'update' }[] = [];
            const det = new QuestionDetector({
                client,
                snapshotProvider: stubSnapshotProvider('i', 'c'),
                onChip: () => events.push({ type: 'new' }),
                onChipUpdate: () => events.push({ type: 'update' }),
            });

            det.onTranscriptFinal({ speaker: 'interviewer', text: 'What is the time complexity of quicksort?', timestamp: 0, final: true });
            await Promise.resolve();
            await Promise.resolve();
            expect(events).toEqual([{ type: 'new' }]);

            // > 6s after the first final, so the degraded join does not pull
            // the first final in as `prev` — isolates the dedup assertion to
            // this final's own text.
            det.onTranscriptFinal({ speaker: 'interviewer', text: 'What is the time complexity of quicksort exactly?', timestamp: 10_000, final: true });
            await Promise.resolve();
            await Promise.resolve();
            expect(events).toEqual([{ type: 'new' }, { type: 'update' }]);
        });

        it('when detect() returns a real result, no degraded log line appears', async () => {
            const client = makeClientWith([
                { detected: true, question: 'What is X?', intent: 'verbal', confidence: 0.9 },
            ]);
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const det = new QuestionDetector({
                client,
                snapshotProvider: stubSnapshotProvider('i', 'c'),
                onChip: () => {},
            });

            det.onTranscriptFinal({ speaker: 'interviewer', text: 'explain the architecture of X', timestamp: 0, final: true });
            await vi.advanceTimersByTimeAsync(1500);
            await vi.runAllTimersAsync();

            const logged = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
            expect(logged).not.toContain('degraded');
            logSpy.mockRestore();
        });
    });
});
