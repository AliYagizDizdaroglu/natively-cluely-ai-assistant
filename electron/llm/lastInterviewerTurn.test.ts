import { describe, it, expect } from 'vitest';
import { lastInterviewerTurn, pinSettledQuestion } from './lastInterviewerTurn';

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

describe('pinSettledQuestion', () => {
    // Transcript lines are lower-cased by the cleaner (prepareTranscriptForWhatToAnswer);
    // the settled question keeps its own case. All four cases are the last lines the
    // 2026-09-04 after4 hour actually had at dispatch.
    it('M26 — absorbs the STT fragment of the same utterance and ends with the settled question', () => {
        const t = "[INTERVIEWER]: how do you handle deleting a user's data across many services?\n[ASSISTANT]: to handle that across multiple services, i would use an event.\n[INTERVIEWER]: cross many model services.";
        const q = 'How do you keep base images patched across many model services?';
        expect(pinSettledQuestion(t, q)).toBe(
            "[INTERVIEWER]: how do you handle deleting a user's data across many services?\n[ASSISTANT]: to handle that across multiple services, i would use an event.\n[INTERVIEWER]: How do you keep base images patched across many model services?",
        );
    });
    it('M28 — a one-word fragment is absorbed', () => {
        const q = 'How do you keep feature engineering consistent between training and serving?';
        expect(pinSettledQuestion('[ASSISTANT]: the previous answer.\n[INTERVIEWER]: serving.', q)).toBe(`[ASSISTANT]: the previous answer.\n[INTERVIEWER]: ${q}`);
    });
    it('H09 — both halves of a split question are absorbed', () => {
        const t = '[INTERVIEWER]: someone changed the resource by hand, and now your stack will not update.\n[INTERVIEWER]: what do you do?';
        const q = 'Someone changed a resource by hand and now your stack will not update. What do you do?';
        expect(pinSettledQuestion(t, q)).toBe(`[INTERVIEWER]: ${q}`);
    });
    it('M27 — a conjunction tail is absorbed by the whole sentence', () => {
        const q = 'When would you reach for a service mesh in an ML serving stack, and when would you not?';
        expect(pinSettledQuestion('[INTERVIEWER]: and when would you not?', q)).toBe(`[INTERVIEWER]: ${q}`);
    });
    it('keeps a trailing interviewer line that is a different utterance, before the new one', () => {
        const q = 'When would you reach for a service mesh in an ML serving stack, and when would you not?';
        expect(pinSettledQuestion('[INTERVIEWER]: how do you patch base images?', q)).toBe(`[INTERVIEWER]: how do you patch base images?\n[INTERVIEWER]: ${q}`);
    });
    it('only touches the trailing run — an earlier identical question behind an assistant line stays', () => {
        const t = '[INTERVIEWER]: what is a pod?\n[ASSISTANT]: a pod is the smallest unit.';
        expect(pinSettledQuestion(t, 'What is a Pod?')).toBe(`${t}\n[INTERVIEWER]: What is a Pod?`);
    });
    it('a snapshot already ending in the question is unchanged in content', () => {
        const t = '[ME]: sure.\n[INTERVIEWER]: What is a Pod?';
        expect(pinSettledQuestion(t, 'What is a Pod?')).toBe(t);
    });
    it('an empty transcript becomes the single question line', () => {
        expect(pinSettledQuestion('', 'What is a Pod?')).toBe('[INTERVIEWER]: What is a Pod?');
    });
    it('the parser always reads the settled question back', () => {
        const q = 'How do you keep base images patched across many model services?';
        for (const t of ['', '[INTERVIEWER]: cross many model services.', '[INTERVIEWER]: unrelated earlier question about kafka?\n[ME]: yes.']) {
            expect(lastInterviewerTurn(pinSettledQuestion(t, q))).toBe(q);
        }
    });
});
