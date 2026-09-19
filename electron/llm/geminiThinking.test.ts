import { describe, it, expect } from 'vitest';
import { geminiThinkingLevelFromEnv, firstTokenTimeoutMs, thinkingLevelForModel, GEMINI_THINKING_LEVELS, DEFAULT_GEMINI_THINKING_LEVEL } from './geminiThinking';

/**
 * The stall race gives the primary this long to produce a first token before the answer is
 * taken from the other Flash Lite. 4 s was tuned on default-level hours (first token p90
 * 1.6–3.4 s, s50e/s50f). A thinking level moves the whole distribution — s50g at LOW: p50
 * 5.1 s, p90 7.8 s — so the same 4 s would have replaced most thinking answers with the
 * fallback's default-level ones, which is the opposite of what the level was set for.
 */
describe('firstTokenTimeoutMs', () => {
    it('4000 ms at MINIMAL (what every default-level flight through s50f ran)', () => {
        expect(firstTokenTimeoutMs({ NATIVELY_GEMINI_THINKING_LEVEL: 'MINIMAL' })).toBe(4000);
    });

    it('10000 ms at a thinking level above MINIMAL (s50g LOW p90 7.8 s fits under it), so also with nothing set now that LOW ships', () => {
        expect(firstTokenTimeoutMs({ NATIVELY_GEMINI_THINKING_LEVEL: 'LOW' })).toBe(10000);
        expect(firstTokenTimeoutMs({ NATIVELY_GEMINI_THINKING_LEVEL: 'high' })).toBe(10000);
        expect(firstTokenTimeoutMs({})).toBe(10000);
    });

    it('NATIVELY_FIRST_TOKEN_TIMEOUT_MS overrides both, as a positive whole number of milliseconds', () => {
        expect(firstTokenTimeoutMs({ NATIVELY_FIRST_TOKEN_TIMEOUT_MS: '300' })).toBe(300);
        expect(firstTokenTimeoutMs({ NATIVELY_FIRST_TOKEN_TIMEOUT_MS: '300', NATIVELY_GEMINI_THINKING_LEVEL: 'LOW' })).toBe(300);
        expect(firstTokenTimeoutMs({ NATIVELY_FIRST_TOKEN_TIMEOUT_MS: '', NATIVELY_GEMINI_THINKING_LEVEL: 'MINIMAL' })).toBe(4000);
    });

    it('refuses a value that is not a positive whole number, naming the variable', () => {
        expect(() => firstTokenTimeoutMs({ NATIVELY_FIRST_TOKEN_TIMEOUT_MS: 'fast' })).toThrow(/NATIVELY_FIRST_TOKEN_TIMEOUT_MS.*fast/);
        expect(() => firstTokenTimeoutMs({ NATIVELY_FIRST_TOKEN_TIMEOUT_MS: '0' })).toThrow(/NATIVELY_FIRST_TOKEN_TIMEOUT_MS/);
        expect(() => firstTokenTimeoutMs({ NATIVELY_FIRST_TOKEN_TIMEOUT_MS: '-5' })).toThrow(/NATIVELY_FIRST_TOKEN_TIMEOUT_MS/);
        expect(() => firstTokenTimeoutMs({ NATIVELY_FIRST_TOKEN_TIMEOUT_MS: '2.5' })).toThrow(/NATIVELY_FIRST_TOKEN_TIMEOUT_MS/);
    });
});

/**
 * Flights through s50f ran gemini-3.1-flash-lite at the provider default, which the probes
 * (2026-09-15) showed is MINIMAL: no thought tokens, and the CV-numbers question wrong
 * 10 of 10 times. The paired bench of 2026-09-17 (39 captured prompts x 3 reps, blind
 * grading) put LOW at +21 acceptable on 117 pairs, 24 improvements to 3 regressions, and
 * zero wrong answers across three hours — so LOW is the shipped default. The environment
 * still overrides it (MINIMAL is the old behaviour, HIGH the ceiling probe), and a misspelt
 * level is refused loudly so a flight never runs at a level nobody asked for.
 */
describe('geminiThinkingLevelFromEnv', () => {
    it('unset or empty → LOW, the shipped default, so every verbal request carries it', () => {
        expect(DEFAULT_GEMINI_THINKING_LEVEL).toBe('LOW');
        expect(geminiThinkingLevelFromEnv({})).toBe('LOW');
        expect(geminiThinkingLevelFromEnv({ NATIVELY_GEMINI_THINKING_LEVEL: '' })).toBe('LOW');
        expect(geminiThinkingLevelFromEnv({ NATIVELY_GEMINI_THINKING_LEVEL: '  ' })).toBe('LOW');
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

/**
 * The stall fallback's level, measured live rather than inferred. Flight s50j's single stall
 * (2026-09-19 07:50) fell back to gemini-3.5-flash-lite carrying the shipped LOW, and that
 * request logged `thinking=LOW thoughts=0` — the model does not honour LOW. Probes of
 * 2026-09-17 had said the same (no thought tokens on 3 of 4 calls at LOW; MEDIUM and HIGH
 * honoured every time), but the hour is the proof: every stall was being answered by a model
 * doing no thinking at all, which is the opposite of what shipping a level was for.
 */
describe('thinkingLevelForModel', () => {
    it('leaves the primary alone — 3.1-flash-lite honours LOW, and that is what ships', () => {
        expect(thinkingLevelForModel('gemini-3.1-flash-lite', 'LOW')).toBe('LOW');
        expect(thinkingLevelForModel('gemini-3.1-flash-lite', 'HIGH')).toBe('HIGH');
        expect(thinkingLevelForModel('gemini-3.1-flash-lite', 'MINIMAL')).toBe('MINIMAL');
    });

    it('raises LOW to HIGH on 3.5-flash-lite, the level it honours and the one with evidence', () => {
        // HIGH is not a guess: on s50j's own captured bytes 3.5-lite at HIGH scored 35 of 39
        // against the 3.1-LOW twin band of 29-33, with a better first-token tail (p90 4.6 s
        // against 7.1 s). MEDIUM is honoured too but has never been graded.
        expect(thinkingLevelForModel('gemini-3.5-flash-lite', 'LOW')).toBe('HIGH');
    });

    it('passes through the levels 3.5-flash-lite does honour', () => {
        expect(thinkingLevelForModel('gemini-3.5-flash-lite', 'MEDIUM')).toBe('MEDIUM');
        expect(thinkingLevelForModel('gemini-3.5-flash-lite', 'HIGH')).toBe('HIGH');
    });

    it('keeps MINIMAL as MINIMAL — it is the explicit opt-out of thinking, not a level to raise', () => {
        // A flight that sets MINIMAL is asking for the pre-bench behaviour on every leg; the
        // offline 3.5-lite arms at no config already report zero thought tokens, so MINIMAL
        // and the provider default agree here and there is nothing to correct.
        expect(thinkingLevelForModel('gemini-3.5-flash-lite', 'MINIMAL')).toBe('MINIMAL');
    });

    it('leaves a model we have not probed untouched rather than guessing for it', () => {
        expect(thinkingLevelForModel('gemini-9.9-flash', 'LOW')).toBe('LOW');
    });
});
