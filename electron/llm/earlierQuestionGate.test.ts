import { describe, it, expect } from 'vitest';
import { gate, firstSegment, wordsOf } from './earlierQuestionGate';
import { SCENARIO50 } from '../test/golden/scenario50.questions.mjs';

// Design 2's calibration set (spec §3.2: 19 must-fire / 10 must-not), re-run on the TS port.
// Roster sentences come from the committed scenario50 roster (never holdout40); the rest are invented.
const rosterQ = (id: string): string => {
    const item = (SCENARIO50 as { id: string; q: string }[]).find((i) => i.id === id);
    if (!item) throw new Error(`scenario50 id ${id} missing`);
    return item.q;
};

const SHOULD_FIRE: [string, string][] = [
    ['leading', 'Now without a cache, how would you meet the same latency?'], ['pronoun', rosterQ('S1Q06F')], ['pronoun', rosterQ('S2Q06F')], ['pronoun', rosterQ('S2Q08F')],
    ['constraint', rosterQ('S1Q04F')], ['reference', rosterQ('S2Q09F')], ['leading', rosterQ('S3Q04F')], ['leading', rosterQ('S4Q09F')], ['short', 'Why?'],
    ['leading', 'And in production?'], ['pronoun', 'Does that scale?'], ['leading', 'What about Redis instead?'], ['leading', 'Okay, and if it fails?'],
    ['callback', 'Going back to the micro-batcher, how would you shard it?'], ['callback', 'You mentioned idempotency earlier. How do you enforce it?'],
    ['pronoun', 'Would that still hold under a network partition?'], ['leading', 'Same question, but for a write-heavy workload.'],
    ['pronoun', 'How would you keep the same latency budget with twice the traffic?'], ['leading', 'And what if it has to run on a single core?'],
];
const SHOULD_NOT_FIRE: string[] = [
    'Explain the CAP theorem.', 'What is a Kubernetes readiness probe?', 'In this scenario, what would you monitor first?', 'Design a URL shortener that handles a billion requests a day.',
    'Tell me about a time you disagreed with a manager.', 'Given an array of integers, return the indices of two numbers that add up to a target.', 'How would you ensure that a nightly job never runs twice?',
    'Walk me through how you would debug a memory leak in a Python service.', 'Design the next version of the churn platform, it has to support nightly scoring for 400,000 customers.', rosterQ('S4Q04F'),
];

describe('earlierQuestionGate — design 2 cue set, ported byte for byte', () => {
    it('19 must-fire sentences fire with their cue', () => {
        for (const [cue, q] of SHOULD_FIRE) expect({ q: q.slice(0, 40), ...gate(q) }).toEqual({ q: q.slice(0, 40), fires: true, cue });
    });
    it('10 must-not sentences stay silent', () => {
        for (const q of SHOULD_NOT_FIRE) expect({ q: q.slice(0, 40), ...gate(q) }).toEqual({ q: q.slice(0, 40), fires: false, cue: 'none' });
    });
    it('empty, blank, null and undefined never fire', () => {
        for (const q of ['', '   ', null, undefined]) expect(gate(q as any)).toEqual({ fires: false, cue: 'none' });
    });
    it('a leading interjection is stripped before the cue is read ("Okay, and if it fails?" is leading, not pronoun)', () => {
        expect(gate('Okay, and if it fails?').cue).toBe('leading');
        expect(gate('Yeah. So, what about Redis instead?').cue).toBe('leading');
    });
    it('"that" after a noun is a relative clause, not a pronoun ("a batch that fails" stays silent)', () => {
        expect(gate('How would you retry a batch that fails halfway?').fires).toBe(false);
    });
    it('the constraint cue is read before the pronoun cue, and only on a short question (over 25 words the question states its own constraint)', () => {
        expect(gate('How would you shard it while preserving the ordering guarantee?').cue).toBe('constraint');
        expect(gate('How would you shard the store while preserving the ordering guarantee?').cue).toBe('constraint');
        const long = 'How would you shard the telemetry store across twelve regions with independent failure domains and still keep every single tenant fully local while preserving the ordering guarantee?';
        expect(wordsOf(long)).toBe(27);
        expect(gate(long).cue).toBe('none');
    });
    it('firstSegment stops at the first . : ; ? ! , or em dash', () => {
        expect(firstSegment('Does that scale, and at what cost?')).toBe('Does that scale');
        expect(firstSegment('No punctuation here')).toBe('No punctuation here');
    });
});
