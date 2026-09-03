import { describe, it, expect } from 'vitest';
import { pairAnswers, summarizeVerdicts, verdictOf } from './interview60.judge.mjs';

const t = (s: string) => Date.parse(`2026-09-04T08:00:${s}Z`);
const timeline = {
    startedAt: '2026-09-04T08:00:00.000Z', endedAt: '2026-09-04T09:00:00.000Z',
    items: [
        { id: 'W01', kind: 'spoken', level: 'easy', topic: 'Docker', q: 'What is the difference between a Docker image and a container?', playedAt: t('10.000'), clipSecs: 4 },
        { id: 'W02', kind: 'spoken', level: 'easy', topic: 'Docker', q: 'Why do Docker layers matter for build times?', playedAt: t('40.000'), clipSecs: 3 },
        { id: 'C01', kind: 'cue', level: 'easy', topic: 'coding', q: 'Look at the problem on screen and walk me through it.', playedAt: t('50.000'), clipSecs: 3 },
    ],
};
const dbg = [
    '2026-09-04T08:00:16.000Z [LOG] [Main] dispatch: answer source=live anchor="What is the difference between a docker image and a container?" verdict=match',
    '2026-09-04T08:00:19.500Z [LOG] [Answer] full: "An image is the read-only blueprint; a container is a running instance of it."',
    '2026-09-04T08:00:45.000Z [LOG] [Main] dispatch: answer source=whisper anchor="Why do docker layers matter for build times?" verdict=match',
    // This answer never completed (stream failed) — no [Answer] full line follows before the next dispatch.
    '2026-09-04T08:00:55.000Z [LOG] [Main] dispatch: answer source=live anchor="Look at the problem on screen and walk me through it." verdict=match',
    '2026-09-04T08:00:58.000Z [LOG] [Answer] full: "I would start with a hash map."',
].join('\n');

describe('pairAnswers', () => {
    it('pairs each answer dispatch with the full answer that follows it, claimed to the scripted item', () => {
        const pairs = pairAnswers(dbg, timeline);
        expect(pairs.map((p) => [p.id, p.answer !== null])).toEqual([
            ['W01', true],
            ['W02', false], // dispatched, never delivered — graded as missing, not skipped
            ['C01', true],
        ]);
        expect(pairs[0].question).toBe('What is the difference between a Docker image and a container?');
        expect(pairs[0].heard).toBe('What is the difference between a docker image and a container?');
        expect(pairs[0].answer).toBe('An image is the read-only blueprint; a container is a running instance of it.');
        expect(pairs[0].kind).toBe('spoken');
        expect(pairs[2].kind).toBe('cue');
    });
});

describe('verdictOf', () => {
    it('is wrong when correctness or on-topic is 0, acceptable only when both are 2 and delivery is usable', () => {
        expect(verdictOf({ correctness: 0, on_topic: 2, delivery: 2 })).toBe('wrong');
        expect(verdictOf({ correctness: 2, on_topic: 0, delivery: 2 })).toBe('wrong');
        expect(verdictOf({ correctness: 2, on_topic: 2, delivery: 1 })).toBe('acceptable');
        expect(verdictOf({ correctness: 2, on_topic: 2, delivery: 0 })).toBe('weak');
        expect(verdictOf({ correctness: 1, on_topic: 2, delivery: 2 })).toBe('weak');
        expect(verdictOf({ correctness: 2, on_topic: 1, delivery: 2 })).toBe('weak');
    });
});

describe('summarizeVerdicts', () => {
    it('counts spoken items only, treats an undelivered answer as wrong, and reports the judge model', () => {
        const judged = {
            model: 'claude-opus-5',
            items: {
                W01: { kind: 'spoken', verdict: 'acceptable', correctness: 2, on_topic: 2, delivery: 2 },
                W02: { kind: 'spoken', verdict: 'wrong', reason: 'no answer was delivered' },
                W03: { kind: 'spoken', verdict: 'weak', correctness: 1, on_topic: 2, delivery: 2 },
                C01: { kind: 'cue', verdict: 'acceptable', correctness: 2, on_topic: 2, delivery: 2 },
            },
        };
        expect(summarizeVerdicts(judged)).toEqual({ model: 'claude-opus-5', n: 3, acceptable: 1, weak: 1, wrong: 1, errors: 0 });
    });
});
