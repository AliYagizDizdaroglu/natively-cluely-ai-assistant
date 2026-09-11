import { describe, it, expect } from 'vitest';
import { keepVerbalPrompt, carriesSpokenBudget, withActiveModePrompt } from './knowledgePromptBudget';
import { VERBAL_WHAT_TO_ANSWER_PROMPT, CODE_HINT_PROMPT, UNIVERSAL_WHAT_TO_ANSWER_PROMPT, MODE_GENERAL_PROMPT } from './prompts';

describe('carriesSpokenBudget — which callers keep their prompt free of injected personas', () => {
    it('the hands-free verbal prompt does', () => {
        expect(carriesSpokenBudget(VERBAL_WHAT_TO_ANSWER_PROMPT)).toBe(true);
    });
    it('typed chat, code hints, the coding prompt and the mode prompt itself do not', () => {
        expect(carriesSpokenBudget(undefined)).toBe(false);
        expect(carriesSpokenBudget(CODE_HINT_PROMPT)).toBe(false);
        expect(carriesSpokenBudget(UNIVERSAL_WHAT_TO_ANSWER_PROMPT)).toBe(false);
        expect(carriesSpokenBudget(MODE_GENERAL_PROMPT)).toBe(false);
    });
});

describe('keepVerbalPrompt', () => {
    it('a verbal caller keeps its whole prompt: the knowledge rules never replace it', () => {
        const out = keepVerbalPrompt(VERBAL_WHAT_TO_ANSWER_PROMPT, 'KNOWLEDGE PROMPT');
        expect(out).toBe(VERBAL_WHAT_TO_ANSWER_PROMPT);
        expect(out).not.toContain('KNOWLEDGE PROMPT');
    });
    it('a verbal caller gains the identity line after its prompt, nothing else', () => {
        const id = 'You generate interview-ready speech for Ada, who works as an MLOps engineer.';
        const out = keepVerbalPrompt(VERBAL_WHAT_TO_ANSWER_PROMPT, 'KNOWLEDGE PROMPT', id);
        expect(out).toBe(`${VERBAL_WHAT_TO_ANSWER_PROMPT}\n\n${id}`);
        expect(keepVerbalPrompt(undefined, 'KNOWLEDGE PROMPT', id)).toBe('KNOWLEDGE PROMPT');
    });
    it('a caller without the budget block (typed chat, code hints) gets the knowledge prompt unchanged', () => {
        expect(keepVerbalPrompt(undefined, 'KNOWLEDGE PROMPT')).toBe('KNOWLEDGE PROMPT');
        expect(keepVerbalPrompt(CODE_HINT_PROMPT, 'KNOWLEDGE PROMPT')).toBe('KNOWLEDGE PROMPT');
    });
});

describe('withActiveModePrompt — the mode prompt joins every prompt except the verbal one', () => {
    it('typed chat gets the mode prompt under ## ACTIVE MODE', () => {
        expect(withActiveModePrompt('BASE', 'MODE', undefined)).toBe('BASE\n\n## ACTIVE MODE\nMODE');
        expect(withActiveModePrompt(CODE_HINT_PROMPT, 'MODE', CODE_HINT_PROMPT)).toBe(`${CODE_HINT_PROMPT}\n\n## ACTIVE MODE\nMODE`);
    });
    it('the verbal caller does not (its prompt forbids the code block the mode prompt asks for)', () => {
        expect(withActiveModePrompt(VERBAL_WHAT_TO_ANSWER_PROMPT, 'MODE', VERBAL_WHAT_TO_ANSWER_PROMPT)).toBe(VERBAL_WHAT_TO_ANSWER_PROMPT);
    });
    it('no mode prompt → the base is returned as is', () => {
        expect(withActiveModePrompt('BASE', '', undefined)).toBe('BASE');
    });
});
