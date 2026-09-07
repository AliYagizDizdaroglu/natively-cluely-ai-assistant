import { describe, it, expect } from 'vitest';
import { shouldExtend, EXTEND_WINDOW_MS } from './extendOnClause';

describe('shouldExtend — the fuller sentence of an answered head', () => {
    it('fires when the later text contains the answered text and adds a clause (≥ 3 words)', () => {
        expect(shouldExtend('What is a DAG?', 'What is a DAG, and why does Airflow use that structure?', 2_300)).toBe(true);
        // after7 M27 at +25.7 s: the added clause is five words, only two of them content words.
        expect(shouldExtend(
            'When would you reach for a service mesh in an ML serving stack',
            'When would you reach for a service mesh in an ML serving stack, and when would you not?',
            25_700,
        )).toBe(true);
    });
    it('fires across the ears\' punctuation and number-spacing differences (after8 H02: "p 99." vs "P99,")', () => {
        expect(shouldExtend(
            'has p 99 latency creeping up. How do you diagnose and fix it?',
            'A SageMaker endpoint serving ten thousand requests per second has P99 latency creeping up, how do you diagnose and fix it?',
            1_100,
        )).toBe(true);
    });
    it('does not fire on the same question re-heard, or on one or two added words', () => {
        expect(shouldExtend('What is a DAG?', 'What is a DAG', 2_000)).toBe(false);
        expect(shouldExtend('What is a DAG?', 'What is a DAG then?', 2_000)).toBe(false);
        expect(shouldExtend('What is a DAG?', 'So what is a DAG?', 2_000)).toBe(false);
    });
    it('does not fire when the answered text is not contained (a reworded near-duplicate)', () => {
        expect(shouldExtend(
            'Why would you use CloudFormation instead of configuring things by hand?',
            'Why would you use CloudFormation instead of configuring things by console, and when not?',
            20_000,
        )).toBe(false);
    });
    it('does not fire past the window', () => {
        expect(shouldExtend('What is a DAG?', 'What is a DAG, and why does Airflow use that structure?', EXTEND_WINDOW_MS + 1)).toBe(false);
    });
});
