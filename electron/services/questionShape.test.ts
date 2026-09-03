import { describe, it, expect } from 'vitest';
import { isFragment } from './questionShape';

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
