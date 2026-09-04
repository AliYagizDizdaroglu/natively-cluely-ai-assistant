import { describe, it, expect } from 'vitest';
import { mergeVerdicts, pairAnswers, pairsFromAnswers, summarizeVerdicts, verdictOf } from './interview60.judge.mjs';

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

    it('claims an anchor with no content words by time — the tail of a question STT split in two — instead of dropping it', () => {
        // M27 in the 2026-09-04 hour: Deepgram's final was "And when would you not?", every word a stop word.
        const split = [
            '2026-09-04T08:00:44.000Z [LOG] [Main] dispatch: answer source=whisper anchor="And when would you not?" verdict=match',
            '2026-09-04T08:00:46.000Z [LOG] [Answer] full: "I would not use it for a single service."',
        ].join('\n');
        const pairs = pairAnswers(split, timeline);
        expect(pairs.map((p) => p.id)).toEqual(['W02']); // W02 played at 40 s; W01 ended long before
        // An anchor WITH content words that matches nothing still stays unclaimed.
        const noise = '2026-09-04T08:00:44.000Z [LOG] [Main] dispatch: answer source=whisper anchor="Configure the printer driver settings" verdict=match';
        expect(pairAnswers(noise, timeline).map((p) => p.id)).toEqual(['?']);
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

describe('mergeVerdicts (graded outside the script — the no-key route)', () => {
    it('keys a doubled item with a suffix, applies verdictOf, marks an undelivered answer wrong and a missing or malformed verdict as an error', () => {
        // A second W01 dispatch inside W01's window: the same item answered twice.
        const dbg2 = dbg + '\n' + [
            '2026-09-04T08:01:00.000Z [LOG] [Main] dispatch: answer source=whisper anchor="Difference between a docker image and a container" verdict=match',
            '2026-09-04T08:01:03.000Z [LOG] [Answer] full: "Images are immutable templates and containers are their running instances."',
        ].join('\n');
        const pairs = pairAnswers(dbg2, timeline);
        expect(pairs.map((p) => p.id)).toEqual(['W01', 'W02', 'C01', 'W01']);

        const merged = mergeVerdicts(pairs, {
            W01: { correctness: 2, on_topic: 2, delivery: 2, reason: 'clear and correct' },
            'W01#2': { correctness: 3, on_topic: 2, delivery: 2, reason: 'out of range' },
            // C01 has no verdict at all
        });
        expect(merged.model).toBe('claude-opus-5');
        expect(Object.keys(merged.items)).toEqual(['W01', 'W02', 'C01', 'W01#2']);
        expect(merged.items.W01).toMatchObject({ kind: 'spoken', verdict: 'acceptable', correctness: 2, on_topic: 2, delivery: 2, reason: 'clear and correct' });
        expect(merged.items.W02).toMatchObject({ verdict: 'wrong', reason: 'no answer was delivered' });
        expect(merged.items.C01).toMatchObject({ kind: 'cue', verdict: 'error', reason: 'no verdict' });
        expect(merged.items['W01#2']).toMatchObject({ verdict: 'error', reason: 'verdict correctness=3' });
        expect(summarizeVerdicts(merged)).toEqual({ model: 'claude-opus-5', n: 3, acceptable: 1, weak: 0, wrong: 1, errors: 1 });
    });
});

describe('pairsFromAnswers (an answer-only pass arm, for the model comparison)', () => {
    it('maps answered items to spoken pairs carrying the arm model and leaves transient errors out', () => {
        const store = {
            W01: { id: 'W01', level: 'easy', topic: 'Docker', q: 'What is a Docker image?', model: 'gemma-4-31b-it', spoken: 'An image is a read-only template.', words: 6, ttft: 900 },
            W02: { id: 'W02', level: 'easy', topic: 'Docker', q: 'Why do layers matter?', model: 'gemma-4-31b-it', transientError: 'HTTP 429' },
        };
        const pairs = pairsFromAnswers(store);
        expect(pairs).toHaveLength(1);
        expect(pairs[0]).toMatchObject({ id: 'W01', kind: 'spoken', question: 'What is a Docker image?', heard: 'What is a Docker image?', answer: 'An image is a read-only template.', model: 'gemma-4-31b-it', source: 'answers-pass' });
        // A transient item is absent from the pairs, so the merge never scores it as wrong.
        expect(Object.keys(mergeVerdicts(pairs, { W01: { correctness: 2, on_topic: 2, delivery: 2, reason: 'ok' } }).items)).toEqual(['W01']);
    });
});
