import { describe, it, expect } from 'vitest';
// @ts-ignore — untyped ESM harness module
import { VERBAL_CHECKS, CUES_CALIBRATION } from './problems.verbal.mjs';

/** Cue mode (spec 2026-09-20 §8): mechanical shape checks on the cue block, calibrated on known cases. */
const ctx = (over: Record<string, unknown>) => ({
    spoken: 'Ten million vectors take about 30 gigabytes; int8 cuts it to 7.5.',
    cues: ['30 GB in float32', 'int8 to 7.5 GB'],
    cuesSentinel: '__CUES__', cueMaxLines: 5, cueMaxWords: 8,
    ...over,
});

describe('cue checks', () => {
    it('present: a block with at least one line; absent, null or empty fails', () => {
        expect(VERBAL_CHECKS.cues_present(ctx({})).ok).toBe(true);
        expect(VERBAL_CHECKS.cues_present(ctx({ cues: [] })).ok).toBe(false);
        expect(VERBAL_CHECKS.cues_present(ctx({ cues: null })).ok).toBe(false);
    });
    it('wellformed: 1 to 5 lines, at most 8 words, no question, never "you"', () => {
        for (const cues of CUES_CALIBRATION.wellformed.mustFlag) expect(VERBAL_CHECKS.cues_wellformed(ctx({ cues })).ok, JSON.stringify(cues)).toBe(false);
        for (const cues of CUES_CALIBRATION.wellformed.mustPass) expect(VERBAL_CHECKS.cues_wellformed(ctx({ cues })).ok, JSON.stringify(cues)).toBe(true);
    });
    it('grounded: every number in a cue also appears in the prose', () => {
        for (const c of CUES_CALIBRATION.grounded.mustFlag) expect(VERBAL_CHECKS.cues_grounded(ctx(c)).ok, JSON.stringify(c)).toBe(false);
        for (const c of CUES_CALIBRATION.grounded.mustPass) expect(VERBAL_CHECKS.cues_grounded(ctx(c)).ok, JSON.stringify(c)).toBe(true);
    });
    it('clean: the sentinel never reaches the prose, not even split', () => {
        expect(VERBAL_CHECKS.cues_clean(ctx({})).ok).toBe(true);
        expect(VERBAL_CHECKS.cues_clean(ctx({ spoken: '__CUES__ leaked into the answer' })).ok).toBe(false);
        expect(VERBAL_CHECKS.cues_clean(ctx({ spoken: 'leaked __CUES' })).ok).toBe(false);
    });
});
