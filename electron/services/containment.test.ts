import { describe, it, expect } from 'vitest';
import { normalizeForContainment } from './containment';

describe('normalizeForContainment — the shape two ears share', () => {
    it('joins a short letter token to the digits after it whether or not punctuation sat between them', () => {
        // Deepgram "p 99", Live "P99"; a "p. 99" split must land on the same text (review 2026-09-07).
        expect(normalizeForContainment('has p 99 latency')).toBe('has p99 latency');
        expect(normalizeForContainment('has P99 latency')).toBe('has p99 latency');
        expect(normalizeForContainment('has p. 99 latency')).toBe('has p99 latency');
    });
    it('drops punctuation inside the sentence, not only at the end', () => {
        expect(normalizeForContainment('creeping up. How do you')).toBe('creeping up how do you');
        expect(normalizeForContainment('creeping up, how do you')).toBe('creeping up how do you');
    });
    it('keeps apostrophes and collapses whitespace', () => {
        expect(normalizeForContainment("  I'm going   to go. ")).toBe("i'm going to go");
        expect(normalizeForContainment('')).toBe('');
    });
});
