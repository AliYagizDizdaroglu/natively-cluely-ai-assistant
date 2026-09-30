import { describe, it, expect } from 'vitest';
import { DEEPGRAM_KEYTERMS, keytermsFor, isEnglishLanguage } from './deepgramKeyterms';

/**
 * Every term here was LOST by Deepgram in two or more flights, measured by diffing each
 * scripted roster question against the text the app actually heard for it (233 pairs across
 * every run we still hold). These are not guesses about what might be hard to hear.
 *
 * Two of them changed an answer's meaning rather than its spelling:
 *   "preserving the tie rule"          -> "preserving the Thai rule"      (S1Q04F)
 *   "deduplicate chunk ids"            -> "duplicate chunk IDs"           (S2Q05)
 * The first produced the only wrong answer of flight s50j, in every arm, because every arm
 * replays the same transcript. The second inverts the requirement the question is testing.
 */
describe('DEEPGRAM_KEYTERMS', () => {
    it('carries the two terms a live-socket replay PROVED it recovers', () => {
        // Replayed through a real nova-3 socket at the app's settings, off vs on (2026-09-20):
        // "the Thai rule" became "the tie rule", and "re ranking" became "reranking".
        for (const term of ['tie rule', 'reranking']) {
            expect(DEEPGRAM_KEYTERMS, `${term} is a verified recovery and must not be dropped`).toContain(term);
        }
    });

    it('carries the terms measured lost in two or more flights', () => {
        for (const term of ['AKS', 'deduplicate', 'document ids']) {
            expect(DEEPGRAM_KEYTERMS, `${term} was measured lost and must be prompted`).toContain(term);
        }
    });

    it('has no duplicates and no blank or untrimmed entries', () => {
        expect(new Set(DEEPGRAM_KEYTERMS).size).toBe(DEEPGRAM_KEYTERMS.length);
        for (const t of DEEPGRAM_KEYTERMS) {
            expect(t.trim()).toBe(t);
            expect(t.length).toBeGreaterThan(0);
        }
    });

    it('stays inside Deepgram\'s 100-keyterm ceiling for a single request', () => {
        expect(DEEPGRAM_KEYTERMS.length).toBeLessThanOrEqual(100);
    });
});

/**
 * keyterm prompting is a nova-3 English-only parameter. The app switches Deepgram to another
 * language (and to 'multi') at runtime from the language picker, and sending keyterm on those
 * requests is at best ignored and at worst a 400 that costs the socket — so the list is only
 * attached when the socket is actually running English.
 */
describe('keytermsFor', () => {
    it('attaches the list on English', () => {
        expect(keytermsFor('en')).toEqual(DEEPGRAM_KEYTERMS);
        expect(keytermsFor('en-US')).toEqual(DEEPGRAM_KEYTERMS);
    });

    it('attaches nothing on any other language, including multi', () => {
        expect(keytermsFor('multi')).toBeUndefined();
        expect(keytermsFor('tr')).toBeUndefined();
        expect(keytermsFor('es-419')).toBeUndefined();
    });
});

/**
 * The boundary repair (deepgramBoundaryRepair.ts) is English-only too — its tokens are ASCII — and
 * gates on the same predicate, so the two can never disagree about what "English" is.
 */
describe('isEnglishLanguage', () => {
    it('is true for en and regional English, false for every other language and for multi', () => {
        for (const code of ['en', 'en-US', 'en-GB']) expect(isEnglishLanguage(code)).toBe(true);
        for (const code of ['multi', 'es', 'tr', 'es-419', 'ru', 'ja']) expect(isEnglishLanguage(code)).toBe(false);
    });
});
