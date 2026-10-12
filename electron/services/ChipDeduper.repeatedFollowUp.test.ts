import { describe, it, expect, vi, afterEach } from 'vitest';
import { ChipDeduper } from './ChipDeduper';

afterEach(() => { vi.useRealTimers(); });

// Review minor 4: a second "Why?" later in the session, after a different answered question, must not be
// dropped as an exact match of the earlier answered "Why?". The 20 s window is the only way an exact
// short match can bite; past it a short answered entry is skipped (TAIL_MIN_CONTENT_WORDS).
describe('ChipDeduper: a repeated short follow-up in a later part of the session', () => {
    const answer = (d: ChipDeduper, question: string) => {
        const r = d.admit({ question, source: 'whisper', anchor: question });
        expect(r.admitted).toBe(true);
        d.markAnswered(r.id);
    };

    it.each([25_000, 70_000, 300_000])('"Why?" %i ms after an answered "Why?" and an answered different question is admitted', (ms) => {
        vi.useFakeTimers();
        const d = new ChipDeduper();
        answer(d, 'Why?');
        vi.advanceTimersByTime(5_000);
        answer(d, 'How would you shard the inventory database across regions?');
        vi.advanceTimersByTime(ms - 5_000);
        const r = d.admit({ question: 'Why?', source: 'live', anchor: 'Why?' });
        expect(r.admitted).toBe(true);
    });

    it('calibration: the same "Why?" 3 s after the first one is a duplicate of it', () => {
        vi.useFakeTimers();
        const d = new ChipDeduper();
        answer(d, 'Why?');
        vi.advanceTimersByTime(3_000);
        expect(d.admit({ question: 'Why?', source: 'live', anchor: 'Why?' }).admitted).toBe(false);
    });
});
