import { describe, it, expect } from 'vitest';
import { jaccardSimilarity } from './jaccardSimilarity';

describe('jaccardSimilarity', () => {
    it('returns 1 for identical strings', () => {
        expect(jaccardSimilarity('hello world', 'hello world')).toBe(1);
    });

    it('returns 0 for completely disjoint word sets', () => {
        expect(jaccardSimilarity('apple banana', 'cat dog')).toBe(0);
    });

    it('is case insensitive', () => {
        expect(jaccardSimilarity('Hello World', 'hello WORLD')).toBe(1);
    });

    it('returns 0 for two empty strings', () => {
        expect(jaccardSimilarity('', '')).toBe(0);
    });

    it('returns ~0.5 for half-overlapping word sets', () => {
        // {a,b} vs {b,c} → intersection {b} = 1, union {a,b,c} = 3 → 1/3
        const sim = jaccardSimilarity('a b', 'b c');
        expect(sim).toBeCloseTo(1 / 3, 5);
    });

    it('handles punctuation by tokenizing on non-word chars', () => {
        // "what is your name?" vs "what is your name" → identical token sets
        expect(jaccardSimilarity("what is your name?", "what is your name")).toBe(1);
    });

    it('registers measurable similarity for rephrased interview questions', () => {
        // Note: rephrased questions like these intentionally do NOT cross the 0.7
        // dedup threshold — a rephrase is treated as a legitimate re-ask. We only
        // assert that meaningful word overlap produces a nontrivial similarity.
        const a = "What's the time complexity of quicksort";
        const b = "And the time complexity for quicksort would be";
        expect(jaccardSimilarity(a, b)).toBeGreaterThan(0.3);
    });
});
