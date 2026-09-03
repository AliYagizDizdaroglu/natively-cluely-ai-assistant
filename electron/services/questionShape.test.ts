import { describe, it, expect } from 'vitest';
import { isFragment, isQuestionShaped } from './questionShape';

describe('isFragment', () => {
    it('fewer than 4 words is a fragment', () => {
        expect(isFragment('training jobs are')).toBe(true); // 3 words (run-2 H06)
        expect(isFragment('yeah')).toBe(true);
        expect(isFragment('')).toBe(true);
    });

    it('4 or more words is not a fragment', () => {
        expect(isFragment('training jobs are queued')).toBe(false); // exactly 4
        expect(isFragment('What is a Kubernetes Pod?')).toBe(false);
    });
});

describe('isQuestionShaped', () => {
    it('the run-2 statement half of a two-sentence scenario question is not question-shaped', () => {
        // H02
        expect(isQuestionShaped('point serving 10,000 requests per second has P99 latency creeping up.')).toBe(false);
        // H05
        expect(isQuestionShaped('fine for months now misses its slot every night.')).toBe(false);
        // H09
        expect(isQuestionShaped('a resource by hand and now your stack will not update.')).toBe(false);
        // H06 — also a fragment, but isQuestionShaped is checked independently of length.
        expect(isQuestionShaped('training jobs are')).toBe(false);
    });

    it('ends with a question mark (closing quotes/brackets after it are fine)', () => {
        expect(isQuestionShaped('What is a Kubernetes Pod?')).toBe(true);
        expect(isQuestionShaped('Kubernetes or ECS for this?')).toBe(true);
        expect(isQuestionShaped('She asked "why?"')).toBe(true);
        expect(isQuestionShaped('全角の質問？')).toBe(true); // fullwidth ？
    });

    it('starts with a question word even without a trailing "?"', () => {
        expect(isQuestionShaped('Tell me about a time you disagreed with a manager.')).toBe(true);
        expect(isQuestionShaped('Walk me through it, and mention the time complexity.')).toBe(true);
    });

    it('"Redis or Memcached, and why." is not question-shaped — held 2.5s, not dropped', () => {
        // "why" is a question word, but it is not the FIRST word here.
        expect(isQuestionShaped('Redis or Memcached, and why.')).toBe(false);
    });
});
