import { describe, it, expect } from 'vitest';
import { filterVerbalLines } from './verbalStreamFilter';

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
