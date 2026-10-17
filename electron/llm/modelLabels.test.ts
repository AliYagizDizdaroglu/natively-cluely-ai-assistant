import { describe, it, expect } from 'vitest';
import { selectedModelLabel } from './modelLabels';

describe('selectedModelLabel (the bubble label of the dropdown pick)', () => {
    it('names the two new entries', () => {
        expect(selectedModelLabel('gemini-3.5-flash-lite')).toBe('Gemini 3.5 Flash Lite');
        expect(selectedModelLabel('gemini-3.8-flash')).toBe('Gemini 3.8 Flash');
    });
    it('keeps the earlier labels and passes an unknown id through', () => {
        expect(selectedModelLabel('gemini-3.1-flash-lite')).toBe('Gemini 3.1 Flash Lite');
        expect(selectedModelLabel('gemini-3.1-flash-lite-preview')).toBe('Gemini 3.1 Flash Lite');
        expect(selectedModelLabel('gemini-2.5-flash')).toBe('Gemini 2.5 Flash');
        expect(selectedModelLabel('gemma-4-31b-it')).toBe('Gemma 4 31B');
        expect(selectedModelLabel('gemma-4-26b-a4b-it')).toBe('Gemma 4 26B');
        expect(selectedModelLabel('x')).toBe('x');
    });
});
