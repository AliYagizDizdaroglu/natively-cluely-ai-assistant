import { describe, it, expect } from 'vitest';
import { verbalHedgeEnabled, verbalHedgeTriggerMs, describeVerbalHedgeAtStartup, VERBAL_HEDGE_ENV, VERBAL_HEDGE_TRIGGER_ENV, DEFAULT_HEDGE_TRIGGER_MS } from './verbalHedge';

/**
 * NATIVELY_VERBAL_HEDGE is default-ON since flight h40c passed (2026-09-29), same shape as the
 * other env switches in this directory (geminiThinkingLevelFromEnv): unset/empty/'1' is on, '0'
 * is the explicit opt-out back to the previous stall race, anything else throws — a typo must
 * not fly silently, in either direction (h40c plan, global constraints).
 */
describe('verbalHedgeEnabled', () => {
    it('on when unset or empty: the hedge is the shipped default', () => {
        expect(verbalHedgeEnabled({})).toBe(true);
        expect(verbalHedgeEnabled({ [VERBAL_HEDGE_ENV]: '' })).toBe(true);
    });

    it('on for exactly 1', () => {
        expect(verbalHedgeEnabled({ [VERBAL_HEDGE_ENV]: '1' })).toBe(true);
    });

    it('off for exactly 0: the explicit opt-out back to the previous stall race', () => {
        expect(verbalHedgeEnabled({ [VERBAL_HEDGE_ENV]: '0' })).toBe(false);
    });

    // The value is trimmed. A stray blank, e.g. the trailing one of a .cmd launcher's `set NATIVELY_VERBAL_HEDGE=0 `,
    // must still read as the opt-out and not as a typo that refuses to start.
    it("off for '0' padded with blanks: the value is trimmed", () => {
        expect(verbalHedgeEnabled({ [VERBAL_HEDGE_ENV]: ' 0 ' })).toBe(false);
    });

    it('on for a value of blanks only: it counts as unset, so the hedge is on', () => {
        expect(verbalHedgeEnabled({ [VERBAL_HEDGE_ENV]: '  ' })).toBe(true);
    });

    it('refuses anything else, naming the variable', () => {
        expect(() => verbalHedgeEnabled({ [VERBAL_HEDGE_ENV]: 'true' })).toThrow(/NATIVELY_VERBAL_HEDGE.*true/);
        expect(() => verbalHedgeEnabled({ [VERBAL_HEDGE_ENV]: 'yes' })).toThrow(/NATIVELY_VERBAL_HEDGE.*yes/);
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
 * — and on is the default now, so a junk NATIVELY_VERBAL_HEDGE_TRIGGER_MS refuses to start
 * unless NATIVELY_VERBAL_HEDGE=0 (a typo must not fly silently).
 */
describe('describeVerbalHedgeAtStartup', () => {
    it('unset: the on line at the default trigger — the exact text the flight harness reads', () => {
        expect(describeVerbalHedgeAtStartup({})).toBe('[Main] verbal hedge: on trigger=5000ms');
    });

    it('explicit 0: the off line, and a junk trigger is never read', () => {
        expect(describeVerbalHedgeAtStartup({ [VERBAL_HEDGE_ENV]: '0' })).toBe('[Main] verbal hedge: off');
        expect(describeVerbalHedgeAtStartup({ [VERBAL_HEDGE_ENV]: '0', [VERBAL_HEDGE_TRIGGER_ENV]: 'not-a-number' })).toBe('[Main] verbal hedge: off');
    });

    it('on, trigger unset: the default trigger in the line', () => {
        expect(describeVerbalHedgeAtStartup({ [VERBAL_HEDGE_ENV]: '1' })).toBe(`[Main] verbal hedge: on trigger=${DEFAULT_HEDGE_TRIGGER_MS}ms`);
    });

    it('on, trigger set: the overridden trigger in the line', () => {
        expect(describeVerbalHedgeAtStartup({ [VERBAL_HEDGE_ENV]: '1', [VERBAL_HEDGE_TRIGGER_ENV]: '300' })).toBe('[Main] verbal hedge: on trigger=300ms');
    });

    it('unset, trigger set: the overridden trigger in the line — the override needs no flag', () => {
        expect(describeVerbalHedgeAtStartup({ [VERBAL_HEDGE_TRIGGER_ENV]: '300' })).toBe('[Main] verbal hedge: on trigger=300ms');
    });

    it('on, junk trigger: throws (the trigger IS read once the hedge is on)', () => {
        expect(() => describeVerbalHedgeAtStartup({ [VERBAL_HEDGE_ENV]: '1', [VERBAL_HEDGE_TRIGGER_ENV]: 'not-a-number' })).toThrow(/NATIVELY_VERBAL_HEDGE_TRIGGER_MS/);
    });

    it('unset, junk trigger: throws — on is the default, so the trigger IS read and a typo refuses to start', () => {
        expect(() => describeVerbalHedgeAtStartup({ [VERBAL_HEDGE_TRIGGER_ENV]: 'not-a-number' })).toThrow(/NATIVELY_VERBAL_HEDGE_TRIGGER_MS/);
    });

    it('a junk enabled value throws, naming the variable', () => {
        expect(() => describeVerbalHedgeAtStartup({ [VERBAL_HEDGE_ENV]: 'yes' })).toThrow(/NATIVELY_VERBAL_HEDGE.*yes/);
    });
});
