import { describe, it, expect, vi } from 'vitest';
import { filterVerbalLines, extractSuggestions, stripSuggestionBlock, cutAtWordBudget, type Suggestion } from './verbalStreamFilter';

/** Feed `text` through the filter in fixed-size chunks; return concatenated output. */
async function runFilter(text: string, chunkSize = 6): Promise<string> {
    async function* source() {
        for (let i = 0; i < text.length; i += chunkSize) {
            yield text.slice(i, i + chunkSize);
        }
    }
    let out = '';
    for await (const c of filterVerbalLines(source())) out += c;
    return out;
}

describe('filterVerbalLines semantics (parity with original)', () => {
    it('passes normal multi-line prose through unchanged', async () => {
        const text = 'Transformers use attention.\nEvery token attends to every other token.';
        expect(await runFilter(text)).toBe(text);
    });

    it('drops Time:/Space: complexity bullets and clarifying-back lines', async () => {
        const text = 'Quicksort partitions around a pivot.\nTime: O(n log n) average.\nWould you like me to go deeper?\nIt is in-place.';
        expect(await runFilter(text)).toBe('Quicksort partitions around a pivot.\nIt is in-place.');
    });

    it('rewrites meta-preamble openers, keeping the substance', async () => {
        const text = 'I will explain the Transformer as a communication system between words.';
        expect(await runFilter(text)).toBe('The Transformer as a communication system between words.');
    });

    it('keeps the original line when stripping would leave a dangler', async () => {
        const text = "I'll explain with an analogy about mail sorting in a busy office.";
        expect(await runFilter(text)).toBe(text);
    });

    it('drops preamble lines whose remaining substance is too small', async () => {
        const text = "I'll explain X.";
        expect(await runFilter(text)).toBe('');
    });

    it('produces identical output regardless of chunk boundaries', async () => {
        const text = "I'm going to walk you through the retry logic first.\nTime: O(1).\nThe cache evicts the least recently used entry.";
        const outputs = await Promise.all([1, 3, 7, 50, 1000].map(n => runFilter(text, n)));
        for (const o of outputs) expect(o).toBe(outputs[0]);
        expect(outputs[0]).toBe('The retry logic first.\nThe cache evicts the least recently used entry.');
    });
});

describe('filterVerbalLines streaming behavior', () => {
    it('yields within a single-paragraph answer before the source ends', async () => {
        // One paragraph, NO newlines — the shape the verbal prompt produces.
        const sentence = 'Transformers work by letting every word in a sentence look at every other word and decide which ones matter most for its meaning, which is the attention mechanism at the core of the architecture.';
        const chunks: string[] = [];
        for (let i = 0; i < sentence.length; i += 8) chunks.push(sentence.slice(i, i + 8));

        let consumed = 0;
        async function* source() {
            for (const c of chunks) {
                consumed++;
                yield c;
            }
        }

        let consumedAtFirstYield = -1;
        let out = '';
        for await (const piece of filterVerbalLines(source())) {
            if (consumedAtFirstYield === -1) consumedAtFirstYield = consumed;
            out += piece;
        }

        expect(out).toBe(sentence);
        // First output must appear once the line prefix is disambiguated (~48 chars
        // ≈ 6 chunks of 8), NOT after the whole paragraph has been consumed.
        expect(consumedAtFirstYield).toBeGreaterThan(0);
        expect(consumedAtFirstYield).toBeLessThanOrEqual(8);
    });

    it('streams the remainder of a rewritten line after the preamble decision', async () => {
        const text = 'I will explain the Transformer architecture with attention layers stacked to build progressively richer representations of the sequence.';
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += 8) chunks.push(text.slice(i, i + 8));

        let consumed = 0;
        async function* source() {
            for (const c of chunks) {
                consumed++;
                yield c;
            }
        }

        let consumedAtFirstYield = -1;
        let out = '';
        for await (const piece of filterVerbalLines(source())) {
            if (consumedAtFirstYield === -1) consumedAtFirstYield = consumed;
            out += piece;
        }

        expect(out).toBe('The Transformer architecture with attention layers stacked to build progressively richer representations of the sequence.');
        // Rewrite decision needs the matched preamble + a little lookahead — well
        // under half the text (17 chunks total).
        expect(consumedAtFirstYield).toBeGreaterThan(0);
        expect(consumedAtFirstYield).toBeLessThanOrEqual(9);
    });
});

