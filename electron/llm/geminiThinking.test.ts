import { describe, it, expect } from 'vitest';
import { geminiThinkingLevelFromEnv, firstTokenTimeoutMs, GEMINI_THINKING_LEVELS } from './geminiThinking';

/**
 * The stall race gives the primary this long to produce a first token before the answer is
 * taken from the other Flash Lite. 4 s was tuned on default-level hours (first token p90
 * 1.6–3.4 s, s50e/s50f). A thinking level moves the whole distribution — s50g at LOW: p50
 * 5.1 s, p90 7.8 s — so the same 4 s would have replaced most thinking answers with the
 * fallback's default-level ones, which is the opposite of what the level was set for.
 */
describe('firstTokenTimeoutMs', () => {
    it('4000 ms with no thinking level, and at MINIMAL (what every default-level flight ran)', () => {
        expect(firstTokenTimeoutMs({})).toBe(4000);
        expect(firstTokenTimeoutMs({ NATIVELY_GEMINI_THINKING_LEVEL: 'MINIMAL' })).toBe(4000);
    });

    it('10000 ms once a thinking level above MINIMAL is set (s50g LOW p90 7.8 s fits under it)', () => {
        expect(firstTokenTimeoutMs({ NATIVELY_GEMINI_THINKING_LEVEL: 'LOW' })).toBe(10000);
        expect(firstTokenTimeoutMs({ NATIVELY_GEMINI_THINKING_LEVEL: 'high' })).toBe(10000);
    });

    it('NATIVELY_FIRST_TOKEN_TIMEOUT_MS overrides both, as a positive whole number of milliseconds', () => {
        expect(firstTokenTimeoutMs({ NATIVELY_FIRST_TOKEN_TIMEOUT_MS: '300' })).toBe(300);
        expect(firstTokenTimeoutMs({ NATIVELY_FIRST_TOKEN_TIMEOUT_MS: '300', NATIVELY_GEMINI_THINKING_LEVEL: 'LOW' })).toBe(300);
        expect(firstTokenTimeoutMs({ NATIVELY_FIRST_TOKEN_TIMEOUT_MS: '' })).toBe(4000);
    });

    it('refuses a value that is not a positive whole number, naming the variable', () => {
        expect(() => firstTokenTimeoutMs({ NATIVELY_FIRST_TOKEN_TIMEOUT_MS: 'fast' })).toThrow(/NATIVELY_FIRST_TOKEN_TIMEOUT_MS.*fast/);
        expect(() => firstTokenTimeoutMs({ NATIVELY_FIRST_TOKEN_TIMEOUT_MS: '0' })).toThrow(/NATIVELY_FIRST_TOKEN_TIMEOUT_MS/);
        expect(() => firstTokenTimeoutMs({ NATIVELY_FIRST_TOKEN_TIMEOUT_MS: '-5' })).toThrow(/NATIVELY_FIRST_TOKEN_TIMEOUT_MS/);
        expect(() => firstTokenTimeoutMs({ NATIVELY_FIRST_TOKEN_TIMEOUT_MS: '2.5' })).toThrow(/NATIVELY_FIRST_TOKEN_TIMEOUT_MS/);
    });
});

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
