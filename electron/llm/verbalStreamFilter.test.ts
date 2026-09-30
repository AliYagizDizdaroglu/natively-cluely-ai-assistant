import { describe, it, expect, vi } from 'vitest';
import { filterVerbalLines, extractSuggestions, stripSuggestionBlock, stripSpokenNotation, cutAtWordBudget, filterCodeFences, SPOKEN_WORD_GUARD, extractCues, stripCueBlock, trimCues, type Suggestion } from './verbalStreamFilter';
import { CUES_SENTINEL } from './prompts';

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

// Flight s50b (2026-09-11): 5 of 20 in-app answers reached the candidate as "1. … 2. … 3. …"
// lists and one carried "$1 / (c + \text{rank})" — six delivery-0 grades on answers whose
// content was right. The list marker is a line-prefix decision like HARD_DROP; the rest of
// the line is ordinary speech.
describe('filterVerbalLines — list markers are unspeakable, the sentence after them is not', () => {
    const LIST = 'I validate the inputs first.\n\n1. I sort by score, breaking ties by row order.\n2. I slice the top k.\n3. I divide precision by prevalence for the lift.\n';
    it('strips "1. " / "2. " numbered markers and keeps the sentences', async () => {
        const out = await runFilter(LIST);
        expect(out).not.toMatch(/(^|\n)\s*\d+[.)]\s/);
        expect(out).toContain('I sort by score, breaking ties by row order.');
        expect(out).toContain('I divide precision by prevalence for the lift.');
    });
    it('strips "-", "*" and "•" bullet markers too', async () => {
        const out = await runFilter('- first point\n* second point\n• third point\n');
        expect(out).toBe('first point\nsecond point\nthird point\n');
    });
    it('a marker followed by a meta-preamble still gets the preamble rewrite', async () => {
        const out = await runFilter("1. I'll explain the retry logic as a budget of attempts.\n");
        expect(out).toBe('The retry logic as a budget of attempts.\n');
    });
    it('does not touch a sentence that merely starts with a number', async () => {
        expect(await runFilter('2.5 words per question word is the budget.\n')).toBe('2.5 words per question word is the budget.\n');
        expect(await runFilter('30 days of history is enough.\n')).toBe('30 days of history is enough.\n');
        expect(await runFilter('2024 was the year we moved to Kubernetes.\n')).toBe('2024 was the year we moved to Kubernetes.\n');
    });
    it('is identical for every chunk size (the marker can straddle a boundary)', async () => {
        const ref = await runFilter(LIST, 1000);
        for (const size of [1, 2, 3, 5, 7, 11]) expect(await runFilter(LIST, size)).toBe(ref);
    });
    it('leaves the __MORE__ offer lines ("1| label") alone — stripSuggestionBlock runs after this filter', async () => {
        const text = 'The answer.\n__MORE__\n1| trade-offs of vnode count\n2| hot-key handling\n';
        expect(await runFilter(text)).toBe(text);
        expect(await runFilter(text, 1)).toBe(text);
    });
});

/** Feed `text` through the notation stripper in fixed-size chunks; return concatenated output. */
async function runNotation(text: string, chunkSize = 6): Promise<string> {
    async function* source() {
        for (let i = 0; i < text.length; i += chunkSize) yield text.slice(i, i + chunkSize);
    }
    let out = '';
    for await (const c of stripSpokenNotation(source())) out += c;
    return out;
}

