import { describe, it, expect } from 'vitest';
import { normalizeLiveMode } from './liveMode';

describe('normalizeLiveMode', () => {
    it('passes the three valid modes through', () => {
        expect(normalizeLiveMode('off')).toBe('off');
        expect(normalizeLiveMode('suggest')).toBe('suggest');
        expect(normalizeLiveMode('auto')).toBe('auto');
    });
    it('maps anything else to off — a corrupt or missing stored value must never start the router', () => {
        expect(normalizeLiveMode(undefined)).toBe('off');
        expect(normalizeLiveMode(null)).toBe('off');
        expect(normalizeLiveMode('AUTO')).toBe('off');
        expect(normalizeLiveMode(42)).toBe('off');
    });
});
