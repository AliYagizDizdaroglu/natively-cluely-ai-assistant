import { describe, it, expect } from 'vitest';
import { lastInterviewerTurn } from './lastInterviewerTurn';

describe('lastInterviewerTurn', () => {
    it('returns the text of the last [INTERVIEWER] line', () => {
        const t = '[INTERVIEWER]: What is a Pod?\n[ME]: A Pod is…\n[ASSISTANT (PREVIOUS SUGGESTION)]: base salary offer\n[INTERVIEWER]: How would you autoscale that deployment?';
        expect(lastInterviewerTurn(t)).toBe('How would you autoscale that deployment?');
    });
    it('falls back to the last non-empty line when no speaker labels are present', () => {
        expect(lastInterviewerTurn('first\n\nsecond line \n')).toBe('second line');
    });
    it('returns an empty string for an empty transcript', () => {
        expect(lastInterviewerTurn('')).toBe('');
    });
});
