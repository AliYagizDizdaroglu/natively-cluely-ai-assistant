import { describe, it, expect } from 'vitest';
import { keepSpokenBudget } from './knowledgePromptBudget';
import { SPOKEN_LENGTH_AND_DEPTH, VERBAL_WHAT_TO_ANSWER_PROMPT, CODE_HINT_PROMPT } from './prompts';

describe('keepSpokenBudget', () => {
    it('a verbal caller keeps its counted word budget when the knowledge prompt replaces it', () => {
        const out = keepSpokenBudget(VERBAL_WHAT_TO_ANSWER_PROMPT, 'KNOWLEDGE PROMPT');
        expect(out.startsWith('KNOWLEDGE PROMPT')).toBe(true);
        expect(out).toContain(SPOKEN_LENGTH_AND_DEPTH);
        expect(out.indexOf(SPOKEN_LENGTH_AND_DEPTH)).toBeGreaterThan(out.indexOf('KNOWLEDGE PROMPT'));
    });
    it('a caller without the budget block (typed chat, code hints) gets the knowledge prompt unchanged', () => {
        expect(keepSpokenBudget(undefined, 'KNOWLEDGE PROMPT')).toBe('KNOWLEDGE PROMPT');
        expect(keepSpokenBudget(CODE_HINT_PROMPT, 'KNOWLEDGE PROMPT')).toBe('KNOWLEDGE PROMPT');
    });
});
