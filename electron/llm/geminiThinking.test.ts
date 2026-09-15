import { describe, it, expect } from 'vitest';
import { geminiThinkingLevelFromEnv, GEMINI_THINKING_LEVELS } from './geminiThinking';

/**
 * Every flight to date ran gemini-3.1-flash-lite at the provider default, which the probes
 * (2026-09-15) showed is MINIMAL: no thought tokens, and the CV-numbers question wrong
 * 10 of 10 times. With thinkingLevel LOW the same call spent 143–782 thought tokens and
 * derived the numbers. The level is a flight variable now, set from the environment like
 * the turn constants, and refused loudly when misspelt so a flight never runs at a level
 * nobody asked for.
 */
describe('geminiThinkingLevelFromEnv', () => {
    it('unset or empty → undefined, so the request carries no thinkingConfig (provider default)', () => {
        expect(geminiThinkingLevelFromEnv({})).toBeUndefined();
        expect(geminiThinkingLevelFromEnv({ NATIVELY_GEMINI_THINKING_LEVEL: '' })).toBeUndefined();
        expect(geminiThinkingLevelFromEnv({ NATIVELY_GEMINI_THINKING_LEVEL: '  ' })).toBeUndefined();
    });

    it('accepts the four documented levels, case-insensitively, and returns them upper-case', () => {
        for (const level of GEMINI_THINKING_LEVELS) {
            expect(geminiThinkingLevelFromEnv({ NATIVELY_GEMINI_THINKING_LEVEL: level })).toBe(level);
            expect(geminiThinkingLevelFromEnv({ NATIVELY_GEMINI_THINKING_LEVEL: level.toLowerCase() })).toBe(level);
        }
        expect(GEMINI_THINKING_LEVELS).toEqual(['MINIMAL', 'LOW', 'MEDIUM', 'HIGH']);
    });

    it('refuses anything else, naming the variable and the allowed values', () => {
        expect(() => geminiThinkingLevelFromEnv({ NATIVELY_GEMINI_THINKING_LEVEL: 'fast' }))
            .toThrow(/NATIVELY_GEMINI_THINKING_LEVEL.*fast.*MINIMAL, LOW, MEDIUM, HIGH/);
        expect(() => geminiThinkingLevelFromEnv({ NATIVELY_GEMINI_THINKING_LEVEL: '1024' })).toThrow();
    });
});
