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
