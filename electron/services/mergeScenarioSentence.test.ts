import { describe, it, expect } from 'vitest';
import { mergeScenarioSentence } from './mergeScenarioSentence';

describe('mergeScenarioSentence', () => {
    it('merges the scenario sentence when the model returns only the trailing question (H02 shape)', () => {
        const prev = { text: "A SageMaker endpoint's p99 latency is creeping up.", refTime: 0 };
        const cur = { text: 'How do you diagnose and fix it?', refTime: 3000 };
        const merged = mergeScenarioSentence('How do you diagnose and fix it?', prev, cur);
        expect(merged).toBe("A SageMaker endpoint's p99 latency is creeping up. How do you diagnose and fix it?");
    });

    it('merges the scenario sentence (H08 shape: pronoun as the object of a phrasal verb)', () => {
        const prev = { text: 'The same image behaves differently on your laptop and in the cluster.', refTime: 0 };
        const cur = { text: 'How do you track that down?', refTime: 2000 };
        const merged = mergeScenarioSentence('How do you track that down?', prev, cur);
        expect(merged).toBe('The same image behaves differently on your laptop and in the cluster. How do you track that down?');
    });

    it('leaves the question unchanged when the model already returned both sentences (no doubling)', () => {
        const prev = { text: 'Requests failing around midnight.', refTime: 0 };
        const cur = { text: 'Why did that suddenly start happening every night?', refTime: 2000 };
        const full = `${prev.text} ${cur.text}`;
        const result = mergeScenarioSentence(full, prev, cur);
        expect(result).toBe(full);
    });

    it('does not merge when the earlier sentence is itself a question', () => {
        const prev = { text: 'Have you seen this kind of failure before?', refTime: 0 };
        const cur = { text: 'How do you fix it?', refTime: 2000 };
        const result = mergeScenarioSentence('How do you fix it?', prev, cur);
        expect(result).toBe('How do you fix it?');
    });

    it('does not merge across a gap longer than 6000ms (separate turns)', () => {
        const prev = { text: 'A SageMaker endpoint has p99 latency creeping up.', refTime: 0 };
        const cur = { text: 'How do you diagnose and fix it?', refTime: 6001 };
        const result = mergeScenarioSentence('How do you diagnose and fix it?', prev, cur);
        expect(result).toBe('How do you diagnose and fix it?');
    });

    it('does not merge when the earlier sentence is too short to be a scenario statement (<4 words)', () => {
        const prev = { text: 'Great, thanks much.', refTime: 0 }; // 3 words
        const cur = { text: 'How do you fix it?', refTime: 1000 };
        const result = mergeScenarioSentence('How do you fix it?', prev, cur);
        expect(result).toBe('How do you fix it?');
    });

    it('does not merge when the question is already long enough to stand alone (>12 words)', () => {
        const prev = { text: 'A SageMaker endpoint has p99 latency creeping up.', refTime: 0 };
        // 13 words
        const cur = { text: 'How would you go about diagnosing and then actually fixing this problem today?', refTime: 1000 };
        const result = mergeScenarioSentence(cur.text, prev, cur);
        expect(result).toBe(cur.text);
    });

    it('does not merge when the returned question does not correspond to the most recent final', () => {
        const prev = { text: 'A SageMaker endpoint has p99 latency creeping up.', refTime: 0 };
        const cur = { text: 'How do you diagnose and fix it?', refTime: 1000 };
        const result = mergeScenarioSentence('What is the capital of France?', prev, cur);
        expect(result).toBe('What is the capital of France?');
    });

    it('leaves the question unchanged when there is no prior final to merge (prev/cur undefined)', () => {
        expect(mergeScenarioSentence('How do you fix it?', undefined, undefined)).toBe('How do you fix it?');
    });
});
