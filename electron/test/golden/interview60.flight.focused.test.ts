import { describe, it, expect } from 'vitest';
import { focusedFor } from './interview60.flight.mjs';

// flight-eq ruling 3: the earlier-question hour spends no full-Flash quota, so the four focused
// arms are switched off by NATIVELY_FLIGHT_FOCUSED=off. Unset keeps today's behaviour; any other
// value refuses, so a typo can never silently fly (or silently skip) the focused arms.
describe('focusedFor', () => {
    const FIVE = 'S1Q02,S1Q08,S2Q02,S1Q07,S1Q06';

    it("'off' skips the focused arms, whatever the roster", () => {
        expect(focusedFor('scenario50', { NATIVELY_FLIGHT_FOCUSED: 'off' })).toBeNull();
        expect(focusedFor('holdout40', { NATIVELY_FLIGHT_FOCUSED: 'off' })).toBeNull();
    });

    it('unset or empty is today\'s behaviour: the roster\'s focused five, or null when it has none', () => {
        expect(focusedFor('scenario50', { NATIVELY_FLIGHT_FOCUSED: '' })).toBe(FIVE);
        expect(focusedFor('scenario50', {})).toBe(FIVE);
        expect(focusedFor('scenario50', { NATIVELY_FLIGHT_FOCUSED: '' }).split(',')).toHaveLength(5);
        expect(focusedFor('holdout40', {})).toBeNull();
    });

    it('any other value throws, naming it', () => {
        expect(() => focusedFor('scenario50', { NATIVELY_FLIGHT_FOCUSED: 'yes' })).toThrow(/NATIVELY_FLIGHT_FOCUSED.*"yes"/);
        expect(() => focusedFor('scenario50', { NATIVELY_FLIGHT_FOCUSED: 'OFF' })).toThrow(/"OFF"/);
        expect(() => focusedFor('scenario50', { NATIVELY_FLIGHT_FOCUSED: 'on' })).toThrow(/"on"/);
    });
});
