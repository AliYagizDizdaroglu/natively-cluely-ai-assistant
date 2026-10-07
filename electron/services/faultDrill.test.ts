import { describe, it, expect } from 'vitest';
import { parseDrill, muteChunk } from './faultDrill';

// bundle-1 SPEC 7: NATIVELY_FAULT_DRILL is honoured only unpackaged + harness (NATIVELY_AUTOSTART_MEETING) + router flag on.
const ok = { packaged: false, harness: true, routerOn: true };

describe('parseDrill', () => {
    it('parses both faults, in seconds after meeting start', () => {
        expect(parseDrill('router-drop@600,ear-mute@1500', ok)).toEqual({
            ok: true,
            faults: [{ kind: 'router-drop', atSec: 600 }, { kind: 'ear-mute', atSec: 1500 }],
        });
    });
    it('parses a single fault and decimal seconds', () => {
        expect(parseDrill('ear-mute@12.5', ok)).toEqual({ ok: true, faults: [{ kind: 'ear-mute', atSec: 12.5 }] });
    });
    it('refuses a packaged build first, whatever else is wrong', () => {
        expect(parseDrill('bogus', { packaged: true, harness: false, routerOn: false })).toEqual({ ok: false, reason: 'packaged' });
    });
    it('then a non-harness start (NATIVELY_AUTOSTART_MEETING not set)', () => {
        expect(parseDrill('router-drop@5', { packaged: false, harness: false, routerOn: false })).toEqual({ ok: false, reason: 'not-harness' });
    });
    it('then the router flag off', () => {
        expect(parseDrill('router-drop@5', { packaged: false, harness: true, routerOn: false })).toEqual({ ok: false, reason: 'router-off' });
    });
    it.each([
        ['an unknown token', 'router-drop@5,bogus@7', 'bogus@7'],
        ['a missing time', 'router-drop', 'router-drop'],
        ['a negative time', 'ear-mute@-3', 'ear-mute@-3'],
        ['a non-number time', 'ear-mute@soon', 'ear-mute@soon'],
        ['an empty segment', 'router-drop@5,,ear-mute@9', ''],
        ['a repeated fault', 'ear-mute@5,ear-mute@9', 'ear-mute@9'],
        ['an empty spec', '', ''],
    ])('%s -> parse refusal naming the token only', (_l, spec, token) => {
        expect(parseDrill(spec, ok)).toEqual({ ok: false, reason: 'parse', token });
    });
});

describe('muteChunk (the ear-mute substitution)', () => {
    const chunk = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
    it('muted: the same length, all zero, and the original chunk is not touched', () => {
        const out = muteChunk(chunk, true);
        expect(out.length).toBe(chunk.length);
        expect([...out]).toEqual(new Array(8).fill(0));
        expect([...chunk]).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });
    it('not muted: the chunk itself', () => {
        expect(muteChunk(chunk, false)).toBe(chunk);
    });
});
