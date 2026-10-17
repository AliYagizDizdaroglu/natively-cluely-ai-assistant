import { describe, it, expect } from 'vitest';
import { CURATED_GEMINI_MODELS, curatedModelLabel } from './curatedModels';

describe('the dropdown model list', () => {
    it('offers Gemini 3.5 Flash Lite first and Gemini 3.8 Flash, with their labels', () => {
        expect(CURATED_GEMINI_MODELS[0]).toEqual({ id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite' });
        expect(CURATED_GEMINI_MODELS).toContainEqual({ id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' });
    });
    it('keeps the earlier entries', () => {
        expect(CURATED_GEMINI_MODELS.map((m) => m.id)).toEqual(expect.arrayContaining(['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemma-4-31b-it', 'gemma-4-26b-a4b-it']));
    });
    it('labels each entry and the 3.1 preview alias, and leaves an unknown id as is', () => {
        for (const m of CURATED_GEMINI_MODELS) expect(curatedModelLabel(m.id)).toBe(m.name);
        expect(curatedModelLabel('gemini-3.1-flash-lite-preview')).toBe('Gemini 3.1 Flash Lite');
        expect(curatedModelLabel('something-else')).toBe('something-else');
    });
});
