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
    it('returns "" when speaker labels are present but none is [INTERVIEWER] (R36 fix wave)', () => {
        // Before-run bug: fell back to the last line regardless of its label, so
        // a [ME]/[ASSISTANT] line (which can carry coaching vocabulary) got
        // classified as if it were the interviewer's question.
        const t = '[ME]: Could you clarify the question?\n[ASSISTANT (PREVIOUS SUGGESTION)]: base salary offer';
        expect(lastInterviewerTurn(t)).toBe('');
    });
});
