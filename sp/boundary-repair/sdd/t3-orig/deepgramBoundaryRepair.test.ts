import { describe, it, expect } from 'vitest';
import { createBoundaryRepair } from './deepgramBoundaryRepair';
import fixtures from './deepgramBoundaryRepair.fixtures.json';

/**
 * The fixture file is a byte-for-byte copy of the design's fixtures-v3.json (2026-09-29): every
 * sequence was extracted VERBATIM from a non-holdout run log (the `run` field) as [interim I,
 * final F1, final F2] with atMs relative to I, and expectedF2 is what the reference rule-v3.mjs
 * emits for F2 — checked by the extractor to equal what it emitted inside the full stream. Only
 * `symptom` (flight h40c R22, the reported defect) comes from a holdout run, as the reproduction;
 * `seam` is a live seam-probe recording (S2Q07 play 3, the tolerant "RAC" -> "Rag" cut).
 * The synthetic edges at the end reuse the symptom's strings and one real interim from the logs.
 */
type Fixture = { run: string; cls: string; events: { text: string; isFinal: boolean; atMs: number }[]; expectedF2: string };

function lastFinal(f: Fixture): string {
    const r = createBoundaryRepair();
    let out = '';
    for (const e of f.events) {
        const res = r.onTranscript(e.text, e.isFinal, e.atMs);
        if (e.isFinal) out = res.text;
    }
    return out;
}
const lastRaw = (f: Fixture): string => f.events[f.events.length - 1].text;

describe('deepgramBoundaryRepair reproduces the reference (rule-v3.mjs) on the extracted fixtures', () => {
    it('the fixture file is the design\'s: 1 symptom, 1 seam, 15 positives that change F2, 28 negatives that do not', () => {
        expect(fixtures.positives).toHaveLength(15);
        expect(fixtures.negatives).toHaveLength(28);
        for (const f of [fixtures.symptom, fixtures.seam, ...fixtures.positives]) expect(f.expectedF2).not.toBe(lastRaw(f));
        for (const f of fixtures.negatives) expect(f.expectedF2).toBe(lastRaw(f));
    });

    it(`symptom — ${fixtures.symptom.run}: restores "hallucinations"`, () => {
        expect(lastFinal(fixtures.symptom)).toBe(fixtures.symptom.expectedF2);
    });

    it(`seam — ${fixtures.seam.run}: the tolerant cut ("RAC" re-spelled "Rag" at the cut) restores "service"`, () => {
        expect(lastFinal(fixtures.seam)).toBe(fixtures.seam.expectedF2);
    });

    describe('positives: every distinct v3 repair in the non-holdout logs', () => {
        fixtures.positives.forEach((f, i) => {
            it(`#${i + 1} ${f.run}: -> "${f.expectedF2.slice(0, 50)}"`, () => {
                expect(lastFinal(f)).toBe(f.expectedF2);
            });
        });
    });

    describe('negatives: cuts the rule leaves alone (NORMAL, the |T| == 1 tail whether re-heard or really lost, number-formatted evidence, tolerant re-cover, turn boundaries)', () => {
        fixtures.negatives.forEach((f, i) => {
            it(`#${i + 1} ${f.cls} ${f.run}: "${lastRaw(f).slice(0, 40)}" unchanged`, () => {
                expect(lastFinal(f)).toBe(lastRaw(f));
            });
        });
    });

    it('pins the documented residuals as NOT repaired: real losses in the |T| == 1 tail ("between", "scaling") and number-formatted evidence ("eighty" / "84%")', () => {
        const byF2 = (start: string): Fixture => {
            const f = fixtures.negatives.find((n) => lastRaw(n).startsWith(start));
            if (!f) throw new Error(`fixture missing: F2 starting "${start}"`);
            return f;
        };
        for (const f of [byF2('training and serving?'), byF2('for a model inference service on Kubernetes?'), byF2('by 84%,')]) {
            expect(lastFinal(f)).toBe(lastRaw(f));
        }
    });
});