describe('stripSpokenNotation — formulas that start with a number are not currency', () => {
    const RRF = 'the reciprocal rank as $1 / (c + \\text{rank})$ for each list.';
    it('strips a $…$ span whose number is followed by an operator, and unwraps \\text{}', async () => {
        expect(await runNotation(RRF)).toBe('the reciprocal rank as 1 / (c + rank) for each list.');
    });
    it('keeps money: "$5 million", "$1.5M", "$5-10 million", "$50/hour", "$0.09/GB", "$120 + equity"', async () => {
        const money = 'It cost $5 million, about $1.5M a year, or $5-10 million over the term.';
        expect(await runNotation(money)).toBe(money);
        const rates = 'We paid $50/hour, S3 egress is $0.09/GB, and the offer was $120 + equity.';
        expect(await runNotation(rates)).toBe(rates);
        for (const size of [1, 3, 7]) expect(await runNotation(rates, size)).toBe(rates);
    });
    it('still treats a slash before a space or a bracket, and a power, as notation', async () => {
        expect(await runNotation('score $1/(c+rank)$ and cost $2^n$ here.')).toBe('score 1/(c+rank) and cost 2^n here.');
    });
    it('still strips the measured cases: backticks, bold, $O(\\log n)$', async () => {
        expect(await runNotation('Use `map.get(key)` in **O(1)**, not $O(\\log n)$.')).toBe('Use map.get(key) in O(1), not O(log n).');
    });
    it('strips single-asterisk emphasis (flight s50m) but keeps a spaced star', async () => {
        // 2026-09-22, s50m, S1Q03F: the hour's ONLY delivery-0 answer said "the
        // *incremental* effect". cleanNotation removed "**" and nothing else, so italic
        // emphasis reached the ear. The trailing-"*" hold already existed for exactly
        // this judgement — only the rule was missing.
        expect(await runNotation('a model to predict the *incremental* effect of the treatment.'))
            .toBe('a model to predict the incremental effect of the treatment.');
        // A star with space on both sides is multiplication or a stray bullet, not emphasis.
        expect(await runNotation('the cost is 3 * 4 per shard.')).toBe('the cost is 3 * 4 per shard.');
        // Bold still goes, and both forms in one sentence resolve.
        expect(await runNotation('**latency** matters more than *throughput* here.'))
            .toBe('latency matters more than throughput here.');
        for (const size of [1, 2, 3, 5, 9]) {
            expect(await runNotation('predict the *incremental* effect.', size)).toBe('predict the incremental effect.');
        }
    });
    it('strips a $…$ percentage ("$9.5\\%$" — 3.5 Flash, flight s50c) to "9.5%", keeping "$9.5" as money elsewhere', async () => {
        expect(await runNotation('the p99 improved by $9.5\\%$ after the change.')).toBe('the p99 improved by 9.5% after the change.');
        expect(await runNotation('the p99 improved by $9.5\\% after the change.')).toBe('the p99 improved by 9.5% after the change.');
        expect(await runNotation('it cost $9.5 per user.')).toBe('it cost $9.5 per user.');
        // Only the LaTeX form is notation: a plain percent sign after money keeps its dollar,
        // since nothing measured has ever produced "$5%" as a formula.
        expect(await runNotation('margins are $5% better.')).toBe('margins are $5% better.');
    });
    it('is identical for every chunk size (the number and its operator can straddle a boundary)', async () => {
        for (const text of [RRF, 'the value $1234567 / 2 is large.', 'the value $1   / (c) is large.', 'ends in \\text{rank}$', 'improved by $9.5\\%$ after.', 'improved by $9.5\\% after.']) {
            const ref = await runNotation(text, 1000);
            for (const size of [1, 2, 3, 4, 5, 7, 11]) expect(await runNotation(text, size)).toBe(ref);
        }
    });
});

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
    it('floor equal to the limit (spec 2026-09-05 §3): the sentence in progress at 80 finishes; the next one is dropped', async () => {
        const text = [1, 2, 3, 4].map((i) => sentence(30, i)).join(' ');   // ends at 30, 60, 90, 120
        const { out, done, ret } = await run(text, 7, { floor: 80 });
        expect(words(out)).toBe(90);          // the third sentence started at 60 < 80 and streams whole past 80
        expect(done).toEqual([{ words: 90, cut: true, allowance: true }]);
        // The fourth sentence is also the last in the source, so its terminator
        // is never confirmed (no chunk ever supplies whitespace after the final
        // "."); the cut is decided only once the source ends naturally, so there
        // is nothing left on it to close early.
        expect(ret).not.toHaveBeenCalled();
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
    it('an answer with no sentence terminator anywhere is stopped at the hard ceiling (2 × limit)', async () => {
        // Stream mode is left only when a sentence end is emitted, so without a
        // single [.!?] the whole answer used to stream through (probed: 200
        // words → words=200 cut=no allowance=yes).
        const text = Array.from({ length: 200 }, (_, k) => `w${k}`).join(' ');
        const { out, done, ret } = await run(text);
        // The ceiling trims the piece at a word boundary, so it stops at exactly
        // 2 × 80 — the overshoot is not left to the chunk size.
        expect(words(out)).toBe(160);
        expect(done).toEqual([{ words: 160, cut: true, allowance: true }]);
        expect(ret).toHaveBeenCalled();
    });
    it('a __model_source__ sentinel chunk passes through verbatim and is not counted as words', async () => {
        // withVerbalFallback yields this INSIDE the chain this stage wraps.
        const sentinel = '__model_source:gemini-3.5-flash-lite (fallback)__';
        const answer = sentence(25, 1) + ' ' + sentence(30, 2);
        async function* src(): AsyncGenerator<string> {
            yield sentinel;
            for (let i = 0; i < answer.length; i += 7) yield answer.slice(i, i + 7);
        }
        const done: any[] = [];
        let out = '';
        for await (const c of cutAtWordBudget(src(), { limit: 80, floor: 40, onDone: (r) => done.push(r) })) out += c;
        expect(out).toBe(sentinel + answer);
        expect(done).toEqual([{ words: 55, cut: false, allowance: false }]);
    });
});

