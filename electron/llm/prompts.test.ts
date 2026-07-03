import { describe, it, expect } from 'vitest';
import { INTERVIEW_COPILOT_PROMPT, CODE_HINT_PROMPT, BRAINSTORM_MODE_PROMPT, resolveGemmaSystemPrompt } from './prompts';

describe('INTERVIEW_COPILOT_PROMPT (Gemma 4 31B default prompt when no caller override is given)', () => {
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

describe('resolveGemmaSystemPrompt (streamChat Gemma branch must not silently discard caller overrides)', () => {
    it('returns the resolved system prompt when the caller passed an explicit override', () => {
        // Second arg models `baseSystemPrompt` in streamChat, which may carry extra
        // augmentation (e.g. active-mode suffix) beyond the raw caller-supplied value —
        // the resolved value, not the raw one, is what must reach Gemma.
        const augmented = `${CODE_HINT_PROMPT}\n\n## ACTIVE MODE\nSome suffix`;
        expect(resolveGemmaSystemPrompt(CODE_HINT_PROMPT, augmented)).toBe(augmented);
    });

    it('falls back to INTERVIEW_COPILOT_PROMPT when the caller passed no override', () => {
        // Even if internal knowledge-mode/active-mode injection later mutated the
        // resolved prompt, Gemma's TTFT-critical default path must stay untouched
        // unless the caller itself asked for something specific.
        expect(resolveGemmaSystemPrompt(undefined, 'some internally-injected prompt')).toBe(INTERVIEW_COPILOT_PROMPT);
    });

    it('regression: CODE_HINT_PROMPT and BRAINSTORM_MODE_PROMPT are no longer silently replaced by INTERVIEW_COPILOT_PROMPT', () => {
        expect(resolveGemmaSystemPrompt(CODE_HINT_PROMPT, CODE_HINT_PROMPT)).toBe(CODE_HINT_PROMPT);
        expect(resolveGemmaSystemPrompt(BRAINSTORM_MODE_PROMPT, BRAINSTORM_MODE_PROMPT)).toBe(BRAINSTORM_MODE_PROMPT);
    });
});