describe('deepgramBoundaryRepair synthetic edges (the symptom\'s strings)', () => {
    const [I, F1, F2] = fixtures.symptom.events;                 // atMs 0 / 17 / 1564
    const play = (events: Fixture['events']): string => lastFinal({ run: 'synthetic', cls: 'EDGE', events, expectedF2: '' });

    it('the window is 5000 ms from F1\'s arrival, inclusive: 5000 restores, 5001 does not', () => {
        expect(play([I, F1, { ...F2, atMs: F1.atMs + 5000 }])).toBe(fixtures.symptom.expectedF2);
        expect(play([I, F1, { ...F2, atMs: F1.atMs + 5001 }])).toBe(F2.text);
    });

    it('a final that is not a prefix of its interim is no cut — only F1\'s LAST token may differ (the tolerant cut)', () => {
        expect(play([I, { ...F1, text: 'How do we cut' }, F2])).toBe(F2.text);
        expect(play([I, { ...F1, text: 'How do you cat' }, F2])).toBe(fixtures.symptom.expectedF2);
    });

    it('an interim-only stream passes through unchanged and leaves nothing to repair', () => {
        const r = createBoundaryRepair();
        expect(r.onTranscript('How do', false, 0)).toEqual({ text: 'How do', restored: null });
        expect(r.onTranscript(I.text, false, 500)).toEqual({ text: I.text, restored: null });
        expect(r.onTranscript(I.text, true, 1000)).toEqual({ text: I.text, restored: null });    // equal to its interim: no cut
        expect(r.onTranscript(F2.text, true, 2000)).toEqual({ text: F2.text, restored: null });
    });

    it('any final clears the remembered cut: only the NEXT final can be repaired', () => {
        expect(play([I, F1, { text: 'Okay.', isFinal: true, atMs: 500 }, F2])).toBe(F2.text);
    });

    it('an interim between F1 and F2 does not disturb the repair (after7 M13: the log has "as code without" at 07:38:26.576Z between the two finals)', () => {
        const m13 = fixtures.positives[2];                       // 2026-09-06T08-14-21-after7, "infrastructure"
        const [i, f1, f2] = m13.events;
        expect(m13.run).toBe('2026-09-06T08-14-21-after7');
        expect(play([i, f1, { text: 'as code without', isFinal: false, atMs: f1.atMs + 2 }, f2])).toBe(m13.expectedF2);
    });

    it('restores the interim\'s own spelling, index-aligned past an apostrophe word before the cut', () => {
        const I2 = { text: 'How\'d you cut RAG hallucinations in a rag answer without just making', isFinal: false, atMs: 0 };
        expect(play([I2, { ...F1, text: 'How\'d you cut' }, { ...F2, text: 'hallucinations in a rag answer without just making it refuse?' }]))
            .toBe('RAG hallucinations in a rag answer without just making it refuse?');
    });

    it('a punctuation-only final is no cut (it has no tokens) and does not throw', () => {
        expect(play([I, { ...F1, text: '?' }, { ...F2, text: 'you cut hallucinations in a rag answer without just making it refuse?' }]))
            .toBe('you cut hallucinations in a rag answer without just making it refuse?');
    });

    it('a one-word final is never a tolerant cut: a late "Wow." does not remember the interim', () => {
        expect(play([I, { ...F1, text: 'Wow.' }, { ...F2, text: 'you cut hallucinations in a rag answer without just making it refuse?' }]))
            .toBe('you cut hallucinations in a rag answer without just making it refuse?');
    });

    it('a final with no interim before it is not compared with an older interim', () => {
        expect(play([I, F1, { text: 'How do you', isFinal: true, atMs: 500 }, F2])).toBe(F2.text);
    });

    it('a loss of three words is left alone: at most two skipped words are restored', () => {
        expect(play([I, F1, { ...F2, text: 'rag answer without just making it refuse?' }])).toBe('rag answer without just making it refuse?');
    });

    it('F2 starting with the interim\'s first tail word is the normal case, even when that word repeats', () => {
        const I3 = { text: 'How do you cut hallucinations in in a rag answer without just making', isFinal: false, atMs: 0 };
        expect(play([I3, { ...F1, text: 'How do you cut hallucinations' }, F2])).toBe(F2.text);
    });
});
