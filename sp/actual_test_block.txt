import { describe, it, expect } from 'vitest';
import { isIntroQuestion } from './ContextAssembler';

// assemblePromptContext lower-cases and trims the question before this check; the
// fixtures below are already in that form.
describe('isIntroQuestion', () => {
    it('H09 (2026-09-04 after5 hour): a scenario question whose last clause is "what do you do" is not an intro', () => {
        expect(isIntroQuestion('someone changed a resource by hand and now your stack will not update. what do you do?')).toBe(false);
    });
    it('the two generic phrases are no longer intro requests on their own', () => {
        expect(isIntroQuestion('what do you do?')).toBe(false);
        expect(isIntroQuestion('who are you reporting to in that role?')).toBe(false);
    });
    it('a plain intro request is an intro, however politely wrapped', () => {
        expect(isIntroQuestion('tell me about yourself')).toBe(true);
        expect(isIntroQuestion('so, to start, could you tell me a little bit about yourself?')).toBe(true);
        expect(isIntroQuestion('could you walk me through your background?')).toBe(true);
        expect(isIntroQuestion('please introduce yourself.')).toBe(true);
    });
    it('a pleasantry before the request does not hide it; a scenario before it does', () => {
        expect(isIntroQuestion('thanks for joining. tell me about yourself.')).toBe(true);
        expect(isIntroQuestion('great! describe yourself in three words.')).toBe(true);
        expect(isIntroQuestion('we run a three-person platform team. could you tell me about yourself?')).toBe(false);
    });
    it('an ordinary question with no intro phrase is not an intro', () => {
        expect(isIntroQuestion('tell me about a time you handled a resource constraint problem.')).toBe(false);
    });
});