describe('SPOKEN_WORD_GUARD — the verbal stream is clamped at 200 words and never cut under it (flight s50c, 2026-09-12)', () => {
    const sentence = (n: number, i: number) => Array.from({ length: n }, (_, k) => `w${i}x${k}`).join(' ') + '.';
    const words = (s: string) => (s.match(/\S+/g) ?? []).length;
    async function run(text: string) {
        const src = (async function* () { for (let i = 0; i < text.length; i += 9) yield text.slice(i, i + 9); })();
        let done: any = null;
        let out = '';
        for await (const c of cutAtWordBudget(src, { ...SPOKEN_WORD_GUARD, onDone: (r) => { done = r; } })) out += c;
        return { out, done };
    }
    it('clamps at 200 and buffers whole sentences from 120, leaving 80 words for the next one to fit in', () => {
        expect(SPOKEN_WORD_GUARD).toEqual({ limit: 200, floor: 120, ceiling: 200 });
    });
    it('a 170-word answer in four sentences — the longest the bare arm produced — streams whole, uncut', async () => {
        const text = [1, 2, 3, 4].map((i) => sentence(i === 4 ? 50 : 40, i)).join(' ');
        const { out, done } = await run(text);
        expect(words(out)).toBe(170);
        expect(out).toBe(text);
        expect(done).toEqual({ words: 170, cut: false, allowance: false });
    });
    it('an 80-word answer to a short question is no longer cut at 80: the old question-scaled limit is gone', async () => {
        const text = [1, 2, 3, 4, 5, 6].map((i) => sentence(20, i)).join(' ');   // 120 words
        const { out, done } = await run(text);
        expect(words(out)).toBe(120);
        expect(done).toEqual({ words: 120, cut: false, allowance: false });
    });
    it('an answer of exactly 200 words is not cut and keeps its last word and full stop', async () => {
        const text = [1, 2, 3, 4, 5].map((i) => sentence(40, i)).join(' ');   // exactly 200 words
        const { out, done } = await run(text);
        expect(out).toBe(text);
        expect(done).toEqual({ words: 200, cut: false, allowance: false });
    });
    it('stops a 230-word runaway on its last FINISHED sentence, not mid-sentence, for every chunk size', async () => {
        // Sentences end at 46, 92, 138, 184, 230 words. The fifth would pass 200, so the answer
        // ends at 184 with its full stop. Flight s50i (2026-09-18) is why: the app cut S2Q07 at
        // exactly 200 words mid-sentence while the same prompt answered offline ran to 218, and
        // the grader marked the in-app answer weak for the ending it never reached.
        const text = [1, 2, 3, 4, 5].map((i) => sentence(46, i)).join(' ');
        for (const size of [1, 3, 9, 40, 5000]) {
            const src = (async function* () { for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size); })();
            let done: any = null;
            let out = '';
            for await (const c of cutAtWordBudget(src, { ...SPOKEN_WORD_GUARD, onDone: (r) => { done = r; } })) out += c;
            expect(words(out)).toBe(184);
            expect(done).toEqual({ words: 184, cut: true, allowance: false });
            // A prefix of the answer that stops on a sentence terminator — nothing dangles.
            expect(text.startsWith(out)).toBe(true);
            expect(out.trimEnd()).toMatch(/[.!?]$/);
        }
    });

    it('a sentence that would cross 200 is dropped whole rather than truncated', async () => {
        // 148 words in short sentences, then one 60-word sentence: 148 + 60 = 208 > 200.
        const text = [1, 2, 3, 4].map((i) => sentence(37, i)).join(' ') + ' ' + sentence(60, 9);
        const { out, done } = await run(text);
        expect(words(out)).toBe(148);
        expect(done).toEqual({ words: 148, cut: true, allowance: false });
        expect(out.trimEnd()).toMatch(/[.!?]$/);
        expect(out).not.toContain('w9x0');   // not one word of the dropped sentence leaked out
    });

    it('one runaway sentence with no terminator still stops at the 200-word ceiling — there is no boundary to keep', async () => {
        const src = (async function* () { for (let i = 0; i < 260; i++) yield `w${i} `; })();
        let done: any = null;
        let out = '';
        for await (const c of cutAtWordBudget(src, { ...SPOKEN_WORD_GUARD, onDone: (r) => { done = r; } })) out += c;
        expect(words(out)).toBe(200);
        expect(done).toMatchObject({ cut: true, words: 200 });
    });
    it('cutAtWordBudget honours an explicit ceiling below 2 × limit', async () => {
        // 250 words, no terminator anywhere: stops at the ceiling
        const src = (async function* () { for (let i = 0; i < 250; i++) yield `w${i} `; })();
        let done: any = null;
        const out: string[] = [];
        for await (const c of cutAtWordBudget(src, { limit: 150, floor: 150, ceiling: 200, onDone: (r) => { done = r; } })) out.push(c);
        expect(out.join('').trim().split(/\s+/)).toHaveLength(200);
        expect(done).toMatchObject({ cut: true, words: 200 });
    });
});

