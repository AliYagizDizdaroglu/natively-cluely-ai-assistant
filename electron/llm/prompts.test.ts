import { describe, it, expect } from 'vitest';
import { INTERVIEW_COPILOT_PROMPT } from './prompts';

describe('INTERVIEW_COPILOT_PROMPT (sole prompt Gemma 4 31B ever receives)', () => {
    it('still defaults to Python and preserves the requested-language override', () => {
        expect(INTERVIEW_COPILOT_PROMPT).toContain('requested language (Python by default)');
    });

    it('instructs idiomatic/Pythonic style for Python output', () => {
        expect(INTERVIEW_COPILOT_PROMPT).toMatch(/idiomatic|Pythonic/i);
        // Concrete idioms, not just a vague "be clean" instruction.
        expect(INTERVIEW_COPILOT_PROMPT).toMatch(/comprehension/i);
    });

    it('preserves interview integrity: explicitly-asked data structures must still be hand-rolled', () => {
        // Guards against the LLM substituting e.g. collections.OrderedDict for a
        // hand-asked "implement an LRU cache" question, which would skip the
        // actual exercise the interviewer is testing.
        expect(INTERVIEW_COPILOT_PROMPT).toMatch(/hand|by hand|implement.*yourself|skip(s|ping)? the exercise/i);
    });

    it('keeps the 5-part output shape intact (regression guard on the surrounding structure)', () => {
        expect(INTERVIEW_COPILOT_PROMPT).toContain('One short first-person sentence stating your approach');
        expect(INTERVIEW_COPILOT_PROMPT).toContain('step-by-step walkthrough');
        expect(INTERVIEW_COPILOT_PROMPT).toContain('Time:');
        expect(INTERVIEW_COPILOT_PROMPT).toContain('Space:');
        expect(INTERVIEW_COPILOT_PROMPT).toContain('Why:');
    });
});
