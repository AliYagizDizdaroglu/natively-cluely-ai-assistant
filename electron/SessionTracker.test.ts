import { describe, it, expect, vi, afterEach } from 'vitest';
import { SessionTracker } from './SessionTracker';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('SessionTracker.addAssistantMessage — full answer log', () => {
    /**
     * The 60-minute flight test grades answer quality from the app's own log.
     * Before this line only the first 50 characters of an answer were logged,
     * so no hour could be graded for length, endings or correctness
     * (2026-09-03: four hours of runs, zero gradable answers). The harness
     * parses exactly this line: `[Answer] full: <JSON string>`.
     */
    it('logs the whole answer text as one JSON-encoded line', () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        const tracker = new SessionTracker();
        const text = 'Docker layers are cached snapshots of each build step.\nI order the stable instructions first so the cache holds.';
        tracker.addAssistantMessage(text);
        const line = log.mock.calls.map((c) => c.map(String).join(' ')).find((l) => l.startsWith('[Answer] full: '));
        expect(line).toBeDefined();
        expect(JSON.parse(line!.slice('[Answer] full: '.length))).toBe(text);
    });

    it('does not log an empty answer', () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        new SessionTracker().addAssistantMessage('   ');
        expect(log.mock.calls.map((c) => c.map(String).join(' ')).some((l) => l.startsWith('[Answer] full: '))).toBe(false);
    });
});

describe('SessionTracker.addAssistantMessage — questionContext (fix round 1, C1)', () => {
    /**
     * assistantResponseHistory.questionContext used to be getLastInterviewerTurn()
     * unconditionally — the parent question's LAST STT final, not the whole question
     * (h40b R09: "Give me the SQL for the second highest salary in each department."
     * then "Say it out loud." two finals apart; questionContext was "Say it out loud.").
     * followUpParent.withParentExchange restores questionContext verbatim as the
     * restored interviewer line, so a split question silently became the tail.
     * An explicit second argument lets the verbal call site pass the full pinned
     * question; omitting it keeps today's getLastInterviewerTurn() fallback for
     * every other addAssistantMessage caller (refine, clarify, manual, code hint,
     * brainstorm, the "Could you repeat that?" fallback).
     */
    it('a passed question is stored as questionContext, trimmed', () => {
        const tracker = new SessionTracker();
        tracker.handleTranscript({ speaker: 'interviewer', text: 'Say it out loud.', timestamp: Date.now(), final: true, confidence: 1 });
        tracker.addAssistantMessage(
            'An answer long enough to pass the ten-character filter.',
            '  Give me the SQL for the second highest salary in each department. Say it out loud.  ',
        );
        const history = tracker.getAssistantResponseHistory();
        expect(history[history.length - 1].questionContext).toBe(
            'Give me the SQL for the second highest salary in each department. Say it out loud.',
        );
    });

    it('without a question, keeps today\'s getLastInterviewerTurn() behaviour', () => {
        const tracker = new SessionTracker();
        tracker.handleTranscript({ speaker: 'interviewer', text: 'Say it out loud.', timestamp: Date.now(), final: true, confidence: 1 });
        tracker.addAssistantMessage('An answer long enough to pass the ten-character filter.');
        const history = tracker.getAssistantResponseHistory();
        expect(history[history.length - 1].questionContext).toBe('Say it out loud.');
    });

    it('an empty/whitespace-only question falls back to getLastInterviewerTurn()', () => {
        const tracker = new SessionTracker();
        tracker.handleTranscript({ speaker: 'interviewer', text: 'Say it out loud.', timestamp: Date.now(), final: true, confidence: 1 });
        tracker.addAssistantMessage('An answer long enough to pass the ten-character filter.', '   ');
        const history = tracker.getAssistantResponseHistory();
        expect(history[history.length - 1].questionContext).toBe('Say it out loud.');
    });
});
