import { describe, it, expect } from 'vitest';
import { isSmallTalk } from './smallTalk';
// @ts-ignore — untyped ESM harness modules
import { SMALLTALK25 } from '../test/golden/smalltalk25.questions.mjs';
// @ts-ignore
import { INTERVIEW } from '../test/golden/interview60.questions.mjs';
// @ts-ignore
import { LIVE40 } from '../test/golden/live40.questions.mjs';
// @ts-ignore
import { SCENARIO50 } from '../test/golden/scenario50.questions.mjs';
// @ts-ignore
import { HOLDOUT40 } from '../test/golden/holdout40.questions.mjs';

describe('isSmallTalk: question-shaped pleasantries are not questions', () => {
    it.each([
        'Can you hear me okay?',            // ST02
        'How are you doing today?',         // ST03
        'Did you have a good weekend?',     // ST04
        'Can you hear me?',
        'Can you see my screen?',
        'How are you?',
        "How's it going?",
        'How was your weekend?',
        "How's the weather over there?",
        'How was your commute?',
        'Hi, good morning, thanks for joining.',
        'Hello, how are you today?',
        'Can you hear me okay? How are you doing today?',
    ])('%s', (t) => expect(isSmallTalk(t)).toBe(true));
});

describe('isSmallTalk: real questions are never small talk', () => {
    it.each([
        'Tell me about yourself.',
        'Do you have any questions for us?',
        'How are you handling retries in your pipeline?',
        'How are you doing with the migration to Kubernetes?',
        'Can you hear the difference between latency and throughput?',
        'Can you explain how a DAG scheduler works?',
        'Tell me about a time you disagreed with a teammate.',
        'Why?',
        'Why that one?',
        'How so?',
        'Hi, thanks for joining. Tell me about yourself.',
        'Can you hear me okay? Tell me about a time you debugged a production outage.',
        'How was your experience with the last team you led?',
        '',
    ])('%s', (t) => expect(isSmallTalk(t)).toBe(false));
});

describe('isSmallTalk against every recorded roster', () => {
    const real = [
        ...SMALLTALK25.filter((x: any) => x.expect === 'answer'),
        ...INTERVIEW, ...LIVE40, ...SCENARIO50, ...HOLDOUT40,
    ];
    it('drops no real roster question', () => {
        const hit = real.filter((x: any) => isSmallTalk(x.q)).map((x: any) => x.id);
        expect(hit).toEqual([]);
        expect(real.length).toBeGreaterThan(150);
    });
    it('drops all three question-shaped small-talk items', () => {
        const q = SMALLTALK25.filter((x: any) => x.talk === 'smalltalk-question');
        expect(q.map((x: any) => x.id)).toEqual(['ST02', 'ST03', 'ST04']);
        expect(q.filter((x: any) => !isSmallTalk(x.q))).toEqual([]);
    });
});
