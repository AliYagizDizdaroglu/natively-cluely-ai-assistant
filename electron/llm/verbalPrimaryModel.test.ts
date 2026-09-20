import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { verbalPrimaryModel, VERBAL_PRIMARY_MODEL_ENV } from './verbalPrimaryModel';

/**
 * The override exists so a flight can measure a different answer model WITHOUT changing
 * what the app ships. The thinking level took exactly this route — env var, bench, flight,
 * and only then the default — and the reason the LOW default is trusted today is that it
 * was proven behind the flag first.
 *
 * s50k (2026-09-20) put 3.5-lite HIGH ahead of the 3.1-lite LOW band by a margin that met
 * the pre-registered rule at exactly both thresholds, with the bands still overlapping.
 * That earns a proof flight, not a shipped default.
 */
const ALLOWED = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'] as const;

describe('verbalPrimaryModel', () => {
    const saved = process.env[VERBAL_PRIMARY_MODEL_ENV];
    beforeEach(() => { delete process.env[VERBAL_PRIMARY_MODEL_ENV]; });
    afterEach(() => {
        if (saved === undefined) delete process.env[VERBAL_PRIMARY_MODEL_ENV];
        else process.env[VERBAL_PRIMARY_MODEL_ENV] = saved;
    });

    it('returns the caller\'s selected model when the variable is unset', () => {
        expect(verbalPrimaryModel('gemini-3.1-flash-lite', ALLOWED)).toBe('gemini-3.1-flash-lite');
        expect(verbalPrimaryModel('gemma-4-26b-it', ALLOWED)).toBe('gemma-4-26b-it');
    });

    it('treats an EMPTY variable as unset', () => {
        // The flight launchers clear a variable with `set NAME=`, which leaves it empty
        // rather than absent — the s50k launcher does exactly that for the thinking level.
        process.env[VERBAL_PRIMARY_MODEL_ENV] = '';
        expect(verbalPrimaryModel('gemini-3.1-flash-lite', ALLOWED)).toBe('gemini-3.1-flash-lite');
    });

    it('overrides the selected model when the variable names an allowed model', () => {
        process.env[VERBAL_PRIMARY_MODEL_ENV] = 'gemini-3.5-flash-lite';
        expect(verbalPrimaryModel('gemini-3.1-flash-lite', ALLOWED)).toBe('gemini-3.5-flash-lite');
    });

    it('trims surrounding whitespace, which a .cmd `set` line leaves behind', () => {
        process.env[VERBAL_PRIMARY_MODEL_ENV] = ' gemini-3.5-flash-lite ';
        expect(verbalPrimaryModel('gemini-3.1-flash-lite', ALLOWED)).toBe('gemini-3.5-flash-lite');
    });

    it('REFUSES an unknown model instead of falling back to the selected one', () => {
        // Falling back would let a typo in a launcher spend a whole hour measuring the
        // wrong configuration and report it as the right one. Refusing names the violation.
        process.env[VERBAL_PRIMARY_MODEL_ENV] = 'gemini-3.5-flash-lit';
        expect(() => verbalPrimaryModel('gemini-3.1-flash-lite', ALLOWED))
            .toThrow(/NATIVELY_VERBAL_PRIMARY_MODEL.*gemini-3\.5-flash-lit/s);
    });

    it('names the allowed models in the refusal, so the fix is obvious', () => {
        process.env[VERBAL_PRIMARY_MODEL_ENV] = 'gpt-4';
        expect(() => verbalPrimaryModel('gemini-3.1-flash-lite', ALLOWED))
            .toThrow(/gemini-3\.1-flash-lite.*gemini-3\.5-flash-lite/s);
    });
});
