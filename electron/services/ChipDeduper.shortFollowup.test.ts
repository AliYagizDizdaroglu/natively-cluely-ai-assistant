import { describe, it, expect, vi, afterEach } from 'vitest';
import { ChipDeduper } from './ChipDeduper';

afterEach(() => {
    vi.useRealTimers();
});

// b1-final 2026-10-11: a short follow-up reusing its parent's key noun was dropped as a
// duplicate at +19.0 s (anchor overlap 0.50 over 2 content words).
describe('ChipDeduper — a short anchor matches by overlap only within the cross-detector window', () => {
    const parent = 'How would you shard the inventory database across regions?';
    const parentAnchor = 'How would you shard the inventory database across regions';
    const followUp = 'Why this database?';
    const followUpAnchor = 'Why this database';

    it('a 2-content-word follow-up sharing one word is admitted 19 s after its answered parent', () => {
        vi.useFakeTimers();
        const d = new ChipDeduper();
        const p = d.admit({ question: parent, source: 'live', anchor: parentAnchor });
        d.markAnswered(p.id);
        vi.advanceTimersByTime(19_000);
        const r = d.admit({ question: followUp, source: 'live', anchor: followUpAnchor });
        expect(r.admitted).toBe(true);
    });

    it('the same short pair 2 s apart from the other source is still one utterance', () => {
        vi.useFakeTimers();
        const d = new ChipDeduper();
        d.admit({ question: parent, source: 'whisper', anchor: parentAnchor });
        vi.advanceTimersByTime(2_000);
        const r = d.admit({ question: followUp, source: 'live', anchor: followUpAnchor });
        expect(r.admitted).toBe(false);
    });

    it('a contained anchor at +15 s is still suppressed', () => {
        vi.useFakeTimers();
        const d = new ChipDeduper();
        d.admit({ question: 'What is a vector clock?', source: 'whisper', anchor: 'What is a vector clock' });
        vi.advanceTimersByTime(15_000);
        const r = d.admit({ question: 'Explain it again please', source: 'whisper', anchor: 'vector clock' });
        expect(r.admitted).toBe(false);
    });

    it('long anchors (4+ content words both) overlapping >= 0.5 at +15 s are still suppressed', () => {
        vi.useFakeTimers();
        const d = new ChipDeduper();
        d.admit({ question: parent, source: 'whisper', anchor: parentAnchor });
        vi.advanceTimersByTime(15_000);
        const r = d.admit({ question: 'Where would inventory database shard regions differ?', source: 'whisper', anchor: 'Where would inventory database shard regions differ' });
        expect(r.admitted).toBe(false);
    });
});