/** Feed `text` through the offers guard in fixed-size chunks. */
async function runStrip(text: string, chunkSize: number): Promise<{ out: string; sugg: Suggestion[] }> {
    async function* source() {
        for (let i = 0; i < text.length; i += chunkSize) yield text.slice(i, i + chunkSize);
    }
    let out = '';
    let sugg: Suggestion[] = [];
    for await (const c of stripSuggestionBlock(source(), s => { sugg = s; })) out += c;
    return { out, sugg };
}

describe('extractSuggestions — splitting the spoken answer from its expansion offers', () => {
    const ANSWER = 'Consistent hashing keeps key movement small when a node joins.';

    it('returns the whole text and no offers when the model correctly stayed silent', () => {
        // The common case: a complete short answer needs no offers. Measured 0/24
        // spurious blocks on trivial questions, so this path is the norm, not the edge.
        expect(extractSuggestions(ANSWER)).toEqual({ answer: ANSWER, suggestions: [] });
    });

    it('splits the answer from the offers and parses the labels', () => {
        const { answer, suggestions } = extractSuggestions(
            `${ANSWER}\n__MORE__\n1| trade-offs of vnode count\n2| hot-key handling on the ring\n`,
        );
        expect(answer).toBe(ANSWER);
        expect(suggestions).toEqual([
            { n: 1, label: 'trade-offs of vnode count' },
            { n: 2, label: 'hot-key handling on the ring' },
        ]);
    });

    it('drops stray prose inside the block rather than leaking it into a chip', () => {
        const { suggestions } = extractSuggestions(
            `${ANSWER}\n__MORE__\nHere are some things I left out:\n1| vnode count trade-offs\n`,
        );
        expect(suggestions).toEqual([{ n: 1, label: 'vnode count trade-offs' }]);
    });

    it('never leaves the sentinel in the spoken answer', () => {
        const { answer } = extractSuggestions(`${ANSWER}\n__MORE__\n1| something\n`);
        expect(answer).not.toContain('__MORE__');
        expect(answer).not.toMatch(/\d\|/);
    });
});

describe('stripSuggestionBlock — the block must never flash on screen mid-stream', () => {
    const FULL = 'Bloom filters answer membership fast.\n__MORE__\n1| false positive rate math\n2| counting filters for deletes\n';
    const SPOKEN = 'Bloom filters answer membership fast.';

    // Chunk sizes chosen to straddle the sentinel: at 1 and 3 the string "__MORE__"
    // is split across boundaries, which is exactly when a naive indexOf leaks "__MO".
    it.each([1, 3, 4, 7, 500])('suppresses the block at chunk size %i', async (size) => {
        const { out, sugg } = await runStrip(FULL, size);
        expect(out).not.toContain('__MORE__');
        expect(out).not.toContain('__MO');
        expect(out.trim()).toBe(SPOKEN);
        expect(sugg.map(s => s.label)).toEqual(['false positive rate math', 'counting filters for deletes']);
    });

    it('passes an answer with no block through byte-for-byte', async () => {
        const { out, sugg } = await runStrip(SPOKEN, 3);
        expect(out).toBe(SPOKEN);
        expect(sugg).toEqual([]);
    });

    it('reports an empty array (not a missing call) when no offers were made', async () => {
        // Callers rely on exactly one callback per stream; a never-fired callback
        // would leave a UI spinner waiting forever.
        let called = 0;
        async function* src() { yield 'Short and complete.'; }
        for await (const _ of stripSuggestionBlock(src(), () => { called++; })) { /* drain */ }
        expect(called).toBe(1);
    });

    it('does not mistake ordinary underscores in prose for the sentinel', async () => {
        const text = 'Use snake_case for names, and __init__ is the constructor.';
        const { out, sugg } = await runStrip(text, 2);
        expect(out).toBe(text);
        expect(sugg).toEqual([]);
    });
});

