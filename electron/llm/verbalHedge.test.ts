import { describe, it, expect } from 'vitest';
import { verbalHedgeEnabled, verbalHedgeTriggerMs, describeVerbalHedgeAtStartup, VERBAL_HEDGE_ENV, VERBAL_HEDGE_TRIGGER_ENV, DEFAULT_HEDGE_TRIGGER_MS } from './verbalHedge';

/**
 * NATIVELY_VERBAL_HEDGE gates the hedge behind a default-off flag, same shape as the other
 * env switches in this directory (geminiThinkingLevelFromEnv): unset/empty/'0' is off, '1' is
 * on, anything else throws — a typo must not fly silently OFF (h40c plan, global constraints).
 */
describe('verbalHedgeEnabled', () => {
    it('off when unset, empty, or explicit 0', () => {
        expect(verbalHedgeEnabled({})).toBe(false);
        expect(verbalHedgeEnabled({ [VERBAL_HEDGE_ENV]: '' })).toBe(false);
        expect(verbalHedgeEnabled({ [VERBAL_HEDGE_ENV]: '0' })).toBe(false);
    });

    it('on for exactly 1', () => {
        expect(verbalHedgeEnabled({ [VERBAL_HEDGE_ENV]: '1' })).toBe(true);
    });

    it('refuses anything else, naming the variable', () => {
        expect(() => verbalHedgeEnabled({ [VERBAL_HEDGE_ENV]: 'true' })).toThrow(/NATIVELY_VERBAL_HEDGE.*true/);
    });
});

/**
 * How long the front (3.5-lite) gets before the back (3.1-lite) is started beside it —
 * 5000 ms is the value probed 2026-09-25 (H1-H3), fixed before any counted window.
 * NATIVELY_VERBAL_HEDGE_TRIGGER_MS overrides it, in firstTokenTimeoutMs's shape: a positive
 * whole number of milliseconds, or refused.
 */
describe('verbalHedgeTriggerMs', () => {
    it('defaults to 5000 ms', () => {
        expect(DEFAULT_HEDGE_TRIGGER_MS).toBe(5000);
        expect(verbalHedgeTriggerMs({})).toBe(5000);
    });

    it('NATIVELY_VERBAL_HEDGE_TRIGGER_MS overrides it', () => {
        expect(verbalHedgeTriggerMs({ [VERBAL_HEDGE_TRIGGER_ENV]: '300' })).toBe(300);
    });

    it('refuses a value that is not a positive whole number, naming the variable', () => {
        expect(() => verbalHedgeTriggerMs({ [VERBAL_HEDGE_TRIGGER_ENV]: '0' })).toThrow(/NATIVELY_VERBAL_HEDGE_TRIGGER_MS/);
        expect(() => verbalHedgeTriggerMs({ [VERBAL_HEDGE_TRIGGER_ENV]: 'fast' })).toThrow(/NATIVELY_VERBAL_HEDGE_TRIGGER_MS/);
        expect(() => verbalHedgeTriggerMs({ [VERBAL_HEDGE_TRIGGER_ENV]: '2.5' })).toThrow(/NATIVELY_VERBAL_HEDGE_TRIGGER_MS/);
    });
});

/**
 * The startup-time validate-and-describe step (h40c re-review N1): main.ts calls this once,
 * before credentials/IPC/window setup, and exits the process on a throw rather than continuing
 * with a windowless zombie holding the single-instance lock — logic worth unit-testing on its
 * own, since main.ts itself has no test file. The trigger env is read ONLY when the hedge is on
 * — a junk NATIVELY_VERBAL_HEDGE_TRIGGER_MS while unset changed nothing before this function
 * existed, and must still change nothing now.
 */
describe('describeVerbalHedgeAtStartup', () => {
    it('off (unset): the off line, and a junk trigger is never read', () => {
        expect(describeVerbalHedgeAtStartup({})).toBe('[Main] verbal hedge: off');
        expect(describeVerbalHedgeAtStartup({ [VERBAL_HEDGE_TRIGGER_ENV]: 'not-a-number' })).toBe('[Main] verbal hedge: off');
    });

    it('on, trigger unset: the default trigger in the line', () => {
        expect(describeVerbalHedgeAtStartup({ [VERBAL_HEDGE_ENV]: '1' })).toBe(`[Main] verbal hedge: on trigger=${DEFAULT_HEDGE_TRIGGER_MS}ms`);
    });

    it('on, trigger set: the overridden trigger in the line', () => {
        expect(describeVerbalHedgeAtStartup({ [VERBAL_HEDGE_ENV]: '1', [VERBAL_HEDGE_TRIGGER_ENV]: '300' })).toBe('[Main] verbal hedge: on trigger=300ms');
    });

    it('on, junk trigger: throws (the trigger IS read once the hedge is on)', () => {
        expect(() => describeVerbalHedgeAtStartup({ [VERBAL_HEDGE_ENV]: '1', [VERBAL_HEDGE_TRIGGER_ENV]: 'not-a-number' })).toThrow(/NATIVELY_VERBAL_HEDGE_TRIGGER_MS/);
    });

    it('a junk enabled value throws, naming the variable', () => {
        expect(() => describeVerbalHedgeAtStartup({ [VERBAL_HEDGE_ENV]: 'yes' })).toThrow(/NATIVELY_VERBAL_HEDGE.*yes/);
    });
});
