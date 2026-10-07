import { describe, it, expect } from 'vitest';
import { createEarSilenceWatch } from './earSilence';

// bundle-1 SPEC 5.2. Times are plain milliseconds; the module has no clock.
const S = 1000;                       // seconds -> ms
const mk = (o: { k?: number } = {}) => createEarSilenceWatch({ k: o.k ?? 5, graceMs: 10_000, leadMs: 2_000 });

/** An utterance from `s` to `u` (ms), then the tick that judges it. Returns the tick's verdict. */
function utter(w: ReturnType<typeof mk>, s: number, u: number) {
    w.utteranceStart(s);
    w.utteranceEnd(u);
    return w.tick(u + 10_000);
}

describe('earSilence watch', () => {
    it('counts nothing before arm()', () => {
        const w = mk({ k: 1 });
        expect(utter(w, 0, 5 * S)).toBeNull();
        w.arm();
        expect(w.tick(100 * S)).toBeNull();   // the pre-arm utterance was never recorded
        expect(utter(w, 200 * S, 205 * S)).toBe('silent');
    });

    it('4 uncaptioned utterances -> null; the 5th -> silent, and only once', () => {
        const w = mk(); w.arm();
        for (let i = 0; i < 4; i++) expect(utter(w, (i * 30) * S, (i * 30 + 5) * S)).toBeNull();
        expect(utter(w, 120 * S, 125 * S)).toBe('silent');
        expect(utter(w, 150 * S, 155 * S)).toBeNull();
        expect(utter(w, 180 * S, 185 * S)).toBeNull();
    });

    it('a caption inside an utterance window resets the count', () => {
        const w = mk(); w.arm();
        for (let i = 0; i < 4; i++) utter(w, (i * 30) * S, (i * 30 + 5) * S);
        w.caption(122 * S);                                     // inside [S-2, U+10] of the 5th
        expect(utter(w, 120 * S, 125 * S)).toBeNull();          // captioned: count back to 0
        for (let i = 0; i < 4; i++) expect(utter(w, (200 + i * 30) * S, (205 + i * 30) * S)).toBeNull();
        expect(utter(w, 320 * S, 325 * S)).toBe('silent');      // 5 misses again
    });

    it('the lead edge: a caption 1.9 s before the start counts, 2.1 s before does not', () => {
        const near = mk({ k: 1 }); near.arm(); near.caption(100 * S - 1900);
        expect(utter(near, 100 * S, 105 * S)).toBeNull();
        const far = mk({ k: 1 }); far.arm(); far.caption(100 * S - 2100);
        expect(utter(far, 100 * S, 105 * S)).toBe('silent');
    });

    it('the grace edge: a caption at U + 10 s counts, after it does not', () => {
        const on = mk({ k: 1 }); on.arm(); on.utteranceStart(100 * S); on.utteranceEnd(105 * S); on.caption(115 * S);
        expect(on.tick(115 * S)).toBeNull();
        const late = mk({ k: 1 }); late.arm(); late.utteranceStart(100 * S); late.utteranceEnd(105 * S); late.caption(115 * S + 1);
        expect(late.tick(115 * S + 1)).toBe('silent');
    });

    it('a pending utterance (now < U + 10 s) is not judged yet', () => {
        const w = mk({ k: 1 }); w.arm();
        w.utteranceStart(100 * S); w.utteranceEnd(105 * S);
        expect(w.tick(114 * S)).toBeNull();
        expect(w.tick(115 * S)).toBe('silent');
    });

    it('two starts before one end: the FIRST start is used', () => {
        const w = mk({ k: 1 }); w.arm();
        w.caption(99 * S);                 // 1 s before the first start (counts), 6 s before the second (would not)
        w.utteranceStart(100 * S); w.utteranceStart(105 * S); w.utteranceEnd(110 * S);
        expect(w.tick(120 * S)).toBeNull();
    });

    it('a start with no end expires at the next start + 60 s and is not counted', () => {
        const w = mk({ k: 2 }); w.arm();
        w.utteranceStart(0);                                  // never ended
        w.utteranceStart(61 * S); w.utteranceEnd(65 * S);     // 61 s later: the dangling start is dropped, this is a fresh utterance
        expect(w.tick(80 * S)).toBeNull();                    // ONE miss judged, not two
        w.utteranceStart(90 * S); w.utteranceEnd(95 * S);
        expect(w.tick(105 * S)).toBe('silent');               // the second miss
    });

    it('an end with no start is ignored', () => {
        const w = mk({ k: 1 }); w.arm();
        w.utteranceEnd(5 * S);
        expect(w.tick(100 * S)).toBeNull();
    });

    it('reset() clears pending utterances and the count', () => {
        const w = mk({ k: 2 }); w.arm();
        utter(w, 0, 5 * S);                                   // one miss judged
        w.utteranceStart(30 * S); w.utteranceEnd(35 * S);     // one pending
        w.reset();
        expect(w.tick(100 * S)).toBeNull();
        utter(w, 200 * S, 205 * S);
        expect(w.tick(300 * S)).toBeNull();                   // only ONE miss since the reset
    });
});