/**
 * filterCodeFences lived as a private method on WhatToAnswerLLM, so the offline flight arms
 * — which replay the shipped chain to score a model — never ran it. Flight s50k paid for
 * that: the SQL answer scored delivery 0 ("correct query, but a raw code block") on two of
 * the 3.1 reps and the coding answer on two of the 3.5 reps, while the SAME question answered
 * in-app scored 2/2/1, because the app suppresses the fence and the arm did not. Both bands
 * were understated by roughly two, and the focused-five re-pick ranked those questions as
 * hard when they are not. Exported so one implementation serves the app and the measurement.
 */
describe('filterCodeFences — the app suppresses fenced blocks, and so must the arms', () => {
    async function* feed(...cs: string[]) { for (const c of cs) yield c; }
    const run = async (...cs: string[]) => {
        let out = '';
        for await (const c of filterCodeFences(feed(...cs))) out += c;
        return out;
    };

    it('suppresses a fenced block and keeps the prose around it', async () => {
        const src = 'I would left join on the event table.\n```sql\nSELECT 1;\n```\nThat keeps zero-call rows.';
        const out = await run(src);
        expect(out).not.toContain('SELECT');
        expect(out).not.toContain('```');
        expect(out).toContain('I would left join on the event table.');
        expect(out).toContain('That keeps zero-call rows.');
    });

    it('suppresses it when the text arrives one character at a time', async () => {
        const src = 'Here it is.\n```python\nimport numpy as np\n```\nDone.';
        const out = await run(...src.split(''));
        expect(out).not.toContain('import numpy');
        expect(out).not.toMatch(/`/);
    });

    it('leaves a fence-free answer untouched apart from stray backticks', async () => {
        expect(await run('Use a left join and keep the filters in the ON clause.'))
            .toBe('Use a left join and keep the filters in the ON clause.');
    });
});

/** Feed `text` through the cue guard in fixed-size chunks. */
async function runCues(text: string, chunkSize: number): Promise<{ out: string; cues: string[] | null; calls: number }> {
    async function* source() { for (let i = 0; i < text.length; i += chunkSize) yield text.slice(i, i + chunkSize); }
    let out = '', cues: string[] | null = null, calls = 0;
    for await (const c of stripCueBlock(source(), (x) => { cues = x; calls++; })) out += c;
    return { out, cues, calls };
}

describe('extractCues — splitting the cue block from the spoken answer (cue mode, spec 2026-09-20)', () => {
    const PROSE = 'Ten million vectors take about thirty gigabytes.\nQuantizing to int eight halves it.';

    it('no sentinel at the start: no cues, text unchanged', () => {
        expect(extractCues(PROSE)).toEqual({ cues: [], prose: PROSE });
        expect(extractCues('')).toEqual({ cues: [], prose: '' });
    });
    it('one line, several lines, leading blank lines and a blank line inside the block', () => {
        expect(extractCues(`__CUES__\n1| thirty gigabytes in float32\n${PROSE}`)).toEqual({ cues: ['thirty gigabytes in float32'], prose: PROSE });
        expect(extractCues(`\n\n__CUES__\n1| thirty gigabytes\n\n2| int8, then shard\n${PROSE}`)).toEqual({ cues: ['thirty gigabytes', 'int8, then shard'], prose: PROSE });
    });
    it('the first non-cue line closes the block; that line and everything after it are prose', () => {
        expect(extractCues(`__CUES__\n1| thirty gigabytes\nnot a cue line\n2| looks like one\n`)).toEqual({ cues: ['thirty gigabytes'], prose: 'not a cue line\n2| looks like one\n' });
    });
    it('wrapping quotes are removed; an over-long line is kept whole by the parser (the display cap is trimCues)', () => {
        const long = 'one two three four five six seven eight nine ten';
        expect(extractCues(`__CUES__\n1| "thirty gigabytes"\n2| ${long}\nProse.`)).toEqual({ cues: ['thirty gigabytes', long], prose: 'Prose.' });
    });
    it('block only, no prose', () => {
        expect(extractCues('__CUES__\n1| a\n2| b\n')).toEqual({ cues: ['a', 'b'], prose: '' });
    });
    it('the sentinel it recognises is the one the prompt asks for', () => {
        expect(extractCues(`${CUES_SENTINEL}\n1| a\nProse.`).cues).toEqual(['a']);
    });
});

describe('stripCueBlock — the block must never flash on screen, and the prose must never be swallowed', () => {
    const FULL = '__CUES__\n1| thirty gigabytes in float32\n2| int8, then shard\nTen million vectors take about thirty gigabytes. Quantizing to int eight halves it.\n';
    const PROSE = 'Ten million vectors take about thirty gigabytes. Quantizing to int eight halves it.\n';

    // 1 and 3 split "__CUES__" across chunk boundaries — where a naive indexOf leaks "__CU".
    it.each([1, 3, 4, 7, 500])('strips the block at chunk size %i and matches extractCues', async (size) => {
        const { out, cues, calls } = await runCues(FULL, size);
        expect(out).not.toContain('__CUES__');
        expect(out).not.toContain('__CU');
        expect(out).toBe(extractCues(FULL).prose);
        expect(out).toBe(PROSE);
        expect(cues).toEqual(['thirty gigabytes in float32', 'int8, then shard']);
        expect(calls).toBe(1);
    });
    it('passes an answer with no block through byte-for-byte and reports an empty array, once', async () => {
        const { out, cues, calls } = await runCues(PROSE, 3);
        expect(out).toBe(PROSE);
        expect(cues).toEqual([]);
        expect(calls).toBe(1);
    });
    it('tolerates whitespace before the sentinel (a stream often opens with a newline)', async () => {
        const { out, cues } = await runCues('\n__CUES__\n1| a\nProse.', 2);
        expect(out).toBe('Prose.');
        expect(cues).toEqual(['a']);
    });
    it('a non-cue line closes the block; the prose starts there, with the line intact', async () => {
        const { out, cues } = await runCues('__CUES__\n1| a\nThis is prose\n2| not a cue\n', 5);
        expect(cues).toEqual(['a']);
        expect(out).toBe('This is prose\n2| not a cue\n');
    });
    it('block only: cues delivered, nothing yielded, one callback at stream end', async () => {
        const { out, cues, calls } = await runCues('__CUES__\n1| a\n2| b', 4);
        expect(out).toBe('');
        expect(cues).toEqual(['a', 'b']);
        expect(calls).toBe(1);
    });
    it('a partial sentinel that never completes is prose', async () => {
        const { out, cues } = await runCues('__CU', 1);
        expect(out).toBe('__CU');
        expect(cues).toEqual([]);
    });
    it('does not mistake ordinary underscores or a sentinel mid-answer for the block', async () => {
        const text = 'Use __init__ for setup. Then __CUES__ is just text here.';
        const { out, cues } = await runCues(text, 2);
        expect(out).toBe(text);
        expect(cues).toEqual([]);
    });
});

describe('stripCueBlock — early close (spec 2026-09-30 cue-early-close): the block closes on the first prose character, not the first prose line', () => {
    /** Feed `chunks` through the cue guard; record how many source chunks had been handed out when the cues were reported, and the output pieces as yielded. */
    async function runCuesTimed(chunks: string[]): Promise<{ out: string[]; cues: string[] | null; calls: number; reportedAfter: number }> {
        let seen = 0, reportedAfter = -1, cues: string[] | null = null, calls = 0;
        async function* source() { for (const c of chunks) { seen++; yield c; } }
        const out: string[] = [];
        for await (const p of stripCueBlock(source(), (x) => { cues = x; calls++; reportedAfter = seen; })) out.push(p);
        return { out, cues, calls, reportedAfter };
    }

    it('reports the cues and releases the prose as soon as a partial line cannot be a cue line (final review I2, Appendix B)', async () => {
        const r = await runCuesTimed(['__CUES__\n1| a\n', 'Ten ', 'million ', 'vectors.']);
        expect(r.reportedAfter).toBe(2);                           // today 4: at stream end
        expect(r.out).toEqual(['Ten ', 'million ', 'vectors.']);   // today ['Ten million vectors.']
        expect(r.cues).toEqual(['a']);
        expect(r.calls).toBe(1);
    });

    // A one-paragraph answer: two cue lines, then prose with NO newline anywhere — the shape of 15 of 21 answers at the 16:12 re-smoke.
    const NO_NL = '__CUES__\n1| thirty gigabytes in float32\n2| int8, then shard\nTen million vectors take about thirty gigabytes. Quantizing to int eight halves it.';
    it.each([1, 3, 4, 7, 500])('a paragraph with no newline at chunk size %i: the report fires on the chunk that carries the first prose character, the prose streams, the whole equals extractCues', async (size) => {
        const chunks: string[] = [];
        for (let i = 0; i < NO_NL.length; i += size) chunks.push(NO_NL.slice(i, i + size));
        const r = await runCuesTimed(chunks);
        const firstProseChunk = Math.floor(NO_NL.indexOf('Ten') / size) + 1;   // 1-based: 61, 21, 16, 9, 1
        expect(r.reportedAfter).toBe(firstProseChunk);                        // today: the last chunk (143, 48, 36, 21, 1)
        expect(r.out.join('')).toBe(extractCues(NO_NL).prose);
        expect(r.cues).toEqual(extractCues(NO_NL).cues);
        expect(r.calls).toBe(1);
        if (size < NO_NL.length) expect(r.out.length).toBeGreaterThan(1);   // today: one piece, at the end
    });

    // Each partial state alone in its own chunk after one complete cue line; a third chunk completes the line, so a HOLD
    // and a CLOSE differ by WHEN the report fired: a held partial reports on chunk 3 (its newline), a closed one on chunk 2.
    // Every row is also pinned against extractCues on the completed text, so a wrong expectation fails for the right reason.
    const HEAD = '__CUES__\n1| a\n';
    const ROWS: Array<[string, string, string, number, string[], string]> = [
        // [state, partial (chunk 2), rest (chunk 3), reportedAfter, cues, prose]
        ['empty: held', '', '2| b\nZ', 3, ['a', 'b'], 'Z'],
        ['whitespace only: held', '   ', '\n2| b\nZ', 3, ['a', 'b'], 'Z'],
        ['a lone CR from a CRLF stream: held', '\r', '\n2| b\nZ', 3, ['a', 'b'], 'Z'],
        ['digits: held', '2', '| b\nZ', 3, ['a', 'b'], 'Z'],
        ['two digits: held', '12', '| b\nZ', 3, ['a', 'b'], 'Z'],
        ['digits and a space: held (the bar may still follow)', '2 ', '| b\nZ', 3, ['a', 'b'], 'Z'],
        ['digits and the bar: held', '2|', ' b\nZ', 3, ['a', 'b'], 'Z'],
        ['a partial cue line: held to its newline', '2| Spa', 'ces\nZ', 3, ['a', 'Spaces'], 'Z'],
        ['a partial cue line ending in CR (CRLF, boundary between \\r and \\n): held — trim(), not trimStart()', '2| Spa\r', '\nZ', 3, ['a', 'Spa'], 'Z'],
        ['digits, the bar, a stray CR, then the phrase: held (CUE_LINE takes whitespace after the bar, and CR is whitespace)', '2|\rb', '\nZ', 3, ['a', 'b'], 'Z'],
        ['prose: closes', 'Ten', ' million\nZ', 2, ['a'], 'Ten million\nZ'],
        ['prose that starts with a number: closes', '10 million vectors', '\nZ', 2, ['a'], '10 million vectors\nZ'],
        ['prose that starts with a count: closes', '3 things matter', '\nZ', 2, ['a'], '3 things matter\nZ'],
        ['prose that starts with a year: closes', '2024 was', ' the year\nZ', 2, ['a'], '2024 was the year\nZ'],
        ['prose with a digit start and a bar later: closes', '10 million | shards', '\nZ', 2, ['a'], '10 million | shards\nZ'],
        ['a numbered list marker: closes', '2.', ' First\nZ', 2, ['a'], '2. First\nZ'],
        ['a bullet: closes', '- first', '\nZ', 2, ['a'], '- first\nZ'],
    ];
    it.each(ROWS)('partial state — %s', async (_state, partial, rest, reportedAfter, cues, prose) => {
        const r = await runCuesTimed([HEAD, partial, rest]);
        expect(r.reportedAfter).toBe(reportedAfter);
        expect(r.cues).toEqual(cues);
        expect(r.out.join('')).toBe(prose);
        expect(r.calls).toBe(1);
        expect(extractCues(HEAD + partial + rest)).toEqual({ cues, prose });
    });

    it("text on the sentinel's own line: a cue there is held to its newline, prose there closes the block at once", async () => {
        expect(await runCuesTimed(['__CUES__ 1| Spa', 'ces\nZ'])).toEqual({ out: ['Z'], cues: ['Spaces'], calls: 1, reportedAfter: 2 });
        expect(await runCuesTimed(['__CUES__Ten', ' million\nZ'])).toEqual({ out: ['Ten', ' million\nZ'], cues: [], calls: 1, reportedAfter: 1 });   // today: ['Ten million\nZ'], reported after 2
        expect(extractCues('__CUES__Ten million\nZ')).toEqual({ cues: [], prose: 'Ten million\nZ' });
    });

    it('the stream ends on a held partial: a complete cue line is a cue, anything else goes out as prose, as before', async () => {
        expect(await runCuesTimed(['__CUES__\n1| a\n', '2| b'])).toEqual({ out: [], cues: ['a', 'b'], calls: 1, reportedAfter: 2 });
        expect(await runCuesTimed(['__CUES__\n1| a\n', '2|'])).toEqual({ out: ['2|'], cues: ['a'], calls: 1, reportedAfter: 2 });
        expect(await runCuesTimed(['__CUES__\n1| a\n', '2'])).toEqual({ out: ['2'], cues: ['a'], calls: 1, reportedAfter: 2 });
    });
});

describe('trimCues — the cue block as DISPLAYED: notation cleaned, then at most 3 lines of 5 words (spec 2026-09-30)', () => {
    const L = 3, W = 5;
    // The 2026-09-30 smoke's S1Q09 block: 8 lines for 8 named Azure components.
    const EIGHT = ['Blob Storage for data', 'Azure ML for training', 'Model Registry for versioning', 'ACR for images', 'AKS for inference', 'Data Factory for orchestration', 'Entra ID for security', 'Azure Monitor for observability'];

    it('a block inside both limits with nothing to clean is displayed unchanged and reports nothing to log', () => {
        expect(trimCues(['Layer caching', 'Instruction ordering'], L, W)).toEqual({ cues: ['Layer caching', 'Instruction ordering'], rawLines: 2, dropped: [], cut: [], cleaned: [] });
        expect(trimCues([], L, W)).toEqual({ cues: [], rawLines: 0, dropped: [], cut: [], cleaned: [] });
    });

    it("the smoke's 8-line block keeps its first 3 lines; the other 5 are reported verbatim, in order", () => {
        const r = trimCues(EIGHT, L, W);
        expect(r.cues).toEqual(EIGHT.slice(0, 3));
        expect(r).toMatchObject({ rawLines: 8, dropped: EIGHT.slice(3), cut: [], cleaned: [] });
    });

    it('a dropped line is reported raw and is neither cleaned nor cut', () => {
        // notation AND 8 words: had it been processed before the slice, it would show up in cut and cleaned
        const fourth = '**Data Factory** for batch and streaming orchestration pipelines';
        const r = trimCues([...EIGHT.slice(0, 3), fourth], L, W);
        expect(r.cues).toEqual(EIGHT.slice(0, 3));
        expect(r).toMatchObject({ dropped: [fourth], cut: [], cleaned: [] });
    });

    it('a 7-word line is cut to its first 5 words and reported raw; a 5-word line is not', () => {
        const seven = 'Batch/Online Architecture: Feature Store and Shared Logic';
        const r = trimCues([seven, '60% precision and 31.6% recall'], L, W);
        expect(r.cues).toEqual(['Batch/Online Architecture: Feature Store and', '60% precision and 31.6% recall']);
        expect(r).toMatchObject({ rawLines: 2, dropped: [], cut: [seven], cleaned: [] });
    });

    it('notation is cleaned the way the prose is (spike 4: a cue came out as raw LaTeX), BEFORE the count, and every cleaned line is reported raw', () => {
        const latex = '$O(\\log n)$ time complexity';
        const marks = '`ModelLatency` vs **OverheadLatency**';
        const r = trimCues([latex, marks, 'Parquet'], L, W);
        expect(r.cues).toEqual(['O(log n) time complexity', 'ModelLatency vs OverheadLatency', 'Parquet']);
        expect(r).toMatchObject({ dropped: [], cut: [], cleaned: [latex, marks] });
        // \frac adds the word "over": the count is taken after cleanup, so the DISPLAYED line never exceeds 5 words
        const frac = '$\\frac{3,000}{9,500}$ true positive rate';
        const f = trimCues([frac], L, W);
        expect(f.cues).toEqual(['3,000 over 9,500 true positive']);
        expect(f).toMatchObject({ cut: [frac], cleaned: [frac] });
    });

    it('a line that is nothing but notation is not hidden: it displays empty (the smoke check and the metrics row flag it)', () => {
        expect(trimCues(['**', 'Parquet'], L, W)).toMatchObject({ cues: ['', 'Parquet'], cleaned: ['**'] });
        // cleanup can leave a leading space, and the display trims it
        expect(trimCues(['** Parquet'], L, W)).toMatchObject({ cues: ['Parquet'], cleaned: ['** Parquet'] });
        // the parser can hand over a line with a space on both sides, `1| " padded "`
        expect(trimCues([' padded '], L, W)).toMatchObject({ cues: ['padded'], cleaned: [' padded '] });
    });

    it('applies exactly the limits it is given (the engine passes CUE_MAX_LINES / CUE_MAX_WORDS)', () => {
        expect(trimCues(EIGHT, 5, 8).cues).toEqual(EIGHT.slice(0, 5));
        expect(trimCues(['one two three four five six'], 3, 6).cut).toEqual([]);
        expect(trimCues(['one two three four five six'], 3, 5).cues).toEqual(['one two three four five']);
    });
});
