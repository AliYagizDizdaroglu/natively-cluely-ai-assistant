import { describe, it, expect } from 'vitest';
import { RUBRIC, graderPromptVersion, mergeVerdicts, pairAnswers, pairsFromAnswers, questionForGrader, summarizeVerdicts, verdictOf } from './interview60.judge.mjs';
import { summarizeJudge } from './interview60.metrics.mjs';

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
    it('gives the grader the on-screen problem for a screenshot cue and the parent for a chained follow-up (2026-09-08 roster)', () => {
        const chained = {
            ...timeline,
            items: [
                { id: 'C01', kind: 'screenshot', level: 'easy', topic: 'coding', problem: 'PY4', q: 'Now take a look at this problem on screen and walk me through how you would solve it.', playedAt: t('10.000'), clipSecs: 4 },
                { id: 'C01F1', kind: 'spoken', level: 'followup', topic: 'coding', chain: 'C01', q: 'What is the time complexity of what you just wrote, and can you do better?', playedAt: t('40.000'), clipSecs: 3 },
                { id: 'L01', kind: 'spoken', level: 'long', topic: 'SageMaker', q: 'Walk me through the training pipeline for a nightly recommendation model.', playedAt: t('70.000'), clipSecs: 5 },
                { id: 'L01F1', kind: 'spoken', level: 'followup', topic: 'SageMaker', chain: 'L01', q: 'What happens when the nightly training job finishes late?', playedAt: t('100.000'), clipSecs: 3 },
            ],
        };
        const log = [
            '2026-09-04T08:00:16.000Z [LOG] [Main] dispatch: answer source=live anchor="Take a look at this problem on screen and walk me through how you would solve it." verdict=match',
            '2026-09-04T08:00:19.000Z [LOG] [Answer] full: "Count with a hash map, then a heap of size k."',
            '2026-09-04T08:00:45.000Z [LOG] [Main] dispatch: answer source=live anchor="What is the time complexity of what you just wrote, and can you do better?" verdict=match',
            '2026-09-04T08:00:48.000Z [LOG] [Answer] full: "O(n log k); bucket sort gets O(n)."',
            '2026-09-04T08:01:17.000Z [LOG] [Main] dispatch: answer source=live anchor="Walk me through the training pipeline for a nightly recommendation model." verdict=match',
            '2026-09-04T08:01:20.000Z [LOG] [Answer] full: "Ingest, validate, train, evaluate, register."',
            '2026-09-04T08:01:45.000Z [LOG] [Main] dispatch: answer source=live anchor="What happens when the nightly training job finishes late?" verdict=match',
            '2026-09-04T08:01:48.000Z [LOG] [Answer] full: "Serve yesterday\'s model and alert."',
        ].join('\n');
        const pairs = pairAnswers(log, chained);
        expect(pairs.map((p) => p.id)).toEqual(['C01', 'C01F1', 'L01', 'L01F1']);
        // The cue: the problem text rides along, so the grader knows what was on screen.
        expect(pairs[0].question).toContain('[On screen: LeetCode 347 Top K Frequent Elements.');
        // A follow-up on the cue: the SAME problem, named as the thing that was on screen.
        expect(pairs[1].question).toBe(`${chained.items[1].q} [Follow-up on the problem that was on screen: ${pairs[0].question.slice(pairs[0].question.indexOf('LeetCode'), -1)}]`);
        // Control: a long question with no chain gets no suffix at all.
        expect(pairs[2].question).toBe(chained.items[2].q);
        // A follow-up on a spoken question: the parent's text.
        expect(pairs[3].question).toBe(`${chained.items[3].q} [Follow-up to: ${chained.items[2].q}]`);
        expect(pairs[3].level).toBe('followup');
    });

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

    it('an extend dispatch (the fuller sentence of an answered head) appends its answer to the head pair instead of making a second pair', () => {
        // The extend is dispatched while the head is still streaming, so its own full
        // line is the second one after it — the head keeps the first.
        const extended = [
            '2026-09-04T08:00:16.000Z [LOG] [Main] dispatch: answer source=whisper anchor="What is the difference between a docker image" verdict=match',
            '2026-09-04T08:00:16.400Z [LOG] [Main] dispatch: extend source=live anchor="What is the difference between a docker image and a container, and when does it matter?" verdict=match extends="What is the difference between a docker image" question="What is the difference between a docker image and a container, and when does it matter?"',
            '2026-09-04T08:00:19.500Z [LOG] [Answer] full: "An image is the read-only blueprint."',
            '2026-09-04T08:00:22.000Z [LOG] [Answer] full: "A container is a running instance of it; it matters when you scale."',
        ].join('\n');
        const pairs = pairAnswers(extended, timeline);
        expect(pairs.map((p) => p.id)).toEqual(['W01']);
        expect(pairs[0].answer).toBe('An image is the read-only blueprint.\n\nA container is a running instance of it; it matters when you scale.');
        expect(pairs[0].extended).toBe(true);
        expect(pairs[0].heardExtended).toBe('What is the difference between a docker image and a container, and when does it matter?');
    });

    it('a supersede dispatch (a continuation that replaces the answer already given) REPLACES the head pair\'s answer instead of appending', () => {
        const superseded = [
            '2026-09-04T08:00:16.000Z [LOG] [Main] dispatch: answer source=whisper anchor="What is the difference between a docker image" verdict=match',
            '2026-09-04T08:00:19.500Z [LOG] [Answer] full: "An image is the read-only blueprint."',
            '2026-09-04T08:00:22.000Z [LOG] [Main] dispatch: supersede source=whisper anchor="What is the difference between a docker image and a container, and when does it matter?" verdict=match replaces="What is the difference between a docker image" question="What is the difference between a docker image and a container, and when does it matter?"',
            '2026-09-04T08:00:25.000Z [LOG] [Answer] full: "A container is a running instance of an image; it matters once you need more than one."',
        ].join('\n');
        const pairs = pairAnswers(superseded, timeline);
        expect(pairs.map((p) => p.id)).toEqual(['W01']);
        // Replaced, not appended: the head's answer is the SECOND full line only.
        expect(pairs[0].answer).toBe('A container is a running instance of an image; it matters once you need more than one.');
        expect(pairs[0].superseded).toBe(true);
        expect(pairs[0].heardSuperseded).toBe('What is the difference between a docker image and a container, and when does it matter?');
        // The extend branch above stays live and untouched by this one.
        expect(pairs[0].extended).toBe(false);
        expect(pairs[0].heardExtended).toBe(null);
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

    it('claims an answer anchored on a Live paraphrase by the question= it dispatched (h40b R07F: the anchor is the paraphrase\'s first 80 chars and shares no content word with the played text)', () => {
        const at = (iso: string) => Date.parse(iso);
        const tl = { ...timeline, items: [
            { id: 'R07', kind: 'spoken', level: 'verbal', topic: 'queues', q: 'Two workers pick up the same job from a queue. How do you stop that happening?', playedAt: at('2026-09-04T08:00:00.000Z'), clipSecs: 6 },
            { id: 'R07F', kind: 'spoken', level: 'followup', topic: 'queues', chain: 'R07', q: 'And if the worker that claimed it crashes halfway?', playedAt: at('2026-09-04T08:01:30.000Z'), clipSecs: 3 },
        ] };
        const log = [
            '2026-09-04T08:01:40.000Z [LOG] [Main] dispatch: answer source=live anchor="In the scenario where two workers are picking up jobs from a queue, what happens" verdict=paraphrase question="In the scenario where two workers are picking up jobs from a queue, what happens if the worker that claimed a job crashes halfway through processing it?"',
            '2026-09-04T08:01:44.000Z [LOG] [Answer] full: "I rely on the visibility timeout and an idempotent handler."',
        ].join('\n');
        const pairs = pairAnswers(log, tl);
        expect(pairs.map((p) => p.id)).toEqual(['R07F']);
        expect(pairs[0].question).toBe(`${tl.items[1].q} [Follow-up to: ${tl.items[0].q}]`);
        expect(pairs[0].heard).toBe('In the scenario where two workers are picking up jobs from a queue, what happens');
        // Without a question= field the same anchor stays unclaimed, as before (R07's own window ended at 66 s).
        expect(pairAnswers(log.replace(/ question="[^"]*"/, ''), tl).map((p) => p.id)).toEqual(['?']);
    });
    it('exports questionForGrader for the blind-pairs builders: a chained follow-up carries its parent', () => {
        const items = [{ id: 'P', q: 'Parent question?' }, { id: 'F', chain: 'P', q: 'Follow-up?' }] as any[];
        expect(questionForGrader(items[1], items)).toBe('Follow-up? [Follow-up to: Parent question?]');
        expect(questionForGrader(items[0], items)).toBe('Parent question?');
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
        }, 'claude-opus-5');
        expect(merged.model).toBe('claude-opus-5');
        expect(Object.keys(merged.items)).toEqual(['W01', 'W02', 'C01', 'W01#2']);
        expect(merged.items.W01).toMatchObject({ kind: 'spoken', verdict: 'acceptable', correctness: 2, on_topic: 2, delivery: 2, reason: 'clear and correct' });
        expect(merged.items.W02).toMatchObject({ verdict: 'wrong', reason: 'no answer was delivered' });
        expect(merged.items.C01).toMatchObject({ kind: 'cue', verdict: 'error', reason: 'no verdict' });
        expect(merged.items['W01#2']).toMatchObject({ verdict: 'error', reason: 'verdict correctness=3' });
        expect(summarizeVerdicts(merged)).toEqual({ model: 'claude-opus-5', n: 3, acceptable: 1, weak: 0, wrong: 1, errors: 1 });
    });

    it('stamps the grader-prompt version, so two judge files are only compared when the instrument matches', () => {
        // The wording of the grading prompt IS the instrument: after8's identical answers
        // scored 50 under one wording and 46 under another (2026-09-08). Without a stamp
        // there is no way to tell which files are comparable.
        const merged = mergeVerdicts(pairAnswers(dbg, timeline), {
            W01: { correctness: 2, on_topic: 2, delivery: 2, reason: 'ok' },
        }, 'claude-opus-5', 'a1b2c3d4e5f6');
        expect(merged.graderPrompt).toBe('a1b2c3d4e5f6');
        // Absent when the caller does not supply one — a pre-freeze file, explicitly marked.
        expect(mergeVerdicts(pairAnswers(dbg, timeline), {}, 'claude-opus-5').graderPrompt).toBeNull();
    });

    it('records the model that graded the verdicts, so the pass names its grader instead of a default label', () => {
        // The grading agents' "opus" alias moved from claude-opus-5 to claude-opus-5-5 between two
        // passes (2026-09-22 → 09-24) and the same answers lost 4-7 of 39 acceptable, while every
        // judge file still said claude-opus-5: this merge wrote JUDGE_MODEL whoever graded.
        const merged = mergeVerdicts(pairAnswers(dbg, timeline), {
            W01: { correctness: 2, on_topic: 2, delivery: 2, reason: 'ok' },
        }, 'claude-opus-5-5', 'a1b2c3d4e5f6');
        expect(merged.graderModel).toBe('claude-opus-5-5');
        expect(merged.model).toBe('claude-opus-5-5');
    });

    it('refuses to merge without the grader model, or with an alias that names no version', () => {
        const pairs = pairAnswers(dbg, timeline);
        const verdicts = { W01: { correctness: 2, on_topic: 2, delivery: 2, reason: 'ok' } };
        expect(() => mergeVerdicts(pairs, verdicts)).toThrow(/--model/);
        expect(() => mergeVerdicts(pairs, verdicts, 'opus')).toThrow(/--model/);
    });

    it('sends the operator to the grading agent\'s transcript for the model, and never offers an id to copy', () => {
        // A literal id in the message is what the next alias move would copy onto the record.
        let message = '';
        try { mergeVerdicts(pairAnswers(dbg, timeline), {}, 'opus'); } catch (e) { message = String((e as Error).message); }
        expect(message).toMatch(/transcript/);
        expect(message).not.toMatch(/claude-[a-z]+-\d/);
    });

    it('keeps each item id and roster level, so the summary can report long questions and follow-ups beside the base roster', () => {
        // Without these two fields the merged file cannot be split by level, and every
        // long question and follow-up silently lands in the base count instead — which
        // is what happened to the after9 arms (2026-09-08).
        const tl = {
            ...timeline,
            items: [
                { id: 'L01', kind: 'spoken', level: 'long', topic: 'SageMaker', q: 'Walk me through the training pipeline for a nightly recommendation model.', playedAt: t('10.000'), clipSecs: 4 },
                { id: 'L01F1', kind: 'spoken', level: 'followup', topic: 'SageMaker', chain: 'L01', q: 'What happens when that job finishes late?', playedAt: t('40.000'), clipSecs: 3 },
            ],
        };
        const log = [
            '2026-09-04T08:00:16.000Z [LOG] [Main] dispatch: answer source=live anchor="Walk me through the training pipeline for a nightly recommendation model." verdict=match',
            '2026-09-04T08:00:19.000Z [LOG] [Answer] full: "Ingest, validate, train, evaluate, register."',
            '2026-09-04T08:00:45.000Z [LOG] [Main] dispatch: answer source=live anchor="What happens when that job finishes late?" verdict=match',
            '2026-09-04T08:00:48.000Z [LOG] [Answer] full: "Serve yesterday\'s model and alert."',
        ].join('\n');
        const merged = mergeVerdicts(pairAnswers(log, tl), {
            L01: { correctness: 2, on_topic: 2, delivery: 2, reason: 'covers the pipeline' },
            L01F1: { correctness: 1, on_topic: 2, delivery: 2, reason: 'vague on the alert path' },
        }, 'claude-opus-5');
        expect(merged.items.L01).toMatchObject({ id: 'L01', level: 'long', verdict: 'acceptable' });
        expect(merged.items.L01F1).toMatchObject({ id: 'L01F1', level: 'followup', verdict: 'weak' });
        // The base roster count excludes both, which is what keeps it comparable across flights.
        expect(summarizeJudge(merged)).toMatchObject({
            n: 0,
            long: { n: 1, acceptable: 1, weak: 0, wrong: 0 },
            followup: { n: 1, acceptable: 0, weak: 1, wrong: 0 },
        });
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
        expect(Object.keys(mergeVerdicts(pairs, { W01: { correctness: 2, on_topic: 2, delivery: 2, reason: 'ok' } }, 'claude-opus-5').items)).toEqual(['W01']);
    });
});

describe('graderPromptVersion (the comparability stamp)', () => {
    it('covers the RUBRIC too, not just the prompt file — a rubric edit must move the stamp', () => {
        // The instrument is BOTH halves: the grader prompt the agent reads, and the RUBRIC the
        // pairs file carries and that prompt tells it to follow literally. Hashing only the
        // file lets a rubric edit ship judge files stamped identically to files graded under
        // the old scoring — the silent re-baseline the prompt file's own header forbids.
        expect(graderPromptVersion('delivery 0 = unspeakable text'))
            .not.toBe(graderPromptVersion('delivery 0 = unspeakable text, or far too long'));
        expect(graderPromptVersion()).toBe(graderPromptVersion(RUBRIC));
    });
});
