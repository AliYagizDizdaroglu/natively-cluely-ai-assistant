import { describe, it, expect } from 'vitest';
import { bubbleKey, createBubbleMetrics } from './bubbleMetrics';

function clock(start = 0) {
    let t = start;
    return { now: () => t, set: (v: number) => { t = v; } };
}

describe('bubbleKey', () => {
    it('is turnId|origin|append(0/1)', () => {
        expect(bubbleKey({ turnId: 4, origin: 'live' })).toBe('4|live|0');
        expect(bubbleKey({ turnId: 4, origin: 'pipeline', append: true })).toBe('4|pipeline|1');
        expect(bubbleKey({ turnId: 4, origin: 'pipeline', append: false })).toBe('4|pipeline|0');
    });
});

describe('createBubbleMetrics', () => {
    it('two keys measure independently, and done returns that bubble\'s source', () => {
        const c = clock(1000);
        const m = createBubbleMetrics(c.now);
        m.start('1|live|0');                 // turn 1 starts at 1000
        c.set(1500); m.start('2|live|0');    // turn 2 starts at 1500
        c.set(2000); m.first('1|live|0');    // turn 1 ttft 1000
        c.set(2300); m.first('2|live|0');    // turn 2 ttft 800
        c.set(3000);
        const d1 = m.done('1|live|0', 'x'.repeat(40), 'gemini-3.8-live');
        c.set(4500);
        const d2 = m.done('2|live|0', 'y'.repeat(80), 'Gemini Flash 3.1');
        expect(d1).toMatchObject({ ttftMs: 1000, totalMs: 2000, tokens: 10, modelSource: 'gemini-3.8-live', streaming: false });
        expect(d1.tokensPerSec).toBeCloseTo(10 / 1, 5);       // 10 tokens over (3000 - 2000) ms
        expect(d2).toMatchObject({ ttftMs: 800, totalMs: 3000, tokens: 20, modelSource: 'Gemini Flash 3.1', streaming: false });
    });

    it('bubbles of one turn share its start: the append bubble\'s TTFT counts from the turn\'s first event', () => {
        const c = clock(0);
        const m = createBubbleMetrics(c.now);
        m.start('7|live|0');
        c.set(100); m.start('7|pipeline|1');     // a second start for the same turn does not move it
        c.set(900); m.first('7|pipeline|1');
        c.set(1000);
        expect(m.done('7|pipeline|1', 'abcd', 'S').ttftMs).toBe(900);
    });

    it('first is idempotent and done forgets the bubble', () => {
        const c = clock(0);
        const m = createBubbleMetrics(c.now);
        m.start('3|live|0');
        c.set(10); m.first('3|live|0');
        c.set(20); m.first('3|live|0');
        c.set(30);
        expect(m.done('3|live|0', 'abcd', null).ttftMs).toBe(10);
        // a second done for a forgotten bubble: no first token recorded
        expect(m.done('3|live|0', 'abcd', null).ttftMs).toBeNull();
    });

    it('an explicit start time wins over the clock', () => {
        const c = clock(5000);
        const m = createBubbleMetrics(c.now);
        m.start('8|live|0', 4000);
        m.first('8|live|0');
        expect(m.done('8|live|0', 'abcd', null)).toMatchObject({ ttftMs: 1000, totalMs: 1000 });
    });
});