describe('cutAtWordBudget (spec 2026-09-04 §4)', () => {
    /** n distinct words ending in a period — sentence i of an answer. */
    const sentence = (n: number, i: number) => Array.from({ length: n }, (_, k) => `w${i}x${k}`).join(' ') + '.';
    const words = (s: string) => (s.match(/\S+/g) ?? []).length;
    async function* chunked(text: string, size: number): AsyncGenerator<string> {
        for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size);
    }
    async function run(text: string, size = 7, opts: Partial<{ limit: number; floor: number }> = {}) {
        const done: any[] = [];
        const src = chunked(text, size);
        const ret = vi.spyOn(src, 'return');
        let out = '';
        for await (const c of cutAtWordBudget(src, { limit: 80, floor: 40, ...opts, onDone: (r) => done.push(r) })) out += c;
        return { out, done, ret };
    }

    it('six 20-word sentences: emits four (80 words), cuts at the sentence end, closes the source without draining it', async () => {
        const text = [1, 2, 3, 4, 5, 6].map((i) => sentence(20, i)).join(' ');
        const { out, done, ret } = await run(text);
        expect(words(out)).toBe(80);
        expect(out.trim()).toBe([1, 2, 3, 4].map((i) => sentence(20, i)).join(' '));
        expect(done).toEqual([{ words: 80, cut: true, allowance: false }]);
        // returning out of the for-await closes the source (IteratorClose) — the SDK stream honours it
        expect(ret).toHaveBeenCalled();
    });
    it('a last sentence that would cross the limit is dropped at end of stream (no source close needed)', async () => {
        const text = [1, 2, 3, 4, 5].map((i) => sentence(20, i)).join(' ');
        const { out, done } = await run(text);
        expect(words(out)).toBe(80);
        expect(done).toEqual([{ words: 80, cut: true, allowance: false }]);
    });
    it('30 + 60 words: the second sentence starts under the floor and is kept whole (allowance)', async () => {
        const text = sentence(30, 1) + ' ' + sentence(60, 2);
        const { out, done } = await run(text);
        expect(words(out)).toBe(90);
        expect(done).toEqual([{ words: 90, cut: false, allowance: true }]);
    });
    it('a single 95-word sentence is never cut inside; the next sentence is dropped', async () => {
        const text = sentence(95, 1) + ' ' + sentence(10, 2);
        const { out, done } = await run(text);
        expect(words(out)).toBe(95);
        expect(done).toEqual([{ words: 95, cut: true, allowance: true }]);
    });
    it('an answer under the limit passes through unchanged', async () => {
        const text = sentence(25, 1) + ' ' + sentence(30, 2);
        const { out, done } = await run(text);
        expect(out).toBe(text);
        expect(done).toEqual([{ words: 55, cut: false, allowance: false }]);
    });
    it('output is identical for every chunk size', async () => {
        const text = [1, 2, 3, 4, 5, 6].map((i) => sentence(20, i)).join(' ');
        const outs = await Promise.all([1, 3, 7, 50, 1000].map((n) => run(text, n).then((r) => r.out)));
        for (const o of outs) expect(o).toBe(outs[0]);
    });
    it('a decimal or a terminator split across chunks does not end a sentence', async () => {
        // 45 words already emitted → buffer mode; "3.5" straddles a chunk boundary inside the next sentence.
        const text = sentence(22, 1) + ' ' + sentence(23, 2) + ' The p99 is 3.5 seconds on the old path and 1.2 on the new one.';
        const { out, done } = await run(text, 5);
        expect(out).toBe(text);
        expect(done[0].cut).toBe(false);
    });
    it('streams before the floor: the first yield arrives before the source is drained', async () => {
        const text = [1, 2, 3, 4, 5, 6].map((i) => sentence(20, i)).join(' ');
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += 8) chunks.push(text.slice(i, i + 8));
        let consumed = 0;
        async function* source() { for (const c of chunks) { consumed++; yield c; } }
        let atFirst = -1;
        for await (const _ of cutAtWordBudget(source(), { limit: 80, floor: 40 })) { if (atFirst === -1) atFirst = consumed; }
        expect(atFirst).toBeLessThan(chunks.length / 4);
    });
    it('a consumer that stops early gets no onDone (no budget line for an aborted answer)', async () => {
        const done: any[] = [];
        const gen = cutAtWordBudget(chunked(sentence(20, 1) + ' ' + sentence(20, 2), 7), { limit: 80, floor: 40, onDone: (r) => done.push(r) });
        for await (const _ of gen) break;
        expect(done).toEqual([]);
    });
});
