import { describe, it, expect } from 'vitest';
import { ProviderCooldown, isRateLimit } from './providerCooldown';

describe('isRateLimit', () => {
    it('recognises the failures the flight test saw', () => {
        expect(isRateLimit('Transient error (429)')).toBe(true);
        expect(isRateLimit('Model busy, try again')).toBe(true);
        expect(isRateLimit('You exceeded your current quota')).toBe(true);
        expect(isRateLimit('RESOURCE_EXHAUSTED')).toBe(true);
        expect(isRateLimit('empty response')).toBe(false);
        expect(isRateLimit('socket hang up')).toBe(false);
    });
});

describe('ProviderCooldown', () => {
    it('skips a provider for the cooldown window after a rate-limit failure, then tries it again', () => {
        const c = new ProviderCooldown(10 * 60 * 1000);
        expect(c.shouldSkip('Gemini Pro', 0)).toBe(false);
        c.noteFailure('Gemini Pro', 'Transient error (429)', 0);
        expect(c.shouldSkip('Gemini Pro', 1)).toBe(true);
        expect(c.shouldSkip('Gemini Pro', 10 * 60 * 1000 - 1)).toBe(true);
        expect(c.shouldSkip('Gemini Pro', 10 * 60 * 1000)).toBe(false);
    });
    it('a non-rate-limit failure does not start a cooldown', () => {
        const c = new ProviderCooldown();
        c.noteFailure('Groq', 'socket hang up', 0);
        expect(c.shouldSkip('Groq', 1)).toBe(false);
    });
    it('is per provider', () => {
        const c = new ProviderCooldown();
        c.noteFailure('Gemini Pro', '429', 0);
        expect(c.shouldSkip('Gemini Flash', 1)).toBe(false);
    });
});
