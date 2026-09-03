import { describe, it, expect } from 'vitest';
import { tapFirstToken } from './streamTaps';

async function* chunks(cs: string[]) { for (const c of cs) yield c; }
async function drain(g: AsyncGenerator<string>) { const out: string[] = []; for await (const c of g) out.push(c); return out; }

describe('tapFirstToken', () => {
    it('reports the first token time once and the first 120 characters once, and passes every chunk through unchanged', async () => {
        const firsts: number[] = []; const heads: string[] = [];
        const out = await drain(tapFirstToken(chunks(['', 'Hello ', 'world', ' '.repeat(200)]), (ms) => firsts.push(ms), (h) => heads.push(h), Date.now() - 5));
        expect(out).toEqual(['', 'Hello ', 'world', ' '.repeat(200)]);
        expect(firsts.length).toBe(1);
        expect(firsts[0]).toBeGreaterThanOrEqual(5);
        expect(heads).toEqual([('Hello world' + ' '.repeat(200)).slice(0, 120)]);
    });
    it('reports the head at the end when the answer is shorter than 120 characters', async () => {
        const heads: string[] = [];
        await drain(tapFirstToken(chunks(['short']), () => {}, (h) => heads.push(h)));
        expect(heads).toEqual(['short']);
    });
    it('reports nothing for an empty stream', async () => {
        const firsts: number[] = []; const heads: string[] = [];
        await drain(tapFirstToken(chunks([]), (ms) => firsts.push(ms), (h) => heads.push(h)));
        expect(firsts).toEqual([]); expect(heads).toEqual([]);
    });

    // R36 fix wave addendum: withVerbalFallback's redirect sentinel
    // (__model_source:<model> (fallback)__) reaches tapFirstToken unfiltered —
    // it sits outside both filter chains by design (WhatToAnswerLLM.ts:39-41).
    // Run 1 evidence: 34 of 36 streams failed pre-token and redirected, yet the
    // tap counted the sentinel as the first token (TTFT p90 0.8s) and one
    // recorded head was literally the sentinel glued to the real opener.
    it('a sentinel chunk does not trigger onFirst or join the head — onFirst/onHead fire on the real text that follows', async () => {
        const firsts: number[] = []; const heads: string[] = [];
        const out = await drain(tapFirstToken(
            chunks(['__model_source:gemini-3.5-flash-lite (fallback)__', 'Versioning ', 'models…']),
            (ms) => firsts.push(ms), (h) => heads.push(h), Date.now() - 5,
        ));
        // Passed through unchanged — the sentinel still reaches the consumer.
        expect(out).toEqual(['__model_source:gemini-3.5-flash-lite (fallback)__', 'Versioning ', 'models…']);
        expect(firsts.length).toBe(1);
        expect(firsts[0]).toBeGreaterThanOrEqual(5);
        expect(heads).toEqual(['Versioning models…']);
    });

    it('a stream of only a sentinel reports no first-token time and no head', async () => {
        const firsts: number[] = []; const heads: string[] = [];
        const out = await drain(tapFirstToken(
            chunks(['__model_source:gemini-3.5-flash-lite (fallback)__']),
            (ms) => firsts.push(ms), (h) => heads.push(h),
        ));
        expect(out).toEqual(['__model_source:gemini-3.5-flash-lite (fallback)__']);
        expect(firsts).toEqual([]);
        expect(heads).toEqual([]);
    });
});
